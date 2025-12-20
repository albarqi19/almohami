import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Building2, User, ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * RegisterChoiceContent - محتوى صفحة اختيار نوع الحساب
 * يُستخدم داخل AuthLayout
 */
const RegisterChoiceContent: React.FC = () => {
    const navigate = useNavigate();

    const handleLawFirmClick = () => {
        navigate('/register/tenant');
    };

    return (
        <motion.div
            className="auth-card auth-card--wide"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <header className="auth-card__brand">
                <span className="auth-card__logo" aria-hidden="true">
                    <Scale size={28} />
                </span>
                <div>
                    <h1 id="register-choice-title" className="auth-card__title">إنشاء حساب جديد</h1>
                    <p className="auth-card__subtitle">اختر نوع حسابك للمتابعة</p>
                </div>
            </header>

            <div className="auth-choice">
                {/* Law Firm Card - Active */}
                <motion.button
                    type="button"
                    className="auth-choice__card"
                    onClick={handleLawFirmClick}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <span className="auth-choice__icon">
                        <Building2 size={28} />
                    </span>
                    <h3 className="auth-choice__title">شركة محاماة</h3>
                    <p className="auth-choice__desc">
                        إدارة مكتب محاماة كامل مع فريق عمل وإدارة شاملة للقضايا والعملاء
                    </p>
                    <span className="auth-choice__action">
                        ابدأ التسجيل
                        <ArrowLeft size={16} />
                    </span>
                </motion.button>

                {/* Solo Lawyer Card - Disabled */}
                <div
                    className="auth-choice__card auth-choice__card--disabled"
                    aria-disabled="true"
                >
                    <span className="auth-choice__icon">
                        <User size={28} />
                    </span>
                    <h3 className="auth-choice__title">محامي مستقل</h3>
                    <p className="auth-choice__desc">
                        ممارسة فردية للمحامين المستقلين مع أدوات إدارة شخصية
                    </p>
                    <span className="auth-choice__action auth-choice__action--disabled">
                        قريباً
                    </span>
                </div>
            </div>

            <div className="auth-divider">
                <span>لديك حساب بالفعل؟</span>
            </div>

            <Link to="/login" className="auth-link auth-link--center">
                <ArrowRight size={16} />
                تسجيل الدخول
            </Link>
        </motion.div>
    );
};

export default RegisterChoiceContent;
