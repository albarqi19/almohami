import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Scale } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

/**
 * صفحة هبوط مخصصة لشركة بيوت الخبرة للمحاماة
 * Custom Landing Page for Alkhibra Law Firm
 * Redesigned for simplicity and modern aesthetic
 */
const AlkhibraLanding: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();

  // Company info
  const companyInfo = {
    name: tenant?.name || 'شركة بيوت الخبرة للمحاماة والاستشارات القانونية',
    tagline: 'نعمل بجد لتحقيق مجموعة من الاهداف المتناغمة',
    logo: tenant?.logo_url || tenant?.logo,
  };

  // Colors extracted from the provided logo image
  const colors = {
    primary: '#1B2B48', // Dark Blue from logo
    secondary: '#C5A059', // Gold/Beige from logo
    background: '#F5F5F0', // Light background for contrast
    text: '#1B2B48'
  };

  return (
    <div 
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gold Border Frame Effect */}
        <div 
          className="absolute top-0 left-0 w-full h-2"
          style={{ backgroundColor: colors.secondary }}
        />
        <div 
          className="absolute bottom-0 left-0 w-full h-2"
          style={{ backgroundColor: colors.secondary }}
        />
        
        {/* Subtle Logo Watermark */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none"
        >
          <Scale size={800} color={colors.primary} />
        </div>
      </div>

      {/* Header with Logo */}
      <header className="w-full p-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-4">
          {companyInfo.logo ? (
            <img 
              src={companyInfo.logo} 
              alt={companyInfo.name}
              className="h-16 object-contain"
            />
          ) : (
            <div 
              className="h-12 w-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.primary, color: colors.secondary }}
            >
              <Scale size={24} />
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          {/* Large Logo Display (Optional, if not in header or as main focus) */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mb-12 flex justify-center"
          >
             {companyInfo.logo ? (
                <img 
                  src={companyInfo.logo} 
                  alt={companyInfo.name}
                  className="h-48 md:h-64 object-contain drop-shadow-2xl"
                />
              ) : (
                <Scale size={120} color={colors.primary} />
              )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-4xl md:text-6xl font-bold mb-6 tracking-tight"
            style={{ color: colors.primary }}
          >
            {companyInfo.name}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="w-24 h-1 mx-auto mb-8 rounded-full"
            style={{ backgroundColor: colors.secondary }}
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-xl md:text-2xl font-light mb-16 max-w-2xl mx-auto leading-relaxed"
            style={{ color: colors.primary }}
          >
            {companyInfo.tagline}
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/login')}
            className="group px-12 py-4 text-lg font-semibold rounded-full flex items-center justify-center gap-3 mx-auto transition-all shadow-lg hover:shadow-xl"
            style={{ 
              backgroundColor: colors.primary, 
              color: '#ffffff',
            }}
          >
            <span>الدخول إلى النظام</span>
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </motion.button>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full p-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <p className="text-[10px] opacity-40 font-light tracking-wider">
            POWERED BY ALRAED LAW SYSTEM
          </p>
        </motion.div>
      </footer>
    </div>
  );
};

export default AlkhibraLanding;
