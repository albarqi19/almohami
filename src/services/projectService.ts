import { apiClient, API_BASE_URL } from '../utils/api';
import type { ApiResponse } from '../utils/api';
import type {
  AiRun,
  ClientProjectCard,
  ClientProjectView,
  DecisionPoint,
  FeedItem,
  Linkable,
  PortalAccess,
  PortalInfo,
  ProjectCard,
  ProjectComment,
  ProjectContact,
  ProjectDecision,
  ProjectDeliverable,
  ProjectDocument,
  ProjectEvent,
  ProjectFull,
  ProjectIssue,
  ProjectLinkType,
  ProjectListPage,
  ProjectListSummary,
  ProjectMap,
  ProjectMember,
  ProjectMilestone,
  ProjectMoney,
  ProjectOverview,
  ProjectPeople,
  ProjectPhase,
  ProjectPlan,
  ProjectReport,
  ProjectRisk,
  ProjectShare,
  ProjectTask,
  ProjectTemplateFull,
  ProjectTemplateSummary,
  RiskMatrix,
  RoleMap,
  ShareScope,
} from '../types/projects';

/**
 * خدمة المشاريع القانونية — كل نداءات /projects و/client/projects وبوابة الرابط العامة.
 * القراءة خلف projects.view والكتابة خلف projects.edit؛ الباك يفرضها ويكفينا هنا رفع رسالته.
 */

const ok = <T>(res: ApiResponse<T>, fallback: string): T => {
  if (res.success) return res.data as T;
  throw new Error(res.message || fallback);
};

export interface ProjectListFilters {
  status?: 'open' | 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | '';
  health?: string;
  manager_id?: number;
  client_id?: number;
  mine?: boolean;
  search?: string;
  sort_by?: 'updated_at' | 'created_at' | 'name' | 'progress' | 'health' | 'target_end_date';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  archetype?: string;
  color?: string;
  priority?: string;
  confidentiality?: string;
  client_id?: number | null;
  contract_id?: number | null;
  partner_id?: number | null;
  manager_id?: number | null;
  start_date?: string;
  target_end_date?: string;
  links?: Array<{ type: ProjectLinkType; id: number }>;
  members?: Array<{ user_id: number; role?: string }>;
  plan_source?: 'manual' | 'template' | 'ai';
  template_id?: number;
  ai_run_id?: number;
  plan?: ProjectPlan;
  role_map?: RoleMap;
}

export interface UpdateProjectInput {
  name?: string; description?: string | null; archetype?: string | null; color?: string; status?: string; priority?: string;
  confidentiality?: string; client_id?: number | null; contract_id?: number | null; partner_id?: number | null; manager_id?: number | null;
  start_date?: string | null; target_end_date?: string | null; settings?: Record<string, unknown>;
}

export interface PhaseInput {
  name?: string; objective?: string | null; workstream?: string | null; owner_id?: number | null; start_date?: string | null; due_date?: string | null;
  requires_approval?: boolean; approver_id?: number | null; client_visible?: boolean; activation?: string; estimated_hours?: number | null;
  payment_term_id?: number | null; session_cycle?: boolean; status?: string; order?: number;
}

export interface ProjectTaskInput {
  title: string; description?: string; phase_id?: number | null; assigned_to?: number | null; assignee_ids?: number[]; priority?: string;
  due_date?: string; start_date?: string; estimated_hours?: number | null; requires_approval?: boolean; client_action?: boolean;
  client_visible?: boolean; role_hint?: string | null; depends_on?: number[]; deliverable_id?: number | null;
}

export interface CreateStoreResult { project: ProjectFull; applied: Record<string, number> | null; plan_error?: string | null; message: string }

