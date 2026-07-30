import React, { Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn, Scale, ArrowLeft } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { getCustomLanding } from './custom-landings';
import useSEO from '../hooks/useSEO';

/**
 * صفحة هبوط الـ Subdomain الافتراضية - ERP Style
 * تصميم رسمي محايد بدون تخصيص ألوان
 */

const PALETTE = {
  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  accent: '#0f172a',
  accentHover: '#1e293b',
} as const;

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const TenantLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, isLoading, error, errorKind, subdomain, refetchTenant } = useTenant();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const tenantLogo = tenant?.logo_url || tenant?.logo;
  useSEO({
    title: tenant?.name ? `${tenant.name} | مكتب محاماة` : undefined,
    description: tenant?.tagline || (tenant?.name ? `${tenant.name} - مكتب محاماة` : undefined),
    image: tenantLogo || undefined,
    url: currentUrl,
    siteName: tenant?.name || undefined,
    author: tenant?.name || undefined,
  });

  const CustomLanding = getCustomLanding(subdomain);

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>جاري التحميل...</p>
        <style>{spinnerKeyframes}</style>
      </div>
    );
  }

  // الشرط `!tenant` وحده: `error` وحده لا يكفي — فردٌّ فاشل متأخّر قد يضبط error
  // وبيانات الشركة محمّلة فعلاً، فتُحجب صفحة سليمة بشاشة خطأ.
  //
  // والرسائل تُفرَّق بحسب السبب: دمجُها في «الشركة غير موجودة» كان يدفع صاحب
  // المكتب إلى فكّ الـCNAME ظنّاً أن الربط فشل، والسبب انقطاعُ لحظة أو تعليقُ اشتراك.
  if (!tenant) {
    const isNetwork = errorKind === 'network';
    const isSuspended = errorKind === 'suspended';

    const title = isSuspended ? 'حساب المكتب معلّق'
      : isNetwork ? 'تعذّر الاتصال'
      : 'هذا النطاق غير مرتبط بمكتب';

    const body = isSuspended
      ? 'الاشتراك متوقّف حالياً. يرجى مراجعة مزوّد الخدمة لإعادة التنشيط.'
      : isNetwork
        ? 'لم نتمكّن من الوصول إلى الخدمة. تحقّق من اتصالك ثم أعد المحاولة.'
        : 'لم يُربط هذا النطاق بأي مكتب بعد. إن كنت صاحب المكتب فراجع إعدادات النطاق لدى مزوّد الخدمة.';

    return (
      <div style={styles.errorContainer}>
        <Scale style={styles.errorIcon} />
        <h1 style={styles.errorTitle}>{title}</h1>
        <p style={styles.errorText}>{body}</p>

        {/* إعادة المحاولة تُعرض لأخطاء النقل وحدها — على 404 و403 هي عبث */}
        {isNetwork ? (
          <button type="button" onClick={() => { void refetchTenant(); }} style={styles.errorButton}>
            إعادة المحاولة
          </button>
        ) : (
          <a href="https://alraedlaw.com" style={styles.errorButton}>
            <ArrowLeft size={18} />
            العودة للموقع الرئيسي
          </a>
        )}
      </div>
    );
  }

  if (CustomLanding) {
    return (
      <Suspense fallback={
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner} />
          <p style={styles.loadingText}>جاري التحميل...</p>
          <style>{spinnerKeyframes}</style>
        </div>
      }>
        <CustomLanding />
      </Suspense>
    );
  }

  const logoUrl = tenant.logo_url || tenant.logo;

  // لون التمييز: لون الشركة عند تفعيل التبييض، وإلا الكحلي المحايد.
  // كان primary_color يصل من الـAPI ولا يُقرأ في سطر واحد.
  const accent = tenant.custom_branding_enabled
    && tenant.primary_color
    && HEX_RE.test(tenant.primary_color)
      ? tenant.primary_color
      : PALETTE.accent;

  const cardStyle: React.CSSProperties = {
    ...styles.card,
    padding: isMobile ? '40px 24px' : '56px 48px',
    maxWidth: isMobile ? '100%' : '480px',
  };
  const companyNameStyle: React.CSSProperties = {
    ...styles.companyName,
    fontSize: isMobile ? '24px' : '28px',
  };

  return (
    <div style={styles.page}>
      <main style={styles.main}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={cardStyle}
        >
          <div style={styles.logoFrame}>
            {logoUrl ? (
              <img src={logoUrl} alt={tenant.name} style={styles.logoImage} />
            ) : (
              <div style={styles.logoFallback}>
                <Scale size={36} color={PALETTE.textSecondary} />
              </div>
            )}
          </div>

          <h1 style={companyNameStyle}>{tenant.name}</h1>

          {tenant.tagline && (
            <p style={styles.tagline}>{tenant.tagline}</p>
          )}

          <div style={styles.divider} />

          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{ ...styles.loginButton, background: accent }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
          >
            <LogIn size={18} />
            <span>تسجيل الدخول</span>
          </button>
        </motion.div>
      </main>

      {/* «مدعوم بواسطة الرائد» يُخفى عند تفعيل التبييض للشركة.
          هذا هو الغرض الذي أُنشئ له العمود custom_branding_enabled في يناير
          وبقي بلا مستهلك واحد — فكان التذييل يظهر على نطاق العميل الخاص بلا
          أي علم يُخفيه. */}
      {!tenant.custom_branding_enabled && (
        <footer style={styles.footer}>
          <span>
            مدعوم بواسطة{' '}
            <a href="https://alraedlaw.com" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>
              الرائد لإدارة المحاماة
            </a>
          </span>
        </footer>
      )}
      <style>{spinnerKeyframes}</style>
    </div>
  );
};

