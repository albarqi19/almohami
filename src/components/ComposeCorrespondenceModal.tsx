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
  ZoomIn, ZoomOut, Scan, FilePlus,
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
import { useAuth } from '../contexts/AuthContext';
import type { Letterhead } from '../types/letterhead';

interface ClientOption { id: number; name: string; phone?: string | null; email?: string | null }

/** أبعاد A4 عند 96dpi (210×297مم) — نفس المرجع الذي يُولَّد به الـPDF. */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const mmToPxN = (v: number) => Math.round(v * 3.7795);
const mmToPx = (v: number) => `${mmToPxN(v)}px`;

interface ComposeCorrespondenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssued?: () => void;
  /** ربط مسبق بقضية (اختياري). */
  caseId?: number;
  /** مستلِم مسبق: عميل محدّد (من صفحة العميل مثلاً) — يضبط المستلِم وطريقة الإصدار تلقائياً. */
  presetClient?: { id: number; name: string; phone?: string | null; email?: string | null };
}

const ACCENT_SWATCHES = ['#1f3a5f', '#0f766e', '#7c2d12', '#4338ca', '#9d174d', '#374151'];

const ComposeCorrespondenceModal: React.FC<ComposeCorrespondenceModalProps> = ({ isOpen, onClose, onIssued, caseId, presetClient }) => {
  const { user: authUser } = useAuth();
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
  const [letterheads, setLetterheads] = useState<Letterhead[]>([]);
  const [clientResults, setClientResults] = useState<ClientOption[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientOpen, setClientOpen] = useState(false);

  // تكبير/تصغير ورقة الكتابة (0.5–2)
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;
  const editorColRef = useRef<HTMLElement>(null);

  // ترقيم الصفحات: عدد الأوراق وحدودها + مضيف شريط الأدوات الثابت
  const pageRef = useRef<HTMLDivElement>(null);
  const pageInnerRef = useRef<HTMLDivElement>(null);
  // عوّامات القفز: تدفع أسطر النص فوق فجوات الحدود فيتدفق فعلياً من صفحة لصفحة
  const flowBreaksRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageGaps, setPageGaps] = useState<{ top: number; height: number }[]>([]);
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);

  // الحالة
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
  // مؤقّت الحفظ التلقائي يستدعي أحدث نسخة عبر ref — closure المؤقّت لا يرى حالة الحقول الحالية.
  const ensureSavedRef = useRef<() => Promise<number | null>>(() => Promise.resolve(null));
  // معرّف المسودة كـ ref (لا state) كي تراه استدعاءات الحفظ المتزامنة فوراً فلا تُنشأ مسودة ثانية.
  const savedIdRef = useRef<number | null>(null);
  const savePromiseRef = useRef<Promise<number | null> | null>(null);
  const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMethod = DELIVERY_METHODS.find((m) => m.value === deliveryMethod)!;

  // ── تهيئة عند الفتح ──
  useEffect(() => {
    if (!isOpen) return;
    resetAll();
    // مستلِم مسبق (فُتح من صفحة العميل): عميل محدّد + طريقة إصدار بحسب قنواته المتاحة.
    if (presetClient) {
      setRecipientType('client');
      setClientId(presetClient.id);
      setClientLabel(presetClient.name);
      setRecipientPhone(presetClient.phone || '');
      setRecipientEmail(presetClient.email || '');
      setDeliveryMethod(presetClient.phone ? 'whatsapp' : (presetClient.email ? 'email' : 'print'));
    }
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); }, []);

  const resetAll = () => {
    setDocumentType('letter'); setTitle(''); setBody(''); setLetterheadId(''); setTemplateId('');
    setAccentColor(''); setRecipientType('external'); setClientId(''); setClientLabel('');
    setRecipientName(''); setRecipientPhone(''); setRecipientEmail(''); setDeliveryMethod('print');
    setAttachments([]); setLastSaved(null); setTextAnnotations([]);
    setEditorKey((k) => k + 1); dirtyRef.current = false; savedIdRef.current = null;
  };

  const bootstrap = async () => {
    try {
      const [tplRes, lhRes] = await Promise.all([
        outgoingLetterService.templates.list().catch(() => ({ data: [] as OutgoingLetterTemplate[] })),
        LetterheadService.getAll({ is_active: true }).catch(() => ({ data: [] as any[] })),
      ]);
      const tpls = (tplRes as any).data ?? [];
      setTemplates(tpls);
      const lhs = (((lhRes as any).data ?? []) as Letterhead[]);
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

  // ── التكبير/التصغير ──
  const applyZoom = useCallback((z: number) => {
    const v = Math.min(2, Math.max(0.5, Math.round(z * 20) / 20));
    setZoom(v);
    try { localStorage.setItem('clc_zoom', String(v)); } catch { /* تخزين اختياري */ }
  }, []);
  const zoomBy = (d: number) => applyZoom(zoomRef.current + d);
  const fitWidth = useCallback(() => {
    const w = editorColRef.current?.clientWidth ?? 900;
    applyZoom((w - 64) / A4_WIDTH_PX);
  }, [applyZoom]);

  // عند الفتح: آخر تكبير محفوظ، وإلا ملاءمة العرض ضمن حدود مريحة
  useEffect(() => {
    if (!isOpen) return;
    const saved = parseFloat(localStorage.getItem('clc_zoom') || '');
    if (Number.isFinite(saved) && saved >= 0.5 && saved <= 2) { setZoom(saved); return; }
    const w = editorColRef.current?.clientWidth ?? 900;
    applyZoom(Math.min(1.4, Math.max(0.75, (w - 64) / A4_WIDTH_PX)));
  }, [isOpen, applyZoom]);

  // Ctrl + عجلة الفأرة = تكبير/تصغير (مثل Word) — مستمع غير سلبي ليمكن منع تكبير المتصفح
  useEffect(() => {
    const el = editorColRef.current;
    if (!el || !isOpen) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      applyZoom(zoomRef.current + (e.deltaY < 0 ? 0.05 : -0.05));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen, applyZoom]);

  // ── الكليشة الحيّة على الورقة ──
  const selectedLetterhead = useMemo<Letterhead | null>(() => {
    if (letterheadId !== '') return letterheads.find((l) => l.id === letterheadId) ?? null;
    return letterheads.find((l) => l.is_default) ?? letterheads[0] ?? null;
  }, [letterheads, letterheadId]);

  const officeName = (authUser as any)?.tenant?.name || (authUser as any)?.tenant_name || '';
  // نفس أولوية الـPDF: لون الخطاب ← لون الكليشة ← كحلي النظام
  const pageAccent = accentColor || selectedLetterhead?.primary_color || '#1f3a5f';
  const isImageLetterhead = selectedLetterhead?.type === 'image' && !!selectedLetterhead.header_image_url;

  // مساحتا الترويسة/التذييل لكل صفحة (مرآة هوامش mPDF: صورة = ارتفاعها+3مم، ديناميكي = 30/26مم)
  const headerAreaPx = isImageLetterhead
    ? mmToPxN((selectedLetterhead?.header_height_mm || 30) + 3)
    : mmToPxN(30);
  const footerAreaPx = selectedLetterhead?.type === 'image' && selectedLetterhead.footer_image_url
    ? mmToPxN((selectedLetterhead.footer_height_mm || 25) + 3)
    : mmToPxN(26);

  // قياس الصفحات: يمدّد كل «فاصل صفحة» يدوي حتى بداية الصفحة التالية (بعد ترويستها)،
  // ويحسب عدد الأوراق وحدودها ليرسم أشرطة «نهاية الصفحة» مراعياً مساحة التذييل.
  useEffect(() => {
    if (!isOpen) return;
    const page = pageRef.current;
    const inner = pageInnerRef.current;
    if (!page || !inner) return;

    let raf = 0;
    const BREAK_NET_H = 28; // ارتفاع الفاصل اليدوي «الصافي» قبل تمديده
    const measure = () => {
      raf = 0;
      const z = zoomRef.current || 1;
      const host = flowBreaksRef.current;
      const gapH = footerAreaPx + headerAreaPx;

      // 1) قياس «صافٍ»: عطّل العوّامات وصفّر الفواصل ثم اقرأ التدفق الخام — كل النتائج
      //    دوالّ حتمية للمحتوى وحده، فلا «هيستيريسيس» (عوّامة تدفع نصاً فتبرر بقاء نفسها).
      const breaks = Array.from(page.querySelectorAll<HTMLElement>('.ProseMirror hr.page-break'));
      if (host) host.style.display = 'none';
      breaks.forEach((el) => { el.style.height = `${BREAK_NET_H}px`; });

      const pageRect = page.getBoundingClientRect();
      const hostTop = host ? (host.getBoundingClientRect().top - pageRect.top) / z : 0;
      const netBreakTops = breaks.map((el) => (el.getBoundingClientRect().top - pageRect.top) / z);
      const netBottom = (inner.getBoundingClientRect().bottom - pageRect.top) / z;

      // 2) محاكاة: افرد التدفق الصافي على صفحات A4 (نهاية نص الصفحة n عند n·P−تذييل،
      //    وبداية التالية عند n·P+ترويسة) وأدرج قفزات الفواصل اليدوية.
      let shift = 0;
      let boundary = 1;
      const effOf = (netY: number): number => {
        let eff = netY + shift;
        while (eff > boundary * A4_HEIGHT_PX - footerAreaPx) {
          shift += gapH; eff += gapH; boundary += 1;
        }
        return eff;
      };
      const breakHeights = netBreakTops.map((netY) => {
        const eff = effOf(netY);
        const target = boundary * A4_HEIGHT_PX + headerAreaPx;
        const h = Math.max(BREAK_NET_H, Math.round(target - eff));
        shift += h - BREAK_NET_H;
        boundary += 1;
        return h;
      });
      const endEff = effOf(netBottom) + footerAreaPx;
      const pages = Math.min(40, Math.max(1, Math.ceil(endEff / A4_HEIGHT_PX)));

      // 3) طبّق النتائج (idempotent — لا يتغير DOM إن لم تتغير القيم)
      breaks.forEach((el, i) => {
        const h = `${breakHeights[i]}px`;
        if (el.style.height !== h) el.style.height = h;
      });
      setPageCount((p) => (p === pages ? p : pages));
      const gaps: { top: number; height: number }[] = [];
      for (let n = 1; n < pages; n++) {
        gaps.push({ top: n * A4_HEIGHT_PX - footerAreaPx, height: gapH });
      }
      setPageGaps((prev) => (JSON.stringify(prev) === JSON.stringify(gaps) ? prev : gaps));

      // 4) عوّامات القفز: float بعرض كامل عند كل فجوة — أسطر المحرّر تلتف تحتها،
      //    فالنص البالغ حدّ التذييل ينزل مباشرة تحت رأس الكليشة في الصفحة التالية.
      if (host) {
        host.style.display = '';
        const usable = gaps.filter((g) => g.top > hostTop + 4);
        const sig = usable.map((g) => `${Math.round(g.top - hostTop)}:${Math.round(g.height)}`).join('|');
        if (host.dataset.sig !== sig) {
          host.dataset.sig = sig;
          host.textContent = '';
          let cursor = hostTop;
          usable.forEach((g) => {
            const d = document.createElement('div');
            d.style.cssText = `float:right;clear:both;width:100%;height:${Math.round(g.height)}px;`
              + `margin-top:${Math.max(0, Math.round(g.top - cursor))}px;`;
            cursor = g.top + g.height;
            host.appendChild(d);
          });
        }
      }
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(inner);
    ro.observe(page); // تحميل صور الكليشة يغيّر ارتفاع الترويسة بعد القياس الأول
    const pm = page.querySelector('.ProseMirror');
    if (pm) ro.observe(pm);
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
    // editorKey: يعاد الربط عند إعادة إنشاء المحرّر (تطبيق قالب)
  }, [isOpen, headerAreaPx, footerAreaPx, editorKey]);

  const pageDates = useMemo(() => {
    const now = new Date();
    let hijri = '';
    try {
      hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(now) + 'هـ';
    } catch { /* متصفح بلا تقويم هجري — يكفي الميلادي */ }
    const greg = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return { hijri, greg };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const renderLetterheadHeader = () => {
    const lh = selectedLetterhead;
    if (lh?.type === 'image' && lh.header_image_url) {
      return <img className="clc-page__lhimg" src={lh.header_image_url} alt="" style={{ height: mmToPx(lh.header_height_mm || 30) }} />;
    }
    const name = lh?.company_name || officeName || 'مكتب المحاماة';
    return (
      <div className="clc-page__dh" style={{ borderBottomColor: lh?.border_color || pageAccent }}>
        {lh?.logo_url && <img src={lh.logo_url} alt="" style={{ width: lh.logo_width_px || 60 }} />}
        <div className="clc-page__dh-info">
          <div className="clc-page__dh-name" style={{ color: lh?.primary_color || pageAccent }}>{name}</div>
          {lh?.company_name_en && <div className="clc-page__dh-en">{lh.company_name_en}</div>}
        </div>
      </div>
    );
  };

  const renderLetterheadFooter = () => {
    const lh = selectedLetterhead;
    if (lh?.type === 'image' && lh.footer_image_url) {
      return <img className="clc-page__lhimg clc-page__lhimg--footer" src={lh.footer_image_url} alt="" style={{ height: mmToPx(lh.footer_height_mm || 25) }} />;
    }
    const contact = [lh?.footer_phone, lh?.footer_email, lh?.footer_website, lh?.footer_address].filter(Boolean).join(' | ');
    const line = [lh?.footer_text, contact].filter(Boolean).join(' — ')
      || `${officeName || 'مكتب المحاماة'} — صدر عبر نظام الرائد لإدارة المحاماة`;
    return <div className="clc-page__df">{line}</div>;
  };

  const renderWatermark = () => {
    const lh = selectedLetterhead;
    if (!lh?.watermark_enabled) return null;
    const rot = lh.watermark_rotation ?? -45;
    const opacity = Math.min(0.5, Math.max(0.02, (lh.watermark_opacity || 8) / 100));
    if (lh.watermark_type === 'image' && lh.watermark_image_url) {
      return (
        <div className="clc-page__wm" aria-hidden>
          <img src={lh.watermark_image_url} alt="" style={{ opacity, transform: `rotate(${rot}deg)` }} />
        </div>
      );
    }
    const text = lh.watermark_text || lh.company_name || '';
    if (!text) return null;
    const style: React.CSSProperties = {
      opacity, color: lh.watermark_text_color || '#000',
      fontSize: lh.watermark_font_size || 48,
      transform: `rotate(${rot}deg) scale(${(lh.watermark_size || 100) / 100})`,
    };
    if (lh.watermark_position === 'repeat') {
      return (
        <div className="clc-page__wm clc-page__wm--repeat" aria-hidden style={{ gap: lh.watermark_repeat_gap || 100 }}>
          {Array.from({ length: 12 }).map((_, i) => <span key={i} style={style}>{text}</span>)}
        </div>
      );
    }
    const pos = lh.watermark_position === 'top' ? 'clc-page__wm--top' : lh.watermark_position === 'bottom' ? 'clc-page__wm--bottom' : '';
    return <div className={`clc-page__wm ${pos}`} aria-hidden><span style={style}>{text}</span></div>;
  };

  // ── الحفظ التلقائي ──
  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { void ensureSavedRef.current(); }, 1500);
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

  /** يحفظ المسودة (إنشاء أو تحديث) ويعيد المعرّف — الاستدعاءات المتزامنة تصطف خلف بعضها كي لا تُنشأ مسودتان. */
  const ensureSaved = async (): Promise<number | null> => {
    if (savePromiseRef.current) await savePromiseRef.current.catch(() => null);
    const run = (async () => {
      setSaving(true);
      try {
        const payload = buildPayload();
        if (savedIdRef.current) {
          await outgoingLetterService.update(savedIdRef.current, payload);
        } else {
          const res = await outgoingLetterService.create(payload);
          savedIdRef.current = res.data.id;
        }
        setLastSaved(new Date());
        dirtyRef.current = false;
        return savedIdRef.current;
      } catch (e: any) {
        toast.error(e?.message || 'تعذّر حفظ المسودة');
        return null;
      } finally {
        setSaving(false);
      }
    })();
    savePromiseRef.current = run;
    try {
      return await run;
    } finally {
      if (savePromiseRef.current === run) savePromiseRef.current = null;
    }
  };
  ensureSavedRef.current = ensureSaved;

  // يحفظ أحدث الحقول دائماً قبل المعاينة/الإصدار (لا يكتفي بفحص dirtyRef —
  // صمام أمان كي لا يُرسَل ما حفظه مؤقّت تلقائي أقدم) ويعيد المعرّف.
  const getOrCreateId = async (): Promise<number | null> => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    return ensureSaved();
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
    if (selectedMethod.needsPhone && !recipientPhone.trim()) return 'الإرسال عبر الواتساب يتطلّب رقم جوال — أدخِله أو اختر «طباعة دون إرسال»';
    if (selectedMethod.needsEmail && !recipientEmail.trim()) return 'الإرسال عبر الإيميل يتطلّب بريداً إلكترونياً — أدخِله أو اختر «طباعة دون إرسال»';
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
      <div className="clc-modal" style={{ ['--clc-accent' as any]: pageAccent }}>
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
          {/* المحرّر — ورقة A4 حقيقية بالكليشة على «منضدة» رمادية، مع تكبير/تصغير */}
          <main className="clc-editor-col" ref={editorColRef}>
            {/* شريط الأدوات: «مسطرة» ثابتة أعلى المنضدة خارج الورقة — لا يتأثر بالتكبير */}
            <div className="clc-ribbon">
              <div className="clc-ribbon__tools" ref={setToolbarHost} />
              <button
                className="clc-ribbon__break"
                onClick={() => editorRef.current?.insertPageBreak?.()}
                title="إدراج فاصل صفحة عند موضع المؤشر — يقفز النص لصفحة جديدة (وفي الملف المطبوع أيضاً)"
              >
                <FilePlus size={14} /> صفحة جديدة
              </button>
            </div>
            <div className="clc-desk">
              <div
                className="clc-page"
                ref={pageRef}
                style={{ ['--clc-zoom' as any]: zoom, minHeight: pageCount * A4_HEIGHT_PX }}
              >
                {renderWatermark()}
                {/* أشرطة حدود الصفحات: تذييل الصفحة + ترويسة التالية (بكليشة الصورة تُعرض صورتاهما) */}
                {pageGaps.map((g, i) => (
                  <div key={i} className="clc-page__gap" style={{ top: g.top, height: g.height }} aria-hidden>
                    {isImageLetterhead && selectedLetterhead?.footer_image_url && (
                      <img className="clc-page__gap-img" src={selectedLetterhead.footer_image_url} alt=""
                        style={{ height: mmToPx((selectedLetterhead.footer_height_mm || 25)) }} />
                    )}
                    <span>نهاية الصفحة {i + 1}</span>
                    {isImageLetterhead && selectedLetterhead?.header_image_url && (
                      <img className="clc-page__gap-img clc-page__gap-img--next" src={selectedLetterhead.header_image_url} alt=""
                        style={{ height: mmToPx((selectedLetterhead.header_height_mm || 30)) }} />
                    )}
                  </div>
                ))}
                {renderLetterheadHeader()}
                <div ref={pageInnerRef} className={`clc-page__inner ${isImageLetterhead ? 'clc-page__inner--imglh' : ''}`}>
                  <div className="clc-page__meta">
                    <span>صادر رقم: <b>يُخصَّص عند الإصدار</b></span>
                    <span className="clc-page__meta-dates">
                      {pageDates.hijri && <>{pageDates.hijri}<br /></>}
                      <i>الموافق {pageDates.greg}م</i>
                    </span>
                  </div>
                  <div className="clc-page__typebar">{LETTER_DOC_TYPES.find((d) => d.value === documentType)?.label ?? 'خطاب'}</div>
                  {recipientDisplay !== '—' && (
                    <div className="clc-page__addr"><b>إلى:</b> {recipientDisplay}</div>
                  )}
                  <label className="clc-page__subject">
                    <span>الموضوع:</span>
                    <input
                      placeholder="اكتب موضوع الصادر…"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                    />
                  </label>
                  <div className="clc-editor-wrap">
                    <div ref={flowBreaksRef} className="clc-flow-breaks" aria-hidden />
                    <TiptapEditor
                      key={editorKey}
                      ref={editorRef}
                      content={body}
                      onChange={(v) => { setBody(v); markDirty(); }}
                      placeholder="اكتب نص الخطاب هنا… (تدعم الضبط من الجانبين والألوان والجداول وأدوات الذكاء بالأعلى)"
                      minHeight="360px"
                      autoFocus
                      textAnnotations={textAnnotations}
                      onApplyAnnotation={(id) => setTextAnnotations((prev) => prev.filter((a) => a.id !== id))}
                      toolbarPortalEl={toolbarHost}
                    />
                  </div>
                  {attachments.length > 0 && (
                    <div className="clc-page__att">
                      <div className="clc-page__att-h">المرفقات (مُرفقة بهذا المستند):</div>
                      <ol>
                        {attachments.map((a, i) => <li key={i}>{(a.label ?? '').trim() || a.file.name}</li>)}
                      </ol>
                    </div>
                  )}
                  <div className="clc-page__num">(يُخصَّص رقم الصادر والباركود عند الإصدار)</div>
                </div>
                {renderLetterheadFooter()}
              </div>
            </div>
            <div className="clc-zoomdock">
              <div className="clc-zoomdock__pill">
                <button onClick={() => zoomBy(-0.1)} title="تصغير"><ZoomOut size={15} /></button>
                <button className="clc-zoomdock__pct" onClick={() => applyZoom(1)} title="الحجم الفعلي (100%)">{Math.round(zoom * 100)}%</button>
                <button onClick={() => zoomBy(0.1)} title="تكبير"><ZoomIn size={15} /></button>
                <span className="clc-zoomdock__sep" />
                <button onClick={fitWidth} title="ملاءمة عرض الشاشة"><Scan size={15} /> ملاءمة</button>
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
