import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    Briefcase,
    FileText,
    Globe,
    LogIn,
    Mail,
    MessageSquare,
    Phone,
    Receipt,
} from 'lucide-react';
import useSEO from '../../hooks/useSEO';
import './shamrakh-landing.css';

/**
 * صفحة هبوط مخصصة — شركة شمراخ للمحاماة والاستشارات القانونية (الشركة 495، app.shamrakh.sa)
 *
 * صفحةُ «بوابة العملاء» لا نسخةٌ من موقعهم: تشرح ما تمنحه البوابةُ للعميل وتقوده إلى
 * الدخول. مختصرةٌ عمداً — ترويسةٌ وهيرو وشريطُ مزايا وتذييل، لا أكثر.
 *
 * الهويةُ من شعارهم مقيسةً لا مقدَّرة: البنّيُّ #825340 (تباينه مع الأبيض 6.4:1)
 * والرماديُّ #434645، والخطُّ Almarai كما في موقعهم shamrakh.sa. فلات بلا ظلال.
 *
 * ثنائيّةُ اللغة: قاموسٌ واحد (ar/en) والاتجاهُ يُضبط على جذر الصفحة وحده (لا على <html>)،
 * والاختيارُ يُحفظ في localStorage. بياناتُ التواصل منقولةٌ من موقعهم حرفياً.
 *
 * كلُّ التنسيقات محصورةٌ تحت .sh-page — Vite يحقن الـCSS عالمياً.
 */

type Lang = 'ar' | 'en';

const STORAGE_KEY = 'shamrakh.portal.lang';
const SITE = 'https://shamrakh.sa';
const EMAIL = 'info@shamrakh.sa';
const PHONE = '+966 56 066 4480';
const WHATSAPP = 'https://wa.me/966560664480';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap';

const COPY = {
    ar: {
        htmlTitle: 'بوابة العملاء | شركة شمراخ للمحاماة والاستشارات القانونية',
        metaDescription:
            'بوابة عملاء شركة شمراخ للمحاماة: تابع قضاياك ومستنداتك وجلساتك وتواصل مع فريقك القانوني في مكانٍ واحد.',
        switchLabel: 'English',
        nav: { site: 'الموقع الرئيسي', login: 'دخول البوابة' },
        hero: {
            eyebrow: 'بوابة العملاء',
            title: 'قضاياك ومستنداتك وجلساتك — في مكانٍ واحد.',
            lead: 'تمنحك بوابة شركة شمراخ متابعةً مباشرة لأعمالك القانونية لدى المكتب: تحديثات القضايا، المستندات، مواعيد الجلسات، والتواصل مع فريقك القانوني.',
            primary: 'دخول البوابة',
            secondary: 'تواصل معنا',
            note: 'يرسل المكتب بيانات الدخول لعملائه. إن لم تصلك بعد فتواصل معنا لتفعيل حسابك.',
        },
        motto: 'شركاؤك في العدالة والقانون.',
        features: [
            { title: 'القضايا والجلسات', text: 'حالة كل قضية ومواعيد جلساتها القادمة.' },
            { title: 'المستندات', text: 'المذكرات والعقود والمرفقات متاحةً للتحميل.' },
            { title: 'التواصل مع فريقك', text: 'رسائل مباشرة مع المحامي المكلّف بقضيتك.' },
            { title: 'الفواتير والمدفوعات', text: 'مطالباتك المالية وحالة سدادها.' },
        ],
        contact: { email: 'البريد الإلكتروني', phone: 'الهاتف وواتساب', site: 'الموقع الرئيسي' },
        footer: { name: 'شركة شمراخ للمحاماة والاستشارات القانونية', rights: 'جميع الحقوق محفوظة' },
    },
    en: {
        htmlTitle: 'Client Portal | Shamrakh Law Firm and Legal Consultations',
        metaDescription:
            'Shamrakh Law Firm client portal: follow your cases, documents and hearings, and reach your legal team in one place.',
        switchLabel: 'العربية',
        nav: { site: 'Main website', login: 'Portal sign-in' },
        hero: {
            eyebrow: 'Client Portal',
            title: 'Your cases, documents and hearings — in one place.',
            lead: 'The Shamrakh portal gives you direct visibility over your legal matters with the firm: case updates, documents, hearing dates, and messaging with your legal team.',
            primary: 'Portal sign-in',
            secondary: 'Contact us',
            note: 'The firm issues sign-in details to its clients. If yours have not arrived yet, contact us to activate your account.',
        },
        motto: 'Your partners in justice and law.',
        features: [
            { title: 'Cases & hearings', text: 'The status of every case and its upcoming hearings.' },
            { title: 'Documents', text: 'Memoranda, contracts and attachments, ready to download.' },
            { title: 'Your legal team', text: 'Direct messaging with the lawyer handling your case.' },
            { title: 'Invoices & payments', text: 'Your financial claims and their settlement status.' },
        ],
        contact: { email: 'Email', phone: 'Phone & WhatsApp', site: 'Main website' },
        footer: { name: 'Shamrakh Law Firm and Legal Consultations', rights: 'All rights reserved' },
    },
} as const;

const FEATURE_ICONS = [Briefcase, FileText, MessageSquare, Receipt];

function initialLang(): Lang {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'ar' || saved === 'en') return saved;
    } catch {
        // التخزين قد يكون محجوباً (نافذة خاصة) — نكتفي بالافتراضي
    }
    return 'ar';
}

