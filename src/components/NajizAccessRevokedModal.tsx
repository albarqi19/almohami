import React from 'react';
import { Lock, X } from 'lucide-react';

/** رمز الخطأ الذي يُرجعه الباك عند محاولة فتح قضية انقطعت العلاقة بها. */
export const NAJIZ_ACCESS_REVOKED_CODE = 'NAJIZ_ACCESS_REVOKED';

interface Props {
  isOpen: boolean;
  /** عنوان القضية ورقمها — للعرض فقط، وهما كل ما يُسمح بإظهاره. */
  caseTitle?: string | null;
  fileNumber?: string | null;
  onClose: () => void;
}

/**
 * نافذة «انقطعت العلاقة بالقضية».
 *
 * تظهر فور الضغط على القضية — قبل أي انتقال — لأن بياناتها لم تُجلب أصلاً من
 * ناجز، فلا شيء يُعرض. مبنية على نمط ConfirmDialog لكنها إخبارية: زرّ واحد.
 */
const NajizAccessRevokedModal: React.FC<Props> = ({ isOpen, caseTitle, fileNumber, onClose }) => {
  if (!isOpen) return null;

  const accent = 'var(--status-red, #dc2626)';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        style={{
          background: 'var(--color-surface, #fff)', borderRadius: 10, width: '100%', maxWidth: 460,
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--color-border, #e5e7eb)' }}>
          <Lock size={16} style={{ color: accent, flexShrink: 0 }} />
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text, #111827)', flex: 1 }}>
            لا يمكن فتح هذه القضية
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary, #64748b)', padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px', fontSize: 13, color: 'var(--color-text, #111827)', lineHeight: 1.75 }}>
          <div>
            <b>انتهت علاقتك بهذه القضية في ناجز</b>، فلا يمكن فتحها أو عرض بياناتها.
          </div>

          {(caseTitle || fileNumber) && (
            <div
              style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 6,
                background: 'var(--color-surface-alt, #f8fafc)',
                border: '1px solid var(--color-border, #e5e7eb)',
                fontSize: 12.5,
              }}
            >
              {caseTitle && <div style={{ fontWeight: 600 }}>{caseTitle}</div>}
              {fileNumber && (
                <div style={{ color: 'var(--color-text-secondary, #64748b)', direction: 'ltr', textAlign: 'right' }}>
                  {fileNumber}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-secondary, #64748b)' }}>
            انتهت الوكالة أو فُسِخت، وقد تكون القضية انتقلت إلى وكيل آخر. لذلك لم تُجلب
            بياناتها من ناجز أصلاً.
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary, #64748b)' }}>
            تبقى القضية في سجلّ المكتب وتُحتسب في تقارير الأداء. وإن كانت الوكالة سارية لدى
            محامٍ آخر لديكم، فليُشغّل المزامنة من حسابه في ناجز ليُرفع الحجب تلقائياً.
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', borderTop: '1px solid var(--color-border, #e5e7eb)', background: 'rgba(0,0,0,0.015)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 22px', fontSize: 13, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
              border: 'none', color: '#fff', background: 'var(--law-navy, #1E3A5F)',
            }}
          >
            فهمت
          </button>
        </div>
      </div>
    </div>
  );
};

export default NajizAccessRevokedModal;
