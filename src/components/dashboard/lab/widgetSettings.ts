import type { CSSProperties } from 'react';
import type { WidgetOpts } from './widgetOptions';

/**
 * إعدادات مظهر الودجت (لكل نسخة على حدة) — كلها CSS خالص بلا أثر أداء.
 * تُحفظ ضمن حالة اللوحة (محلياً وبالخادم) مفتاحاً بمعرّف الودجت.
 */
export interface WidgetSettings {
    showHeader: boolean;
    filled: boolean;               // هل للمربع خلفية/بطاقة؟
    bg: string;                    // مفتاح لون الخلفية (من SWATCHES)
    accent: 'none' | 'top' | 'side';
    accentColor: string;           // مفتاح لون الشريط (من SWATCHES)
    border: boolean;
    radius: 'sm' | 'md' | 'lg';
    density: 'compact' | 'cozy';
    title?: string;                // عنوان مخصّص (يتجاوز عنوان المعرض)
    opts?: WidgetOpts;             // 🎛️ خصائص الودجت (schema من الكتالوج) — تُورَّث للتثبيت 📌
    /** نمط العرض: apple (حديث، الافتراضي) أو classic (غلاف اللوحة الكلاسيكية الحرفي .widget). */
    chrome?: 'apple' | 'classic';
    /** 📝 محتوى الودجت الذي يدخله المستخدم (ملاحظة/أولويات/قائمة…) —
        يسافر مع حفظ اللوحة للخادم عبر useWidgetContent؛ خاص بكل نسخة. */
    content?: unknown;
}

export const DEFAULT_SETTINGS: WidgetSettings = {
    showHeader: true,
    filled: true,
    bg: 'default',
    accent: 'none',
    accentColor: 'navy',
    border: true,
    radius: 'lg',            // زوايا كبيرة بروح ودجتس iOS الحديثة
    density: 'cozy',
    chrome: 'classic',       // قرار المالك: الافتراضي الغلاف الكلاسيكي (widget الأصلية)
};

/** لوحة ألوان متوائمة مع الثيم (تحترم الوضعين الفاتح/الداكن عبر المتغيّرات). */
export interface Swatch { key: string; label: string; bg: string; solid: string; }
export const SWATCHES: Swatch[] = [
    { key: 'default', label: 'افتراضي', bg: 'var(--dashboard-card, #ffffff)', solid: 'var(--law-navy, #1e2a4a)' },
    { key: 'navy', label: 'كحلي', bg: 'var(--law-navy-light, #eef1f8)', solid: 'var(--law-navy, #1e2a4a)' },
    { key: 'gold', label: 'ذهبي', bg: 'color-mix(in srgb, var(--law-gold, #c9a227) 14%, transparent)', solid: 'var(--law-gold, #c9a227)' },
    { key: 'green', label: 'أخضر', bg: 'var(--status-green-light, #dcfce7)', solid: 'var(--status-green, #16a34a)' },
    { key: 'blue', label: 'أزرق', bg: 'var(--status-blue-light, #dbeafe)', solid: 'var(--status-blue, #2563eb)' },
    { key: 'orange', label: 'برتقالي', bg: 'var(--status-orange-light, #ffedd5)', solid: 'var(--status-orange, #ea580c)' },
    { key: 'red', label: 'أحمر', bg: 'var(--status-red-light, #fee2e2)', solid: 'var(--status-red, #dc2626)' },
    { key: 'gray', label: 'رمادي', bg: 'var(--quiet-gray-100, #f3f4f6)', solid: 'var(--quiet-gray-500, #6b7280)' },
];

export function swatchBg(key: string): string {
    return (SWATCHES.find((s) => s.key === key) || SWATCHES[0]).bg;
}
export function swatchSolid(key: string): string {
    return (SWATCHES.find((s) => s.key === key) || SWATCHES[1]).solid;
}

export const RADIUS_PX: Record<WidgetSettings['radius'], number> = { sm: 6, md: 10, lg: 16 };

/** نمط حاوية الودجت المشتقّ من الإعدادات — فلات صِرف: حد رقيق بلا أي ظلال (ذوق المالك المعتمد). */
export function frameStyle(s: WidgetSettings): CSSProperties {
    const style: CSSProperties = {
        background: s.filled ? swatchBg(s.bg) : 'transparent',
        border: s.border ? '1px solid var(--color-border)' : '1px solid transparent',
        borderRadius: RADIUS_PX[s.radius],
    };
    if (s.accent === 'top') style.borderTop = `3px solid ${swatchSolid(s.accentColor)}`;
    if (s.accent === 'side') style.borderInlineStart = `3px solid ${swatchSolid(s.accentColor)}`;
    return style;
}

export function bodyPadding(s: WidgetSettings): string {
    return s.density === 'compact' ? '6px 8px' : '10px 12px';
}

/** دمج إعدادات محفوظة (قد تكون ناقصة) مع الافتراضي. */
export function withDefaults(partial?: Partial<WidgetSettings>): WidgetSettings {
    return { ...DEFAULT_SETTINGS, ...(partial || {}) };
}
