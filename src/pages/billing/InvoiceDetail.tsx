import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Receipt,
  User,
  Calendar,
  CreditCard,
  Send,
  Printer,
  Download,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  DollarSign,
  Percent,
} from 'lucide-react';
import { invoiceService } from '../../services/invoiceService';
import { paymentService } from '../../services/paymentService';
import InvoiceView from '../../components/billing/InvoiceView';
import PaymentModal from '../../components/billing/PaymentModal';
import type { CaseInvoice, InvoiceStatus, Payment, CreatePaymentData } from '../../types/billing';
import '../../styles/billing-page.css';

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft: { label: 'مسودة', color: '#6b7280', bg: '#f3f4f6', icon: <FileText size={14} /> },
  sent: { label: 'مرسلة', color: '#3b82f6', bg: '#dbeafe', icon: <Send size={14} /> },
  pending: { label: 'معلقة', color: '#d97706', bg: '#fef3c7', icon: <Clock size={14} /> },
  partial: { label: 'مدفوعة جزئياً', color: '#8b5cf6', bg: '#ede9fe', icon: <Clock size={14} /> },
  paid: { label: 'مدفوعة', color: '#059669', bg: '#d1fae5', icon: <CheckCircle size={14} /> },
  overdue: { label: 'متأخرة', color: '#dc2626', bg: '#fee2e2', icon: <AlertTriangle size={14} /> },
  cancelled: { label: 'ملغاة', color: '#6b7280', bg: '#f3f4f6', icon: <XCircle size={14} /> },
  refunded: { label: 'مستردة', color: '#f59e0b', bg: '#fef3c7', icon: <XCircle size={14} /> },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: 'بانتظار التأكيد', color: '#d97706', bg: '#fef3c7' },
  confirmed: { label: 'مؤكدة', color: '#059669', bg: '#d1fae5' },
  rejected: { label: 'مرفوضة', color: '#dc2626', bg: '#fee2e2' },
  refunded: { label: 'مستردة', color: '#f59e0b', bg: '#fef3c7' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'نقداً',
  bank_transfer: 'تحويل بنكي',
  check: 'شيك',
  card: 'بطاقة ائتمان',
  online: 'دفع إلكتروني',
  mada: 'مدى',
  apple_pay: 'Apple Pay',
  stc_pay: 'STC Pay',
  other: 'أخرى',
};

// واجهة بيانات المكتب
interface FirmInfo {
  name: string;
  cr: string;
  license: string;
  phone: string;
  email: string;
  address: string;
  iban: string;
  bank: string;
}

