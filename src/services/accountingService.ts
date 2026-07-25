// وحدة المحاسبة (ملاحظة #141) — طبقة النداءات الكاملة للمراحل م1–م4.
// كل الأنواع مطابقة حرفياً لاستجابات الباك (app/Http/Controllers/Api/*
// + app/Services/Accounting/*) المغطاة بـ 53 اختبار باك.
// كل المسارات خلف بوابة accounting_enabled — الباك يرد 403 برسالة `message`.

import { apiClient, API_BASE_URL } from '../utils/api';

// ─────────────────────────────────────────────────────────────
// الأنواع
// ─────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: number;
  name: string;
  system_code: string | null;
  account_id: number | null;
  is_active: boolean;
  expenses_count?: number;
}

export interface Vendor {
  id: number;
  name: string;
  vat_number: string | null;
  commercial_register: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  expenses_count?: number;
}

export type ExpenseStatus = 'draft' | 'paid' | 'cancelled';
export type ExpensePaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'check';

export interface Expense {
  id: number;
  expense_number: string;
  expense_category_id: number;
  vendor_id: number | null;
  description: string;
  expense_date: string;
  amount: string | number;
  vat_amount: string | number;
  total_amount: string | number;
  has_tax_invoice: boolean;
  vendor_invoice_number: string | null;
  payment_method: ExpensePaymentMethod | null;
  status: ExpenseStatus;
  paid_at: string | null;
  case_id: number | null;
  legal_service_id: number | null;
  client_id: number | null;
  is_billable: boolean;
  rebilled_invoice_id: number | null;
  attachment_path: string | null;
  attachment_filename: string | null;
  notes: string | null;
  category?: { id: number; name: string; system_code?: string | null };
  vendor?: { id: number; name: string } | null;
  case_model?: { id: number; file_number: string; title: string } | null;
  legal_service?: { id: number; title: string } | null;
  client?: { id: number; name: string } | null;
  creator?: { id: number; name: string } | null;
  rebilled_invoice?: { id: number; invoice_number: string } | null;
}

export interface ExpenseStats {
  period: { from: string; to: string };
  count: number;
  net: number;
  vat: number;
  total: number;
  draft_count: number;
  by_category: { category_id: number; category: string | null; count: number; total: number }[];
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  parent_id: number | null;
  system_code: string | null;
  is_system: boolean;
  is_active: boolean;
  description: string | null;
}

export interface AccountsTreeNode {
  account: Account;
  children: Account[];
}

export interface JournalLine {
  id: number;
  journal_entry_id: number;
  account_id: number;
  entry_date: string;
  debit: string | number;
  credit: string | number;
  memo: string | null;
  cost_center_type: string | null;
  cost_center_id: number | null;
  account?: { id: number; code: string; name: string; type?: AccountType };
}

export interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  description: string;
  source_type: string | null;
  source_id: number | null;
  source_event: string | null;
  status: 'posted' | 'reversed';
  is_manual: boolean;
  reversal_of_id: number | null;
  reversed_by_entry_id: number | null;
  total_debit: string | number;
  lines?: JournalLine[];
  reversal_of?: { id: number; entry_number: string } | null;
  reversed_by?: { id: number; entry_number: string } | null;
  creator?: { id: number; name: string } | null;
}

export interface TaxReturnReport {
  period: { from: string; to: string };
  period_label?: string;
  filing_period?: 'quarterly' | 'monthly';
  sales: { count: number; standard_rated_base: number; output_vat: number; zero_or_exempt: number };
  adjustments: { credit_notes_count: number; base_reduction: number; vat_reduction: number };
  purchases: { count: number; deductible_base: number; input_vat: number; non_deductible_total: number };
  net: { output_vat_after_adjustments: number; input_vat: number; net_vat_due: number };
  warnings: string[];
  details?: {
    invoices: { id: number; number: string; date: string | null; title: string; base: number; vat: number; total: number; kind: 'invoice' | 'credit_note' | 'debit_note' }[];
    expenses: { id: number; number: string; date: string | null; description: string; base: number; vat: number; total: number; deductible: boolean }[];
  };
}

