import React, { useCallback, useMemo, useState } from 'react';
import {
    Plus,
    X,
    Check,
    Scale,
    Mail,
    Calendar,
    HardDrive,
    MessageCircle,
    Building2,
    FileText,
    Search,
    Video,
    Globe,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useWidgetContent } from '../../lab/widgetContent';

/**
 * QuickLinksWidget — روابط/اختصارات سريعة قابلة للتخصيص.
 * شبكة أزرار (أيقونة تلقائية + اسم) تفتح الرابط في تبويب جديد؛ يمكن إضافة/حذف
 * رابط (اسم + URL)، وتُختار الأيقونة تلقائياً من كلمات الاسم/الرابط.
 *
 * الروابط عبر useWidgetContent: داخل اللوح تُحفظ ضمن حالة اللوحة فتتزامن
 * عبر الخادم لكل مستخدم ولكل نسخة؛ خارجه (📌) يبقى localStorage.
 */

interface QuickLink {
    id: number;
    name: string;
    url: string;
}

const STORAGE_KEY = 'lab_quicklinks_v1';

const DEMO_LINKS: QuickLink[] = [
    { id: 1, name: 'بوابة ناجز', url: 'https://najiz.sa' },
    { id: 2, name: 'ديوان المظالم', url: 'https://www.bog.gov.sa' },
    { id: 3, name: 'بريد المكتب', url: 'https://mail.google.com' },
    { id: 4, name: 'تقويم الجلسات', url: 'https://calendar.google.com' },
    { id: 5, name: 'ملفات درايف', url: 'https://drive.google.com' },
];

// اختيار الأيقونة تلقائياً من كلمات مفتاحية في الاسم أو الرابط
const ICON_RULES: { icon: LucideIcon; keys: string[] }[] = [
    { icon: Scale, keys: ['ناجز', 'najiz', 'محكمة', 'قضاء', 'ديوان', 'مظالم', 'bog', 'moj', 'law', 'عدل'] },
    { icon: Mail, keys: ['بريد', 'ايميل', 'إيميل', 'mail', 'gmail', 'outlook', 'رسائل'] },
    { icon: Calendar, keys: ['تقويم', 'موعد', 'جلسة', 'جلسات', 'calendar', 'agenda'] },
    { icon: HardDrive, keys: ['درايف', 'ملفات', 'تخزين', 'drive', 'dropbox', 'onedrive', 'files'] },
    { icon: MessageCircle, keys: ['واتساب', 'محادثة', 'whatsapp', 'chat', 'دردشة'] },
    { icon: Video, keys: ['اجتماع', 'زوم', 'meet', 'zoom', 'teams', 'فيديو'] },
    { icon: Building2, keys: ['منشأة', 'شركة', 'حكوم', 'gov', 'وزارة', 'هيئة'] },
    { icon: FileText, keys: ['مستند', 'وثيقة', 'عقد', 'مذكرة', 'doc', 'pdf', 'نموذج'] },
    { icon: Search, keys: ['بحث', 'سوابق', 'أنظمة', 'search', 'راج'] },
];

function iconFor(name: string, url: string): LucideIcon {
    const hay = `${name} ${url}`.toLowerCase();
    for (const rule of ICON_RULES) {
        if (rule.keys.some((k) => hay.includes(k.toLowerCase()))) return rule.icon;
    }
    return Globe;
}

function normalizeUrl(raw: string): string {
    const t = raw.trim();
    if (!t) return '';
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
}

function parseLinks(raw: unknown): QuickLink[] {
    if (Array.isArray(raw)) {
        return raw.filter(
            (l): l is QuickLink =>
                !!l &&
                typeof (l as QuickLink).id === 'number' &&
                typeof (l as QuickLink).name === 'string' &&
                typeof (l as QuickLink).url === 'string'
        );
    }
    return DEMO_LINKS;
}

