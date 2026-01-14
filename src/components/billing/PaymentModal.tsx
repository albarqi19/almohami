import React, { useState, useRef } from 'react';
import { X, Upload, CreditCard, Building, Banknote, Smartphone, FileText } from 'lucide-react';
import type { CaseInvoice, PaymentMethod, CreatePaymentData } from '../../types/billing';

export interface PaymentModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit?: (data: CreatePaymentData, receiptFile?: File) => Promise<void>;
  onSuccess?: () => void;
  invoice: CaseInvoice;
  loading?: boolean;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: 'bank_transfer', label: 'تحويل بنكي', icon: <Building size={18} /> },
  { value: 'cash', label: 'نقداً', icon: <Banknote size={18} /> },
  { value: 'check', label: 'شيك', icon: <FileText size={18} /> },
  { value: 'card', label: 'بطاقة ائتمانية', icon: <CreditCard size={18} /> },
  { value: 'mada', label: 'مدى', icon: <CreditCard size={18} /> },
  { value: 'apple_pay', label: 'Apple Pay', icon: <Smartphone size={18} /> },
  { value: 'stc_pay', label: 'STC Pay', icon: <Smartphone size={18} /> },
  { value: 'online', label: 'دفع إلكتروني', icon: <CreditCard size={18} /> },
];

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen = true,
  onClose,
  onSubmit,
  onSuccess,
  invoice,
  loading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CreatePaymentData>({
    case_invoice_id: invoice.id,
    amount: invoice.remaining_amount,
    payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    status: 'pending',
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'المبلغ مطلوب ويجب أن يكون أكبر من صفر';
    } else if (formData.amount > invoice.remaining_amount) {
      newErrors.amount = `المبلغ أكبر من المتبقي (${formatAmount(invoice.remaining_amount)} ر.س)`;
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'تاريخ الدفع مطلوب';
    }

    if (formData.payment_method === 'check') {
      if (!formData.check_number) {
        newErrors.check_number = 'رقم الشيك مطلوب';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (onSubmit) {
        await onSubmit(formData, receiptFile || undefined);
      }
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // التحقق من نوع الملف
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setErrors({ ...errors, receipt: 'يجب أن يكون الملف صورة أو PDF' });
        return;
      }
      // التحقق من حجم الملف (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, receipt: 'حجم الملف يجب أن لا يتجاوز 5 ميجابايت' });
        return;
      }
      setReceiptFile(file);
      setErrors({ ...errors, receipt: '' });
    }
  };

  return (
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
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto',
          direction: 'rtl',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 1,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              تسجيل دفعة جديدة
            </h3>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              فاتورة رقم {invoice.invoice_number}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* معلومات الفاتورة */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>إجمالي الفاتورة</div>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>
                {formatAmount(invoice.total_amount)} ر.س
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>المدفوع</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#10b981' }}>
                {formatAmount(invoice.paid_amount)} ر.س
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>المتبقي</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#ef4444' }}>
                {formatAmount(invoice.remaining_amount)} ر.س
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* المبلغ */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '6px',
              }}
            >
              المبلغ (ريال) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
              }
              max={invoice.remaining_amount}
              step="0.01"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.amount ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: '8px',
                fontSize: '16px',
              }}
            />
            {errors.amount && (
              <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.amount}</span>
            )}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, amount: invoice.remaining_amount })}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#374151',
              }}
            >
              دفع المبلغ المتبقي بالكامل
            </button>
          </div>

          {/* طريقة الدفع */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '6px',
              }}
            >
              طريقة الدفع <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
              }}
            >
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_method: method.value })}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '12px 8px',
                    border: `2px solid ${
                      formData.payment_method === method.value ? '#1d4ed8' : '#e5e7eb'
                    }`,
                    borderRadius: '8px',
                    backgroundColor:
                      formData.payment_method === method.value ? '#dbeafe' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{
                      color:
                        formData.payment_method === method.value ? '#1d4ed8' : '#6b7280',
                    }}
                  >
                    {method.icon}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color:
                        formData.payment_method === method.value ? '#1d4ed8' : '#374151',
                    }}
                  >
                    {method.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* حقول إضافية حسب طريقة الدفع */}
          {formData.payment_method === 'bank_transfer' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  اسم البنك
                </label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  رقم العملية
                </label>
                <input
                  type="text"
                  value={formData.transaction_id || ''}
                  onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}

          {formData.payment_method === 'check' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  رقم الشيك <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.check_number || ''}
                  onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${errors.check_number ? '#ef4444' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
                {errors.check_number && (
                  <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.check_number}</span>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  تاريخ الشيك
                </label>
                <input
                  type="date"
                  value={formData.check_date || ''}
                  onChange={(e) => setFormData({ ...formData, check_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}

          {/* تاريخ الدفع */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '6px',
              }}
            >
              تاريخ الدفع <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.payment_date ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
            {errors.payment_date && (
              <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.payment_date}</span>
            )}
          </div>

          {/* رقم المرجع */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '6px',
              }}
            >
              رقم المرجع
            </label>
            <input
              type="text"
              value={formData.reference || ''}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="اختياري"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          {/* رفع الإيصال */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '6px',
              }}
            >
              إيصال الدفع
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                border: '2px dashed #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6b7280',
              }}
            >
              <Upload size={18} />
              {receiptFile ? receiptFile.name : 'اختر ملف أو اسحبه هنا'}
            </button>
            {errors.receipt && (
              <span style={{ fontSize: '12px', color: '#ef4444' }}>{errors.receipt}</span>
            )}
          </div>

          {/* ملاحظات */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '6px',
              }}
            >
              ملاحظات
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="ملاحظات إضافية..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* الأزرار */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'جاري الحفظ...' : 'تسجيل الدفعة'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
