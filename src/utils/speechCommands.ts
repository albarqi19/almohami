import { classifyVoiceCommand } from './voiceIntent';
import type { VoiceIntent } from './voiceIntent';

/**
 * الاستماع للأوامر القصيرة عبر **تعرّف المتصفح على الكلام** — بلا رفع صوتٍ ولا نموذج.
 *
 * `SpeechRecognition` يعطي نتائجَ **مبدئية** أثناء الكلام، فنصنّف كلَّ نتيجةٍ فور وصولها:
 * «اعتمد» تُنفَّذ في اللحظة التي تُنطق فيها لا بعد رفع ملفٍ وانتظار ردّ. والنصُّ المبدئيّ
 * يُعرض للمستخدم أيضاً، فيرى كلماته تُكتب ويعرف أن المايك يسمعه فعلاً.
 *
 * وليس مدعوماً في كل متصفح (فايرفوكس بلا دعم) — لذلك يعيد `null` عند عدم الدعم،
 * فينتقل النداء إلى المسار الاحتياطي (تسجيل + `ai/voice-command` في الخادم).
 *
 * 🔒 وما يُسمع هنا **كلماتُ أوامرٍ وحدها** («اعتمد»، «التالي»، «ألغِ») لا محتوى المهمة:
 * التسجيلُ الأصليّ وحده هو الذي يمرّ على نموذج الصوت. وكروم ينفّذ التعرّف عبر خدمته،
 * فحصرُ ما يصلها في كلمةِ أمرٍ واحدة مقصودٌ لا عارض — ولا يُمرَّر إليها نصُّ البطاقة.
 */

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { readonly length: number; [index: number]: SpeechRecognitionResultLike };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getCtor = (): SpeechRecognitionCtor | null => {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const isSpeechCommandSupported = (): boolean => getCtor() !== null;

export interface SpeechCommandListener {
  stop: () => void;
}

interface SpeechCommandOptions {
  /** نيّةٌ فُهمت — تُنفَّذ فوراً */
  onCommand: (intent: VoiceIntent, transcript: string) => void;
  /** ما يُسمع الآن (نتيجة مبدئية) — للعرض الحيّ */
  onInterim?: (text: string) => void;
  /** كلامٌ انتهى ولم يُفهم منه أمر */
  onUnrecognized?: (text: string) => void;
  /** المحرّك سقط نهائياً (إذنٌ محجوب أو تعذّرت الخدمة) — على النداء أن يتدبّر بديلاً */
  onFailure?: (reason: 'denied' | 'unavailable') => void;
  /** تبدّل حالة الإصغاء الفعلي */
  onActive?: (active: boolean) => void;
}

/** إعادةُ تشغيلٍ متلاحقةٌ بلا إصغاءٍ فعليّ = محرّكٌ لا يعمل، فلا ندور بلا نهاية */
const MAX_RESTARTS = 8;
const RESTART_WINDOW_MS = 6000;

export function startSpeechCommandListener(options: SpeechCommandOptions): SpeechCommandListener | null {
  const Ctor = getCtor();
  if (!Ctor) return null;

  const { onCommand, onInterim, onUnrecognized, onFailure, onActive } = options;

  let recognition: SpeechRecognitionLike | null = new Ctor();
  let stopped = false;
  let restarts = 0;
  let windowStartedAt = Date.now();
  /** آخر نتيجةٍ نُفِّذ منها أمر — كي لا تُعاد النيّة نفسها مع النتيجة النهائية */
  let firedIndex = -1;

  recognition.lang = 'ar-SA';
  recognition.continuous = true;
  recognition.interimResults = true;
  // بدائلُ التعرّف: «اعتمد» قد تأتي ثانيةً في الترتيب وأولاها كلمةٌ أخرى قريبة
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    onActive?.(true);
  };

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (i <= firedIndex) continue;

      const result = event.results[i];
      let best = '';

      for (let a = 0; a < result.length; a++) {
        const text = result[a]?.transcript ?? '';
        if (!best) best = text;

        const intent = classifyVoiceCommand(text);
        if (intent !== 'unknown') {
          firedIndex = i;
          onCommand(intent, text.trim());
          return;
        }
      }

      if (result.isFinal) {
        firedIndex = i;
        if (best.trim()) onUnrecognized?.(best.trim());
      } else if (best.trim()) {
        onInterim?.(best.trim());
      }
    }
  };

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      stopped = true;
      onActive?.(false);
      onFailure?.('denied');
      return;
    }
    // 'no-speech' و'aborted' و'network' عابرة — onend يتولّى إعادة التشغيل
  };

  recognition.onend = () => {
    onActive?.(false);
    if (stopped || !recognition) return;

    const now = Date.now();
    if (now - windowStartedAt > RESTART_WINDOW_MS) {
      windowStartedAt = now;
      restarts = 0;
    }

    if (++restarts > MAX_RESTARTS) {
      stopped = true;
      onFailure?.('unavailable');
      return;
    }

    try {
      recognition.start();
    } catch {
      // start أثناء تشغيلٍ قائم يرمي — نتجاهل، فالجلسة حيّة أصلاً
    }
  };

  try {
    recognition.start();
  } catch {
    recognition = null;
    return null;
  }

  return {
    stop: () => {
      stopped = true;
      const instance = recognition;
      recognition = null;
      if (!instance) return;
      instance.onresult = null;
      instance.onend = null;
      instance.onerror = null;
      instance.onstart = null;
      try {
        instance.abort();
      } catch {
        /* أُوقف أصلاً */
      }
      onActive?.(false);
    },
  };
}
