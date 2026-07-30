import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_BASE_URL = process.env.VITE_API_URL || 'https://api.alraedlaw.com';

// Default meta for main domain
const DEFAULT_META = {
  title: 'الرائد لإدارة المحاماة | نظام متكامل لإدارة مكاتب المحاماة',
  description: 'نظام الرائد لإدارة المحاماة - منصة سحابية متكاملة لإدارة القضايا والعملاء والجلسات والفواتير لمكاتب المحاماة في السعودية',
  image: 'https://alraedlaw.com/og-image.png',
  siteName: 'الرائد لإدارة المحاماة',
  themeColor: '#11233a',
};

const PLATFORM_APEX = 'alraedlaw.com';

/** مضيف خارج مظلّة المنصة ⇒ نطاق عميل خاص، يُستبان بـby-domain لا بالـslug */
function isCustomDomainHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase();
  return !!h && h !== PLATFORM_APEX && !h.endsWith(`.${PLATFORM_APEX}`) && !h.endsWith('.vercel.app');
}

/** hostname صالح الشكل فقط — ترويسة Host يتحكّم بها الطالب فلا تُبنى منها روابط بلا تحقّق */
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$/;

/** لون سداسي صالح فقط — primary_color عمود حرّ النص */
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get subdomain from host header
  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  const isCustomDomain = HOSTNAME_RE.test(host) && isCustomDomainHost(host);
  const subdomain = isCustomDomain ? null : extractSubdomain(host);

  let meta = { ...DEFAULT_META };

  // العنوان القانوني هو المضيف الفعلي دائماً.
  //
  // كان يُركَّب كـ`{subdomain}.alraedlaw.com`، فعلى دومين خاص مثل
  // app.nuhaili-law.com كانت extractSubdomain تعيد 'app' فيصير canonical
  // وog:url على `app.alraedlaw.com` — مضيفٌ محجوز لا يخدم المكتب أصلاً:
  // لا معاينة للعميل، وإشارات SEO تُهدر على عنوان ميت.
  const currentUrl = isCustomDomain
    ? `https://${host}`
    : subdomain
      ? `https://${subdomain}.${PLATFORM_APEX}`
      : `https://${PLATFORM_APEX}`;

  // يُجلب المستأجر بمسار الـslug للنطاقات الفرعية، وبـby-domain للنطاقات الخاصة.
  // استثناء 'app' يبقى للنطاقات الفرعية وحدها — فهو محجوز هناك، بينما
  // app.nuhaili-law.com دومين عميل شرعي.
  const shouldFetch = isCustomDomain || (subdomain && subdomain !== 'www' && subdomain !== 'app');

  if (shouldFetch) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const endpoint = isCustomDomain
        ? `${API_BASE_URL}/api/v1/public/tenant/by-domain?host=${encodeURIComponent(host)}`
        : `${API_BASE_URL}/api/v1/public/tenant/${subdomain}`;

      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => null);

        if (data?.success && data?.data) {
          const tenantData = data.data;
          meta = {
            title: `${tenantData.name} | مكتب محاماة`,
            description: tenantData.tagline || `${tenantData.name} - مكتب محاماة متخصص`,
            image: tenantData.logo_url || DEFAULT_META.image,
            siteName: tenantData.name,
            themeColor: HEX_RE.test(String(tenantData.primary_color ?? ''))
              ? tenantData.primary_color
              : DEFAULT_META.themeColor,
          };
        }
      }
      // إذا response.ok = false، نبقي DEFAULT_META (fail silently)
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Failed to fetch tenant (using defaults):', error);
      // meta = DEFAULT_META (تم تعيينها بالأعلى)
    }
  }

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary Meta Tags -->
  <title>${escapeHtml(meta.title)}</title>
  <meta name="title" content="${escapeHtml(meta.title)}">
  <meta name="description" content="${escapeHtml(meta.description)}">
  <meta name="author" content="${escapeHtml(meta.siteName)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${escapeHtml(currentUrl)}">

  <!-- Theme -->
  <meta name="theme-color" content="${escapeHtml(meta.themeColor)}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(currentUrl)}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:image" content="${escapeHtml(meta.image)}">
  <meta property="og:locale" content="ar_SA">
  <meta property="og:site_name" content="${escapeHtml(meta.siteName)}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(currentUrl)}">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  <meta name="twitter:image" content="${escapeHtml(meta.image)}">

  <!-- Schema.org -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "name": "${escapeHtml(meta.siteName)}",
    "description": "${escapeHtml(meta.description)}",
    "url": "${escapeHtml(currentUrl)}",
    "logo": "${escapeHtml(meta.image)}"
  }
  </script>
</head>
<body>
  <h1>${escapeHtml(meta.siteName)}</h1>
  <p>${escapeHtml(meta.description)}</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
  return res.status(200).send(html);
}

function extractSubdomain(host: string): string | null {
  // Remove port if exists
  const hostWithoutPort = host.replace(/:\d+$/, '');

  // Split by dots
  const parts = hostWithoutPort.split('.');

  // If 3+ parts (subdomain.domain.tld), return first part
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
