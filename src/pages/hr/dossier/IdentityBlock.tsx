import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Award, ShieldCheck } from 'lucide-react';

import { hrService } from '../../../services/hrService';
import { errorText, fmtLeaveDate } from '../leave/leaveFormat';
import { KvValue } from './KvValue';
import { isLawyer } from './dossierFormat';
import { useDossierInvalidate } from './useDossierData';
import type { EmployeeProfile } from '../../../types/hr';

interface Props {
  id: string;
  empId: number;
  emp: EmployeeProfile;
  /** `hr.manage` — تُقرأ مرّةً في الجدار وتُمرَّر، فلا تُقرأ الصلاحيةُ ذاتُها في موضعين. */
  canManage: boolean;
  /** يفتح `EditEmployeeModal` المملوكَ للجدار (نسخةٌ واحدةٌ لا اثنتان). */
  onEdit: () => void;
}

/**
 * **الهوية والتوثيق — إحياءُ شاشةٍ كانت ميتةً بصفرِ زرّ.**
 *
 * الشاشةُ القديمة كانت **أربعَ نسخ** (شجرتان × قسمان) تعرض بياناتٍ ولا تفعل شيئاً،
 * بينما الخادمُ يملك `POST /hr/employees/{id}/verify-lawyer` (`routes/api.php:1773`,
 * `permission:hr.manage`, `throttle:10,1`) **بلا مستدعٍ واحدٍ في الفرونت**. هنا أوّلُ
 * مستدعٍ له.
 *
 * · **ثلاثُ حالاتٍ متمايزةٌ لا جملةٌ واحدةٌ تسحقها** (كانت لحالةٍ واحدةٍ جملتان مختلفتان
 *   تعيشان في الشجرتين معاً — إحداهما تبدأ بـ«هذا المنسوب غير مسجّل…» والأخرى بـ«لا
 *   ينطبق…» — فتوحَّدتا هنا في جملةٍ واحدة):
 *     (أ) ليس محامياً ⇒ تنويهٌ محايدٌ **بلا قفل** — عدمُ انطباقٍ لا حماية.
 *     (ب) محامٍ بلا رقم رخصة ⇒ فارغٌ + [تسجيل رقم الرخصة] (تعديلُ بيانات).
 *     (ج) محامٍ برقمٍ ولم يُتحقَّق ⇒ فارغٌ + [تحقّق من الهيئة] (المسارُ المهجور).
 * · المرتبةُ السادسةُ في الجدار لا الثانية: العاجلُ منها (الانتهاء) صعد إلى شارة الرأس
 *   وإلى الرصيف، والباقي بياناتُ مرجعٍ تُقرأ نادراً.
 * · يسقط معه: كتلتا `hr-strip` المنسوختان · حسابُ الأيام المكرَّر (IIFE ×٢) · انحرافُ
 *   مقاسات الأيقونات (30↔20 · 28↔20 · 16↔14) · ستُّ مواضعِ `style={{fontSize}}`.
 */
