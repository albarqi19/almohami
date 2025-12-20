import React from 'react';
import { AlertTriangle, RefreshCw, Download, Calendar, CreditCard } from 'lucide-react';
import '../styles/account-status.css';

const AccountStatus: React.FC = () => {
    return (
        <div className="account-status-page">
            <div className="account-status-container">
                <div className="account-status-card">
                    <div className="account-status-icon">
                        <AlertTriangle size={48} />
                    </div>

                    <h1 className="account-status-title">انتهى اشتراكك</h1>

                    <p className="account-status-subtitle">
                        انتهت صلاحية اشتراك شركتك
                        <br />
                        <span className="account-status-date">
                            <Calendar size={14} />
                            في تاريخ 15 ديسمبر 2024
                        </span>
                    </p>

                    <div className="account-status-info">
                        <div className="account-status-info__section">
                            <h3>ما يمكنك فعله:</h3>
                            <ul className="account-status-list account-status-list--allowed">
                                <li>✅ عرض بياناتك (للقراءة فقط)</li>
                                <li>✅ تصدير بياناتك</li>
                                <li>✅ تجديد اشتراكك</li>
                            </ul>
                        </div>

                        <div className="account-status-info__section">
                            <h3>ما لا يمكنك فعله:</h3>
                            <ul className="account-status-list account-status-list--blocked">
                                <li>❌ إضافة قضايا جديدة</li>
                                <li>❌ تعديل البيانات</li>
                                <li>❌ رفع وثائق</li>
                            </ul>
                        </div>
                    </div>

                    <div className="account-status-pricing">
                        <div className="account-status-pricing__option">
                            <div className="account-status-pricing__label">شهري</div>
                            <div className="account-status-pricing__price">299 ر.س</div>
                            <div className="account-status-pricing__period">/شهر</div>
                        </div>
                        <div className="account-status-pricing__divider">أو</div>
                        <div className="account-status-pricing__option account-status-pricing__option--recommended">
                            <div className="account-status-pricing__badge">موصى به</div>
                            <div className="account-status-pricing__label">سنوي</div>
                            <div className="account-status-pricing__price">2990 ر.س</div>
                            <div className="account-status-pricing__period">/سنة</div>
                            <div className="account-status-pricing__savings">وفر شهرين!</div>
                        </div>
                    </div>

                    <div className="account-status-actions">
                        <button className="account-status-btn account-status-btn--primary">
                            <CreditCard size={18} />
                            تجديد الاشتراك
                        </button>
                        <button className="account-status-btn account-status-btn--secondary">
                            <Download size={18} />
                            تصدير البيانات
                        </button>
                    </div>

                    <p className="account-status-support">
                        لأي استفسارات: support@lawfirm.sa
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccountStatus;
