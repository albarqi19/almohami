import React, { lazy, Suspense, useEffect, useState } from 'react';
import { hasPins, subscribePins } from './pinnedStore';

const PinnedWidgetsLayer = lazy(() => import('./PinnedWidgetsLayer'));

/**
 * حارس خفيف يُركَّب في Layout: لا يجلب chunk طبقة الودجتس المثبتة
 * (ومعرض الودجتس الثقيل) إلا إذا ثبّت المستخدم شيئاً فعلاً.
 */
const PinnedWidgetsGate: React.FC = () => {
    const [active, setActive] = useState(hasPins);
    useEffect(() => subscribePins(() => setActive(hasPins())), []);
    if (!active) return null;
    return (
        <Suspense fallback={null}>
            <PinnedWidgetsLayer />
        </Suspense>
    );
};

export default PinnedWidgetsGate;
