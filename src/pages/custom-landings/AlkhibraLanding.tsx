import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Scale, 
  Shield, 
  Award, 
  Users, 
  Briefcase, 
  Phone, 
  Mail, 
  MapPin,
  ChevronLeft,
  Star,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';

/**
 * صفحة هبوط مخصصة لشركة بيوت الخبرة للمحاماة
 * Custom Landing Page for Alkhibra Law Firm
 */
const AlkhibraLanding: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Company info - يمكن تعديلها
  const companyInfo = {
    name: tenant?.name || 'شركة بيوت الخبرة للمحاماة والاستشارات القانونية',
    tagline: tenant?.tagline || 'خبرة قانونية موثوقة منذ سنوات',
    phone: '+966 XX XXX XXXX',
    email: 'info@alkhibra.com',
    address: 'الرياض، المملكة العربية السعودية',
    logo: tenant?.logo_url || tenant?.logo,
  };

  // الخدمات
  const services = [
    {
      icon: Briefcase,
      title: 'القضايا التجارية',
      description: 'تمثيل قانوني متكامل في النزاعات التجارية وقضايا الشركات'
    },
    {
      icon: Users,
      title: 'قضايا الأحوال الشخصية',
      description: 'دعم قانوني شامل في قضايا الأسرة والميراث'
    },
    {
      icon: Shield,
      title: 'القضايا الجنائية',
      description: 'دفاع قوي ومحترف في جميع أنواع القضايا الجنائية'
    },
    {
      icon: Scale,
      title: 'الاستشارات القانونية',
      description: 'استشارات قانونية متخصصة لجميع القطاعات'
    }
  ];

  // الإحصائيات
  const stats = [
    { value: '500+', label: 'قضية ناجحة' },
    { value: '15+', label: 'سنة خبرة' },
    { value: '50+', label: 'محامي متخصص' },
    { value: '98%', label: 'نسبة رضا العملاء' }
  ];

  // آراء العملاء
  const testimonials = [
    {
      name: 'محمد العتيبي',
      role: 'رجل أعمال',
      content: 'تعاملت مع شركة بيوت الخبرة في قضية تجارية معقدة، وكانت النتيجة ممتازة. فريق محترف ومتابعة دقيقة.',
      rating: 5
    },
    {
      name: 'سارة الشمري',
      role: 'سيدة أعمال',
      content: 'أنصح بشدة بالتعامل معهم. خبرة واسعة وتفاني في العمل.',
      rating: 5
    },
    {
      name: 'عبدالله القحطاني',
      role: 'مدير شركة',
      content: 'شركة محترفة جداً، ساعدوني في حل نزاع تجاري بطريقة قانونية سليمة.',
      rating: 5
    }
  ];

  // تبديل الشهادات تلقائياً
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // الألوان المخصصة للشركة
  const colors = {
    primary: tenant?.primary_color || '#1E3A5F', // أزرق داكن
    secondary: tenant?.secondary_color || '#C5A059', // ذهبي
    background: '#0A1628',
    text: '#ffffff'
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A1628] via-[#0F2238] to-[#0A1628] text-white overflow-hidden">
      
      {/* ===== Hero Section ===== */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, ${colors.secondary}20 0%, transparent 50%),
                              radial-gradient(circle at 75% 75%, ${colors.primary}30 0%, transparent 50%)`
          }} />
        </div>

        {/* Floating Elements */}
        <motion.div
          className="absolute top-20 left-10 w-20 h-20 rounded-full opacity-20"
          style={{ background: colors.secondary }}
          animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-32 h-32 rounded-full opacity-10"
          style={{ background: colors.primary }}
          animate={{ y: [0, 20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              {companyInfo.logo ? (
                <img 
                  src={companyInfo.logo} 
                  alt={companyInfo.name}
                  className="w-40 h-40 mx-auto object-contain rounded-2xl shadow-2xl bg-white p-4"
                  style={{ boxShadow: `0 25px 80px -20px ${colors.secondary}50` }}
                />
              ) : (
                <div 
                  className="w-40 h-40 mx-auto rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                    boxShadow: `0 25px 80px -20px ${colors.secondary}60`
                  }}
                >
                  <Scale className="w-20 h-20 text-white" />
                </div>
              )}
            </motion.div>

            {/* Company Name */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-4xl md:text-6xl font-bold mb-6"
              style={{ textShadow: `0 4px 30px ${colors.secondary}40` }}
            >
              {companyInfo.name}
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-xl md:text-2xl text-white/70 mb-12 max-w-2xl mx-auto"
            >
              {companyInfo.tagline}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: `0 20px 50px -15px ${colors.secondary}60` }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/login')}
                className="px-10 py-4 text-lg font-bold rounded-xl flex items-center justify-center gap-3 transition-all"
                style={{ 
                  background: `linear-gradient(135deg, ${colors.secondary}, ${colors.secondary}dd)`,
                  color: '#1a1a1a'
                }}
              >
                تسجيل الدخول
                <ChevronLeft className="w-5 h-5" />
              </motion.button>

              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={`tel:${companyInfo.phone}`}
                className="px-10 py-4 text-lg font-bold rounded-xl border-2 flex items-center justify-center gap-3 transition-all hover:bg-white/10"
                style={{ borderColor: colors.secondary, color: colors.secondary }}
              >
                <Phone className="w-5 h-5" />
                اتصل بنا
              </motion.a>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-8 h-12 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <motion.div 
              className="w-2 h-2 rounded-full bg-white/60"
              animate={{ y: [0, 16, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* ===== Stats Section ===== */}
      <section className="py-20 relative">
        <div 
          className="absolute inset-0 opacity-50"
          style={{ background: `linear-gradient(180deg, transparent, ${colors.primary}30, transparent)` }}
        />
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div 
                  className="text-4xl md:text-5xl font-bold mb-2"
                  style={{ color: colors.secondary }}
                >
                  {stat.value}
                </div>
                <div className="text-white/60">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Services Section ===== */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">خدماتنا القانونية</h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              نقدم مجموعة شاملة من الخدمات القانونية بأعلى معايير الجودة والاحترافية
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all group"
              >
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                  style={{ background: `linear-gradient(135deg, ${colors.secondary}30, ${colors.primary}30)` }}
                >
                  <service.icon className="w-8 h-8" style={{ color: colors.secondary }} />
                </div>
                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                <p className="text-white/60">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Why Choose Us Section ===== */}
      <section className="py-24 relative">
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, transparent, ${colors.primary}20, transparent)` }}
        />
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">لماذا تختارنا؟</h2>
              <p className="text-white/60 mb-8 text-lg">
                نحن نؤمن بأن كل قضية تستحق أفضل تمثيل قانوني ممكن. فريقنا من المحامين المتخصصين يعمل بتفانٍ لتحقيق أفضل النتائج لعملائنا.
              </p>
              
              <div className="space-y-4">
                {[
                  'فريق من أفضل المحامين المتخصصين',
                  'خبرة واسعة في جميع أنواع القضايا',
                  'متابعة دقيقة ومستمرة للقضايا',
                  'سرية تامة وحماية لمعلومات العملاء',
                  'أسعار منافسة وخطط دفع مرنة'
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: colors.secondary }} />
                    <span className="text-white/80">{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div 
                className="absolute inset-0 rounded-3xl blur-3xl opacity-30"
                style={{ background: `linear-gradient(135deg, ${colors.secondary}, ${colors.primary})` }}
              />
              <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
                <Award className="w-20 h-20 mx-auto mb-6" style={{ color: colors.secondary }} />
                <h3 className="text-2xl font-bold text-center mb-4">شهادة التميز</h3>
                <p className="text-white/60 text-center">
                  حاصلون على جوائز التميز في المحاماة والاستشارات القانونية
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== Testimonials Section ===== */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">آراء عملائنا</h2>
            <p className="text-white/60">ثقة عملائنا هي أكبر شهادة على جودة خدماتنا</p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10 text-center"
              >
                <div className="flex justify-center gap-1 mb-6">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="w-6 h-6 fill-current" style={{ color: colors.secondary }} />
                  ))}
                </div>
                <p className="text-xl text-white/80 mb-8 leading-relaxed">
                  "{testimonials[currentTestimonial].content}"
                </p>
                <div>
                  <div className="font-bold text-lg">{testimonials[currentTestimonial].name}</div>
                  <div className="text-white/50">{testimonials[currentTestimonial].role}</div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentTestimonial ? 'w-8' : 'opacity-50'
                  }`}
                  style={{ background: colors.secondary }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Contact Section ===== */}
      <section className="py-24 relative">
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, transparent, ${colors.primary}30)` }}
        />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">تواصل معنا</h2>
            <p className="text-white/60">نحن هنا للإجابة على استفساراتك</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Phone, label: 'الهاتف', value: companyInfo.phone, href: `tel:${companyInfo.phone}` },
              { icon: Mail, label: 'البريد', value: companyInfo.email, href: `mailto:${companyInfo.email}` },
              { icon: MapPin, label: 'العنوان', value: companyInfo.address, href: '#' }
            ].map((item, index) => (
              <motion.a
                key={index}
                href={item.href}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all text-center group"
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform"
                  style={{ background: `${colors.secondary}20` }}
                >
                  <item.icon className="w-7 h-7" style={{ color: colors.secondary }} />
                </div>
                <div className="text-white/50 text-sm mb-2">{item.label}</div>
                <div className="text-white font-medium">{item.value}</div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="py-8 border-t border-white/10">
        <div className="container mx-auto px-6 text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} {companyInfo.name}. جميع الحقوق محفوظة.
          </p>
          <p className="text-white/30 text-xs mt-2">
            مدعوم بواسطة{' '}
            <a 
              href="https://alraedlaw.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white/50 transition-colors"
              style={{ color: colors.secondary }}
            >
              نظام الرائد
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AlkhibraLanding;
