import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Banknote, Building2, FileSpreadsheet, Landmark, Lightbulb, Upload } from 'lucide-react';

/**
 * 📘 **دورةُ الرواتب والبنك** · `/hr/payroll/bank-cycle`.
 *
 * ══════ 🔴🔴 لماذا وُجدت هذه الصفحة ══════
 * لأنّ اللبسَ في هذا الباب **يجرّ مسؤولية**. مديرُ مكتبٍ يظنّ أنّ زرَّ «نزّل الكشف» يعني أنّ
 * النظامَ رفع عنه شيئاً إلى الجهة الحكومية — فيتوقّف عند حدّ التنزيل، وتنقضي المهلةُ، وتُوقَف
 * خدماتُ منشأته (التأشيراتُ · نقلُ العمالة · شهادةُ السعودة · صرفُ العقود الحكومية) وهو
 * يحسب نفسَه ملتزماً. فالصفحةُ تقول الدورةَ كما هي في أربع خطواتٍ لا تحتمل التأويل.
 *
 * ══════ الحقيقةُ التي تحكم كلَّ سطرٍ هنا ══════
 * **الملفّان اثنان لا واحد**:
 *   ① المنشأة ← البنك: **ملفُّ إدخال**. صيغتُه باتفاق البنك والمنشأة، غيرُ موحّدةٍ وطنيّاً.
 *      وهذا وحدَه ما يولّده النظام.
 *   ② البنك ← المنشأة ← المنصّة الحكومية: **ملفُّ الأجور الموقَّع رقمياً**. يُنشئه البنكُ بعد
 *      تنفيذ التحويلات ويوقّعه بمفتاحه الخاصّ، وتتحقّق منه المنصّةُ بالمفتاح العامّ للبنك
 *      المحفوظِ لديها. فلا يستطيعه نظامٌ آخرُ بحال.
 *
 * ══════ 🔴 ولا رقمَ التزامٍ في هذه الصفحة ══════
 * معادلةُ نسبة الالتزام مقامُها **عددُ المسجَّلين في التأمينات لدى المنشأة**، ولا نملكه.
 * وعرضُ نسبةٍ مقدَّرةٍ تطمينٌ كاذبٌ لمكتبٍ قد يكون مخالفاً.
 *
 * ══════ 🔴 «نُرشد ولا نربط» ══════
 * مكاتبُنا كلُّها تحت ألف موظف، وهي مؤهَّلةٌ لنظام إدارة الرواتب لدى المنصّة الحكومية —
 * يرفع الملفَّ آليّاً بلا اتفاقيةِ بنك. فيُذكَر إرشاداً بلا رابطٍ ولا اشتراكٍ ولا وساطة: لا
 * نتكامل معه ولا نبيعه.
 *
 * ══════ ولا رقمَ غرامةٍ ══════
 * «عشرةُ آلاف ريال» رقمٌ متداوَلٌ **لم يُؤكَّد من مصدرٍ رسميّ** — فلا يُكتب. وأثرُ المخالفة
 * المذكورُ هنا موقوفُ خدماتٍ لا مبلغٌ مخترَع.
 */

interface Step {
  n: string;
  icon: React.ReactNode;
  title: string;
  who: string;
  body: string;
}

const STEPS: Step[] = [
  {
    n: '١',
    icon: <FileSpreadsheet size={14} aria-hidden="true" />,
    title: 'المكتبُ يُصدّر كشفَ الرواتب',
    who: 'يقع في هذا النظام',
    body:
      'من شاشة المسير بعد اعتماده: ملفُّ إدخالٍ بأعمدةٍ عامّةٍ واضحة — الاسمُ والهويةُ والآيبانُ '
      + 'ورمزُ البنك والأجرُ والاستقطاعُ والصافي. وصيغتُه باتفاق البنك والمنشأة لا صيغةٌ موحّدةٌ '
      + 'وطنيّاً، فتُطابَق بقالب بنكك أوّلَ مرّةٍ ثمّ تثبت.',
  },
  {
    n: '٢',
    icon: <Landmark size={14} aria-hidden="true" />,
    title: 'يرفعه إلى بنكه فينفّذ التحويلات',
    who: 'يقع لدى البنك',
    body:
      'عبر قناة البنك التي يستعملها المكتب. والتحويلُ لا يقع بضغطةٍ من هنا — ولا يعرف هذا '
      + 'النظامُ أنّ التحويلَ نُفِّذ إلا حين يُسجَّل تأكيدُ الصرف في شاشة الدفع بمرجعٍ بنكيّ.',
  },
  {
    n: '٣',
    icon: <Banknote size={14} aria-hidden="true" />,
    title: '🔑 يطلب من البنك ملفَّ الأجور الموقَّع',
    who: 'يقع لدى البنك — وهو الخطوةُ المنسيّة',
    body:
      'بعد تنفيذ التحويلات يُقدَّم طلبٌ للمصرف للحصول على ملفّ الأجور موقَّعاً إلكترونياً. '
      + 'يُنشئه البنكُ ويوقّعه بمفتاحه الخاصّ، وتتحقّق منه المنصّةُ الحكوميةُ بالمفتاح العامّ '
      + 'للبنك المحفوظِ لديها — ليُثبت أنّ الملفَّ عولج من البنك ولم يُعدَّل. ولذلك لا يولّده '
      + 'هذا النظامُ ولا أيُّ نظامٍ آخر: أيُّ ملفٍّ يولّده غيرُ البنك يسقط في ذلك التحقّق.',
  },
  {
    n: '٤',
    icon: <Upload size={14} aria-hidden="true" />,
    title: 'يرفع الملفَّ الموقَّع خلال ثلاثين يوماً',
    who: 'تقوم به المنشأة بنفسها',
    body:
      'المهلةُ ثلاثون يوماً من تاريخ الاستحقاق — وهو أوّلُ يومٍ من الشهر التالي للأجر. '
      + 'وقد خُفّضت من ستّين إلى ثلاثين اعتباراً من ١ مارس ٢٠٢٥. والعدّادُ على شاشة المسير '
      + 'وفي لوحة الرواتب يقول كم بقي ومتى تنقضي.',
  },
];