export interface TrialBalanceRow {
  account_id: number;
  code: string;
  name: string;
  type: AccountType;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

export interface TrialBalanceReport {
  period: { from: string; to: string };
  rows: TrialBalanceRow[];
  totals: Record<'opening_debit' | 'opening_credit' | 'period_debit' | 'period_credit' | 'closing_debit' | 'closing_credit', number>;
  balanced: boolean;
}

export interface LedgerReport {
  account: { id: number; code: string; name: string; type: AccountType };
  period: { from: string; to: string };
  opening_balance: number;
  movements: { date: string; entry_number: string; description: string; debit: number; credit: number; balance: number; source_type: string | null; source_id: number | null }[];
  closing_balance: number;
}

export interface IncomeStatementReport {
  period: { from: string; to: string };
  revenues: { lines: { account_id: number; code: string; name: string; amount: number }[]; total: number };
  expenses: { lines: { account_id: number; code: string; name: string; amount: number }[]; total: number };
  net_income: number;
}

export interface BalanceSheetReport {
  as_of: string;
  assets: { lines: { account_id: number; code: string; name: string; balance: number }[]; total: number };
  liabilities: { lines: { account_id: number; code: string; name: string; balance: number }[]; total: number };
  equity: { lines: { account_id: number; code: string; name: string; balance: number }[]; unclosed_net_income: number; total: number };
  balanced: boolean;
}

export interface CashMovementReport {
  period: { from: string; to: string };
  opening_cash: number;
  inflow: number;
  outflow: number;
  net_change: number;
  closing_cash: number;
}

export interface FiscalYearClosing {
  id: number;
  fiscal_year: number;
  closing_entry_id: number | null;
  net_income: string | number;
  closed_at: string;
  closing_entry?: { id: number; entry_number: string } | null;
  closed_by?: { id: number; name: string } | null;
}

interface Paginated<T> {
  data: T[];
  total: number;
  last_page: number;
  current_page: number;
}

interface Envelope<T> { success: boolean; data: T; message?: string }

// ─────────────────────────────────────────────────────────────
// الخدمة
// ─────────────────────────────────────────────────────────────

const q = (filters: Record<string, string | number | boolean | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
};

export const accountingService = {
  // ── م1: التصنيفات ──
  getCategories: () => apiClient.get<Envelope<ExpenseCategory[]>>('/expense-categories'),
  createCategory: (data: { name: string; account_id?: number | null }) =>
    apiClient.post<Envelope<ExpenseCategory>>('/expense-categories', data),
  updateCategory: (id: number, data: Partial<{ name: string; account_id: number | null; is_active: boolean }>) =>
    apiClient.put<Envelope<ExpenseCategory>>(`/expense-categories/${id}`, data),
  deleteCategory: (id: number) => apiClient.delete<Envelope<null>>(`/expense-categories/${id}`),

  // ── م1: الموردون ──
  getVendors: (filters: { search?: string; active_only?: boolean; page?: number; per_page?: number } = {}) =>
    apiClient.get<Envelope<Paginated<Vendor>>>(`/vendors${q(filters)}`),
  createVendor: (data: Partial<Vendor> & { name: string }) => apiClient.post<Envelope<Vendor>>('/vendors', data),
  updateVendor: (id: number, data: Partial<Vendor>) => apiClient.put<Envelope<Vendor>>(`/vendors/${id}`, data),
  deleteVendor: (id: number) => apiClient.delete<Envelope<null>>(`/vendors/${id}`),

  // ── م1: المصروفات ──
  getExpenses: (filters: {
    from?: string; to?: string; status?: string; category_id?: number; vendor_id?: number;
    case_id?: number; billable_only?: boolean; search?: string; page?: number; per_page?: number;
  } = {}) => apiClient.get<Envelope<Paginated<Expense>>>(`/expenses${q(filters)}`),
  getExpense: (id: number) => apiClient.get<Envelope<Expense>>(`/expenses/${id}`),
  getExpenseStats: (filters: { from?: string; to?: string } = {}) =>
    apiClient.get<Envelope<ExpenseStats>>(`/expenses/stats${q(filters)}`),
  createExpense: (data: FormData) => apiClient.postFormData<Envelope<Expense>>('/expenses', data),
  updateExpense: (id: number, data: Record<string, unknown>) => apiClient.put<Envelope<Expense>>(`/expenses/${id}`, data),
  deleteExpense: (id: number) => apiClient.delete<Envelope<null>>(`/expenses/${id}`),
  markExpensePaid: (id: number, payment_method?: ExpensePaymentMethod) =>
    apiClient.post<Envelope<Expense>>(`/expenses/${id}/mark-paid`, payment_method ? { payment_method } : {}),
  cancelExpense: (id: number) => apiClient.post<Envelope<Expense>>(`/expenses/${id}/cancel`, {}),

  // ── م2: الإقرار الضريبي ──
  getTaxReturn: (filters: { quarter?: string; month?: string; from?: string; to?: string; detailed?: 1 }) =>
    apiClient.get<Envelope<TaxReturnReport>>(`/accounting/tax-return${q(filters)}`),
  taxReturnPdfUrl: (filters: { quarter?: string; month?: string; from?: string; to?: string }) =>
    `${API_BASE_URL}/accounting/tax-return/pdf${q(filters)}`,

  // ── م3: دليل الحسابات ──
  getAccounts: (filters: { type?: AccountType; active_only?: boolean } = {}) =>
    apiClient.get<Envelope<{ flat: Account[]; tree: AccountsTreeNode[] }>>(`/accounting/accounts${q(filters)}`),
  createAccount: (data: { code: string; name: string; type: AccountType; parent_id?: number | null; description?: string }) =>
    apiClient.post<Envelope<Account>>('/accounting/accounts', data),
  updateAccount: (id: number, data: Partial<{ code: string; name: string; type: AccountType; is_active: boolean; description: string }>) =>
    apiClient.put<Envelope<Account>>(`/accounting/accounts/${id}`, data),
  deleteAccount: (id: number) => apiClient.delete<Envelope<null>>(`/accounting/accounts/${id}`),

  // ── م3: القيود اليومية ──
  getJournalEntries: (filters: {
    from?: string; to?: string; status?: string; source?: 'invoice' | 'payment' | 'expense' | 'manual';
    account_id?: number; search?: string; page?: number; per_page?: number;
  } = {}) => apiClient.get<Envelope<Paginated<JournalEntry>>>(`/accounting/journal-entries${q(filters)}`),
  getJournalEntry: (id: number) => apiClient.get<Envelope<JournalEntry>>(`/accounting/journal-entries/${id}`),
  createManualEntry: (data: {
    entry_date: string; description: string;
    lines: { account_id: number; debit?: number; credit?: number; memo?: string }[];
  }) => apiClient.post<Envelope<JournalEntry>>('/accounting/journal-entries', data),
  reverseEntry: (id: number, reason?: string) =>
    apiClient.post<Envelope<JournalEntry>>(`/accounting/journal-entries/${id}/reverse`, reason ? { reason } : {}),

  // ── م4: القوائم المالية ──
  getTrialBalance: (filters: { from?: string; to?: string } = {}) =>
    apiClient.get<Envelope<TrialBalanceReport>>(`/accounting/reports/trial-balance${q(filters)}`),
  getGeneralLedger: (accountId: number, filters: { from?: string; to?: string } = {}) =>
    apiClient.get<Envelope<LedgerReport>>(`/accounting/reports/general-ledger/${accountId}${q(filters)}`),
  getIncomeStatement: (filters: { from?: string; to?: string } = {}) =>
    apiClient.get<Envelope<IncomeStatementReport>>(`/accounting/reports/income-statement${q(filters)}`),
  getBalanceSheet: (filters: { as_of?: string } = {}) =>
    apiClient.get<Envelope<BalanceSheetReport>>(`/accounting/reports/balance-sheet${q(filters)}`),
  getCashMovement: (filters: { from?: string; to?: string } = {}) =>
    apiClient.get<Envelope<CashMovementReport>>(`/accounting/reports/cash-movement${q(filters)}`),

  // ── م4: الإقفال السنوي ──
  getClosings: () => apiClient.get<Envelope<FiscalYearClosing[]>>('/accounting/closings'),
  closeYear: (year: number) => apiClient.post<Envelope<FiscalYearClosing> & { message: string }>('/accounting/close-year', { year }),
};

/** تنزيل PDF الإقرار الضريبي (fetch موثّق ثم blob — نفس نمط invoiceService.downloadPdf). */
export async function downloadTaxReturnPdf(filters: { quarter?: string; month?: string; from?: string; to?: string }): Promise<void> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(accountingService.taxReturnPdfUrl(filters), {
    headers: {
      Accept: 'application/pdf',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let message = 'تعذّر توليد ملف الإقرار';
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch { /* ليست JSON */ }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `tax-return-${filters.quarter || filters.month || `${filters.from}-${filters.to}`}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
