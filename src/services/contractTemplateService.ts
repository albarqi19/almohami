import { apiClient } from '../utils/api';
import type {
  ContractTemplate,
  ContractTemplateFilters,
  ContractTemplatesResponse,
  ContractTemplateResponse,
} from '../types/contracts';

export class ContractTemplateService {
  private static buildQueryString(filters: ContractTemplateFilters): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  /**
   * الحصول على قائمة قوالب العقود
   */
  static async getTemplates(filters: ContractTemplateFilters = {}): Promise<ContractTemplatesResponse> {
    const query = this.buildQueryString(filters);
    return apiClient.get<ContractTemplatesResponse>(`/contract-templates${query}`);
  }

  /**
   * الحصول على قالب محدد
   */
  static async getTemplate(id: number): Promise<ContractTemplateResponse> {
    return apiClient.get<ContractTemplateResponse>(`/contract-templates/${id}`);
  }

  /**
   * إنشاء قالب جديد
   */
  static async createTemplate(data: Partial<ContractTemplate>): Promise<ContractTemplateResponse> {
    return apiClient.post<ContractTemplateResponse>('/contract-templates', data);
  }

  /**
   * تحديث قالب
   */
  static async updateTemplate(id: number, data: Partial<ContractTemplate>): Promise<ContractTemplateResponse> {
    return apiClient.put<ContractTemplateResponse>(`/contract-templates/${id}`, data);
  }

  /**
   * حذف قالب
   */
  static async deleteTemplate(id: number): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/contract-templates/${id}`);
  }

  /**
   * الحصول على متغيرات القالب
   */
  static async getVariables(id: number): Promise<{ success: boolean; data: string[] }> {
    return apiClient.get<{ success: boolean; data: string[] }>(`/contract-templates/${id}/variables`);
  }

  /**
   * معاينة القالب مع المتغيرات
   */
  static async preview(
    id: number,
    variables: Record<string, string>
  ): Promise<{ success: boolean; data: { content: string } }> {
    return apiClient.post<{ success: boolean; data: { content: string } }>(
      `/contract-templates/${id}/preview`,
      { variables }
    );
  }

  /**
   * نسخ قالب
   */
  static async duplicate(id: number, name: string): Promise<ContractTemplateResponse> {
    return apiClient.post<ContractTemplateResponse>(`/contract-templates/${id}/duplicate`, { name });
  }

  /**
   * الحصول على القوالب النشطة فقط
   */
  static async getActiveTemplates(): Promise<ContractTemplatesResponse> {
    return this.getTemplates({ is_active: true });
  }

  /**
   * الحصول على القالب الافتراضي
   */
  static async getDefaultTemplate(): Promise<ContractTemplateResponse | null> {
    const response = await this.getTemplates({ is_active: true });
    const defaultTemplate = response.data.data.find(t => t.is_default);
    if (defaultTemplate) {
      return { success: true, data: defaultTemplate };
    }
    return null;
  }
}

// Instance export للاستخدام المباشر
export const contractTemplateService = {
  getTemplates: ContractTemplateService.getTemplates.bind(ContractTemplateService),
  getTemplate: ContractTemplateService.getTemplate.bind(ContractTemplateService),
  createTemplate: ContractTemplateService.createTemplate.bind(ContractTemplateService),
  updateTemplate: ContractTemplateService.updateTemplate.bind(ContractTemplateService),
  deleteTemplate: ContractTemplateService.deleteTemplate.bind(ContractTemplateService),
  getVariables: ContractTemplateService.getVariables.bind(ContractTemplateService),
  preview: ContractTemplateService.preview.bind(ContractTemplateService),
  duplicate: ContractTemplateService.duplicate.bind(ContractTemplateService),
  getActiveTemplates: ContractTemplateService.getActiveTemplates.bind(ContractTemplateService),
  getDefaultTemplate: ContractTemplateService.getDefaultTemplate.bind(ContractTemplateService),
};
