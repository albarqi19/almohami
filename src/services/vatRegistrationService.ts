import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

/**
 * [TAX-01] الحالة الضريبية للمكتب — قراءةً وكتابةً.
 *
 * `is_vat_registered` مفتاحٌ حاكم: الباك يقرأه في كل فاتورة وعقد جديد
 * (‏CaseBillingService و ContractService عبر Tenant::isVatRegistered)، ويقسر
 * النسبة إلى صفر لغير المسجَّل مهما أرسلت الواجهة. وظلّ سنواتٍ بلا شاشة تكتبه،
 * فبقي كل مكتب على الافتراضي «غير مسجَّل» ولو كان مسجَّلاً فعلاً.
 *
 * لا مسار جديد هنا: `PUT /tenant/advanced-settings` قائمٌ ومحروس، وقائمته
 * البيضاء هي `TenantSetting::DEFAULTS` — والمفتاحان فيها أصلاً. والرقم الضريبي
 * عمودٌ على `tenants` لا إعداد، فيُقرأ ويُكتب عبر `/tenant`.
 */

export interface VatRegistrationState {
  /** هل المكتب مسجَّل في ضريبة القيمة المضافة؟ */
  isVatRegistered: boolean;
  /** النسبة الافتراضية % — تصل نصّاً من الخادم لأن نوع المفتاح 'string'. */
  defaultVatRate: string;
  /** الرقم الضريبي كما هو مخزَّن (قد يكون فارغاً أو بصيغة غير نظامية). */
  taxNumber: string;
  /** حالة الفوترة الإلكترونية — تُعرض للسياق فقط، ولا علاقة لها بالتسجيل. */
  zatcaEnabled: boolean;
  zatcaEnvironment: string | null;
}

export interface VatRegistrationPayload {
  isVatRegistered: boolean;
  defaultVatRate: string;
}

/** صيغة الرقم الضريبي السعودي: ‏١٥ خانة تبدأ بـ3 وتنتهي بـ3 (‏BR-KSA-39/40). */
const TAX_NUMBER_PATTERN = /^3\d{13}3$/;

/**
 * أرقام الهيئة التجريبية — تجتاز الصيغة وليست تسجيلاً.
 * الرقم أدناه منشورٌ في عيّنات بيئة الاختبار، ووُجد مكتوباً على مكاتب حقيقية
 * بعد تجربة الـsandbox. فمن اعتمده دليلَ تسجيل أشعل الضريبة لمن لا يستحقّها.
 */
const SANDBOX_TAX_NUMBERS = ['399999999900003'];

/**
 * تطبيع قبل أي مطابقة: حذف الفراغات والشرطات، وتحويل الأرقام العربية-الهندية
 * إلى لاتينية. الحقل حرّ في الخادم (`nullable|string|max:50`) فيصل بأي شكل.
 */
export function normalizeTaxNumber(raw: string): string {
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const easternArabic = '۰۱۲۳۴۵۶۷۸۹';

  return (raw || '')
    .replace(/[٠-٩]/g, (d) => String(arabicIndic.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(easternArabic.indexOf(d)))
    .replace(/[\s‏‎-]/g, '');
}

export function isValidTaxNumber(raw: string): boolean {
  return TAX_NUMBER_PATTERN.test(normalizeTaxNumber(raw));
}

export function isSandboxTaxNumber(raw: string): boolean {
  return SANDBOX_TAX_NUMBERS.includes(normalizeTaxNumber(raw));
}

interface BillingGroupResponse {
  group: string;
  label: string;
  settings: Record<string, { value: unknown; type?: string; description?: string }>;
}

export class VatRegistrationService {
  /**
   * الحالة كاملة. المصدران مختلفان (‏إعدادات + عمود على المكتب) فيُجلبان معاً،
   * وفشل أحدهما لا يُخفي الآخر: لا نخمّن قيمة مفتاحٍ مالي عند فشل الشبكة.
   */
  static async load(): Promise<VatRegistrationState> {
    const [billingRes, tenantRes] = await Promise.all([
      apiClient.get<ApiResponse<BillingGroupResponse>>('/tenant/advanced-settings/group/billing'),
      apiClient.get<ApiResponse<{ tenant: Record<string, unknown> }>>('/tenant'),
    ]);

    if (!billingRes.success || !billingRes.data) {
      throw new Error(billingRes.message || 'تعذّر جلب إعدادات الفوترة');
    }

    const settings = billingRes.data.settings || {};
    const tenant = (tenantRes.success ? tenantRes.data?.tenant : null) || {};

    return {
      isVatRegistered: Boolean(settings.is_vat_registered?.value),
      defaultVatRate:
        settings.default_vat_rate?.value != null ? String(settings.default_vat_rate.value) : '15',
      taxNumber: String(tenant.tax_number ?? ''),
      zatcaEnabled: Boolean(tenant.zatca_enabled),
      zatcaEnvironment: (tenant.zatca_environment as string) ?? null,
    };
  }

  /** حفظ الحالة الضريبية. الكتابة محروسة في الخادم بصلاحية إدارة الإعدادات. */
  static async save(payload: VatRegistrationPayload): Promise<void> {
    const res = await apiClient.put<ApiResponse<unknown>>('/tenant/advanced-settings', {
      settings: {
        is_vat_registered: payload.isVatRegistered,
        default_vat_rate: payload.defaultVatRate,
      },
    });

    if (!res.success) {
      throw new Error(res.message || 'تعذّر حفظ الحالة الضريبية');
    }
  }

  /**
   * حفظ الرقم الضريبي وحده.
   * منفصلٌ عن الحالة عمداً: حارس `PUT /tenant` أضيق من حارس الإعدادات (يشترط
   * المالك أو دور Spatie أو system.manage)، فدمجهما في نداءٍ واحد كان يُسقط
   * حفظ الحالة بـ403 لمن يملكها لمجرد أنه لا يملك تعديل بيانات المكتب.
   */
  static async saveTaxNumber(taxNumber: string): Promise<string> {
    const normalized = normalizeTaxNumber(taxNumber);

    const res = await apiClient.put<ApiResponse<unknown>>('/tenant', {
      tax_number: normalized || null,
    });

    if (!res.success) {
      throw new Error(res.message || 'تعذّر حفظ الرقم الضريبي');
    }

    return normalized;
  }
}
