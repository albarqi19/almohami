import React from 'react';
import { Building2 } from 'lucide-react';

import { KvValue } from '../dossier/KvValue';
import type { HrOfficeInfo } from '../../../types/hr';

interface Props {
  office: HrOfficeInfo;
}

/**
 * **بطاقةُ المكتب — بطاقةُ تعريفٍ لا لوحةُ قياس، ولهذا يجوز لها ألّا تقود.**
 *
 * قاعدةُ «كلُّ رقمٍ يقود» تحكم المقاييس، لا اسمَ المكتب وعنوانَه. وموضعُها في الرصيف
 * (أدنى الأولويات) هو الإقرارُ بذلك: كلُّ ما هو عاجلٌ يعيش في الشريط العلويّ وفي قائمة
 * العمل، وكلاهما فوقها.
 *
 * · **لا فعلَ فيها — وهذا مُقرَّرٌ لا سهو**: تغييرُ توثيق المنشأة يقع في إعدادات المكتب
 *   خارج وحدة HR، وزرٌّ يَعِد بما لا يملكه هذا السطحُ أسوأُ من غيابه.
 * · **ولا صفَّ «التوثيق»**: كان يقول ما تقوله شارةُ الرأس بالحرف نفسِه في الشاشة نفسِها،
 *   والخبرُ الواحدُ مكتوباً مرّتين يُقرأ خبرين فيُبحَث عن فرقٍ لا وجودَ له. بقي في الرأس
 *   (يُرى بلا تمرير) **ومعه رقمُ الترخيص** — فلم يسقط بسقوط السطر.
 * · `sba_license_status` **لا يُعرض**: سلسلةٌ خامٌّ من الخادم بلا خريطةِ تسميةٍ عربية،
 *   وعرضُها يخالف عرفَ «كلُّ تسميةٍ في `Record<T,string>`».
 * · صفُّ الهاتف **يُرسَم فقط حين وُجد** — سلوكٌ قائمٌ في اللوحة القديمة يُحفَظ. وبقيّةُ
 *   الصفوف تُكتب «—» بـ`dd.is-empty` فتُقرأ **غياباً** لا بيانات.
 * · **ولا تُكتب جملةٌ تشرح آليّةَ ربطِ توثيقِ المنشأة برخص المحامين**: لم تُتحقَّق
 *   بالقراءة، وادّعاءُ سببيّةٍ غيرِ مُثبَتةٍ في واجهةٍ قانونيّةٍ أسوأُ من صمت.
 */
export const BoardOfficeCard: React.FC<Props> = ({ office }) => {
  return (
    <div className="hrl-block">
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <Building2 size={14} /> بطاقة المكتب
        </h2>
      </div>

      <div className="hrl-block__b">
        <dl className="hrl-kv">
          <dt>اسم المكتب</dt>
          <KvValue value={office.name} />

          <dt>العنوان الوطني</dt>
          <KvValue value={office.national_address} />

          <dt>الإيميل الرسمي</dt>
          <KvValue value={office.email} dir="ltr" />

          {office.phone && (
            <>
              <dt>الهاتف</dt>
              <KvValue value={office.phone} dir="ltr" />
            </>
          )}
        </dl>
      </div>
    </div>
  );
};

export default BoardOfficeCard;
