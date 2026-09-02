import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

/**
 * «محطة القضية» — الخط الإجرائي والمرحلة الحالية والعدّاد.
 * يحسبها الخادم من الجلسات والأحكام والمهل (CaseStationService)، ويُحسّنها
 * الذكاء في الخلفية حين يجهز (CaseStageAnalysis).
 */

export type StationPhaseState = 'done' | 'current' | 'next';
export type StationNodeKind = 'filing' | 'session' | 'judgement' | 'today' | 'deadline' | 'placeholder';
export type StationNodeState = 'past' | 'today' | 'future' | 'placeholder';
export type StationTone = 'red' | 'orange' | 'green' | 'blue' | 'gray';

export interface StationPhase {
  key: string;
  label: string;
  state: StationPhaseState;
  from: number;
  to: number;
}

export interface StationNodeRef {
  type: 'session' | 'judgement' | 'deadline';
  id: number;
  tab?: string;
  deadline_id?: number;
}

export interface StationDecision {
  text: string;
  source: 'najiz' | 'ai';
  at: string | null;
}

export interface StationNode {
  key: string;
  kind: StationNodeKind;
  label: string;
  date: string | null;
  date_label: string;
  state: StationNodeState;
  phase: string;
  ref: StationNodeRef | null;
  meta: Record<string, unknown> & {
    decision?: StationDecision | null;
    session_number?: number | null;
    type?: string;
    method?: string | null;
    time?: string | null;
    video_url?: string | null;
    has_text?: boolean;
    has_office_statement?: boolean;
    has_judgement?: boolean;
    days_remaining?: number | null;
    title?: string;
    obligated?: string;
    code?: string | null;
    description?: string | null;
    is_final?: boolean;
    can_object?: boolean;
    outcome?: string | null;
    is_partial?: boolean;
  };
}

export interface StationClock {
  kind: 'deadline' | 'next_session' | 'none';
  title: string;
  tone: StationTone;
  due_date?: string;
  due_label?: string;
  days_remaining?: number | null;
  days_label?: string;
  period_days?: number | null;
  elapsed_days?: number | null;
  deadline_id?: number | null;
  judgement_id?: number | null;
  session_id?: number;
  time?: string | null;
  method?: string | null;
  obligated?: string;
}

export interface StationStage {
  key: string;
  label: string;
  summary: string;
  next_expected: string | null;
  source: 'rules' | 'ai';
  ai: {
    status: 'none' | 'pending' | 'analyzing' | 'ready' | 'failed';
    analyzed_at: string | null;
    model: string | null;
    error: string | null;
  };
}

export interface CaseStation {
  today: string;
  stage: StationStage;
  phases: StationPhase[];
  nodes: StationNode[];
  clock: StationClock | null;
  objection_points: string[];
  session_decisions: Record<string, StationDecision>;
  counts: {
    sessions_total: number;
    sessions_past: number;
    sessions_upcoming: number;
    judgements: number;
    open_deadlines: number;
  };
}

export const caseStationService = {
  async get(caseId: number | string): Promise<CaseStation> {
    const res = await apiClient.get<ApiResponse<CaseStation>>(`/cases/${caseId}/station`);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'تعذّر تحميل مسار القضية');
  },

  /** طلب إعادة تحليل الذكاء صراحةً — يعمل في الخلفية ويظهر عند التحديث التالي. */
  async analyze(caseId: number | string): Promise<{ status: string }> {
    const res = await apiClient.post<ApiResponse<{ status: string }>>(`/cases/${caseId}/station/analyze`);
    if (res.success && res.data) {
      return res.data;
    }
    throw new Error(res.message || 'تعذّر طلب التحليل');
  },
};

export default caseStationService;
