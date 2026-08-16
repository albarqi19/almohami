import type { Announcement, AnnouncementSeverity } from '../../services/announcementService';

export interface ResolvedTheme {
  bg: string;
  fg: string;
  border: string;
  iconColor: string;
  defaultIcon: string;
}

const PRESETS: Record<AnnouncementSeverity, ResolvedTheme> = {
  info:    { bg: '#eff6ff', fg: '#1e40af', border: '#bfdbfe', iconColor: '#2563eb', defaultIcon: 'Info' },
  success: { bg: '#ecfdf5', fg: '#065f46', border: '#a7f3d0', iconColor: '#059669', defaultIcon: 'CheckCircle2' },
  warning: { bg: '#fffbeb', fg: '#92400e', border: '#fde68a', iconColor: '#d97706', defaultIcon: 'AlertTriangle' },
  danger:  { bg: '#fef2f2', fg: '#991b1b', border: '#fecaca', iconColor: '#dc2626', defaultIcon: 'AlertOctagon' },
  promo:   { bg: '#faf5ff', fg: '#6b21a8', border: '#e9d5ff', iconColor: '#9333ea', defaultIcon: 'Gift' },
  neutral: { bg: '#f8fafc', fg: '#334155', border: '#e2e8f0', iconColor: '#475569', defaultIcon: 'Megaphone' },
  custom:  { bg: '#fef3c7', fg: '#92400e', border: '#fde68a', iconColor: '#d97706', defaultIcon: 'Megaphone' },
};

export function resolveTheme(a: Announcement): ResolvedTheme {
  const base = PRESETS[a.severity] || PRESETS.info;
  if (a.severity === 'custom') {
    return {
      ...base,
      bg: a.custom_bg || base.bg,
      fg: a.custom_fg || base.fg,
      border: a.custom_bg ? mixColor(a.custom_bg, '#000', 0.1) : base.border,
      iconColor: a.custom_fg || base.iconColor,
    };
  }
  return base;
}

// Utility: mix two hex colors by ratio (used for derived border colors)
function mixColor(hex1: string, hex2: string, weight: number): string {
  try {
    const a = parseHex(hex1), b = parseHex(hex2);
    const r = Math.round(a[0] * (1 - weight) + b[0] * weight);
    const g = Math.round(a[1] * (1 - weight) + b[1] * weight);
    const bl = Math.round(a[2] * (1 - weight) + b[2] * weight);
    return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  } catch { return hex1; }
}

function parseHex(h: string): [number, number, number] {
  const s = h.replace('#', '');
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * Defensive: ensure URL is http(s) before navigating.
 * Mitigates javascript:/data: URI XSS even if a bad URL slipped past the API validator.
 */
function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Open the CTA URL in the configured mode.
 */
export function openCta(a: Announcement) {
  if (!a.cta_url || !isSafeHttpUrl(a.cta_url)) return;
  if (a.cta_open_mode === 'same_tab') {
    window.location.href = a.cta_url;
  } else {
    window.open(a.cta_url, '_blank', 'noopener,noreferrer');
  }
}

/*
 * حُذف `renderMarkdown` و`escapeHtml` (٢٤ سطراً): مُصيِّرٌ يدويٌّ لا يعرف إلا العريضَ
 * والمائلَ والروابطَ وفواصلَ الأسطر، فكان كلُّ `##` و`-` و`>` و`---` يظهر خامّاً
 * للقارئ. وحلَّ محلَّه في نافذة التفاصيل `react-markdown` + `remark-gfm` (مثبَّتان
 * ومستعمَلان في ورشة المذكّرات)، وفي الشريط `markdownExcerpt` أدناه.
 *
 * ومعهما سقط آخرُ `dangerouslySetInnerHTML` في وحدة الإعلانات — و`react-markdown`
 * يبني عقداً حقيقيةً لا نصَّ HTML، فيُغلَق بابُ الحقن من نصٍّ يكتبه مسؤول.
 */

export function markdownExcerpt(md: string | null | undefined, max = 200): string {
  if (!md) return '';

  const text = md
    .replace(/```[\s\S]*?```/g, ' ')                   // كتلُ الشيفرة
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')             // الصور
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')           // الروابط ← نصُّها
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')                // العناوين
    .replace(/^\s{0,3}>\s?/gm, '')                     // الاقتباسات
    .replace(/^\s{0,3}([-*+]|\d+\.)\s+/gm, '')         // القوائم
    .replace(/^\s{0,3}([-*_]\s*){3,}$/gm, ' ')         // الفواصل ---
    .replace(/(\*\*|__|\*|_|`)/g, '')                  // التوكيد والشيفرةُ السطرية
    .replace(/\s+/g, ' ')
    .trim();

  // القصُّ عند حدّ كلمةٍ لا في منتصفها.
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
