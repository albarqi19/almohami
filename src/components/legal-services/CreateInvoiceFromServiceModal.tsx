import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Loader2 } from 'lucide-react';
import { LegalServiceService } from '../../services/legalServiceService';
import '../../styles/add-service-modal.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CreateInvoiceFromServiceModalProps {
  serviceId: number;
  serviceTitle: string;
  agreedAmount?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
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
  const [amount, setAmount] = useState(agreedAmount ?? '');
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await LegalServiceService.createInvoice(serviceId, {
        title: title.trim() || undefined,
        amount: amount ? Number(amount) : undefined,
        due_date: dueDate || undefined,
        description: description.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'حدث خطأ أثناء إنشاء الفاتورة');
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

                  {/* المبلغ */}
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
                        placeholder="0.00"
                      />
                      <span className="asm-currency-badge">ر.س</span>
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

                {/* Error */}
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
                    disabled={loading}
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
