/**
 * أنواع «المشاريع القانونية» — مرآة لما يرجعه الباك (ProjectPresenter وأخواته).
 * المشروع = خطة ومراحل وسجلات فوق مهام حقيقية في جدول المهام.
 */

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectConfidentiality = 'team' | 'office' | 'managers';
export type ProjectHealth = 'on_track' | 'attention' | 'late';
export type ProjectColor = 'gold' | 'navy' | 'green' | 'red' | 'purple' | 'blue' | 'orange' | 'gray';
export type ProjectRole = 'partner' | 'manager' | 'lawyer' | 'assistant' | 'researcher' | 'external';
export type ProjectLinkType = 'case' | 'execution_request' | 'legal_service' | 'meeting' | 'contract';
export type PlanSource = 'manual' | 'ai' | 'template';
export type PhaseStatus = 'upcoming' | 'active' | 'awaiting_approval' | 'completed' | 'skipped' | 'hidden';
export type PhaseActivation = 'auto' | 'manual' | 'decision';
export type MilestoneStatus = 'planned' | 'done' | 'missed' | 'cancelled';
export type IssueImportance = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'answered' | 'closed';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RiskStatus = 'open' | 'monitoring' | 'occurred' | 'closed';
export type DecisionStatus = 'pending' | 'decided' | 'reversed';
export type DeliverableType = 'memo' | 'contract' | 'report' | 'filing' | 'opinion' | 'agreement' | 'letter' | 'other';
export type DeliverableStatus = 'planned' | 'in_progress' | 'review' | 'approval' | 'final' | 'submitted';
export type ChainStepKey = 'draft' | 'review' | 'partner' | 'manager' | 'client' | 'counterparty' | 'final' | 'submitted';
export type ContactKind = 'client_team' | 'external' | 'opponent' | 'expert' | 'other';
export type ReportKind = 'executive' | 'weekly' | 'client';
export type ReportStatus = 'draft' | 'approved' | 'sent';
export type FeedType = 'task' | 'session' | 'meeting' | 'document' | 'decision' | 'phase' | 'risk' | 'issue' | 'approval'
  | 'client' | 'raed' | 'milestone' | 'system' | 'comment' | 'deliverable' | 'member' | 'link' | 'report';
