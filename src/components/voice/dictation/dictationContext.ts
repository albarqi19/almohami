/**
 * «الإملاء الذكي» — أيّ حقل يُملى فيه، وبأي نمط صياغة.
 *
 * النمط يُستنتج بالترتيب: وسم صريح `data-dictate` ⟵ اختيار سابق للمستخدم على الحقل نفسه
 * ⟵ تلميحات الحقل (اسمه/عنوانه/النص الإرشادي) ⟵ الحاوية (دردشة الفريق) ⟵ الصفحة ⟵ «نص عام».
 * المفاتيح تطابق `DictationService::PROFILES` في الخادم، ومفتاح مجهول هناك يسقط إلى general.
 */

export type DictationProfile =
  | 'general'
  | 'legal_memo'
  | 'whatsapp'
  | 'formal_letter'
  | 'email'
  | 'task'
  | 'note'
  | 'session_report'
  | 'contract'
  | 'chat'
  | 'verbatim';

export const PROFILE_LABELS: Record<DictationProfile, string> = {
  general: 'نص عام',
  legal_memo: 'مذكرة قانونية',
  whatsapp: 'رسالة واتساب',
  formal_letter: 'خطاب رسمي',
  email: 'بريد إلكتروني',
  task: 'وصف مهمة',
  note: 'ملاحظة',
  session_report: 'تقرير جلسة',
  contract: 'بند عقد',
  chat: 'دردشة الفريق',
  verbatim: 'حرفي كما قلته',
};

export const PROFILE_ORDER: DictationProfile[] = [
  'general',
  'legal_memo',
  'whatsapp',
  'formal_letter',
  'email',
  'session_report',
  'contract',
  'task',
  'note',
  'chat',
  'verbatim',
];

const isProfile = (value: string | null | undefined): value is DictationProfile =>
  !!value && value in PROFILE_LABELS;

/** أنواع input التي يُكتب فيها كلام — البقية (password/email/number/tel/date…) لا إملاء فيها */
const TEXT_INPUT_TYPES = new Set(['', 'text', 'search']);

// اللاتيني بحدود كلمة (وإلا طابق date داخل update)، والعربي بلا حدود لأن اللواصق تلتصق بالكلمة
const IDENTIFIER_INPUT = new RegExp(
  '(?:^|[^a-z])(?:email|e-mail|phone|mobile|national|iban|number|code|pin|password|url|date|amount|price)(?:[^a-z]|$)' +
    '|بريد|جوال|هاتف|هوي[ةه]|إقامة|آيبان|ايبان|رقم|رمز|رابط|تاريخ|مبلغ|سعر',
);

/**
 * الحقل القابل للإملاء انطلاقاً من عنصر التركيز، أو null.
 * نستبعد كل ما ليس كلاماً: كلمات المرور والرموز والأرقام والقوائم المنسدلة القابلة للبحث.
 */
export function resolveDictationTarget(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof HTMLElement)) return null;
  if (node.closest('[data-dictate="off"], .smart-dictation')) return null;

  if (node instanceof HTMLTextAreaElement) {
    return node.readOnly || node.disabled ? null : node;
  }

  if (node instanceof HTMLInputElement) {
    if (!TEXT_INPUT_TYPES.has((node.getAttribute('type') || '').toLowerCase())) return null;
    if (node.readOnly || node.disabled) return null;
    // رموز قصيرة (PIN/OTP/أرقام مرجعية) وحقول رقمية مقنّعة بنوع text
    if (node.maxLength > 0 && node.maxLength <= 12) return null;
    if (/numeric|decimal|tel|email|url/.test(node.inputMode || '')) return null;
    if (/one-time-code|password|cc-|tel|email|username/.test(node.autocomplete || '')) return null;
    // منتقيات البحث (react-select وأمثالها): الكتابة فيها تصفية خيارات لا نص
    if (node.getAttribute('role') === 'combobox' || node.hasAttribute('aria-autocomplete')) return null;
    // حقول معرّفات تُكتب بنوع text (بريد، جوال، هوية، آيبان، رقم…) — تُنقل لا تُملى
    if (IDENTIFIER_INPUT.test(fieldHints(node))) return null;
    return node;
  }

  if (node.isContentEditable) {
    // جذر التحرير لا العقدة الداخلية — محرر TipTap جذره ‎.ProseMirror
    const root = node.closest<HTMLElement>('.ProseMirror, [contenteditable="true"], [contenteditable=""]');
    return root ?? node;
  }

  return null;
}

export const isSingleLine = (el: HTMLElement): boolean => el instanceof HTMLInputElement;

