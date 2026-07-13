// خدمة «رفيق الجلسة» — مساعد التحضير والتدوين
// تستهلك endpoints الباك-إند (كلها خلف بوابة tenant: session_copilot_enabled):
// /api/v1/copilot/briefcases/{sessionId} (GET/PUT/generate)
// /api/v1/copilot/sessions/{sessionId}/run (GET)
// /api/v1/copilot/runs/{runId}/alerts?after_id=N (GET) + /alerts/{alertId} (PUT)
// /api/v1/copilot/runs/{runId}/report (GET) + /end (POST)

import { apiClient } from '../utils/api';

// ═══════════════════════════════════════════════════════
//  Types — الحقيبة
// ═══════════════════════════════════════════════════════

export type BriefcaseStatus = 'none' | 'pending' | 'generating' | 'ready' | 'failed';
export type ClaimParty = 'opponent' | 'client' | 'unknown';
export type ClaimConfidence = 'high' | 'medium' | 'low';

export interface BriefcaseClaim {
  id: number;
  party: ClaimParty;
  claim: string;
  quote: string;
  source_label: string;
  confidence: ClaimConfidence;
  quote_verified: boolean;
  approved: boolean;
}

export interface BriefcaseQuestion {
  question: string;
  rationale?: string | null;
  source_label?: string | null;
}

export interface BriefcaseWatchItem {
  id: number;
  label: string;
  source_label?: string | null;
  done: boolean;
}

export interface CopilotBriefcaseData {
  id?: number;
  status: BriefcaseStatus;
  generated_at?: string | null;
  approved_at?: string | null;
  is_stale?: boolean;
  error_message?: string | null;
  claims?: BriefcaseClaim[];
  questions?: BriefcaseQuestion[];
  watchlist?: BriefcaseWatchItem[];
}

export interface BriefcaseUpdatePayload {
  claims?: BriefcaseClaim[];
  questions?: BriefcaseQuestion[];
  watchlist?: BriefcaseWatchItem[];
  approve?: boolean;
}

// ═══════════════════════════════════════════════════════
//  Types — التشغيلة الحية
// ═══════════════════════════════════════════════════════

export type RunStatus = 'none' | 'live' | 'ended' | 'failed';
export type ReportStatus = 'none' | 'generating' | 'ready' | 'failed';

export interface CopilotRunData {
  status: RunStatus;
  id?: number;
  case_session_id?: number;
  source?: 'captions' | 'audio' | 'manual';
  started_at?: string | null;
  roles?: Record<string, string>;
  case?: { id: number | null; title: string | null; file_number: string | null };
  briefcase?: {
    id: number;
    approved: boolean;
    claims: BriefcaseClaim[];
    questions: BriefcaseQuestion[];
    watchlist: BriefcaseWatchItem[];
  } | null;
  report_status?: ReportStatus;
}

// ═══════════════════════════════════════════════════════
//  Types — التنبيهات
// ═══════════════════════════════════════════════════════

export type AlertType = 'contradiction' | 'deadline' | 'court_order' | 'question' | 'watchlist_hit' | 'info';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'pending' | 'dismissed' | 'accepted';

export interface AlertEvidence {
  source_label?: string;
  source?: string;
  quote?: string;
  session_number?: string | number;
}

export interface CopilotAlertItem {
  id: number;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  quote_now: string | null;
  evidence_json: AlertEvidence | null;
  payload_json: Record<string, unknown> | null;
  status: AlertStatus;
  deep_checked: boolean;
  created_at: string;
}

export interface AlertsPollResult {
  alerts: CopilotAlertItem[];
  run_status: RunStatus;
  watchlist: BriefcaseWatchItem[];
}

// ═══════════════════════════════════════════════════════
//  Types — التقرير البعدي
// ═══════════════════════════════════════════════════════

export interface ReportKeyPoint {
  point: string;
  speaker?: string | null;
  quote?: string | null;
}

export interface ReportCommitment {
  party: string;
  commitment: string;
  quote?: string | null;
}

export interface ReportMemoPoint {
  point: string;
  why?: string | null;
}

export interface ReportSuggestedDeadline {
  requirement: string;
  spoken_date?: string | null;
  obligated_party?: string | null;
}

export interface CopilotReportData {
  summary?: string | null;
  key_points?: ReportKeyPoint[];
  commitments?: ReportCommitment[];
  memo_points?: ReportMemoPoint[];
  suggested_deadlines?: ReportSuggestedDeadline[];
  limitations?: string[];
  disclaimer?: string | null;
}

