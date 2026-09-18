import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TaxProfileService, TAX_PROFILE_QUERY_KEY } from '../services/taxProfileService';
import type { TaxProfile } from '../services/taxProfileService';
import { isUsableVatNumber } from '../utils/saudiVat';

/**
 * [INV-P1] حالة التسجيل الضريبي والنسبة الافتراضية من مصدر واحد.
 *
 * كانت نافذة الفاتورة ومنشئ العقود يجلبان مجموعة إعدادات الفوترة كلٌّ على حدة،
 * فبعد حفظ التسجيل من الإعدادات تبقى النوافذ المفتوحة على القيمة القديمة. الآن
 * الجميع يقرأ من استعلام واحد (react-query) يُلغى بعد الحفظ.
 *
 * الافتراض قبل وصول البيانات: «مسجَّل بنسبة 15» — الباك يفرض النسبة الصحيحة على أي
 * حال، والقيمة الافتراضية هنا للعرض فقط.
 */
export interface BillingSettings {
  isVatRegistered: boolean;
  /** نصّ كما يخزّنه الباك، مثل '15' */
  defaultVatRate: string;
  /** رقم ضريبي صالح وليس عيّنة — للتنبيه لا للمنع */
  taxNumberUsable: boolean;
  profile: TaxProfile | null;
  loading: boolean;
}

export function useBillingSettings(enabled = true): BillingSettings {
  const { data, isLoading } = useQuery({
    queryKey: TAX_PROFILE_QUERY_KEY,
    queryFn: () => TaxProfileService.get(),
    staleTime: 60_000,
    enabled,
  });

  return {
    isVatRegistered: data ? data.is_vat_registered : true,
    defaultVatRate: data ? data.default_vat_rate || '15' : '15',
    taxNumberUsable: data ? isUsableVatNumber(data.tax_number) : true,
    profile: data ?? null,
    loading: isLoading,
  };
}

/** يُستدعى بعد أي حفظ في قسم «الفوترة والضريبة» كي تلتقط النوافذ المفتوحة القيمة الجديدة. */
export function useInvalidateBillingSettings(): () => Promise<void> {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: TAX_PROFILE_QUERY_KEY });
}
