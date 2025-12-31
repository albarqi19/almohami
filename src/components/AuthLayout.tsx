import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { Scale, Sparkles } from 'lucide-react';
import '../styles/auth.css';

/**
 * AuthLayout - Layout مشترك لصفحات التسجيل والدخول
 * يحافظ على الخلفية الداكنة ثابتة عند الانتقال بين الصفحات
 */
const AuthLayout: React.FC = () => {
    const location = useLocation();

    // Dynamic hero content based on route
    const getHeroContent = () => {
        if (location.pathname === '/register') {
            return {
                title: 'انضم إلى منصة إدارة المحاماة الذكية',
                subtitle: 'ابدأ رحلتك في رقمنة مكتبك القانوني مع نظام متكامل يدعم كل احتياجاتك المهنية'
            };
        }
        if (location.pathname === '/register/tenant') {
            return {
                title: 'ابدأ رحـلتك الرقمية',
                subtitle: 'سجّل مكتبك واحصل على فترة تجريبية مجانية لمدة 14 يوماً مع جميع الميزات'
            };
        }
        // Default for login
        return {
            title: 'ترسيخ الثقة مع كل جلسة وكل قضية',
            subtitle: 'لوحة تحكم موحدة للفرق القانونية والعملاء، مع أدوات متقدمة لتتبع القضايا، تنظيم المهام، وتحليل الأداء.'
        };
    };

    const heroContent = getHeroContent();

    return (
        <div className="auth-page" aria-labelledby="auth-title">
            {/* Left Panel - Form Content (changes with route) */}
            <section className="auth-page__panel" role="presentation">
                <Outlet />
            </section>

            {/* Right Panel - Hero (stays fixed, only content changes) */}
            <section className="auth-page__hero" aria-hidden="true">
                <div className="auth-hero">
                    <div className="auth-hero__section">
                        <div className="auth-hero__brand">
                            <span className="auth-hero__icon">
                                <Sparkles size={32} />
                            </span>
                            <div>
                                <p className="auth-hero__brand-name">منصة المحاماة الذكية</p>
                                <p className="auth-hero__brand-copy">حل رقمي متكامل لإدارة مكاتب المحاماة الحديثة</p>
                            </div>
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <h2 className="auth-hero__title">{heroContent.title}</h2>
                                <p className="auth-hero__subtitle">{heroContent.subtitle}</p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AuthLayout;
