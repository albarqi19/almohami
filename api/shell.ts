import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BRAND_REGION_RE,
  NEUTRAL_BRAND,
  apiOrigin,
  brandFromTenant,
  classifyHost,
  lookupTenant,
  renderBrandHead,
  safePath,
} from '../lib/tenant-brand.js';

/**
 * [shell] صدفةُ التطبيق لمضيف مكتب — `index.html` نفسُه بهويّة المكتب في `<head>`.
 *
 * يصل إليها كلُّ طلبِ صفحةٍ على نطاق مكتب (خاصّ أو فرعيّ) عبر الـMiddleware، أيّاً
 * كان الطالب: متصفّحُ العميل، أو جالبُ معاينة الروابط في Evolution/Baileys الذي
 * لا يحمل هويّةَ زاحف واتساب فكان يُعطى الملفَّ الثابت بعنوان «الرائد» وصورته.
 * الزواحفُ المعروفة تبقى على `api/og` (بطاقةٌ خفيفة بلا تطبيق).
 *
 * الملفُّ الثابت يُجلب من النشرة نفسها (`/index.html` يتخطّى الـMiddleware لأنّه
 * بامتداد)، فيحمل مسارات الأصول المبنيّة الصحيحة دائماً؛ ويُخبَّأ في ذاكرة
 * الدالّة دقائقَ. ثمّ تُستبدل منطقةُ `<!-- brand:start … brand:end -->` كاملةً.
 */

const SHELL_TTL_MS = 5 * 60 * 1000;
let shellCache: { html: string; at: number } | null = null;

async function loadShell(origin: string): Promise<string> {
  if (shellCache && Date.now() - shellCache.at < SHELL_TTL_MS) return shellCache.html;

  // 1) من ملفات النشرة نفسها (vercel.json → functions.includeFiles: dist/index.html):
  //    بلا شبكة، فلا يعلّقه Cloudflare ولا حمايةُ Vercel للمعاينات، والملفُّ هو المخدومُ
  //    حرفياً فيحمل مسارات الأصول المبنيّة الصحيحة.
  try {
    const html = await readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
    if (BRAND_REGION_RE.test(html)) {
      shellCache = { html, at: Date.now() };
      return html;
    }
  } catch {
    // ليس في الحزمة — نسقط إلى الجلب عبر الشبكة
  }

  // 2) احتياطاً: الجلب من الأصل نفسه (/index.html يتخطّى الـMiddleware لأنه بامتداد)
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${origin}/index.html`, {
        headers: { Accept: 'text/html', 'User-Agent': 'alraed-shell/1.0' },
      });
      if (!res.ok) throw new Error(`index.html ${res.status}`);
      const html = await res.text();
      if (!BRAND_REGION_RE.test(html)) throw new Error('index.html بلا منطقة brand');
      shellCache = { html, at: Date.now() };
      return html;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('تعذّر جلب index.html');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawHost = String(req.headers.host ?? '').split(':')[0].toLowerCase();
  const host = classifyHost(rawHost);
  const proto = rawHost === 'localhost' || rawHost === '127.0.0.1' ? 'http' : 'https';
  const origin = `${proto}://${rawHost}`;

  // مضيفُ المنصّة لا يصل هنا (الـMiddleware لا يحوّله) — احتياطاً يُعاد كما هو
  let shell: string;
  try {
    shell = await loadShell(origin);
  } catch (e) {
    console.error('[shell] index.html unavailable:', e);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).send('Service temporarily unavailable');
  }

  if (host.kind === 'platform') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
    res.setHeader('X-Brand-Shell', 'platform');
    return res.status(200).send(shell);
  }

  const pageUrl = `${origin}${safePath(req.query.p)}`;
  const lookup = await lookupTenant(apiOrigin(process.env), host);

  let brand = NEUTRAL_BRAND;
  // الفشلُ لا يُخبَّأ على الحافة: الطلبُ التالي يعيد المحاولة.
  // نطاقٌ لم يُربط (404/403) جوابٌ نهائيّ — يُخبَّأ قليلاً حتى لا يُطرق الـAPI بكلّ طلب.
  let cacheControl = 'no-store';
  let marker = 'neutral';
  if (lookup.status === 'found') {
    brand = brandFromTenant(lookup.tenant);
    cacheControl = 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400';
    marker = 'tenant';
  } else if (lookup.status === 'missing') {
    cacheControl = 'public, max-age=0, s-maxage=60';
    marker = 'missing';
  }

  const html = shell.replace(BRAND_REGION_RE, () => renderBrandHead(brand, pageUrl));

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Brand-Shell', marker);
  return res.status(200).send(html);
}
