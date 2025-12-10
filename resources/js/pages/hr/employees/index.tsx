// pages/hr/employees/index.tsx
import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Eye, Edit, Trash2, Lock, Unlock, MoreHorizontal, Key, UploadCloud, Download } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useInitials } from '@/hooks/use-initials';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { CrudFormModal } from '@/components/CrudFormModal';
import { getImagePath } from '@/utils/helpers';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function Employees() {
  const { t } = useTranslation();
  const { auth, employees, branches, planLimits, departments, designations, filters: pageFilters = {}, importSummary } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();
  
  // State
  const [activeView, setActiveView] = useState('list');
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedDepartment, setSelectedDepartment] = useState(pageFilters.department || 'all');
  const [selectedBranch, setSelectedBranch] = useState(pageFilters.branch || 'all');
  const [selectedDesignation, setSelectedDesignation] = useState(pageFilters.designation || 'all');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
  const [showFilters, setShowFilters] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importValidationErrors, setImportValidationErrors] = useState<Record<string, string | string[]>>({});
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [showImportSummary, setShowImportSummary] = useState<boolean>(!!importSummary);

  useEffect(() => {
    setShowImportSummary(!!importSummary);
  }, [importSummary]);
  
  // Check if any filters are active
  const hasActiveFilters = () => {
    return selectedDepartment !== 'all' || selectedBranch !== 'all' || selectedDesignation !== 'all' || selectedStatus !== 'all' || searchTerm !== '';
  };
  
  // Count active filters
  const activeFilterCount = () => {
    return (selectedDepartment !== 'all' ? 1 : 0) + 
           (selectedBranch !== 'all' ? 1 : 0) + 
           (selectedDesignation !== 'all' ? 1 : 0) + 
           (selectedStatus !== 'all' ? 1 : 0) + 
           (searchTerm ? 1 : 0);
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };
  
  const applyFilters = () => {
    router.get(route('hr.employees.index'), { 
      page: 1,
      search: searchTerm || undefined,
      department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
      branch: selectedBranch !== 'all' ? selectedBranch : undefined,
      designation: selectedDesignation !== 'all' ? selectedDesignation : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };
  
  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    
    router.get(route('hr.employees.index'), { 
      sort_field: field, 
      sort_direction: direction, 
      page: 1,
      search: searchTerm || undefined,
      department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
      branch: selectedBranch !== 'all' ? selectedBranch : undefined,
      designation: selectedDesignation !== 'all' ? selectedDesignation : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };
  
  const handleAction = (action: string, item: any) => {
    setCurrentItem(item);
    
    switch (action) {
      case 'view':
        router.get(route('hr.employees.show', item.employee?.id || item.id));
        break;
      case 'edit':
        router.get(route('hr.employees.edit', item.employee?.id || item.id));
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
      case 'toggle-status':
        handleToggleStatus(item);
        break;
      case 'change-password':
        setIsPasswordModalOpen(true);
        break;
    }
  };
  
  const handleAddNew = () => {
    router.get(route('hr.employees.create'));
  };

  const handleDownloadTemplate = () => {
    window.location.href = route('hr.employees.import.template');
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setImportValidationErrors({});
    setImportFile(null);
  };

  const handleImportSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!importFile) {
      setImportValidationErrors({
        file: t('Please select the CSV template generated from the example file.')
      });
      return;
    }

    toast.loading(t('Importing employees...'));

    router.post(route('hr.employees.import'), { file: importFile }, {
      forceFormData: true,
      onSuccess: (page) => {
        closeImportModal();
        toast.dismiss();
        if (page.props.flash?.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash?.error) {
          toast.error(t(page.props.flash.error));
        } else {
          toast.success(t('Employee import completed.'));
        }
      },
      onError: (errors) => {
        toast.dismiss();
        if (errors && typeof errors === 'object') {
          setImportValidationErrors(errors as Record<string, string | string[]>);
          toast.error(t('Please fix the highlighted issues and try again.'));
        } else if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Unable to import employees. Please try again.'));
        }
      }
    });
  };

  const getImportError = (field: string): string | null => {
    const fieldError = importValidationErrors[field];
    if (!fieldError) {
      return null;
    }

    return Array.isArray(fieldError) ? fieldError[0] : fieldError;
  };
  
  const handleDeleteConfirm = () => {
    toast.loading(t('Deleting employee...'));
    
    router.delete(route('hr.employees.destroy', currentItem.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to delete employee: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };
  
  const handleToggleStatus = (employee: any) => {
    const currentStatus = employee.status || 'inactive';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} employee...`);
    
    router.put(route('hr.employees.toggle-status', employee.employee?.id || employee.id), {}, {
      onSuccess: (page) => {
        toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to update employee status: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };

  const handlePasswordChange = (formData: any) => {
    toast.loading(t('Changing password...'));
    
    router.put(route('hr.employees.change-password', currentItem.employee?.id || currentItem.id), formData, {
      onSuccess: (page) => {
        setIsPasswordModalOpen(false);
        toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(t(errors));
        } else {
          toast.error(t('Failed to change password: {{errors}}', { errors: Object.values(errors).join(', ') }));
        }
      }
    });
  };
  
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('all');
    setSelectedBranch('all');
    setSelectedDesignation('all');
    setSelectedStatus('all');
    setShowFilters(false);
    
    router.get(route('hr.employees.index'), {
      page: 1,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  // Define page actions
  const pageActions = [];
  
  // Add the "Add New Employee" button if user has permission
  if (hasPermission(permissions, 'create-employees')) {
    const canCreate = !planLimits || planLimits.can_create;
    pageActions.push({
      label: planLimits && !canCreate ? t('Employee Create Limit Reached ({{current}}/{{max}})', { current: planLimits.current_users, max: planLimits.max_users }) : t('Add Employee'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: canCreate ? 'default' : 'outline',
      onClick: canCreate ? () => handleAddNew() : () => toast.error(t('Employee limit exceeded. Your plan allows maximum {{max}} users. Please upgrade your plan.', { max: planLimits.max_users })),
      disabled: !canCreate
    });

    pageActions.push({
      label: t('Import CSV'),
      icon: <UploadCloud className="h-4 w-4 mr-2" />,
      variant: 'outline',
      onClick: canCreate
        ? () => {
            setImportValidationErrors({});
            setImportFile(null);
            setIsImportModalOpen(true);
          }
        : () => toast.error(t('Employee limit exceeded. Your plan allows maximum {{max}} users. Please upgrade your plan.', { max: planLimits?.max_users })),
    });

    pageActions.push({
      label: t('Download Example CSV'),
      icon: <Download className="h-4 w-4 mr-2" />,
      variant: 'outline',
      onClick: handleDownloadTemplate
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('HR Management'), href: route('hr.employees.index') },
    { title: t('Employees') }
  ];

  // Define table columns
  const columns = [
    { 
      key: 'name', 
      label: t('Name'), 
      sortable: true,
      render: (value: any, row: any) => {
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white overflow-hidden">
              {row.avatar ? (
                <img src={getImagePath(row.avatar)} alt={row.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(row.name)
              )}
            </div>
            <div>
              <div className="font-medium">{row.name}</div>
              <div className="text-sm text-muted-foreground">{row.email}</div>
            </div>
          </div>
        );
      }
    },
    { 
      key: 'employee_id', 
      label: t('Employee ID'),
      sortable: false,
      render: (value: any, row: any) => {
        return row.employee?.employee_id || '-';
      }
    },
    { 
      key: 'department', 
      label: t('Department'),
      render: (value: any, row: any) => {
        return row.employee?.department?.name || '-';
      }
    },
    { 
      key: 'designation', 
      label: t('Designation'),
      render: (value: any, row: any) => {
        return row.employee?.designation?.name || '-';
      }
    },
    { 
      key: 'status', 
      label: t('Status'),
      render: (value: any, row: any) => {
        const status = row.status || 'inactive';
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
            status === 'active' 
              ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' 
              : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
          }`}>
            {status === 'active' ? t('Active') : t('Inactive')}
          </span>
        );
      }
    },
    { 
      key: 'date_of_joining', 
      label: t('Joined'), 
      sortable: false,
      render: (value: any, row: any) => {
        const joinDate = row.employee?.date_of_joining;
        return joinDate ? (window.appSettings?.formatDateTime(joinDate, false) || new Date(joinDate).toLocaleDateString()) : '-';
      }
    }
  ];

  // Define table actions
  const actions = [
    { 
      label: t('View'), 
      icon: 'Eye', 
      action: 'view', 
      className: 'text-blue-500',
      requiredPermission: 'view-employees'
    },
    { 
      label: t('Edit'), 
      icon: 'Edit', 
      action: 'edit', 
      className: 'text-amber-500',
      requiredPermission: 'edit-employees'
    },
    { 
      label: t('Change Password'), 
      icon: 'Key', 
      action: 'change-password', 
      className: 'text-green-500',
      requiredPermission: 'edit-employees'
    },
    { 
      label: t('Toggle Status'), 
      icon: 'Lock', 
      action: 'toggle-status', 
      className: 'text-amber-500',
      requiredPermission: 'edit-employees'
    },
    { 
      label: t('Delete'), 
      icon: 'Trash2', 
      action: 'delete', 
      className: 'text-red-500',
      requiredPermission: 'delete-employees'
    }
  ];

  // Prepare filter options
  const branchOptions = [
    { value: 'all', label: t('All Branches') },
    ...(branches || []).map((branch: any) => ({
      value: branch.id.toString(),
      label: branch.name
    }))
  ];

  const departmentOptions = [
    { value: 'all', label: t('All Departments') },
    ...(departments || []).map((department: any) => ({
      value: department.id.toString(),
      label: `${department.name} (${department.branch?.name || t('No Branch')})`
    }))
  ];

  const designationOptions = [
    { value: 'all', label: t('All Designations') },
    ...(designations || []).map((designation: any) => ({
      value: designation.id.toString(),
      label: `${designation.name} (${designation.department?.name || t('No Department')})`
    }))
  ];

  const statusOptions = [
    { value: 'all', label: t('All Statuses') },
    { value: 'active', label: t('Active') },
    { value: 'inactive', label: t('Inactive') },
    { value: 'probation', label: t('Probation') },
    { value: 'terminated', label: t('Terminated') }
  ];

  return (
    <PageTemplate 
      title={t("Employee Management")} 
      url="/hr/employees"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {importSummary && showImportSummary && (
        <div className="mb-4">
          <Alert className="relative border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-50">
            <AlertTitle>{t('Employee import summary')}</AlertTitle>
            <AlertDescription className="w-full">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('Processed')}</p>
                  <p className="text-lg font-semibold text-blue-900 dark:text-blue-50">{importSummary.processed || 0}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('Created')}</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">{importSummary.created || 0}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('Skipped')}</p>
                  <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{importSummary.skipped || 0}</p>
                </div>
              </div>

              {Array.isArray(importSummary.errors) && importSummary.errors.length > 0 && (
                <div className="mt-4 w-full">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{t('Rows with issues')}</p>
                  <ul className="mt-2 max-h-32 w-full space-y-1 overflow-y-auto text-xs text-red-600 dark:text-red-300">
                    {importSummary.errors.slice(0, 5).map((error: any, index: number) => (
                      <li key={`${error?.row ?? index}-${index}`}>
                        <span className="font-semibold">{t('Row {{row}}', { row: error?.row ?? t('Unknown') })}:</span> {error?.message}
                      </li>
                    ))}
                  </ul>
                  {importSummary.errors.length > 5 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t('+{{count}} more issues', { count: importSummary.errors.length - 5 })}
                    </p>
                  )}
                </div>
              )}
            </AlertDescription>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowImportSummary(false)}
              type="button"
            >
              {t('Dismiss')}
            </Button>
          </Alert>
        </div>
      )}

      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 p-4">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[
            {
              name: 'branch',
              label: t('Branch'),
              type: 'select',
              value: selectedBranch,
              onChange: setSelectedBranch,
              options: branchOptions
            },
            {
              name: 'department',
              label: t('Department'),
              type: 'select',
              value: selectedDepartment,
              onChange: setSelectedDepartment,
              options: departmentOptions
            },
            {
              name: 'designation',
              label: t('Designation'),
              type: 'select',
              value: selectedDesignation,
              onChange: setSelectedDesignation,
              options: designationOptions
            },
            {
              name: 'status',
              label: t('Status'),
              type: 'select',
              value: selectedStatus,
              onChange: setSelectedStatus,
              options: statusOptions
            }
          ]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}
          onApplyFilters={applyFilters}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('hr.employees.index'), { 
              page: 1, 
              per_page: parseInt(value),
              search: searchTerm || undefined,
              department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
              branch: selectedBranch !== 'all' ? selectedBranch : undefined,
              designation: selectedDesignation !== 'all' ? selectedDesignation : undefined,
              status: selectedStatus !== 'all' ? selectedStatus : undefined
            }, { preserveState: true, preserveScroll: true });
          }}
          showViewToggle={true}
          activeView={activeView}
          onViewChange={setActiveView}
        />
      </div>

      {/* Content section */}
      {activeView === 'list' ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
          <CrudTable
            columns={columns}
            actions={actions}
            data={employees?.data || []}
            from={employees?.from || 1}
            onAction={handleAction}
            sortField={pageFilters.sort_field}
            sortDirection={pageFilters.sort_direction}
            onSort={handleSort}
            permissions={permissions}
            entityPermissions={{
              view: 'view-employees',
              create: 'create-employees',
              edit: 'edit-employees',
              delete: 'delete-employees'
            }}
          />

          {/* Pagination section */}
          <Pagination
            from={employees?.from || 0}
            to={employees?.to || 0}
            total={employees?.total || 0}
            links={employees?.links}
            entityName={t("employees")}
            onPageChange={(url) => router.get(url)}
          />
        </div>
      ) : (
        <div>
          {/* Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {employees?.data?.map((employee: any) => (
              <Card key={employee.id} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow">
                {/* Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold overflow-hidden">
                        {employee.avatar ? (
                          <img src={getImagePath(employee.avatar)} alt={employee.name} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(employee.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{employee.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{employee.email}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{employee.employee?.employee_id || '-'}</p>
                        <div className="flex items-center">
                          <div className={`h-2 w-2 rounded-full mr-2 ${
                            employee.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {employee.status === 'active' ? t('Active') : t('Inactive')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 z-50" sideOffset={5}>
                        {hasPermission(permissions, 'view-employees') && (
                          <DropdownMenuItem onClick={() => handleAction('view', employee)}>
                            <Eye className="h-4 w-4 mr-2" />
                            <span>{t("View Employee")}</span>
                          </DropdownMenuItem>
                        )}
                        {hasPermission(permissions, 'edit-employees') && (
                          <DropdownMenuItem onClick={() => handleAction('change-password', employee)}>
                            <Key className="h-4 w-4 mr-2" />
                            <span>{t("Change Password")}</span>
                          </DropdownMenuItem>
                        )}
                        {hasPermission(permissions, 'edit-employees') && (
                          <DropdownMenuItem onClick={() => handleAction('toggle-status', employee)}>
                            {employee.status === 'active' ? 
                              <Lock className="h-4 w-4 mr-2" /> : 
                              <Unlock className="h-4 w-4 mr-2" />
                            }
                            <span>{employee.status === 'active' ? t("Deactivate") : t("Activate")}</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {hasPermission(permissions, 'edit-employees') && (
                          <DropdownMenuItem onClick={() => handleAction('edit', employee)} className="text-amber-600">
                            <Edit className="h-4 w-4 mr-2" />
                            <span>{t("Edit")}</span>
                          </DropdownMenuItem>
                        )}
                        {hasPermission(permissions, 'delete-employees') && (
                          <DropdownMenuItem onClick={() => handleAction('delete', employee)} className="text-rose-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            <span>{t("Delete")}</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Department & Designation info */}
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3 mb-4">
                    <div className="text-sm mb-1">
                      <span className="font-medium">{t("Department")}:</span> {employee.employee?.department?.name || '-'}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{t("Designation")}:</span> {employee.employee?.designation?.name || '-'}
                    </div>
                  </div>
                
                  {/* Joined date */}
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    {t("Joined:")} {employee.employee?.date_of_joining ? (window.appSettings?.formatDateTime(employee.employee.date_of_joining, false) || new Date(employee.employee.date_of_joining).toLocaleDateString()) : '-'}
                  </div>
                
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {hasPermission(permissions, 'edit-employees') && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAction('edit', employee)}
                        className="flex-1 h-9 text-sm border-gray-300 dark:border-gray-600 dark:text-gray-200"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t("Edit")}
                      </Button>
                    )}
                    
                    {hasPermission(permissions, 'view-employees') && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAction('view', employee)}
                        className="flex-1 h-9 text-sm border-gray-300 dark:border-gray-600 dark:text-gray-200"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t("View")}
                      </Button>
                    )}
                    
                    {hasPermission(permissions, 'delete-employees') && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAction('delete', employee)}
                        className="flex-1 h-9 text-sm text-gray-700 border-gray-300 dark:border-gray-600 dark:text-gray-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("Delete")}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          {/* Pagination for grid view */}
          <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
            <Pagination
              from={employees?.from || 0}
              to={employees?.to || 0}
              total={employees?.total || 0}
              links={employees?.links}
              entityName={t("employees")}
              onPageChange={(url) => router.get(url)}
            />
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName="employee"
      />

      {/* Change Password Modal */}
      <CrudFormModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={handlePasswordChange}
        formConfig={{
          fields: [
            { 
              name: 'password', 
              label: t('New Password'), 
              type: 'password', 
              required: true 
            },
            { 
              name: 'password_confirmation', 
              label: t('Confirm Password'), 
              type: 'password', 
              required: true 
            }
          ],
          modalSize: 'md'
        }}
        initialData={{}}
        title={t('Change Employee Password')}
        mode='edit'
      />

      {/* Import Employees Modal */}
      <Dialog
        open={isImportModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeImportModal();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Import Employees')}</DialogTitle>
            <DialogDescription>
              {t('Upload the CSV template to create multiple employees at once. The file must follow the column order provided in the example template.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-4 text-sm dark:border-blue-800 dark:bg-blue-950/30">
              <p className="text-sm text-muted-foreground">
                {t('Need a reference file? Download the example template which already includes the correct headers and two sample rows.')}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                {t('Download Example CSV')}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('CSV File')}</label>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setImportFile(file);
                  if (file) {
                    setImportValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.file;
                      return next;
                    });
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {t('Only CSV files up to 5MB are supported. Use UTF-8 encoding to avoid character issues.')}
              </p>
              {getImportError('file') && (
                <p className="text-xs text-red-600">{getImportError('file')}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeImportModal}>
              {t('Cancel')}
            </Button>
            <Button type="button" onClick={() => handleImportSubmit()}>
              {t('Start Import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
