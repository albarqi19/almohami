import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type {
  DocumentRequest,
  DocumentRequestEvent,
  DocumentRequestItem,
  DocumentSubmission,
  CreateDocumentRequestPayload,
  CreateItemPayload,
  UpdateDocumentRequestPayload,
  UploadUrlPayload,
  UploadUrlResponse,
} from '../types/documentRequests';

interface PaginatedMeta {
  current_page: number;
  last_page: number;
  total: number;
  pending_count?: number;
}

interface ListResponse<T> {
  success: boolean;
  data: T[];
  meta?: PaginatedMeta;
  message?: string;
}

/**
 * خدمة طلبات الوثائق — تجمع endpoints المحامي والعميل.
 *
 * Lawyer (الموظف داخل المكتب):
 *  - listByCase / show / create / update / send / cancel / destroy
 *  - storeItem / updateItem / destroyItem
 *  - approveSubmission / rejectSubmission / hideSubmission
 *  - timeline
 *
 * Client (العميل):
 *  - listMine / showMine / uploadUrl / registerUpload
 */
export class DocumentRequestService {
  // ============================================================
  // Lawyer endpoints
  // ============================================================

  static async listByCase(caseId: number | string): Promise<DocumentRequest[]> {
    const response = await apiClient.get<ListResponse<DocumentRequest>>(
      `/cases/${caseId}/document-requests`
    );
    if (!response.success) {
      throw new Error(response.message || 'فشل في جلب طلبات الوثائق');
    }
    return response.data;
  }

  static async show(requestId: number | string): Promise<DocumentRequest> {
    const response = await apiClient.get<ApiResponse<DocumentRequest>>(
      `/document-requests/${requestId}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل في جلب تفاصيل الطلب');
    }
    return response.data;
  }

  static async create(
    caseId: number | string,
    payload: CreateDocumentRequestPayload
  ): Promise<DocumentRequest> {
    const response = await apiClient.post<ApiResponse<DocumentRequest>>(
      `/cases/${caseId}/document-requests`,
      payload
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل إنشاء الطلب');
    }
    return response.data;
  }

  static async update(
    requestId: number | string,
    payload: UpdateDocumentRequestPayload
  ): Promise<DocumentRequest> {
    const response = await apiClient.put<ApiResponse<DocumentRequest>>(
      `/document-requests/${requestId}`,
      payload
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل تحديث الطلب');
    }
    return response.data;
  }

  static async send(requestId: number | string): Promise<DocumentRequest> {
    const response = await apiClient.post<ApiResponse<DocumentRequest>>(
      `/document-requests/${requestId}/send`,
      {}
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل إرسال الطلب');
    }
    return response.data;
  }

  static async cancel(
    requestId: number | string,
    reason?: string
  ): Promise<DocumentRequest> {
    const response = await apiClient.post<ApiResponse<DocumentRequest>>(
      `/document-requests/${requestId}/cancel`,
      reason ? { reason } : {}
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل إلغاء الطلب');
    }
    return response.data;
  }

  static async destroy(requestId: number | string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/document-requests/${requestId}`
    );
    if (!response.success) {
      throw new Error(response.message || 'فشل حذف الطلب');
    }
  }

  // Items
  static async storeItem(
    requestId: number | string,
    payload: CreateItemPayload
  ): Promise<DocumentRequestItem> {
    const response = await apiClient.post<ApiResponse<DocumentRequestItem>>(
      `/document-requests/${requestId}/items`,
      payload
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل إضافة البند');
    }
    return response.data;
  }

  static async updateItem(
    itemId: number | string,
    payload: Partial<CreateItemPayload>
  ): Promise<DocumentRequestItem> {
    const response = await apiClient.put<ApiResponse<DocumentRequestItem>>(
      `/document-requests/items/${itemId}`,
      payload
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل تحديث البند');
    }
    return response.data;
  }

  static async destroyItem(itemId: number | string): Promise<void> {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/document-requests/items/${itemId}`
    );
    if (!response.success) {
      throw new Error(response.message || 'فشل حذف البند');
    }
  }

  // Submissions review
  static async approveSubmission(
    submissionId: number | string
  ): Promise<DocumentSubmission> {
    const response = await apiClient.post<ApiResponse<DocumentSubmission>>(
      `/document-submissions/${submissionId}/approve`,
      {}
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل اعتماد الملف');
    }
    return response.data;
  }

  static async rejectSubmission(
    submissionId: number | string,
    reason: string
  ): Promise<DocumentSubmission> {
    const response = await apiClient.post<ApiResponse<DocumentSubmission>>(
      `/document-submissions/${submissionId}/reject`,
      { reason }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل رفض الملف');
    }
    return response.data;
  }

  static async hideSubmission(
    submissionId: number | string
  ): Promise<DocumentSubmission> {
    const response = await apiClient.post<ApiResponse<DocumentSubmission>>(
      `/document-submissions/${submissionId}/hide`,
      {}
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل إخفاء الملف');
    }
    return response.data;
  }

  static async timeline(
    requestId: number | string
  ): Promise<DocumentRequestEvent[]> {
    const response = await apiClient.get<ListResponse<DocumentRequestEvent>>(
      `/document-requests/${requestId}/timeline`
    );
    if (!response.success) {
      throw new Error(response.message || 'فشل جلب التايم لاين');
    }
    return response.data;
  }

  // ============================================================
  // Client endpoints
  // ============================================================

  static async listMine(): Promise<{
    requests: DocumentRequest[];
    pendingCount: number;
  }> {
    const response = await apiClient.get<ListResponse<DocumentRequest>>(
      `/client/document-requests`
    );
    if (!response.success) {
      throw new Error(response.message || 'فشل جلب الطلبات');
    }
    return {
      requests: response.data,
      pendingCount: response.meta?.pending_count ?? 0,
    };
  }

  static async showMine(requestId: number | string): Promise<DocumentRequest> {
    const response = await apiClient.get<ApiResponse<DocumentRequest>>(
      `/client/document-requests/${requestId}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل جلب الطلب');
    }
    return response.data;
  }

  static async getUploadUrl(
    itemId: number | string,
    payload: UploadUrlPayload
  ): Promise<UploadUrlResponse> {
    const response = await apiClient.post<ApiResponse<UploadUrlResponse>>(
      `/client/document-requests/items/${itemId}/upload-url`,
      payload
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل الحصول على رابط الرفع');
    }
    return response.data;
  }

  static async registerUpload(
    itemId: number | string,
    onedriveFileId: string
  ): Promise<{ submission_id: number }> {
    const response = await apiClient.post<ApiResponse<{ submission_id: number }>>(
      `/client/document-requests/items/${itemId}/register-upload`,
      { onedrive_file_id: onedriveFileId }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'فشل تسجيل الملف');
    }
    return response.data;
  }
}
