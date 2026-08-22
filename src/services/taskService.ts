import { apiClient } from '../utils/api';
import { toApiDatetime } from '../utils/dateAr';
import type { ApiResponse, PaginatedResponse } from '../utils/api';
import type { ArchivedFilter, Task, CreateTaskForm, ExternalLinkPayload, Document } from '../types';

export interface TaskFilters {
  status?: string;
  priority?: string;
  type?: string;
  assigned_to?: string;
  case_id?: string;
  client_id?: string;
  execution_request_id?: string | number;
  /** مهام خدمة قانونية بعينها — شاشة الخدمة تقرأ بها حالة التكليف */
  legal_service_id?: string | number;
  search?: string;
  page?: number;
  limit?: number;
  per_page?: number;
  /* فلاتر «عرض الكل» لودجات اللوحة الجانبية */
  overdue?: number;
  due_today?: number;
  needs_attention?: number;
  /* مجلدات المهام: folder_id = مهام مجلد بعينه، exclude_foldered = العام يخفي مهام المجلدات */
  folder_id?: number;
  exclude_foldered?: number;
  /**
   * المفتوحةُ أولاً ثم المنتهية، والصفحةُ تتّسع للمفتوحة كلِّها (بسقف 500) ثم
   * تُضيف `per_page` من المنتهية. فـ«تحميل المزيد» يخصّ المنتهية وحدها.
   * قِيس على الإنتاج: مكتبٌ من 285 مهمة، 253 منها مكتملة — فالصفحةُ الأولى
   * بترتيب `created_at` كانت تبتلع المفتوحةَ الاثنتين والثلاثين.
   */
  open_first?: number;
  /**
   * الفلترة تُخفي والبحث يُظهر: '0' المؤرشفة مخفيّة (افتراضي) | '1' المؤرشفة وحدها | 'all' الكل.
   * إن أُرسل `search` بلا `archived` تحوّل الباك تلقائياً إلى 'all'؛ وإن أُرسل صراحةً فهو يفوز.
   */
  archived?: ArchivedFilter;
}

export interface TaskStats {
  total: number;
  todo: number;
  in_progress: number;
  review: number;
  pending_approval: number;
  on_hold: number;
  completed: number;
  cancelled: number;
  overdue: number;
  due_today: number;
  by_priority: { low: number; medium: number; high: number; urgent: number };
  /** عدد المؤرشفة — بقية العدّادات صارت تستثنيها */
  archived: number;
}

/** paginator المهام ومعه عدّاد المؤرشفة — للعرض «١٢٤ مهمة · ٣١ مؤرشفة» */
export type TasksPage = PaginatedResponse<Task> & {
  archived_count: number;
  /** الوضع الذي طبّقه الباك فعلياً (قد يصير 'all' تلقائياً مع البحث) */
  archived_mode: ArchivedFilter;
  /**
   * عدّادُ كلِّ حالةٍ محسوبٌ على الاستعلام المفلتَر **قبل** الترقيم.
   * 🔴 اقرأ منه عدّاداتِ الترويسات والأعمدة — لا من طول المصفوفة المحمَّلة:
   *    ذاك كان يقول «لم تبدأ 5» ثم يقفز إلى 10 بعد «تحميل المزيد» (#223).
   */
  status_counts: Record<string, number>;
};

export interface TaskWidgets {
  overdue: { id: number | string; title: string; due_date: string | null }[];
  due_today: { id: number | string; title: string; priority: string; status: string }[];
  pending_approval: { id: number | string; title: string; updated_at: string; assignee_name: string | null }[];
  needs_attention: { id: number | string; title: string; reason: string }[];
  workload: { user_id: number | string; name: string; open_count: number }[];
  counts: { needs_attention: number };
}

export class TaskService {
  /** إحصائيات حقيقية من الخادم (كل المهام لا المحمّل محلياً فقط) */
  static async getTaskStatistics(): Promise<TaskStats> {
    const response = await apiClient.get<ApiResponse<TaskStats>>('/tasks/statistics');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب إحصائيات المهام');
  }

