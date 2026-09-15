// [CTR-LOCK] تعديل مسودة العقد: النص والبيانات الأساسية قبل الإرسال للتوقيع.
// الأطراف وشروط الدفع تُدار من صفحة العقد نفسها. العقد المرسل أو الموقّع لا يصل إلى هنا.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ArrowRight, FileSignature, Save, Eye } from 'lucide-react';
import { contractService } from '../../services/contractService';
import { CaseService } from '../../services/caseService';
import { LoadingState, ErrorState } from '../../components/erp/States';
import ContractTemplateEditor from '../../components/contracts/ContractTemplateEditor';
import ContractPreview from '../../components/contracts/ContractPreview';
import { invalidateFinance } from '../../utils/financeCache';
import { useBillingSettings } from '../../hooks/useBillingSettings';
import { formatSAR } from '../../utils/money';
import type { Contract, ScopeType } from '../../types/contracts';

interface CaseOption { id: number; title: string; file_number: string }

interface FormState {
  title: string;
  scope_type: ScopeType;
  case_id: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  total_amount: string;
  discount_percentage: string;
  vat_rate: string;
  notes: string;
  content: string;
}

const day = (v?: string | null) => (v ? v.split('T')[0] : '');

const toForm = (c: Contract): FormState => ({
  title: c.title ?? '',
  scope_type: c.scope_type,
  case_id: c.case_id ? String(c.case_id) : '',
  contract_date: day(c.contract_date),
  start_date: day(c.start_date),
  end_date: day(c.end_date),
  total_amount: String(Number(c.total_amount) || 0),
  discount_percentage: Number(c.discount_percentage) ? String(Number(c.discount_percentage)) : '',
  vat_rate: String(Number(c.vat_rate) || 0),
  notes: c.notes ?? '',
  content: c.content ?? '',
});

const ContractEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const contractId = Number(id);
  const { isVatRegistered } = useBillingSettings(true);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance', 'contract', id],
    queryFn: () => contractService.getContract(contractId),
    enabled: !!id,
  });
  const contract = data?.data;

  const [form, setForm] = useState<FormState | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!contract) return;
    if (contract.status !== 'draft') {
      toast.info('هذا العقد ليس مسودة — نصه وقيمته مقفلان');
      navigate(`/finance/contracts/${contract.id}`, { replace: true });
      return;
    }
    setForm((prev) => prev ?? toForm(contract));
  }, [contract, navigate]);

  const { data: casesData } = useQuery({
    queryKey: ['contract-edit-cases', contract?.client_id],
    queryFn: () => CaseService.getCases({ client_id: String(contract?.client_id ?? ''), limit: 100 }),
    enabled: !!contract?.client_id,
  });
  const cases: CaseOption[] = ((casesData as { data?: CaseOption[] } | undefined)?.data ?? []).map((c) => ({ id: c.id, title: c.title, file_number: c.file_number }));

  // [CTR-27] عقد له فواتير صادرة قيمته مجمَّدة — الباك يرفض تعديلها.
  const hasLiveInvoices = !!contract?.invoices?.some((i) => i.status !== 'cancelled');

  const totals = useMemo(() => {
    if (!form) return { taxable: 0, vat: 0, total: 0 };
    const amount = Number(form.total_amount) || 0;
    const disc = Math.min(100, Math.max(0, Number(form.discount_percentage) || 0));
    const taxable = amount - (amount * disc) / 100;
    const vat = taxable * ((Number(form.vat_rate) || 0) / 100);
    return { taxable, vat, total: taxable + vat };
  }, [form]);

  const dirty = !!contract && !!form && JSON.stringify(form) !== JSON.stringify(toForm(contract));

  const save = useMutation({
    mutationFn: () => {
      const f = form as FormState;
      const payload: Partial<Contract> = {
        title: f.title.trim() || undefined,
        scope_type: f.scope_type,
        case_id: f.case_id ? Number(f.case_id) : undefined,
        contract_date: f.contract_date || undefined,
        start_date: f.start_date || undefined,
        end_date: f.end_date || undefined,
        notes: f.notes,
        content: f.content,
      };
      if (!hasLiveInvoices) {
        payload.total_amount = Number(f.total_amount) || 0;
        payload.discount_percentage = Number(f.discount_percentage) || 0;
        payload.vat_rate = isVatRegistered ? (Number(f.vat_rate) || 0) : 0;
      }
      return contractService.updateContract(contractId, payload);
    },
    onSuccess: () => {
      toast.success('تم حفظ تعديلات المسودة');
      invalidateFinance(queryClient);
      queryClient.invalidateQueries({ queryKey: ['finance', 'contract', id] });
      navigate(`/finance/contracts/${contractId}`);
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حفظ التعديلات'),
  });

  if (isLoading || (contract && !form)) return <LoadingState />;
  if (isError || !contract || !form) return <ErrorState onRetry={() => refetch()} title="تعذّر تحميل العقد" />;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <div className="fin-detail">
      <div className="fin-detail-header">
        <div className="fin-detail-header__main">
          <button type="button" className="fin-btn fin-btn--ghost fin-btn--icon" onClick={() => navigate(`/finance/contracts/${contract.id}`)} aria-label="رجوع"><ArrowRight size={18} /></button>
          <FileSignature size={20} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="fin-docnum">{contract.contract_number}</span>
              <span className="fin-cell-muted">تعديل المسودة</span>
            </div>
            <div className="fin-cell-muted" style={{ marginTop: 2 }}>العميل: {contract.client?.name ?? '—'}. الأطراف وشروط الدفع تُعدَّل من صفحة العقد.</div>
          </div>
        </div>
        <div className="fin-detail-header__actions">
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => setShowPreview(true)}><Eye size={14} /> معاينة</button>
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => navigate(`/finance/contracts/${contract.id}`)}>إلغاء</button>
          <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            <Save size={14} /> {save.isPending ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>

      <div className="fin-detail-grid">
        <div className="fin-detail-main">
          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title"><FileSignature size={15} /> نص العقد</span></div>
            <div className="fin-section__body">
              <ContractTemplateEditor content={form.content} onChange={(v) => set('content', v)} placeholder="اكتب نص العقد…" onPreview={() => setShowPreview(true)} />
              <div className="fin-cell-muted" style={{ marginTop: 6 }}>المتغيرات مثل {'{{client_name}}'} تُملأ تلقائياً عند الطباعة.</div>
            </div>
          </div>
        </div>

        <div className="fin-detail-side">
          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title">البيانات الأساسية</span></div>
            <div className="fin-section__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="fin-field">
                <label className="fin-field__label">عنوان العقد</label>
                <input className="fin-input" value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={255} />
              </div>
              <div className="fin-field">
                <label className="fin-field__label">صفة العميل</label>
                <select className="fin-select" value={form.scope_type} onChange={(e) => set('scope_type', e.target.value as ScopeType)}>
                  <option value="plaintiff">مدعي</option>
                  <option value="defendant">مدعى عليه</option>
                  <option value="both">كلاهما</option>
                </select>
              </div>
              <div className="fin-field">
                <label className="fin-field__label">القضية</label>
                <select className="fin-select" value={form.case_id} onChange={(e) => set('case_id', e.target.value)}>
                  <option value="">— بلا ربط بقضية —</option>
                  {cases.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.file_number})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="fin-field">
                  <label className="fin-field__label">تاريخ العقد</label>
                  <input type="date" className="fin-input" value={form.contract_date} onChange={(e) => set('contract_date', e.target.value)} />
                </div>
                <div className="fin-field">
                  <label className="fin-field__label">بداية السريان</label>
                  <input type="date" className="fin-input" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
                </div>
                <div className="fin-field">
                  <label className="fin-field__label">نهاية السريان</label>
                  <input type="date" className="fin-input" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title">القيمة</span></div>
            <div className="fin-section__body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {hasLiveInvoices && <div className="fin-cell-muted">للعقد فواتير صادرة، فقيمته مجمَّدة. ألغِ الفواتير أولاً إن لزم تعديلها.</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="fin-field">
                  <label className="fin-field__label">المبلغ قبل الضريبة</label>
                  <input type="number" min="0" step="0.01" className="fin-input" value={form.total_amount} disabled={hasLiveInvoices} onChange={(e) => set('total_amount', e.target.value)} />
                </div>
                <div className="fin-field">
                  <label className="fin-field__label">خصم %</label>
                  <input type="number" min="0" max="100" step="0.5" className="fin-input" value={form.discount_percentage} disabled={hasLiveInvoices} onChange={(e) => set('discount_percentage', e.target.value)} />
                </div>
                <div className="fin-field">
                  <label className="fin-field__label">الضريبة %</label>
                  <input type="number" min="0" max="100" step="0.5" className="fin-input" value={isVatRegistered ? form.vat_rate : '0'} disabled={hasLiveInvoices || !isVatRegistered} title={!isVatRegistered ? 'المكتب غير مسجَّل في ضريبة القيمة المضافة' : ''} onChange={(e) => set('vat_rate', e.target.value)} />
                </div>
              </div>
              <div className="fin-deflist">
                <div className="fin-defrow"><span className="fin-defrow__label">بعد الخصم</span><span className="fin-defrow__value">{formatSAR(totals.taxable)}</span></div>
                <div className="fin-defrow"><span className="fin-defrow__label">الضريبة</span><span className="fin-defrow__value">{formatSAR(totals.vat)}</span></div>
                <div className="fin-defrow"><span className="fin-defrow__label">الإجمالي</span><span className="fin-defrow__value" style={{ fontWeight: 700 }}>{formatSAR(totals.total)}</span></div>
              </div>
              <div className="fin-cell-muted">تغيير القيمة يعيد حساب شروط الدفع غير المدفوعة.</div>
            </div>
          </div>

          <div className="fin-section">
            <div className="fin-section__head"><span className="fin-section__title">ملاحظات</span></div>
            <div className="fin-section__body">
              <textarea className="fin-textarea" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="ملاحظات تظهر في العقد" />
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <ContractPreview
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          content={form.content}
          variables={{
            contract_number: contract.contract_number,
            client_name: contract.client?.name ?? '',
            total_amount: formatSAR(Number(form.total_amount) || 0),
            grand_total: formatSAR(totals.total),
            contract_date: form.contract_date,
            start_date: form.start_date,
            end_date: form.end_date,
          }}
          contractTitle={form.title || contract.title}
          contractNumber={contract.contract_number}
        />
      )}
    </div>
  );
};

export default ContractEditPage;
