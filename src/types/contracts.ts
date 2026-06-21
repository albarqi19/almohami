// === أنواع العقود ===

// نوع العقد
export type ContractType = 'representation' | 'consultation' | 'retainer' | 'contingency' | 'other';

// نطاق العمل
export type ScopeType = 'plaintiff' | 'defendant' | 'both';

// حالة العقد
// [CTR-07] أُزيلت 'suspended' — لا تعريف لها في enum الباك (مواءمة الطرفين).
export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'completed' | 'cancelled' | 'expired';

// نوع شرط الدفع
export type PaymentTermType = 'upfront' | 'milestone' | 'final' | 'percentage';

// نوع المبلغ
export type AmountType = 'fixed' | 'percentage';

// === قوالب العقود ===
export interface ContractTemplate {
  id: number;
  tenant_id: number;
  name: string;
  name_ar?: string;
  type: ContractType;
  scope_type: ScopeType;
  category?: string; // [TPL-T11]
  tags?: string[]; // [TPL-T11]
  content?: string; // [TPL-T10] قائمة القوالب لا تُرجع content (يظهر في show فقط)
  variables?: string[] | Record<string, unknown>; // [TPL-T06] قد يكون خريطة custom
  default_payment_terms?: DefaultPaymentTerm[];
  default_vat_rate: number;
  is_active: boolean;
  is_default: boolean;
  usage_count?: number; // [TPL-T04]
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface DefaultPaymentTerm {
  name: string;
  type: PaymentTermType;
  amount_type: AmountType;
  percentage?: number;
  due_condition?: string;
}

// === العقود ===
export interface Contract {
  id: number;
  tenant_id: number;
  contract_number: string;
  template_id?: number;
  case_id?: number;
  client_id: number;
  scope_type: ScopeType;
  title?: string;
  content: string;
  total_amount: number;
  subtotal?: number;
  discount: number;
  discount_percentage: number;
  taxable_amount: number;
  vat_rate: number;
  vat_amount: number;
  grand_total: number;
  total_paid?: number;
  collection_percentage?: number;
  remaining_amount?: number;
  status: ContractStatus;
  contract_date: string;
  start_date?: string;
  end_date?: string;
  signed_at?: string;
  signed_by?: number;
  notes?: string;
  metadata?: Record<string, any>;
  created_by?: number;
  created_at: string;
  updated_at: string;
  // العلاقات
  template?: ContractTemplate;
  case?: {
    id: number;
    file_number: string;
    title: string;
  };
  // [P4] الباك يحمّل العلاقة caseModel فتُسلسَل كـ case_model (snake_case) — المفتاح الفعلي في JSON.
  case_model?: {
    id: number;
    file_number: string;
    title: string;
  };
  client?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  parties?: ContractParty[];
  payment_terms?: PaymentTerm[];
  invoices?: {
    id: number;
    invoice_number: string;
    title: string;
    total_amount: number;
    remaining_amount: number;
    status: string;
    due_date: string;
  }[];
}

// === أطراف العقد ===
export type PartyType = 'first' | 'second';
export type EntityType = 'individual' | 'company';

export interface ContractParty {
  id: number;
  contract_id: number;
  party_type: PartyType;
  entity_type: EntityType;
  name: string;
  name_ar?: string;
  role?: string;
  national_id?: string;
  // [CTR-10] أسماء موحّدة مع الباك (commercial_registration/representative_national_id).
  commercial_registration?: string;
  tax_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  nationality?: string;
  representative_name?: string;
  representative_national_id?: string;
  representative_position?: string;
  license_number?: string;
  bank_name?: string;
  bank_iban?: string;
  created_at: string;
  updated_at: string;
}

// === شروط الدفع ===
export type PaymentTermStatus = 'pending' | 'invoiced' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface PaymentTerm {
  id: number;
  tenant_id: number;
  contract_id: number;
  name: string;
  type: PaymentTermType;
  description?: string;
  amount_type: AmountType;
  amount?: number;
  percentage?: number;
  calculated_amount: number;
  vat_amount: number;
  total_with_vat: number;
  due_date?: string;
  due_condition?: string;
  due_condition_description?: string;
  status: PaymentTermStatus;
  order: number;
  invoice_id?: number;
  created_at: string;
  updated_at: string;
  // العلاقات
  contract?: Contract;
  invoice?: {
    id: number;
    invoice_number: string;
    status: string;
  };
}

// === المتغيرات ===
export interface ContractVariable {
  key: string;
  label: string;
  category: 'client' | 'case' | 'payment' | 'contract' | 'firm';
  description?: string;
}

// === Filters ===
export interface ContractTemplateFilters {
  type?: ContractType;
  scope_type?: ScopeType;
  is_active?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface ContractFilters {
  status?: ContractStatus;
  client_id?: number;
  case_id?: number;
  template_id?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

// === API Responses ===
export interface ContractTemplatesResponse {
  success: boolean;
  data: {
    data: ContractTemplate[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ContractTemplateResponse {
  success: boolean;
  data: ContractTemplate;
  message?: string;
}

export interface ContractsResponse {
  success: boolean;
  data: {
    data: Contract[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ContractResponse {
  success: boolean;
  data: Contract;
  message?: string;
}

export interface ContractStatsResponse {
  success: boolean;
  data: {
    total: number;
    draft: number;
    active: number;
    completed: number;
    cancelled: number;
    total_value: number;
    total_collected: number;
  };
}

// === إنشاء العقد ===
export interface CreateContractData {
  template_id?: number;
  client_id: number;
  case_id?: number;
  title: string; // العنوان مطلوب
  scope_type: ScopeType; // [CTR-09] الباك إند يقبل plaintiff/defendant/both
  content: string;
  total_amount: number;
  discount?: number;
  discount_percentage?: number;
  vat_rate?: number;
  contract_date?: string;
  notes?: string;
  /** تجاوزات يدوية لقيم المتغيّرات — يدمجها الباك فوق القيم الأصلية ([CTR-26]) */
  custom_variables?: Record<string, string>;
  first_party: Partial<ContractParty>;
  second_party: Partial<ContractParty>;
  payment_terms: CreatePaymentTermData[];
}

export interface CreatePaymentTermData {
  name: string;
  type: PaymentTermType;
  description?: string;
  amount_type: AmountType;
  amount?: number;
  percentage?: number;
  due_date?: string;
  due_condition?: string;
}
