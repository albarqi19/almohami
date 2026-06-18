/**
 * خدمة أدوات المحامي (v2) — تنادي البروكسي الخلفي الآمن بدل النداء المتصفحي المباشر لـ OpenRouter.
 *     POST /api/v1/lawyer-tools/run
 *
 * تُرجع LawyerToolResult موحّدًا (report/replacement/annotations). محوّل reportToEngineResult
 * يعيد استخدام EngineResultView لنمط التقرير (لا إعادة بناء).
 */

import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type { LawyerToolResult, LawyerToolType } from '../types/lawyerTool';
import type { EngineResult } from '../types/memoAnalysis';
import { ENGINE_RESULT_FORMAT } from '../types/memoAnalysis';

export interface RunToolOptions {
  customInstructions?: string;
  documentContext?: string;
  source?: 'memo' | 'notebook';
  caseId?: number;
  memoType?: string;
  receiptDate?: string;
}

/** يشغّل أداة محامٍ واحدة في الباك إند ويُرجع النتيجة المنظّمة. */
export async function runLawyerTool(
  tool: LawyerToolType,
  selectedText: string,
  opts: RunToolOptions = {}
): Promise<LawyerToolResult> {
  const res = await apiClient.post<ApiResponse<LawyerToolResult>>('/lawyer-tools/run', {
    tool,
    selected_text: selectedText,
    custom_instructions: opts.customInstructions,
    document_context: opts.documentContext,
    source: opts.source,
    case_id: opts.caseId,
    memo_type: opts.memoType,
    receipt_date: opts.receiptDate,
  });

  if (res.success && res.data) return res.data;
  throw new Error(res.message || 'تعذّر إجراء المعالجة الذكية');
}

/**
 * يحوّل نمط report لأداة محامٍ إلى EngineResult حتى يُعرض عبر EngineResultView القائم
 * (engine='gatekeeper' — الفرع الوحيد بلا EngineSpecific). الحقول تُرفع من report للجذر،
 * والبطاقات (cards) تُعرَض منفصلة عبر AdversarialCards.
 */
export function reportToEngineResult(r: LawyerToolResult): EngineResult {
  const rep = r.report;
  return {
    engine: 'gatekeeper',
    format: ENGINE_RESULT_FORMAT,
    verdict: rep?.verdict ?? { level: 'warn', label: '', summary: '' },
    score: rep?.score ?? null,
    score_label: rep?.score_label ?? null,
    checklist: rep?.checklist ?? [],
    findings: rep?.findings ?? [],
    citations: r.citations ?? [],
    deadlines: rep?.deadlines ?? [],
    meta: {
      engine: 'gatekeeper',
      grounding_mode: r.meta.grounding_mode,
      grounded_citations: r.meta.grounded_citations,
      total_citations: r.meta.total_citations,
      precedents_used: r.meta.precedents_used,
      rag_attempted: r.meta.rag_attempted,
      model: r.meta.model,
      contract_version: r.meta.contract_version,
      memo_type: r.meta.memo_type,
      partial: r.meta.partial,
      as_of_date: r.meta.as_of_date,
    },
    engine_specific: {},
    needs_verification: r.needs_verification ?? [],
    refusals: r.refusals ?? [],
    limitations: r.limitations ?? [],
  };
}

export default { runLawyerTool, reportToEngineResult };
