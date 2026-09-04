import React from 'react';
import { FolderLock } from 'lucide-react';

import MyLettersCard from './MyLettersCard';
import MyPayslipsCard from './MyPayslipsCard';

/**
 * **③ «راتبي ووثائقي» — ما أُودع، وما يشهد به المكتبُ عنّي.**
 *
 * ترتيبُ البطاقتين ترتيبُ السؤال: «كم أُودع ولماذا هذا الرقم» أوّلاً (القسيمة)، ثمّ
 * «ما الورقةُ التي أحتاجها الآن» (الخطاب الذي يصدره لنفسه). وكلتاهما **تحرس نفسَها**
 * بـ٤٠٤/٤٠٣ داخلها، فلا يُشترط هنا فرعٌ ثانٍ يتعارض مع فروعها.
 *
 * ══════ 🔴 «وثائقي ومدد انتهائها» — بابٌ غيرُ موجودٍ يُقال لا يُزوَّر ══════
 * القسمُ طُلب بثلاثة بنود، وثالثُها **لا مصدرَ له للموظف إطلاقاً**: وثائقُ الملفّ تعيش
 * على `GET /hr/employees/{id}/documents` وحدَها، وهو محروسٌ بـ`hr.documents.view` — وهي
 * ضمن `$adminOnly` في `SystemRolesAndPermissionsSeeder` فلا يملكها الموظفُ عن نفسه،
 * **ولا يوجد `/hr/me/documents` في `routes/api.php` أصلاً**.
 *
 * فالخياران: بطاقةٌ تُنادي مساراً يردّ ٤٠٣ فتُريه شاشةَ منعٍ بلا سبب، أو صفٌّ صريحٌ
 * يقول أين وثائقُه ومَن يفتحها. والثاني هو عرفُ الوحدة (§٩-٩: يُعطَّل بنصٍّ لا بزرٍّ
 * يُنتج ٤٠٣) — ولأن غيابَ البند بلا كلمةٍ يجعل الموظفَ يبحث عمّا ليس موجوداً.
 */
export const MyPaySection: React.FC = () => (
  <>
    <MyPayslipsCard />

    <MyLettersCard />

    <section className="hrl-block">
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <FolderLock size={14} aria-hidden="true" /> وثائقي وتواريخ انتهائها
        </h2>
      </div>

      <div className="hrl-state hrl-state--locked">
        <FolderLock size={20} />
        <p className="hrl-state__t">وثائق ملفك تدار من إدارة المكتب</p>
        <p className="hrl-state__d">
          نسخ هويتك ورخصتك وشهاداتك وتواريخ انتهائها محفوظة في ملفك، ولا يمكن فتحها من هذه الشاشة.
          تواصل مع مسؤول الموارد البشرية لطلب نسخة أو تاريخ انتهاء وثيقة.
        </p>
      </div>
    </section>
  </>
);

export default MyPaySection;
