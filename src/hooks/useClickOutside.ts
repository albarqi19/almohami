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
      if (!el || el.contains(event.target as Node)) return;
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
