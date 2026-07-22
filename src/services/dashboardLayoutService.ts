import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

/**
 * مزامنة تخطيط اللوحة القابلة للتخصيص مع الخادم 🔄
 *
 * الاستراتيجية local-first: الصفحة تفتح فوراً من localStorage، ثم تجلب نسخة
 * الخادم وتعتمد الأحدث (مقارنة updated_at/savedAt)، وتحفظ بالخادم بتأخير
 * ذكي (debounce ~2s) بعد آخر تغيير — آخر كتابة تكسب عبر الأجهزة.
 */

export interface ServerLayoutEnvelope {
    layout: unknown | null;
    updated_at: string | null;
}

export const DashboardLayoutService = {
    get: async (): Promise<ServerLayoutEnvelope> => {
        const res = await apiClient.get<ApiResponse<ServerLayoutEnvelope>>('/dashboard/layout');
        return res.data ?? { layout: null, updated_at: null };
    },

    save: async (layout: unknown): Promise<string | null> => {
        const res = await apiClient.put<ApiResponse<{ updated_at: string | null }>>('/dashboard/layout', { layout });
        return res.data?.updated_at ?? null;
    },
};

/** مؤقّت حفظ مؤجّل مشترك (يُلغى ويُعاد جدولته مع كل تغيير). */
export function createDebouncedSaver(delayMs = 2000) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: unknown = null;
    let saving = false;

    const fire = async () => {
        if (saving || pending === null) return;
        const payload = pending;
        pending = null;
        saving = true;
        try {
            await DashboardLayoutService.save(payload);
        } catch { /* الحفظ المحلي يبقى؛ محاولة تالية عند تغيير قادم */ }
        saving = false;
        if (pending !== null) fire();
    };

    return {
        schedule(layout: unknown) {
            pending = layout;
            if (timer) clearTimeout(timer);
            timer = setTimeout(fire, delayMs);
        },
        /** حفظ فوري (عند مغادرة الصفحة مثلاً). */
        flush() {
            if (timer) { clearTimeout(timer); timer = null; }
            void fire();
        },
    };
}
