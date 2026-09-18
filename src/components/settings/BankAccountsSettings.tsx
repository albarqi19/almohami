import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, Loader2, AlertTriangle, CheckCircle2, Plus, Save, Star, Power, Pencil, Lock } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../contexts/AuthContext';
import { BankAccountService, BANK_ACCOUNTS_QUERY_KEY } from '../../services/bankAccountService';
import type { BankAccountInput, TenantBankAccount } from '../../services/bankAccountService';
import { bankNameFromIban, groupIban, ibanProblem, IBAN_PROBLEM_MESSAGES, normalizeIban } from '../../utils/saudiIban';

/**
 * [INV-P3] «الحسابات البنكية» — حسابات المكتب لاستلام الأتعاب، تُطبع على الفاتورة وكشف
 * الحساب وعرض الأتعاب والعقد ورسائل التذكير.
 *
 * القواعد ظاهرة للمستخدم: الآيبان لا يُعدَّل بعد الحفظ، والحساب يُوقَف ولا يُحذف، وأي تغيير
 * يصل إشعاره للمديرين وبريد للمالك. الإدارة بصلاحية billing.bank-accounts.manage.
 */

type ApiError = Error & { errors?: Record<string, string[]> };

interface FormState {
  iban: string;
  account_holder_name: string;
  bank_name: string;
  label: string;
  swift_code: string;
  show_on_invoices: boolean;
  is_default: boolean;
}

const EMPTY: FormState = { iban: '', account_holder_name: '', bank_name: '', label: '', swift_code: '', show_on_invoices: true, is_default: false };

