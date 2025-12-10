<?php

namespace App\Http\Controllers;

use App\Http\Requests\EmployeeImportRequest;
use App\Models\AttendancePolicy;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\DocumentType;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\User;
use Carbon\Carbon;
use Spatie\Permission\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EmployeeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $authUser     = Auth::user();
        $query = User::withPermissionCheck()
            ->with(['employee.branch', 'employee.department', 'employee.designation'])
            ->where('type', 'employee');

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%')
                    ->orWhereHas('employee', function ($eq) use ($request) {
                        $eq->where('employee_id', 'like', '%' . $request->search . '%')
                            ->orWhere('phone', 'like', '%' . $request->search . '%');
                    });
            });
        }

        // Handle department filter
        if ($request->has('department') && !empty($request->department) && $request->department !== 'all') {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('department_id', $request->department);
            });
        }

        // Handle branch filter
        if ($request->has('branch') && !empty($request->branch) && $request->branch !== 'all') {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('branch_id', $request->branch);
            });
        }

        // Handle designation filter
        if ($request->has('designation') && !empty($request->designation) && $request->designation !== 'all') {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('designation_id', $request->designation);
            });
        }

        // Handle status filter
        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Handle sorting
        if ($request->has('sort_field') && !empty($request->sort_field)) {
            $query->orderBy($request->sort_field, $request->sort_direction ?? 'asc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $employees = $query->paginate($request->per_page ?? 10);

        // Get branches, departments, and designations for filters
        $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name']);

        $departments = Department::with('branch')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name', 'branch_id']);

        $designations = Designation::with('department')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name', 'department_id']);


        // Get plan limits for company users and staff users (only in SaaS mode)
        $planLimits = null;
        if (isSaas()) {
            if ($authUser->type === 'company' && $authUser->plan) {
                $currentUserCount = User::where('type', 'employee')->whereIn('created_by', getCompanyAndUsersId())->count();
                $planLimits = [
                    'current_users' => $currentUserCount,
                    'max_users' => $authUser->plan->max_employees,
                    'can_create' => $currentUserCount < $authUser->plan->max_employees
                ];
            }
            // Check for staff users (created by company users)
            elseif ($authUser->type !== 'superadmin' && $authUser->created_by) {
                $companyUser = User::find($authUser->created_by);
                if ($companyUser && $companyUser->type === 'company' && $companyUser->plan) {
                    $currentUserCount = User::where('type', 'employee')->whereIn('created_by', getCompanyAndUsersId())->count();
                    $planLimits = [
                        'current_users' => $currentUserCount,
                        'max_users' => $companyUser->plan->max_employees,
                        'can_create' => $currentUserCount < $companyUser->plan->max_employees
                    ];
                }
            }
        }


        return Inertia::render('hr/employees/index', [
            'employees' => $employees,
            'branches' => $branches,
            'planLimits' => $planLimits,
            'departments' => $departments,
            'designations' => $designations,
            'filters' => $request->all(['search', 'department', 'branch', 'designation', 'status', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        // Get branches, departments, designations, and document types for the form
        $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name']);

        $departments = Department::with('branch')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name', 'branch_id']);

        $designations = Designation::with('department')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name', 'department_id']);

        $documentTypes = DocumentType::whereIn('created_by', getCompanyAndUsersId())
            ->get(['id', 'name', 'is_required']);

        $shifts = \App\Models\Shift::whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name', 'start_time', 'end_time']);

        $attendancePolicies = \App\Models\AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name']);

        return Inertia::render('hr/employees/create', [
            'branches' => $branches,
            'departments' => $departments,
            'designations' => $designations,
            'documentTypes' => $documentTypes,
            'shifts' => $shifts,
            'attendancePolicies' => $attendancePolicies,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // dd($request->all());
        try {
            // Validate basic information
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'employee_id' => 'required|string|max:255|unique:employees,employee_id',
                'email' => 'required|email|max:255|unique:users,email',
                'password' => 'required|string|min:8',
                'phone' => 'required|string|max:20',
                'date_of_birth' => 'required|date',
                'gender' => 'required|in:male,female,other',
                'profile_image' => 'required',
                'shift_id' => 'nullable|exists:shifts,id',
                'attendance_policy_id' => 'nullable|exists:attendance_policies,id',

                // Employment details
                'branch_id' => 'required|exists:branches,id',
                'department_id' => 'required|exists:departments,id',
                'designation_id' => 'required|exists:designations,id',
                'date_of_joining' => 'required|date',
                'employment_type' => 'required|string|max:50',
                'employment_status' => 'required|string|max:50',

                // Contact information
                'address_line_1' => 'required|string|max:255',
                'address_line_2' => 'required|string|max:255',
                'city' => 'required|string|max:100',
                'state' => 'required|string|max:100',
                'country' => 'required|string|max:100',
                'postal_code' => 'required|string|max:20',
                'emergency_contact_name' => 'required|string|max:255',
                'emergency_contact_relationship' => 'required|string|max:100',
                'emergency_contact_number' => 'required|string|max:20',

                // Banking information
                'bank_name' => 'required|string|max:255',
                'account_holder_name' => 'nullable|string|max:255',
                'account_number' => 'nullable|string|max:50',
                'bank_identifier_code' => 'nullable|string|max:50',
                'bank_branch' => 'nullable|string|max:255',
                'tax_payer_id' => 'nullable|string|max:50',

                // Documents
                'documents' => 'nullable|array',
                'documents.*.document_type_id' => 'required|exists:document_types,id',
                'documents.*.file_path' => 'required|string',
                'documents.*.expiry_date' => 'nullable|date',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            // Create User model object
            $user = new User();
            $user->name = $request->name;
            $user->email = $request->email;
            $user->password = Hash::make($request->password);
            $user->type = 'employee';
            $user->lang = 'en';
            $user->created_by = creatorId();

            // Handle profile image upload for user
            if ($request->has('profile_image')) {
                $user->avatar = $request->profile_image;
            }
            $user->save();

            // Assign Employee role
            if (isSaaS()) {
                $employeeRole = Role::where('created_by', createdBy())->where('name', 'employee')->first();
                if ($employeeRole) {
                    $user->assignRole($employeeRole);
                }
            } else {
                $employeeRole = Role::where('name', 'employee')->first();
                if ($employeeRole) {
                    $user->assignRole($employeeRole);
                }
            }


            // Create Employee model object
            $employee = new Employee();
            $employee->user_id = $user->id;
            $employee->employee_id = $request->employee_id;
            $employee->phone = $request->phone;
            $employee->date_of_birth = $request->date_of_birth;
            $employee->gender = $request->gender;
            $employee->branch_id = $request->branch_id;
            $employee->department_id = $request->department_id;
            $employee->designation_id = $request->designation_id;
            $employee->date_of_joining = $request->date_of_joining;
            $employee->employment_type = $request->employment_type;
            $employee->address_line_1 = $request->address_line_1;
            $employee->address_line_2 = $request->address_line_2;
            $employee->city = $request->city;
            $employee->state = $request->state;
            $employee->country = $request->country;
            $employee->postal_code = $request->postal_code;
            $employee->emergency_contact_name = $request->emergency_contact_name;
            $employee->emergency_contact_relationship = $request->emergency_contact_relationship;
            $employee->emergency_contact_number = $request->emergency_contact_number;
            $employee->bank_name = $request->bank_name;
            $employee->account_holder_name = $request->account_holder_name;
            $employee->account_number = $request->account_number;
            $employee->bank_identifier_code = $request->bank_identifier_code;
            $employee->bank_branch = $request->bank_branch;
            $employee->tax_payer_id = $request->tax_payer_id;
            $employee->created_by = creatorId();
            $employee->save();

            if (!$employee->save()) {
                throw new \Exception('Failed to save employee data');
            }

            // Handle document uploads
            if ($request->has('documents') && is_array($request->documents)) {
                foreach ($request->documents as $document) {
                    if (isset($document['file_path']) && !empty($document['file_path'])) {
                        EmployeeDocument::create([
                            'employee_id' => $employee->user_id,
                            'document_type_id' => $document['document_type_id'],
                            'file_path' => $document['file_path'],
                            'expiry_date' => $document['expiry_date'] ?? null,
                            'verification_status' => 'pending',
                            'created_by' => creatorId(),
                        ]);
                    }
                }
            }

            return redirect()->route('hr.employees.index')->with('success', __('Employee created successfully'));
        } catch (\Exception $e) {
            \Log::error('Employee creation failed: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return redirect()->back()->with('error', __('Failed to create employee: :message', ['message' => $e->getMessage()]))->withInput();
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Employee $employee)
    {
        // Check if employee belongs to current company
        $companyUserIds = getCompanyAndUsersId();
        if (!in_array($employee->created_by, $companyUserIds)) {
            return redirect()->back()->with('error', __('You do not have permission to view this employee'));
        }

        // Load user with employee relationships
        $user = User::with(['employee.branch', 'employee.department', 'employee.designation', 'employee.shift', 'employee.attendancePolicy', 'employee.documents.documentType'])
            ->where('id', $employee->user_id)
            ->first();

        return Inertia::render('hr/employees/show', [
            'employee' => $user,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Employee $employee)
    {
        // Check if employee belongs to current company
        $companyUserIds = getCompanyAndUsersId();
        if (!in_array($employee->created_by, $companyUserIds)) {
            return redirect()->back()->with('error', __('You do not have permission to edit this employee'));
        }

        // Load user with employee relationships
        $user = User::with(['employee.branch', 'employee.department', 'employee.designation', 'employee.documents.documentType'])
            ->where('id', $employee->user_id)
            ->first();

        // Get branches, departments, designations, and document types for the form
        $branches = Branch::whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name']);

        $departments = Department::with('branch')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name', 'branch_id']);

        $designations = Designation::with('department')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name', 'department_id']);

        $documentTypes = DocumentType::whereIn('created_by', getCompanyAndUsersId())
            ->get(['id', 'name', 'is_required']);

        $shifts = \App\Models\Shift::whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name', 'start_time', 'end_time']);

        $attendancePolicies = \App\Models\AttendancePolicy::whereIn('created_by', getCompanyAndUsersId())
            ->where('status', 'active')
            ->get(['id', 'name']);

        return Inertia::render('hr/employees/edit', [
            'employee' => $user,
            'branches' => $branches,
            'departments' => $departments,
            'designations' => $designations,
            'documentTypes' => $documentTypes,
            'shifts' => $shifts,
            'attendancePolicies' => $attendancePolicies,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Employee $employee)
    {
        // Check if employee belongs to current company
        $companyUserIds = getCompanyAndUsersId();
        if (!in_array($employee->created_by, $companyUserIds)) {
            return redirect()->back()->with('error', __('You do not have permission to update this employee'));
        }

        try {
            // Validate basic information
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'employee_id' => 'required|string|max:255|unique:employees,employee_id,' . $employee->id,
                'email' => 'required|email|max:255|unique:users,email,' . $employee->user_id,
                'password' => 'nullable|string|min:8',
                'phone' => 'required|string|max:20',
                'date_of_birth' => 'required|date',
                'gender' => 'required|in:male,female,other',
                'profile_image' => 'nullable|max:2048',
                'shift_id' => 'nullable|exists:shifts,id',
                'attendance_policy_id' => 'nullable|exists:attendance_policies,id',

                // Employment details
                'branch_id' => 'required|exists:branches,id',
                'department_id' => 'required|exists:departments,id',
                'designation_id' => 'required|exists:designations,id',
                'date_of_joining' => 'required|date',
                'employment_type' => 'required|string|max:50',
                'employment_status' => 'required|string|max:50',

                // Contact information
                'address_line_1' => 'required|string|max:255',
                'address_line_2' => 'required|string|max:255',
                'city' => 'required|string|max:100',
                'state' => 'required|string|max:100',
                'country' => 'required|string|max:100',
                'postal_code' => 'required|string|max:20',
                'emergency_contact_name' => 'required|string|max:255',
                'emergency_contact_relationship' => 'required|string|max:100',
                'emergency_contact_number' => 'required|string|max:20',

                // Banking information
                'bank_name' => 'required|string|max:255',
                'account_holder_name' => 'required|string|max:255',
                'account_number' => 'required|string|max:50',
                'bank_identifier_code' => 'nullable|string|max:50',
                'bank_branch' => 'nullable|string|max:255',
                'tax_payer_id' => 'nullable|string|max:50',

                // Documents
                'documents' => 'nullable|array',
                'documents.*.document_type_id' => 'required|exists:document_types,id',
                'documents.*.file' => 'nullable|max:5120',
                'documents.*.expiry_date' => 'nullable|date',
            ]);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }

            // Get the user
            $user = $employee->user;

            // Update User model object
            $user->name = $request->name;
            $user->email = $request->email;

            // Hash password if provided
            if ($request->has('password') && !empty($request->password)) {
                $user->password = Hash::make($request->password);
            }

            // Handle profile image upload for user
            if ($request->has('profile_image')) {
                $user->avatar = $request->profile_image;
            }

            $user->save();

            // Update Employee model object
            $employee->employee_id = $request->employee_id;
            $employee->shift_id = $request->shift_id;
            $employee->attendance_policy_id = $request->attendance_policy_id;
            $employee->phone = $request->phone;
            $employee->date_of_birth = $request->date_of_birth;
            $employee->gender = $request->gender;
            $employee->branch_id = $request->branch_id;
            $employee->department_id = $request->department_id;
            $employee->designation_id = $request->designation_id;
            $employee->date_of_joining = $request->date_of_joining;
            $employee->employment_type = $request->employment_type;
            $employee->address_line_1 = $request->address_line_1;
            $employee->address_line_2 = $request->address_line_2;
            $employee->city = $request->city;
            $employee->state = $request->state;
            $employee->country = $request->country;
            $employee->postal_code = $request->postal_code;
            $employee->emergency_contact_name = $request->emergency_contact_name;
            $employee->emergency_contact_relationship = $request->emergency_contact_relationship;
            $employee->emergency_contact_number = $request->emergency_contact_number;
            $employee->bank_name = $request->bank_name;
            $employee->account_holder_name = $request->account_holder_name;
            $employee->account_number = $request->account_number;
            $employee->bank_identifier_code = $request->bank_identifier_code;
            $employee->bank_branch = $request->bank_branch;
            $employee->tax_payer_id = $request->tax_payer_id;

            $employee->save();

            // Handle document uploads
            if ($request->has('documents') && is_array($request->documents)) {
                foreach ($request->documents as $document) {
                    if (isset($document['file_path']) && !empty($document['file_path'])) {
                        EmployeeDocument::create([
                            'employee_id' => $employee->user_id,
                            'document_type_id' => $document['document_type_id'],
                            'file_path' => $document['file_path'],
                            'expiry_date' => $document['expiry_date'] ?? null,
                            'verification_status' => 'pending',
                            'created_by' => creatorId(),
                        ]);
                    }
                }
            }

            return redirect()->route('hr.employees.index')->with('success', __('Employee updated successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update employee'));
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($userId)
    {
        try {
            $user = User::with('employee')->where('id', $userId)->whereIn('created_by', getCompanyAndUsersId())->first();

            if (!$user || !$user->employee) {
                return redirect()->back()->with('error', __('Employee not found'));
            }

            $employee = $user->employee;

            // Delete documents first
            EmployeeDocument::where('employee_id', $employee->id)->delete();

            // Delete employee record
            $employee->delete();

            // Delete user record and avatar
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $user->delete();

            return redirect()->route('hr.employees.index')->with('success', __('Employee deleted successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to delete employee: :message', ['message' => $e->getMessage()]));
        }
    }

    /**
     * Update employee status.
     */
    public function toggleStatus(Employee $employee)
    {
        // Check if employee belongs to current company
        $companyUserIds = getCompanyAndUsersId();
        if (!in_array($employee->created_by, $companyUserIds)) {
            return redirect()->back()->with('error', __('You do not have permission to update this employee'));
        }

        try {
            $user = $employee->user;
            $newStatus = $user->status === 'active' ? 'inactive' : 'active';
            $user->update(['status' => $newStatus]);

            return redirect()->back()->with('success', __('Employee status updated successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update employee status'));
        }
    }

    /**
     * Change employee password.
     */
    public function changePassword(Request $request, Employee $employee)
    {
        // Check if employee belongs to current company
        $companyUserIds = getCompanyAndUsersId();
        if (!in_array($employee->created_by, $companyUserIds)) {
            return redirect()->back()->with('error', __('You do not have permission to change this employee password'));
        }

        try {
            $validated = $request->validate([
                'password' => 'required|string|min:8|confirmed',
            ]);

            $user = $employee->user;
            $user->password = Hash::make($validated['password']);
            $user->save();

            return redirect()->back()->with('success', __('Employee password changed successfully.'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to change employee password'));
        }
    }

    /**
     * Delete employee document.
     */
    public function deleteDocument($userId, $documentId)
    {
        $user = User::with('employee')->find($userId);

        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $companyUserIds = getCompanyAndUsersId();
        if (!in_array($user->created_by, $companyUserIds)) {
            return redirect()->back()->with('error', __('You do not have permission to access this employee'));
        }

        $document = EmployeeDocument::where('id', $documentId)
            ->where('employee_id', $userId)
            ->first();

        if (!$document) {
            return redirect()->back()->with('error', __('Document not found'));
        }

        try {
            $document->delete();
            return redirect()->back()->with('success', __('Document deleted successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to delete document'));
        }
    }

    /**
     * Approve employee document.
     */
    public function approveDocument($userId, $documentId)
    {
        $user = User::with('employee')->find($userId);
        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $document = EmployeeDocument::where('id', $documentId)
            ->where('employee_id', $userId)
            ->first();

        if (!$document) {
            return redirect()->back()->with('error', __('Document not found'));
        }

        try {
            $document->update(['verification_status' => 'verified']);
            return redirect()->back()->with('success', __('Document approved successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to approve document'));
        }
    }

    /**
     * Reject employee document.
     */
    public function rejectDocument($userId, $documentId)
    {
        $user = User::with('employee')->find($userId);
        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $document = EmployeeDocument::where('id', $documentId)
            ->where('employee_id', $userId)
            ->first();

        if (!$document) {
            return redirect()->back()->with('error', __('Document not found'));
        }

        try {
            $document->update(['verification_status' => 'rejected']);
            return redirect()->back()->with('success', __('Document rejected successfully'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to reject document'));
        }
    }

    /**
     * Download employee document.
     */
    public function downloadDocument($userId, $documentId)
    {

        $user = User::with('employee')->find($userId);
        if (!$user || !$user->employee) {
            return redirect()->back()->with('error', __('Employee not found'));
        }

        $companyUserIds = getCompanyAndUsersId();
        if (!in_array($user->created_by, $companyUserIds)) {
            return redirect()->back()->with('error', __('You do not have permission to access this employee'));
        }

        $document = EmployeeDocument::where('id', $documentId)
            ->where('employee_id', $userId)
            ->first();


        if (!$document) {
            return redirect()->back()->with('error', __('Document not found'));
        }

        if (!$document->file_path) {
            return redirect()->back()->with('error', __('Document file not found'));
        }

        $filePath = getStorageFilePath($document->file_path);

        if (!file_exists($filePath)) {
            return redirect()->back()->with('error', __('Document file not found'));
        }

        return response()->download($filePath);
    }

    /**
     * Download the employee import template.
     */
    public function downloadImportTemplate(): StreamedResponse
    {
        $columns = array_keys($this->getEmployeeImportColumns());
        $sampleRows = $this->getImportSampleRows();

        return response()->streamDownload(function () use ($columns, $sampleRows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);

            foreach ($sampleRows as $sampleRow) {
                $row = [];
                foreach ($columns as $column) {
                    $row[] = $sampleRow[$column] ?? '';
                }
                fputcsv($handle, $row);
            }
            fclose($handle);
        }, 'employee_import_template.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Import employees from a CSV file.
     */
    public function import(EmployeeImportRequest $request)
    {
        $file = $request->file('file');
        if (!$file) {
            return redirect()->back()->with('error', __('Unable to process the uploaded file.'));
        }

        $planInfo = $this->getPlanAvailabilityForImport();
        if ($planInfo && $planInfo['remaining'] <= 0) {
            return redirect()->back()->with('error', __('Employee limit exceeded. Please upgrade your plan or remove users before importing more employees.'));
        }

        $handle = fopen($file->getRealPath(), 'rb');
        if ($handle === false) {
            return redirect()->back()->with('error', __('Unable to open the uploaded file.'));
        }

        $config = $this->getEmployeeImportColumns();
        $requiredColumns = array_keys(array_filter($config, fn ($column) => $column['required'] ?? false));
        $header = null;
        $rowNumber = 1;
        $results = [
            'processed' => 0,
            'created' => 0,
            'skipped' => 0,
            'errors' => [],
        ];
        $companyUserIds = getCompanyAndUsersId();

        try {
            while (($row = fgetcsv($handle, 0, ',')) !== false) {
                if ($header === null) {
                    if ($this->isRowEmpty($row)) {
                        continue;
                    }

                    $header = array_map(fn ($value) => $this->sanitizeHeaderValue($value), $row);
                    $missingColumns = array_diff($requiredColumns, $header);

                    if (!empty($missingColumns)) {
                        return redirect()
                            ->back()
                            ->with('error', __('The uploaded file is missing the required columns: :columns', ['columns' => implode(', ', $missingColumns)]));
                    }
                    continue;
                }

                $rowNumber++;

                if ($this->isRowEmpty($row)) {
                    continue;
                }

                $results['processed']++;
                $rowData = $this->mapRowValues($header, $row);
                foreach ($rowData as $key => $value) {
                    $rowData[$key] = $this->sanitizeCellValue($value);
                }

                $missingValues = [];
                foreach ($requiredColumns as $column) {
                    if (!array_key_exists($column, $rowData) || $rowData[$column] === null) {
                        $missingValues[] = $column;
                    }
                }

                if (!empty($missingValues)) {
                    $this->recordImportError($results, $rowNumber, __('Missing required values for: :columns', ['columns' => implode(', ', $missingValues)]));
                    continue;
                }

                if ($planInfo && $planInfo['remaining'] <= 0) {
                    $this->recordImportError($results, $rowNumber, __('Plan limit reached. Remaining rows were skipped.'));
                    break;
                }

                if (Employee::where('employee_id', $rowData['employee_id'])->exists()) {
                    $this->recordImportError($results, $rowNumber, __('Employee ID ":employeeId" already exists.', ['employeeId' => $rowData['employee_id']]));
                    continue;
                }

                $branchId = $this->resolveOwnedEntityId(Branch::class, $rowData['branch_id'], $companyUserIds);
                if (!$branchId) {
                    $this->recordImportError($results, $rowNumber, __('Invalid branch reference.'));
                    continue;
                }

                $departmentId = $this->resolveOwnedEntityId(Department::class, $rowData['department_id'], $companyUserIds);
                if (!$departmentId) {
                    $this->recordImportError($results, $rowNumber, __('Invalid department reference.'));
                    continue;
                }

                $designationId = $this->resolveOwnedEntityId(Designation::class, $rowData['designation_id'], $companyUserIds);
                if (!$designationId) {
                    $this->recordImportError($results, $rowNumber, __('Invalid designation reference.'));
                    continue;
                }

                $shiftId = $this->resolveOwnedEntityId(\App\Models\Shift::class, $rowData['shift_id'] ?? null, $companyUserIds);

                $gender = $rowData['gender'] ? strtolower($rowData['gender']) : null;
                if ($gender && !in_array($gender, ['male', 'female', 'other'])) {
                    $gender = 'other';
                }

                $statusValue = $rowData['status'] ?? null;
                $status = $statusValue ? strtolower($statusValue) : 'active';
                $status = in_array($status, ['active', 'inactive'], true) ? $status : 'active';

                $dateOfBirth = $this->parseDateValue($rowData['date_of_birth'] ?? null);
                $dateOfJoining = $this->parseDateValue($rowData['date_of_joining'] ?? null);

                try {
                    DB::transaction(function () use (
                        $rowData,
                        $branchId,
                        $departmentId,
                        $designationId,
                        $shiftId,
                        $gender,
                        $status,
                        $dateOfBirth,
                        $dateOfJoining
                    ) {
                        $user = new User();
                        $user->name = $rowData['name'];
                        $user->email = uniqid($rowData['employee_id'] . '@') . 'gamail.com';
                        $user->password = Hash::make($rowData['password'] ?? Str::random(12));
                        $user->type = 'employee';
                        $user->lang = 'en';
                        $user->created_by = creatorId();
                        $user->status = $status;
                        $user->save();

                        if (isSaaS()) {
                            $employeeRole = Role::where('created_by', createdBy())->where('name', 'employee')->first();
                        } else {
                            $employeeRole = Role::where('name', 'employee')->first();
                        }

                        if ($employeeRole) {
                            $user->assignRole($employeeRole);
                        }

                        $employee = new Employee();
                        $employee->user_id = $user->id;
                        $employee->employee_id = $rowData['employee_id'];
                        $employee->date_of_birth = $dateOfBirth;
                        $employee->gender = $gender == 'M' ? 'male' : 'female';
                        $employee->branch_id = $branchId;
                        $employee->department_id = $departmentId;
                        $employee->designation_id = $designationId;
                        $employee->shift_id = $shiftId;
                        $employee->date_of_joining = $dateOfJoining;
                        $employee->employment_type = $rowData['employment_type'];
//                        $employee->employment_status = $rowData['employment_status'] ?? 'active';
                        $employee->national_id = $rowData['national_id'];
                        $employee->created_by = creatorId();
                        $employee->save();
                    });

                    $results['created']++;
                    if ($planInfo) {
                        $planInfo['remaining']--;
                    }
                } catch (\Throwable $exception) {
                    $this->recordImportError($results, $rowNumber, __('Unexpected error: :message', ['message' => $exception->getMessage()]));
                }
            }
        } finally {
            fclose($handle);
        }

        if ($header === null) {
            return redirect()->back()->with('error', __('The uploaded file does not contain any data.'));
        }

        $message = __('Employee import completed. :created created, :skipped skipped.', [
            'created' => $results['created'],
            'skipped' => $results['skipped'],
        ]);

        return redirect()->route('hr.employees.index')
            ->with('success', $message)
            ->with('import_summary', $results);
    }

    /**
     * Column definitions for the import template.
     */
    private function getEmployeeImportColumns(): array
    {
        return [
            'employee_id' => ['required' => true],
            'name' => ['required' => true],
            'date_of_birth' => ['required' => true],
            'gender' => ['required' => true],
            'branch_id' => ['required' => true],
            'department_id' => ['required' => true],
            'designation_id' => ['required' => true],
            'shift_id' => ['required' => true],
            'date_of_joining' => ['required' => true],
            'employment_type' => ['required' => true],
            'employment_status' => ['required' => true],
            'status' => ['required' => true],
            'national_id' => ['required' => true],
        ];
    }

    /**
     * Provide example rows for the template to help users.
     */
    private function getImportSampleRows(): array
    {
        return [
            [
                'employee_id' => 'EMP-1001',
                'name' => 'John Doe',
                'date_of_birth' => '1990-04-12',
                'gender' => 'M',
                'branch_id' => '1',
                'department_id' => '1',
                'designation_id' => '1',
                'shift_id' => '1',
                'date_of_joining' => '2024-01-15',
                'employment_type' => 'Full-time',
                'employment_status' => 'active',
                'status' => 'active',
                'national_id' => '1234567890',
            ],
            [
                'employee_id' => 'EMP-1002',
                'name' => 'Sara Khan',
                'date_of_birth' => '1992-09-05',
                'gender' => 'F',
                'branch_id' => '2',
                'department_id' => '2',
                'designation_id' => '3',
                'shift_id' => '1',
                'date_of_joining' => '2024-03-01',
                'employment_type' => 'Contract',
                'employment_status' => 'active',
                'status' => 'active',
                'national_id' => '12345678456'
            ],
        ];
    }

    private function sanitizeHeaderValue(?string $value): string
    {
        $value = $value ?? '';
        $value = preg_replace('/\x{FEFF}/u', '', $value);
        return strtolower(trim($value));
    }

    private function sanitizeCellValue($value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            $value = trim($value);
        }

        return $value === '' ? null : (string) $value;
    }

    private function isRowEmpty(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }
        return true;
    }

    private function mapRowValues(array $header, array $row): array
    {
        $mapped = [];
        foreach ($header as $index => $column) {
            $mapped[$column] = $row[$index] ?? null;
        }
        return $mapped;
    }

    private function resolveOwnedEntityId(string $modelClass, ?string $value, array $companyUserIds): ?int
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);
        if ($value === '') {
            return null;
        }

        $query = $modelClass::query()->whereIn('created_by', $companyUserIds);

        if (is_numeric($value)) {
            $entity = (clone $query)->where('id', (int) $value)->first();
            if ($entity) {
                return (int) $entity->id;
            }
        }

        $nameMatch = (clone $query)
            ->whereRaw('LOWER(name) = ?', [strtolower($value)])
            ->value('id');

        return $nameMatch ? (int) $nameMatch : null;
    }

    private function parseDateValue(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $exception) {
            return null;
        }
    }

    private function getPlanAvailabilityForImport(): ?array
    {
        if (!isSaas()) {
            return null;
        }

        $authUser = Auth::user();
        if (!$authUser) {
            return null;
        }

        if ($authUser->type === 'superadmin') {
            return null;
        }

        $companyUser = $authUser->type === 'company'
            ? $authUser
            : ($authUser->created_by ? User::find($authUser->created_by) : null);

        if (!$companyUser || !$companyUser->plan) {
            return null;
        }

        $currentUserCount = User::where('type', 'employee')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->count();

        $maxEmployees = (int) $companyUser->plan->max_employees;
        $remaining = max($maxEmployees - $currentUserCount, 0);

        return [
            'max' => $maxEmployees,
            'current' => $currentUserCount,
            'remaining' => $remaining,
        ];
    }

    private function recordImportError(array &$results, int $rowNumber, string $message): void
    {
        $results['errors'][] = [
            'row' => $rowNumber,
            'message' => $message,
        ];
        $results['skipped']++;
    }
}
