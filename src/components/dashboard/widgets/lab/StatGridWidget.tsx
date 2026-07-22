import React from 'react';
import {
    Briefcase,
    ListChecks,
    CalendarClock,
    UserPlus,
    Wallet,
    CheckCircle2,
    ArrowUp,
    ArrowDown,
    type LucideIcon,
} from 'lucide-react';

/**
 * StatGridWidget — «شبكة المؤشّرات».
 * شبكة مضغوطة من ٦ بطاقات مؤشّر (قيمة + تسمية + سهم اتجاه أخضر/أحمر + نسبة تغيّر)،
 * تظهر بتدرّج زمني لطيف عند التحميل. تصميم فلات أنيق يتمدّد بمرونة.
 *
 * ⚠️ بيانات ديمو محلية للعرض فقط.
 * المصدر الحقيقي لاحقاً: مؤشّرات لوحة القيادة الملخّصة —
 * مثل GET /dashboard/kpis → { activeCases, openTasks, weekSessions, newClients, monthCollected, completionRate }.
 */

interface Stat {
    icon: LucideIcon;
    label: string;
    value: string;
    change: number; // نسبة التغيّر (موجب=صعود)
}

const STATS: readonly Stat[] = [
    { icon: Briefcase, label: 'قضايا نشطة', value: '١٢٨', change: 4.2 },
    { icon: ListChecks, label: 'مهام مفتوحة', value: '٣٤٢', change: -3.1 },
    { icon: CalendarClock, label: 'جلسات الأسبوع', value: '٤٧', change: 8.0 },
    { icon: UserPlus, label: 'عملاء جدد', value: '١٩', change: 12.0 },
    { icon: Wallet, label: 'تحصيل الشهر', value: '٨٩٠ك', change: 6.5 },
    { icon: CheckCircle2, label: 'نسبة الإنجاز', value: '٧٤٪', change: 2.3 },
];

function fmtPct(n: number): string {
    return Math.abs(n).toLocaleString('ar-SA', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const StatGridWidget: React.FC = () => {
    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                direction: 'rtl',
                padding: '6px 4px 2px',
                gap: '6px',
            }}
        >
            <style>{`
                .sgw-card { opacity: 0; transform: translateY(6px); animation: sgw-in .5s cubic-bezier(.45,0,.2,1) forwards; }
                @keyframes sgw-in { to { opacity: 1; transform: translateY(0); } }
                @media (prefers-reduced-motion: reduce) { .sgw-card { animation: none; opacity: 1; transform: none; } }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Briefcase size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    مؤشّرات المكتب
                </span>
            </div>

            {/* الشبكة */}
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                    gap: '6px',
                    alignContent: 'start',
                }}
            >
                {STATS.map((s, i) => {
                    const up = s.change >= 0;
                    const color = up ? 'var(--status-green, #16a34a)' : 'var(--status-red, #dc2626)';
                    const Icon = s.icon;
                    return (
                        <div
                            key={i}
                            className="sgw-card"
                            style={{
                                animationDelay: `${i * 0.06}s`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                padding: '8px',
                                borderRadius: '9px',
                                background: 'var(--dashboard-card, #ffffff)',
                                border: '1px solid var(--color-border, #e5e7eb)',
                                boxSizing: 'border-box',
                            }}
                        >
                            {/* أعلى: أيقونة + شارة تغيّر */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Icon size={13} style={{ color: 'var(--law-navy, #1e2a4a)' }} />
                                <span
                                    style={{
                                        marginInlineStart: 'auto',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '1px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}
                                >
                                    {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                                    {fmtPct(s.change)}٪
                                </span>
                            </div>

                            {/* القيمة */}
                            <span
                                style={{
                                    fontSize: '20px',
                                    lineHeight: 1,
                                    fontWeight: 800,
                                    color: 'var(--law-navy, #1e2a4a)',
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '-0.5px',
                                }}
                            >
                                {s.value}
                            </span>

                            {/* التسمية */}
                            <span
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    color: 'var(--color-text-secondary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default StatGridWidget;
