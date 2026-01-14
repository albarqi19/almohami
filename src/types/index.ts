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
  // Subscription fields
  is_tenant_owner?: boolean;
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
}

export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  LAWYER: 'lawyer',
  SENIOR_LAWYER: 'senior_lawyer',
  LEGAL_ASSISTANT: 'legal_assistant',
  CLIENT: 'client',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

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
  // Najiz Integration
  najiz_id?: string;
  najiz_url?: string;
  najiz_data?: any;
  najiz_synced_at?: Date;
  najiz_status?: string;
  source?: string;
  // Case demands and proofs
  case_demands?: string;
  case_proofs?: string;
  // Billing data - البيانات المالية
  billing?: CaseBilling;
  contracts?: any[];
  case_invoices?: any[];
}

// Case Party - طرف القضية
export interface CaseParty {
  id: string;
  case_id: string;
  name: string;
  role: string;
  side: 'plaintiff' | 'defendant';
  national_id?: string;
  commercial_reg?: string;
  nationality?: string;
  phone?: string;
  email?: string;
}

// Case Session - جلسة القضية
export interface CaseSession {
  id: string;
  case_id: string;
  session_type?: string;
  session_date?: string;
  session_date_gregorian?: Date;
  session_time?: string;
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
  ACTIVE: 'active',
  PENDING: 'pending',
  CLOSED: 'closed',
  APPEALED: 'appealed',
  SETTLED: 'settled',
  DISMISSED: 'dismissed',
} as const;

export type CaseStatus = typeof CaseStatus[keyof typeof CaseStatus];

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
