import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';

/**
 * SpeedDialWidget — اتصال سريع بالجهات المفضّلة.
 *
 * قائمة جهات ببيانات ديمو؛ لكل جهة أفاتار بحرف ملوّن، واسم، ووصف، وزرّا
 * اتصال (tel:) وواتساب (wa.me). عرض بحت بلا backend.
 * (لاحقاً: تُملأ من جهات العملاء المفضّلة عبر GET /dashboard/speed-dial،
 *  فتُستبدل قائمة الديمو بأرقام العملاء الحقيقية — wa.me يحتاج الرقم دون «+».)
 */

interface Contact {
    name: string;
    subtitle: string;
    phone: string; // بصيغة E.164 دون «+» ليصلح لـ wa.me وأمامه «+» للـ tel
    accent: string;
    light: string;
}

const CONTACTS: Contact[] = [
    { name: 'أ. محمد العتيبي', subtitle: 'عميل — بيوت الخبرة', phone: '966501234567', accent: 'var(--law-navy, #1e2a4a)', light: 'var(--law-navy-light, #eef1f8)' },
    { name: 'المحامي خالد الشمري', subtitle: 'شريك — قسم التقاضي', phone: '966554987321', accent: 'var(--status-green, #16a34a)', light: 'var(--status-green-light, #dcfce7)' },
    { name: 'أ. نورة الزهراني', subtitle: 'الإدارة المالية', phone: '966533456780', accent: '#2563eb', light: '#dbeafe' },
    { name: 'أ. عبدالله الحربي', subtitle: 'عميل — مكتب الجديد', phone: '966568112233', accent: '#ea580c', light: '#ffedd5' },
    { name: 'م. سارة القحطاني', subtitle: 'مدير المكتب', phone: '966590778899', accent: 'var(--law-gold, #c9a227)', light: '#fdf6e3' },
];

const initialOf = (name: string): string => {
    // نتجاوز الألقاب الشائعة (أ. / م. / المحامي) لأخذ أوّل حرف من الاسم
    const cleaned = name.replace(/^(أ\.|م\.|د\.|المحامي|الأستاذ)\s*/u, '').trim();
    return cleaned.charAt(0) || name.charAt(0);
};

const SpeedDialWidget: React.FC = () => {
    return (
        <div
            dir="rtl"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
                padding: '10px 10px 8px',
                gap: '8px',
                background: 'var(--dashboard-card, #ffffff)',
            }}
        >
            <style>{`
                .sdw-act { transition: transform .15s ease, filter .15s ease; }
                .sdw-act:hover { transform: translateY(-1px); filter: brightness(1.06); }
                .sdw-act:active { transform: scale(.94); }
                .sdw-row { transition: background .15s ease; }
                .sdw-row:hover { background: var(--quiet-gray-100, #f3f4f6); }
                .sdw-scroll::-webkit-scrollbar { width: 5px; }
                .sdw-scroll::-webkit-scrollbar-thumb { background: var(--quiet-gray-300, #d1d5db); border-radius: 4px; }
            `}</style>

            {/* الرأس */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto', paddingInline: '2px' }}>
                <Phone size={14} style={{ color: 'var(--law-gold, #c9a227)' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--law-navy, #1e2a4a)' }}>اتصال سريع</span>
                <span style={{ marginInlineStart: 'auto', fontSize: '10px', color: 'var(--color-text-secondary, #6b7280)' }}>
                    المفضّلة
                </span>
            </div>

            {/* القائمة */}
            <div
                className="sdw-scroll"
                style={{
                    flex: '1 1 auto',
                    minHeight: 0,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                }}
            >
                {CONTACTS.map((c) => (
                    <div
                        key={c.phone}
                        className="sdw-row"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                            padding: '6px 7px',
                            borderRadius: '9px',
                            border: '1px solid var(--color-border, #e5e7eb)',
                        }}
                    >
                        {/* الأفاتار */}
                        <span
                            aria-hidden
                            style={{
                                flexShrink: 0,
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '15px',
                                fontWeight: 800,
                                color: c.accent,
                                background: c.light,
                            }}
                        >
                            {initialOf(c.name)}
                        </span>

                        {/* الاسم + الوصف */}
                        <div style={{ minWidth: 0, flex: '1 1 auto', lineHeight: 1.3 }}>
                            <div
                                style={{
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    color: 'var(--color-heading, #1e2a4a)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {c.name}
                            </div>
                            <div
                                style={{
                                    fontSize: '10px',
                                    color: 'var(--color-text-secondary, #6b7280)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {c.subtitle}
                            </div>
                        </div>

                        {/* الأزرار */}
                        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                            <a
                                href={`https://wa.me/${c.phone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="sdw-act lab-no-drag"
                                title="واتساب"
                                aria-label={`واتساب ${c.name}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: '#fff',
                                    background: 'var(--status-green, #16a34a)',
                                }}
                            >
                                <MessageCircle size={15} strokeWidth={2.4} />
                            </a>
                            <a
                                href={`tel:+${c.phone}`}
                                className="sdw-act lab-no-drag"
                                title="اتصال"
                                aria-label={`اتصال بـ ${c.name}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: '#fff',
                                    background: 'var(--law-navy, #1e2a4a)',
                                }}
                            >
                                <Phone size={15} strokeWidth={2.4} />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpeedDialWidget;
