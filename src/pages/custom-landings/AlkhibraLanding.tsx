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

      {/* Header with Logo - Centered */}
      <header className="w-full p-8 flex justify-center items-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-4"
        >
          {companyInfo.logo ? (
            <img 
              src={companyInfo.logo} 
              alt={companyInfo.name}
              className="h-24 md:h-32 object-contain drop-shadow-sm"
            />
          ) : (
            <div 
              className="h-20 w-20 rounded-full flex items-center justify-center shadow-md"
              style={{ backgroundColor: colors.primary, color: colors.secondary }}
            >
              <Scale size={40} />
            </div>
          )}
        </motion.div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-6 relative z-10 -mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-2xl md:text-3xl font-bold mb-8 tracking-wide whitespace-nowrap"
            style={{ color: colors.primary }}
          >
            {companyInfo.name}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="w-16 h-0.5 mx-auto mb-8"
            style={{ backgroundColor: colors.secondary }}
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-lg md:text-xl font-light mb-16 max-w-2xl mx-auto leading-relaxed opacity-80"
            style={{ color: colors.primary }}
          >
            {companyInfo.tagline}
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            whileHover={{ scale: 1.02, boxShadow: "0 15px 30px -10px rgba(0,0,0,0.2)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/login')}
            className="group px-10 py-4 text-lg font-medium rounded-lg flex items-center justify-center gap-3 mx-auto transition-all shadow-lg hover:shadow-xl"
            style={{ 
              backgroundColor: colors.primary, 
              color: '#ffffff',
              minWidth: '240px'
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
