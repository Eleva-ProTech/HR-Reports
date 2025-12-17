import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { SummaryCard } from './components/summary-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Users, UserPlus, UserMinus, Percent } from 'lucide-react';
import { ExportButton } from './components/export-button';

declare const window: any;

const formatDisplayDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  return window?.appSettings?.formatDateTime(value, false) || new Date(value).toLocaleDateString();
};

export default function TurnoverReport() {
  const { t } = useTranslation();
  const {
    stats = {},
    monthlyData = [],
    recentHires = [],
    recentSeparations = [],
    filters: pageFilters = {},
    options = {}
  } = usePage().props as any;

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [branchId, setBranchId] = useState(pageFilters.branch_id || '');
  const [departmentId, setDepartmentId] = useState(pageFilters.department_id || '');
  const [employeeId, setEmployeeId] = useState(pageFilters.employee_id || '');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(pageFilters.date_from ? new Date(pageFilters.date_from) : undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(pageFilters.date_to ? new Date(pageFilters.date_to) : undefined);
  const [showFilters, setShowFilters] = useState(false);

  const serializeDate = (date?: Date) => (date ? format(date, 'yyyy-MM-dd') : undefined);

  const applyFilters = () => {
    router.get(route('hr.reports.turnover'), {
      search: searchTerm || undefined,
      branch_id: branchId || undefined,
      department_id: departmentId || undefined,
      employee_id: employeeId || undefined,
      date_from: serializeDate(dateFrom),
      date_to: serializeDate(dateTo)
    }, { preserveState: true, preserveScroll: true });
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

    router.get(route('hr.reports.turnover'), {}, { preserveState: true, preserveScroll: true });
  };

  const hasActiveFilters = () => {
    return Boolean(
      searchTerm ||
      branchId ||
      departmentId ||
      employeeId ||
      dateFrom ||
      dateTo
    );
  };

  const activeFilterCount = () => {
    return [searchTerm, branchId, departmentId, employeeId, dateFrom, dateTo].filter(Boolean).length;
  };

  const branchOptions = [
    { value: '', label: t('All Branches') },
    ...(options?.branches || []).map((branch: any) => ({
      value: branch.id?.toString() ?? '',
      label: branch.name,
    }))
  ];

  const departmentOptions = [
    { value: '', label: t('All Departments') },
    ...(options?.departments || []).map((department: any) => ({
      value: department.id?.toString() ?? '',
      label: department.name,
    }))
  ];

  const employeeOptions = [
    { value: '', label: t('All Employees') },
    ...(options?.employees || []).map((employee: any) => ({
      value: employee.id?.toString() ?? '',
      label: employee.code ? `${employee.name} (${employee.code})` : employee.name,
    }))
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('HR Reports') },
    { title: t('Turnover Report') },
  ];

  return (
    <PageTemplate
      title={t('Turnover Report')}
      description={t('Understand how hiring and separations impact your workforce')}
      url="/hr/reports/turnover"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title={t('Current Headcount')}
            value={stats.headcount ?? 0}
            description={t('Active employees within the company')}
            icon={<Users className="h-5 w-5" />}
          />
          <SummaryCard
            title={t('Average Headcount')}
            value={stats.average_headcount ?? 0}
            description={t('Average for the selected range')}
            icon={<Percent className="h-5 w-5" />}
          />
          <SummaryCard
            title={t('New Hires')}
            value={stats.hires ?? 0}
            description={t('Employees who joined in this period')}
            icon={<UserPlus className="h-5 w-5" />}
          />
          <SummaryCard
            title={t('Separations')}
            value={stats.separations ?? 0}
            description={t('Resignations and terminations')}
            icon={<UserMinus className="h-5 w-5" />}
            accent="danger"
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
                  perPageOptions={[10]}
                  currentPerPage={pageFilters.per_page?.toString() || '10'}
                  onPerPageChange={() => {}}
                />
              </div>
              <ExportButton
                exportRoute={route('hr.reports.turnover.export')}
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
                    <TableHead>{t('Month')}</TableHead>
                    <TableHead>{t('Hires')}</TableHead>
                    <TableHead>{t('Separations')}</TableHead>
                    <TableHead>{t('Turnover Rate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyData.length ? (
                    monthlyData.map((month: any) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell>{month.hires}</TableCell>
                        <TableCell>{month.separations}</TableCell>
                        <TableCell>{month.turnover_rate}%</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        {t('No data available for the selected filters')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('Recent Hires')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentHires.length ? recentHires.map((hire: any, index: number) => (
                <div key={`hire-${index}`} className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{hire.name || '-'}</p>
                      <p className="text-xs text-muted-foreground">{hire.email || '-'}</p>
                    </div>
                    <Badge variant="secondary">{formatDisplayDate(hire.date)}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {hire.branch && <span>{t('Branch')}: {hire.branch}</span>}
                    {hire.branch && hire.department && <span className="mx-1">•</span>}
                    {hire.department && <span>{t('Department')}: {hire.department}</span>}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">{t('No recent hires found')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Recent Separations')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentSeparations.length ? recentSeparations.map((entry: any, index: number) => (
                <div key={`separation-${index}`} className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{entry.name || '-'}</p>
                      <p className="text-xs text-muted-foreground">{entry.email || '-'}</p>
                    </div>
                    <Badge variant={entry.type === 'resignation' ? 'secondary' : 'destructive'}>
                      {entry.type === 'resignation' ? t('Resignation') : t('Termination')}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    <span>{t('Effective Date')}: {formatDisplayDate(entry.date)}</span>
                    <span>
                      {entry.branch && `${t('Branch')}: ${entry.branch} `}
                      {entry.department && `${entry.branch ? '• ' : ''}${t('Department')}: ${entry.department}`}
                    </span>
                    {entry.status && <span>{t('Status')}: {t(entry.status)}</span>}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">{t('No recent separations found')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}
