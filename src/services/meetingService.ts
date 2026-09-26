import { apiClient } from '../utils/api';

// ==========================================
// Types - أنواع البيانات
// ==========================================

/**
 * مفاتيح مزوّدي الرابط — مرآة لـVideoLinkService::storableKeys() بالخادم.
 *
 * ⚠️ كان الاتحاد هنا `'manual' | 'zoom' | 'google_meet' | 'teams'` بلا jitsi،
 * وهو النوع نفسه الذي انحرف في تحقّق الخادم فرفض رابطاً ولّده الخادم نفسه.
 * `google_meet` و`teams` مُبقاتان لأن صفوفاً قديمة تحملهما (العمود كان ENUM).
 */
export type VideoProviderKey = 'manual' | 'jitsi' | 'zoom' | 'google_meet' | 'teams';

export interface InternalMeeting {
  id: number;
  tenant_id: number;
  title: string;
  agenda: string | null;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  location: string | null;
  video_meeting_url: string | null;
  video_provider: VideoProviderKey | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  join_button_minutes_before: number;
  join_button_minutes_after: number;
  summary_permission: 'creator_only' | 'all_attendees';
  summary: string | null;
  summary_points: string[] | null;
  summary_decisions: string[] | null;
  summary_tasks: SummaryTask[] | null;
  created_by: number;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  creator?: User;
  participants?: MeetingParticipant[];

  // ── العقد الموسَّع ─────────────────────────────────────────────
  meeting_category_id?: number | null;
  category?: MeetingCategoryRef | null;
  attendees?: MeetingAttendee[];
  /** internal | client | external — مشتقّ من أنواع الحاضرين */
  audience?: 'internal' | 'client' | 'external';
  linked_type?: LinkTargetType | null;
  linked_id?: number | null;
  linked?: LinkedSummary | null;
  /** حالة الزر الذكي داخل الحمولة — تُغني عن طلب مستقل لكل اجتماع */
  smart_button?: SmartButtonState;
  scheduled_at_hijri?: string | null;
  can?: {
    update: boolean;
    delete: boolean;
    manage_state: boolean;
    write_summary: boolean;
  };
}

export type MeetingColor = 'navy' | 'gold' | 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'gray';

export interface MeetingCategoryRef {
  id: number;
  name: string;
  color: MeetingColor;
  system_code: string | null;
}

export interface MeetingCategory extends MeetingCategoryRef {
  is_active: boolean;
  position: number;
  meetings_count?: number;
}

/** مزوّد رابط اجتماع متاح على هذا الخادم — المفتاح يُخزَّن في video_provider */
export interface VideoProviderOption {
  key: string;
  label: string;
}

export type AttendeeType = 'user' | 'client' | 'external';

export interface MeetingAttendee {
  id: number;
  meeting_id: number;
  user_id: number | null;
  attendee_type: AttendeeType;
  status: 'pending' | 'accepted' | 'declined';
  joined_at: string | null;
  left_at: string | null;
  display_name: string | null;
  user?: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  /** ‏موافقةُ الطرف الخارجي على تنبيه واتساب — تصل في القوائم أيضاً */
  notify_opted_in?: boolean;
  /** لا يصل في القوائم — فقط في صفحة الاجتماع الواحد ولمن يملك تعديله */
  email?: string | null;
  phone?: string | null;
}

export type LinkTargetType = 'case' | 'legal_service' | 'task';

export interface LinkedSummary {
  type: LinkTargetType;
  type_label: string;
  id: number;
  title: string;
  reference: string | null;
}

export interface SummaryTask {
  title: string;
  assignee_id?: number;
  assignee_name?: string;
  due_date?: string;
}

export interface MeetingParticipant {
  id: number;
  meeting_id: number;
  user_id: number;
  status: 'pending' | 'accepted' | 'declined';
  joined_at: string | null;
  left_at: string | null;
  user?: User;
}

