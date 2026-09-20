import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Mic, Check, ChevronUp, Loader2, X, Copy, EyeOff, Eye } from 'lucide-react';
import { startAudioRecording } from '../../../utils/audioRecorder';
import type { AudioRecording } from '../../../utils/audioRecorder';
import { dictate } from '../../../services/dictationService';
import {
  PROFILE_LABELS,
  PROFILE_ORDER,
  detectProfile,
  getProfileOverride,
  isSingleLine,
  resolveDictationTarget,
  setProfileOverride,
} from './dictationContext';
import type { DictationProfile } from './dictationContext';
import { insertDictatedText, saveCaret, textBeforeCaret } from './insertText';
import type { SavedCaret } from './insertText';

/**
 * «الإملاء الذكي» — تحدّث لا تكتب.
 *
 * كبسولة أسفل الشاشة تظهر حين يقف المؤشر في حقل كتابة، في أي صفحة وأي مودال:
 * Alt+M باستمرار = تسجيل والإفلات = كتابة · نقرة سريعة على Alt+M = تسجيل حرّ ينتهي بنقرة ثانية.
 * الصياغة تتبع نوع الحقل (واتساب / مذكرة / مهمة…) ويمكن تبديلها من الكبسولة فيُحفظ الاختيار للحقل.
 *
 * مركَّب مرة واحدة في Layout لمستخدمي المكتب (لا العميل)، ويُرسم عبر portal فوق المودالات.
 */

type Phase = 'idle' | 'recording' | 'processing' | 'success';

const MAX_RECORDING_MS = 180_000; // 3 دقائق — حد الخادم 10MB يغطيها
const MIN_RECORDING_MS = 600;
/** أقل من هذا = نقرة (تسجيل حرّ)، وأكثر = ضغط مستمر (الإفلات ينهي) */
const HOLD_THRESHOLD_MS = 450;
const BAR_COUNT = 22;
/** موضع الكبسولة فوق BottomActionBar — يطابق ‎.smart-dictation { bottom } في الستايل */
const BASE_BOTTOM_PX = 42;
/**
 * الكبسولة تظهر بعد التركيز بمهلة لا معه: التركيز يقع غالباً في لحظة حركة دخول مودال (150–300ms)،
 * وأي عمل متزامن فيها (رسم + قياس يجبر المتصفح على حساب تخطيط الصفحة كلها) يُسقط إطارات الحركة
 * فيبدو «وميضاً» — قيس ~55ms في صفحة ثقيلة. Alt+M لا ينتظر المهلة (يقرأ الحقل النشط مباشرة).
 */
const SHOW_DELAY_MS = 260;
/** قياس العوائق يمسح المستند كله — دوري متباعد وفي وقت فراغ المتصفح لا في لحظة التفاعل */
const MEASURE_INTERVAL_MS = 1500;

const whenIdle = (fn: () => void): (() => void) => {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout: 500 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 60);
  return () => window.clearTimeout(id);
};
/**
 * ودجتات تشغل أسفل الشاشة: «اسألني» في المذكرات والمفكرة (وسط الأسفل)، مهمة بالصوت، مجموعة الودجتات
 * العائمة، دردشة الفريق، شريط الرفع. الكبسولة ترتفع فوق ما يقع تحتها بدل أن تغطيه.
 * أي ودجت جديد يكفيه الوسم data-dictation-avoid.
 */
const AVOID_SELECTOR =
  '.notebook-ai-widget, .voice-task-widget, .floating-widgets-group, .team-chat-dock, .team-chat-panel, .upload-dock, [data-dictation-avoid]';

const PILL_HIDDEN_KEY = 'smart_dictation_pill_hidden';
const TIP_SEEN_KEY = 'smart_dictation_tip_seen';
const DISABLED_KEY = 'smart_dictation_disabled';

