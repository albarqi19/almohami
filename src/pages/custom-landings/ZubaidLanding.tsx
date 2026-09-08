import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowRight,
    Briefcase,
    CalendarDays,
    FileText,
    Globe,
    LogIn,
    Mail,
    MapPin,
    MessageSquare,
    Phone,
    Receipt,
} from 'lucide-react';
import useSEO from '../../hooks/useSEO';
import './zubaid-landing.css';

/**
 * صفحة هبوط مخصصة — الزبيدي وشركاؤه محامون ومستشارون (الشركة 430، portal.zubaidi.sa)
 *
 * صفحةُ «بوابة العملاء» لا نسخةٌ من موقعهم: تشرح ما تمنحه البوابةُ للعميل وتقوده إلى
 * الدخول، وتحمل هويةَ الموقع (zubaidi.sa): الخطُّ Alexandria، العنّابيُّ #6C1916 على
 * أرضيةٍ عاجيّة، عناوينُ لاتينيّةٌ كبيرة، وصورةُ الموقع بصبغةٍ عنّابيّة. فلات بلا ظلال.
 *
 * ثنائيّةُ اللغة: قاموسٌ واحد (ar/en) والاتجاهُ يُضبط على جذر الصفحة وحده (لا على <html>)،
 * والاختيارُ يُحفظ في localStorage. الأرقامُ والخدماتُ والتواصلُ منقولةٌ من موقعهم.
 *
 * كلُّ التنسيقات محصورةٌ تحت .zb-page — Vite يحقن الـCSS عالمياً.
 */

type Lang = 'ar' | 'en';

const STORAGE_KEY = 'zubaid.portal.lang';
const SITE = 'https://zubaidi.sa';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700&display=swap';

