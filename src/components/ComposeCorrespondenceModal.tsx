/**
 * ComposeCorrespondenceModal — منشئ «صادر جديد» (خطاب/إنذار/إشعار/مذكرة/مستند عام).
 *
 * محرّر Tiptap غنيّ (ضبط من الجانبين + كل أدوات التخصيص) مدعوم بأدوات الذكاء (نفس المذكرات)،
 * + اختيار الكليشة (الافتراضية مسبقاً) + القالب + المُرسَل إليه (عميل/جهة خارجية) + طريقة الإصدار
 * (واتساب/إيميل/طباعة دون إرسال) + مرفقات تُدمج في الملف (بلا تخزين) + معاينة قبل الإصدار.
 *
 * تصميم ERP: محرّر رئيسي يسار + لوحة حقول مدمجة يمين، مع ملخّص «ما سيظهر في المستند».
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Save, Send, Eye, Printer, Paperclip, Loader2, FileText, Trash2,
  User as UserIcon, Building2, Info, Check, Cloud, CloudOff, Palette,
} from 'lucide-react';
import { toast } from 'react-toastify';
import TiptapEditor, { type TiptapEditorRef } from './TiptapEditor';
import LegalAIToolbarButton from './LegalAIToolbarButton';
import type { TextAnnotation } from '../types/textAnnotations';
import {
  outgoingLetterService, LETTER_DOC_TYPES, DELIVERY_METHODS,
  type OutgoingLetterTemplate, type DeliveryMethod, type RecipientType, type LetterAttachment,
} from '../services/outgoingLetterService';
import { LetterheadService } from '../services/letterheadService';
import { ClientManagementService } from '../services/clientManagementService';

interface LetterheadOption { id: number; name: string; is_default?: boolean }
interface ClientOption { id: number; name: string; phone?: string | null; email?: string | null }

interface ComposeCorrespondenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssued?: () => void;
  /** ربط مسبق بقضية (اختياري). */
  caseId?: number;
}

const ACCENT_SWATCHES = ['#1f3a5f', '#0f766e', '#7c2d12', '#4338ca', '#9d174d', '#374151'];

