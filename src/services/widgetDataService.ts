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
 *
 * 💾 local-first (نمط صفحة القضايا): آخر رد حقيقي يُخبّأ في localStorage
 * **معزولاً بمعرّف المستخدم** (لا تسريب بين حسابات نفس الجهاز)، فالزيارة
 * التالية تعرض بياناتك الحقيقية فوراً بلا هيكل تحميل، والتحديث يجري صامتاً
 * بالخلفية. عمر البذرة الأقصى 24 ساعة. لا بيانات وهمية في أي حال.
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

/* بذرة localStorage — معزولة بالمستخدم، بعمر أقصى 24 ساعة */
const SEED_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const seedStorageKey = (userId: number | string, hash: string) => `widget_data_v1:u${userId}:${hash}`;

function readSeed<T>(userId: number | string | undefined, hash: string): T | null {
    if (!userId) return null;
    try {
        const raw = window.localStorage.getItem(seedStorageKey(userId, hash));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { at?: number; value?: T };
        if (typeof parsed.at !== 'number' || Date.now() - parsed.at > SEED_MAX_AGE_MS) return null;
        return (parsed.value ?? null) as T | null;
    } catch { return null; }
}

function writeSeed(userId: number | string | undefined, hash: string, value: unknown): void {
    if (!userId) return;
    try {
        window.localStorage.setItem(seedStorageKey(userId, hash), JSON.stringify({ at: Date.now(), value }));
    } catch { /* تخزين ممتلئ — نتجاهل */ }
}

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
    const userId = user?.id;

    const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>(() => {
        // 💾 بذرة local-first: آخر بيانات حقيقية للمستخدم نفسه تظهر فوراً،
        // والجلب يستمر بالخلفية (loading=true لكن الودجت ترسم البيانات المتاحة)
        const seed = active ? readSeed<T>(userId, hashOf(key, JSON.parse(optsKey))) : null;
        return { data: seed, loading: active, error: null };
    });

    useEffect(() => {
        if (!active) return;
        let alive = true;
        setState((s) => (s.loading ? s : { ...s, loading: true }));
        requestWidgetData<T>(key, JSON.parse(optsKey))
            .then((d) => {
                writeSeed(userId, hashOf(key, JSON.parse(optsKey)), d);
                if (alive) setState({ data: d, loading: false, error: null });
            })
            .catch((e: Error) => {
                // فشل التحديث لا يمحو بيانات حقيقية معروضة — تبقى (stale) مع تسجيل الخطأ
                if (alive) setState((s) => ({ data: s.data, loading: false, error: e.message }));
            });
        return () => { alive = false; };
    }, [key, optsKey, active, userId]);

    return { ...state, live };
}
