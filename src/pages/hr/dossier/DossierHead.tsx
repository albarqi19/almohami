import React, { useState } from 'react';
import { CalendarPlus, Pencil } from 'lucide-react';

import { LawyerVerifiedBadge } from '../../../components/hr/LawyerVerifiedBadge';
import RecordLeaveModal from '../leave/RecordLeaveModal';
import { fmtCount, fmtDays } from '../leave/leaveFormat';
import { URGENT_DAYS, empName, isLawyer, remainingDays } from './dossierFormat';
import { useLeaveBalance } from './useDossierData';
import { EMPLOYEE_STATUS_LABELS } from '../../../types/hr';
import type { EmployeeProfile } from '../../../types/hr';

interface Props {
  empId: number;
  emp: EmployeeProfile;
  /** `hr.manage` */
  canManage: boolean;
  /** `hr.leave.manage` */
  canLeave: boolean;
  onEdit: () => void;
}

/**
 * **الرأس — ثلاثُ مناطق، وشريطُ الإجراءات الوحيد في الصفحة.**
 *
 * ══════ القاعدةُ الحاكمة (تُقرأ قبل إضافة أيّ زرّ) ══════
 * شريطُ الرأس **للأفعال التي تخصّ الموظفَ كلَّه**؛ وفعلُ الإنشاء داخل سجلٍّ يعيش في رأس
 * بلوكه (`hrl-block__a`). فلا تُهاجَر حالةُ `ContractsTab`/`DocumentsTab` إلى الأعلى،
 * ولا يُكسَر ما يعمل، ولا يتضخّم الرأسُ بسبعة أزرارٍ لا تُقرأ.
 *
 * · `<h1>` **أوّلُ عنوانٍ دلاليٍّ حيٍّ في الوحدة كلِّها** — كان الاسمُ `<div>` بـ18px.
 * · **لا أفاتار**: 56px كانت تأكل صفّاً نحتاجه للأفعال، والاسمُ في `h1` هو المرساة.
 * · ثلاثُ حقائقَ كحدٍّ أقصى، و**أقربُ انتهاءٍ واحدٌ فقط** حين يقلّ عن ٦٠ يوماً؛ بقيّةُ
 *   التواريخ في الرصيف حصراً فلا يتكرّر رقمٌ في شاشةٍ واحدة.
 * · الصلاحيةُ الناقصةُ **تحذف** الزرَّ لا تعطّله. وحين تسقط الأزرارُ كلُّها يُكتب
 *   «عرضٌ فقط» — فرأسٌ عارٍ بلا تفسيرٍ يجعل من يفتح الملفَّ بـ`hr.view` يظنّ الشاشةَ
 *   معطوبة.
 */
export const DossierHead: React.FC<Props> = ({ empId, emp, canManage, canLeave, onEdit }) => {
  const [showRecord, setShowRecord] = useState(false);
  const { data: snapshot } = useLeaveBalance(empId);

  // الاسمُ من الموضع الواحد: مودالُ الحذف يذكره في تأكيده، ورأسٌ يسمّي غيرَ ما يسمّي
  // التأكيدُ هو أسوأُ ما يقرؤه من يهمّ بحذف ملفّ.
  const name = empName(emp, empId);
  const lawyer = isLawyer(emp);

  // السطرُ الثانويّ: المسمّى · القسم · رقم — وعند فراغ الاثنين تُسمّى الحالةُ **بلا شرطة**.
  const identity = [emp.job_title, emp.department].filter(Boolean).join(' · ') || 'ملف بلا مسمى ولا قسم';
  const subtitle = emp.employee_number ? `${identity} · رقم ${emp.employee_number}` : identity;

  const licenseDays = lawyer ? remainingDays(emp.sba_license_expiry_gregorian) : null;
  const nationalIdDays = remainingDays(emp.national_id_expiry_gregorian);

  const deadlines: Array<{ label: string; days: number }> = [];
  if (licenseDays != null) deadlines.push({ label: 'الرخصة', days: licenseDays });
  if (nationalIdDays != null) deadlines.push({ label: 'الهوية', days: nationalIdDays });
  deadlines.sort((a, b) => a.days - b.days);
  const nearest = deadlines.length > 0 && deadlines[0].days < URGENT_DAYS ? deadlines[0] : null;

  const mainType = snapshot?.types.find((t) => t.code === 'annual') ?? snapshot?.types[0];

  return (
    <header className="hrl-head">
      {showRecord && (
        <RecordLeaveModal
          employee={{ profileId: empId, name }}
          canManage={canLeave}
          onClose={() => setShowRecord(false)}
        />
      )}

      <div className="hrl-head__id">
        <h1 className="hrl-h1">{name}</h1>
        <p className="hrl-sub">{subtitle}</p>
      </div>

      <div className="hrl-head__badges">
        {lawyer && <LawyerVerifiedBadge status={emp.sba_verification_status} remainingDays={licenseDays} />}

        <span className="hrl-fact">{EMPLOYEE_STATUS_LABELS[emp.status]}</span>

        {/* لا تُرسَم حقيقةُ الرصيد قبل وصول مصدرِها — ولا «٢١» ولا «٠» ولا شرطة */}
        {snapshot &&
          (snapshot.is_initialized ? (
            mainType && (
              <span className="hrl-fact">
                المتاح{' '}
                <span className="hrl-fact__n" dir="ltr">
                  {fmtDays(mainType.balance)}
                </span>{' '}
                يوما
              </span>
            )
          ) : (
            <span className="hrl-fact hrl-fact--gold">الرصيد غير جاهز</span>
          ))}

        {nearest && (
          <span className="hrl-fact hrl-fact--gold">
            {nearest.days <= 0 ? (
              `${nearest.label} منتهية`
            ) : (
              <>
                {nearest.label}{' '}
                <span className="hrl-fact__n" dir="ltr">
                  {fmtCount(nearest.days)}
                </span>{' '}
                يوما
              </>
            )}
          </span>
        )}
      </div>

      <div className="hrl-head__actions">
        {canManage && (
          <button type="button" className="hr-btn hr-btn--sm" onClick={onEdit}>
            <Pencil size={13} /> تعديل البيانات
          </button>
        )}
        {canLeave && (
          <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={() => setShowRecord(true)}>
            <CalendarPlus size={13} /> تسجيل غياب
          </button>
        )}
        {!canManage && !canLeave && <span className="hrl-fact">عرض فقط</span>}
      </div>
    </header>
  );
};

export default DossierHead;
