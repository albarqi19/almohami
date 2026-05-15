// خدمة "غرفة تحضير الجلسة"
// تستهلك endpoints الباك-إند:
// /api/v1/sessions/{id}/preparations
// /api/v1/sessions/{id}/motions
// /api/v1/sessions/{id}/import-defaults
// /api/v1/sessions/{id}/import-from-session/{sourceId}
// /api/v1/sessions/{id}/ai-brief (GET/generate/regenerate/apply-actions/review)
// /api/v1/settings/session-defaults

import { apiClient } from '../utils/api';

// ═══════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════

export interface SessionPreparation {
  id: number;
  case_session_id: number;
  case_id: number;
  title: string;
  notes: string | null;
  is_completed: boolean;
  sort_order: number;
  completed_by: number | { id: number; name: string } | null;
  completed_at: string | null;
  source: 'manual' | 'default' | 'ai_suggested' | 'copied';
  created_at: string;
  updated_at: string;
}

export type MotionStatus = 'draft' | 'ready' | 'submitted' | 'approved' | 'rejected' | 'withdrawn';
export type MotionTag = 'إجرائي' | 'مستندي' | 'شاهد' | 'خبير' | 'تأجيل' | 'رد' | 'عارض' | 'أخرى';

export interface SessionMotion {
  id: number;
  case_session_id: number;
  case_id: number;
  title: string;
  body: string | null;
  tag: MotionTag | null;
  status: MotionStatus;
  sort_order: number;
  created_by: number | { id: number; name: string } | null;
  submitted_at: string | null;
  result_note: string | null;
  source: 'manual' | 'default' | 'ai_suggested' | 'copied';
  created_at: string;
  updated_at: string;
}

export type AiBriefStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'stale';

export interface AiEvidence {
  source: string;
  quote?: string;
  confidence?: 'high' | 'medium' | 'low';
  quote_verified?: boolean;
}

export interface AiSuggestion {
  title?: string;
  question?: string;
  reason?: string;
  rationale?: string;
  tag?: string;
  urgency?: 'urgent' | 'normal';
  evidence?: AiEvidence;
  actions?: string[];
}

export interface AiRiskFlag {
  level: 'high' | 'medium' | 'low';
  category: 'contradiction' | 'procedural_gap' | 'deadline' | 'pattern' | 'opponent_behavior';
  message: string;
  evidence?: AiEvidence;
  actions?: string[];
}

export interface AiPendingOrder {
  order: string;
  from_session_date: string;
  fulfilled: boolean;
  evidence?: AiEvidence;
  actions?: string[];
}

export interface AiCriticalDeadline {
  item: string;
  deadline_date: string;
  days_remaining: number;
  severity: 'critical' | 'warning' | 'info';
  actions?: string[];
}

export interface AiBriefJson {
  last_session_summary?: string;
  expected_session_purpose?: string;
  context_quality?: 'high' | 'medium' | 'low';
  documents_to_review?: AiSuggestion[];
  predicted_judge_questions?: AiSuggestion[];
  risk_flags?: AiRiskFlag[];
  pending_court_orders?: AiPendingOrder[];
  critical_deadlines?: AiCriticalDeadline[];
  department_patterns?: Array<{ observation: string; based_on_sessions: number; confidence?: string }>;
  suggested_motions?: AiSuggestion[];
  suggested_preparations?: AiSuggestion[];
  refusals?: string[];
  limitations?: string[];
}

export interface AiBriefResponse {
  status: AiBriefStatus;
  is_stale?: boolean;
  generated_at?: string | null;
  reviewed_at?: string | null;
  context_quality?: string | null;
  risk_score?: number | null;
  urgent_items_count?: number;
  has_deadline_risk?: boolean;
  has_procedural_gap?: boolean;
  has_contradictions?: boolean;
  error_message?: string | null;
  brief: AiBriefJson | null;
}

export interface SessionDefaultsTemplates {
  preparations_by_type: Record<string, Array<{ title: string; notes?: string | null }>>;
  motions_by_type: Record<string, Array<{ title: string; body?: string | null; tag?: string | null }>>;
}

export interface SessionWorkflowSettings {
  ai_pre_session_brief_enabled: boolean;
  post_session_reminder_enabled: boolean;
  post_session_reminder_hours: number;
  post_session_reminder_message: string | null;
}

