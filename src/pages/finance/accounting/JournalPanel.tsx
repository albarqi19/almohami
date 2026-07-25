// [وحدة المحاسبة #141 — م3] القيود اليومية: قائمة بفلاتر + عرض الأسطر +
// قيد يدوي (توازن حي مدين=دائن) + عكس قيد. لا حذف إطلاقاً — سلامة الدفاتر.
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { BookOpenText, Plus, Undo2, Trash2, Eye } from 'lucide-react';
import { accountingService, type JournalEntry, type Account } from '../../../services/accountingService';
import { DataTable, FilterBar, Pagination, Modal } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import { formatSAR } from '../../../utils/money';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';

const SOURCE_LABELS: Record<string, string> = {
  invoice: 'فاتورة',
  payment: 'سند قبض',
  expense: 'مصروف',
  manual: 'يدوي',
};

interface ManualLine {
  account_id: string;
  debit: string;
  credit: string;
  memo: string;
}

const emptyLine = (): ManualLine => ({ account_id: '', debit: '', credit: '', memo: '' });

const JournalPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { has } = usePermissionContext();
  const canManage = has(FINANCE_PERMISSIONS.accountingManage);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewTarget, setViewTarget] = useState<JournalEntry | null>(null);
  const [reverseTarget, setReverseTarget] = useState<JournalEntry | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualDesc, setManualDesc] = useState('');
  const [manualLines, setManualLines] = useState<ManualLine[]>([emptyLine(), emptyLine()]);

  const filter = {
    from: from || undefined,
    to: to || undefined,
    source: (source || undefined) as 'invoice' | 'payment' | 'expense' | 'manual' | undefined,
    search: search || undefined,
    page,
    per_page: 20,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['accounting', 'journal', filter],
    queryFn: () => accountingService.getJournalEntries(filter),
  });

  // الدليل للقيد اليدوي (يُجلب عند فتح المودال)
  const { data: accountsData } = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => accountingService.getAccounts(),
    enabled: showManual,
  });
  const accounts: Account[] = accountsData?.data?.flat ?? [];
  // للاختيار: الحسابات الورقية النشطة فقط (غير الجذور) — القيد على التفصيلية
  const selectableAccounts = accounts.filter((a) => a.is_active && a.parent_id !== null);

  const entries = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const lastPage = data?.data?.last_page ?? 1;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['accounting'] });

  // ── القيد اليدوي: توازن حي ──
  const totals = useMemo(() => {
    const debit = manualLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const credit = manualLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    return { debit: Math.round(debit * 100) / 100, credit: Math.round(credit * 100) / 100 };
  }, [manualLines]);
  const balanced = totals.debit > 0 && totals.debit === totals.credit;

  const manualMutation = useMutation({
    mutationFn: () => {
      const lines = manualLines
        .filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0))
        .map((l) => ({
          account_id: Number(l.account_id),
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          memo: l.memo || undefined,
        }));
      if (!manualDesc.trim()) throw new Error('وصف القيد إلزامي');
      if (lines.length < 2) throw new Error('القيد يحتاج سطرين على الأقل');
      return accountingService.createManualEntry({ entry_date: manualDate, description: manualDesc.trim(), lines });
    },
    onSuccess: () => {
      toast.success('رُحّل القيد اليدوي');
      invalidate();
      setShowManual(false);
      setManualDesc('');
      setManualLines([emptyLine(), emptyLine()]);
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر ترحيل القيد'),
  });

  const reverseMutation = useMutation({
    mutationFn: () => accountingService.reverseEntry(reverseTarget!.id, reverseReason || undefined),
    onSuccess: () => {
      toast.success('عُكس القيد بقيد معاكس');
      invalidate();
      setReverseTarget(null);
      setReverseReason('');
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر العكس'),
  });

  const openView = async (entry: JournalEntry) => {
    // الأسطر قد تكون محمّلة من القائمة؛ وإلا نجلب التفاصيل
    if (entry.lines?.length) {
      setViewTarget(entry);
      return;
    }
    const res = await accountingService.getJournalEntry(entry.id).catch((e: Error) => {
      toast.error(e.message);
      return null;
    });
    if (res?.data) setViewTarget(res.data);
  };

  const sourceLabel = (e: JournalEntry): string => {
    if (e.is_manual) return 'يدوي';
    if (e.source_type?.includes('CaseInvoice')) return 'فاتورة';
    if (e.source_type?.includes('Payment')) return 'سند قبض';
    if (e.source_type?.includes('Expense')) return 'مصروف';
    return e.source_type ? e.source_type.split('\\').pop() ?? '—' : '—';
  };

  const columns = useMemo<Column<JournalEntry>[]>(() => [
    {
      key: 'number',
      header: 'رقم القيد',
      render: (e) => (
        <div>
          <span className="fin-docnum">{e.entry_number}</span>
          <div className="fin-cell-muted">{e.entry_date?.slice(0, 10)}</div>
        </div>
      ),
    },
    { key: 'desc', header: 'البيان', render: (e) => <span className="fin-cell-strong">{e.description}</span> },
    {
      key: 'source',
      header: 'المصدر',
      align: 'center',
      render: (e) => <ToneBadge tone={e.is_manual ? 'purple' : 'info'}>{sourceLabel(e)}</ToneBadge>,
    },
    { key: 'amount', header: 'القيمة', numeric: true, align: 'end', render: (e) => <strong>{formatSAR(e.total_debit)}</strong> },
    {
      key: 'status',
      header: 'الحالة',
      align: 'center',
      render: (e) => (
        <ToneBadge tone={e.status === 'posted' ? 'success' : 'neutral'}>
          {e.status === 'posted' ? 'مرحّل' : 'معكوس'}
        </ToneBadge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (e) => (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <button type="button" className="fin-btn fin-btn--sm fin-btn--icon" title="عرض الأسطر"
            onClick={(ev) => { ev.stopPropagation(); openView(e); }}>
            <Eye size={14} />
          </button>
          {canManage && e.status === 'posted' && (
            <button type="button" className="fin-btn fin-btn--sm fin-btn--icon" title="عكس القيد"
              onClick={(ev) => { ev.stopPropagation(); setReverseTarget(e); }}>
              <Undo2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ], [canManage]);

  return (
    <div>
      <FilterBar
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'بحث برقم القيد أو البيان...' }}
        selects={[{
          value: source,
          onChange: (v) => { setSource(v); setPage(1); },
          options: [
            { value: '', label: 'كل المصادر' },
            ...Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
          ],
          ariaLabel: 'فلتر المصدر',
        }]}
        actions={canManage && (
          <button type="button" className="fin-btn fin-btn--primary" onClick={() => setShowManual(true)}>
            <Plus size={15} /> قيد يدوي
          </button>
        )}
      >
        <input className="fin-input" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="من" style={{ maxWidth: 150 }} />
        <input className="fin-input" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="إلى" style={{ maxWidth: 150 }} />
      </FilterBar>

      <DataTable
        columns={columns}
        data={entries}
        rowKey={(e) => e.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onRowClick={openView}
        emptyIcon={BookOpenText}
        emptyTitle="لا قيود بعد"
        emptyDesc="القيود تتولّد آلياً من الفواتير والسندات والمصروفات — أو أنشئ قيداً يدوياً."
        footer={<Pagination page={page} lastPage={lastPage} total={total} onChange={setPage} />}
      />

      {/* ── عرض قيد ── */}
      <Modal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={<>قيد {viewTarget?.entry_number} <span className="fin-cell-muted" style={{ fontWeight: 400 }}>— {viewTarget?.entry_date?.slice(0, 10)}</span></>}
        icon={BookOpenText}
        size="wide"
      >
        {viewTarget && (
          <>
            <p style={{ marginBottom: 8 }}>{viewTarget.description}</p>
            {viewTarget.reversal_of && (
              <p className="fin-cell-muted" style={{ marginBottom: 8 }}>عكسٌ للقيد {viewTarget.reversal_of.entry_number}</p>
            )}
            {viewTarget.reversed_by && (
              <p className="fin-cell-muted" style={{ marginBottom: 8 }}>عُكس بالقيد {viewTarget.reversed_by.entry_number}</p>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table className="acc-table">
                <thead>
                  <tr><th>الحساب</th><th>البيان</th><th>مدين</th><th>دائن</th></tr>
                </thead>
                <tbody>
                  {(viewTarget.lines ?? []).map((line) => (
                    <tr key={line.id}>
                      <td>
                        <span className="fin-cell-mono">{line.account?.code}</span> {line.account?.name}
                      </td>
                      <td>{line.memo ?? '—'}</td>
                      <td className="num">{Number(line.debit) > 0 ? formatSAR(line.debit) : '—'}</td>
                      <td className="num">{Number(line.credit) > 0 ? formatSAR(line.credit) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="acc-row--total">
                    <td colSpan={2}>الإجمالي</td>
                    <td className="num">{formatSAR(viewTarget.total_debit)}</td>
                    <td className="num">{formatSAR(viewTarget.total_debit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>

      {/* ── قيد يدوي ── */}
      <Modal
        open={showManual}
        onClose={() => setShowManual(false)}
        title="قيد يدوي جديد"
        icon={Plus}
        size="wide"
        footerAlign="end"
        footer={(
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setShowManual(false)}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--primary" disabled={!balanced || manualMutation.isPending}
              onClick={() => manualMutation.mutate()}>
              {manualMutation.isPending ? 'جارٍ الترحيل...' : 'ترحيل القيد'}
            </button>
          </>
        )}
      >
        <div className="fin-grid fin-grid--2" style={{ marginBottom: 10 }}>
          <div className="fin-field">
            <label className="fin-field__label">التاريخ<span className="req">*</span></label>
            <input className="fin-input" type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
          </div>
          <div className="fin-field">
            <label className="fin-field__label">الوصف<span className="req">*</span></label>
            <input className="fin-input" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)}
              placeholder="مثال: رصيد افتتاحي — البنك من رأس المال" />
          </div>
        </div>

        <div className="acc-line-grid" style={{ fontWeight: 600, fontSize: 12 }}>
          <span>الحساب</span><span>مدين</span><span>دائن</span><span>بيان السطر</span><span />
        </div>
        {manualLines.map((line, i) => (
          <div key={i} className="acc-line-grid">
            <select value={line.account_id}
              onChange={(e) => setManualLines(manualLines.map((l, j) => j === i ? { ...l, account_id: e.target.value } : l))}>
              <option value="">— حساب —</option>
              {selectableAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
              ))}
            </select>
            <input className="fin-input" type="number" min="0" step="0.01" placeholder="0.00" value={line.debit}
              onChange={(e) => setManualLines(manualLines.map((l, j) => j === i ? { ...l, debit: e.target.value, credit: e.target.value ? '' : l.credit } : l))} />
            <input className="fin-input" type="number" min="0" step="0.01" placeholder="0.00" value={line.credit}
              onChange={(e) => setManualLines(manualLines.map((l, j) => j === i ? { ...l, credit: e.target.value, debit: e.target.value ? '' : l.debit } : l))} />
            <input className="fin-input" placeholder="اختياري" value={line.memo}
              onChange={(e) => setManualLines(manualLines.map((l, j) => j === i ? { ...l, memo: e.target.value } : l))} />
            <button type="button" className="fin-btn fin-btn--sm fin-btn--icon" title="حذف السطر"
              disabled={manualLines.length <= 2}
              onClick={() => setManualLines(manualLines.filter((_, j) => j !== i))}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        <button type="button" className="fin-btn fin-btn--sm" onClick={() => setManualLines([...manualLines, emptyLine()])}>
          <Plus size={13} /> سطر
        </button>

        <div className={`acc-balance ${balanced ? 'acc-balance--ok' : 'acc-balance--bad'}`}>
          <span>مدين: {formatSAR(totals.debit)}</span>
          <span>دائن: {formatSAR(totals.credit)}</span>
          <span>{balanced ? '✓ متوازن' : totals.debit === totals.credit ? 'أدخل المبالغ' : `فرق ${formatSAR(Math.abs(totals.debit - totals.credit))}`}</span>
        </div>
      </Modal>

      {/* ── تأكيد العكس ── */}
      <Modal
        open={!!reverseTarget}
        onClose={() => setReverseTarget(null)}
        title={`عكس القيد ${reverseTarget?.entry_number ?? ''}`}
        icon={Undo2}
        size="narrow"
        footerAlign="end"
        footer={(
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setReverseTarget(null)}>تراجع</button>
            <button type="button" className="fin-btn fin-btn--danger" disabled={reverseMutation.isPending}
              onClick={() => reverseMutation.mutate()}>
              تأكيد العكس
            </button>
          </>
        )}
      >
        <p style={{ marginBottom: 10 }}>
          سيُنشأ قيد معاكس (مدين ↔ دائن) بقيمة <strong>{formatSAR(reverseTarget?.total_debit)}</strong> ويُعلَّم الأصل «معكوساً» — لا حذف في الدفاتر.
        </p>
        <div className="fin-field">
          <label className="fin-field__label">سبب العكس</label>
          <input className="fin-input" value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="اختياري" />
        </div>
      </Modal>
    </div>
  );
};

export default JournalPanel;
