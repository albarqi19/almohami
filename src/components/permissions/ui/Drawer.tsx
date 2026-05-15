import React, { useEffect } from 'react';
import { DensePanel } from './DensePanel';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  width?: number;
  children: React.ReactNode;
}

/**
 * Drawer من اليمين (RTL) لعرض تفاصيل/نماذج بدون مغادرة الصفحة.
 * بستايل ERP الكثيف.
 */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  footer,
  width = 380,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="erp-perm"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--erp-backdrop, rgba(0, 0, 0, 0.45))',
          backdropFilter: 'blur(2px)',
        }}
      />
      <aside
        style={{
          position: 'relative',
          marginInlineStart: 'auto',
          width,
          maxWidth: '100%',
          height: '100%',
          background: 'var(--color-surface, #fff)',
          color: 'var(--color-text, #212121)',
          boxShadow: '-8px 0 24px var(--color-primary-soft, rgba(0,0,0,0.08))',
          animation: 'erpDrawerIn 0.18s ease-out',
          borderInlineStart: '1px solid var(--color-border, #e5e7eb)',
        }}
      >
        <DensePanel title={title} subtitle={subtitle} onClose={onClose} footer={footer}>
          {children}
        </DensePanel>
      </aside>
      <style>{`@keyframes erpDrawerIn { from { transform: translateX(8%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
};
