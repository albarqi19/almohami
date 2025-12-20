import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Scale,
  Users,
  Briefcase,
  ArrowLeft,
  Clock,
  LayoutDashboard,
  Sparkles,
  LineChart,
  FileText,
  MessageSquare,
  NotebookPen,
  Globe2,
  Gavel
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/landing.css';

const suites = [
  {
    title: 'إدارة القضايا',
    description: 'ملفات رقمية كاملة، متابعة المستندات، وجدولة الجلسات بخطوات بديهية.',
    icon: Briefcase,
  },
  {
    title: 'لوحة موحّدة للمهام',
    description: 'أتمتة توزيع المهام، التذكيرات الذكية، وتتبع الإنجاز لحظة بلحظة.',
    icon: Clock,
  },
  {
    title: 'بوابة العملاء',
    description: 'منح موكليك وصولاً آمناً لمتابعة تقدم قضاياهم ومشاركة الوثائق.',
    icon: Users,
  },
  {
    title: 'تحليلات متقدمة',
    description: 'رؤية شاملة للأداء المالي والتشغيلي لاتخاذ قرارات واثقة.',
    icon: LineChart,
  }
];

const workflow = [
  {
    title: 'جمع البيانات والوثائق',
    detail: 'نماذج ذكية لاستقبال بيانات الموكل والمستندات بشكلٍ منظم.',
    icon: FileText,
  },
  {
    title: 'تحويلها لمسار عمل واضح',
    detail: 'إنشاء ملف قضية آلياً مع المهام، المسؤوليات، والمواعيد.',
    icon: NotebookPen,
  },
  {
    title: 'متابعة التنفيذ والتواصل',
    detail: 'تنبيهات فورية عند أي تحديث، ومركز رسائل يربط الفريق بالموكل.',
    icon: MessageSquare,
  },
  {
    title: 'تقارير تغلق دورة القضية',
    detail: 'لوحات تحكم بصرية تلخص الإنجاز والعوائد وتصدر تلقائياً للمكتب.',
    icon: Globe2,
  }
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [currentWord, setCurrentWord] = React.useState(0);

  const words = ['قضاياك', 'مهامك', 'فريقك', 'جلساتك', 'مواعيدك', 'عملائك', 'مستنداتك'];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [words.length]);

  const primaryCTA = user
    ? { label: 'الذهاب للوحة التحكم', href: '/dashboard', icon: LayoutDashboard }
    : { label: 'ابدأ تجربتك الآن', href: '/login', icon: ArrowLeft };

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="landing__header-inner">
          <div className="landing__brand">
            <span className="landing__brand-icon">
              <Scale size={22} />
            </span>
            <div>
              <p className="landing__brand-meta">نظام إدارة المحاماة</p>
              <p className="landing__brand-title">كل ما يحتاجه مكتبك القانوني</p>
            </div>
          </div>
        </div>
      </header>

      <main className="landing__main">
        <section className="landing-hero">
          <div className="landing-hero__bg" aria-hidden />
          
          {/* Animated Background Elements */}
          <div className="landing-hero__animated-bg">
            <div className="shooting-star"></div>
            <div className="shooting-star"></div>
            <div className="shooting-star"></div>
            <div className="shooting-star"></div>
            
            <div className="floating-icon floating-icon--1">
              <Scale size={120} strokeWidth={1} />
            </div>
            <div className="floating-icon floating-icon--2">
              <Gavel size={100} strokeWidth={1} />
            </div>
            <div className="floating-icon floating-icon--3">
              <FileText size={80} strokeWidth={1} />
            </div>
          </div>

          <div className="landing-hero__grid">
            <motion.div className="landing-hero__intro" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span className="landing-hero__tag">
                <Sparkles size={16} /> تجربة قانونية بلا توتر
              </span>
              <h1 className="landing-hero__title">
                إدارة{' '}
                <br className="landing-hero__title-break-mobile" />
                <span className="landing-hero__title-rotating">
                  <span className="landing-hero__title-word">
                    {words[currentWord]}
                  </span>
                </span>
                <br />
                من لوحة واحدة متطورة
              </h1>
              <p className="landing-hero__subtitle">
                حل سحابي شامل يُمكِّن مكاتب المحاماة من رقمنة كل التفاصيل: من استقبال العميل وحتى إغلاق القضية مع تقارير دقيقة في كل خطوة.
              </p>

              <div className="landing-hero__actions">
                <Link to={primaryCTA.href} className="landing-hero__primary button button--primary">
                  <primaryCTA.icon size={20} />
                  {primaryCTA.label}
                </Link>
              </div>
            </motion.div>
          </div>

          <motion.div 
            className="landing-scroll-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            onClick={() => {
              window.scrollTo({
                top: window.innerHeight,
                behavior: 'smooth'
              });
            }}
          >
            <div className="landing-scroll-mouse">
              <div className="landing-scroll-wheel" />
            </div>
            <span>اكتشف المزيد</span>
          </motion.div>
        </section>

        <section className="landing-section landing-section--light">
          <div className="landing-section__header" {...fadeUp}>
            <p className="landing-eyebrow">أدوات احترافية متكاملة</p>
            <h2>باقة واحدة تغطي كل أقسام المكتب</h2>
            <p>قم بإدارة الملفات، الفريق، والتواصل مع العملاء دون الحاجة لبرامج إضافية.</p>
          </div>
          <div className="landing-suite__grid">
            {suites.map((suite, index) => (
              <motion.div
                key={suite.title}
                className="landing-suite"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <span className="landing-suite__icon">
                  <suite.icon size={22} />
                </span>
                <h3>{suite.title}</h3>
                <p>{suite.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section--muted">
          <div className="landing-section__header" {...fadeUp}>
            <p className="landing-eyebrow">رحلة رقمية متصلة</p>
            <h2>من أول اتصال حتى إغلاق القضية</h2>
            <p>كل مرحلة موثقة، موجهة، وخاضعة للتذكير الآلي.</p>
          </div>
          <div className="landing-workflow">
            {workflow.map((step, index) => (
              <motion.div
                key={step.title}
                className="landing-workflow__card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="landing-workflow__icon">
                  <step.icon size={22} />
                </div>
                <p className="landing-workflow__step">الخطوة {index + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div className="landing-hero__animated-bg">
            <div className="shooting-star"></div>
            <div className="shooting-star"></div>
            <div className="shooting-star"></div>
            
            <div className="floating-icon floating-icon--1">
              <Scale size={100} strokeWidth={1} />
            </div>
            <div className="floating-icon floating-icon--2">
              <Gavel size={80} strokeWidth={1} />
            </div>
          </div>

          <div className="landing-cta__card">
            <motion.h2 {...fadeUp}>امنح مكتبك القانوني تجربة مختلفة.</motion.h2>
            <p>نساعدك على الإطلاق خلال أيام مع دعم تدريبي مستمر.</p>
            <div className="landing-cta__actions">
              <Link to={primaryCTA.href} className="landing-cta__primary button button--primary">
                {primaryCTA.label}
              </Link>
              {!user && (
                <Link to="/login" className="landing-cta__secondary">
                  مشاهدة النسخة التفاعلية
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <div className="landing__brand landing__brand--footer">
            <Scale size={18} className="landing__brand-icon--inline" />
            <span>نظام إدارة المحاماة</span>
          </div>
          <p>© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
