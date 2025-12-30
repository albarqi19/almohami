import { useEffect, useRef, useCallback } from 'react';

/**
 * خيارات التحديث التلقائي
 */
interface UseAutoRefreshOptions {
  /** دالة التحديث التي سيتم استدعاؤها */
  onRefresh: () => void | Promise<void>;
  /** تحديث عند العودة للتبويب (default: true) */
  refetchOnFocus?: boolean;
  /** تحديث عند استعادة الاتصال بالإنترنت (default: true) */
  refetchOnReconnect?: boolean;
  /** polling كل X ثانية (0 = معطل) */
  pollingInterval?: number;
  /** تفعيل/تعطيل الـ Hook (default: true) */
  enabled?: boolean;
  /** الحد الأدنى للوقت بين التحديثات بالثواني (default: 10) */
  minRefreshInterval?: number;
}

/**
 * Hook للتحديث التلقائي للبيانات
 *
 * المميزات:
 * - تحديث عند العودة للتبويب (visibilitychange)
 * - تحديث عند استعادة الاتصال (online event)
 * - polling اختياري بفترة محددة
 * - حماية من التحديثات المتكررة
 *
 * @example
 * ```tsx
 * useAutoRefresh({
 *   onRefresh: () => fetchData(true),
 *   refetchOnFocus: true,
 *   pollingInterval: 120, // كل 2 دقيقة
 * });
 * ```
 */
export function useAutoRefresh({
  onRefresh,
  refetchOnFocus = true,
  refetchOnReconnect = true,
  pollingInterval = 0,
  enabled = true,
  minRefreshInterval = 10,
}: UseAutoRefreshOptions) {
  const lastRefreshTime = useRef<number>(0);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshing = useRef(false);

  // دالة التحديث مع حماية من التكرار
  const safeRefresh = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = (now - lastRefreshTime.current) / 1000;

    // تجاهل إذا كان التحديث جاري أو الوقت قصير جداً
    if (isRefreshing.current || timeSinceLastRefresh < minRefreshInterval) {
      return;
    }

    isRefreshing.current = true;
    lastRefreshTime.current = now;

    try {
      await onRefresh();
    } catch (error) {
      console.error('Auto refresh error:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, [onRefresh, minRefreshInterval]);

  // تحديث عند العودة للتبويب
  useEffect(() => {
    if (!enabled || !refetchOnFocus) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        safeRefresh();
      }
    };

    const handleFocus = () => {
      safeRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refetchOnFocus, safeRefresh]);

  // تحديث عند استعادة الاتصال
  useEffect(() => {
    if (!enabled || !refetchOnReconnect) return;

    const handleOnline = () => {
      safeRefresh();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, refetchOnReconnect, safeRefresh]);

  // Polling
  useEffect(() => {
    if (!enabled || pollingInterval <= 0) return;

    // تحويل من ثواني إلى ميلي ثانية
    const intervalMs = pollingInterval * 1000;

    pollingTimerRef.current = setInterval(() => {
      // فقط إذا كانت الصفحة مرئية
      if (document.visibilityState === 'visible') {
        safeRefresh();
      }
    }, intervalMs);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [enabled, pollingInterval, safeRefresh]);

  // تنظيف عند unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  // إرجاع دالة للتحديث اليدوي
  return {
    refresh: safeRefresh,
    isRefreshing: isRefreshing.current,
  };
}

export default useAutoRefresh;
