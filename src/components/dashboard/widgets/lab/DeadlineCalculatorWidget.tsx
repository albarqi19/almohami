import React, { useMemo, useState } from 'react';
import { CalendarClock, Hourglass, Gavel, CalendarDays } from 'lucide-react';

/**
 * DeadlineCalculatorWidget — حاسبة المهل النظامية.
 *
 * أداة حسابية بحتة (بلا backend ولا شبكة): تاريخ بداية + عدد أيام ⇒ تاريخ الاستحقاق
 * بالميلادي والهجري (Intl ar-SA) مع عدّاد الأيام المتبقية ملوّن حسب القرب.
 *
 * لاحقاً يمكن تعبئة «تاريخ البداية» تلقائياً من مهل القضية الحقيقية في نظام
 * «المهل النظامية» (deadlineService.summary / جدول legal_deadlines) بدل إدخاله يدوياً.
 */

const MS_DAY = 86_400_000;

const toISODate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const parseISO = (s: string): Date => {
    const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
    return new Date(y || 1970, (m || 1) - 1, d || 1);
};

interface Urgency {
    label: string;
    color: string;
    bg: string;
}

const urgencyFor = (remaining: number): Urgency => {
    if (remaining < 0) return { label: 'انقضت المهلة', color: 'var(--quiet-gray-500, #6b7280)', bg: 'var(--quiet-gray-100, #f3f4f6)' };
    if (remaining === 0) return { label: 'تنتهي اليوم', color: '#dc2626', bg: '#fee2e2' };
    if (remaining <= 7) return { label: 'قريبة جداً', color: '#dc2626', bg: '#fee2e2' };
    if (remaining <= 30) return { label: 'تقترب', color: '#ea580c', bg: '#ffedd5' };
    return { label: 'متسّع من الوقت', color: 'var(--status-green, #16a34a)', bg: 'var(--status-green-light, #dcfce7)' };
};