const FACTS: { title: string; body: string }[] = [
  {
    title: 'النقدُ والشيك لا يُحتسبان مدفوعَين',
    body:
      'من يُصرف له نقداً أو بشيك لا يُعدُّ أجرُه مدفوعاً في نظام حماية الأجور بحال — والمكتبُ '
      + 'دفع فعلاً فيظنّ نفسه ملتزماً. وهؤلاء لا يدخلون كشفَ البنك أصلاً، وأسماؤهم تُطبَع في ذيل '
      + 'الملفّ كي لا يختفوا.',
  },
  {
    title: 'ملفّاتُ التسويات لا ترفع النسبة',
    body: 'ما يُرفع بوصفه ملفَّ تسويةٍ لا يُحتسب في نسبة الالتزام — فلا يُعوَّل عليه بديلاً عن ملفّ الأجور.',
  },
  {
    title: 'ولا نعرض نسبةَ التزامٍ رقماً',
    body:
      'المعادلةُ: العمّالُ الذين حُوِّلت أجورُهم وقُبلت سجلاتُهم والمسجَّلون في التأمينات ÷ '
      + 'مجموعِ المسجَّلين في التأمينات لدى المنشأة. والمقامُ عددٌ لا يملكه هذا النظام — فأيُّ '
      + 'نسبةٍ نعرضها تخمينٌ، وتطمينٌ كاذبٌ لمكتبٍ قد يكون مخالفاً.',
  },
  {
    title: 'وأثرُ المخالفة ليس مالياً وحدَه',
    body: 'إيقافُ خدماتِ التأشيرات ونقلِ العمالة وشهادةِ السعودة وصرفِ العقود الحكومية.',
  },
];