export class ProjectService {
  // ───────── القائمة والإنشاء ─────────
  static async list(filters: ProjectListFilters = {}): Promise<{ page: ProjectListPage; summary: ProjectListSummary }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== false) params.append(k, String(v === true ? 1 : v));
    });
    const q = params.toString();
    const res = await apiClient.get<ApiResponse<ProjectListPage> & { summary?: ProjectListSummary }>(`/projects${q ? `?${q}` : ''}`);
    const page = ok(res, 'تعذر جلب المشاريع');
    return { page, summary: res.summary ?? { open: 0, completed: 0, attention: 0, late: 0 } };
  }

  static async create(input: CreateProjectInput): Promise<CreateStoreResult> {
    const res = await apiClient.post<ApiResponse<ProjectFull> & { applied?: Record<string, number> | null; plan_error?: string | null }>('/projects', input);
    const project = ok(res, 'تعذر إنشاء المشروع');
    return { project, applied: res.applied ?? null, plan_error: res.plan_error ?? null, message: res.message || '' };
  }

  static async get(id: number): Promise<ProjectFull> {
    return ok(await apiClient.get<ApiResponse<ProjectFull>>(`/projects/${id}`), 'تعذر جلب المشروع');
  }

  static async update(id: number, input: UpdateProjectInput): Promise<ProjectFull> {
    return ok(await apiClient.put<ApiResponse<ProjectFull>>(`/projects/${id}`, input), 'تعذر حفظ المشروع');
  }

  static async remove(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف المشروع');
  }

  static async recompute(id: number): Promise<ProjectFull> {
    return ok(await apiClient.post<ApiResponse<ProjectFull>>(`/projects/${id}/recompute`), 'تعذر إعادة الحساب');
  }

  // ───────── الغرفة ─────────
  static async overview(id: number): Promise<ProjectOverview> {
    return ok(await apiClient.get<ApiResponse<ProjectOverview>>(`/projects/${id}/overview`), 'تعذر جلب النظرة العامة');
  }

  static async feed(id: number, types: string[] = [], pastLimit = 60, futureDays = 45): Promise<{ items: FeedItem[]; types: string[] }> {
    const params = new URLSearchParams();
    if (types.length) params.append('types', types.join(','));
    params.append('past', String(pastLimit));
    params.append('future_days', String(futureDays));
    const res = await apiClient.get<ApiResponse<FeedItem[]> & { types?: string[] }>(`/projects/${id}/feed?${params.toString()}`);
    return { items: ok(res, 'تعذر جلب الخط الزمني'), types: res.types ?? [] };
  }

  static async map(id: number): Promise<ProjectMap> {
    return ok(await apiClient.get<ApiResponse<ProjectMap>>(`/projects/${id}/map`), 'تعذر جلب الخريطة');
  }

  static async tasks(id: number): Promise<ProjectTask[]> {
    return ok(await apiClient.get<ApiResponse<ProjectTask[]>>(`/projects/${id}/tasks`), 'تعذر جلب المهام');
  }

  static async createTask(id: number, input: ProjectTaskInput): Promise<ProjectTask> {
    return ok(await apiClient.post<ApiResponse<ProjectTask>>(`/projects/${id}/tasks`, input), 'تعذر إضافة المهمة');
  }

  static async taskImpact(id: number, taskId: number): Promise<{ tasks: Array<{ id: number; title: string; due_date: string | null }>; phases: Array<{ id: number; name: string }> }> {
    return ok(await apiClient.get<ApiResponse<{ tasks: Array<{ id: number; title: string; due_date: string | null }>; phases: Array<{ id: number; name: string }> }>>(`/projects/${id}/tasks/${taskId}/impact`), 'تعذر حساب الأثر');
  }

  static async addDependency(id: number, predecessorId: number, successorId: number, lagDays = 0): Promise<void> {
    const res = await apiClient.post<ApiResponse<unknown>>(`/projects/${id}/dependencies`, { predecessor_task_id: predecessorId, successor_task_id: successorId, lag_days: lagDays });
    if (!res.success) throw new Error(res.message || 'تعذر إضافة الاعتمادية');
  }

  static async removeDependency(id: number, dependencyId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/dependencies/${dependencyId}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف الاعتمادية');
  }

  static async people(id: number): Promise<ProjectPeople> {
    return ok(await apiClient.get<ApiResponse<ProjectPeople>>(`/projects/${id}/people`), 'تعذر جلب الأشخاص');
  }

  static async money(id: number): Promise<ProjectMoney> {
    return ok(await apiClient.get<ApiResponse<ProjectMoney>>(`/projects/${id}/money`), 'تعذر جلب الوقت والمال');
  }

  static async events(id: number): Promise<ProjectEvent[]> {
    return ok(await apiClient.get<ApiResponse<ProjectEvent[]>>(`/projects/${id}/events`), 'تعذر جلب الأحداث المرتبطة');
  }

  static async clientPreview(id: number): Promise<ClientProjectView> {
    return ok(await apiClient.get<ApiResponse<ClientProjectView>>(`/projects/${id}/client-preview`), 'تعذر جلب معاينة العميل');
  }

  static async exportPlan(id: number): Promise<ProjectPlan> {
    return ok(await apiClient.get<ApiResponse<ProjectPlan>>(`/projects/${id}/export-plan`), 'تعذر تصدير الخطة');
  }

  // ───────── الارتباطات والأشخاص ─────────
  static async linkables(type: ProjectLinkType, q: string): Promise<Linkable[]> {
    const params = new URLSearchParams({ type, q });
    return ok(await apiClient.get<ApiResponse<Linkable[]>>(`/projects/linkables?${params.toString()}`), 'تعذر البحث');
  }

  static async addLink(id: number, type: ProjectLinkType, linkId: number, note?: string): Promise<ProjectFull> {
    return ok(await apiClient.post<ApiResponse<ProjectFull>>(`/projects/${id}/links`, { type, id: linkId, note }), 'تعذر الربط');
  }

  static async removeLink(id: number, linkRowId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/links/${linkRowId}`);
    if (!res.success) throw new Error(res.message || 'تعذر فك الربط');
  }

  static async syncMembers(id: number, members: Array<{ user_id: number; role?: string }>): Promise<ProjectMember[]> {
    return ok(await apiClient.put<ApiResponse<ProjectMember[]>>(`/projects/${id}/members`, { members }), 'تعذر حفظ الفريق');
  }

  static async addContact(id: number, input: Partial<ProjectContact> & { name: string }): Promise<ProjectContact> {
    return ok(await apiClient.post<ApiResponse<ProjectContact>>(`/projects/${id}/contacts`, input), 'تعذر إضافة جهة الاتصال');
  }

  static async updateContact(id: number, contactId: number, input: Partial<ProjectContact>): Promise<ProjectContact> {
    return ok(await apiClient.put<ApiResponse<ProjectContact>>(`/projects/${id}/contacts/${contactId}`, input), 'تعذر حفظ جهة الاتصال');
  }

  static async removeContact(id: number, contactId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/contacts/${contactId}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف جهة الاتصال');
  }

  // ───────── المراحل والمواعيد والقرارات ─────────
  static async createPhase(id: number, input: PhaseInput & { name: string }): Promise<ProjectPhase> {
    return ok(await apiClient.post<ApiResponse<ProjectPhase>>(`/projects/${id}/phases`, input), 'تعذر إضافة المرحلة');
  }

  static async updatePhase(id: number, phaseId: number, input: PhaseInput): Promise<ProjectPhase> {
    return ok(await apiClient.put<ApiResponse<ProjectPhase>>(`/projects/${id}/phases/${phaseId}`, input), 'تعذر حفظ المرحلة');
  }

  static async deletePhase(id: number, phaseId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/phases/${phaseId}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف المرحلة');
  }

  static async reorderPhases(id: number, ids: number[]): Promise<void> {
    const res = await apiClient.put<ApiResponse<unknown>>(`/projects/${id}/phases/reorder`, { ids });
    if (!res.success) throw new Error(res.message || 'تعذر إعادة الترتيب');
  }

  static async completePhase(id: number, phaseId: number): Promise<{ phase: ProjectPhase; message: string }> {
    const res = await apiClient.post<ApiResponse<ProjectPhase>>(`/projects/${id}/phases/${phaseId}/complete`);
    return { phase: ok(res, 'تعذر إكمال المرحلة'), message: res.message || '' };
  }

  static async approvePhase(id: number, phaseId: number, approve: boolean, reason?: string): Promise<{ phase: ProjectPhase; message: string }> {
    const res = await apiClient.post<ApiResponse<ProjectPhase>>(`/projects/${id}/phases/${phaseId}/approve`, { approve, reason });
    return { phase: ok(res, 'تعذر تسجيل القرار'), message: res.message || '' };
  }

  static async createMilestone(id: number, input: { name: string; date: string; phase_id?: number | null; client_visible?: boolean; note?: string; source?: 'manual' | 'estimate' }): Promise<ProjectMilestone> {
    return ok(await apiClient.post<ApiResponse<ProjectMilestone>>(`/projects/${id}/milestones`, input), 'تعذر إضافة الموعد');
  }

  static async updateMilestone(id: number, msId: number, input: { name?: string; date?: string | null; phase_id?: number | null; client_visible?: boolean; note?: string | null; status?: string }): Promise<ProjectMilestone> {
    return ok(await apiClient.put<ApiResponse<ProjectMilestone>>(`/projects/${id}/milestones/${msId}`, input), 'تعذر حفظ الموعد');
  }

  static async deleteMilestone(id: number, msId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/milestones/${msId}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف الموعد');
  }

  static async decide(id: number, pointId: number, optionKey: string, note?: string): Promise<{ point: DecisionPoint; message: string }> {
    const res = await apiClient.post<ApiResponse<DecisionPoint>>(`/projects/${id}/decision-points/${pointId}/decide`, { option_key: optionKey, note });
    return { point: ok(res, 'تعذر تسجيل القرار'), message: res.message || '' };
  }

  // ───────── القوالب والخطط ─────────
  static async templates(): Promise<ProjectTemplateSummary[]> {
    return ok(await apiClient.get<ApiResponse<ProjectTemplateSummary[]>>('/projects/templates'), 'تعذر جلب القوالب');
  }

  static async template(id: number): Promise<ProjectTemplateFull> {
    return ok(await apiClient.get<ApiResponse<ProjectTemplateFull>>(`/projects/templates/${id}`), 'تعذر جلب القالب');
  }

  static async createTemplate(input: { name: string; description?: string; plan: ProjectPlan }): Promise<ProjectTemplateSummary> {
    return ok(await apiClient.post<ApiResponse<ProjectTemplateSummary>>('/projects/templates', input), 'تعذر حفظ القالب');
  }

  static async updateTemplate(id: number, input: { name?: string; description?: string | null; plan?: ProjectPlan }): Promise<ProjectTemplateSummary> {
    return ok(await apiClient.put<ApiResponse<ProjectTemplateSummary>>(`/projects/templates/${id}`, input), 'تعذر حفظ القالب');
  }

  static async duplicateTemplate(id: number): Promise<ProjectTemplateSummary> {
    return ok(await apiClient.post<ApiResponse<ProjectTemplateSummary>>(`/projects/templates/${id}/duplicate`), 'تعذر نسخ القالب');
  }

  static async deleteTemplate(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/templates/${id}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف القالب');
  }

  static async applyTemplate(id: number, templateId: number, roleMap: RoleMap): Promise<{ applied: Record<string, number>; message: string }> {
    const res = await apiClient.post<ApiResponse<Record<string, number>>>(`/projects/${id}/apply-template`, { template_id: templateId, role_map: roleMap });
    return { applied: ok(res, 'تعذر تطبيق القالب'), message: res.message || '' };
  }

  static async applyPlan(id: number, plan: ProjectPlan, roleMap: RoleMap, source: 'manual' | 'ai' | 'template' = 'ai'): Promise<{ applied: Record<string, number>; message: string }> {
    const res = await apiClient.post<ApiResponse<Record<string, number>>>(`/projects/${id}/apply-plan`, { plan, role_map: roleMap, source });
    return { applied: ok(res, 'تعذر تطبيق الخطة'), message: res.message || '' };
  }

  static async saveAsTemplate(id: number, name: string, description?: string): Promise<ProjectTemplateSummary> {
    return ok(await apiClient.post<ApiResponse<ProjectTemplateSummary>>(`/projects/${id}/save-template`, { name, description }), 'تعذر حفظ القالب');
  }

  // ───────── رائد ─────────
  static async aiQuota(): Promise<{ remaining: number; cap: number; enabled: boolean }> {
    return ok(await apiClient.get<ApiResponse<{ remaining: number; cap: number; enabled: boolean }>>('/projects/ai/quota'), 'تعذر قراءة رصيد الذكاء');
  }

  static async aiPlan(input: { name: string; description?: string; archetype?: string; case_ids?: number[]; execution_request_ids?: number[]; legal_service_ids?: number[]; client_name?: string; has_contract?: boolean; notes?: string; project_id?: number }): Promise<AiRun> {
    return ok(await apiClient.post<ApiResponse<AiRun>>('/projects/ai/plan', input), 'تعذر بدء خطة رائد');
  }

  static async aiRun(runId: number): Promise<AiRun> {
    return ok(await apiClient.get<ApiResponse<AiRun>>(`/projects/ai/runs/${runId}`), 'تعذر متابعة التشغيلة');
  }

  /** ينتظر التشغيلة حتى تجهز أو تفشل (استطلاع كل ثانيتين، بحد أقصى ~3 دقائق) */
  static async waitForRun(runId: number, onTick?: (run: AiRun) => void, maxTries = 90): Promise<AiRun> {
    for (let i = 0; i < maxTries; i++) {
      const run = await ProjectService.aiRun(runId);
      onTick?.(run);
      if (run.status === 'ready' || run.status === 'failed') return run;
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error('رائد يستغرق وقتاً أطول من المعتاد. حاول مرة أخرى بعد قليل.');
  }

  static async ask(id: number, question: string): Promise<AiRun> {
    return ok(await apiClient.post<ApiResponse<AiRun>>(`/projects/${id}/ask`, { question }), 'تعذر إرسال السؤال');
  }

  static async asks(id: number): Promise<AiRun[]> {
    return ok(await apiClient.get<ApiResponse<AiRun[]>>(`/projects/${id}/asks`), 'تعذر جلب الأسئلة');
  }

  static async refreshSummary(id: number): Promise<AiRun> {
    return ok(await apiClient.post<ApiResponse<AiRun>>(`/projects/${id}/summary/refresh`), 'تعذر تحديث الملخص');
  }

  static async improveReport(id: number, reportId: number): Promise<AiRun> {
    return ok(await apiClient.post<ApiResponse<AiRun>>(`/projects/${id}/reports/${reportId}/improve`), 'تعذر تحسين التقرير');
  }

  // ───────── السجلات ─────────
  static async issues(id: number): Promise<ProjectIssue[]> {
    return ok(await apiClient.get<ApiResponse<ProjectIssue[]>>(`/projects/${id}/issues`), 'تعذر جلب المسائل');
  }
  static async createIssue(id: number, input: Record<string, unknown>): Promise<ProjectIssue> {
    return ok(await apiClient.post<ApiResponse<ProjectIssue>>(`/projects/${id}/issues`, input), 'تعذر إضافة المسألة');
  }
  static async updateIssue(id: number, issueId: number, input: Record<string, unknown>): Promise<ProjectIssue> {
    return ok(await apiClient.put<ApiResponse<ProjectIssue>>(`/projects/${id}/issues/${issueId}`, input), 'تعذر حفظ المسألة');
  }
  static async deleteIssue(id: number, issueId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/issues/${issueId}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف المسألة');
  }

  static async risks(id: number): Promise<{ items: ProjectRisk[]; matrix: RiskMatrix | null }> {
    const res = await apiClient.get<ApiResponse<ProjectRisk[]> & { matrix?: RiskMatrix }>(`/projects/${id}/risks`);
    return { items: ok(res, 'تعذر جلب المخاطر'), matrix: res.matrix ?? null };
  }
  static async createRisk(id: number, input: Record<string, unknown>): Promise<ProjectRisk> {
    return ok(await apiClient.post<ApiResponse<ProjectRisk>>(`/projects/${id}/risks`, input), 'تعذر إضافة الخطر');
  }
  static async updateRisk(id: number, riskId: number, input: Record<string, unknown>): Promise<ProjectRisk> {
    return ok(await apiClient.put<ApiResponse<ProjectRisk>>(`/projects/${id}/risks/${riskId}`, input), 'تعذر حفظ الخطر');
  }
  static async deleteRisk(id: number, riskId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/risks/${riskId}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف الخطر');
  }

  static async decisions(id: number): Promise<ProjectDecision[]> {
    return ok(await apiClient.get<ApiResponse<ProjectDecision[]>>(`/projects/${id}/decisions`), 'تعذر جلب القرارات');
  }
  static async createDecision(id: number, input: Record<string, unknown>): Promise<ProjectDecision> {
    return ok(await apiClient.post<ApiResponse<ProjectDecision>>(`/projects/${id}/decisions`, input), 'تعذر إضافة القرار');
  }
  static async updateDecision(id: number, decisionId: number, input: Record<string, unknown>): Promise<ProjectDecision> {
    return ok(await apiClient.put<ApiResponse<ProjectDecision>>(`/projects/${id}/decisions/${decisionId}`, input), 'تعذر حفظ القرار');
  }
  static async deleteDecision(id: number, decisionId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/decisions/${decisionId}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف القرار');
  }

  static async deliverables(id: number): Promise<ProjectDeliverable[]> {
    return ok(await apiClient.get<ApiResponse<ProjectDeliverable[]>>(`/projects/${id}/deliverables`), 'تعذر جلب المخرجات');
  }
  static async createDeliverable(id: number, input: Record<string, unknown>): Promise<ProjectDeliverable> {
    return ok(await apiClient.post<ApiResponse<ProjectDeliverable>>(`/projects/${id}/deliverables`, input), 'تعذر إضافة المخرج');
  }
  static async updateDeliverable(id: number, dId: number, input: Record<string, unknown>): Promise<ProjectDeliverable> {
    return ok(await apiClient.put<ApiResponse<ProjectDeliverable>>(`/projects/${id}/deliverables/${dId}`, input), 'تعذر حفظ المخرج');
  }
  static async deleteDeliverable(id: number, dId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/deliverables/${dId}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف المخرج');
  }
  static async advanceDeliverable(id: number, dId: number, approve: boolean, note?: string): Promise<{ deliverable: ProjectDeliverable; message: string }> {
    const res = await apiClient.post<ApiResponse<ProjectDeliverable>>(`/projects/${id}/deliverables/${dId}/advance`, { approve, note });
    return { deliverable: ok(res, 'تعذر تحريك المخرج'), message: res.message || '' };
  }

  // ───────── المستندات ─────────
  static async documents(id: number): Promise<{ items: ProjectDocument[]; categories: string[]; counts: Record<string, number> }> {
    const res = await apiClient.get<ApiResponse<ProjectDocument[]> & { categories?: string[]; counts?: Record<string, number> }>(`/projects/${id}/documents`);
    return { items: ok(res, 'تعذر جلب المستندات'), categories: res.categories ?? [], counts: res.counts ?? {} };
  }

  static async uploadDocument(id: number, file: File, opts: { title?: string; deliverable_id?: number | null; category?: string; is_confidential?: boolean } = {}): Promise<ProjectDocument> {
    const fd = new FormData();
    fd.append('file', file);
    if (opts.title) fd.append('title', opts.title);
    if (opts.deliverable_id) fd.append('deliverable_id', String(opts.deliverable_id));
    if (opts.category) fd.append('category', opts.category);
    if (opts.is_confidential) fd.append('is_confidential', '1');
    return ok(await apiClient.postFormData<ApiResponse<ProjectDocument>>(`/projects/${id}/documents`, fd), 'تعذر رفع المستند');
  }

  static async documentUrl(id: number, documentId: number): Promise<{ url: string; external: boolean }> {
    const res = await apiClient.get<ApiResponse<unknown> & { url?: string; external?: boolean }>(`/projects/${id}/documents/${documentId}/url`);
    if (!res.success || !res.url) throw new Error(res.message || 'تعذر فتح المستند');
    return { url: res.url, external: Boolean(res.external) };
  }

  // ───────── التقارير ─────────
  static async reports(id: number): Promise<ProjectReport[]> {
    return ok(await apiClient.get<ApiResponse<ProjectReport[]>>(`/projects/${id}/reports`), 'تعذر جلب التقارير');
  }
  static async createReport(id: number, kind: string, periodLabel?: string): Promise<ProjectReport> {
    return ok(await apiClient.post<ApiResponse<ProjectReport>>(`/projects/${id}/reports`, { kind, period_label: periodLabel }), 'تعذر إنشاء التقرير');
  }
  static async report(id: number, reportId: number): Promise<ProjectReport> {
    return ok(await apiClient.get<ApiResponse<ProjectReport>>(`/projects/${id}/reports/${reportId}`), 'تعذر جلب التقرير');
  }
  static async updateReport(id: number, reportId: number, input: { title?: string; body?: string; period_label?: string }): Promise<ProjectReport> {
    return ok(await apiClient.put<ApiResponse<ProjectReport>>(`/projects/${id}/reports/${reportId}`, input), 'تعذر حفظ التقرير');
  }
  static async deleteReport(id: number, reportId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/reports/${reportId}`);
    if (!res.success) throw new Error(res.message || 'تعذر حذف التقرير');
  }
  static async approveReport(id: number, reportId: number): Promise<ProjectReport> {
    return ok(await apiClient.post<ApiResponse<ProjectReport>>(`/projects/${id}/reports/${reportId}/approve`), 'تعذر اعتماد التقرير');
  }
  static async sendReport(id: number, reportId: number): Promise<{ report: ProjectReport; message: string }> {
    const res = await apiClient.post<ApiResponse<ProjectReport>>(`/projects/${id}/reports/${reportId}/send`);
    return { report: ok(res, 'تعذر إرسال التقرير'), message: res.message || '' };
  }

  // ───────── المحادثة ─────────
  static async comments(id: number): Promise<ProjectComment[]> {
    return ok(await apiClient.get<ApiResponse<ProjectComment[]>>(`/projects/${id}/comments`), 'تعذر جلب المحادثة');
  }
  static async addComment(id: number, body: string, mentions: number[] = []): Promise<ProjectComment> {
    return ok(await apiClient.post<ApiResponse<ProjectComment>>(`/projects/${id}/comments`, { body, mentions }), 'تعذر الإرسال');
  }
  static async deleteComment(id: number, commentId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/comments/${commentId}`);
    if (!res.success) throw new Error(res.message || 'تعذر الحذف');
  }

  // ───────── الاجتماعات ─────────
  static async linkMeeting(id: number, meetingId: number): Promise<void> {
    const res = await apiClient.post<ApiResponse<unknown>>(`/projects/${id}/meetings/link`, { meeting_id: meetingId });
    if (!res.success) throw new Error(res.message || 'تعذر ربط الاجتماع');
  }
  static async importMinutes(id: number, meetingId: number, items: Array<{ title: string; assigned_to?: number | null; due_date?: string; phase_id?: number | null; client_action?: boolean }>, decisions: Array<{ title: string; reason?: string }>): Promise<{ tasks: ProjectTask[]; decisions: ProjectDecision[] }> {
    return ok(await apiClient.post<ApiResponse<{ tasks: ProjectTask[]; decisions: ProjectDecision[] }>>(`/projects/${id}/meetings/${meetingId}/import`, { items, decisions }), 'تعذر تحويل المحضر');
  }

  // ───────── المشاركة الخارجية ─────────
  static async shares(id: number): Promise<ProjectShare[]> {
    return ok(await apiClient.get<ApiResponse<ProjectShare[]>>(`/projects/${id}/shares`), 'تعذر جلب روابط المشاركة');
  }
  static async createShare(id: number, input: { label: string; pin?: string; kind?: 'external' | 'client'; scope?: Partial<ShareScope>; expires_at?: string }): Promise<ProjectShare> {
    return ok(await apiClient.post<ApiResponse<ProjectShare>>(`/projects/${id}/shares`, input), 'تعذر إنشاء الرابط');
  }
  static async deleteShare(id: number, shareId: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse<unknown>>(`/projects/${id}/shares/${shareId}`);
    if (!res.success) throw new Error(res.message || 'تعذر إلغاء الرابط');
  }
}

/** بوابة العميل: مشاريعه وما هو مطلوب منه */
export class ClientProjectService {
  static async list(): Promise<ClientProjectCard[]> {
    return ok(await apiClient.get<ApiResponse<ClientProjectCard[]>>('/client/projects'), 'تعذر جلب مشاريعك');
  }
  static async get(id: number): Promise<ClientProjectView> {
    return ok(await apiClient.get<ApiResponse<ClientProjectView>>(`/client/projects/${id}`), 'تعذر جلب المشروع');
  }
  static async upload(id: number, taskId: number, file: File, note?: string): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    if (note) fd.append('note', note);
    const res = await apiClient.postFormData<ApiResponse<unknown>>(`/client/projects/${id}/tasks/${taskId}/upload`, fd);
    if (!res.success) throw new Error(res.message || 'تعذر رفع الملف');
    return res.message || 'تم الرفع';
  }
  static async approveDeliverable(id: number, deliverableId: number, approve: boolean, note?: string): Promise<string> {
    const res = await apiClient.post<ApiResponse<unknown>>(`/client/projects/${id}/deliverables/${deliverableId}/approve`, { approve, note });
    if (!res.success) throw new Error(res.message || 'تعذر تسجيل ردك');
    return res.message || 'تم';
  }
}

/** بوابة الرابط العامة (بلا تسجيل دخول): رابط + رقم سري ⇒ رمز وصول مؤقت في الترويسة */
export class ProjectPortalService {
  private static async call<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json', ...(init.headers as Record<string, string> | undefined) };
    if (accessToken) headers['X-Portal-Token'] = accessToken;
    const res = await fetch(`${API_BASE_URL}/public/project-portal/${path}`, { ...init, headers });
    let json: ApiResponse<T> | null = null;
    try { json = await res.json(); } catch { json = null; }
    if (!res.ok || !json || !json.success) {
      const err = new Error(json?.message || (res.status === 429 ? 'محاولات كثيرة. حاول بعد قليل.' : 'تعذر الاتصال بالخادم')) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return json.data as T;
  }

  static info(token: string): Promise<PortalInfo> {
    return ProjectPortalService.call<PortalInfo>(token);
  }

  static verify(token: string, pin: string): Promise<PortalAccess> {
    return ProjectPortalService.call<PortalAccess>(`${token}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
  }

  static view(token: string, accessToken: string): Promise<ClientProjectView> {
    return ProjectPortalService.call<ClientProjectView>(`${token}/view`, {}, accessToken);
  }
}
