// خدمة «غرفة الصياغة» — مساحة بناء المذكّرة بالذكاء.
//
// تستهلك endpoints الباك-إند (كلّها خلف علَم المكتب draft_room_enabled
// ثم صلاحية memos.workspace.use ثم سياسة MemoWorkspacePolicy):
//
// GET    /api/v1/memo-workspaces                                 مساحاتي
// POST   /api/v1/memo-workspaces                                 مساحة جديدة
// GET    /api/v1/memo-workspaces/{id}                            حالة المساحة كاملة
// DELETE /api/v1/memo-workspaces/{id}
// POST   /api/v1/memo-workspaces/{id}/sources                    رفع ملفّ
// POST   /api/v1/memo-workspaces/{id}/sources/paste              لصق نصّ
// PATCH  /api/v1/memo-workspaces/{id}/sources/{sid}/side         حسم جهة المستند
// DELETE /api/v1/memo-workspaces/{id}/sources/{sid}
// GET    /api/v1/memo-workspaces/{id}/runs                       المحادثة
// POST   /api/v1/memo-workspaces/{id}/message                    دور جديد
// PATCH  /api/v1/memo-workspaces/{id}/questions/{qid}            جواب سؤال
// PATCH  /api/v1/memo-workspaces/{id}/facts/{fid}                إقرار واقعة
// POST   /api/v1/memo-workspaces/{id}/export                     تصدير إلى مذكّرة

import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

// ═══════════════════════════════════════════════════════
//  الأنواع — مرآةُ العقد الخادميّ DraftRoomContract
// ═══════════════════════════════════════════════════════

export type MemoTypeKey = 'written_plea' | 'claim_petition';

export type WorkspaceStatus =
  | 'intake' | 'questioning' | 'planning' | 'drafting' | 'drafted' | 'archived';

export type SourceSide = 'ours' | 'opponent' | 'court' | 'neutral' | 'unknown';

export type ExtractStatus = 'pending' | 'done' | 'failed' | 'skipped';

export interface DraftRoomSource {
  id: number;
  title: string | null;
  kind: 'upload' | 'paste';
  side: SourceSide;
  side_decided_by: 'model' | 'lawyer' | null;
  extract_status: ExtractStatus;
  extract_reason: string | null;
  pages: number | null;
  char_count: number;
  readable: boolean;
  /** سببُ عدم القراءة بلغةٍ تقول للمحامي ماذا يفعل — لا «لم يُقرأ» وحدها. */
  message: string | null;
}

export interface DraftRoomChoice {
  id: string;
  label: string;
  /** سطرُ الأثر: ماذا يترتّب على اختيار هذا؟ خيارٌ بلا ثمنٍ معلومٍ ليس اختياراً. */
  impact?: string;
}

export interface DraftRoomQuestion {
  id: number;
  text: string;
  why: string | null;
  answer_kind: 'choice' | 'date' | 'amount' | 'text';
  choices: DraftRoomChoice[] | null;
  /** حاجب ⇒ «لا أعلم» تقفل المسلك ولا يُكتب عن موضوعه حرف. */
  blocking: boolean;
  status: 'open' | 'answered' | 'unknown' | 'skipped';
  answer: string | null;
  /** اقتراحُ الوكيل المسنَّد — يُعتمد بنقرةٍ بدل أن يُسأل المحامي فارغاً */
  suggested_answer?: string | null;
  suggested_basis?: string | null;
}

export interface DraftRoomFact {
  id: number;
  statement: string;
  origin: 'document' | 'lawyer_statement' | 'computed';
  weight: 'for_us' | 'against_us' | 'disputed';
  quote: string | null;
  /** نُقل بأمانة — علامةٌ مستقلّةٌ عن الحجّية. */
  quote_verified: boolean;
  match_score: number | null;
  /** تدخل المذكّرة بالنقر لا بالصمت. */
  accepted: boolean;
  source_id: number | null;
}

export interface DraftRoomWorkspace {
  id: number;
  title: string;
  memo_type: MemoTypeKey;
  status: WorkspaceStatus;
  client_position: 'plaintiff' | 'defendant' | null;
  subject_type: 'none' | 'case' | 'grievance' | 'bankruptcy' | 'reconciliation';
  has_blocking_questions: boolean;
  /** جاهزية الصياغة — البوابة الخادمية نفسها، للواجهة كي تضيء زر الصياغة الحرة */
  ready_to_draft?: boolean;
  draft_block_reason?: string | null;
  case_brief: string | null;
  /** ما جُمع من الديباجة حواراً — والناقصُ بأسمائه العربية */
  preamble: Record<string, string> | null;
  preamble_missing: string[];
  sources: DraftRoomSource[];
  questions: DraftRoomQuestion[];
  facts: DraftRoomFact[];
}

