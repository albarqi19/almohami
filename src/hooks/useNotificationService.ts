import { useEffect, useState } from 'react';

interface NotificationService {
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions & { url?: string }) => void;
  scheduleNotification: (title: string, body: string, delay: number, url?: string) => void;
  isSupported: () => boolean;
  getPermissionStatus: () => NotificationPermission;
}

export const useNotificationService = (): NotificationService => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // تعطيل Service Worker مؤقتاً لحل مشكلة API
    console.log('Service Worker disabled temporarily for API fix');
    // if ('serviceWorker' in navigator) {
    //   navigator.serviceWorker.register('/sw.js')
    //     .then((reg) => {
    //       console.log('Service Worker registered successfully:', reg);
    //       setRegistration(reg);
    //     })
    //     .catch((error) => {
    //       console.log('Service Worker registration failed:', error);
    //     });
    // }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  const showNotification = (title: string, options: NotificationOptions & { url?: string } = {}) => {
    if (registration && Notification.permission === 'granted') {
      const notificationOptions: any = {
        body: options.body || '',
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/icon-72x72.png',
        dir: 'rtl',
        lang: 'ar',
        vibrate: [200, 100, 200],
        requireInteraction: options.requireInteraction || true,
        data: {
          url: options.url || '/',
          timestamp: Date.now(),
          ...options.data
        },
        actions: [
          {
            action: 'view',
            title: 'عرض التفاصيل',
          },
          {
            action: 'close',
            title: 'إغلاق',
          }
        ]
      };

      registration.showNotification(title, notificationOptions);
    } else if (Notification.permission === 'granted') {
      // Fallback للمتصفحات التي لا تدعم Service Worker notifications
      const notification = new Notification(title, {
        body: options.body || '',
        icon: options.icon || '/icons/icon-192x192.png',
        dir: 'rtl',
        lang: 'ar'
      });

      if (options.url) {
        notification.onclick = () => {
          window.open(options.url, '_blank');
          notification.close();
        };
      }

      // إغلاق الإشعار تلقائياً بعد 5 ثوان
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  };

  const scheduleNotification = (title: string, body: string, delay: number, url?: string) => {
    setTimeout(() => {
      showNotification(title, { body, url });
    }, delay);
  };

  const isSupported = (): boolean => {
    return 'Notification' in window && 'serviceWorker' in navigator;
  };

  const getPermissionStatus = (): NotificationPermission => {
    return Notification.permission;
  };

  return {
    requestPermission,
    showNotification,
    scheduleNotification,
    isSupported,
    getPermissionStatus
  };
};

// Hook لإدارة إشعارات المهام
export const useTaskNotifications = () => {
  const notificationService = useNotificationService();

  const notifyTaskDue = (taskTitle: string, taskId: string, hoursUntilDue: number) => {
    let body = '';
    let urgency = '';

    if (hoursUntilDue <= 0) {
      body = `المهمة "${taskTitle}" متأخرة! يجب إنجازها فوراً.`;
      urgency = '🔴 عاجل: ';
    } else if (hoursUntilDue <= 2) {
      body = `المهمة "${taskTitle}" تستحق خلال ${hoursUntilDue} ساعة.`;
      urgency = '🟡 تنبيه: ';
    } else if (hoursUntilDue <= 24) {
      body = `المهمة "${taskTitle}" تستحق خلال ${hoursUntilDue} ساعة.`;
      urgency = '🔵 تذكير: ';
    }

    notificationService.showNotification(
      urgency + 'موعد استحقاق مهمة',
      {
        body,
        url: `/tasks/${taskId}`,
        requireInteraction: true
      }
    );
  };

  const notifyNewTask = (taskTitle: string, taskId: string) => {
    notificationService.showNotification(
      '📋 مهمة جديدة مُسندة إليك',
      {
        body: `تم تعيين المهمة "${taskTitle}" إليك`,
        url: `/tasks/${taskId}`,
        requireInteraction: false
      }
    );
  };

  const notifyTaskCompleted = (taskTitle: string, completedBy: string) => {
    notificationService.showNotification(
      '✅ تم إنجاز مهمة',
      {
        body: `تم إنجاز المهمة "${taskTitle}" بواسطة ${completedBy}`,
        requireInteraction: false
      }
    );
  };

  const notifyCourtSession = (sessionTitle: string, sessionId: string, minutesUntilSession: number) => {
    let body = '';
    let urgency = '';

    if (minutesUntilSession <= 15) {
      body = `جلسة "${sessionTitle}" ستبدأ خلال ${minutesUntilSession} دقيقة!`;
      urgency = '🔴 عاجل: ';
    } else if (minutesUntilSession <= 60) {
      body = `جلسة "${sessionTitle}" ستبدأ خلال ساعة واحدة`;
      urgency = '🟡 تنبيه: ';
    } else {
      body = `جلسة "${sessionTitle}" ستبدأ خلال ${Math.floor(minutesUntilSession / 60)} ساعة`;
      urgency = '🔵 تذكير: ';
    }

    notificationService.showNotification(
      urgency + 'جلسة محكمة قريباً',
      {
        body,
        url: `/tasks/${sessionId}`,
        requireInteraction: true
      }
    );
  };

  return {
    notifyTaskDue,
    notifyNewTask,
    notifyTaskCompleted,
    notifyCourtSession,
    ...notificationService
  };
};
