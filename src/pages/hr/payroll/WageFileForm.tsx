import React, { useEffect, useState } from 'react';
import { BadgeCheck, ChevronDown, Loader2, Save, ShieldCheck } from 'lucide-react';

import {
  BASIC_DEFINITION_LABELS,
  GOSI_SCHEME_HINTS,
  GOSI_SCHEME_LABELS,
  IBAN_STATE_LABELS,
  PAYMENT_METHOD_LABELS,
  PRORATION_HINTS,
  PRORATION_LABELS,
} from './payrollFormat';
import type {
  BasicWageDefinition,
  GosiScheme,
  PaymentMethod,
  ProrationBasis,
  WageFile,
  WageFilePayload,
} from '../../../types/hrPayroll';

/**
 * **ملفُّ الأجر** — الأهليّةُ والسياسة، مفصولةً عن الأرقام.
 *
 * ══════ لماذا نموذجان لا نموذجٌ واحد ══════
 * الأرقامُ صفوفٌ تاريخيةٌ تتغيّر كلَّ سنة، والسياسةُ حالةٌ واحدةٌ تكاد لا تتغيّر. دمجُهما
 * يعني أنّ تصحيحَ رقم الآيبان يكتب **نسخةَ أجرٍ جديدة** فيظهر في سجلّ الراتب كأنّ الراتبَ
 * تغيّر، ويظهر في المسير كحدٍّ زمنيٍّ يقطع الشهرَ شريحتين بلا سبب.
 *
 * ══════ 🔴 نظامُ التأمينات يُصرَّح به ولا يُشتقّ ══════
 * لا خيارَ «استنتِج من الجنسية» في هذه الشاشة ولا في الخادم: `nationality` نصٌّ حرّ،
 * والاشتقاقُ منه يخصم ٩٪ من وافدٍ حصّتُه صفر — احتجازٌ بلا سند. ولذلك يُعرَض أثرُ كلّ
 * اختيارٍ تحته: الفرقُ بين الخيارات **مالٌ حقيقيٌّ شهريّ** لا تسمية.
 *
 * ══════ 🔴 الآيبان يُفحص هنا لا في البنك ══════
 * كشفُ الرواتب المسلَّم للبنك قد يُردّ **كاملاً بسطرٍ واحدٍ فاسد**. والاكتشافُ بعد الاعتماد
 * يعني مسيراً مجمَّداً وتحويلاً فاشلاً؛ والاكتشافُ هنا حقلٌ يُصحَّح في ثانية. والخادمُ يفحص
 * mod-97 ويردّ برسالةٍ مفهومة — ولا تُصدَّق حالةٌ يرسلها العميل.
 */

interface Props {
  file: WageFile | null;
  canViewAmounts: boolean;
  canManage: boolean;
  saving: boolean;
  errorText?: string | null;
  onSubmit: (payload: WageFilePayload) => void;
}

const SCHEMES: GosiScheme[] = ['saudi', 'non_saudi', 'exempt'];
const BASES: ProrationBasis[] = ['statutory_thirty', 'actual_month_days'];
const DEFINITIONS: BasicWageDefinition[] = ['basic_only', 'basic_plus_periodic', 'contract_defined'];
const METHODS: PaymentMethod[] = ['bank_transfer', 'cash', 'cheque'];

interface FormState {
  reason: string;
  scheme: GosiScheme | '';
  gosiNumber: string;
  basis: ProrationBasis;
  definition: BasicWageDefinition;
  method: PaymentMethod;
  iban: string;
  bank: string;
  holder: string;
}

function fromFile(file: WageFile | null): FormState {
  return {
    reason: '',
    scheme: file?.gosi_scheme ?? '',
    gosiNumber: file?.gosi_number ?? '',
    basis: file?.proration_basis ?? 'statutory_thirty',
    definition: file?.basic_wage_definition ?? 'basic_only',
    method: file?.payment_method ?? 'bank_transfer',
    iban: file?.iban ?? '',
    bank: file?.bank_name ?? '',
    holder: file?.account_holder_name ?? '',
  };
}

