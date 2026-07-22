import React from 'react';
import { Scale, CheckCircle2, CircleDot, Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * CaseTimelineWidget — الخط الزمني لمراحل القضية.
 *
 * ودجت «عرض» ببيانات ديمو محلية (بلا backend ولا شبكة): خط رأسي بعُقد ملوّنة
 * لمراحل الدعوى مع حالة كل مرحلة (تمّ/جارٍ/قادم).
 * لاحقاً تُجلب المراحل الحقيقية من «الخط الزمني الإجرائي» للقضية
 * (جدول أحداث القضية / caseTimelineService) بدل المصفوفة أدناه.
 */

type StatusKey = 'done' | 'active' | 'upcoming';

interface StatusMeta {
    label: string;
    icon: LucideIcon;
    color: string;
    bg: string;
}

const STATUS: Record<StatusKey, StatusMeta> = {
    done: { label: 'تمّ', icon: CheckCircle2, color: 'var(--status-green, #16a34a)', bg: 'var(--status-green-light, #dcfce7)' },
    active: { label: 'جارٍ', icon: CircleDot, color: '#2563eb', bg: '#dbeafe' },
    upcoming: { label: 'قادم', icon: Circle, color: 'var(--quiet-gray-400, #9ca3af)', bg: 'var(--quiet-gray-100, #f3f4f6)' },
};

interface Stage {
    title: string;
    date: string;
    status: StatusKey;
}

const STAGES: Stage[] = [
    { title: 'قيّدت الدعوى', date: '١٠ مايو ٢٠٢٦', status: 'done' },
    { title: 'أول جلسة', date: '٢٨ مايو ٢٠٢٦', status: 'done' },
    { title: 'مذكرة الرد', date: '١٥ يونيو ٢٠٢٦', status: 'active' },
    { title: 'الحكم الابتدائي', date: 'مرتقب', status: 'upcoming' },
    { title: 'التنفيذ', date: 'مرتقب', status: 'upcoming' },
];

const CaseTimelineWidget: React.FC = () => {
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
                @keyframes ctl-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
                @keyframes ctl-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes ctl-pulse { 0% { transform: scale(1); opacity: .5; } 70% { transform: scale(1.9); opacity: 0; } 100% { transform: scale(1.9); opacity: 0; } }
                .ctl-line { transform-origin: top; animation: ctl-grow .8s cubic-bezier(.65,0,.35,1) both; }
                .ctl-node { animation: ctl-in .45s ease both; }
                .ctl-ring { animation: ctl-pulse 2.4s ease-out infinite; }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <Scale size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    الخط الزمني للقضية
                </span>
                <span style={{ fontSize: '10.5px', color: 'var(--quiet-gray-400, #9ca3af)', marginRight: 'auto', fontVariantNumeric: 'tabular-nums' }}>
                    قضية ٤٥٨٧
                </span>
            </div>

            {/* الخط الزمني */}
            <div
                style={{
                    position: 'relative',
                    flex: '1 1 auto',
                    minHeight: 0,
                    overflowY: 'auto',
                    paddingTop: '2px',
                }}
            >
                {/* الخط الرأسي المتحرّك — يُرسم بحركة scaleY عند التحميل */}
                <span
                    className="ctl-line"
                    style={{
                        position: 'absolute',
                        top: '12px',
                        bottom: '12px',
                        right: '11px',
                        width: '2px',
                        borderRadius: '2px',
                        background: 'var(--color-border, #e5e7eb)',
                    }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative' }}>
                    {STAGES.map((s, i) => {
                        const meta = STATUS[s.status];
                        const Icon = meta.icon;
                        return (
                            <div
                                key={s.title}
                                className="ctl-node"
                                style={{
                                    animationDelay: `${180 + i * 130}ms`,
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    padding: '6px 0',
                                }}
                            >
                                {/* العُقدة */}
                                <span
                                    style={{
                                        position: 'relative',
                                        width: '24px',
                                        flex: '0 0 auto',
                                        display: 'flex',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {s.status === 'active' && (
                                        <span
                                            className="ctl-ring"
                                            style={{
                                                position: 'absolute',
                                                top: '1px',
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                background: meta.color,
                                            }}
                                        />
                                    )}
                                    <span
                                        style={{
                                            position: 'relative',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '50%',
                                            background: 'var(--dashboard-card, #ffffff)',
                                            color: meta.color,
                                            border: `2px solid ${meta.color}`,
                                            boxSizing: 'border-box',
                                        }}
                                    >
                                        <Icon size={12} />
                                    </span>
                                </span>

                                {/* المحتوى */}
                                <div style={{ minWidth: 0, flex: 1, paddingTop: '1px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                                            {s.title}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '9.5px',
                                                fontWeight: 700,
                                                padding: '1px 7px',
                                                borderRadius: '999px',
                                                color: meta.color,
                                                background: meta.bg,
                                            }}
                                        >
                                            {meta.label}
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            display: 'block',
                                            marginTop: '2px',
                                            fontSize: '11px',
                                            color: 'var(--color-text-secondary)',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {s.date}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CaseTimelineWidget;