const spinnerKeyframes = `@keyframes spin { to { transform: rotate(360deg); } }`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: PALETTE.background,
    fontFamily: '"IBM Plex Sans Arabic", -apple-system, BlinkMacSystemFont, sans-serif',
    direction: 'rtl',
    color: PALETTE.textPrimary,
  },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  card: {
    width: '100%',
    background: PALETTE.surface,
    border: `1px solid ${PALETTE.border}`,
    borderRadius: '12px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  logoFrame: {
    width: '96px',
    height: '96px',
    borderRadius: '12px',
    background: PALETTE.background,
    border: `1px solid ${PALETTE.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
    overflow: 'hidden',
  },
  logoImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    padding: '12px',
  },
  logoFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyName: {
    fontWeight: 600,
    lineHeight: 1.3,
    color: PALETTE.textPrimary,
    marginBottom: '8px',
  },
  tagline: {
    fontSize: '14px',
    color: PALETTE.textSecondary,
    lineHeight: 1.6,
    marginBottom: '4px',
  },
  divider: {
    width: '48px',
    height: '1px',
    background: PALETTE.borderStrong,
    margin: '32px 0',
  },
  loginButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px 28px',
    fontSize: '15px',
    fontWeight: 500,
    fontFamily: 'inherit',
    color: '#ffffff',
    background: PALETTE.accent,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
    minWidth: '180px',
  },
  footer: {
    padding: '20px 16px',
    textAlign: 'center',
    fontSize: '13px',
    color: PALETTE.textMuted,
  },
  footerLink: {
    color: PALETTE.textSecondary,
    textDecoration: 'none',
    fontWeight: 500,
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: PALETTE.background,
    fontFamily: '"IBM Plex Sans Arabic", sans-serif',
    direction: 'rtl',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: `2px solid ${PALETTE.border}`,
    borderTopColor: PALETTE.accent,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: PALETTE.textSecondary,
    fontSize: '14px',
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: PALETTE.background,
    fontFamily: '"IBM Plex Sans Arabic", sans-serif',
    direction: 'rtl',
    padding: '24px',
    textAlign: 'center',
  },
  errorIcon: {
    width: '56px',
    height: '56px',
    color: PALETTE.textMuted,
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: PALETTE.textPrimary,
    marginBottom: '12px',
  },
  errorText: {
    color: PALETTE.textSecondary,
    fontSize: '14px',
    lineHeight: 1.8,
    marginBottom: '24px',
    maxWidth: '420px',
  },
  errorButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: PALETTE.accent,
    color: '#ffffff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};

export default TenantLandingPage;