export interface ClientMeeting {
  id: number;
  tenant_id: number;
  lawyer_id: number;
  client_id: number | null;
  case_id: number | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  /** قابل للفراغ فعلاً — الموعد المنشأ مباشرةً بلا عنوان يُحفظ null */
  title: string | null;
  notes: string | null;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  meeting_type: 'in_person' | 'remote';
  location: string | null;
  video_meeting_url: string | null;
  video_provider: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled_by_client' | 'cancelled_by_lawyer' | 'no_show';
  confirmed_at: string | null;
  reminder_sent_at: string | null;
  outcome: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  lawyer?: User;
  client?: User;
  case?: CaseInfo;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar?: string;
}

export interface CaseInfo {
  id: number;
  title: string;
  file_number: string;
}

export interface SmartButtonState {
  status: 'upcoming' | 'join' | 'write_summary' | 'view_summary' | 'cancelled' | 'unknown';
  label: string;
  disabled: boolean;
  sublabel?: string;
  color?: string;
  action?: string | null;
  url?: string;
  countdown?: number;
}

// ==========================================
// Create/Update Data Types
// ==========================================

export interface CreateInternalMeetingData {
  title: string;
  agenda?: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone?: string;
  location?: string | null;
  video_meeting_url?: string | null;
  video_provider?: string | null;
  join_button_minutes_before?: number;
  join_button_minutes_after?: number;
  summary_permission?: 'creator_only' | 'all_attendees';
  /** الشكل القديم — أصحاب الحسابات فقط. يُقبل توافقاً. */
  participants?: number[];
  /** الشكل العام: موظف أو عميل أو طرف خارجي */
  attendees?: AttendeeInput[];
  meeting_category_id?: number | null;
  linked_type?: LinkTargetType | null;
  linked_id?: number | null;
}

export interface AttendeeInput {
  /**
   * ‏معرّف صفّ الحضور القائم — يُعاد كما استُلم عند التعديل فيُطابَق الشخص به.
   * ‏القائمة لا تُرجع بريد الضيف الخارجي ولا جواله (خصوصية)، فبدون المعرّف يُحسب
   * ‏الشخص من اسمه فيُعامَل جديداً ويُحذف صفّه ببريده وجواله وردّه.
   */
  id?: number | null;
  type: AttendeeType;
  user_id?: number | null;
  /** إلزامي للطرف الخارجي وحده */
  name?: string;
  email?: string | null;
  phone?: string | null;
  /** موافقة صريحة على تنبيه واتساب — مطفأة افتراضياً */
  notify_opted_in?: boolean;
}

export interface UpdateInternalMeetingData {
  title?: string;
  agenda?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  location?: string | null;
  video_meeting_url?: string | null;
  video_provider?: string | null;
  join_button_minutes_before?: number;
  join_button_minutes_after?: number;
  summary_permission?: 'creator_only' | 'all_attendees';
  participants?: number[];
  attendees?: AttendeeInput[];
  meeting_category_id?: number | null;
  linked_type?: LinkTargetType | null;
  linked_id?: number | null;
}

export interface SaveSummaryData {
  summary?: string | null;
  summary_points?: string[];
  summary_decisions?: string[];
  summary_tasks?: SummaryTask[];
}

export interface CreateClientMeetingData {
  lawyer_id?: number;
  client_id?: number;
  case_id?: number;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  title?: string;
  notes?: string;
  /** «YYYY-MM-DD HH:mm:ss» ساعة حائط بتوقيت الرياض — بلا لاحقة Z */
  scheduled_at: string;
  duration_minutes: number;
  timezone?: string;
  meeting_type: 'in_person' | 'remote';
  location?: string;
  video_meeting_url?: string;
}

/**
 * تعديل موعد عميل — يُرسل **المتغيّر وحده**: الخادم يرفض وقتاً ماضياً، فإعادة
 * إرسال وقتٍ لم يتغيّر كانت ستمنع تعديل ملاحظات موعدٍ بدأ.
 */
