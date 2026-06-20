import React from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  /** سطر ثانوي توضيحي (اختياري) */
  note?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = أحمر (حذف) | primary = أساسي (تأكيد عادي/تحويل) */
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * مودال تأكيد داخل الموقع (بديل window.confirm) — مثيّم بمتغيّرات CSS لكل الثيمات،
 * ومضغوط بأسلوب ERP. يُستخدم للحذف/التحويل وأي إجراء يحتاج تأكيداً.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  note,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'primary',
  loading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const accent = isDanger ? 'var(--status-red, #dc2626)' : 'var(--law-navy, #1E3A5F)';

  return (
    <div
      onClick={() => !loading && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface, #fff)', borderRadius: 10, width: '100%', maxWidth: 420,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
          <AlertTriangle size={16} style={{ color: accent, flexShrink: 0 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text, #111827)', flex: 1 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="إغلاق"
            style={{ background: 'transparent', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--color-text-secondary, #64748b)', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', fontSize: 13, color: 'var(--color-text, #111827)', lineHeight: 1.7 }}>
          <div>{message}</div>
          {note && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary, #64748b)' }}>{note}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--color-border, #e5e7eb)', background: 'rgba(0,0,0,0.015)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '7px 16px', fontSize: 13, borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              border: '1px solid var(--color-border, #e5e7eb)', background: 'transparent',
              color: 'var(--color-text-secondary, #64748b)', opacity: loading ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 18px', fontSize: 13, fontWeight: 600, borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer', border: 'none', color: '#fff',
              background: accent, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && <Loader2 size={13} className="spinning" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
