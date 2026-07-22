import React, { useMemo, useState } from 'react';
import { Sparkles, RefreshCw, Quote } from 'lucide-react';
import { useLiveWidget } from '../../../services/widgetDataService';

/**
 * DailyWisdomWidget — «لمسة اليوم» (حكمة/قاعدة/نصيحة قانونية يومية).
 *
 * 📡 حيّة: تجلب لمسة اليوم الفعلية من daily_legal_tips عبر
 * /dashboard/widget-data (مفتاح daily_tip — نفس اختيار نشرة الصباح الحتمي).
 * إن كانت بوابة المكتب مطفأة أو تعذّر الجلب، تعمل بالديمو المحلي.
 */

interface Tip {
    kind: string;
    content: string;
    source: string;
}

interface ServerTip {
    kind: 'statute' | 'principle' | 'advice' | 'light' | string;
    title: string | null;
    content: string;
    source: string | null;
}

const KIND_LABEL: Record<string, string> = {
    statute: 'مادة نظامية',
    principle: 'قاعدة فقهية',
    advice: 'نصيحة مهنية',
    light: 'لمسة',
};

const DEMO_TIPS: Tip[] = [
    { kind: 'قاعدة فقهية', content: 'اليقين لا يزول بالشك.', source: 'القواعد الفقهية الكبرى' },
    { kind: 'قاعدة فقهية', content: 'الأصل براءة الذمة.', source: 'القواعد الفقهية' },
    { kind: 'قاعدة فقهية', content: 'المشقّة تجلب التيسير.', source: 'القواعد الفقهية الكبرى' },
    { kind: 'قاعدة فقهية', content: 'العادة محكّمة ما لم تخالف نصاً.', source: 'القواعد الفقهية' },
    { kind: 'قاعدة فقهية', content: 'البيّنة على من ادّعى واليمين على من أنكر.', source: 'أصل قضائي' },
    { kind: 'نصيحة مهنية', content: 'راجع مواعيد الاعتراض قبل انقضائها بيومين على الأقل — المهلة لا تُعاد.', source: 'ممارسة مكتبية' },
    { kind: 'نصيحة مهنية', content: 'وثّق كل مخاطبة مع العميل كتابةً؛ الذاكرة تُخطئ والمستند لا.', source: 'ممارسة مكتبية' },
    { kind: 'لمسة', content: 'ابدأ يومك بأصعب مذكرة — الذهن أصفى في أوله.', source: 'لمسة صباح' },
];

const DailyWisdomWidget: React.FC<{ showSource?: boolean }> = ({ showSource = true }) => {
    // اختيار حتمي حسب يوم السنة (يطابق منطق tipForToday في الباك)
    const dayIndex = useMemo(() => {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - start.getTime();
        const dayOfYear = Math.floor(diff / 86400000);
        return dayOfYear % DEMO_TIPS.length;
    }, []);

    const { data: serverTip } = useLiveWidget<ServerTip | null>('daily_tip');

    const [offset, setOffset] = useState(0);
    // اللمسة الحية أولاً؛ «لمسة أخرى» تتنقل في الديمو المحلي (الخادم يعيد واحدة يومياً)
    const tip: Tip = (serverTip && offset === 0)
        ? {
            kind: KIND_LABEL[serverTip.kind] || serverTip.kind,
            content: serverTip.title ? `${serverTip.title} — ${serverTip.content}` : serverTip.content,
            source: serverTip.source || 'لمسة اليوم',
        }
        : DEMO_TIPS[(dayIndex + offset) % DEMO_TIPS.length];

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '12px',
                padding: '6px 4px',
                position: 'relative',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--law-gold, #c9a227)',
                    }}
                >
                    <Sparkles size={14} />
                    {tip.kind}
                </span>
                <button
                    onClick={() => setOffset((o) => o + 1)}
                    className="lab-no-drag"
                    title="لمسة أخرى"
                    style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: 'var(--color-text-secondary)',
                        display: 'flex',
                        padding: '4px',
                        borderRadius: '6px',
                    }}
                >
                    <RefreshCw size={13} />
                </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <Quote size={18} style={{ color: 'var(--law-navy, #1e2a4a)', opacity: 0.35, flexShrink: 0, marginTop: '2px' }} />
                <p
                    style={{
                        margin: 0,
                        fontSize: '15px',
                        lineHeight: 1.7,
                        fontWeight: 600,
                        color: 'var(--color-heading)',
                    }}
                >
                    {tip.content}
                </p>
            </div>

            {showSource && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'left' }}>
                    — {tip.source}
                </div>
            )}
        </div>
    );
};

export default DailyWisdomWidget;
