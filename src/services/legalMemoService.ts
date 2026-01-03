import { apiClient } from '../utils/api';

export interface LegalMemo {
  id: string;
  title: string;
  content: string;
  memo_type: string;
  category: string;
  case_id?: string;
  created_by: string;
  assigned_lawyer?: string;
  status: 'draft' | 'under_review' | 'approved' | 'needs_revision' | 'finalized';
  last_auto_saved_at?: string;
  ai_analysis_enabled: boolean;
  last_analyzed_at?: string;
  ai_suggestions?: any[];
  ai_warnings?: any[];
  metadata?: any;
  formatting_data?: any;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    name: string;
  };
  assignedLawyer?: {
    id: string;
    name: string;
  };
  case?: {
    id: string;
    title: string;
  };
  documents?: any[];
}

export interface CreateMemoData {
  title: string;
  content: string;
  memo_type: string;
  category: string;
  case_id?: string;
  assigned_lawyer?: string;
  document_ids?: string[];
  formatting_data?: any;
  analysis_result?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}

export class LegalMemoService {

  /**
   * الحصول على قائمة المذكرات
   */
  static async getMemos(params?: {
    case_id?: string;
    category?: string;
    status?: string;
    per_page?: number;
  }): Promise<{
    data: LegalMemo[];
    current_page: number;
    last_page: number;
    total: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/legal-memos?${queryString}` : '/legal-memos';

    const response = await apiClient.get<ApiResponse<any>>(endpoint);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب المذكرات');
    }
  }

  /**
   * إنشاء مذكرة جديدة
   */
  static async createMemo(data: CreateMemoData): Promise<LegalMemo> {
    const response = await apiClient.post<ApiResponse<LegalMemo>>('/legal-memos', data);

    if (response.success && response.data) {
      return response.data;
    } else {
      const errorMessage = response.errors
        ? Object.values(response.errors).flat().join(', ')
        : response.message || 'فشل في إنشاء المذكرة';
      throw new Error(errorMessage);
    }
  }

  /**
   * الحصول على مذكرة محددة
   */
  static async getMemo(id: string): Promise<LegalMemo> {
    const response = await apiClient.get<ApiResponse<LegalMemo>>(`/legal-memos/${id}`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب المذكرة');
    }
  }

  /**
   * تحديث مذكرة
   */
  static async updateMemo(id: string, data: Partial<CreateMemoData>): Promise<LegalMemo> {
    const response = await apiClient.put<ApiResponse<LegalMemo>>(`/legal-memos/${id}`, data);

    if (response.success && response.data) {
      return response.data;
    } else {
      const errorMessage = response.errors
        ? Object.values(response.errors).flat().join(', ')
        : response.message || 'فشل في تحديث المذكرة';
      throw new Error(errorMessage);
    }
  }

  /**
   * حفظ تلقائي للمذكرة
   */
  static async autoSaveMemo(id: string, data: {
    content: string;
    formatting_data?: any;
  }): Promise<{ last_saved_at: string }> {
    const response = await apiClient.post<ApiResponse<{ last_saved_at: string }>>(`/legal-memos/${id}/auto-save`, data);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في الحفظ التلقائي');
    }
  }

  /**
   * تحليل ذكي للمذكرة
   */
  static async analyzeMemo(id: string): Promise<{
    suggestions: any[];
    warnings: any[];
    analyzed_at: string;
  }> {
    const response = await apiClient.post<ApiResponse<any>>(`/legal-memos/${id}/ai-analysis`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في التحليل الذكي');
    }
  }

  /**
   * حذف مذكرة
   */
  static async deleteMemo(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<void>>(`/legal-memos/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف المذكرة');
    }
  }

  /**
   * الحصول على المذكرات الخاصة بقضية معينة
   */
  static async getCaseMemos(caseId: string): Promise<LegalMemo[]> {
    const response = await this.getMemos({ case_id: caseId });
    return response.data;
  }

  /**
   * الحصول على أنواع المذكرات وفئاتها
   */
  static getMemoCategories() {
    return {
      opening: {
        name: 'مذكرات افتتاحية',
        types: {
          claim_petition: 'صحيفة دعوى',
          response_to_claim: 'مذكرة رد على صحيفة دعوى',
        }
      },
      pleading: {
        name: 'مذكرات المرافعة',
        types: {
          written_plea: 'مذكرة جوابية (مرافعة مكتوبة)',
          counter_plea: 'مذكرة تعقيبية',
          formal_objection: 'مذكرة بدفوع شكلية',
          substantive_objection: 'مذكرة بدفوع موضوعية',
        }
      },
      evidence: {
        name: 'مذكرات الإثبات والطلبات',
        types: {
          oath_request: 'مذكرة بطلب توجيه اليمين',
          witness_hearing: 'مذكرة بطلب سماع شهادة الشهود',
          expert_appointment: 'مذكرة بطلب ندب خبير أو محاسب',
          party_intervention: 'مذكرة بطلب إدخال خصم جديد',
          document_inspection: 'مذكرة بطلب الاطلاع على المستندات',
        }
      },
      appeal: {
        name: 'مذكرات الأحكام والطعن',
        types: {
          appeal_memo: 'مذكرة استئناف (لائحة اعتراضية)',
          reconsideration_request: 'مذكرة التماس إعادة النظر',
          cassation_appeal: 'مذكرة نقض (طعن أمام المحكمة العليا)',
        }
      },
      execution: {
        name: 'مذكرات التنفيذ',
        types: {
          execution_request: 'مذكرة بطلب تنفيذ حكم أو سند تنفيذي',
          execution_objection: 'مذكرة اعتراض على إجراءات التنفيذ',
          execution_suspension: 'مذكرة بطلب وقف التنفيذ',
          execution_dispute: 'مذكرة إشكال في التنفيذ (إشكال وقتي)',
        }
      },
      specialized: {
        name: 'مذكرات خاصة حسب نوع القضايا',
        types: {
          family_law_memo: 'مذكرة في دعاوى الأحوال الشخصية',
          endowment_memo: 'مذكرة في دعاوى الوقف والوصايا',
          criminal_law_memo: 'مذكرة في دعاوى الحدود والتعزيرات',
          commercial_memo: 'مذكرة في القضايا التجارية',
          labor_memo: 'مذكرة في القضايا العمالية',
          other: 'مذكرة أخرى',
        }
      }
    };
  }

  /**
   * الحصول على حالات المذكرة
   */
  static getStatusOptions() {
    return {
      draft: 'مسودة',
      under_review: 'قيد المراجعة',
      approved: 'معتمدة',
      needs_revision: 'تحتاج مراجعة',
      finalized: 'نهائية',
    };
  }

  /**
   * إجراء تحليل ذكي للمذكرة مع دعم واجهة الخطوات المرئية
   */
  /**
   * إنشاء مذكرة جديدة مع الملفات المرفقة
   */
  static async createMemoWithFiles(formData: FormData): Promise<LegalMemo> {
    const response = await apiClient.post('/legal-memos/with-files', formData) as { data: ApiResponse<LegalMemo> };

    if (!response.data.success) {
      throw new Error(response.data.message || 'فشل في إنشاء المذكرة مع الملفات');
    }

    return response.data.data!;
  }

  /**
   * تحديث مذكرة موجودة مع الملفات المرفقة
   */
  static async updateMemoWithFiles(id: string, formData: FormData): Promise<LegalMemo> {
    const response = await apiClient.post(`/legal-memos/${id}/with-files`, formData) as { data: ApiResponse<LegalMemo> };

    if (!response.data.success) {
      throw new Error(response.data.message || 'فشل في تحديث المذكرة مع الملفات');
    }

    return response.data.data!;
  }

  static async analyzeSmartly(
    memoId: number,
    forceReanalysis: boolean = false,
    onProgressUpdate?: (step: AnalysisStep) => void
  ): Promise<any> {
    try {
      console.log('بدء التحليل الذكي للمذكرة:', memoId);
      console.log('إعادة تحليل إجباري:', forceReanalysis);

      // خطوة 1: بدء التحليل
      onProgressUpdate?.({
        id: 'start_analysis',
        title: 'بدء التحليل الذكي',
        status: 'loading',
        message: 'جاري فحص المذكرة والوثائق المرفقة...'
      });

      const requestData = forceReanalysis ? { force_reanalysis: true } : {};
      const response = await apiClient.post(`/legal-memos/${memoId}/smart-analysis`, requestData) as { data: any };

      // معالجة الخطوات من الاستجابة
      if (response.data.data?.analysis_steps) {
        response.data.data.analysis_steps.forEach((step: any) => {
          onProgressUpdate?.({
            id: `step_${step.step}`,
            title: step.title,
            status: step.status === 'completed' ? 'completed' : 'loading',
            message: step.result
          });
        });
      }

      // خطوة نهائية
      onProgressUpdate?.({
        id: 'analysis_complete',
        title: 'اكتمال التحليل',
        status: 'completed',
        message: 'تم إنجاز التحليل الذكي بنجاح'
      });

      console.log('تم إكمال التحليل الذكي:', response.data);

      return response.data;
    } catch (error) {
      console.error('خطأ في التحليل الذكي:', error);

      // إرسال خطوة الخطأ
      onProgressUpdate?.({
        id: 'analysis_error',
        title: 'خطأ في التحليل',
        status: 'error',
        message: 'فشل في إجراء التحليل الذكي',
        error: (error as Error).message
      });

      throw error;
    }
  }

}

export interface AnalysisStep {
  id: string;
  title: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  message?: string;
  error?: string;
}