/** تلميحات الحقل: اسمه ومعرّفه ونصه الإرشادي وعنوانه المرئي */
function fieldHints(el: HTMLElement): string {
  const parts: Array<string | null | undefined> = [
    el.getAttribute('name'),
    el.id,
    el.getAttribute('placeholder'),
    el.getAttribute('data-placeholder'),
    el.getAttribute('aria-label'),
    el.getAttribute('title'),
  ];

  const labels = (el as HTMLInputElement | HTMLTextAreaElement).labels;
  if (labels) Array.from(labels).forEach((l) => parts.push(l.textContent));

  // عنوان غير مربوط بـ for: أقرب label داخل مجموعة الحقل
  const group = el.closest('.form-group, .form-field, .field, [class*="form-row"], [class*="field-"]');
  parts.push(group?.querySelector('label')?.textContent);

  // phoneNumber ⟵ «phone number» قبل التصغير، كي تعمل حدود الكلمات على أسماء camelCase
  return parts
    .filter(Boolean)
    .join(' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

/** ترتيب القواعد مقصود: الأخصّ أولاً («تقرير الجلسة» قبل «ملاحظة») */
const HINT_RULES: Array<[RegExp, DictationProfile]> = [
  [/واتس|whats\s?app|wa_message|wa-message/, 'whatsapp'],
  [/تقرير الجلسة|ما جرى في الجلسة|ما تم في الجلسة|session[_-]?report|session[_-]?summary/, 'session_report'],
  [/مذكر[ةه]|لائحة|الدفوع|memo|pleading/, 'legal_memo'],
  [/بريد|email|e-mail|mail[_-]?body/, 'email'],
  [/خطاب|نص الصادر|letter|correspondence/, 'formal_letter'],
  [/بند|clause|نص العقد|contract[_-]?(body|text)/, 'contract'],
  // «ملاحظات المهمة» و«تعليق على المهمة» ملاحظة لا وصف مهمة — فالملاحظة قبل المهمة
  [/ملاحظ|تعليق|note|comment|remark/, 'note'],
  [/مهم[ةه]|task|subtask/, 'task'],
];

/** الصفحة ⟵ نمط افتراضي. المسارات الأطول أولاً */
const ROUTE_RULES: Array<[RegExp, DictationProfile]> = [
  [/^\/(draft-room|memos)(\/|$)/, 'legal_memo'],
  [/^\/correspondence(\/|$)/, 'formal_letter'],
  [/^\/(contracts|contract-templates|finance\/contracts|settings\/contract-templates)(\/|$)/, 'contract'],
  [/^\/whatsapp-settings(\/|$)/, 'whatsapp'],
  [/^\/sessions(\/|$)/, 'session_report'],
  [/^\/tasks(\/|$)/, 'task'],
  [/^\/(notebook|activities|cases|clients|execution-requests|legal-services)(\/|$)/, 'note'],
];

/** النمط التلقائي للحقل في صفحته */
export function detectProfile(el: HTMLElement, pathname: string): DictationProfile {
  const explicit = el.closest<HTMLElement>('[data-dictate]')?.dataset.dictate;
  if (isProfile(explicit)) return explicit;

  const hints = fieldHints(el);
  for (const [pattern, profile] of HINT_RULES) {
    if (pattern.test(hints)) return profile;
  }

  if (el.closest('.team-chat-panel')) return 'chat';

  for (const [pattern, profile] of ROUTE_RULES) {
    if (pattern.test(pathname)) return profile;
  }

  return 'general';
}

// ─── اختيار المستخدم يُحفظ على «الحقل في صفحته» — يصحّح الاستنتاج مرة فيثبت ───

const OVERRIDES_KEY = 'smart_dictation_profile_overrides';

/** بصمة ثابتة عبر الزيارات: مسار بلا معرّفات + اسم الحقل أو نصه الإرشادي */
function fieldSignature(el: HTMLElement, pathname: string): string {
  const route = pathname.replace(/\/\d+(?=\/|$)/g, '/:id');
  const field =
    el.getAttribute('name') ||
    el.id ||
    el.getAttribute('placeholder') ||
    el.getAttribute('aria-label') ||
    (el.isContentEditable ? 'rich-editor' : el.tagName.toLowerCase());
  return `${route}::${field}`;
}

function readOverrides(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function getProfileOverride(el: HTMLElement, pathname: string): DictationProfile | null {
  const stored = readOverrides()[fieldSignature(el, pathname)];
  return isProfile(stored) ? stored : null;
}

/** null = العودة إلى التلقائي */
export function setProfileOverride(el: HTMLElement, pathname: string, profile: DictationProfile | null): void {
  try {
    const overrides = readOverrides();
    const key = fieldSignature(el, pathname);
    if (profile) overrides[key] = profile;
    else delete overrides[key];
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    /* تخزين محجوب — الاختيار يبقى للحقل الحالي فقط */
  }
}
