// [P4·UX-04] تبويب الفواتير — تبويبات فرعية + جدول DataTable + إنشاء فاتورة + أزرار حسب الحالة.
// الأزرار تُشتقّ من config حالة واحد (invoiceActions) متّسق مع حُرّاس الباك.
// إرسال الفاتورة يُرجع 501 (قيد التطوير) → نعالجه بـ toast.info لا انهيار.
import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Eye, Send, XCircle, CreditCard, Download, Receipt, Plus, Banknote, Wallet, Timer } from 'lucide-react';
import { invoiceService } from '../../../services/invoiceService';
import { DataTable, StatusBadge, FilterBar, ActionMenu, Pagination, Modal } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import StatCard, { StatCardGrid } from '../../../components/erp/StatCard';
import { useRowSelection } from '../../../hooks/useRowSelection';
import { exportToCsv } from '../../../utils/exportCsv';
import { invalidateFinance } from '../../../utils/financeCache';
import { formatSAR, formatPercent, toNumber } from '../../../utils/money';
import { formatDueLabel } from '../../../utils/dueDays';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import { invoiceActions, INVOICE_STATUS } from '../../../config/financeStatusConfig';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';
import { useZatcaFeature } from '../../../contexts/ZatcaStatusContext';
import ZatcaStatusBadge from '../../../components/zatca/ZatcaStatusBadge';
import CreateInvoiceModal from '../../../components/billing/CreateInvoiceModal';
import type { CaseInvoice, InvoiceStatus, InvoiceFilters } from '../../../types/billing';

interface SubTab {
  key: string;
  label: string;
  filter: Partial<InvoiceFilters>;
}

const SUBTABS: SubTab[] = [
  { key: 'all', label: 'الكل', filter: {} },
  { key: 'pending', label: 'المعلّقة', filter: { status: 'pending' } },
  { key: 'overdue', label: 'المتأخّرة', filter: { overdue_only: true } },
  { key: 'collection', label: 'التحصيل', filter: { overdue_only: true } },
];

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  ...Object.entries(INVOICE_STATUS).map(([value, meta]) => ({ value, label: meta.label })),
];