// ═══════════════════════════════════════════════════════
//  Types — «مرآة الأداء» (تقييم ذاتي خاص بصاحب التشغيلة وحده)
// ═══════════════════════════════════════════════════════

export type SelfReviewStatus = 'none' | 'generating' | 'ready' | 'failed';
export type SelfReviewBand = 'ممتاز' | 'قوي' | 'جيد' | 'يحتاج تطوير';

export interface SelfReviewAxis {
  axis: string;
  band: SelfReviewBand;
  note?: string | null;
  quote?: string | null;
  quote_verified?: boolean;
}

export interface SelfReviewPoint {
  point: string;
  quote?: string | null;
  quote_verified?: boolean;
  why?: string | null;        // strengths
  suggestion?: string | null; // improvements
}

export interface SelfReviewMoment {
  quote: string;
  quote_verified?: boolean;
  why?: string | null;  // best_moment
  what?: string | null; // missed_opportunity
}

export interface SelfReviewData {
  overall_band: SelfReviewBand;
  summary?: string | null;
  axes?: SelfReviewAxis[];
  strengths?: SelfReviewPoint[];
  improvements?: SelfReviewPoint[];
  best_moment?: SelfReviewMoment | null;
  missed_opportunity?: SelfReviewMoment | null;
  limitations?: string[];
  metrics?: Record<string, number | string>;
  disclaimer?: string | null;
}

export interface CopilotReportResponse {
  report_status: ReportStatus;
  report: CopilotReportData | null;
  stats: {
    segments_count: number;
    alerts_count: number;
    deep_checks_count: number;
  };
  // يصلان فقط عندما يكون الطالب هو صاحب التشغيلة وقد فعّل المرآة
  self_review_status?: SelfReviewStatus;
  self_review?: SelfReviewData | null;
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

export class SessionCopilotService {
  // ─── الحقيبة ───

  static async generateBriefcase(sessionId: number): Promise<{ status: BriefcaseStatus }> {
    const res = await apiClient.post<ApiEnvelope<{ status: BriefcaseStatus }>>(
      `/copilot/briefcases/${sessionId}/generate`,
      {}
    );
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر بدء إعداد الحقيبة');
    return res.data;
  }

  static async getBriefcase(sessionId: number): Promise<CopilotBriefcaseData> {
    const res = await apiClient.get<ApiEnvelope<CopilotBriefcaseData>>(`/copilot/briefcases/${sessionId}`);
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر جلب حقيبة الجلسة');
    return res.data;
  }

  static async updateBriefcase(
    sessionId: number,
    payload: BriefcaseUpdatePayload
  ): Promise<{ approved_at: string | null }> {
    const res = await apiClient.put<ApiEnvelope<{ approved_at: string | null }>>(
      `/copilot/briefcases/${sessionId}`,
      payload
    );
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر حفظ الحقيبة');
    return res.data;
  }

  // ─── التشغيلة الحية ───

  static async getRunForSession(sessionId: number): Promise<CopilotRunData> {
    const res = await apiClient.get<ApiEnvelope<CopilotRunData>>(`/copilot/sessions/${sessionId}/run`);
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر جلب حالة الجلسة الحية');
    return res.data;
  }

  static async getAlerts(runId: number, afterId: number): Promise<AlertsPollResult> {
    const res = await apiClient.get<ApiEnvelope<AlertsPollResult>>(
      `/copilot/runs/${runId}/alerts?after_id=${afterId}`
    );
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر جلب التنبيهات');
    return res.data;
  }

  static async updateAlert(
    runId: number,
    alertId: number,
    status: 'dismissed' | 'accepted'
  ): Promise<CopilotAlertItem> {
    const res = await apiClient.put<ApiEnvelope<CopilotAlertItem>>(
      `/copilot/runs/${runId}/alerts/${alertId}`,
      { status }
    );
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر تحديث التنبيه');
    return res.data;
  }

  static async endRun(runId: number): Promise<{ report_status: ReportStatus }> {
    const res = await apiClient.post<ApiEnvelope<{ report_status: ReportStatus }>>(
      `/copilot/runs/${runId}/end`,
      {}
    );
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر إنهاء الجلسة');
    return res.data;
  }

  // ─── التقرير ───

  static async getReport(runId: number): Promise<CopilotReportResponse> {
    const res = await apiClient.get<ApiEnvelope<CopilotReportResponse>>(`/copilot/runs/${runId}/report`);
    if (!res.success || !res.data) throw new Error(res.message || 'تعذّر جلب التقرير');
    return res.data;
  }
}
