import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import {
  X,
  Mic,
  MicOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  CalendarClock,
  UserRound,
  Flag,
  ListTodo,
  AlertTriangle,
} from 'lucide-react';
import { TaskService } from '../../services/taskService';
import type {
  VoiceTaskDraft,
  VoiceTaskPreview,
  VoiceTaskPriority,
} from '../../services/taskService';
import { interpretVoiceCommand } from '../../services/voiceCommandService';
import type { VoiceIntent } from '../../services/voiceCommandService';
import { startCommandCapture } from '../../utils/audioRecorder';
import type { CommandCapture } from '../../utils/audioRecorder';

/**
 * بطاقة مراجعة «مهمة بالصوت» — ما فُهم من التسجيل **قبل** أن يصير مهمة.
 *
 * كان التسجيل يُنشئ المهمة فوراً، فكلمةٌ أُسيء سماعُها تصير عنواناً في قائمة المكتب
 * وتكليفاً لشخصٍ خطأ وإشعاراً وصل فعلاً. فصار الإنشاء على شوطين: يُعرض ما فُهم، ويُعتمد.
 *
 * والاعتماد **صوتيّ أولاً**: المايك يُفتح من تلقائه بعد ظهور البطاقة، فيقول المستخدم
 * «اعتمد» وقد قرأ ما أمامه. والأزرار موجودة كاملةً — الصوت طريقٌ أسرع لا طريقٌ وحيد.
 *
 * ومهمّتان في تسجيل واحد تُعرضان بطاقتين متتابعتين: «اعتمد الكل» لا يُفتح إلا بعد رؤية
 * كلّ بطاقة، ثم تُنشأ الدفعة ولا تُفتح أيّ مهمة — لأن فتح واحدةٍ من ثلاثٍ اختيارٌ أعمى.
 */

interface VoiceTaskReviewProps {
  preview: VoiceTaskPreview;
  onCancel: () => void;
  /** بعد الاعتماد: العدد المُنشأ، ومعرّف الأولى حين تكون مهمة واحدة (فتُفتح) */
  onApproved: (result: { createdCount: number; openTaskId: number | string | null }) => void;
}

type ListenPhase = 'off' | 'listening' | 'interpreting';

/** سقف دورات الاستماع المتتالية بلا كلام — مايكٌ مفتوحٌ بلا نهاية ليس خياراً */
const MAX_IDLE_CYCLES = 6;
const IDLE_MS = 10_000;

const PRIORITY_LABELS: Record<VoiceTaskPriority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
};

const HINT_BY_INTENT: Partial<Record<VoiceIntent, string>> = {
  unknown: 'لم أفهم الأمر — قل «اعتمد» أو «التالي» أو «ألغِ»',
};

