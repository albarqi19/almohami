import React from 'react';
import { CalendarClock } from 'lucide-react';

import { fmtLeaveDate } from '../leave/leaveFormat';
import { KvValue } from './KvValue';
import { isLawyer, remainingDays } from './dossierFormat';
import { useEmployeeChecklist, useEmployeeContracts } from './useDossierData';
import type { EmployeeProfile } from '../../../types/hr';

interface Props {
  empId: number;
  emp: EmployeeProfile;
  /** `hr.manage` — العقودُ وقائمةُ المباشرة محروستان به في الخادم. */
  canManage: boolean;
}

interface Row {
  key: string;
  label: string;
  /** `null` = لا قيمةَ ⇒ «—» رماديةٌ بوزن 400، لا رقمَ مخترَع. */
  value: string | null;
  /** موعدٌ مضى ⇒ يُقرأ أحمرَ متراصّاً (`hrl-mini is-neg`). */
  late?: boolean;
}

/**
 * **الرصيف «المواقيت» — رصيفُ قراءةٍ خالص: لا زرَّ كتابةٍ فيه إطلاقاً.**
 *
 * ليس نسخةً من شارات الرأس: الرأسُ يعرض **أقربَ موعدٍ واحداً** (وهو ما يستحقّ الفعل
 * اليوم)، والرصيفُ يعرض **الجدولَ كلَّه** (وهو ما يُخطَّط له).
 *
 * · مصادرُه استعلاماتٌ قائمةٌ بمفاتيحها نفسِها عبر `useDossierData` ⇒ **صفرُ طلبٍ إضافيّ**
 *   (React Query تدمج النداءَ بالمفتاح مع `ContractsTab` و`OnboardingTab`).
 * · بلا `hr.manage` **تسقط صفوفُ العقد والتجربة والمباشرة من الشجرة** ولا تُعرض «—»:
 *   الشرطةُ تعني «لا قيمة»، وقولُها عن حقلٍ لم يُقرأ أصلاً كذبٌ صغير.
 * · دون 1400px يهبط أسفلَ العمود الواحد داخل المُمرِّر نفسِه — مقبولٌ لأنّ العاجلَ منه
 *   في الرأس.
 */
export const TimelineAside: React.FC<Props> = ({ empId, emp, canManage }) => {
  const { data: contracts } = useEmployeeContracts(empId);
  const { data: checklist } = useEmployeeChecklist(empId);

  const contract = contracts?.find((c) => c.status === 'active');

  const onboarding = (checklist ?? []).filter((i) => i.kind === 'onboarding');
  const onboardingDone = onboarding.filter((i) => i.is_done).length;

  const dateRow = (key: string, label: string, iso?: string | null): Row => {
    const rem = remainingDays(iso);
    return { key, label, value: iso ? fmtLeaveDate(iso) : null, late: rem != null && rem < 0 };
  };

  const rows: Row[] = [
    ...(isLawyer(emp) ? [dateRow('license', 'انتهاء الرخصة', emp.sba_license_expiry_gregorian)] : []),
    dateRow('nid', 'انتهاء الهوية', emp.national_id_expiry_gregorian),
    ...(canManage
      ? [
          dateRow('contract', 'نهاية العقد الحالي', contract?.end_date),
          dateRow('probation', 'نهاية فترة التجربة', contract?.probation_end_date),
          {
            key: 'onboarding',
            label: 'اكتمال المباشرة',
            value: onboarding.length > 0 ? `${Math.round((onboardingDone / onboarding.length) * 100)}٪` : null,
          },
        ]
      : []),
    {
      key: 'service',
      label: 'مدة الخدمة',
      value: emp.hire_date ? `منذ ${fmtLeaveDate(emp.hire_date)}` : null,
    },
  ];

  const hasAny = rows.some((r) => r.value !== null);

  return (
    <div className="hrl-block">
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <CalendarClock size={14} /> المواعيد
        </h2>
      </div>

      {hasAny ? (
        <div className="hrl-block__b">
          <dl className="hrl-kv">
            {rows.map((row) => (
              <React.Fragment key={row.key}>
                <dt>{row.label}</dt>
                {row.late && row.value ? (
                  <dd>
                    <span className="hrl-mini is-neg">{row.value}</span>
                  </dd>
                ) : (
                  <KvValue value={row.value} />
                )}
              </React.Fragment>
            ))}
          </dl>
        </div>
      ) : (
        <div className="hrl-state hrl-state--empty">
          <CalendarClock size={20} />
          <p className="hrl-state__t">لا توجد مواعيد بعد</p>
          <p className="hrl-state__d">
            تظهر هنا تواريخ انتهاء الرخصة والهوية والعقد وفترة التجربة عند تسجيلها.
          </p>
        </div>
      )}
    </div>
  );
};

export default TimelineAside;
