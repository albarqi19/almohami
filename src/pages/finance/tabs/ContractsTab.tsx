// [P4·UX-03] تبويب العقود — جدول كثيف على DataTable. القيمة/المدفوع/المتبقّي من [P3·CTR-01].
// جدول /contracts لا يُرجع remaining_amount → نشتقّه من grand_total - total_paid.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Download, FileSignature, Banknote, Wallet, Scale } from 'lucide-react';
import { contractService } from '../../../services/contractService';
import { DataTable, StatusBadge, FilterBar, ActionMenu, Pagination } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import StatCard, { StatCardGrid } from '../../../components/erp/StatCard';
import { formatSAR, toNumber } from '../../../utils/money';
import { exportToCsv } from '../../../utils/exportCsv';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';
import { CONTRACT_STATUS } from '../../../config/financeStatusConfig';
import type { Contract } from '../../../types/contracts';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  ...Object.entries(CONTRACT_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
];

const ContractsTab: React.FC = () => {
  const navigate = useNavigate();
  const { has } = usePermissionContext();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const canExport = has(FINANCE_PERMISSIONS.reportsExport);

  const { data: statsData } = useQuery({
    queryKey: ['finance', 'contracts', 'stats'],
    queryFn: () => contractService.getStats(),
  });
  const stats = statsData?.data;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'contracts', { search, status, page }],
    queryFn: () => contractService.getContracts({
      search: search || undefined,
      status: (status || undefined) as Contract['status'] | undefined,
      page,
      per_page: 15,
    }),
  });

  const contracts = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const lastPage = data?.data?.last_page ?? 1;

  const columns = useMemo<Column<Contract>[]>(() => [
    {
      key: 'number',
      header: 'العقد',
      render: (c) => (
        <div>
          <span className="fin-docnum">{c.contract_number}</span>
          {c.title && <div className="fin-cell-muted">{c.title}</div>}
        </div>
      ),
    },
    {
      key: 'client',
      header: 'العميل',
      render: (c) => (
        <div>
          <span className="fin-cell-strong">{c.client?.name ?? '—'}</span>
          {(c.case_model ?? c.case)?.file_number && <div className="fin-cell-muted">قضية {(c.case_model ?? c.case)?.file_number}</div>}
        </div>
      ),
    },
    {
      key: 'value',
      header: 'القيمة',
      numeric: true,
      align: 'end',
      render: (c) => <span className="fin-cell-strong">{formatSAR(c.grand_total ?? c.total_amount)}</span>,
    },
    {
      key: 'paid',
      header: 'المدفوع',
      numeric: true,
      align: 'end',
      render: (c) => {
        const total = toNumber(c.grand_total ?? c.total_amount);
        const paid = toNumber(c.total_paid);
        const pct = total > 0 ? (paid / total) * 100 : 0;
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <span className="fin-cell-strong">{formatSAR(c.total_paid)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 80 }}>
              <div style={{ flex: 1, height: 3, background: 'var(--color-border)', borderRadius: 1.5, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: 'var(--status-green)', borderRadius: 1.5 }} />
              </div>
              <span style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {pct.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'remaining',
      header: 'المتبقّي',
      numeric: true,
      align: 'end',
      render: (c) => {
        const remaining = toNumber(c.grand_total ?? c.total_amount) - toNumber(c.total_paid);
        return <span style={{ color: remaining > 0 ? 'var(--status-orange)' : 'var(--status-green)' }}>{formatSAR(remaining)}</span>;
      },
    },
    {
      key: 'status',
      header: 'الحالة',
      align: 'center',
      render: (c) => <StatusBadge kind="contract" status={c.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (c) => (
        <ActionMenu
          items={[
            { label: 'عرض التفاصيل', icon: Eye, onClick: () => navigate(`/finance/contracts/${c.id}`) },
            { label: 'تحميل PDF', icon: Download, onClick: () => contractService.downloadPdf(c.id, c.contract_number).catch(() => {}) },
          ]}
        />
      ),
    },
  ], [navigate]);

  const handleExport = () => {
    exportToCsv('العقود', [
      { header: 'رقم العقد', value: (c: Contract) => c.contract_number },
      { header: 'العميل', value: (c: Contract) => c.client?.name ?? '' },
      { header: 'القيمة', value: (c: Contract) => toNumber(c.grand_total ?? c.total_amount) },
      { header: 'المدفوع', value: (c: Contract) => toNumber(c.total_paid) },
      { header: 'المتبقّي', value: (c: Contract) => toNumber(c.grand_total ?? c.total_amount) - toNumber(c.total_paid) },
      { header: 'الحالة', value: (c: Contract) => CONTRACT_STATUS[c.status]?.label ?? c.status },
    ], contracts);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* كروت إحصائية علوية سريعة للعقود */}
      {stats && (
        <StatCardGrid>
          <StatCard icon={FileSignature} tone="purple" value={formatSAR(stats.total_value)} label="إجمالي قيمة العقود" />
          <StatCard icon={Banknote} tone="success" value={formatSAR(stats.total_collected)} label="المبالغ المحصلة" />
          <StatCard icon={Wallet} tone="warning" value={formatSAR(toNumber(stats.total_value) - toNumber(stats.total_collected))} label="المبالغ المتبقية" />
          <StatCard icon={Scale} tone="info" value={`${stats.active} / ${stats.total}`} label="العقود النشطة" />
        </StatCardGrid>
      )}

      <div>
        <FilterBar
          search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'بحث برقم العقد أو العميل...' }}
          selects={[{ value: status, onChange: (v) => { setStatus(v); setPage(1); }, options: STATUS_OPTIONS, ariaLabel: 'فلترة الحالة' }]}
          actions={canExport ? (
            <button type="button" className="fin-btn fin-btn--sm" onClick={handleExport} disabled={contracts.length === 0}>
              <Download size={14} /> تصدير
            </button>
          ) : undefined}
        />
        <DataTable<Contract>
          columns={columns}
          data={contracts}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onRowClick={(c) => navigate(`/finance/contracts/${c.id}`)}
          emptyIcon={FileSignature}
          emptyTitle="لا توجد عقود"
          emptyDesc="لم يُعثر على عقود مطابقة."
          footer={<Pagination page={page} lastPage={lastPage} total={total} onChange={setPage} />}
        />
      </div>
    </div>
  );
};

export default ContractsTab;
