import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ListTodo, AlertTriangle, Loader2 } from 'lucide-react';
import { useLiveWidget } from '../../../../services/widgetDataService';

/**
 * MyTasksWidget — «مهامي اليوم» 📡 حيّة بالكامل.
 * عدادات كبيرة (مفتوحة/قيد التنفيذ/متأخرة) بأسلوب ودجتس iOS النظيف +
 * قائمة أقرب المهام المستحقة. المصدر: مفتاح tasks_summary في
 * /dashboard/widget-data (Task::assignedToUser — مهامي أنا).
 */

interface Payload {
    counts: { open: number; in_progress: number; overdue: number; completed_week: number };
    next: Array<{ id: number; title: string; status: string; priority: string | null; due_date: string | null; case_id: number | null }>;
}

const fmtNum = (n: number) => n.toLocaleString('ar-SA');

function dueLabel(due: string | null): { text: string; late: boolean } {
    if (!due) return { text: 'بلا موعد', late: false };
    const d = new Date(`${due}T00:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return { text: `متأخرة ${fmtNum(Math.abs(diff))} ي`, late: true };
    if (diff === 0) return { text: 'اليوم', late: false };
    if (diff === 1) return { text: 'غداً', late: false };
    return { text: `بعد ${fmtNum(diff)} ي`, late: false };
}

const MyTasksWidget: React.FC<{ showCompleted?: boolean }> = ({ showCompleted = true }) => {
    const navigate = useNavigate();
    const { data, loading } = useLiveWidget<Payload>('tasks_summary');

    if (loading && !data) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    // لا بيانات وهمية أبداً — فشل الجلب = رسالة صادقة (قرار المالك 2026-07-22)
    if (!data) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--color-text-secondary)', direction: 'rtl' }}>
                تعذّر جلب مهامك — حدّث الصفحة
            </div>
        );
    }

    const { counts, next } = data;

    const stat = (value: number, label: string, color: string) => (
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '8px 4px', borderRadius: 12, background: 'color-mix(in srgb, ' + color + ' 8%, transparent)' }}>
            <div style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(value)}</div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: 2 }}>{label}</div>
        </div>
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 10, direction: 'rtl', padding: '4px 2px' }}>
            {/* رأس صغير ثانوي بروح ودجتس iOS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ListTodo size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-heading)' }}>مهامي</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 10, color: 'var(--color-text-secondary)' }}>
                    {showCompleted ? `أنجزت ${fmtNum(counts.completed_week)} هذا الأسبوع` : ''}
                </span>
            </div>

            {/* العدادات */}
            <div style={{ display: 'flex', gap: 8 }}>
                {stat(counts.open, 'مفتوحة', 'var(--law-navy, #1e2a4a)')}
                {stat(counts.in_progress, 'قيد التنفيذ', 'var(--status-blue, #0284C7)')}
                {stat(counts.overdue, 'متأخرة', 'var(--status-red, #dc2626)')}
            </div>

            {/* أقرب المستحقة */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {next.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        لا مهام مستحقة قريباً ✅
                    </div>
                )}
                {next.map((t) => {
                    const due = dueLabel(t.due_date);
                    return (
                        <button
                            key={t.id}
                            className="lab-no-drag"
                            onClick={() => navigate(`/tasks/${t.id}`)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '7px 9px', borderRadius: 10,
                                border: '1px solid var(--color-border)',
                                background: 'transparent', cursor: 'pointer',
                                textAlign: 'start', width: '100%',
                            }}
                        >
                            <span style={{
                                width: 7, height: 7, borderRadius: 99, flexShrink: 0,
                                background: t.priority === 'high' ? 'var(--status-red, #dc2626)' : t.priority === 'medium' ? 'var(--status-orange, #d97706)' : 'var(--quiet-gray-300, #d1d5db)',
                            }} />
                            <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.title}
                            </span>
                            <span style={{
                                fontSize: 10.5, fontWeight: 700, flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                                color: due.late ? 'var(--status-red, #dc2626)' : 'var(--color-text-secondary)',
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                            }}>
                                {due.late && <AlertTriangle size={11} />}
                                {due.text}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MyTasksWidget;
