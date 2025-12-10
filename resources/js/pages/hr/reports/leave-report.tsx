import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { PageTemplate } from '@/components/page-template';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { SummaryCard } from './components/summary-card';
import { CalendarRange, ClipboardCheck, ClipboardList, Clock4 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function LeaveReport() {
  const { t } = useTranslation();
  const { records, stats, options, filters: pageFilters = {} } = usePage().props as any;
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [branchId, setBranchId] = useState(pageFilters.branch_id || '');
  const [departmentId, setDepartmentId] = useState(pageFilters.department_id || '');
  const [employeeId, setEmployeeId] = useState(pageFilters.employee_id || '');
  const [status, setStatus] = useState(pageFilters.status || 'all');
  const [leaveTypeId, setLeaveTypeId] = useState(pageFilters.leave_type_id || '');
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
    leave_type_id: leaveTypeId || undefined,
    date_from: serializeDate(dateFrom),
    date_to: serializeDate(dateTo),
    per_page: overrides.per_page ?? pageFilters.per_page,
    ...overrides,
  });

  const applyFilters = () => {
    router.get(route('hr.reports.leaves'), buildParams(), { preserveState: true, preserveScroll: true });
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
    setLeaveTypeId('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setShowFilters(false);

    router.get(
      route('hr.reports.leaves'),
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
      leaveTypeId
    );

  const activeFilterCount = () =>
    [branchId, departmentId, employeeId, dateFrom, dateTo, status !== 'all' ? status : '', leaveTypeId]
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

  const leaveTypeOptions = [
    { value: '', label: t('All Leave Types') },
    ...(options?.leave_types || []).map((type: any) => ({
      value: type.id?.toString() ?? '',
      label: type.name,
    })),
  ];

  const statusOptions = [
    { value: 'all', label: t('All Statuses') },
    { value: 'pending', label: t('Pending') },
    { value: 'approved', label: t('Approved') },
    { value: 'rejected', label: t('Rejected') },
    { value: 'completed', label: t('Completed') },
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('HR Reports') },
    { title: t('Leave Report') },
  ];

  const statusVariant: Record<string, 'default' | 'success' | 'secondary' | 'destructive'> = {
    approved: 'success',
    pending: 'secondary',
    rejected: 'destructive',
    completed: 'success',
  };

  return (
    <PageTemplate
      title={t('Leave Report')}
      description={t('Understand leave utilization across your organization')}
      url="/hr/reports/leaves"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title={t('Total Requests')}
            value={stats?.total_requests ?? 0}
            description={t('All leave requests in this window')}
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <SummaryCard
            title={t('Approved Requests')}
            value={stats?.approved_requests ?? 0}
            description={t('Requests that were approved')}
            icon={<ClipboardCheck className="h-5 w-5" />}
            accent="success"
          />
          <SummaryCard
            title={t('Pending Requests')}
            value={stats?.pending_requests ?? 0}
            description={t('Awaiting review or approval')}
            icon={<Clock4 className="h-5 w-5" />}
            accent="warning"
          />
          <SummaryCard
            title={t('Total Leave Days')}
            value={stats?.total_days ?? 0}
            description={t('Days of leave requested')}
            icon={<CalendarRange className="h-5 w-5" />}
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
                  name: 'leave_type_id',
                  label: t('Leave Type'),
                  type: 'select' as const,
                  value: leaveTypeId,
                  onChange: setLeaveTypeId,
                  options: leaveTypeOptions,
                },
                {
                  name: 'date_from',
                  label: t('From Date'),
                  type: 'date' as const,
                  value: dateFrom,
                  onChange: setDateFrom,
                },
                {
                  name: 'date_to',
                  label: t('To Date'),
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
                router.get(route('hr.reports.leaves'), buildParams({ per_page: value }), {
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
                    <TableHead>{t('Leave Type')}</TableHead>
                    <TableHead>{t('Dates')}</TableHead>
                    <TableHead>{t('Total Days')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead className="w-1/4">{t('Reason')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records?.data?.length ? (
                    records.data.map((record: any) => {
                      const employee = record.employee;
                      const period = record.start_date && record.end_date
                        ? `${format(new Date(record.start_date), 'PP')} - ${format(new Date(record.end_date), 'PP')}`
                        : '—';
                      const variant = statusVariant[record.status] ?? 'secondary';

                      return (
                        <TableRow key={`leave-${record.id}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{employee?.name}</span>
                              <span className="text-xs text-muted-foreground">{employee?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{record.leave_type?.name || '-'}</TableCell>
                          <TableCell>{period}</TableCell>
                          <TableCell>{record.total_days ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant={variant}>{t(record.status || 'pending')}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {record.reason || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        {t('No leave requests found for the selected filters')}
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
              entityName={t('leave requests')}
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
