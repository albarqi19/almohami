import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Scale, Shield, Building2, Gavel, Award, Phone } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

/**
 * صفحة هبوط مخصصة لشركة بيوت الخبرة للمحاماة
 * Alkhibra Custom Landing Page
 * Using PURE INLINE STYLES - No Tailwind dependency
 */

const styles: Record<string, React.CSSProperties> = {
  // Page Container
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F7 100%)',
    fontFamily: '"IBM Plex Sans Arabic", -apple-system, BlinkMacSystemFont, sans-serif',
    color: '#1B2B48',
    direction: 'rtl',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },

  // Navbar
  navbar: {
    width: '100%',
    padding: '20px 40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },

  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  logoIcon: {
    background: '#1B2B48',
    color: '#C5A059',
    padding: '10px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoText: {
    display: 'flex',
    flexDirection: 'column' as const,
  },

  logoTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1B2B48',
    lineHeight: 1.2,
  },

  logoSubtitle: {
    fontSize: '10px',
    color: '#C5A059',
    letterSpacing: '3px',
    textTransform: 'uppercase' as const,
    fontFamily: 'serif',
  },

  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '30px',
  },

  navLink: {
    fontSize: '14px',
    color: 'rgba(27, 43, 72, 0.7)',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'color 0.3s',
  },

  navButton: {
    background: '#1B2B48',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(27, 43, 72, 0.2)',
  },

  // Hero Section
  hero: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '60px',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '60px 40px',
    alignItems: 'center',
    width: '100%',
  },

  heroContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(27, 43, 72, 0.05)',
    border: '1px solid rgba(27, 43, 72, 0.1)',
    padding: '8px 16px',
    borderRadius: '50px',
    width: 'fit-content',
    fontSize: '12px',
    fontWeight: 600,
  },

  mainTitle: {
    fontSize: '56px',
    fontWeight: 800,
    color: '#1B2B48',
    lineHeight: 1.1,
    margin: 0,
  },

  subtitleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  goldLine: {
    width: '50px',
    height: '3px',
    background: '#C5A059',
    borderRadius: '2px',
  },

  subtitle: {
    fontSize: '24px',
    color: '#C5A059',
    letterSpacing: '4px',
    textTransform: 'uppercase' as const,
    fontFamily: '"Cinzel", serif',
    fontWeight: 600,
    margin: 0,
  },

  description: {
    fontSize: '17px',
    color: '#64748B',
    lineHeight: 1.8,
    maxWidth: '500px',
  },

  buttonsContainer: {
    display: 'flex',
    gap: '16px',
    marginTop: '16px',
  },

  primaryButton: {
    background: '#1B2B48',
    color: 'white',
    padding: '16px 32px',
    borderRadius: '10px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 10px 30px rgba(27, 43, 72, 0.25)',
    transition: 'all 0.3s ease',
  },

  secondaryButton: {
    background: 'white',
    color: '#1B2B48',
    padding: '16px 32px',
    borderRadius: '10px',
    border: '1px solid rgba(27, 43, 72, 0.15)',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.3s ease',
  },

  stats: {
    display: 'flex',
    gap: '40px',
    marginTop: '40px',
    paddingTop: '30px',
    borderTop: '1px solid rgba(0,0,0,0.08)',
  },

  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
  },

  statNumber: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#1B2B48',
  },

  statLabel: {
    fontSize: '11px',
    color: '#94A3B8',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    marginTop: '4px',
  },

  // Visual Card
  heroVisual: {
    position: 'relative' as const,
    height: '550px',
  },

  visualCard: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(145deg, #1B2B48 0%, #0F1928 100%)',
    borderRadius: '24px',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    position: 'relative' as const,
    overflow: 'hidden',
    boxShadow: '0 30px 60px rgba(27, 43, 72, 0.3)',
  },

  cardGlow: {
    position: 'absolute' as const,
    top: '-100px',
    right: '-100px',
    width: '300px',
    height: '300px',
    background: 'rgba(197, 160, 89, 0.15)',
    borderRadius: '50%',
    filter: 'blur(80px)',
    pointerEvents: 'none' as const,
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    position: 'relative' as const,
    zIndex: 1,
  },

  iconBox: {
    background: 'rgba(255, 255, 255, 0.08)',
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },

  cardValues: {
    position: 'relative' as const,
    zIndex: 1,
  },

  valuesLabel: {
    fontSize: '11px',
    color: '#C5A059',
    letterSpacing: '4px',
    textTransform: 'uppercase' as const,
    marginBottom: '16px',
    display: 'block',
  },

  valuesText: {
    fontSize: '32px',
    color: 'white',
    lineHeight: 1.4,
    fontWeight: 300,
  },

  valuesBold: {
    fontWeight: 700,
    color: '#C5A059',
  },

  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    position: 'relative' as const,
    zIndex: 1,
  },

  featureCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'all 0.3s ease',
  },

  featureTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'white',
    marginTop: '10px',
    display: 'block',
  },

  featureEn: {
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    fontFamily: 'serif',
    display: 'block',
    marginTop: '4px',
  },

  // Floating Badge
  floatingBadge: {
    position: 'absolute' as const,
    top: '30px',
    left: '-20px',
    background: 'white',
    padding: '16px 20px',
    borderRadius: '14px',
    boxShadow: '0 15px 40px rgba(0,0,0,0.12)',
    zIndex: 10,
  },

  badgeStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  statusDot: {
    width: '10px',
    height: '10px',
    background: '#22C55E',
    borderRadius: '50%',
    boxShadow: '0 0 10px rgba(34, 197, 94, 0.5)',
  },

  badgeText: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1B2B48',
  },

  badgeSubtext: {
    fontSize: '10px',
    color: '#94A3B8',
    marginTop: '4px',
  },

  // Footer
  footer: {
    height: '6px',
    background: 'linear-gradient(90deg, #1B2B48 0%, #C5A059 50%, #1B2B48 100%)',
  },
};

