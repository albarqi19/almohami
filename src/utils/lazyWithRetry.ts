import { lazy } from 'react';
import type { ComponentType } from 'react';

/**
 * lazyWithRetry — مثل React.lazy لكن مع إعادة تحميل تلقائية للصفحة مرة واحدة
 * عند فشل جلب الـ chunk. يحدث هذا بعد كل نشر جديد: مستخدم فاتح نسخة قديمة
 * من index.html يطلب ملفات chunks اختفت أسماؤها من الخادم، فنعيد تحميل
 * الصفحة ليأخذ النسخة الجديدة بدل أن ينكسر التنقل.
 */

/**
 * سجلُّ المصانع — **كلُّ مكوّنٍ كسولٍ يسجّل نفسَه هنا تلقائياً.**
 *
 * وبذلك يُجلَب كلُّ شيءٍ مسبقاً بلا لمسِ أيٍّ من التصريحات الستّةِ والثمانين في
 * `App.tsx`: التسجيلُ أثرٌ جانبيٌّ للتصريح نفسِه، فلا قائمةٌ ثانيةٌ تُصان يدوياً
 * وتتخلّف عن الأولى يومَ يُضاف مسارٌ جديد.
 */
const factories: Array<() => Promise<unknown>> = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
) {
    factories.push(factory);

    return lazy(async () => {
        const RELOAD_FLAG = 'chunk-reload-attempted';
        try {
            const module = await factory();
            sessionStorage.removeItem(RELOAD_FLAG);
            return module;
        } catch (error) {
            if (!sessionStorage.getItem(RELOAD_FLAG)) {
                sessionStorage.setItem(RELOAD_FLAG, '1');
                window.location.reload();
                // وعد معلّق حتى لا يظهر ErrorBoundary أثناء إعادة التحميل
                return new Promise(() => {}) as never;
            }
            sessionStorage.removeItem(RELOAD_FLAG);
            throw error;
        }
    });
}

type IdleDeadline = { timeRemaining: () => number; didTimeout: boolean };
type IdleCallback = (deadline: IdleDeadline) => void;

/** جدولةٌ في وقت الخمول — وبديلٌ زمنيٌّ لمتصفّحٍ بلا `requestIdleCallback` (سفاري). */
function whenIdle(callback: IdleCallback): void {
    const w = window as unknown as {
        requestIdleCallback?: (cb: IdleCallback, opts?: { timeout: number }) => number;
    };

    if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(callback, { timeout: 2000 });
        return;
    }

    window.setTimeout(() => callback({ timeRemaining: () => 12, didTimeout: false }), 200);
}

let prefetchStarted = false;

/**
 * **الجلبُ المسبق عند الخمول** — يُنزّل مقاطعَ الشاشات في الخلفية بينما يقرأ
 * المستخدمُ اللوحة، فتصير كلُّ ضغطةٍ بعدها فوريّةً بلا شبكة.
 *
 * ولماذا هذا لا التحويمُ على الرابط: التحويمُ **لا وجودَ له على اللمس**، ويصل
 * متأخّراً لمن يضغط بسرعة. أمّا الخمولُ فيغطّي الجميع ويقع في وقتٍ لا ينتظر
 * فيه المستخدمُ شيئاً.
 *
 * 🔴 **ويُستدعى بعد المصادقة لا قبلها**: جلبُ شاشات التطبيق لزائرٍ على صفحة
 * الدخول تنزيلٌ لن يُستعمَل، وعلى اتصالٍ خلويٍّ هذا حسابُ المستخدم لا حسابُنا.
 *
 * · `saveData` يُحترَم: من طلب توفيرَ البيانات صراحةً لا يُنزَّل له ما لم يطلبه.
 * · `slow-2g`/`2g` يُستثنى: الجلبُ المسبق هناك يزاحم الطلبَ الحقيقيَّ على قناةٍ ضيّقة.
 * · الفشلُ يُبتلَع عمداً: الجلبُ المسبق رفاهيةٌ، وفشلُه يجب ألّا يظهر للمستخدم
 *   ولا يُطلق `lazyWithRetry` إعادةَ تحميلٍ للصفحة (المسارُ هنا لا يمرّ بها أصلاً).
 */
export function prefetchLazyRoutes(): void {
    if (prefetchStarted || typeof window === 'undefined') return;
    prefetchStarted = true;

    const conn = (navigator as unknown as {
        connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;

    if (conn?.saveData === true) return;
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return;

    let index = 0;

    /**
     * 🔴 تأخيرٌ قبل البدء — `requestIdleCallback` يقيس خمولَ **المعالج** لا الشبكة.
     * فبدونه ينطلق الجلبُ بينما اللوحةُ لا تزال تجلب بياناتِها، فيزاحمها على قناةٍ
     * زمنُ جولتها ~210 مللي — أي أنّنا نُبطئ ما يراه المستخدمُ الآن لنُسرع ما قد
     * يراه بعد دقيقة. والثلاثُ ثوانٍ تكفي لتستقرّ الشاشةُ الأولى.
     */
    const START_DELAY_MS = 3000;

    const step = (deadline: IdleDeadline) => {
        // ينفَّذ ما دام في الإطار متّسع؛ و`didTimeout` يضمن التقدّمَ على جهازٍ لا يخلو أبداً.
        while (index < factories.length && (deadline.didTimeout || deadline.timeRemaining() > 6)) {
            const factory = factories[index];
            index += 1;
            void factory().catch(() => undefined);
        }

        if (index < factories.length) whenIdle(step);
    };

    window.setTimeout(() => whenIdle(step), START_DELAY_MS);
}
