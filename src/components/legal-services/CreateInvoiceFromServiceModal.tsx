import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Loader2, AlertTriangle, Info, Clock } from 'lucide-react';
import { LegalServiceService } from '../../services/legalServiceService';
import { apiClient } from '../../utils/api';
import { getApiErrorMessage } from '../../utils/apiError';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateInvoiceFromServiceModalProps {
  serviceId: number;
  serviceTitle: string;
  agreedAmount?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** حمولة معاينة الفاتورة — GET /legal-services/{id}/invoice-preview */
interface InvoicePreview {
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  basis: string;
  basis_arabic: string;
  billable_hours: number | null;
  has_existing_invoice: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

/** تنسيق مبلغ بخانتين عشريتين للعرض */
function fmtMoney(n: number): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ────────────────────────────────────────────────────────────────

const CreateInvoiceFromServiceModal: React.FC<CreateInvoiceFromServiceModalProps> = ({
  serviceId,
  serviceTitle,
  agreedAmount,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState(`فاتورة - ${serviceTitle}`);
  // المبلغ اختياري — يُترك فارغاً ليحسبه الخادم (المتفق عليه / الساعات / التدريب)
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // معاينة الفاتورة — الخادم مصدر الحقيقة في الحساب
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // آخر مبلغ طُلبت به المعاينة — يمنع طلباً مكرراً عند الفتح (effect المبلغ يعمل عند mount أيضاً)
  const lastFetchedAmountRef = useRef<number | null>(null);

  // هل أدخل المستخدم مبلغاً صالحاً صراحةً؟
  const userAmount = amount.trim() !== '' && !Number.isNaN(Number(amount)) && Number(amount) >= 0
    ? Number(amount)
    : null;

  /** جلب المعاينة من الخادم (مع مبلغ يدوي اختياري) */
  const fetchPreview = async (explicitAmount: number | null) => {
    lastFetchedAmountRef.current = explicitAmount;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const q = explicitAmount !== null ? `?amount=${encodeURIComponent(explicitAmount)}` : '';
      const res = await apiClient.get<{ success: boolean; data: InvoicePreview }>(
        `/legal-services/${serviceId}/invoice-preview${q}`
      );
      setPreview(res.data);
    } catch (err) {
      setPreview(null);
      setPreviewError(getApiErrorMessage(err, 'تعذّر جلب معاينة الفاتورة'));
    } finally {
      setPreviewLoading(false);
    }
  };

  // عند فتح المودال: تصفير الحالة وجلب المعاينة الأولى (بلا مبلغ — الخادم يقرر الأساس)
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setPreview(null);
    setPreviewError(null);
    setAmount('');
    fetchPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, serviceId]);

  // إعادة المعاينة عند تغيير المبلغ اليدوي (debounce بسيط 450ms)
  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // لا نعيد الطلب إن كان نفس المبلغ الذي عُوينت به آخر مرة
      if (userAmount !== lastFetchedAmountRef.current) {
        fetchPreview(userAmount);
      }
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount]);

  // تحذير الصفر: لا أساس فوترة ولا مبلغ يدوي → نعطّل الإنشاء حتى يُدخل مبلغاً
  const zeroTotal = preview !== null && preview.total <= 0 && userAmount === null;
  const submitDisabled = loading || zeroTotal;
  const submitTitle = zeroTotal
    ? 'لا يوجد أساس فوترة — أدخل مبلغاً يدوياً لتفعيل الإنشاء'
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await LegalServiceService.createInvoice(serviceId, {
        title: title.trim() || undefined,
        // لا نرسل amount إلا إذا أدخله المستخدم صراحةً — الخادم يحسب البقية (ساعات/متفق عليه)
        amount: userAmount !== null ? userAmount : undefined,
        due_date: dueDate || undefined,
        description: description.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'تعذّر إنشاء الفاتورة'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="asm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="asm-modal"
            style={{ maxWidth: 520 }}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="asm-header">
              <div className="asm-header-left">
                <div className="asm-header-icon">
                  <FileText size={16} />
                </div>
                <div>
                  <div className="asm-header-title">إنشاء فاتورة</div>
                  <div className="asm-header-subtitle">{serviceTitle}</div>
                </div>
              </div>
              <button className="asm-header-close" onClick={onClose} type="button">
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="asm-body" style={{ padding: '24px 28px 20px' }}>

                {/* ─── بطاقة معاينة الفاتورة (الخادم مصدر الحقيقة) ─── */}
                <div
                  style={{
                    background: 'var(--dashboard-card)',
                    border: '1px solid var(--quiet-gray-200)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--law-navy)' }}>
                      معاينة الفاتورة
                    </span>
                    {previewLoading && (
                      <Loader2 size={13} className="asm-spinner" style={{ color: 'var(--quiet-gray-500)' }} />
                    )}
                  </div>

                  {previewError ? (
                    <div style={{ fontSize: 12, color: 'var(--status-danger, var(--quiet-gray-700))' }}>
                      {previewError}
                    </div>
                  ) : !preview && previewLoading ? (
                    <div style={{ fontSize: 12, color: 'var(--quiet-gray-500)' }}>
                      جاري حساب المعاينة...
                    </div>
                  ) : preview ? (
                    <>
                      {/* أساس الحساب بالعربية — يجيب «من أين جاء الرقم؟» */}
                      <div style={{ fontSize: 12, color: 'var(--quiet-gray-600)', marginBottom: 8 }}>
                        أساس الحساب: <strong style={{ color: 'var(--law-navy)' }}>{preview.basis_arabic}</strong>
                        {preview.billable_hours !== null && (
                          <span style={{ marginInlineStart: 8, color: 'var(--quiet-gray-500)' }}>
                            <Clock size={11} style={{ verticalAlign: '-2px', marginInlineEnd: 3 }} />
                            {preview.billable_hours} ساعة قابلة للفوترة
                          </span>
                        )}
                      </div>

                      {/* التفصيل المالي */}
                      <div style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--quiet-gray-600)' }}>المبلغ قبل الضريبة</span>
                          <span>{fmtMoney(preview.subtotal)} ر.س</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--quiet-gray-600)' }}>
                            ضريبة القيمة المضافة ({preview.vat_rate}%)
                          </span>
                          <span>{fmtMoney(preview.vat_amount)} ر.س</span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontWeight: 700,
                            borderTop: '1px solid var(--quiet-gray-200)',
                            paddingTop: 6,
                            marginTop: 2,
                            color: 'var(--law-navy)',
                          }}
                        >
                          <span>الإجمالي</span>
                          <span>{fmtMoney(preview.total)} ر.س</span>
                        </div>
                      </div>

                      {/* تحذير الصفر — لا أساس فوترة */}
                      {zeroTotal && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            alignItems: 'flex-start',
                            marginTop: 10,
                            padding: '8px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            background: 'var(--status-warning-bg, var(--quiet-gray-100))',
                            color: 'var(--status-warning, var(--quiet-gray-700))',
                            border: '1px solid var(--quiet-gray-200)',
                          }}
                        >
                          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>
                            لا يوجد أساس فوترة (لا مبلغ متفق ولا ساعات مسجلة).
                            أدخل مبلغاً يدوياً في حقل «المبلغ» لتتمكن من إنشاء الفاتورة.
                          </span>
                        </div>
                      )}

                      {/* تنويه: للخدمة فاتورة قائمة (لا يمنع الإنشاء) */}
                      {preview.has_existing_invoice && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            alignItems: 'flex-start',
                            marginTop: 8,
                            padding: '8px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            background: 'var(--quiet-gray-100)',
                            color: 'var(--quiet-gray-600)',
                            border: '1px solid var(--quiet-gray-200)',
                          }}
                        >
                          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span>للخدمة فاتورة قائمة بالفعل — يمكنك إنشاء فاتورة إضافية إن كان ذلك مقصوداً.</span>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>

                <div className="asm-field-group single">

                  {/* العنوان */}
                  <div className="asm-field">
                    <label className="asm-label">العنوان</label>
                    <input
                      className="asm-input"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="عنوان الفاتورة"
                      required
                    />
                  </div>

                  {/* المبلغ — اختياري: يُترك فارغاً ليحسبه الخادم حسب نوع الفوترة */}
                  <div className="asm-field">
                    <label className="asm-label">المبلغ (ر.س)</label>
                    <div className="asm-input-group">
                      <input
                        className="asm-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={
                          agreedAmount
                            ? `اتركه فارغاً ليُحسب تلقائياً (المتفق عليه: ${agreedAmount})`
                            : 'اتركه فارغاً ليُحسب تلقائياً'
                        }
                      />
                      <span className="asm-currency-badge">ر.س</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--quiet-gray-500)', marginTop: 4 }}>
                      يُستخدم فقط إذا أردت تجاوز الحساب التلقائي — المعاينة أعلاه تتحدّث تلقائياً.
                    </div>
                  </div>

                  {/* تاريخ الاستحقاق */}
                  <div className="asm-field">
                    <label className="asm-label">تاريخ الاستحقاق</label>
                    <input
                      className="asm-input"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  {/* الوصف */}
                  <div className="asm-field">
                    <label className="asm-label">الوصف</label>
                    <textarea
                      className="asm-textarea"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="وصف الفاتورة (اختياري)..."
                      style={{ minHeight: 80 }}
                    />
                  </div>

                </div>

                {/* Error (رسالة الخادم كما هي) */}
                {error && (
                  <div className="asm-error-msg">{error}</div>
                )}
              </div>

              {/* Footer */}
              <div className="asm-footer">
                <button
                  className="asm-btn-secondary"
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                >
                  إلغاء
                </button>
                <div className="asm-footer-right">
                  <button
                    className="asm-btn-primary"
                    type="submit"
                    disabled={submitDisabled}
                    title={submitTitle}
                    style={submitDisabled && !loading ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="asm-spinner" />
                        جاري الإنشاء...
                      </>
                    ) : (
                      <>
                        <FileText size={14} />
                        إنشاء الفاتورة
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateInvoiceFromServiceModal;
