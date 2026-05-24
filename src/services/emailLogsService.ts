import { apiClient } from '../utils/api';

export type EmailStatus = 'queued' | 'pending' | 'sent' | 'fallback_sent' | 'failed';
export type EmailProvider = 'outlook_graph' | 'smtp_default' | 'failed';
export type EmailCategory =
    | 'welcome'
    | 'payment_success'
    | 'payment_failed'
    | 'expiry_reminder'
    | 'data_delete_code'
    | 'admin_request'
    | 'generic';

export interface EmailLogEntry {
    id: number;
    to_email: string;
    from_email: string | null;
    subject: string;
    category: EmailCategory | string;
    provider: EmailProvider | string;
    status: EmailStatus;
    error_code: string | null;
    error_source: string | null;
    provider_status_code: number | null;
    correlation_id: string | null;
    connection_id: number | null;
    attempts: number;
    sent_at: string | null;
    created_at: string;
    recipient: { id: number; name: string; email: string } | null;
    body_preview?: string | null; // فقط عند ?include=preview
    last_error?: string | null;
}

export interface EmailLogsResponse {
    success: true;
    data: EmailLogEntry[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export interface EmailLogsFilters {
    category?: EmailCategory | string;
    status?: EmailStatus;
    error_code?: string;
    search?: string;
    per_page?: number;
    page?: number;
    include?: 'preview';
}

export interface EmailStatsTotals {
    total_30d: number;
    sent_outlook: number;
    sent_smtp: number;
    failed: number;
    queued_or_pending: number;
    delivery_rate: number; // %
}

export interface EmailStatsDailyPoint {
    sent: number;
    fallback: number;
    failed: number;
}

export interface EmailStatsResponse {
    success: true;
    data: {
        totals: EmailStatsTotals;
        by_category: Record<string, number>;
        top_errors: Record<string, number>;
        daily_7d: Record<string, EmailStatsDailyPoint>;
        window: { from: string; to: string };
    };
}

class EmailLogsService {
    async list(filters: EmailLogsFilters = {}): Promise<EmailLogsResponse> {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                params.append(k, String(v));
            }
        });
        const qs = params.toString();
        return await apiClient.get<EmailLogsResponse>(`/email-logs${qs ? '?' + qs : ''}`);
    }

    async stats(): Promise<EmailStatsResponse> {
        return await apiClient.get<EmailStatsResponse>('/email-logs/stats');
    }
}

export const emailLogsService = new EmailLogsService();
