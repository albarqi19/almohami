// User roles and permissions
export interface User {
  id: string;
  name: string;
  nationalId: string;
  email?: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  // Two-Factor Authentication
  two_factor_enabled?: boolean;
  // Subscription fields
  is_tenant_owner?: boolean;
  welcome_shown_at?: string | null;
  subscription_active?: boolean;
  is_trial?: boolean;
  trial_ends_at?: string | null;
  subscription_status?: {
    has_access: boolean;
    status: string;
    subscription_active: boolean;
    is_trial: boolean;
    trial_expired: boolean;
    trial_ends_at: string | null;
    requires_renewal: boolean;
  };
  // Phase 3 - Permission System
  is_super_admin?: boolean;
  permissions_version?: number;
}

export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OWNER: 'owner',
  PARTNER: 'partner',
  LAWYER: 'lawyer',
  SENIOR_LAWYER: 'senior_lawyer',
  LEGAL_ASSISTANT: 'legal_assistant',
  ACCOUNTANT: 'accountant',
  SECRETARY: 'secretary',
  CLIENT: 'client',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Phase 3 — Permissions API response
export interface MePermissionsResponse {
  permissions: string[]; // قائمة كأسماء "cases.view", "cases.edit"... أو ["*"] لـ super_admin
  roles: string[];
  is_super_admin: boolean;
  version: number;
}

/**
 * meta.permissions الذي يرجع مع كل Resource من الباك:
 * { canEdit: true, canDelete: false, canExport: true, ... }
 * الفرونت يقرأ منه بدلاً من حساب الصلاحية محليًا (يحترم record grants).
 */
export interface ResourcePermissionsMeta {
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  canShare?: boolean;
  canAssign?: boolean;
  canArchive?: boolean;
  [key: string]: boolean | undefined;
}

// Case Billing Data - البيانات المالية للقضية
export interface CaseBilling {
  total_contract_value: number;
  total_invoiced: number;
  total_paid: number;
  total_remaining: number;
  collection_percentage: number;
  invoices_count: number;
  invoices_by_status: {
    draft: number;
    pending: number;
    partial: number;
    paid: number;
    overdue: number;
  };
  overdue_amount: number;
  overdue_invoices_count: number;
  contracts_count: number;
  active_contracts_count: number;
  recent_payments: {
    id: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    invoice_number: string;
  }[];
}

// Case management
export interface Case {
  id: string;
  file_number: string;
  title: string;
  client_name: string;
  client_id: string;
  client_phone?: string;
  client_email?: string;
  plaintiff_name?: string;
  plaintiff_id?: string;
  opponent_name?: string;
  defendant_name?: string;
  defendant_id?: string;
  court?: string;
  department?: string;
  case_type: CaseType;
  case_type_arabic?: string;
  case_category?: string;
  status: CaseStatus;
  priority: Priority;
  assignedLawyers?: string[]; // للتوافق مع النسخة القديمة
  lawyers?: User[]; // البيانات الجديدة من الباك إند
  description?: string;
  case_subject?: string;
  plaintiff_requests?: string;
  case_evidence?: string;
  case_date_hijri?: string;
  created_at: Date;
  updated_at: Date;
  filing_date?: Date;
  due_date?: Date;
  next_hearing?: Date;
  next_hearing_time?: string;
  next_hearing_type?: string;
  hearing_method?: string;
  contract_value?: number;
  documents?: Document[];
  tasks?: Task[];
  activities?: Activity[];
  parties?: CaseParty[];
  sessions?: CaseSession[];
  judgements?: CaseJudgement[];
  // Najiz Integration
  najiz_id?: string;
  najiz_url?: string;
  najiz_data?: any;
  najiz_synced_at?: Date;
  najiz_status?: string;
  najiz_status_arabic?: string | null;
  source?: string;
  // Case demands and proofs
  case_demands?: string;
  case_proofs?: string;
  // Billing data - البيانات المالية
  billing?: CaseBilling;
  contracts?: any[];
  case_invoices?: any[];
  // مطبخ التجهيز
  prep_tasks?: CasePrepTask[];
  preparation_progress?: number;
  is_prep_mode?: boolean;
  status_arabic?: string;
  type_arabic?: string;
  priority_arabic?: string;
  // Outcome - نتيجة القضية + تحليل AI
  outcome?: 'won' | 'lost' | 'settled' | 'appealed' | 'dismissed' | null;
  outcome_confidence?: 'low' | 'medium' | 'high' | null;
  outcome_source?: 'manual' | 'ai' | null;
  outcome_appealed?: boolean;
  outcome_is_partial?: boolean;
  outcome_detected_at?: string | null;
  outcome_judgement_id?: number | null;
  outcome_summary?: string | null; // ملخص ذكي من AI للعرض في WinCelebrationModal
  outcome_celebrated_by_current_user?: boolean; // per-user flag
  ai_outcome_was_correct?: boolean | null;
  client_role?: 'plaintiff' | 'defendant' | 'third_party' | 'unknown';
}

