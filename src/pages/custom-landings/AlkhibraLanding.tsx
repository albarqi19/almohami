import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Phone,
    Mail,
    MapPin,
    Clock,
    MessageCircle,
    ChevronRight,
    ChevronLeft,
    Scale,
    Gavel,
    Building2,
    IdCard,
    Globe2,
    Handshake,
    ScrollText,
    Receipt,
    TrendingUp,
    FileSignature,
    ShieldCheck,
    Award,
    Lightbulb,
    Users,
    LogIn,
    Instagram,
    Twitter,
    Linkedin,
} from 'lucide-react';
import useSEO from '../../hooks/useSEO';
import './alkhibra-landing.css';

/**
 * صفحة هبوط مخصصة — شركة بيوت الخبرة للمحاماة والاستشارات القانونية
 * الهوية والمحتوى من موقعهم الرسمي hoelawfirm.com
 * (الألوان مستخرجة من شعارهم: كحلي #22335a + ذهبي رملي #b3a282)
 * بلا مكتبات حركة — المحتوى يظهر فوراً (الأفضل لسرعة LCP)
 */

const PHONE = '920016922';
const PHONE_INTL = '+966920016922';
const WHATSAPP = 'https://wa.me/+966547432222';
const EMAIL = 'info@hoelawfirm.com';

const SERVICES = [
    { name: 'الاستشارات القانونية', icon: Scale },
    { name: 'الترافع والتقاضي', icon: Gavel },
    { name: 'قطاع الأعمال والشركات', icon: Building2 },
    { name: 'الإقامة المميزة', icon: IdCard },
    { name: 'الاستثمار الأجنبي', icon: Globe2 },
    { name: 'التحكيم', icon: Handshake },
    { name: 'التركات والأوقاف والوصايا', icon: ScrollText },
    { name: 'الزكاة والضرائب', icon: Receipt },
    { name: 'قضايا الأوراق المالية', icon: TrendingUp },
    { name: 'العقود والاتفاقيات', icon: FileSignature },
];

const VALUES = [
    {
        name: 'الشفافية والنزاهة',
        desc: 'وضوح تام مع موكلينا في كل مرحلة، والتزام راسخ بأعلى المعايير المهنية والأخلاقية.',
        icon: ShieldCheck,
    },
    {
        name: 'المهنية والتخصصية',
        desc: 'فريق من المحامين والمستشارين المتخصصين وفق أفضل المنهجيات والممارسات الدولية.',
        icon: Award,
    },
    {
        name: 'الإبداع والابتكار',
        desc: 'حلول قانونية مبتكرة تُصمم خصيصاً لتلبية احتياجات كل موكل.',
        icon: Lightbulb,
    },
    {
        name: 'العمل بروح الفريق',
        desc: 'خبرات متكاملة تعمل معاً لخدمة قضيتك من كل زواياها.',
        icon: Users,
    },
];

interface TeamMember {
    name: string;
    role: string;
    photo: string | null;
    initials: string;
}

const TEAM: TeamMember[] = [
    { name: 'د. عبدالوهاب الصالح', role: 'المدير العام', photo: '/alkhibra/team/team-abdulwahab.png', initials: 'ع' },
    { name: 'أ. علي السيهاتي', role: 'نائب المدير العام', photo: '/alkhibra/team/team-ali.png', initials: 'ع' },
    { name: 'المحامي إبراهيم الزهراني', role: 'مدير فرع الدمام', photo: '/alkhibra/team/team-zahrani.jpg', initials: 'إ' },
    { name: 'المحامي محمد الدويش', role: 'مدير فرع الجبيل', photo: null, initials: 'م' },
    { name: 'المحامي عبدالعزيز الصالح', role: 'مدير فرع الأحساء', photo: '/alkhibra/team/team-abdulaziz.jpg', initials: 'ع' },
    { name: 'المستشار محمد منصور', role: 'مستشار قانوني', photo: '/alkhibra/team/team-mansour.jpg', initials: 'م' },
    { name: 'المستشار إبراهيم عفيفي', role: 'مستشار قانوني', photo: '/alkhibra/team/team-afifi.jpg', initials: 'إ' },
    { name: 'أ. عذوب العيد', role: 'مستشارة قانونية', photo: null, initials: 'ع' },
    { name: 'المحامي الوليد المزين', role: 'محامٍ مرخّص', photo: '/alkhibra/team/team-walid.jpg', initials: 'و' },
    { name: 'المحامي إبراهيم البارقي', role: 'محامٍ مرخّص', photo: '/alkhibra/team/team-bariqi.jpg', initials: 'إ' },
    { name: 'المحامي حسن النمر', role: 'محامٍ متدرب', photo: '/alkhibra/team/team-hassan.jpg', initials: 'ح' },
    { name: 'المحامي سعود الشمري', role: 'محامٍ متدرب', photo: '/alkhibra/team/team-saud.jpg', initials: 'س' },
    { name: 'أ. أحمد سعد', role: 'مدير الحسابات', photo: '/alkhibra/team/team-ahmed.jpg', initials: 'أ' },
    { name: 'أ. منير الجنتي', role: 'مدير التسويق', photo: '/alkhibra/team/team-munir.jpg', initials: 'م' },
    { name: 'أ. محمد خميس', role: 'مدير العلاقات العامة', photo: '/alkhibra/team/team-khamis.jpg', initials: 'م' },
    { name: 'أ. فيزان خان', role: 'سكرتير تنفيذي', photo: '/alkhibra/team/team-faizan.jpg', initials: 'ف' },
];

