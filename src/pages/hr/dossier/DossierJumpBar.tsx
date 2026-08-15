import React, { useEffect, useState } from 'react';

import { fmtCount } from '../leave/leaveFormat';
import { scrollToSection } from './dossierSections';
import type { JumpSection } from './dossierSections';

/**
 * المراسي (`SEC`) ودالّةُ القفز تعيشان في `dossierSections.ts` — وحدةُ بياناتٍ لا مكوّن،
 * فلا يُسقِط ملفُّ المكوّن التحديثَ السريعَ بتصدير ثوابتَ إلى جانبه.
 */

interface Props {
  sections: JumpSection[];
  /** عنصرُ الجدار — منه يُشتقّ المُمرِّرُ الحقيقيّ (انظر `resolveScrollRoot`). */
  scroller: React.RefObject<HTMLDivElement | null>;
}

/**
 * **شريطُ القفز — بديلُ التبويبات.**
 *
 * التبويبُ كان يُخفي، وهذا يقود: كلُّ الأقسام حاضرةٌ في شجرةٍ واحدةٍ والشريطُ ينقل
 * العينَ إليها.
 *
 * · **ثابتٌ بالبنية لا بـ`position:sticky`**: شقيقٌ لـ`.hrl-cols` داخل المسرح، أي
 *   **خارج المُمرِّر** أصلاً. فلا `sticky` (كودٌ ميّتٌ لعنصرٍ ثابت)، ولا `z-index`،
 *   ولا `scroll-margin-block-start` (كان يضيف فراغاً أعمى فوق كلّ مرساةٍ فتهبط
 *   القفزةُ قصيرة).
 * · سطرٌ واحدٌ أبداً: `.hrl-tabs{overflow-x:auto}` و`.hrl-tab{flex:0 0 auto}` ⇒ يتمرّر
 *   أفقياً على 390px ولا يلتفّ، فلا يختبئ بندٌ خلف سطرٍ ثانٍ.
 * · النقرُ يمنع السلوكَ الافتراضيَّ ثمّ `scrollIntoView`، ويكتب المرساةَ بـ
 *   `history.replaceState` — فلا يعبث بالراوتر ويبقى الرابطُ قابلاً للنسخ (وتحمله
 *   `HrModule` معك عند تبديل الموظف).
 */

/**
 * المُمرِّرُ الحقيقيُّ يتبدّل بالمقاس: فوق 1400px هو `.hrl-wall`، ودونها ينتقل التمريرُ
 * إلى `.hrl-cols` (§١٣-ك) ويصير الجدارُ `overflow:visible`. فبدل تثبيت عتبةٍ رقميةٍ في
 * الـJS — وهي عينُ الخطأ الذي أنتج «١٠٢٤ مقابل ١٠٢٥» — يُسأل المتصفّحُ عن أوّل سلفٍ
 * يُمرِّر فعلاً. و`null` تعني نافذةَ العرض (حالةُ الجوّال حيث تتمرّر الصفحةُ كلُّها).
 */
function resolveScrollRoot(from: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = from;

  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }

  return null;
}

export const DossierJumpBar: React.FC<Props> = ({ sections, scroller }) => {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const wall = scroller.current;
    if (!wall) return;

    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const visible = new Set<string>();
    let observer: IntersectionObserver | null = null;

    const attach = () => {
      observer?.disconnect();
      visible.clear();

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target.id);
            else visible.delete(entry.target.id);
          }
          // الأعلى ترتيباً بين المرئيّين — فيبقى **واحدٌ** نشطاً لا اثنان.
          const top = sections.find((s) => visible.has(s.id));
          if (top) setActive(top.id);
        },
        { root: resolveScrollRoot(wall), rootMargin: '0px 0px -70% 0px', threshold: 0 }
      );

      targets.forEach((el) => observer?.observe(el));
    };

    attach();

    // تبديلُ المقاس قد ينقل التمريرَ من الجدار إلى الأعمدة، فيُعاد ربطُ المراقب.
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(attach);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [sections, scroller]);

  const jump = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    if (!scrollToSection(id)) return;
    setActive(id);
  };

  return (
    <nav className="hrl-tabs hrl-jump" aria-label="أقسام الملفّ">
      {sections.map((section) => (
        <a
          key={section.id}
          className="hrl-tab"
          href={`#${section.id}`}
          aria-current={active === section.id ? 'true' : undefined}
          onClick={(event) => jump(event, section.id)}
        >
          <section.icon size={14} /> {section.label}
          {typeof section.count === 'number' && section.count > 0 && (
            <span className="hrl-tab__n" dir="ltr">
              {fmtCount(section.count)}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
};

export default DossierJumpBar;
