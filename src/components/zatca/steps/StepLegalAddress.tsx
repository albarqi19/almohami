// === الخطوة 1: البيانات القانونية + العنوان الوطني + OTP → POST /zatca/onboard/start ===
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { zatcaService } from '../../../services/zatcaService';
import type { StartOnboardingPayload } from '../../../types/zatca';

interface Props {
  onSuccess: () => void;
}

type FormState = {
  otp: string;
  legal_name_ar: string;
  legal_name_en: string;
  vat_number: string;
  commercial_registration: string;
  building_number: string;
  street_name: string;
  district: string;
  city: string;
  postal_code: string;
  additional_number: string;
};

const INITIAL: FormState = {
  otp: '',
  legal_name_ar: '',
  legal_name_en: '',
  vat_number: '',
  commercial_registration: '',
  building_number: '',
  street_name: '',
  district: '',
  city: '',
  postal_code: '',
  additional_number: '',
};

const VAT_RE = /^3\d{13}3$/;

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!f.otp.trim()) e.otp = 'رمز OTP مطلوب';
  if (!f.legal_name_ar.trim()) e.legal_name_ar = 'الاسم القانوني (عربي) مطلوب';
  if (!f.vat_number.trim()) e.vat_number = 'الرقم الضريبي مطلوب';
  else if (!VAT_RE.test(f.vat_number.trim())) e.vat_number = 'الرقم الضريبي يجب أن يكون 15 رقماً يبدأ وينتهي بالرقم 3';
  if (!/^\d{4}$/.test(f.building_number.trim())) e.building_number = 'رقم المبنى 4 أرقام';
  if (!f.street_name.trim()) e.street_name = 'اسم الشارع مطلوب';
  if (!f.district.trim()) e.district = 'الحي مطلوب';
  if (!f.city.trim()) e.city = 'المدينة مطلوبة';
  if (!/^\d{5}$/.test(f.postal_code.trim())) e.postal_code = 'الرمز البريدي 5 أرقام';
  if (f.additional_number.trim() && !/^\d{4}$/.test(f.additional_number.trim())) e.additional_number = 'الرقم الإضافي 4 أرقام';
  return e;
}

const StepLegalAddress: React.FC<Props> = ({ onSuccess }) => {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
    if (serverError) setServerError(null);
  };

  const mutation = useMutation({
    mutationFn: (payload: StartOnboardingPayload) => zatcaService.startOnboarding(payload),
    onSuccess: (res) => {
      if (res.success) {
        toast.success('تم توليد طلب شهادة الامتثال');
        onSuccess();
      } else {
        setServerError(res.message || 'تعذّر بدء التفعيل');
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'تعذّر بدء التفعيل';
      setServerError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (Object.values(v).some(Boolean)) return;

    const payload: StartOnboardingPayload = {
      otp: form.otp.trim(),
      legal_name_ar: form.legal_name_ar.trim(),
      legal_name_en: form.legal_name_en.trim() || undefined,
      vat_number: form.vat_number.trim(),
      commercial_registration: form.commercial_registration.trim() || undefined,
      building_number: form.building_number.trim(),
      street_name: form.street_name.trim(),
      district: form.district.trim(),
      city: form.city.trim(),
      postal_code: form.postal_code.trim(),
      additional_number: form.additional_number.trim() || undefined,
    };
    mutation.mutate(payload);
  };

  const field = (
    key: keyof FormState,
    label: string,
    opts: { required?: boolean; hint?: string; full?: boolean; placeholder?: string; dir?: 'ltr' | 'rtl' } = {}
  ) => (
    <div className={`zatca-field${opts.full ? ' zatca-field--full' : ''}`}>
      <label htmlFor={`zatca-${key}`}>
        {label}
        {opts.required ? <span className="req">*</span> : null}
      </label>
      <input
        id={`zatca-${key}`}
        type="text"
        value={form[key]}
        placeholder={opts.placeholder}
        dir={opts.dir}
        onChange={(ev) => set(key, ev.target.value)}
        className={errors[key] ? 'is-invalid' : undefined}
      />
      {errors[key] ? (
        <span className="zatca-field__err">{errors[key]}</span>
      ) : opts.hint ? (
        <span className="zatca-field__hint">{opts.hint}</span>
      ) : null}
    </div>
  );

  return (
    <form className="zatca-form" onSubmit={handleSubmit} noValidate>
      <h3 className="zatca-wizard__step-title">البيانات القانونية والعنوان الوطني</h3>
      <p className="zatca-wizard__step-desc">
        أدخل بيانات منشأتك القانونية والعنوان الوطني ورمز OTP المستخرج من بوابة فاتورة. تُستخدم لتوليد طلب شهادة الامتثال.
      </p>

      {serverError ? (
        <div className="zatca-form-error"><AlertCircle size={16} />{serverError}</div>
      ) : null}

      <div className="zatca-row">
        {field('legal_name_ar', 'الاسم القانوني (عربي)', { required: true })}
        {field('legal_name_en', 'الاسم القانوني (إنجليزي)', { dir: 'ltr' })}
      </div>
      <div className="zatca-row">
        {field('vat_number', 'الرقم الضريبي (VAT)', { required: true, hint: '15 رقماً يبدأ وينتهي بـ 3', dir: 'ltr', placeholder: '3XXXXXXXXXXXXX3' })}
        {field('commercial_registration', 'السجل التجاري', { dir: 'ltr' })}
      </div>

      <h4 className="zatca-wizard__step-title" style={{ fontSize: '13.5px', marginTop: '6px' }}>العنوان الوطني</h4>
      <div className="zatca-row">
        {field('building_number', 'رقم المبنى', { required: true, hint: '4 أرقام', dir: 'ltr' })}
        {field('street_name', 'اسم الشارع', { required: true })}
      </div>
      <div className="zatca-row">
        {field('district', 'الحي', { required: true })}
        {field('city', 'المدينة', { required: true })}
      </div>
      <div className="zatca-row">
        {field('postal_code', 'الرمز البريدي', { required: true, hint: '5 أرقام', dir: 'ltr' })}
        {field('additional_number', 'الرقم الإضافي (اختياري)', { hint: '4 أرقام', dir: 'ltr' })}
      </div>

      <div className="zatca-row">
        {field('otp', 'رمز OTP من بوابة فاتورة', { required: true, full: true, dir: 'ltr' })}
      </div>

      <div className="zatca-wizard__actions">
        <span />
        <button type="submit" className="zatca-btn zatca-btn--primary" disabled={mutation.isPending}>
          {mutation.isPending ? <><Loader2 size={15} className="zatca-spin" /> جارٍ الإرسال…</> : <>التالي <ArrowLeft size={15} /></>}
        </button>
      </div>
    </form>
  );
};

export default StepLegalAddress;
