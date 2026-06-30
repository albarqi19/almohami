import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type {
  EmployeeProfile,
  EmployeeCompensation,
  HrStats,
  EmployeeFilters,
  EmploymentContract,
  EmploymentContractAddendum,
  EmployeeDocument,
  HrChecklistItem,
  ChecklistKind,
  HrHoliday,
  HolidayType,
} from '../types/hr';

const BASE = '/hr/employees';

/**
 * خدمة الموارد البشرية — المرحلة 1.
 * كل المسارات محروسة في الباك بـ hr.* + بوابة hr_enabled (المدير فقط).
 */
export const hrService = {
  async getEmployees(filters: EmployeeFilters = {}): Promise<PaginatedResponse<EmployeeProfile>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    const qs = params.toString();
    const res = await apiClient.get<ApiResponse<PaginatedResponse<EmployeeProfile>>>(qs ? `${BASE}?${qs}` : BASE);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب الموظفين');
  },

  async getStats(): Promise<HrStats> {
    const res = await apiClient.get<ApiResponse<HrStats>>(`${BASE}/stats`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب الإحصائيات');
  },

  async getEmployee(id: number): Promise<EmployeeProfile> {
    const res = await apiClient.get<ApiResponse<EmployeeProfile>>(`${BASE}/${id}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب بيانات الموظف');
  },

  async createEmployee(payload: Partial<EmployeeProfile> & { user_id: number }): Promise<EmployeeProfile> {
    const res = await apiClient.post<ApiResponse<EmployeeProfile>>(BASE, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في إنشاء ملف الموظف');
  },

  async updateEmployee(id: number, payload: Partial<EmployeeProfile>): Promise<EmployeeProfile> {
    const res = await apiClient.put<ApiResponse<EmployeeProfile>>(`${BASE}/${id}`, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في تحديث الملف');
  },

  async deleteEmployee(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`${BASE}/${id}`);
    if (!res.success) throw new Error(res.message || 'فشل في حذف الملف');
  },

  async upsertCompensation(id: number, payload: Partial<EmployeeCompensation>): Promise<EmployeeCompensation> {
    const res = await apiClient.put<ApiResponse<EmployeeCompensation>>(`${BASE}/${id}/compensation`, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في حفظ التعويضات');
  },

  // ───────────── عقود العمل (A1) ─────────────

  async getContracts(employeeId: number): Promise<EmploymentContract[]> {
    const res = await apiClient.get<ApiResponse<EmploymentContract[]>>(`${BASE}/${employeeId}/contracts`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب العقود');
  },

  async getContract(employeeId: number, contractId: number): Promise<EmploymentContract> {
    const res = await apiClient.get<ApiResponse<EmploymentContract>>(`${BASE}/${employeeId}/contracts/${contractId}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب العقد');
  },

  async createContract(employeeId: number, payload: Partial<EmploymentContract>): Promise<EmploymentContract> {
    const res = await apiClient.post<ApiResponse<EmploymentContract>>(`${BASE}/${employeeId}/contracts`, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في إنشاء العقد');
  },

  async updateContract(employeeId: number, contractId: number, payload: Partial<EmploymentContract>): Promise<EmploymentContract> {
    const res = await apiClient.put<ApiResponse<EmploymentContract>>(`${BASE}/${employeeId}/contracts/${contractId}`, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في تحديث العقد');
  },

  async deleteContract(employeeId: number, contractId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`${BASE}/${employeeId}/contracts/${contractId}`);
    if (!res.success) throw new Error(res.message || 'فشل في حذف العقد');
  },

  async addAddendum(employeeId: number, contractId: number, payload: Partial<EmploymentContractAddendum>): Promise<EmploymentContractAddendum> {
    const res = await apiClient.post<ApiResponse<EmploymentContractAddendum>>(`${BASE}/${employeeId}/contracts/${contractId}/addendums`, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في إضافة الملحق');
  },

  // ───────────── مستندات الموظف (A2 — OneDrive) ─────────────

  async getDocuments(employeeId: number): Promise<EmployeeDocument[]> {
    const res = await apiClient.get<ApiResponse<EmployeeDocument[]>>(`${BASE}/${employeeId}/documents`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب المستندات');
  },

  async getDocUploadUrl(employeeId: number, fileName: string): Promise<{ upload_url: string; folder_id?: string }> {
    const res = await apiClient.post<ApiResponse<{ upload_url: string; folder_id?: string }>>(`${BASE}/${employeeId}/documents/upload-url`, { file_name: fileName });
    if (res.success && res.data?.upload_url) return res.data;
    throw new Error(res.message || 'تعذّر إنشاء رابط الرفع');
  },

  async registerDoc(employeeId: number, payload: Record<string, unknown>): Promise<EmployeeDocument> {
    const res = await apiClient.post<ApiResponse<EmployeeDocument>>(`${BASE}/${employeeId}/documents/register`, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل تسجيل المستند');
  },

  async getDocDownloadUrl(employeeId: number, documentId: number): Promise<string> {
    const res = await apiClient.get<ApiResponse<{ url: string }>>(`${BASE}/${employeeId}/documents/${documentId}/download`);
    if (res.success && res.data?.url) return res.data.url;
    throw new Error(res.message || 'تعذّر التنزيل');
  },

  async deleteDoc(employeeId: number, documentId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`${BASE}/${employeeId}/documents/${documentId}`);
    if (!res.success) throw new Error(res.message || 'فشل حذف المستند');
  },

  // ───────────── المباشرة/المغادرة (A3) ─────────────

  async getChecklist(employeeId: number): Promise<HrChecklistItem[]> {
    const res = await apiClient.get<ApiResponse<HrChecklistItem[]>>(`${BASE}/${employeeId}/checklist`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب القائمة');
  },

  async seedChecklist(employeeId: number): Promise<HrChecklistItem[]> {
    const res = await apiClient.post<ApiResponse<HrChecklistItem[]>>(`${BASE}/${employeeId}/checklist/seed`, {});
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل تهيئة القائمة');
  },

  async addChecklistItem(employeeId: number, kind: ChecklistKind, label: string): Promise<HrChecklistItem> {
    const res = await apiClient.post<ApiResponse<HrChecklistItem>>(`${BASE}/${employeeId}/checklist`, { kind, label });
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل إضافة البند');
  },

  async toggleChecklistItem(employeeId: number, itemId: number): Promise<HrChecklistItem> {
    const res = await apiClient.patch<ApiResponse<HrChecklistItem>>(`${BASE}/${employeeId}/checklist/${itemId}/toggle`, {});
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل التحديث');
  },

  async deleteChecklistItem(employeeId: number, itemId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`${BASE}/${employeeId}/checklist/${itemId}`);
    if (!res.success) throw new Error(res.message || 'فشل حذف البند');
  },

  // ───────────── التقويم الرسمي (B1) — مستوى المكتب ─────────────

  async getHolidays(year?: number): Promise<HrHoliday[]> {
    const res = await apiClient.get<ApiResponse<HrHoliday[]>>(`/hr/holidays${year ? `?year=${year}` : ''}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل في جلب التقويم');
  },

  async generateHolidays(year: number): Promise<{ created: number; year: number }> {
    const res = await apiClient.post<ApiResponse<{ created: number; year: number }>>(`/hr/holidays/generate`, { year });
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل توليد التقويم');
  },

  async addHoliday(payload: { name: string; date_gregorian: string; type?: HolidayType }): Promise<HrHoliday> {
    const res = await apiClient.post<ApiResponse<HrHoliday>>(`/hr/holidays`, payload);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل إضافة الإجازة');
  },

  async confirmHoliday(id: number): Promise<HrHoliday> {
    const res = await apiClient.post<ApiResponse<HrHoliday>>(`/hr/holidays/${id}/confirm`, {});
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل اعتماد الإجازة');
  },

  async deleteHoliday(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`/hr/holidays/${id}`);
    if (!res.success) throw new Error(res.message || 'فشل حذف الإجازة');
  },
};
