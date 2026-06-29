// أنواع وحدة الموارد البشرية (المرحلة 1). تطابق استجابة الباك (snake_case).

export type SbaStatus =
  | 'pending'
  | 'verified_same_firm'
  | 'verified_other_firm'
  | 'expired'
  | 'not_found'
  | 'needs_national_id'
  | 'unavailable';

export type EmploymentType = 'full_time' | 'part_time' | 'contractor' | 'intern';
export type EmployeeStatus = 'active' | 'on_leave' | 'suspended' | 'terminated';

export interface EmployeeUserRef {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
  avatar?: string | null;
  is_active?: boolean;
  national_id?: string | null;
  created_at?: string;
}

export interface EmployeeCompensation {
  id?: number;
  basic_salary?: string | number | null;
  housing_allowance?: string | number | null;
  transport_allowance?: string | number | null;
  other_allowances?: string | number | null;
  total_salary?: string | number | null;
  currency?: string;
  pay_frequency?: string;
  iban?: string | null;
  bank_name?: string | null;
  account_holder_name?: string | null;
  gosi_number?: string | null;
  change_reason?: string | null;
  effective_from?: string | null;
}

export interface EmployeeDocument {
  id: number;
  doc_type: string;
  title: string;
  document_number?: string | null;
  issue_date_gregorian?: string | null;
  expiry_date_gregorian?: string | null;
  expiry_date_hijri_raw?: string | null;
  file_name?: string;
  is_sensitive?: boolean;
  is_current?: boolean;
  status?: string;
  created_at?: string;
}

export interface EmployeeProfile {
  id: number;
  tenant_id: number;
  user_id: number;
  employee_number?: string | null;
  job_title?: string | null;
  department?: string | null;
  employment_type?: EmploymentType | null;
  hire_date?: string | null;
  manager_id?: number | null;
  birth_date?: string | null;
  nationality?: string | null;
  national_id_expiry_gregorian?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  sba_verification_status: SbaStatus;
  sba_firm_id?: string | null;
  sba_license_number?: string | null;
  sba_license_expiry_raw?: string | null;
  sba_license_expiry_gregorian?: string | null;
  sba_last_checked_at?: string | null;
  status: EmployeeStatus;
  termination_date?: string | null;
  termination_reason?: string | null;
  annual_leave_entitlement?: number | null;
  annual_leave_balance?: string | number | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // علاقات (تُحمَّل حسب الصلاحية)
  user?: EmployeeUserRef;
  manager?: { id: number; name: string } | null;
  terminated_by?: { id: number; name: string } | null;
  current_compensation?: EmployeeCompensation | null;
  documents?: EmployeeDocument[];
}

export interface HrStats {
  total: number;
  active: number;
  lawyers: number;
  verified: number;
  expiring_soon: number;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  status?: EmployeeStatus | '';
  employment_type?: EmploymentType | '';
  sba_status?: SbaStatus | '';
  page?: number;
  per_page?: number;
}

// تسميات عربية للعرض
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'دوام كامل',
  part_time: 'دوام جزئي',
  contractor: 'متعاون',
  intern: 'متدرّب',
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'نشط',
  on_leave: 'في إجازة',
  suspended: 'موقوف',
  terminated: 'منتهٍ',
};