const AlkhibraLanding: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const companyInfo = {
    nameAr: tenant?.name || 'بيوت الخبرة',
    nameEn: 'HOUSE OF EXPERTISE',
    logo: tenant?.logo_url || tenant?.logo,
  };

  const features = [
    { icon: Shield, title: 'الحماية', en: 'Protection' },
    { icon: Gavel, title: 'التقاضي', en: 'Litigation' },
    { icon: Building2, title: 'الشركات', en: 'Corporate' },
    { icon: Scale, title: 'الاستشارات', en: 'Advisory' },
  ];

  return (
    <div style={styles.page}>
      {/* Navbar */}
      <nav style={styles.navbar}>
        <div style={styles.logoContainer}>
          {companyInfo.logo ? (
            <img src={companyInfo.logo} alt="Logo" style={{ height: '50px', objectFit: 'contain' }} />
          ) : (
            <>
              <div style={styles.logoIcon}>
                <Scale size={24} />
              </div>
              <div style={styles.logoText}>
                <span style={styles.logoTitle}>{companyInfo.nameAr}</span>
                <span style={styles.logoSubtitle}>Law Firm</span>
              </div>
            </>
          )}
        </div>

        <div style={styles.navLinks}>
          <span style={styles.navLink}>الرئيسية</span>
          <span style={styles.navLink}>مجالات الممارسة</span>
          <span style={styles.navLink}>فريق العمل</span>
          <button style={styles.navButton} onClick={() => navigate('/login')}>
            بوابة العملاء
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={styles.hero}>
        {/* Text Content */}
        <motion.div
          style={styles.heroContent}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div style={styles.badge}>
            <Award size={14} style={{ color: '#C5A059' }} />
            <span>التميز القانوني منذ 2004</span>
          </div>

          <h1 style={styles.mainTitle}>{companyInfo.nameAr}</h1>

          <div style={styles.subtitleContainer}>
            <div style={styles.goldLine}></div>
            <h2 style={styles.subtitle}>{companyInfo.nameEn}</h2>
          </div>

          <p style={styles.description}>
            نقدم منظومة متكاملة من الخدمات القانونية والاستشارية للشركات والأفراد، يدعمها فريق من النخبة القانونية لضمان حماية مصالحك بدقة واحترافية عالية.
          </p>

          <div style={styles.buttonsContainer}>
            <motion.button
              style={styles.primaryButton}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login')}
            >
              <span>الدخول للمنصة</span>
              <ChevronLeft size={20} />
            </motion.button>

            <motion.button
              style={styles.secondaryButton}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Phone size={18} style={{ color: '#C5A059' }} />
              <span>تواصل معنا</span>
            </motion.button>
          </div>

          <div style={styles.stats}>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>20+</span>
              <span style={styles.statLabel}>Seniors</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>500+</span>
              <span style={styles.statLabel}>Cases Won</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNumber}>98%</span>
              <span style={styles.statLabel}>Success Rate</span>
            </div>
          </div>
        </motion.div>

        {/* Visual Card */}
        <motion.div
          style={styles.heroVisual}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <div style={styles.visualCard}>
            <div style={styles.cardGlow}></div>

            <div style={styles.cardHeader}>
              <div style={styles.iconBox}>
                <Scale size={28} color="#C5A059" strokeWidth={1.5} />
              </div>
            </div>

            <div style={styles.cardValues}>
              <span style={styles.valuesLabel}>Core Values</span>
              <div style={styles.valuesText}>
                الالتزام.<br />
                <span style={styles.valuesBold}>الشفافية.</span><br />
                التفوق.
              </div>
            </div>

            <div style={styles.featuresGrid}>
              {features.map((item, idx) => (
                <div key={idx} style={styles.featureCard}>
                  <item.icon size={18} color="#C5A059" />
                  <span style={styles.featureTitle}>{item.title}</span>
                  <span style={styles.featureEn}>{item.en}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Floating Badge */}
          <motion.div
            style={styles.floatingBadge}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div style={styles.badgeStatus}>
              <div style={styles.statusDot}></div>
              <span style={styles.badgeText}>متاح الآن</span>
            </div>
            <div style={styles.badgeSubtext}>Available for Consultation</div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer Gold Line */}
      <div style={styles.footer}></div>
    </div>
  );
};

export default AlkhibraLanding;
