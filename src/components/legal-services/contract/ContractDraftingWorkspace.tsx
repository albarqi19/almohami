import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  CloudOff,
  Download,
  Eye,
  EyeOff,
  FileCheck,
  FileText,
  FileWarning,
  GitCompare,
  History,
  Layers,
  Loader2,
  Lock,
  Maximize2,
  MessageSquare,
  Minimize2,
  Pencil,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import TiptapEditor, { type TiptapEditorRef } from '../../TiptapEditor';
import LegalRichText from '../LegalRichText';
import { Meter } from '../../charts/RaedCharts';
import { LegalServiceService } from '../../../services/legalServiceService';
import { getApiErrorMessage } from '../../../utils/apiError';
import { diffSummary, diffWords, stripHtml } from '../../../utils/legalDiff';
import type {
  ChecklistItem,
  ContractAuditFinding,
  ContractAuditResult,
  ContractDraftingVersion,
  LegalService,
} from '../../../types/legalServices';
import { CONTRACT_LANGUAGE_LABELS, CONTRACT_TYPE_LABELS } from '../../../types/legalServices';
import type { TextAnnotation } from '../../../types/textAnnotations';

/**
 * مساحة صياغة العقد — ورقة كتابة متصلة (كالمفكرة) بجوارها لوحات العقد.
 *
 * ما تغيّر عن التبويب القديم (بطاقات متراصّة):
 *  · العقد نفسه في الوسط وقابل للكتابة مباشرة — كان نصاً للقراءة، والكتابة في نموذجٍ
 *    مطويّ أسفل الصفحة يبدأ **فارغاً** في كل إصدار فلا سبيل لتعديل مسودةٍ إلا بنسخها يدوياً.
 *  · حفظ تلقائي في المسودة الجارية؛ «إصدار جديد» لقطةٌ مقصودة لا أثرٌ جانبيّ لكل حفظ.
 *  · ملاحظات التدقيق الآلي تظهر على الورقة نفسها ويُطبَّق المقترح بنقرة.
 */

interface ContractDraftingWorkspaceProps {
  service: LegalService;
  refreshService: () => Promise<void> | void;
  /** محتوى الخدمة مقفل (اعتماد/توقيع/إغلاق) — الورقة للقراءة فقط */
  locked: boolean;
  onEditDetails: () => void;
  onConvertToContract: () => void;
  convertingToContract: boolean;
  focusMode: boolean;
  onToggleFocus: () => void;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type AuditFindingExt = ContractAuditFinding & { unverified?: boolean };
type AuditResultExt = ContractAuditResult & { input_truncated?: boolean };

const AUTOSAVE_DELAY = 2000;
const SECTIONS_KEY = 'cdw_sections';

const VERSION_STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة',
  review: 'مراجعة',
  approved: 'معتمد',
  rejected: 'مرفوض',
};
const RISK_LABEL: Record<string, string> = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية' };
const CATEGORY_LABEL: Record<string, string> = {
  missing_clause: 'بند ناقص',
  risky_clause: 'بند خطر',
  non_compliant: 'مخالفة نظامية',
  ambiguous: 'غموض',
  unfair: 'إجحاف',
};

const isBlankHtml = (html: string) => stripHtml(html).trim() === '';

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatClock = (d: Date) => d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

/** تعليقات المراجعة تُخزَّن نصاً واحداً بصيغة `[2026-09-21 10:30 - الاسم]: التعليق` في كل سطر. */
const parseReviewComments = (raw: string | null | undefined) =>
  (raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^\[(.+?) - (.+?)\]:\s*(.*)$/);
      return m ? { key: i, when: m[1], who: m[2], text: m[3] } : { key: i, when: '', who: '', text: line };
    });

const readSections = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(SECTIONS_KEY) || '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
};

// ── لوحة جانبية قابلة للطي ────────────────────────────────────────────────────

interface SidePanelProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  collapsed: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({ id, title, icon, badge, action, collapsed, onToggle, children }) => (
  <section className={`cdw-panel${collapsed ? ' cdw-panel--collapsed' : ''}`} data-panel={id}>
    <div className="cdw-panel__head">
      <button type="button" className="cdw-panel__toggle" onClick={() => onToggle(id)} aria-expanded={!collapsed}>
        <span className="cdw-panel__icon">{icon}</span>
        <h3>{title}</h3>
        {badge}
        <ChevronDown size={14} className="cdw-panel__chev" />
      </button>
      {action}
    </div>
    {!collapsed && <div className="cdw-panel__body">{children}</div>}
  </section>
);

// ── المكوّن ───────────────────────────────────────────────────────────────────

