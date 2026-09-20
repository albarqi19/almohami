// [P4·UX-03] تبويب العقود — لوحة تملأ المساحة: مؤشرات ⟵ تبويبات الحالة بعدّاداتها ⟵ جدول يتمرر داخلياً برأس ثابت.
// القيمة/المدفوع/المتبقّي من [P3·CTR-01]؛ جدول /contracts لا يُرجع remaining_amount → نشتقّه من grand_total - total_paid.
// /contracts/stats يُرجع عدّاد كل حالة (كان غير معروض)، و`total_value`/`total_collected` فيه للعقود **النشطة** فقط.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Banknote, CalendarClock, CheckCircle2, Download, Eye, FileSignature, PenLine, Wallet } from 'lucide-react';
import { contractService } from '../../../services/contractService';
import { DataTable, StatusBadge, FilterBar, ActionMenu, Pagination } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import { Meter, StatTile } from '../../../components/charts/RaedCharts';
import { formatSAR, toNumber } from '../../../utils/money';
import { exportToCsv } from '../../../utils/exportCsv';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';
import { CONTRACT_STATUS } from '../../../config/financeStatusConfig';
import type { Contract } from '../../../types/contracts';

type StatusFilter = '' | Contract['status'];

const DAY_MS = 86_400_000;
const DATE_LOCALE = 'ar-SA-u-ca-gregory-nu-latn';

const shortDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(DATE_LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
};

/** أيام حتى نهاية العقد (سالب = انتهت المدة) — null إن لم تُحدَّد نهاية */
const daysToEnd = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  return Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / DAY_MS,
  );
};