  /** قوائم ودجات اللوحة الجانبية — دقيقة ومستقلة عن ترقيم الصفحات وفلاتر الجدول */
  static async getTaskWidgets(): Promise<TaskWidgets> {
    const response = await apiClient.get<ApiResponse<TaskWidgets>>('/tasks/widgets');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب بيانات الودجات');
  }

  static async getTasks(filters: TaskFilters = {}): Promise<TasksPage> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/tasks?${queryString}` : '/tasks';

    const response = await apiClient.get<
      ApiResponse<PaginatedResponse<any>> & {
        archived_count?: number;
        archived_mode?: ArchivedFilter;
        status_counts?: Record<string, number | string>;
      }
    >(endpoint);

    if (response.success && response.data) {
      // Convert tasks data from snake_case to camelCase
      const convertedTasks = response.data.data.map((task: any) => ({
        ...task,
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
        startDate: task.start_date ? new Date(task.start_date) : undefined,
        autoStart: Boolean(task.auto_start),
        createdAt: task.created_at ? new Date(task.created_at) : new Date(),
        updatedAt: task.updated_at ? new Date(task.updated_at) : new Date(),
        completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
        estimatedHours: task.estimated_hours,
        actualHours: task.actual_hours,
        assignedTo: task.assigned_to != null ? String(task.assigned_to) : '',
        assignedBy: task.assigned_by != null ? String(task.assigned_by) : '',
        caseId: task.case_id != null ? String(task.case_id) : undefined,
        assignees: Array.isArray(task.assignees) ? task.assignees : undefined
      }));
      
      // archived_count و archived_mode و status_counts تصل في جذر الردّ لا داخل الـpaginator
      // ⚠️ MySQL يُرجع COUNT كنصّ، فالتحويل إلى رقم هنا لا عند الاستعمال
      const statusCounts: Record<string, number> = {};
      Object.entries(response.status_counts ?? {}).forEach(([k, v]) => {
        statusCounts[k] = Number(v) || 0;
      });

      return {
        ...response.data,
        data: convertedTasks,
        archived_count: response.archived_count ?? 0,
        archived_mode: response.archived_mode ?? '0',
        status_counts: statusCounts,
      } as TasksPage;
    } else {
      throw new Error(response.message || 'فشل في جلب المهام');
    }
  }

  static async getTask(id: string): Promise<Task> {
    const response = await apiClient.get<ApiResponse<any>>(`/tasks/${id}`);
    
    if (response.success && response.data) {
      // Convert snake_case to camelCase
      const task = {
        ...response.data,
        dueDate: response.data.due_date ? new Date(response.data.due_date) : undefined,
        startDate: response.data.start_date ? new Date(response.data.start_date) : undefined,
        autoStart: Boolean(response.data.auto_start),
        createdAt: response.data.created_at ? new Date(response.data.created_at) : new Date(),
        updatedAt: response.data.updated_at ? new Date(response.data.updated_at) : new Date(),
        completedAt: response.data.completed_at ? new Date(response.data.completed_at) : undefined,
        estimatedHours: response.data.estimated_hours,
        actualHours: response.data.actual_hours,
        assignedTo: response.data.assigned_to != null ? String(response.data.assigned_to) : '',
        assignedBy: response.data.assigned_by != null ? String(response.data.assigned_by) : '',
        caseId: response.data.case_id != null ? String(response.data.case_id) : undefined,
        assignees: Array.isArray(response.data.assignees) ? response.data.assignees : undefined
      };
      return task as Task;
    } else {
      throw new Error(response.message || 'فشل في جلب تفاصيل المهمة');
    }
  }

  static async createTask(taskData: CreateTaskForm): Promise<Task> {
    // Convert camelCase to snake_case for Laravel API
    const apiData = {
      title: taskData.title,
      description: taskData.description,
      type: taskData.type || 'other',
      case_id: taskData.caseId,
      client_id: taskData.clientId,
      execution_request_id: taskData.executionRequestId,
      legal_service_id: taskData.legalServiceId,
      assigned_to: taskData.assignedTo,
      // تعدّد المكلّفين — أرقام صحيحة؛ الباك يزامن pivot task_assignees
      assignee_ids: taskData.assigneeIds && taskData.assigneeIds.length
        ? taskData.assigneeIds.map((id) => Number(id))
        : undefined,
      priority: taskData.priority,
      // ساعةُ حائط لا لحظةٌ كونية — toISOString كان يُزيح الاستحقاق ثلاث ساعات
      due_date: toApiDatetime(taskData.dueDate),
      start_date: taskData.startDate ? toApiDatetime(taskData.startDate) : undefined,
      // بلا بدايةٍ لا معنى للتحويل التلقائي — والباك يفرض القاعدةَ نفسها
      auto_start: taskData.startDate ? (taskData.autoStart ?? false) : false,
      estimated_hours: taskData.estimatedHours,
      requires_approval: taskData.requiresApproval ?? false,
      requires_attachment: taskData.requiresAttachment ?? false,
    };

    const response = await apiClient.post<ApiResponse<Task>>('/tasks', apiData);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في إنشاء المهمة');
    }
  }

  /** إنشاء مهمة من تسجيل صوتي — الذكاء يستخرج العنوان/الفرعية/المُسنَد إليه/الاستحقاق */
  static async createTaskFromVoice(audio: Blob): Promise<{ task: Task & { id: number | string }; transcript?: string }> {
    const formData = new FormData();
    formData.append('audio', audio, 'voice-task.wav');

    const response = await apiClient.post<ApiResponse<any> & { transcript?: string }>('/tasks/voice', formData);

    if (response.success && response.data) {
      return { task: response.data, transcript: response.transcript };
    }
    throw new Error(response.message || 'فشل في إنشاء المهمة من التسجيل');
  }

  /** يستقبل الحقول بصيغة snake_case كما يتوقعها الـ API (مثل actual_hours وdue_date) */
  static async updateTask(id: string, taskData: Record<string, unknown>): Promise<Task> {
    const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, taskData);
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تحديث المهمة');
    }
  }

  static async deleteTask(id: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/tasks/${id}`);
    
    if (!response.success) {
      throw new Error(response.message || 'فشل في حذف المهمة');
    }
  }

  static async updateTaskStatus(id: string, status: string): Promise<Task> {
    const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}/status`, { status });
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تحديث حالة المهمة');
    }
  }

  static async assignTask(id: string, assigneeId: string, assigneeIds?: (string | number)[]): Promise<Task> {
    const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${id}/assign`, {
      assigned_to: assigneeId,
      ...(assigneeIds && assigneeIds.length
        ? { assignee_ids: assigneeIds.map((v) => Number(v)) }
        : {}),
    });
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في تعيين المهمة');
    }
  }

  static async getMyTasks(): Promise<Task[]> {
    const response = await apiClient.get<ApiResponse<Task[]>>('/tasks/my-tasks');
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب مهامي');
    }
  }

  static async getOverdueTasks(): Promise<Task[]> {
    const response = await apiClient.get<ApiResponse<Task[]>>('/tasks/overdue');
    
    if (response.success && response.data) {
      return response.data;
    } else {
      throw new Error(response.message || 'فشل في جلب المهام المتأخرة');
    }
  }

  static async archiveTask(taskId: string): Promise<void> {
    const response = await apiClient.put<ApiResponse>(`/tasks/${taskId}/archive`, {});

    if (!response.success) {
      throw new Error(response.message || 'فشل في أرشفة المهمة');
    }
  }

  /** إعادة المهمة من الأرشيف — archived_at تصير null والحالة تعود 'todo'. 422 إن لم تكن مؤرشفة. */
  static async unarchiveTask(taskId: string): Promise<Task> {
    const response = await apiClient.put<ApiResponse<Task>>(`/tasks/${taskId}/unarchive`, {});

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في إلغاء أرشفة المهمة');
  }

  /**
   * إعادة ترتيب مهام داخل قضية. يُرسل قائمة معرّفات المهام بالترتيب الجديد.
   */
  static async reorderInCase(caseId: string, orderedTaskIds: string[]): Promise<void> {
    const response = await apiClient.post<ApiResponse>(
      `/cases/${caseId}/tasks/reorder`,
      { order: orderedTaskIds.map((id) => Number(id)) }
    );

    if (!response.success) {
      throw new Error(response.message || 'فشل في إعادة ترتيب المهام');
    }
  }

  // ===== الإيقاف المؤقت (#130) =====

  /** إيقاف المهمة مؤقتاً بسبب إلزامي — on_hold لا تمرّ عبر /status. */
  static async holdTask(id: string, reason: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/hold`, { reason });
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'تعذّر إيقاف المهمة');
  }

  /** استئناف مهمة موقوفة — تعود لحالتها قبل الإيقاف وتُستأنف فرعياتها الموقوفة. */
  static async resumeTask(id: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/resume`, {});
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'تعذّر استئناف المهمة');
  }

  // ===== بوابة الاعتماد + المرفقات =====

  /** اعتماد إنجاز مهمة «بانتظار الاعتماد». */
  static async approveTask(id: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/approve`, {});
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'فشل اعتماد المهمة');
  }

  /** رفض إنجاز مهمة «بانتظار الاعتماد» (سبب إجباري). */
  static async rejectTask(id: string, reason: string): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(`/tasks/${id}/reject`, { reason });
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'فشل رفض المهمة');
  }

  /** تعديل متطلبات المهمة (تتطلب اعتماداً / تتطلب مرفقاً) — للمنشئ/المدير. */
  static async configureRequirements(
    id: string,
    data: { requires_approval?: boolean; requires_attachment?: boolean }
  ): Promise<Task> {
    const response = await apiClient.patch<ApiResponse<Task>>(`/tasks/${id}/requirements`, data);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'فشل تحديث متطلبات المهمة');
  }

  /** قائمة مرفقات المهمة + حالة ربط OneDrive. */
  static async getTaskDocuments(id: string): Promise<{ documents: any[]; onedriveConnected: boolean }> {
    const response = await apiClient.get<ApiResponse<any[]> & { onedrive_connected?: boolean }>(`/tasks/${id}/documents`);
    if (response.success) {
      return { documents: response.data || [], onedriveConnected: response.onedrive_connected === true };
    }
    throw new Error(response.message || 'فشل جلب مرفقات المهمة');
  }

  /** رفع مرفق للمهمة إلى OneDrive (متاح لكل المهام). */
  static async uploadTaskDocument(id: string, file: File, title?: string): Promise<any> {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    const response = await apiClient.post<ApiResponse<any>>(`/tasks/${id}/documents`, form);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'فشل رفع المرفق');
  }

  /**
   * إضافة رابط خارجي كمرفق للمهمة (بلا ملف ولا OneDrive).
   * POST /tasks/{id}/documents/link — الردّ 201 والوثيقة في data.
   * الباك يرفض ما لا يبدأ بـhttp://‏ أو https:// برسالة عربية (422).
   */
  static async addTaskLink(id: string | number, payload: ExternalLinkPayload): Promise<Document> {
    const response = await apiClient.post<ApiResponse<Document>>(`/tasks/${id}/documents/link`, payload);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'فشل إضافة الرابط');
  }

  /** حذف مرفق من المهمة. */
  static async deleteTaskDocument(id: string, docId: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(`/tasks/${id}/documents/${docId}`);
    if (!response.success) throw new Error(response.message || 'فشل حذف المرفق');
  }

  /** رابط تنزيل آمن ومؤقّت لمرفق المهمة (يتحقق من الصلاحية على مستوى الملف). */
  static async getTaskDocumentUrl(id: string, docId: string): Promise<string> {
    const response = await apiClient.get<ApiResponse & { url?: string }>(`/tasks/${id}/documents/${docId}/url`);
    if (response.success && response.url) return response.url;
    throw new Error(response.message || 'تعذّر فتح المرفق');
  }
}
