import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn, Scale, Shield, ArrowLeft } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';

const TenantLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, isLoading, error } = useTenant();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tenant-secondary, #1a1a1a)' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
               style={{ borderColor: 'var(--tenant-primary, #C5A059)', borderTopColor: 'transparent' }} />
          <p className="text-white/70">جاري التحميل...</p>
        </motion.div>
      </div>
    );
  }

  // Error state - company not found
  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8"
        >
          <Scale className="w-20 h-20 mx-auto mb-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-white mb-4">الشركة غير موجودة</h1>
          <p className="text-gray-400 mb-8">
            عذراً، لم نتمكن من العثور على هذه الشركة.
            <br />
            تأكد من صحة الرابط أو تواصل مع مزود الخدمة.
          </p>
          <a
            href="https://alraedlaw.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            العودة للموقع الرئيسي
          </a>
        </motion.div>
      </div>
    );
  }

  const logoUrl = tenant.logo_url || tenant.logo;
  const primaryColor = tenant.primary_color || '#C5A059';
  const secondaryColor = tenant.secondary_color || '#1a1a1a';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${secondaryColor} 0%, ${adjustColor(secondaryColor, 20)} 100%)`,
      }}
    >
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={tenant.name}
                className="w-32 h-32 mx-auto object-contain rounded-2xl shadow-2xl"
                style={{
                  boxShadow: `0 20px 60px -15px ${primaryColor}40`,
                  background: 'white',
                  padding: '1rem'
                }}
              />
            ) : (
              <div
                className="w-32 h-32 mx-auto rounded-2xl flex items-center justify-center shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${adjustColor(primaryColor, -20)})`,
                  boxShadow: `0 20px 60px -15px ${primaryColor}60`
                }}
              >
                <Scale className="w-16 h-16 text-white" />
              </div>
            )}
          </motion.div>

          {/* Company Name */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            {tenant.name}
          </motion.h1>

          {/* Tagline */}
          {tenant.tagline && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-xl text-white/70 mb-8"
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
            className="inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl"
            style={{
              background: primaryColor,
              color: getContrastColor(primaryColor),
              boxShadow: `0 10px 40px -10px ${primaryColor}80`
            }}
          >
            <LogIn className="w-6 h-6" />
            تسجيل الدخول
          </motion.button>

          {/* Security Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-12 flex items-center justify-center gap-2 text-white/40 text-sm"
          >
            <Shield className="w-4 h-4" />
            <span>نظام آمن ومحمي</span>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-white/30 text-sm"
        >
          مدعوم بواسطة{' '}
          <a
            href="https://alraedlaw.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/50 transition-colors"
            style={{ color: primaryColor }}
          >
            نظام الرائد
          </a>
        </motion.p>
      </footer>
    </div>
  );
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

export default TenantLandingPage;
