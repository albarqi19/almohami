import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, History, PenLine, Wallet } from 'lucide-react';

import { hrPayrollService } from '../../../services/hrPayrollService';
import { fmtLeaveDate } from '../leave/leaveFormat';
import { fmtSpan, money } from '../payroll/payrollFormat';
import { KvValue } from './KvValue';
import type { EmployeeProfile } from '../../../types/hr';

interface Props {
  /** مرساةُ القسم — من `SEC` في وحدة القفز، فلا يفترق عنوانٌ عن مرساته. */
  id: string;
  emp: EmployeeProfile;
}

/**
 * **الأجرُ والتعويضات — مطويٌّ · شرطيٌّ · بخطٍّ تاريخيٍّ وبابِ كتابة.**
 *
 * ══════ لماذا يُحذف من الشجرة ولا يُقفل ══════
 * `current_compensation` تصل `undefined` **لمن لا يملك `hr.compensation.view` ولمن لا
 * بيانات له معاً** (الخادمُ لا يحمّل العلاقةَ أصلاً)، فالشرطُ على الحقل عاجزٌ بنيوياً عن
 * التمييز بين «محميّ» و«فارغ». والأهمُّ: بلوكٌ يقول «الراتبُ محميّ» **يُخبر الغرفةَ أنّ
 * لهذا الشخص راتباً مسجَّلاً** — تسريبٌ ضمنيٌّ بلا رقم. ولذلك: `canComp` تُقرأ في الجدار،
 * وبلا الصلاحية **لا يُركَّب هذا الملفُّ إطلاقاً**.
 *
 * ══════ ما تغيّر: الكتابةُ صار لها شاشة ══════
 * كان هنا سطرٌ يقول «لا زرَّ كتابةٍ في v1» لأنّ `PUT /compensation` كان **يكتب تاريخاً بلا
 * نقطةِ قراءةٍ له**: تُغلَق نسخةٌ وتُدرَج أخرى ولا شاشةَ تُظهر ما جرى، فكان الزرُّ يَعِد بما
 * لا يُعرَض. وقد صار يُعرَض: `/hr/payroll/wages` تحمل النموذجَ كاملاً بحقوله الناقصة
 * (تاريخُ السريان · تركيبُ الأجر · دورةُ الصرف · السبب) والخطَّ التاريخيَّ ولوحَ الجاهزية.
 *
 * فالزرُّ هنا **وصلةٌ إلى الكاتب الواحد** لا نموذجٌ ثانٍ: كاتبان لجدولٍ واحدٍ بدلالتين
 * مختلفتين هو بالضبط ما يُنتج خطَّي أجرٍ متعارضين لنفس الموظف.
 *
 * ══════ الخطُّ التاريخيُّ يُجلَب عند الفتح لا مع الجدار ══════
 * البلوكُ مطويٌّ افتراضياً، ونداءُ الخطّ **مشروطٌ بالفتح**: جلبُه مع كلّ زيارةِ ملفٍّ يعني
 * طلباً إضافياً لبيانٍ لا يراه أحدٌ في تسعٍ من عشر زيارات. وإن ردَّ الخادمُ منعاً (من يملك
 * عرضَ التعويضات ولا يملك صلاحيةَ وحدة الرواتب) يسقط الخطُّ بصمتٍ **ولا يُرسَم خطأٌ أحمر**:
 * غيابُ سطحٍ إضافيٍّ ليس عطلاً في هذا الجدار.
 *
 * ══════ الطيُّ والتدقيق ══════
 * مطويٌّ افتراضياً حمايةً من **العين المجاورة** لا من التدقيق: الصفُّ يصل مع
 * `GET /hr/employees/{id}`، و`auditCompensationView` يقع **عند القراءة لا عند الفتح**.
 */
