// خدمة «راج — السوابق القضائية»
// تستهلك endpoints الباك-إند:
// POST /api/v1/precedents/search            بحث حر في فهرس السوابق
// POST /api/v1/cases/{case}/precedents      استخراج السوابق + التحليل لقضية (يدوي)
// GET  /api/v1/cases/{case}/precedents      آخر تحليل مخزّن لقضية (قد يكون null)

import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

// ═══════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════

export interface CitedStatute {
  statute: string;
  article: string;
}

export interface PrecedentResult {
  list_id: string | null;
  source_url: string | null;
  judgement_number: string | null;
  court_name: string | null;
  court_type: string | null;
  city: string | null;
  date_hijri: string | null;
  source_branch: string | null;
  case_subject_type: string | null;
  outcome: string | null;
  legal_principle: string;
  summary: string;
  keywords: string[];
  cited_statutes: CitedStatute[];
  score: number;
}

export interface PrecedentTrend {
  total: number;
  counts: Record<string, number>;
  lean: string | null;
}

export interface PrecedentFactor {
  text: string;
  refs: number[];
}

export interface PrecedentAnalysis {
  client_posture: string;
  acceptance_factors: PrecedentFactor[];
  risk_factors: PrecedentFactor[];
  required_evidence: string[];
  summary: string;
  no_match: boolean;
}

export interface PrecedentResponse {
  query_issue: string | null;
  results: PrecedentResult[];
  trend: PrecedentTrend;
  analysis: PrecedentAnalysis;
  disclaimer: string;
  cached: boolean;
}

// ═══════════════════════════════════════════════════════
//  Service
// ═══════════════════════════════════════════════════════

export class PrecedentsService {
  /** استخراج السوابق + التحليل لقضية. force=true لإعادة الحساب من جديد. */
  static async analyzeCase(caseId: number, force = false): Promise<PrecedentResponse> {
    const res = await apiClient.post<ApiResponse<PrecedentResponse>>(
      `/cases/${caseId}/precedents`,
      { force }
    );
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر استخراج السوابق');
  }

  /** آخر تحليل مخزّن لقضية (null إن لم يُجرَ بعد). */
  static async getCaseAnalysis(caseId: number): Promise<PrecedentResponse | null> {
    const res = await apiClient.get<ApiResponse<PrecedentResponse | null>>(`/cases/${caseId}/precedents`);
    if (res.success) return res.data ?? null;
    throw new Error(res.message || 'تعذّر جلب التحليل');
  }

  /** بحث حر استكشافي في فهرس السوابق. */
  static async freeSearch(query: string): Promise<PrecedentResponse> {
    const res = await apiClient.post<ApiResponse<PrecedentResponse>>('/precedents/search', { query });
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر البحث في السوابق');
  }
}