export type AiRunKind = 'plan' | 'ask' | 'summary' | 'report';
export type AiRunStatus = 'queued' | 'running' | 'ready' | 'failed';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'قيد التخطيط', active: 'جارٍ', on_hold: 'موقوف مؤقتاً', completed: 'مكتمل', cancelled: 'ملغى',
};
export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
  low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حرجة',
};
export const PROJECT_CONFIDENTIALITY_LABELS: Record<ProjectConfidentiality, string> = {
  team: 'فريق المشروع فقط', office: 'كل المكتب', managers: 'الإدارة والشركاء',
};
export const PROJECT_HEALTH_LABELS: Record<ProjectHealth, string> = {
  on_track: 'على المسار', attention: 'يحتاج انتباهاً', late: 'متأخر',
};
export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  partner: 'الشريك المسؤول', manager: 'مدير المشروع', lawyer: 'محامٍ', assistant: 'مساعد قانوني', researcher: 'باحث قانوني', external: 'طرف خارجي',
};
export const PROJECT_LINK_LABELS: Record<ProjectLinkType, string> = {
  case: 'قضية', execution_request: 'طلب تنفيذ', legal_service: 'خدمة قانونية', meeting: 'اجتماع', contract: 'عقد',
};
export const PROJECT_COLORS: ProjectColor[] = ['navy', 'gold', 'green', 'blue', 'purple', 'orange', 'red', 'gray'];
export const PROJECT_COLOR_LABELS: Record<ProjectColor, string> = {
  gold: 'ذهبي', navy: 'كحلي', green: 'أخضر', red: 'أحمر', purple: 'بنفسجي', blue: 'أزرق', orange: 'برتقالي', gray: 'رمادي',
};
export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  upcoming: 'قادمة', active: 'جارية', awaiting_approval: 'تنتظر الموافقة', completed: 'مكتملة', skipped: 'تُجاوزت', hidden: 'تنتظر قراراً',
};
export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  planned: 'مخطط', done: 'تم', missed: 'فات', cancelled: 'ألغي',
};
export const ISSUE_IMPORTANCE_LABELS: Record<IssueImportance, string> = {
  low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حاسمة',
};
export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: 'مفتوحة', in_progress: 'قيد البحث', answered: 'أُجيبت', closed: 'أُغلقت',
};
export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = { low: 'منخفض', medium: 'متوسط', high: 'عالٍ' };
export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  open: 'قائم', monitoring: 'تحت المراقبة', occurred: 'وقع', closed: 'أُغلق',
};
export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  pending: 'ينتظر', decided: 'اتُّخذ', reversed: 'عُدل عنه',
};
export const DELIVERABLE_TYPE_LABELS: Record<DeliverableType, string> = {
  memo: 'مذكرة', contract: 'عقد', report: 'تقرير', filing: 'لائحة أو طلب', opinion: 'رأي قانوني', agreement: 'اتفاقية', letter: 'خطاب', other: 'أخرى',
};
export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  planned: 'مخطط', in_progress: 'قيد الإعداد', review: 'قيد المراجعة', approval: 'قيد الموافقة', final: 'نهائي', submitted: 'قُدّم',
};
export const CHAIN_STEP_LABELS: Record<ChainStepKey, string> = {
  draft: 'مسودة', review: 'مراجعة', partner: 'موافقة الشريك', manager: 'موافقة المدير', client: 'موافقة العميل', counterparty: 'الطرف الآخر', final: 'نهائي', submitted: 'مقدَّم',
};
export const CONTACT_KIND_LABELS: Record<ContactKind, string> = {
  client_team: 'فريق العميل', external: 'جهة خارجية', opponent: 'الطرف الآخر', expert: 'خبير', other: 'أخرى',
};
export const REPORT_KIND_LABELS: Record<ReportKind, string> = {
  executive: 'التقرير التنفيذي', weekly: 'التقرير الأسبوعي', client: 'تقرير العميل',
};
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = { draft: 'مسودة', approved: 'معتمد', sent: 'أُرسل' };
export const FEED_TYPE_LABELS: Record<FeedType, string> = {
  task: 'مهام', session: 'جلسات', meeting: 'اجتماعات', document: 'مستندات', decision: 'قرارات', phase: 'مراحل', risk: 'مخاطر',
  issue: 'مسائل', approval: 'موافقات', client: 'العميل', raed: 'رائد', milestone: 'مواعيد', system: 'النظام', comment: 'محادثة',
  deliverable: 'مخرجات', member: 'الفريق', link: 'ارتباطات', report: 'تقارير',
};

export interface NamedRef { id: number; name: string }

export interface ProjectLink {
  id: number;
  type: ProjectLinkType;
  type_label: string;
  link_id: number;
  label: string;
  exists: boolean;
  url: string | null;
  note: string | null;
  extra: Record<string, unknown> | null;
}

export interface ProjectMember {
  id: number;
  user_id: number;
  name: string;
  role: ProjectRole;
  role_label: string;
  open_tasks?: number;
}

