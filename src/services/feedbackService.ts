import { apiClient } from '../utils/api';
import type { ApiResponse, PaginatedResponse } from '../utils/api';

// ─── Types ───────────────────────────────────────────────

export type FeedbackType = 'suggestion' | 'feature' | 'bug' | 'complaint' | 'idea';

export type FeedbackResolutionStatus =
    | 'new' | 'under_review' | 'needs_info' | 'resolved' | 'rejected' | 'duplicate' | 'deferred';

export type FeedbackRewardStatus = 'pending' | 'awarded' | 'not_awarded';

export interface FeedbackAttachment {
    url: string;
    kind: 'image' | 'video';
    mime?: string;
    size?: number;
}

export interface FeedbackItem {
    id: number;
    type: FeedbackType;
    type_label: string;
    category: string | null;
    title: string | null;
    body: string;
    attachments: FeedbackAttachment[];
    resolution_status: FeedbackResolutionStatus;
    resolution_status_label: string;
    reward_status: FeedbackRewardStatus;
    reward_status_label: string;
    impact_score: number | null;
    points_awarded: number;
    admin_comment: string | null;
    created_at: string;
    reviewed_at: string | null;
}

export interface FeedbackScore {
    points_balance: number;
    total_submissions: number;
    accepted_count: number;
    pending_count: number;
    recent_transactions: Array<{
        id: number;
        points: number;
        reason: string;
        feedback_item_id: number | null;
        created_at: string;
    }>;
}

export interface CreateFeedbackPayload {
    type: FeedbackType;
    category?: string | null;
    title?: string | null;
    body: string;
    attachments?: File[];
}

// ─── Service ─────────────────────────────────────────────

export class FeedbackService {
    /** مساهماتي (مُرقّمة). */
    static async getMine(page = 1, perPage = 15): Promise<PaginatedResponse<FeedbackItem>> {
        const res = await apiClient.get<ApiResponse<PaginatedResponse<FeedbackItem>>>(
            `/feedback?page=${page}&per_page=${perPage}`,
        );
        if (res.success && res.data) {
            return res.data;
        }
        throw new Error(res.message || 'فشل في جلب الملاحظات');
    }

    /** نقاطي + ملخّص مساهماتي. */
    static async getMyScore(): Promise<FeedbackScore> {
        const res = await apiClient.get<ApiResponse<FeedbackScore>>('/feedback/me/score');
        if (res.success && res.data) {
            return res.data;
        }
        throw new Error(res.message || 'فشل في جلب النقاط');
    }

    /** إنشاء ملاحظة جديدة (+ مرفقات اختيارية) عبر FormData. */
    static async create(payload: CreateFeedbackPayload): Promise<FeedbackItem> {
        const form = new FormData();
        form.append('type', payload.type);
        form.append('body', payload.body);
        if (payload.category) form.append('category', payload.category);
        if (payload.title) form.append('title', payload.title);
        (payload.attachments ?? []).forEach((file) => form.append('attachments[]', file));

        const res = await apiClient.post<ApiResponse<FeedbackItem>>('/feedback', form);
        if (res.success && res.data) {
            return res.data;
        }
        throw new Error(res.message || 'فشل في إرسال الملاحظة');
    }

    /** حذف مساهمتي ما دامت «جديدة». */
    static async remove(id: number): Promise<void> {
        const res = await apiClient.delete<ApiResponse>(`/feedback/${id}`);
        if (!res.success) {
            throw new Error(res.message || 'فشل في حذف الملاحظة');
        }
    }
}

// ─── Display helpers ─────────────────────────────────────

export const FEEDBACK_TYPES: Array<{ value: FeedbackType; label: string }> = [
    { value: 'suggestion', label: 'اقتراح' },
    { value: 'feature', label: 'ميزة / تطوير' },
    { value: 'bug', label: 'مشكلة / خطأ' },
    { value: 'complaint', label: 'شكوى' },
    { value: 'idea', label: 'فكرة' },
];

/** لون شارة الحالة (يُورَّث من متغيّرات الثيم — يعمل في الثيمات الثلاثة). */
export function resolutionStatusClass(status: FeedbackResolutionStatus): string {
    switch (status) {
        case 'resolved': return 'fb-badge--success';
        case 'under_review': return 'fb-badge--info';
        case 'rejected':
        case 'duplicate': return 'fb-badge--error';
        case 'needs_info':
        case 'deferred': return 'fb-badge--neutral';
        default: return 'fb-badge--warning'; // new
    }
}
