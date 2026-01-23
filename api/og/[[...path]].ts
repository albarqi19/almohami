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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get subdomain from host header
  const host = req.headers.host || '';
  const subdomain = extractSubdomain(host);

  let meta = { ...DEFAULT_META };
  const currentUrl = subdomain
    ? `https://${subdomain}.alraedlaw.com`
    : 'https://alraedlaw.com';

  // Fetch tenant data from API if subdomain exists
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/public/tenant/${subdomain}`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      const data = await response.json();

      if (data.success && data.data) {
        const tenantData = data.data;
        meta = {
          title: `${tenantData.name} | مكتب محاماة`,
          description: tenantData.tagline || `${tenantData.name} - مكتب محاماة متخصص`,
          image: tenantData.logo_url || DEFAULT_META.image,
          siteName: tenantData.name,
          themeColor: tenantData.primary_color || DEFAULT_META.themeColor,
        };
      }
    } catch (error) {
      console.error('Failed to fetch tenant:', error);
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
  <link rel="canonical" href="${currentUrl}">

  <!-- Theme -->
  <meta name="theme-color" content="${meta.themeColor}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${currentUrl}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:image" content="${escapeHtml(meta.image)}">
  <meta property="og:locale" content="ar_SA">
  <meta property="og:site_name" content="${escapeHtml(meta.siteName)}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${currentUrl}">
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
    "url": "${currentUrl}",
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
