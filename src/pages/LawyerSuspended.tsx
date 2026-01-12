import React from 'react';
import { AlertCircle, Mail, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './LawyerSuspended.css';

const LawyerSuspended: React.FC = () => {
    const { user, logout } = useAuth();

    return (
        <div className="lawyer-suspended">
            <div className="lawyer-suspended__container">
                <div className="lawyer-suspended__icon">
                    <AlertCircle size={48} strokeWidth={1.5} />
                </div>

                <h1 className="lawyer-suspended__title">
                    الحساب معلق مؤقتاً
                </h1>

                <p className="lawyer-suspended__message">
                    {user?.name && <span className="user-greeting">مرحباً {user.name}،</span>}
                    <br />
                    حسابك معلق مؤقتاً .
                    <br />
                    يرجى التواصل مع إدارة المكتب لحل هذه المشكلة.
                </p>

                <div className="lawyer-suspended__contact">
                    <h3>طرق التواصل مع الإدارة</h3>
                    <div className="lawyer-suspended__contact-methods">
                        <div className="contact-method">
                            <div className="contact-icon">
                                <Phone size={18} />
                            </div>
                            <span>الاتصال هاتفياً</span>
                        </div>
                        <div className="contact-method">
                            <div className="contact-icon">
                                <Mail size={18} />
                            </div>
                            <span>البريد الإلكتروني</span>
                        </div>
                    </div>
                </div>

                <button onClick={logout} className="lawyer-suspended__logout-btn">
                    تسجيل الخروج
                </button>
            </div>
        </div>
    );
};

export default LawyerSuspended;
