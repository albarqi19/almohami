import React from 'react';
import { LayoutGrid, Zap, CalendarClock, Users, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * EisenhowerMatrixWidget — مصفوفة الأولويات (عاجل/غير عاجل × مهم/غير مهم).
 *
 * ودجت «عرض» ثابت ببيانات ديمو محلية لمكتب محاماة (بلا backend ولا شبكة).
 * لاحقاً يمكن تغذية الأرباع من المهام الحقيقية عبر تصنيف كل مهمة
 * حسب حقلَي «مهم/عاجل» (خدمة المهام taskService / جدول tasks).
 */

interface Quadrant {
    key: string;
    title: string; // الإجراء المقترح
    axis: string; // التصنيف (مهم · عاجل)
    icon: LucideIcon;
    color: string;
    bg: string;
    tasks: string[];
}

// الترتيب في RTL: العنصر الأول أعلى-اليمين ثم أعلى-اليسار ثم أسفل-اليمين ثم أسفل-اليسار
const QUADRANTS: Quadrant[] = [
    {
        key: 'do',
        title: 'نفّذ الآن',
        axis: 'مهم · عاجل',
        icon: Zap,
        color: '#dc2626',
        bg: '#fee2e2',
        tasks: ['مذكرة اعتراض تنتهي غداً', 'الرد على خطاب المحكمة', 'سداد رسم تنفيذ متأخر'],
    },
    {
        key: 'schedule',
        title: 'جدوِل',
        axis: 'مهم · غير عاجل',
        icon: CalendarClock,
        color: '#2563eb',
        bg: '#dbeafe',
        tasks: ['استراتيجية القضية ٤٥٨٧', 'تحديث نماذج العقود', 'تدريب المساعدين'],
    },
    {
        key: 'delegate',
        title: 'فوّض',
        axis: 'غير مهم · عاجل',
        icon: Users,
        color: '#ea580c',
        bg: '#ffedd5',
        tasks: ['تصوير مستندات الجلسة', 'حجز موعد كتابة عدل', 'متابعة الأرشفة'],
    },
    {
        key: 'delete',
        title: 'احذف',
        axis: 'غير مهم · غير عاجل',
        icon: Trash2,
        color: 'var(--quiet-gray-500, #6b7280)',
        bg: 'var(--quiet-gray-100, #f3f4f6)',
        tasks: ['رسائل ترويجية', 'اجتماعات بلا أجندة', 'تقارير مكرّرة'],
    },
];

const EisenhowerMatrixWidget: React.FC = () => {
    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                gap: '8px',
                padding: '4px 2px',
                minHeight: 0,
            }}
        >
            <style>{`
                @keyframes emx-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .emx-q { animation: emx-in .42s cubic-bezier(.22,.61,.36,1) both; }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <LayoutGrid size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    مصفوفة الأولويات
                </span>
            </div>

            {/* الشبكة 2×2 */}
            <div
                style={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: '8px',
                }}
            >
                {QUADRANTS.map((q, i) => {
                    const Icon = q.icon;
                    return (
                        <div
                            key={q.key}
                            className="emx-q"
                            style={{
                                animationDelay: `${i * 80}ms`,
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 0,
                                borderRadius: '10px',
                                border: '1px solid var(--color-border, #e5e7eb)',
                                background: 'var(--dashboard-card, #ffffff)',
                                overflow: 'hidden',
                            }}
                        >
                            {/* رأس الربع */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 8px',
                                    borderBottom: '1px solid var(--color-border, #e5e7eb)',
                                    borderRight: `3px solid ${q.color}`,
                                    background: q.bg,
                                    flex: '0 0 auto',
                                }}
                            >
                                <Icon size={13} style={{ color: q.color, flex: '0 0 auto' }} />
                                <span style={{ fontSize: '12px', fontWeight: 800, color: q.color, whiteSpace: 'nowrap' }}>
                                    {q.title}
                                </span>
                                <span
                                    style={{
                                        fontSize: '9.5px',
                                        color: q.color,
                                        opacity: 0.85,
                                        marginRight: 'auto',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {q.axis}
                                </span>
                            </div>

                            {/* المهام */}
                            <div
                                style={{
                                    flex: '1 1 auto',
                                    minHeight: 0,
                                    overflowY: 'auto',
                                    padding: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                }}
                            >
                                {q.tasks.map((t) => (
                                    <span
                                        key={t}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            color: 'var(--color-heading)',
                                            lineHeight: 1.35,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: '5px',
                                                height: '5px',
                                                borderRadius: '50%',
                                                background: q.color,
                                                flex: '0 0 auto',
                                            }}
                                        />
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default EisenhowerMatrixWidget;