export const IdentityBlock: React.FC<Props> = ({ id, empId, emp, canManage, onEdit }) => {
  const [verifying, setVerifying] = useState(false);
  const invalidateEmployee = useDossierInvalidate(empId).employee;

  const lawyer = isLawyer(emp);
  const noLicense = lawyer && !emp.sba_license_number;
  const neverChecked = lawyer && !!emp.sba_license_number && !emp.sba_last_checked_at;

  const verify = async () => {
    setVerifying(true);
    try {
      // الخادمُ يُطلق مهمّةً غيرَ متزامنة ويردّ برسالةٍ لا بصفّ — فتُقال رسالتُه كما وصلت،
      // ولا يُوعَد المستخدمُ بنتيجةٍ لم تصل بعد.
      const message = await hrService.verifyLawyer(empId);
      toast.success(message);
      invalidateEmployee();
    } catch (error: unknown) {
      toast.error(errorText(error, 'تعذّر بدء التحقّق من الرخصة'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="hrl-block" id={id}>
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <ShieldCheck size={14} /> الهوية والتوثيق
        </h2>

        {/* الزرُّ يظهر عند `hr.manage` **و**كونِه محامياً معاً — والصلاحيةُ الناقصةُ
            تحذفه من الشجرة ولا تعطّله (زرٌّ معطَّلٌ يَعِد بفعلٍ لا يقع). */}
        {canManage && lawyer && (
          <div className="hrl-block__a">
            <button type="button" className="hr-btn hr-btn--sm" onClick={() => void verify()} disabled={verifying}>
              <ShieldCheck size={13} /> {verifying ? 'جارٍ الإرسال…' : 'تحقّق من الهيئة الآن'}
            </button>
          </div>
        )}
      </div>

      {lawyer ? (
        <div className="hrl-fset">
          <h3 className="hrl-fset__t">التوثيق المهني (الهيئة)</h3>
          <dl className="hrl-kv">
            <dt>رقم الرخصة</dt>
            <KvValue value={emp.sba_license_number} dir="ltr" />

            {/* الخامُّ أوّلاً: نصُّ الهيئة كما وصل (هجريٌّ غالباً) لا يُعاد تنسيقُه */}
            <dt>تنتهي في</dt>
            <KvValue
              value={emp.sba_license_expiry_raw || (emp.sba_license_expiry_gregorian ? fmtLeaveDate(emp.sba_license_expiry_gregorian) : null)}
            />

            <dt>آخر تحقّق</dt>
            <KvValue value={emp.sba_last_checked_at ? fmtLeaveDate(emp.sba_last_checked_at) : null} />
          </dl>
        </div>
      ) : (
        // (أ) عدمُ انطباقٍ — تنويهٌ رماديٌّ **بلا أيقونة قفل**: لا شيءَ محميّاً هنا.
        <p className="hrl-note">لا ينطبق التوثيقُ المهنيّ من الهيئة — هذا المنسوب غير مسجَّلٍ كمحامٍ.</p>
      )}

      {/* (ب) محامٍ بلا رقم — فعلُها تعديلُ بيانات */}
      {noLicense && (
        <div className="hrl-state hrl-state--empty">
          <Award size={20} />
          <p className="hrl-state__t">لم يُسجَّل رقمُ الرخصة</p>
          <p className="hrl-state__d">بلا رقمِ رخصةٍ لا يستطيع النظامُ سؤالَ الهيئة عن سريانها.</p>
          {canManage && (
            <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={onEdit}>
              تسجيل رقم الرخصة
            </button>
          )}
        </div>
      )}

      {/* (ج) رقمٌ موجودٌ ولم يُسأل عنه أحدٌ بعد — فعلُها المسارُ المهجور */}
      {neverChecked && (
        <div className="hrl-state hrl-state--empty">
          <ShieldCheck size={20} />
          <p className="hrl-state__t">لم يُتحقَّق من سجلّ الهيئة بعد</p>
          <p className="hrl-state__d">التحقّقُ يقرأ سريانَ الرخصة من الهيئة ويحدّث الشارة أعلى الملفّ.</p>
          {canManage && (
            <button type="button" className="hr-btn hr-btn--sm hr-btn--primary" onClick={() => void verify()} disabled={verifying}>
              {verifying ? 'جارٍ الإرسال…' : 'تحقّق من الهيئة'}
            </button>
          )}
        </div>
      )}

      <div className="hrl-fset">
        <h3 className="hrl-fset__t">الهوية الوطنية</h3>
        <dl className="hrl-kv">
          <dt>رقم الهوية</dt>
          <KvValue value={emp.user?.national_id} dir="ltr" />

          <dt>تاريخ الانتهاء</dt>
          <KvValue
            value={emp.national_id_expiry_gregorian ? fmtLeaveDate(emp.national_id_expiry_gregorian) : null}
          />
        </dl>
      </div>
    </section>
  );
};

export default IdentityBlock;