const BankAccountsSettings: React.FC = () => {
  const { user } = useAuth();
  // كل hook يُنادى دون شرط — الاختصار المنطقي يجعل النداء الثاني مشروطاً فيكسر ترتيب الـhooks
  const hasBankPermission = usePermission('billing.bank-accounts.manage');
  const hasSystemManage = usePermission('system.manage');
  const canManage = hasBankPermission || hasSystemManage || !!user?.is_tenant_owner || user?.role === 'admin';
  const queryClient = useQueryClient();

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: BANK_ACCOUNTS_QUERY_KEY,
    queryFn: () => BankAccountService.list(),
  });

  const accounts = data?.accounts ?? [];
  const meta = data?.meta;
  const tenantName = user?.tenant?.name ?? '';

  const [mode, setMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editing, setEditing] = useState<TenantBankAccount | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 5000);
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: BANK_ACCOUNTS_QUERY_KEY });

  const handleError = (e: unknown) => {
    const err = e as ApiError;
    if (err?.errors) {
      const flat: Partial<Record<string, string>> = {};
      for (const [k, v] of Object.entries(err.errors)) flat[k] = Array.isArray(v) ? String(v[0]) : String(v);
      setFieldErrors(flat);
      setError(Object.values(flat)[0] || err.message);
      return;
    }
    setError(err?.message || 'تعذّر الحفظ');
  };

  const createMutation = useMutation({
    mutationFn: (input: BankAccountInput) => BankAccountService.create(input),
    onSuccess: async () => { await refresh(); setMode('closed'); setForm(EMPTY); flash('تمت إضافة الحساب. وصل إشعار بذلك للمديرين وبريد للمالك.'); },
    onError: handleError,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<BankAccountInput> }) => BankAccountService.update(id, input),
    onSuccess: async () => { await refresh(); setMode('closed'); setEditing(null); flash('تم تحديث الحساب.'); },
    onError: handleError,
  });
  const setDefaultMutation = useMutation({ mutationFn: (id: number) => BankAccountService.setDefault(id), onSuccess: async () => { await refresh(); flash('صار هذا الحساب الافتراضي.'); }, onError: handleError });
  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => (active ? BankAccountService.activate(id) : BankAccountService.deactivate(id)),
    onSuccess: async (_r, vars) => { await refresh(); flash(vars.active ? 'أُعيد تفعيل الحساب.' : 'أُوقف الحساب. لن يُطبع على المستندات الجديدة.'); },
    onError: handleError,
  });

  const busy = createMutation.isPending || updateMutation.isPending || setDefaultMutation.isPending || toggleMutation.isPending;

  const ibanIssue = mode === 'create' ? ibanProblem(form.iban) : null;
  const suggestedBank = useMemo(() => (mode === 'create' && meta ? bankNameFromIban(form.iban, meta.bank_codes) : null), [form.iban, meta, mode]);

  const openCreate = () => {
    setMode('create'); setEditing(null); setForm(EMPTY); setFieldErrors({}); setError(null);
  };
  const openEdit = (a: TenantBankAccount) => {
    setMode('edit'); setEditing(a); setFieldErrors({}); setError(null);
    setForm({ iban: a.iban, account_holder_name: a.account_holder_name, bank_name: a.bank_name ?? '', label: a.label ?? '', swift_code: a.swift_code ?? '', show_on_invoices: a.show_on_invoices, is_default: a.is_default });
  };

  const submit = () => {
    setFieldErrors({}); setError(null);
    if (!form.account_holder_name.trim()) { setFieldErrors({ account_holder_name: 'اسم صاحب الحساب مطلوب كما هو في البنك.' }); return; }
    if (mode === 'create') {
      if (ibanIssue) { setFieldErrors({ iban: IBAN_PROBLEM_MESSAGES[ibanIssue] }); return; }
      createMutation.mutate({
        iban: normalizeIban(form.iban),
        account_holder_name: form.account_holder_name.trim(),
        bank_name: form.bank_name.trim() || suggestedBank || null,
        label: form.label.trim() || null,
        swift_code: form.swift_code.trim() || null,
        show_on_invoices: form.show_on_invoices,
        is_default: form.is_default,
      });
    } else if (editing) {
      updateMutation.mutate({ id: editing.id, input: {
        account_holder_name: form.account_holder_name.trim(),
        bank_name: form.bank_name.trim() || null,
        label: form.label.trim() || null,
        swift_code: form.swift_code.trim() || null,
        show_on_invoices: form.show_on_invoices,
      } });
    }
  };

  const box = (tone: 'warn' | 'ok' | 'info'): React.CSSProperties => ({
    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', borderRadius: 6, fontSize: 12.5, lineHeight: 1.8,
    border: '1px solid var(--color-border)',
    background: tone === 'warn' ? 'var(--status-orange-light, rgba(217,119,6,.08))' : tone === 'ok' ? 'var(--status-green-light, rgba(5,150,105,.08))' : 'var(--color-bg-secondary)',
    color: tone === 'warn' ? 'var(--status-orange, #D97706)' : tone === 'ok' ? 'var(--status-green, #059669)' : 'var(--color-text)',
  });

  const field = (key: keyof FormState, label: string, opts: { dir?: 'ltr'; placeholder?: string; hint?: string; locked?: boolean; required?: boolean } = {}) => {
    const err = fieldErrors[key];
    return (
      <div className="settings-field" key={key}>
        <span className="settings-field__label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {label}{opts.required ? <span style={{ color: 'var(--status-red, #dc2626)' }}>*</span> : null}
          {opts.locked ? <Lock size={11} style={{ opacity: 0.7 }} /> : null}
        </span>
        <input
          type="text"
          className="settings-field__input"
          style={{ direction: opts.dir, textAlign: opts.dir === 'ltr' ? 'left' : undefined, borderColor: err ? 'var(--status-orange, #D97706)' : undefined }}
          placeholder={opts.placeholder}
          value={String(form[key])}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          disabled={busy || opts.locked}
        />
        {err ? <span style={{ fontSize: 11.5, color: 'var(--status-orange, #D97706)' }}>{err}</span>
          : opts.hint ? <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{opts.hint}</span> : null}
      </div>
    );
  };

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div className="settings-section__icon"><Landmark size={14} /></div>
        <span className="settings-section__title">الحسابات البنكية لاستلام الأتعاب</span>
      </div>
      <div className="settings-section__content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
          تُطبع بيانات التحويل على الفاتورة وكشف الحساب وعرض الأتعاب والعقد، وتُضاف لرسائل التذكير.
          الآيبان لا يُعدَّل بعد حفظه (أضف حساباً جديداً وأوقف القديم)، وكل تغيير يصل إشعاره للمديرين وبريد للمالك.
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 className="animate-spin" size={16} /><span>جاري التحميل...</span></div>
        ) : loadError ? (
          <div style={box('warn')}><AlertTriangle size={15} /><span>{(loadError as Error).message}</span></div>
        ) : accounts.length === 0 ? (
          <div style={box('info')}><span>لا حسابات بنكية بعد. أضف حساب المكتب ليظهر على الفواتير للتحويل.</span></div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 6 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)' }}>
                  {['البنك', 'صاحب الحساب', 'الآيبان', 'يظهر في الفواتير', 'الحالة', ''].map((h) => (
                    <th key={h} style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 600, fontSize: 11.5, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} style={{ borderTop: '1px solid var(--color-border)', opacity: a.is_active ? 1 : 0.6 }}>
                    <td style={{ padding: '7px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {a.is_default && <Star size={12} fill="currentColor" style={{ color: 'var(--law-gold, #C5A059)' }} aria-label="الافتراضي" />}
                        <span>{a.bank_name || '—'}</span>
                      </div>
                      {a.label && <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{a.label}</div>}
                    </td>
                    <td style={{ padding: '7px 10px' }}>{a.account_holder_name}</td>
                    <td style={{ padding: '7px 10px', direction: 'ltr', textAlign: 'left', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>{a.iban_grouped || groupIban(a.iban)}</td>
                    <td style={{ padding: '7px 10px' }}>{a.show_on_invoices ? 'نعم' : 'لا'}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <span className={`settings-badge ${a.is_active ? 'settings-badge--success' : 'settings-badge--warning'}`}>{a.is_active ? 'نشط' : 'موقوف'}</span>
                    </td>
                    <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                      {canManage && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="settings-btn settings-btn--secondary settings-btn--small" title="تعديل البيانات" onClick={() => openEdit(a)} disabled={busy}><Pencil size={12} /></button>
                          {a.is_active && !a.is_default && (
                            <button className="settings-btn settings-btn--secondary settings-btn--small" title="اجعله الافتراضي" onClick={() => setDefaultMutation.mutate(a.id)} disabled={busy}><Star size={12} /></button>
                          )}
                          <button className="settings-btn settings-btn--secondary settings-btn--small" title={a.is_active ? 'إيقاف' : 'تفعيل'} onClick={() => toggleMutation.mutate({ id: a.id, active: !a.is_active })} disabled={busy}><Power size={12} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!canManage && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>إدارة الحسابات البنكية لمالك المكتب أو المدير.</span>}

        {canManage && mode === 'closed' && (
          <button className="settings-btn settings-btn--primary" style={{ alignSelf: 'flex-start' }} onClick={openCreate} disabled={busy || (meta ? accounts.length >= meta.max_accounts : false)}>
            <Plus size={14} /> إضافة حساب بنكي
          </button>
        )}

        {canManage && mode !== 'closed' && (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{mode === 'create' ? 'حساب بنكي جديد' : 'تعديل بيانات الحساب'}</div>
            <div className="settings-form-grid">
              {field('iban', 'رقم الآيبان', { dir: 'ltr', placeholder: 'SA00 0000 0000 0000 0000 0000', required: true, locked: mode === 'edit', hint: mode === 'edit' ? 'الآيبان مقفل بعد الحفظ.' : (form.iban && ibanIssue ? IBAN_PROBLEM_MESSAGES[ibanIssue] : suggestedBank ? `البنك المقترح: ${suggestedBank}` : 'SA ثم 22 رقماً كما في كشف الحساب.') })}
              {field('account_holder_name', 'اسم صاحب الحساب', { required: true, placeholder: tenantName, hint: 'كما هو مسجَّل في البنك.' })}
              {field('bank_name', 'اسم البنك', { placeholder: suggestedBank || '' })}
              {field('swift_code', 'رمز السويفت (اختياري)', { dir: 'ltr', hint: 'للتحويلات من خارج المملكة.' })}
              {field('label', 'اسم للتمييز (اختياري)', { placeholder: 'الحساب الرئيسي' })}
            </div>
            {form.account_holder_name.trim() && tenantName && !form.account_holder_name.includes(tenantName.split(' ')[0]) && (
              <div style={box('warn')}><AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} /><span>اسم صاحب الحساب يختلف عن اسم المكتب. تأكد أن الحساب يعود للمكتب لا لشخص.</span></div>
            )}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.show_on_invoices} onChange={(e) => setForm((f) => ({ ...f, show_on_invoices: e.target.checked }))} disabled={busy} /> يظهر في الفواتير
              </label>
              {mode === 'create' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))} disabled={busy} /> الحساب الافتراضي
                </label>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="settings-btn settings-btn--primary" onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} {mode === 'create' ? 'إضافة' : 'حفظ'}
              </button>
              <button className="settings-btn settings-btn--secondary" onClick={() => { setMode('closed'); setEditing(null); setFieldErrors({}); setError(null); }} disabled={busy}>إلغاء</button>
            </div>
          </div>
        )}

        {error && <div style={box('warn')}><AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} /><span>{error}</span></div>}
        {message && <div style={box('ok')}><CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} /><span>{message}</span></div>}
      </div>
    </div>
  );
};

export default BankAccountsSettings;
