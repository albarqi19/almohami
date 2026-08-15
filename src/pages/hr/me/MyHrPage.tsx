import React, { useId, useRef, useState } from 'react';
import { CalendarDays, Fingerprint, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useAuth } from '../../../contexts/AuthContext';
import MyAttendanceCard from './MyAttendanceCard';
import MyLeaveSection from './MyLeaveSection';
import MyPaySection from './MyPaySection';
import '../../../styles/my-hr.css';

/**
 * **بوّابةُ الموظف `/my-hr` — ثلاثةُ أقسامٍ لثلاثة أسئلة.**
 *
 * الصفحةُ نشأت إصلاحَ عطلٍ حيّ: الموظفُ الذي يُسجَّل عليه غيابٌ اليومَ يتلقّى إشعاراً بـ
 * `action_url = /hr/leave/{id}` مكتوباً في قاعدة البيانات، فينقره **فيُصفَع بـ`<Forbidden/>`**
 * (المسارُ محروسٌ بـ`hr.view` وكلُّ `hr.*` في `$adminOnly`). هذه الصفحةُ هي ما يصل إليه بدلَ
 * الصفعة — ثمّ نمت حتى صارت تسعَ بطاقاتٍ متتابعةٍ بلا تجميع.
 *
 * ══════ 🔴 لماذا ثلاثةُ أقسامٍ مُبوَّبة لا جدارٌ واحدٌ يُمرَّر ══════
 * الموظفُ لا يفتح هذه الصفحةَ ليقرأها؛ يفتحها **بسؤالٍ واحدٍ من ثلاثة**: «أين أبصم / كم
 * رصيدي / أين قسيمتي أو خطابي». والجدارُ الواحد يجعل جوابَ السؤال الثالث على بُعد شاشتين
 * من التمرير، ويجعل زرَّ البصمة يهرب من المنظور بأوّل دورة عجلة. والتبويبُ يقلبها:
 * · القسمُ الأوّلُ هو المفتوحُ ابتداءً، وزرُّ البصمة **أوّلُ ما فيه** ⇒ جوابُ أشيع
 *   الأسئلة بصفر نقرة، وبلا تمرير، ومثبَّتٌ لأن الرأسَ والشريطَ خارج المُمرِّر.
 * · والسؤالان الآخران بنقرةٍ واحدةٍ في موضعٍ ثابتٍ لا يتبدّل — وسطرُ الدلالة تحت كلّ
 *   عنوانٍ يقول ما في القسم قبل فتحه، فلا يُنقر القسمُ ليُكتشَف.
 *
 * ══════ ومكسبٌ ثانٍ: ثلاثةُ نداءاتٍ صارت واحداً ══════
 * كلُّ قسمٍ يحمل استعلاماتِه، والقسمُ غيرُ المفتوح لا يُركَّب أصلاً — ففتحُ الصفحة نداءُ
 * الحضور وحدَه بدل أربعةٍ متوازية (رصيد · خطابات · قسائم · حضور). و`react-query` يحفظ
 * ما جُلب، فالعودةُ إلى قسمٍ زِيرَ من قبلُ فوريّةٌ بلا نداءٍ ثانٍ. **وصفرُ استطلاعٍ دوريّ.**
 *
 * ══════ وما لم يتبدّل ══════
 * · **لا حرفَ في `MyAttendanceCard`**: إصلاحُ `work_date` (يومُ العمل ليس اليومَ التقويميّ —
 *   الخادمُ يُجمّده بـ`day_cutoff_hour`) قائمٌ كما هو، والبطاقةُ تُركَّب كما هي.
 * · **ولا في `MyPayslipsCard` ولا `MyLettersCard`**: كلٌّ منهما يحرس نفسَه بـ٤٠٤/٤٠٣.
 * · و`errorStatus` انتقلت إلى `errorStatus.ts` بحرفها: كانت مصدَّرةً من هذا الملفّ فتقرؤها
 *   منه أربعُ بطاقات — دائرةُ استيرادٍ تكسر `react-refresh` معاً. والدالّةُ لم تتغيّر.
 */

type SectionKey = 'attendance' | 'leave' | 'pay';

