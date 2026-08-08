import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

// أوقات إشعارات التطبيق — مستقلّةٌ تماماً عن ساعات إرسال الواتساب.
// القراءة لمستخدمي المكتب، والكتابة محروسة بـ`tenant.settings.manage`.

export interface AppReminderHoursState {
  /** الأوقات المختارة — أو أوقات المنصّة لمن لم يختر. */
  hours: number[];
  /** ما يُعالَج عليه من لم يختر (‏الثامنة صباحاً). */
  default_hours: number[];
  /** المدى المسموح اختيارُه. */
  selectable: number[];
  /** أقصى عدد أوقات. */
  max_slots: number;
}

export class AppReminderHoursService {
  static async load(): Promise<AppReminderHoursState> {
    const res = await apiClient.get<ApiResponse<AppReminderHoursState>>('/app-reminder-hours');
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر جلب أوقات الإشعارات');
    return res.data;
  }

  /** قائمةٌ فارغة = أعِد الافتراضي (‏الخادم يحذف الصفّ ولا يُخزّن `[]`). */
  static async save(hours: number[]): Promise<number[]> {
    const res = await apiClient.put<ApiResponse<{ hours: number[] }>>('/app-reminder-hours', { hours });
    if (!res.success) throw new Error(res.message || 'تعذّر حفظ أوقات الإشعارات');
    return res.data?.hours ?? hours;
  }
}
