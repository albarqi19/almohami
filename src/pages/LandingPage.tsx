import React from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  ArrowLeft,
  LayoutDashboard,
  Briefcase,
  FileText,
  CalendarDays,
  Cloud,
  MessageCircle,
  ShieldCheck,
  EyeOff,
  ChevronDown,
  ListChecks,
  Globe2,
  Landmark,
  FileSearch,
  CheckCircle2,
  XCircle,
  Check,
  Lock,
  Video,
  PenLine,
  Microscope,
  BrainCircuit,
  Swords,
  BadgeCheck,
  Gavel,
  Receipt,
  Bell,
  BookOpen,
  Search,
  TrendingUp,
  FileSignature,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/landing.css';

/* ------------------------------------------------------------------ */
/* البيانات                                                            */
/* ------------------------------------------------------------------ */

const ROTATING_WORDS = ['قضاياك', 'جلساتك', 'مذكراتك', 'عقودك', 'فواتيرك', 'موكِّليك', 'مستنداتك'];

const STATS = [
  { value: 18, suffix: '', label: 'وحدة متكاملة' },
  { value: 200, suffix: '+', label: 'ميزة موثّقة' },
  { value: 20, suffix: '', label: 'أداة ذكاء اصطناعي' },
  { value: 7, suffix: '', label: 'تكاملات خارجية' },
];

const MARQUEE_ITEMS = [
  'استيراد القضايا وطلبات التنفيذ من ناجز بضغطة واحدة',
  'تذكير الجلسات عبر واتساب تلقائياً',
  '٢٢ نوعاً من المذكرات القانونية',
  'باحث الأنظمة السعودية — ابحث بالمعنى لا بالكلمات',
  '٨ خدمات استعلام من منصة واثق',
  'مستنداتك في OneDrive مكتبك — لا في خوادمنا',
  'خدمات قانونية بمخرجات تحمل هوية مكتبك',
  'بوابة عملاء بنطاقٍ يحمل اسم مكتبك',
  'تقارير أداء الشركة والمحامين لحظة بلحظة',
  'فواتير بضريبة القيمة المضافة تُحسب وحدها',
  'تحليل ذكي للمذكرة في ٩٠ ثانية',
];

const AI_DEMOS = [
  {
    id: 'formal',
    label: 'الصياغة الرصينة',
    icon: PenLine,
    before: '«العميل ما دفع الفلوس وماطل علينا شهرين»',
    after: '«امتنع المدعى عليه عن سداد المبالغ المستحقة في ذمته، وماطَل في الوفاء بها مدة شهرين كاملين دون مسوّغٍ نظامي»',
    risk: null,
  },
  {
    id: 'plain',
    label: 'التبسيط للعميل',
    icon: MessageCircle,
    before: '«استناداً إلى المادة (٧٦) من نظام المرافعات الشرعية، يحق للمحكوم عليه طلب الاستئناف خلال المدة النظامية»',
    after: '«حسب النظام، يحق لك الاعتراض على الحكم خلال ٣٠ يوماً من استلامه — وسنجهّز لك كل الأوراق»',
    risk: null,
  },
  {
    id: 'risk',
    label: 'كشف المخاطر',
    icon: Microscope,
    before: '«يحق للطرف الأول تعديل الأتعاب في أي وقتٍ يراه مناسباً»',
    after: '«لا تُعدَّل الأتعاب إلا باتفاقٍ كتابيٍّ مُوقَّعٍ من الطرفين» — بندٌ يمنح الطرف الأول سلطةً مطلقة، وهذه الصياغة البديلة تحميك',
    risk: 'بند غير متوازن — خطورة مرتفعة',
  },
];

const AI_ENGINES = [
  { name: 'الحارس الشكلي', desc: 'يفحص البيانات والاختصاص والمواعيد النظامية', icon: ShieldCheck },
  { name: 'المحلل الاستراتيجي', desc: 'يقيّم الحجج ويبني استراتيجية الدفاع', icon: BrainCircuit },
  { name: 'محاكي الخصم', desc: 'يتقمص محامي الطرف الآخر ويكشف ثغراتك', icon: Swords },
  { name: 'المدقق القانوني', desc: 'يصقل الصياغة لغوياً وقانونياً', icon: BadgeCheck },
  { name: 'مراجع الامتثال', desc: 'يطابق المذكرة مع الأنظمة السعودية', icon: Gavel },
];