export interface UpdateClientMeetingData {
  title?: string | null;
  notes?: string | null;
  scheduled_at?: string;
  duration_minutes?: number;
  meeting_type?: 'in_person' | 'remote';
  location?: string | null;
  video_meeting_url?: string | null;
}

/** مرشّحات قائمة مواعيد العملاء — التاريخان «YYYY-MM-DD» بتوقيت الرياض */
export interface ClientMeetingQuery {
  status?: string;
  lawyer_id?: number;
  from_date?: string;
  to_date?: string;
}

/** صفحةٌ كما يرجعها paginate() في Laravel */
interface LaravelPage<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

// جمعُ الصفحات بسقف أمان: 100 × 50 = 5000 موعد في النافذة — فوق أي مكتبٍ رأيناه،
// ويمنع حلقةً بلا نهاية إن عاد last_page خاطئاً.
const CLIENT_MEETINGS_PAGE_SIZE = 100;
const CLIENT_MEETINGS_MAX_PAGES = 50;

// ==========================================
// Internal Meeting Service
// ==========================================

export const internalMeetingService = {
  /**
   * جلب الاجتماعات.
   *
   * ⚠️ أسماء الفلاتر: الخادم يقرأ from_date/to_date. كانت هذه الدالة ترسل
   * from/to فتُهمَل بصمت — والصفحة تعرض «كل الاجتماعات» ظانّةً أنها مصفّاة.
   * (الخادم صار يقبل الاسمين توافقاً، ونرسل الاسم الصحيح.)
   *
   * وper_page صريح: الافتراضي 15 صفاً، والمجموعات الزمنية والمؤشرات تُحسب
   * على ما يصل — فمكتب نشط كان لا يرى مجموعة «اليوم» أصلاً.
   */
  async getAll(params?: {
    status?: string;
    from?: string;
    to?: string;
    meeting_category_id?: number;
    linked_type?: string;
    linked_id?: number;
    per_page?: number;
  }): Promise<InternalMeeting[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('per_page', String(params?.per_page ?? 100));
    if (params?.status) queryParams.append('status', params.status);
    if (params?.from) queryParams.append('from_date', params.from);
    if (params?.to) queryParams.append('to_date', params.to);
    if (params?.meeting_category_id) queryParams.append('meeting_category_id', String(params.meeting_category_id));
    if (params?.linked_type && params?.linked_id) {
      queryParams.append('linked_type', params.linked_type);
      queryParams.append('linked_id', String(params.linked_id));
    }

    const response = await apiClient.get<{ success: boolean; data: { data: InternalMeeting[] } | InternalMeeting[] }>(
      `/meetings/internal?${queryParams.toString()}`
    );

    // مغلّف الترقيم { data: { data: [...] } } أو مصفوفة مباشرة
    if (response.data && 'data' in response.data && Array.isArray((response.data as any).data)) {
      return (response.data as any).data || [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  /** نطاق التقويم — بلا ترقيم، ويغطّي شبكة 42 خلية لا الشهر وحده. */
  async getCalendar(month: string): Promise<InternalMeeting[]> {
    const response = await apiClient.get<{ success: boolean; data: InternalMeeting[] }>(
      `/meetings/internal/calendar?month=${encodeURIComponent(month)}`
    );
    return response.data || [];
  },

  // جلب الاجتماعات القادمة
  async getUpcoming(limit: number = 10): Promise<InternalMeeting[]> {
    const response = await apiClient.get<{ success: boolean; data: InternalMeeting[] }>(
      `/meetings/internal/upcoming?limit=${limit}`
    );
    return response.data || [];
  },

  // جلب اجتماع واحد
  async getById(id: number): Promise<InternalMeeting> {
    const response = await apiClient.get<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}`
    );
    return response.data;
  },

  // إنشاء اجتماع جديد
  async create(data: CreateInternalMeetingData): Promise<InternalMeeting> {
    const response = await apiClient.post<{ success: boolean; data: InternalMeeting }>(
      '/meetings/internal',
      data
    );
    return response.data;
  },

  // تحديث اجتماع
  async update(id: number, data: UpdateInternalMeetingData): Promise<InternalMeeting> {
    const response = await apiClient.put<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}`,
      data
    );
    return response.data;
  },

  // حذف اجتماع
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/meetings/internal/${id}`);
  },

  // إلغاء اجتماع
  async cancel(id: number, reason: string): Promise<InternalMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}/cancel`,
      { reason }
    );
    return response.data;
  },

  // بدء اجتماع
  async start(id: number): Promise<InternalMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}/start`
    );
    return response.data;
  },

  // إنهاء اجتماع
  async complete(id: number): Promise<InternalMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}/complete`
    );
    return response.data;
  },

  // حفظ الملخص
  async saveSummary(id: number, data: SaveSummaryData): Promise<InternalMeeting> {
    // الخادم يتحقق بالأسماء المجرّدة (points/decisions/tasks). كانت الحمولة تُرسل
    // بأسماء الأعمدة summary_* فيُسقطها التحقق كلها ويُحفظ الملخص فارغاً بردّ 200 —
    // «حفظتُ الملاحظات ولم تُحفظ». المفتاح غير المعرَّف لا يُرسل (= لم يُلمس).
    const payload: Record<string, unknown> = {};
    if (data.summary !== undefined) payload.summary = data.summary;
    if (data.summary_points !== undefined) payload.points = data.summary_points;
    if (data.summary_decisions !== undefined) payload.decisions = data.summary_decisions;
    if (data.summary_tasks !== undefined) {
      payload.tasks = data.summary_tasks.map((t) => ({
        title: t.title,
        assignee_id: t.assignee_id ?? null,
        due_date: t.due_date || null,
      }));
    }

    const response = await apiClient.post<{ success: boolean; data: InternalMeeting }>(
      `/meetings/internal/${id}/summary`,
      payload
    );
    return response.data;
  },

  // جلب حالة الزر الذكي
  async getButtonState(id: number): Promise<SmartButtonState> {
    const response = await apiClient.get<{ success: boolean; data: SmartButtonState }>(
      `/meetings/internal/${id}/button-state`
    );
    return response.data;
  },

  // جلب الإحصائيات
  async getStats(): Promise<{
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    this_week: number;
  }> {
    const response = await apiClient.get<{ success: boolean; data: any }>('/meetings/internal/stats');
    return response.data;
  },

  /**
   * المزوّدون المتاحون **فعلاً على هذا الخادم** — لا قائمة ثابتة بالواجهة.
   *
   * زوم مثلاً لا يظهر حتى تصل بيانات اعتماده: خيارٌ يفشل عند الضغط أسوأ من
   * خيار غير معروض.
   */
  async getVideoProviders(): Promise<VideoProviderOption[]> {
    const response = await apiClient.get<{ success: boolean; data: VideoProviderOption[] }>(
      '/meetings/internal/video/providers'
    );
    return response.data || [];
  },

  /**
   * يولّد رابطاً **قبل حفظ الاجتماع** — نموذج الإنشاء لا يملك معرّفاً بعد.
   *
   * الرابط يعود إلى الحقل ثم يُحفظ مع الاجتماع في طلب واحد، فلا تبقى نافذة
   * يكون فيها اجتماعٌ «عن بُعد» بلا رابط.
   */
  async draftVideoLink(provider: string): Promise<{ url: string; provider: string; notice?: string }> {
    const response = await apiClient.post<{
      success: boolean;
      notice?: string;
      data: { url: string; provider: string };
    }>('/meetings/internal/video/draft', { provider });

    return { ...response.data, notice: response.notice };
  },
};

