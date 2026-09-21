import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mic, UserRound, CalendarClock, ListTodo, Keyboard, ClipboardCheck, Zap } from 'lucide-react';
import PersonaHalo from './PersonaHalo';
import type { PersonaState } from './PersonaHalo';
import VoiceTaskReview from './VoiceTaskReview';
import { startAudioRecording } from '../../utils/audioRecorder';
import type { AudioRecording } from '../../utils/audioRecorder';
import { TaskService } from '../../services/taskService';
import type { VoiceTaskPreview } from '../../services/taskService';

/**
 * ويدجت «مهمة بالصوت» — يثبت أسفل وسط صفحة المهام.
 *
 * نقرة = بدء/إيقاف التسجيل، أو إبقاء زر M مضغوطاً للتسجيل والإفلات للتحويل.
 * الذكاء يفرّغ الكلام ويستخرج المهمة (أو المهام) ومهامَّها الفرعية والمُسنَد إليه والاستحقاق.
 *
 * ثم **وضعان يختارهما المستخدم**:
 *  - «مراجعة» (الافتراضي): تُعرض بطاقةٌ بما فُهم، يعتمدها بصوته («اعتمد») أو بيده بعد تعديلها.
 *  - «سريع»: تُنشأ فوراً بلا بطاقة — لمن يثق بالتسجيل ويريد السرعة.
 *
 * والافتراضُ مراجعةٌ لا سرعة: كلمةٌ أُسيء سماعُها في الوضع السريع تصير مهمّةً في قائمة
 * المكتب وتكليفاً لشخصٍ خطأ وإشعاراً وصل فعلاً — والسرعةُ اختيارٌ واعٍ لا مفاجأة.
 */

type WidgetPhase = 'idle' | 'recording' | 'processing' | 'success';
type VoiceMode = 'review' | 'fast';

const MAX_RECORDING_MS = 120_000; // دقيقتان
const MIN_RECORDING_MS = 600;
// نافذة التعريف بالميزة — تُعرض مرة واحدة فقط (localStorage، بلا باك).
// v2: تغيّر المسلك (مراجعة قبل الاعتماد + عدّة مهام) فيُعاد التعريف مرّةً لمن رأى القديم.
const INTRO_SEEN_KEY = 'voice_task_intro_seen_v2';
const MODE_KEY = 'voice_task_mode';

const hasSeenIntro = (): boolean => {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return true; // تخزين محجوب؟ لا نزعج المستخدم بالنافذة كل مرة
  }
};

const markIntroSeen = (): void => {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* تجاهل — وضع خاص */
  }
};

const readMode = (): VoiceMode => {
  try {
    return localStorage.getItem(MODE_KEY) === 'fast' ? 'fast' : 'review';
  } catch {
    return 'review';
  }
};

const writeMode = (mode: VoiceMode): void => {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* تخزين محجوب */
  }
};

const PHASE_TO_PERSONA: Record<WidgetPhase, PersonaState> = {
  idle: 'idle',
  recording: 'listening',
  processing: 'thinking',
  success: 'speaking',
};

const PHASE_LABEL: Record<WidgetPhase, string> = {
  idle: 'سجّل مهمة',
  recording: 'يستمع… أفلت أو انقر للإنهاء',
  processing: 'جارٍ فهم التسجيل…',
  success: 'تم ✓',
};

interface VoiceTaskWidgetProps {
  onTaskCreated?: () => void;
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
};

