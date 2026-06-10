import { lazy } from 'react';
import type { ComponentType } from 'react';

/**
 * lazyWithRetry — مثل React.lazy لكن مع إعادة تحميل تلقائية للصفحة مرة واحدة
 * عند فشل جلب الـ chunk. يحدث هذا بعد كل نشر جديد: مستخدم فاتح نسخة قديمة
 * من index.html يطلب ملفات chunks اختفت أسماؤها من الخادم، فنعيد تحميل
 * الصفحة ليأخذ النسخة الجديدة بدل أن ينكسر التنقل.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
) {
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
