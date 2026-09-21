import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  CloudOff,
  Copy,
  Download,
  FileCheck,
  ExternalLink,
  HelpCircle,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Tag,
  Unlock,
  X,
} from 'lucide-react';
import TiptapEditor from '../../TiptapEditor';
import LegalRichText from '../LegalRichText';
import ConfirmDialog from '../../ConfirmDialog';
import OpinionLetterDialog from './OpinionLetterDialog';
import { SidePanel } from '../workspace/SidePanel';
import { usePanelSections } from '../workspace/usePanelSections';
import { LegalServiceService } from '../../../services/legalServiceService';
import { apiClient } from '../../../utils/api';
import { getApiErrorMessage } from '../../../utils/apiError';
import { stripHtml } from '../../../utils/legalDiff';
import type { LegalReference, LegalService, OpinionLetterOptions } from '../../../types/legalServices';
import { CLASSIFICATION_LABELS, DELIVERY_METHOD_LABELS, URGENCY_LABELS } from '../../../types/legalServices';

/**
 * مساحة الاستشارة — ورقة الرأي القانوني في الوسط، وبجوارها ما يُبنى عليه الرأي.
 *
 * ما كان غير منطقي في التبويب القديم:
 *  · سؤال العميل — وهو ما تُبنى عليه الاستشارة كلها — يُعرض هنا ولا يُحرَّر إلا من تبويب آخر.
 *  · الرأي يُكتب في نموذج «تعديل ← حفظ»، ومسودة الذكاء تُنسخ يدوياً ثم تُلصق فيه.
 *  · زرّ «تسليم الاستشارة» يكرّر انتقال الحالة ويحيل إلى بطاقةٍ وتبويبٍ لم يعودا موجودين.
 * الآن: السؤال يُحرَّر في مكانه، والرأي ورقة بحفظ تلقائي، والمسودة تُدرج بنقرة،
 * والتسليم يمرّ بنافذة التأكيد نفسها التي تمرّ بها كل انتقالات الصفحة.
 */

