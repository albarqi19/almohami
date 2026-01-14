// === أنواع الفوترة والمدفوعات ===

import type { Contract, PaymentTerm } from './contracts';

// حالة الفاتورة
export type InvoiceStatus = 'draft' | 'sent' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'refunded';

// طريقة الدفع
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'card' | 'online' | 'mada' | 'apple_pay' | 'stc_pay' | 'other';

// حالة الدفعة
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected' | 'refunded';

// نوع التنبيه
export type ReminderType = 'upcoming' | 'due' | 'overdue' | 'final';

// قناة الإرسال
export type ReminderChannel = 'email' | 'whatsapp' | 'sms' | 'internal';

// حالة التنبيه
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';

// === فواتير القضايا ===
export interface CaseInvoice {
  id: number;
  tenant_id: number;
  contract_id: number;
  payment_term_id?: number;
  case_id?: number;
  client_id: number;
  invoice_number: string;
  reference?: string;
  title: string;
  description?: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  discount: number;
  discount_percentage: number;
  taxable_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: InvoiceStatus;
  notes?: string;
  internal_notes?: string;
  terms_and_conditions?: string;
  line_items?: InvoiceLineItem[];
  sent_at?: string;
  sent_to?: string;
  sent_via?: string;
  paid_at?: string;
  cancelled_at?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  // العلاقات
  contract?: Contract;
  payment_term?: PaymentTerm;
  case?: {
    id: number;
    file_number: string;
    title: string;
  };
  client?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  payments?: Payment[];
  reminders?: CollectionReminder[];
  creator?: {
    id: number;
    name: string;
  };
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// === المدفوعات ===
export interface Payment {
  id: number;
  tenant_id: number;
  case_invoice_id: number;
  client_id: number;
  payment_number: string;
  reference?: string;
  amount: number;
  payment_method: PaymentMethod;
  bank_name?: string;
  bank_account?: string;
  transaction_id?: string;
  check_number?: string;
  check_date?: string;
  payment_date: string;
  status: PaymentStatus;
  receipt_path?: string;
  receipt_filename?: string;
  notes?: string;
  confirmed_by?: number;
  confirmed_at?: string;
  rejected_reason?: string;
  refunded_at?: string;
  refund_reason?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  // العلاقات
  invoice?: CaseInvoice;
  client?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
  };
  confirmedByUser?: {
    id: number;
    name: string;
  };
}

// === تنبيهات التحصيل ===
export interface CollectionReminder {
  id: number;
  tenant_id: number;
  case_invoice_id: number;
  client_id: number;
  type: ReminderType;
  scheduled_date: string;
  sent_at?: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  message?: string;
  response?: string;
  days_before_due?: number;
  days_after_due?: number;
  attempt_count: number;
  created_by?: number;
  created_at: string;
  updated_at: string;
  // العلاقات
  invoice?: CaseInvoice;
  client?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
}

// === إحصائيات الفوترة ===
export interface BillingStats {
  total_contracts: number;
  total_invoiced: number;
  total_collected: number;
  total_remaining: number;
  total_overdue: number;
  collection_rate: number;
  overdue_count: number;
  pending_count: number;
  invoices_by_status: Record<InvoiceStatus, {
    count: number;
    total: number;
  }>;
}

export interface BillingDashboard {
  stats: BillingStats;
  overdue_invoices: CaseInvoice[];
  upcoming_due: CaseInvoice[];
  recent_payments: Payment[];
  pending_payments: Payment[];
  active_contracts: {
    id: number;
    contract_number: string;
    total_amount: number;
    paid_amount: number;
    client?: {
      id: number;
      name: string;
    };
  }[];
  reminders: CollectionReminder[];
  monthly_chart: MonthlyStats[];
  monthly_stats?: {
    total_invoiced: number;
    total_collected: number;
    invoices_count: number;
    payments_count: number;
  };
  growth?: {
    invoiced: number;
    collected: number;
  };
}

export interface MonthlyStats {
  year: number;
  month: number;
  month_name: string;
  invoiced: number;
  collected: number;
  invoices_count: number;
  payments_count: number;
}

export interface PaymentStats {
  total_count: number;
  confirmed_count: number;
  pending_count: number;
  rejected_count: number;
  total_confirmed: number;
  total_pending: number;
  by_method: Record<PaymentMethod, {
    count: number;
    total: number;
  }>;
}

export interface ClientBillingSummary {
  client: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  total_contracts: number;
  active_contracts: number;
  total_invoiced: number;
  total_paid: number;
  total_remaining: number;
  overdue_amount: number;
  invoices_count: number;
  overdue_invoices_count: number;
}

export interface CaseBillingSummary {
  case: {
    id: number;
    file_number: string;
    title: string;
  };
  contracts: Contract[];
  active_contract?: Contract;
  total_contract_value: number;
  total_invoiced: number;
  total_collected: number;
  total_remaining: number;
  collection_percentage: number;
  invoices: CaseInvoice[];
}

// === Filters ===
export interface InvoiceFilters {
  status?: InvoiceStatus;
  client_id?: number;
  case_id?: number;
  contract_id?: number;
  search?: string;
  date_from?: string;
  date_to?: string;
  overdue_only?: boolean;
  due_this_week?: boolean;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaymentFilters {
  status?: PaymentStatus;
  invoice_id?: number;
  client_id?: number;
  payment_method?: PaymentMethod;
  date_from?: string;
  date_to?: string;
  this_month?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// === API Responses ===
export interface InvoicesResponse {
  success: boolean;
  data: {
    data: CaseInvoice[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface InvoiceResponse {
  success: boolean;
  data: CaseInvoice;
  message?: string;
}

export interface PaymentsResponse {
  success: boolean;
  data: {
    data: Payment[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface PaymentResponse {
  success: boolean;
  data: Payment;
  message?: string;
}

export interface BillingStatsResponse {
  success: boolean;
  data: BillingStats;
}

export interface BillingDashboardResponse {
  success: boolean;
  data: BillingDashboard;
}

// === إنشاء فاتورة ===
export interface CreateInvoiceData {
  contract_id: number;
  payment_term_id?: number;
  title: string;
  description?: string;
  invoice_date?: string;
  due_date: string;
  subtotal: number;
  discount?: number;
  discount_percentage?: number;
  vat_rate?: number;
  notes?: string;
  internal_notes?: string;
  terms_and_conditions?: string;
  line_items?: InvoiceLineItem[];
  status?: 'draft' | 'sent' | 'pending';
}

// === تسجيل دفعة ===
export interface CreatePaymentData {
  case_invoice_id: number;
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
  bank_name?: string;
  bank_account?: string;
  transaction_id?: string;
  check_number?: string;
  check_date?: string;
  payment_date: string;
  status?: 'pending' | 'confirmed';
  notes?: string;
}

// === تقرير التحصيل ===
export interface CollectionReport {
  period: {
    start: string;
    end: string;
  };
  total_collected: number;
  payments_count: number;
  by_method: Record<PaymentMethod, {
    count: number;
    total: number;
  }>;
  by_client: Record<number, {
    client: {
      id: number;
      name: string;
    };
    count: number;
    total: number;
  }>;
  payments: Payment[];
}
