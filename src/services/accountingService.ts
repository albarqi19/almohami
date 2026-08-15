// وحدة المحاسبة (ملاحظة #141) — طبقة النداءات الكاملة للمراحل م1–م4.
// كل الأنواع مطابقة حرفياً لاستجابات الباك (app/Http/Controllers/Api/*
// + app/Services/Accounting/*) المغطاة بـ 53 اختبار باك.
// كل المسارات خلف بوابة accounting_enabled — الباك يرد 403 برسالة `message`.

import { apiClient, API_BASE_URL } from '../utils/api';
// إعادة تحصيل النثريات تُرجع الفاتورة كاملةً — والنوع مُعرَّفٌ سلفاً في طبقة الفوترة،
// فاستيرادُه (type-only) خيرٌ من نسخةٍ ثانيةٍ تنحرف عن الأصل بأوّل عمودٍ يُضاف.
import type { CaseInvoice } from '../types/billing';
// «اليوم» بساعة المستخدم لا بـtoISOString — القصُّ الأعمى يُرجع أمسَ بين منتصف
// الليل والثالثة فجراً، فيحمل اسمُ الملف يوماً غير الذي في الورقة.
import { todayLocal } from '../utils/dayString';

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
  /**
   * المبلغ الذي يُحمَّل على العميل عند إعادة التحصيل — تحسبه **الخلفية** لا الواجهة
   * (Expense::rebillableAmount: ذو الفاتورة الضريبية يُعاد صافياً `amount`، وعديمُها
   * إجمالياً `total_amount`؛ لأنّ ضريبة الأول خُصمت مدخلاتٍ فلم يتحمّلها المكتب).
   *
   * ⚠️ لا يصل إلا من `GET /expenses/billable` — بقية مسارات المصروفات لا تُلحقه
   * (لا `$appends` على الموديل)، فهو اختياريّ هنا وإلزاميّ في `BillableExpense`.
   * وهو **رقمٌ لا نصّ** خلافاً لبقية المبالغ: الباك يمرّره عبر `round()` لا `decimal:2`.
   */
  rebillable_amount?: number;
}

/** صفُّ نافذة إعادة التحصيل — نفس المصروف ومعه المبلغ المحسوب مضموناً. */
export interface BillableExpense extends Expense {
  rebillable_amount: number;
}

/**
 * مجاميع النافذة كما يحسبها الباك.
 * `rebillable_amount` ≠ `total_gross`: الأول ما يُضاف للفاتورة فعلاً بقاعدة الضريبة
 * أعلاه، والثاني ما دفعه المكتب. عرضُ الثاني مكان الأول يَعِد العميل بمبلغٍ لن يُفوتَر.
 */
export interface BillableExpensesSummary {
  count: number;
  total_net: number;
  total_vat: number;
  total_gross: number;
  rebillable_amount: number;
}

/** ⚠️ ليست `Envelope<Paginated<…>>`: قائمةٌ مسطّحةٌ بسقف ٢٠٠ + `summary` بجوار `data`. */
export interface BillableExpensesResponse {
  success: boolean;
  data: BillableExpense[];
  summary: BillableExpensesSummary;
}

/** ملخّصُ ما أُضيف فعلاً — للعرض في رسالة النجاح لا للربط (الربط في rebilled_invoice_id). */
export interface RebilledExpenseRef {
  id: number;
  expense_number: string;
  description: string;
  amount: number;
}

