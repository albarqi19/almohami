// [P4·UX-10] إدارة اختيار صفوف الجدول (للإجراءات المجمّعة).
import { useCallback, useState } from 'react';

export function useRowSelection<K extends string | number = number>() {
  const [selectedKeys, setSelectedKeys] = useState<Set<K>>(new Set());

  const toggle = useCallback((key: K) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAll = useCallback((keys: K[]) => {
    setSelectedKeys((prev) => {
      const allSelected = keys.length > 0 && keys.every((k) => prev.has(k));
      return allSelected ? new Set<K>() : new Set(keys);
    });
  }, []);

  const clear = useCallback(() => setSelectedKeys(new Set()), []);

  return { selectedKeys, toggle, toggleAll, clear, count: selectedKeys.size };
}
