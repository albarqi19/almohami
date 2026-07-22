import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, CheckCircle2 } from 'lucide-react';

/**
 * CountdownWidget — عدّاد تنازلي لموعد قادم.
 *
 * أداة عرض مكتفية ذاتياً: هدف افتراضي «الجلسة القادمة» غداً 10:00 صباحاً،
 * أربع بطاقات كبيرة (أيام/ساعات/دقائق/ثوانٍ) بأرقام تتغيّر بحركة خفيفة،
 * وعند بلوغ الموعد تظهر «حان الموعد».
 *
 * لاحقاً: يُستبدل الهدف الافتراضي بأقرب جلسة/موعد فعلي من الباك
 * (مثلاً أول عنصر من مسار الجلسات القادمة) بدل التوقيت المحسوب هنا.
 */

interface EventTarget {
    title: string;
    at: Date;
}

interface Remaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    done: boolean;
}

const pad2 = (n: number): string => n.toString().padStart(2, '0');

const computeRemaining = (target: Date): Remaining => {
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    const totalSec = Math.floor(diff / 1000);
    return {
        days: Math.floor(totalSec / 86400),
        hours: Math.floor((totalSec % 86400) / 3600),
        minutes: Math.floor((totalSec % 3600) / 60),
        seconds: totalSec % 60,
        done: false,
    };
};

/** 🎛️ خصائص الودجت: العنوان + تاريخ الهدف (ISO) + وقته (HH:MM) — الافتراضي غداً 10:00. */
interface Props {
    title?: string;
    targetDate?: string;   // مثل 2026-08-01
    targetTime?: string;   // مثل 14:30
}

const CountdownWidget: React.FC<Props> = ({ title, targetDate, targetTime }) => {
    const target = useMemo<EventTarget>(() => {
        let at: Date | null = null;
        if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
            const time = targetTime && /^\d{1,2}:\d{2}$/.test(targetTime.trim()) ? targetTime.trim() : '10:00';
            const candidate = new Date(`${targetDate}T${time.padStart(5, '0')}:00`);
            if (!Number.isNaN(candidate.getTime())) at = candidate;
        }
        if (!at) {
            // الافتراضي: غداً الساعة 10:00 صباحاً
            at = new Date();
            at.setDate(at.getDate() + 1);
            at.setHours(10, 0, 0, 0);
        }
        return { title: (title || '').trim() || 'الجلسة القادمة', at };
    }, [title, targetDate, targetTime]);

    const [remaining, setRemaining] = useState<Remaining>(() => computeRemaining(target.at));
    const intervalRef = useRef<number | null>(null);

    // إعادة الحساب فوراً عند تغيّر الهدف من الخصائص
    useEffect(() => {
        setRemaining(computeRemaining(target.at));
    }, [target]);

    useEffect(() => {
        intervalRef.current = window.setInterval(() => {
            setRemaining(computeRemaining(target.at));
        }, 1000);
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        };
    }, [target.at]);

    const dateLabel = useMemo(
        () =>
            new Intl.DateTimeFormat('ar-SA', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
            }).format(target.at),
        [target.at]
    );

    const cells: { label: string; value: number }[] = [
        { label: 'يوم', value: remaining.days },
        { label: 'ساعة', value: remaining.hours },
        { label: 'دقيقة', value: remaining.minutes },
        { label: 'ثانية', value: remaining.seconds },
    ];

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
                @keyframes cdn-pop { from { opacity: .25; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
                .cdn-num { display: inline-block; animation: cdn-pop .35s ease-out; }
            `}</style>

            {/* عنوان الحدث */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <CalendarClock size={16} style={{ color: 'var(--law-gold, #c9a227)', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-heading, #1e2a4a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {target.title}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--color-text-secondary, #6b7280)' }}>{dateLabel}</div>
                </div>
            </div>

            {/* الجسم: البطاقات أو رسالة الوصول */}
            {remaining.done ? (
                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: 0 }}>
                    <CheckCircle2 size={40} style={{ color: 'var(--status-green, #16a34a)' }} />
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--status-green, #16a34a)' }}>حان الموعد</div>
                </div>
            ) : (
                <div style={{ flex: '1 1 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', minHeight: 0 }}>
                    {cells.map((c) => (
                        <div
                            key={c.label}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                background: 'var(--law-navy, #1e2a4a)',
                                borderRadius: '10px',
                                padding: '6px 2px',
                            }}
                        >
                            <span
                                key={c.value}
                                className="cdn-num"
                                style={{
                                    fontSize: 'clamp(20px, 8vw, 30px)',
                                    fontWeight: 800,
                                    color: '#fff',
                                    fontVariantNumeric: 'tabular-nums',
                                    lineHeight: 1,
                                }}
                            >
                                {pad2(c.value)}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--law-gold, #c9a227)' }}>{c.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CountdownWidget;
