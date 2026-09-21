// [P4·UX-03] صفحة عقد واحدة كثيفة (ERP) — أقسام بصفحة واحدة (لا تبويبات كبيرة) + تحرير الأطراف/الشروط.
// تستهلك [P3·CTR-01] (المدفوع الصحيح) + مسارات التحرير القائمة. المعاينة بقيم حقيقية (CTR-2-8).
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  ArrowRight, FileSignature, Download, Eye, Send, Trash2, Edit2, Plus, Users, Wallet,
  Receipt, FileText, CheckCircle, Gavel,
  Lock, Undo2, Pencil,
  ShieldCheck, PenLine, Copy, ExternalLink, XCircle,
} from 'lucide-react';
import { contractService } from '../../services/contractService';
import { Modal, StatusBadge } from '../../components/erp';
import { ToneBadge } from '../../components/erp/StatusBadge';
import { LoadingState, ErrorState } from '../../components/erp/States';
import ContractPreview from '../../components/contracts/ContractPreview';
import PhoneField from '../../components/PhoneField';
import { StatTile } from '../../components/charts/RaedCharts';
import { formatSAR, formatPercent, toNumber } from '../../utils/money';
import { invalidateFinance } from '../../utils/financeCache';
import { contractActions } from '../../config/financeStatusConfig';
import { usePermissionContext } from '../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../config/financeModule';
import type { Contract, ContractParty, PaymentTerm } from '../../types/contracts';

const SCOPE_LABELS: Record<string, string> = { plaintiff: 'مدّعٍ', defendant: 'مدّعى عليه', both: 'مدّعٍ ومدّعى عليه' };
const TYPE_LABELS: Record<string, string> = {
  representation: 'تمثيل قضائي', consultation: 'استشارة', retainer: 'اشتراك سنوي', contingency: 'أتعاب نسبية', other: 'أخرى',
};
const PARTY_TYPE_LABELS: Record<string, string> = { first: 'الطرف الأول', second: 'الطرف الثاني' };
const TERM_TYPE_LABELS: Record<string, string> = { upfront: 'دفعة مقدمة', milestone: 'مرحلية', final: 'نهائية', percentage: 'نسبة' };

// صف قائمة تعريفات مضغوط (label ↔ value) للعمود الجانبي.
const Def: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="fin-defrow"><span className="fin-defrow__label">{label}</span><span className="fin-defrow__value">{children}</span></div>
);

// ── نموذج طرف ──
const emptyParty: Partial<ContractParty> = { party_type: 'first', entity_type: 'individual', name: '' };
// ── نموذج شرط ──
const emptyTerm = { name: '', type: 'milestone', amount_type: 'fixed', amount: undefined, percentage: undefined, due_condition: '', due_date: '' } as Partial<PaymentTerm>;

const ContractDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { has } = usePermissionContext();
  const canEdit = has(FINANCE_PERMISSIONS.contractsEdit);
  const canDelete = has(FINANCE_PERMISSIONS.contractsDelete); // الباك: DELETE /contracts يتطلّب contracts.delete
  const canManageInvoices = has(FINANCE_PERMISSIONS.invoicesManage);

  const [showPreview, setShowPreview] = useState(false);
  const [showSign, setShowSign] = useState(false);
  const [signedBy, setSignedBy] = useState('');
  // مودال «إرسال للتوقيع»: القناة + طريقة التوقيع (عادي من البوابة / موثّق عبر صادق) + ملاحظة.
  const [showSend, setShowSend] = useState(false);
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp'>('whatsapp');
  const [sendMode, setSendMode] = useState<'simple' | 'sadq'>('simple');
  const [sendNote, setSendNote] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [partyForm, setPartyForm] = useState<Partial<ContractParty> | null>(null);
  const [termForm, setTermForm] = useState<Partial<PaymentTerm> | null>(null);
  // [CTR-27] شرطُ «نسبة من الحكم» الذي يُدخَل له المحكوم به.
  const [judgmentTerm, setJudgmentTerm] = useState<PaymentTerm | null>(null);

  const contractId = Number(id);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'contract', id],
    queryFn: () => contractService.getContract(contractId),
    enabled: !!id,
  });

  const contract = data?.data;
  // إبطال موحّد: يشمل صفحة العقد + قائمة العقود + الفواتير/اللوحة (لطفرة توليد الفاتورة).
  const invalidate = () => invalidateFinance(queryClient);

  const signMutation = useMutation({
    mutationFn: () => contractService.signContract(contractId, signedBy),
    onSuccess: () => { toast.success('سُجّل التوقيع الورقي'); invalidate(); setShowSign(false); setSignedBy(''); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر تسجيل التوقيع'),
  });
  const sendMutation = useMutation({
    mutationFn: () => contractService.sendContract(contractId, sendMethod, sendNote.trim() || undefined, sendMode),
    onSuccess: (res) => { toast.success(res.message || 'تم إرسال العقد'); invalidate(); setShowSend(false); setSendNote(''); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر إرسال العقد'),
  });
  // [CTR-LOCK] إرجاع العقد المرسل للتوقيع إلى مسودة ليُعدَّل
  const recallMutation = useMutation({
    mutationFn: () => contractService.updateContract(contractId, { status: 'draft' }),
    onSuccess: () => { toast.success('أُعيد العقد إلى مسودة'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر إرجاع العقد'),
  });
  const deleteMutation = useMutation({
    mutationFn: () => contractService.deleteContract(contractId),
    onSuccess: () => { toast.success('تم حذف العقد'); queryClient.invalidateQueries({ queryKey: ['finance', 'contracts'] }); navigate('/finance/contracts'); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حذف العقد'),
  });
  const genInvoiceMutation = useMutation({
    mutationFn: (termId: number) => contractService.generateInvoiceFromTerm(termId),
    onSuccess: () => { toast.success('تم إنشاء الفاتورة'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر إنشاء الفاتورة'),
  });
  const partyMutation = useMutation({
    mutationFn: (p: Partial<ContractParty>) => (p.id
      ? contractService.updateParty(contractId, p.id, p)
      : contractService.addParty(contractId, p)),
    onSuccess: () => { toast.success('تم حفظ الطرف'); invalidate(); setPartyForm(null); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حفظ الطرف'),
  });
  const deletePartyMutation = useMutation({
    mutationFn: (partyId: number) => contractService.deleteParty(contractId, partyId),
    onSuccess: () => { toast.success('تم حذف الطرف'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حذف الطرف'),
  });
  const termMutation = useMutation({
    mutationFn: (t: Partial<PaymentTerm>) => (t.id
      ? contractService.updatePaymentTerm(contractId, t.id, t)
      : contractService.addPaymentTerm(contractId, t as never)),
    onSuccess: () => { toast.success('تم حفظ الشرط'); invalidate(); setTermForm(null); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حفظ الشرط'),
  });
  const deleteTermMutation = useMutation({
    mutationFn: (termId: number) => contractService.deletePaymentTerm(contractId, termId),
    onSuccess: () => { toast.success('تم حذف الشرط'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حذف الشرط'),
  });
  // [CTR-27] إدخال المحكوم به → الباك يفضّ نسبة الشرط عليه ويفتح الفوترة.
  const judgmentMutation = useMutation({
    mutationFn: ({ termId, amount }: { termId: number; amount: number }) =>
      contractService.updateFromJudgment(termId, amount),
    onSuccess: () => { toast.success('تم احتساب الأتعاب من مبلغ الحكم'); invalidate(); setJudgmentTerm(null); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر احتساب الأتعاب'),
  });

  // متغيّرات حقيقية للمعاينة (CTR-2-8) — قيم من العقد بدل رموز خام.
  const previewVariables = useMemo<Record<string, string>>(() => {
    if (!contract) return {};
    const first = contract.parties?.find((p) => p.party_type === 'first');
    const second = contract.parties?.find((p) => p.party_type === 'second');
    const vars: Record<string, string> = {
      contract_number: contract.contract_number ?? '',
      client_name: contract.client?.name ?? '',
      scope_type: SCOPE_LABELS[contract.scope_type] ?? contract.scope_type,
      total_amount: formatSAR(contract.total_amount),
      grand_total: formatSAR(contract.grand_total),
      start_date: contract.start_date ?? '',
      end_date: contract.end_date ?? '',
      contract_date: contract.contract_date ?? '',
      first_party_name: first?.name ?? '',
      second_party_name: second?.name ?? '',
    };
    return vars;
  }, [contract]);

  if (isLoading) return <LoadingState />;
  if (isError || !contract) return <ErrorState onRetry={() => refetch()} title="تعذّر تحميل العقد" />;

  const actions = contractActions(contract.status);
  const value = toNumber(contract.grand_total ?? contract.total_amount);
  const paid = toNumber(contract.total_paid);
  const remaining = toNumber(contract.remaining_amount ?? value - paid);
  const progress = value > 0 ? Math.min(100, Math.round((paid / value) * 100)) : 0;

  return (
    <div className="fin-detail">
      {/* الرأس */}
      <div className="fin-detail-header">
        <div className="fin-detail-header__main">
          <button type="button" className="fin-btn fin-btn--ghost fin-btn--icon" onClick={() => navigate('/finance/contracts')} aria-label="رجوع">
            <ArrowRight size={18} />
          </button>
          <FileSignature size={20} />
          <span className="fin-docnum">{contract.contract_number}</span>
          <StatusBadge kind="contract" status={contract.status} size="lg" />
        </div>
        <div className="fin-detail-header__actions">
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => setShowPreview(true)}><Eye size={14} /> معاينة</button>
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => contractService.downloadPdf(contract.id, contract.contract_number).catch(() => toast.error('تعذّر تحميل PDF'))}><Download size={14} /> PDF</button>
          {canEdit && actions.canEditContent && (
            <button type="button" className="fin-btn fin-btn--sm" onClick={() => navigate(`/finance/contracts/${contract.id}/edit`)}><Pencil size={14} /> تعديل المسودة</button>
          )}
          {canEdit && actions.canRecallToDraft && (
            <button type="button" className="fin-btn fin-btn--sm" disabled={recallMutation.isPending} title="يوقف الإرسال الحالي ويعيد العقد للتعديل" onClick={() => recallMutation.mutate()}><Undo2 size={14} /> إرجاع إلى مسودة</button>
          )}
          {canEdit && actions.canSend && (
            <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" disabled={sendMutation.isPending} onClick={() => { setSendMode(contract.signature?.sadq_active ? sendMode : 'simple'); setShowSend(true); }}>
              <Send size={14} /> {contract.status === 'pending_signature' ? 'إعادة الإرسال للتوقيع' : 'إرسال للتوقيع'}
            </button>
          )}
          {canEdit && actions.canSign && (
            <button type="button" className="fin-btn fin-btn--sm" onClick={() => { setSignedBy(contract.client?.name ?? ''); setShowSign(true); }} title="عقد وُقّع ورقياً أو حضورياً — يُسجَّل بلا إثبات إلكتروني"><PenLine size={14} /> تسجيل توقيع ورقي</button>
          )}
          {canDelete && actions.canDelete && (
            <button type="button" className="fin-btn fin-btn--danger fin-btn--sm" onClick={() => setShowDelete(true)}><Trash2 size={14} /> حذف</button>
          )}
        </div>
      </div>

      {/* [CTR-LOCK] العقد المرسل/الموقّع مقفل — رقاقة نصية مسطّحة */}
      {actions.isLocked && (
        <div className="fin-detail-lock">
          <Lock size={13} />
          <span>{actions.lockMessage} ما زال بالإمكان إضافة شروط دفع وملاحظات.</span>
        </div>
      )}

      {/* بطاقات الملخّص */}
      <div className="fct-tiles fin-detail-tiles rc-scope">
        <StatTile label="قيمة العقد" value={formatSAR(value)} icon={<Wallet size={15} />} hint="شاملة الضريبة" />
        <StatTile label="المدفوع" value={formatSAR(paid)} icon={<CheckCircle size={15} />} hint={`${contract.invoices?.length ?? 0} فاتورة تابعة`} />
        <StatTile
          label="المتبقّي"
          value={formatSAR(remaining)}
          icon={<Receipt size={15} />}
          hint={remaining > 0 ? 'لم يُحصَّل بعد' : 'مسدَّد بالكامل'}
        />
        <StatTile
          label="نسبة التحصيل"
          value={`${progress}%`}
          meter={{ value: Number(progress) || 0, tone: Number(progress) >= 100 ? 'good' : 'series1', ariaLabel: 'نسبة ما حُصّل من قيمة العقد' }}
        />
      </div>

      {/* التوقيع الإلكتروني — طريقته وآخر طلب (عادي من البوابة / موثّق عبر صادق / ورقي) */}
      {(contract.signature?.latest_request || contract.signed_at) && (
        <SignatureCard contract={contract} />
      )}

      {/* تخطيط عمودين: رئيسي (الفواتير + الشروط) + جانبي (معلومات العقد + الأطراف) */}
      <div className="fin-detail-grid">
        <div className="fin-detail-main">
          {/* الفواتير التابعة */}
          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title"><Receipt size={15} /> الفواتير التابعة ({contract.invoices?.length ?? 0})</span></div>
            <div className="fin-section__body">
              {contract.invoices && contract.invoices.length > 0 ? contract.invoices.map((inv) => (
                <div key={inv.id} className="fin-line" style={{ cursor: 'pointer' }} onClick={() => navigate(`/finance/invoices/${inv.id}`)}>
                  <div className="fin-line__main">
                    <span className="fin-docnum">{inv.invoice_number}</span>
                    <span className="fin-line__sub">{inv.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <StatusBadge kind="invoice" status={inv.status} />
                    <span className="fin-line__amount">{formatSAR(inv.total_amount)}</span>
                  </div>
                </div>
              )) : <div className="fin-cell-muted">لا توجد فواتير مرتبطة.</div>}
            </div>
          </div>

          {/* شروط الدفع */}
          <div className="fin-section">
            <div className="fin-section__head">
              <span className="fin-section__title"><Wallet size={15} /> شروط الدفع ({contract.payment_terms?.length ?? 0})</span>
              {canEdit && <button type="button" className="fin-btn fin-btn--sm" onClick={() => setTermForm({ ...emptyTerm })}><Plus size={13} /> شرط</button>}
            </div>
            <div className="fin-section__body">
              {contract.payment_terms && contract.payment_terms.length > 0 ? contract.payment_terms.map((term) => {
                // [CTR-27] شرط «نسبة من الحكم» ينتظر المحكوم به: مبلغه صفرٌ معلَّق
                // لا محسوب، والفوترةُ محجوبةٌ حتى يُدخَل (الباك يرفضها أيضاً).
                const isContingency = term.type === 'percentage';
                const awaitingJudgment = isContingency && toNumber(term.calculated_amount) <= 0;
                return (
                <div key={term.id} className="fin-line">
                  <div className="fin-line__main">
                    <span className="fin-line__title">{term.name}</span>
                    <span className="fin-line__sub">
                      {TERM_TYPE_LABELS[term.type] ?? term.type}
                      {isContingency && ` · ${formatPercent(term.percentage)} من المحكوم به`}
                    </span>
                    <StatusBadge kind="paymentTerm" status={term.status} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="fin-line__amount">
                      {awaitingJudgment
                        ? <span className="fin-cell-muted">بانتظار الحكم</span>
                        : formatSAR(term.calculated_amount ?? term.amount)}
                    </span>
                    {/* [CTR-27] إدخال المحكوم به — المسار كان موجوداً في الباك بلا زرّ يستدعيه. */}
                    {canEdit && isContingency && term.amount_type === 'percentage' && ['pending', 'overdue'].includes(term.status) && (
                      <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" onClick={() => setJudgmentTerm(term)} title="احتساب الأتعاب من مبلغ الحكم">
                        <Gavel size={13} /> {awaitingJudgment ? 'مبلغ الحكم' : 'تعديل الحكم'}
                      </button>
                    )}
                    {/* [CTR-22] الفوترة مشروعة للمعلّق والمتأخر (overdue = متأخر لم يُفوتَر بعد). */}
                    {canManageInvoices && !awaitingJudgment && ['pending', 'overdue'].includes(term.status) && (
                      <button type="button" className="fin-btn fin-btn--ghost fin-btn--sm" disabled={genInvoiceMutation.isPending} onClick={() => genInvoiceMutation.mutate(term.id)} title="إنشاء فاتورة">
                        <Receipt size={13} /> فوترة
                      </button>
                    )}
                    {/* [CTR-22] شرط مفوتر/مدفوع لقطة مجمَّدة — الباك يرفض تعديله/حذفه. */}
                    {canEdit && ['pending', 'overdue'].includes(term.status) && (
                      <button type="button" className="fin-btn fin-btn--ghost fin-btn--icon" onClick={() => setTermForm(term)} aria-label="تعديل"><Edit2 size={13} /></button>
                    )}
                    {canEdit && ['pending', 'overdue', 'cancelled'].includes(term.status) && (
                      <button type="button" className="fin-btn fin-btn--ghost fin-btn--icon" onClick={() => deleteTermMutation.mutate(term.id)} aria-label="حذف"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
                );
              }) : <div className="fin-cell-muted">لا توجد شروط دفع.</div>}
            </div>
          </div>
        </div>

        <div className="fin-detail-side">
          {/* معلومات العقد — قائمة تعريفات مضغوطة */}
          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title"><FileText size={15} /> معلومات العقد</span></div>
            <div className="fin-section__body">
              <div className="fin-deflist">
                <Def label="العنوان">{contract.title ?? '—'}</Def>
                <Def label="العميل">{contract.client?.name ?? '—'}</Def>
                <Def label="نوع النطاق">{SCOPE_LABELS[contract.scope_type] ?? contract.scope_type}</Def>
                {contract.template?.name && <Def label="القالب">{contract.template.name}</Def>}
                {(contract.case_model ?? contract.case)?.file_number && <Def label="القضية">{(contract.case_model ?? contract.case)?.file_number}</Def>}
                {contract.fee_proposal && (
                  <Def label={contract.fee_proposal.type_label || 'عرض الأتعاب'}>
                    <button type="button" className="fin-linklike" onClick={() => navigate(`/clients/${contract.client_id}?tab=fee_proposals`)} title="فتح عروض العميل">
                      <bdi>{contract.fee_proposal.proposal_number}</bdi>
                    </button>
                  </Def>
                )}
                <Def label="تاريخ البداية">{contract.start_date?.split('T')[0] ?? '—'}</Def>
                <Def label="تاريخ النهاية">{contract.end_date?.split('T')[0] ?? '—'}</Def>
                <Def label="الضريبة">{formatPercent(contract.vat_rate)} · {formatSAR(contract.vat_amount)}</Def>
              </div>
            </div>
          </div>

          {/* الأطراف */}
          <div className="fin-section">
            <div className="fin-section__head">
              <span className="fin-section__title"><Users size={15} /> الأطراف ({contract.parties?.length ?? 0})</span>
              {canEdit && actions.canManageParties && <button type="button" className="fin-btn fin-btn--sm" onClick={() => setPartyForm({ ...emptyParty })}><Plus size={13} /> طرف</button>}
            </div>
            <div className="fin-section__body">
              {contract.parties && contract.parties.length > 0 ? contract.parties.map((party) => (
                <div key={party.id} className="fin-line">
                  <div className="fin-line__main" style={{ flexWrap: 'wrap' }}>
                    <ToneBadge tone={party.party_type === 'first' ? 'info' : 'purple'}>{PARTY_TYPE_LABELS[party.party_type]}</ToneBadge>
                    <span className="fin-line__title">{party.name}</span>
                    <span className="fin-line__sub">{party.entity_type === 'company' ? `سجل ${party.commercial_registration ?? '—'}` : party.national_id ?? ''}</span>
                  </div>
                  {canEdit && actions.canManageParties && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" className="fin-btn fin-btn--ghost fin-btn--icon" onClick={() => setPartyForm(party)} aria-label="تعديل"><Edit2 size={13} /></button>
                      <button type="button" className="fin-btn fin-btn--ghost fin-btn--icon" onClick={() => deletePartyMutation.mutate(party.id)} aria-label="حذف"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              )) : <div className="fin-cell-muted">لا توجد أطراف.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* المعاينة — ContractPreview يدير مودال/overlay الخاص به */}
      {showPreview && (
        <ContractPreview
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          content={contract.content}
          variables={previewVariables}
          contractTitle={contract.title}
          contractNumber={contract.contract_number}
        />
      )}

      {/* مودال الإرسال للتوقيع */}
      <Modal
        open={showSend}
        onClose={() => setShowSend(false)}
        title="إرسال العقد للتوقيع"
        icon={Send}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setShowSend(false)}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--primary" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate()}>
              {sendMutation.isPending ? 'جارٍ الإرسال...' : 'إرسال'}
            </button>
          </>
        )}
      >
        <div className="fin-field">
          <label className="fin-field__label">طريقة التوقيع</label>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', lineHeight: 1.6 }}>
              <input type="radio" name="sig-mode" checked={sendMode === 'simple'} onChange={() => setSendMode('simple')} style={{ marginTop: 4 }} />
              <span><b><PenLine size={13} /> توقيع عادي من بوابة العميل</b><br /><span style={{ fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)' }}>يصله رابط بوابته، يقرأ العقد ويرسم توقيعه ويقرّ بالموافقة. يُسجَّل الوقت وعنوان الاتصال وتُحفظ نسخة موقّعة.</span></span>
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: contract.signature?.sadq_active ? 'pointer' : 'not-allowed', opacity: contract.signature?.sadq_active ? 1 : 0.55, lineHeight: 1.6 }}>
              <input type="radio" name="sig-mode" disabled={!contract.signature?.sadq_active} checked={sendMode === 'sadq'} onChange={() => setSendMode('sadq')} style={{ marginTop: 4 }} />
              <span><b><ShieldCheck size={13} /> توقيع موثّق بهوية نفاذ (صادق)</b><br /><span style={{ fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)' }}>
                {contract.signature?.sadq_active
                  ? `يتحقق العميل بتطبيق نفاذ ويعود العقد بشهادة صادق. الرصيد: ${contract.signature.sadq_credits} توقيع.`
                  : 'غير مفعّل لهذا المكتب — يُفعَّل من الإعدادات › التوقيع الإلكتروني إن أتاحته المنصّة.'}
              </span></span>
            </label>
          </div>
        </div>
        <div className="fin-field">
          <label className="fin-field__label">قناة الإرسال</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`fin-btn fin-btn--sm${sendMethod === 'whatsapp' ? ' fin-btn--primary' : ''}`} onClick={() => setSendMethod('whatsapp')}>واتساب</button>
            <button type="button" className={`fin-btn fin-btn--sm${sendMethod === 'email' ? ' fin-btn--primary' : ''}`} onClick={() => setSendMethod('email')}>بريد</button>
          </div>
        </div>
        <div className="fin-field">
          <label className="fin-field__label">ملاحظة للعميل (اختياري)</label>
          <textarea className="fin-textarea" value={sendNote} onChange={(e) => setSendNote(e.target.value)} rows={2} />
        </div>
      </Modal>

      {/* مودال تسجيل التوقيع الورقي */}
      <Modal
        open={showSign}
        onClose={() => setShowSign(false)}
        title="تسجيل توقيع ورقي"
        icon={PenLine}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setShowSign(false)}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--primary" disabled={signMutation.isPending || !signedBy.trim()} onClick={() => signMutation.mutate()}>
              {signMutation.isPending ? 'جارٍ التسجيل...' : 'تسجيل التوقيع'}
            </button>
          </>
        )}
      >
        <p style={{ fontSize: 12, color: 'var(--quiet-gray-500, #6b7280)', marginTop: 0, lineHeight: 1.7 }}>
          لعقد وُقّع على الورق أو حضورياً. يُفعَّل العقد باسمك كمسجِّل بلا إثبات إلكتروني من العميل. للتوقيع الإلكتروني استعمل «إرسال للتوقيع».
        </p>
        <div className="fin-field">
          <label className="fin-field__label">اسم الموقّع<span className="req">*</span></label>
          <input className="fin-input" value={signedBy} onChange={(e) => setSignedBy(e.target.value)} />
        </div>
      </Modal>

      {/* مودال الحذف */}
      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="حذف العقد"
        icon={Trash2}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setShowDelete(false)}>تراجع</button>
            <button type="button" className="fin-btn fin-btn--danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              {deleteMutation.isPending ? 'جارٍ الحذف...' : 'تأكيد الحذف'}
            </button>
          </>
        )}
      >
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>سيتم حذف العقد {contract.contract_number} نهائياً. لا يمكن حذف عقد له فواتير.</p>
      </Modal>

      {/* مودال الطرف */}
      {partyForm && (
        <PartyFormModal
          party={partyForm}
          onClose={() => setPartyForm(null)}
          onSave={(p) => partyMutation.mutate(p)}
          saving={partyMutation.isPending}
        />
      )}

      {/* مودال الشرط */}
      {termForm && (
        <TermFormModal
          term={termForm}
          onClose={() => setTermForm(null)}
          onSave={(t) => termMutation.mutate(t)}
          saving={termMutation.isPending}
        />
      )}

      {/* [CTR-27] مودال احتساب الأتعاب من المحكوم به */}
      {judgmentTerm && (
        <JudgmentModal
          term={judgmentTerm}
          onClose={() => setJudgmentTerm(null)}
          onSave={(amount) => judgmentMutation.mutate({ termId: judgmentTerm.id, amount })}
          saving={judgmentMutation.isPending}
        />
      )}
    </div>
  );
};

// ── مودال نموذج طرف ──
const PartyFormModal: React.FC<{
  party: Partial<ContractParty>;
  onClose: () => void;
  onSave: (p: Partial<ContractParty>) => void;
  saving: boolean;
}> = ({ party, onClose, onSave, saving }) => {
  const [form, setForm] = useState<Partial<ContractParty>>(party);
  const set = (k: keyof ContractParty, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const isCompany = form.entity_type === 'company';
  const valid = !!form.name?.trim() && (!isCompany || !!form.commercial_registration?.trim());

  return (
    <Modal
      open
      onClose={onClose}
      title={form.id ? 'تعديل طرف' : 'إضافة طرف'}
      icon={Users}
      footer={(
        <>
          <button type="button" className="fin-btn" onClick={onClose}>إلغاء</button>
          <button type="button" className="fin-btn fin-btn--primary" disabled={saving || !valid} onClick={() => onSave(form)}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </>
      )}
    >
      <div className="fin-grid fin-grid--2">
        <div className="fin-field">
          <label className="fin-field__label">نوع الطرف</label>
          <select value={form.party_type} onChange={(e) => set('party_type', e.target.value)}>
            <option value="first">الطرف الأول</option>
            <option value="second">الطرف الثاني</option>
          </select>
        </div>
        <div className="fin-field">
          <label className="fin-field__label">نوع الكيان</label>
          <select value={form.entity_type} onChange={(e) => set('entity_type', e.target.value)}>
            <option value="individual">فرد</option>
            <option value="company">شركة</option>
          </select>
        </div>
        <div className="fin-field fin-grid__full">
          <label className="fin-field__label">الاسم<span className="req">*</span></label>
          <input className="fin-input" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </div>
        {isCompany ? (
          <div className="fin-field">
            <label className="fin-field__label">السجل التجاري<span className="req">*</span></label>
            <input className="fin-input" value={form.commercial_registration ?? ''} onChange={(e) => set('commercial_registration', e.target.value)} />
          </div>
        ) : (
          <div className="fin-field">
            <label className="fin-field__label">رقم الهوية</label>
            <input className="fin-input" value={form.national_id ?? ''} onChange={(e) => set('national_id', e.target.value)} />
          </div>
        )}
        <div className="fin-field"><label className="fin-field__label">الجوال</label><PhoneField value={form.phone ?? ''} onChange={(v) => set('phone', v)} placeholder="5X XXX XXXX" /></div>
        <div className="fin-field"><label className="fin-field__label">البريد</label><input className="fin-input" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
        <div className="fin-field fin-grid__full"><label className="fin-field__label">العنوان</label><input className="fin-input" value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></div>
        {isCompany && (
          <>
            <div className="fin-field"><label className="fin-field__label">اسم الممثّل</label><input className="fin-input" value={form.representative_name ?? ''} onChange={(e) => set('representative_name', e.target.value)} /></div>
            <div className="fin-field"><label className="fin-field__label">هوية الممثّل</label><input className="fin-input" value={form.representative_national_id ?? ''} onChange={(e) => set('representative_national_id', e.target.value)} /></div>
          </>
        )}
      </div>
    </Modal>
  );
};

// ── مودال نموذج شرط دفع ──
const TermFormModal: React.FC<{
  term: Partial<PaymentTerm>;
  onClose: () => void;
  onSave: (t: Partial<PaymentTerm>) => void;
  saving: boolean;
}> = ({ term, onClose, onSave, saving }) => {
  const [form, setForm] = useState<Partial<PaymentTerm>>(term);
  const set = (k: keyof PaymentTerm, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const isPercentage = form.amount_type === 'percentage';
  const valid = !!form.name?.trim() && (isPercentage ? !!form.percentage : !!form.amount);

  return (
    <Modal
      open
      onClose={onClose}
      title={form.id ? 'تعديل شرط دفع' : 'إضافة شرط دفع'}
      icon={Wallet}
      footer={(
        <>
          <button type="button" className="fin-btn" onClick={onClose}>إلغاء</button>
          <button type="button" className="fin-btn fin-btn--primary" disabled={saving || !valid} onClick={() => onSave(form)}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </>
      )}
    >
      <div className="fin-grid fin-grid--2">
        <div className="fin-field fin-grid__full"><label className="fin-field__label">اسم الشرط<span className="req">*</span></label><input className="fin-input" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="fin-field">
          <label className="fin-field__label">النوع</label>
          <select
            value={form.type}
            onChange={(e) => {
              const type = e.target.value as PaymentTerm['type'];
              // [CTR-27] «نسبة من الحكم» تلزمها طريقةُ مبلغٍ نسبية، وإلا رفضها مسارُ
              // إدخال الحكم لاحقاً — تُضبط هنا بدل تركها فخّاً بين قائمتين.
              setForm((f) => ({ ...f, type, ...(type === 'percentage' ? { amount_type: 'percentage' as const, amount: undefined } : {}) }));
            }}
          >
            <option value="upfront">دفعة مقدمة</option>
            <option value="milestone">مرحلية</option>
            <option value="final">نهائية</option>
            <option value="percentage">نسبة من الحكم</option>
          </select>
        </div>
        <div className="fin-field">
          <label className="fin-field__label">طريقة المبلغ</label>
          <select value={form.amount_type} onChange={(e) => set('amount_type', e.target.value)}>
            <option value="fixed">مبلغ ثابت</option>
            <option value="percentage">نسبة مئوية</option>
          </select>
        </div>
        {isPercentage ? (
          <div className="fin-field"><label className="fin-field__label">النسبة %</label><input className="fin-input" type="number" value={form.percentage ?? ''} onChange={(e) => set('percentage', Number(e.target.value))} /></div>
        ) : (
          <div className="fin-field"><label className="fin-field__label">المبلغ</label><input className="fin-input" type="number" value={form.amount ?? ''} onChange={(e) => set('amount', Number(e.target.value))} /></div>
        )}
        <div className="fin-field"><label className="fin-field__label">تاريخ الاستحقاق</label><input className="fin-input" type="date" value={form.due_date ?? ''} onChange={(e) => set('due_date', e.target.value)} /></div>
        <div className="fin-field fin-grid__full"><label className="fin-field__label">وصف شرط الاستحقاق</label><input className="fin-input" value={form.due_condition ?? ''} onChange={(e) => set('due_condition', e.target.value)} /></div>
      </div>
    </Modal>
  );
};

// ── [CTR-27] مودال احتساب أتعاب النجاح من المحكوم به ──
// المسارُ (POST /payment-terms/{id}/update-from-judgment) كان قائماً في الباك بلا
// واجهةٍ تستدعيه، فبقي شرطُ «نسبة من الحكم» صفراً أبداً وتعذّرت فوترته.
const JudgmentModal: React.FC<{
  term: PaymentTerm;
  onClose: () => void;
  onSave: (amount: number) => void;
  saving: boolean;
}> = ({ term, onClose, onSave, saving }) => {
  const pct = toNumber(term.percentage);
  // القيمة الأوّلية: المحكوم به المستنتَج من مبلغٍ سابق (المبلغ ÷ النسبة × 100).
  const previous = toNumber(term.calculated_amount);
  const [amount, setAmount] = useState<string>(
    previous > 0 && pct > 0 ? String(Math.round((previous * 100) / pct)) : ''
  );

  const judgment = Number(amount) || 0;
  const fee = pct > 0 ? Math.round(((judgment * pct) / 100) * 100) / 100 : 0;
  const valid = judgment > 0 && pct > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="احتساب الأتعاب من مبلغ الحكم"
      icon={Gavel}
      footer={(
        <>
          <button type="button" className="fin-btn" onClick={onClose}>إلغاء</button>
          <button type="button" className="fin-btn fin-btn--primary" disabled={saving || !valid} onClick={() => onSave(judgment)}>
            {saving ? 'جارٍ الاحتساب...' : 'احتساب'}
          </button>
        </>
      )}
    >
      <div className="fin-grid">
        <div className="fin-field fin-grid__full">
          <label className="fin-field__label">المبلغ المحكوم به (ر.س)<span className="req">*</span></label>
          <input
            className="fin-input"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
          />
        </div>
        <div className="fin-field fin-grid__full">
          <div className="fin-deflist">
            <Def label="الشرط">{term.name}</Def>
            <Def label="النسبة">{formatPercent(term.percentage)}</Def>
            <Def label="الأتعاب المستحقّة">{valid ? formatSAR(fee) : '—'}</Def>
          </div>
          <div className="fin-cell-muted" style={{ marginTop: 8, fontSize: 13 }}>
            بعد الاحتساب يصبح الشرط قابلاً للفوترة. الضريبة تُضاف وفق إعداد الشرط ونسبة العقد.
          </div>
        </div>
      </div>
    </Modal>
  );
};

/** بطاقة التوقيع: الطريقة، آخر طلب وحالته، الرابط (بوابة/نفاذ)، وسبب الرفض إن وُجد. */
const SignatureCard: React.FC<{ contract: Contract }> = ({ contract }) => {
  const sig = contract.signature;
  const req = sig?.latest_request ?? null;
  const signed = !!contract.signed_at;
  const tone = req ? ({ pending: 'info', viewed: 'info', signed: 'success', rejected: 'danger', cancelled: 'neutral', expired: 'warning', failed: 'danger' } as const)[req.status] ?? 'neutral' : 'neutral';
  const copy = (text: string) => { navigator.clipboard?.writeText(text).then(() => toast.success('نُسخ الرابط')).catch(() => toast.error('تعذّر النسخ')); };
  const when = (v?: string | null) => (v ? new Date(v).toLocaleString('ar-SA') : null);

  return (
    <div className="fin-section" style={{ marginBottom: 12 }}>
      <div className="fin-section__head">
        <span className="fin-section__title">{contract.signature_method === 'sadq' ? <ShieldCheck size={15} /> : <PenLine size={15} />} التوقيع</span>
        {req && <ToneBadge tone={tone}>{req.status_label}</ToneBadge>}
      </div>
      <div style={{ padding: '10px 14px', display: 'grid', gap: 6, fontSize: 13 }}>
        {signed && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--status-success, #047857)', fontWeight: 600 }}>
            <CheckCircle size={15} /> {sig?.method_label || 'موقّع'} — {contract.signed_by} {when(contract.signed_at) && `· ${when(contract.signed_at)}`}
            {sig?.has_signed_file && <span style={{ fontWeight: 400, color: 'var(--quiet-gray-500, #6b7280)' }}>· نسخة موقّعة محفوظة</span>}
          </div>
        )}
        {req && !signed && (
          <>
            <Def label="الطريقة">{req.provider_label}</Def>
            {req.sent_at && <Def label="أُرسل">{when(req.sent_at)} {req.channel ? `عبر ${req.channel === 'email' ? 'البريد' : req.channel === 'whatsapp' ? 'واتساب' : req.channel}` : ''}</Def>}
            {req.viewed_at && <Def label="اطّلع العميل">{when(req.viewed_at)}</Def>}
            {req.expires_at && <Def label="ينتهي">{when(req.expires_at)}</Def>}
            {req.status === 'rejected' && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', color: 'var(--status-danger, #b91c1c)' }}>
                <XCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>رفض العميل التوقيع{req.rejected_reason ? `: ${req.rejected_reason}` : '.'} عدّل العقد وأعد إرساله.</span>
              </div>
            )}
            {(req.status === 'pending' || req.status === 'viewed') && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {req.provider === 'sadq' && req.signing_url ? (
                  <>
                    <a className="fin-btn fin-btn--sm" href={req.signing_url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> رابط التوقيع بنفاذ</a>
                    <button type="button" className="fin-btn fin-btn--sm" onClick={() => copy(req.signing_url!)}><Copy size={13} /> نسخ الرابط</button>
                  </>
                ) : sig?.portal_link ? (
                  <button type="button" className="fin-btn fin-btn--sm" onClick={() => copy(sig.portal_link)}><Copy size={13} /> نسخ رابط بوابة العميل</button>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContractDetailPage;
