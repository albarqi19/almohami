import React from 'react';
import { Mail, Phone, User } from 'lucide-react';

import { KvValue } from './KvValue';
import { fmtLeaveDate } from '../leave/leaveFormat';
import { EMPLOYEE_STATUS_LABELS, EMPLOYMENT_TYPE_LABELS } from '../../../types/hr';
import type { EmployeeProfile } from '../../../types/hr';

interface Props {
  /** مرساةُ القسم — تأتي من `SECTIONS` في الجدار فلا يفترق عنوانٌ عن مرساته. */
  id: string;
  emp: EmployeeProfile;
}

/**
 * **البطاقة — من هو، وكيف أصل إليه، ومتى بدأ.**
 *
 * بلوكٌ واحدٌ يُلغي التكرارَ الحرفيَّ لاثنتي عشرة `<dt>` كانت مكتوبةً مرّتين: مرّةً في
 * شجرة الموبايل ومرّةً في شجرة الديسكتوب (`HrModule` القديم: `:383-388`/`:541-546`
 * و`:394-399`/`:555-560`).
 *
 * · `.hrl-split` عمودان فوق 900px وعمودٌ واحدٌ دونها — **بصفرِ `gap`**، والفصلُ
 *   `border-inline-start` منطقيٌّ ينقلب مع الاتجاه.
 * · القسمان `.hrl-fset` ببدائيّةٍ قائمةٍ لا مخترَعة (`hr-leave.css:1022-1042`).
 * · **لا زرَّ داخله** — التعديلُ من زرِّ الرأس الوحيد، فلا تنقر ذاكرةُ العضلات في موضعين.
 */
export const CardBlock: React.FC<Props> = ({ id, emp }) => {
  const emergency = emp.emergency_contact_name
    ? `${emp.emergency_contact_name}${emp.emergency_contact_phone ? ` · ${emp.emergency_contact_phone}` : ''}`
    : null;

  return (
    <section className="hrl-block" id={id}>
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <User size={14} /> البطاقة
        </h2>
      </div>

      <div className="hrl-split">
        <div className="hrl-fset">
          <h3 className="hrl-fset__t">البيانات الأساسية</h3>
          <dl className="hrl-kv">
            <dt>الاسم</dt>
            <KvValue value={emp.user?.name} />

            <dt>
              <Phone size={12} /> الجوال
            </dt>
            <KvValue value={emp.user?.phone} dir="ltr" />

            <dt>
              <Mail size={12} /> الإيميل
            </dt>
            <KvValue value={emp.user?.email} dir="ltr" />

            <dt>الجنسية</dt>
            <KvValue value={emp.nationality} />

            <dt>المدير المباشر</dt>
            <KvValue value={emp.manager?.name} />

            <dt>جهة الطوارئ</dt>
            <KvValue value={emergency} />
          </dl>
        </div>

        <div className="hrl-fset">
          <h3 className="hrl-fset__t">بيانات التوظيف</h3>
          <dl className="hrl-kv">
            <dt>الرقم الوظيفي</dt>
            <KvValue value={emp.employee_number} />

            <dt>المسمى الوظيفي</dt>
            <KvValue value={emp.job_title} />

            <dt>القسم</dt>
            <KvValue value={emp.department} />

            <dt>نوع التعاقد</dt>
            <KvValue value={emp.employment_type ? EMPLOYMENT_TYPE_LABELS[emp.employment_type] : null} />

            {/* تاريخُ المباشرة **مرساةُ الاستحقاق** — غيابُه يُقرأ غياباً لا صفراً */}
            <dt>تاريخ المباشرة</dt>
            <KvValue value={emp.hire_date ? fmtLeaveDate(emp.hire_date) : null} />

            <dt>الحالة</dt>
            <KvValue value={EMPLOYEE_STATUS_LABELS[emp.status]} />
          </dl>
        </div>
      </div>
    </section>
  );
};

export default CardBlock;
