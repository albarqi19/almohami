// [وحدة المحاسبة #141 — م1] تبويب المصروفات: مصروفات + موردون + تصنيفات.
// دورة حياة المصروف: مسودة → مدفوع (قيد آلي بالباك) → ملغى (قيد عكسي).
// المدفوع لا يُعدَّل ولا يُحذف — سلامة الدفاتر (رسائل الباك تشرح ذلك).
//
// [EXP-REBILL] مركز التكلفة وإعادة التحصيل: القضية والعميل ومفتاح «قابل لإعادة
// التحصيل» أعمدةٌ قائمةٌ في القاعدة منذ م1، لكنّ الواجهة لم تكن تكتبها سطراً —
// فكلُّ نثريةٍ تُصرف باسم عميلٍ كانت تُدفن في مصروفات المكتب العامّة ولا تُحمَّل
// عليه أبداً. هذا التبويب هو مكانُ كتابتها، ونافذةُ ضمّها للفاتورة في شاشة الفواتير.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Wallet, Plus, CheckCircle2, XCircle, Trash2, Pencil, Paperclip, Landmark,
  Truck, Tags, ReceiptText, FileWarning, Ban, Briefcase, UserRound, Receipt,
  Search, X, Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  accountingService,
  type Expense, type ExpenseCategory, type Vendor, type ExpensePaymentMethod,
} from '../../../services/accountingService';
import { CaseService } from '../../../services/caseService';
import { UserService } from '../../../services/UserService';
import { DataTable, FilterBar, Pagination, Modal, EmptyState } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import StatCard, { StatCardGrid } from '../../../components/erp/StatCard';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import { formatSAR } from '../../../utils/money';
import { todayLocal, toDayString } from '../../../utils/dayString';
import { useAnchoredMenu, useOutsideOfBoth } from '../../../hooks/useAnchoredMenu';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { useAuth } from '../../../contexts/AuthContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';

const PAYMENT_METHODS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'cash', label: 'نقداً' },
  { value: 'card', label: 'بطاقة/شبكة' },
  { value: 'check', label: 'شيك' },
];

const STATUS_META: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  draft: { label: 'مسودة', tone: 'warning' },
  paid: { label: 'مدفوع', tone: 'success' },
  cancelled: { label: 'ملغى', tone: 'danger' },
};

/** نموذج المصروف (إنشاء/تعديل مسودة). */
interface ExpenseForm {
  expense_category_id: string;
  vendor_id: string;
  description: string;
  expense_date: string;
  amount: string;
  vat_amount: string;
  has_tax_invoice: boolean;
  vendor_invoice_number: string;
  payment_method: ExpensePaymentMethod;
  notes: string;
  mark_paid: boolean;
  attachment: File | null;
  // ── مركز التكلفة (اختياريّ كلُّه) ──
  case_id: string;
  client_id: string;
  // النصُّ المعروض في المنتقي. يُحفظ في الحالة لا يُشتقّ عند العرض: القضيةُ تصل
  // من بحثٍ خادميّ يتغيّر بكل حرف، والعميلُ لا يصل اسمُه في قائمة المصروفات أصلاً
  // — فاشتقاقُ الاسم من نتائج اللحظة يُفرغ الحقلَ المختار بأول تغيّرٍ في البحث.
  case_label: string;
  client_label: string;
  is_billable: boolean;
}

const emptyForm = (): ExpenseForm => ({
  expense_category_id: '',
  vendor_id: '',
  description: '',
  // يومُ المستخدم المحلّي لا زولو: toISOString كانت تُرجع **أمس** لمن يسجّل
  // مصروفاً بين منتصف الليل والثالثة فجراً بتوقيت الرياض.
  expense_date: todayLocal(),
  amount: '',
  vat_amount: '',
  has_tax_invoice: true,
  vendor_invoice_number: '',
  payment_method: 'bank_transfer',
  notes: '',
  mark_paid: true,
  attachment: null,
  case_id: '',
  client_id: '',
  case_label: '',
  client_label: '',
  is_billable: false,
});

/** نصُّ القضية الموحّد — يُبنى في موضعٍ واحد كي لا تختلف تسميتُها بين البحث والتعديل. */
const caseLabelOf = (fileNumber?: string | null, title?: string | null): string => {
  const number = (fileNumber ?? '').trim();
  const name = (title ?? '').trim();
  if (name && number) return `${name} (${number})`;

  return name || (number ? `قضية ${number}` : '');
};

/** خيارٌ في منتقي القضية/العميل. */
interface PickerOption {
  id: number;
  label: string;
  sub?: string;
  /** عميلُ القضية — يُقترح بنقرةٍ ولا يُملأ تلقائياً (انظر تعليق المنتقي في النموذج). */
  clientId?: string | null;
  clientName?: string | null;
}

/**
 * قيمةٌ متأخّرة عن مصدرها — كي لا يذهب نداءُ بحثٍ إلى الخادم بكل ضغطة حرف.
 * (لا مكانَ مشتركاً لهذا في المشروع اليوم؛ نمطُه مستعارٌ من TaskLinkPicker بلا نسخِ كوده.)
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

interface PickerFieldProps {
  label: React.ReactNode;
  icon: LucideIcon;
  placeholder: string;
  /** '' = بلا اختيار. */
  selectedId: string;
  selectedLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  options: PickerOption[];
  loading?: boolean;
  errorText?: string;
  emptyText?: string;
  onSelect: (option: PickerOption) => void;
  onClear: () => void;
}

/**
 * منتقي كيانٍ واحدٍ بنمط ERP: شريحةُ المختار أو حقلُ بحثٍ بقائمةٍ منسدلة.
 *
 * مُعرَّفٌ خارج المكوّن الأب عمداً — تعريفُه داخله يُعيد إنشاء النوع بكل رسمة،
 * فيُفكَّك الحقلُ ويُعاد بناؤه ويفقد التركيز بعد كل حرفٍ يُكتب فيه.
 */
