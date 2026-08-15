// قائمةٌ منسدلةٌ تُرسَم خارج شجرة الجدول وتبقى مثبَّتةً على زرّها.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * 🔴 لماذا هذا الملف موجود أصلاً
 *
 * كانت المنسدلات تُرسم `position: absolute` داخل خلية الجدول، وفوقها حاويتان
 * تقصّان كلَّ ما يتجاوزهما:
 *   `.fin-table-wrap  { overflow: hidden; }`   (erp.css)
 *   `.fin-table-scroll{ overflow-x: auto;  }`  (erp.css)
 *
 * و`overflow-x: auto` ليست أفقيةً وحدها: المواصفة تقول إن ضبطَ محورٍ واحد على
 * غير `visible` يجعل الآخرَ `auto` — فالحاوية تقصّ **رأسياً** أيضاً. النتيجة:
 * قائمةُ «إجراءات إضافية» على صفوف الجدول الأخيرة تُرسم داخل منطقةٍ مقصوصة
 * فلا يراها المستخدم إطلاقاً — وقلبُها إلى أعلى (openUp) لا يُنقذ، لأن القصَّ
 * يقع على الحاوية لا على الشاشة.
 *
 * العلاج: نقلُ المنسدلة إلى `document.body` عبر بوابة (portal) وتثبيتُها بـ
 * `position: fixed` محسوبةً من مستطيل الزرّ — فتخرج من كلّ حاويةٍ قاصّة.
 *
 * 🔑 المحاذاة بـ`right` لا بـ`left`: الواجهة RTL والقائمة تُحاذي حافةَ الزرّ
 * الخارجية. وحسابُ `right` لا يحتاج معرفةَ عرض القائمة قبل رسمها (بخلاف
 * `left = rect.right − width`)، فلا وميضَ ولا قياسٌ في دورةٍ ثانية.
 */
export interface AnchoredMenuPosition {
  position: 'fixed';
  top?: number;
  bottom?: number;
  right: number;
  /** يُملأ في وضع matchWidth وحده — قائمةٌ بعرض حقلها لا بعرض محتواها. */
  width?: number;
}

export interface AnchoredMenuOptions {
  /**
   * تُطابق القائمةُ عرضَ الزرّ/الحقل بدل أن تأخذ عرضَ محتواها.
   * لازمٌ لمنتقيات البحث (قائمةٌ أضيقُ من حقلها تبدو معطوبة)، وغيرُ مرغوبٍ
   * لقوائم الإجراءات (زرُّ ثلاث نقاطٍ عرضُه ٢٨px).
   */
  matchWidth?: boolean;
}

/** ارتفاعٌ تقديريٌّ للقائمة يُستعمل لتقرير القلب إلى أعلى قبل رسمها. */
const ESTIMATED_MENU_HEIGHT = 200;
const GAP = 4;

export function useAnchoredMenu(open: boolean, options: AnchoredMenuOptions = {}) {
  const { matchWidth = false } = options;
  const triggerRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<AnchoredMenuPosition | null>(null);

  const recompute = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // الحافةُ الخارجية في RTL هي اليمنى؛ نقيسها من يمين النافذة.
    const right = Math.max(GAP, window.innerWidth - rect.right);
    const spaceBelow = window.innerHeight - rect.bottom;
    const height = menuRef.current?.offsetHeight ?? ESTIMATED_MENU_HEIGHT;

    // القلبُ إلى أعلى حين لا يتّسع الأسفل — وشرطُ أن يتّسع الأعلى فعلاً، وإلا
    // بقيت أسفلَ وظهر ما يظهر منها بدل أن تُدفع خارج الشاشة كلّياً.
    const flipUp = spaceBelow < height + GAP && rect.top > spaceBelow;
    const width = matchWidth ? rect.width : undefined;

    setStyle(flipUp
      ? { position: 'fixed', bottom: Math.max(GAP, window.innerHeight - rect.top + GAP), right, width }
      : { position: 'fixed', top: rect.bottom + GAP, right, width });
  }, [matchWidth]);

  // قبل الرسم لا بعده: useEffect كان يُظهر القائمة في الزاوية ثم يقفز بها.
  useLayoutEffect(() => {
    if (open) recompute();
    else setStyle(null);
  }, [open, recompute]);

  // إعادةُ الحساب بعد أوّل رسم: عندها يُعرف الارتفاعُ الحقيقيّ فيصحّ قرارُ القلب.
  useLayoutEffect(() => {
    if (open && menuRef.current) recompute();
  }, [open, recompute]);

  useEffect(() => {
    if (!open) return;

    // `capture: true` ضرورةٌ لا احتياط: تمريرُ الجدول يقع على حاويةٍ داخلية لا
    // على النافذة، وحدثُ scroll لا يصعد — فبلا الالتقاط تنفصل القائمةُ عن زرّها.
    const onScroll = () => recompute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, recompute]);

  return { triggerRef, menuRef, style, recompute };
}

/**
 * إغلاقٌ عند النقر خارج **الزرّ والقائمة معاً**.
 *
 * `useClickOutside` القائم يفحص حاوياً واحداً — ومع البوابة صارت القائمة خارج
 * شجرة الزرّ، فأيُّ نقرةٍ على عنصرٍ منها كانت تُحسَب «خارجاً» فتُغلقها قبل أن
 * يصل الحدثُ إلى `onClick`. لذلك نفحص المرجعين.
 */
export function useOutsideOfBoth(
  refs: Array<React.RefObject<HTMLElement | null>>,
  handler: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const inside = refs.some((r) => r.current?.contains(target));
      if (!inside) handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handler, enabled]);
}
