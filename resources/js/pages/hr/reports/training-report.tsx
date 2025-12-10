import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { PageTemplate } from '@/components/page-template';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { SummaryCard } from './components/summary-card';
import { GraduationCap, Award, RefreshCcw, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function TrainingReport() {
  const { t } = useTranslation();
  const { records, stats, options, filters: pageFilters = {} } = usePage().props as any;
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [branchId, setBranchId] = useState(pageFilters.branch_id || '');
  const [departmentId, setDepartmentId] = useState(pageFilters.department_id || '');
  const [employeeId, setEmployeeId] = useState(pageFilters.employee_id || '');
  const [status, setStatus] = useState(pageFilters.status || 'all');
  const [programId, setProgramId] = useState(pageFilters.training_program_id || '');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);

  const serializeDate = (date?: Date) => (date ? format(date, 'yyyy-MM-dd') : undefined);

  const buildParams = (overrides: Record<string, any> = {}) => ({
    search: searchTerm || undefined,
    branch_id: branchId || undefined,
    department_id: departmentId || undefined,
    employee_id: employeeId || undefined,
    status: status === 'all' ? undefined : status,
    training_program_id: programId || undefined,
    date_from: serializeDate(dateFrom),
    date_to: serializeDate(dateTo),
    per_page: overrides.per_page ?? pageFilters.per_page,
    ...overrides,
  });

  const applyFilters = () => {
    router.get(route('hr.reports.training'), buildParams(), { preserveState: true, preserveScroll: true });
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    applyFilters();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setBranchId('');
    setDepartmentId('');
    setEmployeeId('');
    setStatus('all');
    setProgramId('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setShowFilters(false);

    router.get(
      route('hr.reports.training'),
      { per_page: pageFilters.per_page },
      { preserveState: true, preserveScroll: true }
    );
  };

  const hasActiveFilters = () =>
    !!(
      branchId ||
      departmentId ||
      employeeId ||
      dateFrom ||
      dateTo ||
      (status && status !== 'all') ||
      programId
    );

  const activeFilterCount = () =>
    [branchId, departmentId, employeeId, dateFrom, dateTo, status !== 'all' ? status : '', programId]
      .filter(Boolean).length;

  const branchOptions = [
    { value: '', label: t('All Branches') },
    ...(options?.branches || []).map((branch: any) => ({
      value: branch.id?.toString() ?? '',
      label: branch.name,
    })),
  ];

  const departmentOptions = [
    { value: '', label: t('All Departments') },
    ...(options?.departments || []).map((department: any) => ({
      value: department.id?.toString() ?? '',
      label: department.name,
    })),
  ];

  const employeeOptions = [
    { value: '', label: t('All Employees') },
    ...(options?.employees || []).map((employee: any) => ({
      value: employee.id?.toString() ?? '',
      label: employee.code ? `${employee.name} (${employee.code})` : employee.name,
    })),
  ];

  const programOptions = [
    { value: '', label: t('All Programs') },
    ...(options?.training_programs || []).map((program: any) => ({
      value: program.id?.toString() ?? '',
      label: program.name,
    })),
  ];

  const statusOptions = [
    { value: 'all', label: t('All Statuses') },
    { value: 'assigned', label: t('Assigned') },
    { value: 'in_progress', label: t('In Progress') },
    { value: 'completed', label: t('Completed') },
    { value: 'failed', label: t('Failed') },
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('HR Reports') },
    { title: t('Training Report') },
  ];

  const statusVariant: Record<string, 'secondary' | 'success' | 'default' | 'destructive'> = {
    assigned: 'secondary',
    in_progress: 'default',
    completed: 'success',
    failed: 'destructive',
  };

  return (
    <PageTemplate
      title={t('Training Report')}
      description={t('Measure progress on employee learning initiatives')}
      url="/hr/reports/training"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title={t('Assigned Trainings')}
            value={stats?.total_assigned ?? 0}
            description={t('Assignments created in this range')}
            icon={<GraduationCap className="h-5 w-5" />}
          />
          <SummaryCard
            title={t('Completed')}
            value={stats?.completed ?? 0}
            description={t('Employees that finished the training')}
            icon={<Award className="h-5 w-5" />}
            accent="success"
          />
          <SummaryCard
            title={t('In Progress')}
            value={stats?.in_progress ?? 0}
            description={t('Currently active trainings')}
            icon={<RefreshCcw className="h-5 w-5" />}
            accent="warning"
          />
          <SummaryCard
            title={t('Failed')}
            value={stats?.failed ?? 0}
            description={t('Marked as failed or incomplete')}
            icon={<XCircle className="h-5 w-5" />}
            accent="danger"
          />
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <SearchAndFilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSearch={handleSearch}
              filters={[
                {
                  name: 'branch_id',
                  label: t('Branch'),
                  type: 'select' as const,
                  value: branchId,
                  onChange: setBranchId,
                  options: branchOptions,
                },
                {
                  name: 'department_id',
                  label: t('Department'),
                  type: 'select' as const,
                  value: departmentId,
                  onChange: setDepartmentId,
                  options: departmentOptions,
                },
                {
                  name: 'employee_id',
                  label: t('Employee'),
                  type: 'select' as const,
                  value: employeeId,
                  onChange: setEmployeeId,
                  options: employeeOptions,
                },
                {
                  name: 'status',
                  label: t('Status'),
                  type: 'select' as const,
                  value: status,
                  onChange: setStatus,
                  options: statusOptions,
                },
                {
                  name: 'training_program_id',
                  label: t('Program'),
                  type: 'select' as const,
                  value: programId,
                  onChange: setProgramId,
                  options: programOptions,
                },
                {
                  name: 'date_from',
                  label: t('Assigned From'),
                  type: 'date' as const,
                  value: dateFrom,
                  onChange: setDateFrom,
                },
                {
                  name: 'date_to',
                  label: t('Assigned To'),
                  type: 'date' as const,
                  value: dateTo,
                  onChange: setDateTo,
                },
              ]}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              hasActiveFilters={hasActiveFilters}
              activeFilterCount={activeFilterCount}
              onApplyFilters={applyFilters}
              onResetFilters={handleResetFilters}
              currentPerPage={pageFilters.per_page?.toString() || '10'}
              onPerPageChange={(value) =>
                router.get(route('hr.reports.training'), buildParams({ per_page: value }), {
                  preserveState: true,
                  preserveScroll: true,
                })
              }
            />

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Employee')}</TableHead>
                    <TableHead>{t('Program')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Assigned Date')}</TableHead>
                    <TableHead>{t('Completion Date')}</TableHead>
                    <TableHead>{t('Score')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records?.data?.length ? (
                    records.data.map((record: any) => {
                      const employee = record.employee;
                      const variant = statusVariant[record.status] ?? 'secondary';

                      return (
                        <TableRow key={`training-${record.id}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{employee?.name}</span>
                              <span className="text-xs text-muted-foreground">{employee?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{record.training_program?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={variant}>{t(record.status || 'assigned')}</Badge>
                          </TableCell>
                          <TableCell>
                            {record.assigned_date ? format(new Date(record.assigned_date), 'PP') : '-'}
                          </TableCell>
                          <TableCell>
                            {record.completion_date ? format(new Date(record.completion_date), 'PP') : '—'}
                          </TableCell>
                          <TableCell>{record.score ?? '-'}</TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        {t('No training records found for the selected filters')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <Pagination
              from={records?.from}
              to={records?.to}
              total={records?.total}
              links={records?.links}
              entityName={t('trainings')}
              onPageChange={(url) =>
                router.visit(url, {
                  preserveState: true,
                  preserveScroll: true,
                })
              }
            />
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