const DeadlineCalculatorWidget: React.FC = () => {
    const today = useMemo(() => {
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    const [startStr, setStartStr] = useState<string>(() => toISODate(today));
    const [daysStr, setDaysStr] = useState<string>('30');
    // نوع الشريحة المختارة لإبرازها بصرياً
    const [activePreset, setActivePreset] = useState<string>('اعتراض');

    const days = Math.max(0, parseInt(daysStr || '0', 10) || 0);

    const result = useMemo(() => {
        const start = parseISO(startStr);
        start.setHours(0, 0, 0, 0);
        const r = new Date(start);
        r.setDate(r.getDate() + days);
        return r;
    }, [startStr, days]);

    const remaining = Math.round((result.getTime() - today.getTime()) / MS_DAY);
    const urgency = urgencyFor(remaining);

    const gregLabel = useMemo(
        () =>
            new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(result),
        [result]
    );

    const hijriLabel = useMemo(
        () =>
            new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(result),
        [result]
    );

    const setPreset = (label: string, value: number) => {
        setActivePreset(label);
        setDaysStr(String(value));
    };

    const remainingText = remaining < 0 ? String(Math.abs(remaining)) : String(remaining);

    const inputStyle: React.CSSProperties = {
        width: '100%',
        boxSizing: 'border-box',
        padding: '7px 10px',
        borderRadius: '8px',
        border: '1px solid var(--color-border, #e5e7eb)',
        background: 'var(--dashboard-card, #ffffff)',
        color: 'var(--color-heading)',
        fontSize: '13px',
        fontFamily: 'inherit',
        fontVariantNumeric: 'tabular-nums',
        outline: 'none',
    };

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                gap: '10px',
                padding: '4px 2px',
                minHeight: 0,
            }}
        >
            <style>{`
                @keyframes dcw-pop {
                    from { opacity: 0; transform: translateY(6px) scale(.985); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .dcw-result { animation: dcw-pop .38s cubic-bezier(.22,.61,.36,1) both; }
                .dcw-chip { transition: transform .12s ease; }
                .dcw-chip:hover { transform: translateY(-1px); }
                .dcw-chip:active { transform: translateY(0); }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <CalendarClock size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    حاسبة المهل النظامية
                </span>
            </div>

            {/* المدخلات */}
            <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                <label style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                        تاريخ البداية
                    </span>
                    <input
                        type="date"
                        className="lab-no-drag"
                        value={startStr}
                        onChange={(e) => setStartStr(e.target.value)}
                        style={inputStyle}
                    />
                </label>
                <label style={{ width: '92px', flex: '0 0 auto' }}>
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '3px' }}>
                        عدد الأيام
                    </span>
                    <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        className="lab-no-drag"
                        value={daysStr}
                        onChange={(e) => {
                            setDaysStr(e.target.value.replace(/[^0-9]/g, ''));
                            setActivePreset('');
                        }}
                        style={{ ...inputStyle, textAlign: 'center' }}
                    />
                </label>
            </div>

            {/* شرائح جاهزة */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: '0 0 auto' }}>
                {[
                    { label: 'اعتراض', value: 30, gold: true },
                    { label: '30 يوماً', value: 30, gold: false },
                    { label: '60 يوماً', value: 60, gold: false },
                    { label: '90 يوماً', value: 90, gold: false },
                ].map((p) => {
                    const active = activePreset === p.label;
                    return (
                        <button
                            key={p.label}
                            type="button"
                            className="dcw-chip lab-no-drag"
                            onClick={() => setPreset(p.label, p.value)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                border: `1px solid ${
                                    active
                                        ? 'var(--law-navy, #1e2a4a)'
                                        : p.gold
                                        ? 'var(--law-gold, #c9a227)'
                                        : 'var(--color-border, #e5e7eb)'
                                }`,
                                background: active
                                    ? 'var(--law-navy, #1e2a4a)'
                                    : p.gold
                                    ? 'transparent'
                                    : 'var(--quiet-gray-100, #f3f4f6)',
                                color: active
                                    ? '#ffffff'
                                    : p.gold
                                    ? 'var(--law-gold, #c9a227)'
                                    : 'var(--color-text-secondary)',
                            }}
                        >
                            {p.gold && <Gavel size={11} />}
                            {p.label}
                        </button>
                    );
                })}
            </div>

            {/* النتيجة */}
            <div
                key={`${toISODate(result)}-${days}`}
                className="dcw-result"
                style={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    background: 'var(--law-navy-light, #eef1f8)',
                }}
            >
                {/* عدّاد الأيام المتبقية */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '34px',
                            height: '34px',
                            borderRadius: '9px',
                            background: urgency.bg,
                            color: urgency.color,
                            flex: '0 0 auto',
                        }}
                    >
                        <Hourglass size={17} />
                    </span>
                    <div style={{ lineHeight: 1.1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                            <span
                                style={{
                                    fontSize: '30px',
                                    fontWeight: 800,
                                    color: urgency.color,
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '-0.5px',
                                }}
                            >
                                {remainingText}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                {remaining < 0 ? 'يوماً منقضية' : 'يوماً متبقياً'}
                            </span>
                        </div>
                        <span
                            style={{
                                display: 'inline-block',
                                marginTop: '3px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: urgency.color,
                            }}
                        >
                            {urgency.label}
                        </span>
                    </div>
                </div>

                {/* التاريخ الناتج */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        paddingTop: '10px',
                        borderTop: '1px dashed var(--color-border, #e5e7eb)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <CalendarDays size={14} style={{ color: 'var(--law-navy, #1e2a4a)', flex: '0 0 auto' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>{gregLabel}</span>
                        <span style={{ fontSize: '10px', color: 'var(--quiet-gray-400, #9ca3af)', marginRight: 'auto' }}>ميلادي</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ width: '14px', flex: '0 0 auto' }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{hijriLabel}</span>
                        <span style={{ fontSize: '10px', color: 'var(--quiet-gray-400, #9ca3af)', marginRight: 'auto' }}>هجري</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeadlineCalculatorWidget;
