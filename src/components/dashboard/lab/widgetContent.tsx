import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * محتوى الودجت المتزامن 📝 — نصوص/قوائم يدخلها المستخدم داخل الودجت
 * (الملاحظة اللاصقة، أولويات اليوم، قائمة التحقق…).
 *
 * الفكرة: بدل localStorage بمفتاح ثابت لكل «نوع»، يُحفظ المحتوى في
 * settings[id].content ضمن حالة اللوحة نفسها — فيسافر مع نفس دورة حفظ
 * التخطيط (محلياً فوراً + PUT /dashboard/layout المؤجّل) ويصير:
 *   • متزامناً بين الأجهزة، • معزولاً لكل مستخدم، • خاصاً بكل نسخة ودجت.
 *
 * الانضباط الأدائي: الكتابة تحدّث حالة الودجت المحلية فوراً، والدفع لحالة
 * اللوحة مؤجّل (600ms) كي لا يعاد رندر الشبكة مع كل حرف — ثم حفظ الخادم
 * مؤجّل أصلاً (2s) في WidgetBoard. لا طلبات إضافية إطلاقاً.
 *
 * خارج اللوح (الودجت المثبتة 📌 العائمة) لا يوجد Provider — يهبط الخطّاف
 * تلقائياً إلى مفتاح localStorage القديم بنفس سلوك ما قبل هذه الميزة.
 */

export interface WidgetContentApi {
    /** المحتوى المحفوظ بحالة اللوحة لهذه النسخة (undefined = لم يُحفظ بعد). */
    content: unknown;
    /** كتابة المحتوى في حالة اللوحة (يسافر مع حفظ التخطيط للخادم). */
    setContent: (v: unknown) => void;
}

export const WidgetContentContext = createContext<WidgetContentApi | null>(null);

/**
 * useWidgetContent — بديل مباشر لنمط «loadState() + useEffect حفظ».
 *
 * @param legacyKey مفتاح localStorage القديم — يُقرأ كبذرة أول مرة (هجرة
 *                  بيانات المختبر تلقائياً) ويبقى وجهة الحفظ خارج اللوح.
 * @param parse     مطهّر القيمة الخام (undefined/تالفة → الافتراضي) — نفس
 *                  منطق loadState السابق لكن على قيمة بدل قراءة التخزين.
 */
export function useWidgetContent<T>(
    legacyKey: string,
    parse: (raw: unknown) => T
): [T, (updater: T | ((prev: T) => T)) => void] {
    const board = useContext(WidgetContentContext);
    const boardRef = useRef(board);
    boardRef.current = board;
    const parseRef = useRef(parse);
    parseRef.current = parse;

    const hadLegacyRef = useRef(false);
    const [value, setValue] = useState<T>(() => {
        if (board && board.content !== undefined) return parseRef.current(board.content);
        try {
            const raw = window.localStorage.getItem(legacyKey);
            hadLegacyRef.current = raw !== null;
            return parseRef.current(raw ? JSON.parse(raw) : undefined);
        } catch {
            return parseRef.current(undefined);
        }
    });

    const latestRef = useRef(value);
    const timerRef = useRef<number | null>(null);

    const commit = useCallback(() => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const b = boardRef.current;
        if (b) {
            b.setContent(latestRef.current);
        } else {
            try {
                window.localStorage.setItem(legacyKey, JSON.stringify(latestRef.current));
            } catch { /* تخزين ممتلئ/محجوب — نتجاهل بهدوء */ }
        }
    }, [legacyKey]);

    const set = useCallback((updater: T | ((prev: T) => T)) => {
        setValue((prev) => {
            const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
            latestRef.current = next;
            if (timerRef.current) window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(commit, 600);
            return next;
        });
    }, [commit]);

    /* هجرة لمرة واحدة: بيانات localStorage قديمة ولا محتوى بحالة اللوحة →
       تُدفع للحالة (فتصل الخادم) دون انتظار أول تعديل من المستخدم. */
    const seededRef = useRef(false);
    useEffect(() => {
        if (seededRef.current) return;
        seededRef.current = true;
        if (boardRef.current && boardRef.current.content === undefined && hadLegacyRef.current) {
            timerRef.current = window.setTimeout(commit, 1200);
        }
    }, [commit]);

    /* اعتماد تغيّر خارجي (وصول نسخة الخادم بعد الـ mount) — لا نقاطع كتابة جارية */
    const contentSig = board && board.content !== undefined ? JSON.stringify(board.content) : '';
    useEffect(() => {
        const b = boardRef.current;
        if (!b || b.content === undefined || timerRef.current) return;
        if (JSON.stringify(b.content) === JSON.stringify(latestRef.current)) return;
        const parsed = parseRef.current(b.content);
        latestRef.current = parsed;
        setValue(parsed);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentSig]);

    /* دفع أي تعديل معلّق عند الإزالة (تنقّل بين الصفحات أثناء مهلة الدفع) */
    useEffect(() => () => {
        if (timerRef.current) commit();
    }, [commit]);

    return [value, set];
}
