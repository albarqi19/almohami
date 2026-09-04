import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Landmark, Lock, RefreshCw, Scale } from 'lucide-react';

import { hrPayrollService } from '../../../services/hrPayrollService';
import { EMPTY_MARK, errorText, fmtMonthHuman, money, PENALTY_STATE_LABELS } from './payrollFormat';

/**
 * **صندوقُ غرامات العمال** — `/hr/payroll/penalty-fund` (م.٧٣).
 *
 * ══════ لماذا توجد هذه الشاشةُ أصلاً ══════
 * لأنّ المادّةَ **توجب سجلّاً**: «لا يجوز التصرف في الغرامات إلا فيما يعود بالنفع على عمال
 * المنشأة». فحصيلةُ الغرامات ليست إيراداً للمكتب بل **التزامٌ محبوس**، ولا يُعرَف قدرُه إلا
 * بسجلٍّ يُقرأ: الاسمُ والأجرُ والمبلغُ والسببُ والتاريخ.
 *
 * ══════ 🔴 يُقرأ من الصفوف **المجمَّدة** وحدَها ══════
 * ما صُرف فعلاً لا ما نُوي: بندٌ في مسوّدةٍ لم يُخصم بعد، وعدُّه هنا يجعل رصيدَ الصندوق
 * يقول أكثرَ ممّا حُبس.
 *
 * ══════ وصلاحيتُه `hr.payroll.view` لا `hr.penalty.manage` ══════
 * سجلٌّ يوجبه النظامُ ليُطّلَع عليه؛ وحصرُه في يد من يوقّع الجزاءَ يفرّغ المادّةَ من معناها.
 */

export const PenaltyFundPage: React.FC = () => {
  const fundQuery = useQuery({
    queryKey: ['hr', 'payroll', 'penalty-fund'],
    queryFn: () => hrPayrollService.getPenaltyFund(),
    staleTime: 60_000,
  });

  const queryError = fundQuery.error;
  const lockedMessage =
    queryError instanceof Error && /غير مفعّل|غير مصرح|صلاحية|Unauthorized|Forbidden/i.test(queryError.message)
      ? queryError.message
      : null;

  if (lockedMessage !== null) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--locked">
          <Lock size={22} />
          <p className="hrl-state__t">سجل الغرامات غير متاح لك</p>
          <p className="hrl-state__d">{lockedMessage}</p>
        </div>
      </div>
    );
  }

  if (fundQuery.isLoading) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--loading">
          <span className="hrl-skel hrl-skel--line" />
          <span className="hrl-skel hrl-skel--line" />
        </div>
      </div>
    );
  }

  if (fundQuery.isError) {
    return (
      <div className="hrl-page">
        <div className="hrl-state hrl-state--error">
          <AlertTriangle size={22} />
          <p className="hrl-state__t">تعذر تحميل سجل الغرامات</p>
          <p className="hrl-state__d">{errorText(fundQuery.error, 'خطأ غير متوقع.')}</p>
          <button type="button" className="hr-btn hr-btn--sm" onClick={() => void fundQuery.refetch()}>
            <RefreshCw size={13} /> أعد المحاولة
          </button>
        </div>
      </div>
    );
  }

  const data = fundQuery.data?.data;
  const meta = fundQuery.data?.meta;
  const rows = data?.register ?? [];

  return (
    <div className="hrl-page">
      <header className="hrl-head">
        <div className="hrl-head__id">
          <h1 className="hrl-h1">
            <Landmark size={16} /> صندوق غرامات العمال
          </h1>
          <p className="hrl-sub">
            سجل توجبه المادة ٧٣. وحصيلته مبلغ مخصص لمنفعة العمال، وليس إيراداً للمكتب.
          </p>
        </div>

        <div className="hrl-head__badges">
          <span className="hrl-fact hrl-fact--gold">
            رصيد الصندوق
            <span className="hrl-fact__n" dir="ltr">
              {money(data?.balance ?? null) ?? EMPTY_MARK}
            </span>
          </span>
          <Link className="hrl-fact" to="/hr/payroll/penalties">
            الجزاءات التأديبية
          </Link>
        </div>
      </header>

      {meta !== undefined && (
        <div className="hrp-rule">
          <p className="hrp-rule__who">
            <Scale size={13} /> {meta.article_ref}
          </p>
          <p className="hrl-hint">{meta.notice}</p>
          <p className="hrl-hint">{meta.account_hint}</p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="hrl-state hrl-state--empty">
          <Landmark size={22} />
          <p className="hrl-state__t">لا غرامات محصلة</p>
          <p className="hrl-state__d">
            لم يتم تحصيل أي غرامة في قسيمة معتمَدة بعد. ويكتب السجل من القسائم المقفلة فقط:
            ما تم صرفه فعلاً.
          </p>
        </div>
      ) : (
        <table className="hrl-table hrp-roster">
          <thead>
            <tr>
              <th scope="col">الموظف</th>
              <th scope="col">أجره</th>
              <th scope="col">المبلغ</th>
              <th scope="col">الأساس</th>
              <th scope="col">المخالفة</th>
              <th scope="col">شهر الأثر</th>
              <th scope="col">المستند</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.item_id}>
                <th scope="row">
                  {row.employee_name}
                  {row.state !== null && (
                    <span className="hrl-row__meta">{PENALTY_STATE_LABELS[row.state]}</span>
                  )}
                </th>
                <td dir="ltr">{money(row.wage_actual) ?? EMPTY_MARK}</td>
                <td dir="ltr">{money(row.amount) ?? EMPTY_MARK}</td>
                <td>
                  {/* 🔑 «من أين جاء الرقم» — أيامٌ × أجرِ اليوم النظاميّ، يتحقّق منه أيُّ
                      إنسانٍ بالضرب. */}
                  {row.days === null || row.daily_wage === null ? (
                    EMPTY_MARK
                  ) : (
                    <span dir="ltr">
                      {money(row.daily_wage)} × {String(row.days).replace(/\.0$/, '')}
                    </span>
                  )}
                </td>
                <td>{row.offence ?? EMPTY_MARK}</td>
                <td>{fmtMonthHuman(row.accrual_period)}</td>
                <td>
                  {row.penalty_number ?? EMPTY_MARK}
                  <span className="hrl-row__meta">{row.payslip_number ?? row.run_number ?? EMPTY_MARK}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PenaltyFundPage;
