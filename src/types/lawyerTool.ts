/**
 * عقد مخرَج أدوات المحامي (LawyerToolResult) — مرآة TypeScript للباك إند.
 * يطابق:
 *   - app/Services/LawyerTool/LawyerToolResult.php (الشكل + التطبيع)
 *   - app/Enums/{LegalAIToolType,LawyerToolOutputMode}.php
 *   - app/Services/LawyerTool/LawyerToolContract.php (الإصدار + FORMAT)
 *
 * يعيد استخدام أنواع المذكرات المشتركة (Verdict/ChecklistItem/Finding/Citation/Deadline)
 * حتى يعمل محوّل reportToEngineResult بلا تكرار. ⚠️ أي تعديل هنا يقابله تعديل في الباك + رفع SCHEMA_VERSION.
 */

import type {
  Verdict,
  ChecklistItem,
  Finding,
  Citation,
  Deadline,
  FindingSeverity,
  GroundingMode,
} from './memoAnalysis';

export const LAWYER_TOOL_FORMAT = 'v2' as const;

export type LawyerToolType =
  | 'legal_formalization' | 'plain_language' | 'formal_government' | 'penalty_clause'
  | 'risk_assessment' | 'missing_clauses' | 'executive_summary' | 'extract_obligations'
  | 'counter_argument' | 'impact_simulation'
  | 'legal_proofreading' | 'legal_proofreading_annotations';

export type LawyerToolOutputMode = 'replacement' | 'report' | 'annotations' | 'answer_with_annotations';

// ── النمط 1: نصّ بديل (replacement) ──
export interface ReplacementOption {
  label: string;
  clause_text: string;
  citation_indices: number[];
}
export interface ReplacementPayload {
  replacement_text: string | null;   // يُحقن حرفيًا بلا تجريد رموز
  register: string | null;           // رسمي/مبسّط/حكومي (عرض فقط)
  changes_note: string | null;       // ملاحظة عمّا تغيّر — لا تُحقَن
  options: ReplacementOption[];       // penalty_clause: عدّة خيارات بزر «إدراج»
}

// ── النمط 2: تقرير منظّم (report) ──
export interface AdversarialCardEstimate {
  label: string;
  value: string;
  estimated: boolean;                // الأرقام غير المؤرَّضة موسومة دائمًا
}
export interface AdversarialCard {
  id: string;
  kind: 'counter' | 'scenario';
  claim: string;
  response: string;
  estimates: AdversarialCardEstimate[];
  severity: FindingSeverity | null;
  citation_indices: number[];
  unverified: boolean;
}
export interface ReportPayload {
  verdict: Verdict;
  score: number | null;
  score_label: string | null;
  checklist: ChecklistItem[];
  findings: Finding[];               // Finding يحمل unverified? (مرآة المذكرات الموسّعة)
  deadlines: Deadline[];
  cards: AdversarialCard[];          // فارغة لغير counter_argument/impact_simulation
}

// ── النمط 3+4: تمييزات داخل النص ──
export interface LawyerToolAnnotation {
  id: string;
  original_text: string;             // حرفي للمطابقة في المحرّر
  suggested_text: string | null;
  reason: string;
  severity: FindingSeverity;
  color_code: 'yellow' | 'red' | 'blue';
  legal_reference: string | null;    // نصّ حرّ؛ لا يصير شارة قابلة للنقر إلا إذا قابله citation محقون
  citation_index: number | null;
  unverified: boolean;
}

// ── الميتاداتا ──
export interface LawyerToolMeta {
  tool: LawyerToolType;
  output_mode: LawyerToolOutputMode;
  grounding_mode: GroundingMode;
  grounded_citations: number;
  total_citations: number;
  precedents_used: number;
  rag_attempted: boolean;
  model: string | null;
  contract_version: string;
  source: 'memo' | 'notebook';
  case_id: number | null;
  memo_type: string | null;
  partial: boolean;
  as_of_date: { hijri: string | null; gregorian: string | null } | null;
  receipt_basis: { date: string | null; source: 'user' | 'extracted' | 'today' } | null;
}

// ── العقد الموحّد ──
export interface LawyerToolResult {
  tool: LawyerToolType;
  format: typeof LAWYER_TOOL_FORMAT;
  output_mode: LawyerToolOutputMode;
  replacement: ReplacementPayload | null;
  report: ReportPayload | null;
  annotations: LawyerToolAnnotation[] | null;
  answer: string | null;             // النمط 4 (المساعد المستندي)
  citations: Citation[];             // مشتركة، على الجذر، يبنيها الخادم وحده
  meta: LawyerToolMeta;
  needs_verification: string[];
  refusals: string[];
  limitations: string[];
}

export function isLawyerToolResultV2(v: unknown): v is LawyerToolResult {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { format?: unknown }).format === LAWYER_TOOL_FORMAT
  );
}

// ── بيانات عرض الأدوات (تطابق LegalAIToolType + outputMode) ──
export interface LawyerToolInfo {
  id: LawyerToolType;
  label: string;
  icon: string;
  category: 'formalization' | 'analysis' | 'summary' | 'creative';
  outputMode: LawyerToolOutputMode;
}

export const LAWYER_TOOLS: LawyerToolInfo[] = [
  { id: 'legal_formalization', label: 'صياغة قانونية رصينة', icon: '⚖️', category: 'formalization', outputMode: 'replacement' },
  { id: 'plain_language', label: 'تبسيط للعميل', icon: '💬', category: 'formalization', outputMode: 'replacement' },
  { id: 'formal_government', label: 'صياغة حكومية رسمية', icon: '🏛️', category: 'formalization', outputMode: 'replacement' },
  { id: 'risk_assessment', label: 'كشف المخاطر والثغرات', icon: '🔍', category: 'analysis', outputMode: 'report' },
  { id: 'legal_proofreading', label: 'التدقيق القانوني واللغوي', icon: '✅', category: 'analysis', outputMode: 'annotations' },
  { id: 'legal_proofreading_annotations', label: 'تدقيق مع تمييز وتصحيح', icon: '🖍️', category: 'analysis', outputMode: 'annotations' },
  { id: 'missing_clauses', label: 'اقتراح بنود مكمّلة', icon: '➕', category: 'analysis', outputMode: 'report' },
  { id: 'executive_summary', label: 'ملخص تنفيذي', icon: '📋', category: 'summary', outputMode: 'report' },
  { id: 'extract_obligations', label: 'استخراج الالتزامات', icon: '📝', category: 'summary', outputMode: 'report' },
  { id: 'counter_argument', label: 'تفنيد وردود قانونية', icon: '⚔️', category: 'creative', outputMode: 'report' },
  { id: 'penalty_clause', label: 'اقتراح شرط جزائي', icon: '💰', category: 'creative', outputMode: 'replacement' },
  { id: 'impact_simulation', label: 'محاكاة الأثر', icon: '🎯', category: 'creative', outputMode: 'report' },
];