const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // الحالة
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp'>('email');
  const [isSending, setIsSending] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [firmInfo, setFirmInfo] = useState<FirmInfo | null>(null);

  // جلب الفاتورة
  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoiceService.getInvoice(Number(id)),
    enabled: !!id,
  });

  // جلب بيانات المكتب/الشركة
  useQuery({
    queryKey: ['tenant-info'],
    queryFn: async () => {
      const response = await fetch('/api/tenant', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json',
        },
      });
      const data = await response.json();
      if (data.success && data.data?.tenant) {
        const tenant = data.data.tenant;
        // جلب معلومات البنك من settings إذا كانت متاحة
        const settings = tenant.settings || {};
        setFirmInfo({
          name: tenant.name || '',
          cr: tenant.commercial_registration || tenant.tax_number || '',
          license: settings.license_number || tenant.commercial_registration || '',
          phone: tenant.phone || '',
          email: tenant.email || '',
          address: tenant.address ? `${tenant.address}${tenant.city ? ', ' + tenant.city : ''}${tenant.country ? ', ' + tenant.country : ''}` : '',
          iban: settings.iban || '',
          bank: settings.bank_name || '',
        });
      }
      return data;
    },
  });

  const invoice = invoiceData?.data;

  // دالة إرسال الفاتورة
  const handleSendInvoice = async () => {
    setIsSending(true);
    try {
      const response = await invoiceService.sendInvoice(Number(id), sendMethod);
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
        setShowSendModal(false);
        alert('تم إرسال الفاتورة بنجاح');
      } else {
        alert(response.message || 'حدث خطأ أثناء إرسال الفاتورة');
      }
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      alert(error?.response?.data?.message || 'حدث خطأ أثناء إرسال الفاتورة');
    } finally {
      setIsSending(false);
    }
  };

  // دالة تفعيل الفاتورة (تحويلها من مسودة إلى معلقة مباشرة)
  const handleActivateInvoice = async () => {
    setIsActivating(true);
    try {
      const response = await invoiceService.updateInvoice(Number(id), { status: 'pending' });
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
        alert('تم تفعيل الفاتورة بنجاح - يمكنك الآن تسجيل مدفوعات');
      } else {
        alert(response.message || 'حدث خطأ أثناء تفعيل الفاتورة');
      }
    } catch (error: any) {
      console.error('Error activating invoice:', error);
      alert(error?.response?.data?.message || 'حدث خطأ أثناء تفعيل الفاتورة');
    } finally {
      setIsActivating(false);
    }
  };

  // دالة تسجيل الدفعة
  const handleSubmitPayment = async (data: CreatePaymentData, receiptFile?: File) => {
    setIsSubmittingPayment(true);
    try {
      const response = await paymentService.createPayment(data);
      if (response.success) {
        // رفع الإيصال إذا وُجد
        if (receiptFile && response.data?.id) {
          await paymentService.uploadReceipt(response.data.id, receiptFile);
        }
        // تحديث بيانات الفاتورة
        queryClient.invalidateQueries({ queryKey: ['invoice', id] });
        setShowPaymentModal(false);
        alert('تم تسجيل الدفعة بنجاح');
      } else {
        alert(response.message || 'حدث خطأ أثناء تسجيل الدفعة');
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      alert(error?.response?.data?.message || 'حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // تنسيق التاريخ
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number | null | undefined) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="loading-page">
        <Loader2 className="spinner" size={32} />
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="error-page">
        <AlertTriangle size={48} />
        <h2>الفاتورة غير موجودة</h2>
        <button className="btn-primary" onClick={() => navigate('/invoices')}>
          العودة للفواتير
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[invoice.status] || {
    label: invoice.status || 'غير محدد',
    color: '#6b7280',
    bg: '#f3f4f6',
    icon: <FileText size={14} />
  };
  const paidPercentage = invoice.total_amount > 0
    ? ((invoice.paid_amount / invoice.total_amount) * 100).toFixed(1)
    : 0;

  return (
    <div className="invoice-detail-page" style={{ direction: 'rtl' }}>
      {/* الهيدر */}
      <div className="detail-header">
        <div className="header-right">
          <button className="back-btn" onClick={() => navigate('/invoices')}>
            <ArrowRight size={20} />
          </button>
          <div>
            <div className="invoice-number">{invoice.invoice_number}</div>
            <h1>{invoice.title}</h1>
          </div>
        </div>

        <div className="header-actions">
          <span
            className="status-badge large"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}
          >
            {statusConfig.icon}
            {statusConfig.label}
          </span>

          <button className="btn-secondary" onClick={() => setShowInvoiceView(true)}>
            <Printer size={18} />
            طباعة
          </button>

          {/* زر إرسال الفاتورة - يظهر للمسودة فقط */}
          {invoice.status === 'draft' && (
            <>
              <button
                className="btn-secondary"
                onClick={() => setShowSendModal(true)}
                disabled={isSending}
              >
                <Send size={18} />
                إرسال للعميل
              </button>
              <button
                className="btn-primary"
                onClick={handleActivateInvoice}
                disabled={isActivating}
              >
                {isActivating ? (
                  <Loader2 size={18} className="spinner" />
                ) : (
                  <CheckCircle size={18} />
                )}
                تفعيل الفاتورة
              </button>
            </>
          )}

          {/* زر تسجيل دفعة - يظهر للفواتير المفعلة */}
          {['sent', 'pending', 'partial', 'overdue'].includes(invoice.status) && (
            <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>
              <Plus size={18} />
              تسجيل دفعة
            </button>
          )}
        </div>
      </div>

      {/* بطاقات الملخص */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: '#dbeafe' }}>
            <DollarSign size={20} color="#3b82f6" />
          </div>
          <div className="card-content">
            <span className="label">إجمالي الفاتورة</span>
            <span className="value">{formatAmount(invoice.total_amount)} ر.س</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: '#d1fae5' }}>
            <CheckCircle size={20} color="#059669" />
          </div>
          <div className="card-content">
            <span className="label">المدفوع</span>
            <span className="value">{formatAmount(invoice.paid_amount)} ر.س</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: '#fef3c7' }}>
            <Clock size={20} color="#d97706" />
          </div>
          <div className="card-content">
            <span className="label">المتبقي</span>
            <span className="value">{formatAmount(invoice.remaining_amount)} ر.س</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon" style={{ backgroundColor: '#ede9fe' }}>
            <Percent size={20} color="#7c3aed" />
          </div>
          <div className="card-content">
            <span className="label">نسبة السداد</span>
            <span className="value">{paidPercentage}%</span>
          </div>
        </div>
      </div>

      {/* شريط التقدم */}
      <div className="progress-section">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${paidPercentage}%` }}
          />
        </div>
        <div className="progress-labels">
          <span>المدفوع: {formatAmount(invoice.paid_amount)} ر.س</span>
          <span>المتبقي: {formatAmount(invoice.remaining_amount)} ر.س</span>
        </div>
      </div>

      {/* المحتوى */}
      <div className="detail-content">
        <div className="content-grid">
          {/* معلومات الفاتورة */}
          <div className="info-section">
            <h3>
              <Receipt size={18} />
              معلومات الفاتورة
            </h3>
            <div className="info-content">
              <div className="info-row">
                <span className="label">رقم الفاتورة:</span>
                <span className="value">{invoice.invoice_number}</span>
              </div>
              <div className="info-row">
                <span className="label">تاريخ الإصدار:</span>
                <span className="value">{formatDate(invoice.invoice_date)}</span>
              </div>
              <div className="info-row">
                <span className="label">تاريخ الاستحقاق:</span>
                <span className="value">{formatDate(invoice.due_date)}</span>
              </div>
              {invoice.reference && (
                <div className="info-row">
                  <span className="label">المرجع:</span>
                  <span className="value">{invoice.reference}</span>
                </div>
              )}
            </div>
          </div>

          {/* معلومات العميل */}
          <div className="info-section">
            <h3>
              <User size={18} />
              معلومات العميل
            </h3>
            <div className="info-content">
              <div className="info-row">
                <span className="label">الاسم:</span>
                <span className="value">{invoice.client?.name}</span>
              </div>
              {invoice.client?.email && (
                <div className="info-row">
                  <span className="label">البريد:</span>
                  <span className="value">{invoice.client.email}</span>
                </div>
              )}
              {invoice.client?.phone && (
                <div className="info-row">
                  <span className="label">الهاتف:</span>
                  <span className="value">{invoice.client.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* التفاصيل المالية */}
          <div className="info-section">
            <h3>
              <DollarSign size={18} />
              التفاصيل المالية
            </h3>
            <div className="info-content">
              <div className="info-row">
                <span className="label">المبلغ الأساسي:</span>
                <span className="value">{formatAmount(invoice.subtotal)} ر.س</span>
              </div>
              {invoice.discount > 0 && (
                <div className="info-row">
                  <span className="label">الخصم:</span>
                  <span className="value discount">-{formatAmount(invoice.discount)} ر.س</span>
                </div>
              )}
              <div className="info-row">
                <span className="label">المبلغ الخاضع للضريبة:</span>
                <span className="value">{formatAmount(invoice.taxable_amount)} ر.س</span>
              </div>
              <div className="info-row">
                <span className="label">ضريبة القيمة المضافة ({invoice.vat_rate}%):</span>
                <span className="value">{formatAmount(invoice.vat_amount)} ر.س</span>
              </div>
              <div className="info-row total">
                <span className="label">الإجمالي:</span>
                <span className="value">{formatAmount(invoice.total_amount)} ر.س</span>
              </div>
            </div>
          </div>

          {/* العقد المرتبط */}
          {invoice.contract && (
            <div className="info-section">
              <h3>
                <FileText size={18} />
                العقد المرتبط
              </h3>
              <div className="info-content">
                <div className="info-row">
                  <span className="label">رقم العقد:</span>
                  <span className="value">{invoice.contract.contract_number}</span>
                </div>
                <button
                  className="btn-link"
                  onClick={() => navigate(`/contracts/${invoice.contract?.id}`)}
                >
                  عرض العقد
                </button>
              </div>
            </div>
          )}
        </div>

        {/* قائمة المدفوعات */}
        <div className="payments-section">
          <div className="section-header">
            <h3>
              <CreditCard size={18} />
              المدفوعات ({invoice.payments?.length || 0})
            </h3>
            {['pending', 'partial', 'overdue'].includes(invoice.status) && (
              <button
                className="btn-primary btn-sm"
                onClick={() => setShowPaymentModal(true)}
              >
                <Plus size={16} />
                تسجيل دفعة
              </button>
            )}
          </div>

          {invoice.payments && invoice.payments.length > 0 ? (
            <div className="payments-list">
              {invoice.payments.map((payment: Payment) => {
                const paymentStatus = PAYMENT_STATUS_CONFIG[payment.status];
                return (
                  <div key={payment.id} className="payment-card">
                    <div className="payment-header">
                      <span className="payment-number">{payment.payment_number}</span>
                      <span
                        className="payment-status"
                        style={{
                          backgroundColor: paymentStatus.bg,
                          color: paymentStatus.color,
                        }}
                      >
                        {paymentStatus.label}
                      </span>
                    </div>
                    <div className="payment-content">
                      <div className="payment-amount">
                        {formatAmount(payment.amount)} ر.س
                      </div>
                      <div className="payment-details">
                        <span>
                          <Calendar size={12} />
                          {formatDate(payment.payment_date)}
                        </span>
                        <span>
                          <CreditCard size={12} />
                          {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                        </span>
                      </div>
                      {payment.reference && (
                        <div className="payment-reference">
                          المرجع: {payment.reference}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-payments">
              <CreditCard size={32} />
              <p>لا توجد مدفوعات مسجلة</p>
            </div>
          )}
        </div>

        {/* الملاحظات */}
        {(invoice.notes || invoice.internal_notes) && (
          <div className="notes-section">
            {invoice.notes && (
              <div className="note-block">
                <h4>ملاحظات</h4>
                <p>{invoice.notes}</p>
              </div>
            )}
            {invoice.internal_notes && (
              <div className="note-block internal">
                <h4>ملاحظات داخلية</h4>
                <p>{invoice.internal_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* عرض الفاتورة */}
      {showInvoiceView && (
        <InvoiceView
          invoice={invoice}
          onClose={() => setShowInvoiceView(false)}
          firmInfo={firmInfo || undefined}
        />
      )}

      {/* مودال الدفعة */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handleSubmitPayment}
          loading={isSubmittingPayment}
        />
      )}

      {/* مودال إرسال الفاتورة */}
      {showSendModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowSendModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px',
              direction: 'rtl',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>
              إرسال الفاتورة للعميل
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              اختر طريقة الإرسال:
            </p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setSendMethod('email')}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: `2px solid ${sendMethod === 'email' ? '#1d4ed8' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  backgroundColor: sendMethod === 'email' ? '#dbeafe' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Send size={24} color={sendMethod === 'email' ? '#1d4ed8' : '#6b7280'} />
                <span style={{ color: sendMethod === 'email' ? '#1d4ed8' : '#374151' }}>
                  بريد إلكتروني
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSendMethod('whatsapp')}
                style={{
                  flex: 1,
                  padding: '16px',
                  border: `2px solid ${sendMethod === 'whatsapp' ? '#1d4ed8' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  backgroundColor: sendMethod === 'whatsapp' ? '#dbeafe' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Send size={24} color={sendMethod === 'whatsapp' ? '#1d4ed8' : '#6b7280'} />
                <span style={{ color: sendMethod === 'whatsapp' ? '#1d4ed8' : '#374151' }}>
                  واتساب
                </span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSendInvoice}
                disabled={isSending}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#1d4ed8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSending ? 'not-allowed' : 'pointer',
                  opacity: isSending ? 0.7 : 1,
                }}
              >
                {isSending ? 'جاري الإرسال...' : 'إرسال'}
              </button>
              <button
                onClick={() => setShowSendModal(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetail;
