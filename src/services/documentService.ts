import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { Document } from '../types';

export interface DocumentFilters {
  case_id?: string;
  task_id?: string;
  category?: string;
  uploaded_by?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DocumentUpload {
  title: string;
  description?: string;
  category?: string;
  case_id?: string;
  task_id?: string;
  file: File;
  is_confidential?: boolean;
  tags?: string[];
}

export interface SmartDocumentSave {
  case_id: string;
  temp_path: string;
  title: string;
  description?: string;
  document_type?: string;
  keywords?: string[];
  parties?: string[];
  important_dates?: string[];
  priority?: string;
}

export class DocumentService {
  static async getDocuments(filters: DocumentFilters = {}): Promise<PaginatedResponse<Document>> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/documents?${queryString}` : '/documents';

    const response = await apiClient.get<ApiResponse<PaginatedResponse<Document>>>(endpoint);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب الوثائق');
    }
  }

  static async getDocument(id: string): Promise<Document> {
    const response = await apiClient.get<ApiResponse<Document>>(`/documents/${id}`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب تفاصيل الوثيقة');
    }
  }

  static async uploadDocument(documentData: DocumentUpload): Promise<Document> {
    const formData = new FormData();
    formData.append('file', documentData.file);
    formData.append('title', documentData.title);

    if (documentData.description) {
      formData.append('description', documentData.description);
    }
    if (documentData.category) {
      formData.append('category', documentData.category);
    }
    if (documentData.case_id) {
      formData.append('case_id', documentData.case_id);
    }
    if (documentData.task_id) {
      formData.append('task_id', documentData.task_id);
    }
    if (documentData.is_confidential !== undefined) {
      formData.append('is_confidential', documentData.is_confidential ? '1' : '0');
    }
    if (documentData.tags && documentData.tags.length > 0) {
      documentData.tags.forEach((tag, index) => {
        formData.append(`tags[${index}]`, tag);
      });
    }

    // Log FormData contents for debugging
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      console.log(key, ':', value);
    }

    const response = await apiClient.postFormData<ApiResponse<Document>>('/documents', formData);

    if (response.success && response.data) {
      return response.data;
    } else {
      console.error('Document upload failed:', response);
      const errorMessage = response.errors
        ? Object.values(response.errors).flat().join(', ')
        : response.message || 'فشل في رفع الوثيقة';
      throw new Error(errorMessage);
    }
  }

  static async updateDocument(id: string, documentData: Partial<DocumentUpload>): Promise<Document> {
    // For updates, we don't send file usually, just metadata
    const updateData = {
      title: documentData.title,
      category: documentData.category,
      is_confidential: documentData.is_confidential,
      tags: documentData.tags,
    };

    const response = await apiClient.put<ApiResponse<Document>>(`/documents/${id}`, updateData);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تحديث الوثيقة');
    }
  }

  static async deleteDocument(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/documents/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف الوثيقة');
    }
  }

  static async downloadDocument(id: string): Promise<Blob> {
    // This endpoint should return the file directly
    const response = await fetch(`https://api.alraedlaw.com/api/v1/documents/${id}/download`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
    });

    if (!response.ok) {
      throw new Error('فشل في تحميل الوثيقة');
    }

    return response.blob();
  }

  static async getCaseDocuments(caseId: string): Promise<Document[]> {
    const response = await apiClient.get<ApiResponse<Document[]>>(`/cases/${caseId}/documents`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب وثائق القضية');
    }
  }

  static async getTaskDocuments(taskId: string): Promise<Document[]> {
    const response = await apiClient.get<ApiResponse<Document[]>>(`/tasks/${taskId}/documents`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب وثائق المهمة');
    }
  }

  // Client-specific methods
  static async getMyDocuments(): Promise<Document[]> {
    const response = await apiClient.get<ApiResponse<Document[]>>('/client/documents');

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب وثائقي');
    }
  }

  static async uploadClientDocument(caseId: string, documentData: DocumentUpload): Promise<Document> {
    const formData = new FormData();
    formData.append('file', documentData.file);
    formData.append('title', documentData.title);

    if (documentData.description) {
      formData.append('description', documentData.description);
    }
    if (documentData.category) {
      formData.append('category', documentData.category);
    }
    if (documentData.tags) {
      formData.append('tags', JSON.stringify(documentData.tags));
    }

    const response = await apiClient.postFormData<ApiResponse<Document>>(
      `/client/cases/${caseId}/documents`,
      formData
    );

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في رفع الوثيقة');
    }
  }

  // Document Comments Methods
  static async getDocumentComments(documentId: string): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(`/documents/${documentId}/comments`);

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب التعليقات');
    }
  }

  static async addDocumentComment(documentId: string, content: string, isInternal: boolean = false): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`/documents/${documentId}/comments`, {
      content,
      is_internal: isInternal
    });

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في إضافة التعليق');
    }
  }

  static async updateDocumentComment(documentId: string, commentId: string, content: string): Promise<any> {
    const response = await apiClient.put<ApiResponse<any>>(`/documents/${documentId}/comments/${commentId}`, {
      content
    });

    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تحديث التعليق');
    }
  }

  static async deleteDocumentComment(documentId: string, commentId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/documents/${documentId}/comments/${commentId}`);

    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف التعليق');
    }
  }

  // Smart Document Analysis methods
  static async analyzeSmartDocument(formData: FormData): Promise<ApiResponse<any>> {
    try {
      const response = await fetch('https://api.alraedlaw.com/api/v1/smart-documents/analyze', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Smart document analysis error:', error);
      throw new Error(error.message || 'فشل في تحليل الوثيقة');
    }
  }

  static async saveSmartDocument(data: SmartDocumentSave): Promise<ApiResponse<Document>> {
    try {
      const response = await fetch('https://api.alraedlaw.com/api/v1/smart-documents/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'فشل في حفظ الوثيقة');
    }
  }

  static async deleteTempFile(tempPath: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch('https://api.alraedlaw.com/api/v1/smart-documents/temp', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ temp_path: tempPath })
      });

      const data = await response.json();
      return data;
    } catch (error: any) {
      throw new Error(error.message || 'فشل في حذف الملف المؤقت');
    }
  }

  // Aliases for convenience
  static addComment = DocumentService.addDocumentComment;
  static updateComment = DocumentService.updateDocumentComment;
  static deleteComment = DocumentService.deleteDocumentComment;
}