const ShamrakhLanding: React.FC = () => {
    const navigate = useNavigate();
    const [lang, setLang] = useState<Lang>(initialLang);
    const t = COPY[lang];
    const isRtl = lang === 'ar';
    const Arrow = isRtl ? ArrowLeft : ArrowRight;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    useSEO({
        title: t.htmlTitle,
        description: t.metaDescription,
        image: origin ? `${origin}/shamrakh/wordmark.png` : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        siteName: t.footer.name,
        author: t.footer.name,
    });

    // خلفيةُ body لا تُحصر بالـCSS (ارتدادُ التمرير في iOS يكشفها)، وخطُّ الموقع يُحمَّل
    // لهذه الصفحة وحدها ويُزال عند الخروج منها.
    useEffect(() => {
        const previous = document.body.style.backgroundColor;
        document.body.style.backgroundColor = '#faf7f5';
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FONT_HREF;
        document.head.appendChild(link);
        return () => {
            document.body.style.backgroundColor = previous;
            link.remove();
        };
    }, []);

    const switchLang = () => {
        const next: Lang = isRtl ? 'en' : 'ar';
        setLang(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // لا شيء — الاختيار يبقى لهذه الزيارة فقط
        }
    };

    const goLogin = () => navigate('/login');
    const year = new Date().getFullYear();

    return (
        <div className="sh-page" dir={isRtl ? 'rtl' : 'ltr'} lang={lang}>
            <header className="sh-header">
                <div className="sh-container sh-header__inner">
                    <a className="sh-brand" href={SITE} target="_blank" rel="noopener noreferrer">
                        <img className="sh-brand__mark" src="/shamrakh/mark.png" alt="" width="512" height="512" aria-hidden="true" />
                        <span className="sh-brand__name">{t.footer.name}</span>
                    </a>

                    <nav className="sh-nav" aria-label="main">
                        <a className="sh-nav__link" href={SITE} target="_blank" rel="noopener noreferrer">{t.nav.site}</a>
                        <button type="button" className="sh-lang" onClick={switchLang} aria-label={t.switchLabel}>
                            <Globe size={15} aria-hidden="true" />
                            <span>{t.switchLabel}</span>
                        </button>
                        <button type="button" className="sh-btn sh-btn--primary sh-btn--sm" onClick={goLogin}>
                            <LogIn size={16} aria-hidden="true" />
                            <span>{t.nav.login}</span>
                        </button>
                    </nav>
                </div>
            </header>

            <main>
                <section className="sh-hero">
                    <div className="sh-container sh-hero__grid">
                        <div className="sh-hero__copy">
                            <p className="sh-eyebrow">{t.hero.eyebrow}</p>
                            <h1 className="sh-hero__title">{t.hero.title}</h1>
                            <p className="sh-hero__lead">{t.hero.lead}</p>
                            <div className="sh-hero__actions">
                                <button type="button" className="sh-btn sh-btn--primary" onClick={goLogin}>
                                    <span>{t.hero.primary}</span>
                                    <Arrow size={18} aria-hidden="true" />
                                </button>
                                <a className="sh-btn sh-btn--ghost" href="#contact">{t.hero.secondary}</a>
                            </div>
                            <p className="sh-hero__note">{t.hero.note}</p>
                        </div>

                        <aside className="sh-plate" aria-hidden="true">
                            <img className="sh-plate__mark" src="/shamrakh/mark.png" alt="" width="512" height="512" />
                            <p className="sh-plate__motto">{t.motto}</p>
                        </aside>
                    </div>
                </section>

                <section className="sh-strip">
                    <div className="sh-container">
                    <ul className="sh-features">
                        {t.features.map((item, index) => {
                            const Icon = FEATURE_ICONS[index] ?? Briefcase;
                            return (
                                <li className="sh-feature" key={item.title}>
                                    <span className="sh-feature__icon" aria-hidden="true"><Icon size={20} /></span>
                                    <h2 className="sh-feature__title">{item.title}</h2>
                                    <p className="sh-feature__text">{item.text}</p>
                                </li>
                            );
                        })}
                    </ul>
                    </div>
                </section>
            </main>

            <footer className="sh-footer" id="contact">
                <div className="sh-container">
                    <ul className="sh-contact">
                        <li className="sh-contact__item">
                            <Mail size={16} aria-hidden="true" />
                            <span className="sh-contact__label">{t.contact.email}</span>
                            <a className="sh-contact__value" href={`mailto:${EMAIL}`} dir="ltr">{EMAIL}</a>
                        </li>
                        <li className="sh-contact__item">
                            <Phone size={16} aria-hidden="true" />
                            <span className="sh-contact__label">{t.contact.phone}</span>
                            <a className="sh-contact__value" href={WHATSAPP} target="_blank" rel="noopener noreferrer" dir="ltr">{PHONE}</a>
                        </li>
                        <li className="sh-contact__item">
                            <Globe size={16} aria-hidden="true" />
                            <span className="sh-contact__label">{t.contact.site}</span>
                            <a className="sh-contact__value" href={SITE} target="_blank" rel="noopener noreferrer" dir="ltr">shamrakh.sa</a>
                        </li>
                    </ul>

                    <div className="sh-footer__bar">
                        <span className="sh-footer__name">{t.footer.name}</span>
                        <span className="sh-footer__rights">© {year} — {t.footer.rights}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ShamrakhLanding;
