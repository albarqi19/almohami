import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Quote, Copy, Check } from 'lucide-react';

/**
 * ClauseSnippetsWidget — قصاصات عبارات قانونية جاهزة.
 *
 * عبارات جاهزة (دفوع/طلبات/إقرارات/صيغ ختامية) مصنّفة بفلاتر،
 * ولكل عبارة زر نسخ مع تأكيد «نُسخ».
 * ⚠️ عبارات ديمو محلية؛ يمكن لاحقاً جلبها من مكتبة صيغ المكتب (قوالب المذكرات).
 */

interface Snippet {
    id: string;
    cat: string;
    title: string;
    text: string;
}

const SNIPPETS: Snippet[] = [
    {
        id: 's1',
        cat: 'دفوع',
        title: 'تحفّظ على لائحة الخصم',
        text: 'نتحفّظ على ما ورد في لائحة الخصم جملةً وتفصيلاً، ونلتمس عدم الاعتداد بها لعدم استنادها إلى سندٍ نظامي أو دليلٍ معتبر.',
    },
    {
        id: 's2',
        cat: 'دفوع',
        title: 'الدفع بعدم الاختصاص',
        text: 'ندفع بعدم اختصاص هذه الدائرة نوعياً بنظر الدعوى، ونلتمس إحالتها إلى الجهة المختصة نظاماً.',
    },
    {
        id: 's3',
        cat: 'دفوع',
        title: 'الدفع بسقوط الحق بالتقادم',
        text: 'ندفع بسقوط حق المدعي بمطالبته لمضي المدة النظامية المقرّرة للتقادم دون مطالبةٍ قاطعةٍ له.',
    },
    {
        id: 's4',
        cat: 'طلبات',
        title: 'طلب تأجيل الجلسة',
        text: 'نلتمس من فضيلتكم التكرّم بتأجيل الجلسة لمنح المدعى عليه فرصةً كافيةً لإعداد دفاعه وتقديم مستنداته.',
    },
    {
        id: 's5',
        cat: 'طلبات',
        title: 'طلب ضمّ قضية',
        text: 'نلتمس ضمّ القضية رقم (…) إلى هذه الدعوى لوحدة الموضوع والخصوم تفادياً لتعارض الأحكام.',
    },
    {
        id: 's6',
        cat: 'طلبات',
        title: 'طلب مهلة للاطلاع',
        text: 'نلتمس منحنا مهلةً مدتها (خمسة عشر يوماً) للاطلاع على مستندات الخصم والرد عليها.',
    },
    {
        id: 's7',
        cat: 'إقرارات',
        title: 'إقرار بصحة البيانات',
        text: 'أُقرّ أنا الموقّع أدناه بصحة ما ورد أعلاه، وأتحمّل كامل المسؤولية النظامية المترتبة على ذلك.',
    },
    {
        id: 's8',
        cat: 'صيغ ختامية',
        title: 'ختام لائحة الدعوى',
        text: 'لكل ما تقدّم، نلتمس من فضيلتكم الحكم برفض دعوى المدعي وإلزامه بالمصاريف وأتعاب المحاماة.',
    },
];

const CATEGORIES: string[] = ['الكل', 'دفوع', 'طلبات', 'إقرارات', 'صيغ ختامية'];