const ContractsTab: React.FC = () => {
  const navigate = useNavigate();
  const { has } = usePermissionContext();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
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

  const pickStatus = (next: StatusFilter) => {
    setStatus(next);
    setPage(1);
  };

  // تبويبات الحالة بعدّاداتها من /contracts/stats — «منتهٍ» بلا عدّاد لأن المسار لا يُرجعه
  const statusTabs: Array<{ value: StatusFilter; label: string; count?: number }> = [
    { value: '', label: 'الكل', count: stats?.total },
    { value: 'active', label: CONTRACT_STATUS.active.label, count: stats?.active },
    { value: 'pending_signature', label: CONTRACT_STATUS.pending_signature.label, count: stats?.pending_signature },
    { value: 'draft', label: CONTRACT_STATUS.draft.label, count: stats?.draft },
    { value: 'completed', label: CONTRACT_STATUS.completed.label, count: stats?.completed },
    { value: 'expired', label: CONTRACT_STATUS.expired.label },
    { value: 'cancelled', label: CONTRACT_STATUS.cancelled.label, count: stats?.cancelled },
  ];

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
      header: 'التحصيل',
      numeric: true,
      align: 'end',
      render: (c) => {
        const value = toNumber(c.grand_total ?? c.total_amount);
        const paid = toNumber(c.total_paid);
        const pct = value > 0 ? Math.min((paid / value) * 100, 100) : 0;
        return (
          <div className="fct-collect">
            <span className="fin-cell-strong">{formatSAR(paid)}</span>
            <span className="fct-collect__bar">
              <Meter value={pct} tone={pct >= 100 ? 'good' : 'series1'} ariaLabel={`نسبة التحصيل ${pct.toFixed(0)}%`} />
              <b>{pct.toFixed(0)}%</b>
            </span>
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
        // الحالة بكلمة لا بلون النص
        return remaining > 0
          ? <span className="fin-cell-strong">{formatSAR(remaining)}</span>
          : <span className="fin-cell-muted">مسدَّد</span>;
      },
    },
    {
      key: 'term',
      header: 'المدة',
      render: (c) => {
        const days = c.status === 'active' ? daysToEnd(c.end_date) : null;
        return (
          <div>
            <span className="fct-term">{shortDate(c.start_date || c.contract_date)}</span>
            {c.end_date && <div className="fin-cell-muted">حتى {shortDate(c.end_date)}</div>}
            {days !== null && days <= 30 && (
              <div className="fct-term__alert">
                <AlertTriangle size={11} />
                {days < 0 ? 'انتهت المدة' : days === 0 ? 'ينتهي اليوم' : `ينتهي بعد ${days} يوماً`}
              </div>
            )}
          </div>
        );
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
      { header: 'تاريخ البداية', value: (c: Contract) => c.start_date || c.contract_date || '' },
      { header: 'تاريخ النهاية', value: (c: Contract) => c.end_date ?? '' },
      { header: 'الحالة', value: (c: Contract) => CONTRACT_STATUS[c.status]?.label ?? c.status },
    ], contracts);
  };

  const activeValue = toNumber(stats?.total_value);
  const activeCollected = toNumber(stats?.total_collected);
  const collectedPct = activeValue > 0 ? Math.min((activeCollected / activeValue) * 100, 100) : 0;
  const pendingSignature = stats?.pending_signature ?? 0;

  return (
    <div className="fct rc-scope">
      {/* المؤشرات — القيمة والمحصّل للعقود النشطة فقط (هكذا يحسبها الخادم) فالتسمية تقول ذلك */}
      <div className="fct-tiles" aria-label="مؤشرات العقود">
        <StatTile
          label="قيمة العقود النشطة"
          value={formatSAR(activeValue)}
          hint={`${stats?.active ?? 0} عقد نشط من ${stats?.total ?? 0}`}
          icon={<FileSignature size={15} />}
          onClick={() => pickStatus('active')}
        />
        <StatTile
          label="المحصّل منها"
          value={formatSAR(activeCollected)}
          icon={<Banknote size={15} />}
          hint={`${collectedPct.toFixed(0)}% من القيمة`}
          meter={{ value: collectedPct, tone: 'good', ariaLabel: 'نسبة المحصّل من قيمة العقود النشطة' }}
        />
        <StatTile
          label="المتبقي للتحصيل"
          value={formatSAR(Math.max(activeValue - activeCollected, 0))}
          hint="على العقود النشطة"
          icon={<Wallet size={15} />}
        />
        <StatTile
          label="بانتظار التوقيع"
          value={String(pendingSignature)}
          icon={<PenLine size={15} />}
          status={
            pendingSignature > 0
              ? { tone: 'warning', text: 'عقود لم تُوقَّع بعد', icon: <CalendarClock size={13} /> }
              : { tone: 'good', text: 'لا عقود معلّقة', icon: <CheckCircle2 size={13} /> }
          }
          onClick={() => pickStatus('pending_signature')}
        />
      </div>

      <div className="fct-table">
        <div className="fct-toolbar">
          <div className="fin-subtabs fct-status" role="tablist" aria-label="حالة العقد">
            {statusTabs.map((tab) => (
              <button
                key={tab.value || 'all'}
                type="button"
                role="tab"
                aria-selected={status === tab.value}
                className={`fin-subtab${status === tab.value ? ' fin-subtab--active' : ''}`}
                onClick={() => pickStatus(tab.value)}
              >
                {tab.label}
                {tab.count != null && <span className="fin-subtab__count">{tab.count}</span>}
              </button>
            ))}
          </div>
          <FilterBar
            search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'بحث برقم العقد أو العميل...' }}
            actions={canExport ? (
              <button type="button" className="fin-btn fin-btn--sm" onClick={handleExport} disabled={contracts.length === 0}>
                <Download size={14} /> تصدير
              </button>
            ) : undefined}
          />
        </div>

        <DataTable<Contract>
          fill
          columns={columns}
          data={contracts}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onRowClick={(c) => navigate(`/finance/contracts/${c.id}`)}
          emptyIcon={FileSignature}
          emptyTitle="لا توجد عقود"
          emptyDesc={status || search ? 'لا عقود مطابقة لهذا البحث أو الحالة.' : 'لم يُنشأ أي عقد بعد.'}
          footer={<Pagination page={page} lastPage={lastPage} total={total} onChange={setPage} />}
        />
      </div>
    </div>
  );
};

export default ContractsTab;
