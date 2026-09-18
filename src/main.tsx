// deploy: 2026-06-02 (إعادة تحفيز نشر Vercel)
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
// [P4] متغيّرات الثيم (--status-*/--law-*/--quiet-gray-*) تُحمَّل عالمياً قبل erp.css
// حتى تتوفّر على كل الصفحات (كانت مستورَدة في AdminDashboard فقط → تفشل الألوان في وضع التطوير).
import './styles/dashboard-theme.css'
import './styles/tiptap.css'
import './styles/erp.css'
import App from './App.tsx'

// قطعةٌ كسولة تغيّر اسمُها بعد نشرة (أو ردٌّ مسمومٌ في الخبيئة) ⇒ Vite يرفع vite:preloadError.
// إعادةُ تحميلٍ واحدة تجلب index.html الجديد بأسمائه الصحيحة — بحارس زمني كي لا تدور حلقة.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const key = 'raed:preload-reload-at'
  const last = Number(sessionStorage.getItem(key) || 0)
  if (Date.now() - last > 60_000) {
    sessionStorage.setItem(key, String(Date.now()))
    window.location.reload()
  }
})

// إعداد TanStack Query - مُصدَّر للاستخدام في AuthContext
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // البيانات صالحة 30 ثانية
      refetchOnWindowFocus: true, // تحديث عند العودة للتبويب
      retry: 2, // إعادة المحاولة مرتين عند الفشل
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)

