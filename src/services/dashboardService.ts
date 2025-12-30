import { apiClient } from '../utils/api';

// Types
export interface DashboardStats {
    total_cases: number;
    active_cases: number;
    pending_cases: number;
    closed_cases: number;
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    in_progress_tasks: number;
    overdue_tasks: number;
    upcoming_sessions: number;
    documents_count: number;
    urgent_items: number;
    user_role: string;
}

export interface RecentCase {
    id: number;
    title: string;
    file_number: string;
    case_type: string;
    client_name: string;
    status: string;
    progress: number;
    court: string;
    next_hearing: string | null;
    last_update: string;
    updated_at: string;
}

export interface UpcomingSession {
    id: number;
    case_id: number;
    case_title: string;
    case_number: string;
    court: string;
    date: string;
    time: string;
    type: string;
    status: string;
    days_until: number;
    is_urgent: boolean;
    notes: string | null;
}

export interface RecentActivity {
    id: number;
    type: string;
    description: string;
    details: string | null;
    case_id: number | null;
    case_title: string | null;
    performer_id: number | null;
    performer_name: string;
    performer_avatar: string | null;
    created_at: string;
    time_ago: string;
}

export interface DashboardTask {
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    case_id: number | null;
    case_title: string | null;
    assignee_id: number | null;
    assignee_name: string;
    is_overdue: boolean;
}

export interface TasksGrouped {
    pending: DashboardTask[];
    in_progress: DashboardTask[];
    completed: DashboardTask[];
}

export interface DashboardSummary {
    stats: DashboardStats;
    recent_cases: RecentCase[];
    upcoming_sessions: UpcomingSession[];
    recent_activities: RecentActivity[];
}

// API Response types
interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

// Dashboard Service
export const DashboardService = {
    /**
     * جلب الإحصائيات الرئيسية
     */
    getStats: async (): Promise<DashboardStats> => {
        try {
            const response = await apiClient.get<ApiResponse<DashboardStats>>('/dashboard/stats');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            throw error;
        }
    },

    /**
     * جلب آخر القضايا النشطة
     */
    getRecentCases: async (limit: number = 5): Promise<RecentCase[]> => {
        try {
            const response = await apiClient.get<ApiResponse<RecentCase[]>>(`/dashboard/recent-cases?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch recent cases:', error);
            throw error;
        }
    },

    /**
     * جلب الجلسات القادمة
     */
    getUpcomingSessions: async (limit: number = 5): Promise<UpcomingSession[]> => {
        try {
            const response = await apiClient.get<ApiResponse<UpcomingSession[]>>(`/dashboard/upcoming-sessions?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch upcoming sessions:', error);
            throw error;
        }
    },

    /**
     * جلب آخر الأنشطة
     */
    getRecentActivities: async (limit: number = 10): Promise<RecentActivity[]> => {
        try {
            const response = await apiClient.get<ApiResponse<RecentActivity[]>>(`/dashboard/recent-activities?limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch recent activities:', error);
            throw error;
        }
    },

    /**
     * جلب المهام (للكانبان)
     */
    getTasks: async (): Promise<TasksGrouped> => {
        try {
            const response = await apiClient.get<ApiResponse<TasksGrouped>>('/dashboard/tasks');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            throw error;
        }
    },

    /**
     * جلب ملخص لوحة التحكم (كل البيانات مرة واحدة)
     */
    getSummary: async (): Promise<DashboardSummary> => {
        try {
            const response = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch dashboard summary:', error);
            throw error;
        }
    },
};

export default DashboardService;