export const PayBlock: React.FC<Props> = ({ id, emp }) => {
  const comp = emp.current_compensation;
  const [open, setOpen] = useState(false);

  const historyQuery = useQuery({
    queryKey: ['hr', 'payroll', 'wage-profile', emp.id],
    queryFn: () => hrPayrollService.getProfile(emp.id),
    enabled: open,
    retry: false,
    staleTime: 60_000,
  });

  const records = historyQuery.data?.detail.records ?? [];

  // «آخرُ تغييرٍ سرى من …» — الحقلان يصلان مع الصفّ الحاليّ، وهما كلُّ ما نملكه من تاريخه
  // قبل أن يصل الخطُّ الكامل.
  const changeLine = comp?.effective_from
    ? `آخر تغيير سرى من ${fmtLeaveDate(comp.effective_from)}${comp.change_reason ? ` (${comp.change_reason})` : ''}`
    : null;

  return (
    <details className="hrl-block" id={id} onToggle={(event) => setOpen(event.currentTarget.open)}>
      {/* المؤشّرُ أيقونةٌ في JSX لا علامةَ متصفّح (§١٣-ي تُطفئ العلامةَ الافتراضية) */}
      <summary className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <Wallet size={14} /> الأجر والتعويضات
        </h2>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>

      {comp ? (
        <>
          <div className="hrl-block__b">
            <dl className="hrl-kv">
              <dt>الراتب الأساسي</dt>
              <KvValue value={money(comp.basic_salary === null || comp.basic_salary === undefined ? null : String(comp.basic_salary))} dir="ltr" />

              <dt>بدل سكن</dt>
              <KvValue value={money(comp.housing_allowance === null || comp.housing_allowance === undefined ? null : String(comp.housing_allowance))} dir="ltr" />

              <dt>بدل نقل</dt>
              <KvValue value={money(comp.transport_allowance === null || comp.transport_allowance === undefined ? null : String(comp.transport_allowance))} dir="ltr" />

              <dt>بدلات أخرى</dt>
              <KvValue value={money(comp.other_allowances === null || comp.other_allowances === undefined ? null : String(comp.other_allowances))} dir="ltr" />

              <dt>الإجمالي</dt>
              <KvValue value={money(comp.total_salary === null || comp.total_salary === undefined ? null : String(comp.total_salary))} dir="ltr" />

              <dt>العملة</dt>
              <KvValue value={comp.currency || 'SAR'} />

              {/* أشدُّ حقلٍ في الوحدة — و`dir="ltr"` عليه إلزاميّ لا تجميليّ */}
              <dt>الآيبان</dt>
              <KvValue value={comp.iban} dir="ltr" />

              <dt>البنك</dt>
              <KvValue value={comp.bank_name} />

              <dt>رقم التأمينات</dt>
              <KvValue value={comp.gosi_number} dir="ltr" />
            </dl>
          </div>

          {changeLine && <p className="hrl-note">{changeLine}</p>}
        </>
      ) : (
        // فارغٌ **بصلاحية**: لا صفَّ تعويضٍ لهذا المنسوب — والزرُّ أدناه يفتح بابَه.
        <div className="hrl-state hrl-state--empty">
          <Wallet size={20} />
          <p className="hrl-state__t">لا يوجد راتب مسجل لهذا الموظف</p>
          <p className="hrl-state__d">
            بدون راتب مسجل لا يصدر خطاب تعريف الراتب ولا يدخل الموظف مسير الرواتب.
          </p>
        </div>
      )}

      {/* خطُّ النسخ — يُجلَب عند الفتح، ويسقط بصمتٍ إن لم يكن السطحُ متاحاً. */}
      {open && records.length > 1 && (
        <div className="hrl-block__b hrl-block__b--flush">
          <table className="hrl-ledger">
            <caption className="hrl-sr">نسخ الأجر السابقة</caption>
            <thead>
              <tr>
                <th scope="col">
                  <History size={12} aria-hidden="true" /> السريان
                </th>
                <th scope="col">الأجر الشهري</th>
                <th scope="col">السبب</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className={record.voided_at ? 'hrp-void' : undefined}>
                  <td>{fmtSpan(record.effective_from, record.effective_to)}</td>
                  <td
                    className={`hrl-ledger__num${
                      record.voided_at ? ' hrp-void__num' : record.effective_to === null ? ' hrp-live__num' : ''
                    }`}
                    dir="ltr"
                  >
                    {money(record.total_salary) ?? '—'}
                  </td>
                  <td className="hrl-ledger__desc">
                    {record.change_reason ?? '—'}
                    {record.voided_at ? <span className="hrp-void__tag">ملغاة</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="hrl-drawer__f">
        <span className="hrl-hint">
          قراءة هذه الشاشة مسجلة في سجل التدقيق: من فتح بيانات الأجر ومتى.
        </span>
        <span className="hrl-block__a">
          <Link className="hr-btn hr-btn--sm" to={`/hr/payroll/wages?employee=${emp.id}`}>
            <PenLine size={13} /> {comp ? 'تحديث الأجر' : 'تسجيل الراتب'}
          </Link>
        </span>
      </div>
    </details>
  );
};

export default PayBlock;