// Case Party - طرف القضية
export interface CaseParty {
  id: string;
  case_id: string;
  name: string;
  role: string;
  side: 'plaintiff' | 'defendant' | 'lawyer' | 'agent' | 'appellant' | 'appellee' | 'other';
  national_id?: string;
  commercial_reg?: string;
  nationality?: string;
  party_type?: string;
  represents?: string;
  phone?: string;
  email?: string;
}

// Case Judgement - حكم القضية (من /judgments-for-portal)
export interface CaseJudgement {
  id: string;
  case_id: string;
  najiz_id?: number;
  judgement_code?: string;
  court_name?: string;
  circle_name?: string;
  sak_or_decision?: string;
  judgement_description?: string;
  judgement_type?: string; // "نهائي" | "غير نهائي"
  judgement_level_id?: number;
  subject?: string; // الوقائع
  pleading?: string; // المرافعة
  reasons?: string; // الأسباب
  text?: string; // المنطوق
  session_date?: string;
  sak_date?: string;
  delivery_date?: string;
  available_for_objection?: boolean;
  remaining_objection_days?: number;
  objection_due_date?: string;
  spid?: string;
}

// Case Session - جلسة القضية
export interface CaseSession {
  id: string;
  case_id: string;
  session_type?: string;
  session_date?: string;
  session_date_gregorian?: Date;
  session_date_hijri?: string; // التاريخ الهجري الخام من ناجز (للعرض فقط)
  session_time?: string;
  session_text?: string;
  session_judgement?: string;
  status: string;
  court?: string;
  department?: string;
  method?: string;
  degree?: string;
  notes?: string;
  result?: string;
  location?: string;
  video_conference_url?: string;
  is_video_conference?: boolean;
  source?: string;
  notify_client?: boolean;
}

export const CaseType = {
  CIVIL: 'civil',
  CRIMINAL: 'criminal',
  COMMERCIAL: 'commercial',
  FAMILY: 'family',
  LABOR: 'labor',
  ADMINISTRATIVE: 'administrative',
  REAL_ESTATE: 'real_estate',
  INTELLECTUAL_PROPERTY: 'intellectual_property',
  OTHER: 'other',
} as const;

export type CaseType = typeof CaseType[keyof typeof CaseType];

export const CaseStatus = {
  DRAFT: 'draft',
  PREPARATION: 'preparation',
  FILED: 'filed',
  ACTIVE: 'active',
  PENDING: 'pending',
  CLOSED: 'closed',
  APPEALED: 'appealed',
  SETTLED: 'settled',
  DISMISSED: 'dismissed',
} as const;

export type CaseStatus = typeof CaseStatus[keyof typeof CaseStatus];

export const PREP_STATUSES: CaseStatus[] = ['draft', 'preparation', 'filed'];

// مهام التجهيز
export interface CasePrepTask {
  id: number;
  case_id: number;
  tenant_id: number;
  title: string;
  is_completed: boolean;
  sort_order: number;
  completed_by?: number;
  completed_at?: string;
  completed_by_user?: { id: number; name: string };
  created_at?: string;
  updated_at?: string;
}

// Task Types
export const TaskType = {
  REVIEW: 'review',
  RESEARCH: 'research',
  CONSULTATION: 'consultation',
  COURT: 'court',
  DOCUMENT: 'document',
  MEETING: 'meeting',
  OTHER: 'other',
} as const;

export type TaskType = typeof TaskType[keyof typeof TaskType];

// Task management
export interface Task {
  id: string;
  title: string;
  description?: string;
  type?: TaskType;
  caseId?: string;
  assignedTo: string;
  assignedBy: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  documents: Document[];
  comments: Comment[];
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  notes?: string;
  sort_order?: number;
  subtasks?: Array<{
    id: string | number;
    title: string;
    description?: string | null;
    is_completed: boolean;
    order: number;
    assigned_to?: number | string | null;
    assignee?: { id: string | number; name: string } | null;
  }>;
  subtasks_total?: number;
  subtasks_completed?: number;
  comments_count?: number;
  assignee?: { id: string | number; name: string } | null;
  case?: { id: number | string; title: string; file_number?: string | null } | null;
}

export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  OVERDUE: 'overdue',
  ARCHIVED: 'archived',
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const Priority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type Priority = typeof Priority[keyof typeof Priority];

