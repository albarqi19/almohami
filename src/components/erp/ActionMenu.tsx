// [P4·UX-08] قائمة إجراءات موحّدة مع إغلاق خارجي — يعالج INV-4.4/PAY-4.4/TPL-4.6.
// [UX-MENU] المنسدلة تُرسم في بوابةٍ على body: كانت تُقصّ داخل حاويات الجدول
// (`.fin-table-wrap{overflow:hidden}` و`.fin-table-scroll{overflow-x:auto}`)
// فلا يراها المستخدم على الصفوف الأخيرة — انظر hooks/useAnchoredMenu.
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAnchoredMenu, useOutsideOfBoth } from '../../hooks/useAnchoredMenu';

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const { triggerRef, menuRef, style } = useAnchoredMenu(open);

  const close = React.useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  // الزرُّ داخل wrapRef والقائمةُ في البوابة — فيلزم فحصُ الاثنين معاً.
  useOutsideOfBoth([wrapRef, menuRef], close, open);

  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return null;

  const dropdown = open && style ? createPortal(
    <div
      ref={menuRef}
      className="fin-menu__dropdown fin-menu__dropdown--floating"
      role="menu"
      style={style}
      // النقرُ داخل القائمة لا يصعد إلى الصفّ: الصفوفُ قابلةٌ للنقر في أكثر من
      // جدول، وبلا الإيقاف كان اختيارُ إجراءٍ يفتح المستندَ أيضاً.
      onClick={(e) => e.stopPropagation()}
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
                close();
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
    </div>,
    document.body,
  ) : null;

  return (
    <div className="fin-menu" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        className="fin-menu__trigger"
        onClick={() => {
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
      {dropdown}
    </div>
  );
};

export default ActionMenu;
