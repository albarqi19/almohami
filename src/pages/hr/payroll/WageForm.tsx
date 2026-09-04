import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Save } from 'lucide-react';

import {
  COMPOSITION_LABELS,
  PAY_FREQUENCY_LABELS,
  effectImpact,
  money,
  sumMoney,
  todayISO,
} from './payrollFormat';
import type { PayFrequency, WageComposition, WageRecordPayload } from '../../../types/hrPayroll';

/**
 * **نموذجُ نسخةِ الأجر** — تغييرُ الراتب صفٌّ جديدٌ من تاريخ، لا تعديلٌ لصفٍّ قائم.
 *
 * ══════ 🔴 ثلاثةُ قراراتٍ في هذا النموذج ══════
 *
 * ① **`effective_from` حقلٌ أوّلُ لا أخير، وبلا افتراضٍ صامت.** تاريخُ السريان هو المعلومةَ
 *    كلَّها في خطٍّ زمنيّ: من يكتب الراتبَ ثم يترك التاريخ يقع على «اليوم» يكتب تاريخاً لم
 *    يقصده — وقد يقع داخل شهرٍ صُرف. فيُملأ بـ«اليوم» **ظاهراً قابلاً للتغيير**، ويُعرَض
 *    أثرُه قبل الحفظ لا بعده.
 *
 * ② **لا خانةَ مجموعٍ يكتبها المستخدم.** المجموعُ محسوبٌ حيّاً ومعطَّلٌ للكتابة، ويشتقّه
 *    الخادمُ ثانيةً بـ`Money`. إجماليٌّ يخالف مكوّناتِه يصنع خطابَ تعريفٍ يشهد برقمٍ لا
 *    تجمعه بنودُه. والجمعُ هنا **بالهللات صحيحةً** (`sumMoney`) لا بـ`Number`: تمريرُ المال
 *    على العائم في المتصفّح يُعيد فتحَ البابِ الذي أُغلق على الخادم.
 *
 * ③ **«المبلغُ الواحد» اختيارٌ صريح** (`lump_sum`) لا خانةٌ متروكة. مكتبٌ يترك الأساسيَّ
 *    فارغاً ويكتب المبلغَ في «بدلات أخرى» يمرّ من كلّ حارسٍ وجوديّ، فيخرج بوعاءِ تأميناتٍ
 *    صفرٍ يرتطم بالحدّ الأدنى — نقصُ اشتراكٍ لا يُكتشف إلا عند التقاعد. فالاختيارُ يكتب
 *    المبلغَ في الأساسيّ ويقول أثرَه في السطر نفسِه.
 */

interface Props {
  /** يتغيّر بتغيّر المنسوب — يُعيد تهيئةَ النموذج فلا تتسرّب أرقامُ سابقٍ إلى لاحق. */
  profileId: number;
  /** تاريخُ سريان النسخة السارية — لبناء جملة الأثر («تُغلَق في …»). */
  currentFrom?: string | null;
  saving: boolean;
  errorText?: string | null;
  onSubmit: (payload: WageRecordPayload) => void;
}

const COMPOSITIONS: WageComposition[] = ['itemised', 'lump_sum'];
const FREQUENCIES: PayFrequency[] = ['monthly', 'weekly'];

interface FormState {
  effectiveFrom: string;
  composition: WageComposition;
  frequency: PayFrequency;
  basic: string;
  housing: string;
  transport: string;
  other: string;
  reason: string;
}

function blank(): FormState {
  return {
    effectiveFrom: todayISO(),
    composition: 'itemised',
    frequency: 'monthly',
    basic: '',
    housing: '',
    transport: '',
    other: '',
    reason: '',
  };
}

/** مبلغٌ مقبول: أرقامٌ وربّما نقطةٌ وخانتان. الفارغُ مقبولٌ (يعني صفراً في البدلات). */
function isAmount(value: string): boolean {
  return value === '' || /^\d{1,8}(\.\d{0,2})?$/.test(value);
}