const PickerField: React.FC<PickerFieldProps> = ({
  label, icon: Icon, placeholder, selectedId, selectedLabel, query, onQueryChange,
  options, loading, errorText, emptyText, onSelect, onClear,
}) => {
  const [open, setOpen] = useState(false);
  // مرجعٌ ثابت: useClickOutside يضع handler في مصفوفة الاعتماديات، ودالّةٌ سطريّة
  // تُعيد تسجيل المستمعين بكل رسمة.
  const close = useCallback(() => setOpen(false), []);
  const ref = useRef<HTMLDivElement>(null);

  // [UX-MENU] القائمة تُرسَم في بوابةٍ فتخرج من قصّ جسم النافذة؛ و`matchWidth`
  // يُبقيها بعرض الحقل نفسه لا بعرض أطول نتيجة.
  const {
    triggerRef: anchorRef,
    menuRef: pickerRef,
    style: pickerStyle,
  } = useAnchoredMenu(open, { matchWidth: true });

  // البوابةُ تُخرج القائمة من شجرة `ref` — فيلزم فحصُ الاثنين معاً وإلا أغلقت
  // نفسَها قبل أن يصل النقرُ إلى عنصرها.
  useOutsideOfBoth([ref, pickerRef], close, open);

  return (
    <div className="fin-field" ref={ref} style={{ position: 'relative' }}>
      <label className="fin-field__label">{label}</label>

      {selectedId ? (
        <div className="fin-input" style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 35 }}>
          <Icon size={13} style={{ flexShrink: 0, color: 'var(--color-text-secondary)' }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedLabel}
          </span>
          <button
            type="button"
            className="fin-btn fin-btn--sm fin-btn--ghost fin-btn--icon"
            onClick={onClear}
            title="إزالة الاختيار"
            aria-label="إزالة الاختيار"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <>
          <div
            ref={anchorRef as React.RefObject<HTMLDivElement>}
            style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          >
            <Search
              size={13}
              style={{ position: 'absolute', insetInlineStart: 9, color: 'var(--color-text-secondary)', pointerEvents: 'none' }}
            />
            <input
              className="fin-input"
              value={query}
              onChange={(e) => { onQueryChange(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              style={{ paddingInlineStart: 28 }}
            />
            {loading && (
              <Loader2
                size={13}
                className="animate-spin"
                style={{ position: 'absolute', insetInlineEnd: 9, color: 'var(--color-text-secondary)' }}
              />
            )}
          </div>

          {/* [UX-MENU] بوابةٌ على body: النموذجُ يعيش داخل `.fin-modal__body`
              وهي `overflow-y: auto` — فقائمةُ حقلٍ قريبٍ من أسفل النافذة كانت
              تُقصّ، وهي أوّلُ ما يراه المستخدم عند ربط المصروف بقضية. */}
          {open && pickerStyle ? createPortal(
            <div
              ref={pickerRef}
              className="fin-menu__dropdown fin-menu__dropdown--floating"
              style={{ ...pickerStyle, maxHeight: 168, overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {errorText ? (
                <div className="fin-menu__item" style={{ cursor: 'default', color: 'var(--status-red)' }}>{errorText}</div>
              ) : options.length === 0 ? (
                <div className="fin-menu__item fin-cell-muted" style={{ cursor: 'default' }}>
                  {loading ? 'جارٍ البحث...' : (emptyText ?? 'لا نتائج')}
                </div>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="fin-menu__item"
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}
                    onClick={() => { onSelect(opt); setOpen(false); }}
                  >
                    <span>{opt.label}</span>
                    {opt.sub && <span className="fin-cell-muted">{opt.sub}</span>}
                  </button>
                ))
              )}
            </div>,
            document.body,
          ) : null}
        </>
      )}
    </div>
  );
};