// Document management
export interface Document {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  category: DocumentCategory;
  case_id?: string;
  task_id?: string;
  uploaded_by: string;
  uploaded_at: string;
  is_confidential: boolean;
  version: number;
  tags: string[];
  // Cloud storage fields
  cloud_file_id?: string;
  cloud_provider?: 'onedrive' | 'google_drive';
  cloud_web_url?: string;
  // Nested relationships from API
  case?: Case;
  task?: Task;
  uploader?: User;  // Changed from uploaded_by_user to uploader
  // Legacy compatibility fields
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  caseId?: string;
  taskId?: string;
  uploadedBy?: string;
  uploadedAt?: Date;
  isConfidential?: boolean;
  // For UI purposes
  url?: string;
  relatedCaseId?: string;
  relatedTaskId?: string;
}

export const DocumentCategory = {
  CONTRACT: 'contract',
  EVIDENCE: 'evidence',
  PLEADING: 'pleading',
  CORRESPONDENCE: 'correspondence',
  REPORT: 'report',
  JUDGMENT: 'judgment',
  OTHER: 'other',
} as const;

export type DocumentCategory = typeof DocumentCategory[keyof typeof DocumentCategory];

// Activity and timeline
export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  caseId?: string;
  taskId?: string;
  performedBy: string;
  performedAt: Date;
  metadata?: Record<string, any>;
}

export const ActivityType = {
  CASE_CREATED: 'case_created',
  CASE_UPDATED: 'case_updated',
  TASK_CREATED: 'task_created',
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
  TASK_COMPLETED: 'task_completed',
  DOCUMENT_UPLOADED: 'document_uploaded',
  COMMENT_ADDED: 'comment_added',
  HEARING_SCHEDULED: 'hearing_scheduled',
  STATUS_CHANGED: 'status_changed',
  USER_ASSIGNED: 'user_assigned',
  CLIENT_MEETING: 'client_meeting',
  MESSAGE_SENT: 'message_sent',
} as const;

export type ActivityType = typeof ActivityType[keyof typeof ActivityType];

// Comments and communication
export interface Comment {
  id: string;
  content: string;
  authorId: string;
  caseId?: string;
  taskId?: string;
  createdAt: Date;
  updatedAt?: Date;
  isInternal: boolean;
  attachments: Document[];
}

// Task Comments
export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  comment: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskCommentForm {
  comment: string;
  mentions?: string[];
}

// Notifications
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  userId: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export const NotificationType = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_DUE: 'task_due',
  CASE_UPDATE: 'case_update',
  DOCUMENT_SHARED: 'document_shared',
  HEARING_REMINDER: 'hearing_reminder',
  SYSTEM: 'system',
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

// Reports and analytics
export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  totalTasks: number;
  overdueTasks: number;
  completedTasksThisMonth: number;
  upcomingHearings: number;
  userPerformance: UserPerformanceStats[];
}

export interface UserPerformanceStats {
  userId: string;
  userName: string;
  completedTasks: number;
  overdueTasks: number;
  averageCompletionTime: number;
  caseLoad: number;
}

// Settings and preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'ar' | 'en';
  notifications: {
    email: boolean;
    push: boolean;
    taskReminders: boolean;
    hearingReminders: boolean;
  };
  dashboard: {
    defaultView: string;
    widgets: string[];
  };
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form types
export interface CreateCaseForm {
  title: string;
  clientName: string;
  clientId: string;
  opponentName?: string;
  court?: string;
  caseType: CaseType;
  priority: Priority;
  assignedLawyers: string[];
  description?: string;
  dueDate?: Date;
  nextHearing?: Date;
  estimatedValue?: number;
}

export interface CreateTaskForm {
  title: string;
  description?: string;
  type?: string;
  caseId?: string;
  assignedTo?: string;
  priority: Priority;
  dueDate?: Date;
  estimatedHours?: number;
}

export interface LoginForm {
  nationalId: string;
  pin: string;
  rememberMe?: boolean;
}

// Appointment types
export interface Appointment {
  id: string;
  case_id: string;
  title: string;
  description?: string;
  type: AppointmentType;
  scheduled_at: Date;
  duration_minutes: number;
  location?: string;
  attendees?: string[];
  status: AppointmentStatus;
  priority: Priority;
  notes?: string;
  reminders?: string[];
  reminder_sent_at?: Date;
  outcome?: string;
  documents?: string[];
  created_by: string;
  assigned_to?: string;
  rescheduled_from?: Date;
  cancellation_reason?: string;
  created_at: Date;
  updated_at: Date;
  creator?: User;
  assignee?: User;
  case?: Case;
}

export type AppointmentType =
  | 'court_hearing'     // جلسة محكمة
  | 'client_meeting'    // موعد عميل
  | 'team_meeting'      // اجتماع فريق
  | 'document_filing'   // تقديم وثائق
  | 'arbitration'       // تحكيم
  | 'consultation'      // استشارة
  | 'mediation'         // وساطة
  | 'settlement'        // صلح
  | 'other';            // أخرى

