import { useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../utils/api';

/**
 * Hook لتتبع حالة الاتصال وإرسال نبضات الحضور
 * يعمل فقط للمحامين والمساعدين القانونيين
 */
export function usePresence() {
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());
    const isActiveRef = useRef<boolean>(true);
    const isVisibleRef = useRef<boolean>(true);

    // حساب الحالة الحالية
    const calculateStatus = useCallback((): 'active' | 'idle' => {
        const now = Date.now();
        const timeSinceActivity = now - lastActivityRef.current;

        // إذا مر أكثر من 60 ثانية بدون نشاط أو التبويب في الخلفية
        if (!isVisibleRef.current || timeSinceActivity > 60000) {
            return 'idle';
        }
        return 'active';
    }, []);

    // إرسال نبضة الحضور
    const sendHeartbeat = useCallback(async (immediate = false) => {
        try {
            const status = calculateStatus();
            await apiClient.post('/presence/heartbeat', { status });

            if (immediate) {
                console.log('[Presence] Immediate heartbeat sent:', status);
            }
        } catch (error) {
            // Silently fail - presence is not critical
            console.debug('[Presence] Heartbeat failed:', error);
        }
    }, [calculateStatus]);

    // تحديث وقت آخر نشاط
    const updateActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        isActiveRef.current = true;
    }, []);

    // معالجة تغيير رؤية التبويب
    const handleVisibilityChange = useCallback(() => {
        const wasHidden = !isVisibleRef.current;
        isVisibleRef.current = !document.hidden;

        if (isVisibleRef.current && wasHidden) {
            // المستخدم عاد للتبويب - إرسال heartbeat فوري
            lastActivityRef.current = Date.now();
            sendHeartbeat(true);
        }
    }, [sendHeartbeat]);

    useEffect(() => {
        // تسجيل أحداث النشاط
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        // تسجيل تغيير الرؤية
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // إرسال heartbeat فوري عند التحميل
        sendHeartbeat(true);

        // إعداد interval للنبضات (كل 30 ثانية)
        heartbeatIntervalRef.current = setInterval(() => {
            sendHeartbeat();
        }, 30000);

        // تنظيف
        return () => {
            activityEvents.forEach(event => {
                document.removeEventListener(event, updateActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
        };
    }, [updateActivity, handleVisibilityChange, sendHeartbeat]);

    return {
        sendHeartbeat,
        calculateStatus,
    };
}

export default usePresence;