const VoiceTaskReview: React.FC<VoiceTaskReviewProps> = ({ preview, onCancel, onApproved }) => {
  const [drafts, setDrafts] = useState<VoiceTaskDraft[]>(preview.tasks);
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<Set<string>>(() => new Set(preview.tasks.slice(0, 1).map((t) => t.key)));
  const [listen, setListen] = useState<ListenPhase>('off');
  const [heard, setHeard] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [level, setLevel] = useState(0);

  const captureRef = useRef<CommandCapture | null>(null);
  const idleCyclesRef = useRef(0);
  const listenRef = useRef<ListenPhase>('off');
  const savingRef = useRef(false);
  const rafRef = useRef<number | undefined>(undefined);
  /** مرجع حيّ: الالتقاط التلقائي ينتهي خارج دورة العرض فلا يرى الحالة الجديدة */
  const handleAudioRef = useRef<(wav: Blob | null) => void>(() => {});

  /**
   * 🩸 المرجعُ يُكتب **مع** الحالة لا عند العرض.
   *
   * دورةُ الاستماع تُغلق ثم تفتح في النَّفَس نفسِه (`setListenPhase('off')` ثم `startListening()`),
   * وReact لا يعيد العرض بينهما — فمرجعٌ يُسنَد عند العرض يبقى `'listening'` لحظةَ الفتح،
   * فيرتدّ الحارسُ ويُغلق المايك إلى الأبد بلا خطأٍ ظاهر. والإسنادُ الصريح يزيل السباق.
   */
  const setListenPhase = useCallback((next: ListenPhase) => {
    listenRef.current = next;
    setListen(next);
  }, []);

  const setSavingFlag = useCallback((next: boolean) => {
    savingRef.current = next;
    setSaving(next);
  }, []);

  const multi = drafts.length > 1;
  const current = drafts[index];
  const allSeen = drafts.every((d) => seen.has(d.key));
  const unseenCount = drafts.filter((d) => !seen.has(d.key)).length;

  // ─── تحرير المسوّدات ───

  const patch = useCallback((key: string, changes: Partial<VoiceTaskDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...changes } : d)));
  }, []);

  const markSeen = useCallback((key: string) => {
    setSeen((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, drafts.length - 1));
      setIndex(clamped);
      const key = drafts[clamped]?.key;
      if (key) markSeen(key);
    },
    [drafts, markSeen],
  );

  const removeCard = useCallback(
    (key: string) => {
      // الحسابُ خارج المُحدِّث: `onCancel` مُحدِّثُ حالةِ الأب، ونداؤه داخل مُحدِّثٍ
      // يجعله أثراً جانبياً في العرض — وReact قد يستدعي المُحدِّث أكثر من مرة.
      const next = drafts.filter((d) => d.key !== key);
      if (next.length === 0) {
        onCancel();
        return;
      }
      setDrafts(next);
      setIndex((i) => Math.min(i, next.length - 1));
    },
    [drafts, onCancel],
  );

  // ─── الاستماع ───

  const stopMeter = () => {
    if (rafRef.current !== undefined) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
    setLevel(0);
  };

  const stopListening = useCallback(() => {
    captureRef.current?.cancel();
    captureRef.current = null;
    stopMeter();
    setListenPhase('off');
  }, [setListenPhase]);

  const startListening = useCallback(
    async (resetCycles = true) => {
      if (listenRef.current !== 'off' || savingRef.current) return;
      if (resetCycles) idleCyclesRef.current = 0;

      setListenPhase('listening');
      setHeard(null);
      try {
        const capture = await startCommandCapture({
          maxIdleMs: IDLE_MS,
          onAutoStop: (wav) => handleAudioRef.current(wav),
        });
        captureRef.current = capture;

        const tick = () => {
          setLevel(capture.getLevel());
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        setListenPhase('off');
        const denied =
          err instanceof DOMException &&
          (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
        setHint(denied ? 'المايك محجوب — استخدم الأزرار للاعتماد' : 'تعذّر فتح المايك — استخدم الأزرار');
      }
    },
    [setListenPhase],
  );

  // ─── الاعتماد ───

  const approve = useCallback(async () => {
    if (savingRef.current) return;

    // متعدّدة وما زالت بطاقةٌ لم تُرَ: ننتقل إليها بدل أن نعتمد ما لم يُقرأ
    if (multi && !allSeen) {
      const nextUnseen = drafts.findIndex((d) => !seen.has(d.key));
      if (nextUnseen >= 0) goTo(nextUnseen);
      setHint(`بقيت ${unseenCount} بطاقة للمراجعة قبل الاعتماد`);
      return;
    }

    const invalid = drafts.find((d) => !d.title.trim());
    if (invalid) {
      setHint('كل مهمة تحتاج عنواناً');
      goTo(drafts.findIndex((d) => d.key === invalid.key));
      return;
    }

    stopListening();
    setSavingFlag(true);
    try {
      const result = await TaskService.createVoiceTasksBatch(drafts, preview.transcript);

      if (result.failed.length > 0) {
        toast.warn(`أُنشئت ${result.createdCount} — وتعذّر إنشاء ${result.failed.length}`);
      } else {
        toast.success(
          result.createdCount === 1
            ? `تم إنشاء المهمة «${drafts[0].title}»`
            : `تم إنشاء ${result.createdCount} مهام`,
        );
      }

      // مهمة واحدة تُفتح، والدفعة لا تُفتح — فتحُ واحدةٍ من ثلاثٍ اختيارٌ أعمى
      const single = result.createdCount === 1 && result.failed.length === 0;
      onApproved({
        createdCount: result.createdCount,
        openTaskId: single ? (result.tasks[0]?.id ?? null) : null,
      });
    } catch (err) {
      setSavingFlag(false);
      toast.error(err instanceof Error ? err.message : 'تعذّر اعتماد المهام');
    }
  }, [drafts, multi, allSeen, seen, unseenCount, goTo, preview.transcript, onApproved, stopListening, setSavingFlag]);

  // ─── تنفيذ النيّة المسموعة ───

  const applyIntent = useCallback(
    (intent: VoiceIntent, transcript: string) => {
      setHeard(transcript || null);

      switch (intent) {
        case 'approve':
          void approve();
          return true;
        case 'next':
          if (index < drafts.length - 1) {
            goTo(index + 1);
            setHint(null);
          } else {
            setHint(multi ? 'هذه آخر بطاقة — قل «اعتمد»' : 'قل «اعتمد» لإنشاء المهمة');
          }
          return false;
        case 'previous':
          goTo(index - 1);
          setHint(null);
          return false;
        case 'cancel':
          stopListening();
          onCancel();
          return true;
        case 'edit':
          stopListening();
          setHint('عدّل ما تشاء ثم اضغط «اعتمد» — أو اضغط المايك لتعود للأمر الصوتي');
          return true;
        default:
          setHint(HINT_BY_INTENT.unknown ?? null);
          return false;
      }
    },
    [approve, drafts.length, goTo, index, multi, onCancel, stopListening],
  );

  // الالتقاط انتهى: إمّا كلامٌ يُفسَّر، وإمّا صمتٌ يُعاد الاستماع بعده ضمن السقف
  handleAudioRef.current = (wav: Blob | null) => {
    captureRef.current = null;
    stopMeter();

    if (!wav) {
      idleCyclesRef.current += 1;
      setListenPhase('off');
      if (idleCyclesRef.current < MAX_IDLE_CYCLES) {
        void startListening(false);
      } else {
        setHint('أُغلق المايك — اضغطه لتقول «اعتمد» أو استخدم الأزرار');
      }
      return;
    }

    idleCyclesRef.current = 0;
    setListenPhase('interpreting');

    void interpretVoiceCommand(wav)
      .then(({ intent, transcript }) => {
        const terminal = applyIntent(intent, transcript);
        setListenPhase('off');
        if (!terminal) void startListening(false);
      })
      .catch(() => {
        setListenPhase('off');
        setHint('تعذّر فهم الأمر — استخدم الأزرار');
      });
  };

  // فتح المايك تلقائياً عند ظهور البطاقة
  useEffect(() => {
    void startListening();
    return () => {
      captureRef.current?.cancel();
      captureRef.current = null;
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
    // مرة واحدة عند التركيب — إعادة الاستماع تُدار من handleAudioRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🩸 الكتابة في حقلٍ تُغلق المايك: المستخدم يعدّل لا يعتمد، ولولا ذلك لعمل مسجّلان
  // معاً (هذا وكبسولة «الإملاء الذكي» التي تظهر عند التركيز في أي حقل).
  const handleFocusIn = useCallback(() => {
    if (listenRef.current !== 'off') stopListening();
  }, [stopListening]);

  // Escape يغلق المراجعة — ويُمنع من الوصول لأي مستمع آخر
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        stopListening();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onCancel, stopListening]);

  const listenLabel = useMemo(() => {
    if (saving) return 'جارٍ الإنشاء…';
    if (listen === 'interpreting') return 'أفهم الأمر…';
    if (listen === 'listening') return multi && !allSeen ? 'قل «التالي» أو «اعتمد»' : 'قل «اعتمد»';
    return 'اضغط المايك لتأمر بصوتك';
  }, [listen, saving, multi, allSeen]);

  if (!current) return null;

  const approveLabel = multi ? `اعتمد الكل (${drafts.length})` : 'اعتمد وافتح المهمة';

  return createPortal(
    <div className="vtr-overlay" role="dialog" aria-modal="true" aria-label="مراجعة المهام المسجّلة">
      <div className="vtr" onFocusCapture={handleFocusIn}>
        {/* الترويسة */}
        <div className="vtr__head">
          <div className="vtr__head-title">
            <ListTodo size={16} />
            <span>{multi ? 'راجع البطاقات ثم اعتمدها' : 'راجع المهمة ثم اعتمدها'}</span>
          </div>
          {multi && (
            <span className="vtr__counter">
              {index + 1} من {drafts.length}
            </span>
          )}
          <button type="button" className="vtr__close" onClick={onCancel} aria-label="إلغاء">
            <X size={16} />
          </button>
        </div>

        {/* ما سُمع من التسجيل — مقياسُ الفهم بيد المستخدم */}
        {preview.transcript && (
          <p className="vtr__transcript" title={preview.transcript}>
            <span>سمعت:</span> {preview.transcript}
          </p>
        )}

        {preview.dropped > 0 && (
          <p className="vtr__warn">
            <AlertTriangle size={13} />
            استُخرجت مهام أكثر من الحد — أُسقطت {preview.dropped} ولم تُعرض
          </p>
        )}

        {/* البطاقة */}
        <div className="vtr__body">
          <input
            className="vtr__title"
            value={current.title}
            onChange={(e) => patch(current.key, { title: e.target.value })}
            placeholder="عنوان المهمة"
            aria-label="عنوان المهمة"
          />

          <div className="vtr__grid">
            <label className="vtr__field">
              <span className="vtr__label">
                <UserRound size={13} /> المكلَّف
              </span>
              <select
                value={current.assigneeUserId ?? ''}
                onChange={(e) =>
                  patch(current.key, {
                    assigneeUserId: e.target.value ? Number(e.target.value) : null,
                    assigneeDefaulted: false,
                  })
                }
              >
                {preview.assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {current.assigneeDefaulted && <em className="vtr__note">لم يُذكر اسم — عليك أنت</em>}
            </label>

            <label className="vtr__field">
              <span className="vtr__label">
                <CalendarClock size={13} /> الموعد
              </span>
              <input
                type="date"
                value={current.dueDate}
                onChange={(e) => patch(current.key, { dueDate: e.target.value, dueDateDefaulted: false })}
              />
              {current.dueDateDefaulted && <em className="vtr__note">لم يُذكر موعد — بعد ٣ أيام</em>}
            </label>

            <label className="vtr__field">
              <span className="vtr__label">
                <Flag size={13} /> الأولوية
              </span>
              <select
                value={current.priority}
                onChange={(e) => patch(current.key, { priority: e.target.value as VoiceTaskPriority })}
              >
                {(Object.keys(PRIORITY_LABELS) as VoiceTaskPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <textarea
            className="vtr__desc"
            rows={2}
            value={current.description}
            onChange={(e) => patch(current.key, { description: e.target.value })}
            placeholder="الوصف (اختياري)"
            aria-label="وصف المهمة"
          />

          <div className="vtr__subtasks">
            <div className="vtr__subtasks-head">
              <span>الخطوات الفرعية</span>
              <button
                type="button"
                onClick={() => patch(current.key, { subtasks: [...current.subtasks, ''] })}
              >
                <Plus size={12} /> إضافة
              </button>
            </div>
            {current.subtasks.length === 0 ? (
              <p className="vtr__empty">لا خطوات — المهمة بسيطة</p>
            ) : (
              current.subtasks.map((s, i) => (
                <div className="vtr__subtask" key={i}>
                  <span className="vtr__subtask-num">{i + 1}</span>
                  <input
                    value={s}
                    onChange={(e) => {
                      const next = [...current.subtasks];
                      next[i] = e.target.value;
                      patch(current.key, { subtasks: next });
                    }}
                    aria-label={`الخطوة ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch(current.key, { subtasks: current.subtasks.filter((_, j) => j !== i) })
                    }
                    aria-label="حذف الخطوة"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {multi && (
            <button type="button" className="vtr__drop" onClick={() => removeCard(current.key)}>
              <Trash2 size={12} /> احذف هذه البطاقة من الدفعة
            </button>
          )}
        </div>

        {/* نقاط البطاقات — المرئيّة منها مُعلَّمة */}
        {multi && (
          <div className="vtr__dots" role="tablist" aria-label="البطاقات">
            {drafts.map((d, i) => (
              <button
                key={d.key}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`البطاقة ${i + 1}`}
                className={`vtr__dot${i === index ? ' is-current' : ''}${seen.has(d.key) ? ' is-seen' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        )}

        {/* شريط الصوت والأزرار */}
        <div className="vtr__foot">
          <div className={`vtr__mic-strip${listen !== 'off' ? ' is-on' : ''}`}>
            <button
              type="button"
              className="vtr__mic"
              onClick={() => (listen === 'off' ? void startListening() : stopListening())}
              disabled={saving || listen === 'interpreting'}
              aria-label={listen === 'off' ? 'تشغيل الأمر الصوتي' : 'إيقاف المايك'}
            >
              {listen === 'interpreting' ? (
                <Loader2 size={14} className="vtr__spin" />
              ) : listen === 'listening' ? (
                <Mic size={14} />
              ) : (
                <MicOff size={14} />
              )}
            </button>
            <span className="vtr__listen-label">{listenLabel}</span>
            {listen === 'listening' && (
              <span className="vtr__level" aria-hidden="true">
                <i style={{ transform: `scaleX(${(0.08 + level * 0.92).toFixed(3)})` }} />
              </span>
            )}
          </div>

          <div className="vtr__actions">
            {multi && (
              <>
                <button
                  type="button"
                  className="vtr__nav"
                  onClick={() => goTo(index - 1)}
                  disabled={index === 0}
                  aria-label="البطاقة السابقة"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  className="vtr__nav"
                  onClick={() => goTo(index + 1)}
                  disabled={index === drafts.length - 1}
                  aria-label="البطاقة التالية"
                >
                  <ChevronLeft size={14} />
                </button>
              </>
            )}
            <button type="button" className="vtr__btn vtr__btn--ghost" onClick={onCancel} disabled={saving}>
              إلغاء
            </button>
            <button
              type="button"
              className="vtr__btn vtr__btn--primary"
              onClick={() => void approve()}
              disabled={saving}
              title={multi && !allSeen ? 'راجع البطاقات كلها أولاً' : undefined}
            >
              {saving ? <Loader2 size={13} className="vtr__spin" /> : <Check size={13} />}
              {multi && !allSeen ? `بقيت ${unseenCount} للمراجعة` : approveLabel}
            </button>
          </div>
        </div>

        {(heard || hint) && (
          <p className="vtr__feedback" aria-live="polite">
            {heard && <span className="vtr__heard">«{heard}»</span>}
            {hint}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default VoiceTaskReview;
