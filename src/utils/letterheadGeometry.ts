import type { Letterhead } from '../types/letterhead';
import { A4_HEIGHT_MM } from '../types/letterhead';

/**
 * منطقة الكتابة الفعلية لكليشةٍ ما — **مرآةٌ لحساب الباك**
 * (App\Services\Pdf\Concerns\RendersLetterheadChrome::letterheadPageConfig).
 *
 * وُضع في ملفٍّ واحد لأنّ نسخَه في كل معاينة هو ما جعل المعاينة تكذب على المطبوع:
 * أيّ تعديلٍ على القاعدة يُعدَّل هنا مرةً واحدة.
 *
 * القاعدة:
 *   - «الورقة الكاملة»: الهوامش الأربعة هي المنطقة الآمنة، مطلقةً من حافة الورقة.
 *   - غيرها و`margins_are_absolute` مشتعل: الأرقام مسافاتٌ مطلقة، بأرضيةٍ عند ارتفاع
 *     الرأس/التذييل كي لا يركب المتن على الكليشة.
 *   - غيرها والعلم مطفأ (كليشةٌ صدرت): الحسبة القديمة — ارتفاع الكروم + فراغٌ ثابت،
 *     وأرقام المستخدم مهملة.
 */

/** فراغ المتن عن صورتَي الرأس/التذييل في النمط الصوري (imageGap في الباك). */
const IMAGE_GAP_MM = 3;

/**
 * كروم النمط الديناميكي وفراغه — نظير headerH/footerH/gap/side في الباك.
 *
 * هذه قيم «الخطابات» (الصادر وعقد العمل: side=16, gap=10). وبقيّة المستندات تمرّر
 * فروقاً يسيرة (المذكرة وعرض الأتعاب 14/9، كشف الجلسات 10). الفرق يظهر في الوضع
 * القديم وحده — وهو مجمَّدٌ للكليشات التي صدرت — ولا يتجاوز ٦مم جانبياً ومماً واحداً
 * رأسياً. أمّا الوضع المطلق (كل كليشةٍ جديدة) فأرقام المستخدم فيه هي الحاكمة، فتتطابق
 * المعاينة والملف تطابقاً تاماً في الأنواع الثلاثة.
 */
const DYNAMIC_HEADER_MM = 20;
const DYNAMIC_FOOTER_MM = 16;
const DYNAMIC_GAP_MM = 10;
const DYNAMIC_SIDE_MM = 16;

/** شريط رقم الصفحة المحجوز داخل المنطقة الآمنة في «الورقة الكاملة». */
const PAGE_NUMBER_BAND_MM = 7;

export interface LetterheadGeometry {
  /** ارتفاع كروم الكليشة المرسوم أعلى/أسفل الورقة (0 في «الورقة الكاملة»). */
  headerHeightMM: number;
  footerHeightMM: number;
  /** المسافة من حافة الورقة إلى أول/آخر سطرٍ في المتن. */
  contentTopMM: number;
  contentBottomMM: number;
  contentRightMM: number;
  contentLeftMM: number;
  /** ارتفاع منطقة المتن الصافي على الصفحة الواحدة. */
  contentHeightMM: number;
  isFullPage: boolean;
}

export function letterheadGeometry(lh: Letterhead | null | undefined): LetterheadGeometry {
  const isFullPage = lh?.type === 'full_page' && !!lh.background_image_url;

  const top = lh?.margin_top_mm ?? 25;
  const bottom = lh?.margin_bottom_mm ?? 20;
  const right = lh?.margin_right_mm ?? 20;
  const left = lh?.margin_left_mm ?? 20;

  if (isFullPage) {
    // الترويسة والتذييل داخل صورة الورقة نفسها — لا كروم منفصل
    const bandMM = lh?.show_page_numbers ? PAGE_NUMBER_BAND_MM : 0;
    return {
      headerHeightMM: 0,
      footerHeightMM: 0,
      contentTopMM: top,
      contentBottomMM: bottom + bandMM,
      contentRightMM: right,
      contentLeftMM: left,
      contentHeightMM: A4_HEIGHT_MM - top - (bottom + bandMM),
      isFullPage: true,
    };
  }

  const isImage = lh?.type === 'image';
  const headerHeightMM = isImage ? (lh?.header_height_mm || 30) : lh ? DYNAMIC_HEADER_MM : 0;
  const footerHeightMM = isImage ? (lh?.footer_height_mm || 25) : lh ? DYNAMIC_FOOTER_MM : 0;
  const gap = isImage ? IMAGE_GAP_MM : DYNAMIC_GAP_MM;

  // الأرضية: المتن لا يقترب من الكروم مهما صغُر رقم المستخدم
  const floorTop = headerHeightMM + (lh ? gap : 0);
  const floorBottom = footerHeightMM + (lh ? gap : 0);

  const absolute = !!lh?.margins_are_absolute;

  // الجانبان: النمط الصوري يُبقي هوامش الصفحة صفراً (الصور تنزف إلى الحافة)
  // ويحقن المسافة حشواً للمتن — والنتيجة المرئية واحدة.
  const legacySide = isImage ? 12 : DYNAMIC_SIDE_MM;

  return {
    headerHeightMM,
    footerHeightMM,
    contentTopMM: absolute ? Math.max(floorTop, top) : floorTop,
    contentBottomMM: absolute ? Math.max(floorBottom, bottom) : floorBottom,
    contentRightMM: absolute ? right : legacySide,
    contentLeftMM: absolute ? left : legacySide,
    contentHeightMM:
      A4_HEIGHT_MM -
      (absolute ? Math.max(floorTop, top) : floorTop) -
      (absolute ? Math.max(floorBottom, bottom) : floorBottom),
    isFullPage: false,
  };
}
