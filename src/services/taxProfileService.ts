import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

/**
 * [INV-P1] الملف الضريبي للمكتب — مصدر واحد للرقم الضريبي والاسم القانوني والسجل
 * والعنوان الوطني وحالة التسجيل (GET/PUT /tenant/tax-profile).
 *
 * الكتابة ترسل الحقول المتغيّرة فقط؛ الباك يطبّع الأرقام ويحفظ ما تغيّر ويكتب أثره.
 */

export interface TaxProfile {
  name: string;
  legal_name_ar: string | null;
  legal_name_en: string | null;
  tax_number: string | null;
  commercial_registration: string | null;
  license_number: string | null;
  address: string | null;
  building_number: string | null;
  street_name: string | null;
  district: string | null;
  city: string | null;
  postal_code: string | null;
  additional_number: string | null;
  is_vat_registered: boolean;
  /** نصّ لأن المفتاح مخزَّن نصّاً في الباك */
  default_vat_rate: string;
  vat_filing_period: 'monthly' | 'quarterly';
  tax_number_valid: boolean;
  tax_number_is_sample: boolean;
  identity_locked: boolean;
  identity_lock_reason: string | null;
  activation_blockers: string[];
  license_number_effective: string | null;
  license_number_source: 'tenant' | 'sba' | null;
  address_source: 'sba' | null;
  zatca: { available: boolean; enabled: boolean; environment: string | null };
  /** [INV-P6] موعد إلزام الربط مع الهيئة (Y-m-d) */
  zatca_integration_due_date?: string | null;
}

export interface TaxProfileImpact {
  is_vat_registered: boolean;
  default_vat_rate: string;
  draft_invoices: number;
  draft_invoices_with_vat: number;
  pending_payment_terms: number;
  open_fee_proposals: number;
  issued_invoices: number;
}

export type TaxProfileUpdate = Partial<
  Pick<
    TaxProfile,
    | 'legal_name_ar'
    | 'legal_name_en'
    | 'tax_number'
    | 'commercial_registration'
    | 'license_number'
    | 'address'
    | 'building_number'
    | 'street_name'
    | 'district'
    | 'city'
    | 'postal_code'
    | 'additional_number'
    | 'is_vat_registered'
    | 'default_vat_rate'
    | 'vat_filing_period'
  >
> & {
  confirm_registration_change?: boolean;
  apply_rate_to_drafts?: boolean;
  /** [INV-P6] موعد إلزام الربط مع الهيئة */
  zatca_integration_due_date?: string | null;
};

export interface TaxProfileUpdateResult {
  profile: TaxProfile;
  message: string;
  changed: string[];
  drafts_updated: number;
}

/** الحقول القابلة للتحرير في النموذج — بالترتيب الذي تُقارن به المسودة بالمحفوظ. */
export const TAX_PROFILE_TEXT_FIELDS = [
  'legal_name_ar',
  'legal_name_en',
  'tax_number',
  'commercial_registration',
  'license_number',
  'address',
  'building_number',
  'street_name',
  'district',
  'city',
  'postal_code',
  'additional_number',
] as const;

export type TaxProfileTextField = (typeof TAX_PROFILE_TEXT_FIELDS)[number];

export const TAX_PROFILE_QUERY_KEY = ['taxProfile'] as const;

export class TaxProfileService {
  static async get(): Promise<TaxProfile> {
    const res = await apiClient.get<ApiResponse<TaxProfile>>('/tenant/tax-profile');
    if (!res.success || !res.data) {
      throw new Error(res.message || 'تعذّر جلب البيانات الضريبية');
    }
    return res.data;
  }

  static async impact(): Promise<TaxProfileImpact> {
    const res = await apiClient.get<ApiResponse<TaxProfileImpact>>('/tenant/tax-profile/impact');
    if (!res.success || !res.data) {
      throw new Error(res.message || 'تعذّر حساب أثر التغيير');
    }
    return res.data;
  }

  static async update(payload: TaxProfileUpdate): Promise<TaxProfileUpdateResult> {
    const res = await apiClient.put<
      ApiResponse<TaxProfile> & { changed?: string[]; drafts_updated?: number }
    >('/tenant/tax-profile', payload);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'تعذّر حفظ البيانات الضريبية');
    }
    return {
      profile: res.data,
      message: res.message || 'تم الحفظ',
      changed: res.changed || [],
      drafts_updated: res.drafts_updated || 0,
    };
  }
}