const COPY = {
    ar: {
        htmlTitle: 'بوابة العملاء | الزبيدي وشركاؤه محامون ومستشارون',
        metaDescription: 'بوابة عملاء الزبيدي وشركاؤه: تابع قضاياك ومستنداتك وجلساتك وتواصل مع فريقك القانوني في مكانٍ واحد.',
        switchLabel: 'English',
        nav: { site: 'الموقع الرئيسي', contact: 'تواصل معنا', login: 'دخول البوابة' },
        hero: {
            eyebrow: 'بوابة العملاء',
            title: 'قضاياك ومستنداتك وجلساتك — في مكانٍ واحد.',
            lead: 'تمنحك بوابة الزبيدي وشركاؤه متابعةً مباشرة لأعمالك القانونية لدى المكتب: تحديثات القضايا، المستندات، مواعيد الجلسات، والتواصل مع فريقك القانوني.',
            primary: 'دخول البوابة',
            secondary: 'تواصل معنا',
            note: 'يرسل المكتب بيانات الدخول لعملائه. إن لم تصلك بعد فتواصل معنا لتفعيل حسابك.',
        },
        features: {
            eyebrow: 'ماذا تجد في البوابة',
            title: 'كل ما يخصّ قضيتك، محدَّثاً أولاً بأول.',
            items: [
                { title: 'القضايا والجلسات', text: 'حالة كل قضية، وآخر الإجراءات فيها، ومواعيد الجلسات القادمة.' },
                { title: 'المستندات', text: 'المذكرات والعقود والمرفقات، مرتّبةً بحسب القضية ومتاحةً للتحميل.' },
                { title: 'التواصل مع فريقك', text: 'رسائل مباشرة مع المحامي المكلّف، وإشعارات بكل مستجدّ.' },
                { title: 'الفواتير والمدفوعات', text: 'عقودك ومطالباتك المالية وحالة سدادها في صفحة واحدة.' },
            ],
        },
        about: {
            eyebrow: 'من نحن',
            title: 'شريكٌ قانونيٌّ ضمن فريقك، لا مستشارٌ من خارجه.',
            text: 'تأسست الزبيدي وشركاؤه عام 2021 لتقديم الاستشارات والتمثيل القانوني بأعلى معايير الجودة، ولمساندة الشركات الرائدة في المملكة على مواكبة التطورات النظامية والتشريعية وتحقيق أهدافها في تنمية أعمالها واستدامتها.',
            stats: [
                { value: '+42 ألف', label: 'ساعة استشارية' },
                { value: '+320', label: 'قضية' },
                { value: '+700 مليون', label: 'ريال قيمة ممثَّلة' },
                { value: '+60', label: 'شركة مؤسَّسة' },
            ],
        },
        practice: {
            eyebrow: 'مجالات الممارسة',
            title: 'اثنا عشر مجالاً، وفريقٌ واحد.',
            items: ['التحكيم', 'قانون الشركات', 'الأعمال المصرفية والتمويل', 'الاستشارات القانونية', 'التقاضي', 'القانون التجاري', 'عقود المقاولات', 'نظام العمل', 'القانون العقاري', 'تحصيل الديون', 'الإفلاس', 'القانون البحري'],
        },
        contact: {
            eyebrow: 'تواصل معنا',
            title: 'نرحّب بسؤالك في أي وقت.',
            email: 'البريد الإلكتروني',
            phone: 'الهاتف',
            address: 'العنوان',
            addressValue: 'طريق الملك فيصل، ميناء الملك فهد الصناعي، الجبيل 35518',
            book: 'احجز اجتماعاً',
            setup: 'تأسيس الأعمال في السعودية',
        },
        footer: {
            name: 'الزبيدي وشركاؤه — محامون ومستشارون',
            rights: 'جميع الحقوق محفوظة',
            site: 'zubaidi.sa',
            login: 'دخول البوابة',
        },
    },
    en: {
        htmlTitle: 'Client Portal | Al Zubaidi & Co. Lawyers & Consultants',
        metaDescription: 'The Al Zubaidi & Co. client portal: follow your cases, documents and hearings, and reach your legal team in one place.',
        switchLabel: 'العربية',
        nav: { site: 'Main website', contact: 'Contact', login: 'Sign in' },
        hero: {
            eyebrow: 'Client Portal',
            title: 'Your cases, documents and hearings — in one place.',
            lead: 'The Al Zubaidi & Co. client portal gives you direct visibility into your legal matters with the firm: case updates, documents, hearing dates, and a direct line to your legal team.',
            primary: 'Sign in to the portal',
            secondary: 'Contact us',
            note: 'The firm issues portal credentials to its clients. If yours have not arrived yet, contact us to activate your account.',
        },
        features: {
            eyebrow: 'What the portal gives you',
            title: 'Everything about your matter, kept current.',
            items: [
                { title: 'Cases and hearings', text: 'The status of every case, its latest procedures, and upcoming hearing dates.' },
                { title: 'Documents', text: 'Memoranda, contracts and attachments, organised by case and ready to download.' },
                { title: 'Your legal team', text: 'Direct messages with the lawyer in charge, and notifications for every update.' },
                { title: 'Invoices and payments', text: 'Your contracts, financial claims and their payment status on one page.' },
            ],
        },
        about: {
            eyebrow: 'About the firm',
            title: 'Trusted members of your team — not just outside counsel.',
            text: 'Al Zubaidi & Co. was founded in 2021 to provide best-in-class legal consultation and representation, ensuring clients are well equipped to align with the legal and legislative developments in the Kingdom of Saudi Arabia, and to achieve their goals in developing and sustaining their business.',
            stats: [
                { value: '+42k', label: 'Consultancy hours' },
                { value: '+320', label: 'Cases handled' },
                { value: '+700M', label: 'Represented value' },
                { value: '+60', label: 'Companies established' },
            ],
        },
        practice: {
            eyebrow: 'Practice areas',
            title: 'Twelve fields, one team.',
            items: ['Arbitration', 'Corporate Law', 'Banking and Finance', 'Legal Consultation', 'Litigation', 'Commercial Law', 'Contracting', 'Labor Law', 'Real Estate Law', 'Debt Collection', 'Bankruptcy', 'Maritime Law'],
        },
        contact: {
            eyebrow: 'Get in touch',
            title: 'We welcome your questions at any time.',
            email: 'Email',
            phone: 'Phone',
            address: 'Address',
            addressValue: 'King Faisal Rd, King Fahad Industrial Port, Al Jubail 35518',
            book: 'Book a meeting',
            setup: 'Doing business in Saudi',
        },
        footer: {
            name: 'Al Zubaidi & Co. — Lawyers & Consultants',
            rights: 'All rights reserved',
            site: 'zubaidi.sa',
            login: 'Sign in',
        },
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

const ZubaidLanding: React.FC = () => {
    const navigate = useNavigate();
    const [lang, setLang] = useState<Lang>(initialLang);
    const t = COPY[lang];
    const isRtl = lang === 'ar';
    const Arrow = isRtl ? ArrowLeft : ArrowRight;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    useSEO({
        title: t.htmlTitle,
        description: t.metaDescription,
        image: origin ? `${origin}/zubaid/logo.png` : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        siteName: t.footer.name,
        author: t.footer.name,
    });

    // خلفيةُ body لا تُحصر بالـCSS (ارتدادُ التمرير في iOS يكشفها)، وخطُّ الموقع يُحمَّل
    // لهذه الصفحة وحدها ويُزال عند الخروج منها.
    useEffect(() => {
        const previous = document.body.style.backgroundColor;
        document.body.style.backgroundColor = '#fcfbf9';
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
        <div className="zb-page" dir={isRtl ? 'rtl' : 'ltr'} lang={lang}>
            <header className="zb-header">
                <div className="zb-container zb-header__inner">
                    <a className="zb-brand" href={SITE} target="_blank" rel="noopener noreferrer" aria-label={t.footer.name}>
                        <img className="zb-brand__logo" src="/zubaid/logo.png" alt={t.footer.name} width="1400" height="548" />
                    </a>

                    <nav className="zb-nav" aria-label="main">
                        <a className="zb-nav__link" href={SITE} target="_blank" rel="noopener noreferrer">{t.nav.site}</a>
                        <a className="zb-nav__link" href="#contact">{t.nav.contact}</a>
                        <button type="button" className="zb-lang" onClick={switchLang} aria-label={t.switchLabel}>
                            <Globe size={15} aria-hidden="true" />
                            <span>{t.switchLabel}</span>
                        </button>
                        <button type="button" className="zb-btn zb-btn--primary zb-btn--sm" onClick={goLogin}>
                            <LogIn size={16} aria-hidden="true" />
                            <span>{t.nav.login}</span>
                        </button>
                    </nav>
                </div>
            </header>

            <main>
                <section className="zb-hero">
                    <div className="zb-container zb-hero__grid">
                        <div className="zb-hero__copy">
                            <p className="zb-eyebrow">{t.hero.eyebrow}</p>
                            <h1 className="zb-hero__title">{t.hero.title}</h1>
                            <p className="zb-hero__lead">{t.hero.lead}</p>
                            <div className="zb-hero__actions">
                                <button type="button" className="zb-btn zb-btn--primary" onClick={goLogin}>
                                    <span>{t.hero.primary}</span>
                                    <Arrow size={18} aria-hidden="true" />
                                </button>
                                <a className="zb-btn zb-btn--ghost" href="#contact">{t.hero.secondary}</a>
                            </div>
                            <p className="zb-hero__note">{t.hero.note}</p>
                        </div>
                        <div className="zb-hero__media" aria-hidden="true">
                            <img src="/zubaid/hero.webp" alt="" width="1920" height="1252" loading="eager" />
                            <span className="zb-hero__tint" />
                        </div>
                    </div>
                </section>

                <section className="zb-section" id="features">
                    <div className="zb-container">
                        <div className="zb-section__head">
                            <p className="zb-eyebrow">{t.features.eyebrow}</p>
                            <h2 className="zb-section__title">{t.features.title}</h2>
                        </div>
                        <ul className="zb-features">
                            {t.features.items.map((item, index) => {
                                const Icon = FEATURE_ICONS[index] ?? CalendarDays;
                                return (
                                    <li className="zb-feature" key={item.title}>
                                        <span className="zb-feature__icon" aria-hidden="true"><Icon size={22} /></span>
                                        <h3 className="zb-feature__title">{item.title}</h3>
                                        <p className="zb-feature__text">{item.text}</p>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </section>

                <section className="zb-section zb-section--about" id="about">
                    <div className="zb-container zb-about">
                        <div className="zb-about__copy">
                            <p className="zb-eyebrow zb-eyebrow--light">{t.about.eyebrow}</p>
                            <h2 className="zb-section__title zb-section__title--light">{t.about.title}</h2>
                            <p className="zb-about__text">{t.about.text}</p>
                        </div>
                        <dl className="zb-stats">
                            {t.about.stats.map((stat) => (
                                <div className="zb-stat" key={stat.label}>
                                    <dt className="zb-stat__label">{stat.label}</dt>
                                    <dd className="zb-stat__value">{stat.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                <section className="zb-section" id="practice">
                    <div className="zb-container">
                        <div className="zb-section__head">
                            <p className="zb-eyebrow">{t.practice.eyebrow}</p>
                            <h2 className="zb-section__title">{t.practice.title}</h2>
                        </div>
                        <ol className="zb-practice">
                            {t.practice.items.map((name, index) => (
                                <li className="zb-practice__item" key={name}>
                                    <span className="zb-practice__num">{String(index + 1).padStart(2, '0')}</span>
                                    <span className="zb-practice__name">{name}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section className="zb-section zb-section--contact" id="contact">
                    <div className="zb-container zb-contact">
                        <div className="zb-contact__copy">
                            <p className="zb-eyebrow">{t.contact.eyebrow}</p>
                            <h2 className="zb-section__title">{t.contact.title}</h2>
                            <div className="zb-contact__actions">
                                <a className="zb-btn zb-btn--primary" href={`${SITE}/contact`} target="_blank" rel="noopener noreferrer">
                                    <CalendarDays size={18} aria-hidden="true" />
                                    <span>{t.contact.book}</span>
                                </a>
                                <a className="zb-btn zb-btn--ghost" href="https://setup.zubaidi.sa" target="_blank" rel="noopener noreferrer">
                                    {t.contact.setup}
                                </a>
                            </div>
                        </div>
                        <dl className="zb-contact__list">
                            <div className="zb-contact__row">
                                <dt><Mail size={18} aria-hidden="true" /><span>{t.contact.email}</span></dt>
                                <dd><a href="mailto:info@zubaidi.sa">info@zubaidi.sa</a></dd>
                            </div>
                            <div className="zb-contact__row">
                                <dt><Phone size={18} aria-hidden="true" /><span>{t.contact.phone}</span></dt>
                                <dd><a href="tel:+966133617116" dir="ltr">+966 13 361 7116</a></dd>
                            </div>
                            <div className="zb-contact__row">
                                <dt><MapPin size={18} aria-hidden="true" /><span>{t.contact.address}</span></dt>
                                <dd>{t.contact.addressValue}</dd>
                            </div>
                        </dl>
                    </div>
                </section>
            </main>

            <footer className="zb-footer">
                <div className="zb-container zb-footer__inner">
                    <p className="zb-footer__name">{t.footer.name}</p>
                    <p className="zb-footer__meta">
                        <span>{year} © {t.footer.rights}</span>
                        <span className="zb-footer__dot" aria-hidden="true">·</span>
                        <a href={SITE} target="_blank" rel="noopener noreferrer">{t.footer.site}</a>
                        <span className="zb-footer__dot" aria-hidden="true">·</span>
                        <button type="button" className="zb-footer__login" onClick={goLogin}>{t.footer.login}</button>
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default ZubaidLanding;
