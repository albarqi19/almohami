import React from 'react';
import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';
import type { LoginTheme, Tenant } from '../../contexts/TenantContext';
import '../../styles/auth-theme.css';

interface Props {
    tenant: Tenant | null;
    theme: LoginTheme;
    children: React.ReactNode;
}

/**
 * TenantThemedAuth — قالبُ صفحة الدخول القابلُ للتشكيل لكلّ مكتب.
 *
 * ثلاثةُ تخطيطات يختارها المكتب من `login_theme`:
 *   split    — لوحةٌ بصريّة (صورةٌ + شعار + عنوان) بجانب النموذج
 *   centered — الصورةُ تملأ الشاشة والبطاقةُ في الوسط
 *   cover    — الصورةُ تملأ الشاشة والبطاقةُ إلى جهةٍ واحدة
 *
 * منطقُ الدخول نفسُه (LoginContent عبر children) مشتركٌ ولا يُمسّ؛ هذا المكوّن
 * يملك القشرةَ فقط. لا علامةَ «الرائد» هنا بحال — الصفحةُ على نطاق المكتب.
 */
const TenantThemedAuth: React.FC<Props> = ({ tenant, theme, children }) => {
    const layout = theme.layout ?? 'split';
    // الافتراضي left: في RTL يبدأ الترتيبُ من اليمين، فاللوحةُ أوّلاً تترك النموذجَ يساراً
    const formSide = theme.form_side ?? 'left';
    // logo_url فقط — العمودُ logo مسارُ تخزينٍ لا رابط، وكان يُحقن كـsrc نسبيٍّ فيكسر
    const logoUrl = tenant?.logo_url || null;
    const logoPosition = theme.logo_position ?? (layout === 'split' ? 'panel' : 'form');
    const logoSize = theme.logo_size ?? 'lg';
    const logoPlate = theme.logo_plate ?? 'light';
    const overlay = Math.min(Math.max(theme.background_overlay ?? 0.55, 0), 0.9);

    const style = {
        '--theme-bg-image': theme.background_url ? `url("${theme.background_url}")` : 'none',
        '--theme-overlay': String(overlay),
        ...(theme.accent_color ? { '--theme-accent': theme.accent_color } : {}),
    } as React.CSSProperties;

    const logo = logoUrl ? (
        <img
            src={logoUrl}
            alt={tenant?.name ?? ''}
            className={`auth-theme__logo auth-theme__logo--${logoSize}`}
        />
    ) : (
        <div className="auth-theme__logo-placeholder" aria-hidden="true">
            <Scale size={26} />
        </div>
    );

    const showPanelLogo = layout === 'split' && (logoPosition === 'panel' || logoPosition === 'both');
    const showFormLogo =
        logoPosition === 'form' ||
        logoPosition === 'both' ||
        (layout !== 'split' && logoPosition === 'panel');
    const hasText = Boolean(theme.headline || theme.subheadline);

    return (
        <div
            className={`auth-page auth-page--tenant auth-theme auth-theme--${layout} auth-theme--form-${formSide}`}
            style={style}
            aria-labelledby="auth-title"
        >
            <div className="auth-theme__backdrop" aria-hidden="true" />

            {layout === 'split' && (
                <section className="auth-theme__visual" aria-hidden="true">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="auth-theme__visual-inner"
                    >
                        <div className={`auth-theme__visual-top${logoPlate === 'light' ? ' auth-theme__visual-top--plate' : ''}`}>
                            {showPanelLogo && logo}
                        </div>
                        {hasText && (
                            <div className="auth-theme__visual-text">
                                {theme.headline && <h2 className="auth-theme__headline">{theme.headline}</h2>}
                                {theme.subheadline && (
                                    <p className="auth-theme__subheadline">{theme.subheadline}</p>
                                )}
                            </div>
                        )}
                        {theme.footer_text && <p className="auth-theme__footer">{theme.footer_text}</p>}
                    </motion.div>
                </section>
            )}

            <section className="auth-theme__form" role="presentation">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="auth-theme__form-inner"
                >
                    {showFormLogo && (
                        <div className={`auth-theme__form-logo${showPanelLogo ? ' auth-theme__form-logo--dup' : ''}`}>
                            {logo}
                        </div>
                    )}
                    {layout !== 'split' && hasText && (
                        <div className="auth-theme__form-text">
                            {theme.headline && <h2 className="auth-theme__headline">{theme.headline}</h2>}
                            {theme.subheadline && <p className="auth-theme__subheadline">{theme.subheadline}</p>}
                        </div>
                    )}
                    {children}
                    {layout !== 'split' && theme.footer_text && (
                        <p className="auth-theme__footer auth-theme__footer--form">{theme.footer_text}</p>
                    )}
                </motion.div>
            </section>
        </div>
    );
};

export default TenantThemedAuth;
