import { apiClient } from '../utils/api';

/**
 * «بوابة المنشأة» — عميل API للطرفين:
 *  - واجهة العميل:   /client/establishment (عرض + تنزيل + تفضيلات تنبيهات)
 *  - إدارة المكتب:  /client-management/{clientId}/establishment (موظفون/مواعيد/إعدادات/أعلام مستندات)
 * كلاهما خلف بوابة establishment_portal_enabled (الباك يفرضها).
 */

export type ExpiryStatus = 'none' | 'valid' | 'soon' | 'critical' | 'expired';
export type AlertSeverity = 'expired' | 'danger' | 'warn' | 'info';

export interface EstablishmentCard {
  name: string;
  entity_type: string | null;
  commercial_registration: string | null;
  vat_number: string | null;
  national_address: string | null;
  industry: string | null;
  legal_representative: string | null;
  phone: string | null;
  email: string | null;
  relationship_manager: string | null;
}

export interface EstablishmentStats {
  documents_total: number;
  documents_expiring: number;
  documents_expired: number;
  employees_total: number;
  employee_ids_expiring: number;
  employees_insured: number;
  insurance_expiring: number;
  dates_upcoming: number;
  dates_overdue: number;
}

export interface EstablishmentDocument {
  id: number;
  doc_type: string;
  title: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  days_remaining: number | null;
  expiry_status: ExpiryStatus;
  file_name: string;
  file_size: number;
  is_sensitive: boolean;
  visible_to_client: boolean;
  alerts_enabled: boolean;
  created_at: string | null;
}

export interface EstablishmentEmployee {
  id: number;
  name: string;
  job_title: string | null;
  nationality: string | null;
  national_id: string | null;
  id_expiry_date: string | null;
  id_days_remaining: number | null;
  id_status: ExpiryStatus;
  has_medical_insurance: boolean;
  insurance_expiry_date: string | null;
  insurance_days_remaining: number | null;
  insurance_status: ExpiryStatus;
  notes: string | null;
  alerts_enabled: boolean;
}

export interface EstablishmentDate {
  id: number;
  title: string;
  category: string;
  reference_number: string | null;
  due_date: string | null;
  days_remaining: number | null;
  status: ExpiryStatus;
  notes: string | null;
  alerts_enabled: boolean;
}

export interface UpcomingAlert {
  kind: 'document' | 'employee_id' | 'employee_insurance' | 'date';
  ref_id: number;
  title: string;
  subtitle: string;
  date: string | null;
  days_remaining: number;
  severity: AlertSeverity;
}

export interface PortalSettings {
  portal_enabled?: boolean;
  alerts_enabled: boolean;
  alert_days: number[];
  notify_documents: boolean;
  notify_employees: boolean;
  notify_office?: boolean;
}

export interface EstablishmentOverview {
  establishment: EstablishmentCard;
  stats: EstablishmentStats;
  upcoming_alerts: UpcomingAlert[];
  documents: EstablishmentDocument[];
  employees: EstablishmentEmployee[];
  dates: EstablishmentDate[];
  settings: PortalSettings;
}

export interface EmployeePayload {
  name: string;
  job_title?: string | null;
  nationality?: string | null;
  national_id?: string | null;
  id_expiry_date?: string | null;
  has_medical_insurance?: boolean;
  insurance_expiry_date?: string | null;
  notes?: string | null;
  alerts_enabled?: boolean;
}

export interface DatePayload {
  title: string;
  category?: string;
  reference_number?: string | null;
  due_date: string;
  notes?: string | null;
  alerts_enabled?: boolean;
}

const unwrap = <T>(res: { success: boolean; data?: T; message?: string }): T => {
  if (!res.success || res.data === undefined) {
    throw new Error(res.message || 'تعذّر تنفيذ الطلب');
  }
  return res.data;
};

// ─────────────────────────── واجهة العميل ───────────────────────────