/** ⚠️ `rebilled` بجوار `data` لا داخلها — و`data` هي الفاتورة كاملةً بعد إعادة الحساب. */
export interface RebillExpensesResponse {
  success: boolean;
  message: string;
  data: CaseInvoice;
  rebilled: RebilledExpenseRef[];
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

// ── م3: سجلّ القيود الفاشلة (accounting_posting_failures) ──
//
// 🔴 هذا الجدول **دَينٌ محاسبيٌّ مؤجَّل** لا سجلُّ تشخيص: كلُّ صفٍّ يعني مستنداً ثبت في
// القاعدة وقيدُه لم يُكتب — انحرافٌ لا يفضحه ميزانُ المراجعة (القيودُ الموجودةُ متوازنةٌ
// كلٌّ على حدة)، ويجعل الإقرارَ الضريبيّ (يقرأ المستندات) يخالف الدفاتر (تقرأ القيود).
// وكان يُكتب بلا مسارٍ يقرأه، فاستُبدل «سطرٌ في اللوق لا يراه أحد» بـ«صفٍّ لا يراه أحد».

/** الافتراضُ في الباك `unresolved` حين لا يُرسَل شيء — المحلولةُ أرشيفٌ يُطلَب لا عملٌ ينتظر. */
export type PostingFailureStatus = 'unresolved' | 'resolved' | 'all';

/** فلترُ المصدر المبسّط — يترجمه الباك إلى صنف الموديل (لا نرسل أسماء أصنافٍ من الواجهة). */
export type PostingFailureSource = 'invoice' | 'payment' | 'expense';

export interface PostingFailure {
  id: number;
  /** اسمُ صنف الموديل كاملاً (App\Models\CaseInvoice…) — للعرض التشخيصي لا للمطابقة. */
  source_class: string;
  /**
   * مفتاحُ المصدر المبسّط. 🩸 قد يعود `'unknown'` لصفٍّ كُتب بمصدرٍ رابعٍ لم تعرفه
   * خريطةُ المتحكّم بعد — فلا تُفهرَس عليه ألوانٌ أو أيقوناتٌ بلا احتياط.
   */
  source_type: PostingFailureSource | 'unknown';
  /** الاسمُ العربيّ للمصدر (فاتورة · سند قبض · مصروف) — جاهزٌ من الباك. */
  source_label: string;
  source_id: number;
  /**
   * الرقمُ المفهوم للمستند (invoice_number/payment_number/expense_number)، ويرتدّ إلى
   * لقطة `context.label` إن حُذف المصدر. `null` فقط حين يغيب الاثنان.
   */
  source_title: string | null;
  /** false للمحذوف ناعماً — الباك يرفض إعادةَ المحاولة عليه، فيُعطَّل الزرُّ لا يُضغط فيعتذر. */
  source_available: boolean;
  /** مبلغُ المستند وقتَ الفشل من لقطة السياق — نصٌّ لا رقم (يُلفّ بـformatSAR). */
  source_amount: string | number | null;
  /**
   * 🔑 مفتاحُ الحدث الخامّ **بلاحقته**: `payment_refund@1200.00` · `invoice_adjust.3`.
   * لا تُشتقّ منه تسميةٌ في الواجهة — الباك يرسل `event_label` جاهزاً، وأيُّ خريطةٍ
   * ثانيةٍ هنا تصير مصدرَ حقيقةٍ يفترق عنه بأوّل لاحقةٍ لم تُتوقَّع.
   */
  source_event: string;
  /** تسميةُ الحدث العربية كما يقرؤها المستخدم (إصدار فاتورة · استرداد دفعة…). */
  event_label: string;
  /** صنفُ الاستثناء — يفرّق «فترةً مقفلة» عن «حسابٍ غير مزروع» قبل قراءة النصّ. */
  error_class: string;
  error_message: string;
  /** يزيد **واحداً** بكل فشل — عدّادٌ يميّز العطلَ العنيد من العابر. */
  attempts: number;
  /**
   * ⏱️ طوابعُ هذا الجدول تصل **ساعةَ جدارِ الرياض نصّاً ساذجاً** (`Y-m-d H:i:s` بلا `Z`):
   * يصوغها المتحكّم يدوياً لأن الموديل لا يحمل `SerializesRiyadhWallClock`. فلا تُمرَّر
   * إلى `new Date()` على أنها UTC — `toDayString` تقرؤها كما كُتبت بلا إزاحة.
   */
  last_attempted_at: string | null;
  resolved_at: string | null;
  resolved_entry_id: number | null;
  /** رقمُ القيد الذي أغلق الدَّين — يصل في القائمة وفي ردّ إعادة المحاولة. */
  resolved_entry_number: string | null;
  created_at: string | null;
  /** لقطةُ الفشل (label + المبلغ) كما كانت لحظتَه — تبقى مقروءةً ولو حُذف المصدر. */
  context: Record<string, unknown>;
}

/**
 * عدّادُ الشارة: عددُ الدَّين المفتوح وتاريخُ أقدمِه.
 *
 * 🔑 مجاميعُ SQL وحدَها (بلا جلبِ صفّ) لأنه يُنادى مع كلّ فتحِ تبويب — ولا يُشتقّ من
 * `total` القائمة: تلك مفلترةٌ ومرقَّمة، وشارةُ إنذارٍ تقرأ صفحةً مفلترةً تكذب.
 * `oldest_at` هو المؤشّرُ الحقيقيّ للخطر: كلَّما طال بقاءُ القيد الفائت اقترب من فترةٍ
 * تُقفل، وحينها يصير التصحيحُ إعادةَ كتابةِ تاريخٍ محاسبيّ لا إصلاحَ عطل.
 */
export interface PostingFailuresSummary {
  unresolved_count: number;
  oldest_at: string | null;
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

/**
 * ناتج إعادة فتح سنة مقفلة.
 *
 * ⚠️ ليس كائن `FiscalYearClosing`: صفُّ الإقفال **يُحذف** عند الفتح (هو قفلٌ لا سجلّ
 * محاسبي)، فالسنة تختفي من `GET /accounting/closings` بعد النجاح — والأثر الدائم في
 * قيد الإقفال المعكوس وفي `audit_log` بحدث `fiscal_year.reopened`.
 *
 * 🩸 `reversal_entry_id` قد يكون **null** بلا خطأ: سنةٌ أُقفلت بلا أي حركة لا قيد
 * إقفال لها فلا شيء يُعكس. لا تفترض الواجهةُ وجودَه ولا تعرض رابطاً إليه بلا فحص.
 */
export interface FiscalYearReopenResult {
  year: number;
  reversal_entry_id: number | null;
  restored_net_income: number;
  warning: string;
}

// ── م4: تصدير القوائم ملفاً ──

export type AccountingReportKey =
  | 'trial-balance'
  | 'income-statement'
  | 'balance-sheet'
  | 'general-ledger'
  | 'cash-movement';

export type AccountingExportFormat = 'pdf' | 'xlsx';

export interface AccountingExportParams {
  from?: string;
  to?: string;
  /** لـ`general-ledger` وحده — إلزاميّ معه (٤٢٢ بدونه)، ومُهمَلٌ مع غيره. */
  account_id?: number;
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

