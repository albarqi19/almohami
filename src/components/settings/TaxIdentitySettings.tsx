import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Percent, Loader2, AlertTriangle, CheckCircle2, Save, Lock, MapPin, Building2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { useInvalidateBillingSettings } from '../../hooks/useBillingSettings';
import {
  TaxProfileService,
  TAX_PROFILE_TEXT_FIELDS,
} from '../../services/taxProfileService';
import type { TaxProfile, TaxProfileImpact, TaxProfileTextField, TaxProfileUpdate } from '../../services/taxProfileService';
import { isSampleVatNumber, isUsableVatNumber, isValidCommercialRegistration, isValidVatNumber, normalizeDigits } from '../../utils/saudiVat';
import SaudiCitiesDatalist from '../common/SaudiCitiesDatalist';
import { SAUDI_CITIES_DATALIST_ID } from '../../constants/saudiCities';

/**
 * [INV-P1] «البيانات الضريبية والعنوان الوطني» — قسم واحد يحل محل تبويب «التسجيل الضريبي».
 *
 * يجمع ما كان مفرّقاً: الرقم الضريبي (كان في التبويب القديم)، والاسم القانوني والسجل
 * والعنوان الوطني (لم تكن لها شاشة إلا معالج الربط مع الهيئة)، وحالة التسجيل بنافذة
 * تأكيد تعرض الأثر بالأرقام. لا يلزم أي ربط مع الهيئة لإدخال الرقم الضريبي.
 *
 * التعديل لمدير المكتب (نفس من يستطيع بدء الربط)، والباقون يقرؤون.
 */

type Draft = Record<TaxProfileTextField, string>;

/** خطأ الخادم كما يرميه apiClient: رسالة + أخطاء الحقول عند 422 */
type ApiError = Error & { errors?: Record<string, string[]> };

const LABELS: Record<TaxProfileTextField, string> = {
  legal_name_ar: 'الاسم القانوني (عربي)',
  legal_name_en: 'الاسم القانوني (إنجليزي)',
  tax_number: 'الرقم الضريبي',
  commercial_registration: 'السجل التجاري',
  license_number: 'رقم الترخيص',
  address: 'عنوان مختصر',
  building_number: 'رقم المبنى',
  street_name: 'اسم الشارع',
  district: 'الحي',
  city: 'المدينة',
  postal_code: 'الرمز البريدي',
  additional_number: 'الرقم الإضافي',
};

const DIGIT_FIELDS: TaxProfileTextField[] = ['tax_number', 'commercial_registration', 'building_number', 'postal_code', 'additional_number'];

function toDraft(p: TaxProfile): Draft {
  const d = {} as Draft;
  for (const f of TAX_PROFILE_TEXT_FIELDS) d[f] = (p[f] ?? '') as string;
  return d;
}

function normalizedValue(field: TaxProfileTextField, value: string): string {
  return DIGIT_FIELDS.includes(field) ? normalizeDigits(value) : value.trim();
}

