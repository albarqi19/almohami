// مودال إنشاء/تحرير عرض أتعاب/سعر — بنود وإجماليات حيّة + قالب + حفظ/معاينة/إرسال.
import React, { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, FileText, Plus, Trash2, Save, Eye, Send, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  feeProposalService,
  type FeeProposal,
  type FeeProposalItem,
  type FeeProposalTemplate,
  type FeeProposalType,
} from '../services/feeProposalService';

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName?: string;
  cases?: { id: number; title: string; file_number: string }[];
  existing?: FeeProposal | null;
  onSaved?: () => void;
}

const blankItem = (): FeeProposalItem => ({ description: '', quantity: 1, unit_price: 0 });

export const FeeProposalModal: React.FC<Props> = ({ open, onClose, clientId, clientName, cases = [], existing, onSaved }) => {
  const [templates, setTemplates] = useState<FeeProposalTemplate[]>([]);
  const [type, setType] = useState<FeeProposalType>('fee_proposal');
  const [title, setTitle] = useState('');
  const [caseId, setCaseId] = useState<number | ''>('');
  const [items, setItems] = useState<FeeProposalItem[]>([blankItem()]);
  const [discount, setDiscount] = useState(0);
  const [vatRate, setVatRate] = useState(15);
  const [validityDays, setValidityDays] = useState(30);
  const [intro, setIntro] = useState('');
  const [scope, setScope] = useState('');
  const [terms, setTerms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const [savedId, setSavedId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!open) return;
    feeProposalService.templates.list().then((r) => setTemplates(r.data ?? [])).catch(() => {});
    if (existing) {
      setType(existing.type);
      setTitle(existing.title ?? '');
      setCaseId(existing.case_id ?? '');
      setItems(existing.items?.length ? existing.items.map((i) => ({ ...i })) : [blankItem()]);
      setDiscount(Number(existing.discount_amount) || 0);
      setVatRate(Number(existing.vat_rate) || 15);
      setIntro(existing.intro_text ?? '');
      setScope(existing.scope_text ?? '');
      setTerms(existing.terms_text ?? '');
      setPaymentTerms(existing.payment_terms ?? '');
      setSavedId(existing.id);
    } else {
      setType('fee_proposal'); setTitle(''); setCaseId(''); setItems([blankItem()]);
      setDiscount(0); setVatRate(15); setValidityDays(30);
      setIntro(''); setScope(''); setTerms(''); setPaymentTerms(''); setSavedId(null);
    }
    setDirty(false);
  }, [open, existing]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
    const taxable = Math.max(0, subtotal - (Number(discount) || 0));
    const vat = +(taxable * (Number(vatRate) || 0) / 100).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), vat, total: +(taxable + vat).toFixed(2) };
  }, [items, discount, vatRate]);

  const money = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' ر.س';

  const applyTemplate = (id: number) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setType(t.type);
    if (t.title) setTitle(t.title);
    setIntro(t.intro_text ?? ''); setScope(t.scope_text ?? ''); setTerms(t.terms_text ?? '');
    setPaymentTerms(t.payment_terms ?? ''); setVatRate(Number(t.vat_rate) || 15); setValidityDays(t.validity_days || 30);
    if (t.default_items?.length) {
      setItems(t.default_items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })));
    }
    setDirty(true);
  };

  const updateItem = (idx: number, patch: Partial<FeeProposalItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    setDirty(true);
  };

  const buildPayload = () => ({
    type, title: title.trim() || (type === 'quote' ? 'عرض سعر' : 'عرض أتعاب'),
    client_id: clientId, case_id: caseId ? Number(caseId) : null,
    discount_amount: Number(discount) || 0, vat_rate: Number(vatRate) || 0,
    validity_days: validityDays,
    intro_text: intro || null, scope_text: scope || null, terms_text: terms || null, payment_terms: paymentTerms || null,
    items: items.filter((i) => i.description.trim()).map((i) => ({
      description: i.description.trim(), quantity: Number(i.quantity) || 0, unit_price: Number(i.unit_price) || 0,
    })),
  });

  const saveDraft = async (): Promise<number | null> => {
    if (!buildPayload().items.length) { toast.warn('أضف بنداً واحداً على الأقل'); return null; }
    try {
      setSaving(true);
      const res = savedId
        ? await feeProposalService.update(savedId, buildPayload())
        : await feeProposalService.create(buildPayload());
      const id = res.data.id;
      setSavedId(id); setDirty(false);
      toast.success(savedId ? 'تم حفظ التعديلات' : 'تم حفظ العرض');
      onSaved?.();
      return id;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر الحفظ');
      return null;
    } finally { setSaving(false); }
  };

  const handlePreview = async () => {
    let id = savedId;
    if (!id || dirty) id = await saveDraft();
    if (!id) return;
    try { setPreviewing(true); await feeProposalService.openPreview(id); }
    catch { toast.error('تعذّر فتح المعاينة'); }
    finally { setPreviewing(false); }
  };

  const handleSend = async () => {
    let id = savedId;
    if (!id || dirty) id = await saveDraft();
    if (!id) return;
    try {
      setSending(true);
      const res = await feeProposalService.send(id);
      if (res.success) {
        toast.success(`${res.message}${res.number ? ` (صادر ${res.number})` : ''}`);
        onSaved?.(); onClose();
      } else toast.error(res.message || 'تعذّر الإرسال');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذّر الإرسال'); }
    finally { setSending(false); }
  };

  const busy = saving || sending || previewing;
  const typeTemplates = templates.filter((t) => t.type === type);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fpm-overlay" />
        <Dialog.Content className="fpm-content" aria-describedby={undefined}>
          <header className="fpm-header">
            <Dialog.Title className="fpm-title"><FileText size={15} /> {existing ? 'تعديل العرض' : 'عرض أتعاب / سعر جديد'}{clientName ? ` — ${clientName}` : ''}</Dialog.Title>
            <Dialog.Close asChild><button type="button" className="fpm-close" aria-label="إغلاق"><X size={14} /></button></Dialog.Close>
          </header>

          <div className="fpm-body">
            <div className="fpm-grid">
              <label className="fpm-field">
                <span>النوع</span>
                <select value={type} onChange={(e) => { setType(e.target.value as FeeProposalType); setDirty(true); }} disabled={!!existing}>
                  <option value="fee_proposal">عرض أتعاب</option>
                  <option value="quote">عرض سعر</option>
                </select>
              </label>
              <label className="fpm-field">
                <span>قالب جاهز (اختياري)</span>
                <select defaultValue="" onChange={(e) => e.target.value && applyTemplate(Number(e.target.value))}>
                  <option value="">— ابدأ من قالب —</option>
                  {typeTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (افتراضي)' : ''}</option>)}
                </select>
              </label>
              <label className="fpm-field full">
                <span>عنوان العرض</span>
                <input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} placeholder={type === 'quote' ? 'عرض سعر' : 'عرض أتعاب قانونية'} />
              </label>
              {cases.length > 0 && (
                <label className="fpm-field">
                  <span>القضية (اختياري)</span>
                  <select value={caseId} onChange={(e) => { setCaseId(e.target.value ? Number(e.target.value) : ''); setDirty(true); }}>
                    <option value="">— بلا ربط بقضية —</option>
                    {cases.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.file_number})</option>)}
                  </select>
                </label>
              )}
              <label className="fpm-field">
                <span>مدّة الصلاحية (يوم)</span>
                <input type="number" min={1} value={validityDays} onChange={(e) => { setValidityDays(Number(e.target.value)); setDirty(true); }} />
              </label>
            </div>

            <div className="fpm-section-title">البنود</div>
            <table className="fpm-items">
              <thead><tr><th style={{ width: 26 }}>#</th><th>البيان</th><th style={{ width: 70 }}>الكمية</th><th style={{ width: 110 }}>سعر الوحدة</th><th style={{ width: 120 }}>المبلغ</th><th style={{ width: 34 }}></th></tr></thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td><input value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="وصف البند" /></td>
                    <td><input type="number" min={0} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} style={{ textAlign: 'center' }} /></td>
                    <td><input type="number" min={0} value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: e.target.value })} style={{ textAlign: 'center' }} /></td>
                    <td className="amount">{money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</td>
                    <td style={{ textAlign: 'center' }}>{items.length > 1 && <button type="button" className="fpm-itembtn" onClick={() => { setItems(items.filter((_, i) => i !== idx)); setDirty(true); }}><Trash2 size={14} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="fpm-additem" onClick={() => { setItems([...items, blankItem()]); setDirty(true); }}><Plus size={13} /> إضافة بند</button>

            <table className="fpm-totals">
              <tbody>
                <tr><td className="k">المجموع</td><td className="v">{money(totals.subtotal)}</td></tr>
                <tr><td className="k">الخصم</td><td className="v"><input type="number" min={0} value={discount} onChange={(e) => { setDiscount(Number(e.target.value)); setDirty(true); }} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', color: 'inherit' }} /></td></tr>
                <tr><td className="k">ضريبة ({vatRate}%)</td><td className="v">{money(totals.vat)}</td></tr>
                <tr className="grand"><td>الإجمالي</td><td className="v">{money(totals.total)}</td></tr>
              </tbody>
            </table>

            <div className="fpm-grid" style={{ marginTop: 8 }}>
              <label className="fpm-field"><span>نسبة الضريبة %</span><input type="number" min={0} max={100} value={vatRate} onChange={(e) => { setVatRate(Number(e.target.value)); setDirty(true); }} /></label>
              <label className="fpm-field"><span>شروط الدفع</span><input value={paymentTerms} onChange={(e) => { setPaymentTerms(e.target.value); setDirty(true); }} placeholder="50% مقدّماً والباقي عند الإنجاز" /></label>
              <label className="fpm-field full"><span>مقدّمة العرض</span><textarea value={intro} onChange={(e) => { setIntro(e.target.value); setDirty(true); }} /></label>
              <label className="fpm-field full"><span>نطاق العمل</span><textarea value={scope} onChange={(e) => { setScope(e.target.value); setDirty(true); }} /></label>
              <label className="fpm-field full"><span>الشروط والأحكام</span><textarea value={terms} onChange={(e) => { setTerms(e.target.value); setDirty(true); }} /></label>
            </div>
          </div>

          <footer className="fpm-footer">
            <button type="button" className="fpm-btn fpm-btn--ghost" onClick={saveDraft} disabled={busy}>{saving ? <Loader2 size={13} className="fpm-spin" /> : <Save size={13} />} حفظ مسودة</button>
            <div className="fpm-footer__right">
              <button type="button" className="fpm-btn fpm-btn--ghost" onClick={handlePreview} disabled={busy}>{previewing ? <Loader2 size={13} className="fpm-spin" /> : <Eye size={13} />} معاينة</button>
              <button type="button" className="fpm-btn fpm-btn--primary" onClick={handleSend} disabled={busy}>{sending ? <Loader2 size={13} className="fpm-spin" /> : <Send size={13} />} {sending ? 'جارٍ الإرسال…' : 'إرسال للعميل'}</button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
