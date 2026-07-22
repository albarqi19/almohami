import React, { useMemo } from 'react';
import { Hourglass, AlertTriangle, Scale } from 'lucide-react';

/**
 * LimitationTrackerWidget — مسطرة التقادم.
 *
 * قضايا ديمو يقترب فيها سقوط الحق بالتقادم: تاريخ السقوط + الأيام المتبقية،
 * بعدّادات ملوّنة حسب الخطورة وتنبيه علوي بعدد القضايا الحرجة.
 * ⚠️ بيانات ديمو محلية للعرض فقط.
 * تُربط لاحقاً بجدول القضايا (تاريخ نشوء الحق + مدة التقادم النظامية للنوع
 * ⇒ تاريخ السقوط) بدل المصفوفة أدناه.
 */

type Severity = 'critical' | 'warning' | 'safe';

interface SevMeta {
    label: string;
    color: string;
    bg: string;
}

const SEV: Record<Severity, SevMeta> = {
    critical: { label: 'حرج', color: 'var(--status-red, #dc2626)', bg: 'var(--status-red-light, #fee2e2)' },
    warning: { label: 'قريب', color: '#ea580c', bg: '#ffedd5' },
    safe: { label: 'متابعة', color: 'var(--status-green, #16a34a)', bg: 'var(--status-green-light, #dcfce7)' },
};

const severityOf = (days: number): Severity => {
    if (days <= 30) return 'critical';
    if (days <= 90) return 'warning';
    return 'safe';
};

interface RawCase {
    file: string;
    title: string;
    kind: string;
    offsetDays: number; // الأيام المتبقية حتى السقوط (ديمو)
}

// ديمو — أرقام واقعية لمسطرة التقادم
const RAW_CASES: RawCase[] = [
    { file: '٤٦١٢', title: 'مطالبة أتعاب — شركة الأفق', kind: 'تجاري', offsetDays: 9 },
    { file: '٤٥٨٧', title: 'تعويض إصابة عمل — م. القحطاني', kind: 'عمالي', offsetDays: 24 },
    { file: '٤٧٠٣', title: 'استرداد مبالغ — مؤسسة النخبة', kind: 'مطالبة مالية', offsetDays: 47 },
    { file: '٤٣٩٨', title: 'إخلاء عقار — ورثة الدوسري', kind: 'عقاري', offsetDays: 78 },
    { file: '٤٨١١', title: 'فسخ عقد توريد — مصنع الرواد', kind: 'تجاري', offsetDays: 118 },
    { file: '٤٥٠٢', title: 'مطالبة تأمين — الوفاء الطبية', kind: 'تأميني', offsetDays: 163 },
];

const dateFmt = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

const LimitationTrackerWidget: React.FC = () => {
    const { cases, criticalCount } = useMemo(() => {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        const MS_DAY = 86_400_000;
        const list = RAW_CASES.map((c) => {
            const target = new Date(base.getTime() + c.offsetDays * MS_DAY);
            return {
                ...c,
                severity: severityOf(c.offsetDays),
                dateLabel: dateFmt.format(target),
            };
        }).sort((a, b) => a.offsetDays - b.offsetDays);
        return {
            cases: list,
            criticalCount: list.filter((c) => c.severity === 'critical').length,
        };
    }, []);

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                gap: '9px',
                padding: '4px 2px',
                minHeight: 0,
            }}
        >
            <style>{`
                @keyframes ltw-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes ltw-pulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
                .ltw-row { animation: ltw-in .4s ease both; }
                .ltw-alert { animation: ltw-in .45s ease both; }
                .ltw-dot { animation: ltw-pulse 1.8s ease-in-out infinite; }
                .ltw-scroll { scrollbar-width: thin; scrollbar-color: var(--quiet-gray-300, #d1d5db) transparent; }
                .ltw-scroll::-webkit-scrollbar { width: 5px; }
                .ltw-scroll::-webkit-scrollbar-thumb { background: var(--quiet-gray-300, #d1d5db); border-radius: 4px; }
                @media (prefers-reduced-motion: reduce) { .ltw-row, .ltw-alert, .ltw-dot { animation: none; } }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <Hourglass size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    مسطرة التقادم
                </span>
                <span style={{ marginRight: 'auto', fontSize: '10.5px', color: 'var(--quiet-gray-400, #9ca3af)', fontVariantNumeric: 'tabular-nums' }}>
                    {cases.length.toLocaleString('ar-SA')} قضية
                </span>
            </div>

            {/* تنبيه القضايا الحرجة */}
            {criticalCount > 0 && (
                <div
                    className="ltw-alert"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 11px',
                        borderRadius: '9px',
                        background: 'var(--status-red-light, #fee2e2)',
                        border: '1px solid var(--status-red, #dc2626)',
                        flex: '0 0 auto',
                    }}
                >
                    <AlertTriangle size={15} style={{ color: 'var(--status-red, #dc2626)', flexShrink: 0 }} />
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--status-red, #dc2626)', lineHeight: 1.4 }}>
                        {criticalCount.toLocaleString('ar-SA')} قضايا حرجة تقترب من سقوط الحق بالتقادم
                    </span>
                </div>
            )}

            {/* القائمة */}
            <div className="ltw-scroll" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cases.map((c, i) => {
                    const meta = SEV[c.severity];
                    return (
                        <div
                            key={c.file}
                            className="ltw-row"
                            style={{
                                animationDelay: `${i * 65}ms`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '9px',
                                padding: '8px 10px',
                                borderRadius: '9px',
                                border: '1px solid var(--color-border, #e5e7eb)',
                                background: 'var(--dashboard-card, #ffffff)',
                                borderRight: `3px solid ${meta.color}`,
                            }}
                        >
                            {/* المحتوى */}
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.title}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <Scale size={10} style={{ color: 'var(--quiet-gray-400, #9ca3af)' }} />
                                        قضية {c.file}
                                    </span>
                                    <span style={{ padding: '1px 6px', borderRadius: '999px', background: 'var(--quiet-gray-100, #f3f4f6)', fontWeight: 700 }}>
                                        {c.kind}
                                    </span>
                                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{c.dateLabel}</span>
                                </div>
                            </div>

                            {/* العدّاد */}
                            <div
                                style={{
                                    flex: '0 0 auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '50px',
                                    padding: '5px 8px',
                                    borderRadius: '8px',
                                    background: meta.bg,
                                }}
                            >
                                <span
                                    className={c.severity === 'critical' ? 'ltw-dot' : undefined}
                                    style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1, color: meta.color, fontVariantNumeric: 'tabular-nums' }}
                                >
                                    {c.offsetDays.toLocaleString('ar-SA')}
                                </span>
                                <span style={{ fontSize: '8.5px', fontWeight: 700, color: meta.color, marginTop: '2px' }}>
                                    يوم · {meta.label}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LimitationTrackerWidget;
