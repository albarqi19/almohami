import { useEffect, useState } from 'react';

/**
 * useIsDesktop — كشف الشاشات الكبيرة (اللوحة القابلة للتخصيص سطح مكتب فقط؛
 * الجوال يبقى على اللوحة الكلاسيكية بقرار المالك).
 */
export function useIsDesktop(minWidth = 1024): boolean {
    const query = `(min-width: ${minWidth}px)`;
    const [isDesktop, setIsDesktop] = useState<boolean>(() =>
        typeof window !== 'undefined' ? window.matchMedia(query).matches : true
    );

    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mql.addEventListener('change', onChange);
        setIsDesktop(mql.matches);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);

    return isDesktop;
}

export default useIsDesktop;