const ContractDraftingWorkspace: React.FC<ContractDraftingWorkspaceProps> = ({
  service,
  refreshService,
  locked,
  onEditDetails,
  onConvertToContract,
  convertingToContract,
  focusMode,
  onToggleFocus,
}) => {
  const detail = service.contract_drafting_detail;
  const serviceId = service.id;

  const propVersions = useMemo<ContractDraftingVersion[]>(
    () => [...(detail?.versions ?? [])].sort((a, b) => b.version_number - a.version_number),
    [detail?.versions],
  );

  const [versions, setVersions] = useState<ContractDraftingVersion[]>(propVersions);
  const latest = versions[0] ?? null;
  const latestEditable = !locked && (!latest || latest.status === 'draft');

  const [content, setContent] = useState<string>(latest?.content ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);

  const [viewId, setViewId] = useState<number | null>(null);
  const [compare, setCompare] = useState<{ a: number; b: number } | null>(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotSummary, setSnapshotSummary] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [checklist, setChecklist] = useState<ChecklistItem[]>(detail?.checklist ?? []);
  const [checklistBusy, setChecklistBusy] = useState(false);

  const [audit, setAudit] = useState<ContractAuditResult | null>(detail?.ai_audit ?? null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showMarks, setShowMarks] = useState(false);
  const [handledFindings, setHandledFindings] = useState<Set<string>>(new Set());

  const [reviewDraft, setReviewDraft] = useState('');
  const [feedbackDraft, setFeedbackDraft] = useState<string | null>(null);

  const [sections, setSections] = useState<Record<string, boolean>>(readSections);

  const editorRef = useRef<TiptapEditorRef>(null);
  const contentRef = useRef(content);
  const savedRef = useRef(latest?.content ?? '');
  const latestRef = useRef<ContractDraftingVersion | null>(latest);
  const editableRef = useRef(latestEditable);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const exportRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLElement>(null);
  /** هل لمس المستخدم الورقة أو شريط التنسيق؟ — يميّز كتابته عن إعادة صياغة المحرر للنص عند التحميل */
  const interactedRef = useRef(false);
  const markInteracted = useCallback(() => {
    interactedRef.current = true;
  }, []);

  latestRef.current = latest;
  editableRef.current = latestEditable;

  // ── مزامنة مع بيانات الصفحة ──
  // تحديث الصفحة (بعد تأشير بند مثلاً) يعيد الإصدارات من الخادم. لا نلمس نص المحرر إلا إذا
  // تغيّر «أحدث إصدار» نفسه (إصدار أنشأه زميل) والمستخدم لا يحمل تعديلات غير محفوظة.
  useEffect(() => {
    setVersions((prev) => {
      const prevLatest = prev[0];
      const nextLatest = propVersions[0];
      const sameLatest = (prevLatest?.id ?? null) === (nextLatest?.id ?? null);
      if (sameLatest) {
        // نحتفظ ببصمتنا المحلية للأحدث (قد تكون أحدث من لقطة الصفحة) ونأخذ بقية القائمة
        return propVersions.map((v, i) => (i === 0 && prevLatest ? { ...v, ...prevLatest } : v));
      }
      if (contentRef.current !== savedRef.current) return prev;
      savedRef.current = nextLatest?.content ?? '';
      contentRef.current = savedRef.current;
      interactedRef.current = false;
      setContent(savedRef.current);
      setSaveState('idle');
      return propVersions;
    });
  }, [propVersions]);

  useEffect(() => setChecklist(detail?.checklist ?? []), [detail?.checklist]);
  useEffect(() => setAudit(detail?.ai_audit ?? null), [detail?.ai_audit]);

  // ── الحفظ ──
  const save = useCallback(
    async (opts: { changeSummary?: string | null } = {}): Promise<boolean> => {
      if (!editableRef.current) return true;
      if (savingRef.current) {
        queuedRef.current = true;
        return false;
      }
      const html = contentRef.current;
      const current = latestRef.current;
      const hasSummary = opts.changeSummary !== undefined;
      if (html === savedRef.current && !hasSummary) return true;
      if (!current && isBlankHtml(html)) return true;

      savingRef.current = true;
      if (mountedRef.current) setSaveState('saving');
      try {
        let saved: ContractDraftingVersion;
        if (!current) {
          const res = await LegalServiceService.createVersion(serviceId, {
            content: html,
            change_summary: opts.changeSummary || 'المسودة الأولى',
          });
          saved = res.data;
        } else {
          const res = await LegalServiceService.updateVersion(serviceId, current.id, {
            content: html,
            ...(hasSummary ? { change_summary: opts.changeSummary ?? null } : {}),
            expected_updated_at: current.updated_at ?? null,
          });
          saved = res.data;
        }
        savedRef.current = html;
        if (mountedRef.current) {
          setVersions((prev) => {
            const rest = prev.filter((v) => v.id !== saved.id);
            // نبقي نص المحرر كما كتبه المستخدم — الخادم ينظّف HTML وقد يختلف شكلاً لا معنى
            return [{ ...saved, content: html }, ...rest].sort((a, b) => b.version_number - a.version_number);
          });
          setLastSavedAt(new Date());
          setSaveError('');
          setSaveState(contentRef.current === html ? 'saved' : 'dirty');
        }
        return true;
      } catch (err) {
        if (mountedRef.current) {
          setSaveError(getApiErrorMessage(err, 'تعذّر حفظ المسودة'));
          setSaveState('error');
        }
        return false;
      } finally {
        savingRef.current = false;
        if (queuedRef.current) {
          queuedRef.current = false;
          if (contentRef.current !== savedRef.current) void save();
        }
      }
    },
    [serviceId],
  );

  const handleChange = useCallback(
    (html: string) => {
      contentRef.current = html;
      setContent(html);
      if (!editableRef.current || html === savedRef.current) return;
      // المحرر يعيد صياغة HTML المخزَّن بصيغته عند التحميل (وسوم/خصائص لا نصّ) فيُطلق تغييراً
      // لم يكتبه أحد: نتبنّاه أساساً جديداً بدل أن نعلن «تعديلات لم تُحفظ» ونحفظ فور الفتح.
      if (!interactedRef.current && stripHtml(html) === stripHtml(savedRef.current)) {
        savedRef.current = html;
        return;
      }
      setSaveState((s) => (s === 'error' ? s : 'dirty'));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void save(), AUTOSAVE_DELAY);
    },
    [save],
  );

  /** يُفرغ أي كتابة معلّقة قبل إجراءٍ يقرأ النص من الخادم (تدقيق/تصدير/إصدار). */
  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (contentRef.current === savedRef.current) return true;
    return save();
  }, [save]);

  // الخروج من التبويب/الصفحة: نرسل ما لم يُحفظ ولا ننتظر
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (contentRef.current !== savedRef.current) void save();
    };
  }, [save]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (contentRef.current !== savedRef.current) {
        void save();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [save]);

  // Ctrl/Cmd+S يحفظ فوراً بدل نافذة «حفظ الصفحة» في المتصفح
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flush]);

  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [exportOpen]);

  const reloadFromServer = async () => {
    if (contentRef.current !== savedRef.current
      && !window.confirm('سيُستبدل ما كتبته ولم يُحفظ بالنسخة الموجودة على الخادم. هل تتابع؟')) return;
    setBusy('reload');
    try {
      const res = await LegalServiceService.getService(serviceId);
      const fresh = [...(res.data.contract_drafting_detail?.versions ?? [])].sort(
        (a, b) => b.version_number - a.version_number,
      );
      savedRef.current = fresh[0]?.content ?? '';
      contentRef.current = savedRef.current;
      interactedRef.current = false;
      setVersions(fresh);
      setContent(savedRef.current);
      setSaveError('');
      setSaveState('idle');
      void refreshService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر التحديث من الخادم'));
    } finally {
      setBusy(null);
    }
  };

  // ── الإصدارات ──
  const startNewVersion = async (seedContent: string, summary: string | null, doneMessage: string) => {
    const res = await LegalServiceService.createVersion(serviceId, {
      content: seedContent,
      ...(summary ? { change_summary: summary } : {}),
    });
    savedRef.current = seedContent;
    contentRef.current = seedContent;
    interactedRef.current = false;
    setVersions((prev) => [{ ...res.data, content: seedContent }, ...prev]);
    setContent(seedContent);
    setViewId(null);
    setCompare(null);
    setSaveState('saved');
    setLastSavedAt(new Date());
    toast.success(doneMessage);
    void refreshService();
  };

  /** لقطة مقصودة: يثبّت النص الحالي بوصفه في السجل، وتتابع الكتابة في إصدارٍ جديد. */
  const handleSnapshot = async () => {
    if (!latest || isBlankHtml(contentRef.current)) return;
    setBusy('snapshot');
    try {
      const ok = await save({ changeSummary: snapshotSummary.trim() || latest.change_summary || null });
      if (!ok) return;
      await startNewVersion(
        contentRef.current,
        null,
        `ثُبّت الإصدار ${latest.version_number} — تتابع الكتابة في الإصدار ${latest.version_number + 1}`,
      );
      setSnapshotOpen(false);
      setSnapshotSummary('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إنشاء الإصدار'));
    } finally {
      setBusy(null);
    }
  };

  const handleContinueFromLatest = async () => {
    if (!latest) return;
    setBusy('continue');
    try {
      await startNewVersion(latest.content, null, `بدأ الإصدار ${latest.version_number + 1} من نص الإصدار ${latest.version_number}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر بدء إصدار جديد'));
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (version: ContractDraftingVersion) => {
    if (!window.confirm(`يُنشأ إصدار جديد بنص الإصدار ${version.version_number}، ويبقى ما كتبته بعده محفوظاً في السجل. هل تتابع؟`)) return;
    setBusy('restore');
    try {
      if (!(await flush())) return;
      await startNewVersion(version.content, `استرجاع نص الإصدار ${version.version_number}`, `استُرجع نص الإصدار ${version.version_number} في إصدار جديد`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر استرجاع الإصدار'));
    } finally {
      setBusy(null);
    }
  };

  // ── قائمة الفحص ──
  const toggleChecklistItem = async (index: number) => {
    if (locked || checklistBusy) return;
    const before = checklist;
    const next = checklist.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item));
    setChecklist(next);
    setChecklistBusy(true);
    try {
      const res = await LegalServiceService.updateChecklist(serviceId, next);
      if (!res.success) throw new Error(res.message || 'تعذّر تحديث قائمة الفحص');
      void refreshService();
    } catch (err) {
      setChecklist(before); // التأشير المتفائل لا يبقى إن رفضه الخادم
      toast.error(getApiErrorMessage(err, 'تعذّر تحديث قائمة الفحص'));
    } finally {
      setChecklistBusy(false);
    }
  };

  /** يُظهر لوحةً داخل العمود الجانبي بتمرير العمود وحده — `scrollIntoView` يمرّر قشرة التطبيق كلها */
  const revealPanel = (id: string) => {
    requestAnimationFrame(() => {
      const side = sideRef.current;
      const el = side?.querySelector<HTMLElement>(`[data-panel="${id}"]`);
      if (!side || !el) return;
      side.scrollTop += el.getBoundingClientRect().top - side.getBoundingClientRect().top - 2;
    });
  };

  // ── التدقيق الآلي ──
  const runAudit = async () => {
    if (!latest && isBlankHtml(contentRef.current)) {
      toast.info('اكتب نص العقد أولاً ثم دقّقه');
      return;
    }
    setAuditLoading(true);
    try {
      // التدقيق يقرأ أحدث إصدار من الخادم — فلا بد أن يصله ما على الورقة أولاً
      if (!(await flush())) throw new Error('تعذّر حفظ المسودة قبل التدقيق');
      const res = await LegalServiceService.auditContract(serviceId);
      if (!res?.success) throw new Error(res?.message || 'تعذّر التدقيق');
      setAudit(res.data);
      setHandledFindings(new Set());
      setShowMarks(true);
      setSections((s) => ({ ...s, audit: false }));
      revealPanel('audit');
      toast.success('انتهى التدقيق — الملاحظات مظلّلة على الورقة');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إجراء التدقيق الآلي'));
    } finally {
      setAuditLoading(false);
    }
  };

  const annotations = useMemo<TextAnnotation[]>(() => {
    if (!audit || !showMarks) return [];
    return (audit.findings as AuditFindingExt[])
      .filter((f) => f.original_text?.trim() && !f.unverified && !handledFindings.has(f.id))
      .map((f) => ({
        id: f.id,
        original_text: f.original_text,
        suggested_text: f.suggested_text,
        reason: f.reason,
        severity: f.severity,
        legal_reference: f.legal_reference ?? undefined,
      }));
  }, [audit, showMarks, handledFindings]);

  // ── التصدير ──
  const handleExport = async (type: 'contract_pdf' | 'contract_docx') => {
    setExportOpen(false);
    setBusy(type);
    try {
      if (!(await flush())) throw new Error('تعذّر حفظ المسودة قبل التصدير');
      const res = await LegalServiceService.generateDeliverable(serviceId, type);
      if (!res.success) throw new Error(res.message || 'تعذّر التصدير');
      const url = (res.data as { download_url?: string }).download_url;
      if (url) window.open(url, '_blank', 'noopener');
      toast.success('جُهّز الملف — تجده أيضاً في تبويب «المخرجات»');
      void refreshService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر تصدير العقد'));
    } finally {
      setBusy(null);
    }
  };

  // ── ملاحظات المراجعة والعميل ──
  const submitReviewComment = async () => {
    const text = reviewDraft.trim();
    if (!text) return;
    setBusy('review');
    try {
      const res = await LegalServiceService.addReviewComment(serviceId, text);
      if (!res.success) throw new Error(res.message || 'تعذّر إضافة الملاحظة');
      setReviewDraft('');
      await refreshService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إضافة الملاحظة'));
    } finally {
      setBusy(null);
    }
  };

  const submitClientFeedback = async () => {
    const text = (feedbackDraft ?? '').trim();
    if (!text) return;
    setBusy('feedback');
    try {
      const res = await LegalServiceService.updateClientFeedback(serviceId, text);
      if (!res.success) throw new Error(res.message || 'تعذّر حفظ ملاحظات العميل');
      setFeedbackDraft(null);
      await refreshService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حفظ ملاحظات العميل'));
    } finally {
      setBusy(null);
    }
  };

  const toggleSection = (id: string) =>
    setSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(SECTIONS_KEY, JSON.stringify(next));
      } catch {
        /* التفضيل رفاهية */
      }
      return next;
    });

  if (!detail) {
    return (
      <div className="cdw-missing">
        <FileText size={28} />
        <p>لم تُسجَّل بيانات العقد عند إنشاء الخدمة</p>
        <button type="button" className="cdw-btn cdw-btn--primary" onClick={onEditDetails}>
          <Pencil size={14} /> أكمل بيانات العقد
        </button>
      </div>
    );
  }

  // ── مشتقات العرض ──
  const viewed = viewId != null ? versions.find((v) => v.id === viewId) ?? null : null;
  const viewingOld = !!viewed && viewed.id !== latest?.id;
  const textOf = (v: ContractDraftingVersion) => (v.id === latest?.id ? content : v.content);
  const cmpA = compare ? versions.find((v) => v.id === compare.a) ?? null : null;
  const cmpB = compare ? versions.find((v) => v.id === compare.b) ?? null : null;
  const diffParts = cmpA && cmpB ? diffWords(stripHtml(textOf(cmpA)), stripHtml(textOf(cmpB))) : [];
  const diffStats = diffSummary(diffParts);

  const doneCount = checklist.filter((i) => i.checked).length;
  const checklistPct = checklist.length ? Math.round((doneCount / checklist.length) * 100) : 0;
  const wordCount = stripHtml(content).split(/\s+/).filter(Boolean).length;
  const parties = detail.parties_info ?? [];
  const reviewComments = parseReviewComments(detail.review_comments);
  const findings = (audit?.findings ?? []) as AuditFindingExt[];
  const auditStale = !!audit && !!latest && audit.audited_version_number != null
    && audit.audited_version_number !== latest.version_number;

  const contractTypeLabel = detail.contract_type
    ? detail.contract_type === 'other' && detail.contract_type_other
      ? detail.contract_type_other
      : CONTRACT_TYPE_LABELS[detail.contract_type]
    : null;

  const saveLabel = (() => {
    if (locked) return { icon: <Lock size={13} />, text: 'مقفل بعد الاعتماد', tone: 'muted' };
    if (!latestEditable) return { icon: <Lock size={13} />, text: 'للقراءة فقط', tone: 'muted' };
    switch (saveState) {
      case 'saving': return { icon: <Loader2 size={13} className="cdw-spin" />, text: 'جارٍ الحفظ…', tone: 'muted' };
      case 'dirty': return { icon: <span className="cdw-dot" />, text: 'تعديلات لم تُحفظ بعد', tone: 'warn' };
      case 'error': return { icon: <CloudOff size={13} />, text: 'لم يُحفظ', tone: 'bad' };
      case 'saved': return { icon: <Check size={13} />, text: lastSavedAt ? `حُفظ ${formatClock(lastSavedAt)}` : 'حُفظ', tone: 'ok' };
      default: return { icon: <Check size={13} />, text: latest ? 'محفوظ' : 'يُحفظ تلقائياً أثناء الكتابة', tone: 'muted' };
    }
  })();

  return (
    <div className={`cdw rc-scope${focusMode ? ' cdw--focus' : ''}`}>
      {/* ═══ الورقة ═══ */}
      <div
        className="cdw-doc"
        onKeyDownCapture={markInteracted}
        onPointerDownCapture={markInteracted}
        onPasteCapture={markInteracted}
        onDropCapture={markInteracted}
      >
        <div className="cdw-doc__bar">
          <span className="cdw-version-chip" title={latest?.change_summary ?? undefined}>
            <Layers size={13} />
            {latest ? `الإصدار ${latest.version_number}` : 'مسودة جديدة'}
            {latest && <em>{VERSION_STATUS_LABEL[latest.status] ?? latest.status}</em>}
          </span>
          <span className={`cdw-save cdw-save--${saveLabel.tone}`} role="status" aria-live="polite">
            {saveLabel.icon}
            {saveLabel.text}
          </span>

          <div className="cdw-doc__actions">
            <button
              type="button"
              className="cdw-btn"
              onClick={runAudit}
              disabled={auditLoading || locked}
              title="فحص العقد مقابل نظام المعاملات المدنية — الملاحظات تُظلَّل على الورقة"
            >
              {auditLoading ? <Loader2 size={14} className="cdw-spin" /> : <Sparkles size={14} />}
              <span>{auditLoading ? 'جارٍ التدقيق…' : audit ? 'أعد التدقيق' : 'تدقيق آلي'}</span>
            </button>

            <div className="cdw-menu-wrap" ref={exportRef}>
              <button
                type="button"
                className="cdw-btn"
                onClick={() => setExportOpen((v) => !v)}
                disabled={!latest || busy === 'contract_pdf' || busy === 'contract_docx'}
              >
                {busy === 'contract_pdf' || busy === 'contract_docx'
                  ? <Loader2 size={14} className="cdw-spin" />
                  : <Download size={14} />}
                <span>تصدير</span>
                <ChevronDown size={12} />
              </button>
              {exportOpen && (
                <div className="cdw-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => handleExport('contract_pdf')}>PDF على ورقة المكتب</button>
                  <button type="button" role="menuitem" onClick={() => handleExport('contract_docx')}>ملف Word</button>
                </div>
              )}
            </div>

            {latestEditable && latest && (
              <div className="cdw-menu-wrap">
                <button
                  type="button"
                  className="cdw-btn cdw-btn--primary"
                  onClick={() => setSnapshotOpen((v) => !v)}
                  disabled={busy === 'snapshot' || isBlankHtml(content)}
                  title={`يثبّت النص الحالي في السجل باسم الإصدار ${latest.version_number}، وتتابع الكتابة في الإصدار ${latest.version_number + 1}`}
                >
                  <History size={14} />
                  <span>إصدار جديد</span>
                </button>
                {snapshotOpen && (
                  <div className="cdw-pop">
                    <label htmlFor="cdw-snapshot-summary">
                      ماذا يميّز الإصدار {latest.version_number}؟ <span>(اختياري)</span>
                    </label>
                    <input
                      id="cdw-snapshot-summary"
                      value={snapshotSummary}
                      onChange={(e) => setSnapshotSummary(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void handleSnapshot()}
                      placeholder="مثال: بعد ملاحظات العميل على بند الضمان"
                      maxLength={255}
                      autoFocus
                    />
                    <p>يبقى هذا النص في السجل كما هو، وتتابع الكتابة في الإصدار {latest.version_number + 1}.</p>
                    <div className="cdw-pop__actions">
                      <button type="button" className="cdw-btn" onClick={() => setSnapshotOpen(false)}>إلغاء</button>
                      <button type="button" className="cdw-btn cdw-btn--primary" onClick={handleSnapshot} disabled={busy === 'snapshot'}>
                        {busy === 'snapshot' ? <Loader2 size={14} className="cdw-spin" /> : <Check size={14} />}
                        ثبّت وتابع
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="cdw-btn cdw-btn--icon"
              onClick={onToggleFocus}
              title={focusMode ? 'أظهر لوحات العقد' : 'وسّع الورقة وأخفِ اللوحات'}
              aria-pressed={focusMode}
            >
              {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {saveState === 'error' && (
          <div className="cdw-banner cdw-banner--bad" role="alert">
            <AlertTriangle size={14} />
            <span>{saveError || 'تعذّر حفظ المسودة'} — ما كتبته باقٍ على الورقة.</span>
            <button type="button" className="cdw-link" onClick={() => void save()}>أعد المحاولة</button>
            <button type="button" className="cdw-link" onClick={reloadFromServer} disabled={busy === 'reload'}>حدّث من الخادم</button>
          </div>
        )}

        {/* شريط التنسيق — خارج منطقة التمرير فلا يغيب (TiptapEditor يرسمه هنا عبر portal) */}
        <div className="cdw-doc__format" ref={setToolbarHost} hidden={!!compare || viewingOld || !latestEditable} />

        <div className="cdw-doc__scroll">
          {compare && cmpA && cmpB ? (
            <div className="cdw-paper cdw-paper--diff">
              <div className="cdw-compare-head">
                <GitCompare size={15} />
                <select value={compare.a} onChange={(e) => setCompare({ ...compare, a: Number(e.target.value) })} aria-label="الإصدار الأقدم">
                  {versions.map((v) => <option key={v.id} value={v.id}>الإصدار {v.version_number}</option>)}
                </select>
                <span>مقابل</span>
                <select value={compare.b} onChange={(e) => setCompare({ ...compare, b: Number(e.target.value) })} aria-label="الإصدار الأحدث">
                  {versions.map((v) => <option key={v.id} value={v.id}>الإصدار {v.version_number}</option>)}
                </select>
                <span className="cdw-compare-head__stats">
                  <ins>+{diffStats.added}</ins> <del>−{diffStats.removed}</del> كلمة
                </span>
                <button type="button" className="cdw-btn cdw-btn--sm" onClick={() => setCompare(null)}>
                  <X size={13} /> أغلق المقارنة
                </button>
              </div>
              <div className="cdw-diff" dir="rtl">
                {diffParts.length === 0 && <p className="cdw-muted">لا فرق بين الإصدارين.</p>}
                {diffParts.map((part, idx) => {
                  if (part.type === 'add') return <ins key={idx}>{part.text}</ins>;
                  if (part.type === 'del') return <del key={idx}>{part.text}</del>;
                  return <span key={idx}>{part.text}</span>;
                })}
              </div>
            </div>
          ) : (
            <div className="cdw-paper">
              {/* بلا عنوان على الورقة: عنوان الخدمة في ترويسة الصفحة، والعقد يبدأ بعنوانه هو */}
              {viewingOld && viewed ? (
                <>
                  <div className="cdw-banner">
                    <History size={14} />
                    <span>
                      تعرض <b>الإصدار {viewed.version_number}</b>
                      {viewed.change_summary ? ` — ${viewed.change_summary}` : ''} · {viewed.creator?.name ?? '—'} · {formatDate(viewed.created_at)} — للقراءة فقط.
                    </span>
                    <button type="button" className="cdw-link" onClick={() => setViewId(null)}>عد إلى المسودة الجارية</button>
                    {latest && (
                      <button type="button" className="cdw-link" onClick={() => setCompare({ a: viewed.id, b: latest.id })}>قارنه بالجارية</button>
                    )}
                    {!locked && (
                      <button type="button" className="cdw-link" onClick={() => handleRestore(viewed)} disabled={busy === 'restore'}>استرجع هذا النص</button>
                    )}
                  </div>
                  <LegalRichText html={viewed.content} emptyText="هذا الإصدار بلا نص" />
                </>
              ) : latestEditable ? (
                <TiptapEditor
                  ref={editorRef}
                  content={content}
                  onChange={handleChange}
                  placeholder="ابدأ كتابة العقد هنا… يُحفظ ما تكتبه تلقائياً."
                  minHeight="320px"
                  toolbarPortalEl={toolbarHost}
                  textAnnotations={annotations}
                  onApplyAnnotation={(annotationId) =>
                    setHandledFindings((prev) => new Set(prev).add(annotationId))
                  }
                />
              ) : (
                <>
                  <div className="cdw-banner">
                    <Lock size={14} />
                    <span>
                      {locked
                        ? 'المحتوى مقفل بعد الاعتماد — لا تُنشأ إصدارات ولا يُعدَّل النص.'
                        : `الإصدار ${latest?.version_number} «${VERSION_STATUS_LABEL[latest?.status ?? ''] ?? latest?.status}» لا يُعدَّل — تابع في إصدار جديد.`}
                    </span>
                    {!locked && latest && (
                      <button type="button" className="cdw-link" onClick={handleContinueFromLatest} disabled={busy === 'continue'}>
                        ابدأ الإصدار {latest.version_number + 1} من هذا النص
                      </button>
                    )}
                  </div>
                  <LegalRichText html={latest?.content} emptyText="لا توجد مسودة" />
                </>
              )}
            </div>
          )}
        </div>

        <div className="cdw-doc__foot">
          <span>{wordCount.toLocaleString('ar-SA')} كلمة</span>
          {latest && <span>أنشأه {latest.creator?.name ?? '—'} · {formatDate(latest.created_at)}</span>}
          {latestEditable && <span className="cdw-doc__hint">Ctrl+S يحفظ فوراً</span>}
        </div>
      </div>

      {/* ═══ اللوحات ═══ */}
      <aside className="cdw-side" ref={sideRef}>
        <SidePanel
          id="facts"
          title="بيانات العقد"
          icon={<FileText size={14} />}
          collapsed={!!sections.facts}
          onToggle={toggleSection}
          action={
            <button type="button" className="cdw-icon-btn" onClick={onEditDetails} title="تعديل بيانات العقد">
              <Pencil size={13} />
            </button>
          }
        >
          <dl className="cdw-facts">
            {contractTypeLabel && (<><dt>النوع</dt><dd>{contractTypeLabel}</dd></>)}
            <dt>اللغة</dt>
            <dd>{CONTRACT_LANGUAGE_LABELS[detail.contract_language] ?? detail.contract_language}</dd>
            {detail.contract_value && (
              <>
                <dt>القيمة</dt>
                <dd className="cdw-num">{parseFloat(detail.contract_value).toLocaleString('ar-SA')} {detail.contract_currency}</dd>
              </>
            )}
            {(detail.contract_start_date || detail.contract_end_date) && (
              <>
                <dt>المدة</dt>
                <dd>{formatDate(detail.contract_start_date)} ← {formatDate(detail.contract_end_date)}</dd>
              </>
            )}
            <dt>التجديد</dt>
            <dd>
              {detail.auto_renewal
                ? `تلقائي${detail.renewal_notice_days ? ` — إشعار قبل ${detail.renewal_notice_days} يوماً` : ''}`
                : 'لا يتجدد تلقائياً'}
            </dd>
          </dl>
          {parties.length > 0 && (
            <ul className="cdw-parties">
              {parties.map((p, i) => (
                <li key={i}><b>{p.name}</b>{p.role && <span>{p.role}</span>}</li>
              ))}
            </ul>
          )}
          <div className="cdw-official">
            {service.contract_id ? (
              <span className="cdw-official__linked">
                <CheckCircle2 size={14} />
                مرتبطة بعقد رسمي{service.contract?.contract_number ? ` (${service.contract.contract_number})` : ''}
              </span>
            ) : (
              <button
                type="button"
                className="cdw-btn cdw-btn--block"
                onClick={onConvertToContract}
                disabled={!latest || convertingToContract}
                title="ينشئ عقداً رسمياً في «العقود والمالية» من أحدث إصدار، ويربطه بهذه الخدمة"
              >
                {convertingToContract ? <Loader2 size={14} className="cdw-spin" /> : <Scale size={14} />}
                حوّلها إلى عقد رسمي
              </button>
            )}
          </div>
        </SidePanel>

        {checklist.length > 0 && (
          <SidePanel
            id="checklist"
            title="قائمة الفحص"
            icon={<FileCheck size={14} />}
            badge={<span className="cdw-count">{doneCount}/{checklist.length}</span>}
            collapsed={!!sections.checklist}
            onToggle={toggleSection}
          >
            <Meter value={checklistPct} tone={checklistPct === 100 ? 'good' : 'series1'} ariaLabel={`اكتمل ${checklistPct}% من قائمة الفحص`} />
            <ul className="cdw-checklist">
              {checklist.map((item, idx) => (
                <li key={item.key} className={item.checked ? 'is-done' : ''}>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleChecklistItem(idx)}
                      disabled={locked || checklistBusy}
                    />
                    <span>{item.label}</span>
                  </label>
                  {item.notes && <small>{item.notes}</small>}
                </li>
              ))}
            </ul>
          </SidePanel>
        )}

        <SidePanel
          id="versions"
          title="الإصدارات"
          icon={<Layers size={14} />}
          badge={versions.length > 0 ? <span className="cdw-count">{versions.length}</span> : undefined}
          collapsed={!!sections.versions}
          onToggle={toggleSection}
          action={
            versions.length >= 2 ? (
              <button
                type="button"
                className="cdw-icon-btn"
                onClick={() => setCompare({ a: versions[1].id, b: versions[0].id })}
                title="قارن آخر إصدارين"
              >
                <GitCompare size={13} />
              </button>
            ) : undefined
          }
        >
          {versions.length === 0 ? (
            <p className="cdw-muted">لا إصدارات بعد — أول ما تكتبه يُحفظ «الإصدار ١».</p>
          ) : (
            <ol className="cdw-versions">
              {versions.map((v, i) => {
                const isLatest = i === 0;
                const active = viewingOld ? viewed?.id === v.id : isLatest && !compare;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      className={`cdw-version${active ? ' is-active' : ''}`}
                      onClick={() => { setCompare(null); setViewId(isLatest ? null : v.id); }}
                    >
                      <span className="cdw-version__n">{v.version_number}</span>
                      <span className="cdw-version__body">
                        <b>{v.change_summary ?? (isLatest && v.status === 'draft' ? 'قيد الكتابة' : `الإصدار ${v.version_number}`)}</b>
                        <small>{v.creator?.name ?? '—'} · {formatDate(v.created_at)}</small>
                      </span>
                      <span className={`cdw-chip cdw-chip--${v.status}`}>
                        {isLatest && v.status === 'draft' ? 'الجارية' : VERSION_STATUS_LABEL[v.status] ?? v.status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </SidePanel>

        <SidePanel
          id="audit"
          title="التدقيق الآلي"
          icon={<ShieldCheck size={14} />}
          badge={audit ? <span className={`cdw-chip cdw-chip--risk-${audit.overall_risk}`}>مخاطر {RISK_LABEL[audit.overall_risk] ?? audit.overall_risk}</span> : undefined}
          collapsed={!!sections.audit}
          onToggle={toggleSection}
          action={
            audit && findings.length > 0 ? (
              <button
                type="button"
                className="cdw-icon-btn"
                onClick={() => setShowMarks((v) => !v)}
                title={showMarks ? 'أخفِ التظليل عن الورقة' : 'ظلّل الملاحظات على الورقة'}
                aria-pressed={showMarks}
              >
                {showMarks ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            ) : undefined
          }
        >
          {!audit ? (
            <p className="cdw-muted">
              يفحص العقد مقابل نظام المعاملات المدنية ويكشف البنود الخطرة والناقصة. أداة مساعدة — راجع كل ملاحظة قبل اعتمادها.
            </p>
          ) : (
            <>
              <p className="cdw-audit__meta">
                دُقّق الإصدار {audit.audited_version_number ?? '—'} · {formatDate(audit.audited_at)}
                {auditStale && <b> — النص تغيّر بعده، أعد التدقيق</b>}
              </p>
              {(audit as AuditResultExt).input_truncated && (
                <p className="cdw-audit__warn"><AlertTriangle size={13} /> العقد طويل فاقتُطع قبل التدقيق — راجع البنود الأخيرة بنفسك.</p>
              )}
              {audit.summary && <p className="cdw-audit__summary">{audit.summary}</p>}
              {audit.missing_clauses.length > 0 && (
                <div className="cdw-audit__missing">
                  <h4><FileWarning size={13} /> بنود جوهرية ناقصة</h4>
                  <ul>{audit.missing_clauses.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              <h4 className="cdw-audit__h"><AlertTriangle size={13} /> الملاحظات ({findings.length})</h4>
              {findings.length === 0 ? (
                <p className="cdw-muted">لا ملاحظات جوهرية.</p>
              ) : (
                <ul className="cdw-findings">
                  {findings.map((f) => (
                    <li key={f.id} className={handledFindings.has(f.id) ? 'is-handled' : ''}>
                      <div className="cdw-finding__top">
                        <span className={`cdw-chip cdw-chip--sev-${f.severity}`}>{CATEGORY_LABEL[f.category] ?? f.category}</span>
                        {f.legal_reference && <span className="cdw-finding__ref">{f.legal_reference}</span>}
                        {handledFindings.has(f.id) && <span className="cdw-finding__done"><Check size={11} /> طُبّق</span>}
                      </div>
                      {f.original_text && <q>{f.original_text}</q>}
                      {f.reason && <p>{f.reason}</p>}
                      {f.suggested_text && <p className="cdw-finding__suggest"><b>المقترح:</b> {f.suggested_text}</p>}
                      {f.unverified && <small title="لم يُعثر على هذا النص حرفياً داخل العقد — تحقّق منه بنفسك">لم يُعثر على نصّها في العقد — تحقّق منها بنفسك</small>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </SidePanel>

        <SidePanel
          id="notes"
          title="ملاحظات المراجعة والعميل"
          icon={<MessageSquare size={14} />}
          badge={reviewComments.length > 0 ? <span className="cdw-count">{reviewComments.length}</span> : undefined}
          collapsed={!!sections.notes}
          onToggle={toggleSection}
        >
          {reviewComments.length > 0 && (
            <ul className="cdw-comments">
              {reviewComments.map((c) => (
                <li key={c.key}>
                  {c.who && <small>{c.who} · {c.when}</small>}
                  <p>{c.text}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="cdw-inline-form">
            <input
              value={reviewDraft}
              onChange={(e) => setReviewDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submitReviewComment()}
              placeholder="أضف ملاحظة مراجعة…"
              aria-label="ملاحظة مراجعة"
            />
            <button type="button" className="cdw-icon-btn" onClick={submitReviewComment} disabled={!reviewDraft.trim() || busy === 'review'} title="أضف">
              {busy === 'review' ? <Loader2 size={13} className="cdw-spin" /> : <Send size={13} />}
            </button>
          </div>

          <div className="cdw-feedback">
            <h4>ما قاله العميل</h4>
            {feedbackDraft === null ? (
              <>
                {detail.client_feedback
                  ? <p>{detail.client_feedback}</p>
                  : <p className="cdw-muted">لم تُسجَّل ملاحظات من العميل.</p>}
                {!locked && (
                  <button type="button" className="cdw-link" onClick={() => setFeedbackDraft(detail.client_feedback ?? '')}>
                    {detail.client_feedback ? 'عدّلها' : 'سجّل ملاحظاته'}
                  </button>
                )}
              </>
            ) : (
              <>
                <textarea
                  value={feedbackDraft}
                  onChange={(e) => setFeedbackDraft(e.target.value)}
                  rows={3}
                  placeholder="ما طلبه العميل أو اعترض عليه…"
                  aria-label="ملاحظات العميل"
                />
                <div className="cdw-pop__actions">
                  <button type="button" className="cdw-btn cdw-btn--sm" onClick={() => setFeedbackDraft(null)}>إلغاء</button>
                  <button type="button" className="cdw-btn cdw-btn--sm cdw-btn--primary" onClick={submitClientFeedback} disabled={!feedbackDraft.trim() || busy === 'feedback'}>
                    {busy === 'feedback' && <Loader2 size={13} className="cdw-spin" />}
                    احفظ
                  </button>
                </div>
              </>
            )}
          </div>
        </SidePanel>
      </aside>
    </div>
  );
};

export default ContractDraftingWorkspace;
