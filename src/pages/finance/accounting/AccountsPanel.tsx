// [وحدة المحاسبة #141 — م3] دليل الحسابات: شجرة مستويين (جذور + فرعية)،
// النظامية محمية (يعتمد عليها المولّد الآلي) — إضافة/تعديل/تعطيل للمخصصة.
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { ListTree, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { accountingService, type Account, type AccountType } from '../../../services/accountingService';
import { LoadingState, ErrorState, Modal } from '../../../components/erp';
import { ToneBadge } from '../../../components/erp/StatusBadge';
import { usePermissionContext } from '../../../contexts/PermissionContext';
import { FINANCE_PERMISSIONS } from '../../../config/financeModule';

const TYPE_LABELS: Record<AccountType, string> = {
  asset: 'أصول',
  liability: 'خصوم',
  equity: 'حقوق ملكية',
  revenue: 'إيرادات',
  expense: 'مصروفات',
};

interface AccountForm {
  id?: number;
  code: string;
  name: string;
  type: AccountType;
  parent_id: string;
  description: string;
}

const AccountsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { has } = usePermissionContext();
  const canManage = has(FINANCE_PERMISSIONS.accountingManage);

  const [form, setForm] = useState<AccountForm | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['accounting', 'accounts'],
    queryFn: () => accountingService.getAccounts(),
  });

  const tree = data?.data?.tree ?? [];
  const flat = data?.data?.flat ?? [];
  const roots = flat.filter((a) => a.parent_id === null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['accounting', 'accounts'] });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form) throw new Error('لا نموذج');
      if (!form.code.trim() || !form.name.trim()) throw new Error('الرقم والاسم إلزاميان');
      return form.id
        ? accountingService.updateAccount(form.id, {
            code: form.code.trim(),
            name: form.name.trim(),
            description: form.description || undefined,
          })
        : accountingService.createAccount({
            code: form.code.trim(),
            name: form.name.trim(),
            type: form.type,
            parent_id: form.parent_id ? Number(form.parent_id) : null,
            description: form.description || undefined,
          });
    },
    onSuccess: () => { toast.success('تم حفظ الحساب'); invalidate(); setForm(null); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الحفظ'),
  });

  const toggleMutation = useMutation({
    mutationFn: (account: Account) => accountingService.updateAccount(account.id, { is_active: !account.is_active }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => accountingService.deleteAccount(id),
    onSuccess: () => { toast.success('حُذف الحساب'); invalidate(); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر الحذف'),
  });

  const renderRow = (account: Account, isChild: boolean) => (
    <tr key={account.id} style={account.is_active ? undefined : { opacity: 0.55 }}>
      <td className="num" style={{ textAlign: 'right' }}>
        <span className="fin-cell-mono">{account.code}</span>
      </td>
      <td style={isChild ? { paddingInlineStart: 28 } : undefined}>
        {account.name}
        {account.is_system && (
          <span title="حساب نظامي — يستهدفه توليد القيود الآلي" style={{ marginInlineStart: 6, verticalAlign: 'middle', display: 'inline-flex' }}>
            <ShieldCheck size={13} color="var(--law-gold, #b8860b)" />
          </span>
        )}
      </td>
      <td><ToneBadge tone="neutral">{TYPE_LABELS[account.type]}</ToneBadge></td>
      <td style={{ textAlign: 'center' }}>
        {canManage && (
          <div style={{ display: 'inline-flex', gap: 4 }}>
            <button type="button" className="fin-btn fin-btn--sm fin-btn--icon" title="تعديل الاسم"
              onClick={() => setForm({ id: account.id, code: account.code, name: account.name, type: account.type, parent_id: String(account.parent_id ?? ''), description: account.description ?? '' })}>
              <Pencil size={13} />
            </button>
            <button type="button" className="fin-btn fin-btn--sm" onClick={() => toggleMutation.mutate(account)}>
              {account.is_active ? 'تعطيل' : 'تفعيل'}
            </button>
            {!account.is_system && (
              <button type="button" className="fin-btn fin-btn--sm fin-btn--icon" title="حذف"
                onClick={() => { if (window.confirm(`حذف الحساب «${account.name}»؟`)) deleteMutation.mutate(account.id); }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );

  return (
    <div>
      <div className="acc-period">
        <span className="fin-cell-muted">
          <ShieldCheck size={13} color="var(--law-gold, #b8860b)" style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
          الحسابات الموسومة نظامية يستهدفها توليد القيود الآلي — لا تُحذف ولا يتغيّر نوعها.
        </span>
        <span style={{ flex: 1 }} />
        {canManage && (
          <button type="button" className="fin-btn fin-btn--primary"
            onClick={() => setForm({ code: '', name: '', type: 'asset', parent_id: '', description: '' })}>
            <Plus size={15} /> حساب جديد
          </button>
        )}
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} />}

      {!isLoading && !isError && (
        <div style={{ overflowX: 'auto' }}>
          <table className="acc-table">
            <thead>
              <tr><th style={{ width: 90 }}>الرقم</th><th>الحساب</th><th style={{ width: 120 }}>النوع</th><th style={{ width: 190 }} /></tr>
            </thead>
            <tbody>
              {tree.map((node) => (
                <React.Fragment key={node.account.id}>
                  <tr className="acc-row--group">
                    <td className="num" style={{ textAlign: 'right' }}><span className="fin-cell-mono">{node.account.code}</span></td>
                    <td colSpan={2}>{node.account.name}</td>
                    <td />
                  </tr>
                  {node.children.map((child) => renderRow(child, true))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'تعديل حساب' : 'حساب جديد'}
        icon={ListTree}
        footerAlign="end"
        footer={(
          <>
            <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setForm(null)}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--primary" disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}>
              حفظ
            </button>
          </>
        )}
      >
        {form && (
          <div className="fin-grid fin-grid--2">
            <div className="fin-field">
              <label className="fin-field__label">رقم الحساب<span className="req">*</span></label>
              <input className="fin-input" dir="ltr" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1103" />
            </div>
            <div className="fin-field">
              <label className="fin-field__label">الاسم<span className="req">*</span></label>
              <input className="fin-input" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="بنك الراجحي" />
            </div>
            {!form.id && (
              <div className="fin-field">
                <label className="fin-field__label">الحساب الرئيسي</label>
                <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
                  <option value="">— جذر مستقل —</option>
                  {roots.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
                </select>
                <span className="fin-cell-muted">الفرعي يرث نوع أبيه تلقائياً</span>
              </div>
            )}
            {!form.id && !form.parent_id && (
              <div className="fin-field">
                <label className="fin-field__label">النوع</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            )}
            <div className="fin-field fin-grid__full">
              <label className="fin-field__label">وصف</label>
              <input className="fin-input" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AccountsPanel;
