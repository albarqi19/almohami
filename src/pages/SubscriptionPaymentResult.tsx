import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Home, RefreshCw, Clock } from 'lucide-react';
import { apiClient } from '../utils/api';
import '../styles/subscription-payment-result.css';

/**
 * صفحة نتيجة الدفع للاشتراك
 *
 * @security لا تعتمد على URL path لتحديد النجاح، بل على استجابة الـ API
 * @ux تستخدم Polling للتحقق من وصول الـ webhook
 */
const SubscriptionPaymentResult: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending' | 'processing'>('processing');
    const [invoice, setInvoice] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // إعدادات الـ Polling
    const MAX_RETRIES = 10; // عدد المحاولات
    const RETRY_INTERVAL = 3000; // 3 ثواني بين كل محاولة

    // تحديد الحالة من URL (للمساعدة فقط، ليس للاعتماد عليها)
    const isSuccessPath = location.pathname.includes('/success');
    const invoiceNumber = searchParams.get('invoice');

    const checkPaymentStatus = useCallback(async () => {
        if (!invoiceNumber) {
            setLoading(false);
            setPaymentStatus('failed');
            setError('رقم الفاتورة غير موجود في الرابط');
            return;
        }

        try {
            const response: any = await apiClient.get(`/subscription/payment-status/${invoiceNumber}`);

            if (response.success && response.data) {
                setInvoice(response.data.invoice);

                // [SECURITY] الاعتماد على حالة الـ API الفعلية، وليس URL
                if (response.data.is_paid) {
                    // الفاتورة مدفوعة فعلاً - نجاح
                    setPaymentStatus('success');
                    setLoading(false);
                } else if (response.data.payment_status === 'failed') {
                    // الدفع فشل
                    setPaymentStatus('failed');
                    setLoading(false);
                } else if (response.data.payment_status === 'refunded') {
                    // تم استرداد المبلغ
                    setPaymentStatus('failed');
                    setError('تم استرداد مبلغ هذه الفاتورة');
                    setLoading(false);
                } else {
                    // الفاتورة لا تزال pending - الـ webhook لم يصل بعد
                    if (isSuccessPath && retryCount < MAX_RETRIES) {
                        // بوابة الدفع أعادت المستخدم لصفحة النجاح
                        // ننتظر الـ webhook
                        setPaymentStatus('processing');
                        // جدولة محاولة أخرى
                        setTimeout(() => {
                            setRetryCount(prev => prev + 1);
                        }, RETRY_INTERVAL);
                    } else if (isSuccessPath) {
                        // استنفدنا المحاولات - نعرض حالة pending
                        setPaymentStatus('pending');
                        setLoading(false);
                    } else {
                        // صفحة الفشل - نعتبرها فاشلة
                        setPaymentStatus('failed');
                        setLoading(false);
                    }
                }
            }
        } catch (err: any) {
            console.error('Error checking payment status:', err);

            // في حالة الخطأ، نعيد المحاولة إذا لم نستنفد المحاولات
            if (isSuccessPath && retryCount < MAX_RETRIES) {
                setPaymentStatus('processing');
                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                }, RETRY_INTERVAL);
            } else {
                setError(err.response?.data?.message || 'فشل في التحقق من حالة الدفع');
                setPaymentStatus('failed');
                setLoading(false);
            }
        }
    }, [invoiceNumber, isSuccessPath, retryCount]);

    useEffect(() => {
        checkPaymentStatus();
    }, [checkPaymentStatus]);

    // دالة لإعادة التحقق يدوياً
    const handleManualRetry = () => {
        setRetryCount(0);
        setLoading(true);
        setPaymentStatus('processing');
    };

    // حالة التحميل أو المعالجة (انتظار الـ webhook)
    if (loading || paymentStatus === 'processing') {
        return (
            <div className="payment-result-page">
                <div className="payment-result-container">
                    <div className="payment-result-card">
                        <div className="payment-result-icon payment-result-icon--loading">
                            <Loader2 size={64} className="animate-spin" />
                        </div>
                        <h1 className="payment-result-title">جاري التحقق من الدفع...</h1>
                        <p className="payment-result-message">
                            يرجى الانتظار بينما نتحقق من حالة الدفع
                            {retryCount > 0 && (
                                <span className="retry-count">
                                    <br />
                                    (محاولة {retryCount} من {MAX_RETRIES})
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // حالة انتظار تأكيد الـ webhook (بعد استنفاد المحاولات)
    if (paymentStatus === 'pending') {
        return (
            <div className="payment-result-page">
                <div className="payment-result-container">
                    <div className="payment-result-card payment-result-card--pending">
                        <div className="payment-result-icon payment-result-icon--pending">
                            <Clock size={64} />
                        </div>
                        <h1 className="payment-result-title">جاري معالجة الدفع</h1>
                        <p className="payment-result-message">
                            تم استلام طلب الدفع وسيتم تأكيده خلال دقائق.
                            <br />
                            سيتم تفعيل اشتراكك تلقائياً بمجرد تأكيد الدفع.
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
                                onClick={handleManualRetry}
                            >
                                <RefreshCw size={18} />
                                التحقق مرة أخرى
                            </button>
                            <button
                                className="payment-result-btn payment-result-btn--secondary"
                                onClick={() => navigate('/dashboard')}
                            >
                                <Home size={18} />
                                الذهاب للوحة التحكم
                            </button>
                        </div>

                        <div className="payment-result-footer">
                            <p>
                                إذا لم يتم تفعيل اشتراكك خلال 15 دقيقة، يرجى التواصل مع الدعم الفني
                                <br />
                                <a href="mailto:support@lawfirm.sa">support@lawfirm.sa</a>
                            </p>
                        </div>
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