  // ── إعادة تحصيل النثريات على العميل ──

  /**
   * النثريات المؤهّلة للتحميل على العميل: `is_billable` و`status='paid'` و**لم تُفوتَر بعد**.
   *
   * ⚠️ **قائمةٌ بلا ترقيم** بسقفٍ خادميّ (٢٠٠ صفّاً) — نافذةُ اختيارٍ لا جدولٌ يُتصفَّح.
   * فإن بلغت النتيجةُ السقفَ فثمّة نثرياتٌ لا يراها المستخدم: ضيّق بـ`case_id`/`client_id`
   * ولا تبنِ عليها ترقيماً وهمياً في العميل.
   */
  listBillableExpenses: (filters: { case_id?: number; client_id?: number } = {}) =>
    apiClient.get<BillableExpensesResponse>(`/expenses/billable${q(filters)}`),

  /**
   * ضمُّ نثرياتٍ مدفوعةٍ بنوداً إلى فاتورة، ووسمُها فلا تُحصَّل مرّتين.
   *
   * 🔴 **مسوّدةٌ حصراً**: الفاتورة المُصدَرة يُثبَّت قيدُ إصدارها عند مغادرة `draft`، فرفعُ
   * إجماليها بلا قيدٍ مقابل يفتح انحرافاً دائماً بين الدفاتر والفواتير — الباك يردّ ٤٢٢.
   * 🔴 **الرفض شاملٌ لا جزئيّ**: إن كان صفٌّ واحدٌ غيرَ مؤهّلٍ أو فُوتِر للتوّ في فاتورةٍ
   * أخرى، تُرفض الدفعةُ كلُّها برسالةٍ واحدة — فلا «٣ من ٥ نجحت» تُخفي ما لم يُحصَّل.
   * بعد النجاح أبطِل `['accounting']` **و**فاتورةَ الشاشة: `data` هي الفاتورة المحدَّثة.
   */
  rebillExpenses: (invoiceId: number, expenseIds: number[]) =>
    apiClient.post<RebillExpensesResponse>(`/case-invoices/${invoiceId}/rebill-expenses`, {
      expense_ids: expenseIds,
    }),

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