const readFlag = (storage: Storage | undefined, key: string): boolean => {
  try {
    return storage?.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeFlag = (storage: Storage | undefined, key: string, on: boolean): void => {
  try {
    if (on) storage?.setItem(key, '1');
    else storage?.removeItem(key);
  } catch {
    /* تخزين محجوب */
  }
};

const isHotkey = (e: KeyboardEvent): boolean =>
  e.code === 'KeyM' && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;

interface SmartDictationWidgetProps {
  /** عرض الشريط الجانبي — الكبسولة تتوسّط منطقة المحتوى لا الشاشة كلها */
  sidebarWidth: number;
}

const SmartDictationWidget: React.FC<SmartDictationWidgetProps> = ({ sidebarWidth }) => {
  const { pathname } = useLocation();

  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [handsFree, setHandsFree] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [override, setOverride] = useState<DictationProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pillHidden, setPillHidden] = useState(() => readFlag(window.localStorage, PILL_HIDDEN_KEY));
  const [disabled, setDisabled] = useState(() => readFlag(window.sessionStorage, DISABLED_KEY));
  const [showTip, setShowTip] = useState(false);
  /** نص عاد والحقل اختفى (أُغلق المودال أثناء المعالجة) — يُعرض للنسخ بدل أن يضيع */
  const [orphanText, setOrphanText] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  /** مقدار الرفع فوق ودجت يشغل الموضع نفسه */
  const [lift, setLift] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const profileRef = useRef<DictationProfile>('general');
  const menuOpenRef = useRef(false);

  const recordingRef = useRef<AudioRecording | null>(null);
  const sessionTargetRef = useRef<HTMLElement | null>(null);
  const caretRef = useRef<SavedCaret>(null);
  const startedAtRef = useRef(0);
  const startingRef = useRef(false);
  /** طلب إيقاف وصل قبل أن يجهز المايك: released = أُفلت المفتاح، cancelled = Escape/زر الإلغاء */
  const abortStartRef = useRef<'released' | 'cancelled' | null>(null);
  const keyHeldRef = useRef(false);
  const keyDownAtRef = useRef(0);
  const ignoreKeyUpRef = useRef(false);

  const maxTimerRef = useRef<number | undefined>(undefined);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const showTimerRef = useRef<number | undefined>(undefined);
  const rafRef = useRef<number | undefined>(undefined);
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const levelsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));
  const finishRef = useRef<() => void>(() => {});

  const autoProfile: DictationProfile = target ? detectProfile(target, pathname) : 'general';
  const profile = override ?? autoProfile;

  targetRef.current = target;
  phaseRef.current = phase;
  profileRef.current = profile;
  menuOpenRef.current = menuOpen;

  // ─── تتبّع الحقل النشط ───

  const clearHideTimer = () => {
    if (hideTimerRef.current !== undefined) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = undefined;
    }
  };

  const clearShowTimer = () => {
    if (showTimerRef.current !== undefined) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = undefined;
    }
  };

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    clearShowTimer();
    hideTimerRef.current = window.setTimeout(() => {
      if (menuOpenRef.current) return;
      if (!resolveDictationTarget(document.activeElement)) setTarget(null);
    }, 180);
  }, []);

  useEffect(() => {
    if (disabled) return;

    const onFocusIn = (e: FocusEvent) => {
      const el = resolveDictationTarget(e.target);
      if (el) {
        clearHideTimer();
        clearShowTimer();
        // الكبسولة ظاهرة أصلاً (انتقال بين حقلين): حدّث فوراً. وإلا فبعد المهلة — انظر SHOW_DELAY_MS
        if (targetRef.current) {
          setTarget(el);
        } else {
          showTimerRef.current = window.setTimeout(() => {
            showTimerRef.current = undefined;
            if (el.isConnected && resolveDictationTarget(document.activeElement) === el) setTarget(el);
          }, SHOW_DELAY_MS);
        }
      } else {
        scheduleHide();
      }
    };

    const onFocusOut = (e: FocusEvent) => {
      const el = targetRef.current;
      // المؤشر يُحفظ لحظة خروج التركيز — الإدراج يعود إليه ولو نقر المستخدم خارج الحقل أثناء الكلام
      if (el && e.target instanceof Node && el.contains(e.target)) {
        const caret = saveCaret(el);
        if (caret) caretRef.current = caret;
      }
      scheduleHide();
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    const initial = resolveDictationTarget(document.activeElement);
    if (initial) setTarget(initial);

    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      clearHideTimer();
      clearShowTimer();
    };
  }, [disabled, scheduleHide]);

  // حقل أُزيل من الصفحة (أُغلق مودال) لا يطلق focusout في كروم — فحص خفيف يُخفي الكبسولة اليتيمة
  useEffect(() => {
    if (!target || phase !== 'idle') return;
    const id = window.setInterval(() => {
      if (!target.isConnected) setTarget(null);
    }, 1000);
    return () => window.clearInterval(id);
  }, [target, phase]);

  useEffect(() => {
    setOverride(target ? getProfileOverride(target, pathname) : null);
    setMenuOpen(false);
  }, [target, pathname]);

  // ─── الموجة الحيّة ───

  const stopMeter = () => {
    if (rafRef.current !== undefined) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = undefined;
    }
  };

  const startMeter = (recording: AudioRecording) => {
    stopMeter();
    levelsRef.current = new Array(BAR_COUNT).fill(0);
    let lastPush = 0;
    let lastSecond = -1;

    const tick = (now: number) => {
      if (now - lastPush > 55) {
        lastPush = now;
        const levels = levelsRef.current;
        levels.push(recording.getLevel());
        levels.shift();
        for (let i = 0; i < BAR_COUNT; i++) {
          const bar = barsRef.current[i];
          if (bar) bar.style.transform = `scaleY(${(0.12 + levels[i] * 0.88).toFixed(3)})`;
        }
        const second = Math.floor((Date.now() - startedAtRef.current) / 1000);
        if (second !== lastSecond) {
          lastSecond = second;
          setElapsed(second);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const clearMaxTimer = () => {
    if (maxTimerRef.current !== undefined) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = undefined;
    }
  };

  // ─── دورة التسجيل ───

  const startRecording = useCallback(async () => {
    if (phaseRef.current !== 'idle' || startingRef.current) return;

    // الكبسولة تتأخر عن التركيز (SHOW_DELAY_MS) — الاختصار يقرأ الحقل النشط مباشرة فلا ينتظرها
    const el = targetRef.current?.isConnected ? targetRef.current : resolveDictationTarget(document.activeElement);
    if (!el || !el.isConnected) {
      toast.info('ضع المؤشر في حقل كتابة ثم اضغط Alt + M');
      return;
    }

    if (targetRef.current !== el) {
      clearShowTimer();
      setTarget(el);
    }
    sessionTargetRef.current = el;
    caretRef.current = saveCaret(el);
    startingRef.current = true;
    abortStartRef.current = null;
    setOrphanText(null);
    setMenuOpen(false);
    setElapsed(0);
    setPhase('recording'); // فوراً — إذن الميكروفون قد يتأخر

    try {
      const recording = await startAudioRecording();
      startingRef.current = false;

      // أُفلت المفتاح (ضغطة مستمرة) قبل أن يجهز المايك — لا صوت يُرسل؛ وإلا بقي التسجيل دائراً بلا من يوقفه
      if (abortStartRef.current) {
        recording.cancel();
        setPhase('idle');
        if (abortStartRef.current === 'released') toast.info('أبقِ Alt + M مضغوطاً وأنت تتكلم، ثم أفلت');
        return;
      }

      recordingRef.current = recording;
      startedAtRef.current = Date.now();
      startMeter(recording);
      maxTimerRef.current = window.setTimeout(() => finishRef.current(), MAX_RECORDING_MS);
    } catch (err) {
      startingRef.current = false;
      setPhase('idle');
      const denied =
        err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      toast.error(denied ? 'يلزم السماح بالوصول للميكروفون لاستخدام الإملاء' : 'تعذّر تشغيل الميكروفون');
    }
  }, []);

  const finishRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording || phaseRef.current !== 'recording') return;
    recordingRef.current = null;
    clearMaxTimer();
    stopMeter();
    setHandsFree(false);

    // نقرة عابرة — تجاهل بدل إرسال صمت
    if (Date.now() - startedAtRef.current < MIN_RECORDING_MS) {
      recording.cancel();
      setPhase('idle');
      return;
    }

    const el = sessionTargetRef.current;
    setPhase('processing');

    try {
      const wav = await recording.stop();
      if (!el) throw new Error('لا يوجد حقل للكتابة');

      // المؤشر الحيّ إن بقي التركيز في الحقل (ربما تحرّك أثناء الكلام)، وإلا المحفوظ عند الخروج
      const focused = document.activeElement === el || el.contains(document.activeElement);
      const caret = (focused ? saveCaret(el) : null) ?? caretRef.current;

      const result = await dictate(wav, {
        profile: profileRef.current,
        precedingText: el.isConnected ? textBeforeCaret(el, caret) : '',
        singleLine: isSingleLine(el),
      });

      if (!insertDictatedText(el, result.text, caret)) {
        setOrphanText(result.text);
      }

      writeFlag(window.localStorage, TIP_SEEN_KEY, true);
      setShowTip(false);
      setPhase('success');
      window.setTimeout(() => setPhase((p) => (p === 'success' ? 'idle' : p)), 1100);
    } catch (err) {
      setPhase('idle');
      if ((err as { errorCode?: string })?.errorCode === 'DICTATION_DISABLED') {
        // الخادم مطفأ الإملاء (تثبيت خاص) — لا نعرض الودجت ثانية في هذه الجلسة
        writeFlag(window.sessionStorage, DISABLED_KEY, true);
        setDisabled(true);
      }
      toast.error(err instanceof Error ? err.message : 'تعذّر تحويل التسجيل إلى نص');
    }
  }, []);

  finishRef.current = () => void finishRecording();

  const cancelRecording = useCallback(() => {
    if (startingRef.current) abortStartRef.current = 'cancelled';
    recordingRef.current?.cancel();
    recordingRef.current = null;
    clearMaxTimer();
    stopMeter();
    setHandsFree(false);
    if (!startingRef.current) setPhase('idle');
  }, []);

  // ─── الاختصار: Alt+M (capture — يعمل داخل المحررات والمودالات) ───

  useEffect(() => {
    if (disabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phaseRef.current === 'recording') {
        // Escape يلغي التسجيل وحده — لا يصل إلى المودال فيُغلقه ويضيع ما كُتب
        e.preventDefault();
        e.stopPropagation();
        cancelRecording();
        return;
      }

      if (!isHotkey(e)) return;
      if (phaseRef.current === 'idle' && !targetRef.current) {
        // لا حقل نشطاً — نترك المفتاح للمتصفح إلا أننا ننبّه مرة
        if (!e.repeat) toast.info('ضع المؤشر في حقل كتابة ثم اضغط Alt + M');
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;

      if (phaseRef.current === 'idle') {
        keyHeldRef.current = true;
        ignoreKeyUpRef.current = false;
        keyDownAtRef.current = Date.now();
        void startRecording();
      } else if (phaseRef.current === 'recording') {
        // النقرة الثانية تنهي التسجيل الحرّ — وإفلاتها لا يعني شيئاً
        ignoreKeyUpRef.current = true;
        void finishRecording();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' && e.key !== 'Alt') return;

      if (ignoreKeyUpRef.current) {
        if (e.code === 'KeyM') ignoreKeyUpRef.current = false;
        return;
      }
      if (!keyHeldRef.current) return;
      keyHeldRef.current = false;
      e.preventDefault();

      if (Date.now() - keyDownAtRef.current < HOLD_THRESHOLD_MS) {
        setHandsFree(true); // نقرة: يبقى يسجّل حتى نقرة ثانية
        return;
      }
      if (startingRef.current) abortStartRef.current = 'released';
      else void finishRecording();
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [disabled, startRecording, finishRecording, cancelRecording]);

  // تنظيف عند الخروج
  useEffect(
    () => () => {
      recordingRef.current?.cancel();
      clearMaxTimer();
      stopMeter();
      clearHideTimer();
      clearShowTimer();
      document.body.classList.remove('smart-dictation-visible');
    },
    [],
  );

  // لوحة مفاتيح الجوال تغطي أسفل الشاشة — نرفع الكبسولة فوقها
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setKeyboardOffset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  const busy = phase !== 'idle';
  const visible = !disabled && (busy || orphanText !== null || (!!target && !pillHidden));

  // الشاشات الصغيرة: ودجت «مهمة بالصوت» يشغل وسط الأسفل نفسه — يتنحّى ما دامت الكبسولة ظاهرة
  useEffect(() => {
    document.body.classList.toggle('smart-dictation-visible', visible);
  }, [visible]);

  // لا تغطِّ ودجتاً آخر: نقيس ما يتقاطع مع موضع الكبسولة ونرفعها فوقه. القياس دوري ما دامت ظاهرة
  // لأن تلك الودجتات تظهر وتختفي (شريط «اسألني» يُفتح ويُغلق، لوحة الدردشة تتمدد).
  useEffect(() => {
    if (!visible) {
      setLift(0);
      return;
    }

    const measure = () => {
      const pill = rootRef.current?.querySelector<HTMLElement>('.smart-dictation__pill');
      if (!pill) return;

      // الموضع من التخطيط لا من getBoundingClientRect: حركة الظهور (translateY) تزيّف القياس الرأسي
      const { left, right } = pill.getBoundingClientRect();
      const height = pill.offsetHeight;
      const baseBottom = window.innerHeight - BASE_BOTTOM_PX - keyboardOffset;
      const obstacles = Array.from(document.querySelectorAll<HTMLElement>(AVOID_SELECTOR))
        .map((node) => node.getBoundingClientRect())
        .filter((o) => o.width > 0 && o.height > 0 && o.left < right + 8 && o.right > left - 8);

      // رفعٌ قد يُدخل الكبسولة في ودجت أعلى — نكرر حتى تستقر
      let next = 0;
      for (let pass = 0; pass < 4; pass++) {
        const bottom = baseBottom - next;
        const top = bottom - height;
        const hit = obstacles.find((o) => o.top < bottom + 6 && o.bottom > top - 6);
        if (!hit) break;
        next = baseBottom - (hit.top - 10);
      }

      // ودجت يملأ نصف الشاشة (لوحة دردشة على جوال) لا مهرب منه — نبقى في الموضع الأصلي
      if (next < 0 || next > window.innerHeight * 0.5) next = 0;
      setLift((current) => (Math.abs(current - next) < 1 ? current : Math.round(next)));
    };

    // لا قياس متزامناً مع الظهور: القراءة تجبر المتصفح على حساب تخطيط الصفحة كلها في لحظة التفاعل
    let cancelIdle = whenIdle(measure);
    const id = window.setInterval(() => {
      if (document.hidden) return;
      cancelIdle();
      cancelIdle = whenIdle(measure);
    }, MEASURE_INTERVAL_MS);
    window.addEventListener('resize', measure);
    return () => {
      cancelIdle();
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
    };
  }, [visible, phase, target, keyboardOffset]);

  // تلميح أول مرة — يختفي وحده، ولا يعود بعد أول إملاء ناجح
  useEffect(() => {
    if (!target || pillHidden || readFlag(window.localStorage, TIP_SEEN_KEY)) return;
    setShowTip(true);
    const id = window.setTimeout(() => {
      setShowTip(false);
      writeFlag(window.localStorage, TIP_SEEN_KEY, true);
    }, 9000);
    return () => window.clearTimeout(id);
  }, [target, pillHidden]);

  if (disabled) return null;

  // ─── أحداث الكبسولة ───

  /** النقر على الكبسولة لا يسحب التركيز من الحقل، ولا يصل إلى مستمعي «النقر خارجاً» فيُغلقوا المودال */
  const keepFocus = (e: React.MouseEvent) => {
    // النص اليتيم يبقى قابلاً للتحديد والنسخ اليدوي
    if (!(e.target as HTMLElement).closest('.smart-dictation__orphan p')) e.preventDefault();
    e.stopPropagation();
  };

  const handleMicClick = () => {
    if (phaseRef.current === 'idle') {
      if (targetRef.current) setHandsFree(true);
      void startRecording();
    } else if (phaseRef.current === 'recording') {
      void finishRecording();
    }
  };

  const chooseProfile = (next: DictationProfile | null) => {
    if (target) setProfileOverride(target, pathname, next);
    setOverride(next);
    setMenuOpen(false);
  };

  const togglePillHidden = (hidden: boolean) => {
    writeFlag(window.localStorage, PILL_HIDDEN_KEY, hidden);
    setPillHidden(hidden);
    setMenuOpen(false);
    if (hidden) toast.info('أُخفي الشريط — الاختصار Alt + M ما زال يعمل في أي حقل كتابة');
  };

  const copyOrphan = async () => {
    if (!orphanText) return;
    try {
      await navigator.clipboard.writeText(orphanText);
      toast.success('نُسخ النص');
      setOrphanText(null);
    } catch {
      toast.error('تعذّر النسخ — حدّد النص وانسخه يدوياً');
    }
  };

  const mini = !busy && !!target && isSingleLine(target);
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, '0');

  const micLabel =
    phase === 'recording' ? 'إنهاء وكتابة النص' : phase === 'processing' ? 'يكتب…' : 'تحدّث لا تكتب — ابدأ الإملاء';

  return createPortal(
    <div
      ref={rootRef}
      className="smart-dictation"
      data-phase={phase}
      data-visible={visible}
      data-variant={mini ? 'mini' : 'full'}
      style={
        {
          '--sd-sidebar': `${sidebarWidth}px`,
          '--sd-keyboard': `${keyboardOffset}px`,
          '--sd-lift': `${lift}px`,
        } as React.CSSProperties
      }
      onMouseDown={keepFocus}
      onPointerDown={(e) => e.stopPropagation()}
      aria-hidden={!visible}
    >
      {showTip && phase === 'idle' && !mini && (
        <div className="smart-dictation__tip" role="note">
          اضغط <kbd>Alt</kbd> + <kbd>M</kbd> باستمرار وتكلّم ثم أفلت — أو نقرة سريعة لتسجيل حرّ ينتهي بنقرة ثانية.
        </div>
      )}

      {orphanText !== null && (
        <div className="smart-dictation__orphan">
          <p>{orphanText}</p>
          <div className="smart-dictation__orphan-actions">
            <span>أُغلق الحقل قبل وصول النص</span>
            <button type="button" onClick={copyOrphan}>
              <Copy size={13} /> نسخ
            </button>
            <button type="button" onClick={() => setOrphanText(null)} aria-label="إغلاق">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {menuOpen && phase === 'idle' && (
        <div className="smart-dictation__menu" role="menu" aria-label="نمط الصياغة">
          <div className="smart-dictation__menu-title">صياغة النص في هذا الحقل</div>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={override === null}
            className="smart-dictation__menu-item"
            onClick={() => chooseProfile(null)}
          >
            <span>تلقائي — {PROFILE_LABELS[autoProfile]}</span>
            {override === null && <Check size={14} />}
          </button>
          <div className="smart-dictation__menu-sep" />
          {PROFILE_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              role="menuitemradio"
              aria-checked={override === key}
              className="smart-dictation__menu-item"
              onClick={() => chooseProfile(key)}
            >
              <span>{PROFILE_LABELS[key]}</span>
              {override === key && <Check size={14} />}
            </button>
          ))}
          <div className="smart-dictation__menu-sep" />
          <button type="button" className="smart-dictation__menu-item is-muted" onClick={() => togglePillHidden(true)}>
            <span>إخفاء الشريط (يبقى Alt + M)</span>
            <EyeOff size={14} />
          </button>
        </div>
      )}

      <div className="smart-dictation__pill">
        <button
          type="button"
          className="smart-dictation__mic"
          onClick={handleMicClick}
          disabled={phase === 'processing' || phase === 'success'}
          aria-label={micLabel}
          title={`${micLabel} (Alt + M)`}
        >
          {phase === 'processing' ? (
            <Loader2 size={14} className="smart-dictation__spin" />
          ) : phase === 'success' ? (
            <Check size={14} />
          ) : (
            <Mic size={14} />
          )}
        </button>

        {phase === 'idle' && !mini && (
          <>
            <span className="smart-dictation__slogan">تحدّث لا تكتب</span>
            <button
              type="button"
              className="smart-dictation__profile"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="نمط الصياغة — اضغط للتغيير"
            >
              {PROFILE_LABELS[profile]}
              <ChevronUp size={12} />
            </button>
          </>
        )}

        {phase === 'idle' && (
          <span className="smart-dictation__keys" aria-hidden="true">
            <kbd>Alt</kbd>
            <kbd>M</kbd>
          </span>
        )}

        {phase === 'recording' && (
          <>
            <div className="smart-dictation__wave" aria-hidden="true">
              {Array.from({ length: BAR_COUNT }, (_, i) => (
                <span
                  key={i}
                  ref={(node) => {
                    barsRef.current[i] = node;
                  }}
                />
              ))}
            </div>
            <span className="smart-dictation__timer">
              {minutes}:{seconds}
            </span>
            <span className="smart-dictation__hint">{handsFree ? 'انقر للكتابة' : 'أفلت للكتابة'}</span>
            <button
              type="button"
              className="smart-dictation__cancel"
              onClick={cancelRecording}
              aria-label="إلغاء التسجيل"
              title="إلغاء (Esc)"
            >
              <X size={12} />
            </button>
          </>
        )}

        {phase === 'processing' && (
          <span className="smart-dictation__status" aria-live="polite">
            يكتب بصيغة «{PROFILE_LABELS[profile]}»…
          </span>
        )}

        {phase === 'success' && (
          <span className="smart-dictation__status" aria-live="polite">
            {orphanText !== null ? 'النص جاهز للنسخ' : 'كُتب النص'}
          </span>
        )}

        {pillHidden && busy && (
          <button
            type="button"
            className="smart-dictation__cancel"
            onClick={() => togglePillHidden(false)}
            aria-label="إظهار الشريط دائماً"
            title="إظهار الشريط دائماً"
          >
            <Eye size={12} />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default SmartDictationWidget;
