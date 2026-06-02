// === hook حالة ZATCA ===
// React Query لـ /zatca/status. يُستدعى داخل components/Provider فقط — لا في ملفات البيانات.
// مصدر الحقيقة الوحيد للإخفاء الشرطي (يُغلَّف بـ ZatcaStatusProvider لمنع تكرار الطلب).

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { zatcaService } from '../services/zatcaService';
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
    enabled: !!user,
    staleTime: 60 * 1000, // الحالة شبه ثابتة — أطول من الافتراضي (30s)
    retry: 1,
  });
}
