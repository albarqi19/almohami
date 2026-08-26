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
  /** عدّادٌ يُعرض في آخر السطر — لا يُعرض إن كان صفراً أو غيرَ معرَّف. */
  count?: number;
  /** صنفُ لونٍ للأيقونة (مثل `case-header-tab__icon--purple`). */
  iconClassName?: string;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** أيقونة الزر (افتراضي ثلاث نقاط). */
  trigger?: LucideIcon;
  label?: string;
  onOpenChange?: (open: boolean) => void;
  /**
   * صنفُ زرِّ الفتح — لتلبيسه بزيّ الصفحة المضيفة.
   *
   * أُضيف ليُستعمل في ترويسة القضية بصنف `case-header-tab` بدل بناء منسدلةٍ
   * ثانيةٍ هناك: منطقُ البوابة والمرساة وإغلاقِ النقر الخارجي محلولٌ هنا مرّةً
   * (انظر رأس الملفّ و`useAnchoredMenu`)، وتكرارُه يعني تكرارَ فخّ القصّ.
   */
  triggerClassName?: string;
  /** نصٌّ بجانب الأيقونة في زرّ الفتح — بلا نصٍّ يبقى الزرُّ أيقونةً كما كان. */
  triggerLabel?: string;
  /** عدّادٌ على زرّ الفتح — لا يُعرض إن كان صفراً أو غيرَ معرَّف. */
  badge?: number;
  /** أيقونةٌ تُلحق بآخر الزرّ (سهمُ منسدلةٍ مثلاً). */
  triggerAfter?: LucideIcon;
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  trigger: Trigger = MoreVertical,
  label,
  onOpenChange,
  triggerClassName = 'fin-menu__trigger',
  triggerLabel,
  badge,
  triggerAfter: TriggerAfter,
}) => {
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
              {Icon && (
                item.iconClassName
                  ? <span className={item.iconClassName}><Icon size={15} /></span>
                  : <Icon size={15} />
              )}
              <span className="fin-menu__item-label">{item.label}</span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span className="fin-menu__item-count">{item.count}</span>
              )}
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
        className={triggerClassName}
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
        {triggerLabel && <span>{triggerLabel}</span>}
        {typeof badge === 'number' && badge > 0 && (
          <span className="fin-menu__badge">{badge}</span>
        )}
        {TriggerAfter && <TriggerAfter size={13} />}
      </button>
      {dropdown}
    </div>
  );
};

export default ActionMenu;
