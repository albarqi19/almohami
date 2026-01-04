import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import { Scale, Sparkles } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import '../styles/auth.css';

/**
 * AuthLayout - Layout مشترك لصفحات التسجيل والدخول
 * يحافظ على الخلفية الداكنة ثابتة عند الانتقال بين الصفحات
 */
const AuthLayout: React.FC = () => {
    const location = useLocation();
    const { tenant, isSubdomain } = useTenant();

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
                title: 'ابدأ رحلتك الرقمية',
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

    // If it's a subdomain (tenant), show simplified layout without hero
    if (isSubdomain && tenant) {
        const primaryColor = tenant.primary_color || '#C5A059';
        const secondaryColor = tenant.secondary_color || '#1a1a1a';
        const logoUrl = tenant.logo_url || tenant.logo;

        return (
            <div 
                className="auth-page auth-page--tenant" 
                aria-labelledby="auth-title"
                style={{
                    '--tenant-primary': primaryColor,
                    '--tenant-secondary': secondaryColor,
                } as React.CSSProperties}
            >
                {/* Tenant Logo Header */}
                <header className="auth-tenant-top-header">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="auth-tenant-logo-container"
                    >
                        {logoUrl ? (
                            <img 
                                src={logoUrl} 
                                alt={tenant.name} 
                                className="auth-tenant-header-logo"
                            />
                        ) : (
                            <div 
                                className="auth-tenant-header-logo-placeholder"
                                style={{ backgroundColor: primaryColor }}
                            >
                                <Scale size={28} color="white" />
                            </div>
                        )}
                    </motion.div>
                </header>

                {/* Full width form for tenants */}
                <section className="auth-page__panel auth-page__panel--full" role="presentation">
                    <Outlet />
                </section>
            </div>
        );
    }

    // Default layout for main site
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
