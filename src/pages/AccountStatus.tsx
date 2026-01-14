import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, Calendar, CreditCard, Loader2, CheckCircle } from 'lucide-react';
import { apiClient } from '../utils/api';
import '../styles/account-status.css';

interface PlanData {
    name: string;
    price: number;
    price_with_tax: number;
    period: string;
    period_label: string;
    savings?: number;
}

interface PlansResponse {
    plans: {
        monthly: PlanData;
        yearly: PlanData;
    };
    currency: string;
    tax_rate: number;
    tax_label: string;
}

const AccountStatus: React.FC = () => {
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [subscribing, setSubscribing] = useState(false);
    const [plansData, setPlansData] = useState<PlansResponse | null>(null);
    const [loadingPlans, setLoadingPlans] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response: any = await apiClient.get('/subscription/plans');
                if (response.success) {
                    setPlansData(response.data);
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();
    }, []);

    const handleOnlineSubscribe = async () => {
        try {
            setSubscribing(true);
            const response: any = await apiClient.post('/subscription/subscribe', {
                plan: selectedPlan,
                payment_method: 'online',
                payment_gateway: 'streampay'
            });

            if (response.success && response.data?.payment_url) {
                // Redirect to StreamPay payment page
                window.location.href = response.data.payment_url;
            } else {
                alert(response.message || 'فشل في إنشاء رابط الدفع');
            }
        } catch (error: any) {
            console.error('Error subscribing:', error);
            alert(error.response?.data?.message || 'حدث خطأ أثناء إنشاء الاشتراك');
        } finally {
            setSubscribing(false);
        }
    };

    const formatPrice = (price: number) => {
        return price.toLocaleString('ar-SA');
    };

    const getSelectedPrice = () => {
        if (!plansData) return '---';
        const plan = plansData.plans[selectedPlan];
        return formatPrice(plan.price);
    };

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
                            جدد اشتراكك للاستمرار في استخدام النظام
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

                    {loadingPlans ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <Loader2 size={24} className="animate-spin" />
                            <p>جاري تحميل الباقات...</p>
                        </div>
                    ) : plansData && (
                        <div className="account-status-pricing">
                            <div
                                className={`account-status-pricing__option ${selectedPlan === 'monthly' ? 'account-status-pricing__option--selected' : ''}`}
                                onClick={() => setSelectedPlan('monthly')}
                                style={{ cursor: 'pointer' }}
                            >
                                {selectedPlan === 'monthly' && (
                                    <CheckCircle size={20} style={{ position: 'absolute', top: '8px', left: '8px', color: 'var(--color-primary)' }} />
                                )}
                                <div className="account-status-pricing__label">{plansData.plans.monthly.name}</div>
                                <div className="account-status-pricing__price">{formatPrice(plansData.plans.monthly.price)} ر.س</div>
                                <div className="account-status-pricing__period">{plansData.plans.monthly.period_label}</div>
                            </div>
                            <div className="account-status-pricing__divider">أو</div>
                            <div
                                className={`account-status-pricing__option account-status-pricing__option--recommended ${selectedPlan === 'yearly' ? 'account-status-pricing__option--selected' : ''}`}
                                onClick={() => setSelectedPlan('yearly')}
                                style={{ cursor: 'pointer' }}
                            >
                                {selectedPlan === 'yearly' && (
                                    <CheckCircle size={20} style={{ position: 'absolute', top: '8px', left: '8px', color: 'var(--color-primary)' }} />
                                )}
                                <div className="account-status-pricing__badge">موصى به</div>
                                <div className="account-status-pricing__label">{plansData.plans.yearly.name}</div>
                                <div className="account-status-pricing__price">{formatPrice(plansData.plans.yearly.price)} ر.س</div>
                                <div className="account-status-pricing__period">{plansData.plans.yearly.period_label}</div>
                                {plansData.plans.yearly.savings && plansData.plans.yearly.savings > 0 && (
                                    <div className="account-status-pricing__savings">وفر {formatPrice(plansData.plans.yearly.savings)} ر.س!</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="account-status-actions">
                        <button
                            className="account-status-btn account-status-btn--primary"
                            onClick={handleOnlineSubscribe}
                            disabled={subscribing || loadingPlans}
                            style={{ minWidth: '200px' }}
                        >
                            {subscribing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    جاري إنشاء رابط الدفع...
                                </>
                            ) : (
                                <>
                                    <CreditCard size={18} />
                                    الدفع الإلكتروني - {getSelectedPrice()} ر.س
                                </>
                            )}
                        </button>
                        <button className="account-status-btn account-status-btn--secondary">
                            <Download size={18} />
                            تصدير البيانات
                        </button>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '16px',
                        marginTop: '16px',
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)'
                    }}>
                        <span>دفع آمن</span>
                        <span>Visa / Mastercard / مدى</span>
                        <span>Apple Pay</span>
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
