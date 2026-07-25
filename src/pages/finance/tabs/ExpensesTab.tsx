// [وحدة المحاسبة #141 — م1] تبويب المصروفات: مصروفات + موردون + تصنيفات.
// دورة حياة المصروف: مسودة → مدفوع (قيد آلي بالباك) → ملغى (قيد عكسي).
// المدفوع لا يُعدَّل ولا يُحذف — سلامة الدفاتر (رسائل الباك تشرح ذلك).
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  Wallet, Plus, CheckCircle2, XCircle, Trash2, Pencil, Paperclip, Landmark,
  Truck, Tags, ReceiptText, FileWarning, Ban,
} from 'lucide-react';
import {
  accountingService,
  type Expense, type ExpenseCategory, type Vendor, type ExpensePaymentMethod,
} from '../../../services/accountingService';
import { DataTable, FilterBar, Pagination, Modal, EmptyState } from '../../../components/erp';
import type { Column } from '../../../components/erp';
import StatCard, { StatCardGrid } from '../../../components/erp/StatCard';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import { formatSAR } from '../../../utils/money';
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
}

const emptyForm = (): ExpenseForm => ({
  expense_category_id: '',
  vendor_id: '',
  description: '',
  expense_date: new Date().toISOString().slice(0, 10),
  amount: '',
  vat_amount: '',
  has_tax_invoice: true,
  vendor_invoice_number: '',
  payment_method: 'bank_transfer',
  notes: '',
  mark_paid: true,
  attachment: null,
});

const ExpensesTab: React.FC = () => {
  const queryClient = useQueryClient();
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
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm());
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

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (expense: Expense) => {
    setEditTarget(expense);
    setForm({
      expense_category_id: String(expense.expense_category_id),
      vendor_id: expense.vendor_id ? String(expense.vendor_id) : '',
      description: expense.description,
      expense_date: expense.expense_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      amount: String(expense.amount),
      vat_amount: String(expense.vat_amount ?? ''),
      has_tax_invoice: expense.has_tax_invoice,
      vendor_invoice_number: expense.vendor_invoice_number ?? '',
      payment_method: expense.payment_method ?? 'bank_transfer',
      notes: expense.notes ?? '',
      mark_paid: false,
      attachment: null,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    if (searchParams.get('new')) {
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const totalWithVat = (Number(form.amount) || 0) + (Number(form.vat_amount) || 0);

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
          <div className="fin-cell-muted">{e.expense_date?.slice(0, 10)}</div>
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
          <div className="fin-cell-muted">
            {e.category?.name}
            {e.vendor ? ` · ${e.vendor.name}` : ''}
            {e.case_model ? ` · قضية ${e.case_model.file_number}` : ''}
          </div>
        </div>
      ),
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
  ], [canManage, deleteMutation]);

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
            emptyTitle="لا مصروفات بعد"
            emptyDesc="سجّل أول مصروف — رسوم حكومية، إيجار، اشتراكات..."
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
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="fin-field">
            <label className="fin-field__label">الضريبة (15%)</label>
            <input className="fin-input" type="number" min="0" step="0.01" value={form.vat_amount}
              onChange={(e) => setForm({ ...form, vat_amount: e.target.value })}
              placeholder={form.amount ? (Number(form.amount) * 0.15).toFixed(2) : '0.00'} />
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