const ClauseSnippetsWidget: React.FC = () => {
    const [activeCat, setActiveCat] = useState<string>('الكل');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const copyTimer = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (copyTimer.current) window.clearTimeout(copyTimer.current);
        };
    }, []);

    const visible = useMemo(
        () => (activeCat === 'الكل' ? SNIPPETS : SNIPPETS.filter((s) => s.cat === activeCat)),
        [activeCat],
    );

    const handleCopy = (s: Snippet): void => {
        const done = (): void => {
            setCopiedId(s.id);
            if (copyTimer.current) window.clearTimeout(copyTimer.current);
            copyTimer.current = window.setTimeout(() => setCopiedId(null), 1600);
        };
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(s.text).then(done).catch(done);
        } else {
            done();
        }
    };

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
                @keyframes csw-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes csw-pop { from { opacity: 0; transform: scale(.6); } to { opacity: 1; transform: scale(1); } }
                .csw-card { animation: csw-in .34s ease both; }
                .csw-check { animation: csw-pop .22s cubic-bezier(.34,1.56,.64,1) both; }
                .csw-chip { transition: background .15s ease, color .15s ease, border-color .15s ease; }
                .csw-copy { transition: background .15s ease, color .15s ease, border-color .15s ease; }
                .csw-scroll { scrollbar-width: thin; scrollbar-color: var(--quiet-gray-300, #d1d5db) transparent; }
                .csw-scroll::-webkit-scrollbar { width: 5px; }
                .csw-scroll::-webkit-scrollbar-thumb { background: var(--quiet-gray-300, #d1d5db); border-radius: 4px; }
                @media (prefers-reduced-motion: reduce) { .csw-card, .csw-check { animation: none; } }
            `}</style>

            {/* العنوان */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: '0 0 auto' }}>
                <Quote size={16} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>
                    قصاصات قانونية
                </span>
            </div>

            {/* الفلاتر */}
            <div className="csw-scroll" style={{ display: 'flex', gap: '5px', flex: '0 0 auto', overflowX: 'auto', paddingBottom: '2px' }}>
                {CATEGORIES.map((cat) => {
                    const active = activeCat === cat;
                    return (
                        <button
                            key={cat}
                            type="button"
                            className="csw-chip lab-no-drag"
                            onClick={() => setActiveCat(cat)}
                            style={{
                                flex: '0 0 auto',
                                padding: '5px 11px',
                                borderRadius: '999px',
                                border: `1px solid ${active ? 'var(--law-navy, #1e2a4a)' : 'var(--color-border, #e5e7eb)'}`,
                                background: active ? 'var(--law-navy, #1e2a4a)' : 'var(--dashboard-card, #ffffff)',
                                color: active ? '#ffffff' : 'var(--color-text-secondary)',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 700,
                                fontFamily: 'inherit',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {cat}
                        </button>
                    );
                })}
            </div>

            {/* القائمة */}
            <div className="csw-scroll" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {visible.map((s, i) => {
                    const copied = copiedId === s.id;
                    return (
                        <div
                            key={s.id}
                            className="csw-card"
                            style={{
                                animationDelay: `${i * 45}ms`,
                                padding: '9px 11px',
                                borderRadius: '9px',
                                border: '1px solid var(--color-border, #e5e7eb)',
                                background: 'var(--dashboard-card, #ffffff)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-heading)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {s.title}
                                </span>
                                <span style={{ flex: '0 0 auto', fontSize: '9px', fontWeight: 700, padding: '1px 7px', borderRadius: '999px', color: 'var(--law-gold, #c9a227)', background: 'var(--law-navy-light, #eef1f8)' }}>
                                    {s.cat}
                                </span>
                                <button
                                    type="button"
                                    className="csw-copy lab-no-drag"
                                    onClick={() => handleCopy(s)}
                                    title="نسخ العبارة"
                                    style={{
                                        marginInlineStart: 'auto',
                                        flex: '0 0 auto',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 9px',
                                        borderRadius: '7px',
                                        border: `1px solid ${copied ? 'var(--status-green, #16a34a)' : 'var(--color-border, #e5e7eb)'}`,
                                        background: copied ? 'var(--status-green-light, #dcfce7)' : 'var(--dashboard-card, #ffffff)',
                                        color: copied ? 'var(--status-green, #16a34a)' : 'var(--law-navy, #1e2a4a)',
                                        cursor: 'pointer',
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {copied ? <Check size={12} className="csw-check" /> : <Copy size={12} />}
                                    {copied ? 'نُسخ' : 'نسخ'}
                                </button>
                            </div>
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '11.5px',
                                    lineHeight: 1.6,
                                    color: 'var(--color-text-secondary)',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                }}
                            >
                                {s.text}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ClauseSnippetsWidget;
