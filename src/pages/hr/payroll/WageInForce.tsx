import React from 'react';
import { EyeOff, Wallet } from 'lucide-react';

import {
  BASIC_DEFINITION_LABELS,
  COMPOSITION_LABELS,
  EMPTY_MARK,
  GOSI_SCHEME_LABELS,
  PRORATION_LABELS,
  fmtDateHuman,
  money,
} from './payrollFormat';
import type { WageVesselsPayload } from '../../../types/hrPayroll';

/**
 * **الأجرُ الساري اليوم** — رقمٌ واحدٌ كبيرٌ ثمّ الأوعية.
 *
 * ══════ لماذا ثلاثةُ أوعيةٍ لا رقمٌ واحد ══════
 * م.٢ تعرّف مقدارين مختلفين وتبني عليهما موادَّ مختلفة: «الأجر» (الكلّ) أساسُ الإجازة
 * والمكافأة وسقفِ الحسم ٥٠٪، و«الأجر الأساسيّ» أساسُ زيادة العمل الإضافيّ ٥٠٪ **وحدَها**،
 * ووعاءُ التأمينات ثالثٌ (الأساسيُّ + السكن). عرضُها مجموعةً واحدةً يجعل القارئَ يظنّها
 * رقماً واحداً — وهو أوّلُ خطأٍ في كلّ قسيمةٍ رديئة.
 *
 * ══════ 🔴 ما لم يُحسب بعدُ يُقال ══════
 * وعاءُ التأمينات هنا **قبل الحدَّين** (الأدنى والأعلى): قاعدتاهما بياناتٌ مؤرَّخةٌ تصل في
 * خطوةٍ لاحقة. فيُكتب ذلك صراحةً تحت الرقم. «إخفاءُ ما لم يُحسب يصنع سؤالاً، وإظهارُه
 * معطَّلاً يقتل السؤال» — وادّعاءُ تسقيفٍ لم يقع يشتري ثقةً بلا مقابل.
 *
 * ══════ الحجب ══════
 * `vessels === null` لها معنيان يفرّقهما `canViewAmounts` وحدَه: «لا راتبَ مسجَّل» (حالةٌ
 * حقيقيةٌ تُعالَج بزرّ) و«محجوبٌ عنك» (حالةُ صلاحية). خلطُهما يعرض دعوةَ تهيئةٍ لمكتبٍ
 * رواتبُه مكتملة.
 */

interface Props {
  vessels: WageVesselsPayload | null;
  canViewAmounts: boolean;
  hasWageRecord: boolean;
}

