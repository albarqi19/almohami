import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Gavel } from 'lucide-react';

import { fmtCount } from '../leave/leaveFormat';
import type { DecisionItem } from './boardFacts';

interface Props {
  items: DecisionItem[];
  /** فشلُ `leave/stats` — لا تُطوى البنودُ صامتةً، ويُقال ما الذي غاب. */
  failed: boolean;
  /** `hr.manage` — التقويمُ الرسميّ محروسٌ به في الخادم (`api.php:1831-1838`). */
  canManage: boolean;
  onHolidays: () => void;
}

/**
 * **«قراراتُ المكتب» — البنودُ التي تنتظر قرارَ المكتب لا قرارَ منسوبٍ بعينه.**
 *
 * تعيش في العمود الرئيس لا في الرصيف، لأنّ العمودَ الرئيس عمودُ القرار. ومصدرُها
 * `['hr','leave','stats', year]` — مفتاحٌ مشترَكٌ مع `LeavePage` ⇒ صفرُ طلبٍ إضافيّ.
 *
 * · **الأزرارُ لا تُوضَع في `hrl-tools`**: ذاك الصنفُ يبدأ `opacity: 0` ويُكشَف بالتحويم
 *   (`hr-leave.css:1940-1946`)، وفعلٌ هو سببُ وجودِ الصفّ لا يُخبَّأ.
 * · **الانتقالُ بزرٍّ لا بـ`<Link>` يلبس `hr-btn`**: `index.css:365-373` يعطي كلَّ `a`
 *   لونَ `--color-primary` وخطّاً سفلياً عند التحويم، فرابطٌ بزيّ زرٍّ يخرج بلونين
 *   وخطٍّ لا يملكهما الزرُّ — وإصلاحُه يستدعي قاعدةً جديدة. البدائيّةُ `hr-btn` بُنيت
 *   لعنصر `button`، فتُستعمل كما بُنيت.
 * · **البلوكُ كلُّه لا يُرسَم** حين تصل الحقائقُ وتكون البنودُ الثلاثةُ صفراً — لا بلوكَ
 *   فارغ، ولا «كلُّ شيءٍ تمام» مكرَّرة: الإعلانُ الأخضرُ موضعُه اللوحةُ الأمّ مرّةً واحدة.
 *
 * ⏳ **دَينٌ معلَنٌ**: شريحةُ `uninitialized` في `LeaveRoster.tsx:130` **حالةٌ داخليةٌ لا
 * مُعامِلُ رابط** ⇒ «بلا رصيدٍ افتتاحيّ» تهبط على `/hr/leave` غيرَ مُرشَّحة. جعلُها
 * مُرشَّحةً يتطلّب لمسَ `leave/` وهو خارجُ نطاق هذه الخطوة.
 */
export const BoardDecisions: React.FC<Props> = ({ items, failed, canManage, onHolidays }) => {
  const navigate = useNavigate();

  return (
    <section className="hrl-block">
      <div className="hrl-block__h">
        <h2 className="hrl-block__t hrl-h2">
          <Gavel size={14} /> قرارات المكتب
        </h2>
      </div>

      {failed ? (
        <p className="hrl-note">
          تعذر تحميل بيانات الإجازات. بنود الرصيد والاعتماد والعطل لا تظهر الآن.
        </p>
      ) : (
        <div className="hrl-block__b hrl-block__b--flush">
          {items.map((item) => (
            <div className="hrl-row hrl-row--static" key={item.key}>
              <span className="hrl-row__main">{item.label}</span>
              <span className={item.negative ? 'hrl-mini is-neg' : 'hrl-mini'}>{fmtCount(item.count)}</span>

              {item.key === 'holidays' && canManage && (
                <button type="button" className="hr-btn hr-btn--sm" onClick={onHolidays}>
                  <CalendarDays size={13} /> التقويم الرسمي
                </button>
              )}

              {item.key === 'uninitialized' && (
                <button type="button" className="hr-btn hr-btn--sm" onClick={() => navigate('/hr/leave')}>
                  الإجازات والغياب ←
                </button>
              )}

              {item.key === 'pending' && (
                <button
                  type="button"
                  className="hr-btn hr-btn--sm"
                  onClick={() => navigate('/hr/leave?status=pending')}
                >
                  اعرض المعلقة ←
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default BoardDecisions;
