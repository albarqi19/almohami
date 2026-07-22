import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * خدمة بيانات الودجتس الحيّة 📡 — Microbatching
 *
 * كل ودجت تطلب مفتاحها عبر requestWidgetData()/useLiveWidget()، والخدمة
 * تجمع الطلبات المتزامنة (نافذة 40ms) في طلب HTTP واحد:
 *   GET /dashboard/widget-data?req={"daily_tip":{},"revenue_trend":{...}}
 * فعند فتح اللوحة بعشر ودجتس حيّة يخرج طلب واحد لا عشرة.
 *
 * كاش ذاكرة 60 ثانية لكل (مفتاح+خصائص) — إعادة الرندر/التنقل لا تعيد الجلب.
 * فشل مفتاح (forbidden…) يصل كـ rejection للودجت المعنية وحدها.
 */

type Opts = Record<string, unknown>;

interface Pending {
    key: string;
    opts: Opts;
    hash: string;
    resolve: (v: unknown) => void;
    reject: (e: Error) => void;
}

const CACHE_TTL_MS = 60_000;
const BATCH_WINDOW_MS = 40;

const cache = new Map<string, { at: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
let queue: Pending[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const hashOf = (key: string, opts: Opts) => `${key}:${JSON.stringify(opts ?? {})}`;

export function invalidateWidgetData(key?: string): void {
    if (!key) { cache.clear(); return; }
    Array.from(cache.keys()).forEach((h) => { if (h.startsWith(`${key}:`)) cache.delete(h); });
}

export function requestWidgetData<T = unknown>(key: string, opts: Opts = {}): Promise<T> {
    const h = hashOf(key, opts);

    const hit = cache.get(h);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return Promise.resolve(hit.value as T);

    const flying = inflight.get(h);
    if (flying) return flying as Promise<T>;

    const p = new Promise<unknown>((resolve, reject) => {
        queue.push({ key, opts, hash: h, resolve, reject });
        if (!timer) timer = setTimeout(flush, BATCH_WINDOW_MS);
    });
    inflight.set(h, p);
    p.finally(() => inflight.delete(h)).catch(() => { /* المستهلك يعالج */ });
    return p as Promise<T>;
}

async function flush(): Promise<void> {
    timer = null;
    const batch = queue;
    queue = [];
    if (!batch.length) return;

    // مفتاح واحد لكل key في الدفعة (الباك keyed by key) — التصادم النادر
    // بنفس المفتاح وخصائص مختلفة يؤجَّل لدفعة تالية.
    const req: Record<string, Opts> = {};
    const taken: Pending[] = [];
    const deferred: Pending[] = [];
    for (const p of batch) {
        if (req[p.key] !== undefined && JSON.stringify(req[p.key]) !== JSON.stringify(p.opts)) {
            deferred.push(p);
        } else {
            req[p.key] = p.opts;
            taken.push(p);
        }
    }
    if (deferred.length) {
        queue.push(...deferred);
        timer = setTimeout(flush, BATCH_WINDOW_MS);
    }

    try {
        const res = await apiClient.get<{ success: boolean; data: Record<string, unknown>; errors: Record<string, string> }>(
            `/dashboard/widget-data?req=${encodeURIComponent(JSON.stringify(req))}`
        );
        const data = res?.data ?? {};
        const errors = res?.errors ?? {};
        for (const p of taken) {
            if (p.key in data) {
                cache.set(p.hash, { at: Date.now(), value: data[p.key] });
                p.resolve(data[p.key]);
            } else {
                p.reject(new Error(errors[p.key] || 'no_data'));
            }
        }
    } catch (e) {
        const err = e instanceof Error ? e : new Error('network');
        taken.forEach((p) => p.reject(err));
    }
}

/* ============ Hooks ============ */

export interface LiveWidgetState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    /** هل بوابة اللوحة المخصصة مفعّلة لهذا المكتب؟ (بدونها تعمل الودجت بالديمو) */
    live: boolean;
}

/**
 * جلب حي لودجت واحدة: ينضم تلقائياً لدفعة الطلبات، ويُعطّل نفسه إن كانت
 * بوابة المكتب مطفأة (فتبقى الودجت على بيانات الديمو بلا طلبات فاشلة).
 */
export function useLiveWidget<T = unknown>(key: string, opts: Opts = {}, enabled = true): LiveWidgetState<T> {
    const { user } = useAuth();
    const live = !!user?.tenant?.custom_dashboard_enabled;
    const active = live && enabled;
    const optsKey = JSON.stringify(opts ?? {});

    const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>(
        { data: null, loading: active, error: null }
    );

    useEffect(() => {
        if (!active) return;
        let alive = true;
        setState((s) => (s.loading ? s : { ...s, loading: true }));
        requestWidgetData<T>(key, JSON.parse(optsKey))
            .then((d) => { if (alive) setState({ data: d, loading: false, error: null }); })
            .catch((e: Error) => { if (alive) setState({ data: null, loading: false, error: e.message }); });
        return () => { alive = false; };
    }, [key, optsKey, active]);

    return { ...state, live };
}
