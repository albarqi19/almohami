/**
 * إطار «خصائص الودجت» الموحّد (Schema-driven) 🎛️
 *
 * كل ودجت تعلن خصائصها في الكتالوج كمصفوفة WidgetOptionDef، والنظام:
 *  1) يرندرها تلقائياً في نافذة تخصيص الودجت (قسم «خصائص») — صفر UI مخصص.
 *  2) يحفظ القيم ضمن settings[widgetId].opts (محلياً وبالخادم وبالتثبيت 📌).
 *  3) يمررها للودجت عند الرندر: def.render(ctx, opts).
 *
 * إضافة خاصية جديدة لأي ودجت = سطر واحد في الكتالوج.
 */

export type WidgetOptionDef =
    | { key: string; label: string; type: 'select'; choices: Array<{ v: string; l: string }>; default: string }
    | { key: string; label: string; type: 'toggle'; default: boolean }
    | { key: string; label: string; type: 'number'; min?: number; max?: number; step?: number; default: number; suffix?: string }
    | { key: string; label: string; type: 'text'; placeholder?: string; default?: string }
    | { key: string; label: string; type: 'date'; default?: string };  // قيمة ISO مثل 2026-08-01

/** قيم خصائص نسخة ودجت واحدة (تُحفظ ضمن إعداداتها). */
export type WidgetOpts = Record<string, string | number | boolean>;

/** القيم الافتراضية لمجموعة تعريفات. */
export function optionDefaults(defs?: WidgetOptionDef[]): WidgetOpts {
    const out: WidgetOpts = {};
    (defs || []).forEach((d) => {
        if (d.default !== undefined) out[d.key] = d.default as string | number | boolean;
    });
    return out;
}

/** دمج قيم محفوظة (قد تكون ناقصة/قديمة) مع افتراضيات التعريفات. */
export function withOptionDefaults(defs: WidgetOptionDef[] | undefined, partial?: WidgetOpts): WidgetOpts {
    return { ...optionDefaults(defs), ...(partial || {}) };
}
