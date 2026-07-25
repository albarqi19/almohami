import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

// تطبيق الجوال «رائد» — إصدار رمز الاقتران وإدارة الأجهزة المرتبطة من صفحة الإعدادات.
// كل المسارات خلف `internal.user` في الخادم (لغير العملاء)، والرمز يُعرض مرة واحدة فقط.

/** رمز اقتران صالح لثلاث دقائق — يظهر مرة واحدة عند الإصدار ولا يُخزَّن. */
export interface MobilePairingCode {
  /** الرمز الخام بلا فواصل (يُقبل في التطبيق كما هو). */
  code: string;
  /** الرمز بصيغة العرض `XXXX-XXXX`. */
  formatted_code: string;
  expires_at: string;
  /** مدة الصلاحية بالثواني (١٨٠). */
  expires_in: number;
  api_base_url: string;
  /** حمولة جاهزة لرمز QR لاحقاً: `raed://pair?code=…&api=…` */
  pair_payload: string;
}

/**
 * جهاز جوال مرتبط بحساب المستخدم.
 * الحقول مطابقة لـ MobileDeviceController::presentDevice — لا يُعاد التوكن ولا جزء منه.
 */
export interface MobileDevice {
  id: number;
  /** ⚠️ معرّف السحب هو هذا الـUUID لا المفتاح الرقمي `id`. */
  device_id: string;
  device_name: string | null;
  platform: string | null;
  os_version: string | null;
  app_version: string | null;
  is_current: boolean;
  is_active: boolean;
  paired_at: string | null;
  first_paired_at: string | null;
  last_seen_at: string | null;
  last_ip: string | null;
  token_expires_at: string | null;
  token_last_used_at: string | null;
  absolute_expires_at: string | null;
}

export class MobileAppService {
  /** إصدار رمز اقتران جديد — يُعرض مرة واحدة فقط ولا يمكن استرجاعه. */
  static async issueCode(): Promise<MobilePairingCode> {
    const res = await apiClient.post<ApiResponse<MobilePairingCode>>('/mobile/pairing-codes');
    if (!res.success || !res.data?.code) throw new Error(res.message || 'تعذّر إنشاء رمز الاقتران');
    return res.data;
  }

  /** الأجهزة المرتبطة (غير المسحوبة). */
  static async listDevices(): Promise<MobileDevice[]> {
    const res = await apiClient.get<ApiResponse<MobileDevice[]>>('/mobile/devices');
    if (!res.success) throw new Error(res.message || 'تعذّر جلب الأجهزة المرتبطة');
    return res.data ?? [];
  }

  /** فصل جهاز بعينه — المعرّف هو `device_id` (UUID). */
  static async revokeDevice(deviceId: string): Promise<void> {
    const res = await apiClient.delete<ApiResponse<void>>(`/mobile/devices/${encodeURIComponent(deviceId)}`);
    if (!res.success) throw new Error(res.message || 'تعذّر فصل الجهاز');
  }

  /** فصل كل الأجهزة الأخرى — يعيد عدد ما سُحب. */
  static async revokeAll(): Promise<number> {
    const res = await apiClient.post<ApiResponse<{ revoked: number }>>('/mobile/devices/revoke-all');
    if (!res.success) throw new Error(res.message || 'تعذّر فصل الأجهزة');
    return res.data?.revoked ?? 0;
  }
}
