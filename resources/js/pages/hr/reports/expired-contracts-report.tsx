import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { PageTemplate } from '@/components/page-template';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { SummaryCard } from './components/summary-card';
import { CalendarX, AlarmClock, Hourglass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ExportButton } from './components/export-button';

declare const window: any;

export default function ExpiredContractsReport() {
  const { t } = useTranslation();
  const { records, stats, options, filters: pageFilters = {} } = usePage().props as any;
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [branchId, setBranchId] = useState(pageFilters.branch_id || '');
  const [departmentId, setDepartmentId] = useState(pageFilters.department_id || '');
  const [employeeId, setEmployeeId] = useState(pageFilters.employee_id || '');
  const [contractTypeId, setContractTypeId] = useState(pageFilters.contract_type_id || '');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);

  const serializeDate = (date?: Date) => (date ? format(date, 'yyyy-MM-dd') : undefined);

  const buildParams = (overrides: Record<string, any> = {}) => ({
    search: searchTerm || undefined,
    branch_id: branchId || undefined,
    department_id: departmentId || undefined,
    employee_id: employeeId || undefined,
    contract_type_id: contractTypeId || undefined,
    date_from: serializeDate(dateFrom),
    date_to: serializeDate(dateTo),
    per_page: overrides.per_page ?? pageFilters.per_page,
    ...overrides,
  });

  const applyFilters = () => {
    router.get(route('hr.reports.expired-contracts'), buildParams(), { preserveState: true, preserveScroll: true });
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
    setContractTypeId('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setShowFilters(false);

    router.get(
      route('hr.reports.expired-contracts'),
      { per_page: pageFilters.per_page },
      { preserveState: true, preserveScroll: true }
    );
  };

  const hasActiveFilters = () =>
    !!(branchId || departmentId || employeeId || contractTypeId || dateFrom || dateTo);

  const activeFilterCount = () =>
    [branchId, departmentId, employeeId, contractTypeId, dateFrom, dateTo].filter(Boolean).length;

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

  const contractTypeOptions = [
    { value: '', label: t('All Contract Types') },
    ...(options?.contract_types || []).map((type: any) => ({
      value: type.id?.toString() ?? '',
      label: type.name,
    })),
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('HR Reports') },
    { title: t('Expired Contracts Report') },
  ];

  return (
    <PageTemplate
      title={t('Expired Contracts Report')}
      description={t('Identify contracts that need renewal or offboarding')}
      url="/hr/reports/expired-contracts"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            title={t('Expired Contracts')}
            value={stats?.total_expired ?? 0}
            description={t('Contracts already past their end date')}
            icon={<CalendarX className="h-5 w-5" />}
            accent="danger"
          />
          <SummaryCard
            title={t('Expiring Soon')}
            value={stats?.expiring_soon ?? 0}
            description={t('Contracts ending within 30 days')}
            icon={<AlarmClock className="h-5 w-5" />}
            accent="warning"
          />
          <SummaryCard
            title={t('Average Tenure')}
            value={`${stats?.average_tenure_days ?? 0} ${t('days')}`}
            description={t('Average contract duration (start to end)')}
            icon={<Hourglass className="h-5 w-5" />}
          />
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                      name: 'contract_type_id',
                      label: t('Contract Type'),
                      type: 'select' as const,
                      value: contractTypeId,
                      onChange: setContractTypeId,
                      options: contractTypeOptions,
                    },
                    {
                      name: 'date_from',
                      label: t('End Date From'),
                      type: 'date' as const,
                      value: dateFrom,
                      onChange: setDateFrom,
                    },
                    {
                      name: 'date_to',
                      label: t('End Date To'),
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
                    router.get(route('hr.reports.expired-contracts'), buildParams({ per_page: value }), {
                      preserveState: true,
                      preserveScroll: true,
                    })
                  }
                />
              </div>
              <ExportButton
                exportRoute={route('hr.reports.expired-contracts.export')}
                filters={{
                  search: searchTerm,
                  branch_id: branchId,
                  department_id: departmentId,
                  employee_id: employeeId,
                  contract_type_id: contractTypeId,
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
                    <TableHead>{t('Contract Type')}</TableHead>
                    <TableHead>{t('Start Date')}</TableHead>
                    <TableHead>{t('End Date')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Base Salary')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records?.data?.length ? (
                    records.data.map((record: any) => {
                      const employee = record.employee;
                      return (
                        <TableRow key={`contract-${record.id}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{employee?.name}</span>
                              <span className="text-xs text-muted-foreground">{employee?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{record.contract_type?.name || '-'}</TableCell>
                          <TableCell>
                            {record.start_date ? format(new Date(record.start_date), 'PP') : '-'}
                          </TableCell>
                          <TableCell>
                            {record.end_date ? format(new Date(record.end_date), 'PP') : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">{t('Expired')}</Badge>
                          </TableCell>
                          <TableCell>
                            {window?.appSettings?.formatCurrency
                              ? window.appSettings.formatCurrency(record.basic_salary || 0)
                              : record.basic_salary}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        {t('No expired contracts found for the selected filters')}
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
              entityName={t('contracts')}
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
