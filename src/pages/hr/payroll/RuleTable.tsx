import React from 'react';
import { BookOpen, CircleDashed, CircleCheck, CircleSlash } from 'lucide-react';

import {
  ENFORCEMENT_HINTS,
  ENFORCEMENT_LABELS,
  EMPTY_MARK,
  flattenPayload,
  fmtDateHuman,
  RULE_KIND_LABELS,
  ruleEnforcement,
} from './payrollFormat';
import type { PayrollRule } from '../../../types/hrPayroll';

/**
 * جدولُ القواعد النظامية — **بالمادّة لا بالكود**.
 *
 * ══════ الرمزُ ليس عنواناً ══════
 * «`ksa.labor.art93.total_cap`» لغةُ مبرمجٍ في وجه مديرِ مكتبِ محاماة. العنوانُ المادّةُ
 * ونصُّها، والرمزُ سطرٌ ثانويٌّ صغير — موجودٌ لأنّ مَن يدقّق يحتاجه، لا لأنه العنوان.
 *
 * ══════ وحالةُ الإنفاذ عمودٌ لا حاشية ══════
 * ثلاثُ درجاتٍ متمايزة: **تُنفَّذ الآن** · **لم تُنفَّذ بعد** (قارئُها يصل في خطوته) ·
 * **للاطّلاع فقط**. وحذفُ التمييز يجعل الشاشةَ تَعِد بما لا يقع.
 *
 * ══════ الصفُّ يُفتَح فلا يُخفى شيء ══════
 * الأرقامُ المُلزِمةُ داخل الحمولة تُعرَض مسطَّحةً سطراً سطراً — لا JSON خامّاً ولا رقماً
 * مخبوءاً. ومصدرُ القاعدة يُطبَع معها: قاعدةٌ بلا مصدرٍ ادّعاءٌ لا مرجع.
 */

interface Props {
  rules: PayrollRule[];
  /** رمزُ الصفّ المفتوح — الحالةُ في الأب كي يبقى الجدولان متناسقين. */
  openCode: string | null;
  onToggle: (code: string) => void;
  emptyText: string;
}

const ENFORCEMENT_ICON = {
  enforced: CircleCheck,
  pending_reader: CircleDashed,
  reference: CircleSlash,
} as const;

export const RuleTable: React.FC<Props> = ({ rules, openCode, onToggle, emptyText }) => {
  if (rules.length === 0) {
    return <p className="hrl-hint">{emptyText}</p>;
  }

  return (
    <table className="hrl-table">
      <caption className="hrl-sr">قواعد نظام العمل المؤرخة السارية</caption>
      <thead>
        <tr>
          <th scope="col">المادة</th>
          <th scope="col">القاعدة</th>
          <th scope="col">النوع</th>
          <th scope="col">تسري من</th>
          <th scope="col">الحالة</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((rule) => {
          const enforcement = ruleEnforcement(rule);
          const Icon = ENFORCEMENT_ICON[enforcement];
          const open = openCode === rule.code;
          const rows = flattenPayload(rule.payload ?? {});

          return (
            <React.Fragment key={rule.code}>
              <tr className={open ? 'hrl-row--ok' : undefined}>
                <th scope="row">
                  <span className="hrl-legal__ref">{rule.article_ref}</span>
                </th>
                <td>
                  <button
                    type="button"
                    className="hrl-link"
                    aria-expanded={open}
                    aria-controls={`rule-${rule.code}`}
                    onClick={() => onToggle(rule.code)}
                  >
                    {rule.title_ar}
                  </button>
                  <span className="hrl-row__meta" dir="ltr">
                    {rule.code}
                  </span>
                </td>
                <td>{RULE_KIND_LABELS[rule.rule_kind] ?? rule.rule_kind}</td>
                {/* 🔴 بلا `dir="ltr"`: «٢٦ أبريل ٢٠٠٦» اسمُ شهرٍ عربيٌّ بأرقامٍ لاتينية،
                    والوسمُ الجامعُ عليه ينتزع اليومَ من شهره — عطلُ `AttendanceDayDetail`
                    نفسُه. اتجاهُ الصفحةِ يكفي: الأرقامُ وحدَها تُشكّل مقطعاً لاتينياً. */}
                <td>{fmtDateHuman(rule.effective_from)}</td>
                <td>
                  <span className="hrl-badge hrl-badge--flat" title={ENFORCEMENT_HINTS[enforcement]}>
                    <Icon size={12} /> {ENFORCEMENT_LABELS[enforcement]}
                  </span>
                </td>
              </tr>

              {open && (
                <tr id={`rule-${rule.code}`} className="hrl-row--static">
                  <td colSpan={5}>
                    <div className="hrp-rule">
                      {/* من يقرؤها — أو أنّها لا تُقرأ بعد، بخطوتها المعلَنة. */}
                      <p className="hrp-rule__who">
                        <BookOpen size={13} />
                        {rule.reader === null
                          ? 'لا محرك احتساب مسجل لهذه القاعدة.'
                          : rule.reader.shipped
                            ? `يطبقها: ${rule.reader.what}`
                            : `سيطبقها في الخطوة ${rule.reader.step}: ${rule.reader.what}`}
                      </p>

                      {/* المفتاحُ مسارٌ لاتينيٌّ دائماً ⇒ `ltr` صريح. أمّا القيمةُ فقد
                          تكون عربيةً («م.٩٢/١» في مرجع الفقرة) أو لاتينيةً أو رقماً —
                          فـ`auto` تدع أوّلَ حرفٍ قويٍّ يحكم، ووسمٌ ثابتٌ يمزّق أحدَهما. */}
                      {rows.length > 0 && (
                        <dl className="hrl-kv">
                          {rows.map((row) => (
                            <React.Fragment key={row.key}>
                              <dt dir="ltr">{row.key}</dt>
                              <dd dir="auto">{row.value}</dd>
                            </React.Fragment>
                          ))}
                        </dl>
                      )}

                      <p className="hrl-legal">
                        {rule.source_note ?? `${EMPTY_MARK} بلا مصدر مسجل`}
                      </p>

                      <p className="hrl-hint">
                        {rule.confirmed_at === null
                          ? 'غير موثقة بعد.'
                          : rule.confirmed_by === null
                            ? 'مؤكَّدة نظاماً. النص منشور وتمت مراجعته قبل النشر.'
                            : `أكدها المكتب في ${fmtDateHuman(rule.confirmed_at)}.`}
                        {' '}
                        وتعديلها لاحقاً ينشئ نسخة مؤرخة جديدة، فلا يعاد حساب شهر مضى.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
};

export default RuleTable;