export interface ProjectContact {
  id: number;
  name: string;
  organization: string | null;
  kind: ContactKind;
  role_title: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface ProjectPhase {
  id: number;
  key: string | null;
  workstream: string | null;
  name: string;
  objective: string | null;
  order: number;
  owner: NamedRef | null;
  status: PhaseStatus;
  start_date: string | null;
  due_date: string | null;
  planned_start: string | null;
  planned_due: string | null;
  completed_at: string | null;
  requires_approval: boolean;
  approver: NamedRef | null;
  approved_at: string | null;
  client_visible: boolean;
  activation: PhaseActivation;
  decision_key: string | null;
  decision_option: string | null;
  estimated_hours: number | null;
  payment_term_id: number | null;
  session_cycle: boolean;
  tasks_total: number;
  tasks_done: number;
  tasks_late: number;
  hours_actual: number;
}

export interface ProjectMilestone {
  id: number;
  phase_id: number | null;
  key: string | null;
  name: string;
  source: string;
  source_type: string | null;
  source_id: number | null;
  date: string | null;
  status: MilestoneStatus;
  client_visible: boolean;
  note: string | null;
}

export interface DecisionPointOption { key: string; label: string; activates: number[] }
export interface DecisionPoint {
  id: number;
  key: string | null;
  after_phase_id: number | null;
  after_phase_name: string | null;
  question: string;
  options: DecisionPointOption[];
  chosen_key: string | null;
  decided_by: NamedRef | null;
  decided_at: string | null;
  note: string | null;
}

export interface ProjectCard {
  id: number;
  code: string;
  name: string;
  color: ProjectColor;
  status: ProjectStatus;
  status_label: string;
  priority: ProjectPriority;
  health: ProjectHealth;
  health_reasons: string[];
  progress: number;
  archetype: string | null;
  confidentiality: ProjectConfidentiality;
  client: NamedRef | null;
  manager: NamedRef | null;
  partner: NamedRef | null;
  start_date: string | null;
  target_end_date: string | null;
  phases_total: number;
  phases_done: number;
  current_phase: { id: number; name: string; order: number } | null;
  next_milestone: { id: number; name: string; date: string | null; source: string } | null;
  tasks_total: number;
  tasks_done: number;
  tasks_late: number;
  estimated_hours: number | null;
  updated_at: string;
  created_at: string;
}

export interface ProjectSettings {
  assumptions?: string[];
  ai_questions?: string[];
  workstreams?: Array<{ key: string; name: string }>;
  session_cycle?: { enabled: boolean; items: Array<{ title: string; role: ProjectRole; offset_days: number; duration_days: number }> };
  [key: string]: unknown;
}

export interface ProjectFull extends ProjectCard {
  description: string | null;
  contract: { id: number; title?: string | null; number?: string | null } | null;
  links: ProjectLink[];
  members: ProjectMember[];
  contacts: ProjectContact[];
  settings: ProjectSettings;
  ai_summary: string | null;
  ai_summary_at: string | null;
  plan_source: PlanSource;
  template_key: string | null;
  created_by: NamedRef | null;
  completed_at: string | null;
  has_baseline: boolean;
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
  decision_points: DecisionPoint[];
  can: { edit: boolean; delete: boolean; approve: boolean };
}

export interface ProjectTask {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  due_date: string | null;
  start_date: string | null;
  planned_start: string | null;
  planned_due: string | null;
  assignee: NamedRef | null;
  assignees: NamedRef[];
  reviewer: NamedRef | null;
  phase_id: number | null;
  deliverable_id: number | null;
  role_hint: ProjectRole | null;
  role_label: string | null;
  client_action: boolean;
  client_visible: boolean;
  requires_approval: boolean;
  requires_attachment: boolean;
  project_key: string | null;
  project_order: number | null;
  cycle_session_id: number | null;
  estimated_hours: string | number | null;
  hours_actual: number;
  subtasks_total: number;
  subtasks_completed: number;
  comments_count: number;
  documents_count: number;
  predecessors: Array<{ id: number; title: string; status: string }>;
  successors_count: number;
  is_late: boolean;
  is_ready: boolean;
  hold_reason: string | null;
}

export interface AttentionItem {
  severity: 'bad' | 'warn' | 'info';
  kind: string;
  id: number | null;
  text: string;
}

export interface FeedItem {
  key: string;
  type: FeedType | string;
  title: string;
  body: string | null;
  at: string;
  actor_name: string | null;
  is_future: boolean;
  subject_type: string | null;
  subject_id: number | null;
  url: string | null;
}

export interface OverviewNumbers {
  tasks_total: number; tasks_done: number; tasks_open: number; tasks_late: number; tasks_critical: number; tasks_blocked: number;
  phases_total: number; phases_done: number; documents: number; people: number;
  risks_open: number; risks_high: number; issues_open: number; issues_answered: number;
  decisions_made: number; decisions_pending: number; pending_approvals: number;
  deliverables_total: number; deliverables_final: number; deliverables_in_progress: number;
  hours_actual: number; hours_estimated: number; hours_ratio: number;
}

export interface ProjectOverview {
  health: ProjectHealth;
  health_reasons: string[];
  progress: number;
  numbers: OverviewNumbers;
  attention: AttentionItem[];
  upcoming: FeedItem[];
  phases: ProjectPhase[];
  current_phase: ProjectPhase | null;
  recent: Array<{ id: number; type: string; title: string; body: string | null; actor_name: string | null; at: string }>;
  summary: string;
  summary_source: 'ai' | 'auto';
  ai_summary_at: string | null;
}

export interface LinkedEvent {
  kind: 'session' | 'judgement' | 'stage' | 'meeting' | string;
  id: number;
  date: string | null;
  name: string;
  status: string | null;
}

export interface ProjectMap {
  start_date: string | null;
  target_end_date: string | null;
  workstreams: Array<{ key: string; name: string }>;
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
  decision_points: DecisionPoint[];
  tasks: ProjectTask[];
  links: ProjectLink[];
  linked_events: Array<{ link: ProjectLink; events: LinkedEvent[] }>;
}

export interface ProjectPeople {
  members: ProjectMember[];
  contacts: ProjectContact[];
  responsibilities: Array<{ phase_id: number; phase: string; executes: string[]; approves: string | null; owner: string | null; client_visible: boolean }>;
  client: NamedRef | null;
}

export interface ProjectMoney {
  hours: { estimated: number; actual: number; ratio: number; progress: number; forecast_total: number | null; forecast_over_pct: number | null };
  phases: Array<{ id: number; name: string; status: PhaseStatus; estimated_hours: number | null; actual_hours: number; payment_term_id: number | null }>;
  people: Array<{ id: number; name: string; hours: number }>;
  payment_terms: Array<{ id: number; title: string | null; amount: number | null; status: string | null; due_date: string | null; phase_id: number | null; paid_at?: string | null }>;
  expenses: Array<{ id: number; title: string | null; amount: number | null; date: string | null }>;
  contract: { id: number; title?: string | null; number?: string | null; total?: number | null } | null;
}

export interface ProjectEvent {
  kind: string;
  id: number;
  title: string;
  date: string | null;
  status: string | null;
  is_future: boolean;
  link: ProjectLink;
}

export interface ProjectIssue {
  id: number;
  number: number;
  question: string;
  details: string | null;
  importance: IssueImportance;
  status: IssueStatus;
  owner: NamedRef | null;
  reviewer: NamedRef | null;
  phase: NamedRef | null;
  due_date: string | null;
  answer: string | null;
  progress_note: string | null;
  decision_id: number | null;
  links: Array<{ type: string; id: number; label?: string }>;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRisk {
  id: number;
  number: number;
  title: string;
  details: string | null;
  probability: RiskLevel;
  impact: RiskLevel;
  score: number;
  level: RiskLevel;
  owner: NamedRef | null;
  mitigation: string | null;
  mitigation_task: { id: number; title: string; status: string } | null;
  due_date: string | null;
  status: RiskStatus;
  source: string;
  created_at: string;
}

export type RiskMatrix = Record<RiskLevel, Record<RiskLevel, number>>;

export interface ProjectDecision {
  id: number;
  number: number;
  title: string;
  details: string | null;
  decided_on: string | null;
  decided_by: NamedRef | null;
  reason: string | null;
  attendees: string | null;
  status: DecisionStatus;
  issue_id: number | null;
  links: Array<{ type: string; id: number; label?: string }>;
  created_at: string;
}

export interface ChainStep { key: ChainStepKey | string; label?: string; status: 'pending' | 'current' | 'done' | 'returned'; by?: NamedRef | null; at?: string | null; note?: string | null }

export interface ProjectDeliverable {
  id: number;
  number: number;
  key: string | null;
  name: string;
  type: DeliverableType;
  type_label: string;
  phase: NamedRef | null;
  task: { id: number; title: string; status: string } | null;
  owner: NamedRef | null;
  due_date: string | null;
  status: DeliverableStatus;
  document: { id: number; title: string; version?: number } | null;
  version: number;
  approval_chain: ChainStep[];
  current_step: ChainStep | null;
  client_visible: boolean;
  notes: string | null;
}

export interface ProjectDocument {
  id: number;
  title: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  category: string | null;
  version: number | null;
  is_confidential: boolean;
  is_external: boolean;
  external_url: string | null;
  source: 'project' | 'task' | 'case' | 'other';
  task_id: number | null;
  case_id: number | null;
  deliverable_id: number | null;
  uploader: NamedRef | null;
  created_at: string | null;
  download_url: string;
}

export interface ProjectReport {
  id: number;
  kind: ReportKind;
  kind_label: string;
  title: string;
  period_label: string | null;
  body: string;
  status: ReportStatus;
  drafted_by: 'user' | 'raed' | string;
  creator: NamedRef | null;
  approver: NamedRef | null;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectComment {
  id: number;
  user: NamedRef | null;
  author_type: 'user' | 'raed' | 'system' | string;
  body: string;
  mentions: number[];
  meta: Record<string, unknown> | null;
  created_at: string;
}

export type ShareScope = Record<'overview' | 'phases' | 'milestones' | 'tasks' | 'deliverables' | 'reports' | 'documents' | 'meetings', boolean>;

export const SHARE_SCOPE_LABELS: Record<keyof ShareScope, string> = {
  overview: 'نظرة عامة', phases: 'المراحل', milestones: 'المواعيد الرئيسية', tasks: 'المهام الظاهرة', deliverables: 'المخرجات',
  reports: 'تقارير العميل', documents: 'المستندات', meetings: 'الاجتماعات',
};

export interface ProjectShare {
  id: number;
  label: string;
  kind: 'external' | 'client';
  token: string;
  pin?: string;
  scope: ShareScope;
  expires_at: string | null;
  last_accessed_at: string | null;
  access_count: number;
  is_active: boolean;
  url: string;
}

export interface AiRun {
  id: number;
  kind: AiRunKind;
  status: AiRunStatus;
  project_id: number | null;
  input: { question?: string } | null;
  result: Record<string, unknown> | null;
  error: string | null;
  model: string | null;
  created_at: string | null;
  finished_at: string | null;
}

export interface AiAskResult { answer: string; sources: Array<{ type: string; id: number | null; label: string }> }

export interface PlanTask {
  key: string;
  title: string;
  description?: string;
  role: ProjectRole;
  offset_days: number;
  duration_days: number;
  depends_on: string[];
  deliverable: string | null;
  client_action: boolean;
  client_visible: boolean;
  requires_approval: boolean;
  priority: string;
  estimated_hours: number;
  steps: string[];
  cycle?: boolean;
}

export interface PlanPhase {
  key: string;
  workstream: string;
  name: string;
  objective: string;
  owner_role: ProjectRole;
  start: { anchor: string; offset_days: number; fallback_offset_days: number | null };
  duration_days: number;
  requires_approval: boolean;
  approver_role: ProjectRole | null;
  client_visible: boolean;
  activation: PhaseActivation;
  decision_key: string | null;
  decision_option: string | null;
  estimated_hours: number;
  session_cycle: boolean;
  tasks: PlanTask[];
}

export interface ProjectPlan {
  version?: number;
  key: string;
  archetype: string;
  name: string;
  description?: string;
  summary?: string;
  horizon_days: number;
  workstreams: Array<{ key: string; name: string }>;
  phases: PlanPhase[];
  milestones: Array<{ key: string; name: string; anchor: string; offset_days: number; fallback_offset_days: number | null; source: string; phase: string | null; client_visible: boolean }>;
  decision_points: Array<{ key: string; after_phase: string; question: string; options: Array<{ key: string; label: string; activates: string[] }> }>;
  session_cycle: { enabled: boolean; items: Array<{ title: string; role: ProjectRole; offset_days: number; duration_days: number }> };
  deliverables: Array<{ key: string; name: string; type: DeliverableType; phase: string | null; task: string | null; role: ProjectRole; approval_chain: string[]; client_visible: boolean }>;
  issues: Array<{ question: string; importance: IssueImportance; role: ProjectRole; reviewer_role?: ProjectRole | null; phase?: string | null }>;
  risks: Array<{ title: string; probability: RiskLevel; impact: RiskLevel; role: ProjectRole; mitigation?: string | null }>;
  assumptions: string[];
  questions: string[];
}

export interface PlanStats {
  workstreams: number; phases: number; tasks: number; milestones: number; decision_points: number; issues: number; risks: number; horizon_days: number; deliverables?: number;
}

export interface AiPlanResult {
  plan: ProjectPlan;
  stats: PlanStats;
  facts: string[];
  questions: string[];
  base_template: { id: number; key: string; name: string } | null;
  fallback: boolean;
  fallback_reason?: string;
}

export interface ProjectTemplateSummary {
  id: number;
  key: string;
  name: string;
  archetype: string | null;
  description: string | null;
  is_builtin: boolean;
  usage_count: number;
  stats: PlanStats;
  created_at: string | null;
}

export interface ProjectTemplateFull extends ProjectTemplateSummary {
  plan: ProjectPlan;
}

export interface Linkable { id: number; label: string; sub: string | null }

/** خريطة الأدوار عند تطبيق خطة: من يقوم بدور الشريك والمدير والمحامين... */
export interface RoleMap {
  partner: number | null;
  manager: number | null;
  lawyer: number[];
  assistant: number | null;
  researcher: number | null;
  external: number | null;
}

export interface ProjectListSummary { open: number; completed: number; attention: number; late: number }

export interface ProjectListPage {
  current_page: number;
  data: ProjectCard[];
  last_page: number;
  per_page: number;
  total: number;
}

/** ما يراه العميل أو حامل رابط المشاركة */
export interface ClientProjectView {
  project: {
    code: string; name: string; status: ProjectStatus; status_label: string; progress: number; color: ProjectColor;
    start_date: string | null; target_end_date: string | null; manager_name: string | null; client_name: string | null;
    office_name: string | null; office_phone: string | null;
  };
  phases: Array<{ id: number; name: string; objective: string | null; status: PhaseStatus; is_current: boolean; start_date: string | null; due_date: string | null }>;
  milestones: Array<{ id: number; name: string; date: string | null; status: MilestoneStatus; is_estimate: boolean; from_court: boolean }>;
  tasks: Array<{ id: number; title: string; description: string | null; status: 'open' | 'done'; client_action: boolean; due_date: string | null; is_late: boolean; can_upload: boolean }>;
  deliverables: Array<{ id: number; name: string; type_label: string; status: DeliverableStatus; due_date: string | null; version: number; client_step: string | null; can_approve: boolean }>;
  reports: Array<{ id: number; title: string; period_label: string | null; body: string; sent_at: string | null }>;
  meetings: Array<{ id: number | string; name: string; date: string | null }>;
  scope: ShareScope;
  label?: string;
}

export interface ClientProjectCard {
  id: number;
  code: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  color: ProjectColor;
  manager_name: string | null;
  start_date: string | null;
  pending_from_you: number;
}

export interface PortalInfo { label: string; project_name: string; office_name: string | null; requires_pin: boolean; locked: boolean }
export interface PortalAccess { access_token: string; expires_in: number; label: string }