export type AppointmentStatus =
  | 'scheduled'    // مجدول
  | 'confirmed'    // مؤكد
  | 'in_progress'  // قيد التنفيذ
  | 'completed'    // مكتمل
  | 'cancelled'    // ملغي
  | 'postponed'    // مؤجل
  | 'no_show';     // لم يحضر

export interface CreateAppointmentForm {
  case_id: string;
  title: string;
  description?: string;
  type: AppointmentType;
  scheduled_at: string;
  duration_minutes?: number;
  location?: string;
  attendees?: string[];
  priority?: Priority;
  notes?: string;
  reminders?: string[];
  assigned_to?: string;
}

// ==================== Wekala Types ====================

// حالة الوكالة
export const WekalaStatus = {
  APPROVED: 'معتمدة',
  EXPIRED: 'منتهية',
  CANCELLED: 'مفسوخة',
  PENDING: 'قيد الاعتماد',
  SUSPENDED: 'موقوفة',
} as const;

export type WekalaStatus = typeof WekalaStatus[keyof typeof WekalaStatus];

// نوع الطرف في الوكالة
export type WekalaPartyType = 'agent' | 'client';

// طرف الوكالة (موكل أو وكيل)
export interface WekalaParty {
  id: number;
  wekala_id: number;
  name: string;
  id_number?: string;
  adjective?: string;
  party_type: WekalaPartyType;
  representation_text?: string;
  created_at: string;
  updated_at: string;
}

// صلاحية الوكالة
export interface WekalaPermission {
  id: number;
  wekala_id: number;
  category: string;
  clauses?: string[];
  grouped_text?: string;
  created_at: string;
  updated_at: string;
}

// الوكالة الرئيسية
export interface Wekala {
  id: number;
  number: string;
  wekala_id?: string;
  type?: string;
  status: string;
  agency_text?: string;
  issue_date?: string;
  issue_date_hijri?: string;
  expiry_date?: string;
  expiry_date_hijri?: string;
  issue_location?: string;
  is_valid?: boolean;
  is_electronic?: boolean;
  source?: string;
  raw_data?: any;
  najiz_synced_at?: string;
  created_at: string;
  updated_at: string;
  // العلاقات
  agents?: WekalaParty[];
  clients?: WekalaParty[];
  permissions?: WekalaPermission[];
}

// فلترة الوكالات
export interface WekalaFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ==================== Execution Request Types ====================

export interface ExecutionRequestParty {
  name: string;
  role: string;
  id_number?: string | null;
  nationality?: string | null;
}

export interface ExecutionRequest {
  id: number;
  tenant_id: number;
  request_number: string;
  request_id?: string | null;
  request_code?: string | null;
  party_role?: string | null;
  party_role_id?: number | null;
  main_document_type?: string | null;
  sub_document_type?: string | null;
  document_type_id?: number | null;
  court?: string | null;
  department?: string | null;
  filing_date_hijri?: string | null;
  filing_date_gregorian?: string | null;
  status: string;
  status_id?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  remaining_amount?: number | null;
  currency?: string;
  case_id?: number | null;
  parties?: ExecutionRequestParty[] | null;
  decisions?: any[] | null;
  steps?: any[] | null;
  attorneys?: any[] | null;
  financial_amounts?: any[] | null;
  attachments?: any[] | null;
  source?: string;
  najiz_synced_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionRequestFilters {
  status?: string;
  party_role_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ExecutionRequestStats {
  total: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  by_status: { status: string; count: number; total: number }[];
  by_party_role: { party_role: string; count: number }[];
  by_court: { court: string; count: number; remaining_total: number }[];
}

// ==================== Two-Factor Authentication Types ====================

// استجابة إعداد المصادقة الثنائية
export interface TwoFactorSetupResponse {
  secret: string;
  qr_code: string; // base64 data URI
}

// استجابة تأكيد المصادقة الثنائية
export interface TwoFactorConfirmResponse {
  recovery_codes: string[];
}

// استجابة حالة المصادقة الثنائية
export interface TwoFactorStatusResponse {
  two_factor_enabled: boolean;
  two_factor_confirmed_at: string | null;
}

// استجابة تسجيل الدخول مع 2FA
export interface LoginWith2FAResponse {
  requires_2fa: boolean;
  temp_token?: string;
  user?: User;
  token?: string;
}

// استجابة التحقق من 2FA
export interface Verify2FAResponse {
  user: User;
  token: string;
  tenant?: any;
  is_trial?: boolean;
  trial_ends_at?: string | null;
  trial_days_remaining?: number | null;
  subscription_active?: boolean;
  subscription_status?: {
    has_access: boolean;
    status: string;
    subscription_active: boolean;
    is_trial: boolean;
    trial_expired: boolean;
    trial_ends_at: string | null;
    requires_renewal: boolean;
  };
}
