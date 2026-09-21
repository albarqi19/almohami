/**
 * تسجيل صوت من الميكروفون وتحويله إلى WAV 16kHz أحادي القناة.
 *
 * المتصفحات تسجّل webm/opus (كروم) أو mp4 (سفاري)، بينما نموذج الذكاء عبر OpenRouter
 * يقبل input_audio بصيغة wav/mp3 فقط — لذا نعيد الترميز محلياً عبر Web Audio API:
 * فكّ الترميز ثم إعادة العيّنة إلى 16kHz mono ثم تغليف PCM16 في WAV.
 */

export interface AudioRecording {
  /** يوقف التسجيل ويعيد WAV جاهزاً للرفع */
  stop: () => Promise<Blob>;
  /** يوقف ويتجاهل التسجيل (بلا تحويل) */
  cancel: () => void;
  /** شدّة الصوت اللحظية 0..1 (RMS مضخَّم) — لرسم موجة حيّة تُري المستخدم أن المايك يلتقط */
  getLevel: () => number;
}

/** محلّل شدّة خفيف على مجرى المايك — فشله لا يمنع التسجيل (getLevel يعود 0) */
function createLevelMeter(stream: MediaStream): { getLevel: () => number; dispose: () => void } {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    return {
      getLevel: () => {
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sumSquares += v * v;
        }
        // كلام عادي RMS ≈ 0.05–0.2 — نضخّمه ليملأ المدى البصري
        return Math.min(1, Math.sqrt(sumSquares / data.length) * 4.5);
      },
      dispose: () => void ctx.close().catch(() => {}),
    };
  } catch {
    return { getLevel: () => 0, dispose: () => {} };
  }
}

export async function startAudioRecording(): Promise<AudioRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });

  const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
    .find((t) => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  const meter = createLevelMeter(stream);
  const releaseStream = () => {
    meter.dispose();
    stream.getTracks().forEach((t) => t.stop());
  };

  return {
    getLevel: meter.getLevel,
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        recorder.onstop = async () => {
          releaseStream();
          try {
            const raw = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
            resolve(await encodeWav16kMono(raw));
          } catch (err) {
            reject(err);
          }
        };
        recorder.onerror = () => {
          releaseStream();
          reject(new Error('تعذّر التسجيل من الميكروفون'));
        };
        recorder.stop();
      }),
    cancel: () => {
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {
        /* المسجّل متوقف أصلاً */
      }
      releaseStream();
    },
  };
}

/** نتيجة التقاط أمر قصير — `null` تعني «لم يُنطق شيء» لا عطلاً */
export interface CommandCapture {
  /** يوقف الالتقاط فوراً ويعيد ما سُجّل (أو null إن لم يُسمع كلام) */
  finish: () => Promise<Blob | null>;
  /** يوقف ويتجاهل */
  cancel: () => void;
  getLevel: () => number;
}

interface CommandCaptureOptions {
  /** يُستدعى حين يُغلَق التسجيل تلقائياً بالصمت — القيمة null تعني أنه لم يُسمع كلام أصلاً */
  onAutoStop: (wav: Blob | null) => void;
  /** أقصى مدة انتظار قبل أن يُغلق بلا كلام (افتراضي 6 ثوانٍ) */
  maxIdleMs?: number;
  /** أقصى مدة للأمر نفسه بعد بدء الكلام (افتراضي 8 ثوانٍ) */
  maxSpeechMs?: number;
}

/** فوقها = كلام، وتحتها = صمت. `getLevel` مضخَّم ×4.5 فكلام المكتب العادي ≈ 0.25–0.8 */
const SPEECH_LEVEL = 0.12;
/** صمتٌ بهذا الطول بعد كلامٍ سُمع = انتهى الأمر */
const TRAILING_SILENCE_MS = 850;

/**
 * التقاط **أمر قصير** («اعتمد»، «التالي») بإغلاقٍ تلقائيّ عند الصمت.
 *
 * 🔑 لماذا لا يكفي `startAudioRecording`؟ لأن المستخدم هنا لا يضغط زراً ولا يُفلته: المايك
 * يُفتح من تلقائه بعد ظهور البطاقة، فلا بدّ لشيءٍ أن **يقرّر متى انتهى الكلام**. فنراقب
 * شدّة الصوت: ننتظر أن يرتفع فوق عتبة الكلام، ثم نُغلق بعد ٨٥٠ms من الصمت الذي يليه.
 * وإن لم يُسمع كلامٌ أصلاً خلال ٦ ثوانٍ أُغلق المايك بلا إرسال — لا نُنفق نداءَ نموذجٍ
 * على غرفةٍ صامتة، ولا نترك المايكَ مفتوحاً على مكتبٍ فيه محادثة.
 */
export async function startCommandCapture(options: CommandCaptureOptions): Promise<CommandCapture> {
  const { onAutoStop, maxIdleMs = 6000, maxSpeechMs = 8000 } = options;
  const recording = await startAudioRecording();

  let heardSpeech = false;
  let silenceSince = 0;
  let settled = false;
  let raf: number | undefined;
  const startedAt = Date.now();

  const stopWatching = () => {
    if (raf !== undefined) {
      cancelAnimationFrame(raf);
      raf = undefined;
    }
  };

  /** يُنهي الالتقاط مرة واحدة فقط — تسابق المؤقّت مع الإنهاء اليدوي وارد */
  const settle = async (deliver: boolean): Promise<Blob | null> => {
    if (settled) return null;
    settled = true;
    stopWatching();

    if (!deliver || !heardSpeech) {
      recording.cancel();
      return null;
    }

    try {
      return await recording.stop();
    } catch {
      // حارس الصمت في التحويل قد يرفض تسجيلاً حدّيّاً — ليس عطلاً يُعرض
      return null;
    }
  };

  const tick = () => {
    const level = recording.getLevel();
    const now = Date.now();

    if (level >= SPEECH_LEVEL) {
      heardSpeech = true;
      silenceSince = 0;
    } else if (heardSpeech && silenceSince === 0) {
      silenceSince = now;
    }

    const done =
      (heardSpeech && silenceSince > 0 && now - silenceSince >= TRAILING_SILENCE_MS) ||
      (heardSpeech && now - startedAt >= maxSpeechMs) ||
      (!heardSpeech && now - startedAt >= maxIdleMs);

    if (done) {
      void settle(true).then(onAutoStop);
      return;
    }

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  return {
    finish: () => settle(true),
    cancel: () => void settle(false),
    getLevel: recording.getLevel,
  };
}

async function encodeWav16kMono(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    void decodeCtx.close();
  }

  const targetRate = 16000;
  const length = Math.max(1, Math.ceil(decoded.duration * targetRate));
  const offline = new OfflineAudioContext(1, length, targetRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const resampled = await offline.startRendering();

  const samples = resampled.getChannelData(0);
  assertNotSilent(samples);

  return pcm16ToWav(samples, targetRate);
}

/**
 * حارس الصمت: تسجيل بلا إشارة صوتية فعلية يجعل النموذج «يخترع» مهمة بدل أن يفشل —
 * نرفضه هنا برسالة واضحة بدل إرساله. العتبات متساهلة (همس بعيد يمرّ، صمت تام لا يمرّ).
 */
function assertNotSilent(samples: Float32Array): void {
  let peak = 0;
  let sumSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
    sumSquares += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSquares / samples.length);

  if (peak < 0.015 || rms < 0.0015) {
    throw new Error('لم يصل صوت من الميكروفون — تأكد أن المايك يعمل وغير مكتوم ثم أعد المحاولة');
  }
}

function pcm16ToWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // حجم fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // بت لكل عيّنة
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
