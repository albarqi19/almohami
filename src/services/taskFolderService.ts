import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { TaskFolder, TaskFolderColor } from '../types';

/**
 * مجلدات المهام — تنظيم ظاهري بحت (مشترك للمكتب أو شخصي للمستخدم).
 * الشخصية متاحة للجميع؛ المشتركة تتطلب صلاحية tasks.manage-folders (يفرضها الباك،
 * والواجهة تقرأ can_manage_shared من ردّ getFolders لإخفاء الخيار عمّن لا يملكه).
 */

export interface TaskFoldersResponse {
  folders: TaskFolder[];
  can_manage_shared: boolean;
}

export class TaskFolderService {
  /** المجلدات الظاهرة للمستخدم (المشتركة + مجلداته الشخصية) مع عدّاد المهام النشطة */
  static async getFolders(): Promise<TaskFoldersResponse> {
    const response = await apiClient.get<ApiResponse<TaskFoldersResponse>>('/task-folders');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب مجلدات المهام');
  }

  static async createFolder(data: { name: string; color: TaskFolderColor; scope: 'shared' | 'personal' }): Promise<TaskFolder> {
    const response = await apiClient.post<ApiResponse<TaskFolder>>('/task-folders', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في إنشاء المجلد');
  }

  static async updateFolder(id: number, data: { name?: string; color?: TaskFolderColor; position?: number }): Promise<TaskFolder> {
    const response = await apiClient.put<ApiResponse<TaskFolder>>(`/task-folders/${id}`, data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في تحديث المجلد');
  }

  /** حذف المجلد — مهامه تعود للعرض العام تلقائياً (لا حذف للمهام) */
  static async deleteFolder(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<{ released_tasks: number }>>(`/task-folders/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف المجلد');
    }
  }

  /** نقل مهام إلى مجلد (folderId=null = إخراجها للعرض العام) */
  static async moveTasks(taskIds: Array<number | string>, folderId: number | null): Promise<number> {
    const response = await apiClient.post<ApiResponse<{ moved: number }>>('/task-folders/move-tasks', {
      task_ids: taskIds.map((id) => Number(id)),
      folder_id: folderId,
    });
    if (response.success && response.data) {
      return response.data.moved;
    }
    throw new Error(response.message || 'فشل في نقل المهام');
  }
}

/** لوحة ألوان المجلدات — مفاتيح رمزية تُحوَّل لمتغيرات الثيم في CSS */
export const FOLDER_COLORS: { key: TaskFolderColor; label: string }[] = [
  { key: 'gold', label: 'ذهبي' },
  { key: 'navy', label: 'كحلي' },
  { key: 'green', label: 'أخضر' },
  { key: 'red', label: 'أحمر' },
  { key: 'purple', label: 'بنفسجي' },
  { key: 'blue', label: 'أزرق' },
  { key: 'orange', label: 'برتقالي' },
  { key: 'gray', label: 'رمادي' },
];