// ==========================================
// Client Meeting Service
// ==========================================

export const clientMeetingService = {
  /**
   * مواعيد العملاء في النافذة المطلوبة — **كل الصفحات**.
   *
   * الخادم يقسّم بـpaginate (15 افتراضياً) وكانت الصفحة الأولى وحدها تُقرأ: أبعد
   * 15 موعداً فقط، فتختفي مواعيد اليوم في مكتبٍ نشط، ويكذب العدّاد والتقويم
   * والتصدير. وكان المرشّحان يُرسلان باسمَي from/to والخادم يقرأ from_date/to_date.
   */
  async getAll(params: ClientMeetingQuery = {}): Promise<ClientMeeting[]> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.lawyer_id) query.append('lawyer_id', String(params.lawyer_id));
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);
    query.append('per_page', String(CLIENT_MEETINGS_PAGE_SIZE));

    const all: ClientMeeting[] = [];
    for (let page = 1; page <= CLIENT_MEETINGS_MAX_PAGES; page++) {
      query.set('page', String(page));
      const response = await apiClient.get<{ success: boolean; data: LaravelPage<ClientMeeting> | ClientMeeting[] }>(
        `/meetings/client?${query.toString()}`
      );
      const payload = response.data;

      // استجابة غير مقسّمة — تأتي كاملةً في طلبٍ واحد
      if (Array.isArray(payload)) return payload;

      all.push(...(payload?.data ?? []));
      if (!payload || page >= (payload.last_page ?? 1)) break;
    }
    return all;
  },

  // جلب الاجتماعات القادمة
  async getUpcoming(limit: number = 10): Promise<ClientMeeting[]> {
    const response = await apiClient.get<{ success: boolean; data: ClientMeeting[] }>(
      `/meetings/client/upcoming?limit=${limit}`
    );
    return response.data || [];
  },

  // جلب اجتماع واحد
  async getById(id: number): Promise<ClientMeeting> {
    const response = await apiClient.get<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}`
    );
    return response.data;
  },

  // إنشاء اجتماع جديد
  async create(data: CreateClientMeetingData): Promise<ClientMeeting> {
    const response = await apiClient.post<{ success: boolean; data: ClientMeeting }>(
      '/meetings/client',
      data
    );
    return response.data;
  },

  // تحديث اجتماع — العميل المؤكَّد موعده يُبلَّغ بما يعنيه (الوقت، النوع، المكان، الرابط)
  async update(id: number, data: UpdateClientMeetingData): Promise<ClientMeeting> {
    const response = await apiClient.put<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}`,
      data
    );
    return response.data;
  },

  // اعتماد طلب موعد قادم من بوابة العميل (pending ⇒ confirmed + رسالة التأكيد للعميل).
  // videoMeetingUrl: رابط موعدٍ «عن بُعد» يُحفظ مع الاعتماد فتحمله رسالة التأكيد.
  async confirm(id: number, videoMeetingUrl?: string): Promise<ClientMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}/confirm`,
      videoMeetingUrl ? { video_meeting_url: videoMeetingUrl } : {}
    );
    return response.data;
  },

  // إلغاء اجتماع
  async cancel(id: number, reason: string): Promise<ClientMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}/cancel`,
      { reason }
    );
    return response.data;
  },

  // إكمال اجتماع
  async complete(id: number, outcome?: string): Promise<ClientMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}/complete`,
      { outcome }
    );
    return response.data;
  },

  // تسجيل عدم الحضور
  async markNoShow(id: number): Promise<ClientMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}/no-show`
    );
    return response.data;
  },

  // ربط بقضية — null يفكّ الربط
  async linkToCase(id: number, caseId: number | null): Promise<ClientMeeting> {
    const response = await apiClient.patch<{ success: boolean; data: ClientMeeting }>(
      `/meetings/client/${id}/link-case`,
      { case_id: caseId }
    );
    return response.data;
  },
};
