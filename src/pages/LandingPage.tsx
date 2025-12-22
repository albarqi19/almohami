import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
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
  Gavel,
  Shield,
  X,
  Eye,
  EyeOff,
  ChevronsDown
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
  const navigate = useNavigate();
  const [currentWord, setCurrentWord] = React.useState(0);
  const [showPrivacy, setShowPrivacy] = React.useState(false);
  const [privacyScene, setPrivacyScene] = React.useState(0);
  const [isManualMode, setIsManualMode] = React.useState(false);
  const privacyContainerRef = React.useRef<HTMLDivElement>(null);

  const words = ['قضاياك', 'مهامك', 'فريقك', 'جلساتك', 'مواعيدك', 'عملائك', 'مستنداتك'];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [words.length]);

  React.useEffect(() => {
    if (showPrivacy && !isManualMode) {
      setPrivacyScene(0);
      const timer1 = setTimeout(() => setPrivacyScene(1), 3500);
      const timer2 = setTimeout(() => setPrivacyScene(2), 7000);
      const timer3 = setTimeout(() => setPrivacyScene(3), 11000);
      
      // Canvas grid effect
      const canvas = document.getElementById('privacyCanvas') as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            drawGrid();
          };
          
          const drawGrid = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = 'rgba(197, 160, 89, 0.03)';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < canvas.width; i += 60) {
              ctx.beginPath();
              ctx.moveTo(i, 0);
              ctx.lineTo(i, canvas.height);
              ctx.stroke();
            }
            
            for (let i = 0; i < canvas.height; i += 60) {
              ctx.beginPath();
              ctx.moveTo(0, i);
              ctx.lineTo(canvas.width, i);
              ctx.stroke();
            }
          };
          
          window.addEventListener('resize', resize);
          resize();
          
          return () => {
            window.removeEventListener('resize', resize);
          };
        }
      }
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [showPrivacy, isManualMode]);

  const handlePrivacyClick = () => {
    setShowPrivacy(true);
    setIsManualMode(false);
    document.body.style.overflow = 'hidden';
  };

  const closePrivacy = () => {
    setShowPrivacy(false);
    setIsManualMode(false);
    document.body.style.overflow = 'auto';
  };

  const navigateToLogin = () => {
    closePrivacy();
    navigate('/login');
  };

  const restartManualMode = () => {
    setIsManualMode(true);
    setPrivacyScene(0);
    if (privacyContainerRef.current) {
      privacyContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToNextScene = () => {
    if (privacyContainerRef.current) {
      const sceneHeight = privacyContainerRef.current.scrollHeight / 4;
      privacyContainerRef.current.scrollBy({ 
        top: sceneHeight, 
        behavior: 'smooth' 
      });
    }
  };

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
          <button 
            onClick={handlePrivacyClick}
            className="landing__privacy-btn"
          >
            <Shield size={18} />
            الخصوصية
          </button>
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

      {/* Privacy Overlay */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div 
            className="privacy-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button onClick={closePrivacy} className="privacy-close-btn" aria-label="إغلاق">
              <X size={24} />
            </button>

            <canvas id="privacyCanvas" className="privacy-canvas"></canvas>

            <div 
              className={`privacy-container ${isManualMode ? 'privacy-container--manual' : ''}`}
              ref={privacyContainerRef}
            >
              {/* Scene 1: العنوان الرسمي */}
              <motion.div
                className={`privacy-scene ${!isManualMode && privacyScene === 0 ? 'active' : ''} ${isManualMode ? 'privacy-scene--manual' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: !isManualMode && privacyScene === 0 ? 1 : isManualMode ? 1 : 0,
                  y: !isManualMode && privacyScene === 0 ? 0 : isManualMode ? 0 : 20 
                }}
              >
                <h1 className="privacy-title">
                  نظام <span className="privacy-highlight">الرائد</span> لإدارة المحاماة
                </h1>
                <p className="privacy-subtitle">
                  الحل التقني الأمثل لربط أعمالك القانونية ببيئة سحابية تملكها وتتحكم بها بالكامل.
                </p>
              </motion.div>

              {/* Scene 2: السيادة على البيانات */}
              <motion.div
                className={`privacy-scene ${!isManualMode && privacyScene === 1 ? 'active' : ''} ${isManualMode ? 'privacy-scene--manual' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: !isManualMode && privacyScene === 1 ? 1 : isManualMode ? 1 : 0,
                  y: !isManualMode && privacyScene === 1 ? 0 : isManualMode ? 0 : 20 
                }}
              >
                <h2 className="privacy-heading">سيادة كاملة على مستنداتك</h2>
                <p className="privacy-text">
                  نحن نؤمن بأن أسرار موكليك هي مسؤوليتك وحدك. <br />
                  لذا، نظامنا لا يملك حق الوصول لمحتوى ملفاتك، بل يكتفي بتنظيمها داخل حسابك الخاص.
                </p>
              </motion.div>

              {/* Scene 3: التوضيح التقني */}
              <motion.div
                className={`privacy-scene ${!isManualMode && privacyScene === 2 ? 'active' : ''} ${isManualMode ? 'privacy-scene--manual' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: !isManualMode && privacyScene === 2 ? 1 : isManualMode ? 1 : 0,
                  y: !isManualMode && privacyScene === 2 ? 0 : isManualMode ? 0 : 20 
                }}
              >
                <div className="privacy-architecture">
                  {/* الخادم في الأعلى */}
                  <div className="privacy-server">
                    <div className="privacy-node privacy-node--blocked">
                      <FileText size={32} />
                      <div className="privacy-node-overlay">
                        <EyeOff size={28} />
                      </div>
                    </div>
                    <span className="privacy-label">خوادم النظام (محجوبة)</span>
                  </div>

                  {/* القاعدة: الواجهة والون درايف */}
                  <div className="privacy-base">
                    <div className="privacy-client">
                      <div className="privacy-node">
                        <LayoutDashboard size={32} />
                      </div>
                      <span className="privacy-label">واجهة المستخدم</span>
                    </div>

                    <div className="privacy-connection">
                      <svg className="privacy-flow-line" viewBox="0 0 200 40">
                        <path d="M0 20 L200 20" className="data-flow" />
                      </svg>
                      <span className="privacy-flow-label">اتصال مباشر ومؤمن</span>
                    </div>

                    <div className="privacy-storage">
                      <div className="privacy-node privacy-node--storage">
                        <Globe2 size={32} />
                      </div>
                      <span className="privacy-label">OneDrive الخاص بك</span>
                    </div>
                  </div>
                </div>
                <p className="privacy-tech-note">
                  البيانات تنتقل بين الواجهة ومساحتك الخاصة دون المرور بخوادم الاستضافة.
                </p>
              </motion.div>

              {/* Scene 4: النهاية */}
              <motion.div
                className={`privacy-scene ${!isManualMode && privacyScene === 3 ? 'active' : ''} ${isManualMode ? 'privacy-scene--manual' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: !isManualMode && privacyScene === 3 ? 1 : isManualMode ? 1 : 0,
                  y: !isManualMode && privacyScene === 3 ? 0 : isManualMode ? 0 : 20 
                }}
              >
                <h3 className="privacy-final-title">إدارة قانونية ذكية بخصوصية تامة</h3>
                <div className="privacy-actions">
                  <button onClick={navigateToLogin} className="privacy-btn privacy-btn--primary">
                    الانتقال إلى تسجيل الدخول
                  </button>
                  <button onClick={restartManualMode} className="privacy-btn privacy-btn--secondary">
                    <ChevronsDown size={18} />
                    إعادة العرض بالتمرير
                  </button>
                </div>
              </motion.div>

              {/* Scroll Indicator for Manual Mode */}
              {isManualMode && (
                <motion.div 
                  className="privacy-scroll-indicator"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  onClick={scrollToNextScene}
                >
                  <div className="privacy-scroll-icon">
                    <ChevronsDown size={24} />
                  </div>
                  <span>مرر للمتابعة</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
