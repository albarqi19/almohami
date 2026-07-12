import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';

/**
 * خدمة «الأرشيف / سلة المحذوفات» — تطابق مسارات الباك إند (Phase 4 + توسعة 2026-07-12):
 *   القضايا:  GET cases/trashed (مُصفّح) · POST cases/{id}/restore · DELETE cases/{id}/force
 *   الوكالات: GET wekalat/trashed (مصفوفة) · POST wekalat/{id}/restore · DELETE wekalat/{id}/force
 *   العملاء:  GET client-management/archived (مصفوفة) · POST .../{id}/restore · DELETE .../{id}/force
 *   المهام:   GET tasks/trashed (مُصفّح) · POST tasks/{id}/restore · DELETE tasks/{id}/force
 *   التنفيذ:  GET execution-requests/trashed (مُصفّح) · POST .../{id}/restore · DELETE .../{id}/force
 *   الخدمات:  GET legal-services/trashed (مُصفّح) · POST .../{id}/restore · DELETE .../{id}/force
 *
 * الاستعادة محكومة بصلاحيات cases.archive/wekala.manage/clients.delete/
 * tasks.delete/execution.manage/legal-services.manage،
 * والحذف النهائي بصلاحيات *.force-delete (مالك/مدير) — يفرضها الباك إند.
 */

export interface TrashedCase {
  id: number;
  file_number: string;
  title: string;
  client_name: string | null;
  status: string;
  deleted_at: string;
}

export interface TrashedWekala {
  id: number;
  number: string;
  type: string | null;
  status: string;
  source: string;
  deleted_at: string;
}

export interface ArchivedClient {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  national_id: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface TrashedTask {
  id: number;
  title: string;
  status: string;
  priority: string | null;
  case_id: number | null;
  assigned_to: number | null;
  deleted_at: string;
  case?: { id: number; title: string | null; file_number: string | null } | null;
  assignee?: { id: number; name: string } | null;
}

export interface TrashedExecutionRequest {
  id: number;
  request_number: string;
  main_document_type: string | null;
  court: string | null;
  status: string | null;
  total_amount: string | number | null;
  deleted_at: string;
}

export interface TrashedLegalService {
  id: number;
  service_number: string | null;
  title: string;
  service_type: string;
  status: string;
  deleted_at: string;
  client?: { id: number; name: string } | null;
  assigned_lawyer?: { id: number; name: string } | null;
}

class ArchiveService {
  // ───────────── القضايا (مُصفّحة) ─────────────
  static async getTrashedCases(page = 1, perPage = 20): Promise<PaginatedResponse<TrashedCase>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<TrashedCase>>>(
      `/cases/trashed?page=${page}&per_page=${perPage}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلب القضايا المؤرشفة');
  }

  static async restoreCase(id: number): Promise<void> {
    const res = await apiClient.post<ApiResponse>(`/cases/${id}/restore`, {});
    if (!res.success) throw new Error(res.message || 'تعذّرت استعادة القضية');
  }

  static async forceDeleteCase(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`/cases/${id}/force`);
    if (!res.success) throw new Error(res.message || 'تعذّر الحذف النهائي للقضية');
  }

  // ───────────── الوكالات (مصفوفة) ─────────────
  static async getTrashedWekalat(): Promise<TrashedWekala[]> {
    const res = await apiClient.get<ApiResponse<TrashedWekala[]>>(`/wekalat/trashed`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلب الوكالات المؤرشفة');
  }

  static async restoreWekala(id: number): Promise<void> {
    const res = await apiClient.post<ApiResponse>(`/wekalat/${id}/restore`, {});
    if (!res.success) throw new Error(res.message || 'تعذّرت استعادة الوكالة');
  }

  static async forceDeleteWekala(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`/wekalat/${id}/force`);
    if (!res.success) throw new Error(res.message || 'تعذّر الحذف النهائي للوكالة');
  }

  // ───────────── العملاء (مصفوفة) ─────────────
  static async getArchivedClients(): Promise<ArchivedClient[]> {
    const res = await apiClient.get<ApiResponse<ArchivedClient[]>>(`/client-management/archived`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلب العملاء المؤرشفين');
  }

  static async restoreClient(id: number): Promise<void> {
    const res = await apiClient.post<ApiResponse>(`/client-management/${id}/restore`, {});
    if (!res.success) throw new Error(res.message || 'تعذّرت استعادة العميل');
  }

  static async forceDeleteClient(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`/client-management/${id}/force`);
    if (!res.success) throw new Error(res.message || 'تعذّر الحذف النهائي للعميل');
  }

  // ───────────── المهام (مُصفّحة) ─────────────
  static async getTrashedTasks(page = 1, perPage = 20): Promise<PaginatedResponse<TrashedTask>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<TrashedTask>>>(
      `/tasks/trashed?page=${page}&per_page=${perPage}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلب المهام المحذوفة');
  }

  static async restoreTask(id: number): Promise<void> {
    const res = await apiClient.post<ApiResponse>(`/tasks/${id}/restore`, {});
    if (!res.success) throw new Error(res.message || 'تعذّرت استعادة المهمة');
  }

  static async forceDeleteTask(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`/tasks/${id}/force`);
    if (!res.success) throw new Error(res.message || 'تعذّر الحذف النهائي للمهمة');
  }

  // ───────────── طلبات التنفيذ (مُصفّحة) ─────────────
  static async getTrashedExecutionRequests(page = 1, perPage = 20): Promise<PaginatedResponse<TrashedExecutionRequest>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<TrashedExecutionRequest>>>(
      `/execution-requests/trashed?page=${page}&per_page=${perPage}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلب طلبات التنفيذ المحذوفة');
  }

  static async restoreExecutionRequest(id: number): Promise<void> {
    const res = await apiClient.post<ApiResponse>(`/execution-requests/${id}/restore`, {});
    if (!res.success) throw new Error(res.message || 'تعذّرت استعادة طلب التنفيذ');
  }

  static async forceDeleteExecutionRequest(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`/execution-requests/${id}/force`);
    if (!res.success) throw new Error(res.message || 'تعذّر الحذف النهائي لطلب التنفيذ');
  }

  // ───────────── الخدمات القانونية (مُصفّحة) ─────────────
  static async getTrashedLegalServices(page = 1, perPage = 20): Promise<PaginatedResponse<TrashedLegalService>> {
    const res = await apiClient.get<ApiResponse<PaginatedResponse<TrashedLegalService>>>(
      `/legal-services/trashed?page=${page}&per_page=${perPage}`
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر جلب الخدمات المحذوفة');
  }

  static async restoreLegalService(id: number): Promise<void> {
    const res = await apiClient.post<ApiResponse>(`/legal-services/${id}/restore`, {});
    if (!res.success) throw new Error(res.message || 'تعذّرت استعادة الخدمة');
  }

  static async forceDeleteLegalService(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`/legal-services/${id}/force`);
    if (!res.success) throw new Error(res.message || 'تعذّر الحذف النهائي للخدمة');
  }
}

export default ArchiveService;
