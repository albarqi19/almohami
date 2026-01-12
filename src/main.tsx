import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './styles/tiptap.css'
import App from './App.tsx'

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

