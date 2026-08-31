/**
 * «غرفة الصياغة» — الشاشة الواحدة.
 *
 * 🔑 الحالةُ كلُّها خادميّة: نقرأ المساحةَ والمحادثةَ من الخادم ولا نبني حالةً
 * متفائلةً موازية. السببُ مقيسٌ في هذا المنتج: التحديثُ المتفائل يكذب حين يفشل
 * النداء — والمحامي يرى واقعةً «مُقرّة» لم تُحفظ.
 *
 * 🔑 المراحلُ الخمس أزرارُ تنقّلٍ لا لافتاتٍ: المحادثةُ سطحُ العمل في أربعٍ منها
 * واللوحُ الجانبيُّ يتبدّل معها، والخامسةُ (المذكّرة النهائية) تُبدّل السطحَ كلَّه
 * إلى الوثيقة المركّبة. وتقدُّمُ الخادم في المراحل يجرّ العرضَ معه تلقائياً —
 * والمحامي حرٌّ يرجع ويتقدّم بنقرة.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileDown, Paperclip, Send, Upload } from 'lucide-react';
import {
  answerQuestion, exportWorkspace, freeDraft, getFinalMemo, getRuns, getWorkspace, pasteSource,
  sendMessage, setSourceSide, toggleFact, uploadSource, deleteSource,
  MEMO_TYPE_LABELS, STATUS_LABELS,
  type DraftRoomPart, type DraftRoomRun, type DraftRoomWorkspace,
  type FinalMemo, type SourceSide,
} from '../../services/draftRoomService';
import { API_BASE_URL } from '../../utils/api';
import {
  CitationsCard, DraftSectionCard, FactSheetCard, GapsCard,
  NoticeCard, QuestionCard, SourceReadCard, ThinkingSteps, VerificationCard,
} from './parts';
import DraftRoomAside, {
  type ArticleGroup, type DraftView, type SectionEntry,
} from './DraftRoomAside';
import DraftRoomThread from './DraftRoomThread';
import FinalMemoView from './FinalMemoView';
import PasteSourceDialog from './PasteSourceDialog';
import SendToCaseDialog from './SendToCaseDialog';

const VIEWS: Array<{ key: DraftView; label: string }> = [
  { key: 'intake', label: 'المستندات' },
  { key: 'questioning', label: 'التحليل' },
  { key: 'planning', label: 'الهيكل' },
  { key: 'drafting', label: 'الصياغة' },
  { key: 'drafted', label: 'المذكّرة النهائية' },
];

const HUES = 6;

export default function DraftRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const workspaceId = Number(id);

  const [workspace, setWorkspace] = useState<DraftRoomWorkspace | null>(null);
  const [runs, setRuns] = useState<DraftRoomRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  /**
   * 🩸 رسالةُ المحامي تظهر فوراً ولا تنتظر الخادم.
   * الدورُ يستغرق ثوانيَ، وشاشةٌ تبتلع ما كتبه المستخدمُ ثم تصمت تبدو معطّلة.
   * والتفاؤلُ هنا آمنٌ: نعرض **ما كتبه هو** لا نتيجةً نخترعها — وإن فشل النداءُ
   * أعدنا النصَّ إلى الحقل وأزلنا الفقاعة.
   */
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  /** العرضُ الحاليّ — يتبع مرحلةَ الخادم تلقائياً ويطيع نقرةَ المحامي فوراً */
  const [view, setView] = useState<DraftView>('intake');
  const prevStatus = useRef<string | null>(null);

  /** السؤالُ الذي أمام العين — يرصده التمريرُ وتطفو موادُّه أعلى اللوح */
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);

  const [finalMemo, setFinalMemo] = useState<FinalMemo | null>(null);
  const [finalLoading, setFinalLoading] = useState(false);
  const [exported, setExported] = useState<{ memoId: number; title: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    const [ws, rs] = await Promise.all([getWorkspace(workspaceId), getRuns(workspaceId)]);
    setWorkspace(ws);
    setRuns(rs);
  }, [workspaceId]);

  useEffect(() => {
    if (!Number.isFinite(workspaceId)) return;
    refresh()
      .catch(() => setError('تعذّر فتحُ المساحة. تأكّد من الرابط أو ارجع للقائمة.'))
      .finally(() => setLoading(false));
  }, [workspaceId, refresh]);

  /** تقدّمُ الخادم مرحلةً يجرّ العرضَ معه — ونقرةُ المحامي تبقى مسموعةً بعده */
  useEffect(() => {
    const status = workspace?.status;
    if (!status || prevStatus.current === status) return;
    prevStatus.current = status;
    setView(status as DraftView);
  }, [workspace?.status]);

  /**
   * 🔑 نُثبّت **رأسَ الردّ** أعلى الشاشة لا ذيلَه.
   *
   * 🩸 القفزُ إلى القاع يضع المحامي عند آخر سطرٍ من ردٍّ لم يقرأ أوّله، فيصعد
   * يبحث عن البداية في كلّ دور. وأثناء التفكير نُبقي القفزَ إلى القاع:
   * المؤشّرُ هناك، وإخفاؤه يوهم التعطّل.
   */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    if (thinking) {
      vp.scrollTo({ top: vp.scrollHeight, behavior: 'smooth' });
      return;
    }

    const all = vp.querySelectorAll<HTMLElement>('[data-run]');
    const last = all[all.length - 1];
    if (!last) return;

    // 12px متنفَّسٌ فوق الرأس كي لا يلتصق بالحافّة
    vp.scrollTo({ top: Math.max(0, last.offsetTop - 12), behavior: 'smooth' });
  }, [runs.length, thinking]);

  /**
   * راصدُ التمرير: أيُّ سؤالٍ أمام العين الآن؟
   * أقربُ بطاقةِ سؤالٍ إلى ثلث الشاشة الأعلى هي «الحاليّة» — فتطفو موادُّها
   * أعلى اللوح الجانبيّ. رجع المحامي لسؤالٍ سابقٍ تبعته موادُّه.
   */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    let raf = 0;
    const pick = () => {
      raf = 0;
      const cards = vp.querySelectorAll<HTMLElement>('[data-question]');
      if (cards.length === 0) return;

      const anchor = vp.getBoundingClientRect().top + vp.clientHeight * 0.33;
      let best: HTMLElement | null = null;
      let bestDist = Infinity;

      cards.forEach((c) => {
        const r = c.getBoundingClientRect();
        if (r.bottom < vp.getBoundingClientRect().top || r.top > vp.getBoundingClientRect().bottom) return;
        const dist = Math.abs(r.top - anchor);
        if (dist < bestDist) { bestDist = dist; best = c; }
      });

      if (best) {
        const qid = Number((best as HTMLElement).dataset.question);
        setActiveQuestionId((cur) => (cur === qid ? cur : qid));
      }
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(pick); };
    vp.addEventListener('scroll', onScroll, { passive: true });
    pick();

    return () => {
      vp.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [runs.length]);

  /** المذكّرةُ النهائية تُركَّب خادمياً وتُجلب عند دخول عرضها أو تجدُّد المحادثة */
  useEffect(() => {
    if (view !== 'drafted' || !Number.isFinite(workspaceId)) return;
    let cancelled = false;
    setFinalLoading(true);
    getFinalMemo(workspaceId)
      .then((f) => { if (!cancelled) setFinalMemo(f); })
      .catch(() => { if (!cancelled) setError('تعذّر تركيبُ المذكّرة النهائية.'); })
      .finally(() => { if (!cancelled) setFinalLoading(false); });
    return () => { cancelled = true; };
  }, [view, workspaceId, runs.length]);

  // ─────────────── مشتقّات المحادثة ───────────────

  /**
   * 🔑 اللونُ لكلّ **دورٍ** لا لكلّ سؤال: أسئلةُ الدور الواحد وموادُّه أسرةٌ
   * واحدةٌ بلونٍ واحد — فأيُّ سؤالٍ منها أمام العين يرفع مجموعةَ موادّه كلَّها،
   * ولا يقع سؤالٌ أزرقُ فوق موادَّ بنفسجيّةٍ من دوره نفسِه.
   */
  const { questionHue, articleGroups } = useMemo(() => {
    const hueMap = new Map<number, number>();
    const groups: ArticleGroup[] = [];
    let runIdx = 0;

    for (const run of runs) {
      if (run.role !== 'assistant') continue;
      const parts = run.parts ?? [];
      const questions = parts.filter((p): p is Extract<DraftRoomPart, { type: 'question' }> => p.type === 'question');
      if (questions.length === 0) continue;

      const hue = runIdx % HUES;
      runIdx += 1;
      questions.forEach((q) => hueMap.set(q.question_id, hue));

      /*
       * 🩸 وثّقه التقييم الميدانيّ: موادُّ الوساطة عُرضت تحت سؤال «اسم المدّعى
       * عليه» — لأن الدورَ المختلط (سؤالُ ديباجةٍ + أقسامٌ مصوغة) يُنسب استشهادُه
       * كلُّه لأوّل سؤال. دورٌ فيه أقسامٌ: موادُّه للأقسام لا للسؤال — تبقى بطاقةً
       * في المتن ولا تدخل لوحَ التحليل.
       */
      const hasSections = parts.some((p) => p.type === 'draft_section');
      const citations = parts.find((p): p is Extract<DraftRoomPart, { type: 'citations' }> => p.type === 'citations');
      if (!hasSections && citations && citations.items.length > 0) {
        const q = questions[0];
        groups.push({
          runId: run.id,
          questionIds: questions.map((x) => x.question_id),
          label: q.text.length > 70 ? q.text.slice(0, 70) + '…' : q.text,
          hue,
          items: citations.items,
        });
      }
    }

    return { questionHue: hueMap, articleGroups: groups };
  }, [runs]);

  const hueOf = useCallback(
    (qid: number) => questionHue.get(qid) ?? 0,
    [questionHue],
  );

  /**
   * فهرسُ الأقسام من **آخر دورِ صياغةٍ وحدَه** — كما يفعل التركيبُ والتصدير.
   *
   * 🩸 وثّقه تقريرُ الاختبار الميدانيّ: الجمعُ عبر الأدوار كلِّها راكم سبعةَ
   * أقسامٍ بعد ستّ دورات («الدفوع الموضوعية» و«الرد الموضوعي» و«الرد على
   * الموضوع» ثلاثتُها القسمُ ذاته) — والفهرسُ مرآةُ المذكّرة لا أرشيفُ محاولاتها.
   */
  const sections = useMemo<SectionEntry[]>(() => {
    const lastDraftRun = [...runs].reverse().find(
      (r) => r.role === 'assistant' && (r.parts ?? []).some((p) => p.type === 'draft_section'),
    );
    if (!lastDraftRun) return [];

    return (lastDraftRun.parts ?? [])
      .filter((p): p is Extract<DraftRoomPart, { type: 'draft_section' }> => p.type === 'draft_section')
      .map((p) => {
        const text = p.html.replace(/<[^>]+>/g, ' ');
        return { title: p.title || 'قسم', words: text.split(/\s+/).filter(Boolean).length };
      });
  }, [runs]);

  const articlesCountByQuestion = useMemo(() => {
    const m = new Map<number, number>();
    for (const g of articleGroups) {
      for (const qid of g.questionIds) m.set(qid, g.items.length);
    }
    return m;
  }, [articleGroups]);

  // ─────────────── الأفعال ───────────────

  /** الإرسالُ من مُدخل المكتبة والاقتراحات معاً — نصٌّ صريحٌ دائماً */
  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;

    setBusy(true);
    setThinking(true);
    setError(null);
    setPendingMessage(text);

    try {
      // الامتناعُ يعود 200 بـstatus=failed ونصٍّ مكتوبٍ سلفاً — لا يُعالَج كخطأ
      await sendMessage(workspaceId, text);
      await refresh();
      setPendingMessage(null);
    } catch {
      setError('تعذّر الوصولُ للخادم. رسالتُك لم تُرسَل — أعِد المحاولة.');
      setPendingMessage(null);
    } finally {
      setThinking(false);
      setBusy(false);
    }
  };

  const onDeleteSource = async (sourceId: number, name: string) => {
    if (!window.confirm(`حذفُ «${name}» من هذه المساحة؟`)) return;

    setBusy(true);
    setError(null);
    try {
      await deleteSource(workspaceId, sourceId);
      await refresh();
    } catch {
      setError('تعذّر حذفُ المصدر.');
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length || busy) return;

    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadSource(workspaceId, file);
      }
      await refresh();
    } catch {
      setError('تعذّر رفعُ الملفّ. تحقّق من حجمه ونوعه.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onPaste = async (input: { title: string; text: string; role: string }) => {
    setBusy(true);
    setError(null);
    try {
      await pasteSource(workspaceId, input);
      setPasteOpen(false);
      await refresh();
    } catch {
      setError('تعذّر حفظُ النصّ.');
    } finally {
      setBusy(false);
    }
  };

  /**
   * جوابُ سؤال — ثمّ **متابعةٌ تلقائيّة** حين تُغلَق آخرُ الأسئلة الحاجبة.
   *
   * 🩸 كان المحامي يجيب فلا يحدث شيء، فيضطرّ لكتابة «كمل». والسؤالُ الحاجب
   * وقفةٌ في مسارٍ لا محطّةٌ نهائية — فمن يرفعه يجب أن يستأنف من رفعه.
   */
  const onAnswer = async (questionId: number, input: Parameters<typeof answerQuestion>[2]) => {
    setBusy(true);
    setError(null);
    try {
      const ws = await answerQuestion(workspaceId, questionId, input);
      await refresh();

      const hadBlocking = workspace?.questions.some((q) => q.blocking) ?? false;
      if (hadBlocking && !ws.has_blocking_questions) {
        setBusy(false);
        await continueAfterAnswers();
      }
    } catch {
      setError('تعذّر حفظُ الجواب.');
    } finally {
      setBusy(false);
    }
  };

  /** دورٌ ضمنيّ — يظهر في المحادثة كي يعرف المحامي لماذا تحرّك الوكيل */
  const continueAfterAnswers = async () => {
    setBusy(true);
    setThinking(true);
    setPendingMessage('أجبتُ عن الأسئلة — تابِع.');
    try {
      await sendMessage(workspaceId, 'أجبتُ عن الأسئلة — تابِع.');
      await refresh();
    } catch {
      setError('تعذّرت المتابعة. اكتب «تابِع» لأمضي.');
    } finally {
      setPendingMessage(null);
      setThinking(false);
      setBusy(false);
    }
  };

  const onToggleFact = async (factId: number, accepted: boolean) => {
    setBusy(true);
    try {
      await toggleFact(workspaceId, factId, accepted);
      await refresh();
    } catch {
      setError('تعذّر حفظُ القرار.');
    } finally {
      setBusy(false);
    }
  };

  const onSide = async (sourceId: number, side: SourceSide) => {
    setBusy(true);
    try {
      await setSourceSide(workspaceId, sourceId, side);
      await refresh();
    } catch {
      setError('تعذّر حفظُ الجهة.');
    } finally {
      setBusy(false);
    }
  };

  /**
   * 🩸 كان النجاحُ يوجّه إلى `/legal-memos` — مسارٍ لا وجودَ له — فتنفجر الصفحة.
   * الآن لا توجيهَ: النتيجةُ تُعرض في لوح الإخراج، والـPDF يُفتح من هناك.
   */
  const onExport = async (caseId?: number, caseTitle?: string) => {
    setBusy(true);
    setError(null);
    try {
      const memo = await exportWorkspace(workspaceId, caseId);
      setExported({ memoId: memo.memo_id, title: memo.title });
      setSendOpen(false);
      if (caseTitle) setError(null);
    } catch (e: unknown) {
      // رسالةُ الخادم مقصودةٌ للمستخدم — تُعرض كما هي
      const msg = (e as { message?: string })?.message;
      setError(msg || 'تعذّر التصدير.');
    } finally {
      setBusy(false);
    }
  };

  /** فتحُ PDF المذكّرة المحفوظة — بنفس نمط صفحة الاعتمادات (blob عبر Bearer) */
  const onOpenPdf = async () => {
    if (!exported) return;
    setBusy(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/legal-memos/${exported.memoId}/preview-pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank', 'noopener');
    } catch {
      setError('تعذّر فتحُ الـPDF.');
    } finally {
      setBusy(false);
    }
  };

  const onCopyFinal = async () => {
    if (!finalMemo) return;
    const text = finalMemo.html
      .replace(/<\/(p|li|h[1-6]|div)>/g, '\n')
      .replace(/<li[^>]*>/g, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('تعذّر النسخُ — انسخ من الوثيقة مباشرةً.');
    }
  };

  /**
   * الصياغةُ الحرة — بأمر المالك: «لو أُطلق ليبدع ثم يأتي من بعده من يتأكد».
   * نثرٌ مُطلقٌ ثم لوحةُ حسابٍ لكل ادّعاء. البوابةُ الخادمية تبقى شرطَ الدخول.
   */
  const onFreeDraft = async () => {
    if (busy || !workspace?.ready_to_draft) return;
    setBusy(true);
    setThinking(true);
    setError(null);
    setPendingMessage('اطلب صياغةً حرة ✨');
    try {
      await freeDraft(workspaceId);
      await refresh();
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message;
      setError(msg || 'تعذّرت الصياغةُ الحرة. أعِد المحاولة.');
    } finally {
      setPendingMessage(null);
      setThinking(false);
      setBusy(false);
    }
  };

  /** «اطلب تعديلاً» — رجوعٌ لسطح المحادثة والمؤشّرُ جاهزٌ في الحقل */
  const onAskEdit = () => {
    setView('drafting');
    window.setTimeout(() => composerRef.current?.focus(), 260);
  };

  const onJumpToSection = (title: string) => {
    const el = viewportRef.current?.querySelector<HTMLElement>(
      `[data-section-title="${CSS.escape(title)}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /** شريحةُ «المواد» في بطاقة السؤال تُنير مجموعةَ دورِها في اللوح */
  const onShowArticles = (questionId: number) => {
    setView('questioning');
    setActiveQuestionId(questionId);
    const anchor = articleGroups.find((g) => g.questionIds.includes(questionId))?.questionIds[0];
    window.setTimeout(() => {
      document.querySelector(`[data-article-group="${anchor ?? questionId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 320);
  };

  // ─────────────── العرض ───────────────

  if (loading) {
    return <div className="dr-shell"><div className="dr-empty"><span>يُحمَّل…</span></div></div>;
  }

  if (!workspace) {
    return (
      <div className="dr-shell">
        <div className="dr-empty">
          <span className="dr-empty__title">لم أجد هذه المساحة</span>
          <button type="button" className="dr-btn" onClick={() => navigate('/draft-room')}>
            <ArrowRight size={14} aria-hidden /> رجوعٌ للقائمة
          </button>
        </div>
      </div>
    );
  }

  const acceptedIds = new Set(workspace.facts.filter((f) => f.accepted).map((f) => f.id));
  const readable = workspace.sources.filter((s) => s.readable).length;
  const statusIdx = VIEWS.findIndex((v) => v.key === workspace.status);
  const answered = workspace.questions.filter((q) => q.status !== 'open').length;

  /**
   * 🔑 سؤالٌ واحدٌ في كلّ مرّة.
   *
   * عرضُ أربعةِ أسئلةٍ معاً يدفع الأوّلَ خارج الشاشة فيضيع، ويُشعر المحامي أنه
   * أمام استمارةٍ لا محادثة. فنعرض المفتوحَ الأوّلَ وحدَه بعدّادٍ يقول أين هو،
   * والباقي ينتظر دورَه. والمُجابُ يبقى ظاهراً — فهو سجلُّ قراراته لا عبء.
   */
  const openQuestions = workspace.questions.filter((q) => q.status === 'open');
  const activeOpenQuestion = openQuestions[0] ?? null;
  const activeOpenQuestionId = activeOpenQuestion?.id ?? null;
  const answeredCount = workspace.questions.length - openQuestions.length;

  /**
   * 🩸 إعادةُ استعمال السؤال خادمياً تُدخل بطاقتَه في دورين — ورسمُهما معاً
   * يعرض سؤالاً تفاعلياً مكرراً. تُرسم أولُ بطاقةٍ لكل سؤالٍ فقط؛ المجموعةُ
   * تُنشأ في كل render فتصفو مع كل تحديث.
   */
  const seenQuestionCards = new Set<number>();

  const renderPart = (part: DraftRoomPart, key: string, runHasQuestions: boolean) => {
    switch (part.type) {
      case 'question': {
        if (seenQuestionCards.has(part.question_id)) return null;
        seenQuestionCards.add(part.question_id);

        const live = workspace.questions.find((q) => q.id === part.question_id);

        /*
         * 🩸 شكوى حيّة: «السؤال لم يظهر ومع ذلك يصرّ أني أجاوب عليه» — خمسةُ
         * أسئلةٍ مفتوحةٍ ومنطقُ الواحد-في-المرة كان يرسم أوّلَها في موضعه من
         * السجل ويُخفي البقية، والوكيلُ يُحيل على مخفيّ. المفتوحُ كلُّه لا يُرسم
         * هنا إطلاقاً — مرساه المثبَّتُ فوق حقل الكتابة يعرضه واحداً واحداً،
         * فلا يضيع سؤالٌ مهما طال السجلُّ أو تعثّرت بطاقتُه. والمُجاب يبقى سجلّاً.
         */
        if (live?.status === 'open') return null;

        return (
          <QuestionCard
            key={key}
            question={part}
            live={live}
            busy={busy}
            onAnswer={onAnswer}
            hue={hueOf(part.question_id)}
            articlesCount={articlesCountByQuestion.get(part.question_id) ?? 0}
            onShowArticles={() => onShowArticles(part.question_id)}
          />
        );
      }
      case 'fact_sheet':
        return <FactSheetCard key={key} part={part} acceptedIds={acceptedIds} busy={busy} onToggle={onToggleFact} />;
      case 'citations': {
        // موادُّ الأسئلة تسكن اللوحَ الجانبيّ — إلا دوراً فيه أقسامٌ فموادُّه لأقسامه
        const runOfPart = runs.find((r) => (r.parts ?? []).includes(part));
        const partnersSections = (runOfPart?.parts ?? []).some((p) => p.type === 'draft_section');
        return runHasQuestions && !partnersSections ? null : <CitationsCard key={key} part={part} />;
      }
      case 'gaps': return <GapsCard key={key} part={part} />;
      case 'draft_section':
        return (
          <div key={key} data-section-title={part.title || 'قسم'}>
            <DraftSectionCard part={part} />
          </div>
        );
      case 'verification':
        return (
          <VerificationCard
            key={key}
            part={part}
            onFixUnverified={(claims) => {
              void send('في المسوّدة الحرة ادّعاءاتٌ لم يثبت سندُها — أصلِحها أو احذفها وأعد الأقسامَ المتأثرة كاملةً:\n• ' + claims.join('\n• '));
            }}
          />
        );
      case 'source_read': return <SourceReadCard key={key} part={part} />;
      case 'notice': return <NoticeCard key={key} part={part} />;
      default: return null;
    }
  };

  return (
    <div className="dr-shell" dir="rtl">
      <header className="dr-head">
        <button type="button" className="dr-btn dr-btn--ghost" onClick={() => navigate('/draft-room')}>
          <ArrowRight size={15} aria-hidden />
        </button>
        <h1 className="dr-head__title">{workspace.title}</h1>
        <span className="dr-tag">{MEMO_TYPE_LABELS[workspace.memo_type]}</span>
        {workspace.client_position && (
          <span className="dr-tag dr-tag--ok">
            موكّلنا: {workspace.client_position === 'plaintiff' ? 'المدّعي' : 'المدّعى عليه'}
          </span>
        )}

        <div className="dr-head__meta">
          <span className="dr-tag">{STATUS_LABELS[workspace.status]}</span>
          <button
            type="button"
            className="dr-btn dr-btn--primary"
            disabled={sections.length === 0}
            onClick={() => setView('drafted')}
            title={sections.length === 0 ? 'تظهر بعد صياغة أوّل قسم' : 'الوثيقةُ المركّبة كاملةً'}
          >
            <FileDown size={14} aria-hidden /> المذكّرة النهائية
          </button>
        </div>
      </header>

      <nav className="dr-phases" aria-label="مراحل الغرفة">
        {VIEWS.map((v, i) => (
          <button
            key={v.key}
            type="button"
            className={`dr-phase${v.key === view ? ' dr-phase--active' : ''}${i < statusIdx ? ' dr-phase--done' : ''}`}
            onClick={() => setView(v.key)}
            aria-current={v.key === view ? 'page' : undefined}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <div className="dr-body">
        {view === 'drafted' ? (
          <section className="dr-thread">
            <FinalMemoView final={finalMemo} loading={finalLoading} onAskEdit={onAskEdit} />
          </section>
        ) : (
          <section className="dr-thread">
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(e) => onUpload(e.target.files)}
              aria-hidden
            />
            <DraftRoomThread
              runs={runs}
              pendingMessage={pendingMessage}
              thinking={thinking}
              busy={busy}
              error={error}
              readable={readable}
              renderPart={renderPart}
              onSend={(text) => { void send(text); }}
              onUploadClick={() => fileRef.current?.click()}
              onPasteClick={() => setPasteOpen(true)}
              viewportRef={viewportRef}
              composerRef={composerRef}
              freeDraftReady={Boolean(workspace.ready_to_draft)}
              freeDraftBlockReason={workspace.draft_block_reason ?? null}
              onFreeDraft={() => { void onFreeDraft(); }}
              dock={activeOpenQuestion && !thinking ? (
                <div className="drq-dock">
                  <span className="drq-dock__label">سؤالٌ بانتظارك</span>
                  <QuestionCard
                    question={{
                      type: 'question',
                      question_id: activeOpenQuestion.id,
                      text: activeOpenQuestion.text,
                      why: activeOpenQuestion.why,
                      answer_kind: activeOpenQuestion.answer_kind,
                      choices: activeOpenQuestion.choices,
                      blocking: activeOpenQuestion.blocking,
                    }}
                    live={activeOpenQuestion}
                    busy={busy}
                    onAnswer={onAnswer}
                    hue={hueOf(activeOpenQuestion.id)}
                    articlesCount={articlesCountByQuestion.get(activeOpenQuestion.id) ?? 0}
                    onShowArticles={() => onShowArticles(activeOpenQuestion.id)}
                    position={openQuestions.length > 0
                      ? { current: answeredCount + 1, total: workspace.questions.length }
                      : undefined}
                  />
                </div>
              ) : undefined}
            />
          </section>
        )}

        <DraftRoomAside
          view={view}
          workspace={workspace}
          busy={busy}
          groups={articleGroups}
          activeQuestionId={activeQuestionId ?? activeOpenQuestionId}
          sections={sections}
          answered={answered}
          final={finalMemo}
          finalLoading={finalLoading}
          exported={exported}
          copied={copied}
          onSide={onSide}
          onDeleteSource={onDeleteSource}
          onJumpToSection={onJumpToSection}
          onExport={() => void onExport()}
          onSendToCase={() => setSendOpen(true)}
          onAskEdit={onAskEdit}
          onOpenPdf={() => void onOpenPdf()}
          onCopyFinal={() => void onCopyFinal()}
        />
      </div>

      <PasteSourceDialog
        open={pasteOpen}
        busy={busy}
        onClose={() => setPasteOpen(false)}
        onSubmit={onPaste}
      />

      <SendToCaseDialog
        open={sendOpen}
        busy={busy}
        onClose={() => setSendOpen(false)}
        onSend={(caseId, caseTitle) => void onExport(caseId, caseTitle)}
      />
    </div>
  );
}