  // ── م3: سجلّ القيود الفاشلة ──

  /**
   * قائمةُ الدَّين المحاسبيّ — **الأقدمُ أوّلاً** بترتيبٍ يفرضه الباك.
   *
   * ⚠️ لا تُعِد ترتيبَها في الواجهة: الأقدمُ هو الأخطر (يقترب من فترةٍ تُقفل)، وشاشةٌ
   * تبدأ بالأحدث تدفن الأخطرَ في آخر صفحة. ولا فلترَ بحثٍ نصّيّ في العقد — لا تُرسل
   * `search` فيُهمَل صامتاً ويوهم المستخدمَ أنه بحث.
   */
  getPostingFailures: (filters: {
    status?: PostingFailureStatus; source?: PostingFailureSource; page?: number; per_page?: number;
  } = {}) => apiClient.get<Envelope<Paginated<PostingFailure>>>(`/accounting/posting-failures${q(filters)}`),

  /** عدّادُ الشارة — مسجَّلٌ في الباك **قبل** أي مسارٍ بمعامل، وإلا التُقطت `summary` معرّفاً. */
  getPostingFailuresSummary: () =>
    apiClient.get<Envelope<PostingFailuresSummary>>('/accounting/posting-failures/summary'),

  /**
   * إعادةُ توليد القيد الفائت — تنادي المولّدَ الآليَّ نفسَه لا مسارَ إصلاحٍ موازياً،
   * وهو idempotent بطبقتين (فحصٌ تطبيقيّ + فريدٌ في القاعدة) فالتكرارُ آمنٌ لا يُزدوج.
   *
   * ثلاثُ نهايات: قيدٌ وُلد · امتناعٌ مشروع (كان مكتوباً سلفاً أو لم يعد مستحقّاً) —
   * وكلتاهما ٢٠٠ تُغلق الدَّين وتصل معها الرسالةُ التي تفرّقهما · وفشلٌ متكرّر ⇒ ٤٢٢
   * **بنصّ الفشل نفسِه** (لا برسالةٍ عامّة): «فترةٌ مقفلة» يفتحها المحاسب و«حسابٌ غير
   * مزروع» يزرعه الدليل — والفرقُ هو كلُّ ما يحتاجه من يقف أمام الزرّ. فاعرض `message`
   * كما هي ولا تستبدلها بنصٍّ من عندك.
   *
   * 🔑 وبعد الفشل تكون حالةُ الخادم قد **تغيّرت** (زاد `attempts` وتبدّل نصُّ الخطأ) —
   * فأبطِل الاستعلامَ في مسار الخطأ كما في مسار النجاح، وإلا بقي الصفُّ يعرض محاولةً
   * أقلَّ ممّا وقع فعلاً. و`throttle:20,1` على المسار: لا تبنِ عليه إعادةً جماعية.
   */
  retryPostingFailure: (id: number) =>
    apiClient.post<Envelope<PostingFailure> & { message: string }>(`/accounting/posting-failures/${id}/retry`, {}),

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

