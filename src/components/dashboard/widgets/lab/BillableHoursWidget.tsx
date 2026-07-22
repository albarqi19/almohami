import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * BillableHoursWidget — عدّاد الساعات القابلة للفوترة.
 *
 * أداة مكتفية ذاتياً: ساعة إيقاف تبدأ/تتوقف، تعرض HH:MM:SS للجلسة الحالية،
 * ونقطة نبض حمراء أثناء التشغيل، وإجمالي «اليوم» يتراكم، ومعدّل بالساعة
 * اختياري يحسب المبلغ التقديري (ريال).
 *
 * إجمالي اليوم والمعدّل يُصفَّران مع تغيّر التاريخ ويُحفظان عبر useWidgetContent
 * (داخل اللوح يتزامنان مع الخادم؛ خارجه 📌 localStorage). الحفظ عند الأحداث
 * فقط (إيقاف/تصفير/تغيير المعدّل) — لا كتابة مع دقّات العدّاد.
 * لاحقاً: يمكن مزامنة المدد إلى قيود الوقت/الفوترة (time entries) في الباك.
 */

const STORAGE_KEY = 'lab_billable_v1';

const pad2 = (n: number): string => n.toString().padStart(2, '0');
const todayKey = (): string => new Date().toISOString().slice(0, 10);

interface Stored {
    date: string;
    accumulated: number; // ثوانٍ مُثبَّتة لليوم
    rate: number; // ريال/ساعة
}

const parseStored = (raw: unknown): Stored => {
    const p = (raw || {}) as Partial<Stored>;
    const rate = typeof p.rate === 'number' ? p.rate : 0;
    // يوم جديد → يبقى المعدّل ويُصفَّر الإجمالي
    if (p.date !== todayKey()) return { date: todayKey(), accumulated: 0, rate };
    return { date: todayKey(), accumulated: typeof p.accumulated === 'number' ? p.accumulated : 0, rate };
};

const formatHMS = (totalSeconds: number): string => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
};

const BillableHoursWidget: React.FC = () => {
    const [stored, setStored] = useWidgetContent<Stored>(STORAGE_KEY, parseStored);
    const { accumulated, rate } = stored;
    const [startAt, setStartAt] = useState<number | null>(null);
    const [now, setNow] = useState<number>(() => Date.now());
    const intervalRef = useRef<number | null>(null);

    const running = startAt !== null;

    // نبضة العرض كل ثانية أثناء التشغيل فقط
    useEffect(() => {
        if (!running) return;
        intervalRef.current = window.setInterval(() => setNow(Date.now()), 1000);
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        };
    }, [running]);

    const sessionSeconds = running ? Math.floor((now - (startAt as number)) / 1000) : 0;
    const todaySeconds = accumulated + sessionSeconds;

    const toggle = useCallback(() => {
        if (running) {
            // إيقاف: نُثبِّت مدة الجلسة إلى إجمالي اليوم
            const add = Math.floor((Date.now() - (startAt as number)) / 1000);
            setStartAt(null);
            setStored((p) => ({
                date: todayKey(),
                accumulated: (p.date === todayKey() ? p.accumulated : 0) + add,
                rate: p.rate,
            }));
        } else {
            setStartAt(Date.now());
            setNow(Date.now());
        }
    }, [running, startAt, setStored]);

    const resetToday = useCallback(() => {
        setStartAt(null);
        setStored((p) => ({ date: todayKey(), accumulated: 0, rate: p.rate }));
    }, [setStored]);

    const onRateChange = useCallback(
        (raw: string) => {
            const v = Math.max(0, Math.min(100000, Number(raw) || 0));
            setStored((p) => ({ ...p, date: todayKey(), rate: v }));
        },
        [setStored]
    );

    const amount = useMemo(() => (todaySeconds / 3600) * rate, [todaySeconds, rate]);
    const amountLabel = useMemo(
        () => amount.toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
        [amount]
    );

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                gap: '10px',
                padding: '10px 8px',
            }}
        >
            <style>{`
                @keyframes blh-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.55); opacity: .35; } }
                .blh-dot { animation: blh-pulse 1.4s ease-in-out infinite; }
                .blh-btn { transition: filter .15s ease, transform .12s ease; }
                .blh-btn:hover { filter: brightness(1.06); }
                .blh-btn:active { transform: translateY(1px); }
                .blh-rate:focus { outline: none; border-color: var(--law-gold, #c9a227); }
            `}</style>

            {/* رأس + مؤشر التشغيل */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '0 0 auto' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--law-navy, #1e2a4a)' }}>
                    <Timer size={15} style={{ color: 'var(--law-gold, #c9a227)' }} />
                    ساعات الفوترة
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: running ? 'var(--status-red, #dc2626)' : 'var(--quiet-gray-400, #9ca3af)' }}>
                    <span
                        className={running ? 'blh-dot' : undefined}
                        style={{ width: '8px', height: '8px', borderRadius: '50%', background: running ? 'var(--status-red, #dc2626)' : 'var(--quiet-gray-300, #d1d5db)', display: 'inline-block' }}
                    />
                    {running ? 'قيد التسجيل' : 'متوقّف'}
                </span>
            </div>

            {/* العدّاد الكبير للجلسة الحالية */}
            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
                <div
                    style={{
                        fontSize: 'clamp(28px, 11vw, 44px)',
                        fontWeight: 800,
                        color: 'var(--color-heading, #1e2a4a)',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '1.5px',
                        lineHeight: 1,
                    }}
                >
                    {formatHMS(sessionSeconds)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #6b7280)', marginTop: '4px' }}>الجلسة الحالية</div>
            </div>

            {/* أزرار التحكم */}
            <div style={{ display: 'flex', gap: '6px', flex: '0 0 auto' }}>
                <button
                    className="lab-no-drag blh-btn"
                    onClick={toggle}
                    style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        border: 'none',
                        background: running ? 'var(--status-red, #dc2626)' : 'var(--law-navy, #1e2a4a)',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}
                >
                    {running ? <Pause size={15} /> : <Play size={15} />}
                    {running ? 'إيقاف' : 'بدء'}
                </button>
                <button
                    className="lab-no-drag blh-btn"
                    onClick={resetToday}
                    title="تصفير اليوم"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: '1px solid var(--color-border, #e5e7eb)',
                        background: 'var(--dashboard-card, #ffffff)',
                        color: 'var(--color-text-secondary, #6b7280)',
                        borderRadius: '8px',
                        padding: '8px 11px',
                        cursor: 'pointer',
                    }}
                >
                    <RotateCcw size={15} />
                </button>
            </div>

            {/* الإجمالي + المعدّل + المبلغ */}
            <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                <div style={{ flex: 1, background: 'var(--law-navy-light, #eef1f8)', borderRadius: '8px', padding: '7px 9px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '2px' }}>إجمالي اليوم</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--law-navy, #1e2a4a)', fontVariantNumeric: 'tabular-nums' }}>{formatHMS(todaySeconds)}</div>
                </div>
                <div style={{ flex: 1, background: 'var(--quiet-gray-100, #f3f4f6)', borderRadius: '8px', padding: '7px 9px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--color-text-secondary, #6b7280)', marginBottom: '2px', display: 'block' }}>ريال/ساعة</label>
                    <input
                        className="lab-no-drag blh-rate"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={rate === 0 ? '' : rate}
                        placeholder="0"
                        onChange={(e) => onRateChange(e.target.value)}
                        style={{
                            width: '100%',
                            border: '1px solid var(--color-border, #e5e7eb)',
                            borderRadius: '6px',
                            padding: '3px 6px',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--color-heading, #1e2a4a)',
                            background: 'var(--dashboard-card, #ffffff)',
                            fontVariantNumeric: 'tabular-nums',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>
                <div style={{ flex: 1.1, background: 'var(--status-green-light, #dcfce7)', borderRadius: '8px', padding: '7px 9px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--status-green, #16a34a)', marginBottom: '2px' }}>المبلغ التقديري</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--status-green, #16a34a)', fontVariantNumeric: 'tabular-nums' }}>
                        {amountLabel} <span style={{ fontSize: '10px', fontWeight: 600 }}>ريال</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillableHoursWidget;