const INTEGRATIONS = [
  {
    name: 'منصة ناجز',
    icon: Landmark,
    desc: 'استيراد القضايا والجلسات والوكالات عبر إضافة كروم مخصصة — بلا إدخال يدوي، ومع مطابقة تلقائية للمحامين والعملاء.',
  },
  {
    name: 'منصة واثق',
    icon: FileSearch,
    desc: 'ثماني خدمات استعلام حكومية من داخل النظام: سجل تجاري، صكوك عقارية، وكالات، عنوان وطني، وأكثر.',
  },
  {
    name: 'واتساب للأعمال',
    icon: MessageCircle,
    desc: 'أكثر من ١٢ إشعاراً تلقائياً: تذكير الجلسات، المهام المتأخرة، ترحيب العملاء، والتقرير اليومي — بقوالب بهوية مكتبك.',
  },
  {
    name: 'Microsoft OneDrive',
    icon: Cloud,
    desc: 'مجلد سحابي تلقائي لكل قضية في حساب مكتبك أنت — مع إصدارات للمستندات وروابط مشاركة آمنة ومؤقتة.',
  },
  {
    name: 'Microsoft 365',
    icon: CalendarDays,
    desc: 'مزامنة ثنائية الاتجاه مع تقويم Outlook ومهام To Do — مواعيدك ومهامك في كل أجهزتك دون إدخال مزدوج.',
  },
  {
    name: 'مؤتمرات الفيديو',
    icon: Video,
    desc: 'اجتماعات داخلية واجتماعات عملاء عبر Zoom وGoogle Meet وTeams، مع زر انضمام ذكي وروابط حجز ذاتي.',
  },
];

const COMPARE_OLD = [
  'إدخال بيانات القضايا يدوياً — ساعات من النسخ واللصق',
  'مراجعة المذكرة القانونية تستهلك يوم عملٍ كامل',
  'تذكير الجلسات بالذاكرة وتقويم الجوال — قابل للنسيان',
  'العميل يتصل كل يوم يسأل: «وش صار على قضيتي؟»',
  'فواتير على Excel ودفاتر، وتحصيلٌ بلا متابعة',
];

const COMPARE_NEW = [
  'استيراد القضايا والجلسات والوكالات من ناجز بضغطة',
  'تحليل ذكي شامل للمذكرة في ٩٠ ثانية مع توصيات',
  'واتساب تلقائي يذكّر المحامي والعميل قبل كل جلسة',
  'بوابة عملاء يتابع منها موكِّلك قضاياه بنفسه',
  'فوترة إلكترونية بضريبة محسوبة وتذكيرات تحصيل آلية',
];

const FAQS = [
  {
    q: 'هل توجد فترة تجريبية مجانية؟',
    a: 'نعم — يسجّل مكتبك ذاتياً ويحصل على فترة تجريبية مجانية بكامل المزايا قبل اختيار خطة الاشتراك الشهرية أو السنوية.',
  },
  {
    q: 'هل بيانات مكتبي معزولة عن المكاتب الأخرى؟',
    a: 'تماماً. كل مكتب يعمل في بيئة منعزلة على مستوى قاعدة البيانات، مع مصادقة ثنائية (2FA) ونظام صلاحيات دقيق يحدد ما يراه كل موظف.',
  },
  {
    q: 'كيف يعمل الاستيراد من ناجز؟',
    a: 'عبر إضافة كروم مخصصة تستخرج قضاياك وجلساتك ووكالاتك من حسابك في ناجز وتستوردها للنظام دفعة واحدة، مع مطابقة تلقائية للمحامين والعملاء وربط القضايا بمعرّفاتها في ناجز للمزامنة المستمرة.',
  },
  {
    q: 'أين تُخزَّن مستندات المكتب؟',
    a: 'في حساب OneDrive الخاص بمكتبك مباشرة — تنتقل الملفات بين متصفحك وسحابتك دون المرور بخوادمنا، فتبقى أسرار موكليك ملكاً لك وحدك.',
  },
  {
    q: 'هل أحصل على نطاق ولوحة بهوية مكتبي؟',
    a: 'نعم — يحصل مكتبك على نطاق فرعي خاص (مكتبك.alraedlaw.com) مع شعارك وألوانك، يدخل منه فريقك وعملاؤك.',
  },
  {
    q: 'كم يستغرق إطلاق النظام في مكتبي؟',
    a: 'أيام معدودة: تسجيل المكتب، استيراد القضايا من ناجز، ودعوة الفريق — مع تدريبٍ ودعمٍ مستمر حتى تستقر شؤون المكتب على النظام.',
  },
];

/* ------------------------------------------------------------------ */
/* مكوّنات مساعدة                                                      */
/* ------------------------------------------------------------------ */

const toArabicDigits = (n: number) => n.toLocaleString('ar-EG', { useGrouping: false });

