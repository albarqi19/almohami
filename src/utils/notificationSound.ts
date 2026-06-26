/**
 * نغمة تنبيه للإشعارات الجديدة (طلب العميل #87).
 *
 * تُولَّد النغمة برمجياً عبر Web Audio API (نغمتان قصيرتان صاعدتان) بدل ملف صوت
 * خارجي — فلا أصول إضافية ولا طلبات شبكة، وتعمل في كل المتصفحات الحديثة.
 * التفضيل (تشغيل/كتم) يُحفظ في localStorage لكل جهاز.
 */

const STORAGE_KEY = 'notification_sound_enabled';

let audioCtx: AudioContext | null = null;

/** هل صوت الإشعار مُفعّل؟ (افتراضياً نعم) */
export function isNotificationSoundEnabled(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
        return true;
    }
}

/** تفعيل/كتم صوت الإشعار (يُحفظ في localStorage) */
export function setNotificationSoundEnabled(enabled: boolean): void {
    try {
        localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
        /* تجاهل تعذّر الوصول للتخزين */
    }
}

/**
 * تشغيل نغمة التنبيه. صامتة تماماً إن كان الصوت مكتوماً أو تعذّر تشغيله
 * (مثل سياسة autoplay قبل أول تفاعل للمستخدم) — لا ترمي استثناءً أبداً.
 */
export function playNotificationSound(): void {
    if (!isNotificationSoundEnabled()) return;

    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;

        audioCtx = audioCtx || new Ctx();
        // المتصفح قد يُعلّق السياق حتى أول تفاعل — نحاول استئنافه.
        if (audioCtx.state === 'suspended') {
            void audioCtx.resume();
        }

        const ctx = audioCtx;
        const now = ctx.currentTime;

        // نغمتان قصيرتان صاعدتان (دينغ-دينغ) لطيفتان غير مزعجتين.
        const tones = [
            { freq: 880, at: 0 },      // A5
            { freq: 1174.66, at: 0.1 }, // D6
        ];

        for (const { freq, at } of tones) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(ctx.destination);

            const start = now + at;
            // غلاف ناعم (تصاعد سريع ثم تلاشٍ) لتفادي النقرات.
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

            osc.start(start);
            osc.stop(start + 0.3);
        }
    } catch {
        /* صامت — الصوت تحسين ثانوي لا يجب أن يُعطّل شيئاً */
    }
}