export const WageFileForm: React.FC<Props> = ({ file, canViewAmounts, canManage, saving, errorText, onSubmit }) => {
  const [form, setForm] = useState<FormState>(() => fromFile(file));

  useEffect(() => {
    setForm(fromFile(file));
  }, [file]);

  const isNew = file === null;
  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const ready =
    canManage && !saving && form.scheme !== '' && (!isNew || form.reason.trim().length >= 3);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || form.scheme === '') return;

    const payload: WageFilePayload = {
      gosi_scheme: form.scheme,
      proration_basis: form.basis,
      basic_wage_definition: form.definition,
      payment_method: form.method,
      gosi_number: form.gosiNumber.trim() === '' ? null : form.gosiNumber.trim(),
      bank_name: form.bank.trim() === '' ? null : form.bank.trim(),
      account_holder_name: form.holder.trim() === '' ? null : form.holder.trim(),
    };

    // الآيبانُ حقلٌ حسّاسٌ لا يصل لمن لا يملك صلاحيته — فلا يُرسَل فارغاً فيمحوَ ما لم يره.
    if (canViewAmounts) {
      payload.iban = form.iban.trim() === '' ? null : form.iban.trim();
    }

    if (isNew) {
      payload.opened_reason = form.reason.trim();
    }

    onSubmit(payload);
  };

  return (
    <details className="hrl-block" open={isNew}>
      <summary className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <ShieldCheck size={14} /> سياسة الأجر وملفه
        </h2>
        {file ? (
          <span className="hrl-badge hrl-badge--flat">{IBAN_STATE_LABELS[file.iban_state]}</span>
        ) : (
          <span className="hrl-badge hrl-badge--flat">غير مفتوح بعد</span>
        )}
        <ChevronDown size={14} aria-hidden="true" />
      </summary>

      <form onSubmit={submit}>
        <div className="hrl-block__b">
          {isNew && (
            <fieldset className="hrl-fset">
              <legend className="hrl-fset__t">فتح الملف</legend>
              <div className="hr-field">
                <label htmlFor="file-reason">سبب الفتح</label>
                <input
                  id="file-reason"
                  type="text"
                  value={form.reason}
                  onChange={(event) => set({ reason: event.target.value })}
                  placeholder="تعيين جديد · عقد موقع…"
                  maxLength={500}
                  required
                  disabled={!canManage}
                />
                <p className="hrl-hint">
                  فتح ملف الأجر تأكيد بأن هذا الموظف يصرف له. ويسجل باسمك وتاريخه وسببه.
                </p>
              </div>
            </fieldset>
          )}

          <fieldset className="hrl-fset">
            <legend className="hrl-fset__t">نظام التأمينات الاجتماعية</legend>

            <div className="hrl-typegrid" role="radiogroup" aria-label="نظام التأمينات">
              {SCHEMES.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={form.scheme === key}
                  className={`hrl-typecell${form.scheme === key ? ' is-on' : ''}`}
                  onClick={() => set({ scheme: key })}
                  disabled={!canManage}
                >
                  <span className="hrl-typecell__n">{GOSI_SCHEME_LABELS[key]}</span>
                  <span className="hrl-typecell__r">{GOSI_SCHEME_HINTS[key]}</span>
                </button>
              ))}
            </div>

            <p className="hrl-hint">
              يحدد يدوياً دائماً ولا يستنتج من الجنسية: حقل الجنسية نص حر، والاستنتاج منه
              يخصم من وافد حصة لا يوجبها النظام.
            </p>

            <div className="hr-field">
              <label htmlFor="file-gosi-number">رقم التأمينات</label>
              <input
                id="file-gosi-number"
                type="text"
                dir="ltr"
                value={form.gosiNumber}
                onChange={(event) => set({ gosiNumber: event.target.value })}
                maxLength={40}
                disabled={!canManage}
              />
            </div>
          </fieldset>

          <fieldset className="hrl-fset">
            <legend className="hrl-fset__t">أساس تجزئة الشهر</legend>

            <div className="hrl-typegrid" role="radiogroup" aria-label="أساس تجزئة الشهر">
              {BASES.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={form.basis === key}
                  className={`hrl-typecell${form.basis === key ? ' is-on' : ''}`}
                  onClick={() => set({ basis: key })}
                  disabled={!canManage}
                >
                  <span className="hrl-typecell__n">{PRORATION_LABELS[key]}</span>
                  <span className="hrl-typecell__r">{PRORATION_HINTS[key]}</span>
                </button>
              ))}
            </div>

            <p className="hrl-legal">
              <span>
                المقام الافتراضي ثلاثون بنص المادة ٢، ويتغير إلى أيام الشهر الفعلية
                متى نصت لائحة المكتب على ذلك. والشهر الكامل لا يمر بقسمة أصلاً.
              </span>
              <span className="hrl-legal__ref">م.٢</span>
            </p>

            <div className="hr-field">
              <label htmlFor="file-definition">تعريف «الأجر الأساسي»</label>
              <select
                id="file-definition"
                value={form.definition}
                onChange={(event) => set({ definition: event.target.value as BasicWageDefinition })}
                disabled={!canManage}
              >
                {DEFINITIONS.map((key) => (
                  <option key={key} value={key}>
                    {BASIC_DEFINITION_LABELS[key]}
                  </option>
                ))}
              </select>
              <p className="hrl-hint">هذا قرار سياسة. وعليه فقط تحسب زيادة العمل الإضافي.</p>
            </div>
          </fieldset>

          <fieldset className="hrl-fset">
            <legend className="hrl-fset__t">الصرف والحساب البنكي</legend>

            <div className="hr-field">
              <label htmlFor="file-method">طريقة الصرف</label>
              <select
                id="file-method"
                value={form.method}
                onChange={(event) => set({ method: event.target.value as PaymentMethod })}
                disabled={!canManage}
              >
                {METHODS.map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_METHOD_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            {canViewAmounts ? (
              <div className="hr-field">
                <label htmlFor="file-iban">الآيبان</label>
                <input
                  id="file-iban"
                  type="text"
                  dir="ltr"
                  value={form.iban}
                  onChange={(event) => set({ iban: event.target.value })}
                  placeholder="SA00 0000 0000 0000 0000 0000"
                  maxLength={34}
                  disabled={!canManage}
                />
                <p className="hrl-hint">
                  ينسق ويتم التحقق من صيغته قبل الحفظ (بادئة SA · ٢٤ خانة · خانتا تحقق). خانة
                  واحدة مقلوبة قد تفسد كشف الرواتب المسلم للبنك كله لا سطرها فقط.
                </p>
              </div>
            ) : (
              <p className="hrl-hint">
                الآيبان محجوب عنك. وحالته ظاهرة أعلى هذه اللوحة فيعمل قياس الجاهزية بلا رقم.
              </p>
            )}

            <div className="hr-field hr-field--row">
              <div className="hr-field">
                <label htmlFor="file-bank">البنك</label>
                <input
                  id="file-bank"
                  type="text"
                  value={form.bank}
                  onChange={(event) => set({ bank: event.target.value })}
                  maxLength={120}
                  disabled={!canManage}
                />
              </div>

              <div className="hr-field">
                <label htmlFor="file-holder">اسم صاحب الحساب</label>
                <input
                  id="file-holder"
                  type="text"
                  value={form.holder}
                  onChange={(event) => set({ holder: event.target.value })}
                  maxLength={180}
                  disabled={!canManage}
                />
              </div>
            </div>
          </fieldset>
        </div>

        {errorText ? (
          <div className="hrl-flags">
            <p className="hrl-flag hrl-flag--block">
              <span className="hrl-flag__t">{errorText}</span>
            </p>
          </div>
        ) : null}

        {canManage && (
          <div className="hrl-drawer__f">
            <span className="hrl-hint">
              {form.scheme === '' ? 'اختر نظام التأمينات أولاً.' : 'السياسة تحفظ مرة ولا تكتب نسخة أجر.'}
            </span>
            <span className="hrl-block__a">
              <button type="submit" className="hr-btn hr-btn--sm" disabled={!ready}>
                {saving ? <Loader2 size={13} /> : isNew ? <BadgeCheck size={13} /> : <Save size={13} />}
                {saving ? 'جارٍ الحفظ…' : isNew ? 'افتح ملف الأجر' : 'احفظ السياسة'}
              </button>
            </span>
          </div>
        )}
      </form>
    </details>
  );
};

export default WageFileForm;
