import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import type { LoginTheme, Tenant } from '../../contexts/TenantContext';
import '../../styles/auth-theme.css';

interface Props {
    tenant: Tenant;
    theme: LoginTheme;
}

/**
 * TenantThemedLanding — صفحةُ هبوط المكتب حين يملك قالبَ دخولٍ (tenants.login_theme).
 *
 * القشرةُ نفسُها التي تلبسها صفحةُ الدخول (الخلفيةُ والعتمةُ واللونُ والشعارُ على صحنه)
 * حتى لا ينتقل الزائرُ من صفحةٍ إلى أخرى مختلفةِ الهوية. المحتوى مقصودٌ في أقلّه:
 * الشعار، العنوان، زرُّ الدخول، وسطرُ التذييل إن وُجد — بلا سردٍ ولا ذكرٍ للرائد.
 */

/** لونُ نصّ الزرّ بحسب سطوع لون التمييز — ذهبٌ فاتحٌ يحتاج نصّاً داكناً، وكحليٌّ يحتاج أبيض. */
function readableOn(hex: string | null | undefined): string {
    const m = /^#([0-9a-f]{6})$/i.exec(hex ?? '');
    if (!m) return '#ffffff';
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum > 0.6 ? '#111827' : '#ffffff';
}

const TenantThemedLanding: React.FC<Props> = ({ tenant, theme }) => {
    const navigate = useNavigate();
    const overlay = Math.min(Math.max(theme.background_overlay ?? 0.55, 0), 0.9);
    // الصفحةُ داكنةٌ كلُّها: النسخةُ الفاتحةُ من الشعار إن وُجدت، وإلّا الشعارُ الأصليُّ على صحنٍ أبيض
    const logoUrl = theme.logo_dark_url || tenant.logo_url || null;
    const plate = !theme.logo_dark_url && (theme.logo_plate ?? 'light') === 'light';

    const style = {
        '--theme-bg-image': theme.background_url ? `url("${theme.background_url}")` : 'none',
        '--theme-overlay': String(overlay),
        ...(theme.accent_color ? { '--theme-accent': theme.accent_color } : {}),
        '--theme-accent-ink': readableOn(theme.accent_color),
    } as React.CSSProperties;

    return (
        <div className="tenant-hero" style={style}>
            <div className="tenant-hero__backdrop" aria-hidden="true" />

            <main className="tenant-hero__main">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="tenant-hero__content"
                >
                    {logoUrl ? (
                        <div className={`tenant-hero__logo${plate ? ' tenant-hero__logo--plate' : ''}`}>
                            <img src={logoUrl} alt={tenant.name} />
                        </div>
                    ) : (
                        <p className="tenant-hero__name">{tenant.name}</p>
                    )}

                    <h1 className="tenant-hero__headline">{theme.headline || tenant.name}</h1>

                    <span className="tenant-hero__rule" aria-hidden="true" />

                    <button
                        type="button"
                        className="tenant-hero__cta"
                        onClick={() => navigate('/login')}
                    >
                        <LogIn size={18} aria-hidden="true" />
                        <span>تسجيل الدخول</span>
                    </button>
                </motion.div>
            </main>

            {theme.footer_text && (
                <footer className="tenant-hero__footer">{theme.footer_text}</footer>
            )}
        </div>
    );
};

export default TenantThemedLanding;
