/**
 * منظّف HTML خفيف من جهة العميل لعرض المحتوى الغني المخزَّن (مخرجات محرّر TipTap).
 *
 * دفاع متعدد الطبقات: المحتوى يُنظَّف أصلاً على الخادم عند الحفظ (App\Support\HtmlSanitizer)،
 * وهذا يضمن أمان أي محتوى قديم/غير منظَّف عند العرض عبر dangerouslySetInnerHTML.
 */

const DANGEROUS_TAGS = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'APPLET',
  'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'OPTION',
  'LINK', 'META', 'BASE', 'NOSCRIPT', 'SVG', 'MATH', 'TEMPLATE',
]);

const URL_ATTRS = ['href', 'src', 'xlink:href'];

function isDangerousUrl(value: string): boolean {
  const normalized = value.replace(/\s+/g, '').toLowerCase();
  if (normalized.startsWith('javascript:')) return true;
  if (normalized.startsWith('vbscript:')) return true;
  if (normalized.startsWith('data:') && !normalized.startsWith('data:image/')) return true;
  return false;
}

/**
 * يُنظّف سلسلة HTML ويُرجع نسخة آمنة. الإدخال الفارغ يُرجَع كما هو.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    // بيئة بلا DOM (SSR): إرجاع نص بلا وسوم كحدّ أدنى آمن.
    return html.replace(/<[^>]*>/g, '');
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');

  const walk = (node: Element) => {
    // نسخة ثابتة لأننا قد نحذف عقداً أثناء المرور.
    const children = Array.from(node.children);
    for (const child of children) {
      if (DANGEROUS_TAGS.has(child.tagName)) {
        child.remove();
        continue;
      }

      // إزالة معالِجات الأحداث inline وأي URL خطر.
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) {
          child.removeAttribute(attr.name);
          continue;
        }
        if (URL_ATTRS.includes(name) && isDangerousUrl(attr.value)) {
          child.removeAttribute(attr.name);
        }
      }

      walk(child);
    }
  };

  walk(doc.body);
  return doc.body.innerHTML;
}

/**
 * هل يحتوي محتوى HTML على نص فعلي (بعد تجاهل الوسوم والمسافات)؟
 * مفيد لتمييز "<p></p>" الفارغ من محتوى حقيقي.
 */
export function isHtmlEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/‏|‎/g, '')
    .trim();
  return text.length === 0;
}
