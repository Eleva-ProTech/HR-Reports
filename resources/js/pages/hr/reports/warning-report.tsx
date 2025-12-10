import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { PageTemplate } from '@/components/page-template';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Pagination } from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { SummaryCard } from './components/summary-card';
import { ShieldAlert, InboxIcon, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function WarningReport() {
  const { t } = useTranslation();
  const { records, stats, options, filters: pageFilters = {} } = usePage().props as any;
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [branchId, setBranchId] = useState(pageFilters.branch_id || '');
  const [departmentId, setDepartmentId] = useState(pageFilters.department_id || '');
  const [employeeId, setEmployeeId] = useState(pageFilters.employee_id || '');
  const [status, setStatus] = useState(pageFilters.status || 'all');
  const [severity, setSeverity] = useState(pageFilters.severity || 'all');
  const [warningType, setWarningType] = useState(pageFilters.warning_type || '');
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
    severity: severity === 'all' ? undefined : severity,
    warning_type: warningType || undefined,
    date_from: serializeDate(dateFrom),
    date_to: serializeDate(dateTo),
    per_page: overrides.per_page ?? pageFilters.per_page,
    ...overrides,
  });

  const applyFilters = () => {
    router.get(route('hr.reports.warnings'), buildParams(), { preserveState: true, preserveScroll: true });
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
    setSeverity('all');
    setWarningType('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setShowFilters(false);

    router.get(
      route('hr.reports.warnings'),
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
      (severity && severity !== 'all') ||
      warningType
    );

  const activeFilterCount = () =>
    [
      branchId,
      departmentId,
      employeeId,
      dateFrom,
      dateTo,
      status !== 'all' ? status : '',
      severity !== 'all' ? severity : '',
      warningType,
    ].filter(Boolean).length;

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

  const typeOptions = [
    { value: '', label: t('All Warning Types') },
    ...(options?.warning_types || []).map((type: string) => ({
      value: type,
      label: type,
    })),
  ];

  const severityOptions = [
    { value: 'all', label: t('All Severities') },
    { value: 'verbal', label: t('Verbal') },
    { value: 'written', label: t('Written') },
    { value: 'final', label: t('Final Warning') },
  ];

  const statusOptions = [
    { value: 'all', label: t('All Statuses') },
    { value: 'draft', label: t('Draft') },
    { value: 'issued', label: t('Issued') },
    { value: 'acknowledged', label: t('Acknowledged') },
    { value: 'expired', label: t('Expired') },
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('HR Reports') },
    { title: t('Warning Report') },
  ];

  const severityVariant: Record<string, 'secondary' | 'default' | 'destructive'> = {
    verbal: 'secondary',
    written: 'default',
    final: 'destructive',
  };

  const statusVariant: Record<string, 'secondary' | 'success' | 'destructive'> = {
    draft: 'secondary',
    issued: 'secondary',
    acknowledged: 'success',
    expired: 'destructive',
  };

  return (
    <PageTemplate
      title={t('Warning Report')}
      description={t('Stay on top of disciplinary actions and follow-ups')}
      url="/hr/reports/warnings"
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title={t('Total Warnings')}
            value={stats?.total_warnings ?? 0}
            description={t('Across the selected time range')}
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <SummaryCard
            title={t('Open')}
            value={stats?.open_warnings ?? 0}
            description={t('Draft or issued warnings')}
            icon={<AlertTriangle className="h-5 w-5" />}
            accent="warning"
          />
          <SummaryCard
            title={t('Acknowledged')}
            value={stats?.acknowledged_warnings ?? 0}
            description={t('Warnings confirmed by employees')}
            icon={<CheckCircle2 className="h-5 w-5" />}
            accent="success"
          />
          <SummaryCard
            title={t('Expired')}
            value={stats?.expired_warnings ?? 0}
            description={t('Expired or elapsed warnings')}
            icon={<InboxIcon className="h-5 w-5" />}
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
                  name: 'warning_type',
                  label: t('Warning Type'),
                  type: 'select' as const,
                  value: warningType,
                  onChange: setWarningType,
                  options: typeOptions,
                },
                {
                  name: 'severity',
                  label: t('Severity'),
                  type: 'select' as const,
                  value: severity,
                  onChange: setSeverity,
                  options: severityOptions,
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
                router.get(route('hr.reports.warnings'), buildParams({ per_page: value }), {
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
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('Severity')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead className="w-1/3">{t('Subject')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records?.data?.length ? (
                    records.data.map((record: any) => {
                      const employee = record.employee;
                      const severityBadge = severityVariant[record.severity] ?? 'secondary';
                      const statusBadge = statusVariant[record.status] ?? 'secondary';

                      return (
                        <TableRow key={`warning-${record.id}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{employee?.name}</span>
                              <span className="text-xs text-muted-foreground">{employee?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>{record.warning_type || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={severityBadge}>
                              {t(record.severity || 'verbal')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge}>{t(record.status || 'draft')}</Badge>
                          </TableCell>
                          <TableCell>
                            {record.warning_date ? format(new Date(record.warning_date), 'PP') : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {record.subject || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        {t('No warnings found for the selected filters')}
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
              entityName={t('warnings')}
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
