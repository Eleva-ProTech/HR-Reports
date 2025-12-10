import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { PageTemplate } from '@/components/page-template';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { SummaryCard } from './components/summary-card';
import { AlarmClock, Clock4, Users, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function LatenessReport() {
  const { t } = useTranslation();
  const { records, stats, options, filters: pageFilters = {} } = usePage().props as any;
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [branchId, setBranchId] = useState(pageFilters.branch_id || '');
  const [departmentId, setDepartmentId] = useState(pageFilters.department_id || '');
  const [employeeId, setEmployeeId] = useState(pageFilters.employee_id || '');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);

  const serializeDate = (date?: Date) => (date ? format(date, 'yyyy-MM-dd') : undefined);

  const buildParams = (overrides: Record<string, any> = {}) => ({
    search: searchTerm || undefined,
    branch_id: branchId || undefined,
    department_id: departmentId || undefined,
    employee_id: employeeId || undefined,
    date_from: serializeDate(dateFrom),
    date_to: serializeDate(dateTo),
    per_page: overrides.per_page ?? pageFilters.per_page,
    ...overrides,
  });

  const applyFilters = () => {
    router.get(route('hr.reports.lateness'), buildParams(), { preserveState: true, preserveScroll: true });
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
    setDateFrom(undefined);
    setDateTo(undefined);
    setShowFilters(false);

    router.get(
      route('hr.reports.lateness'),
      { per_page: pageFilters.per_page },
      { preserveState: true, preserveScroll: true }
    );
  };

  const hasActiveFilters = () =>
    !!(branchId || departmentId || employeeId || dateFrom || dateTo);

  const activeFilterCount = () =>
    [branchId, departmentId, employeeId, dateFrom, dateTo].filter(Boolean).length;

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

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('HR Reports') },
    { title: t('Lateness Report') },
  ];

  return (
    <PageTemplate
      title={t('Lateness Report')}
      description={t('Track repeated late arrivals and intervene early')}
      url="/hr/reports/lateness"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title={t('Late Arrivals')}
            value={stats?.total_late_days ?? 0}
            description={t('Occurrences within the selected range')}
            icon={<AlarmClock className="h-5 w-5" />}
            accent="warning"
          />
          <SummaryCard
            title={t('Affected Employees')}
            value={stats?.unique_employees ?? 0}
            description={t('Employees reporting late at least once')}
            icon={<Users className="h-5 w-5" />}
          />
          <SummaryCard
            title={t('Avg Late Days')}
            value={stats?.avg_late_days ?? 0}
            description={t('Average occurrences per employee')}
            icon={<Clock4 className="h-5 w-5" />}
          />
          <SummaryCard
            title={t('This Month')}
            value={stats?.current_month ?? 0}
            description={t('Late arrivals in the current month')}
            icon={<CalendarDays className="h-5 w-5" />}
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
                router.get(route('hr.reports.lateness'), buildParams({ per_page: value }), {
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
                    <TableHead>{t('Branch')}</TableHead>
                    <TableHead>{t('Department')}</TableHead>
                    <TableHead>{t('Shift')}</TableHead>
                    <TableHead>{t('Clock In')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead className="w-1/4">{t('Notes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records?.data?.length ? (
                    records.data.map((record: any) => {
                      const employee = record.employee;
                      const profile = employee?.employee;
                      return (
                        <TableRow key={`late-${record.id}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{employee?.name}</span>
                              <span className="text-xs text-muted-foreground">{employee?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{profile?.branch?.name || t('Not Assigned')}</TableCell>
                          <TableCell>{profile?.department?.name || t('Not Assigned')}</TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                              <span>{record.shift?.name || '-'}</span>
                              {record.shift?.start_time && (
                                <span className="text-xs text-muted-foreground">
                                  {t('Starts at')} {record.shift.start_time}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{record.clock_in || '--:--'}</Badge>
                          </TableCell>
                          <TableCell>
                            {record.date ? format(new Date(record.date), 'PP') : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {record.notes || t('Late arrival recorded')}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                        {t('No late arrivals found for the selected filters')}
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
              entityName={t('records')}
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