export interface DraftRoomWorkspaceSummary {
  id: number;
  title: string;
  memo_type: MemoTypeKey;
  status: WorkspaceStatus;
  client_position: string | null;
  last_activity_at: string | null;
  created_at: string;
}

// ── البطاقات: ما تقرؤه الواجهة هو `parts` التي يبنيها الخادم، لا `cards` النموذج ──

export interface CitationItem {
  index: number;
  article_id: number | null;
  statute_name: string;
  article_number: string;
  legal_status: string | null;
  /** false ⇒ ملغاة أو معدّلة أو غير محقَّقة — تُعرض موسومةً لا خضراء. */
  is_current: boolean;
  excerpt: string;
}

export type DraftRoomPart =
  | { type: 'question'; question_id: number; text: string; why: string | null;
      answer_kind: DraftRoomQuestion['answer_kind']; choices: DraftRoomChoice[] | null; blocking: boolean;
      preamble_field?: string | null }
  | { type: 'fact_sheet'; facts: Array<Omit<DraftRoomFact, 'id'> & { fact_id: number }> }
  | { type: 'draft_section'; title: string; html: string; citation_indices: number[] }
  | { type: 'source_read'; source_id: number; segment_seq: number | null; excerpt: string }
  | { type: 'notice'; level: 'info' | 'warning' | 'error'; text: string }
  | { type: 'citations'; items: CitationItem[] }
  | { type: 'verification';
      items: Array<{ kind: 'citation' | 'quote' | 'figure'; status: 'verified' | 'not_found' | 'extraction_failed';
        claim: string; detail?: Record<string, unknown> }>;
      summary: { verified: number; unverified: number } }
  | { type: 'gaps'; items: Array<{ question_id?: number; source_id?: number; text: string; blocking: boolean; effect: string }> };

