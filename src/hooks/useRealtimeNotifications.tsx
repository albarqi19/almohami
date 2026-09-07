import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getEcho } from '../lib/echo';
import { playNotificationSound } from '../utils/notificationSound';

/**
 * الاستقبال الحيّ للتنبيهات في المتصفّح.
 *
 * التنبيه كان يُكتب في القاعدة ويُدفع إلى الجوال، أمّا المتصفّح فلا يعلم به إلا حين
 * يفتح المستخدم الجرس. فزرّ «اختبار الإشعار» يعمل (يستدعي Notification API مباشرةً)
 * بينما إسنادُ مهمةٍ حقيقيّ أو إشارةٌ في تعليق لا يُظهر شيئاً — شكوى مكتب 404.
 *
 * الباك يبثّ `notification.created` على القناة الخاصة `notifications.user.{id}`
 * (NotificationObserver ← NotificationCreated). هنا: توست أسفل الصفحة + نغمة +
 * إشعار نظام إن أُذن به + حدثان على window يلتقطهما الجرس وعدّاده.
 */
export interface RealtimeNotificationPayload {
  id: number;
  title: string;
  message: string;
  type: string;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string | null;
}

/** تنبيهٌ جديد وصل حيّاً — `detail` هو الحمولة */
export const NOTIFICATION_CREATED_EVENT = 'app:notification-created';
/** تغيّر عدّاد غير المقروء (وصول/قراءة/حذف) — الجرس يعيد الجلب */
export const NOTIFICATIONS_CHANGED_EVENT = 'app:notifications-changed';

const TOAST_MS = 8000;

function showBrowserNotification(payload: RealtimeNotificationPayload, onOpen: () => void): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    // نفس المسار الذي يسلكه زرّ «اختبار الإشعار» (بلا Service Worker) — فما يظهر
    // للاختبار يظهر للحدث الحقيقيّ. `tag` يمنع التكرار لو وصل الحدث مرّتين.
    const n = new Notification(payload.title, {
      body: payload.message,
      icon: '/icons/icon-192x192.png',
      dir: 'rtl',
      lang: 'ar',
      tag: `notification-${payload.id}`,
    });
    n.onclick = () => {
      window.focus();
      onOpen();
      n.close();
    };
    window.setTimeout(() => n.close(), TOAST_MS);
  } catch {
    /* بعض المتصفّحات ترمي عند إنشاء Notification بلا Service Worker — الـtoast يكفي */
  }
}

export function useRealtimeNotifications(userId: number | null): void {
  const navigate = useNavigate();
  // حارس ازدواج: إعادة الاتصال قد تعيد آخر حدث
  const seenRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const authToken = localStorage.getItem('authToken') ?? '';
    const echo = getEcho(authToken);
    const channelName = `notifications.user.${userId}`;
    const channel = echo.private(channelName);

    channel.listen('.notification.created', (payload: RealtimeNotificationPayload) => {
      if (!payload || typeof payload.id !== 'number') return;
      if (seenRef.current.has(payload.id)) return;
      seenRef.current.add(payload.id);

      window.dispatchEvent(new CustomEvent(NOTIFICATION_CREATED_EVENT, { detail: payload }));
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));

      const open = () => {
        if (payload.action_url) navigate(payload.action_url);
      };

      playNotificationSound();

      toast.info(
        <div className="rt-notif" role="status">
          <strong className="rt-notif__title">{payload.title}</strong>
          {payload.message && <span className="rt-notif__body">{payload.message}</span>}
          {payload.action_url && <span className="rt-notif__hint">انقر للفتح</span>}
        </div>,
        {
          toastId: `notification-${payload.id}`,
          autoClose: TOAST_MS,
          onClick: open,
          closeOnClick: true,
        },
      );

      showBrowserNotification(payload, open);
    });

    return () => {
      echo.leave(channelName);
    };
  }, [userId, navigate]);
}
