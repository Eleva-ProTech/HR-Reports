<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRecord;
use App\Models\Branch;
use App\Models\ContractType;
use App\Models\Department;
use App\Models\Employee;
use App\Models\EmployeeContract;
use App\Models\EmployeeTraining;
use App\Models\LeaveApplication;
use App\Models\LeaveType;
use App\Models\Resignation;
use App\Models\Termination;
use App\Models\TrainingProgram;
use App\Models\User;
use App\Models\Warning;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class HrReportController extends Controller
{
    public function absenceReport(Request $request): Response
    {
        $perPage = $this->perPage($request);

        $query = AttendanceRecord::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'shift',
            ])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where(function (Builder $builder) {
                $builder->orWhere('status', 'on_leave');
            });

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyDateFilter($query, $request, 'date');

        $records = (clone $query)->orderBy('date', 'desc')->paginate($perPage)->withQueryString();

        $totalAbsences = (clone $query)->count();
        $uniqueEmployees = (clone $query)->distinct('employee_id')->count('employee_id');
        $currentMonthAbsences = (clone $query)
            ->whereBetween('date', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()])
            ->count();

        return Inertia::render('hr/reports/absence-report', [
            'records' => $records,
            'filters' => $request->only([
                'search',
                'branch_id',
                'department_id',
                'employee_id',
                'date_from',
                'date_to',
                'per_page',
            ]),
            'options' => $this->getFilterOptions(),
            'stats' => [
                'total_absences' => $totalAbsences,
                'unique_employees' => $uniqueEmployees,
                'avg_absences' => $uniqueEmployees ? round($totalAbsences / $uniqueEmployees, 2) : 0,
                'current_month' => $currentMonthAbsences,
            ],
        ]);
    }

    public function latenessReport(Request $request): Response
    {
        $perPage = $this->perPage($request);

        $query = AttendanceRecord::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'shift',
            ])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('is_late', true);

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyDateFilter($query, $request, 'date');

        $records = (clone $query)->orderBy('date', 'desc')->paginate($perPage)->withQueryString();

        $totalLateDays = (clone $query)->count();
        $uniqueEmployees = (clone $query)->distinct('employee_id')->count('employee_id');
        $currentMonthLateDays = (clone $query)
            ->whereBetween('date', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()])
            ->count();

        return Inertia::render('hr/reports/lateness-report', [
            'records' => $records,
            'filters' => $request->only([
                'search',
                'branch_id',
                'department_id',
                'employee_id',
                'date_from',
                'date_to',
                'per_page',
            ]),
            'options' => $this->getFilterOptions(),
            'stats' => [
                'total_late_days' => $totalLateDays,
                'unique_employees' => $uniqueEmployees,
                'avg_late_days' => $uniqueEmployees ? round($totalLateDays / max($uniqueEmployees, 1), 2) : 0,
                'current_month' => $currentMonthLateDays,
            ],
        ]);
    }

    public function leaveReport(Request $request): Response
    {
        $perPage = $this->perPage($request);

        $query = LeaveApplication::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'leaveType',
            ])
            ->whereIn('created_by', getCompanyAndUsersId());

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyLeaveDateFilters($query, $request);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('leave_type_id')) {
            $query->where('leave_type_id', $request->leave_type_id);
        }

        $records = (clone $query)->orderBy('start_date', 'desc')->paginate($perPage)->withQueryString();

        $totalRequests = (clone $query)->count();
        $approvedRequests = (clone $query)->where('status', 'approved')->count();
        $pendingRequests = (clone $query)->where('status', 'pending')->count();
        $totalDays = (clone $query)->sum('total_days');

        return Inertia::render('hr/reports/leave-report', [
            'records' => $records,
            'filters' => $request->only([
                'search',
                'branch_id',
                'department_id',
                'employee_id',
                'status',
                'leave_type_id',
                'date_from',
                'date_to',
                'per_page',
            ]),
            'options' => array_merge(
                $this->getFilterOptions(),
                [
                    'leave_types' => LeaveType::whereIn('created_by', getCompanyAndUsersId())
                        ->select('id', 'name')
                        ->orderBy('name')
                        ->get(),
                ]
            ),
            'stats' => [
                'total_requests' => $totalRequests,
                'approved_requests' => $approvedRequests,
                'pending_requests' => $pendingRequests,
                'total_days' => $totalDays,
            ],
        ]);
    }

    public function medicalExcuseReport(Request $request): Response
    {
        $perPage = $this->perPage($request);

        $query = LeaveApplication::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'leaveType',
            ])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where(function (Builder $builder) {
                $builder->whereHas('leaveType', function (Builder $typeQuery) {
                    $typeQuery->where('name', 'like', '%medical%')
                        ->orWhere('name', 'like', '%sick%')
                        ->orWhere('name', 'like', '%health%');
                })
                ->orWhere('reason', 'like', '%medical%')
                ->orWhere('reason', 'like', '%doctor%');
            });

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyLeaveDateFilters($query, $request);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $records = (clone $query)->orderBy('start_date', 'desc')->paginate($perPage)->withQueryString();

        $totalRequests = (clone $query)->count();
        $approvedRequests = (clone $query)->where('status', 'approved')->count();
        $pendingRequests = (clone $query)->where('status', 'pending')->count();

        return Inertia::render('hr/reports/medical-excuse-report', [
            'records' => $records,
            'filters' => $request->only([
                'search',
                'branch_id',
                'department_id',
                'employee_id',
                'status',
                'date_from',
                'date_to',
                'per_page',
            ]),
            'options' => $this->getFilterOptions(),
            'stats' => [
                'total_requests' => $totalRequests,
                'approved_requests' => $approvedRequests,
                'pending_requests' => $pendingRequests,
            ],
        ]);
    }

    public function warningReport(Request $request): Response
    {
        $perPage = $this->perPage($request);

        $query = Warning::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'issuer',
            ])
            ->whereIn('created_by', getCompanyAndUsersId());

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request, ['subject', 'warning_type']);
        $this->applyDateFilter($query, $request, 'warning_date');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('severity') && $request->severity !== 'all') {
            $query->where('severity', $request->severity);
        }

        $records = (clone $query)->orderBy('warning_date', 'desc')->paginate($perPage)->withQueryString();

        $totalWarnings = (clone $query)->count();
        $openWarnings = (clone $query)->whereIn('status', ['draft', 'issued'])->count();
        $acknowledgedWarnings = (clone $query)->where('status', 'acknowledged')->count();
        $expiredWarnings = (clone $query)->where('status', 'expired')->count();

        $warningTypes = Warning::whereIn('created_by', getCompanyAndUsersId())
            ->select('warning_type')
            ->distinct()
            ->pluck('warning_type')
            ->filter()
            ->values();

        return Inertia::render('hr/reports/warning-report', [
            'records' => $records,
            'filters' => $request->only([
                'search',
                'branch_id',
                'department_id',
                'employee_id',
                'status',
                'severity',
                'date_from',
                'date_to',
                'per_page',
            ]),
            'options' => array_merge(
                $this->getFilterOptions(),
                [
                    'warning_types' => $warningTypes,
                    'severities' => ['verbal', 'written', 'final'],
                ]
            ),
            'stats' => [
                'total_warnings' => $totalWarnings,
                'open_warnings' => $openWarnings,
                'acknowledged_warnings' => $acknowledgedWarnings,
                'expired_warnings' => $expiredWarnings,
            ],
        ]);
    }

    public function expiredContractsReport(Request $request): Response
    {
        $perPage = $this->perPage($request);
        $today = Carbon::today();

        $query = EmployeeContract::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'contractType',
            ])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where(function (Builder $builder) use ($today) {
                $builder->where('status', 'expired')
                    ->orWhereDate('end_date', '<', $today);
            });

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyDateFilter($query, $request, 'end_date');

        if ($request->filled('contract_type_id')) {
            $query->where('contract_type_id', $request->contract_type_id);
        }

        $records = (clone $query)->orderBy('end_date', 'desc')->paginate($perPage)->withQueryString();

        $totalExpired = (clone $query)->count();
        $expiringSoon = EmployeeContract::with('employee')
            ->whereIn('created_by', getCompanyAndUsersId())
            ->whereNotNull('end_date')
            ->whereBetween('end_date', [$today, (clone $today)->addDays(30)])
            ->count();

        $avgTenure = (clone $query)->whereNotNull('start_date')->whereNotNull('end_date')
            ->get()
            ->map(function (EmployeeContract $contract) {
                return $contract->start_date && $contract->end_date
                    ? $contract->start_date->diffInDays($contract->end_date)
                    : 0;
            })
            ->filter()
            ->avg() ?? 0;

        return Inertia::render('hr/reports/expired-contracts-report', [
            'records' => $records,
            'filters' => $request->only([
                'search',
                'branch_id',
                'department_id',
                'employee_id',
                'contract_type_id',
                'date_from',
                'date_to',
                'per_page',
            ]),
            'options' => array_merge(
                $this->getFilterOptions(),
                [
                    'contract_types' => ContractType::whereIn('created_by', getCompanyAndUsersId())
                        ->select('id', 'name')
                        ->orderBy('name')
                        ->get(),
                ]
            ),
            'stats' => [
                'total_expired' => $totalExpired,
                'expiring_soon' => $expiringSoon,
                'average_tenure_days' => round($avgTenure),
            ],
        ]);
    }

    public function trainingReport(Request $request): Response
    {
        $perPage = $this->perPage($request);

        $query = EmployeeTraining::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'trainingProgram',
            ])
            ->whereIn('created_by', getCompanyAndUsersId());

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyDateFilter($query, $request, 'assigned_date');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('training_program_id')) {
            $query->where('training_program_id', $request->training_program_id);
        }

        $records = (clone $query)->orderBy('assigned_date', 'desc')->paginate($perPage)->withQueryString();

        $totalAssigned = (clone $query)->count();
        $completedTrainings = (clone $query)->where('status', 'completed')->count();
        $inProgressTrainings = (clone $query)->where('status', 'in_progress')->count();
        $failedTrainings = (clone $query)->where('status', 'failed')->count();

        return Inertia::render('hr/reports/training-report', [
            'records' => $records,
            'filters' => $request->only([
                'search',
                'branch_id',
                'department_id',
                'employee_id',
                'status',
                'training_program_id',
                'date_from',
                'date_to',
                'per_page',
            ]),
            'options' => array_merge(
                $this->getFilterOptions(),
                [
                    'training_programs' => TrainingProgram::whereIn('created_by', getCompanyAndUsersId())
                        ->select('id', 'name')
                        ->orderBy('name')
                        ->get(),
                ]
            ),
            'stats' => [
                'total_assigned' => $totalAssigned,
                'completed' => $completedTrainings,
                'in_progress' => $inProgressTrainings,
                'failed' => $failedTrainings,
            ],
        ]);
    }

    public function resignationReport(Request $request): Response
    {
        $perPage = $this->perPage($request);

        $query = Resignation::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'approver',
            ])
            ->whereIn('created_by', getCompanyAndUsersId());

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyDateFilter($query, $request, 'resignation_date');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $records = (clone $query)->orderBy('resignation_date', 'desc')->paginate($perPage)->withQueryString();

        $totalResignations = (clone $query)->count();
        $pendingResignations = (clone $query)->where('status', 'pending')->count();
        $approvedResignations = (clone $query)->where('status', 'approved')->count();
        $averageNoticePeriod = (clone $query)->avg('notice_period');

        return Inertia::render('hr/reports/resignation-report', [
            'records' => $records,
            'filters' => $request->only([
                'search',
                'branch_id',
                'department_id',
                'employee_id',
                'status',
                'date_from',
                'date_to',
                'per_page',
            ]),
            'options' => $this->getFilterOptions(),
            'stats' => [
                'total_resignations' => $totalResignations,
                'pending' => $pendingResignations,
                'approved' => $approvedResignations,
                'average_notice_period' => round($averageNoticePeriod ?? 0, 1),
            ],
        ]);
    }

    public function terminationReport(Request $request): Response
    {
        $perPage = $this->perPage($request);

        $query = Termination::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'approver',
            ])
            ->whereIn('created_by', getCompanyAndUsersId());

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request, ['termination_type', 'reason', 'description']);
        $this->applyDateFilter($query, $request, 'termination_date');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('termination_type') && $request->termination_type !== 'all') {
            $query->where('termination_type', $request->termination_type);
        }

        $records = (clone $query)->orderBy('termination_date', 'desc')->paginate($perPage)->withQueryString();

        $totalTerminations = (clone $query)->count();
        $pendingTerminations = (clone $query)->where('status', 'pending')->count();
        $approvedTerminations = (clone $query)->where('status', 'approved')->count();
        $averageNoticePeriod = (clone $query)->avg('notice_period');

        $terminationTypes = Termination::whereIn('created_by', getCompanyAndUsersId())
            ->select('termination_type')
            ->distinct()
            ->pluck('termination_type')
            ->filter()
            ->values();

        return Inertia::render('hr/reports/termination-report', [
            'records' => $records,
            'filters' => $request->only([
                'search',
                'branch_id',
                'department_id',
                'employee_id',
                'status',
                'termination_type',
                'date_from',
                'date_to',
                'per_page',
            ]),
            'options' => array_merge(
                $this->getFilterOptions(),
                [
                    'termination_types' => $terminationTypes,
                ]
            ),
            'stats' => [
                'total_terminations' => $totalTerminations,
                'pending' => $pendingTerminations,
                'approved' => $approvedTerminations,
                'average_notice_period' => round($averageNoticePeriod ?? 0, 1),
            ],
        ]);
    }

    public function turnoverReport(Request $request): Response
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);

        $employeeQuery = $this->employeeProfileQuery($request);

        $currentHeadcount = (clone $employeeQuery)->count();

        $startingHeadcount = (clone $employeeQuery)
            ->where(function (Builder $builder) use ($startDate) {
                $builder->whereNull('date_of_joining')
                    ->orWhereDate('date_of_joining', '<=', $startDate);
            })
            ->count();

        $hireRecords = (clone $employeeQuery)
            ->whereNotNull('date_of_joining')
            ->whereBetween('date_of_joining', [$startDate, $endDate])
            ->get();

        $resignationBase = Resignation::with(['employee', 'employee.employee.branch', 'employee.employee.department'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('status', ['approved', 'completed']);
        $this->applyEmployeeFilters($resignationBase, $request);
        $resignationRecords = (clone $resignationBase)
            ->whereNotNull('last_working_day')
            ->whereBetween('last_working_day', [$startDate, $endDate])
            ->get();

        $terminationBase = Termination::with(['employee', 'employee.employee.branch', 'employee.employee.department'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('status', ['approved', 'completed']);
        $this->applyEmployeeFilters($terminationBase, $request);
        $terminationRecords = (clone $terminationBase)
            ->whereNotNull('termination_date')
            ->whereBetween('termination_date', [$startDate, $endDate])
            ->get();

        $newHires = $hireRecords->count();
        $resignations = $resignationRecords->count();
        $terminations = $terminationRecords->count();
        $totalSeparations = $resignations + $terminations;

        $averageHeadcount = max(1, round(($startingHeadcount + $currentHeadcount) / 2, 2));
        $turnoverRate = $totalSeparations > 0
            ? round(($totalSeparations / $averageHeadcount) * 100, 2)
            : 0;

        $recentHires = $hireRecords
            ->sortByDesc('date_of_joining')
            ->take(8)
            ->values()
            ->map(function (Employee $employee) {
                return [
                    'name' => $employee->user?->name,
                    'email' => $employee->user?->email,
                    'branch' => $employee->branch->name ?? null,
                    'department' => $employee->department->name ?? null,
                    'date' => $employee->date_of_joining
                        ? Carbon::parse($employee->date_of_joining)->toDateString()
                        : null,
                ];
            });

        $recentSeparations = $resignationRecords->map(function ($resignation) {
            $profile = $resignation->employee->employee;

            return [
                'name' => $resignation->employee?->name,
                'email' => $resignation->employee?->email,
                'branch' => $profile?->branch?->name,
                'department' => $profile?->department?->name,
                'date' => $resignation->last_working_day
                    ? Carbon::parse($resignation->last_working_day)->toDateString()
                    : null,
                'type' => 'resignation',
                'status' => $resignation->status,
            ];
        })->merge(
            $terminationRecords->map(function ($termination) {
                $profile = $termination->employee->employee;

                return [
                    'name' => $termination->employee?->name,
                    'email' => $termination->employee?->email,
                    'branch' => $profile?->branch?->name,
                    'department' => $profile?->department?->name,
                    'date' => $termination->termination_date
                        ? Carbon::parse($termination->termination_date)->toDateString()
                        : null,
                    'type' => 'termination',
                    'status' => $termination->status,
                ];
            })
        )->sortByDesc('date')
            ->take(8)
            ->values();

        $monthlySeries = $this->buildTurnoverSeries(
            $startDate,
            $endDate,
            $hireRecords,
            $resignationRecords,
            $terminationRecords,
            max($currentHeadcount, 1)
        );

        return Inertia::render('hr/reports/turnover-report', [
            'stats' => [
                'headcount' => $currentHeadcount,
                'average_headcount' => $averageHeadcount,
                'hires' => $newHires,
                'separations' => $totalSeparations,
                'turnover_rate' => $turnoverRate,
            ],
            'monthlyData' => $monthlySeries,
            'recentHires' => $recentHires,
            'recentSeparations' => $recentSeparations,
            'options' => $this->getFilterOptions(),
            'filters' => [
                'search' => $request->input('search'),
                'branch_id' => $request->input('branch_id'),
                'department_id' => $request->input('department_id'),
                'employee_id' => $request->input('employee_id'),
                'date_from' => $startDate->toDateString(),
                'date_to' => $endDate->toDateString(),
            ],
        ]);
    }

    private function applyEmployeeFilters(Builder $query, Request $request): void
    {
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }

        if ($request->filled('branch_id')) {
            $query->whereHas('employee.employee', function (Builder $builder) use ($request) {
                $builder->where('branch_id', $request->branch_id);
            });
        }

        if ($request->filled('department_id')) {
            $query->whereHas('employee.employee', function (Builder $builder) use ($request) {
                $builder->where('department_id', $request->department_id);
            });
        }
    }

    private function applySearchFilter(Builder $query, Request $request, array $additionalColumns = []): void
    {
        if (!$request->filled('search')) {
            return;
        }

        $search = $request->search;

        $query->where(function (Builder $builder) use ($search, $additionalColumns) {
            $builder->whereHas('employee', function (Builder $employeeQuery) use ($search) {
                $employeeQuery->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });

            if (!empty($additionalColumns)) {
                foreach ($additionalColumns as $column) {
                    $builder->orWhere($column, 'like', '%' . $search . '%');
                }
            }
        });
    }

    private function applyDateFilter(Builder $query, Request $request, string $column): void
    {
        if ($request->filled('date_from')) {
            $query->whereDate($column, '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate($column, '<=', $request->date_to);
        }
    }

    private function applyLeaveDateFilters(Builder $query, Request $request): void
    {
        if ($request->filled('date_from')) {
            $query->whereDate('start_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('end_date', '<=', $request->date_to);
        }
    }

    private function getFilterOptions(): array
    {
        return [
            'branches' => Branch::whereIn('created_by', getCompanyAndUsersId())
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'departments' => Department::whereIn('created_by', getCompanyAndUsersId())
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'employees' => User::with('employee')
                ->where('type', 'employee')
                ->whereIn('created_by', getCompanyAndUsersId())
                ->select('id', 'name')
                ->orderBy('name')
                ->get()
                ->map(function (User $user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'code' => $user->employee->employee_id ?? null,
                    ];
                })
                ->values(),
        ];
    }

    private function perPage(Request $request): int
    {
        $perPage = (int) ($request->input('per_page') ?? 10);
        return max(5, min($perPage, 100));
    }

    private function resolveDateRange(Request $request): array
    {
        $startDate = $request->filled('date_from')
            ? Carbon::parse($request->date_from)->startOfDay()
            : Carbon::now()->subMonths(5)->startOfMonth();

        $endDate = $request->filled('date_to')
            ? Carbon::parse($request->date_to)->endOfDay()
            : Carbon::now()->endOfMonth();

        if ($startDate->greaterThan($endDate)) {
            [$startDate, $endDate] = [$endDate->copy()->startOfDay(), $startDate->copy()->endOfDay()];
        }

        return [$startDate, $endDate];
    }

    private function employeeProfileQuery(Request $request): Builder
    {
        $query = Employee::query()
            ->with(['user:id,name,email', 'branch:id,name', 'department:id,name'])
            ->whereIn('created_by', getCompanyAndUsersId());

        if ($request->filled('employee_id')) {
            $query->where('user_id', $request->employee_id);
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('user', function (Builder $builder) use ($search) {
                $builder->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        return $query;
    }

    private function buildTurnoverSeries(
        Carbon $startDate,
        Carbon $endDate,
        Collection $hires,
        Collection $resignations,
        Collection $terminations,
        int $headcount
    ): array {
        $hireBuckets = $hires
            ->filter(fn (Employee $employee) => $employee->date_of_joining)
            ->groupBy(fn (Employee $employee) => Carbon::parse($employee->date_of_joining)->format('Y-m'))
            ->map(fn ($group) => $group->count());

        $resignationBuckets = $resignations
            ->filter(fn ($resignation) => $resignation->last_working_day)
            ->groupBy(fn ($resignation) => Carbon::parse($resignation->last_working_day)->format('Y-m'))
            ->map(fn ($group) => $group->count());

        $terminationBuckets = $terminations
            ->filter(fn ($termination) => $termination->termination_date)
            ->groupBy(fn ($termination) => Carbon::parse($termination->termination_date)->format('Y-m'))
            ->map(fn ($group) => $group->count());

        $series = [];
        $cursor = $startDate->copy()->startOfMonth();
        $endCursor = $endDate->copy()->startOfMonth();

        while ($cursor <= $endCursor) {
            $key = $cursor->format('Y-m');
            $hiresCount = $hireBuckets->get($key, 0);
            $separationsCount = ($resignationBuckets->get($key, 0)) + ($terminationBuckets->get($key, 0));
            $series[] = [
                'month' => $cursor->format('M Y'),
                'hires' => $hiresCount,
                'separations' => $separationsCount,
                'turnover_rate' => $headcount > 0 ? round(($separationsCount / $headcount) * 100, 2) : 0,
            ];
            $cursor->addMonth();
        }

        return $series;
    }

    public function exportAbsenceReport(Request $request): StreamedResponse
    {
        $query = AttendanceRecord::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'shift',
            ])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where(function (Builder $builder) {
                $builder->where('is_absent', true)
                    ->orWhere('status', 'absent');
            });

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyDateFilter($query, $request, 'date');

        $records = $query->orderBy('date', 'desc')->get();

        return $this->generateExcelResponse($records, 'absence-report', [
            'Employee Name',
            'Employee Email',
            'Branch',
            'Department',
            'Shift',
            'Date',
            'Status',
            'Notes',
        ], function ($record) {
            $employee = $record->employee;
            $profile = $employee?->employee;
            return [
                $employee?->name ?? '',
                $employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                $record->shift?->name ?? '-',
                $record->date ? Carbon::parse($record->date)->format('Y-m-d') : '-',
                'Absent',
                $record->notes ?? '',
            ];
        });
    }

    public function exportLatenessReport(Request $request): StreamedResponse
    {
        $query = AttendanceRecord::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'shift',
            ])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where('is_late', true);

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyDateFilter($query, $request, 'date');

        $records = $query->orderBy('date', 'desc')->get();

        return $this->generateExcelResponse($records, 'lateness-report', [
            'Employee Name',
            'Employee Email',
            'Branch',
            'Department',
            'Shift',
            'Date',
            'Check In',
            'Expected Time',
            'Late Minutes',
            'Notes',
        ], function ($record) {
            $employee = $record->employee;
            $profile = $employee?->employee;
            return [
                $employee?->name ?? '',
                $employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                $record->shift?->name ?? '-',
                $record->date ? Carbon::parse($record->date)->format('Y-m-d') : '-',
                $record->check_in ? Carbon::parse($record->check_in)->format('H:i:s') : '-',
                $record->shift?->start_time ?? '-',
                $record->late_minutes ?? '0',
                $record->notes ?? '',
            ];
        });
    }

    public function exportLeaveReport(Request $request): StreamedResponse
    {
        $query = LeaveApplication::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'leaveType',
            ])
            ->whereIn('created_by', getCompanyAndUsersId());

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyLeaveDateFilters($query, $request);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('leave_type_id')) {
            $query->where('leave_type_id', $request->leave_type_id);
        }

        $records = $query->orderBy('start_date', 'desc')->get();

        return $this->generateExcelResponse($records, 'leave-report', [
            'Employee Name',
            'Employee Email',
            'Branch',
            'Department',
            'Leave Type',
            'Start Date',
            'End Date',
            'Total Days',
            'Status',
            'Reason',
        ], function ($record) {
            $employee = $record->employee;
            $profile = $employee?->employee;
            return [
                $employee?->name ?? '',
                $employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                $record->leaveType?->name ?? '-',
                $record->start_date ? Carbon::parse($record->start_date)->format('Y-m-d') : '-',
                $record->end_date ? Carbon::parse($record->end_date)->format('Y-m-d') : '-',
                $record->total_days ?? '0',
                ucfirst($record->status ?? 'pending'),
                $record->reason ?? '',
            ];
        });
    }

    public function exportMedicalExcuseReport(Request $request): StreamedResponse
    {
        $query = LeaveApplication::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'leaveType',
            ])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where(function (Builder $builder) {
                $builder->whereHas('leaveType', function (Builder $typeQuery) {
                    $typeQuery->where('name', 'like', '%medical%')
                        ->orWhere('name', 'like', '%sick%')
                        ->orWhere('name', 'like', '%health%');
                })
                ->orWhere('reason', 'like', '%medical%')
                ->orWhere('reason', 'like', '%doctor%');
            });

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyLeaveDateFilters($query, $request);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $records = $query->orderBy('start_date', 'desc')->get();

        return $this->generateExcelResponse($records, 'medical-excuse-report', [
            'Employee Name',
            'Employee Email',
            'Branch',
            'Department',
            'Leave Type',
            'Start Date',
            'End Date',
            'Total Days',
            'Status',
            'Reason',
        ], function ($record) {
            $employee = $record->employee;
            $profile = $employee?->employee;
            return [
                $employee?->name ?? '',
                $employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                $record->leaveType?->name ?? '-',
                $record->start_date ? Carbon::parse($record->start_date)->format('Y-m-d') : '-',
                $record->end_date ? Carbon::parse($record->end_date)->format('Y-m-d') : '-',
                $record->total_days ?? '0',
                ucfirst($record->status ?? 'pending'),
                $record->reason ?? '',
            ];
        });
    }

    public function exportWarningReport(Request $request): StreamedResponse
    {
        $query = Warning::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'issuer',
            ])
            ->whereIn('created_by', getCompanyAndUsersId());

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request, ['subject', 'warning_type']);
        $this->applyDateFilter($query, $request, 'warning_date');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('severity') && $request->severity !== 'all') {
            $query->where('severity', $request->severity);
        }

        $records = $query->orderBy('warning_date', 'desc')->get();

        return $this->generateExcelResponse($records, 'warning-report', [
            'Employee Name',
            'Employee Email',
            'Branch',
            'Department',
            'Subject',
            'Warning Type',
            'Severity',
            'Warning Date',
            'Status',
            'Issued By',
        ], function ($record) {
            $employee = $record->employee;
            $profile = $employee?->employee;
            return [
                $employee?->name ?? '',
                $employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                $record->subject ?? '-',
                $record->warning_type ?? '-',
                ucfirst($record->severity ?? '-'),
                $record->warning_date ? Carbon::parse($record->warning_date)->format('Y-m-d') : '-',
                ucfirst($record->status ?? 'draft'),
                $record->issuer?->name ?? '-',
            ];
        });
    }

    public function exportExpiredContractsReport(Request $request): StreamedResponse
    {
        $today = Carbon::today();

        $query = EmployeeContract::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'contractType',
            ])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->where(function (Builder $builder) use ($today) {
                $builder->where('status', 'expired')
                    ->orWhereDate('end_date', '<', $today);
            });

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyDateFilter($query, $request, 'end_date');

        if ($request->filled('contract_type_id')) {
            $query->where('contract_type_id', $request->contract_type_id);
        }

        $records = $query->orderBy('end_date', 'desc')->get();

        return $this->generateExcelResponse($records, 'expired-contracts-report', [
            'Employee Name',
            'Employee Email',
            'Branch',
            'Department',
            'Contract Type',
            'Start Date',
            'End Date',
            'Duration (Days)',
            'Status',
        ], function ($record) {
            $employee = $record->employee;
            $profile = $employee?->employee;
            $duration = $record->start_date && $record->end_date
                ? Carbon::parse($record->start_date)->diffInDays(Carbon::parse($record->end_date))
                : 0;
            return [
                $employee?->name ?? '',
                $employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                $record->contractType?->name ?? '-',
                $record->start_date ? Carbon::parse($record->start_date)->format('Y-m-d') : '-',
                $record->end_date ? Carbon::parse($record->end_date)->format('Y-m-d') : '-',
                $duration,
                ucfirst($record->status ?? 'active'),
            ];
        });
    }

    public function exportTrainingReport(Request $request): StreamedResponse
    {
        $query = EmployeeTraining::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'trainingProgram',
            ])
            ->whereIn('created_by', getCompanyAndUsersId());

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyDateFilter($query, $request, 'assigned_date');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('training_program_id')) {
            $query->where('training_program_id', $request->training_program_id);
        }

        $records = $query->orderBy('assigned_date', 'desc')->get();

        return $this->generateExcelResponse($records, 'training-report', [
            'Employee Name',
            'Employee Email',
            'Branch',
            'Department',
            'Training Program',
            'Assigned Date',
            'Start Date',
            'End Date',
            'Status',
            'Score',
        ], function ($record) {
            $employee = $record->employee;
            $profile = $employee?->employee;
            return [
                $employee?->name ?? '',
                $employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                $record->trainingProgram?->name ?? '-',
                $record->assigned_date ? Carbon::parse($record->assigned_date)->format('Y-m-d') : '-',
                $record->start_date ? Carbon::parse($record->start_date)->format('Y-m-d') : '-',
                $record->end_date ? Carbon::parse($record->end_date)->format('Y-m-d') : '-',
                ucfirst($record->status ?? 'assigned'),
                $record->score ?? '-',
            ];
        });
    }

    public function exportResignationReport(Request $request): StreamedResponse
    {
        $query = Resignation::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'approver',
            ])
            ->whereIn('created_by', getCompanyAndUsersId());

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request);
        $this->applyDateFilter($query, $request, 'resignation_date');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $records = $query->orderBy('resignation_date', 'desc')->get();

        return $this->generateExcelResponse($records, 'resignation-report', [
            'Employee Name',
            'Employee Email',
            'Branch',
            'Department',
            'Resignation Date',
            'Last Working Day',
            'Notice Period (Days)',
            'Reason',
            'Status',
            'Approved By',
        ], function ($record) {
            $employee = $record->employee;
            $profile = $employee?->employee;
            return [
                $employee?->name ?? '',
                $employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                $record->resignation_date ? Carbon::parse($record->resignation_date)->format('Y-m-d') : '-',
                $record->last_working_day ? Carbon::parse($record->last_working_day)->format('Y-m-d') : '-',
                $record->notice_period ?? '0',
                $record->reason ?? '',
                ucfirst($record->status ?? 'pending'),
                $record->approver?->name ?? '-',
            ];
        });
    }

    public function exportTerminationReport(Request $request): StreamedResponse
    {
        $query = Termination::with([
                'employee',
                'employee.employee',
                'employee.employee.branch',
                'employee.employee.department',
                'approver',
            ])
            ->whereIn('created_by', getCompanyAndUsersId());

        $this->applyEmployeeFilters($query, $request);
        $this->applySearchFilter($query, $request, ['termination_type', 'reason', 'description']);
        $this->applyDateFilter($query, $request, 'termination_date');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('termination_type') && $request->termination_type !== 'all') {
            $query->where('termination_type', $request->termination_type);
        }

        $records = $query->orderBy('termination_date', 'desc')->get();

        return $this->generateExcelResponse($records, 'termination-report', [
            'Employee Name',
            'Employee Email',
            'Branch',
            'Department',
            'Termination Type',
            'Termination Date',
            'Notice Date',
            'Notice Period (Days)',
            'Reason',
            'Status',
            'Approved By',
        ], function ($record) {
            $employee = $record->employee;
            $profile = $employee?->employee;
            return [
                $employee?->name ?? '',
                $employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                $record->termination_type ?? '-',
                $record->termination_date ? Carbon::parse($record->termination_date)->format('Y-m-d') : '-',
                $record->notice_date ? Carbon::parse($record->notice_date)->format('Y-m-d') : '-',
                $record->notice_period ?? '0',
                $record->reason ?? '',
                ucfirst($record->status ?? 'pending'),
                $record->approver?->name ?? '-',
            ];
        });
    }

    public function exportTurnoverReport(Request $request): StreamedResponse
    {
        [$startDate, $endDate] = $this->resolveDateRange($request);

        $employeeQuery = $this->employeeProfileQuery($request);

        $hireRecords = (clone $employeeQuery)
            ->whereNotNull('date_of_joining')
            ->whereBetween('date_of_joining', [$startDate, $endDate])
            ->get();

        $resignationBase = Resignation::with(['employee', 'employee.employee.branch', 'employee.employee.department'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('status', ['approved', 'completed']);
        $this->applyEmployeeFilters($resignationBase, $request);
        $resignationRecords = (clone $resignationBase)
            ->whereNotNull('last_working_day')
            ->whereBetween('last_working_day', [$startDate, $endDate])
            ->get();

        $terminationBase = Termination::with(['employee', 'employee.employee.branch', 'employee.employee.department'])
            ->whereIn('created_by', getCompanyAndUsersId())
            ->whereIn('status', ['approved', 'completed']);
        $this->applyEmployeeFilters($terminationBase, $request);
        $terminationRecords = (clone $terminationBase)
            ->whereNotNull('termination_date')
            ->whereBetween('termination_date', [$startDate, $endDate])
            ->get();

        $combinedData = [];

        foreach ($hireRecords as $employee) {
            $profile = $employee;
            $combinedData[] = [
                $employee->user?->name ?? '',
                $employee->user?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                'New Hire',
                $employee->date_of_joining ? Carbon::parse($employee->date_of_joining)->format('Y-m-d') : '-',
                '-',
                '-',
            ];
        }

        foreach ($resignationRecords as $resignation) {
            $profile = $resignation->employee->employee;
            $combinedData[] = [
                $resignation->employee?->name ?? '',
                $resignation->employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                'Resignation',
                $resignation->resignation_date ? Carbon::parse($resignation->resignation_date)->format('Y-m-d') : '-',
                $resignation->last_working_day ? Carbon::parse($resignation->last_working_day)->format('Y-m-d') : '-',
                ucfirst($resignation->status ?? 'pending'),
            ];
        }

        foreach ($terminationRecords as $termination) {
            $profile = $termination->employee->employee;
            $combinedData[] = [
                $termination->employee?->name ?? '',
                $termination->employee?->email ?? '',
                $profile?->branch?->name ?? 'Not Assigned',
                $profile?->department?->name ?? 'Not Assigned',
                'Termination',
                $termination->termination_date ? Carbon::parse($termination->termination_date)->format('Y-m-d') : '-',
                '-',
                ucfirst($termination->status ?? 'pending'),
            ];
        }

        $filename = 'turnover-report-' . date('Y-m-d') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($combinedData) {
            $file = fopen('php://output', 'w');
            fputcsv($file, [
                'Employee Name',
                'Employee Email',
                'Branch',
                'Department',
                'Type',
                'Event Date',
                'Last Working Day',
                'Status',
            ]);

            foreach ($combinedData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function generateExcelResponse(Collection $records, string $reportName, array $headers, callable $rowMapper): StreamedResponse
    {
        $filename = $reportName . '-' . date('Y-m-d') . '.csv';

        $httpHeaders = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($records, $headers, $rowMapper) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $headers);

            foreach ($records as $record) {
                fputcsv($file, $rowMapper($record));
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $httpHeaders);
    }
}
