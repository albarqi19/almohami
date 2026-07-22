import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserX, ChevronDown, Loader2, ShieldCheck } from 'lucide-react';
import { useLiveWidget } from '../../../../services/widgetDataService';

/**
 * OverdueByAssigneeWidget — «متأخرات الفريق» 👑 (للإدارة).
 * المهام المتأخرة مجمّعة حسب الموظف: اسم + عدّاد أحمر + أقدم استحقاق،
 * وكل صف يتوسّع لأقدم 5 مهام. 📡 حيّة بالكامل من مفتاح overdue_by_assignee
 * (يظهر بالمعرض للإدارة فقط — والباك يرفض غير الإداريين).
 */

interface Payload {
    total: number;
    by_assignee: Array<{
        user_id: number;
        user_name: string;
        count: number;
        oldest_due: string | null;
        tasks: Array<{ id: number; title: string; due_date: string | null }>;
    }>;
}

const fmtNum = (n: number) => n.toLocaleString('ar-SA');

function lateDays(date: string | null): number {
    if (!date) return 0;
    const d = new Date(`${date}T00:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((today.getTime() - d.getTime()) / 86400000));
}

const OverdueByAssigneeWidget: React.FC = () => {
    const navigate = useNavigate();
    const { data, loading, live, error } = useLiveWidget<Payload>('overdue_by_assignee');
    const [openId, setOpenId] = useState<number | null>(null);

    if (loading && !data) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    // لا بيانات وهمية أبداً — فشل/رفض = رسالة صادقة (قرار المالك 2026-07-22)
    if (!live || !data) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--color-text-secondary)', direction: 'rtl' }}>
                {error === 'forbidden' ? 'هذه الودجت للإدارة فقط' : 'تعذّر جلب متأخرات الفريق — حدّث الصفحة'}
            </div>
        );
    }

    const payload = data;
    const rows = payload.by_assignee;

    if (payload.total === 0 || rows.length === 0) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--status-green, #16a34a)' }}>
                <ShieldCheck size={30} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>لا مهام متأخرة عند الفريق 🎉</div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8, direction: 'rtl', padding: '4px 2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserX size={14} style={{ color: 'var(--status-red, #dc2626)' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-heading)' }}>متأخرات الفريق</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 10, color: 'var(--status-red, #dc2626)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {`${fmtNum(payload.total)} مهمة متأخرة`}
                </span>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rows.map((r) => {
                    const open = openId === r.user_id;
                    const late = lateDays(r.oldest_due);
                    return (
                        <div key={r.user_id} style={{ border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
                            <button
                                className="lab-no-drag"
                                onClick={() => setOpenId(open ? null : r.user_id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'start',
                                }}
                            >
                                <span style={{
                                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'var(--law-navy-light, #eef1f8)', color: 'var(--law-navy, #1e2a4a)',
                                    fontSize: 11, fontWeight: 800,
                                }}>
                                    {r.user_name.trim().charAt(0) || '؟'}
                                </span>
                                <span style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--color-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {r.user_name}
                                    </span>
                                    {late > 0 && (
                                        <span style={{ display: 'block', fontSize: 10, color: 'var(--color-text-secondary)' }}>
                                            أقدمها متأخرة {fmtNum(late)} يوماً
                                        </span>
                                    )}
                                </span>
                                <span style={{
                                    fontSize: 12, fontWeight: 800, flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                                    color: 'var(--status-red, #dc2626)',
                                    background: 'var(--status-red-light, #fee2e2)',
                                    padding: '2px 9px', borderRadius: 999,
                                }}>
                                    {fmtNum(r.count)}
                                </span>
                                <ChevronDown size={14} style={{ color: 'var(--color-text-secondary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                            </button>
                            {open && (
                                <div style={{ borderTop: '1px solid var(--color-border)', padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {r.tasks.map((t) => (
                                        <button
                                            key={t.id}
                                            className="lab-no-drag"
                                            onClick={() => navigate(`/tasks/${t.id}`)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', padding: '3px 2px', textAlign: 'start' }}
                                        >
                                            <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--status-red, #dc2626)', flexShrink: 0 }} />
                                            <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--color-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                                            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{t.due_date || ''}</span>
                                        </button>
                                    ))}
                                    {r.count > r.tasks.length && (
                                        <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', paddingInlineStart: 11 }}>
                                            و{fmtNum(r.count - r.tasks.length)} أخرى…
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default OverdueByAssigneeWidget;
