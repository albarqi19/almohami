// [INV-P4] «شكل المستندات المالية» — الكليشة ولون الهوية والشعار وحجم النص والإجمالي بالحروف
// وختم الحالة والنص الختامي، مع معاينة من مستندات المكتب الحقيقية.
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, AlertTriangle, CheckCircle2, Save, Eye, RotateCcw } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { useAuth } from '../../contexts/AuthContext';
import {
  BillingDocumentsService,
  BILLING_DOCUMENTS_QUERY_KEY,
  type BillingDocumentSettings as SettingsShape,
  type LogoMode,
  type PreviewDoc,
} from '../../services/billingDocumentsService';

type ApiError = Error & { errors?: Record<string, string[]> };

const PREVIEWS: Array<{ doc: PreviewDoc; label: string }> = [
  { doc: 'invoice', label: 'الفاتورة' },
  { doc: 'receipt', label: 'سند القبض' },
  { doc: 'statement', label: 'كشف الحساب' },
  { doc: 'fee_proposal', label: 'عرض الأتعاب' },
];

const normalizeHex = (v: string) => {
  const s = v.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(s)) return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`.toLowerCase();
  return /^[0-9a-fA-F]{6}$/.test(s) ? `#${s.toLowerCase()}` : '';
};

const BillingDocumentsSettings: React.FC = () => {
  const { user } = useAuth();
  const hasSettings = usePermission('tenant.settings.manage');
  const hasSystemManage = usePermission('system.manage');
  const canEdit = hasSettings || hasSystemManage || !!user?.is_tenant_owner || user?.role === 'admin';
  const queryClient = useQueryClient();

  const { data, isLoading, error: loadError } = useQuery({
    queryKey: BILLING_DOCUMENTS_QUERY_KEY,
    queryFn: () => BillingDocumentsService.get(),
  });

  const [draft, setDraft] = useState<SettingsShape | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<PreviewDoc | null>(null);

  useEffect(() => {
    if (data) setDraft({ ...data.settings });
  }, [data]);

  const dirty = !!data && !!draft && JSON.stringify(draft) !== JSON.stringify(data.settings);

  const save = useMutation({
    mutationFn: () => BillingDocumentsService.update(draft as SettingsShape),
    onSuccess: (res) => {
      queryClient.setQueryData(BILLING_DOCUMENTS_QUERY_KEY, res.data);
      setError(null);
      setMessage(res.message);
      window.setTimeout(() => setMessage(null), 4000);
    },
    onError: (e: ApiError) => {
      const first = e.errors ? Object.values(e.errors).flat()[0] : null;
      setError(first || e.message || 'تعذّر الحفظ');
    },
  });

  const preview = async (doc: PreviewDoc) => {
    setPreviewing(doc);
    setError(null);
    try {
      await BillingDocumentsService.openPreview(doc);
    } catch (e) {
      setError((e as Error).message || 'تعذّر توليد المعاينة');
    } finally {
      setPreviewing(null);
    }
  };

  if (isLoading || !draft || !data) {
    return (
      <div className="settings-section">
        <div className="settings-section__content" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20 }}>
          {loadError ? <><AlertTriangle size={14} /> تعذّر تحميل شكل المستندات</> : <><Loader2 size={14} className="animate-spin" /> جارٍ التحميل…</>}
        </div>
      </div>
    );
  }

  const set = <K extends keyof SettingsShape>(key: K, value: SettingsShape[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const effectiveAccent = normalizeHex(draft.accent_color) || data.effective.accent;

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <div className="settings-section__icon"><FileText size={14} /></div>
        <span className="settings-section__title">شكل المستندات المالية</span>
      </div>
      <div className="settings-section__content" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
          قالب واحد لكل المستندات المالية: الفاتورة والإشعار الدائن والمدين وعرض الأتعاب وسند القبض وكشف الحساب.
          ما تختاره هنا يظهر عليها جميعاً. الخط يتبع الكليشة المختارة ({data.effective.font_label}).
        </p>

        {/* الكليشة واللون */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <div className="settings-field">
            <span className="settings-field__label">الكليشة</span>
            <select className="settings-field__input" value={draft.letterhead_id} disabled={!canEdit} onChange={(e) => set('letterhead_id', Number(e.target.value))}>
              <option value={0}>الكليشة الافتراضية للمكتب{data.letterheads.find((l) => l.is_default) ? ` (${data.letterheads.find((l) => l.is_default)?.name})` : ' (لا كليشة — ترويسة بسيطة باسم المكتب)'}</option>
              {data.letterheads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="settings-field">
            <span className="settings-field__label">لون الهوية</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={effectiveAccent} disabled={!canEdit} onChange={(e) => set('accent_color', normalizeHex(e.target.value))} aria-label="لون الهوية" style={{ width: 36, height: 32, padding: 2, border: '1px solid var(--color-border)', borderRadius: 6, background: 'var(--color-surface)' }} />
              <input className="settings-field__input" value={draft.accent_color} disabled={!canEdit} placeholder={`تلقائي (${data.effective.accent})`} onChange={(e) => set('accent_color', e.target.value)} onBlur={(e) => set('accent_color', normalizeHex(e.target.value))} style={{ direction: 'ltr', flex: 1 }} maxLength={7} />
              {draft.accent_color && canEdit && (
                <button type="button" className="settings-btn settings-btn--secondary settings-btn--small" onClick={() => set('accent_color', '')} title="العودة للون الكليشة أو المكتب"><RotateCcw size={12} /> تلقائي</button>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>فارغ = لون الكليشة، وإلا لون المكتب.</span>
          </div>

          <div className="settings-field">
            <span className="settings-field__label">الشعار</span>
            <select className="settings-field__input" value={draft.logo_mode} disabled={!canEdit} onChange={(e) => set('logo_mode', e.target.value as LogoMode)}>
              {(Object.entries(data.logo_modes) as Array<[LogoMode, string]>).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
            {!data.tenant.has_logo && draft.logo_mode !== 'none' && (
              <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>لا شعار مرفوع للمكتب — ارفعه من «هوية الشركة».</span>
            )}
          </div>

          <div className="settings-field">
            <span className="settings-field__label">حجم النص</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {data.text_scales.map((s) => (
                <button key={s} type="button" disabled={!canEdit} className={`settings-btn settings-btn--small ${draft.text_scale === s ? 'settings-btn--primary' : 'settings-btn--secondary'}`} onClick={() => set('text_scale', s)}>
                  {s === 100 ? 'عادي' : `${s}%`}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>يكبّر نص المستند كله دون تغيير الجداول أو رمز QR.</span>
          </div>
        </div>

        {/* خيارات */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="settings-toggle" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={draft.amount_in_words} disabled={!canEdit} onChange={(e) => set('amount_in_words', e.target.checked)} />
            <span className="settings-toggle__slider"></span>
            <span style={{ fontSize: 13 }}>كتابة الإجمالي بالحروف على الفاتورة وعرض الأتعاب <span style={{ color: 'var(--color-text-secondary)', fontSize: 11.5 }}>(سند القبض يكتبه دائماً)</span></span>
          </label>
          <label className="settings-toggle" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={draft.status_stamp} disabled={!canEdit} onChange={(e) => set('status_stamp', e.target.checked)} />
            <span className="settings-toggle__slider"></span>
            <span style={{ fontSize: 13 }}>ختم الحالة على المستند (مدفوعة، ملغاة، مسودة…)</span>
          </label>
        </div>

        <div className="settings-field">
          <span className="settings-field__label">نص ختامي يُطبع أسفل كل مستند</span>
          <textarea className="settings-field__input" rows={2} maxLength={300} disabled={!canEdit} value={draft.footer_note} onChange={(e) => set('footer_note', e.target.value)} placeholder="مثلاً: شكراً لثقتكم. للاستفسار عن هذه الفاتورة تواصلوا مع قسم الحسابات." />
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{draft.footer_note.length}/300</span>
        </div>

        {data.effective.white_label && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>العلامة البيضاء مفعّلة: لا يُطبع اسم المزود على أي مستند.</div>
        )}

        {error && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--color-error, #dc2626)' }}><AlertTriangle size={13} /> {error}</div>}
        {message && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--status-green, #15803d)' }}><CheckCircle2 size={13} /> {message}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {canEdit && (
            <button type="button" className="settings-btn settings-btn--primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} حفظ
            </button>
          )}
          {canEdit && dirty && (
            <button type="button" className="settings-btn settings-btn--secondary" onClick={() => setDraft({ ...data.settings })}>تراجع</button>
          )}
          <span style={{ flex: 1 }} />
          {canEdit && PREVIEWS.map((p) => (
            <button key={p.doc} type="button" className="settings-btn settings-btn--secondary settings-btn--small" disabled={!!previewing || dirty} title={dirty ? 'احفظ أولاً ثم عاين' : `معاينة ${p.label} بآخر مستند حقيقي`} onClick={() => preview(p.doc)}>
              {previewing === p.doc ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} {p.label}
            </button>
          ))}
        </div>
        {canEdit && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>المعاينة تفتح آخر مستند حقيقي للمكتب بالشكل المحفوظ.</span>}
      </div>
    </div>
  );
};

export default BillingDocumentsSettings;
