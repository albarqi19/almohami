// تبويب «عروض الأتعاب» داخل صفحة العميل — دورة العرض كاملة:
// إنشاء/تحرير → إرسال → إعادة إرسال → قبول/رفض/إلغاء → نسخة جديدة → عقد أو فاتورة من العرض المقبول.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Eye, Pencil, Send, Loader2, CheckCircle2, XCircle, FileText,
  Copy, RotateCcw, Ban, Trash2, FileSignature, Receipt, Undo2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  feeProposalService,
  feeProposalDisplayStatus,
  isLiveDocument,
  FEE_PROPOSAL_STATUS_LABELS,
  type FeeProposal,
} from '../services/feeProposalService';
import { usePermissionContext } from '../contexts/PermissionContext';
import { FeeProposalModal } from './FeeProposalModal';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  clientId: number;
  clientName?: string;
  cases?: Array<{ id: number; title: string; file_number: string }>;
}

/** إجراء ينتظر تأكيد المستخدم قبل تنفيذه */
interface PendingAction {
  title: string;
  message: React.ReactNode;
  note?: React.ReactNode;
  confirmLabel: string;
  variant?: 'danger' | 'primary';
  run: () => Promise<void>;
}

const ClientFeeProposalsTab: React.FC<Props> = ({ clientId, clientName, cases = [] }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { has } = usePermissionContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeeProposal | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirming, setConfirming] = useState(false);

  const canManage = has('fee-proposals.manage');
  const canSend = has('fee-proposals.send');
  const canInvoice = canManage && has('billing.invoices.manage');
  const canContract = has('contracts.create');

  const { data, isLoading } = useQuery({
    queryKey: ['client-fee-proposals', clientId],
    queryFn: () => feeProposalService.list({ client_id: clientId, per_page: 100 }),
    enabled: !!clientId,
  });
  const proposals: FeeProposal[] = (data?.data as FeeProposal[]) ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['client-fee-proposals', clientId] });

  const money = (n: string | number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)) + ' ر.س';

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (p: FeeProposal) => {
    feeProposalService.get(p.id)
      .then((r) => { setEditing(r.data); setModalOpen(true); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'تعذّر فتح العرض'));
  };

  /** ينفّذ إجراءً على صف مع قفل أزراره، ويُظهر رسالة الخادم عند الفشل */
  const act = async (p: FeeProposal, fn: () => Promise<void>) => {
    try { setBusyId(p.id); await fn(); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'تعذّر تنفيذ الإجراء'); }
    finally { setBusyId(null); }
  };

  const sendResult = (res: { success: boolean; message: string; number?: string }) =>
    res.success ? toast.success(`${res.message}${res.number ? ` (صادر ${res.number})` : ''}`) : toast.error(res.message);

  const send = (p: FeeProposal) => act(p, async () => { sendResult(await feeProposalService.send(p.id)); });

  const resend = (p: FeeProposal) => setPending({
    title: 'إعادة إرسال العرض',
    message: <>يُرسَل «{p.title || p.type_label}» للعميل من جديد.</>,
    note: 'يأخذ رقم صادر جديداً بتاريخ اليوم، ويبقى الصادر السابق في السجل كما هو.',
    confirmLabel: 'إعادة الإرسال',
    run: () => act(p, async () => { sendResult(await feeProposalService.resend(p.id)); }),
  });

  const setStatus = (p: FeeProposal, status: 'accepted' | 'rejected' | 'cancelled' | 'sent', done: string) =>
    act(p, async () => { await feeProposalService.setStatus(p.id, status); toast.success(done); });

  const cancel = (p: FeeProposal) => setPending({
    title: 'إلغاء العرض',
    message: <>هل تريد إلغاء «{p.title || p.type_label}»؟</>,
    note: 'العرض الملغى لا يُرسَل ولا يُقبَل. يمكنك إنشاء نسخة جديدة منه متى شئت.',
    confirmLabel: 'إلغاء العرض',
    variant: 'danger',
    run: () => setStatus(p, 'cancelled', 'أُلغي العرض'),
  });

  const undo = (p: FeeProposal) => setPending({
    title: p.status === 'accepted' ? 'التراجع عن القبول' : 'التراجع عن الرفض',
    message: <>يعود «{p.title || p.type_label}» إلى حالة «مُرسَل».</>,
    confirmLabel: 'تراجع',
    run: () => setStatus(p, 'sent', 'عاد العرض إلى «مُرسَل»'),
  });

  const remove = (p: FeeProposal) => setPending({
    title: 'حذف المسودة',
    message: <>هل تريد حذف مسودة «{p.title || p.type_label}»؟</>,
    confirmLabel: 'حذف',
    variant: 'danger',
    run: () => act(p, async () => { await feeProposalService.remove(p.id); toast.success('حُذفت المسودة'); }),
  });

  const duplicate = (p: FeeProposal) => act(p, async () => {
    const res = await feeProposalService.duplicate(p.id);
    toast.success('أُنشئت نسخة جديدة كمسودة — عدّلها ثم أرسلها');
    setEditing(res.data);
    setModalOpen(true);
  });

  const createInvoice = (p: FeeProposal, confirm = false) => act(p, async () => {
    const res = await feeProposalService.createInvoice(p.id, confirm ? { confirm: true } : undefined);
    toast.success(res.message);
    navigate(`/finance/invoices/${res.data.id}`);
  });

  const invoice = (p: FeeProposal) => {
    const live = (p.invoices ?? []).filter(isLiveDocument);
    if (live.length === 0) { createInvoice(p); return; }
    setPending({
      title: 'فاتورة أخرى على العرض نفسه',
      message: <>لهذا العرض فاتورة قائمة (<span className="fpl-num">{live.map((i) => i.invoice_number).join('، ')}</span>). أتريد إنشاء فاتورة أخرى؟</>,
      note: 'تُنشأ مسودة بكامل بنود العرض — عدّل مبلغها قبل الإصدار إن كانت دفعة من الأتعاب.',
      confirmLabel: 'إنشاء فاتورة أخرى',
      run: () => createInvoice(p, true),
    });
  };

  const runPending = async () => {
    if (!pending) return;
    setConfirming(true);
    try { await pending.run(); } finally { setConfirming(false); setPending(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>عروض الأتعاب والأسعار لهذا العميل</span>
        {canManage && <button type="button" className="fpm-btn fpm-btn--primary" onClick={openNew}><Plus size={14} /> عرض جديد</button>}
      </div>

      {isLoading ? (
        <div className="fpl-empty"><Loader2 size={18} className="fpm-spin" /> جارٍ التحميل…</div>
      ) : proposals.length === 0 ? (
        <div className="fpl-empty">لا توجد عروض بعد — أنشئ أول عرض أتعاب.</div>
      ) : (
        proposals.map((p) => {
          const shown = feeProposalDisplayStatus(p);
          const busy = busyId === p.id;
          const contracts = (p.contracts ?? []).filter(isLiveDocument);
          const invoices = (p.invoices ?? []).filter(isLiveDocument);
          const hasDocs = contracts.length > 0 || invoices.length > 0;
          const iconBtn = { padding: 6 } as const;

          return (
            <div key={p.id} className="fpl-row">
              <FileText size={16} style={{ color: 'var(--law-navy, var(--color-primary))', flexShrink: 0 }} />
              <div className="fpl-row__main">
                <div className="fpl-row__title">{p.title || p.type_label}</div>
                <div className="fpl-row__sub">
                  <span className="fpl-num">{p.proposal_number}</span>
                  {p.outgoing_number ? <> · صادر <span className="fpl-num">{p.outgoing_number}</span></> : null}
                  {p.valid_until ? <> · {shown === 'expired' ? 'انتهى في' : 'ساري حتى'} <span className="fpl-num">{p.valid_until.split('T')[0]}</span></> : null}
                </div>
                {hasDocs && (
                  <div className="fpl-links">
                    {contracts.map((c) => (
                      <button key={`c${c.id}`} type="button" className="fpl-link" onClick={() => navigate(`/finance/contracts/${c.id}`)} title="فتح العقد">
                        <FileSignature size={11} /> عقد <span className="fpl-num">{c.contract_number}</span>
                      </button>
                    ))}
                    {invoices.map((i) => (
                      <button key={`i${i.id}`} type="button" className="fpl-link" onClick={() => navigate(`/finance/invoices/${i.id}`)} title="فتح الفاتورة">
                        <Receipt size={11} /> فاتورة <span className="fpl-num">{i.invoice_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className={`fpl-badge fpl-badge--${shown}`}>{FEE_PROPOSAL_STATUS_LABELS[shown]}</span>
              <span className="fpl-total">{money(p.total)}</span>
              <div className="fpl-actions">
                <button type="button" className="fpm-btn fpm-btn--ghost" title="معاينة PDF" style={iconBtn}
                  onClick={() => feeProposalService.openPreview(p.id).catch((e) => toast.error(e instanceof Error ? e.message : 'تعذّرت المعاينة'))}><Eye size={14} /></button>

                {p.status === 'draft' && canManage && (
                  <button type="button" className="fpm-btn fpm-btn--ghost" title="تعديل" style={iconBtn} disabled={busy} onClick={() => openEdit(p)}><Pencil size={14} /></button>
                )}
                {p.status === 'draft' && canSend && (
                  <button type="button" className="fpm-btn fpm-btn--primary" title="إرسال للعميل" style={iconBtn} disabled={busy} onClick={() => send(p)}>
                    {busy ? <Loader2 size={14} className="fpm-spin" /> : <Send size={14} />}
                  </button>
                )}

                {p.status === 'sent' && canManage && <>
                  <button type="button" className="fpm-btn fpm-btn--ghost" title="قبِل العميل العرض" style={{ ...iconBtn, color: 'var(--status-green, #16a34a)' }} disabled={busy} onClick={() => setStatus(p, 'accepted', 'سُجّل قبول العميل')}><CheckCircle2 size={14} /></button>
                  <button type="button" className="fpm-btn fpm-btn--ghost" title="رفض العميل العرض" style={{ ...iconBtn, color: 'var(--status-red, #dc2626)' }} disabled={busy} onClick={() => setStatus(p, 'rejected', 'سُجّل رفض العميل')}><XCircle size={14} /></button>
                </>}
                {p.status === 'sent' && shown !== 'expired' && canSend && (
                  <button type="button" className="fpm-btn fpm-btn--ghost" title="إعادة الإرسال (صادر جديد)" style={iconBtn} disabled={busy} onClick={() => resend(p)}><RotateCcw size={14} /></button>
                )}

                {p.status === 'accepted' && contracts.length === 0 && canContract && (
                  <button type="button" className="fpm-btn fpm-btn--primary" title="إنشاء عقد من العرض" disabled={busy}
                    onClick={() => navigate(`/finance/contracts/new?fee_proposal_id=${p.id}`)}><FileSignature size={13} /> عقد</button>
                )}
                {p.status === 'accepted' && contracts.length === 0 && canInvoice && (
                  <button type="button" className="fpm-btn" title="إنشاء مسودة فاتورة من العرض" disabled={busy} onClick={() => invoice(p)}>
                    {busy ? <Loader2 size={13} className="fpm-spin" /> : <Receipt size={13} />} فاتورة
                  </button>
                )}

                {(p.status === 'accepted' || p.status === 'rejected') && !hasDocs && canManage && (
                  <button type="button" className="fpm-btn fpm-btn--ghost" title={p.status === 'accepted' ? 'التراجع عن القبول' : 'التراجع عن الرفض'} style={iconBtn} disabled={busy} onClick={() => undo(p)}><Undo2 size={14} /></button>
                )}
                {p.status !== 'draft' && canManage && (
                  <button type="button" className="fpm-btn fpm-btn--ghost" title="نسخة جديدة (مسودة برقم جديد)" style={iconBtn} disabled={busy} onClick={() => duplicate(p)}><Copy size={14} /></button>
                )}
                {p.status === 'draft' && canManage && (
                  <button type="button" className="fpm-btn fpm-btn--ghost" title="حذف المسودة" style={iconBtn} disabled={busy} onClick={() => remove(p)}><Trash2 size={14} /></button>
                )}
                {p.status === 'sent' && canManage && (
                  <button type="button" className="fpm-btn fpm-btn--ghost" title="إلغاء العرض" style={iconBtn} disabled={busy} onClick={() => cancel(p)}><Ban size={14} /></button>
                )}
              </div>
            </div>
          );
        })
      )}

      <FeeProposalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clientId={clientId}
        clientName={clientName}
        cases={cases}
        existing={editing}
        onSaved={refresh}
      />

      <ConfirmDialog
        isOpen={!!pending}
        title={pending?.title ?? ''}
        message={pending?.message}
        note={pending?.note}
        confirmLabel={pending?.confirmLabel}
        variant={pending?.variant ?? 'primary'}
        loading={confirming}
        onConfirm={runPending}
        onClose={() => setPending(null)}
      />
    </div>
  );
};

export default ClientFeeProposalsTab;
