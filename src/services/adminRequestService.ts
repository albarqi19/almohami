import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';

// Types
export interface RequestType {
    id: number;
    tenant_id: number;
    name: string;
    name_en: string | null;
    description: string | null;
    requires_dates: boolean;
    requires_reason: boolean;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface AdminRequest {
    id: number;
    tenant_id: number;
    user_id: number;
    request_type_id: number;
    start_date: string | null;
    end_date: string | null;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    manager_notes: string | null;
    reviewed_by: number | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
    // Relations
    user?: {
        id: number;
        name: string;
        email: string;
    };
    request_type?: RequestType;
    reviewer?: {
        id: number;
        name: string;
    };
}

export interface CreateAdminRequestForm {
    request_type_id: number;
    start_date?: string;
    end_date?: string;
    reason?: string;
}

export interface AdminRequestFilters {
    status?: string;
    request_type_id?: number;
    user_id?: number;
    page?: number;
    per_page?: number;
}

export interface AdminRequestStatistics {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    by_type?: Array<{
        request_type_id: number;
        count: number;
        request_type: RequestType;
    }>;
    recent_pending?: AdminRequest[];
}

// ─── Sidebar Types (للمدير: قائمة الموظفين + مَن في إجازة) ───
export interface SidebarUser {
    id: number;
    name: string;
    role: string;
    avatar: string | null;
    is_active: boolean;
    admin_requests_count: number;
    pending_count: number;
}

export interface OnLeaveEntry {
    id: number;
    user_id: number;
    request_type_id: number;
    start_date: string | null;
    end_date: string | null;
    user?: { id: number; name: string; role: string; avatar: string | null };
    request_type?: { id: number; name: string };
}

export interface AdminRequestSidebar {
    users: SidebarUser[];
    on_leave: OnLeaveEntry[];
}

// Admin Request Service
export class AdminRequestService {
    static async getRequests(filters: AdminRequestFilters = {}): Promise<PaginatedResponse<AdminRequest>> {
        const params = new URLSearchParams();

        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, value.toString());
            }
        });

        const queryString = params.toString();
        const endpoint = queryString ? `/admin-requests?${queryString}` : '/admin-requests';

        const response = await apiClient.get<ApiResponse<PaginatedResponse<AdminRequest>>>(endpoint);

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في جلب الطلبات');
        }
    }

    static async getRequest(id: number | string): Promise<AdminRequest> {
        const response = await apiClient.get<ApiResponse<AdminRequest>>(`/admin-requests/${id}`);

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في جلب تفاصيل الطلب');
        }
    }

    static async createRequest(data: CreateAdminRequestForm): Promise<AdminRequest> {
        const response = await apiClient.post<ApiResponse<AdminRequest>>('/admin-requests', data);

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في إنشاء الطلب');
        }
    }

    static async updateRequest(id: number | string, data: Partial<CreateAdminRequestForm>): Promise<AdminRequest> {
        const response = await apiClient.put<ApiResponse<AdminRequest>>(`/admin-requests/${id}`, data);

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في تحديث الطلب');
        }
    }

    static async deleteRequest(id: number | string): Promise<void> {
        const response = await apiClient.delete<ApiResponse>(`/admin-requests/${id}`);

        if (!response.success) {
            throw new Error(response.message || 'فشل في حذف الطلب');
        }
    }

    static async approveRequest(id: number | string, notes?: string): Promise<AdminRequest> {
        const response = await apiClient.patch<ApiResponse<AdminRequest>>(`/admin-requests/${id}/approve`, { notes });

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في قبول الطلب');
        }
    }

    static async rejectRequest(id: number | string, notes: string): Promise<AdminRequest> {
        const response = await apiClient.patch<ApiResponse<AdminRequest>>(`/admin-requests/${id}/reject`, { notes });

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في رفض الطلب');
        }
    }

    static async getStatistics(userId?: number | null): Promise<AdminRequestStatistics> {
        const endpoint = userId
            ? `/admin-requests/statistics?user_id=${userId}`
            : '/admin-requests/statistics';
        const response = await apiClient.get<ApiResponse<AdminRequestStatistics>>(endpoint);

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في جلب الإحصائيات');
        }
    }

    /**
     * بيانات القائمة الجانبية للمدير: موظفو المكتب مع عدد طلبات كل واحد + مَن في إجازة الآن.
     * تُرجع 403 للموظف العادي — يُستدعى فقط حين isManager.
     */
    static async getSidebar(): Promise<AdminRequestSidebar> {
        const response = await apiClient.get<ApiResponse<AdminRequestSidebar>>('/admin-requests/sidebar');

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في جلب بيانات القائمة الجانبية');
        }
    }

    /**
     * يجلب سياق الطلب: إجازات سابقة + مهام/جلسات متعارضة خلال نافذة الإجازة.
     * يُستخدم في ReviewModal لمساعدة المدير قبل القبول.
     */
    static async getRequestContext(id: number | string): Promise<AdminRequestContext> {
        const response = await apiClient.get<ApiResponse<AdminRequestContext>>(`/admin-requests/${id}/context`);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.message || 'فشل في جلب سياق الطلب');
    }
}

// ─── Context Types ───
export interface AdminRequestContext {
    request_window: {
        start_date: string | null;
        end_date: string | null;
        duration_days: number | null;
    };
    employee: { id: number; name: string; role: string };
    previous_leaves: {
        same_type_count: number;
        same_type_days: number;
        this_year_count: number;
        this_year_days: number;
        all_approved: number;
        recent_same_type: Array<{
            id: number;
            start_date: string;
            end_date: string | null;
            reason: string | null;
        }>;
    };
    pending_tasks: Array<{
        id: number;
        title: string;
        due_date: string;
        status: string;
        case_id: number | null;
        priority: string | null;
    }>;
    scheduled_sessions: Array<{
        id: number;
        case_id: number;
        session_type: string | null;
        session_date: string | null;
        session_date_gregorian: string;
        session_time: string | null;
        court: string | null;
        status: string;
        case?: { id: number; title: string; file_number: string | null };
    }>;
    has_conflicts: boolean;
}

// Request Type Service
export class RequestTypeService {
    static async getTypes(all: boolean = true): Promise<RequestType[]> {
        const endpoint = all ? '/request-types?all=true' : '/request-types';
        const response = await apiClient.get<ApiResponse<RequestType[] | PaginatedResponse<RequestType>>>(endpoint);

        if (response.success && response.data) {
            // Handle both array and paginated response
            if (Array.isArray(response.data)) {
                return response.data;
            } else {
                return response.data.data;
            }
        } else {
            throw new Error(response.message || 'فشل في جلب أنواع الطلبات');
        }
    }

    static async createType(data: Partial<RequestType>): Promise<RequestType> {
        const response = await apiClient.post<ApiResponse<RequestType>>('/request-types', data);

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في إنشاء نوع الطلب');
        }
    }

    static async updateType(id: number | string, data: Partial<RequestType>): Promise<RequestType> {
        const response = await apiClient.put<ApiResponse<RequestType>>(`/request-types/${id}`, data);

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في تحديث نوع الطلب');
        }
    }

    static async deleteType(id: number | string): Promise<void> {
        const response = await apiClient.delete<ApiResponse>(`/request-types/${id}`);

        if (!response.success) {
            throw new Error(response.message || 'فشل في حذف نوع الطلب');
        }
    }

    static async toggleStatus(id: number | string): Promise<RequestType> {
        const response = await apiClient.patch<ApiResponse<RequestType>>(`/request-types/${id}/toggle`);

        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error(response.message || 'فشل في تحديث حالة نوع الطلب');
        }
    }
}
