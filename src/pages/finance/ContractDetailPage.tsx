// [P4·UX-03] صفحة عقد واحدة كثيفة (ERP) — أقسام بصفحة واحدة (لا تبويبات كبيرة) + تحرير الأطراف/الشروط.
// تستهلك [P3·CTR-01] (المدفوع الصحيح) + مسارات التحرير القائمة. المعاينة بقيم حقيقية (CTR-2-8).
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  ArrowRight, FileSignature, Download, Eye, Send, Trash2, Edit2, Plus, Users, Wallet,
  Receipt, FileText, CheckCircle,
} from 'lucide-react';
import { contractService } from '../../services/contractService';
import { Modal, StatusBadge } from '../../components/erp';
import { ToneBadge } from '../../components/erp/StatusBadge';
import { LoadingState, ErrorState } from '../../components/erp/States';
import ContractPreview from '../../components/contracts/ContractPreview';
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
  const [showDelete, setShowDelete] = useState(false);
  const [partyForm, setPartyForm] = useState<Partial<ContractParty> | null>(null);
  const [termForm, setTermForm] = useState<Partial<PaymentTerm> | null>(null);

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
    onSuccess: () => { toast.success('تم توقيع العقد'); invalidate(); setShowSign(false); setSignedBy(''); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر توقيع العقد'),
  });
  const sendMutation = useMutation({
    mutationFn: (method: 'email' | 'whatsapp') => contractService.sendContract(contractId, method),
    onSuccess: (res) => { toast.success(res.message || 'تم إرسال العقد'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر إرسال العقد'),
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
          {canEdit && actions.canSend && (
            <button type="button" className="fin-btn fin-btn--sm" disabled={sendMutation.isPending} onClick={() => sendMutation.mutate('email')}><Send size={14} /> إرسال للتوقيع</button>
          )}
          {canEdit && actions.canSign && (
            <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={() => { setSignedBy(contract.client?.name ?? ''); setShowSign(true); }}><CheckCircle size={14} /> توقيع</button>
          )}
          {canDelete && actions.canDelete && (
            <button type="button" className="fin-btn fin-btn--danger fin-btn--sm" onClick={() => setShowDelete(true)}><Trash2 size={14} /> حذف</button>
          )}
        </div>
      </div>

      {/* بطاقات الملخّص */}
      <div className="fin-cards">
        <div className="fin-card"><div className="fin-card__icon fin-card__icon--neutral"><Wallet size={18} /></div><div className="fin-card__body"><div className="fin-card__value">{formatSAR(value)}</div><div className="fin-card__label">قيمة العقد</div></div></div>
        <div className="fin-card"><div className="fin-card__icon fin-card__icon--success"><CheckCircle size={18} /></div><div className="fin-card__body"><div className="fin-card__value fin-card__value--success">{formatSAR(paid)}</div><div className="fin-card__label">المدفوع</div></div></div>
        <div className="fin-card"><div className="fin-card__icon fin-card__icon--warning"><Receipt size={18} /></div><div className="fin-card__body"><div className="fin-card__value fin-card__value--warning">{formatSAR(remaining)}</div><div className="fin-card__label">المتبقّي</div></div></div>
        <div className="fin-card">
          <div className="fin-card__body" style={{ width: '100%' }}>
            <div className="fin-card__value">{progress}%</div>
            <div className="fin-card__label">نسبة الإنجاز</div>
            <div className="fin-progress" style={{ marginTop: 6 }}><div className="fin-progress__fill" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </div>

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
              {contract.payment_terms && contract.payment_terms.length > 0 ? contract.payment_terms.map((term) => (
                <div key={term.id} className="fin-line">
                  <div className="fin-line__main">
                    <span className="fin-line__title">{term.name}</span>
                    <span className="fin-line__sub">{TERM_TYPE_LABELS[term.type] ?? term.type}</span>
                    <StatusBadge kind="paymentTerm" status={term.status} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="fin-line__amount">{formatSAR(term.calculated_amount ?? term.amount)}</span>
                    {/* [CTR-22] الفوترة مشروعة للمعلّق والمتأخر (overdue = متأخر لم يُفوتَر بعد). */}
                    {canManageInvoices && ['pending', 'overdue'].includes(term.status) && (
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
              )) : <div className="fin-cell-muted">لا توجد شروط دفع.</div>}
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

      {/* مودال التوقيع */}
      <Modal
        open={showSign}
        onClose={() => setShowSign(false)}
        title="توقيع العقد"
        icon={CheckCircle}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setShowSign(false)}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--primary" disabled={signMutation.isPending || !signedBy.trim()} onClick={() => signMutation.mutate()}>
              {signMutation.isPending ? 'جارٍ التوقيع...' : 'تأكيد التوقيع'}
            </button>
          </>
        )}
      >
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
        <div className="fin-field"><label className="fin-field__label">الجوال</label><input className="fin-input" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
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
          <select value={form.type} onChange={(e) => set('type', e.target.value)}>
            <option value="upfront">دفعة مقدمة</option>
            <option value="milestone">مرحلية</option>
            <option value="final">نهائية</option>
            <option value="percentage">نسبة</option>
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

export default ContractDetailPage;
