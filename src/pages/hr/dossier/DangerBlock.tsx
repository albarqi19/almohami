import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { AlertTriangle } from 'lucide-react';

import { hrService } from '../../../services/hrService';
import { errorText } from '../leave/leaveFormat';
import { empName } from './dossierFormat';
import type { EmployeeProfile } from '../../../types/hr';

interface Props {
  empId: number;
  emp: EmployeeProfile;
  /** يفتح `EditEmployeeModal` — وفيه حقلُ `status` الذي تُنهى به الخدمة. */
  onEdit: () => void;
}

/**
 * **الإجراءاتُ الحسّاسة — آخرُ بلوكٍ في الجدار، وخارجَ شريط إجراءات الرأس عمداً.**
 *
 * ══════ لماذا هنا لا في الرأس ══════
 * الهدمُ لا يُوضَع حيث تنقر ذاكرةُ العضلات «تعديل البيانات». ووضعُه في الذيل يحفظ قاعدةَ
 * «شريطُ إجراءاتٍ واحدٌ في الصفحة» ويجعل الوصولَ إليه قصداً لا مصادفة. ولا مرساةَ له ولا
 * بندَ في شريط القفز: ليس قسمَ قراءةٍ يُقصَد، بل بابٌ يُفتح مرّةً في عمر الملفّ.
 *
 * ══════ قدرتان كانتا بلا سطح ══════
 * · **إنهاءُ الخدمة** — كان الطريقُ إليه أن تفتح مودالَ التعديل ثمّ تهتديَ إلى حقل
 *   `status`؛ فصار له مدخلٌ مسمّىً بفعله.
 * · **حذفُ الملفّ** — `DELETE /hr/employees/{id}` (محروسٌ بـ`hr.manage`) و
 *   `hrService.deleteEmployee` كانت **بصفر مستدعٍ في الواجهة كلِّها**. هذا أوّلُ مستدعٍ لها.
 *
 * ══════ ثلاثةُ حرّاسٍ لا واحد ══════
 * (١) بلا `hr.manage` **لا يُركَّب البلوكُ إطلاقاً** (الحارسُ في الجدار) — لا يُعطَّل ولا
 * يُفرَّغ. (٢) `window.confirm` باسم المنسوب حرفياً فلا يُحذف ملفٌّ بنقرةٍ في غير موضعها.
 * (٣) والسطرُ تحتهما يفرّق بين الفعلين بجملةٍ واحدة — لأنّ «إنهاء الخدمة» و«حذف الملفّ»
 * يبدوان مترادفين لمن لم يقرأ الفرق، وأحدهما يُبقي السجلّ والآخر يُزيله.
 */
export const DangerBlock: React.FC<Props> = ({ empId, emp, onEdit }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const name = empName(emp, empId);

  const remove = async () => {
    if (!window.confirm(`حذف ملفّ «${name}»؟`)) return;

    setBusy(true);
    try {
      await hrService.deleteEmployee(empId);
      toast.success('حُذف ملفُّ المنسوب');

      // **الاستثناءُ الثاني للإبطال الشامل** (والأوّلُ إنشاءُ منسوب): الحذفُ يغيّر
      // الإحصاءَ والقائمةَ والملفَّ معاً، ولا تبقى بعده شاشةٌ تقرأ مفاتيحَ هذا الملفّ.
      void queryClient.invalidateQueries({ queryKey: ['hr'] });
      navigate('/hr');
    } catch (error: unknown) {
      toast.error(errorText(error, 'تعذّر حذف الملفّ'));
      setBusy(false);
    }
  };

  return (
    <div className="hrl-block">
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <AlertTriangle size={14} /> إجراءاتٌ حسّاسة
        </h2>
      </div>

      {/* فعلان **نصّيّان** لا زرّان بارزان: الفعلُ الهادم يُقرأ ولا يُغري. */}
      <div className="hrl-block__b">
        <button type="button" className="hrl-link hrl-link--danger" onClick={onEdit}>
          إنهاء الخدمة
        </button>
        <span aria-hidden="true"> · </span>
        <button
          type="button"
          className="hrl-link hrl-link--danger"
          onClick={() => void remove()}
          disabled={busy}
        >
          {busy ? 'جارٍ الحذف…' : 'حذف الملفّ'}
        </button>
      </div>

      <p className="hrl-note">
        إنهاءُ الخدمة يُبقي الملفَّ وسجلَّه ويوقف احتسابَ الاستحقاق. حذفُ الملفّ يُزيله من قائمة
        المنسوبين — ولا يمسّ حسابَ المستخدم.
      </p>
    </div>
  );
};

export default DangerBlock;