interface ConsultationWorkspaceProps {
  service: LegalService;
  refreshService: () => Promise<void> | void;
  /** محتوى الخدمة مقفل (تسليم/إغلاق) */
  locked: boolean;
  canManage: boolean;
  /** يطلب انتقال الحالة عبر الصفحة — فتمرّ بنافذة التأكيد الموحّدة */
  onRequestTransition: (target: string) => void;
  focusMode: boolean;
  onToggleFocus: () => void;
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY = 2000;

const isBlankHtml = (html: string) => stripHtml(html).trim() === '';

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatClock = (d: Date) => d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

/** مسودة الذكاء قد تصل نصاً خاماً — نلفّها فقرات كي تدخل الورقة منسّقة */
const toHtml = (draft: string) =>
  /<\w+[^>]*>/.test(draft)
    ? draft
    : draft
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`)
        .join('');

const ConsultationWorkspace: React.FC<ConsultationWorkspaceProps> = ({
  service,
  refreshService,
  locked,
  canManage,
  onRequestTransition,
  focusMode,
  onToggleFocus,
}) => {
  const detail = service.consultation_detail;
  const serviceId = service.id;
  const opinionLocked = locked || !!detail?.opinion_finalized_at || !!detail?.delivered_at;
  const editable = !opinionLocked;

  const [content, setContent] = useState<string>(detail?.legal_opinion ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [editingField, setEditingField] = useState<'question' | 'scope' | null>(null);
  const [fieldDraft, setFieldDraft] = useState('');

  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [finalizeAsk, setFinalizeAsk] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);

  const [addingRef, setAddingRef] = useState(false);
  const [refDraft, setRefDraft] = useState<LegalReference>({ title: '', source: '', url: '' });

  const { sections, toggle, open } = usePanelSections('csw_sections');

  const contentRef = useRef(content);
  const savedRef = useRef(detail?.legal_opinion ?? '');
  const editableRef = useRef(editable);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  /** يميّز كتابة المستخدم عن إعادة صياغة المحرر للنص المخزَّن عند التحميل (تُطلق onChange لم يكتبه أحد) */
  const interactedRef = useRef(false);
  const markInteracted = useCallback(() => {
    interactedRef.current = true;
  }, []);

  editableRef.current = editable;

  // نص الخادم تغيّر من مكان آخر (زميل) ولا نحمل تعديلات غير محفوظة ⇒ نأخذه
  useEffect(() => {
    const server = detail?.legal_opinion ?? '';
    if (contentRef.current !== savedRef.current) return;
    if (stripHtml(server) === stripHtml(savedRef.current)) return;
    savedRef.current = server;
    contentRef.current = server;
    interactedRef.current = false;
    setContent(server);
  }, [detail?.legal_opinion]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!editableRef.current) return true;
    if (savingRef.current) {
      queuedRef.current = true;
      return false;
    }
    const html = contentRef.current;
    if (html === savedRef.current) return true;

    savingRef.current = true;
    if (mountedRef.current) setSaveState('saving');
    try {
      const res = await LegalServiceService.updateOpinion(serviceId, { legal_opinion: html, autosave: true });
      if (!res?.success) throw new Error('تعذّر حفظ الرأي القانوني');
      savedRef.current = html;
      if (mountedRef.current) {
        setLastSavedAt(new Date());
        setSaveError('');
        setSaveState(contentRef.current === html ? 'saved' : 'dirty');
      }
      return true;
    } catch (err) {
      if (mountedRef.current) {
        setSaveError(getApiErrorMessage(err, 'تعذّر حفظ الرأي القانوني'));
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
  }, [serviceId]);

  const scheduleSave = useCallback(() => {
    setSaveState((s) => (s === 'error' ? s : 'dirty'));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void save(), AUTOSAVE_DELAY);
  }, [save]);

  const handleChange = useCallback(
    (html: string) => {
      contentRef.current = html;
      setContent(html);
      if (!editableRef.current || html === savedRef.current) return;
      if (!interactedRef.current && stripHtml(html) === stripHtml(savedRef.current)) {
        savedRef.current = html;
        return;
      }
      scheduleSave();
    },
    [scheduleSave],
  );

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (contentRef.current === savedRef.current) return true;
    return save();
  }, [save]);

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
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('keydown', onKey);
    };
  }, [save, flush]);

  // ── سؤال العميل ونطاق الاستشارة: يُحرَّران في مكانهما ──
  const startEdit = (field: 'question' | 'scope') => {
    setFieldDraft((field === 'question' ? detail?.client_question : detail?.scope_definition) ?? '');
    setEditingField(field);
  };

  const saveField = async () => {
    if (!editingField) return;
    setBusy('field');
    try {
      await LegalServiceService.updateConsultationDetails(
        serviceId,
        editingField === 'question'
          ? { client_question: fieldDraft.trim() || null }
          : { scope_definition: fieldDraft.trim() || null },
      );
      setEditingField(null);
      await refreshService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر الحفظ'));
    } finally {
      setBusy(null);
    }
  };

  // ── مسودة الذكاء ──
  const generateDraft = async () => {
    setAiLoading(true);
    open('ai');
    try {
      const res = await apiClient.post<{
        success?: boolean;
        data?: { draft_html?: string; draft?: string } | string;
        draft?: string;
      }>(`/legal-services/${serviceId}/consultation/ai-draft`);
      // الشكل الرسمي: data.draft_html (+ أشكال احتياطية تحسّباً)
      const draft =
        (typeof res?.data === 'object' && (res.data?.draft_html || res.data?.draft)) ||
        res?.draft ||
        (typeof res?.data === 'string' ? res.data : null);
      if (draft && draft.trim()) setAiDraft(draft);
      else toast.error('لم يُرجِع الخادم مسودة — حاول مجدداً أو اكتب الرأي بنفسك');
    } catch (err) {
      // 503 = خدمة الذكاء غير مهيأة للمكتب — رسالة الخادم توضّح ذلك
      toast.error(getApiErrorMessage(err, 'تعذّر توليد المسودة'));
    } finally {
      setAiLoading(false);
    }
  };

  /** يُدرج المسودة في الورقة: تحلّ محل ورقة فارغة، وتُلحق بآخر ورقة مكتوبة — ولا تمسح ما كتبه المحامي. */
  const insertDraft = () => {
    if (!aiDraft || !editable) return;
    const html = toHtml(aiDraft);
    const next = isBlankHtml(contentRef.current) ? html : `${contentRef.current}<hr>${html}`;
    interactedRef.current = true;
    contentRef.current = next;
    setContent(next);
    scheduleSave();
    setAiDraft(null);
    toast.success('أُدرجت المسودة في الورقة — راجعها وعدّلها قبل الاعتماد');
  };

  // ── المراجع ──
  const addReference = async () => {
    if (!refDraft.title.trim()) return;
    setBusy('ref');
    try {
      await LegalServiceService.addReference(serviceId, {
        title: refDraft.title.trim(),
        source: refDraft.source?.trim() || undefined,
        url: refDraft.url?.trim() || undefined,
      });
      setRefDraft({ title: '', source: '', url: '' });
      setAddingRef(false);
      await refreshService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إضافة المرجع'));
    } finally {
      setBusy(null);
    }
  };

  const removeReference = async (index: number) => {
    setBusy(`ref-${index}`);
    try {
      await LegalServiceService.removeReference(serviceId, index);
      await refreshService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حذف المرجع'));
    } finally {
      setBusy(null);
    }
  };

  // ── الاعتماد وإعادة الفتح ──
  // الخادم لا يولّد خطاب الرأي إلا من رأيٍ معتمد، ويدعم الاعتماد منذ البداية — لكن الواجهة لم يكن
  // فيها زرٌّ يرسله قط، فكان توليد الخطاب يُردّ «اعتمد الرأي أولاً» ولا مكان يُعتمد منه.
  const finalizeOpinion = async (): Promise<boolean> => {
    setBusy('finalize');
    try {
      if (timerRef.current) clearTimeout(timerRef.current);
      const html = contentRef.current;
      const res = await LegalServiceService.updateOpinion(serviceId, { legal_opinion: html, finalize: true });
      if (!res?.success) throw new Error('تعذّر اعتماد الرأي');
      savedRef.current = html;
      setSaveState('idle');
      setFinalizeAsk(false);
      await refreshService();
      return true;
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر اعتماد الرأي'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const reopenOpinion = async () => {
    setBusy('reopen');
    try {
      const res = await LegalServiceService.reopenOpinion(serviceId);
      if (!res?.success) throw new Error(res?.message || 'تعذّر إعادة فتح الرأي');
      toast.success('أُعيد فتح الرأي للتعديل');
      await refreshService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إعادة فتح الرأي'));
    } finally {
      setBusy(null);
    }
  };

  // ── خطاب الرأي PDF ──
  // الحوار يعرض ما سيظهر في الملف (الأقسام، نص إخلاء المسؤولية، الخاتمة) — ثم: اعتماد إن لزم فتوليد.
  const generateLetter = async (options: OpinionLetterOptions) => {
    if (!detail?.opinion_finalized_at && !(await finalizeOpinion())) return;
    setBusy('export');
    try {
      if (!(await flush())) throw new Error('تعذّر حفظ الرأي قبل التوليد');
      const res = await LegalServiceService.generateDeliverable(serviceId, 'consultation_opinion', options);
      if (!res.success) throw new Error(res.message || 'تعذّر توليد الخطاب');
      const url = (res.data as { view_url?: string; download_url?: string }).view_url
        ?? (res.data as { download_url?: string }).download_url;
      if (url) window.open(url, '_blank', 'noopener');
      setLetterOpen(false);
      toast.success('جُهّز خطاب الرأي — تجده أيضاً في تبويب «الملفات»');
      void refreshService();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر توليد خطاب الرأي'));
    } finally {
      setBusy(null);
    }
  };

  const requestDelivery = async () => {
    if (!(await flush())) return;
    await refreshService(); // نافذة التأكيد تفحص الرأي من بيانات الصفحة — فلتكن طازجة
    onRequestTransition('delivered');
  };

  if (!detail) {
    return (
      <div className="cdw-missing">
        <HelpCircle size={28} />
        <p>لم تُسجَّل بيانات الاستشارة عند إنشاء الخدمة</p>
      </div>
    );
  }

  const references = detail.legal_references ?? [];
  const question = detail.client_question ?? '';
  const hasOpinion = !isBlankHtml(content);
  const canDeliver = (service.allowed_transitions ?? []).includes('delivered');
  const wordCount = stripHtml(content).split(/\s+/).filter(Boolean).length;
  const canEditBrief = canManage && !locked;
  const isFinalized = !!detail.opinion_finalized_at;
  // إعادة الفتح قبل التسليم فقط — بعده الرأيُ وثيقةٌ خرجت للعميل
  const canReopen = isFinalized && !detail.delivered_at && !locked;

  const saveLabel = (() => {
    if (opinionLocked) {
      return {
        icon: <Lock size={13} />,
        text: detail.delivered_at ? `سُلّم ${formatDate(detail.delivered_at)}` : 'مقفل ضد التعديل',
        tone: 'muted',
      };
    }
    switch (saveState) {
      case 'saving': return { icon: <Loader2 size={13} className="cdw-spin" />, text: 'جارٍ الحفظ…', tone: 'muted' };
      case 'dirty': return { icon: <span className="cdw-dot" />, text: 'تعديلات لم تُحفظ بعد', tone: 'warn' };
      case 'error': return { icon: <CloudOff size={13} />, text: 'لم يُحفظ', tone: 'bad' };
      case 'saved': return { icon: <Check size={13} />, text: lastSavedAt ? `حُفظ ${formatClock(lastSavedAt)}` : 'حُفظ', tone: 'ok' };
      default: return { icon: <Check size={13} />, text: hasOpinion ? 'محفوظ' : 'يُحفظ تلقائياً أثناء الكتابة', tone: 'muted' };
    }
  })();

  const renderEditableText = (field: 'question' | 'scope', value: string, emptyText: string, placeholder: string) =>
    editingField === field ? (
      <div className="cdw-feedback cdw-feedback--flat">
        <textarea
          value={fieldDraft}
          onChange={(e) => setFieldDraft(e.target.value)}
          rows={field === 'question' ? 5 : 3}
          maxLength={10000}
          placeholder={placeholder}
          autoFocus
        />
        <div className="cdw-pop__actions">
          <button type="button" className="cdw-btn cdw-btn--sm" onClick={() => setEditingField(null)} disabled={busy === 'field'}>إلغاء</button>
          <button type="button" className="cdw-btn cdw-btn--sm cdw-btn--primary" onClick={saveField} disabled={busy === 'field'}>
            {busy === 'field' && <Loader2 size={13} className="cdw-spin" />}
            احفظ
          </button>
        </div>
      </div>
    ) : value ? (
      <p className="cdw-brief">{value}</p>
    ) : (
      <p className="cdw-muted">{emptyText}</p>
    );

  return (
    <div className={`cdw rc-scope${focusMode ? ' cdw--focus' : ''}`}>
      {/* ═══ ورقة الرأي ═══ */}
      <div
        className="cdw-doc"
        onKeyDownCapture={markInteracted}
        onPointerDownCapture={markInteracted}
        onPasteCapture={markInteracted}
        onDropCapture={markInteracted}
      >
        <div className="cdw-doc__bar">
          <span className="cdw-version-chip">
            <BookOpen size={13} />
            الرأي القانوني
          </span>
          <span className={`cdw-save cdw-save--${saveLabel.tone}`} role="status" aria-live="polite">
            {saveLabel.icon}
            {saveLabel.text}
          </span>

          <div className="cdw-doc__actions">
            {editable && (
              <button
                type="button"
                className="cdw-btn"
                onClick={generateDraft}
                disabled={aiLoading || !question}
                title={
                  question
                    ? 'يقترح نقطة بداية للرأي اعتماداً على سؤال العميل ونطاق الاستشارة — تُراجَع قبل الاعتماد'
                    : 'سجّل سؤال العميل أولاً — المسودة تُبنى عليه'
                }
              >
                {aiLoading ? <Loader2 size={14} className="cdw-spin" /> : <Sparkles size={14} />}
                <span>{aiLoading ? 'جارٍ التوليد…' : 'اقترح مسودة'}</span>
              </button>
            )}
            {editable && (
              <button
                type="button"
                className="cdw-btn cdw-btn--primary"
                onClick={() => setFinalizeAsk(true)}
                disabled={!hasOpinion || busy === 'finalize'}
                title={hasOpinion ? 'يثبّت الرأي ويقفله ضد التعديل — شرطٌ لتوليد الخطاب الرسمي' : 'اكتب الرأي أولاً'}
              >
                <FileCheck size={14} />
                <span>اعتمد الرأي</span>
              </button>
            )}
            <button
              type="button"
              className="cdw-btn"
              onClick={() => setLetterOpen(true)}
              disabled={!hasOpinion || busy === 'export' || busy === 'finalize'}
              title="خطاب الرأي PDF على ورقة المكتب — تختار ما يظهر فيه وتحرّر نص إخلاء المسؤولية"
            >
              {busy === 'export' ? <Loader2 size={14} className="cdw-spin" /> : <Download size={14} />}
              <span>خطاب الرأي PDF</span>
            </button>
            <button
              type="button"
              className="cdw-btn cdw-btn--icon"
              onClick={onToggleFocus}
              title={focusMode ? 'أظهر لوحات الاستشارة' : 'وسّع الورقة وأخفِ اللوحات'}
              aria-pressed={focusMode}
            >
              {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {saveState === 'error' && (
          <div className="cdw-banner cdw-banner--bad" role="alert">
            <AlertTriangle size={14} />
            <span>{saveError || 'تعذّر حفظ الرأي'} — ما كتبته باقٍ على الورقة.</span>
            <button type="button" className="cdw-link" onClick={() => void save()}>أعد المحاولة</button>
          </div>
        )}

        <div className="cdw-doc__format" ref={setToolbarHost} hidden={!editable} />

        <div className="cdw-doc__scroll">
          <div className="cdw-paper">
            {editable ? (
              <TiptapEditor
                content={content}
                onChange={handleChange}
                placeholder="اكتب الرأي القانوني هنا… يُحفظ ما تكتبه تلقائياً."
                minHeight="320px"
                toolbarPortalEl={toolbarHost}
              />
            ) : (
              <>
                <div className="cdw-banner">
                  <Lock size={14} />
                  <span>
                    {detail.delivered_at
                      ? `سُلّم الرأي للعميل في ${formatDate(detail.delivered_at)} — لا يُعدَّل بعد التسليم.`
                      : isFinalized
                      ? `اعتُمد الرأي في ${formatDate(detail.opinion_finalized_at)} — مقفل ضد التعديل، وجاهز لتوليد الخطاب الرسمي.`
                      : 'الخدمة مقفلة ضد التعديل في حالتها الحالية.'}
                  </span>
                  {canReopen && (
                    <button type="button" className="cdw-link" onClick={reopenOpinion} disabled={busy === 'reopen'}>
                      <Unlock size={12} /> أعد فتحه للتعديل
                    </button>
                  )}
                </div>
                <LegalRichText html={content} emptyText="لم يُكتب رأي قانوني" />
              </>
            )}
          </div>
        </div>

        <div className="cdw-doc__foot">
          <span>{wordCount.toLocaleString('ar-SA')} كلمة</span>
          {editable && <span className="cdw-doc__hint">Ctrl+S يحفظ فوراً</span>}
        </div>
      </div>

      {/* ═══ ما يُبنى عليه الرأي ═══ */}
      <aside className="cdw-side">
        <SidePanel
          id="question"
          title="سؤال العميل"
          icon={<HelpCircle size={14} />}
          collapsed={!!sections.question}
          onToggle={toggle}
          action={
            canEditBrief && editingField !== 'question' ? (
              <button type="button" className="cdw-icon-btn" onClick={() => startEdit('question')} title={question ? 'عدّل السؤال' : 'سجّل السؤال'}>
                <Pencil size={13} />
              </button>
            ) : undefined
          }
        >
          {renderEditableText(
            'question',
            question,
            canEditBrief
              ? 'لم يُسجَّل سؤال العميل — سجّله هنا، فعليه يُبنى الرأي ومسودة الذكاء.'
              : 'لم يُسجَّل سؤال العميل.',
            'ما الذي يسأل عنه العميل تحديداً؟',
          )}
          {!question && canEditBrief && editingField !== 'question' && (
            <button type="button" className="cdw-btn cdw-btn--sm cdw-btn--block" style={{ marginTop: 10 }} onClick={() => startEdit('question')}>
              <Plus size={13} /> سجّل سؤال العميل
            </button>
          )}
        </SidePanel>

        <SidePanel
          id="details"
          title="تفاصيل الاستشارة"
          icon={<Tag size={14} />}
          collapsed={!!sections.details}
          onToggle={toggle}
        >
          <dl className="cdw-facts">
            {detail.classification && (<><dt>التصنيف</dt><dd>{CLASSIFICATION_LABELS[detail.classification]}</dd></>)}
            <dt>الاستعجال</dt>
            <dd>{URGENCY_LABELS[detail.urgency] ?? detail.urgency}</dd>
            {detail.delivery_method && (<><dt>طريقة التسليم</dt><dd>{DELIVERY_METHOD_LABELS[detail.delivery_method]}</dd></>)}
            {detail.delivered_at && (<><dt>سُلّمت</dt><dd>{formatDate(detail.delivered_at)}</dd></>)}
          </dl>
          <div className="cdw-subhead">
            <h4>نطاق الاستشارة</h4>
            {canEditBrief && editingField !== 'scope' && (
              <button type="button" className="cdw-link" onClick={() => startEdit('scope')}>
                {detail.scope_definition ? 'عدّله' : 'حدّده'}
              </button>
            )}
          </div>
          {renderEditableText('scope', detail.scope_definition ?? '', 'لم يُحدَّد نطاق.', 'ما الذي تشمله الاستشارة وما لا تشمله؟')}
        </SidePanel>

        {(aiDraft || aiLoading) && (
          <SidePanel
            id="ai"
            title="مسودة مقترحة"
            icon={<Sparkles size={14} />}
            collapsed={!!sections.ai}
            onToggle={toggle}
            action={
              aiDraft ? (
                <button type="button" className="cdw-icon-btn" onClick={() => setAiDraft(null)} title="تجاهل المسودة">
                  <X size={13} />
                </button>
              ) : undefined
            }
          >
            {aiLoading ? (
              <p className="cdw-muted"><Loader2 size={13} className="cdw-spin" /> جارٍ توليد المسودة… قد يستغرق ذلك لحظات.</p>
            ) : aiDraft ? (
              <>
                <p className="cdw-audit__warn"><AlertTriangle size={13} /> مسودة آلية — نقطة بداية تُراجَع وتُعدَّل، لا رأياً جاهزاً.</p>
                <div className="cdw-aidraft"><LegalRichText html={toHtml(aiDraft)} /></div>
                <div className="cdw-pop__actions">
                  <button
                    type="button"
                    className="cdw-btn cdw-btn--sm"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(stripHtml(toHtml(aiDraft)))
                        .then(() => toast.success('نُسخت المسودة'))
                        .catch(() => toast.error('تعذّر النسخ إلى الحافظة'))
                    }
                  >
                    <Copy size={13} /> انسخها
                  </button>
                  <button type="button" className="cdw-btn cdw-btn--sm cdw-btn--primary" onClick={insertDraft} disabled={!editable}>
                    <Check size={13} /> {hasOpinion ? 'ألحقها بالورقة' : 'أدرجها في الورقة'}
                  </button>
                </div>
              </>
            ) : null}
          </SidePanel>
        )}

        <SidePanel
          id="refs"
          title="المراجع القانونية"
          icon={<BookOpen size={14} />}
          badge={references.length > 0 ? <span className="cdw-count">{references.length}</span> : undefined}
          collapsed={!!sections.refs}
          onToggle={toggle}
          action={
            !locked && !addingRef ? (
              <button type="button" className="cdw-icon-btn" onClick={() => { setAddingRef(true); open('refs'); }} title="أضف مرجعاً">
                <Plus size={13} />
              </button>
            ) : undefined
          }
        >
          {addingRef && (
            <div className="cdw-refform">
              <input value={refDraft.title} onChange={(e) => setRefDraft({ ...refDraft, title: e.target.value })} placeholder="عنوان المرجع (نظام، مادة، حكم…)" autoFocus />
              <input value={refDraft.source ?? ''} onChange={(e) => setRefDraft({ ...refDraft, source: e.target.value })} placeholder="المصدر (اختياري)" />
              <input value={refDraft.url ?? ''} onChange={(e) => setRefDraft({ ...refDraft, url: e.target.value })} placeholder="رابط (اختياري)" dir="ltr" />
              <div className="cdw-pop__actions">
                <button type="button" className="cdw-btn cdw-btn--sm" onClick={() => setAddingRef(false)}>إلغاء</button>
                <button type="button" className="cdw-btn cdw-btn--sm cdw-btn--primary" onClick={addReference} disabled={!refDraft.title.trim() || busy === 'ref'}>
                  {busy === 'ref' && <Loader2 size={13} className="cdw-spin" />}
                  أضف
                </button>
              </div>
            </div>
          )}
          {references.length === 0 && !addingRef ? (
            <p className="cdw-muted">لا مراجع بعد — الأنظمة والمواد والأحكام التي يستند إليها الرأي.</p>
          ) : (
            <ul className="cdw-refs">
              {references.map((ref, idx) => (
                <li key={`${ref.title}-${idx}`}>
                  <div>
                    <b>{ref.title}</b>
                    {ref.source && <small>{ref.source}</small>}
                    {ref.url && (
                      <a href={ref.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={11} /> افتح الرابط</a>
                    )}
                  </div>
                  {!locked && (
                    <button type="button" className="cdw-icon-btn" onClick={() => removeReference(idx)} disabled={busy === `ref-${idx}`} title="احذف المرجع">
                      <X size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SidePanel>

        <SidePanel
          id="deliver"
          title="التسليم للعميل"
          icon={<Send size={14} />}
          collapsed={!!sections.deliver}
          onToggle={toggle}
        >
          {detail.delivered_at ? (
            <span className="cdw-official__linked"><CheckCircle2 size={14} /> سُلّمت في {formatDate(detail.delivered_at)}</span>
          ) : (
            <>
              <ul className="cdw-ready">
                <li className={question ? 'is-ok' : ''}>{question ? <Check size={12} /> : <X size={12} />} سؤال العميل مسجَّل</li>
                <li className={hasOpinion ? 'is-ok' : ''}>{hasOpinion ? <Check size={12} /> : <X size={12} />} الرأي مكتوب</li>
                <li className={isFinalized ? 'is-ok' : ''}>{isFinalized ? <Check size={12} /> : <X size={12} />} الرأي معتمد (شرط الخطاب الرسمي)</li>
                <li className={canDeliver ? 'is-ok' : ''}>{canDeliver ? <Check size={12} /> : <X size={12} />} مرّ بالمراجعة الداخلية</li>
              </ul>
              <button
                type="button"
                className="cdw-btn cdw-btn--primary cdw-btn--block"
                onClick={requestDelivery}
                disabled={!canDeliver || !hasOpinion}
                title={
                  !canDeliver
                    ? 'التسليم يُتاح بعد المراجعة الداخلية — انقل الخدمة من زرّ «التالي» في أعلى الصفحة'
                    : 'يسلّم الرأي للعميل، ويقفل المحتوى، ويصله إشعار'
                }
              >
                <Send size={14} /> سلّم الاستشارة للعميل
              </button>
              {!canDeliver && (
                <p className="cdw-muted" style={{ marginTop: 8 }}>
                  تُسلَّم بعد «المراجعة الداخلية» — انقل الخدمة من زرّ «التالي» أعلى الصفحة.
                </p>
              )}
            </>
          )}
        </SidePanel>
      </aside>

      <ConfirmDialog
        isOpen={finalizeAsk}
        variant="primary"
        loading={busy === 'finalize'}
        onClose={() => setFinalizeAsk(false)}
        onConfirm={() => void finalizeOpinion().then((ok) => ok && toast.success('اعتُمد الرأي — يمكنك الآن توليد الخطاب الرسمي'))}
        confirmLabel="اعتمد الرأي"
        title="اعتماد الرأي القانوني"
        message="باعتماد الرأي يُثبَّت النص ويُقفل ضد التعديل هو ومراجعه، ويصير جاهزاً لتوليد الخطاب الرسمي."
        note="إن احتجت تعديله لاحقاً فأعد فتحه من أعلى الورقة — ما دام لم يُسلَّم للعميل."
      />

      {letterOpen && (
        <OpinionLetterDialog
          serviceId={serviceId}
          needsFinalize={!isFinalized}
          busy={busy === 'export' || busy === 'finalize'}
          canSaveOfficeDefault={canManage}
          onClose={() => setLetterOpen(false)}
          onGenerate={(options) => void generateLetter(options)}
        />
      )}
    </div>
  );
};

export default ConsultationWorkspace;
