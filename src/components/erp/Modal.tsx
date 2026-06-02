// [P4·UX-08] مودال كثيف موحّد (ERP Dense) — overlay + رأس + جسم + فوتر، بلا تبويبات داخلية.
import React from 'react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: LucideIcon;
  size?: 'narrow' | 'default' | 'wide';
  footer?: React.ReactNode;
  footerAlign?: 'start' | 'end';
  children: React.ReactNode;
  /** إغلاق عند النقر على الخلفية (افتراضي true). */
  closeOnOverlay?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  open, onClose, title, icon: Icon, size = 'default', footer, footerAlign = 'start', children, closeOnOverlay = true,
}) => {
  const ref = useClickOutside<HTMLDivElement>(() => {
    if (closeOnOverlay) onClose();
  }, open);

  if (!open) return null;

  const sizeClass = size === 'wide' ? ' fin-modal--wide' : size === 'narrow' ? ' fin-modal--narrow' : '';

  return (
    <div className="fin-modal-overlay">
      <div className={`fin-modal${sizeClass}`} ref={ref} role="dialog" aria-modal="true">
        <div className="fin-modal__header">
          <div className="fin-modal__title">
            {Icon && <Icon size={18} />}
            {title}
          </div>
          <button type="button" className="fin-modal__close" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <div className="fin-modal__body">{children}</div>
        {footer && (
          <div className={`fin-modal__footer${footerAlign === 'end' ? ' fin-modal__footer--end' : ''}`}>{footer}</div>
        )}
      </div>
    </div>
  );
};

export default Modal;
