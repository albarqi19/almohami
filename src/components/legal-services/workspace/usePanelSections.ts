import { useCallback, useState } from 'react';

/** حالة طيّ اللوحات محفوظة في localStorage بمفتاح لكل مساحة — التفضيل رفاهية، ففشل التخزين يُبتلع. */
export function usePanelSections(storageKey: string) {
  const [sections, setSections] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}') as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  const toggle = useCallback(
    (id: string) =>
      setSections((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* التفضيل رفاهية */
        }
        return next;
      }),
    [storageKey],
  );

  const open = useCallback((id: string) => setSections((prev) => ({ ...prev, [id]: false })), []);

  return { sections, toggle, open };
}
