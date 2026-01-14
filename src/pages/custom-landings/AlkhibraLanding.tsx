import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Scale, Shield, Building2, Gavel } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

/**
 * صفحة هبوط مخصصة لشركة بيوت الخبرة للمحاماة
 * Custom Landing Page for Alkhibra Law Firm (House of Expertise)
 * Design: Premium Corporate (Navy & Gold)
 * Rebuilt to provide a high-end "Portal" experience.
 */
const AlkhibraLanding: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();

  // Branding Colors
  const colors = {
    primary: '#1B2B48',   // Deep Navy
    secondary: '#C5A059', // Metallic Gold
    surface: '#FFFFFF',   // White
    background: '#F8FAFC', // Very Light Slate
    text: '#1B2B48',
  };

  // Company Info - hardcoded fallbacks to "House of Expertise" as requested
  const companyInfo = {
    nameAr: tenant?.name || 'بيوت الخبرة',
    nameEn: 'House Of Expertise',
    suffixAr: 'للمحاماة والاستشارات القانونية',
    suffixEn: 'LAW FIRM',
    logo: tenant?.logo_url || tenant?.logo,
  };

  // Features list for the landing page visual area
  const features = [
    { icon: <Shield className="w-6 h-6" />, title: 'حماية قانونية شاملة', desc: 'Legal Protection' },
    { icon: <Scale className="w-6 h-6" />, title: 'استشارات متخصصة', desc: 'Expert Consultation' },
    { icon: <Building2 className="w-6 h-6" />, title: 'خدمات الشركات', desc: 'Corporate Services' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans" dir="rtl">

      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 0 L100 100 M100 0 L0 100" stroke={colors.primary} strokeWidth="0.5" />
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke={colors.primary} strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Top Gold Accent Bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#1B2B48] via-[#C5A059] to-[#1B2B48] relative z-20" />

      {/* Main Container */}
      <main className="relative z-10 min-h-screen flex flex-col md:flex-row">

        {/* Right Side: Hero Content & Branding (Primary Interaction Area) */}
        <div className="flex-1 flex flex-col justify-center items-start p-8 md:p-16 lg:p-24 relative overflow-hidden">
          {/* Background gradient for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-100 -z-10" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-xl w-full"
          >
            {/* Logo Area */}
            <div className="mb-12">
              {companyInfo.logo ? (
                <img
                  src={companyInfo.logo}
                  alt="Alkhibra Logo"
                  className="h-24 md:h-32 object-contain"
                />
              ) : (
                <div className="flex items-center gap-4 text-[#1B2B48]">
                  <div className="p-3 rounded-lg bg-[#1B2B48] text-[#C5A059] shadow-lg">
                    <Scale size={42} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold leading-none">{companyInfo.nameAr}</h1>
                    <p className="text-[#C5A059] tracking-[0.2em] text-xs font-serif mt-1 font-semibold">{companyInfo.nameEn.toUpperCase()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-extrabold text-[#1B2B48] mb-2 leading-tight tracking-tight">
                {companyInfo.nameAr}
              </h2>
              <h3 className="text-xl md:text-2xl font-serif text-[#C5A059] mb-8 tracking-wide flex items-center gap-2">
                {companyInfo.nameEn} <span className="h-px w-8 bg-[#C5A059] inline-block opacity-50"></span> <span className="text-[#1B2B48] text-base md:text-lg font-sans opacity-80">{companyInfo.suffixEn}</span>
              </h3>

              <div className="h-1 w-20 bg-[#C5A059] mb-8 rounded-full shadow-sm" />

              <p className="text-lg text-slate-600 leading-relaxed max-w-lg mb-12 font-light">
                نقدم خدمات قانونية متكاملة بمعايير عالمية. شريكك القانوني الموثوق لتحقيق أهدافك وحماية مصالحك بدقة واحترافية.
              </p>
            </motion.div>

            {/* Action Button */}
            <motion.button
              whileHover={{ scale: 1.02, x: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/login')}
              className="group relative overflow-hidden bg-[#1B2B48] text-white px-8 py-4 md:px-10 md:py-5 rounded-lg shadow-2xl shadow-[#1B2B48]/30 flex items-center gap-4 transition-all w-full md:w-auto justify-between md:justify-start"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#ffffff10] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              <div className="flex flex-col items-start">
                <span className="font-bold text-lg leading-none">الدخول إلى المنصة</span>
                <span className="text-[10px] font-light tracking-[0.2em] text-[#C5A059] mt-1">CLIENT PORTAL</span>
              </div>
              <div className="bg-white/10 p-2 rounded-full group-hover:bg-white/20 transition-colors">
                <ChevronLeft className="w-5 h-5 text-white" />
              </div>
            </motion.button>
          </motion.div>
        </div>

        {/* Left Side: Visual/Features Area (Desktop Only) - Dark Theme */}
        <div className="hidden md:flex flex-1 relative bg-[#1B2B48] flex-col justify-center items-center p-12 overflow-hidden text-white">
          {/* Abstract Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C5A059] rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#000000] rounded-full blur-[100px] opacity-40 translate-y-1/3 -translate-x-1/4" />

            {/* Geometric Pattern Overlay - Dots */}
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #C5A059 1px, transparent 0)', backgroundSize: '30px 30px' }}
            />
          </div>

          <div className="relative z-10 max-w-md w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="mb-12 text-center"
            >
              <div className="inline-flex items-center justify-center p-8 rounded-full border border-[#C5A059]/30 bg-[#1B2B48]/50 backdrop-blur-md mb-6 shadow-[0_0_40px_rgba(197,160,89,0.1)] relative">
                <div className="absolute inset-0 rounded-full border border-white/5 scale-110" />
                <Gavel size={56} className="text-[#C5A059]" strokeWidth={1.5} />
              </div>
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-[#C5A059]/50 to-transparent mx-auto mb-2" />
              <h3 className="text-xl font-light text-[#C5A059] tracking-[0.3em]">EST. 2024</h3>
            </motion.div>

            {/* Feature Cards - Staggered Animation */}
            <div className="grid gap-5">
              {features.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + (idx * 0.15), type: "spring", stiffness: 100 }}
                  className="group bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-xl flex items-center gap-5 hover:bg-white/10 hover:border-[#C5A059]/30 transition-all duration-300 transform hover:-translate-x-2 shadow-lg hover:shadow-[#C5A059]/5"
                >
                  <div className="p-3 bg-gradient-to-br from-[#C5A059]/20 to-[#C5A059]/5 rounded-lg text-[#C5A059] group-hover:text-white group-hover:bg-[#C5A059] transition-all duration-300">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg font-sans mb-0.5">{item.title}</h4>
                    <p className="text-white/50 text-[10px] uppercase tracking-widest font-serif">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-16 text-center border-t border-white/10 pt-8">
              <p className="text-white/30 text-xs font-light tracking-wide">
                Professional Legal Services • Corporate Law • Litigation
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - Minimal */}
      <footer className="absolute bottom-4 left-0 w-full text-center z-20 pointer-events-none md:hidden">
        <p className="text-[#1B2B48]/40 text-[10px] uppercase tracking-widest">Powered by Law System</p>
      </footer>
    </div>
  );
};

export default AlkhibraLanding;
