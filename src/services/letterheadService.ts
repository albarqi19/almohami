import { apiClient } from '../utils/api';
import type {
  Letterhead,
  LetterheadFormData,
  LetterheadResponse,
  LetterheadListResponse,
  ImageUploadResponse,
} from '../types/letterhead';

export class LetterheadService {
  /**
   * الحصول على قائمة الكليشات
   */
  static async getAll(filters: {
    type?: string;
    is_active?: boolean;
    search?: string;
  } = {}): Promise<LetterheadListResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const query = params.toString();
    return apiClient.get<LetterheadListResponse>(`/letterheads${query ? `?${query}` : ''}`);
  }

  /**
   * الحصول على كليشة محددة
   */
  static async getById(id: number): Promise<LetterheadResponse> {
    return apiClient.get<LetterheadResponse>(`/letterheads/${id}`);
  }

  /**
   * الحصول على الكليشة الافتراضية للطباعة
   */
  static async getDefault(): Promise<LetterheadResponse> {
    return apiClient.get<LetterheadResponse>('/letterheads/default');
  }

  /**
   * إنشاء كليشة جديدة
   */
  static async create(data: LetterheadFormData): Promise<LetterheadResponse> {
    return apiClient.post<LetterheadResponse>('/letterheads', data);
  }

  /**
   * تحديث كليشة
   */
  static async update(id: number, data: Partial<LetterheadFormData>): Promise<LetterheadResponse> {
    return apiClient.put<LetterheadResponse>(`/letterheads/${id}`, data);
  }

  /**
   * حذف كليشة
   */
  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/letterheads/${id}`);
  }

  /**
   * تعيين كليشة كافتراضية
   */
  static async setDefault(id: number): Promise<LetterheadResponse> {
    return apiClient.post<LetterheadResponse>(`/letterheads/${id}/set-default`);
  }

  /**
   * تكرار كليشة
   */
  static async duplicate(id: number): Promise<LetterheadResponse> {
    return apiClient.post<LetterheadResponse>(`/letterheads/${id}/duplicate`);
  }

  /**
   * رفع صورة للكليشة (Header/Footer/Logo/Watermark)
   */
  static async uploadImage(
    file: File,
    type: 'header' | 'footer' | 'logo' | 'watermark'
  ): Promise<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);
    return apiClient.postFormData<ImageUploadResponse>('/letterheads/upload-image', formData);
  }
}
