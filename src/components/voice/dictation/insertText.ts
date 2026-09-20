/**
 * وضع النص المُملى في الحقل عند موضع المؤشر — كأن المستخدم كتبه بيده:
 * الحقول المحكومة في React تلتقط التغيير، ومحرر TipTap يستقبله فقرات، وCtrl+Z يتراجع عنه.
 */

export type SavedCaret =
  | { kind: 'field'; start: number; end: number }
  | { kind: 'range'; range: Range }
  | null;

type TextField = HTMLInputElement | HTMLTextAreaElement;

const isTextField = (el: HTMLElement): el is TextField =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;

/** يحفظ موضع المؤشر — يُستدعى عند بدء التسجيل وعند خروج التركيز من الحقل */
export function saveCaret(el: HTMLElement): SavedCaret {
  if (isTextField(el)) {
    const end = el.value.length;
    return { kind: 'field', start: el.selectionStart ?? end, end: el.selectionEnd ?? end };
  }

  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
    return { kind: 'range', range: selection.getRangeAt(0).cloneRange() };
  }
  return null;
}

/** النص قبل المؤشر — يُرسل ذيله للخادم استئناساً بالأسماء والأسلوب */
export function textBeforeCaret(el: HTMLElement, caret: SavedCaret): string {
  if (isTextField(el)) {
    const start = caret?.kind === 'field' ? caret.start : el.value.length;
    return el.value.slice(0, start);
  }

  if (caret?.kind === 'range') {
    try {
      const before = document.createRange();
      before.selectNodeContents(el);
      before.setEnd(caret.range.startContainer, caret.range.startOffset);
      return before.toString();
    } catch {
      /* نطاق لم يعد صالحاً (تغيّر المحتوى) — نسقط إلى النص كله */
    }
  }
  return el.innerText || '';
}

/** مسافة فاصلة إن كان ما قبل المؤشر حرفاً ملتصقاً — وإلا التصق المُملى بآخر كلمة */
function withLeadingSpace(text: string, before: string): string {
  if (before === '' || /[\s\n(«"'\[]$/.test(before)) return text;
  return ` ${text}`;
}

function insertIntoField(el: TextField, text: string, caret: SavedCaret): boolean {
  // preventScroll: التركيز الافتراضي يمرّر كل الحاويات الأم — ومنها قشرة التطبيق — ليُظهر الحقل
  el.focus({ preventScroll: true });
  if (caret?.kind === 'field') {
    try {
      el.setSelectionRange(caret.start, caret.end);
    } catch {
      /* نوع input لا يدعم التحديد */
    }
  }

  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const chunk = withLeadingSpace(text, el.value.slice(0, start));
  const valueBefore = el.value;

  // insertText يطلق حدث input حقيقياً (React يلتقطه) ويُبقي سجل التراجع
  let done = false;
  try {
    done = document.execCommand('insertText', false, chunk) && el.value !== valueBefore;
  } catch {
    done = false;
  }
  if (done) return true;

  // احتياط: الكتابة عبر setter الأصلي — React يتتبّع القيمة عبره فلا يتجاهل الحدث
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  const next = valueBefore.slice(0, start) + chunk + valueBefore.slice(end);
  if (setter) setter.call(el, next);
  else el.value = next;
  el.dispatchEvent(new Event('input', { bubbles: true }));

  const caretPos = start + chunk.length;
  try {
    el.setSelectionRange(caretPos, caretPos);
  } catch {
    /* تجاهل */
  }
  return true;
}

function insertIntoEditable(el: HTMLElement, text: string, caret: SavedCaret): boolean {
  // preventScroll: التركيز الافتراضي يمرّر كل الحاويات الأم — ومنها قشرة التطبيق — ليُظهر الحقل
  el.focus({ preventScroll: true });

  const selection = window.getSelection();
  if (caret?.kind === 'range' && selection) {
    try {
      selection.removeAllRanges();
      selection.addRange(caret.range);
    } catch {
      /* نطاق لم يعد صالحاً — يُدرج عند موضع التركيز الحالي */
    }
  }

  const chunk = withLeadingSpace(text, textBeforeCaret(el, saveCaret(el)));

  // ① لصق اصطناعي: ProseMirror/TipTap يعالجه بنفسه فيحوّل الأسطر فقرات ويحفظ التراجع
  try {
    const data = new DataTransfer();
    data.setData('text/plain', chunk);
    const paste = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
    el.dispatchEvent(paste);
    if (paste.defaultPrevented) return true;
  } catch {
    /* متصفح لا يبني ClipboardEvent ببيانات */
  }

  // ② contenteditable عادي
  try {
    if (document.execCommand('insertText', false, chunk)) return true;
  } catch {
    /* تجاهل */
  }

  // ③ إدراج عقدة نصية مباشرة
  const current = window.getSelection();
  if (current && current.rangeCount > 0 && el.contains(current.anchorNode)) {
    const range = current.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(chunk);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: chunk }));
    return true;
  }

  return false;
}

/** يعيد false إن اختفى الحقل (أُغلق المودال أثناء المعالجة) — ليعرض الودجت النص للنسخ بدل ضياعه */
export function insertDictatedText(el: HTMLElement, text: string, caret: SavedCaret): boolean {
  if (!el.isConnected) return false;
  return isTextField(el) ? insertIntoField(el, text, caret) : insertIntoEditable(el, text, caret);
}
