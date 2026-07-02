import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scale, Loader2, AlertTriangle } from 'lucide-react';
import { LegalServiceService } from '../../services/legalServiceService';
import { getApiErrorMessage } from '../../utils/apiError';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConvertToCaseModalProps {
  serviceId: number;
  serviceTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Case type options ────────────────────────────────────────────────────────

const CASE_TYPE_OPTIONS = [
  { value: 'civil', label: 'مدنية' },
  { value: 'commercial', label: 'تجارية' },
  { value: 'criminal', label: 'جنائية' },
  { value: 'family', label: 'أسرية' },
  { value: 'administrative', label: 'إدارية' },
  { value: 'labor', label: 'عمالية' },
  { value: 'real_estate', label: 'عقارية' },
  { value: 'other', label: 'أخرى' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const ConvertToCaseModal: React.FC<ConvertToCaseModalProps> = ({
  serviceId,
  serviceTitle,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState(serviceTitle);
  const [caseType, setCaseType] = useState('civil');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // عند كل فتح: صفّر الخطأ السابق وأعد تعبئة العنوان من الخدمة — حتى لا تظهر رسالة قديمة مضلِّلة
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setTitle(serviceTitle);
      setDescription('');
    }
  }, [isOpen, serviceTitle]);

  const canSubmit = title.trim().length > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    try {
      await LegalServiceService.convertToCase(serviceId, {
        title: title.trim() || undefined,
        case_type: caseType || undefined,
        description: description.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      // رسالة الباك العربية تظهر داخل المودال نفسه (مثل: «هذه الخدمة محوّلة إلى قضية بالفعل»
      // أو «هذا النوع من الخدمات لا يُحوّل إلى قضية») — لا فشل صامتاً ولا نصاً عاماً
      setError(getApiErrorMessage(err, 'تعذّر تحويل الخدمة إلى قضية'));
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
            // لا تُغلق بالنقر على الخلفية أثناء التحويل — حتى لا يظن المستخدم أن العملية أُلغيت
            if (e.target === e.currentTarget && !loading) onClose();
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
                  <Scale size={16} />
                </div>
                <div>
                  <div className="asm-header-title">تحويل إلى قضية</div>
                  <div className="asm-header-subtitle">{serviceTitle}</div>
                </div>
              </div>
              <button
                className="asm-header-close"
                onClick={onClose}
                type="button"
                disabled={loading}
                title={loading ? 'انتظر انتهاء التحويل' : 'إغلاق'}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="asm-body" style={{ padding: '24px 28px 20px' }}>

                {/* ماذا سيحدث؟ — شرح مسبق يزيل الغموض قبل الضغط */}
                <p
                  style={{
                    margin: '0 0 16px',
                    fontSize: 12.5,
                    lineHeight: 1.7,
                    color: 'var(--color-text-secondary)',
                    background: 'var(--quiet-gray-50)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  سيُنشأ ملف قضية جديد مرتبط بهذه الخدمة (بنفس العميل)، وتبقى الخدمة وسجلّها كما هي.
                </p>

                <div className="asm-field-group single">

                  {/* عنوان القضية */}
                  <div className="asm-field">
                    <label className="asm-label">عنوان القضية</label>
                    <input
                      className="asm-input"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="عنوان القضية الجديدة"
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* نوع القضية */}
                  <div className="asm-field">
                    <label className="asm-label">نوع القضية</label>
                    <select
                      className="asm-select"
                      value={caseType}
                      onChange={(e) => setCaseType(e.target.value)}
                      disabled={loading}
                    >
                      {CASE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* الوصف */}
                  <div className="asm-field">
                    <label className="asm-label">الوصف</label>
                    <textarea
                      className="asm-textarea"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="وصف القضية (اختياري)..."
                      style={{ minHeight: 80 }}
                      disabled={loading}
                    />
                  </div>

                </div>

                {/* خطأ الخادم — يُعرض داخل المودال بجوار سبب الفشل */}
                {error && (
                  <div
                    className="asm-error-msg"
                    role="alert"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="asm-footer">
                <button
                  className="asm-btn-secondary"
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  title={loading ? 'انتظر انتهاء التحويل' : undefined}
                >
                  إلغاء
                </button>
                <div className="asm-footer-right">
                  <button
                    className="asm-btn-primary"
                    type="submit"
                    disabled={!canSubmit}
                    title={
                      loading
                        ? 'جارٍ التحويل — انتظر لحظة'
                        : !title.trim()
                          ? 'أدخل عنوان القضية أولاً'
                          : undefined
                    }
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="asm-spinner" />
                        جاري التحويل...
                      </>
                    ) : (
                      <>
                        <Scale size={14} />
                        تحويل إلى قضية
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

export default ConvertToCaseModal;
