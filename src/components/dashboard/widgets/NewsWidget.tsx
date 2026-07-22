import React from 'react';
import { Newspaper, ExternalLink, Dot } from 'lucide-react';

/**
 * NewsWidget — «أخبار وتحديثات نظامية» (تجريبي).
 *
 * ⚠️ البيانات محلية مؤقتة لعرض الفكرة. مصادر حقيقية محتملة لاحقاً:
 *   - تغذية RSS من هيئات رسمية (وزارة العدل / المجلس الأعلى للقضاء / هيئة المحامين)
 *   - جدول tenant_news يديره المكتب داخلياً (إعلانات إدارية)
 *   - «آخر الأنظمة» من صفحة الأنظمة الموجودة (92 نظاماً) عبر endpoint موجز
 * كلها تُجلب لاحقاً عبر خدمة مستقلة (نمط الجلب الذاتي) بلا مساس بهذا العرض.
 */

interface NewsItem {
    id: number;
    title: string;
    source: string;
    time: string;
    tag: 'نظام' | 'تعميم' | 'مكتب';
}

const DEMO_NEWS: NewsItem[] = [
    { id: 1, title: 'تحديث لائحة المرافعات الشرعية — مدد الاعتراض', source: 'وزارة العدل', time: 'قبل ساعتين', tag: 'نظام' },
    { id: 2, title: 'تعميم بشأن الجلسات المرئية عن بُعد في الدوائر التجارية', source: 'المجلس الأعلى للقضاء', time: 'اليوم', tag: 'تعميم' },
    { id: 3, title: 'اجتماع الفريق القانوني الأسبوعي — الخميس 10 ص', source: 'إدارة المكتب', time: 'أمس', tag: 'مكتب' },
    { id: 4, title: 'إطلاق الخدمة الإلكترونية لتوثيق الوكالات المحدّثة', source: 'ناجز', time: 'قبل 3 أيام', tag: 'نظام' },
];

const TAG_COLOR: Record<NewsItem['tag'], string> = {
    'نظام': 'var(--status-blue, #2563eb)',
    'تعميم': 'var(--law-gold, #c9a227)',
    'مكتب': 'var(--status-green, #16a34a)',
};

const NewsWidget: React.FC = () => {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {DEMO_NEWS.map((item) => (
                <div
                    key={item.id}
                    className="lab-news-item"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        padding: '8px 6px',
                        borderRadius: '6px',
                        borderBottom: '1px solid var(--color-border)',
                        cursor: 'pointer',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                            style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: TAG_COLOR[item.tag],
                                background: 'color-mix(in srgb, currentColor 12%, transparent)',
                                padding: '1px 7px',
                                borderRadius: '999px',
                                flexShrink: 0,
                            }}
                        >
                            {item.tag}
                        </span>
                        <span
                            style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--color-heading)',
                                lineHeight: 1.4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            title={item.title}
                        >
                            {item.title}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--color-text-secondary)', paddingInlineStart: '2px' }}>
                        <Newspaper size={11} />
                        <span>{item.source}</span>
                        <Dot size={12} />
                        <span>{item.time}</span>
                    </div>
                </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', fontSize: '12px', color: 'var(--law-navy)', fontWeight: 600 }}>
                عرض الكل <ExternalLink size={12} />
            </div>
        </div>
    );
};

export default NewsWidget;
