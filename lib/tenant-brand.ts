/**
 * هويّة المكتب على مضيفه — مشتركة بين الـMiddleware (Edge) ودوالّ `api/*` (Node).
 *
 * لا استيرادات من Node ولا من DOM هنا: الملفُّ يُنفَّذ في الحافة وفي Node معاً،
 * فلا يعتمد إلا على `fetch` و`URL` و`AbortController` المتاحة في كليهما.
 *
 * لماذا وُجد؟ `index.html` الثابت يحمل هويّة «الرائد» (عنوان، أيقونات، مانيفست،
 * ميتا المشاركة)، وكلُّ من يطلب HTML على نطاق مكتبٍ — متصفّحُ العميل قبل أن
 * يعمل JavaScript، وجالبُ معاينة الروابط في Evolution/Baileys الذي ليس زاحفَ
 * واتساب الرسميّ — كان يحصل عليه كما هو. الدالّة `api/shell` تستبدل تلك الهويّة
 * بهويّة المكتب قبل أن يخرج الملفُّ من الخادم.
 */

export const PLATFORM_APEX = 'alraedlaw.com';

/** نطاقاتٌ فرعيّة محجوزة على المنصّة — ليست مكاتب (القائمة نفسها في TenantContext) */
const RESERVED_SUBDOMAINS = ['www', 'api', 'app', 'admin', 'dashboard'];

/** hostname صالح الشكل فقط — ترويسة Host بيد الطالب فلا تُبنى منها روابط بلا تحقّق */
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/;

