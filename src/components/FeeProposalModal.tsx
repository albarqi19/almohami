// نافذة كتابة عرض الأتعاب / عرض السعر — تحرير على عمودين: محتوى العرض يميناً وملخصه وشكله يساراً.
// حفظ مسودة / معاينة PDF / إرسال للعميل. القالب الجاهز يملأ النصوص والبنود، والقيم تبقى قابلة للتعديل.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, FileText, Plus, Trash2, Save, Eye, Send, Loader2, Landmark, Palette, CalendarDays, ListChecks, AlignRight } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  feeProposalService,
  type FeeProposal,
  type FeeProposalItem,
  type FeeProposalTemplate,
  type FeeProposalType,
} from '../services/feeProposalService';
import { LetterheadService } from '../services/letterheadService';
import { BankAccountService, type TenantBankAccount } from '../services/bankAccountService';
import { useBillingSettings } from '../hooks/useBillingSettings';
import type { Letterhead } from '../types/letterhead';

interface Props {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName?: string;
  cases?: { id: number; title: string; file_number: string }[];
  existing?: FeeProposal | null;
  onSaved?: () => void;
}

const blankItem = (): FeeProposalItem => ({ description: '', quantity: 1, unit_price: '' });

const money = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + (Number(days) || 0));
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const normalizeHex = (v: string) => {
  const s = v.trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(s) ? `#${s.toLowerCase()}` : '';
};

