import React, { useMemo, useState } from 'react';
import { BookOpen, Search, X, FileText } from 'lucide-react';

/**
 * LawQuickRefWidget — مرجع أنظمة سريع.
 *
 * حقل بحث يصفّي قائمة أنظمة ديمو (اسم النظام + رقم المادة + ملخص سطر) نتائجَ فورية
 * مع تظليل مواضع التطابق.
 * ⚠️ بيانات ديمو محلية للعرض فقط.
 * تُربط لاحقاً بصفحة «الأنظمة» الموجودة (٩٢ نظاماً / ٧٢٠٦ مواد) بدل المصفوفة أدناه.
 */

interface Article {
    law: string;
    article: string;
    summary: string;
}

const ARTICLES: Article[] = [
    { law: 'نظام العمل', article: '٧٤', summary: 'حالات انتهاء عقد العمل.' },
    { law: 'نظام العمل', article: '٨٠', summary: 'فسخ العقد دون مكافأة أو إشعار من صاحب العمل.' },
    { law: 'نظام العمل', article: '٨١', summary: 'ترك العامل العمل مع احتفاظه بحقوقه النظامية.' },
    { law: 'نظام العمل', article: '١٠٧', summary: 'أجر ساعات العمل الإضافية.' },
    { law: 'نظام المعاملات المدنية', article: '٤١', summary: 'لا التزام إلا بسببٍ مشروع.' },
    { law: 'نظام المعاملات المدنية', article: '١٠٤', summary: 'أثر الغلط في صحة العقد.' },
    { law: 'نظام المرافعات الشرعية', article: '٧٣', summary: 'شروط قبول الدعوى وصفة الخصوم.' },
    { law: 'نظام المرافعات الشرعية', article: '١٢٦', summary: 'أثر غياب المدّعى عليه عن الجلسة.' },
    { law: 'نظام التنفيذ', article: '٩', summary: 'سلطة قاضي التنفيذ وأمر الحبس التنفيذي.' },
    { law: 'نظام التنفيذ', article: '٤٦', summary: 'المنع من السفر بحق المدين.' },
    { law: 'نظام الإثبات', article: '٦٠', summary: 'حجية الدليل الكتابي في الإثبات.' },
    { law: 'نظام الشركات', article: '٢١١', summary: 'مسؤولية أعضاء مجلس الإدارة.' },
    { law: 'نظام المحاماة', article: '٢٠', summary: 'واجبات المحامي تجاه موكّله.' },
];

const norm = (s: string): string => s.replace(/[أإآ]/g, 'ا').replace(/\s+/g, ' ').trim().toLowerCase();

/** تظليل مواضع تطابق الاستعلام داخل النص (بلا مكتبات). */
const highlight = (text: string, query: string): React.ReactNode => {
    const q = query.trim();
    if (!q) return text;
    const nText = norm(text);
    const nQuery = norm(q);
    if (!nQuery) return text;
    const parts: React.ReactNode[] = [];
    let from = 0;
    let idx = nText.indexOf(nQuery, from);
    let key = 0;
    while (idx !== -1) {
        if (idx > from) parts.push(text.slice(from, idx));
        parts.push(
            <mark
                key={key++}
                style={{
                    background: 'var(--law-navy-light, #eef1f8)',
                    color: 'var(--law-navy, #1e2a4a)',
                    borderRadius: '3px',
                    padding: '0 1px',
                    fontWeight: 700,
                }}
            >
                {text.slice(idx, idx + nQuery.length)}
            </mark>,
        );
        from = idx + nQuery.length;
        idx = nText.indexOf(nQuery, from);
    }
    if (from < text.length) parts.push(text.slice(from));
    return parts;
};

const LawQuickRefWidget: React.FC = () => {
    const [query, setQuery] = useState<string>('');

    const results = useMemo(() => {
        const q = norm(query);
        if (!q) return ARTICLES;
        return ARTICLES.filter((a) => norm(`${a.law} مادة ${a.article} ${a.summary}`).includes(q));
    }, [query]);

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
                @keyframes lqr-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .lqr-row { animation: lqr-in .28s ease both; }
                .lqr-input { transition: border-color .15s ease; }
                .lqr-scroll { scrollbar-width: thin; scrollbar-color: var(--quiet-gray-300, #d1d5db) transparent; }
                .lqr-scroll::-webkit-scrollbar { width: 5px; }
                .lqr-scroll::-webkit-scrollbar-thumb { background: var(--quiet-gray-300, #d1d5db); border-radius: 4px; }
                @media (prefers-reduced-motion: reduce) { .lqr-row { animation: none; } }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <BookOpen size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    مرجع الأنظمة السريع
                </span>
                <span style={{ marginRight: 'auto', fontSize: '10.5px', color: 'var(--quiet-gray-400, #9ca3af)', fontVariantNumeric: 'tabular-nums' }}>
                    {results.length.toLocaleString('ar-SA')} نتيجة
                </span>
            </div>

            {/* حقل البحث */}
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
                <Search
                    size={14}
                    style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--quiet-gray-400, #9ca3af)', pointerEvents: 'none' }}
                />
                <input
                    type="text"
                    className="lqr-input lab-no-drag"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث باسم النظام أو رقم المادة…"
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '9px 34px',
                        borderRadius: '9px',
                        border: '1px solid var(--color-border, #e5e7eb)',
                        background: 'var(--dashboard-card, #ffffff)',
                        color: 'var(--color-heading)',
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        outline: 'none',
                        textAlign: 'right',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--law-gold, #c9a227)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border, #e5e7eb)')}
                />
                {query && (
                    <button
                        type="button"
                        className="lab-no-drag"
                        onClick={() => setQuery('')}
                        title="مسح"
                        style={{
                            position: 'absolute',
                            left: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'var(--quiet-gray-100, #f3f4f6)',
                            color: 'var(--quiet-gray-500, #6b7280)',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* النتائج */}
            <div className="lqr-scroll" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {results.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--quiet-gray-400, #9ca3af)', padding: '18px 0' }}>
                        <FileText size={22} />
                        <span style={{ fontSize: '11.5px', fontWeight: 600 }}>لا توجد مادة مطابقة</span>
                    </div>
                ) : (
                    results.map((a, i) => (
                        <div
                            key={`${a.law}-${a.article}`}
                            className="lqr-row"
                            style={{
                                animationDelay: `${Math.min(i, 8) * 30}ms`,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '9px',
                                padding: '8px 10px',
                                borderRadius: '9px',
                                border: '1px solid var(--color-border, #e5e7eb)',
                                background: 'var(--dashboard-card, #ffffff)',
                            }}
                        >
                            {/* شارة المادة */}
                            <span
                                style={{
                                    flex: '0 0 auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '40px',
                                    padding: '5px 4px',
                                    borderRadius: '8px',
                                    background: 'var(--law-navy-light, #eef1f8)',
                                }}
                            >
                                <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>مادة</span>
                                <span style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1.1, color: 'var(--law-navy, #1e2a4a)', fontVariantNumeric: 'tabular-nums' }}>
                                    {highlight(a.article, query)}
                                </span>
                            </span>
                            {/* التفاصيل */}
                            <div style={{ minWidth: 0, flex: 1, paddingTop: '1px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-heading)', marginBottom: '3px' }}>
                                    {highlight(a.law, query)}
                                </div>
                                <div style={{ fontSize: '11px', lineHeight: 1.5, color: 'var(--color-text-secondary)' }}>
                                    {highlight(a.summary, query)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LawQuickRefWidget;