export const ClientEstablishmentService = {
  async getOverview(): Promise<EstablishmentOverview> {
    return unwrap(await apiClient.get<any>('/client/establishment'));
  },

  /** يرجع رابط تنزيل مؤقتاً (OneDrive) يُفتح مباشرة. */
  async getDownloadUrl(documentId: number): Promise<string> {
    const data = unwrap<{ url: string }>(await apiClient.get<any>(`/client/establishment/documents/${documentId}/download`));
    return data.url;
  },

  async updateAlertPreferences(prefs: Partial<PortalSettings>): Promise<PortalSettings> {
    return unwrap(await apiClient.put<any>('/client/establishment/alert-preferences', prefs));
  },
};

// ─────────────────────────── إدارة المكتب ───────────────────────────

export const EstablishmentAdminService = {
  async getOverview(clientId: number): Promise<EstablishmentOverview> {
    return unwrap(await apiClient.get<any>(`/client-management/${clientId}/establishment`));
  },

  async updateSettings(clientId: number, settings: Partial<PortalSettings>): Promise<void> {
    unwrap(await apiClient.put<any>(`/client-management/${clientId}/establishment/settings`, settings));
  },

  async createEmployee(clientId: number, payload: EmployeePayload): Promise<void> {
    unwrap(await apiClient.post<any>(`/client-management/${clientId}/establishment/employees`, payload));
  },

  async updateEmployee(clientId: number, employeeId: number, payload: EmployeePayload): Promise<void> {
    unwrap(await apiClient.put<any>(`/client-management/${clientId}/establishment/employees/${employeeId}`, payload));
  },

  async deleteEmployee(clientId: number, employeeId: number): Promise<void> {
    await apiClient.delete<any>(`/client-management/${clientId}/establishment/employees/${employeeId}`);
  },

  async createDate(clientId: number, payload: DatePayload): Promise<void> {
    unwrap(await apiClient.post<any>(`/client-management/${clientId}/establishment/dates`, payload));
  },

  async updateDate(clientId: number, dateId: number, payload: DatePayload): Promise<void> {
    unwrap(await apiClient.put<any>(`/client-management/${clientId}/establishment/dates/${dateId}`, payload));
  },

  async deleteDate(clientId: number, dateId: number): Promise<void> {
    await apiClient.delete<any>(`/client-management/${clientId}/establishment/dates/${dateId}`);
  },

  async updateDocumentFlags(clientId: number, documentId: number, flags: { visible_to_client?: boolean; alerts_enabled?: boolean }): Promise<void> {
    unwrap(await apiClient.patch<any>(`/client-management/${clientId}/establishment/documents/${documentId}/portal-flags`, flags));
  },
};

// ─────────────────────────── أدوات عرض مشتركة ───────────────────────────

export const DOC_TYPE_LABELS: Record<string, string> = {
  national_id: 'الهوية الوطنية',
  commercial_registration: 'السجل التجاري',
  contract: 'عقد',
  power_of_attorney: 'وكالة/توكيل',
  other: 'مستند',
};

export const DATE_CATEGORY_LABELS: Record<string, string> = {
  license: 'رخصة',
  subscription: 'اشتراك',
  appointment: 'موعد',
  renewal: 'تجديد',
  other: 'أخرى',
};

/** صياغة عربية للمتبقي: منتهٍ منذ X / ينتهي اليوم / بعد X يوم. */
export const remainingLabel = (days: number | null): string => {
  if (days === null) return '—';
  if (days < 0) {
    const d = Math.abs(days);
    if (d === 1) return 'منتهٍ منذ يوم';
    if (d === 2) return 'منتهٍ منذ يومين';
    return d <= 10 ? `منتهٍ منذ ${d} أيام` : `منتهٍ منذ ${d} يوماً`;
  }
  if (days === 0) return 'ينتهي اليوم';
  if (days === 1) return 'غداً';
  if (days === 2) return 'بعد يومين';
  return days <= 10 ? `بعد ${days} أيام` : `بعد ${days} يوماً`;
};

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} ب`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
};
