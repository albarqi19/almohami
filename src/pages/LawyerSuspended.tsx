import React from 'react';
import { AlertCircle, Mail, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './LawyerSuspended.css';

const LawyerSuspended: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="lawyer-suspended">
            <div className="lawyer-suspended__container">
                <div className="lawyer-suspended__icon">
                    <AlertCircle size={64} />
                </div>

                <h1 className="lawyer-suspended__title">
                    الحساب معلق مؤقتاً
                </h1>

                <p className="lawyer-suspended__message">
                    مرحباً {user?.name}،
                    <br />
                    <br />
                    حسابك معلق مؤقتاً بسبب مشكلة في اشتراك الشركة.
                    <br />
                    يرجى التواصل مع إدارة المكتب لحل هذه المشكلة.
                </p>

                <div className="lawyer-suspended__contact">
                    <h3>طرق التواصل مع الإدارة:</h3>
                    <div className="lawyer-suspended__contact-methods">
                        <div className="contact-method">
                            <Phone size={20} />
                            <span>الاتصال هاتفياً</span>
                        </div>
                        <div className="contact-method">
                            <Mail size={20} />
                            <span>البريد الإلكتروني</span>
                        </div>
                    </div>
                </div>

                <p className="lawyer-suspended__footer">
                    شكراً لتفهمك
                </p>
            </div>
        </div>
    );
};

export default LawyerSuspended;