// Action payload للـ apply-actions
export interface ApplyActionItem {
  path: string; // e.g. "suggested_motions.0"
  action: string;
  overrides?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════
//  Service
// ═══════════════════════════════════════════════════════

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export class SessionPrepService {
  // ─── Preparations ───
  static async getPreparations(sessionId: number): Promise<{ items: SessionPreparation[]; progress: number }> {
    const res = await apiClient.get<ApiEnvelope<SessionPreparation[]> & { progress?: number }>(`/sessions/${sessionId}/preparations`);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في جلب التحضيرات');
    return { items: res.data, progress: (res as unknown as { progress?: number }).progress ?? 0 };
  }

  static async createPreparation(sessionId: number, payload: { title: string; notes?: string | null }): Promise<SessionPreparation> {
    const res = await apiClient.post<ApiEnvelope<SessionPreparation>>(`/sessions/${sessionId}/preparations`, payload);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في إنشاء التحضير');
    return res.data;
  }

  static async updatePreparation(sessionId: number, prepId: number, payload: { title?: string; notes?: string | null }): Promise<SessionPreparation> {
    const res = await apiClient.put<ApiEnvelope<SessionPreparation>>(`/sessions/${sessionId}/preparations/${prepId}`, payload);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في تعديل التحضير');
    return res.data;
  }

  static async togglePreparation(sessionId: number, prepId: number): Promise<{ item: SessionPreparation; progress: number; readiness_score: number }> {
    const res = await apiClient.patch<ApiEnvelope<SessionPreparation> & { progress?: number; readiness_score?: number }>(
      `/sessions/${sessionId}/preparations/${prepId}/toggle`,
      {}
    );
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في تأشير التحضير');
    return {
      item: res.data,
      progress: (res as unknown as { progress?: number }).progress ?? 0,
      readiness_score: (res as unknown as { readiness_score?: number }).readiness_score ?? 0,
    };
  }

  static async deletePreparation(sessionId: number, prepId: number): Promise<void> {
    const res = await apiClient.delete<ApiEnvelope<unknown>>(`/sessions/${sessionId}/preparations/${prepId}`);
    if (!res.success) throw new Error(res.message || 'فشل في حذف التحضير');
  }

  static async reorderPreparations(sessionId: number, orderIds: number[]): Promise<SessionPreparation[]> {
    const res = await apiClient.post<ApiEnvelope<SessionPreparation[]>>(`/sessions/${sessionId}/preparations/reorder`, { order: orderIds });
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في إعادة الترتيب');
    return res.data;
  }

  // ─── Motions ───
  static async getMotions(sessionId: number, filters?: { status?: string; tag?: string }): Promise<{ items: SessionMotion[]; counts: Record<string, number> }> {
    const qs = filters ? '?' + new URLSearchParams(filters as Record<string, string>).toString() : '';
    const res = await apiClient.get<ApiEnvelope<SessionMotion[]> & { counts?: Record<string, number> }>(`/sessions/${sessionId}/motions${qs}`);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في جلب الطلبات');
    return { items: res.data, counts: (res as unknown as { counts?: Record<string, number> }).counts ?? {} };
  }

  static async createMotion(sessionId: number, payload: { title: string; body?: string | null; tag?: MotionTag | null; status?: MotionStatus }): Promise<SessionMotion> {
    const res = await apiClient.post<ApiEnvelope<SessionMotion>>(`/sessions/${sessionId}/motions`, payload);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في إنشاء الطلب');
    return res.data;
  }

  static async updateMotion(sessionId: number, motionId: number, payload: Partial<{ title: string; body: string | null; tag: MotionTag | null; result_note: string | null }>): Promise<SessionMotion> {
    const res = await apiClient.put<ApiEnvelope<SessionMotion>>(`/sessions/${sessionId}/motions/${motionId}`, payload);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في تعديل الطلب');
    return res.data;
  }

  static async updateMotionStatus(sessionId: number, motionId: number, status: MotionStatus, resultNote?: string): Promise<{ item: SessionMotion; readiness_score: number }> {
    const res = await apiClient.patch<ApiEnvelope<SessionMotion> & { readiness_score?: number }>(
      `/sessions/${sessionId}/motions/${motionId}/status`,
      { status, result_note: resultNote }
    );
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في تحديث الحالة');
    return { item: res.data, readiness_score: (res as unknown as { readiness_score?: number }).readiness_score ?? 0 };
  }

  static async deleteMotion(sessionId: number, motionId: number): Promise<void> {
    const res = await apiClient.delete<ApiEnvelope<unknown>>(`/sessions/${sessionId}/motions/${motionId}`);
    if (!res.success) throw new Error(res.message || 'فشل في حذف الطلب');
  }

  // ─── Defaults / Import ───
  static async getTemplates(): Promise<SessionDefaultsTemplates> {
    const res = await apiClient.get<ApiEnvelope<SessionDefaultsTemplates>>(`/settings/session-defaults`);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في جلب القوالب');
    return res.data;
  }

  static async updateTemplates(payload: Partial<SessionDefaultsTemplates>): Promise<SessionDefaultsTemplates> {
    const res = await apiClient.put<ApiEnvelope<SessionDefaultsTemplates>>(`/settings/session-defaults`, payload);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في حفظ القوالب');
    return res.data;
  }

  // ─── Workflow Settings (كشف الجلسة + تذكير ما بعد الجلسة) ───
  static async getWorkflowSettings(): Promise<SessionWorkflowSettings> {
    const res = await apiClient.get<ApiEnvelope<SessionWorkflowSettings>>(`/settings/session-workflow`);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في جلب إعدادات سير العمل');
    return res.data;
  }

  static async updateWorkflowSettings(payload: Partial<SessionWorkflowSettings>): Promise<SessionWorkflowSettings> {
    const res = await apiClient.put<ApiEnvelope<SessionWorkflowSettings>>(`/settings/session-workflow`, payload);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في حفظ إعدادات سير العمل');
    return res.data;
  }

  static async importDefaults(sessionId: number): Promise<{ preparations_added: number; motions_added: number; readiness_score: number }> {
    const res = await apiClient.post<ApiEnvelope<{ preparations_added: number; motions_added: number; readiness_score: number }>>(
      `/sessions/${sessionId}/import-defaults`,
      {}
    );
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في استيراد القوالب');
    return res.data;
  }

  static async importFromSession(sessionId: number, sourceSessionId: number): Promise<{ preparations_added: number; motions_added: number; readiness_score: number }> {
    const res = await apiClient.post<ApiEnvelope<{ preparations_added: number; motions_added: number; readiness_score: number }>>(
      `/sessions/${sessionId}/import-from-session/${sourceSessionId}`,
      {}
    );
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في النسخ من الجلسة');
    return res.data;
  }

  // ─── AI Brief ───
  static async getAiBrief(sessionId: number): Promise<AiBriefResponse> {
    const res = await apiClient.get<ApiEnvelope<AiBriefResponse>>(`/sessions/${sessionId}/ai-brief`);
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في جلب الـ brief');
    return res.data;
  }

  static async generateAiBrief(sessionId: number): Promise<{ status: AiBriefStatus; brief_id: number }> {
    const res = await apiClient.post<ApiEnvelope<{ status: AiBriefStatus; brief_id: number }>>(
      `/sessions/${sessionId}/ai-brief/generate`,
      {}
    );
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في بدء التوليد');
    return res.data;
  }

  static async regenerateAiBrief(sessionId: number): Promise<{ status: AiBriefStatus; brief_id: number }> {
    const res = await apiClient.post<ApiEnvelope<{ status: AiBriefStatus; brief_id: number }>>(
      `/sessions/${sessionId}/ai-brief/regenerate`,
      {}
    );
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في إعادة التوليد');
    return res.data;
  }

  static async applyActions(sessionId: number, items: ApplyActionItem[]): Promise<{ preparations_created: number; motions_created: number }> {
    const res = await apiClient.post<ApiEnvelope<{ preparations_created: number; motions_created: number }>>(
      `/sessions/${sessionId}/ai-brief/apply-actions`,
      { items }
    );
    if (!res.success || !res.data) throw new Error(res.message || 'فشل في تطبيق الإجراءات');
    return res.data;
  }

  static async reviewBrief(sessionId: number): Promise<void> {
    const res = await apiClient.post<ApiEnvelope<unknown>>(`/sessions/${sessionId}/ai-brief/review`, {});
    if (!res.success) throw new Error(res.message || 'فشل في تأشير الـ brief');
  }
}
