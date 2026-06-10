import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Scale, Layers, ArrowRight } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import '../styles/auth.css';

/**
 * AuthLayout - Layout مشترك لصفحات التسجيل والدخول
 * يحافظ على الخلفية الداكنة ثابتة عند الانتقال بين الصفحات
 */
const AuthLayout: React.FC = () => {
    const location = useLocation();
    const { tenant, isSubdomain, isLoading } = useTenant();

    // Show loader while tenant data is loading for subdomains
    if (isSubdomain && isLoading) {
        return (
            <div className="auth-page auth-page--loading">
                <div className="auth-loading-container">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="auth-loading-spinner"
                    />
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="auth-loading-text"
                    >
                        جاري التحميل...
                    </motion.p>
                </div>
            </div>
        );
    }

    // Dynamic hero content based on route
    const getHeroContent = () => {
        if (location.pathname === '/register') {
            return {
                title: 'مكتبُ محاماةٍ متكامل يبدأ من هنا',
                subtitle: 'سجّل مكتبك وانطلق بفترة تجريبية مجانية بكامل المزايا — قضايا وجلسات ومذكرات وعقود وبوابة عملاء.'
            };
        }
        if (location.pathname === '/register/tenant') {
            return {
                title: 'أنشئ ديوان مكتبك في دقائق',
                subtitle: 'ثلاث خطوات فقط: بيانات المكتب، بيانات المالك، ثم التأكيد — وتبدأ تجربتك المجانية فوراً.'
            };
        }
        // Default for login
        return {
            title: 'كلُّ ما في مكتبك… في ديوانٍ رقميٍّ واحد',
            subtitle: 'سجّل دخولك لتتابع قضاياك وجلساتك ومهامك وفواتيرك من لوحة واحدة — بذكاءٍ اصطناعي يفهم القانون السعودي.'
        };
    };

    const heroContent = getHeroContent();

    // If it's a subdomain (tenant), show simplified ERP-style layout without hero
    if (isSubdomain && tenant) {
        const logoUrl = tenant.logo_url || tenant.logo;

        return (
            <div
                className="auth-page auth-page--tenant"
                aria-labelledby="auth-title"
            >
                {/* Tenant Logo Header */}
                <header className="auth-tenant-top-header">
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="auth-tenant-logo-container"
                    >
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={tenant.name}
                                className="auth-tenant-header-logo"
                            />
                        ) : (
                            <div className="auth-tenant-header-logo-placeholder">
                                <Scale size={24} />
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

    // Default layout for main site — هوية «الديوان» الجديدة
    return (
        <div className="auth-page auth-page--brand" aria-labelledby="auth-title">
            {/* Left Panel - Form Content (changes with route) */}
            <section className="auth-page__panel" role="presentation">
                <div className="auth-panel__inner">
                    <Link to="/" className="auth-home-link">
                        <ArrowRight size={15} />
                        العودة للرئيسية
                    </Link>
                    <Outlet />
                </div>
            </section>

            {/* Right Panel - Hero (stays fixed, only content changes) */}
            <section className="auth-page__hero" aria-hidden="true">
                <div className="auth-hero">
                    <div className="auth-hero__section">
                        <div className="auth-hero__brand">
                            <span className="auth-hero__icon">
                                <Layers size={26} />
                            </span>
                            <div>
                                <p className="auth-hero__brand-name">نظام الرائد</p>
                                <p className="auth-hero__brand-copy">نظام إدارة مكاتب المحاماة</p>
                            </div>
                        </div>
                    </div>
                    <div className="auth-hero__center">
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