  /**
   * رابط تصدير القائمة ملفاً (يُستهلك من `exportReport` أدناه — لا يُفتح في تبويب:
   * المسار محميٌّ بترويسة Bearer لا بكوكي، فالفتحُ المباشر يردّ ٤٠١).
   *
   * 🩸 `account_id` يُمرَّر مع `general-ledger` **وحده**: تمريرُه مع غيره يجعل قيمةً
   * قديمةً عالقةً في الشاشة تُسقط تصديراً سليماً بـ٤٢٢ لا علاقة له بالتقرير المطلوب.
   */
  reportExportUrl: (report: AccountingReportKey, format: AccountingExportFormat, params: AccountingExportParams = {}) =>
    `${API_BASE_URL}/accounting/reports/export${q({
      report,
      format,
      from: params.from,
      to: params.to,
      account_id: report === 'general-ledger' ? params.account_id : undefined,
    })}`,

  // ── م4: الإقفال السنوي ──
  getClosings: () => apiClient.get<Envelope<FiscalYearClosing[]>>('/accounting/closings'),
  closeYear: (year: number) => apiClient.post<Envelope<FiscalYearClosing> & { message: string }>('/accounting/close-year', { year }),

  /**
   * إعادة فتح سنة مقفلة — الإجراء المضادّ لـ`closeYear`.
   *
   * `reason` **إلزاميّ ولا يقلّ عن عشرة أحرف** (٤٢٢ برسالةٍ عربية دونه): الفعل يعيد
   * كتابة تاريخٍ محاسبيّ قد يكون قُدِّم للهيئة، ويُحفظ السببُ في `audit_log` وفي وصف
   * قيد العكس معاً. فلا تُرسل نصّاً مصطنعاً من الواجهة — اطلبه من المستخدم.
   *
   * `confirmYear` تأكيدٌ **اختياريّ** يفحصه الباك `same:year` إن أُرسل؛ يُرسَل فقط حين
   * تطلب الشاشةُ من المستخدم كتابةَ السنة بيده.
   *
   * 🔴 الفتحُ بالترتيب العكسي حصراً: وجودُ سنةٍ أحدثَ مقفلةٍ يردّ ٤٢٢ يسمّيها.
   */
  reopenYear: (year: number, reason: string, confirmYear?: number) =>
    apiClient.post<Envelope<FiscalYearReopenResult> & { message: string }>('/accounting/reopen-year', {
      year,
      reason,
      ...(confirmYear !== undefined ? { confirm_year: confirmYear } : {}),
    }),
};

// ─────────────────────────────────────────────────────────────
// التنزيلات الثنائية (fetch مباشر — apiClient لا يدعم blob)
// ─────────────────────────────────────────────────────────────

/**
 * جلبُ ملفٍ موثَّقٍ وحفظُه. مشتركةٌ بين الإقرار الضريبي والقوائم المالية عمداً:
 * نسختان من هذا الكود تفترقان بأوّل ترويسةٍ تُضاف (وقد افترقتا فعلاً — انظر أدناه).
 *
 * 🩸 `res.clone().json()` لا `res.json()`: قراءةُ الجسم تستهلكه، فلو احتيج الـblob
 * بعدها في مسارٍ آخر ضاع. والنسخُ مجانيٌّ هنا لأننا نرمي بعده على أي حال.
 * 🩸 الخطأ قد يكون JSON (٤٠٣/٤٢٢/٤٠٤ برسالةٍ عربية) وقد لا يكون — فالمحاولةُ في
 * try والرسالةُ الافتراضية احتياطٌ لا يُسقط الشاشة.
 */
async function fetchAndSaveFile(url: string, accept: string, filename: string, fallbackError: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(url, {
    headers: {
      Accept: accept,
      // نفس ترويسة apiClient — بدونها تعترض صفحةُ تحذير ngrok الملفَّ فيُحفظ HTML
      // باسم .pdf. كانت ناقصةً في مسار الإقرار وحده، والتوحيدُ يشفيها.
      'ngrok-skip-browser-warning': '69420',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let message = fallbackError;
    try {
      const body = await res.clone().json();
      if (body?.message) message = body.message;
    } catch { /* ليست JSON — نُبقي الرسالة الافتراضية */ }
    throw new Error(message);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

/** تنزيل PDF الإقرار الضريبي (fetch موثّق ثم blob — نفس نمط invoiceService.downloadPdf). */
export async function downloadTaxReturnPdf(filters: { quarter?: string; month?: string; from?: string; to?: string }): Promise<void> {
  return fetchAndSaveFile(
    accountingService.taxReturnPdfUrl(filters),
    'application/pdf',
    `tax-return-${filters.quarter || filters.month || `${filters.from}-${filters.to}`}.pdf`,
    'تعذّر توليد ملف الإقرار',
  );
}

/** تسميةٌ عربيةٌ لكل قائمة — تدخل اسمَ الملف، فالوصلاتُ بدل المسافات. */
const REPORT_FILE_LABELS: Record<AccountingReportKey, string> = {
  'trial-balance': 'ميزان-المراجعة',
  'income-statement': 'قائمة-الدخل',
  'balance-sheet': 'المركز-المالي',
  'general-ledger': 'دفتر-الأستاذ',
  'cash-movement': 'حركة-النقد',
};

const EXPORT_ACCEPT: Record<AccountingExportFormat, string> = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * تصدير إحدى القوائم المالية الخمس ملفاً (pdf/xlsx) وحفظُه على جهاز المستخدم.
 *
 * اسمُ الملف يُبنى **في العميل**: لا شيء في هذا المشروع يقرأ `Content-Disposition`،
 * فلا تُبنَ عليه توقّعاتٌ (النمطُ نفسُه في CasesExportModal وAdminRequests).
 *
 * 🩸 `balance-sheet` **لحظةٌ لا فترة**: الباك يستهلك `to` تاريخَ اللحظة ويُهمل `from`
 * (توقيع `balanceSheet(tenantId, asOf)`) — فاسمُ الملف «حتى ‎…‎» لا «من ‎…‎ إلى ‎…‎»،
 * وإلا وعد المستخدمَ بفترةٍ لا وجود لها في الورقة التي فتحها.
 * 🩸 `general-ledger` يوجب `account_id` — الباك يردّ ٤٢٢ عربيةً واضحة، فلا نُكرّر
 * الفحصَ هنا كي لا يصير للقاعدة مصدران يفترقان.
 *
 * الأخطاء تُرمى `Error` برسالة الخادم — يلتقطها المنادي في try/catch (نمط
 * TaxReturnPanel: حالةٌ محلّية `downloading` + toast.error) لا في react-query.
 */
export async function exportReport(
  report: AccountingReportKey,
  format: AccountingExportFormat,
  params: AccountingExportParams = {},
): Promise<void> {
  // احتياطُ اسمِ الملف حين لا تُرسل الشاشةُ فترةً — يطابق افتراض الباك نفسَه
  // (FinancialReportController::period: من أول السنة إلى اليوم)، فلا يحمل الاسمُ
  // كلمة undefined ولا يَعِد بفترةٍ غير التي في الورقة.
  const to = params.to || todayLocal();
  const from = params.from || `${todayLocal().slice(0, 4)}-01-01`;
  const period = report === 'balance-sheet' ? `حتى-${to}` : `${from}_${to}`;

  return fetchAndSaveFile(
    accountingService.reportExportUrl(report, format, params),
    EXPORT_ACCEPT[format],
    `${REPORT_FILE_LABELS[report]}-${period}.${format}`,
    'تعذّر توليد ملف التقرير',
  );
}