const InvoicesTab: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { has } = usePermissionContext();
  const { enabled: zatcaEnabled } = useZatcaFeature();
  const [searchParams, setSearchParams] = useSearchParams();

  const [subtab, setSubtab] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState<CaseInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCreate, setShowCreate] = useState(searchParams.get('new') === '1');

  const canManage = has(FINANCE_PERMISSIONS.invoicesManage);
  const canExport = has(FINANCE_PERMISSIONS.reportsExport);
  const selection = useRowSelection<number>();
  const activeSub = SUBTABS.find((s) => s.key === subtab) ?? SUBTABS[0];

  // فلتر فعّال: تبويب فرعي + بحث + (فلتر حالة فقط على «الكل»).
  const effectiveFilter: InvoiceFilters = {
    ...activeSub.filter,
    search: search || undefined,
    ...(subtab === 'all' && status ? { status: status as InvoiceStatus } : {}),
    page,
    per_page: 15,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'invoices', { subtab, search, status, page }],
    queryFn: () => invoiceService.getInvoices(effectiveFilter),
  });

  const { data: statsData } = useQuery({
    queryKey: ['finance', 'invoiceStats'],
    queryFn: () => invoiceService.getStats(),
  });

  const invoices = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const lastPage = data?.data?.last_page ?? 1;
  const stats = statsData?.data;

  const invalidate = () => invalidateFinance(queryClient);

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => invoiceService.cancelInvoice(id, reason),
    onSuccess: () => {
      toast.success('تم إلغاء الفاتورة');
      invalidate();
      setCancelTarget(null);
      setCancelReason('');
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر إلغاء الفاتورة'),
  });

  const sendMutation = useMutation({
    mutationFn: ({ id, method }: { id: number; method: 'email' | 'whatsapp' }) => invoiceService.sendInvoice(id, method),
    onSuccess: (res) => {
      toast.success(res.message || 'تم إرسال الفاتورة');
      invalidate();
    },
    // الباك يُرجع 501 (قيد التطوير) → apiClient يرمي رسالته؛ نعرضها كمعلومة لا خطأ.
    onError: (e: Error) => toast.info(e.message || 'ميزة الإرسال قيد التطوير'),
  });

  const handleCreate = async (payload: unknown) => {
    await invoiceService.createInvoice(payload as never);
    toast.success('تم إنشاء الفاتورة');
    invalidate();
  };

  const closeCreate = () => {
    setShowCreate(false);
    if (searchParams.get('new')) {
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  };

  // [P4·UX-10] تصدير CSV (محروس بـ billing.reports.export).
  const handleExport = (rows: CaseInvoice[]) => {
    exportToCsv('الفواتير', [
      { header: 'رقم الفاتورة', value: (inv: CaseInvoice) => inv.invoice_number },
      { header: 'العميل', value: (inv: CaseInvoice) => inv.client?.name ?? '' },
      { header: 'الإجمالي', value: (inv: CaseInvoice) => toNumber(inv.total_amount) },
      { header: 'المدفوع', value: (inv: CaseInvoice) => toNumber(inv.paid_amount) },
      { header: 'المتبقّي', value: (inv: CaseInvoice) => toNumber(inv.remaining_amount) },
      { header: 'الحالة', value: (inv: CaseInvoice) => INVOICE_STATUS[inv.status]?.label ?? inv.status },
      { header: 'الاستحقاق', value: (inv: CaseInvoice) => inv.due_date?.split('T')[0] ?? '' },
    ], rows);
  };

  // [P4·UX-10] إلغاء جماعي — يحترم نفس صلاحية الإجراء الفردي (billing.invoices.manage).
  const bulkCancelMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await invoiceService.cancelInvoice(id).catch(() => null);
      }
    },
    onSuccess: () => { toast.success('تمت معالجة الإلغاء الجماعي'); invalidate(); selection.clear(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الإلغاء الجماعي'),
  });

  const columns = useMemo<Column<CaseInvoice>[]>(() => {
    const cols: Column<CaseInvoice>[] = [
      {
        key: 'number',
        header: 'الفاتورة',
        render: (inv) => (
          <div>
            <span className="fin-docnum">{inv.invoice_number}</span>
            {inv.title && <div className="fin-cell-muted">{inv.title}</div>}
          </div>
        ),
      },
      { key: 'client', header: 'العميل', render: (inv) => <span className="fin-cell-strong">{inv.client?.name ?? '—'}</span> },
      { key: 'total', header: 'الإجمالي', numeric: true, align: 'end', render: (inv) => formatSAR(inv.total_amount) },
      { key: 'paid', header: 'المدفوع', numeric: true, align: 'end', render: (inv) => {
        const total = toNumber(inv.total_amount);
        const paid = toNumber(inv.paid_amount);
        const pct = total > 0 ? (paid / total) * 100 : 0;
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
            <span className="fin-cell-strong">{formatSAR(inv.paid_amount)}</span>
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
      }},
      {
        key: 'remaining',
        header: 'المتبقّي',
        numeric: true,
        align: 'end',
        render: (inv) => <span className="fin-cell-strong">{formatSAR(inv.remaining_amount)}</span>,
      },
      {
        key: 'due',
        header: 'الاستحقاق',
        render: (inv) => {
          const label = formatDueLabel(inv.due_date);
          return (
            <div>
              <div className="fin-cell-muted">{inv.due_date?.split('T')[0]}</div>
              {label && <ToneBadge tone={label.tone}>{label.text}</ToneBadge>}
            </div>
          );
        },
      },
      { key: 'status', header: 'الحالة', align: 'center', render: (inv) => <StatusBadge kind="invoice" status={inv.status} /> },
    ];
    if (zatcaEnabled) {
      cols.push({
        key: 'zatca',
        header: 'الفوترة الإلكترونية',
        align: 'center',
        render: (inv) => (inv.zatca_status ? <ZatcaStatusBadge status={inv.zatca_status} /> : <span className="fin-cell-muted">—</span>),
      });
    }
    cols.push({
      key: 'actions',
      header: '',
      align: 'center',
      render: (inv) => {
        const a = invoiceActions(inv.status);
        return (
          <ActionMenu
            items={[
              { label: 'عرض التفاصيل', icon: Eye, onClick: () => navigate(`/finance/invoices/${inv.id}`) },
              { label: 'تسجيل دفعة', icon: CreditCard, onClick: () => navigate(`/finance/invoices/${inv.id}`), hidden: !canManage || !a.canRecordPayment },
              { label: 'إرسال (بريد)', icon: Send, onClick: () => sendMutation.mutate({ id: inv.id, method: 'email' }), hidden: !canManage || !a.canSend },
              { label: 'تحميل PDF', icon: Download, onClick: () => invoiceService.downloadPdf(inv.id, inv.invoice_number).catch(() => toast.error('تعذّر تحميل PDF')) },
              { label: 'إلغاء', icon: XCircle, variant: 'danger', divider: true, onClick: () => setCancelTarget(inv), hidden: !canManage || !a.canCancel },
            ]}
          />
        );
      },
    });
    return cols;
  }, [navigate, canManage, zatcaEnabled, sendMutation]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* كروت إحصائية علوية سريعة للفواتير */}
      {stats && (
        <StatCardGrid>
          <StatCard icon={Receipt} tone="neutral" value={`${stats.total} فواتير`} label={`معلّقة: ${stats.pending} • متأخّرة: ${stats.overdue}`} />
          <StatCard icon={Banknote} tone="success" value={formatSAR(stats.total_paid)} label="المبالغ المحصلة" />
          <StatCard icon={Wallet} tone="warning" value={formatSAR(stats.total_remaining)} label="المتبقي غير المحصل" />
          <StatCard icon={Timer} tone="info" value={formatPercent(toNumber(stats.total_paid) + toNumber(stats.total_remaining) > 0 ? (toNumber(stats.total_paid) / (toNumber(stats.total_paid) + toNumber(stats.total_remaining))) * 100 : 0)} label="معدل التحصيل المالي" />
        </StatCardGrid>
      )}

      <div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="fin-subtabs">
          {SUBTABS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`fin-subtab${subtab === s.key ? ' fin-subtab--active' : ''}`}
              onClick={() => { setSubtab(s.key); setPage(1); }}
            >
              {s.label}
            </button>
          ))}
        </div>
        {canManage && (
          <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> فاتورة جديدة
          </button>
        )}
      </div>

      <FilterBar
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'بحث برقم الفاتورة أو العميل...' }}
        selects={subtab === 'all' ? [{ value: status, onChange: (v) => { setStatus(v); setPage(1); }, options: STATUS_OPTIONS, ariaLabel: 'فلترة الحالة' }] : undefined}
        actions={canExport ? (
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => handleExport(invoices)} disabled={invoices.length === 0}>
            <Download size={14} /> تصدير
          </button>
        ) : undefined}
      />

      {/* شريط الإجراءات المجمّعة (UX-10) */}
      {selection.count > 0 && (
        <div className="fin-bulkbar">
          <span className="fin-bulkbar__count">{selection.count} محدّدة</span>
          <div className="fin-bulkbar__spacer" />
          {canExport && (
            <button type="button" className="fin-btn fin-btn--sm" onClick={() => handleExport(invoices.filter((i) => selection.selectedKeys.has(i.id)))}>
              <Download size={14} /> تصدير المحدّد
            </button>
          )}
          {canManage && (
            <button
              type="button"
              className="fin-btn fin-btn--danger fin-btn--sm"
              disabled={bulkCancelMutation.isPending}
              onClick={() => bulkCancelMutation.mutate(Array.from(selection.selectedKeys))}
            >
              <XCircle size={14} /> إلغاء المحدّد
            </button>
          )}
          <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => selection.clear()}>إلغاء التحديد</button>
        </div>
      )}

      <DataTable<CaseInvoice>
        columns={columns}
        data={invoices}
        rowKey={(inv) => inv.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onRowClick={(inv) => navigate(`/finance/invoices/${inv.id}`)}
        selection={canManage || canExport ? {
          selectedKeys: selection.selectedKeys,
          onToggle: (key) => selection.toggle(key as number),
          onToggleAll: (rows) => selection.toggleAll(rows.map((r) => r.id)),
        } : undefined}
        emptyIcon={Receipt}
        emptyTitle="لا توجد فواتير"
        emptyDesc="لم يُعثر على فواتير مطابقة لهذا الفلتر."
        footer={<Pagination page={page} lastPage={lastPage} total={total} onChange={setPage} />}
      />

      {/* مودال إنشاء فاتورة (مُعاد استخدامه) */}
      <CreateInvoiceModal isOpen={showCreate} onClose={closeCreate} onSave={handleCreate} />

      {/* مودال إلغاء */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="إلغاء الفاتورة"
        icon={XCircle}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setCancelTarget(null)}>تراجع</button>
            <button
              type="button"
              className="fin-btn fin-btn--danger"
              disabled={cancelMutation.isPending}
              onClick={() => cancelTarget && cancelMutation.mutate({ id: cancelTarget.id, reason: cancelReason })}
            >
              {cancelMutation.isPending ? 'جارٍ الإلغاء...' : 'تأكيد الإلغاء'}
            </button>
          </>
        )}
      >
        <p style={{ marginBottom: 12, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          سيتم إلغاء الفاتورة {cancelTarget?.invoice_number}. هذا الإجراء لا يمكن التراجع عنه.
        </p>
        <div className="fin-field">
          <label className="fin-field__label">سبب الإلغاء (اختياري)</label>
          <textarea className="fin-textarea" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} />
        </div>
      </Modal>
      </div>
    </div>
  );
};

export default InvoicesTab;
