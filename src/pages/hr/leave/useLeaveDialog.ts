import { useCallback, useEffect, useId, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';

/**
 * سلوكُ الحوار المشترك لمودالات الوحدة ولوح الحركات — موضعٌ واحدٌ بدل أربع نسخ.
 *
 * **ليس `<dialog>`**: العنصرُ الأصليّ يقفز في RTL ويأخذ طبقةَ `::backdrop` خارجَ شجرة
 * الثيم، والعرفُ القائم في المستودع (`ContractsTab` · `EditEmployeeModal` · `HolidaysModal`)
 * هو `div.hr-modal-overlay > div.hr-modal`. فالسلوكُ الذي يمنحه `<dialog>` مجّاناً
 * (حبسُ التركيز · `Esc` · إعادةُ التركيز) يُكتب هنا مرّةً واحدة.
 *
 * · `Esc` يُغلق — ولا يُلتقط على مستوى النافذة كي لا يُغلق حوارَين متداخلين معاً.
 * · `Tab` محبوسٌ داخل الحاوية دوراناً في الاتجاهين.
 * · `Ctrl/⌘ + Enter` يحفظ — اختصارُ اللوحة لِما يفعله زرُّ التذييل، بلا سلوكٍ ثالث.
 * · التركيزُ يعود إلى العنصر الذي فتح الحوار عند الإغلاق (لا إلى أوّل الصفحة).
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'details > summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface LeaveDialogOptions {
  onClose: () => void;
  /** يُنادى بـ`Ctrl/⌘ + Enter`. غيابُه يُعطّل الاختصار (لوحُ القراءة لا يحفظ). */
  onSubmit?: () => void;
  /** يُعطَّل الاختصارُ أثناء الحفظ فلا يُرسَل الطلبُ مرّتين. */
  busy?: boolean;
}

export interface LeaveDialogShell<T extends HTMLElement> {
  ref: RefObject<T | null>;
  titleId: string;
  onKeyDown: (event: ReactKeyboardEvent<T>) => void;
}

export function useLeaveDialog<T extends HTMLElement = HTMLDivElement>(
  options: LeaveDialogOptions
): LeaveDialogShell<T> {
  const { onClose, onSubmit, busy } = options;
  const ref = useRef<T | null>(null);
  const titleId = useId();

  const latest = useRef({ onClose, onSubmit, busy });
  latest.current = { onClose, onSubmit, busy };

  // التركيزُ الأوّل داخل الحاوية، والعودةُ إلى فاتح الحوار عند التفكيك.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = ref.current;

    if (node) {
      const first = node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus({ preventScroll: true });
    }

    return () => {
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<T>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      latest.current.onClose();
      return;
    }

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      const submit = latest.current.onSubmit;
      if (submit && latest.current.busy !== true) {
        event.preventDefault();
        submit();
      }
      return;
    }

    if (event.key !== 'Tab') return;

    const node = ref.current;
    if (!node) return;

    const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  return { ref, titleId, onKeyDown };
}

export default useLeaveDialog;
