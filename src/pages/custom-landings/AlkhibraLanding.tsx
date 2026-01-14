import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Scale, Shield, Building2, Gavel, Award, Globe, Phone, Mail } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import './AlkhibraLanding.css';

/**
 * صفحة هبوط مخصصة لشركة بيوت الخبرة للمحاماة
 * Alkhibra Custom Landing Page
 * Uses dedicated ./AlkhibraLanding.css for styling
 * Refactored to use CSS Grid for robust layout
 */
const AlkhibraLanding: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const companyInfo = {
    nameAr: tenant?.name || 'بيوت الخبرة',
    nameEn: 'HOUSE OF EXPERTISE',
    logo: tenant?.logo_url || tenant?.logo,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#1B2B48] flex flex-col relative overflow-x-hidden" dir="rtl">

      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-grid pointer-events-none opacity-40 z-0" />

      {/* Navbar */}
      <nav className="relative z-50 w-full px-6 md:px-12 py-6 flex items-center justify-between bg-white/50 backdrop-blur-sm border-b border-gray-100/50 sticky top-0">
        <div className="flex items-center gap-4">
          {companyInfo.logo ? (
            <img src={companyInfo.logo} alt="Logo" className="h-14 object-contain" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1B2B48] rounded shadow-lg text-[#C5A059]">
                <Scale size={24} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-none text-[#1B2B48] font-arabic">{companyInfo.nameAr}</span>
                <span className="text-[10px] tracking-widest text-[#C5A059] font-serif uppercase mt-1">Law Firm</span>
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-[#1B2B48]/80 font-arabic">
          <a href="#" className="hover:text-[#C5A059] transition-colors">الرئيسية</a>
          <a href="#" className="hover:text-[#C5A059] transition-colors">مجالات الممارسة</a>
          <a href="#" className="hover:text-[#C5A059] transition-colors">فريق العمل</a>
          <button onClick={() => navigate('/login')} className="px-5 py-2 bg-[#1B2B48] text-white rounded-md text-sm hover:bg-[#2c3e5d] transition-colors shadow-lg shadow-[#1B2B48]/20">
            بوابة العملاء
          </button>
        </div>
      </nav>

      {/* Main Hero Section - Grid Layout */}
      <main className="flex-grow container mx-auto px-6 md:px-12 lg:px-20 py-8 lg:py-0 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

        {/* Text Content Area (Right) - Spans 7 cols */}
        <div className="lg:col-span-7 flex flex-col justify-center order-2 lg:order-1 pt-8 lg:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1B2B48]/5 border border-[#1B2B48]/10 mb-8 self-start w-fit">
              <Award size={14} className="text-[#C5A059]" />
              <span className="text-xs font-semibold text-[#1B2B48]/80 font-arabic">التميز القانوني منذ 2004</span>
            </div>

            {/* Main Headings - Adjusted Sizes */}
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-[#1B2B48] mb-4 leading-[1.2] font-arabic">
              {companyInfo.nameAr}
            </h1>

            <div className="flex items-center gap-4 mb-8">
              <div className="h-0.5 w-12 bg-[#C5A059]"></div>
              <h2 className="text-xl lg:text-2xl font-serif text-[#C5A059] tracking-[0.15em] uppercase">
                {companyInfo.nameEn}
              </h2>
            </div>

            <p className="text-base lg:text-lg text-slate-600 mb-10 max-w-2xl leading-relaxed font-arabic">
              نقدم منظومة متكاملة من الخدمات القانونية والاستشارية للشركات والأفراد، يدعمها فريق من النخبة القانونية لضمان حماية مصالحك بدقة واحترافية عالية.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/login')}
                className="khibra-btn px-8 py-4 rounded-lg text-base font-bold shadow-xl shadow-[#1B2B48]/20 flex items-center justify-center gap-3 min-w-[180px]"
              >
                <span>الدخول للمنصة</span>
                <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
              </button>

              <button className="px-8 py-4 rounded-lg text-[#1B2B48] bg-white border border-[#1B2B48]/10 hover:border-[#1B2B48]/30 hover:bg-slate-50 transition-all font-medium flex items-center justify-center gap-2 min-w-[180px]">
                <Phone size={18} className="text-[#C5A059]" />
                <span>تواصل معنا</span>
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 pt-8 border-t border-slate-200 grid grid-cols-2 md:grid-cols-3 gap-8">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-[#1B2B48]">20+</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Seniors</span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-[#1B2B48]">500+</span>
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Cases Won</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Visual Content Area (Left) - Spans 5 cols */}
        <div className="lg:col-span-5 h-[500px] lg:h-[600px] relative order-1 lg:order-2 hidden md:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="w-full h-full relative"
          >
            {/* Main Card - Using Relative Positioning within Grid */}
            <div className="w-full h-full bg-[#1B2B48] rounded-3xl shadow-2xl p-8 lg:p-10 flex flex-col relative overflow-hidden text-white border border-[#ffffff]/10">

              {/* Background Gradients */}
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#C5A059]/20 rounded-full blur-[80px] -mt-20 -mr-20 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-black/40 rounded-full blur-[60px] pointer-events-none"></div>

              {/* Card Content */}
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex justify-between items-start mb-auto">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
                    <Scale className="text-[#C5A059] w-8 h-8" strokeWidth={1.5} />
                  </div>
                  <Globe className="text-white/20 w-6 h-6" />
                </div>

                <div className="mb-12">
                  <h3 className="text-3xl lg:text-4xl font-light leading-tight">
                    <span className="block text-xs font-bold text-[#C5A059] tracking-[0.3em] mb-4 uppercase">Core Values</span>
                    الالتزام.<br />
                    <span className="font-bold text-[#C5A059]">الشفافية.</span><br />
                    التفوق.
                  </h3>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  {[
                    { icon: Shield, title: 'الحماية', en: 'Protection' },
                    { icon: Gavel, title: 'التقاضي', en: 'Litigation' },
                    { icon: Building2, title: 'الشركات', en: 'Corporate' },
                    { icon: Scale, title: 'الاستشارات', en: 'Advisory' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-3 border border-white/5">
                      <item.icon className="w-4 h-4 text-[#C5A059] mb-2" />
                      <span className="block font-bold text-sm tracking-wide">{item.title}</span>
                      <span className="block text-[10px] text-white/40 uppercase tracking-widest font-serif">{item.en}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating "Available" pill - Positioned relative to the grid cell */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-8 -left-6 z-20 bg-white p-4 rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 hidden xl:block"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </div>
                <span className="text-sm font-bold text-[#1B2B48]">متاح الآن</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Available for Consultation</span>
            </motion.div>

          </motion.div>
        </div>

      </main>

      {/* Decorative Gold Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#1B2B48] via-[#C5A059] to-[#1B2B48] absolute bottom-0 left-0 z-50"></div>
    </div>
  );
};

export default AlkhibraLanding;
