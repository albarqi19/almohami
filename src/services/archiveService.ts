import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';

/**
 * خدمة «الأرشيف / سلة المحذوفات» — تطابق مسارات الباك إند (Phase 4):
 *   القضايا:  GET cases/trashed (مُصفّح) · POST cases/{id}/restore · DELETE cases/{id}/force
 *   الوكالات: GET wekalat/trashed (مصفوفة) · POST wekalat/{id}/restore · DELETE wekalat/{id}/force
 *   العملاء:  GET client-management/archived (مصفوفة) · POST .../{id}/restore · DELETE .../{id}/force
 *
 * الاستعادة محكومة بصلاحيات cases.archive/wekala.manage/clients.delete،
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
}

export default ArchiveService;