/** إعلان الميزة وشرحها المبسّط — يظهر أول زيارة فقط، «فهمت» يخفيه نهائياً */
const VoiceTaskIntro: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <div className="voice-task-intro-overlay" onClick={onDismiss}>
    <div className="voice-task-intro" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
      {/* الهالة كخلفية كبيرة للمودال — شفافة كي لا تزاحم النص */}
      <div className="voice-task-intro__bg" aria-hidden="true">
        <PersonaHalo state="listening" className="voice-task-intro__bg-canvas" />
      </div>

      <h3 className="voice-task-intro__title">أنشئ مهامك بصوتك — وراجعها قبل اعتمادها</h3>
      <p className="voice-task-intro__lead">
        اضغط الزر الدائري أسفل الصفحة (أو اضغط باستمرار على حرف <kbd>M</kbd>)، قل ما تريد بكلامك
        العادي، ثم أفلت — تظهر لك بطاقة بما فُهم، تعدّلها إن شئت، وتقول <strong>«اعتمد»</strong> فتُنشأ.
      </p>

      <div className="voice-task-intro__tips">
        <div className="voice-task-intro__tip">
          <ClipboardCheck size={14} />
          <div>
            <strong>لا تُنشأ مهمة قبل أن تراها</strong>
            <span>المايك يُفتح تلقائياً بعد البطاقة — قل «اعتمد» أو «ألغِ»</span>
          </div>
        </div>
        <div className="voice-task-intro__tip">
          <ListTodo size={14} />
          <div>
            <strong>عدّة مهام في تسجيل واحد</strong>
            <span>«المهمة الأولى… والثانية…» — تُعرض بطاقات، وقل «التالي» بينها</span>
          </div>
        </div>
        <div className="voice-task-intro__tip">
          <UserRound size={14} />
          <div>
            <strong>للتكليف: اذكر اسم الشخص</strong>
            <span>«كلّف خالد بـ…» — يُطابَق تلقائياً مع فريق المكتب</span>
          </div>
        </div>
        <div className="voice-task-intro__tip">
          <CalendarClock size={14} />
          <div>
            <strong>للموعد: حتى النسبي يُفهم</strong>
            <span>«بكرة»، «بعد أسبوع»، «الخميس الجاي» — تُحسب من تاريخ اليوم</span>
          </div>
        </div>
        <div className="voice-task-intro__tip">
          <Zap size={14} />
          <div>
            <strong>تريد السرعة؟ بدّل الوضع</strong>
            <span>«سريع» يُنشئ فوراً بلا بطاقة — والمفتاح تحت الزر</span>
          </div>
        </div>
        <div className="voice-task-intro__tip">
          <Keyboard size={14} />
          <div>
            <strong>الأسرع: زر M</strong>
            <span>اضغطه باستمرار وأنت تتكلم، وأفلته عند انتهائك</span>
          </div>
        </div>
      </div>

      <button type="button" className="voice-task-intro__cta" onClick={onDismiss}>
        فهمت، يلا نجرب
      </button>
    </div>
  </div>
);

