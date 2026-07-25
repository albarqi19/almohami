import { apiClient } from '../utils/api';
import type { MeetingCategory, MeetingColor } from './meetingService';

interface CategoriesResponse {
  success: boolean;
  data: MeetingCategory[];
  /** يقرّره الخادم — الواجهة تخفي أزرار الإدارة به، والخادم يفرضه على أي حال */
  can_manage: boolean;
  colors: MeetingColor[];
}

export interface CategoryColorOption {
  key: MeetingColor;
  label: string;
}

/** أسماء الألوان بالعربية — المفتاح رمزي والقيمة الفعلية في category-colors.css */
export const CATEGORY_COLORS: CategoryColorOption[] = [
  { key: 'navy', label: 'كحلي' },
  { key: 'gold', label: 'ذهبي' },
  { key: 'blue', label: 'أزرق' },
  { key: 'green', label: 'أخضر' },
  { key: 'red', label: 'أحمر' },
  { key: 'purple', label: 'بنفسجي' },
  { key: 'orange', label: 'برتقالي' },
  { key: 'gray', label: 'رمادي' },
];

export const meetingCategoryService = {
  async list(): Promise<{ categories: MeetingCategory[]; canManage: boolean }> {
    // apiClient.get<T> يُرجع جسم الاستجابة كاملاً، فـcan_manage مجاور لـdata
    const response = await apiClient.get<CategoriesResponse>('/meeting-categories');
    return {
      categories: response.data ?? [],
      canManage: Boolean(response.can_manage),
    };
  },

  async create(payload: { name: string; color: MeetingColor }): Promise<MeetingCategory> {
    const response = await apiClient.post<{ success: boolean; data: MeetingCategory }>('/meeting-categories', payload);
    return response.data;
  },

  async update(
    id: number,
    payload: Partial<{ name: string; color: MeetingColor; is_active: boolean; position: number }>
  ): Promise<MeetingCategory> {
    const response = await apiClient.put<{ success: boolean; data: MeetingCategory }>(`/meeting-categories/${id}`, payload);
    return response.data;
  },

  /** يُرجع عدد الاجتماعات التي تحرّرت من التصنيف المحذوف. */
  async remove(id: number): Promise<number> {
    const response = await apiClient.delete<{ success: boolean; released_meetings: number }>(`/meeting-categories/${id}`);
    return response.released_meetings ?? 0;
  },
};

export default meetingCategoryService;
