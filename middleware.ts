import { rewrite } from '@vercel/edge';
import { classifyHost } from './lib/tenant-brand';

/**
 * [og] معاينةُ الرابط لزواحف التواصل — تُحوَّل إلى الدالّة /api/og.
 * [shell] صفحاتُ مضيفِ مكتبٍ (نطاقٌ خاصّ أو فرعيّ) — تُحوَّل إلى الدالّة /api/shell
 *         التي تعيد index.html بهويّة المكتب، لكلّ طالبٍ لا للزواحف وحدها.
 *
 * لماذا هنا لا في vercel.json وحده؟ قاعدةُ `rewrites` بشرط `has` على
 * user-agent تُقيَّم **بعد** نظام الملفات، و`/` يطابق index.html ملفاً
 * حقيقياً — فلا تُقيَّم القاعدةُ للجذر أصلاً، وهو الرابطُ الذي يُشارَك.
 * قِيس: browserconfig.xml بـUA زاحفٍ وX-Vercel-Cache: MISS جاء الملفُ لا
 * الدالّة. الـMiddleware يُنفَّذ قبل نظام الملفات والكاش معاً فيعترض الجذر.
 * قاعدةُ vercel.json تبقى احتياطاً للمسارات بلا ملف، لا أكثر.
 *
 * ولماذا الصدفةُ لكلّ طالب؟ جالبُ معاينة الروابط في Evolution/Baileys
 * (link-preview-js) لا يحمل هويّةَ زاحفٍ معروف، فكان يُعطى الملفَّ الثابت بعنوان
 * «الرائد» وصورة og-image.png — وتلك هي البطاقةُ التي يراها عميلُ المكتب في
 * واتساب على رابطٍ بنطاق المكتب. والمتصفّحُ كان يعرض عنوانَ «الرائد» وأيقونتَه
 * حتى يعمل JavaScript ويستبين المكتب. قِيس الاثنان على الإنتاج قبل هذا التعديل.
 */
export const config = {
  // مساراتُ الـSPA فقط: لا الدوالّ ولا الأصول ولا الدليل ولا أيَّ ملفٍ بامتداد
  matcher: ['/((?!api/|assets/|guide/|.*[.][a-zA-Z0-9]{1,6}$).*)'],
};

// القائمةُ نفسُها في vercel.json — أبقِهما متطابقتين
const BOT_RE =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|Discordbot|Pinterest|Googlebot|bingbot/i;

export default function middleware(request: Request): Response | undefined {
  if (BOT_RE.test(request.headers.get('user-agent') ?? '')) {
    // المضيفُ يبقى كما هو، والدالّةُ تستبين المكتبَ منه لا من المسار
    return rewrite(new URL('/api/og', request.url));
  }

  const url = new URL(request.url);
  if (classifyHost(url.hostname).kind === 'platform') {
    return undefined; // جذرُ المنصّة: index.html الثابت بهويّتها كما هو
  }

  // المسارُ الأصليّ يُمرَّر للـcanonical وog:url — التحويلُ داخليّ ولا يغيّر عنوان المتصفّح
  const target = new URL('/api/shell', request.url);
  target.searchParams.set('p', url.pathname);
  return rewrite(target);
}