const ComposeCorrespondenceModal: React.FC<ComposeCorrespondenceModalProps> = ({ isOpen, onClose, onIssued, caseId }) => {
  // الحقول
  const [documentType, setDocumentType] = useState('letter');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [letterheadId, setLetterheadId] = useState<number | ''>('');
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [accentColor, setAccentColor] = useState<string>('');
  const [recipientType, setRecipientType] = useState<RecipientType>('external');
  const [clientId, setClientId] = useState<number | ''>('');
  const [clientLabel, setClientLabel] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('print');
  const [attachments, setAttachments] = useState<LetterAttachment[]>([]);

  // بيانات مرجعية
  const [templates, setTemplates] = useState<OutgoingLetterTemplate[]>([]);
  const [letterheads, setLetterheads] = useState<LetterheadOption[]>([]);
  const [clientResults, setClientResults] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientOpen, setClientOpen] = useState(false);

  // الحالة
  const [savedId, setSavedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [editorKey, setEditorKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const editorRef = useRef<TiptapEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMethod = DELIVERY_METHODS.find((m) => m.value === deliveryMethod)!;

  // ── تهيئة عند الفتح ──
  useEffect(() => {
    if (!isOpen) return;
    resetAll();
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); }, []);

  const resetAll = () => {
    setDocumentType('letter'); setTitle(''); setBody(''); setLetterheadId(''); setTemplateId('');
    setAccentColor(''); setRecipientType('external'); setClientId(''); setClientLabel('');
    setRecipientName(''); setRecipientPhone(''); setRecipientEmail(''); setDeliveryMethod('print');
    setAttachments([]); setSavedId(null); setLastSaved(null); setTextAnnotations([]);
    setEditorKey((k) => k + 1); dirtyRef.current = false;
  };

  const bootstrap = async () => {
    try {
      const [tplRes, lhRes] = await Promise.all([
        outgoingLetterService.templates.list().catch(() => ({ data: [] as OutgoingLetterTemplate[] })),
        LetterheadService.getAll({ is_active: true }).catch(() => ({ data: [] as any[] })),
      ]);
      const tpls = (tplRes as any).data ?? [];
      setTemplates(tpls);
      const lhs: LetterheadOption[] = ((lhRes as any).data ?? []).map((l: any) => ({ id: l.id, name: l.name, is_default: l.is_default }));
      setLetterheads(lhs);

      const defaultLh = lhs.find((l) => l.is_default) ?? lhs[0];
      if (defaultLh) setLetterheadId(defaultLh.id);

      // طبّق القالب الافتراضي إن وُجد (يملأ العنوان/الجسم/الكليشة) — يبقى الافتراضي افتراضياً.
      // صامت: لا ننشئ مسودة تلقائياً بمجرّد الفتح قبل تفاعل المستخدم.
      const defaultTpl = tpls.find((t: OutgoingLetterTemplate) => t.is_default) ?? tpls[0];
      if (defaultTpl) applyTemplate(defaultTpl, defaultLh?.id, true);
    } catch {
      /* تجاهل — المحرّر يعمل فارغاً */
    }
  };

  const applyTemplate = (t: OutgoingLetterTemplate, fallbackLh?: number, silent = false) => {
    setTemplateId(t.id);
    setDocumentType(t.document_type || 'letter');
    setTitle(t.title || '');
    setBody(t.body || '');
    if (t.letterhead_id) setLetterheadId(t.letterhead_id);
    else if (fallbackLh) setLetterheadId(fallbackLh);
    if (t.accent_color) setAccentColor(t.accent_color);
    setEditorKey((k) => k + 1);
    if (!silent) markDirty();
  };

  const onTemplateSelect = (id: number | '') => {
    setTemplateId(id);
    if (id === '') return;
    const t = templates.find((x) => x.id === id);
    if (t) applyTemplate(t);
  };

  // ── البحث عن العملاء ──
  useEffect(() => {
    if (recipientType !== 'client') return;
    if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
    clientSearchTimer.current = setTimeout(async () => {
      try {
        const res: any = await ClientManagementService.getClients({ search: clientSearch || undefined, per_page: 20 } as any);
        const rows: any[] = res?.data ?? res ?? [];
        setClientResults(rows.map((c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email })));
      } catch { setClientResults([]); }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSearch, recipientType]);

  const pickClient = (c: ClientOption) => {
    setClientId(c.id);
    setClientLabel(c.name);
    setRecipientPhone(c.phone || '');
    setRecipientEmail(c.email || '');
    setClientOpen(false);
    markDirty();
  };

  // ── الحفظ التلقائي ──
  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { void ensureSaved(); }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildPayload = () => ({
    document_type: documentType,
    title: title.trim() || 'صادر بلا عنوان',
    body: editorRef.current?.getHTML?.() ?? body,
    letterhead_id: letterheadId === '' ? null : Number(letterheadId),
    template_id: templateId === '' ? null : Number(templateId),
    case_id: caseId ?? null,
    client_id: recipientType === 'client' && clientId !== '' ? Number(clientId) : null,
    accent_color: accentColor || null,
    recipient_type: recipientType,
    recipient_name: recipientType === 'client' ? (clientLabel || null) : (recipientName.trim() || null),
    recipient_phone: recipientPhone.trim() || null,
    recipient_email: recipientEmail.trim() || null,
    delivery_method: deliveryMethod,
  });

  /** يحفظ المسودة (إنشاء أو تحديث) ويعيد المعرّف. */
  const ensureSaved = async (): Promise<number | null> => {
    if (saving) return savedId;
    setSaving(true);
    try {
      const payload = buildPayload();
      if (savedId) {
        await outgoingLetterService.update(savedId, payload);
      } else {
        const res = await outgoingLetterService.create(payload);
        setSavedId(res.data.id);
      }
      setLastSaved(new Date());
      dirtyRef.current = false;
      return savedId ?? null;
    } catch (e: any) {
      toast.error(e?.message || 'تعذّر حفظ المسودة');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // ضمان وجود معرّف محفوظ (للمعاينة/الإصدار) حتى لو لم ينته الحفظ التلقائي
  const getOrCreateId = async (): Promise<number | null> => {
    if (savedId && !dirtyRef.current) return savedId;
    setSaving(true);
    try {
      const payload = buildPayload();
      if (savedId) {
        await outgoingLetterService.update(savedId, payload);
        setLastSaved(new Date()); dirtyRef.current = false;
        return savedId;
      }
      const res = await outgoingLetterService.create(payload);
      setSavedId(res.data.id); setLastSaved(new Date()); dirtyRef.current = false;
      return res.data.id;
    } catch (e: any) {
      toast.error(e?.message || 'تعذّر حفظ المسودة');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const closePreview = () => {
    setPreviewUrl((url) => { if (url) URL.revokeObjectURL(url); return null; });
  };

  const handlePreview = async () => {
    if (!title.trim()) { toast.warn('أدخل عنوان المستند أولاً'); return; }
    setPreviewing(true);
    try {
      const id = await getOrCreateId();
      if (!id) return;
      const url = await outgoingLetterService.previewBlobUrl(id, attachments);
      setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
    } catch (e: any) {
      toast.error(e?.message || 'تعذّر فتح المعاينة');
    } finally {
      setPreviewing(false);
    }
  };

  // تحرير رابط blob عند الإغلاق/التفكيك
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  // إغلاق المعاينة بمفتاح Escape
  useEffect(() => {
    if (!previewUrl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePreview(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  const validateForIssue = (): string | null => {
    if (!title.trim()) return 'أدخل عنوان المستند';
    if (recipientType === 'client' && !clientId) return 'اختر العميل المُرسَل إليه';
    if (recipientType === 'external' && !recipientName.trim()) return 'أدخل اسم الجهة المُرسَل إليها';
    if (selectedMethod.needsPhone && !recipientPhone.trim()) return 'طريقة الإرسال تتطلّب رقم جوال';
    if (selectedMethod.needsEmail && !recipientEmail.trim()) return 'طريقة الإرسال تتطلّب بريداً إلكترونياً';
    return null;
  };

  const handleIssue = async () => {
    const err = validateForIssue();
    if (err) { toast.warn(err); return; }
    const isPrint = deliveryMethod === 'print';
    const confirmMsg = isPrint
      ? 'سيُسجَّل المستند صادراً مرقّماً للطباعة دون إرسال. متابعة؟'
      : `سيُرسَل المستند عبر ${selectedMethod.label} ويُسجَّل صادراً مرقّماً. متابعة؟`;
    if (!window.confirm(confirmMsg)) return;

    setIssuing(true);
    try {
      const id = await getOrCreateId();
      if (!id) return;
      const res = await outgoingLetterService.send(id, deliveryMethod, attachments);
      if (res.success) {
        toast.success(`${isPrint ? 'صدر للطباعة' : 'تم الإرسال'} — رقم الصادر ${res.number ?? ''}`);
        onIssued?.();
        onClose();
      } else {
        toast.error(res.message || 'تعذّر الإصدار');
      }
    } catch (e: any) {
      toast.error(e?.message || 'تعذّر الإصدار');
    } finally {
      setIssuing(false);
    }
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) { setAttachments((prev) => [...prev, ...files.map((file) => ({ file, label: '' }))]); markDirty(); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeFile = (i: number) => setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  const setLabel = (i: number, label: string) => setAttachments((prev) => prev.map((a, idx) => idx === i ? { ...a, label } : a));

  const recipientDisplay = recipientType === 'client' ? (clientLabel || '—') : (recipientName || '—');
  const busy = saving || issuing || previewing;

  const fmtTime = (d: Date | null) => d ? d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '';

  if (!isOpen) return null;

  return (
    <div className="clc-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="clc-modal" style={{ ['--clc-accent' as any]: accentColor || '#1f3a5f' }}>
        {/* ── الرأس ── */}
        <header className="clc-header">
          <div className="clc-header__right">
            <button className="clc-iconbtn" onClick={onClose} title="إغلاق"><X size={18} /></button>
            <div className="clc-title">
              <FileText size={17} />
              <span>إنشاء صادر جديد</span>
            </div>
            <div className="clc-save-state">
              {saving ? <><Loader2 size={13} className="clc-spin" /> جارٍ الحفظ…</>
                : lastSaved ? <><Cloud size={13} /> حُفظ {fmtTime(lastSaved)}</>
                : <><CloudOff size={13} /> غير محفوظ</>}
            </div>
          </div>
          <div className="clc-header__left">
            <LegalAIToolbarButton
              onSelectText={() => {
                const s = window.getSelection();
                return s && s.toString().trim() ? s.toString().trim() : null;
              }}
              onGetAllText={() => editorRef.current?.getAllText?.() || null}
              onReplaceText={(t) => editorRef.current?.replaceSelectedText?.(t)}
              onReplaceAllText={(t) => editorRef.current?.replaceAllText?.(t)}
              onSetTextAnnotations={(a) => setTextAnnotations(a)}
              source="memo"
              memoType={documentType}
            />
            <button className="clc-btn clc-btn--ghost" onClick={handlePreview} disabled={busy}>
              {previewing ? <Loader2 size={15} className="clc-spin" /> : <Eye size={15} />} معاينة
            </button>
            <button className="clc-btn clc-btn--ghost" onClick={() => void ensureSaved()} disabled={busy}>
              <Save size={15} /> حفظ
            </button>
            <button className="clc-btn clc-btn--primary" onClick={handleIssue} disabled={busy}>
              {issuing ? <Loader2 size={15} className="clc-spin" />
                : deliveryMethod === 'print' ? <Printer size={15} /> : <Send size={15} />}
              {deliveryMethod === 'print' ? 'إصدار للطباعة' : 'إصدار وإرسال'}
            </button>
          </div>
        </header>

        {/* ── الجسم ── */}
        <div className="clc-body">
          {/* المحرّر — ورقة بعرض A4 متمركزة على لوحة رمادية */}
          <main className="clc-editor-col">
            <div className="clc-sheet">
              <input
                className="clc-title-input"
                placeholder="عنوان الصادر (الموضوع)…"
                value={title}
                onChange={(e) => { setTitle(e.target.value); markDirty(); }}
              />
              <div className="clc-editor-wrap">
                <TiptapEditor
                  key={editorKey}
                  ref={editorRef}
                  content={body}
                  onChange={(v) => { setBody(v); markDirty(); }}
                  placeholder="اكتب نص الخطاب هنا… (تدعم الضبط من الجانبين والألوان والجداول وأدوات الذكاء بالأعلى)"
                  minHeight="calc(100vh - 260px)"
                  autoFocus
                  textAnnotations={textAnnotations}
                  onApplyAnnotation={(id) => setTextAnnotations((prev) => prev.filter((a) => a.id !== id))}
                />
              </div>
            </div>
          </main>

          {/* لوحة الحقول */}
          <aside className="clc-side">
            {/* نوع المستند + القالب */}
            <section className="clc-card">
              <div className="clc-card__h"><FileText size={14} /> نوع المستند والقالب</div>
              <label className="clc-field">
                <span>نوع المستند</span>
                <select value={documentType} onChange={(e) => { setDocumentType(e.target.value); markDirty(); }}>
                  {LETTER_DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </label>
              <label className="clc-field">
                <span>قالب جاهز</span>
                <select value={templateId} onChange={(e) => onTemplateSelect(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">— بدون قالب —</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_default ? ' (افتراضي)' : ''}</option>)}
                </select>
              </label>
            </section>

            {/* الكليشة + اللون */}
            <section className="clc-card">
              <div className="clc-card__h"><Palette size={14} /> الكليشة والتخصيص</div>
              <label className="clc-field">
                <span>الكليشة</span>
                <select value={letterheadId} onChange={(e) => { setLetterheadId(e.target.value === '' ? '' : Number(e.target.value)); markDirty(); }}>
                  <option value="">— الافتراضية —</option>
                  {letterheads.map((l) => <option key={l.id} value={l.id}>{l.name}{l.is_default ? ' (افتراضية)' : ''}</option>)}
                </select>
              </label>
              <div className="clc-field">
                <span>لون التمييز</span>
                <div className="clc-swatches">
                  {ACCENT_SWATCHES.map((c) => (
                    <button key={c} type="button"
                      className={`clc-swatch ${accentColor === c ? 'is-on' : ''}`}
                      style={{ background: c }} title={c}
                      onClick={() => { setAccentColor(c); markDirty(); }} />
                  ))}
                  <button type="button" className={`clc-swatch clc-swatch--none ${!accentColor ? 'is-on' : ''}`}
                    title="افتراضي الكليشة" onClick={() => { setAccentColor(''); markDirty(); }}>∅</button>
                </div>
              </div>
            </section>

            {/* المُرسَل إليه */}
            <section className="clc-card">
              <div className="clc-card__h"><Send size={14} /> المُرسَل إليه</div>
              <div className="clc-seg">
                <button className={recipientType === 'client' ? 'is-on' : ''} onClick={() => { setRecipientType('client'); markDirty(); }}>
                  <UserIcon size={13} /> عميل
                </button>
                <button className={recipientType === 'external' ? 'is-on' : ''} onClick={() => { setRecipientType('external'); markDirty(); }}>
                  <Building2 size={13} /> جهة خارجية
                </button>
              </div>

              {recipientType === 'client' ? (
                <div className="clc-client">
                  {clientId && clientLabel ? (
                    <div className="clc-chip">
                      <UserIcon size={13} /> <span>{clientLabel}</span>
                      <button onClick={() => { setClientId(''); setClientLabel(''); setRecipientPhone(''); setRecipientEmail(''); }}><X size={12} /></button>
                    </div>
                  ) : (
                    <div className="clc-combo">
                      <input placeholder="ابحث عن عميل…" value={clientSearch}
                        onChange={(e) => { setClientSearch(e.target.value); setClientOpen(true); }}
                        onFocus={() => setClientOpen(true)} />
                      {clientOpen && clientResults.length > 0 && (
                        <ul className="clc-combo__list">
                          {clientResults.map((c) => (
                            <li key={c.id} onClick={() => pickClient(c)}>
                              <span>{c.name}</span>
                              <small>{c.phone || c.email || '—'}</small>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  <label className="clc-field"><span>جوال</span>
                    <input value={recipientPhone} onChange={(e) => { setRecipientPhone(e.target.value); markDirty(); }} placeholder="9665…" /></label>
                  <label className="clc-field"><span>إيميل</span>
                    <input value={recipientEmail} onChange={(e) => { setRecipientEmail(e.target.value); markDirty(); }} placeholder="name@example.com" /></label>
                </div>
              ) : (
                <>
                  <label className="clc-field"><span>الاسم / الجهة</span>
                    <input value={recipientName} onChange={(e) => { setRecipientName(e.target.value); markDirty(); }} placeholder="مثال: محكمة التنفيذ بالرياض" /></label>
                  <label className="clc-field"><span>جوال</span>
                    <input value={recipientPhone} onChange={(e) => { setRecipientPhone(e.target.value); markDirty(); }} placeholder="9665…" /></label>
                  <label className="clc-field"><span>إيميل</span>
                    <input value={recipientEmail} onChange={(e) => { setRecipientEmail(e.target.value); markDirty(); }} placeholder="name@example.com" /></label>
                </>
              )}
            </section>

            {/* طريقة الإصدار */}
            <section className="clc-card">
              <div className="clc-card__h"><Send size={14} /> طريقة الإصدار</div>
              <div className="clc-methods">
                {DELIVERY_METHODS.map((m) => (
                  <button key={m.value} className={`clc-method ${deliveryMethod === m.value ? 'is-on' : ''}`}
                    onClick={() => { setDeliveryMethod(m.value); markDirty(); }}>
                    {m.value === 'print' ? <Printer size={14} /> : <Send size={14} />}
                    <div>
                      <div className="clc-method__l">{m.label}</div>
                      <div className="clc-method__h">{m.hint}</div>
                    </div>
                    {deliveryMethod === m.value && <Check size={14} className="clc-method__ok" />}
                  </button>
                ))}
              </div>
            </section>

            {/* المرفقات */}
            <section className="clc-card">
              <div className="clc-card__h"><Paperclip size={14} /> المرفقات</div>
              <div className="clc-attnote">
                <Info size={13} />
                <span>اكتب وصفاً لكل مرفق (مثل «توكيل شرعي») ليظهر في فهرس المرفقات داخل المستند — أوضح من اسم الملف. ستُدمج الصور وملفات PDF كصفحات. محفوظة لهذه الجلسة فقط.</span>
              </div>
              <button className="clc-upload" onClick={() => fileInputRef.current?.click()}>
                <Paperclip size={14} /> إضافة مستندات (PDF / صور)
              </button>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" hidden onChange={onPickFiles} />
              {attachments.length > 0 && (
                <ul className="clc-files">
                  {attachments.map((a, i) => (
                    <li key={i} className="clc-file">
                      <input
                        className="clc-file__label"
                        value={a.label ?? ''}
                        onChange={(e) => setLabel(i, e.target.value)}
                        placeholder="وصف المرفق (مثال: صورة الحكم الابتدائي)…"
                      />
                      <div className="clc-file__meta">
                        <FileText size={12} />
                        <span className="clc-file__name" title={a.file.name}>{a.file.name}</span>
                        <small>{(a.file.size / 1024).toFixed(0)}KB</small>
                        <button onClick={() => removeFile(i)} title="حذف"><Trash2 size={12} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ملخّص ما سيظهر في المستند */}
            <section className="clc-card clc-summary">
              <div className="clc-card__h"><Eye size={14} /> ما سيظهر في المستند</div>
              <ul>
                <li><span>النوع</span><b>{LETTER_DOC_TYPES.find((d) => d.value === documentType)?.label}</b></li>
                <li><span>الموضوع</span><b>{title || '—'}</b></li>
                <li><span>المُرسَل إليه</span><b>{recipientDisplay}</b></li>
                <li><span>الكليشة</span><b>{letterheads.find((l) => l.id === letterheadId)?.name || 'الافتراضية'}</b></li>
                <li><span>المرفقات</span><b>{attachments.length ? `${attachments.length} ملف` : 'لا يوجد'}</b></li>
                <li><span>الإصدار</span><b>{selectedMethod.label}</b></li>
              </ul>
              <div className="clc-summary__note">يُسجَّل تلقائياً: من أرسل (أنت) ولِمن أُرسل + رقم صادر مرقّم.</div>
            </section>
          </aside>
        </div>

        {/* معاينة المستند داخل الصفحة — مودال مركزي بخلفية معتمة، إغلاق بالضغط خارجه */}
        {previewUrl && (
          <div className="clc-preview-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closePreview(); }}>
            <div className="clc-preview">
              <div className="clc-preview__bar">
                <span className="clc-preview__title"><Eye size={15} /> معاينة المستند</span>
                <span className="clc-preview__hint">اضغط خارج المستند للإغلاق ومتابعة التعديل</span>
                <button className="clc-iconbtn" onClick={closePreview} title="إغلاق المعاينة"><X size={18} /></button>
              </div>
              <iframe className="clc-preview__frame" src={previewUrl} title="معاينة المستند" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComposeCorrespondenceModal;
