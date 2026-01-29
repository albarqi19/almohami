/**
 * Content Converter - تحويل المحتوى من Yoopta إلى HTML (Tiptap)
 *
 * هذا الملف يوفر دوال لتحويل المحتوى المحفوظ بتنسيق Yoopta
 * إلى HTML الذي يفهمه محرر Tiptap
 */

// أنواع بيانات Yoopta
interface YooptaBlock {
  id: string;
  type: string;
  value: YooptaBlockValue[];
  meta?: {
    order?: number;
    depth?: number;
    align?: 'left' | 'center' | 'right';
  };
}

interface YooptaBlockValue {
  id: string;
  type: string;
  children: YooptaTextNode[];
  props?: Record<string, any>;
}

interface YooptaTextNode {
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  highlight?: string | boolean;
  color?: string;
  children?: YooptaTextNode[];
}

type YooptaContent = Record<string, YooptaBlock>;

/**
 * التحقق من نوع المحتوى
 */
export function detectContentType(content: string | any): 'yoopta' | 'html' | 'plain' | 'unknown' {
  if (!content) return 'unknown';

  // إذا كان نص HTML
  if (typeof content === 'string') {
    const trimmed = content.trim();

    // تحقق من HTML
    if (trimmed.startsWith('<') && trimmed.includes('>')) {
      return 'html';
    }

    // محاولة parse كـ JSON
    try {
      const parsed = JSON.parse(content);
      if (isYooptaContent(parsed)) {
        return 'yoopta';
      }
    } catch {
      // ليس JSON، إذن نص عادي
      return 'plain';
    }

    return 'plain';
  }

  // إذا كان object
  if (typeof content === 'object') {
    if (isYooptaContent(content)) {
      return 'yoopta';
    }
  }

  return 'unknown';
}

/**
 * التحقق من أن المحتوى بتنسيق Yoopta
 */
function isYooptaContent(content: any): content is YooptaContent {
  if (!content || typeof content !== 'object') return false;

  // Yoopta content هو object يحتوي على blocks
  const keys = Object.keys(content);
  if (keys.length === 0) return false;

  // تحقق من أول block
  const firstBlock = content[keys[0]];
  return (
    firstBlock &&
    typeof firstBlock === 'object' &&
    'id' in firstBlock &&
    'type' in firstBlock &&
    'value' in firstBlock
  );
}

/**
 * تحويل text node من Yoopta إلى HTML
 */
function textNodeToHTML(node: YooptaTextNode): string {
  if (node.children && Array.isArray(node.children)) {
    return node.children.map(child => textNodeToHTML(child)).join('');
  }

  let text = node.text || '';

  if (!text) return '';

  // تطبيق التنسيقات
  if (node.code) {
    text = `<code>${text}</code>`;
  }

  if (node.bold) {
    text = `<strong>${text}</strong>`;
  }

  if (node.italic) {
    text = `<em>${text}</em>`;
  }

  if (node.underline) {
    text = `<u>${text}</u>`;
  }

  if (node.strike) {
    text = `<s>${text}</s>`;
  }

  // الألوان والتظليل
  const styles: string[] = [];

  if (node.color) {
    styles.push(`color: ${node.color}`);
  }

  if (node.highlight) {
    const highlightColor = typeof node.highlight === 'string' ? node.highlight : '#FEF3C7';
    styles.push(`background-color: ${highlightColor}`);
  }

  if (styles.length > 0) {
    text = `<span style="${styles.join('; ')}">${text}</span>`;
  }

  return text;
}

/**
 * تحويل block value إلى HTML
 */
function blockValueToHTML(value: YooptaBlockValue): string {
  const textContent = value.children.map(child => textNodeToHTML(child)).join('');
  return textContent;
}

/**
 * تحويل block كامل إلى HTML
 */
