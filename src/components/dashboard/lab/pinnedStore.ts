import type { WidgetSettings } from './widgetSettings';

/**
 * مخزن «الودجتس المثبتة» 📌 — ودجتس يثبّتها المستخدم من المختبر فتطفو
 * فوق كل صفحات النظام الداخلية (تجربة فرونت فقط: localStorage لكل متصفح).
 *
 * تحديثات الموضع/الحجم أثناء السحب تُحفظ «صامتة» (بلا حدث) لأن البطاقة
 * تحرّك نفسها مباشرة عبر style — فلا إعادة رندر ولا فقدان لحالة الودجت
 * الحيّة (مؤقتات، عدادات...). الأحداث تُبثّ فقط عند إضافة/إزالة تثبيت.
 */
export interface PinnedWidget {
    id: string;                         // معرّف النسخة (نفس معرّف ودجت المختبر)
    type: string;                       // نوع الودجت من المعرض
    x: number; y: number;               // الموضع بالبكسل (أعلى-يسار الشاشة)
    w: number; h: number;               // الحجم بالبكسل
    collapsed?: boolean;                // مطوية إلى فقاعة دائرية؟
    settings?: Partial<WidgetSettings>; // مظهر النسخة لحظة التثبيت
}

const KEY = 'dashboard_pins_v1';
export const PINS_EVENT = 'raed:pins-changed';

export function loadPins(): PinnedWidget[] {
    try {
        const raw = localStorage.getItem(KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list.filter((p) => p && p.id && p.type) : [];
    } catch {
        return [];
    }
}

export function hasPins(): boolean {
    return loadPins().length > 0;
}

function persist(pins: PinnedWidget[], notify: boolean) {
    try { localStorage.setItem(KEY, JSON.stringify(pins)); } catch { /* تجاهل امتلاء التخزين */ }
    if (notify) window.dispatchEvent(new CustomEvent(PINS_EVENT));
}

export function addPin(pin: PinnedWidget) {
    const pins = loadPins().filter((p) => p.id !== pin.id);
    pins.push(pin);
    persist(pins, true);
}

export function removePin(id: string) {
    persist(loadPins().filter((p) => p.id !== id), true);
}

export function isPinned(id: string): boolean {
    return loadPins().some((p) => p.id === id);
}

/** تحديث موضع/حجم/طيّ نسخة — صامت افتراضياً (انظر تعليق أعلى الملف). */
export function updatePin(id: string, patch: Partial<PinnedWidget>, notify = false) {
    persist(loadPins().map((p) => (p.id === id ? { ...p, ...patch } : p)), notify);
}

/** اشتراك بتغيّرات القائمة (حدث داخلي + storage للتزامن بين التبويبات). */
export function subscribePins(cb: () => void): () => void {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
    window.addEventListener(PINS_EVENT, cb);
    window.addEventListener('storage', onStorage);
    return () => {
        window.removeEventListener(PINS_EVENT, cb);
        window.removeEventListener('storage', onStorage);
    };
}