const ExpensesTab: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { has } = usePermissionContext();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const accountingEnabled = !!user?.tenant?.accounting_enabled;
  const canManage = has(FINANCE_PERMISSIONS.expensesManage);

  const [section, setSection] = useState<'expenses' | 'vendors' | 'categories'>('expenses');

  // ── حالة قسم المصروفات ──
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  // [EXP-REBILL] «القابلة لإعادة التحصيل غير المفوترة» — يُترجَم إلى billable_only
  // في الباك، وهو نفسُه scopeRebillable الذي تقرأ منه نافذةُ الضمّ للفاتورة.
  const [billableOnly, setBillableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm());
  // بحثُ منتقيَي مركز التكلفة (القضية خادميّ، والعميل محلّيّ فوق قائمةٍ كاملة).
  const [caseQuery, setCaseQuery] = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const debouncedCaseQuery = useDebouncedValue(caseQuery, 300);
  // عميلُ القضية المختارة — يُعرض اقتراحاً بنقرة لا يُملأ تلقائياً (التعليل عند عرضه).
  const [caseClientHint, setCaseClientHint] = useState<{ id: string; name: string } | null>(null);
  // هل عدّل المستخدمُ الضريبةَ يدوياً؟ متى فعل توقّف الحسابُ التلقائي (١٥٪) كي
  // لا يطمس إدخاله عند تغيير المبلغ بعده.
  const [vatTouched, setVatTouched] = useState(false);
  const [payTarget, setPayTarget] = useState<Expense | null>(null);
  const [payMethod, setPayMethod] = useState<ExpensePaymentMethod>('bank_transfer');
  const [cancelTarget, setCancelTarget] = useState<Expense | null>(null);

  // ── حالة الموردين/التصنيفات ──
  const [vendorForm, setVendorForm] = useState<Partial<Vendor> | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['accounting'] });

  // ─────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────

  const { data: categoriesData } = useQuery({
    queryKey: ['accounting', 'categories'],
    queryFn: () => accountingService.getCategories(),
    enabled: accountingEnabled,
  });
  const categories = useMemo(() => categoriesData?.data ?? [], [categoriesData]);

  const expensesFilter = {
    search: search || undefined,
    status: status || undefined,
    category_id: categoryId ? Number(categoryId) : undefined,
    billable_only: billableOnly || undefined,
    page,
    per_page: 15,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['accounting', 'expenses', expensesFilter],
    queryFn: () => accountingService.getExpenses(expensesFilter),
    enabled: accountingEnabled && section === 'expenses',
  });

  const { data: statsData } = useQuery({
    queryKey: ['accounting', 'expenseStats'],
    queryFn: () => accountingService.getExpenseStats(),
    enabled: accountingEnabled && section === 'expenses',
  });

  const { data: vendorsData, isLoading: vendorsLoading, isError: vendorsError, refetch: refetchVendors } = useQuery({
    queryKey: ['accounting', 'vendors'],
    queryFn: () => accountingService.getVendors({ per_page: 100 }),
    enabled: accountingEnabled && section === 'vendors',
  });

  const expenses = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const lastPage = data?.data?.last_page ?? 1;
  const stats = statsData?.data;
  const vendors = vendorsData?.data?.data ?? [];

  // قائمة الموردين للاختيار داخل النموذج (تُجلب عند فتح النموذج فقط)
  const { data: vendorOptionsData } = useQuery({
    queryKey: ['accounting', 'vendorOptions'],
    queryFn: () => accountingService.getVendors({ active_only: true, per_page: 100 }),
    enabled: accountingEnabled && showForm,
  });
  const vendorOptions = vendorOptionsData?.data?.data ?? [];

  // ── مركز التكلفة: خيارات القضية والعميل ──
  //
  // القضايا بحثٌ **خادميّ**: المكتب قد يملك آلافاً و/cases يسقّف الصفحة بـ100،
  // فقائمةٌ محلّيةٌ تُخفي أكثرَ ممّا تُظهر. والعملاء قائمةٌ كاملةٌ واحدة تُفلتر
  // محلّياً — وهو نمطُ المشروع القائم (/auth/clients بلا ترقيم، وTaskLinkPicker
  // وCreateInvoiceModal كلاهما يفعلها).
  const {
    data: caseSearchData, isFetching: casesFetching, isError: casesError,
  } = useQuery({
    queryKey: ['accounting', 'expenseCaseOptions', debouncedCaseQuery],
    queryFn: () => CaseService.getCases({ search: debouncedCaseQuery || undefined, limit: 10 }),
    enabled: accountingEnabled && showForm,
    staleTime: 60_000,
  });

  const caseOptions = useMemo<PickerOption[]>(
    () => (caseSearchData?.data ?? []).map((c) => ({
      id: Number(c.id),
      label: caseLabelOf(c.file_number, c.title),
      sub: [c.client_name, c.court].filter(Boolean).join(' · ') || undefined,
      clientId: c.client_id ? String(c.client_id) : null,
      clientName: c.client_name || null,
    })),
    [caseSearchData],
  );

  const {
    data: clientListData, isFetching: clientsFetching, isError: clientsError,
  } = useQuery({
    queryKey: ['accounting', 'expenseClientOptions'],
    queryFn: () => UserService.getClients(),
    enabled: accountingEnabled && showForm,
    staleTime: 5 * 60_000,
  });

  const clientOptions = useMemo<PickerOption[]>(() => {
    const term = clientQuery.trim();
    const all = (clientListData ?? []).map((u) => ({
      id: Number(u.id),
      label: u.name,
      sub: u.phone || undefined,
    }));

    return (term
      ? all.filter((o) => o.label?.includes(term) || String(o.sub ?? '').includes(term))
      : all
    ).slice(0, 12);
  }, [clientListData, clientQuery]);

  // اسمُ العميل لا يصل في قائمة المصروفات (`client` تُحمَّل في /expenses/{id} وحده)،
  // فنستخرجه من قائمة العملاء متى وصلت — وإلا عُرض حقلٌ مختارٌ بلا اسمٍ عند التعديل.
  useEffect(() => {
    if (!showForm || !form.client_id || form.client_label) return;
    const match = (clientListData ?? []).find((u) => String(u.id) === form.client_id);
    if (!match) return;
    setForm((f) => (f.client_id === String(match.id) && !f.client_label
      ? { ...f, client_label: match.name || `عميل #${match.id}` }
      : f));
  }, [showForm, form.client_id, form.client_label, clientListData]);

  // ─────────────────────────────────────────────────────────
  // Mutations — المصروفات
  // ─────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.expense_category_id || !form.description || !form.amount) {
        throw new Error('التصنيف والوصف والمبلغ حقول إلزامية');
      }

      if (editTarget) {
        // تعديل مسودة — JSON (بلا مرفق جديد لتبسيط المسار؛ المرفق عند الإنشاء)
        return accountingService.updateExpense(editTarget.id, {
          expense_category_id: Number(form.expense_category_id),
          vendor_id: form.vendor_id ? Number(form.vendor_id) : null,
          description: form.description,
          expense_date: form.expense_date,
          amount: Number(form.amount),
          vat_amount: Number(form.vat_amount || 0),
          has_tax_invoice: form.has_tax_invoice,
          vendor_invoice_number: form.vendor_invoice_number || null,
          payment_method: form.payment_method,
          // `null` صريحةٌ لا حذفُ المفتاح: تحقّقُ الباك يقرأ ما وصل فقط، فالمفتاحُ
          // الغائب يُبقي القيمةَ القديمة — أي أن «فكّ الربط بالقضية» يصير بلا أثر.
          case_id: form.case_id ? Number(form.case_id) : null,
          client_id: form.client_id ? Number(form.client_id) : null,
          is_billable: form.is_billable,
          notes: form.notes || null,
        });
      }

      const fd = new FormData();
      fd.append('expense_category_id', form.expense_category_id);
      if (form.vendor_id) fd.append('vendor_id', form.vendor_id);
      fd.append('description', form.description);
      fd.append('expense_date', form.expense_date);
      fd.append('amount', form.amount);
      fd.append('vat_amount', form.vat_amount || '0');
      fd.append('has_tax_invoice', form.has_tax_invoice ? '1' : '0');
      if (form.vendor_invoice_number) fd.append('vendor_invoice_number', form.vendor_invoice_number);
      fd.append('payment_method', form.payment_method);
      if (form.case_id) fd.append('case_id', form.case_id);
      if (form.client_id) fd.append('client_id', form.client_id);
      fd.append('is_billable', form.is_billable ? '1' : '0');
      if (form.notes) fd.append('notes', form.notes);
      if (form.mark_paid) fd.append('mark_paid', '1');
      if (form.attachment) fd.append('attachment', form.attachment);

      return accountingService.createExpense(fd);
    },
    onSuccess: () => {
      toast.success(editTarget ? 'تم تحديث المصروف' : 'تم تسجيل المصروف');
      invalidate();
      closeForm();
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حفظ المصروف'),
  });

  const payMutation = useMutation({
    mutationFn: () => accountingService.markExpensePaid(payTarget!.id, payMethod),
    onSuccess: () => {
      toast.success('تم تعليم المصروف مدفوعاً وتوليد قيده');
      invalidate();
      setPayTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الدفع'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => accountingService.cancelExpense(cancelTarget!.id),
    onSuccess: () => {
      toast.success('أُلغي المصروف' + (cancelTarget?.status === 'paid' ? ' وعُكس قيده' : ''));
      invalidate();
      setCancelTarget(null);
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الإلغاء'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => accountingService.deleteExpense(id),
    onSuccess: () => { toast.success('حُذفت المسودة'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الحذف'),
  });

  // ─────────────────────────────────────────────────────────
  // Mutations — الموردون والتصنيفات
  // ─────────────────────────────────────────────────────────

  const saveVendorMutation = useMutation({
    mutationFn: () => {
      const payload = vendorForm as Vendor;
      if (!payload?.name) throw new Error('اسم المورد إلزامي');
      return payload.id
        ? accountingService.updateVendor(payload.id, payload)
        : accountingService.createVendor(payload as Vendor & { name: string });
    },
    onSuccess: () => {
      toast.success('تم حفظ المورد');
      invalidate();
      setVendorForm(null);
    },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حفظ المورد'),
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id: number) => accountingService.deleteVendor(id),
    onSuccess: () => { toast.success('حُذف المورد'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الحذف'),
  });

  const createCategoryMutation = useMutation({
    mutationFn: () => {
      if (!categoryName.trim()) throw new Error('اسم التصنيف إلزامي');
      return accountingService.createCategory({ name: categoryName.trim() });
    },
    onSuccess: () => { toast.success('أُضيف التصنيف'); setCategoryName(''); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر إضافة التصنيف'),
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: (cat: ExpenseCategory) => accountingService.updateCategory(cat.id, { is_active: !cat.is_active }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => accountingService.deleteCategory(id),
    onSuccess: () => { toast.success('حُذف التصنيف'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الحذف'),
  });

  // ─────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────

  const resetPickers = () => {
    setCaseQuery('');
    setClientQuery('');
    setCaseClientHint(null);
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setVatTouched(false);
    resetPickers();
    setShowForm(true);
  };

  const openEdit = (expense: Expense) => {
    // [EXP-REBILL] نثريةٌ حُمِّلت على فاتورة لا تُعدَّل من هنا: مبلغُها صار بنداً في
    // فاتورة العميل، ورابطُها بالقضية/العميل هو ما يمنع تحصيلَها مرّتين — فتعديلُ
    // أيّهما يفكّ ما ربطته الفاتورة بلا أن يتغيّر فيها شيء. (والباك يردّ ٤٢٢ على أيّ
    // تعديلٍ لغير المسودّة أصلاً، والمفوترةُ مدفوعةٌ حتماً — فهذا حزامٌ ثانٍ لا بديل.)
    if (expense.rebilled_invoice_id) {
      toast.error('هذه النثرية مُحمَّلة على فاتورة — أزِل بندها من الفاتورة قبل تعديلها');

      return;
    }

    setEditTarget(expense);
    resetPickers();
    // مصروفٌ قائم: ضريبتُه مُقرَّرةٌ سلفاً (وقد تخالف ١٥٪ عن قصد) — لا يجوز أن
    // يطمسها الحسابُ التلقائي لو غُيِّر المبلغ، فنعدّها «ملموسة» من البداية.
    setVatTouched(true);
    setForm({
      expense_category_id: String(expense.expense_category_id),
      vendor_id: expense.vendor_id ? String(expense.vendor_id) : '',
      description: expense.description,
      // العطلُ التراكمي: التاريخ يُقرأ من الخادم ثم يُعاد إليه في كل تعديل، وكان
      // القصُّ الأعمى لصيغة ISO الزولوية يحطّ منه يوماً في **كل مرّة** — مسودّةٌ
      // عُدِّلت ثلاثاً تنزل ثلاثة أيام. toDayString تُثبّت اليوم كما هو.
      expense_date: toDayString(expense.expense_date) || todayLocal(),
      amount: String(expense.amount),
      vat_amount: String(expense.vat_amount ?? ''),
      has_tax_invoice: expense.has_tax_invoice,
      vendor_invoice_number: expense.vendor_invoice_number ?? '',
      payment_method: expense.payment_method ?? 'bank_transfer',
      notes: expense.notes ?? '',
      mark_paid: false,
      attachment: null,
      case_id: expense.case_id ? String(expense.case_id) : '',
      client_id: expense.client_id ? String(expense.client_id) : '',
      // `caseModel` تصل محمَّلةً في قائمة المصروفات، فاسمُ القضية جاهزٌ بلا نداء.
      // واسمُ العميل يُستكمل من قائمة العملاء في الأثر أعلاه (لا يصل في القائمة).
      case_label: expense.case_model
        ? caseLabelOf(expense.case_model.file_number, expense.case_model.title)
        : (expense.case_id ? `قضية #${expense.case_id}` : ''),
      client_label: expense.client?.name ?? '',
      is_billable: !!expense.is_billable,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    resetPickers();
    if (searchParams.get('new')) {
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const totalWithVat = (Number(form.amount) || 0) + (Number(form.vat_amount) || 0);

  // ما سيُحمَّل على العميل عند الضمّ للفاتورة — صورةٌ طبق الأصل من
  // Expense::rebillableAmount في الباك: ذو الفاتورة الضريبية يُعاد **صافياً** (ضريبتُه
  // خُصمت مدخلاتٍ فلم يتحمّلها المكتب)، وعديمُها يُعاد **إجمالياً** (ضريبتُه كلفةٌ
  // فعلية). عرضُ الرقم هنا لا حسابُه: القاعدةُ تبقى في الباك، والواجهةُ تُظهرها قبل
  // الحفظ كي لا يُفاجأ من وسم النثرية بمبلغٍ غير الذي توقّعه.
  const rebillableAmount = form.has_tax_invoice ? (Number(form.amount) || 0) : totalWithVat;

  // ─────────────────────────────────────────────────────────
  // حقل الضريبة: حسابٌ تلقائيّ لا خانةٌ حرّة
  //
  // كان الحقل مبلغاً حرّاً بعنوان «الضريبة (15%)» والـ١٥٪ مجرّدُ تلميحٍ رماديّ
  // (placeholder) لا قيمة — فأيُّ رقمٍ يُكتب يُجمع على المبلغ بلا أيّ ربطٍ به.
  // والأثر ليس تجميلياً: `vat_amount` يدخل خانةَ «ضريبة المدخلات» في الإقرار
  // الضريبي مباشرةً، فخانةُ خصمٍ نظاميّةٌ كانت قابلةً للاختلاق برقمٍ عشوائي.
  //
  // الآن: تُحسب ١٥٪ تلقائياً من المبلغ، وتبقى قابلةً للتعديل اليدوي (فروق
  // التقريب في فاتورة المورّد، أو مورّدٌ غير مسجَّل ⇒ «معفاة»)، ومتى عدّلها
  // المستخدم توقّف الحسابُ التلقائي كي لا يطمس إدخاله.
  // ─────────────────────────────────────────────────────────
  const VAT_RATE = 0.15;
  const vatFor = (amount: string): string => {
    const n = Number(amount);

    return Number.isFinite(n) && n > 0 ? (n * VAT_RATE).toFixed(2) : '';
  };

  const onAmountChange = (value: string) => {
    setForm((f) => ({ ...f, amount: value, vat_amount: vatTouched ? f.vat_amount : vatFor(value) }));
  };

  const onVatChange = (value: string) => {
    setVatTouched(true);
    setForm((f) => ({ ...f, vat_amount: value }));
  };

  // تحذيرٌ لا منع: قد تكون هناك حالاتٌ مشروعة (رسومٌ حكومية بضريبةٍ مختلفة)،
  // لكنّ ضريبةً تفوق المبلغَ نفسَه خطأُ إدخالٍ دائماً.
  const vatWarning: string | null = (() => {
    const amount = Number(form.amount) || 0;
    const vat = Number(form.vat_amount) || 0;
    if (amount <= 0 || vat <= 0) return null;
    if (vat > amount) return 'الضريبة أكبر من المبلغ نفسه — تحقّق من الرقم.';
    const expected = amount * VAT_RATE;
    if (Math.abs(vat - expected) > Math.max(0.02, expected * 0.02)) {
      return `النسبة ${((vat / amount) * 100).toFixed(1)}٪ لا ١٥٪ — تأكّد من فاتورة المورّد.`;
    }

    return null;
  })();

  // ─────────────────────────────────────────────────────────
  // الأعمدة
  // ─────────────────────────────────────────────────────────

  const columns = useMemo<Column<Expense>[]>(() => [
    {
      key: 'number',
      header: 'الرقم',
      render: (e) => (
        <div>
          <div className="fin-cell-strong">{e.expense_number}</div>
          {/* متسامحٌ مع الصيغتين: نصُّ YYYY-MM-DD أو ISO كامل — لا قصَّ أعمى */}
          <div className="fin-cell-muted">{toDayString(e.expense_date)}</div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'الوصف',
      render: (e) => (
        <div>
          <div className="fin-cell-strong">
            {e.description}
            {e.attachment_path && <Paperclip size={12} style={{ marginInlineStart: 4, opacity: 0.6 }} />}
          </div>
          {/* القضيةُ نُقلت إلى عمود «مركز التكلفة» — ذكرُها هنا وهناك يُكرّرها في
              خليّتين متجاورتين ويُضيّق الوصف بلا فائدة. */}
          <div className="fin-cell-muted">
            {e.category?.name}
            {e.vendor ? ` · ${e.vendor.name}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'cost_center',
      header: 'مركز التكلفة',
      render: (e) => {
        const invoiceId = e.rebilled_invoice_id;

        return (
          <div>
            <div className="fin-cell-strong" style={{ fontSize: 12 }}>
              {e.case_model
                ? `قضية ${e.case_model.file_number}`
                : (e.client?.name ?? <span className="fin-cell-muted">—</span>)}
            </div>
            <div style={{ marginTop: 3 }}>
              {invoiceId ? (
                <button
                  type="button"
                  className="fin-btn fin-btn--sm fin-btn--ghost"
                  style={{ padding: '2px 6px', color: 'var(--status-green)' }}
                  title="فتح الفاتورة التي حُمِّلت عليها هذه النثرية"
                  onClick={(ev) => { ev.stopPropagation(); navigate(`/finance/invoices/${invoiceId}`); }}
                >
                  <Receipt size={12} />
                  {/* رقمُ الفاتورة لا يصل في قائمة المصروفات (`rebilledInvoice` تُحمَّل
                      في /expenses/{id} وحده)، فنكتب «مفوترة» ونفتحها بالمعرِّف بدل طبع
                      معرِّفٍ داخليٍّ يقرؤه المحاسب كأنه رقمُ الفاتورة. */}
                  {e.rebilled_invoice?.invoice_number ?? 'مفوترة'}
                </button>
              ) : !e.is_billable ? (
                <span className="fin-cell-muted">غير قابلة للتحصيل</span>
              ) : e.status === 'paid' ? (
                <ToneBadge tone="warning">لم تُفوتَر بعد</ToneBadge>
              ) : e.status === 'draft' ? (
                // شرطُ scopeRebillable الثالث: المسوّدة لم تُصرف ولا قيدَ لها، فتحميلُها
                // على العميل تحصيلُ مالٍ لم يُنفَق. نقولها هنا كي لا يُسأل: لماذا لا
                // أجدها في نافذة الضمّ للفاتورة؟
                <span className="fin-cell-muted">قابلة — بعد الدفع</span>
              ) : (
                <span className="fin-cell-muted">—</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'الصافي',
      numeric: true,
      align: 'end',
      render: (e) => formatSAR(e.amount),
    },
    {
      key: 'vat',
      header: 'الضريبة',
      numeric: true,
      align: 'end',
      render: (e) => (
        <div>
          <div>{formatSAR(e.vat_amount)}</div>
          {!e.has_tax_invoice && Number(e.vat_amount) > 0 && (
            <div className="fin-cell-muted">بلا فاتورة ضريبية</div>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: 'الإجمالي',
      numeric: true,
      align: 'end',
      render: (e) => <strong>{formatSAR(e.total_amount)}</strong>,
    },
    {
      key: 'status',
      header: 'الحالة',
      align: 'center',
      render: (e) => {
        const meta = STATUS_META[e.status] ?? { label: e.status, tone: 'neutral' as const };
        return <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (e) => canManage ? (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {e.status === 'draft' && (
            <>
              <button type="button" className="fin-btn fin-btn--sm fin-btn--success" title="تعليمه مدفوعاً (يولّد القيد)"
                onClick={(ev) => { ev.stopPropagation(); setPayTarget(e); setPayMethod(e.payment_method ?? 'bank_transfer'); }}>
                <CheckCircle2 size={14} /> دفع
              </button>
              <button type="button" className="fin-btn fin-btn--sm fin-btn--icon" title="تعديل"
                onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}>
                <Pencil size={14} />
              </button>
              <button type="button" className="fin-btn fin-btn--sm fin-btn--icon" title="حذف المسودة"
                onClick={(ev) => { ev.stopPropagation(); if (window.confirm('حذف المسودة؟')) deleteMutation.mutate(e.id); }}>
                <Trash2 size={14} />
              </button>
            </>
          )}
          {e.status === 'paid' && (
            <button type="button" className="fin-btn fin-btn--sm fin-btn--danger" title="إلغاء (يعكس القيد)"
              onClick={(ev) => { ev.stopPropagation(); setCancelTarget(e); }}>
              <Ban size={14} /> إلغاء
            </button>
          )}
        </div>
      ) : null,
    },
  ], [canManage, deleteMutation, navigate]);

  const vendorColumns = useMemo<Column<Vendor>[]>(() => [
    { key: 'name', header: 'المورد', render: (v) => <span className="fin-cell-strong">{v.name}</span> },
    { key: 'vat', header: 'الرقم الضريبي', render: (v) => v.vat_number || '—' },
    { key: 'phone', header: 'الجوال', render: (v) => v.phone || '—' },
    { key: 'count', header: 'مصروفاته', align: 'center', render: (v) => v.expenses_count ?? 0 },
    {
      key: 'active',
      header: 'الحالة',
      align: 'center',
      render: (v) => <ToneBadge tone={v.is_active ? 'success' : 'neutral'}>{v.is_active ? 'نشط' : 'معطّل'}</ToneBadge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (v) => canManage ? (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <button type="button" className="fin-btn fin-btn--sm fin-btn--icon" title="تعديل"
            onClick={() => setVendorForm(v)}>
            <Pencil size={14} />
          </button>
          <button type="button" className="fin-btn fin-btn--sm fin-btn--icon" title="حذف"
            onClick={() => { if (window.confirm(`حذف المورد «${v.name}»؟`)) deleteVendorMutation.mutate(v.id); }}>
            <Trash2 size={14} />
          </button>
        </div>
      ) : null,
    },
  ], [canManage, deleteVendorMutation]);

  const categoryColumns = useMemo<Column<ExpenseCategory>[]>(() => [
    {
      key: 'name',
      header: 'التصنيف',
      render: (c) => (
        <span className="fin-cell-strong">
          {c.name}
          {c.system_code && <span className="fin-cell-muted" style={{ marginInlineStart: 6 }}>(افتراضي)</span>}
        </span>
      ),
    },
    { key: 'count', header: 'مصروفاته', align: 'center', render: (c) => c.expenses_count ?? 0 },
    {
      key: 'active',
      header: 'الحالة',
      align: 'center',
      render: (c) => <ToneBadge tone={c.is_active ? 'success' : 'neutral'}>{c.is_active ? 'نشط' : 'معطّل'}</ToneBadge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (c) => canManage ? (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          <button type="button" className="fin-btn fin-btn--sm" onClick={() => toggleCategoryMutation.mutate(c)}>
            {c.is_active ? 'تعطيل' : 'تفعيل'}
          </button>
          {!c.system_code && (
            <button type="button" className="fin-btn fin-btn--sm fin-btn--icon" title="حذف"
              onClick={() => { if (window.confirm(`حذف التصنيف «${c.name}»؟`)) deleteCategoryMutation.mutate(c.id); }}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ) : null,
    },
  ], [canManage, toggleCategoryMutation, deleteCategoryMutation]);

  // ─────────────────────────────────────────────────────────
  // العرض
  // ─────────────────────────────────────────────────────────

  if (!accountingEnabled) {
    return (
      <EmptyState
        icon={Landmark}
        title="وحدة المحاسبة غير مفعّلة"
        desc="المصروفات والقيود والإقرار الضريبي جزء من وحدة المحاسبة — تواصل مع إدارة النظام لتفعيلها لشركتك."
      />
    );
  }

  return (
    <div>
      {/* أقسام فرعية: المصروفات | الموردون | التصنيفات */}
      <div className="fin-subtabs" role="tablist">
        <button type="button" role="tab" aria-selected={section === 'expenses'}
          className={`fin-subtab${section === 'expenses' ? ' fin-subtab--active' : ''}`}
          onClick={() => setSection('expenses')}>
          <ReceiptText size={14} /> المصروفات
        </button>
        <button type="button" role="tab" aria-selected={section === 'vendors'}
          className={`fin-subtab${section === 'vendors' ? ' fin-subtab--active' : ''}`}
          onClick={() => setSection('vendors')}>
          <Truck size={14} /> الموردون
        </button>
        <button type="button" role="tab" aria-selected={section === 'categories'}
          className={`fin-subtab${section === 'categories' ? ' fin-subtab--active' : ''}`}
          onClick={() => setSection('categories')}>
          <Tags size={14} /> التصنيفات
        </button>
      </div>

      {section === 'expenses' && (
        <>
          {stats && (
            <StatCardGrid>
              <StatCard icon={Wallet} value={formatSAR(stats.total)} label={`إجمالي مصروفات السنة (${stats.count})`} tone="info" />
              <StatCard icon={ReceiptText} value={formatSAR(stats.net)} label="الصافي قبل الضريبة" tone="neutral" />
              <StatCard icon={Landmark} value={formatSAR(stats.vat)} label="ضريبة مدفوعة (مدخلات)" tone="purple" />
              <StatCard icon={FileWarning} value={stats.draft_count} label="مسودات غير مدفوعة" tone="warning" valueTone={stats.draft_count > 0 ? 'warning' : undefined} />
            </StatCardGrid>
          )}

          <FilterBar
            search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'بحث برقم المصروف أو الوصف...' }}
            selects={[
              {
                value: status,
                onChange: (v) => { setStatus(v); setPage(1); },
                options: [
                  { value: '', label: 'كل الحالات' },
                  { value: 'draft', label: 'مسودة' },
                  { value: 'paid', label: 'مدفوع' },
                  { value: 'cancelled', label: 'ملغى' },
                ],
                ariaLabel: 'فلتر الحالة',
              },
              {
                value: categoryId,
                onChange: (v) => { setCategoryId(v); setPage(1); },
                options: [
                  { value: '', label: 'كل التصنيفات' },
                  ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                ],
                ariaLabel: 'فلتر التصنيف',
              },
              {
                value: billableOnly ? '1' : '',
                onChange: (v) => {
                  const on = v === '1';
                  setBillableOnly(on);
                  // الفلترُ الخادميّ (scopeRebillable) يشترط `paid` ضمناً، فترْكُ
                  // «مسودة» مختارةً معه يُرجع قائمةً فارغةً بلا سببٍ ظاهر. نُظهر
                  // الشرطَ في فلتر الحالة بدل أن نُخفيه ونترك المستخدم يحزره.
                  if (on) setStatus('paid');
                  setPage(1);
                },
                options: [
                  { value: '', label: 'كل النثريات' },
                  { value: '1', label: 'قابلة للتحصيل — لم تُفوتَر' },
                ],
                ariaLabel: 'فلتر إعادة التحصيل',
              },
            ]}
            actions={canManage && (
              <button type="button" className="fin-btn fin-btn--primary" onClick={openCreate}>
                <Plus size={15} /> مصروف جديد
              </button>
            )}
          />

          <DataTable
            columns={columns}
            data={expenses}
            rowKey={(e) => e.id}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            emptyIcon={Wallet}
            emptyTitle={billableOnly ? 'لا نثريات بانتظار التحصيل' : 'لا مصروفات بعد'}
            emptyDesc={billableOnly
              ? 'الشرط ثلاثيّ: النثرية موسومة «قابلة لإعادة التحصيل»، ومدفوعة فعلاً، ولم تُضَف لفاتورةٍ بعد.'
              : 'سجّل أول مصروف — رسوم حكومية، إيجار، اشتراكات...'}
            footer={<Pagination page={page} lastPage={lastPage} total={total} onChange={setPage} />}
          />
        </>
      )}

      {section === 'vendors' && (
        <>
          <FilterBar
            actions={canManage && (
              <button type="button" className="fin-btn fin-btn--primary" onClick={() => setVendorForm({ is_active: true })}>
                <Plus size={15} /> مورد جديد
              </button>
            )}
          />
          <DataTable
            columns={vendorColumns}
            data={vendors}
            rowKey={(v) => v.id}
            isLoading={vendorsLoading}
            isError={vendorsError}
            onRetry={refetchVendors}
            emptyIcon={Truck}
            emptyTitle="لا موردون بعد"
            emptyDesc="أضف الموردين الذين تتعامل معهم (مكاتب خبرة، مترجمون، مؤجّر المكتب...)"
          />
        </>
      )}

      {section === 'categories' && (
        <>
          {canManage && (
            <div className="fin-filterbar">
              <input
                className="fin-input"
                style={{ maxWidth: 280 }}
                placeholder="اسم تصنيف جديد..."
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createCategoryMutation.mutate()}
              />
              <button type="button" className="fin-btn fin-btn--primary" onClick={() => createCategoryMutation.mutate()}
                disabled={createCategoryMutation.isPending}>
                <Plus size={15} /> إضافة
              </button>
            </div>
          )}
          <DataTable
            columns={categoryColumns}
            data={categories}
            rowKey={(c) => c.id}
            emptyTitle="لا تصنيفات"
          />
        </>
      )}

      {/* ── مودال إنشاء/تعديل مصروف ── */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editTarget ? `تعديل ${editTarget.expense_number}` : 'مصروف جديد'}
        icon={Wallet}
        size="wide"
        footerAlign="end"
        footer={(
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={closeForm}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--primary" disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? 'جارٍ الحفظ...' : (editTarget ? 'حفظ التعديلات' : (form.mark_paid ? 'تسجيل ودفع' : 'حفظ كمسودة'))}
            </button>
          </>
        )}
      >
        <div className="fin-grid fin-grid--2">
          <div className="fin-field">
            <label className="fin-field__label">التصنيف<span className="req">*</span></label>
            <select value={form.expense_category_id}
              onChange={(e) => setForm({ ...form, expense_category_id: e.target.value })}>
              <option value="">— اختر —</option>
              {categories.filter((c) => c.is_active).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="fin-field">
            <label className="fin-field__label">المورد</label>
            <select value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
              <option value="">— بدون —</option>
              {vendorOptions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="fin-field fin-grid__full">
            <label className="fin-field__label">الوصف<span className="req">*</span></label>
            <input className="fin-input" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="مثال: رسوم تنفيذ — قضية 4520" />
          </div>
          <div className="fin-field">
            <label className="fin-field__label">التاريخ<span className="req">*</span></label>
            <input className="fin-input" type="date" value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
          </div>
          <div className="fin-field">
            <label className="fin-field__label">طريقة الدفع</label>
            <select value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value as ExpensePaymentMethod })}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="fin-field">
            <label className="fin-field__label">المبلغ (قبل الضريبة)<span className="req">*</span></label>
            <input className="fin-input" type="number" min="0.01" step="0.01" value={form.amount}
              onChange={(e) => onAmountChange(e.target.value)} />
          </div>
          <div className="fin-field">
            <label className="fin-field__label">
              ضريبة القيمة المضافة
              {/* `--fin-muted` لا يعرّفه أيُّ ملف ستايل في المستودع — ومتغيّرٌ غير
                  معرَّفٍ يسقط عند الحساب فيرث لونَ النصّ الأصيل، فيبدو التلميحُ
                  الرماديُّ جزءاً من عنوان الحقل. `--color-text-secondary` هو الرمز
                  الذي تستعمله `.fin-cell-muted` نفسُها. */}
              {!vatTouched && Number(form.amount) > 0 ? (
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}> — تُحسب تلقائياً ١٥٪</span>
              ) : null}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input className="fin-input" type="number" min="0" step="0.01" value={form.vat_amount}
                onChange={(e) => onVatChange(e.target.value)}
                placeholder="0.00" style={{ flex: 1 }} />
              <button type="button" className="fin-btn fin-btn--ghost" style={{ whiteSpace: 'nowrap' }}
                disabled={!(Number(form.amount) > 0)}
                onClick={() => { setVatTouched(false); setForm((f) => ({ ...f, vat_amount: vatFor(f.amount) })); }}>
                ١٥٪
              </button>
              <button type="button" className="fin-btn fin-btn--ghost"
                onClick={() => { setVatTouched(true); setForm((f) => ({ ...f, vat_amount: '0' })); }}>
                معفاة
              </button>
            </div>
            {/* `--status-orange` معرَّفٌ في الثيمات الثلاثة، بدل `--fin-warning` الذي
                لا يعرّفه ملفٌ فكان اللونُ يأتي من الاحتياط الستّ عشري وحده. */}
            {vatWarning ? (
              <div style={{ color: 'var(--status-orange)', fontSize: 12, marginTop: 4 }}>
                ⚠ {vatWarning}
              </div>
            ) : null}
          </div>
          <div className="fin-field">
            <label className="fin-field__label">رقم فاتورة المورد</label>
            <input className="fin-input" value={form.vendor_invoice_number}
              onChange={(e) => setForm({ ...form, vendor_invoice_number: e.target.value })} />
          </div>
          <div className="fin-field">
            <label className="fin-field__label">الإجمالي</label>
            <div className="fin-input" style={{ display: 'flex', alignItems: 'center', fontWeight: 700 }}>
              {formatSAR(totalWithVat)}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input className="fin-checkbox" type="checkbox" checked={form.has_tax_invoice}
              onChange={(e) => setForm({ ...form, has_tax_invoice: e.target.checked })} />
            فاتورة ضريبية من المورد (تُخصم ضريبتها في الإقرار)
          </label>
          {!editTarget && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input className="fin-checkbox" type="checkbox" checked={form.mark_paid}
                onChange={(e) => setForm({ ...form, mark_paid: e.target.checked })} />
              مدفوع فعلاً (يولّد القيد المحاسبي فوراً)
            </label>
          )}

          {/* ── مركز التكلفة وإعادة التحصيل ── */}
          <div
            className="fin-grid__full"
            style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 2 }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-heading)', marginBottom: 8 }}>
              مركز التكلفة وإعادة التحصيل
            </div>

            <div className="fin-grid fin-grid--2">
              <PickerField
                label="القضية"
                icon={Briefcase}
                placeholder="ابحث برقم الملف أو عنوان القضية..."
                selectedId={form.case_id}
                selectedLabel={form.case_label}
                query={caseQuery}
                onQueryChange={setCaseQuery}
                options={caseOptions}
                loading={casesFetching}
                errorText={casesError ? 'تعذّر جلب القضايا — تحقّق من صلاحية عرض القضايا' : undefined}
                emptyText={caseQuery ? 'لا قضية بهذا البحث' : 'اكتب للبحث في القضايا'}
                onSelect={(opt) => {
                  setForm((f) => ({ ...f, case_id: String(opt.id), case_label: opt.label }));
                  setCaseClientHint(opt.clientId && opt.clientName
                    ? { id: opt.clientId, name: opt.clientName }
                    : null);
                }}
                onClear={() => {
                  setForm((f) => ({ ...f, case_id: '', case_label: '' }));
                  setCaseQuery('');
                  setCaseClientHint(null);
                }}
              />

              <PickerField
                label="العميل"
                icon={UserRound}
                placeholder="ابحث بالاسم أو الجوال..."
                selectedId={form.client_id}
                selectedLabel={form.client_label || (form.client_id ? `عميل #${form.client_id}` : '')}
                query={clientQuery}
                onQueryChange={setClientQuery}
                options={clientOptions}
                loading={clientsFetching}
                errorText={clientsError ? 'تعذّر جلب العملاء — تحقّق من الصلاحيات' : undefined}
                emptyText={clientQuery ? 'لا عميل بهذا البحث' : 'لا عملاء'}
                onSelect={(opt) => setForm((f) => ({ ...f, client_id: String(opt.id), client_label: opt.label }))}
                onClear={() => { setForm((f) => ({ ...f, client_id: '', client_label: '' })); setClientQuery(''); }}
              />

              {/*
                العميل لا يُملأ تلقائياً من القضية بل يُقترح بنقرة: حارسُ إعادة التحصيل
                في الباك يرفض نثريةً `client_id`ها يخالف عميلَ الفاتورة، والقضيةُ قد
                تكون متعدّدةَ الموكّلين — فعميلٌ مملوءٌ آلياً بالخطأ **يحجب** التحصيل
                بينما الفارغُ يمرّ دائماً. الاقتراحُ يُري ما في القضية بلا أن يقرّر عنه.
              */}
              {caseClientHint && form.client_id !== caseClientHint.id && (
                <div
                  className="fin-grid__full fin-cell-muted"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                >
                  <span>عميل القضية المختارة: <strong>{caseClientHint.name}</strong></span>
                  <button
                    type="button"
                    className="fin-btn fin-btn--sm fin-btn--ghost"
                    onClick={() => setForm((f) => ({
                      ...f, client_id: caseClientHint.id, client_label: caseClientHint.name,
                    }))}
                  >
                    اجعله عميل النثرية
                  </button>
                </div>
              )}

              <label
                className="fin-grid__full"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}
              >
                <input className="fin-checkbox" type="checkbox" checked={form.is_billable}
                  onChange={(e) => setForm({ ...form, is_billable: e.target.checked })} />
                قابلة لإعادة التحصيل من العميل
              </label>

              {form.is_billable && (
                <div className="fin-grid__full fin-cell-muted" style={{ lineHeight: 1.7 }}>
                  تُضاف إلى فاتورة العميل بمبلغ <strong>{formatSAR(rebillableAmount)}</strong>
                  {form.has_tax_invoice
                    ? ' — الصافي قبل الضريبة، لأنّ ضريبة المدخلات تُخصم أمام الهيئة فلم يتحمّلها المكتب.'
                    : ' — الإجمالي بالضريبة، لأنّه بلا فاتورة ضريبية فالضريبة كلفةٌ فعلية على المكتب.'}
                  <br />
                  ولا تظهر في نافذة الضمّ للفاتورة إلا بعد تعليمها مدفوعة.
                  {!form.case_id && !form.client_id && (
                    <>
                      <br />
                      <span style={{ color: 'var(--status-orange)' }}>
                        ⚠ بلا قضيةٍ ولا عميل تظهر في نافذة كل الفواتير — حدِّد أحدهما كي تُنسب لصاحبها.
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          {!editTarget && (
            <div className="fin-field fin-grid__full">
              <label className="fin-field__label">مرفق الفاتورة (صورة/PDF)</label>
              <input className="fin-input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setForm({ ...form, attachment: e.target.files?.[0] ?? null })} />
            </div>
          )}
          <div className="fin-field fin-grid__full">
            <label className="fin-field__label">ملاحظات</label>
            <textarea className="fin-textarea" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* ── مودال تأكيد الدفع ── */}
      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={`دفع ${payTarget?.expense_number ?? ''}`}
        icon={CheckCircle2}
        size="narrow"
        footerAlign="end"
        footer={(
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setPayTarget(null)}>تراجع</button>
            <button type="button" className="fin-btn fin-btn--success" disabled={payMutation.isPending}
              onClick={() => payMutation.mutate()}>
              تأكيد الدفع
            </button>
          </>
        )}
      >
        <p style={{ marginBottom: 10 }}>
          سيُعلَّم المصروف <strong>{payTarget?.description}</strong> بمبلغ <strong>{formatSAR(payTarget?.total_amount)}</strong> مدفوعاً،
          ويتولّد قيده المحاسبي تلقائياً.
        </p>
        <div className="fin-field">
          <label className="fin-field__label">طريقة الدفع</label>
          <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as ExpensePaymentMethod)}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </Modal>

      {/* ── مودال تأكيد الإلغاء ── */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={`إلغاء ${cancelTarget?.expense_number ?? ''}`}
        icon={XCircle}
        size="narrow"
        footerAlign="end"
        footer={(
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setCancelTarget(null)}>تراجع</button>
            <button type="button" className="fin-btn fin-btn--danger" disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}>
              تأكيد الإلغاء
            </button>
          </>
        )}
      >
        <p>
          {cancelTarget?.status === 'paid'
            ? 'المصروف مدفوع — الإلغاء سيولّد قيداً عكسياً يصحّح الدفاتر (لا حذف).'
            : 'سيُلغى هذا المصروف.'}
        </p>
        {/* الإلغاء يعكس قيدَ المصروف في الدفاتر ولا يمسّ بندَه في فاتورة العميل —
            فيبقى العميل مطالَباً بكلفةٍ أُلغيت. لا نمنع (قد يكون التصحيحُ مقصوداً)
            لكنّ الصمتَ هنا يُنتج فرقاً لا يظهر إلا في مراجعةٍ لاحقة. */}
        {cancelTarget?.rebilled_invoice_id ? (
          <p style={{ color: 'var(--status-orange)', marginTop: 10 }}>
            ⚠ هذه النثرية مُحمَّلة على فاتورةٍ للعميل — الإلغاء لا يحذف بندَها من الفاتورة.
            راجع الفاتورة بعده وإلا بقي العميل مطالَباً بكلفةٍ عُكس قيدُها.
          </p>
        ) : null}
      </Modal>

      {/* ── مودال مورد ── */}
      <Modal
        open={!!vendorForm}
        onClose={() => setVendorForm(null)}
        title={vendorForm?.id ? `تعديل ${vendorForm.name}` : 'مورد جديد'}
        icon={Truck}
        footerAlign="end"
        footer={(
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setVendorForm(null)}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--primary" disabled={saveVendorMutation.isPending}
              onClick={() => saveVendorMutation.mutate()}>
              حفظ
            </button>
          </>
        )}
      >
        {vendorForm && (
          <div className="fin-grid fin-grid--2">
            <div className="fin-field fin-grid__full">
              <label className="fin-field__label">الاسم<span className="req">*</span></label>
              <input className="fin-input" value={vendorForm.name ?? ''}
                onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} />
            </div>
            <div className="fin-field">
              <label className="fin-field__label">الرقم الضريبي (15 خانة)</label>
              <input className="fin-input" dir="ltr" value={vendorForm.vat_number ?? ''}
                onChange={(e) => setVendorForm({ ...vendorForm, vat_number: e.target.value })} />
            </div>
            <div className="fin-field">
              <label className="fin-field__label">الجوال</label>
              <input className="fin-input" dir="ltr" value={vendorForm.phone ?? ''}
                onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
            </div>
            <div className="fin-field">
              <label className="fin-field__label">الإيميل</label>
              <input className="fin-input" dir="ltr" type="email" value={vendorForm.email ?? ''}
                onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
            </div>
            <div className="fin-field">
              <label className="fin-field__label">السجل التجاري</label>
              <input className="fin-input" dir="ltr" value={vendorForm.commercial_register ?? ''}
                onChange={(e) => setVendorForm({ ...vendorForm, commercial_register: e.target.value })} />
            </div>
            <div className="fin-field fin-grid__full">
              <label className="fin-field__label">ملاحظات</label>
              <textarea className="fin-textarea" rows={2} value={vendorForm.notes ?? ''}
                onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExpensesTab;
