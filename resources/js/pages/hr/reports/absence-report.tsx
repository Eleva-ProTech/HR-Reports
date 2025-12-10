import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { PageTemplate } from '@/components/page-template';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { SummaryCard } from './components/summary-card';
import { Users, CalendarDays, AlertTriangle, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from './components/export-button';

export default function AbsenceReport() {
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
    router.get(route('hr.reports.absence'), buildParams(), { preserveState: true, preserveScroll: true });
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
      route('hr.reports.absence'),
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
    { title: t('Absence Report') },
  ];

  return (
    <PageTemplate
      title={t('Absence Report')}
      description={t('Monitor employee absences and trends')}
      url="/hr/reports/absences"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title={t('Total Absences')}
            value={stats?.total_absences ?? 0}
            description={t('All recorded absences for the selected range')}
            icon={<AlertTriangle className="h-5 w-5" />}
            accent="danger"
          />
          <SummaryCard
            title={t('Affected Employees')}
            value={stats?.unique_employees ?? 0}
            description={t('Employees with at least one recorded absence')}
            icon={<Users className="h-5 w-5" />}
          />
          <SummaryCard
            title={t('Avg Absences / Employee')}
            value={stats?.avg_absences ?? 0}
            description={t('Average count per impacted employee')}
            icon={<Clock3 className="h-5 w-5" />}
          />
          <SummaryCard
            title={t('This Month')}
            value={stats?.current_month ?? 0}
            description={t('Absences recorded this month')}
            icon={<CalendarDays className="h-5 w-5" />}
            accent="warning"
          />
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1">
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
                router.get(route('hr.reports.absence'), buildParams({ per_page: value }), {
                  preserveState: true,
                  preserveScroll: true,
                })
              }
            />
            </div>
              <ExportButton 
                exportRoute={route('hr.reports.absence.export')}
                filters={{
                  search: searchTerm,
                  branch_id: branchId,
                  department_id: departmentId,
                  employee_id: employeeId,
                  date_from: serializeDate(dateFrom),
                  date_to: serializeDate(dateTo),
                }}
              />
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Employee')}</TableHead>
                    <TableHead>{t('Branch')}</TableHead>
                    <TableHead>{t('Department')}</TableHead>
                    <TableHead>{t('Shift')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead className="w-1/4">{t('Notes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records?.data?.length ? (
                    records.data.map((record: any) => {
                      const employee = record.employee;
                      const profile = employee?.employee;
                      return (
                        <TableRow key={`absence-${record.id}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{employee?.name}</span>
                              <span className="text-xs text-muted-foreground">{employee?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{profile?.branch?.name || t('Not Assigned')}</TableCell>
                          <TableCell>{profile?.department?.name || t('Not Assigned')}</TableCell>
                          <TableCell>{record.shift?.name || '-'}</TableCell>
                          <TableCell>
                            {record.date ? format(new Date(record.date), 'PP') : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">{t('Absent')}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {record.notes || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                        {t('No absences found for the selected filters')}
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
              entityName={t('absences')}
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
