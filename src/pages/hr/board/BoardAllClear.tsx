import React from 'react';
import { Check, ShieldCheck } from 'lucide-react';

import { fmtCount } from '../leave/leaveFormat';
import type { ClearCheck } from './boardFacts';

interface Props {
  /** عددُ الملفّات التي مرّت بالفحص — لا عددُ منسوبي المكتب. */
  checked: number;
  checks: ClearCheck[];
  /** عددُ منسوبي المكتب الحقيقيّ — `null` حين لم يصل. */
  total: number | null;
  /** ما وصل فعلاً من الخادم (سقفُ المئة) — يُعلَن حين قصُر عن `total`. */
  scanned: number;
  year: number;
}

/**
 * **«ما فُحص اليوم» — حالةُ السلامة مكتوبةً خبراً لا فراغاً.**
 *
 * ══════ العطلُ الذي تعالجه ══════
 * لم تكن اللوحةُ معطوبةً حين خلا عمودُها: `buildActionRows` لا يُخرج صفّاً إلّا لهويةٍ
 * منتهيةٍ أو رخصةٍ قاربت أو ملفٍّ بلا تاريخ مباشرة، والبياناتُ كانت سليمةً تماماً.
 * العطلُ أنّ **السلامةَ والفراغَ تتشابهان على الشاشة**: عمودٌ بارتفاع الشاشة خالٍ إلّا
 * سطرين أخضرين يُقرأ «لم يُحمَّل شيء» لا «لا شيءَ ينتظرك». وقارئٌ يظنُّ شاشتَه معطوبةً
 * يذهب يبحث بنفسه — فتخسر اللوحةُ سببَ وجودها.
 *
 * ══════ القاعدةُ التي تحكم كلَّ سطرٍ هنا ══════
 * **يُقال ما فُحص، لا ما يُتمنّى.** كلُّ بندٍ نفيُ سببٍ من أسباب `reasonsFor` أو من بنود
 * `buildDecisions` (انظر `buildClearScan`)، و`checked` عددُ الملفّات التي دارت عليها
 * الحلقةُ نفسُها بالمرشِّح نفسِه. فلا رقمَ مخترعٌ، ولا شارةُ «١٠٠٪» لا يقابلها حساب،
 * ولا رسمٌ يملأ فراغاً: الفراغُ يُملأ **بما جرى فعلاً** أو يبقى فارغاً.
 *
 * ⏳ وسقفُ المئة يُعلَن هنا كما يُعلَن في قائمة العمل — **وهو هنا آكد**: إعلانُ سلامةٍ
 * فوق فحصٍ جزئيٍّ صامتٍ أخطرُ من قائمةٍ جزئيّةٍ صامتة.
 */
export const BoardAllClear: React.FC<Props> = ({ checked, checks, total, scanned, year }) => (
  <section className="hrl-block">
    <div className="hrl-block__h">
      <h2 className="hrl-block__t hrl-h2">
        <ShieldCheck size={14} aria-hidden="true" /> ما فُحص اليوم
      </h2>
    </div>

    <div className="hrl-state hrl-state--clear">
      <ShieldCheck size={22} aria-hidden="true" />
      <p className="hrl-state__t">لا قرارَ ينتظر المكتبَ اليوم</p>
      <p className="hrl-state__d">
        {`فُحص ${fmtCount(checked)} ملفّاً على رأس العمل، وحقائقُ إجازات ${year} — ولم يظهر بندٌ واحدٌ يستحقّ فتحَ ملفّ. وهذه البنودُ التي مرّت:`}
      </p>
    </div>

    {total !== null && total > scanned && (
      <p className="hrl-note">
        {`المكتب يضمّ ${fmtCount(total)} منسوباً، وهذا الفحصُ يشمل أحدثَ ${fmtCount(scanned)}. الفحصُ الشاملُ يحتاج ترتيباً وترشيحاً بالخادم.`}
      </p>
    )}

    <div className="hrl-block__b hrl-block__b--flush">
      {checks.map((item) => (
        <p className="hrl-row hrl-row--static hrl-row--ok" key={item.key}>
          <Check size={13} aria-hidden="true" />
          <span className="hrl-row__main">{item.text}</span>
        </p>
      ))}
    </div>
  </section>
);

export default BoardAllClear;
