import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Home, RefreshCw, CreditCard } from 'lucide-react';
import { apiClient } from '../utils/api';
import '../styles/subscription-payment-result.css';

const SubscriptionPaymentResult: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending'>('pending');
    const [invoice, setInvoice] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Determine status from URL path
    const isSuccessPath = location.pathname.includes('/success');
    const invoiceNumber = searchParams.get('invoice');

    useEffect(() => {
        const checkPaymentStatus = async () => {
            if (!invoiceNumber) {
                setLoading(false);
                setPaymentStatus(isSuccessPath ? 'success' : 'failed');
                return;
            }

            try {
                const response: any = await apiClient.get(`/subscription/payment-status/${invoiceNumber}`);

                if (response.success && response.data) {
                    setInvoice(response.data.invoice);

                    if (response.data.is_paid) {
                        setPaymentStatus('success');
                    } else if (response.data.payment_status === 'failed') {
                        setPaymentStatus('failed');
                    } else {
                        // Still pending - might be waiting for webhook
                        setPaymentStatus(isSuccessPath ? 'success' : 'pending');
                    }
                }
            } catch (err: any) {
                console.error('Error checking payment status:', err);
                setError(err.response?.data?.message || 'فشل في التحقق من حالة الدفع');
                setPaymentStatus(isSuccessPath ? 'success' : 'failed');
            } finally {
                setLoading(false);
            }
        };

        checkPaymentStatus();
    }, [invoiceNumber, isSuccessPath]);

    if (loading) {
        return (
            <div className="payment-result-page">
                <div className="payment-result-container">
                    <div className="payment-result-card">
                        <div className="payment-result-icon payment-result-icon--loading">
                            <Loader2 size={64} className="animate-spin" />
                        </div>
                        <h1 className="payment-result-title">جاري التحقق من الدفع...</h1>
                        <p className="payment-result-message">يرجى الانتظار بينما نتحقق من حالة الدفع</p>
                    </div>
                </div>
            </div>
        );
    }

    if (paymentStatus === 'success') {
        return (
            <div className="payment-result-page">
                <div className="payment-result-container">
                    <div className="payment-result-card payment-result-card--success">
                        <div className="payment-result-icon payment-result-icon--success">
                            <CheckCircle size={64} />
                        </div>
                        <h1 className="payment-result-title">تم الدفع بنجاح! 🎉</h1>
                        <p className="payment-result-message">
                            شكراً لك! تم تفعيل اشتراكك بنجاح
                        </p>

                        {invoice && (
                            <div className="payment-result-details">
                                <div className="payment-result-detail">
                                    <span className="payment-result-detail__label">رقم الفاتورة</span>
                                    <span className="payment-result-detail__value">{invoice.invoice_number}</span>
                                </div>
                                <div className="payment-result-detail">
                                    <span className="payment-result-detail__label">المبلغ المدفوع</span>
                                    <span className="payment-result-detail__value">{Number(invoice.total_amount).toLocaleString()} ر.س</span>
                                </div>
                                <div className="payment-result-detail">
                                    <span className="payment-result-detail__label">الباقة</span>
                                    <span className="payment-result-detail__value">
                                        {invoice.subscription?.plan === 'yearly' ? 'سنوية' : 'شهرية'}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="payment-result-actions">
                            <button
                                className="payment-result-btn payment-result-btn--primary"
                                onClick={() => navigate('/dashboard')}
                            >
                                <Home size={18} />
                                الذهاب للوحة التحكم
                            </button>
                            <button
                                className="payment-result-btn payment-result-btn--secondary"
                                onClick={() => navigate('/settings#invoices')}
                            >
                                عرض الفواتير
                            </button>
                        </div>

                        <div className="payment-result-footer">
                            <p>تم إرسال تفاصيل الفاتورة إلى بريدك الإلكتروني</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Failed or pending
    return (
        <div className="payment-result-page">
            <div className="payment-result-container">
                <div className="payment-result-card payment-result-card--failed">
                    <div className="payment-result-icon payment-result-icon--failed">
                        <XCircle size={64} />
                    </div>
                    <h1 className="payment-result-title">فشل الدفع</h1>
                    <p className="payment-result-message">
                        {error || 'عذراً، لم يتم إتمام عملية الدفع. يرجى المحاولة مرة أخرى.'}
                    </p>

                    {invoice && (
                        <div className="payment-result-details">
                            <div className="payment-result-detail">
                                <span className="payment-result-detail__label">رقم الفاتورة</span>
                                <span className="payment-result-detail__value">{invoice.invoice_number}</span>
                            </div>
                            <div className="payment-result-detail">
                                <span className="payment-result-detail__label">المبلغ</span>
                                <span className="payment-result-detail__value">{Number(invoice.total_amount).toLocaleString()} ر.س</span>
                            </div>
                        </div>
                    )}

                    <div className="payment-result-actions">
                        <button
                            className="payment-result-btn payment-result-btn--primary"
                            onClick={() => navigate('/settings#subscription')}
                        >
                            <RefreshCw size={18} />
                            المحاولة مرة أخرى
                        </button>
                        <button
                            className="payment-result-btn payment-result-btn--secondary"
                            onClick={() => navigate('/dashboard')}
                        >
                            <Home size={18} />
                            العودة للرئيسية
                        </button>
                    </div>

                    <div className="payment-result-footer">
                        <p>
                            إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني
                            <br />
                            <a href="mailto:support@lawfirm.sa">support@lawfirm.sa</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPaymentResult;