const BRANCHES = [
    {
        city: 'الدمام',
        hq: true,
        address: 'حي الأمير محمد بن سعود — شارع الأمير منصور — مجمع الفهد (1) — الدور الثاني — مكتب رقم (10)',
    },
    {
        city: 'الجبيل',
        hq: false,
        address: 'الجبيل البلد — برج الأعمال 101 — الدور الثاني — مكتب رقم (201)',
    },
    {
        city: 'الأحساء',
        hq: false,
        address: 'الهفوف — حي المحمدية — شارع القطار مقابل مجلس الملحم',
    },
];

const AlkhibraLanding: React.FC = () => {
    const navigate = useNavigate();
    const teamTrackRef = useRef<HTMLDivElement>(null);

    useSEO({
        title: 'شركة بيوت الخبرة للمحاماة والاستشارات القانونية',
        description:
            'شركة بيوت الخبرة للمحاماة والاستشارات القانونية — باقات شاملة ومتكاملة من خدمات المحاماة والاستشارات القانونية في الدمام والجبيل والأحساء.',
    });

    const scrollTeam = (dir: number) => {
        teamTrackRef.current?.scrollBy({ left: dir * 520, behavior: 'smooth' });
    };

    return (
        <div className="bk">
            {/* ===== الترويسة ===== */}
            <header className="bk-header">
                <div className="bk-container bk-header__inner">
                    <a href="#top" className="bk-brand">
                        <img src="/alkhibra/logo.png" alt="شعار بيوت الخبرة" />
                        <span>
                            <span className="bk-brand__name">بيوت الخبرة</span>
                            <span className="bk-brand__sub">للمحاماة والاستشارات القانونية</span>
                        </span>
                    </a>

                    <nav className="bk-nav" aria-label="أقسام الصفحة">
                        <a href="#services">خدماتنا</a>
                        <a href="#about">من نحن</a>
                        <a href="#team">فريقنا</a>
                        <a href="#branches">فروعنا</a>
                        <a href="#contact">تواصل معنا</a>
                    </nav>

                    <div className="bk-header__actions">
                        <button className="bk-btn bk-btn--outline bk-btn--sm" onClick={() => navigate('/login')}>
                            <LogIn size={15} />
                            دخول النظام
                        </button>
                        <a className="bk-btn bk-btn--gold bk-btn--sm" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                            <MessageCircle size={15} />
                            استشارة
                        </a>
                    </div>
                </div>
            </header>

            <main id="top">
                {/* ===== البطل ===== */}
                <section className="bk-hero">
                    <div className="bk-container">
                        <div className="bk-hero__grid">
                            <div className="bk-rise">
                                <span className="bk-hero__tag">المحامون الأكثر ثقة في المملكة العربية السعودية</span>
                                <h1 className="bk-hero__title">
                                    بيوت <em>الخبرة</em>
                                    <br />
                                    للمحاماة والاستشارات القانونية
                                </h1>
                                <p className="bk-hero__subtitle">
                                    شركة مهنية تأسست في الدمام، تقدم باقات شاملة ومتكاملة من خدمات المحاماة
                                    والاستشارات القانونية المتقنة والموثوقة، وفق أفضل المنهجيات القانونية وأحدث
                                    الممارسات والمعايير الدولية.
                                </p>
                                <div className="bk-hero__actions">
                                    <a className="bk-btn bk-btn--whats" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                                        <MessageCircle size={18} />
                                        استشارة عبر واتساب
                                    </a>
                                    <a className="bk-btn bk-btn--outline" href={`tel:${PHONE_INTL}`}>
                                        <Phone size={17} />
                                        {PHONE}
                                    </a>
                                </div>
                                <div className="bk-hero__facts">
                                    <div className="bk-fact">
                                        <b>3 فروع</b>
                                        <span>في المنطقة الشرقية</span>
                                    </div>
                                    <div className="bk-fact">
                                        <b>10 مجالات</b>
                                        <span>تخصص قانوني</span>
                                    </div>
                                    <div className="bk-fact">
                                        <b>16+ مختصاً</b>
                                        <span>محامون ومستشارون</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bk-hero__logo bk-rise bk-rise--2">
                                <img src="/alkhibra/logo.png" alt="شعار شركة بيوت الخبرة" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== شريط الرؤية ===== */}
                <section className="bk-vision">
                    <div className="bk-container bk-vision__inner">
                        <span className="bk-vision__label">رؤيتنا</span>
                        <p className="bk-vision__text">
                            صناعة أنموذجٍ للتميّز والمصداقية في قطاع المحاماة والاستشارات القانونية
                        </p>
                    </div>
                </section>

                {/* ===== الخدمات ===== */}
                <section className="bk-services" id="services">
                    <div className="bk-container">
                        <div className="bk-head">
                            <span className="bk-eyebrow">خدماتنا</span>
                            <h2>عشرة مجالات تخصص… تحت سقف بيتٍ واحد</h2>
                            <p>خدمات مصممة خصيصاً لتلبية كافة الاحتياجات القانونية للأفراد وقطاع الأعمال.</p>
                        </div>
                        <div className="bk-services__grid">
                            {SERVICES.map((service) => (
                                <div className="bk-service" key={service.name}>
                                    <span className="bk-service__icon">
                                        <service.icon size={21} />
                                    </span>
                                    <h3>{service.name}</h3>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== من نحن + القيم ===== */}
                <section className="bk-about" id="about">
                    <div className="bk-container">
                        <div className="bk-about__grid">
                            <div>
                                <span className="bk-eyebrow bk-about__eyebrow">من نحن</span>
                                <h2>بيتُ خبرةٍ سعودي… بمعايير دولية</h2>
                                <p className="bk-about__text">
                                    شركة بيوت الخبرة للمحاماة والاستشارات القانونية، شركة مهنية ذات مسؤولية محدودة
                                    تأسست بمدينة الدمام، نتميز بتقديم باقات شاملة ومتكاملة من خدمات المحاماة
                                    والاستشارات القانونية المتقنة والموثوقة، عبر توظيف خبرات محامين ومستشارين
                                    متخصصين يعملون وفق أفضل المنهجيات القانونية وأحدث الممارسات والمعايير الدولية.
                                </p>
                                <p className="bk-about__mission">
                                    <b>رسالتنا:</b> السعي الدائم للريادة والتطوير المستمر، وتلبية احتياجات موكلينا
                                    بتخصصيةٍ وكفاءة — نسعد بتمثيلهم وتقديم الرعاية القانونية الراقية لهم.
                                </p>
                            </div>
                            <div className="bk-values">
                                {VALUES.map((value) => (
                                    <div className="bk-value" key={value.name}>
                                        <value.icon size={22} />
                                        <h3>{value.name}</h3>
                                        <p>{value.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ===== الفريق ===== */}
                <section className="bk-team" id="team">
                    <div className="bk-container">
                        <div className="bk-head bk-head--onnavy">
                            <span className="bk-eyebrow">فريق العمل</span>
                            <h2>خبراتٌ تجتمع لخدمة قضيتك</h2>
                            <p>قيادات وكوادر قانونية وإدارية متخصصة في فروعنا الثلاثة.</p>
                        </div>

                        <div className="bk-team__controls" aria-hidden>
                            <button className="bk-team__arrow" onClick={() => scrollTeam(1)} aria-label="السابق">
                                <ChevronRight size={20} />
                            </button>
                            <button className="bk-team__arrow" onClick={() => scrollTeam(-1)} aria-label="التالي">
                                <ChevronLeft size={20} />
                            </button>
                        </div>

                        <div className="bk-team__track" ref={teamTrackRef}>
                            {TEAM.map((member) => (
                                <div className="bk-member" key={member.name}>
                                    <div className="bk-member__photo">
                                        {member.photo ? (
                                            <img src={member.photo} alt={member.name} loading="lazy" />
                                        ) : (
                                            <span className="bk-member__initials">{member.initials}</span>
                                        )}
                                    </div>
                                    <div className="bk-member__info">
                                        <p className="bk-member__name">{member.name}</p>
                                        <p className="bk-member__role">{member.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== الفروع ===== */}
                <section className="bk-branches" id="branches">
                    <div className="bk-container">
                        <div className="bk-head">
                            <span className="bk-eyebrow">فروعنا</span>
                            <h2>ثلاثة بيوتٍ للخبرة في المنطقة الشرقية</h2>
                            <p>نخدمك من الدمام والجبيل والأحساء — من الأحد إلى الخميس، 8 صباحاً حتى 4 مساءً.</p>
                        </div>
                        <div className="bk-branches__grid">
                            {BRANCHES.map((branch) => (
                                <div className={`bk-branch ${branch.hq ? 'bk-branch--hq' : ''}`} key={branch.city}>
                                    {branch.hq && <span className="bk-branch__badge">المقر الرئيسي</span>}
                                    <span className="bk-branch__icon">
                                        <MapPin size={21} />
                                    </span>
                                    <h3>{branch.city}</h3>
                                    <p className="bk-branch__addr">
                                        <MapPin size={14} />
                                        {branch.address}
                                    </p>
                                    <div className="bk-branch__meta">
                                        <Clock size={14} />
                                        الأحد – الخميس · 8:00 ص – 4:00 م
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== التواصل ===== */}
                <section className="bk-contact" id="contact">
                    <div className="bk-container">
                        <div className="bk-contact__card">
                            <div>
                                <h2>قضيتك تستحق بيتَ خبرة</h2>
                                <p>
                                    تواصل معنا اليوم وسيتولى فريقنا دراسة موضوعك والرد عليك بأسرع وقت — استشارتك
                                    تبدأ برسالة واحدة.
                                </p>
                                <div className="bk-contact__rows">
                                    <a className="bk-contact__row" href={`tel:${PHONE_INTL}`}>
                                        <Phone size={17} />
                                        الرقم الموحد: <b>{PHONE}</b>
                                    </a>
                                    <a className="bk-contact__row" href={`mailto:${EMAIL}`}>
                                        <Mail size={17} />
                                        <b>{EMAIL}</b>
                                    </a>
                                    <span className="bk-contact__row">
                                        <Clock size={17} />
                                        الأحد – الخميس · 8:00 صباحاً – 4:00 مساءً
                                    </span>
                                </div>
                            </div>
                            <div className="bk-contact__cta">
                                <a className="bk-btn bk-btn--whats" href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle size={18} />
                                    راسلنا على واتساب
                                </a>
                                <a className="bk-btn bk-btn--gold" href={`tel:${PHONE_INTL}`}>
                                    <Phone size={17} />
                                    اتصل بنا الآن
                                </a>
                                <div className="bk-contact__socials">
                                    <a
                                        className="bk-contact__social"
                                        href="https://www.instagram.com/houses.of.expertise/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="إنستغرام"
                                    >
                                        <Instagram size={18} />
                                    </a>
                                    <a
                                        className="bk-contact__social"
                                        href="https://x.com/Housesofexp"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="إكس"
                                    >
                                        <Twitter size={18} />
                                    </a>
                                    <a
                                        className="bk-contact__social"
                                        href="https://www.linkedin.com/company/houses-of-expertise/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="لينكدإن"
                                    >
                                        <Linkedin size={18} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* ===== التذييل ===== */}
            <footer className="bk-footer">
                <div className="bk-container bk-footer__inner">
                    <div className="bk-footer__brand">
                        <img src="/alkhibra/logo.png" alt="" aria-hidden />
                        <span>بيوت الخبرة للمحاماة والاستشارات القانونية</span>
                    </div>
                    <span className="bk-footer__copy">
                        © {new Date().getFullYear()} جميع الحقوق محفوظة لشركة بيوت الخبرة
                    </span>
                    <span className="bk-footer__sys">
                        تعمل بنظام <a href="https://alraedlaw.com" target="_blank" rel="noopener noreferrer">الرائد لإدارة المحاماة</a>
                    </span>
                </div>
            </footer>
        </div>
    );
};

export default AlkhibraLanding;
