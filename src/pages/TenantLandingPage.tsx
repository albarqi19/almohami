import React, { Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn, Scale, Shield, ArrowLeft } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { hasCustomLanding, getCustomLanding } from './custom-landings';
import useSEO from '../hooks/useSEO';

/**
 * صفحة هبوط الـ Subdomain الافتراضية
 * تستخدم Inline Styles للتوافق الكامل مع جميع الـ subdomains
 */

const getStyles = (isMobile: boolean, primaryColor: string, secondaryColor: string): Record<string, React.CSSProperties> => ({
  // Page Container
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"IBM Plex Sans Arabic", -apple-system, BlinkMacSystemFont, sans-serif',
    direction: 'rtl',
    background: `linear-gradient(135deg, ${secondaryColor} 0%, ${adjustColor(secondaryColor, 20)} 100%)`,
  },

  // Loading Container
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1a1a1a',
  },

  loadingContent: {
    textAlign: 'center',
  },

  loadingSpinner: {
    width: '64px',
    height: '64px',
    border: `4px solid ${primaryColor}`,
    borderTopColor: 'transparent',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 1s linear infinite',
  },

  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '16px',
  },

  // Error Container
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111827',
  },

  errorContent: {
    textAlign: 'center',
    padding: '32px',
  },

  errorIcon: {
    width: '80px',
    height: '80px',
    margin: '0 auto 24px',
    color: '#4B5563',
  },

  errorTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'white',
    marginBottom: '16px',
  },

  errorText: {
    color: '#9CA3AF',
    marginBottom: '32px',
    lineHeight: 1.8,
  },

  errorButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: '#D97706',
    color: 'white',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
    transition: 'background 0.3s',
    border: 'none',
    cursor: 'pointer',
  },

  // Main Content
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isMobile ? '24px 16px' : '24px',
  },

  contentWrapper: {
    textAlign: 'center',
    maxWidth: '512px',
    width: '100%',
  },

  // Logo Section
  logoWrapper: {
    marginBottom: '32px',
  },

  logoImage: {
    width: '128px',
    height: '128px',
    margin: '0 auto',
    objectFit: 'contain',
    borderRadius: '16px',
    boxShadow: `0 20px 60px -15px ${primaryColor}40`,
    background: 'white',
    padding: '16px',
  },

  logoFallback: {
    width: '128px',
    height: '128px',
    margin: '0 auto',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -20)})`,
    boxShadow: `0 20px 60px -15px ${primaryColor}60`,
  },

  logoIcon: {
    width: '64px',
    height: '64px',
    color: 'white',
  },

  // Company Name
  companyName: {
    fontSize: isMobile ? '32px' : '48px',
    fontWeight: 700,
    color: 'white',
    marginBottom: '16px',
    lineHeight: 1.2,
  },

  // Tagline
  tagline: {
    fontSize: isMobile ? '18px' : '20px',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '32px',
    lineHeight: 1.6,
  },

  // Login Button
  loginButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: 600,
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    background: primaryColor,
    color: getContrastColor(primaryColor),
    boxShadow: `0 10px 40px -10px ${primaryColor}80`,
  },

  loginIcon: {
    width: '24px',
    height: '24px',
  },

  // Security Badge
  securityBadge: {
    marginTop: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '14px',
  },

  securityIcon: {
    width: '16px',
    height: '16px',
  },

  // Footer
  footer: {
    padding: '24px',
    textAlign: 'center',
  },

  footerText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '14px',
  },

  footerLink: {
    color: primaryColor,
    textDecoration: 'none',
    transition: 'color 0.3s',
  },
});

// CSS Keyframes for spinner (injected once)
const injectSpinnerStyles = () => {
  if (typeof document !== 'undefined' && !document.getElementById('tenant-landing-styles')) {
    const style = document.createElement('style');
    style.id = 'tenant-landing-styles';
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
};

/**
 * Adjust color brightness
 */
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Get contrast color (black or white) based on background
 */
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}

const TenantLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, isLoading, error, subdomain } = useTenant();

  // Responsive State
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    injectSpinnerStyles();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check for custom landing page
  const CustomLanding = getCustomLanding(subdomain);

  // Dynamic SEO based on tenant (must be called before any early returns)
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const tenantLogo = tenant?.logo_url || tenant?.logo;
  useSEO({
    title: tenant?.name ? `${tenant.name} | مكتب محاماة` : undefined,
    description: tenant?.tagline || (tenant?.name ? `${tenant.name} - مكتب محاماة متخصص` : undefined),
    image: tenantLogo || undefined,
    url: currentUrl,
    siteName: tenant?.name || undefined,
    author: tenant?.name || undefined,
  });

  const primaryColor = tenant?.primary_color || '#C5A059';
  const secondaryColor = tenant?.secondary_color || '#1a1a1a';
  const styles = getStyles(isMobile, primaryColor, secondaryColor);

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={styles.loadingContent}
        >
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>جاري التحميل...</p>
        </motion.div>
      </div>
    );
  }

  // Error state - company not found
  if (error || !tenant) {
    return (
      <div style={styles.errorContainer}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.errorContent}
        >
          <Scale style={styles.errorIcon} />
          <h1 style={styles.errorTitle}>الشركة غير موجودة</h1>
          <p style={styles.errorText}>
            عذراً، لم نتمكن من العثور على هذه الشركة.
            <br />
            تأكد من صحة الرابط أو تواصل مع مزود الخدمة.
          </p>
          <a
            href="https://alraedlaw.com"
            style={styles.errorButton}
          >
            <ArrowLeft style={{ width: '20px', height: '20px' }} />
            العودة للموقع الرئيسي
          </a>
        </motion.div>
      </div>
    );
  }

  // If there's a custom landing page for this tenant, render it
  if (CustomLanding) {
    return (
      <Suspense fallback={
        <div style={styles.loadingContainer}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.loadingContent}>
            <div style={styles.loadingSpinner} />
            <p style={styles.loadingText}>جاري التحميل...</p>
          </motion.div>
        </div>
      }>
        <CustomLanding />
      </Suspense>
    );
  }

  const logoUrl = tenant.logo_url || tenant.logo;

  return (
    <div style={styles.page}>
      {/* Main Content */}
      <main style={styles.main}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={styles.contentWrapper}
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={styles.logoWrapper}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={tenant.name}
                style={styles.logoImage}
              />
            ) : (
              <div style={styles.logoFallback}>
                <Scale style={styles.logoIcon} />
              </div>
            )}
          </motion.div>

          {/* Company Name */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={styles.companyName}
          >
            {tenant.name}
          </motion.h1>

          {/* Tagline */}
          {tenant.tagline && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={styles.tagline}
            >
              {tenant.tagline}
            </motion.p>
          )}

          {/* Login Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            style={styles.loginButton}
          >
            <LogIn style={styles.loginIcon} />
            تسجيل الدخول
          </motion.button>

          {/* Security Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            style={styles.securityBadge}
          >
            <Shield style={styles.securityIcon} />
            <span>نظام آمن ومحمي</span>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          style={styles.footerText}
        >
          مدعوم بواسطة{' '}
          <a
            href="https://alraedlaw.com"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
          >
            نظام الرائد
          </a>
        </motion.p>
      </footer>
    </div>
  );
};

export default TenantLandingPage;
