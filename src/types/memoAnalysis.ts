/**
 * عقد مخرج محركات تحليل المذكرات (EngineResult) — مرآة TypeScript للباك إند.
 * يطابق:
 *   - app/Services/MemoAnalysis/EngineResult.php (الشكل + التطبيع)
 *   - app/Enums/{MemoEngineType,VerdictLevel,FindingSeverity,ChecklistStatus,GroundingMode}.php
 *   - app/Services/MemoAnalysis/EngineContract.php (الإصدار + FORMAT)
 *
 * ⚠️ أي تعديل هنا يجب أن يقابله تعديل مطابق في الباك (والعكس)، مع رفع SCHEMA_VERSION.
 * المرحلة ٠ (تجميد العقد) — لا يُستهلك بعد؛ العرض في المرحلة ٧.
 */

// ─── الإصدار والعلامة (تطابق EngineContract.php) ───
export const ENGINE_RESULT_FORMAT = 'v2' as const;

// ─── أنواع المحركات وقيم الحقول (تطابق الـ enums) ───
export type MemoEngineType =
  | 'gatekeeper'
  | 'brain'
  | 'opponent'
  | 'polish'
  | 'compliance';

export type VerdictLevel = 'pass' | 'warn' | 'fail';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ChecklistStatus = 'pass' | 'warn' | 'fail' | 'na';

export type GroundingMode = 'grounded' | 'ungrounded';

// ─── عناصر العقد ───
export interface Verdict {
  level: VerdictLevel;
  label: string;
  summary: string;
}

export interface ChecklistItem {
  label: string;
  status: ChecklistStatus;
  citation_indices: number[];
  note: string;
}

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  /** اقتباس حرفي من المذكرة — شرط عمل زر «طبّق» عبر textAnnotations. */
  quote: string;
  location_hint: string | null;
  impact: string;
  recommendation: string;
  /** صياغة بديلة جاهزة للّصق (اختياري) — وقود زر «طبّق». */
  suggested_text: string | null;
  citation_indices: number[];
  /** وسم الحارس: ادّعاء بلا سند محقون (يُلوَّن «اجتهادي»). اختياري — يضيفه عقد أدوات المحامي. */
  unverified?: boolean;
}

export interface Citation {
  index: number;
  /** معرّف المادة في قاعدة الأنظمة (للنقر/التصفّح)؛ null إن لم تُربَط. */
  article_id: number | null;
  statute_name: string;
  article_number: string;
  text: string;
  score: number;
  /** true = مُؤرَّض من مصدر حقيقي؛ false = غير مؤكّد (يُعرض رماديّاً بلا رابط). */
  grounded: boolean;
}

export interface Deadline {
  label: string;
  days: number | null;
  urgency: string | null;
  citation_index: number | null;
}

export interface EngineMeta {
  engine: MemoEngineType;
  grounding_mode: GroundingMode;
  grounded_citations: number;
  total_citations: number;
  /** عدد السوابق القضائية المستأنَس بها (تجاري فقط حالياً) — للتذييل. */
  precedents_used: number;
  rag_attempted: boolean;
  model: string | null;
  contract_version: string;
  memo_type: string | null;
  partial: boolean;
  as_of_date: { hijri: string | null; gregorian: string | null } | null;
}

export interface EngineResult {
  engine: MemoEngineType;
  format: typeof ENGINE_RESULT_FORMAT;
  verdict: Verdict;
  score: number | null;
  score_label: string | null;
  checklist: ChecklistItem[];
  findings: Finding[];
  citations: Citation[];
  deadlines: Deadline[];
  meta: EngineMeta;
  /** حقول خاصة بكل محرك (strategy لـbrain، weaknesses لـopponent، items لـcompliance، language_fixes لـpolish). تُطبع في المرحلة ٢. */
  engine_specific: Record<string, unknown>;
  needs_verification: string[];
  refusals: string[];
  limitations: string[];
}

// ─── بيانات عرض المحركات (تطابق MemoEngineType::displayName/icon/isCore) ───
export const MEMO_ENGINES: {
  value: MemoEngineType;
  label: string;
  icon: string;
  isCore: boolean;
}[] = [
  { value: 'gatekeeper', label: 'الحارس الشكلي', icon: '🛡️', isCore: true },
  { value: 'brain', label: 'المحلل الاستراتيجي', icon: '🧠', isCore: true },
  { value: 'opponent', label: 'محاكي الخصم', icon: '⚔️', isCore: true },
  { value: 'polish', label: 'المدقق القانوني', icon: '✨', isCore: false },
  { value: 'compliance', label: 'مراجع الامتثال', icon: '📋', isCore: false },
];

/** هل المخرج بالعقد الجديد (v2)؟ غير ذلك → fallback لعرض النص القديم (ReactMarkdown). */
export function isEngineResultV2(value: unknown): value is EngineResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { format?: unknown }).format === ENGINE_RESULT_FORMAT
  );
}