function blockToHTML(block: YooptaBlock): string {
  const alignment = block.meta?.align || 'right';
  const alignStyle = `text-align: ${alignment}`;

  const content = block.value.map(v => blockValueToHTML(v)).join('');

  switch (block.type) {
    case 'Paragraph':
    case 'paragraph':
      return `<p style="${alignStyle}" dir="rtl">${content || '<br>'}</p>`;

    case 'HeadingOne':
    case 'heading-one':
      return `<h1 style="${alignStyle}" dir="rtl">${content}</h1>`;

    case 'HeadingTwo':
    case 'heading-two':
      return `<h2 style="${alignStyle}" dir="rtl">${content}</h2>`;

    case 'HeadingThree':
    case 'heading-three':
      return `<h3 style="${alignStyle}" dir="rtl">${content}</h3>`;

    case 'BulletedList':
    case 'bulleted-list':
      return `<ul dir="rtl"><li style="${alignStyle}">${content}</li></ul>`;

    case 'NumberedList':
    case 'numbered-list':
      return `<ol dir="rtl"><li style="${alignStyle}">${content}</li></ol>`;

    case 'TodoList':
    case 'todo-list':
      const checked = block.value[0]?.props?.checked ? '✓ ' : '☐ ';
      return `<p style="${alignStyle}" dir="rtl">${checked}${content}</p>`;

    case 'Blockquote':
    case 'blockquote':
      return `<blockquote style="${alignStyle}" dir="rtl" class="tiptap-blockquote">${content}</blockquote>`;

    case 'Callout':
    case 'callout':
      return `<div style="${alignStyle}; padding: 12px; background: #f0f9ff; border-radius: 8px; border-right: 4px solid #3b82f6;" dir="rtl">${content}</div>`;

    case 'Code':
    case 'code':
      return `<pre class="tiptap-code-block"><code>${content}</code></pre>`;

    case 'Divider':
    case 'divider':
      return '<hr />';

    case 'Link':
    case 'link':
      const href = block.value[0]?.props?.url || '#';
      return `<p style="${alignStyle}" dir="rtl"><a href="${href}" class="tiptap-link" target="_blank">${content || href}</a></p>`;

    default:
      return `<p style="${alignStyle}" dir="rtl">${content || '<br>'}</p>`;
  }
}

/**
 * تحويل محتوى Yoopta كامل إلى HTML
 */
export function yooptaToHTML(yooptaContent: YooptaContent | string): string {
  let content: YooptaContent;

  // إذا كان string، حاول parse
  if (typeof yooptaContent === 'string') {
    try {
      content = JSON.parse(yooptaContent);
    } catch {
      // إذا فشل، أرجع النص كما هو في paragraph
      return `<p dir="rtl" style="text-align: right">${yooptaContent}</p>`;
    }
  } else {
    content = yooptaContent;
  }

  // ترتيب blocks حسب order
  const blocks = Object.values(content).sort((a, b) => {
    const orderA = a.meta?.order ?? 0;
    const orderB = b.meta?.order ?? 0;
    return orderA - orderB;
  });

  // تحويل كل block
  const htmlParts = blocks.map(block => blockToHTML(block));

  return htmlParts.join('\n');
}

/**
 * تحويل المحتوى بشكل ذكي - يكتشف النوع ويحول إذا لزم الأمر
 */
export function convertToHTML(content: string | any): string {
  if (!content) return '';

  const contentType = detectContentType(content);

  switch (contentType) {
    case 'html':
      // المحتوى HTML بالفعل
      return typeof content === 'string' ? content : '';

    case 'yoopta':
      // تحويل من Yoopta
      return yooptaToHTML(content);

    case 'plain':
      // نص عادي - لفه في paragraph
      return `<p dir="rtl" style="text-align: right">${content}</p>`;

    default:
      return typeof content === 'string' ? content : '';
  }
}

/**
 * تحويل HTML إلى نص عادي (للبحث والعرض المختصر)
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';

  // إزالة tags
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * استخراج النص من محتوى Yoopta
 */
export function yooptaToPlainText(content: YooptaContent | string): string {
  // أولاً حول إلى HTML
  const html = yooptaToHTML(content);
  // ثم استخرج النص
  return htmlToPlainText(html);
}

/**
 * دالة مساعدة لاستخراج النص من أي نوع محتوى
 */
export function extractPlainText(content: string | any): string {
  if (!content) return '';

  const contentType = detectContentType(content);

  switch (contentType) {
    case 'html':
      return htmlToPlainText(content);

    case 'yoopta':
      return yooptaToPlainText(content);

    case 'plain':
      return content;

    default:
      return typeof content === 'string' ? content : '';
  }
}

export default {
  detectContentType,
  convertToHTML,
  yooptaToHTML,
  htmlToPlainText,
  yooptaToPlainText,
  extractPlainText,
};