const VoiceTaskWidget: React.FC<VoiceTaskWidgetProps> = ({ onTaskCreated }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<WidgetPhase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro());
  const [mode, setMode] = useState<VoiceMode>(readMode);
  const [preview, setPreview] = useState<VoiceTaskPreview | null>(null);

  const dismissIntro = useCallback(() => {
    markIntroSeen();
    setShowIntro(false);
  }, []);

  const chooseMode = useCallback((next: VoiceMode) => {
    writeMode(next);
    setMode(next);
  }, []);

  const recordingRef = useRef<AudioRecording | null>(null);
  const phaseRef = useRef<WidgetPhase>('idle');
  const modeRef = useRef<VoiceMode>(mode);
  const startedAtRef = useRef(0);
  const startedByKeyRef = useRef(false);
  const maxTimerRef = useRef<number | undefined>(undefined);
  // مرجع حيّ لدالة الإنهاء — يستدعيه مؤقّت الحد الأقصى دون closure قديم
  const finishRef = useRef<() => void>(() => {});

  phaseRef.current = phase;
  modeRef.current = mode;

  const clearMaxTimer = () => {
    if (maxTimerRef.current !== undefined) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = undefined;
    }
  };

  const startRecording = useCallback(async (viaKey: boolean) => {
    if (phaseRef.current !== 'idle') return;
    setPhase('recording'); // فوراً — طلب إذن الميكروفون قد يتأخر
    try {
      recordingRef.current = await startAudioRecording();
      startedAtRef.current = Date.now();
      startedByKeyRef.current = viaKey;
      setElapsed(0);
      // إيقاف تلقائي عند الحد الأقصى
      maxTimerRef.current = window.setTimeout(() => finishRef.current(), MAX_RECORDING_MS);
    } catch (err) {
      setPhase('idle');
      const denied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      toast.error(denied ? 'يلزم السماح بالوصول للميكروفون لتسجيل المهمة' : 'تعذّر تشغيل الميكروفون');
    }
  }, []);

  const finishRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording || phaseRef.current !== 'recording') return;
    recordingRef.current = null;
    clearMaxTimer();

    // تسجيلة خاطفة (نقرة عابرة على M مثلاً) — تجاهل بدل إرسال صمت
    if (Date.now() - startedAtRef.current < MIN_RECORDING_MS) {
      recording.cancel();
      setPhase('idle');
      return;
    }

    setPhase('processing');
    try {
      const wav = await recording.stop();

      if (modeRef.current === 'review') {
        // لا شيء يُكتب بعد: البطاقة تتولّى الاعتماد
        const result = await TaskService.previewVoiceTasks(wav);
        setPhase('idle');
        setPreview(result);
        return;
      }

      const { task, createdCount } = await TaskService.createTaskFromVoice(wav);

      setPhase('success');
      toast.success(
        createdCount > 1
          ? `تم إنشاء ${createdCount} مهام من التسجيل`
          : `تم إنشاء المهمة «${(task as { title?: string }).title ?? ''}»`,
      );
      onTaskCreated?.();

      // لحظة نجاح قصيرة ثم فتح المهمة — والدفعة لا تُفتح
      window.setTimeout(() => {
        setPhase('idle');
        if (createdCount === 1) navigate(`/tasks/${(task as { id: number | string }).id}`);
      }, 900);
    } catch (err) {
      setPhase('idle');
      toast.error(err instanceof Error ? err.message : 'تعذّر فهم التسجيل');
    }
  }, [navigate, onTaskCreated]);

  finishRef.current = () => void finishRecording();

  const cancelRecording = useCallback(() => {
    recordingRef.current?.cancel();
    recordingRef.current = null;
    clearMaxTimer();
    setPhase('idle');
  }, []);

  // نقرة: بدء أو إيقاف
  const handleClick = () => {
    if (phaseRef.current === 'idle') void startRecording(false);
    else if (phaseRef.current === 'recording') void finishRecording();
  };

  const handleApproved = useCallback(
    ({ createdCount, openTaskId }: { createdCount: number; openTaskId: number | string | null }) => {
      setPreview(null);
      onTaskCreated?.();
      // مهمة واحدة تُفتح؛ والدفعة تبقى في القائمة بلا فتح أيٍّ منها
      if (createdCount === 1 && openTaskId != null) navigate(`/tasks/${openTaskId}`);
    },
    [navigate, onTaskCreated],
  );

  // زر M: اضغط باستمرار للتسجيل، أفلت للتحويل — Escape يلغي.
  // معطّل أثناء نافذة التعريف وأثناء بطاقة المراجعة (لها مفاتيحها وتملك Escape).
  useEffect(() => {
    if (showIntro || preview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        void startRecording(true);
      }
      if (e.key === 'Escape' && phaseRef.current === 'recording') {
        cancelRecording();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && startedByKeyRef.current && phaseRef.current === 'recording') {
        e.preventDefault();
        void finishRecording();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [startRecording, finishRecording, cancelRecording, showIntro, preview]);

  // عدّاد المدة أثناء التسجيل
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [phase]);

  // تنظيف عند مغادرة الصفحة
  useEffect(() => () => {
    recordingRef.current?.cancel();
    clearMaxTimer();
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, '0');

  return (
    <>
      {showIntro && <VoiceTaskIntro onDismiss={dismissIntro} />}

      {preview && (
        <VoiceTaskReview
          preview={preview}
          onCancel={() => setPreview(null)}
          onApproved={handleApproved}
        />
      )}

      <div className="voice-task-widget" data-phase={phase}>
        <button
          type="button"
          className="voice-task-widget__button"
          onClick={handleClick}
          disabled={phase === 'processing' || phase === 'success' || !!preview}
          aria-label={PHASE_LABEL[phase]}
          title={`${PHASE_LABEL[phase]} — زر M`}
        >
          <PersonaHalo state={PHASE_TO_PERSONA[phase]} className="voice-task-widget__halo" />
          {phase === 'idle' && <Mic size={16} className="voice-task-widget__mic" />}
        </button>

        <div className="voice-task-widget__caption">
          <span className="voice-task-widget__label">{PHASE_LABEL[phase]}</span>
          {phase === 'recording' && (
            <span className="voice-task-widget__timer">{minutes}:{seconds}</span>
          )}
          {phase === 'idle' && <kbd className="voice-task-widget__kbd">M</kbd>}
        </div>

        {/* الوضع: مراجعة قبل الاعتماد (افتراضي) أو إنشاء فوري */}
        {phase === 'idle' && !preview && (
          <div className="voice-task-widget__mode" role="radiogroup" aria-label="وضع إنشاء المهمة">
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'review'}
              className={mode === 'review' ? 'is-on' : undefined}
              onClick={() => chooseMode('review')}
              title="تظهر بطاقة بما فُهم، تعدّلها وتعتمدها بصوتك"
            >
              <ClipboardCheck size={11} />
              مراجعة
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === 'fast'}
              className={mode === 'fast' ? 'is-on' : undefined}
              onClick={() => chooseMode('fast')}
              title="تُنشأ المهمة فور انتهاء التسجيل بلا اعتماد"
            >
              <Zap size={11} />
              سريع
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default VoiceTaskWidget;