const CountUp: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = React.useState('٠');

  React.useEffect(() => {
    if (!inView) return;
    const duration = 1500;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(toArabicDigits(Math.round(eased * value)));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
};

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const R = 54;
  const C = 2 * Math.PI * R;
  return (
    <div className="rl-ring">
      <svg viewBox="0 0 124 124">
        <circle className="rl-ring__bg" cx="62" cy="62" r={R} />
        <motion.circle
          className="rl-ring__fg"
          cx="62"
          cy="62"
          r={R}
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          whileInView={{ strokeDashoffset: C * (1 - score / 100) }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <div className="rl-ring__value">
        <CountUp value={score} />
        <span className="rl-ring__total">من ١٠٠</span>
      </div>
    </div>
  );
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const Reveal: React.FC<React.PropsWithChildren<{ className?: string; delay?: number }>> = ({
  children,
  className,
  delay = 0,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
  >
    {children}
  </motion.div>
);

/* ------------------------------------------------------------------ */
/* الصفحة                                                              */
/* ------------------------------------------------------------------ */

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [wordIndex, setWordIndex] = React.useState(0);
  const [scrolled, setScrolled] = React.useState(false);
  const [demoIndex, setDemoIndex] = React.useState(0);
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2600);
    return () => clearInterval(interval);
  }, []);


  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const primaryCTA = user
    ? { label: 'الذهاب للوحة التحكم', href: '/dashboard', icon: LayoutDashboard }
    : { label: 'ابدأ تجربتك المجانية', href: '/register', icon: ArrowLeft };

  const activeDemo = AI_DEMOS[demoIndex];

  return (
    <div className="rl">
      {/* ===== الترويسة ===== */}
      <header className={`rl-header ${scrolled ? 'rl-header--scrolled' : ''}`}>
        <div className="rl-container rl-header__inner">
          <a href="#top" className="rl-brand">
            <span className="rl-brand__mark">
              <Layers size={23} strokeWidth={2.2} />
            </span>
            <span>
              <span className="rl-brand__name">نظام الرائد</span>
              <span className="rl-brand__tag">نظام إدارة مكاتب المحاماة</span>
            </span>
          </a>

          <nav className="rl-nav" aria-label="أقسام الصفحة">
            <a href="#system">المنظومة</a>
            <a href="#ai">الذكاء الاصطناعي</a>
            <a href="#integrations">التكاملات</a>
            <a href="#privacy">الخصوصية</a>
            <a href="#faq">الأسئلة</a>
          </nav>

          <div className="rl-header__actions">
            {!user && (
              <Link to="/login" className="rl-header__login">
                تسجيل الدخول
              </Link>
            )}
            <Link to={primaryCTA.href} className="rl-btn rl-btn--gold rl-btn--sm">
              <span className="rl-btn__label-full">{primaryCTA.label}</span>
              <span className="rl-btn__label-short">{user ? 'لوحة التحكم' : 'ابدأ الآن'}</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ===== البطل ===== */}
        <section className="rl-hero rl-pattern rl-grain">
          <div className="rl-container">
            <div className="rl-hero__grid">
              <motion.div initial="hidden" animate="show" variants={stagger}>
                <motion.span className="rl-hero__tag" variants={fadeUp}>
                  منصة سعودية متكاملة لمكاتب وشركات المحاماة
                </motion.span>

                <motion.h1 className="rl-hero__title" variants={fadeUp}>
                  كلُّ ما في مكتبك،
                  <br />
                  <span className="rl-hero__rotator">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={ROTATING_WORDS[wordIndex]}
                        className="rl-hero__word"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -18 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {ROTATING_WORDS[wordIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <br />
                  في ديوانٍ رقميٍّ واحد
                </motion.h1>

                <motion.p className="rl-hero__subtitle" variants={fadeUp}>
                  من استيراد القضية من <strong>ناجز</strong> حتى تحصيل آخر فاتورة: جلسات بالهجري
                  والميلادي، مذكرات يراجعها <strong>ذكاءٌ اصطناعي يفهم القانون السعودي</strong>،
                  وعملاء يتابعون قضاياهم بأنفسهم — وأنت تتفرّغ للترافع.
                </motion.p>

                <motion.div className="rl-hero__actions" variants={fadeUp}>
                  <Link to={primaryCTA.href} className="rl-btn rl-btn--ink">
                    <primaryCTA.icon size={19} />
                    {primaryCTA.label}
                  </Link>
                  <a href="#system" className="rl-btn rl-btn--ghost-dark">
                    استكشف المنظومة
                  </a>
                </motion.div>

                <motion.p className="rl-hero__note" variants={fadeUp}>
                  <CheckCircle2 size={16} />
                  فترة تجريبية مجانية — وإطلاق كامل خلال أيام مع تدريب ودعم مستمر
                </motion.p>
              </motion.div>

            </div>

          </div>

          {/* الشريط المتحرك — مرئي في أسفل أول شاشة */}
          <div className="rl-marquee" aria-hidden>
            <div className="rl-marquee__track">
              {[0, 1].map((copy) => (
                <React.Fragment key={copy}>
                  {MARQUEE_ITEMS.map((item) => (
                    <span className="rl-marquee__item" key={`${copy}-${item}`}>
                      {item}
                    </span>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ===== شريط الأرقام ===== */}
        <section className="rl-statband">
          <div className="rl-container">
            <motion.div
              className="rl-hero__stats"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              variants={stagger}
            >
              {STATS.map((stat) => (
                <motion.div className="rl-stat" key={stat.label} variants={fadeUp}>
                  <div className="rl-stat__num">
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="rl-stat__label">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ===== المنظومة (Bento) ===== */}
        <section className="rl-system rl-grain" id="system">
          <div className="rl-container">
            <Reveal className="rl-section-head">
              <span className="rl-eyebrow">منظومة متكاملة</span>
              <h2>ثمانية عشر باباً لإدارة المكتب… تحت سقفٍ واحد</h2>
              <p>
                لا برامج متفرقة ولا جداول مبعثرة — كل قسم في مكتبك له ركنه في الديوان، والأقسام
                تتحدث مع بعضها.
              </p>
            </Reveal>

            <motion.div
              className="rl-bento"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
            >
              {/* القضايا والجلسات */}
              <motion.div className="rl-cell rl-cell--7" variants={fadeUp}>
                <span className="rl-cell__icon">
                  <Briefcase size={21} />
                </span>
                <h3>القضايا والجلسات وطلبات التنفيذ</h3>
                <p>
                  ملف القضية كاملاً: الأطراف، الوكالات، المستندات، والجلسات بالتاريخ الهجري
                  والميلادي — مع استيراد القضايا وطلبات التنفيذ من ناجز ومزامنة مستمرة لكل تحديث.
                </p>
                <div className="rl-cell__visual">
                  <div className="rl-mini-row">
                    <span className="rl-dot rl-dot--gold" />
                    جلسة نظر — الدائرة التجارية
                    <span className="rl-mini-row__date">٢٢ / ١٢ / ١٤٤٧هـ</span>
                  </div>
                  <div className="rl-mini-row">
                    <span className="rl-dot rl-dot--green" />
                    طلب تنفيذ — سند لأمر
                    <span className="rl-mini-row__date">قرار ٣٤ صادر</span>
                  </div>
                  <div className="rl-mini-row">
                    <span className="rl-dot rl-dot--mute" />
                    جلسة استماع — مؤجّلة
                    <span className="rl-mini-row__date">١٧ / ٠١ / ١٤٤٨هـ</span>
                  </div>
                </div>
              </motion.div>

              {/* المستندات */}
              <motion.div className="rl-cell rl-cell--5" variants={fadeUp}>
                <span className="rl-cell__icon">
                  <Cloud size={21} />
                </span>
                <h3>مستندات في سحابة مكتبك</h3>
                <p>
                  مجلد تلقائي لكل قضية في OneDrive مكتبك، بإصدارات وصلاحيات دقيقة وروابط مشاركة
                  محمية تنتهي صلاحيتها وحدها.
                </p>
                <div className="rl-cell__visual rl-mini-docs">
                  <div className="rl-mini-doc">
                    <FileText size={15} />
                    صحيفة الدعوى — الإصدار ٣
                    <span className="rl-mini-doc__cloud">
                      <Check size={11} /> مُزامَن
                    </span>
                  </div>
                  <div className="rl-mini-doc">
                    <FileText size={15} />
                    عقد الأتعاب الموقّع
                    <span className="rl-mini-doc__cloud">
                      <Lock size={11} /> سرّي
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* العقود والفوترة */}
              <motion.div className="rl-cell rl-cell--4" variants={fadeUp}>
                <span className="rl-cell__icon">
                  <Receipt size={21} />
                </span>
                <h3>العقود والفوترة</h3>
                <p>
                  من القالب إلى التوقيع إلى الفاتورة: ضريبة ١٥٪ تُحسب وحدها، وتذكيرات تحصيل لا
                  تملّ.
                </p>
                <div className="rl-cell__visual rl-mini-invoice">
                  <div className="rl-mini-invoice__row">
                    <span>أتعاب الترافع</span>
                    <b>٢٠٬٠٠٠</b>
                  </div>
                  <div className="rl-mini-invoice__row">
                    <span>ضريبة القيمة المضافة ١٥٪</span>
                    <b>٣٬٠٠٠</b>
                  </div>
                  <div className="rl-mini-invoice__total">
                    <span>الإجمالي</span>
                    <span>٢٣٬٠٠٠ ر.س</span>
                  </div>
                </div>
              </motion.div>

              {/* المهام والفريق */}
              <motion.div className="rl-cell rl-cell--4" variants={fadeUp}>
                <span className="rl-cell__icon">
                  <ListChecks size={21} />
                </span>
                <h3>المهام والفريق</h3>
                <p>
                  مهام فرعية وتتبع وقت وتعليقات، مع حضور لحظي وتقارير أداء لكل محامٍ في المكتب.
                </p>
                <div className="rl-cell__visual">
                  <div className="rl-mini-task rl-mini-task--done">
                    <span className="rl-mini-task__box">
                      <Check size={11} />
                    </span>
                    <span>مراجعة لائحة الاعتراض</span>
                  </div>
                  <div className="rl-mini-task">
                    <span className="rl-mini-task__box" />
                    <span>تجهيز حافظة المستندات</span>
                  </div>
                  <div className="rl-avatars">
                    <span className="rl-avatar">خع</span>
                    <span className="rl-avatar rl-avatar--idle">سم</span>
                    <span className="rl-avatar rl-avatar--off">نف</span>
                  </div>
                </div>
              </motion.div>

              {/* بوابة العملاء */}
              <motion.div className="rl-cell rl-cell--4" variants={fadeUp}>
                <span className="rl-cell__icon">
                  <Globe2 size={21} />
                </span>
                <h3>بوابة العملاء</h3>
                <p>
                  نطاق بهوية مكتبك يدخل منه موكِّلك فيتابع قضاياه ومستنداته بنفسه — فتقلّ
                  المكالمات.
                </p>
                <div className="rl-cell__visual rl-mini-browser">
                  <div className="rl-mini-browser__bar">
                    <span className="rl-mini-browser__dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="rl-mini-browser__url">
                      <Lock size={10} />
                      <b>مكتبك</b>.alraedlaw.com
                    </span>
                  </div>
                  <div className="rl-mini-browser__body">
                    <Bell size={14} />
                    تم تحديث قضيتك — رُفعت مذكرة الرد
                  </div>
                </div>
              </motion.div>

              {/* واتساب */}
              <motion.div className="rl-cell rl-cell--7" variants={fadeUp}>
                <span className="rl-cell__icon">
                  <MessageCircle size={21} />
                </span>
                <h3>إشعارات واتساب التلقائية</h3>
                <p>
                  أكثر من ١٢ نوعاً من الإشعارات تخرج وحدها في وقتها: جلسات الغد مجمّعة لكل محامٍ،
                  المهام المتأخرة، ترحيب العملاء الجدد، والتقرير اليومي للمكتب.
                </p>
                <div className="rl-cell__visual rl-mini-chat">
                  <div className="rl-mini-chat__bubble">
                    جلساتك غداً (٣): قضية ٤٥٨٢ — ١٠:٠٠ ص، قضية ٤٦٠١ — ١١:٣٠ ص…
                    <span className="rl-mini-chat__time">٨:٠٠ م</span>
                  </div>
                  <div className="rl-mini-chat__bubble rl-mini-chat__bubble--green">
                    أهلاً بك أ. سارة — تم فتح ملف قضيتك ويمكنك متابعتها من بوابتك الخاصة
                    <span className="rl-mini-chat__time">٩:١٥ ص</span>
                  </div>
                </div>
              </motion.div>

              {/* أداء الشركة والمحامين */}
              <motion.div className="rl-cell rl-cell--5" variants={fadeUp}>
                <span className="rl-cell__icon">
                  <TrendingUp size={21} />
                </span>
                <h3>أداء الشركة والمحامين</h3>
                <p>
                  تقرير تجميعي للإدارة يلخّص أداء الشركة، وتقرير لكل محامٍ: عدد القضايا، نسبة
                  الكسب، المهام المنجزة والمتأخرة، وساعات الحضور الفعلية.
                </p>
                <div className="rl-cell__visual">
                  <div className="rl-mini-bars">
                    <i style={{ '--h': 38 } as React.CSSProperties} />
                    <i style={{ '--h': 56 } as React.CSSProperties} />
                    <i style={{ '--h': 44 } as React.CSSProperties} />
                    <i style={{ '--h': 72 } as React.CSSProperties} />
                    <i style={{ '--h': 60 } as React.CSSProperties} />
                    <i className="hot" style={{ '--h': 92 } as React.CSSProperties} />
                  </div>
                  <div className="rl-kpis">
                    <span className="rl-kpi">نسبة الكسب ٧٨٪</span>
                    <span className="rl-kpi">قضايا نشطة ٤٦</span>
                    <span className="rl-kpi">التحصيل +١٢٪</span>
                  </div>
                </div>
              </motion.div>

              {/* باحث الأنظمة */}
              <motion.div className="rl-cell rl-cell--7" variants={fadeUp}>
                <span className="rl-cell__icon">
                  <BookOpen size={21} />
                </span>
                <h3>باحث الأنظمة السعودية</h3>
                <p>
                  تصفّح ٧٥ نظاماً سعودياً وأكثر من ٦٬٠٠٠ مادة، وابحث بالمعنى لا بالكلمات — مع
                  محادثة ذكية تجيب من نصوص الأنظمة وتُسند كل إجابة إلى مادتها.
                </p>
                <div className="rl-cell__visual rl-mini-search">
                  <div className="rl-mini-search__bar">
                    <Search size={15} />
                    كم مدة الإجازة السنوية للعامل؟
                  </div>
                  <div className="rl-mini-search__result">
                    <b>نظام العمل — المادة ١٠٩</b>
                    يستحق العامل إجازة سنوية لا تقل مدتها عن واحد وعشرين يوماً، تُزاد إلى ثلاثين
                    يوماً متى أمضى في الخدمة خمس سنوات متصلة…
                  </div>
                </div>
              </motion.div>

              {/* الخدمات القانونية */}
              <motion.div className="rl-cell rl-cell--5" variants={fadeUp}>
                <span className="rl-cell__icon">
                  <FileSignature size={21} />
                </span>
                <h3>الخدمات القانونية</h3>
                <p>
                  استشارات وصياغة عقود وخدمات لا تحتاج قضية: من استقبال الطلب إلى تسليم مخرجٍ
                  بترويسة مكتبك — وتدقيق ذكي للعقود، وتحويل الخدمة لقضية متى تطوّرت.
                </p>
                <div className="rl-cell__visual rl-mini-steps">
                  <span className="rl-mini-step">
                    <FileText size={13} />
                    طلب الخدمة
                  </span>
                  <ChevronLeft size={14} />
                  <span className="rl-mini-step">
                    <Sparkles size={13} />
                    تدقيق ذكي
                  </span>
                  <ChevronLeft size={14} />
                  <span className="rl-mini-step">
                    <BadgeCheck size={13} />
                    مخرج بهوية مكتبك
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ===== الذكاء الاصطناعي ===== */}
        <section className="rl-ai rl-pattern rl-grain" id="ai">
          <div className="rl-container">
            <Reveal className="rl-section-head rl-section-head--onink">
              <span className="rl-eyebrow">الذكاء الاصطناعي القانوني</span>
              <h2>عقلٌ قانونيٌّ لا ينام… مبنيٌّ للقانون السعودي</h2>
              <p>
                عشرون أداة وخمسة محركات تحليل تراجع مذكراتك وعقودك في ثوانٍ: حدِّد النص، اختر
                الأداة، وطبّق النتيجة بنقرة.
              </p>
            </Reveal>

            <div className="rl-ai__panel">
              <Reveal className="rl-demo">
                <div className="rl-demo__tabs" role="tablist" aria-label="أدوات العرض">
                  {AI_DEMOS.map((demo, i) => (
                    <button
                      key={demo.id}
                      role="tab"
                      aria-selected={i === demoIndex}
                      className={`rl-demo__tab ${i === demoIndex ? 'rl-demo__tab--active' : ''}`}
                      onClick={() => setDemoIndex(i)}
                    >
                      <demo.icon size={15} />
                      {demo.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeDemo.id}
                    className="rl-demo__stage"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -14 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="rl-demo__card rl-demo__card--before">
                      <span className="rl-demo__label">النص الأصلي</span>
                      <p className="rl-demo__text">{activeDemo.before}</p>
                    </div>
                    <span className="rl-demo__arrow">
                      <ArrowLeft size={19} />
                    </span>
                    <div className="rl-demo__card rl-demo__card--after">
                      <span className="rl-demo__label">بعد المعالجة الذكية</span>
                      {activeDemo.risk && <span className="rl-demo__risk">⚠ {activeDemo.risk}</span>}
                      <p className="rl-demo__text">{activeDemo.after}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <p className="rl-demo__foot">
                  <Sparkles size={15} />
                  متاحة أثناء الكتابة عبر ويدجت «اسألني» العائم — حدِّد النص وطبِّق التعديل بنقرة
                  واحدة
                </p>
              </Reveal>

              <Reveal className="rl-ai__scorecard" delay={0.12}>
                <h3>تحليل شامل للمذكرة في ٩٠ ثانية</h3>
                <ScoreRing score={87} />
                <div className="rl-meter">
                  <div className="rl-meter__head">
                    <span>اكتمال الهيكل</span>
                    <b>٩٠٪</b>
                  </div>
                  <div className="rl-meter__track">
                    <motion.div
                      className="rl-meter__fill"
                      initial={{ width: 0 }}
                      whileInView={{ width: '90%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
                <div className="rl-meter">
                  <div className="rl-meter__head">
                    <span>قوة الأدلة</span>
                    <b>٨٠٪</b>
                  </div>
                  <div className="rl-meter__track">
                    <motion.div
                      className="rl-meter__fill"
                      initial={{ width: 0 }}
                      whileInView={{ width: '80%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
                <div className="rl-meter">
                  <div className="rl-meter__head">
                    <span>الامتثال للأنظمة السعودية</span>
                    <b>٨٥٪</b>
                  </div>
                  <div className="rl-meter__track">
                    <motion.div
                      className="rl-meter__fill"
                      initial={{ width: 0 }}
                      whileInView={{ width: '85%' }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </Reveal>
            </div>

            {/* المحركات الخمسة */}
            <div className="rl-engines">
              <Reveal>
                <h3 className="rl-engines__title">خمسة محركات تتعاقب على مذكرتك</h3>
              </Reveal>
              <motion.div
                className="rl-engines__line"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                variants={stagger}
              >
                {AI_ENGINES.map((engine) => (
                  <motion.div className="rl-engine" key={engine.name} variants={fadeUp}>
                    <span className="rl-engine__node">
                      <engine.icon size={24} />
                    </span>
                    <span className="rl-engine__text">
                      <span className="rl-engine__name">{engine.name}</span>
                      <span className="rl-engine__desc">{engine.desc}</span>
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

          </div>
        </section>

        {/* ===== التكاملات ===== */}
        <section className="rl-integrations rl-grain" id="integrations">
          <div className="rl-container">
            <Reveal className="rl-section-head">
              <span className="rl-eyebrow">التكاملات</span>
              <h2>النظام يتحدث مع منصاتك… فلا تُدخل بياناً مرتين</h2>
              <p>تكاملات عميقة مع المنصات الحكومية السعودية وأدوات العمل اليومية.</p>
            </Reveal>

            <motion.div
              className="rl-integrations__grid"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
            >
              {INTEGRATIONS.map((item) => (
                <motion.div className="rl-integration" key={item.name} variants={fadeUp}>
                  <div className="rl-integration__head">
                    <span className="rl-integration__icon">
                      <item.icon size={21} />
                    </span>
                    <h3>{item.name}</h3>
                  </div>
                  <p>{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ===== الخصوصية ===== */}
        <section className="rl-privacy rl-pattern rl-grain" id="privacy">
          <div className="rl-container">
            <Reveal className="rl-section-head rl-section-head--onink">
              <span className="rl-eyebrow">عهدُ الخصوصية</span>
              <h2>سيادةٌ كاملة على مستنداتك</h2>
              <p>
                أسرار موكِّليك مسؤوليتك وحدك — لذا صُمِّم النظام بحيث لا يملك حق الوصول لمحتوى
                ملفاتك أصلاً.
              </p>
            </Reveal>

            <Reveal className="rl-privacy__diagram">
              <div className="rl-pnode">
                <span className="rl-pnode__box rl-pnode__box--blocked">
                  <EyeOff size={30} />
                </span>
                <span className="rl-pnode__label">خوادم النظام</span>
                <span className="rl-pnode__sub">محجوبة عن محتوى الملفات</span>
              </div>

              <div className="rl-privacy__barrier">لا تمرّ الملفات من هنا</div>

              <div className="rl-privacy__row">
                <div className="rl-pnode">
                  <span className="rl-pnode__box">
                    <LayoutDashboard size={30} />
                  </span>
                  <span className="rl-pnode__label">واجهة المستخدم</span>
                  <span className="rl-pnode__sub">متصفح مكتبك</span>
                </div>

                <div className="rl-privacy__flow" aria-hidden>
                  <svg viewBox="0 0 200 36" preserveAspectRatio="none">
                    <path d="M0 18 L200 18" />
                  </svg>
                  <span>اتصال مباشر ومؤمَّن</span>
                </div>

                <div className="rl-pnode">
                  <span className="rl-pnode__box">
                    <Cloud size={30} />
                  </span>
                  <span className="rl-pnode__label">OneDrive مكتبك</span>
                  <span className="rl-pnode__sub">سحابتك الخاصة</span>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <p className="rl-privacy__note">
                تنتقل المستندات بين متصفحك وسحابة مكتبك <b>دون المرور بخوادم الاستضافة</b> —
                ويُضاف فوقها عزلٌ تام لبيانات كل مكتب، ومصادقة ثنائية، وصلاحيات تُضبط لكل موظف،
                وسجل تدقيق يحفظ كل حركة.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ===== المقارنة ===== */}
        <section className="rl-compare rl-grain">
          <div className="rl-container">
            <Reveal className="rl-section-head">
              <span className="rl-eyebrow">قبل وبعد</span>
              <h2>يومُ المكتب… قبل الرائد وبعده</h2>
            </Reveal>

            <div className="rl-compare__grid">
              <Reveal className="rl-compare__col rl-compare__col--old">
                <h3 className="rl-compare__title">
                  <XCircle size={21} />
                  بالطريقة التقليدية
                </h3>
                {COMPARE_OLD.map((item) => (
                  <div className="rl-compare__item" key={item}>
                    <XCircle size={17} />
                    {item}
                  </div>
                ))}
              </Reveal>

              <Reveal className="rl-compare__col rl-compare__col--new" delay={0.12}>
                <h3 className="rl-compare__title">
                  <CheckCircle2 size={21} />
                  مع الرائد
                </h3>
                {COMPARE_NEW.map((item) => (
                  <div className="rl-compare__item" key={item}>
                    <CheckCircle2 size={17} />
                    {item}
                  </div>
                ))}
              </Reveal>
            </div>
          </div>
        </section>

        {/* ===== الأسئلة الشائعة ===== */}
        <section className="rl-faq rl-grain" id="faq">
          <div className="rl-container">
            <Reveal className="rl-section-head">
              <span className="rl-eyebrow">الأسئلة الشائعة</span>
              <h2>سألنا عنها أصحابُ المكاتب قبلك</h2>
            </Reveal>

            <Reveal className="rl-faq__list">
              {FAQS.map((faq, i) => (
                <div className={`rl-faq__item ${openFaq === i ? 'rl-faq__item--open' : ''}`} key={faq.q}>
                  <button
                    className="rl-faq__q"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    {faq.q}
                    <ChevronDown size={20} className="rl-faq__chev" />
                  </button>
                  <div className="rl-faq__body">
                    <div className="rl-faq__body-inner">
                      <p>{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ===== النداء الأخير ===== */}
        <section className="rl-cta">
          <div className="rl-container">
            <Reveal className="rl-cta__card">
              <h2>
                مكانةُ مكتبك تستحق <em>ديواناً يليق بها</em>
              </h2>
              <p>
                ابدأ تجربتك المجانية اليوم — استورد قضاياك من ناجز، وادعُ فريقك، وانطلق خلال أيام
                مع تدريبٍ ودعمٍ مستمر.
              </p>
              <div className="rl-cta__actions">
                <Link to={primaryCTA.href} className="rl-btn rl-btn--ink">
                  <primaryCTA.icon size={19} />
                  {primaryCTA.label}
                </Link>
                {!user && (
                  <Link to="/login" className="rl-btn rl-btn--ghost-dark">
                    تسجيل الدخول
                  </Link>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ===== التذييل ===== */}
      <footer className="rl-footer">
        <div className="rl-container">
          <div className="rl-footer__grid">
            <div className="rl-footer__about">
              <a href="#top" className="rl-brand">
                <span className="rl-brand__mark">
                  <Layers size={23} strokeWidth={2.2} />
                </span>
                <span>
                  <span className="rl-brand__name">نظام الرائد</span>
                  <span className="rl-brand__tag">نظام إدارة مكاتب المحاماة</span>
                </span>
              </a>
              <p>
                منصة سعودية متكاملة لإدارة مكاتب وشركات المحاماة — قضايا وجلسات ومذكرات وعقود
                وفوترة وبوابة عملاء، بذكاءٍ اصطناعي يفهم القانون السعودي.
              </p>
            </div>

            <div className="rl-footer__col">
              <h4>الصفحة</h4>
              <a href="#system">المنظومة</a>
              <a href="#ai">الذكاء الاصطناعي</a>
              <a href="#integrations">التكاملات</a>
              <a href="#privacy">الخصوصية</a>
              <a href="#faq">الأسئلة الشائعة</a>
            </div>

            <div className="rl-footer__col">
              <h4>الحساب</h4>
              <Link to="/login">تسجيل الدخول</Link>
              <Link to="/register">إنشاء حساب مكتب جديد</Link>
            </div>
          </div>

          <div className="rl-footer__bar">
            <span>© {new Date().getFullYear()} الرائد لإدارة المحاماة — جميع الحقوق محفوظة</span>
            <span>مؤسسة رائد الحلول الرقمية — سجل تجاري: 7052657371</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
