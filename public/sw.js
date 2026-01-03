// ============================================
// نظام إدارة المحاماة - Service Worker
// مع دعم التحديثات التلقائية
// ============================================

// 🔑 مفتاح الإصدار - يتم تحديثه تلقائياً عند كل build
// يمكن تغييره يدوياً أو عبر script
const SW_VERSION = '2026.01.03.1435';
const CACHE_NAME = `law-firm-system-${SW_VERSION}`;

// الملفات الأساسية للتخزين المؤقت
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/vite.svg'
];

// ============================================
// تثبيت Service Worker
// ============================================
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Installing...`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`[SW ${SW_VERSION}] Caching app shell`);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log(`[SW ${SW_VERSION}] Install complete`);
      })
  );

  // ❌ لا نستخدم skipWaiting() هنا - ننتظر موافقة المستخدم
});

// ============================================
// تفعيل Service Worker
// ============================================
self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Activating...`);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // حذف جميع الكاش القديمة ما عدا الحالية
          if (cacheName !== CACHE_NAME && cacheName.startsWith('law-firm-system-')) {
            console.log(`[SW ${SW_VERSION}] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`[SW ${SW_VERSION}] Claiming clients`);
      return self.clients.claim();
    })
  );
});

// ============================================
// استرجاع البيانات
// ============================================
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات API تماماً - لا نريد تخزينها مؤقتاً
  if (event.request.url.includes('/api/') ||
    event.request.url.includes('127.0.0.1:8000') ||
    event.request.url.includes('localhost:8000') ||
    event.request.url.includes('alraedlaw.com/api')) {
    return;
  }

  // للملفات الستاتيكية فقط
  if (event.request.destination === 'document' ||
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image') {

    event.respondWith(
      // Strategy: Network First, fallback to Cache
      fetch(event.request)
        .then((response) => {
          // تحديث الكاش بالنسخة الجديدة
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // في حالة عدم الاتصال، استخدم الكاش
          return caches.match(event.request);
        })
    );
  }
});

// ============================================
// استقبال رسائل من التطبيق
// ============================================
self.addEventListener('message', (event) => {
  console.log(`[SW ${SW_VERSION}] Message received:`, event.data);

  // رسالة لتفعيل التحديث فوراً
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log(`[SW ${SW_VERSION}] Skip waiting requested`);
    self.skipWaiting();
  }

  // رسالة لجلب الإصدار الحالي
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: SW_VERSION });
  }

  // رسالة لمسح كل الكاش (ما عدا بيانات تسجيل الدخول)
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log(`[SW ${SW_VERSION}] Clearing all caches...`);
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('law-firm-system-')) {
            console.log(`[SW ${SW_VERSION}] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      if (event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }
});

// ============================================
// إشعارات Push
// ============================================
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'تنبيه جديد من نظام المحاماة',
    icon: '/icons/icon.svg',
    badge: '/vite.svg',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'عرض التفاصيل' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  let title = 'نظام إدارة المحاماة';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options.body = data.body || options.body;
      options.data = data;
      if (data.url) {
        options.data.url = data.url;
      }
    } catch (e) {
      // استخدام القيم الافتراضية
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ============================================
// النقر على الإشعار
// ============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  if (event.action === 'view' || event.action === '') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // إذا كانت هناك نافذة مفتوحة، استخدمها
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // وإلا افتح نافذة جديدة
        return clients.openWindow(url);
      })
    );
  }
});

// ============================================
// مزامنة الخلفية
// ============================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  return fetch('/api/sync')
    .then(response => response.json())
    .then(data => {
      console.log(`[SW ${SW_VERSION}] Background sync completed`, data);
    })
    .catch(error => {
      console.error(`[SW ${SW_VERSION}] Background sync failed`, error);
    });
}

console.log(`[SW ${SW_VERSION}] Service Worker loaded`);
