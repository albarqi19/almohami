const CACHE_NAME = 'law-firm-system-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon.svg',
  '/vite.svg'
];

// تثبيت service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  // تفعيل Service Worker الجديد فوراً
  self.skipWaiting();
});

// تفعيل service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // السيطرة على جميع العملاء فوراً
  self.clients.claim();
});

// استرجاع البيانات
self.addEventListener('fetch', (event) => {
  // **تجاهل تماماً جميع طلبات API**
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('127.0.0.1:8000') ||
      event.request.url.includes('localhost:8000')) {
    // السماح للطلب بالمرور مباشرة دون تدخل
    console.log('API request bypassed:', event.request.url);
    return;
  }
  
  // فقط للملفات الستاتيكية
  if (event.request.destination === 'document' || 
      event.request.destination === 'script' || 
      event.request.destination === 'style' ||
      event.request.destination === 'image') {
    
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // إرجاع النسخة المحفوظة إذا وجدت
          if (response) {
            return response;
          }
          // جلب الملف من الشبكة
          return fetch(event.request);
        })
    );
  }
});

// تحديث service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// إشعارات Push
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
      {
        action: 'view',
        title: 'عرض التفاصيل',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'إغلاق',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };

  let title = 'نظام إدارة المحاماة';
  
  // تحليل بيانات الإشعار إذا كانت متوفرة
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
      // استخدام القيم الافتراضية في حالة فشل التحليل
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  } else if (event.action === 'close') {
    // الإشعار مغلق بالفعل
    return;
  } else {
    // النقر الافتراضي
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// مزامنة الخلفية للإجراءات دون اتصال
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // مزامنة البيانات عند استعادة الاتصال
  return fetch('/api/sync')
    .then(response => response.json())
    .then(data => {
      console.log('Background sync completed', data);
    })
    .catch(error => {
      console.error('Background sync failed', error);
    });
}