/** لون سداسي صالح فقط — primary_color عمود حرّ النص */
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** رابط مطلق https/http أو مسار من جذر الموقع — كلّ ما سواه يُهمل */
const URL_RE = /^(?:https?:\/\/[^\s"'<>]+|\/[^\s"'<>]*)$/;

export type HostKind =
  | { kind: 'platform' }
  | { kind: 'subdomain'; slug: string }
  | { kind: 'custom'; host: string };

/**
 * تصنيف المضيف:
 * - `platform`: جذر المنصّة وwww وما هو محجوز وبيئات التطوير والمعاينة — يُخدم index.html كما هو.
 * - `subdomain`: `{slug}.alraedlaw.com` — يُستبان المكتب بالـslug.
 * - `custom`: نطاقٌ خاصّ بمكتب (portal.zubaidi.sa) — يُستبان بـby-domain.
 */
export function classifyHost(rawHost: string | null | undefined): HostKind {
  const host = String(rawHost ?? '').split(':')[0].toLowerCase();
  if (!HOSTNAME_RE.test(host)) return { kind: 'platform' };
  if (
    host === PLATFORM_APEX ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.localhost')
  ) {
    return { kind: 'platform' };
  }
  if (host.endsWith(`.${PLATFORM_APEX}`)) {
    const sub = host.slice(0, -(PLATFORM_APEX.length + 1));
    if (!sub || sub.includes('.') || RESERVED_SUBDOMAINS.includes(sub)) return { kind: 'platform' };
    return { kind: 'subdomain', slug: sub };
  }
  return { kind: 'custom', host };
}

export function isTenantHost(rawHost: string | null | undefined): boolean {
  return classifyHost(rawHost).kind !== 'platform';
}

/** أصلُ الـAPI: `VITE_API_URL` قد يحمل `/api/v1` وقد لا — يُؤخذ الأصلُ وحده */
export function apiOrigin(env: Record<string, string | undefined>): string {
  const raw = env.VITE_API_URL || 'https://api.alraedlaw.com';
  try {
    return new URL(raw).origin;
  } catch {
    return 'https://api.alraedlaw.com';
  }
}

/** الحقول العامّة التي يردّها `/public/tenant/{slug}` و`/public/tenant/by-domain` */
export interface PublicTenant {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  tagline: string | null;
  favicon_url: string | null;
  custom_branding_enabled: boolean;
}

export type TenantLookup =
  | { status: 'found'; tenant: PublicTenant }
  | { status: 'missing' } // 404 نطاقٌ لم يُربط / 403 معلّق — جوابٌ نهائيّ
  | { status: 'error' }; // مهلة، 5xx، انقطاع — يُعاد المحاولة في الطلب التالي

/**
 * استبانة المكتب من نوع المضيف. لا ترمي: كلُّ فشلٍ يعود حالةً يقرّر المنادي كيف يخبّئها.
 */
export async function lookupTenant(
  origin: string,
  host: HostKind,
  timeoutMs = 5000,
): Promise<TenantLookup> {
  if (host.kind === 'platform') return { status: 'missing' };

  const endpoint =
    host.kind === 'custom'
      ? `${origin}/api/v1/public/tenant/by-domain?host=${encodeURIComponent(host.host)}`
      : `${origin}/api/v1/public/tenant/${encodeURIComponent(host.slug)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (res.status === 404 || res.status === 403) return { status: 'missing' };
    if (!res.ok) return { status: 'error' };
    const data = (await res.json().catch(() => null)) as { success?: boolean; data?: PublicTenant } | null;
    if (data?.success && data.data && typeof data.data.name === 'string' && data.data.name.trim()) {
      return { status: 'found', tenant: data.data };
    }
    return { status: 'error' };
  } catch {
    return { status: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

/** ما يُحقن في `<head>` وفي المانيفست — نصوصٌ خامٌ تُهرَّب عند الإخراج */
export interface Brand {
  /** اسم المكتب كما يظهر في التبويب وعلى الشاشة الرئيسية */
  name: string;
  /** عنوان التبويب — الصيغةُ نفسُها التي يكتبها TenantContext بعد التحميل، فلا يتبدّل العنوان بعد الهيدرة */
  title: string;
  /** عنوان بطاقة المشاركة (واتساب/إكس/لينكدإن) */
  shareTitle: string;
  description: string;
  /** صورة البطاقة — شعار المكتب؛ فارغة = بلا صورة (لا بديلَ فيه اسمُ المنصّة) */
  image: string;
  /** أيقونة التبويب/الشاشة الرئيسية؛ فارغة = بلا أيقونة (لا أيقونةَ المنصّة) */
  icon: string;
  themeColor: string;
}

const NEUTRAL_THEME = '#1f2937';

/** مكتبٌ تعذّر استبيانه: هويّةٌ محايدة، لا هويّةَ المنصّة على مضيف مكتب */
export const NEUTRAL_BRAND: Brand = {
  name: 'مكتب المحاماة',
  title: 'نظام إدارة المحاماة',
  shareTitle: 'مكتب محاماة',
  description: '',
  image: '',
  icon: '',
  themeColor: NEUTRAL_THEME,
};

function safeUrl(value: unknown): string {
  const s = typeof value === 'string' ? value.trim() : '';
  return URL_RE.test(s) ? s : '';
}

export function brandFromTenant(t: PublicTenant): Brand {
  const name = t.name.trim();
  const tagline = typeof t.tagline === 'string' ? t.tagline.trim() : '';
  return {
    name,
    title: `${name} | نظام إدارة المحاماة`,
    shareTitle: `${name} | مكتب محاماة`,
    description: tagline || `${name} - مكتب محاماة متخصص`,
    image: safeUrl(t.logo_url),
    icon: safeUrl(t.favicon_url),
    themeColor: HEX_RE.test(String(t.primary_color ?? '')) ? String(t.primary_color) : NEUTRAL_THEME,
  };
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** JSON داخل `<script>`: `<` يُهرَّب حتى لا يُغلق `</script>` من داخل اسم مكتب */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
}

/** علامتا منطقة الهويّة في index.html — ما بينهما هويّةُ المنصّة ويُستبدل كلُّه */
export const BRAND_REGION_RE = /<!-- brand:start -->[\s\S]*?<!-- brand:end -->/;

/**
 * وسومُ `<head>` لمضيف مكتب — بديلُ المنطقة كاملةً.
 * `pageUrl` هو الرابط الفعليّ المطلوب (canonical وog:url).
 */
export function renderBrandHead(brand: Brand, pageUrl: string): string {
  const title = escapeHtml(brand.title);
  const shareTitle = escapeHtml(brand.shareTitle);
  const description = escapeHtml(brand.description);
  const name = escapeHtml(brand.name);
  const url = escapeHtml(pageUrl);
  const image = brand.image ? escapeHtml(brand.image) : '';
  const icon = brand.icon ? escapeHtml(brand.icon) : '';
  const theme = escapeHtml(brand.themeColor);

  const schema = jsonForScript({
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: brand.name,
    ...(brand.description ? { description: brand.description } : {}),
    url: pageUrl,
    ...(brand.image ? { logo: brand.image } : {}),
  });

  return [
    '<!-- brand:start -->',
    `<title>${title}</title>`,
    `<meta name="title" content="${title}">`,
    description ? `<meta name="description" content="${description}">` : '',
    `<meta name="author" content="${name}">`,
    `<link rel="canonical" href="${url}">`,
    icon ? `<link rel="icon" href="${icon}">` : '',
    icon ? `<link rel="apple-touch-icon" href="${icon}">` : '',
    `<meta name="theme-color" content="${theme}">`,
    `<meta name="apple-mobile-web-app-title" content="${name}">`,
    '<link rel="manifest" href="/api/manifest">',
    '<meta property="og:type" content="website">',
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:title" content="${shareTitle}">`,
    `<meta property="og:description" content="${description}">`,
    image ? `<meta property="og:image" content="${image}">` : '',
    '<meta property="og:locale" content="ar_SA">',
    `<meta property="og:site_name" content="${name}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:url" content="${url}">`,
    `<meta name="twitter:title" content="${shareTitle}">`,
    `<meta name="twitter:description" content="${description}">`,
    image ? `<meta name="twitter:image" content="${image}">` : '',
    `<script type="application/ld+json">${schema}</script>`,
    '<!-- brand:end -->',
  ]
    .filter(Boolean)
    .join('\n  ');
}

/** المانيفست لمضيف مكتب — اسمُه وأيقونتُه ولونُه بدل مانيفست المنصّة */
export function renderManifest(brand: Brand): Record<string, unknown> {
  const iconSrc = brand.icon || brand.image;
  return {
    name: brand.name,
    short_name: brand.name.length > 12 ? brand.name.slice(0, 12).trim() : brand.name,
    ...(brand.description ? { description: brand.description } : {}),
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: brand.themeColor,
    orientation: 'portrait-primary',
    icons: iconSrc ? [{ src: iconSrc, sizes: 'any', ...mimeFor(iconSrc) }] : [],
    lang: 'ar',
    dir: 'rtl',
  };
}

function mimeFor(src: string): { type?: string } {
  const ext = src.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? '';
  const type: Record<string, string> = {
    png: 'image/png',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
  };
  return type[ext] ? { type: type[ext] } : {};
}

/** مسار الصفحة كما وصل من الـMiddleware: من جذر الموقع فقط، لا `//host` ولا مخطّط */
export function safePath(value: unknown): string {
  const p = typeof value === 'string' ? value : '';
  return /^\/(?!\/)[^\s<>"']*$/.test(p) ? p : '/';
}
