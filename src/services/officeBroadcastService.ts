import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

// تعميم المكتب — يكتبه المدير فيصل موظّفيه إشعاراً في الجوّال وفي درج تنبيهات الموقع.
// المساران محروسان بـ`tenant.settings.manage`، والقراءة محروسة كالكتابة:
// سجلّ من أرسل ماذا شأنٌ إداريّ، والموظّف يرى التعميم في تنبيهاته لا هنا.

/** تعميمٌ أُرسل — سجلٌّ للمدير لا لما يراه الموظّف. */
export interface OfficeBroadcast {
  id: number;
  title: string;
  body: string;
  /** تاريخ الرياض — وهو مفتاح الحدّ اليومي لا مجرّد بيان. */
  broadcast_date: string;
  /** كم موظّفاً وصله فعلاً. */
  recipients_count: number;
  created_at: string;
  author?: { id: number; name: string } | null;
}

export interface OfficeBroadcastState {
  broadcasts: OfficeBroadcast[];
  /** أُرسل تعميم اليوم؟ — تُعطَّل بها الواجهة قبل أن يكتب المدير نصّاً يُردّ. */
  sent_today: boolean;
  /** ⚠️ حدود الخادم — تُستعمل في `maxLength` حرفياً وإلا كتب المدير ثم رُدّ بـ422. */
  title_max: number;
  body_max: number;
}

export class OfficeBroadcastService {
  static async load(): Promise<OfficeBroadcastState> {
    const res = await apiClient.get<ApiResponse<OfficeBroadcastState>>('/office-broadcasts');
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر جلب التعاميم');
    return res.data;
  }

  /**
   * إرسال تعميم اليوم.
   *
   * يرمي برسالة الخادم كما هي — وهي عند تجاوز الحدّ اليومي (429) تقول متى
   * يُسمح بالتالي، فلا نستبدلها بنصٍّ عامّ يُخفي السبب.
   */
  static async send(title: string, body: string): Promise<OfficeBroadcast> {
    const res = await apiClient.post<ApiResponse<OfficeBroadcast>>('/office-broadcasts', { title, body });
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر إرسال التعميم');
    return res.data;
  }
}