export interface DraftRoomRun {
  id: number;
  role: 'user' | 'assistant' | 'system';
  body: string | null;
  parts: DraftRoomPart[] | null;
  action: 'reply' | 'ask' | 'plan' | 'draft' | 'refuse' | null;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  error_code: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════
//  النداءات
// ═══════════════════════════════════════════════════════

const base = '/memo-workspaces';

export async function listWorkspaces(): Promise<DraftRoomWorkspaceSummary[]> {
  const res = await apiClient.get<ApiResponse<DraftRoomWorkspaceSummary[]>>(base);
  return res.data ?? [];
}

export async function createWorkspace(input: {
  title: string;
  memo_type: MemoTypeKey;
  client_position?: 'plaintiff' | 'defendant' | null;
  /** وصفُ القضية الحرّ — الوكيلُ يستنتج منه الصفةَ بدل أزرار مدّعٍ/مدّعى عليه */
  case_brief?: string | null;
}): Promise<DraftRoomWorkspace> {
  const res = await apiClient.post<ApiResponse<DraftRoomWorkspace>>(base, input);
  return res.data as DraftRoomWorkspace;
}

export async function getWorkspace(id: number): Promise<DraftRoomWorkspace> {
  const res = await apiClient.get<ApiResponse<DraftRoomWorkspace>>(`${base}/${id}`);
  return res.data as DraftRoomWorkspace;
}

export async function deleteWorkspace(id: number): Promise<void> {
  await apiClient.delete(`${base}/${id}`);
}

export async function uploadSource(id: number, file: File, role = 'other'): Promise<DraftRoomSource> {
  const form = new FormData();
  form.append('file', file);
  form.append('role', role);

  const res = await apiClient.postFormData<ApiResponse<DraftRoomSource>>(`${base}/${id}/sources`, form);
  return res.data as DraftRoomSource;
}

export async function pasteSource(
  id: number, input: { title: string; text: string; role?: string },
): Promise<DraftRoomSource> {
  const res = await apiClient.post<ApiResponse<DraftRoomSource>>(`${base}/${id}/sources/paste`, input);
  return res.data as DraftRoomSource;
}

export async function setSourceSide(id: number, sourceId: number, side: SourceSide): Promise<DraftRoomSource> {
  const res = await apiClient.patch<ApiResponse<DraftRoomSource>>(
    `${base}/${id}/sources/${sourceId}/side`, { side },
  );
  return res.data as DraftRoomSource;
}

export async function deleteSource(id: number, sourceId: number): Promise<void> {
  await apiClient.delete(`${base}/${id}/sources/${sourceId}`);
}

export async function getRuns(id: number): Promise<DraftRoomRun[]> {
  const res = await apiClient.get<ApiResponse<DraftRoomRun[]>>(`${base}/${id}/runs`);
  return res.data ?? [];
}

/**
 * دورٌ جديد.
 *
 * ⚠️ لا يرمي عند الامتناع: الخادم يردّ 200 بـ`status: 'failed'` ورمزٍ ونصٍّ مكتوبٍ
 * سلفاً — والامتناعُ حالةُ منتجٍ لا خطأُ شبكة. من يعالجه بـcatch يُظهر «حدث خطأ»
 * بدل الرسالة الصحيحة.
 */
export async function sendMessage(id: number, message: string): Promise<DraftRoomRun> {
  const res = await apiClient.post<ApiResponse<DraftRoomRun>>(`${base}/${id}/message`, { message });
  return res.data as DraftRoomRun;
}

export async function answerQuestion(
  id: number, questionId: number,
  input: { status: 'answered' | 'unknown' | 'skipped'; answer?: string; choice_id?: string },
): Promise<DraftRoomWorkspace> {
  const res = await apiClient.patch<ApiResponse<DraftRoomWorkspace>>(
    `${base}/${id}/questions/${questionId}`, input,
  );
  return res.data as DraftRoomWorkspace;
}

export async function toggleFact(id: number, factId: number, accepted: boolean): Promise<void> {
  await apiClient.patch(`${base}/${id}/facts/${factId}`, { accepted });
}

/**
 * تصديرٌ إلى مكتبة المذكّرات — و`caseId` اختياريّ يربط المذكّرةَ بقضيةٍ بعينها.
 * 🩸 كان النجاحُ يوجّه إلى `/legal-memos` — مسارٍ لا وجودَ له — فتظهر صفحةُ الخطأ.
 * الآن لا توجيهَ: المذكّرةُ تبقى في الغرفة والنتيجةُ تُعرض في اللوح الجانبيّ.
 */
export async function exportWorkspace(
  id: number, caseId?: number,
): Promise<{ memo_id: number; title: string; status: string }> {
  const res = await apiClient.post<ApiResponse<{ memo_id: number; title: string; status: string }>>(
    `${base}/${id}/export`, caseId ? { case_id: caseId } : {},
  );
  return res.data as { memo_id: number; title: string; status: string };
}

/** المذكّرةُ النهائية المركّبة — يبنيها الخادمُ بترتيبها الشرعيّ والبسملةُ أوّلَها */
export interface FinalMemo {
  html: string;
  /** ما لم يُستكمل بعد — يُعرض للمحامي قبل أن يوقّع على فراغ */
  missing: string[];
  sections_count: number;
  exportable: boolean;
  blocking_open: boolean;
}

/** الصياغة الحرة: نثرٌ مُطلقٌ ثم تدقيقٌ بعديٌّ لكل ادعاء — بأمر المالك */
export async function freeDraft(id: number, instructions?: string): Promise<DraftRoomRun> {
  const res = await apiClient.post<ApiResponse<DraftRoomRun>>(
    `${base}/${id}/free-draft`, instructions ? { instructions } : {},
  );
  return res.data as DraftRoomRun;
}

export async function getFinalMemo(id: number): Promise<FinalMemo> {
  const res = await apiClient.get<ApiResponse<FinalMemo>>(`${base}/${id}/final`);
  return res.data as FinalMemo;
}

// ═══════════════════════════════════════════════════════
//  نصوص الواجهة — عربية واضحة، لا أدبية
// ═══════════════════════════════════════════════════════

export const MEMO_TYPE_LABELS: Record<MemoTypeKey, string> = {
  written_plea: 'مذكّرة جوابية',
  claim_petition: 'صحيفة دعوى',
};

export const STATUS_LABELS: Record<WorkspaceStatus, string> = {
  intake: 'جمع المستندات',
  questioning: 'أسئلة مفتوحة',
  planning: 'بناء الهيكل',
  drafting: 'قيد الصياغة',
  drafted: 'مسوّدة جاهزة',
  archived: 'مؤرشفة',
};

export const SIDE_LABELS: Record<SourceSide, string> = {
  ours: 'لنا',
  opponent: 'للخصم',
  court: 'من المحكمة',
  neutral: 'محايد',
  unknown: 'الجهة غير محسومة',
};

export const WEIGHT_LABELS: Record<DraftRoomFact['weight'], string> = {
  for_us: 'لنا',
  against_us: 'علينا',
  disputed: 'محلّ نزاع',
};

export const ORIGIN_LABELS: Record<DraftRoomFact['origin'], string> = {
  document: 'من مستند',
  lawyer_statement: 'إفادة محامٍ',
  computed: 'محتسَبة',
};