export const FeeProposalModal: React.FC<Props> = ({ open, onClose, clientId, clientName, cases = [], existing, onSaved }) => {
  const { isVatRegistered, defaultVatRate } = useBillingSettings(open);

  const [templates, setTemplates] = useState<FeeProposalTemplate[]>([]);
  const [letterheads, setLetterheads] = useState<Letterhead[]>([]);
  const [bankAccounts, setBankAccounts] = useState<TenantBankAccount[]>([]);

  const [type, setType] = useState<FeeProposalType>('fee_proposal');
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [caseId, setCaseId] = useState<number | ''>('');
  const [items, setItems] = useState<FeeProposalItem[]>([blankItem()]);
  const [discount, setDiscount] = useState<string>('');
  const [vatRate, setVatRate] = useState<string>('15');
  const [validityDays, setValidityDays] = useState<number>(30);
  const [intro, setIntro] = useState('');
  const [scope, setScope] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [terms, setTerms] = useState('');
  const [letterheadId, setLetterheadId] = useState<number | ''>('');
  const [accentColor, setAccentColor] = useState<string>('');

  const [savedId, setSavedId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [touched, setTouched] = useState(false);
  const contentTouched = useRef(false);

  // ── تحميل المراجع مرة عند الفتح ──
  useEffect(() => {
    if (!open) return;
    feeProposalService.templates.list().then((r) => setTemplates(r.data ?? [])).catch(() => {});
    LetterheadService.getAll({ is_active: true })
      .then((r) => {
        const raw = (r as unknown as { data?: Letterhead[] | { data?: Letterhead[] } }).data;
        setLetterheads(Array.isArray(raw) ? raw : (raw?.data ?? []));
      })
      .catch(() => {});
    BankAccountService.list().then((r) => setBankAccounts(r.accounts.filter((a) => a.is_active && a.show_on_invoices))).catch(() => {});
  }, [open]);

  // ── تهيئة النموذج ──
  useEffect(() => {
    if (!open) return;
    if (existing) {
      setType(existing.type);
      setTemplateId('');
      setTitle(existing.title ?? '');
      setCaseId(existing.case_id ?? '');
      setItems(existing.items?.length ? existing.items.map((i) => ({ ...i })) : [blankItem()]);
      setDiscount(Number(existing.discount_amount) ? String(Number(existing.discount_amount)) : '');
      setVatRate(String(Number(existing.vat_rate) || 0));
      setIntro(existing.intro_text ?? '');
      setScope(existing.scope_text ?? '');
      setPaymentTerms(existing.payment_terms ?? '');
      setTerms(existing.terms_text ?? '');
      setLetterheadId(existing.letterhead_id ?? '');
      setAccentColor(existing.accent_color ? normalizeHex(existing.accent_color) : '');
      setSavedId(existing.id);
      contentTouched.current = true;
    } else {
      setType('fee_proposal'); setTemplateId(''); setTitle(''); setCaseId(''); setItems([blankItem()]);
      setDiscount(''); setVatRate(isVatRegistered ? defaultVatRate : '0'); setValidityDays(30);
      setIntro(''); setScope(''); setPaymentTerms(''); setTerms('');
      setLetterheadId(''); setAccentColor(''); setSavedId(null);
      contentTouched.current = false;
    }
    setDirty(false);
    setTouched(false);
  }, [open, existing, isVatRegistered, defaultVatRate]);

  // غير المسجَّل ضريبياً لا يضيف ضريبة مهما كتب القالب.
  useEffect(() => {
    if (open && !isVatRegistered && vatRate !== '0') setVatRate('0');
  }, [open, isVatRegistered, vatRate]);

  const applyTemplate = (t: FeeProposalTemplate | undefined) => {
    if (!t) return;
    setTemplateId(t.id);
    if (t.title) setTitle(t.title);
    setIntro(t.intro_text ?? ''); setScope(t.scope_text ?? ''); setTerms(t.terms_text ?? '');
    setPaymentTerms(t.payment_terms ?? '');
    setVatRate(isVatRegistered ? String(Number(t.vat_rate) || Number(defaultVatRate) || 15) : '0');
    setValidityDays(t.validity_days || 30);
    if (t.letterhead_id) setLetterheadId(t.letterhead_id);
    if (t.accent_color) setAccentColor(normalizeHex(t.accent_color));
    if (t.default_items?.length) {
      setItems(t.default_items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price })));
    }
    setDirty(true);
  };

  // القالب الافتراضي للنوع يُطبَّق تلقائياً على عرض جديد لم يُكتب فيه شيء بعد.
  const typeTemplates = useMemo(() => templates.filter((t) => t.type === type && t.is_active !== false), [templates, type]);
  useEffect(() => {
    if (!open || existing || contentTouched.current || typeTemplates.length === 0) return;
    const def = typeTemplates.find((t) => t.is_default) ?? null;
    if (def) applyTemplate(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing, typeTemplates]);

  const markDirty = () => { setDirty(true); contentTouched.current = true; };

  const updateItem = (idx: number, patch: Partial<FeeProposalItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    markDirty();
  };
  const addItem = () => { setItems((prev) => [...prev, blankItem()]); markDirty(); };
  const removeItem = (idx: number) => { setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [blankItem()])); markDirty(); };

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
    const disc = Math.min(subtotal, Math.max(0, Number(discount) || 0));
    const taxable = Math.max(0, subtotal - disc);
    const rate = Number(vatRate) || 0;
    const vat = +(taxable * rate / 100).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), discount: disc, taxable: +taxable.toFixed(2), rate, vat, total: +(taxable + vat).toFixed(2) };
  }, [items, discount, vatRate]);

  const validItems = items.filter((i) => i.description.trim() && Number(i.unit_price) > 0);
  const itemsError = validItems.length === 0 ? 'أضف بنداً واحداً على الأقل ببيان ومبلغ' : null;
  const validUntil = existing?.valid_until && !dirty ? existing.valid_until.split('T')[0] : addDays(validityDays);

  const buildPayload = () => ({
    type,
    title: title.trim() || (type === 'quote' ? 'عرض سعر' : 'عرض أتعاب'),
    client_id: clientId,
    case_id: caseId ? Number(caseId) : null,
    template_id: templateId ? Number(templateId) : null,
    letterhead_id: letterheadId ? Number(letterheadId) : null,
    accent_color: accentColor || null,
    discount_amount: Number(discount) || 0,
    vat_rate: Number(vatRate) || 0,
    validity_days: validityDays,
    intro_text: intro || null, scope_text: scope || null, terms_text: terms || null, payment_terms: paymentTerms || null,
    items: validItems.map((i) => ({ description: i.description.trim(), quantity: Number(i.quantity) || 1, unit_price: Number(i.unit_price) || 0 })),
  });

  const saveDraft = async (): Promise<number | null> => {
    setTouched(true);
    if (itemsError) { toast.warn(itemsError); return null; }
    try {
      setSaving(true);
      const payload = buildPayload();
      const res = savedId ? await feeProposalService.update(savedId, payload) : await feeProposalService.create(payload);
      const id = res.data.id;
      setSavedId(id); setDirty(false);
      toast.success(savedId ? 'تم حفظ التعديلات' : 'تم حفظ العرض مسودة');
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
  const printedBanks = bankAccounts.length > 0 ? bankAccounts.filter((a) => a.is_default) : [];
  const banksToShow = printedBanks.length > 0 ? printedBanks : bankAccounts.slice(0, 1);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fpm-overlay" />
        <Dialog.Content className="fpm-content" aria-describedby={undefined}>
          <header className="fpm-header">
            <div className="fpm-header__main">
              <Dialog.Title className="fpm-title">
                <FileText size={15} /> {existing ? 'تعديل العرض' : (type === 'quote' ? 'عرض سعر جديد' : 'عرض أتعاب جديد')}
              </Dialog.Title>
              <div className="fpm-subtitle">
                {clientName ? <span>العميل: <b>{clientName}</b></span> : null}
                {existing?.proposal_number ? <span className="fpm-num">{existing.proposal_number}</span> : null}
                {dirty ? <span className="fpm-dirty">تغييرات غير محفوظة</span> : savedId ? <span className="fpm-saved">محفوظ</span> : null}
              </div>
            </div>
            <Dialog.Close asChild><button type="button" className="fpm-close" aria-label="إغلاق"><X size={14} /></button></Dialog.Close>
          </header>

          <div className="fpm-body">
            {/* ── العمود الرئيسي: محتوى العرض ── */}
            <div className="fpm-main">
              <section className="fpm-sec">
                <div className="fpm-sec__title"><ListChecks size={13} /> الأساسيات</div>
                <div className="fpm-grid2">
                  <div className="fpm-field">
                    <span>نوع العرض</span>
                    <div className="fpm-pills">
                      <button type="button" className={`fpm-pill${type === 'fee_proposal' ? ' active' : ''}`} disabled={!!existing} onClick={() => { setType('fee_proposal'); setTemplateId(''); setDirty(true); }}>عرض أتعاب</button>
                      <button type="button" className={`fpm-pill${type === 'quote' ? ' active' : ''}`} disabled={!!existing} onClick={() => { setType('quote'); setTemplateId(''); setDirty(true); }}>عرض سعر</button>
                    </div>
                  </div>
                  <label className="fpm-field">
                    <span>القالب الجاهز</span>
                    <select value={templateId} onChange={(e) => { const id = Number(e.target.value); if (id) applyTemplate(typeTemplates.find((t) => t.id === id)); else setTemplateId(''); }}>
                      <option value="">— بلا قالب —</option>
                      {typeTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (الافتراضي)' : ''}</option>)}
                    </select>
                  </label>
                  <label className="fpm-field full">
                    <span>عنوان العرض</span>
                    <input value={title} onChange={(e) => { setTitle(e.target.value); markDirty(); }} placeholder={type === 'quote' ? 'مثلاً: عرض سعر صياغة عقد شراكة' : 'مثلاً: عرض أتعاب الترافع في الدعوى التجارية'} maxLength={255} />
                  </label>
                  <label className="fpm-field full">
                    <span>القضية المرتبطة</span>
                    <select value={caseId} onChange={(e) => { setCaseId(e.target.value ? Number(e.target.value) : ''); markDirty(); }} disabled={cases.length === 0}>
                      <option value="">{cases.length === 0 ? 'لا قضايا لهذا العميل' : '— بلا ربط بقضية —'}</option>
                      {cases.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.file_number})</option>)}
                    </select>
                  </label>
                </div>
              </section>

              <section className="fpm-sec">
                <div className="fpm-sec__title"><FileText size={13} /> البنود</div>
                <table className="fpm-items">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>#</th>
                      <th>البيان</th>
                      <th style={{ width: 72 }}>الكمية</th>
                      <th style={{ width: 118 }}>سعر الوحدة</th>
                      <th style={{ width: 118 }}>المبلغ</th>
                      <th style={{ width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="c">{idx + 1}</td>
                        <td><input value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} placeholder="مثلاً: أتعاب الترافع أمام المحكمة التجارية" maxLength={500} /></td>
                        <td><input type="number" min={0} step="0.5" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} className="num" /></td>
                        <td><input type="number" min={0} step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: e.target.value })} className="num" placeholder="0.00" /></td>
                        <td className="amount">{money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</td>
                        <td className="c"><button type="button" className="fpm-itembtn" onClick={() => removeItem(idx)} aria-label="حذف البند"><Trash2 size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="fpm-items__foot">
                  <button type="button" className="fpm-additem" onClick={addItem}><Plus size={13} /> إضافة بند</button>
                  {touched && itemsError ? <span className="fpm-err">{itemsError}</span> : <span className="fpm-hint">المبالغ بالريال السعودي قبل الضريبة.</span>}
                </div>
              </section>

              <section className="fpm-sec">
                <div className="fpm-sec__title"><AlignRight size={13} /> نصوص العرض</div>
                <label className="fpm-field">
                  <span>مقدمة العرض</span>
                  <textarea rows={2} value={intro} onChange={(e) => { setIntro(e.target.value); markDirty(); }} placeholder="يسعدنا تقديم عرض الأتعاب التالي بعد دراسة موضوعكم…" />
                </label>
                <label className="fpm-field">
                  <span>نطاق العمل</span>
                  <textarea rows={4} value={scope} onChange={(e) => { setScope(e.target.value); markDirty(); }} placeholder="ما الذي يشمله العرض؟ اكتب كل نقطة في سطر." />
                </label>
                <label className="fpm-field">
                  <span>شروط الدفع</span>
                  <textarea rows={2} value={paymentTerms} onChange={(e) => { setPaymentTerms(e.target.value); markDirty(); }} placeholder="مثلاً: 50% عند التوقيع والباقي عند صدور الحكم" maxLength={1000} />
                </label>
                <label className="fpm-field">
                  <span>الشروط والأحكام</span>
                  <textarea rows={3} value={terms} onChange={(e) => { setTerms(e.target.value); markDirty(); }} placeholder="مثلاً: الأتعاب لا تشمل الرسوم القضائية ومصاريف الخبراء" />
                </label>
              </section>
            </div>

            {/* ── العمود الجانبي: الملخص والشكل ── */}
            <aside className="fpm-rail">
              <div className="fpm-card">
                <div className="fpm-card__title">الملخص</div>
                <div className="fpm-sum">
                  <div className="fpm-sum__row"><span>المجموع</span><b className="fpm-num">{money(totals.subtotal)}</b></div>
                  <div className="fpm-sum__row fpm-sum__row--input">
                    <span>الخصم</span>
                    <input type="number" min={0} step="0.01" value={discount} onChange={(e) => { setDiscount(e.target.value); markDirty(); }} placeholder="0.00" className="num" />
                  </div>
                  <div className="fpm-sum__row fpm-sum__row--input">
                    <span>الضريبة %</span>
                    <input type="number" min={0} max={100} step="0.5" value={vatRate} disabled={!isVatRegistered} title={!isVatRegistered ? 'المكتب غير مسجَّل في ضريبة القيمة المضافة' : ''} onChange={(e) => { setVatRate(e.target.value); markDirty(); }} className="num" />
                  </div>
                  <div className="fpm-sum__row"><span>قيمة الضريبة</span><b className="fpm-num">{money(totals.vat)}</b></div>
                  <div className="fpm-sum__row fpm-sum__row--grand"><span>الإجمالي</span><b className="fpm-num">{money(totals.total)} <small>ر.س</small></b></div>
                </div>
                {!isVatRegistered && <div className="fpm-hint">المكتب غير مسجَّل ضريبياً — العرض بلا ضريبة.</div>}
              </div>

              <div className="fpm-card">
                <div className="fpm-card__title"><CalendarDays size={13} /> الصلاحية</div>
                <div className="fpm-inline">
                  <input type="number" min={1} max={365} value={validityDays} onChange={(e) => { setValidityDays(Math.max(1, Number(e.target.value) || 1)); markDirty(); }} className="num" style={{ width: 70 }} />
                  <span>يوماً — ساري حتى <b className="fpm-num">{validUntil}</b></span>
                </div>
              </div>

              <div className="fpm-card">
                <div className="fpm-card__title"><Palette size={13} /> الشكل</div>
                <label className="fpm-field">
                  <span>الكليشة</span>
                  <select value={letterheadId} onChange={(e) => { setLetterheadId(e.target.value ? Number(e.target.value) : ''); markDirty(); }}>
                    <option value="">كليشة المستندات المالية (الافتراضية)</option>
                    {letterheads.map((l) => <option key={l.id} value={l.id}>{l.name}{l.is_default ? ' (الافتراضية)' : ''}</option>)}
                  </select>
                </label>
                <div className="fpm-field">
                  <span>لون الهوية في هذا العرض</span>
                  <div className="fpm-inline">
                    <input type="color" value={accentColor || '#1f3a5f'} onChange={(e) => { setAccentColor(normalizeHex(e.target.value)); markDirty(); }} className="fpm-color" aria-label="لون الهوية" />
                    <input value={accentColor} onChange={(e) => { setAccentColor(e.target.value); markDirty(); }} onBlur={(e) => setAccentColor(normalizeHex(e.target.value))} placeholder="تلقائي من الكليشة" className="num" style={{ flex: 1 }} maxLength={7} />
                    {accentColor && <button type="button" className="fpm-link" onClick={() => { setAccentColor(''); markDirty(); }}>تلقائي</button>}
                  </div>
                </div>
              </div>

              <div className="fpm-card">
                <div className="fpm-card__title"><Landmark size={13} /> التحويل البنكي</div>
                {banksToShow.length === 0 ? (
                  <div className="fpm-hint">لا حسابات بنكية مضافة. أضفها من إعدادات «الفوترة والضريبة» لتُطبع على العرض.</div>
                ) : (
                  banksToShow.map((a) => (
                    <div key={a.id} className="fpm-bank">
                      <b>{a.bank_name || 'حساب بنكي'}</b>
                      <span className="fpm-num">{a.iban_grouped}</span>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </div>

          <footer className="fpm-footer">
            <button type="button" className="fpm-btn fpm-btn--ghost" onClick={saveDraft} disabled={busy}>{saving ? <Loader2 size={13} className="fpm-spin" /> : <Save size={13} />} حفظ مسودة</button>
            <div className="fpm-footer__right">
              <button type="button" className="fpm-btn fpm-btn--ghost" onClick={handlePreview} disabled={busy}>{previewing ? <Loader2 size={13} className="fpm-spin" /> : <Eye size={13} />} معاينة PDF</button>
              <button type="button" className="fpm-btn fpm-btn--primary" onClick={handleSend} disabled={busy}>{sending ? <Loader2 size={13} className="fpm-spin" /> : <Send size={13} />} {sending ? 'جارٍ الإرسال…' : 'إرسال للعميل'}</button>
            </div>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
