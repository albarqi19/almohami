import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  headerActions?: React.ReactNode;
  /** z-index override (default 50). ارفعه إذا كان Modal مفتوحاً فوق Drawer/Panel آخر. */
  zIndex?: number;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', headerActions, zIndex = 50 }) => {
  const sizeClasses = {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '600px' },
    lg: { maxWidth: '800px' },
    xl: { maxWidth: '1200px' }
  };

  const currentSizeStyle = sizeClasses[size];

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(3px)',
              zIndex,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              style={{
                width: '100%',
                ...currentSizeStyle,
                maxHeight: '90vh',
                backgroundColor: 'var(--color-surface)',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                overflow: 'hidden',
                margin: '0 auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface-subtle)'
              }}>
                <h2 style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--color-text)',
                  margin: 0,
                  letterSpacing: '0.2px'
                }}>
                  {title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {headerActions}
                  <button
                    onClick={onClose}
                    style={{
                      padding: '4px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--color-text-secondary)',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-error)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div style={{
                overflowY: 'auto',
                maxHeight: 'calc(90vh - 45px)',
                padding: '16px 20px'
              }}>
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
