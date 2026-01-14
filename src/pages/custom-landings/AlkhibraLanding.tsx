import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Scale, Shield, Building2, Gavel, Award, Globe } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import './AlkhibraLanding.css';

/**
 * صفحة هبوط مخصصة لشركة بيوت الخبرة للمحاماة
 * Alkhibra Custom Landing Page
 * Uses dedicated ./AlkhibraLanding.css for styling
 */
const AlkhibraLanding: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const companyInfo = {
    nameAr: tenant?.name || 'بيوت الخبرة',
    nameEn: 'HOUSE OF EXPERTISE',
    taglineAr: 'شراكة قانونية استراتيجية تتجاوز التوقعات',
    taglineEn: 'Strategic Legal Partnership Beyond Expectations',
    logo: tenant?.logo_url || tenant?.logo,
  };

  return (
    <div className="alkhibra-page pattern-grid flex flex-col" dir="rtl">

      {/* Navbar */}
      <nav className="w-full h-24 flex items-center justify-between px-8 md:px-16 relative z-20">
        <div className="flex items-center gap-4">
          {companyInfo.logo ? (
            <img src={companyInfo.logo} alt="Logo" className="h-16 object-contain" />
          ) : (
            <div className="flex items-center gap-3">
              <Scale className="text-[#1B2B48]" size={32} />
              <div className="flex flex-col">
                <span className="font-bold text-lg leading-tight text-[#1B2B48]">{companyInfo.nameAr}</span>
                <span className="text-[10px] tracking-widest text-[#C5A059] font-serif uppercase">Law Firm</span>
              </div>
            </div>
          )}
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-[#1B2B48]/70">
          <span className="cursor-pointer hover:text-[#1B2B48] transition-colors">الرئيسية</span>
          <span className="cursor-pointer hover:text-[#1B2B48] transition-colors">عن الشركة</span>
          <span className="cursor-pointer hover:text-[#1B2B48] transition-colors">الخدمات</span>
          <span className="cursor-pointer hover:text-[#1B2B48] transition-colors">اتصل بنا</span>
        </div>
      </nav>

      {/* Main Hero Section */}
      <main className="flex-grow flex flex-col md:flex-row relative z-10 container mx-auto px-6 md:px-12 lg:px-20 py-12 items-center">

        {/* Text Content (Right) */}
        <div className="flex-1 md:pr-12 pt-8 md:pt-0 text-right">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1B2B48]/5 border border-[#1B2B48]/10 text-[#1B2B48] text-xs font-semibold mb-8">
              <Award size={14} className="text-[#C5A059]" />
              <span>رؤية قانونية ثاقبة - Insightful Legal Vision</span>
            </div>

            <h1 className="text-5xl md:text-7xl alkhibra-title-ar text-[#1B2B48] mb-4 leading-tight">
              {companyInfo.nameAr}
            </h1>
            <h2 className="text-2xl md:text-4xl alkhibra-title-en text-[#C5A059] mb-8 font-light tracking-widest pl-2 border-l-4 border-[#C5A059]">
              {companyInfo.nameEn}
            </h2>

            <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl leading-relaxed">
              نقدم حلولاً قانونية مبتكرة تتسم بالدقة والاحترافية. فريقنا المتخصص يضمن لك أعلى معايير الحماية القانونية في كافة تعاملاتك المحلية والدولية.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/login')}
                className="khibra-btn px-10 py-4 rounded-lg text-lg font-bold shadow-xl flex items-center justify-center gap-3 group"
              >
                <span>الدخول إلى المنصة</span>
                <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
              </button>

              <button className="px-10 py-4 rounded-lg text-[#1B2B48] border border-[#1B2B48]/10 hover:bg-[#1B2B48]/5 transition-colors font-medium">
                استشارة فورية
              </button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 py-8 border-t border-slate-200/60 max-w-lg">
              <div>
                <span className="block text-3xl font-bold text-[#1B2B48]">20+</span>
                <span className="text-xs text-slate-500 mt-1">عاماً من الخبرة</span>
              </div>
              <div>
                <span className="block text-3xl font-bold text-[#1B2B48]">500+</span>
                <span className="text-xs text-slate-500 mt-1">عميل استراتيجي</span>
              </div>
              <div>
                <span className="block text-3xl font-bold text-[#1B2B48]">98%</span>
                <span className="text-xs text-slate-500 mt-1">نسبة نجاح القضايا</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Visual Content (Left) */}
        <div className="flex-1 w-full mt-12 md:mt-0 relative h-[600px] hidden md:block">
          {/* The Image/Graphic area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative w-full h-full"
          >
            {/* Main Dark Card */}
            <div className="absolute top-10 left-10 right-0 bottom-0 navy-gradient-bg rounded-3xl shadow-2xl p-8 flex flex-col justify-between overflow-hidden">
              {/* Decorative Circles */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-12">
                  <Scale className="text-[#C5A059] w-12 h-12" strokeWidth={1} />
                  <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
                    <Globe className="text-white/40 w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-3xl font-light text-white leading-snug">
                    <span className="text-[#C5A059] font-serif block text-sm mb-2 tracking-[0.2em] uppercase">Core Values</span>
                    الالتزام. <br />
                    <span className="font-bold text-white">الشفافية.</span> <br />
                    التفوق.
                  </h3>
                </div>
              </div>

              {/* Features Grid inside card */}
              <div className="grid grid-cols-2 gap-4 mt-12 relative z-10">
                {[
                  { icon: Shield, title: 'الحماية', text: 'Protection' },
                  { icon: Gavel, title: 'الدفاع', text: 'Defense' },
                  { icon: Building2, title: 'الشركات', text: 'Corporate' },
                  { icon: Scale, title: 'العدالة', text: 'Justice' }
                ].map((item, i) => (
                  <div key={i} className="feature-card p-4 rounded-xl">
                    <item.icon className="w-6 h-6 text-[#C5A059] mb-3" />
                    <div className="text-white font-bold">{item.title}</div>
                    <div className="text-white/40 text-[10px] uppercase font-serif tracking-wider">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Elements for depth */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-4 -left-4 bg-[#FFFFFF] p-6 rounded-2xl shadow-xl border border-slate-100 max-w-[200px] z-20"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs font-bold text-[#1B2B48]">متاح الآن</span>
              </div>
              <p className="text-xs text-slate-500">فريقنا القانوني جاهز لخدمتكم على مدار الساعة.</p>
            </motion.div>
          </motion.div>
        </div>

      </main>

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#C5A059]/5 to-transparent -z-10"></div>
    </div>
  );
};

export default AlkhibraLanding;