export const WageInForce: React.FC<Props> = ({ vessels, canViewAmounts, hasWageRecord }) => {
  if (!canViewAmounts) {
    return (
      <section className="hrl-block">
        <div className="hrl-block__h">
          <h2 className="hrl-block__t hrl-h2">
            <Wallet size={14} /> الأجر الساري
          </h2>
        </div>
        <div className="hrl-state hrl-state--locked">
          <EyeOff size={20} />
          <p className="hrl-state__t">الأرقامُ محجوبةٌ عنك</p>
          <p className="hrl-state__d">
            الأجرُ والآيبان حقلان حسّاسان لهما صلاحيةٌ مستقلّة (عرض التعويضات). وحالةُ الجاهزية
            أمامك كاملةً: {hasWageRecord ? 'لهذا المنسوب أجرٌ مسجَّل.' : 'لا أجرَ مسجَّلاً لهذا المنسوب بعد.'}
          </p>
        </div>
      </section>
    );
  }

  if (vessels === null) {
    return (
      <section className="hrl-block">
        <div className="hrl-block__h">
          <h2 className="hrl-block__t hrl-h2">
            <Wallet size={14} /> الأجر الساري
          </h2>
        </div>
        <div className="hrl-state hrl-state--empty">
          <Wallet size={20} />
          <p className="hrl-state__t">لم يُسجَّل راتبٌ لهذا المنسوب</p>
          <p className="hrl-state__d">
            سجِّل النسخةَ الأولى بتاريخ سريانها من النموذج أدناه — ومنها يعمل خطابُ تعريف الراتب
            ويدخل المنسوبُ مسيرَ الرواتب.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="hrl-block">
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <Wallet size={14} /> الأجر الساري
        </h2>
        <span className="hrl-badge hrl-badge--flat">{COMPOSITION_LABELS[vessels.composition]}</span>
      </div>

      {/* طبقةٌ أولى: رقمٌ واحدٌ كبير. العملةُ **خارج** نطاق `dir="ltr"` فلا يُعاد ترتيبُها. */}
      <div className="hrl-num">
        <span className="hrl-num__v" dir="ltr">
          {money(vessels.wage_actual)}
        </span>
        <span className="hrl-num__u">{vessels.currency}</span>
      </div>
      <p className="hrl-num__label">
        الأجرُ الشهريّ (م.٢) · يسري من {fmtDateHuman(vessels.effective_from)}
        {vessels.effective_to ? ` حتى ${fmtDateHuman(vessels.effective_to)}` : ''}
      </p>

      {/* طبقةٌ ثانية: المكوّناتُ حدوداً ملتصقة — تُعرَض ولا تُنقر (لا شاشةَ تفصيلٍ خلفها بعد). */}
      <div className="hrl-formula">
        <span className="hrl-formula__term hrl-formula__term--static hrl-formula__term--muted">
          <span className="hrl-formula__k">الأساسي</span>
          <span className="hrl-formula__v" dir="ltr">
            {money(vessels.basic_amount)}
          </span>
        </span>
        <span className="hrl-formula__term hrl-formula__term--static hrl-formula__term--muted">
          <span className="hrl-formula__k">بدل سكن</span>
          <span className="hrl-formula__v" dir="ltr">
            {money(vessels.housing_amount)}
          </span>
        </span>
        <span className="hrl-formula__term hrl-formula__term--static hrl-formula__term--muted">
          <span className="hrl-formula__k">بدل نقل</span>
          <span className="hrl-formula__v" dir="ltr">
            {money(vessels.transport_amount)}
          </span>
        </span>
        <span className="hrl-formula__term hrl-formula__term--static hrl-formula__term--muted">
          <span className="hrl-formula__k">بدلات أخرى</span>
          <span className="hrl-formula__v" dir="ltr">
            {money(vessels.other_amount)}
          </span>
        </span>
        <span className="hrl-formula__term hrl-formula__term--static hrl-formula__term--sum">
          <span className="hrl-formula__k">المجموع</span>
          <span className="hrl-formula__v" dir="ltr">
            {money(vessels.wage_actual)}
          </span>
        </span>
      </div>

      <div className="hrl-block__b">
        <dl className="hrl-kv">
          <dt>الأجر الأساسي (م.١٠٧)</dt>
          <dd dir="ltr">{money(vessels.wage_basic)}</dd>

          <dt>وعاء التأمينات</dt>
          <dd dir="ltr">{money(vessels.wage_gosi)}</dd>

          <dt>أجر اليوم النظامي (م.٢)</dt>
          <dd dir="ltr">{money(vessels.statutory_daily_wage)}</dd>

          <dt>نظام التأمينات</dt>
          <dd>{vessels.gosi_scheme ? GOSI_SCHEME_LABELS[vessels.gosi_scheme] : EMPTY_MARK}</dd>

          <dt>تعريف الأساسي</dt>
          <dd>{BASIC_DEFINITION_LABELS[vessels.basic_wage_definition]}</dd>

          <dt>أساس التجزئة</dt>
          <dd>{PRORATION_LABELS[vessels.proration_basis]}</dd>
        </dl>
      </div>

      <p className="hrl-legal">
        <span>
          «الأجر» يشمل الأساسيَّ وكلَّ البدلات، و«الأجر الأساسيّ» وحدَه أساسُ زيادة العمل الإضافيّ.
          مقداران مختلفان في النظام لا صيغتان لرقمٍ واحد.
        </span>
        <span className="hrl-legal__ref">م.٢ · م.١٠٧</span>
      </p>

      {vessels.gosi_caps_evaluated ? null : (
        <p className="hrl-note">
          وعاءُ التأمينات معروضٌ قبل الحدَّين الأدنى والأعلى — قاعدتاهما بياناتٌ مؤرَّخةٌ تصل مع
          محرّك المسير، ولا يُدَّعى هنا تسقيفٌ لم يقع.
        </p>
      )}
    </section>
  );
};

export default WageInForce;
