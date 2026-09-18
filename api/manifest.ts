import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  NEUTRAL_BRAND,
  apiOrigin,
  brandFromTenant,
  classifyHost,
  lookupTenant,
  renderManifest,
} from '../lib/tenant-brand.js';

/**
 * [manifest] مانيفست PWA لمضيف مكتب — اسمُه وأيقونتُه ولونُه.
 *
 * `manifest.json` الثابت يقول «الرائد لإدارة المحاماة»، فمن يضيف بوابةَ مكتبه إلى
 * شاشته الرئيسية على نطاق المكتب كان يحصل على أيقونة الرائد واسمه. الصدفةُ
 * (`api/shell`) تشير إلى هذا المسار بدل الملفّ الثابت على مضيفات المكاتب.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawHost = String(req.headers.host ?? '').split(':')[0].toLowerCase();
  const host = classifyHost(rawHost);

  if (host.kind === 'platform') {
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
    return res.redirect(302, '/manifest.json');
  }

  const lookup = await lookupTenant(apiOrigin(process.env), host);
  const brand = lookup.status === 'found' ? brandFromTenant(lookup.tenant) : NEUTRAL_BRAND;

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    lookup.status === 'found'
      ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
      : 'no-store',
  );
  return res.status(200).send(JSON.stringify(renderManifest(brand), null, 2));
}
