import React, { useCallback, useMemo } from 'react';
import { Laugh, Smile, Meh, Frown, Annoyed } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * TeamMoodWidget — مقياس مزاج الفريق اليوم.
 *
 * يختار المستخدم حالته اليوم من خمس (ممتاز → متعب)؛ يُحفظ الاختيار مربوطاً
 * بتاريخ اليوم فيثبت حتى الغد — عبر useWidgetContent (داخل اللوح يتزامن مع
 * الخادم؛ خارجه 📌 localStorage). المتوسّط وتوزيع الفريق أدناه ديمو للعرض فقط.
 * (لاحقاً: يُجمع المزاج فعلياً عبر endpoint مثل GET /dashboard/team-mood
 *  فيُستبدل التوزيع الديمو بأرقام حقيقية مجهّلة على مستوى الفريق.)
 */

type MoodId = 'great' | 'good' | 'okay' | 'stressed' | 'tired';

interface Mood {
    id: MoodId;
    score: number; // 5..1
    label: string;
    Icon: React.ComponentType<{ size?: number | string; strokeWidth?: number; style?: React.CSSProperties }>;
    color: string;
    light: string;
}

const MOODS: Mood[] = [
    { id: 'great', score: 5, label: 'ممتاز', Icon: Laugh, color: 'var(--status-green, #16a34a)', light: 'var(--status-green-light, #dcfce7)' },
    { id: 'good', score: 4, label: 'جيّد', Icon: Smile, color: '#2563eb', light: '#dbeafe' },
    { id: 'okay', score: 3, label: 'عادي', Icon: Meh, color: 'var(--quiet-gray-500, #6b7280)', light: 'var(--quiet-gray-100, #f3f4f6)' },
    { id: 'stressed', score: 2, label: 'متوتّر', Icon: Frown, color: '#ea580c', light: '#ffedd5' },
    { id: 'tired', score: 1, label: 'متعب', Icon: Annoyed, color: '#dc2626', light: '#fee2e2' },
];

// توزيع ديمو لأعضاء الفريق (عدد لكل حالة) — يُستبدل ببيانات حقيقية لاحقاً
const TEAM_DEMO: Record<MoodId, number> = { great: 4, good: 6, okay: 3, stressed: 2, tired: 1 };

const STORAGE_KEY = 'lab_mood_v1';

const todayStamp = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface MoodStored {
    date: string;
    mood: MoodId | null;
}

const parseMood = (raw: unknown): MoodStored => {
    const parsed = (raw || {}) as { date?: string; mood?: string };
    if (parsed.date === todayStamp() && MOODS.some((m) => m.id === parsed.mood)) {
        return { date: todayStamp(), mood: parsed.mood as MoodId };
    }
    return { date: todayStamp(), mood: null };
};

const TeamMoodWidget: React.FC = () => {
    const [stored, setStored] = useWidgetContent<MoodStored>(STORAGE_KEY, parseMood);
    const picked = stored.mood;
    const setPicked = useCallback(
        (m: MoodId) => setStored({ date: todayStamp(), mood: m }),
        [setStored]
    );

    const { total, avgMood } = useMemo(() => {
        const t = MOODS.reduce((s, m) => s + TEAM_DEMO[m.id], 0);
        const weighted = MOODS.reduce((s, m) => s + m.score * TEAM_DEMO[m.id], 0);
        const avgScore = t ? weighted / t : 3;
        // أقرب حالة للمتوسّط
        const nearest = MOODS.reduce((best, m) =>
            Math.abs(m.score - avgScore) < Math.abs(best.score - avgScore) ? m : best,
        MOODS[2]);
        return { total: t, avgMood: nearest };
    }, []);

    const AvgIcon = avgMood.Icon;

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                padding: '10px 12px',
                gap: '10px',
                background: 'var(--dashboard-card, #ffffff)',
            }}
        >
            <style>{`
                @keyframes tmw-pop { 0% { transform: scale(.7); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
                .tmw-face { transition: transform .16s ease, background .18s ease, border-color .18s ease; cursor: pointer; }
                .tmw-face:hover { transform: translateY(-2px); }
                .tmw-face.tmw-on { animation: tmw-pop .32s ease; }
                @keyframes tmw-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
                .tmw-seg { transform-origin: right center; animation: tmw-grow .5s ease both; }
            `}</style>

            {/* الرأس */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '0 0 auto' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--law-navy, #1e2a4a)' }}>
                    كيف حالك اليوم؟
                </span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary, #6b7280)' }}>
                    {picked ? 'شكراً، سُجّل مزاجك' : 'اختر وجهاً'}
                </span>
            </div>

            {/* صفّ الوجوه الخمسة */}
            <div style={{ display: 'flex', gap: '6px', flex: '0 0 auto' }}>
                {MOODS.map((m) => {
                    const on = picked === m.id;
                    const MIcon = m.Icon;
                    return (
                        <button
                            key={m.id}
                            type="button"
                            className={`tmw-face lab-no-drag${on ? ' tmw-on' : ''}`}
                            onClick={() => setPicked(m.id)}
                            title={m.label}
                            aria-label={m.label}
                            aria-pressed={on}
                            style={{
                                flex: '1 1 0',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 2px',
                                borderRadius: '9px',
                                border: `1.5px solid ${on ? m.color : 'var(--color-border, #e5e7eb)'}`,
                                background: on ? m.light : 'var(--dashboard-card, #ffffff)',
                            }}
                        >
                            <MIcon size={22} strokeWidth={2.2} style={{ color: on ? m.color : 'var(--quiet-gray-400, #9ca3af)' }} />
                            <span
                                style={{
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    color: on ? m.color : 'var(--color-text-secondary, #6b7280)',
                                }}
                            >
                                {m.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* متوسّط الفريق */}
            <div
                style={{
                    marginTop: 'auto',
                    flex: '0 0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                    paddingTop: '9px',
                    borderTop: '1px solid var(--color-border, #e5e7eb)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary, #6b7280)' }}>
                        متوسّط الفريق
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <AvgIcon size={16} strokeWidth={2.3} style={{ color: avgMood.color }} />
                        <span style={{ fontSize: '12px', fontWeight: 800, color: avgMood.color }}>{avgMood.label}</span>
                    </span>
                </div>

                {/* شريط التوزيع الملوّن */}
                <div
                    style={{
                        display: 'flex',
                        height: '10px',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        background: 'var(--quiet-gray-100, #f3f4f6)',
                    }}
                >
                    {MOODS.map((m) => {
                        const pct = total ? (TEAM_DEMO[m.id] / total) * 100 : 0;
                        if (pct === 0) return null;
                        return (
                            <span
                                key={m.id}
                                className="tmw-seg"
                                title={`${m.label}: ${TEAM_DEMO[m.id]}`}
                                style={{ width: `${pct}%`, background: m.color, display: 'block' }}
                            />
                        );
                    })}
                </div>

                <span style={{ fontSize: '10px', color: 'var(--quiet-gray-500, #6b7280)', fontVariantNumeric: 'tabular-nums' }}>
                    شارك {total} من الفريق اليوم
                </span>
            </div>
        </div>
    );
};

export default TeamMoodWidget;
