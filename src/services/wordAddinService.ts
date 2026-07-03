import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

// إضافة Microsoft Word — إدارة توكن الربط من صفحة الإعدادات (لغير العملاء)

export interface WordAddinTokenStatus {
  exists: boolean;
  created_at: string | null;
  last_used_at: string | null;
}

export class WordAddinService {
  /** حالة توكن الربط الحالي (دون كشف قيمته). */
  static async getTokenStatus(): Promise<WordAddinTokenStatus> {
    const res = await apiClient.get<ApiResponse<WordAddinTokenStatus>>('/word-addin/token/status');
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر جلب حالة الربط');
    return res.data;
  }

  /** إنشاء توكن جديد (يُبطل السابق) — القيمة تُعرض مرة واحدة فقط. */
  static async generateToken(): Promise<string> {
    const res = await apiClient.post<ApiResponse<{ token: string }>>('/word-addin/token');
    if (!res.success || !res.data?.token) throw new Error(res.message || 'تعذّر إنشاء رمز الربط');
    return res.data.token;
  }

  /** إبطال توكن الربط. */
  static async revokeToken(): Promise<void> {
    const res = await apiClient.delete<ApiResponse<void>>('/word-addin/token');
    if (!res.success) throw new Error(res.message || 'تعذّر إبطال رمز الربط');
  }
}