export const BankCycleGuidePage: React.FC = () => (
  <div className="hrl-page">
    <header className="hrl-head">
      <div className="hrl-head__id">
        <h1 className="hrl-h1">
          <Landmark size={16} /> دورةُ الرواتب والبنك
        </h1>
        <p className="hrl-sub">
          ما يفعله النظام، وما يفعله البنك، وما تفعله المنشأةُ بنفسها — في أربع خطوات.
        </p>
      </div>

      <div className="hrl-head__badges">
        <span className="hrl-fact hrl-fact--gold">
          المهلة
          <span className="hrl-fact__n" dir="ltr">
            30
          </span>
        </span>
        <span className="hrl-fact">
          من تاريخ
          <span className="hrl-fact__n">الاستحقاق</span>
        </span>
      </div>
    </header>

    <div className="hrl-cols">
      <div className="hrl-cols__main">
        <div className="hrl-wall">
          {/* ══ 🔴 اللبسُ يُقتل في أوّل بلوكٍ لا في ذيل الصفحة ══ */}
          <section className="hrl-block" aria-labelledby="two-files-h">
            <header className="hrl-block__h">
              <h2 className="hrl-block__t" id="two-files-h">
                <AlertTriangle size={14} /> الملفّان اثنان لا واحد
              </h2>
            </header>

            <div className="hrl-block__b">
              <dl className="hrl-kv">
                <dt>① ملفُّ الإدخال</dt>
                <dd>
                  <strong>المنشأةُ ← البنك.</strong> هذا وحدَه ما يولّده هذا النظام. صيغتُه
                  باتفاق البنك والمنشأة، وليست صيغةً موحّدةً وطنيّاً — فتُطابَق بقالب بنكك أوّلَ
                  مرّة.
                </dd>
                <dt>② ملفُّ الأجور الموقَّع</dt>
                <dd>
                  <strong>البنكُ ← المنشأةُ ← المنصّة الحكومية.</strong> يُنشئه البنكُ بعد تنفيذ
                  التحويلات ويوقّعه بمفتاحه الخاصّ. <strong>لا يُنتجه هذا النظام ولا يستطيعه</strong>،
                  ورفعُه فعلٌ تقوم به المنشأة.
                </dd>
              </dl>

              <p className="hrl-hint">
                ولذلك لا تجد في هذا النظام زرّاً اسمُه «ارفع» ولا وسماً «مطابق»: ما لا نستطيعه
                لا يُبنى له زرٌّ يوهم بأنّه وقع.
              </p>
            </div>
          </section>

          <section className="hrl-block" aria-labelledby="steps-h">
            <header className="hrl-block__h">
              <h2 className="hrl-block__t" id="steps-h">
                الدورةُ في أربع خطوات
              </h2>
            </header>

            <div className="hrl-block__b hrl-block__b--flush">
              <ol className="hrp-cycle">
                {STEPS.map((step) => (
                  <li className="hrp-cycle__i" key={step.n}>
                    <span className="hrp-cycle__n" dir="ltr">
                      {step.n}
                    </span>
                    <div className="hrp-cycle__b">
                      <p className="hrp-cycle__t">
                        {step.icon} {step.title}
                      </p>
                      <p className="hrp-cycle__w">{step.who}</p>
                      <p className="hrp-cycle__d">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="hrl-block" aria-labelledby="facts-h">
            <header className="hrl-block__h">
              <h2 className="hrl-block__t" id="facts-h">
                <AlertTriangle size={14} /> أربعُ حقائقَ تُغيّر القرار
              </h2>
            </header>

            <div className="hrl-block__b">
              <dl className="hrl-kv">
                {FACTS.map((fact) => (
                  <React.Fragment key={fact.title}>
                    <dt>{fact.title}</dt>
                    <dd>{fact.body}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          </section>
        </div>
      </div>

      <aside className="hrl-cols__side">
        {/* 💡 نُرشد ولا نربط — بلا رابطٍ ولا اشتراكٍ ولا وساطة */}
        <section className="hrl-block" aria-labelledby="tip-h">
          <header className="hrl-block__h">
            <h2 className="hrl-block__t" id="tip-h">
              <Lightbulb size={14} /> طريقٌ أقصرُ لمكتبك
            </h2>
          </header>

          <div className="hrl-block__b">
            <p className="hrl-hint">
              مكاتبُ المحاماة عندنا كلُّها تحت ألف موظف، وهي بذلك <strong>مؤهَّلةٌ لنظام إدارة
              الرواتب</strong> لدى المنصّة الحكومية — يرفع ملفَّ الأجور آليّاً <strong>بلا حاجةٍ
              إلى اتفاقيةِ بنك</strong>، باشتراكٍ سنويٍّ يقع بين ٤٦٠ و٩٢٠ ريالاً بحسب الباقة.
            </p>
            <p className="hrl-hint">
              ونحن <strong>نُرشد ولا نربط</strong>: لا تكاملَ بيننا وبينه، ولا اشتراكَ يُباع من
              هنا، ولا بياناتِ مكتبٍ تخرج إليه. راجِعه بنفسك إن ناسبك.
            </p>
          </div>
        </section>

        <section className="hrl-block" aria-labelledby="where-h">
          <header className="hrl-block__h">
            <h2 className="hrl-block__t" id="where-h">
              <Building2 size={14} /> أين تجد كلَّ خطوة
            </h2>
          </header>

          <div className="hrl-block__b">
            <dl className="hrl-kv">
              <dt>هويّةُ المكتب لدى بنكه</dt>
              <dd>
                رمزُ البنك ورقمُ المنشأة لديه وحسابُ الخصم — تُدخَل مرّةً، ويُعلن المدقّقُ ما ينقص
                منها بالاسم.
              </dd>
              <dt>حساباتُ المنسوبين</dt>
              <dd>
                <Link className="hrl-link" to="/hr/payroll/wages">
                  سجلُّ الأجور
                </Link>{' '}
                — والآيبانُ يُفحَص بـmod-97 عند الإدخال لا عند البنك.
              </dd>
              <dt>تصديرُ الكشف والعدّاد</dt>
              <dd>شاشةُ المسير بعد اعتماده.</dd>
              <dt>تسجيلُ الصرف</dt>
              <dd>شاشةُ الدفع — بمرجعٍ بنكيٍّ يُطابَق بكشف الحساب.</dd>
            </dl>
          </div>
        </section>
      </aside>
    </div>
  </div>
);

export default BankCycleGuidePage;
