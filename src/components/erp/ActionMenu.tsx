// [P4·UX-08] قائمة إجراءات موحّدة مع إغلاق خارجي (useClickOutside) — يعالج INV-4.4/PAY-4.4/TPL-4.6.
import React, { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
  /** فاصل قبل هذا العنصر. */
  divider?: boolean;
  /** إخفاء العنصر تماماً (مثلاً غير مسموح بالحالة الحالية). */
  hidden?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** أيقونة الزر (افتراضي ثلاث نقاط). */
  trigger?: LucideIcon;
  label?: string;
  onOpenChange?: (open: boolean) => void;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ items, trigger: Trigger = MoreVertical, label, onOpenChange }) => {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, open);

  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return null;

  return (
    <div className="fin-menu" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="fin-menu__trigger"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          setOpenUp(spaceBelow < 200);
          setOpen((v) => {
            const next = !v;
            onOpenChange?.(next);
            return next;
          });
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
      >
        <Trigger size={16} />
      </button>
      {open && (
        <div 
          className="fin-menu__dropdown" 
          role="menu"
          style={openUp ? { top: 'auto', bottom: 'calc(100% + 4px)' } : {}}
        >
          {visible.map((item, idx) => {
            const Icon = item.icon;
            const variantClass = item.variant && item.variant !== 'default' ? ` fin-menu__item--${item.variant}` : '';
            return (
              <React.Fragment key={`${item.label}-${idx}`}>
                {item.divider && <div className="fin-menu__divider" />}
                <button
                  type="button"
                  className={`fin-menu__item${variantClass}`}
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  role="menuitem"
                >
                  {Icon && <Icon size={15} />}
                  {item.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
