import React from 'react';
import { X } from 'lucide-react';

interface DensePanelProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Side panel/drawer متناسق مع ستايل ERP الكثيف.
 * يُستخدم لعرض تفاصيل العنصر المحدد بدل modals كبيرة.
 */
export const DensePanel: React.FC<DensePanelProps> = ({ title, subtitle, onClose, footer, children }) => {
  return (
    <div className="erp-panel">
      <div className="erp-panel__header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="erp-panel__title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ fontSize: 'var(--erp-text-xs)', color: 'var(--erp-text-muted)', margin: '2px 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
        {onClose && (
          <button className="erp-panel__close" onClick={onClose} aria-label="إغلاق">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="erp-panel__body">{children}</div>
      {footer && <div className="erp-panel__footer">{footer}</div>}
    </div>
  );
};

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, children }) => (
  <div className="erp-field">
    <label className="erp-field__label">{label}</label>
    <div className="erp-field__value">{children}</div>
  </div>
);
