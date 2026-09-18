import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { CaseSession } from '../types';

/** جلسة كما يعيدها GET /sessions/{id}: مع قضيتها وعدّادات تحضيرها وطلباتها */
export type SessionDetail = CaseSession & {
  case?: { id: number; title: string; file_number?: string | null; case_type_arabic?: string | null; client_name?: string | null; court?: string | null; client_id?: number | null; najiz_id?: string | null } | null;
  preparations_count?: number;
  completed_preparations_count?: number;
  motions_count?: number;
  ready_motions_count?: number;
};

/** جلسات القضايا داخل غرفة المشروع: قراءة الجلسة، وإفادة المكتب، وتعليمها منتهية. */
export class CaseSessionService {
  static async get(id: number): Promise<SessionDetail> {
    const res = await apiClient.get<ApiResponse<SessionDetail>>(`/sessions/${id}`);
    if (!res.success || !res.data) throw new Error(res.message || 'تعذر جلب الجلسة');
    return res.data;
  }

  /** إفادة المكتب عن الجلسة بقلم المحامي (ليست ضبط ناجز) */
  static async saveOfficeStatement(id: number, text: string): Promise<void> {
    const res = await apiClient.put<ApiResponse>(`/sessions/${id}/office-statement`, { office_statement: text });
    if (!res.success) throw new Error(res.message || 'تعذر حفظ الإفادة');
  }

  /** «انتهت الجلسة» لجلسة اليوم: يفتح باب التقرير فوراً */
  static async markEnded(id: number): Promise<void> {
    const res = await apiClient.post<ApiResponse>(`/sessions/${id}/mark-ended`, {});
    if (!res.success) throw new Error(res.message || 'تعذر تعليم الجلسة');
  }
}
