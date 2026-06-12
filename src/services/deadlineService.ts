// خدمة «المهل النظامية» — ملاحظتا عميل #21 و#23
// تستهلك endpoints الباك-إند:
// GET    /api/v1/deadlines                 قائمة المهل (فلاتر status, case_id, mine, q)
// GET    /api/v1/deadlines/summary         عدادات + أقرب المهل (للويدجت)
// GET    /api/v1/deadlines/types           قوالب المدد النظامية
// POST   /api/v1/deadlines                 إنشاء (يدوي أو من قالب)
// PUT    /api/v1/deadlines/{id}            تعديل
// PUT    /api/v1/deadlines/{id}/status     complete | waive | confirm | reject | in_progress | reactivate
// DELETE /api/v1/deadlines/{id}            حذف

import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

// ═══════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════

export type DeadlineStatus =
  | 'suggested'
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'waived'
  | 'missed'
  | 'rejected';

export type DeadlineSource = 'najiz_auto' | 'dabt_ai' | 'template' | 'manual';

export type DeadlineUrgency = 'expired' | 'critical' | 'warning' | 'upcoming' | 'normal';

export interface LegalDeadline {
  id: number;
  case_id: number | null;
  case_judgement_id: number | null;
  case_session_id: number | null;
  deadline_type_id: number | null;
  title: string;
  description: string | null;
  source: DeadlineSource;
  start_date: string | null;
  due_date: string;
  due_date_source: 'najiz' | 'computed' | 'manual' | 'ai';
  period_days: number | null;
  legal_reference: string | null;
  status: DeadlineStatus;
  waive_reason: string | null;
  obligated_party: 'client' | 'opponent';
  action_label: string | null;
  source_quote: string | null;
  extraction_confidence: number | null;
  assigned_to: number | null;
  days_remaining: number | null;
  urgency: DeadlineUrgency | null;
  created_at: string;
  case?: { id: number; title: string; case_number: string | null } | null;
  assignee?: { id: number; name: string } | null;
  type?: { id: number; name: string; legal_reference: string | null } | null;
}

export interface DeadlineType {
  id: number;
  tenant_id: number | null;
  name: string;
  period_days: number | null;
  period_unit: 'days' | 'months';
  court_type: string | null;
  legal_reference: string | null;
}

export interface DeadlineSummary {
  counts: {
    open_total: number;
    due_within_7: number;
    due_within_3: number;
    suggested: number;
    missed_recent: number;
  };
  upcoming: LegalDeadline[];
}

export interface DeadlineFilters {
  status?: string; // قائمة مفصولة بفواصل
  case_id?: number;
  mine?: boolean;
  q?: string;
  per_page?: number;
}

export interface CreateDeadlinePayload {
  title?: string;
  description?: string;
  case_id?: number | null;
  deadline_type_id?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  period_days?: number | null;
  action_label?: string | null;
  legal_reference?: string | null;
  assigned_to?: number | null;
}

export type DeadlineStatusAction =
  | 'complete'
  | 'waive'
  | 'in_progress'
  | 'reactivate'
  | 'confirm'
  | 'reject';

// ═══════════════════════════════════════════════════════
//  Service
// ═══════════════════════════════════════════════════════

class DeadlineService {
  async list(filters: DeadlineFilters = {}): Promise<LegalDeadline[]> {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.case_id) params.set('case_id', String(filters.case_id));
    if (filters.mine) params.set('mine', '1');
    if (filters.q) params.set('q', filters.q);
    if (filters.per_page) params.set('per_page', String(filters.per_page));

    const qs = params.toString();
    const res = await apiClient.get<ApiResponse<LegalDeadline[]>>(`/deadlines${qs ? `?${qs}` : ''}`);
    return res.data ?? [];
  }

  async summary(limit = 5): Promise<DeadlineSummary> {
    const res = await apiClient.get<ApiResponse<DeadlineSummary>>(`/deadlines/summary?limit=${limit}`);
    return res.data!;
  }

  async types(): Promise<DeadlineType[]> {
    const res = await apiClient.get<ApiResponse<DeadlineType[]>>('/deadlines/types');
    return res.data ?? [];
  }

  async create(payload: CreateDeadlinePayload): Promise<LegalDeadline> {
    const res = await apiClient.post<ApiResponse<LegalDeadline>>('/deadlines', payload);
    return res.data!;
  }

  async update(id: number, payload: Partial<CreateDeadlinePayload>): Promise<LegalDeadline> {
    const res = await apiClient.put<ApiResponse<LegalDeadline>>(`/deadlines/${id}`, payload);
    return res.data!;
  }

  async changeStatus(
    id: number,
    action: DeadlineStatusAction,
    extra: { reason?: string; due_date?: string; title?: string } = {}
  ): Promise<LegalDeadline> {
    const res = await apiClient.put<ApiResponse<LegalDeadline>>(`/deadlines/${id}/status`, {
      action,
      ...extra,
    });
    return res.data!;
  }

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/deadlines/${id}`);
  }
}

export const deadlineService = new DeadlineService();
export default deadlineService;