const QuickLinksWidget: React.FC = () => {
    const [links, setLinks] = useWidgetContent<QuickLink[]>(STORAGE_KEY, parseLinks);
    const [adding, setAdding] = useState<boolean>(false);
    const [name, setName] = useState<string>('');
    const [url, setUrl] = useState<string>('');

    const canSubmit = useMemo(() => name.trim().length > 0 && url.trim().length > 0, [name, url]);

    const resetForm = useCallback(() => {
        setAdding(false);
        setName('');
        setUrl('');
    }, []);

    const submit = useCallback(() => {
        const cleanName = name.trim();
        const cleanUrl = normalizeUrl(url);
        if (!cleanName || !cleanUrl) return;
        setLinks((prev) => [...prev, { id: Date.now(), name: cleanName, url: cleanUrl }]);
        resetForm();
    }, [name, url, resetForm]);

    const remove = useCallback((id: number) => {
        setLinks((prev) => prev.filter((l) => l.id !== id));
    }, []);

    const open = useCallback((u: string) => {
        window.open(u, '_blank', 'noopener,noreferrer');
    }, []);

    return (
        <div
            dir="rtl"
            style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}
        >
            <style>{`
                @keyframes qlw-in { from { transform: scale(.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .qlw-tile { animation: qlw-in .18s ease-out; transition: transform .12s ease, border-color .12s ease, background .12s ease; }
                .qlw-tile:hover { transform: translateY(-2px); border-color: var(--law-gold, #c9a227); }
                .qlw-tile:hover .qlw-del { opacity: 1; }
                .qlw-del { opacity: 0; transition: opacity .14s ease; }
                @media (prefers-reduced-motion: reduce) { .qlw-tile { animation: none; } .qlw-tile:hover { transform: none; } }
            `}</style>

            {/* رأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flex: '0 0 auto' }}>
                <Globe size={15} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-heading)' }}>روابط سريعة</span>
                <span
                    style={{
                        marginInlineStart: 'auto',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                        fontVariantNumeric: 'tabular-nums',
                    }}
                >
                    {links.length.toLocaleString('ar-SA')}
                </span>
            </div>

            {/* نموذج الإضافة */}
            {adding && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginBottom: '8px',
                        padding: '8px',
                        borderRadius: '8px',
                        background: 'var(--quiet-gray-100, #f3f4f6)',
                        flex: '0 0 auto',
                    }}
                >
                    <input
                        className="lab-no-drag"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') resetForm(); }}
                        placeholder="اسم الرابط"
                        style={inputStyle}
                    />
                    <input
                        className="lab-no-drag"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') resetForm(); }}
                        placeholder="example.com"
                        dir="ltr"
                        style={{ ...inputStyle, textAlign: 'left' }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            className="lab-no-drag"
                            onClick={submit}
                            disabled={!canSubmit}
                            style={{
                                flex: 1,
                                border: 'none',
                                borderRadius: '7px',
                                padding: '7px',
                                cursor: canSubmit ? 'pointer' : 'not-allowed',
                                background: canSubmit ? 'var(--law-navy, #1e2a4a)' : 'var(--quiet-gray-300, #d1d5db)',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 700,
                                fontFamily: 'inherit',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                            }}
                        >
                            <Check size={14} /> إضافة
                        </button>
                        <button
                            className="lab-no-drag"
                            onClick={resetForm}
                            title="إلغاء"
                            style={{
                                flex: '0 0 auto',
                                border: '1px solid var(--color-border, #e5e7eb)',
                                borderRadius: '7px',
                                padding: '7px 10px',
                                cursor: 'pointer',
                                background: 'var(--dashboard-card, #fff)',
                                color: 'var(--quiet-gray-500, #6b7280)',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* الشبكة */}
            <div
                style={{
                    flex: '1 1 auto',
                    overflowY: 'auto',
                    minHeight: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(66px, 1fr))',
                    gap: '8px',
                    alignContent: 'start',
                }}
            >
                {links.map((link) => {
                    const Icon = iconFor(link.name, link.url);
                    return (
                        <div key={link.id} style={{ position: 'relative' }}>
                            <button
                                className="qlw-tile lab-no-drag"
                                onClick={() => open(link.url)}
                                title={link.url}
                                style={{
                                    width: '100%',
                                    border: '1px solid var(--color-border, #e5e7eb)',
                                    borderRadius: '10px',
                                    background: 'var(--dashboard-card, #ffffff)',
                                    cursor: 'pointer',
                                    padding: '10px 4px 8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <span
                                    style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '9px',
                                        background: 'var(--law-navy-light, #eef1f8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--law-navy, #1e2a4a)',
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icon size={18} />
                                </span>
                                <span
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: 'var(--color-heading)',
                                        textAlign: 'center',
                                        lineHeight: 1.25,
                                        width: '100%',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {link.name}
                                </span>
                            </button>
                            <button
                                className="qlw-del lab-no-drag"
                                onClick={() => remove(link.id)}
                                title="حذف"
                                style={{
                                    position: 'absolute',
                                    top: '-5px',
                                    insetInlineStart: '-5px',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: 'var(--status-red, #dc2626)',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                }}
                            >
                                <X size={11} strokeWidth={3} />
                            </button>
                        </div>
                    );
                })}

                {/* بطاقة الإضافة */}
                {!adding && (
                    <button
                        className="lab-no-drag"
                        onClick={() => setAdding(true)}
                        title="إضافة رابط"
                        style={{
                            border: '1.5px dashed var(--quiet-gray-300, #d1d5db)',
                            borderRadius: '10px',
                            background: 'transparent',
                            cursor: 'pointer',
                            minHeight: '72px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            color: 'var(--quiet-gray-500, #6b7280)',
                        }}
                    >
                        <Plus size={18} />
                        <span style={{ fontSize: '10px', fontWeight: 600 }}>إضافة</span>
                    </button>
                )}
            </div>
        </div>
    );
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid var(--color-border, #e5e7eb)',
    borderRadius: '7px',
    padding: '7px 9px',
    fontSize: '12px',
    fontFamily: 'inherit',
    color: 'var(--color-heading)',
    background: 'var(--dashboard-card, #ffffff)',
    outline: 'none',
};

export default QuickLinksWidget;
