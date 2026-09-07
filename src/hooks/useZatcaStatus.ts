// === hook حالة ZATCA ===
// React Query لـ /zatca/status. يُستدعى داخل components/Provider فقط — لا في ملفات البيانات.
// مصدر الحقيقة الوحيد للإخفاء الشرطي (يُغلَّف بـ ZatcaStatusProvider لمنع تكرار الطلب).

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { zatcaService } from '../services/zatcaService';
import { isEstablishmentOnly } from '../utils/establishmentOnly';
import type { ZatcaStatusData } from '../types/zatca';

export const ZATCA_STATUS_QUERY_KEY = ['zatca', 'status'] as const;

export function useZatcaStatus() {
  const { user } = useAuth();

  return useQuery<ZatcaStatusData | null>({
    queryKey: ZATCA_STATUS_QUERY_KEY,
    queryFn: async () => {
      const res = await zatcaService.getStatus();
      return res.data ?? null;
    },
    // عميلُ بوابة المنشأة الحصريّ: المزوّد يُغلّف Layout فيُركَّب له أيضاً، والمسار
    // يُردّ 403 من حارس الوضع الحصري. نداءٌ لا مستفيدَ منه (لا قائمة ولا فاتورة
    // في شاشته) وضجيجٌ في سجلّ متصفّحه.
    enabled: !!user && !isEstablishmentOnly(user),
    staleTime: 60 * 1000, // الحالة شبه ثابتة — أطول من الافتراضي (30s)
    retry: 1,
  });
}
