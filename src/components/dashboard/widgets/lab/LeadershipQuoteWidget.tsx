import React, { useMemo, useState } from 'react';
import { Quote, RefreshCw } from 'lucide-react';

/**
 * LeadershipQuoteWidget — اقتباس قيادي متجدّد.
 *
 * عرض بحت مكتفٍ ذاتياً: مصفوفة اقتباسات إدارية/قيادية عربية مع قائلها.
 * الاختيار الافتراضي حتمي حسب يوم السنة ليثبت طوال اليوم لكل المستخدمين،
 * وزرّ «اقتباس آخر» يتنقّل يدوياً دون كسر الحتمية. لا backend.
 * (يمكن لاحقاً استبدال المصفوفة بمحتوى ملهم من جدول content_quotes إن رغبنا.)
 */

interface LeadershipQuote {
    text: string;
    author: string;
    role: string;
}

const QUOTES: LeadershipQuote[] = [
    { text: 'الإدارة أن تفعل الأشياء بشكل صحيح، والقيادة أن تفعل الأشياء الصحيحة.', author: 'بيتر دراكر', role: 'رائد علم الإدارة' },
    { text: 'القائد هو من يعرف الطريق، ويسلكه، ويدلّ عليه.', author: 'جون ماكسويل', role: 'خبير القيادة' },
    { text: 'اعتنِ بموظفيك، وهم سيعتنون بعملائك.', author: 'ريتشارد برانسون', role: 'مؤسّس فيرجن' },
    { text: 'الثقة تُبنى بالقطرات، وتُفقد بالدِّلاء.', author: 'حكمة إدارية', role: 'مأثور' },
    { text: 'أعظم مجدٍ ليس في ألا نسقط، بل في أن ننهض كلّما سقطنا.', author: 'كونفوشيوس', role: 'فيلسوف' },
    { text: 'الجودة ليست فعلاً نؤدّيه، بل عادةٌ نحياها.', author: 'أرسطو', role: 'فيلسوف' },
    { text: 'لا تُدِر الناس؛ بل قُدهم — أما الأشياء فتُدار.', author: 'غريس هوبر', role: 'قائدة رائدة' },
    { text: 'القرار الجيّد يأتي من الخبرة، والخبرة تأتي من القرارات السيّئة.', author: 'حكمة قيادية', role: 'مأثور' },
    { text: 'لا يُقاس النجاح بما بلغته من مكانة، بل بما تجاوزته من عقبات.', author: 'بوكر واشنطن', role: 'قائد ومصلح' },
    { text: 'من لا يخطّط للمستقبل، لن يجد له فيه مكاناً.', author: 'حكمة إدارية', role: 'مأثور' },
    { text: 'الرؤية بلا تنفيذ حُلم، والتنفيذ بلا رؤية كابوس.', author: 'حكمة استراتيجية', role: 'مأثور' },
    { text: 'أفضل القادة من يصنع قادةً لا أتباعاً.', author: 'رالف نادر', role: 'قائد مدني' },
];

// يوم السنة (1..366) لاختيار حتمي يثبت طيلة اليوم
const dayOfYear = (d: Date): number => {
    const start = Date.UTC(d.getFullYear(), 0, 0);
    const today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor((today - start) / 86400000);
};

const LeadershipQuoteWidget: React.FC = () => {
    const baseIndex = useMemo(() => dayOfYear(new Date()) % QUOTES.length, []);
    const [offset, setOffset] = useState<number>(0);

    const index = (baseIndex + offset) % QUOTES.length;
    const quote = QUOTES[index];

    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                padding: '12px 14px',
                gap: '10px',
                background: 'var(--dashboard-card, #ffffff)',
            }}
        >
            <style>{`
                @keyframes lqw-rise {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .lqw-body { animation: lqw-rise .32s ease both; }
                .lqw-btn { transition: background .18s ease, color .18s ease, transform .18s ease; }
                .lqw-btn:hover { transform: rotate(90deg); background: var(--law-navy, #1e2a4a); color: #fff; }
                .lqw-btn:active { transform: rotate(90deg) scale(.92); }
            `}</style>

            {/* رأس + علامة اقتباس ذهبية */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '0 0 auto' }}>
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '.3px',
                        color: 'var(--color-text-secondary, #6b7280)',
                    }}
                >
                    <span
                        aria-hidden
                        style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: 'var(--law-gold, #c9a227)',
                        }}
                    />
                    كلمة قائد
                </span>
                <Quote size={26} strokeWidth={2.4} style={{ color: 'var(--law-gold, #c9a227)', opacity: 0.9 }} />
            </div>

            {/* المتن */}
            <div
                key={index}
                className="lqw-body"
                style={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '12px',
                }}
            >
                <p
                    style={{
                        margin: 0,
                        fontSize: 'clamp(14px, 2.4vw, 18px)',
                        lineHeight: 1.75,
                        fontWeight: 700,
                        color: 'var(--color-heading, #1e2a4a)',
                        // خطّ ذهبي على الحافة الابتدائية يمنح إحساس الاقتباس
                        borderInlineStart: '3px solid var(--law-gold, #c9a227)',
                        paddingInlineStart: '12px',
                    }}
                >
                    {quote.text}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', paddingInlineStart: '15px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--law-navy, #1e2a4a)' }}>
                        {quote.author}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #6b7280)' }}>
                        {quote.role}
                    </span>
                </div>
            </div>

            {/* الشريط السفلي: مؤشّر + زرّ اقتباس آخر */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: '0 0 auto' }}>
                <div style={{ display: 'flex', gap: '4px' }} aria-hidden>
                    {QUOTES.map((_, i) => (
                        <span
                            key={i}
                            style={{
                                width: i === index ? '14px' : '5px',
                                height: '5px',
                                borderRadius: '3px',
                                background: i === index ? 'var(--law-gold, #c9a227)' : 'var(--quiet-gray-300, #d1d5db)',
                                transition: 'width .2s ease, background .2s ease',
                            }}
                        />
                    ))}
                </div>
                <button
                    type="button"
                    className="lqw-btn lab-no-drag"
                    onClick={() => setOffset((o) => (o + 1) % QUOTES.length)}
                    title="اقتباس آخر"
                    aria-label="اقتباس آخر"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: '1px solid var(--color-border, #e5e7eb)',
                        background: 'var(--law-navy-light, #eef1f8)',
                        color: 'var(--law-navy, #1e2a4a)',
                    }}
                >
                    <RefreshCw size={15} strokeWidth={2.4} />
                </button>
            </div>
        </div>
    );
};

export default LeadershipQuoteWidget;
