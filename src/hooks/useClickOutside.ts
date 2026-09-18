// [P4·UX-08] إغلاق القوائم/المنبثقات عند النقر خارجها (يعالج INV-4.4/PAY-4.4/TPL-4.6).
import { useEffect, useRef } from 'react';

/**
 * يستدعي handler عند النقر/اللمس خارج العنصر المرجعي، ما دام enabled = true.
 * يُرجع ref يُربط بالعنصر الحاوي.
 */
export function useClickOutside<T extends HTMLElement = HTMLDivElement>(
  handler: () => void,
  enabled = true,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      const target = event.target as Node;
      if (!el || el.contains(target)) return;
      // [FIX] القوائم المنسدلة المعلّقة على body (createPortal) تعيش خارج شجرة المودال DOM،
      // فكان اختيار عميل أو قضية من داخل نافذة المصروف يُغلق النافذة كأنه نقرة خارجها.
      // العنصر المحذوف من الصفحة لحظة النقر (خيار اختفى بعد اختياره) لا يُعدّ خارجاً أيضاً.
      const element = target instanceof Element ? target : (target as Node).parentElement;
      if (element && !document.contains(element)) return;
      if (element?.closest('.fin-menu__dropdown--floating, .zatca-menu, [data-floating-layer]')) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler, enabled]);

  return ref;
}

export default useClickOutside;