export const WageForm: React.FC<Props> = ({ profileId, currentFrom, saving, errorText, onSubmit }) => {
  const [form, setForm] = useState<FormState>(blank);

  // تبديلُ المنسوب يُفرّغ النموذج — وهو ما يجعل «الحفظُ يقفز إلى التالي» آمناً: لا يبقى
  // رقمٌ من ملفٍّ سابقٍ في خانةٍ يراها المُدخِل مملوءةً فيحفظها لشخصٍ آخر.
  useEffect(() => {
    setForm(blank());
  }, [profileId]);

  const lump = form.composition === 'lump_sum';

  const total = useMemo(
    () => (lump ? sumMoney([form.basic]) : sumMoney([form.basic, form.housing, form.transport, form.other])),
    [lump, form.basic, form.housing, form.transport, form.other]
  );

  const impact = useMemo(() => effectImpact(form.effectiveFrom, currentFrom), [form.effectiveFrom, currentFrom]);

  const amountsValid =
    isAmount(form.basic) && isAmount(form.housing) && isAmount(form.transport) && isAmount(form.other);

  // 🔴 «له أجر» = أساسيٌّ **أكبرُ من صفر** لا «حقلٌ ممتلئ»: "0" سلسلةٌ صادقةٌ تمرّ من كلّ
  // اختبارٍ ضمنيّ ثمّ تُنتج سطرَ مسيرٍ بصفر ريال ووعاءَ تأميناتٍ صفر.
  const basicPositive = /^\d{1,8}(\.\d{0,2})?$/.test(form.basic) && /[1-9]/.test(form.basic.replace('.', ''));

  const ready =
    amountsValid && basicPositive && form.effectiveFrom !== '' && form.reason.trim().length >= 3 && !saving;

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;

    onSubmit({
      effective_from: form.effectiveFrom,
      change_reason: form.reason.trim(),
      wage_composition: form.composition,
      pay_frequency: form.frequency,
      basic_salary: form.basic,
      housing_allowance: lump ? '0' : form.housing || '0',
      transport_allowance: lump ? '0' : form.transport || '0',
      other_allowances: lump ? '0' : form.other || '0',
    });
  };

  return (
    <form className="hrl-block" onSubmit={submit}>
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <CalendarClock size={14} /> تسجيل نسخة أجر جديدة
        </h2>
      </div>

      <div className="hrl-block__b">
        <fieldset className="hrl-fset">
          <legend className="hrl-fset__t">من متى تسري؟</legend>

          <div className="hr-field">
            <label htmlFor="wage-from">تاريخ السريان</label>
            <input
              id="wage-from"
              type="date"
              value={form.effectiveFrom}
              onChange={(event) => set({ effectiveFrom: event.target.value })}
              required
            />
            <p className="hrl-hint">
              يقبل الماضي والمستقبل. وتغلق النسخة السابقة في هذا اليوم نفسه، فلا يتكرر يوم
              ولا يسقط يوم بين النسختين.
            </p>
          </div>
        </fieldset>

        <fieldset className="hrl-fset">
          <legend className="hrl-fset__t">تركيب الأجر</legend>

          <div className="hrl-typegrid" role="radiogroup" aria-label="تركيب الأجر">
            {COMPOSITIONS.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={form.composition === key}
                className={`hrl-typecell${form.composition === key ? ' is-on' : ''}`}
                onClick={() => set({ composition: key })}
              >
                <span className="hrl-typecell__n">{COMPOSITION_LABELS[key]}</span>
                <span className="hrl-typecell__r">
                  {key === 'itemised' ? 'أساسي وبدلات منفصلة' : 'المبلغ كله أساسي'}
                </span>
              </button>
            ))}
          </div>

          {lump && (
            <p className="hrl-hint">
              اختيار «مبلغ واحد» يكتب المبلغ كله في الأجر الأساسي. فيصير وعاء التأمينات
              هو المبلغ كله، وكذلك أساس زيادة العمل الإضافي.
            </p>
          )}
        </fieldset>

        <fieldset className="hrl-fset">
          <legend className="hrl-fset__t">المبالغ الشهرية</legend>

          <div className="hr-field hr-field--row">
            <div className="hr-field">
              <label htmlFor="wage-basic">الأجر الأساسي</label>
              <input
                id="wage-basic"
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={form.basic}
                onChange={(event) => isAmount(event.target.value) && set({ basic: event.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="hr-field">
              <label htmlFor="wage-housing">بدل السكن</label>
              <input
                id="wage-housing"
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={lump ? '' : form.housing}
                disabled={lump}
                onChange={(event) => isAmount(event.target.value) && set({ housing: event.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="hr-field hr-field--row">
            <div className="hr-field">
              <label htmlFor="wage-transport">بدل النقل</label>
              <input
                id="wage-transport"
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={lump ? '' : form.transport}
                disabled={lump}
                onChange={(event) => isAmount(event.target.value) && set({ transport: event.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="hr-field">
              <label htmlFor="wage-other">بدلات أخرى</label>
              <input
                id="wage-other"
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={lump ? '' : form.other}
                disabled={lump}
                onChange={(event) => isAmount(event.target.value) && set({ other: event.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
        </fieldset>

        {/* المجموعُ **محسوبٌ حيّاً ومعطَّلٌ للكتابة** — لا خانةَ إجماليٍّ يملؤها المستخدم. */}
        <div className="hrl-formula" aria-live="polite">
          <span className="hrl-formula__term hrl-formula__term--static hrl-formula__term--muted">
            <span className="hrl-formula__k">الأساسي</span>
            <span className="hrl-formula__v" dir="ltr">
              {money(form.basic || '0')}
            </span>
          </span>
          <span className="hrl-formula__term hrl-formula__term--static hrl-formula__term--muted">
            <span className="hrl-formula__k">+ سكن</span>
            <span className="hrl-formula__v" dir="ltr">
              {money(lump ? '0' : form.housing || '0')}
            </span>
          </span>
          <span className="hrl-formula__term hrl-formula__term--static hrl-formula__term--muted">
            <span className="hrl-formula__k">+ نقل</span>
            <span className="hrl-formula__v" dir="ltr">
              {money(lump ? '0' : form.transport || '0')}
            </span>
          </span>
          <span className="hrl-formula__term hrl-formula__term--static hrl-formula__term--muted">
            <span className="hrl-formula__k">+ أخرى</span>
            <span className="hrl-formula__v" dir="ltr">
              {money(lump ? '0' : form.other || '0')}
            </span>
          </span>
          <span className="hrl-formula__term hrl-formula__term--static hrl-formula__term--sum">
            <span className="hrl-formula__k">= الأجر الشهري</span>
            <span className="hrl-formula__v" dir="ltr">
              {money(total)}
            </span>
          </span>
        </div>

        <fieldset className="hrl-fset">
          <legend className="hrl-fset__t">دورة الصرف والسبب</legend>

          <div className="hrl-typegrid" role="radiogroup" aria-label="دورة الصرف">
            {FREQUENCIES.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={form.frequency === key}
                className={`hrl-typecell${form.frequency === key ? ' is-on' : ''}`}
                onClick={() => set({ frequency: key })}
              >
                <span className="hrl-typecell__n">{PAY_FREQUENCY_LABELS[key]}</span>
                <span className="hrl-typecell__r">
                  {key === 'monthly' ? 'مرة في الشهر' : 'مرة كل أسبوع على الأقل'}
                </span>
              </button>
            ))}
          </div>

          <p className="hrl-legal">
            <span>الأجر الشهري يدفع مرة في الشهر، وما سواه مرة كل أسبوع على الأقل. ولا توجد دورة ثالثة.</span>
            <span className="hrl-legal__ref">م.٩٠</span>
          </p>

          <div className="hr-field">
            <label htmlFor="wage-reason">سبب التسجيل أو التغيير</label>
            <input
              id="wage-reason"
              type="text"
              value={form.reason}
              onChange={(event) => set({ reason: event.target.value })}
              placeholder="علاوة سنوية · ترقية · الراتب التعاقدي الأول…"
              maxLength={500}
              required
            />
            <p className="hrl-hint">
              يظهر في سجل النسخ ويبقى محفوظاً للرجوع إليه لاحقاً.
            </p>
          </div>
        </fieldset>
      </div>

      {/* أثرُ الفعل **قبل** النقر لا بعده. */}
      <div className="hrp-effect">
        <p className="hrp-effect__t">
          <CalendarClock size={13} aria-hidden="true" /> ماذا يحدث عند الحفظ؟
        </p>
        <ul className="hrp-effect__l">
          {impact.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {errorText ? (
        <div className="hrl-flags">
          <p className="hrl-flag hrl-flag--block">
            <span className="hrl-flag__t">{errorText}</span>
          </p>
        </div>
      ) : null}

      <div className="hrl-drawer__f">
        <span className="hrl-hint">
          {basicPositive ? 'جاهز للحفظ.' : 'الأجر الأساسي مطلوب وأكبر من صفر.'}
        </span>
        <span className="hrl-block__a">
          <button type="submit" className="hr-btn hr-btn--primary hr-btn--sm" disabled={!ready}>
            {saving ? <Loader2 size={13} /> : <Save size={13} />}
            {saving ? 'جارٍ الحفظ…' : 'احفظ النسخة'}
          </button>
        </span>
      </div>
    </form>
  );
};

export default WageForm;