const TaxIdentitySettings: React.FC = () => {
  const { user } = useAuth();
  const canEdit =
    usePermission('system.manage') || user?.role === 'admin' || user?.role === 'owner' || !!user?.is_tenant_owner;
  const invalidateBilling = useInvalidateBillingSettings();

  const [profile, setProfile] = useState<TaxProfile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rateDraft, setRateDraft] = useState('15');
  const [periodDraft, setPeriodDraft] = useState<'monthly' | 'quarterly'>('quarterly');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [message, setMessage] = useState<string | null>(null);

  // تغيير الحالة: نافذة تأكيد بأرقام الأثر
  const [confirming, setConfirming] = useState(false);
  const [impact, setImpact] = useState<TaxProfileImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [applyToDrafts, setApplyToDrafts] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await TaxProfileService.get();
      setProfile(p);
      setDraft(toDraft(p));
      setRateDraft(p.default_vat_rate || '15');
      setPeriodDraft(p.vat_filing_period || 'quarterly');
      setError(null);
    } catch (e) {
      setError((e as ApiError)?.message || 'تعذّر جلب البيانات الضريبية');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 5000);
  };

  /** الحقول التي تغيّرت فعلاً (بعد التطبيع) — هي وحدها ما يُرسل. */
  const changes = useMemo<TaxProfileUpdate>(() => {
    if (!profile || !draft) return {};
    const out: TaxProfileUpdate = {};
    for (const f of TAX_PROFILE_TEXT_FIELDS) {
      const next = normalizedValue(f, draft[f]);
      const saved = (profile[f] ?? '') as string;
      if (next !== saved) out[f] = next === '' ? null : next;
    }
    if (rateDraft !== (profile.default_vat_rate || '15')) out.default_vat_rate = rateDraft;
    if (periodDraft !== (profile.vat_filing_period || 'quarterly')) out.vat_filing_period = periodDraft;
    return out;
  }, [profile, draft, rateDraft, periodDraft]);

  const dirty = Object.keys(changes).length > 0;

  const localErrors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (!draft) return e;
    const vat = normalizeDigits(draft.tax_number);
    if (vat && !isValidVatNumber(vat)) e.tax_number = 'الصيغة النظامية: 15 رقماً يبدأ وينتهي بالرقم 3';
    else if (vat && isSampleVatNumber(vat)) e.tax_number = 'هذا رقم تجريبي من بيئة اختبار الهيئة وليس رقم تسجيل';
    const cr = normalizeDigits(draft.commercial_registration);
    if (cr && !isValidCommercialRegistration(cr)) e.commercial_registration = 'السجل التجاري 10 أرقام';
    const bn = normalizeDigits(draft.building_number);
    if (bn && !/^\d{4}$/.test(bn)) e.building_number = '4 أرقام';
    const pc = normalizeDigits(draft.postal_code);
    if (pc && !/^\d{5}$/.test(pc)) e.postal_code = '5 أرقام';
    const an = normalizeDigits(draft.additional_number);
    if (an && !/^\d{4}$/.test(an)) e.additional_number = '4 أرقام';
    const rate = Number(rateDraft);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) e.default_vat_rate = 'نسبة بين 0 و100';
    return e;
  }, [draft, rateDraft]);

  const applyServerErrors = (e: unknown) => {
    const err = e as ApiError | undefined;
    const errs = err?.errors;
    if (errs && typeof errs === 'object') {
      const flat: Partial<Record<string, string>> = {};
      for (const [k, v] of Object.entries(errs)) flat[k] = Array.isArray(v) ? String(v[0]) : String(v);
      setFieldErrors(flat);
      const first = Object.values(flat)[0];
      setError(first || err?.message || 'تعذّر الحفظ');
      return;
    }
    setError(err?.message || 'تعذّر الحفظ');
  };

  const save = async (extra: TaxProfileUpdate = {}) => {
    const payload: TaxProfileUpdate = { ...changes, ...extra };
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const result = await TaxProfileService.update(payload);
      setProfile(result.profile);
      setDraft(toDraft(result.profile));
      setRateDraft(result.profile.default_vat_rate || '15');
      setPeriodDraft(result.profile.vat_filing_period || 'quarterly');
      setConfirming(false);
      setImpact(null);
      setApplyToDrafts(false);
      await invalidateBilling();
      flash(result.message);
    } catch (e) {
      applyServerErrors(e);
    } finally {
      setSaving(false);
    }
  };

  const openConfirm = async () => {
    setConfirming(true);
    setImpactLoading(true);
    try {
      setImpact(await TaxProfileService.impact());
    } catch {
      setImpact(null);
    } finally {
      setImpactLoading(false);
    }
  };

  const isRegistered = !!profile?.is_vat_registered;
  const savedVatUsable = isUsableVatNumber(profile?.tax_number);

  // ما يمنع التفعيل — من الخادم على المحفوظ، ومن المسودة إن غُيّرت
  const blockers: string[] = useMemo(() => {
    if (!profile || isRegistered) return [];
    const out: string[] = [];
    const vat = normalizeDigits(draft?.tax_number ?? profile.tax_number ?? '');
    if (!vat) out.push('أدخل الرقم الضريبي للمكتب أولاً.');
    else if (!isValidVatNumber(vat)) out.push('الرقم الضريبي لا يطابق الصيغة النظامية.');
    else if (isSampleVatNumber(vat)) out.push('الرقم الضريبي رقم تجريبي وليس رقم تسجيل.');
    const hasAddress = [draft?.street_name, draft?.city, draft?.address].some((v) => (v ?? '').trim() !== '');
    if (!hasAddress) out.push('أدخل عنوان المكتب لأنه يُطبع على الفاتورة الضريبية.');
    return out;
  }, [profile, draft, isRegistered]);

  const box = (tone: 'warn' | 'info' | 'ok' | 'lock'): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '9px 12px',
    borderRadius: 6,
    fontSize: 12.5,
    lineHeight: 1.8,
    border: '1px solid var(--color-border)',
    background:
      tone === 'warn' ? 'var(--status-orange-light, rgba(217,119,6,.08))'
        : tone === 'ok' ? 'var(--status-green-light, rgba(5,150,105,.08))'
          : 'var(--color-bg-secondary)',
    color:
      tone === 'warn' ? 'var(--status-orange, #D97706)'
        : tone === 'ok' ? 'var(--status-green, #059669)'
          : 'var(--color-text)',
  });

  const input = (field: TaxProfileTextField, opts: { dir?: 'ltr' | 'rtl'; placeholder?: string; hint?: string; list?: string; locked?: boolean } = {}) => {
    const err = fieldErrors[field] || localErrors[field];
    const locked = !!opts.locked;
    return (
      <div className="settings-field" key={field}>
        <span className="settings-field__label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {LABELS[field]}
          {locked ? <Lock size={11} style={{ opacity: 0.7 }} /> : null}
        </span>
        <input
          type="text"
          inputMode={DIGIT_FIELDS.includes(field) ? 'numeric' : undefined}
          className="settings-field__input"
          style={{ direction: opts.dir, textAlign: opts.dir === 'ltr' ? 'left' : undefined, borderColor: err ? 'var(--status-orange, #D97706)' : undefined }}
          placeholder={opts.placeholder}
          list={opts.list}
          autoComplete={opts.list ? 'off' : undefined}
          value={draft?.[field] ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            setDraft((d) => (d ? { ...d, [field]: v } : d));
            if (fieldErrors[field]) setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
          }}
          disabled={!canEdit || saving || locked}
        />
        {err ? (
          <span style={{ fontSize: 11.5, color: 'var(--status-orange, #D97706)' }}>{err}</span>
        ) : opts.hint ? (
          <span style={{ fontSize: 11.5, color: 'var(--color-text-secondary)' }}>{opts.hint}</span>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="settings-section">
        <div className="settings-section__content" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 20 }}>
          <Loader2 className="animate-spin" size={18} />
          <span>جاري تحميل البيانات الضريبية...</span>
        </div>
      </div>
    );
  }

  if (!profile || !draft) {
    return (
      <div className="settings-section">
        <div className="settings-section__content">
          <div style={box('warn')}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{error || 'تعذّر تحميل البيانات الضريبية'}</span>
          </div>
        </div>
      </div>
    );
  }

  const locked = profile.identity_locked;
  const hasLocalErrors = Object.values(localErrors).some(Boolean);

  return (
    <>
      {/* ───────── الحالة الضريبية ───────── */}
      <div className="settings-section">
        <div className="settings-section__header">
          <div className="settings-section__icon"><Percent size={14} /></div>
          <span className="settings-section__title">التسجيل في ضريبة القيمة المضافة</span>
        </div>
        <div className="settings-section__content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
              padding: '10px 14px', background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 6,
            }}
          >
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', marginBottom: 2 }}>الحالة الحالية</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: isRegistered ? 'var(--status-green, #059669)' : 'var(--color-text)' }}>
                {isRegistered ? 'المكتب مسجَّل في ضريبة القيمة المضافة' : 'المكتب غير مسجَّل'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {isRegistered
                  ? `الفواتير الجديدة تخرج «فاتورة ضريبية» بنسبة ${profile.default_vat_rate}% ويظهر عليها الرقم الضريبي.`
                  : 'الفواتير الجديدة تخرج «فاتورة» بلا ضريبة ولا رقم ضريبي.'}
              </div>
            </div>

            {!confirming && (
              <button
                className={`settings-btn ${isRegistered ? 'settings-btn--danger' : 'settings-btn--primary'}`}
                onClick={openConfirm}
                disabled={!canEdit || saving || (!isRegistered && blockers.length > 0) || (isRegistered && locked)}
              >
                {isRegistered ? 'إيقاف التسجيل الضريبي' : 'تفعيل التسجيل الضريبي'}
              </button>
            )}
          </div>

          {!canEdit && (
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>التعديل لمالك المكتب أو المدير. العرض للاطلاع فقط.</span>
          )}

          {canEdit && !isRegistered && blockers.length > 0 && (
            <div style={box('warn')}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                قبل التفعيل:
                <br />
                {blockers.map((b) => (<React.Fragment key={b}>• {b}<br /></React.Fragment>))}
                {dirty ? 'احفظ البيانات أدناه ثم فعّل.' : null}
              </span>
            </div>
          )}

          {isRegistered && !savedVatUsable && (
            <div style={box('warn')}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>المكتب مسجَّل لكن رقمه الضريبي غير مُدخل أو غير صالح. الفاتورة الضريبية بلا رقم البائع مخالفة، فأكمله أدناه.</span>
            </div>
          )}

          {isRegistered && locked && (
            <div style={box('lock')}>
              <Lock size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{profile.identity_lock_reason}</span>
            </div>
          )}

          {profile.zatca.enabled && !isRegistered && (
            <div style={box('warn')}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>الربط مع الهيئة مفعّل بينما المكتب «غير مسجَّل». كل فاتورة تخرج بنسبة صفر بلا سبب إعفاء فترفضها الهيئة. إن كان المكتب مسجَّلاً فعّل التسجيل هنا.</span>
            </div>
          )}

          {confirming && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                {isRegistered ? 'تأكيد إيقاف التسجيل الضريبي' : 'تأكيد تفعيل التسجيل الضريبي'}
              </div>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.85 }}>
                {isRegistered ? (
                  <>كل فاتورة وعقد جديد يصدر <strong>بلا ضريبة</strong>، وتُصفَّر ضريبة المسودات الحالية. لا تفعل ذلك إلا إن شُطب تسجيل المكتب فعلاً. الفواتير الصادرة لا تتغيّر.</>
                ) : (
                  <>تخرج فواتيرك الجديدة «فاتورة ضريبية» بضريبة <strong>{rateDraft}%</strong> ويظهر عليها رقمك الضريبي. تحصيل الضريبة بلا تسجيل فعلي مخالفة، فلا تفعّل إلا إن كان المكتب مسجَّلاً. الفواتير الصادرة لا تتغيّر.</>
                )}
              </p>

              {impactLoading ? (
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}><Loader2 className="animate-spin" size={12} /> حساب الأثر...</span>
              ) : impact ? (
                <table style={{ borderCollapse: 'collapse', fontSize: 12.5, width: 'auto' }}>
                  <tbody>
                    <tr><td style={{ padding: '3px 10px 3px 0', color: 'var(--color-text-secondary)' }}>مسودات فواتير</td><td style={{ padding: '3px 0', fontWeight: 600 }}>{impact.draft_invoices} {isRegistered && impact.draft_invoices_with_vat > 0 ? `(منها ${impact.draft_invoices_with_vat} بضريبة ستُصفَّر)` : ''}</td></tr>
                    <tr><td style={{ padding: '3px 10px 3px 0', color: 'var(--color-text-secondary)' }}>دفعات عقود لم تُفوتر بعد</td><td style={{ padding: '3px 0', fontWeight: 600 }}>{impact.pending_payment_terms}</td></tr>
                    <tr><td style={{ padding: '3px 10px 3px 0', color: 'var(--color-text-secondary)' }}>عروض أتعاب مفتوحة</td><td style={{ padding: '3px 0', fontWeight: 600 }}>{impact.open_fee_proposals}</td></tr>
                    <tr><td style={{ padding: '3px 10px 3px 0', color: 'var(--color-text-secondary)' }}>فواتير صادرة (لا تتغيّر)</td><td style={{ padding: '3px 0', fontWeight: 600 }}>{impact.issued_invoices}</td></tr>
                  </tbody>
                </table>
              ) : null}

              {!isRegistered && impact && impact.draft_invoices > 0 && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                  <input type="checkbox" checked={applyToDrafts} onChange={(e) => setApplyToDrafts(e.target.checked)} />
                  أضف الضريبة على المسودات الحالية أيضاً ({impact.draft_invoices})
                </label>
              )}

              {dirty && (
                <div style={box('info')}>
                  <span>التغييرات غير المحفوظة في البيانات أدناه ستُحفظ مع التأكيد.</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className={`settings-btn ${isRegistered ? 'settings-btn--danger' : 'settings-btn--primary'}`}
                  onClick={() => save({ is_vat_registered: !isRegistered, confirm_registration_change: true, apply_rate_to_drafts: !isRegistered && applyToDrafts })}
                  disabled={saving || hasLocalErrors}
                >
                  {saving && <Loader2 className="animate-spin" size={14} />}
                  {isRegistered ? 'تأكيد الإيقاف' : 'تأكيد التفعيل'}
                </button>
                <button className="settings-btn settings-btn--secondary" onClick={() => { setConfirming(false); setImpact(null); }} disabled={saving}>
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {isRegistered && (
            <div className="settings-form-grid">
              <div className="settings-field">
                <span className="settings-field__label">النسبة الافتراضية %</span>
                <input
                  type="number" min={0} max={100} step="0.01" className="settings-field__input" style={{ width: 140 }}
                  value={rateDraft} onChange={(e) => setRateDraft(e.target.value)} disabled={!canEdit || saving}
                />
                <span style={{ fontSize: 11.5, color: localErrors.default_vat_rate ? 'var(--status-orange, #D97706)' : 'var(--color-text-secondary)' }}>
                  {localErrors.default_vat_rate || 'النسبة النظامية في المملكة 15%.'}
                </span>
              </div>
              <div className="settings-field">
                <span className="settings-field__label">فترة الإقرار الضريبي</span>
                <select className="settings-field__select" value={periodDraft} onChange={(e) => setPeriodDraft(e.target.value as 'monthly' | 'quarterly')} disabled={!canEdit || saving}>
                  <option value="quarterly">ربع سنوية</option>
                  <option value="monthly">شهرية</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───────── البيانات القانونية ───────── */}
      <div className="settings-section">
        <div className="settings-section__header">
          <div className="settings-section__icon"><Building2 size={14} /></div>
          <span className="settings-section__title">البيانات القانونية للمكتب</span>
        </div>
        <div className="settings-section__content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
            تُطبع على الفاتورة وسند القبض وكشف الحساب والعقد. لا يلزم أي ربط مع الهيئة لإدخال الرقم الضريبي.
            {profile.zatca.available ? ' ومعالج الربط مع الهيئة يقرأ من هنا.' : ''}
          </p>
          <div className="settings-form-grid">
            {input('legal_name_ar', { placeholder: profile.name, hint: 'كما في شهادة التسجيل. يظهر في خانة البائع.', locked })}
            {input('legal_name_en', { dir: 'ltr' })}
            {input('tax_number', { dir: 'ltr', placeholder: '3XXXXXXXXXXXXX3', hint: 'اكتبه كما في شهادة التسجيل (15 رقماً).', locked })}
            {input('commercial_registration', { dir: 'ltr', hint: '10 أرقام.' })}
            {input('license_number', {
              dir: 'ltr',
              hint: profile.license_number_source === 'sba' && !draft.license_number
                ? `يُطبع حالياً ترخيص المحامي المالك (${profile.license_number_effective}) من هيئة المحامين.`
                : 'ترخيص المكتب الصادر من هيئة المحامين.',
            })}
          </div>
        </div>
      </div>

      {/* ───────── العنوان الوطني ───────── */}
      <div className="settings-section">
        <div className="settings-section__header">
          <div className="settings-section__icon"><MapPin size={14} /></div>
          <span className="settings-section__title">العنوان الوطني</span>
        </div>
        <div className="settings-section__content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {profile.address_source === 'sba' && (
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>وصل العنوان من توثيق هيئة المحامين عند التسجيل. يمكنك تصحيحه.</span>
          )}
          <div className="settings-form-grid">
            {input('building_number', { dir: 'ltr', hint: '4 أرقام' })}
            {input('street_name')}
            {input('district')}
            {input('city', { list: SAUDI_CITIES_DATALIST_ID })}
            {input('postal_code', { dir: 'ltr', hint: '5 أرقام' })}
            {input('additional_number', { dir: 'ltr', hint: '4 أرقام (اختياري)' })}
          </div>
          <SaudiCitiesDatalist />
          {input('address', { hint: 'يُطبع إن لم يكتمل العنوان الوطني.' })}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className="settings-btn settings-btn--primary" onClick={() => save()} disabled={!canEdit || saving || !dirty || hasLocalErrors}>
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              حفظ البيانات
            </button>
            {dirty && !saving && (
              <button className="settings-btn settings-btn--secondary" onClick={() => { setDraft(toDraft(profile)); setRateDraft(profile.default_vat_rate || '15'); setPeriodDraft(profile.vat_filing_period || 'quarterly'); setFieldErrors({}); }}>
                تراجع
              </button>
            )}
            {dirty && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>تغييرات غير محفوظة</span>}
          </div>

          {error && (
            <div style={box('warn')}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div style={box('ok')}>
              <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{message}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TaxIdentitySettings;
