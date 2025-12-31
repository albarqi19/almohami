import { useState, useEffect, useCallback, useRef } from 'react';

interface AppUpdateState {
    isUpdateAvailable: boolean;
    isUpdating: boolean;
    currentVersion: string | null;
    newVersion: string | null;
    registration: ServiceWorkerRegistration | null;
}

interface UseAppUpdateReturn extends AppUpdateState {
    applyUpdate: () => Promise<void>;
    checkForUpdate: () => Promise<void>;
    dismissUpdate: () => void;
}

export const useAppUpdate = (): UseAppUpdateReturn => {
    const [state, setState] = useState<AppUpdateState>({
        isUpdateAvailable: false,
        isUpdating: false,
        currentVersion: null,
        newVersion: null,
        registration: null
    });

    const waitingWorkerRef = useRef<ServiceWorker | null>(null);
    const dismissedRef = useRef(false);

    // التحقق من التحديثات
    const checkForUpdate = useCallback(async () => {
        if (state.registration) {
            try {
                await state.registration.update();
                console.log('[AppUpdate] Manual update check triggered');
            } catch (error) {
                console.error('[AppUpdate] Update check failed:', error);
            }
        }
    }, [state.registration]);

    // تطبيق التحديث
    const applyUpdate = useCallback(async () => {
        if (!waitingWorkerRef.current) {
            console.warn('[AppUpdate] No waiting worker to activate');
            return;
        }

        setState(prev => ({ ...prev, isUpdating: true }));

        try {
            // أولاً: مسح الكاش (ما عدا بيانات تسجيل الدخول في localStorage)
            console.log('[AppUpdate] Clearing caches...');

            // مسح كل الكاش من Service Worker
            const messageChannel = new MessageChannel();
            waitingWorkerRef.current.postMessage(
                { type: 'CLEAR_CACHE' },
                [messageChannel.port2]
            );

            // انتظار قليلاً للتأكد من مسح الكاش
            await new Promise(resolve => setTimeout(resolve, 500));

            // إرسال رسالة skipWaiting للـ Service Worker الجديد
            console.log('[AppUpdate] Activating new worker...');
            waitingWorkerRef.current.postMessage({ type: 'SKIP_WAITING' });

            // إعادة تحميل الصفحة بعد تفعيل الـ Service Worker الجديد
            // سنستمع لحدث controllerchange
        } catch (error) {
            console.error('[AppUpdate] Apply update failed:', error);
            setState(prev => ({ ...prev, isUpdating: false }));
        }
    }, []);

    // إخفاء إشعار التحديث مؤقتاً
    const dismissUpdate = useCallback(() => {
        dismissedRef.current = true;
        setState(prev => ({ ...prev, isUpdateAvailable: false }));

        // إعادة إظهار الإشعار بعد 5 دقائق
        setTimeout(() => {
            if (waitingWorkerRef.current) {
                dismissedRef.current = false;
                setState(prev => ({ ...prev, isUpdateAvailable: true }));
            }
        }, 5 * 60 * 1000);
    }, []);

    // تسجيل Service Worker والاستماع للتحديثات
    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            console.log('[AppUpdate] Service Workers not supported');
            return;
        }

        let mounted = true;

        const registerServiceWorker = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    updateViaCache: 'none' // دائماً تحقق من وجود تحديث
                });

                if (!mounted) return;

                console.log('[AppUpdate] Service Worker registered:', registration);
                setState(prev => ({ ...prev, registration }));

                // جلب الإصدار الحالي
                if (registration.active) {
                    const messageChannel = new MessageChannel();
                    messageChannel.port1.onmessage = (event) => {
                        if (event.data?.version) {
                            setState(prev => ({ ...prev, currentVersion: event.data.version }));
                            console.log('[AppUpdate] Current version:', event.data.version);
                        }
                    };
                    registration.active.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
                }

                // التحقق إذا كان هناك Service Worker في انتظار التفعيل
                if (registration.waiting) {
                    console.log('[AppUpdate] Found waiting worker on load');
                    waitingWorkerRef.current = registration.waiting;
                    if (!dismissedRef.current) {
                        setState(prev => ({ ...prev, isUpdateAvailable: true }));
                    }
                }

                // الاستماع لتحديثات جديدة
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    console.log('[AppUpdate] New worker installing...');

                    newWorker.addEventListener('statechange', () => {
                        console.log('[AppUpdate] New worker state:', newWorker.state);

                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // هناك تحديث جديد جاهز
                            console.log('[AppUpdate] Update available!');
                            waitingWorkerRef.current = newWorker;

                            // جلب إصدار الـ Worker الجديد
                            const messageChannel = new MessageChannel();
                            messageChannel.port1.onmessage = (event) => {
                                if (event.data?.version) {
                                    setState(prev => ({ ...prev, newVersion: event.data.version }));
                                }
                            };
                            newWorker.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);

                            if (!dismissedRef.current && mounted) {
                                setState(prev => ({ ...prev, isUpdateAvailable: true }));
                            }
                        }
                    });
                });

                // الاستماع لتغيير الـ controller (عند تفعيل Worker جديد)
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('[AppUpdate] Controller changed, reloading page...');
                    // إعادة تحميل الصفحة للحصول على النسخة الجديدة
                    window.location.reload();
                });

                // التحقق من التحديثات كل 5 دقائق (للاكتشاف السريع)
                const intervalId = setInterval(() => {
                    console.log('[AppUpdate] Checking for updates...');
                    registration.update().catch(console.error);
                }, 5 * 60 * 1000);

                return () => {
                    clearInterval(intervalId);
                };

            } catch (error) {
                console.error('[AppUpdate] Service Worker registration failed:', error);
            }
        };

        registerServiceWorker();

        return () => {
            mounted = false;
        };
    }, []);

    return {
        ...state,
        applyUpdate,
        checkForUpdate,
        dismissUpdate
    };
};

export default useAppUpdate;
