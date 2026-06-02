/**
 * مقارنة نصّية على مستوى الكلمات لإصدارات العقود (redline).
 * تتجاهل وسوم HTML وتقارن النصّ الفعلي، وتُرجع أجزاءً (متطابق/مضاف/محذوف).
 */

export interface DiffPart {
  type: 'eq' | 'add' | 'del';
  text: string;
}

/** استخراج النصّ الصافي من HTML */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // إدراج فواصل أسطر بين العناصر الكتلية للحفاظ على بنية الفقرات
    doc.body.querySelectorAll('p, div, li, br, h1, h2, h3, h4, tr').forEach((el) => {
      el.append('\n');
    });
    return (doc.body.textContent || '').replace(/\n{2,}/g, '\n').trim();
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

/**
 * مقارنة كلمات نصّين عبر أطول سلسلة فرعية مشتركة (LCS).
 */
export function diffWords(oldText: string, newText: string): DiffPart[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const n = a.length;
  const m = b.length;

  // جدول أطوال LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  const push = (type: DiffPart['type'], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('eq', a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('del', a[i]);
      i++;
    } else {
      push('add', b[j]);
      j++;
    }
  }
  while (i < n) push('del', a[i++]);
  while (j < m) push('add', b[j++]);

  return parts;
}

/** إحصاء عدد الكلمات المضافة/المحذوفة (للملخص) */
export function diffSummary(parts: DiffPart[]): { added: number; removed: number } {
  const count = (t: string) => t.split(/\s+/).filter(Boolean).length;
  let added = 0;
  let removed = 0;
  for (const p of parts) {
    if (p.type === 'add') added += count(p.text);
    else if (p.type === 'del') removed += count(p.text);
  }
  return { added, removed };
}
