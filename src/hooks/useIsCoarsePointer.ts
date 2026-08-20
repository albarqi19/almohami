import { useEffect, useState } from 'react';

/**
 * هل يتعامل المستخدم بإصبعه لا بمؤشّرٍ دقيق؟
 *
 * نقيس نوع المؤشّر لا عرض الشاشة: `(pointer: coarse)` تعني أن أدقّ أداة تأشيرٍ
 * في الجهاز إصبعٌ — وهو الفرق الذي يهمّ فعلاً. فالقياس بالعرض يُعطّل السحب على
 * نافذةٍ ضيّقة في حاسبٍ مكتبيّ بلا سبب، ويُبقيه مفعَّلاً على لوحيٍّ عريض.
 * ولا يتأثّر به حاسبٌ محمولٌ بشاشة لمس، لأن فأرته تجعل مؤشّره `fine`.
 *
 * استعماله الأوّل: تعطيل السحب والإفلات في شاشة المهام على الأجهزة اللمسية —
 * `PointerSensor` يستقبل أحداث اللمس أيضاً، فمسافة تفعيلٍ صغيرة تجعل كلّ تمريرِ
 * إصبعٍ فوق مهمّةٍ يبدأ سحباً بدل أن يمرّر الصفحة.
 */
export function useIsCoarsePointer(): boolean {
  const [isCoarse, setIsCoarse] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const query = window.matchMedia('(pointer: coarse)');
    const onChange = (e: MediaQueryListEvent) => setIsCoarse(e.matches);

    // Safari دون 14 لا يعرف addEventListener على MediaQueryList
    if (query.addEventListener) {
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }

    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);

  return isCoarse;
}

export default useIsCoarsePointer;