type Section = {
  readonly key: SectionKey;
  readonly label: string;
  readonly hint: string;
  readonly Icon: LucideIcon;
};

/**
 * **مصدرُ الأقسام الوحيد** — منه يُبنى الشريطُ ومنه يُختار اللوح، فلا تفترق قائمتان
 * ولا يبقى تبويبٌ بلا محتوى. والترتيبُ ترتيبُ الشيوع: البصمةُ حدثٌ يوميّ، والرصيدُ
 * سؤالٌ شهريّ، والقسيمةُ والخطابُ حاجةٌ تعرض.
 */
const SECTIONS: readonly Section[] = [
  { key: 'attendance', label: 'حضوري', hint: 'البصمةُ وأيّامي', Icon: Fingerprint },
  { key: 'leave', label: 'إجازاتي', hint: 'الرصيدُ والطلب', Icon: CalendarDays },
  { key: 'pay', label: 'راتبي ووثائقي', hint: 'القسائمُ والخطابات', Icon: Wallet },
];

export const MyHrPage: React.FC = () => {
  const { user } = useAuth();
  const [active, setActive] = useState<SectionKey>('attendance');
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabId = (key: SectionKey) => `${baseId}-tab-${key}`;
  const panelId = (key: SectionKey) => `${baseId}-panel-${key}`;

  /**
   * ملاحةُ لوحة المفاتيح بين التبويبات (عرفُ ARIA للتبويب).
   * 🩸 والاتجاهُ مقلوبٌ عمداً: التطبيقُ كلُّه `dir="rtl"`، فالسهمُ الأيسرُ يمضي إلى
   * **التالي** بصرياً والأيمنُ إلى السابق. عكسُها يجعل السهمَ يقفز ضدّ ما تراه العين.
   */
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const current = SECTIONS.findIndex((s) => s.key === active);
    let next = current;

    if (event.key === 'ArrowLeft') next = current + 1;
    else if (event.key === 'ArrowRight') next = current - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = SECTIONS.length - 1;
    else return;

    event.preventDefault();
    const index = (next + SECTIONS.length) % SECTIONS.length;
    setActive(SECTIONS[index].key);
    tabRefs.current[index]?.focus();
  };

  return (
    <div className="hrl-page">
      <header className="hrl-head">
        <div className="hrl-head__id">
          <h1 className="hrl-h1">ملفّي الوظيفيّ</h1>
          {/* المسمّى والقسمُ يعيشان على `employee_profiles` ولا يصلان في `/auth/me` —
              فلا يُعرضان ولا تُكتب مكانَهما شرطة. */}
          <p className="hrl-sub">{user?.name}</p>
        </div>
      </header>

      <div className="myhr-nav" role="tablist" aria-label="أقسامُ ملفّي الوظيفيّ">
        {SECTIONS.map((section, index) => {
          const selected = section.key === active;
          return (
            <button
              key={section.key}
              type="button"
              role="tab"
              id={tabId(section.key)}
              className="myhr-tab"
              aria-selected={selected}
              aria-controls={panelId(section.key)}
              tabIndex={selected ? 0 : -1}
              ref={(el) => { tabRefs.current[index] = el; }}
              onClick={() => setActive(section.key)}
              onKeyDown={onTabKeyDown}
            >
              <span className="myhr-tab__h">
                <section.Icon size={14} aria-hidden="true" />
                <span className="myhr-tab__t">{section.label}</span>
              </span>
              <span className="myhr-tab__d">{section.hint}</span>
            </button>
          );
        })}
      </div>

      <div
        className="myhr-panel"
        role="tabpanel"
        id={panelId(active)}
        aria-labelledby={tabId(active)}
      >
        {/* البطاقةُ **تُخفي نفسَها** حين لا ملفَّ له أو لا حضورَ في مكتبه (٤٠٤/٤٠٣ داخلها)،
            فلا يُشترط هنا فرعٌ ثانٍ يتعارض مع فروعها. */}
        {active === 'attendance' && <MyAttendanceCard />}
        {active === 'leave' && <MyLeaveSection />}
        {active === 'pay' && <MyPaySection />}
      </div>
    </div>
  );
};

export default MyHrPage;
