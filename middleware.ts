import { rewrite } from '@vercel/edge';

/**
 * [og] معاينةُ الرابط لزواحف التواصل — تُحوَّل إلى الدالّة /api/og.
 *
 * لماذا هنا لا في vercel.json وحده؟ قاعدةُ `rewrites` بشرط `has` على
 * user-agent تُقيَّم **بعد** نظام الملفات، و`/` يطابق index.html ملفاً
 * حقيقياً — فلا تُقيَّم القاعدةُ للجذر أصلاً، وهو الرابطُ الذي يُشارَك.
 * قِيس: browserconfig.xml بـUA زاحفٍ وX-Vercel-Cache: MISS جاء الملفُ لا
 * الدالّة. الـMiddleware يُنفَّذ قبل نظام الملفات والكاش معاً فيعترض الجذر.
 * قاعدةُ vercel.json تبقى احتياطاً للمسارات بلا ملف، لا أكثر.
 */
export const config = {
  // مساراتُ الـSPA فقط: لا الدوالّ ولا الأصول ولا الدليل ولا أيَّ ملفٍ بامتداد
  matcher: ['/((?!api/|assets/|guide/|.*[.][a-zA-Z0-9]{1,6}$).*)'],
};

// القائمةُ نفسُها في vercel.json — أبقِهما متطابقتين
const BOT_RE =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Slackbot|Discordbot|Pinterest|Googlebot|bingbot/i;

export default function middleware(request: Request): Response | undefined {
  if (!BOT_RE.test(request.headers.get('user-agent') ?? '')) {
    return undefined; // يكمل الطلبُ طريقَه الطبيعيّ
  }
  // المضيفُ يبقى كما هو، والدالّةُ تستبين المكتبَ منه لا من المسار
  return rewrite(new URL('/api/og', request.url));
}
