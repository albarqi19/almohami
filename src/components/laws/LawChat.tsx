import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BookMarked, Check, ChevronDown, Copy, Loader2, MessageSquarePlus,
  Quote, RefreshCw, Scale, Send, Square, Trash2, TriangleAlert, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  useDeleteLawConversation, useLawConversation, useLawConversations,
  useLawCorpusSize,
} from '../../hooks/useLaws';
import { useLawChatStream } from '../../hooks/useLawChatStream';
import type { CitedArticle, LawChatMessage } from '../../services/lawsService';

interface Props {
  onOpenArticle: (serial: string, articleId: number | null) => void;
}

const SUGGESTIONS = [
  'متى يجوز إبطال حكم التحكيم؟',
  'ما مدة رفع دعوى بطلان حكم التحكيم؟',
  'ما شروط صحة عقد الإيجار التمويلي؟',
  'متى تسقط دعوى المطالبة بحقوق العامل؟',
];

/** عبارات المؤشّر الحركي أثناء توليد الإجابة */
const THINKING_STEPS = [
  'أبحث في فهرس الأنظمة...',
  'أقرأ المواد ذات الصلة...',
  'أرتّب الأدلة النظامية...',
  'أصوغ الإجابة المُسنَدة...',
];

/** تهريبُ HTML — يسبق كلَّ شيء، فلا يصل وسمٌ من النموذج إلى الصفحة */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** تنسيقٌ داخل السطر: **عريض** */
function inline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** خلايا صفٍّ — مع إسقاط الفراغين الطرفيين الناتجين عن `|` أوّلاً وآخراً */
function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');

  return t.split('|').map((c) => c.trim());
}

/**
 * هل هذا سطرُ فاصلِ جدول؟ «| --- | ---: | :---: |»
 *
 * وهو العلامةُ الوحيدةُ التي تميّز جدولاً عن سطرٍ فيه شُرَطٌ عمودية.
 */
function isTableDivider(line: string): boolean {
  const cells = splitRow(line);

  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

/**
 * تحويلُ جداول Markdown إلى `<table>` حقيقيّ.
 *
 * 🔴 عيبٌ مرئيٌّ رصده تدقيقٌ خارجيٌّ وسمّاه «الأولوية 1»: بعد أن صار النموذجُ
 *    يستجيب لطلب الجدول ويُنتجه بصيغةٍ سليمة، كان المُعرِضُ يعرضه **أنابيبَ
 *    خاماً** على الشاشة:
 *
 *        | وجه المقارنة | المادة السابعة والسبعون | المادة الثامنون |
 *        | ---: | ---: | ---: |
 *
 *    وحكمُ المدقّق دقيق: **«أسوأ من عدم إنتاج جدول أصلاً لأنه يبدو عطلاً»** —
 *    فالعجزُ الصامت يُقرأ نقصاً في القدرة، وهذا يُقرأ كسراً في المنتج. وأسئلةُ
 *    المقارنة من أكثر ما يسأله المحامي.
 *
 * 🔑 ولم تُضَف مكتبةُ markdown كاملة: المطلوبُ جداولُ GFM وحدَها، والتهريبُ يقع
 *    **قبل** التحويل فيبقى الأمانُ كما هو، ولا تكبر الحزمةُ بمئة كيلوبايت
 *    لأجل ميزةٍ واحدة.
 */
function renderTable(rows: string[]): string {
  const head = splitRow(rows[0]);
  const aligns = splitRow(rows[1]).map((c) => {
    const t = c.trim();
    if (t.startsWith(':') && t.endsWith(':')) return 'center';

    // 🔑 «اليسار» في Markdown هو **بداية** السطر — وفي RTL بدايتُه يمين
    return t.endsWith(':') && !t.startsWith(':') ? 'end' : 'start';
  });

  const cell = (c: string, i: number, tag: 'th' | 'td') =>
    `<${tag} style="text-align:${aligns[i] ?? 'start'}">${inline(c)}</${tag}>`;

  const body = rows.slice(2)
    .map((r) => `<tr>${splitRow(r).map((c, i) => cell(c, i, 'td')).join('')}</tr>`)
    .join('');

  return '<div class="law-md-tablewrap"><table class="law-md-table">'
    + `<thead><tr>${head.map((c, i) => cell(c, i, 'th')).join('')}</tr></thead>`
    + `<tbody>${body}</tbody></table></div>`;
}

/** تنسيق نص الإجابة: تهريبٌ ثمّ جداولُ GFM ثمّ **عريض** وأسطر */
function renderAnswer(text: string): string {
  const lines = escapeHtml(text).split('\n');
  const out: string[] = [];
  let buffer: string[] = [];

  const flushText = () => {
    if (buffer.length) {
      out.push(inline(buffer.join('\n')).replace(/\n/g, '<br/>'));
      buffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const startsTable = lines[i].includes('|')
      && i + 1 < lines.length
      && isTableDivider(lines[i + 1]);

    if (!startsTable) {
      buffer.push(lines[i]);
      continue;
    }

    // جدولٌ يبدأ هنا — يُلتقط حتى أوّل سطرٍ لا يحمل `|`
    flushText();
    const rows = [lines[i], lines[i + 1]];
    let j = i + 2;
    while (j < lines.length && lines[j].includes('|') && lines[j].trim() !== '') {
      rows.push(lines[j]);
      j++;
    }
    out.push(renderTable(rows));
    i = j - 1;
  }

  flushText();

  return out.join('');
}

/**
 * ردٌّ لا يدّعي سنداً نظامياً (تحيّة · شكر · تعريفٌ بالقدرات).
 *
 * 🩸 تحذيرُ «بلا استشهاد مباشر — راجع النص الرسمي» كان يُلحَق بكل ردٍّ بلا
 * استشهادات، فيظهر تحت «العفو» و«أنا مساعدك في الأنظمة…».
 * وكذلك تحت «أعتذر، هذا خارج اختصاصي» — فيقول للمحامي «راجع النص الرسمي»
 * عن لا شيء (صيد المختبر P2-2 د). أمّا القصيرُ الجازم بلا سند فالوسمُ في محلّه.
 */
const REFUSAL_HEAD = /^\s*[«"']?\s*(أعتذر|اعتذر|عذراً|عذرا|آسف|أنا مساعد|أهلاً|أهلا|هلا|حياك|حيّاك|شكراً|شكرا)/;
const REFUSAL_BODY = /(لا أستطيع|خارج نطاق|ليس من اختصاص|خارج اختصاص|اختصاصي في الأنظمة)/;

function isConversational(text: string): boolean {
  const t = text.trim();
  return t.startsWith('العفو')
    || t.startsWith('أنا مساعدك')
    || t.startsWith('مرحباً')
    || REFUSAL_HEAD.test(t)
    || REFUSAL_BODY.test(t.slice(0, 160))
    || t.length < 60;
}

/** نسخٌ إلى الحافظة مع تأكيدٍ قصير */
function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1600); },
      () => { /* حافظةٌ محجوبة — لا رسالةَ خطأٍ على فعلٍ ثانويّ */ },
    );
  };
  return [copied, copy];
}

/**
 * متنُ الإجابة — محفوظُ النتيجة.
 *
 * 🔴 كان `renderAnswer(m.content)` يُنادى **داخل `.map()` مباشرةً**، و`displayed`
 *    يُبنى من جديد مع كلِّ رمزٍ يصل. فكلُّ حدثِ بثٍّ كان يُعيد تحويلَ Markdown
 *    لكامل الإجابة **ولكلِّ رسالةٍ سابقةٍ في المحادثة**، ثمّ يستبدل `innerHTML`
 *    للكتلة كلّها — فيسقط تحديدُ النصّ ويقفز التمرير.
 *
 * 🔑 وهذا هو الشرطُ العمليُّ لتنعيم البثّ: تقطيعُ الدفقة إلى أجزاءٍ أصغر يضاعف
 *    عددَ الأحداث، فبلا حفظِ النتيجة نستبدل «القفزات» بتلعثمٍ في الرسم. والحفظُ
 *    على `content` وحدَه — فرسالةٌ لم يتغيّر نصُّها لا تُحوَّل مرّةً ثانية.
 */
const AnswerBody = React.memo<{ content: string }>(({ content }) => {
  const html = useMemo(() => renderAnswer(content), [content]);

  return <div className="law-msg__content" dangerouslySetInnerHTML={{ __html: html }} />;
});
AnswerBody.displayName = 'AnswerBody';

/**
 * بطاقة مادة مُستشهَد بها — قابلة للفتح.
 *
 * 🔴 والحاشيةُ تُعرض هنا لأنّ **النافذَ فيها لا في المتن**: عُرفُ هيئة الخبراء أن
 * يبقى المتنُ نصَّ المرسوم الأصليّ وتُثبَت التعديلاتُ في حاشية. فالمادة 53 من
 * نظام العمل تقول في متنها «تسعين يوماً» وفي حاشيتها «(مائة وثمانين) يوماً»
 * بالمرسوم م/44 لعام 1446هـ — ومحامٍ يقرأ المتنَ وحدَه يُفتي بمنسوخ.
 */
const CitedCard: React.FC<{ cited: CitedArticle; onOpen: Props['onOpenArticle'] }> = ({ cited, onOpen }) => {
  const [copied, copy] = useCopy();

  const status = (cited.legal_status || '').trim();
  const repealed = status.includes('ملغا') || status.includes('منسوخ');

  /*
   * 🩸 شارةُ «معدَّلة» كانت مبنيّةً على **وجود الحاشية** لا على حالة المادة.
   *    وقياسٌ على القاعدة: من 1,424 مادّةً حالتُها «معدلة» هناك **707 بلا
   *    حاشيةٍ إطلاقاً** — فتخرج بطاقاتُها عاريةً من أيّ وسم، ويقرؤها المحامي
   *    أصليّةً وهي منسوخةُ المتن. فالحالةُ تُقرأ من مصدرها.
   */
  const amendedStatus = status.includes('معدل') || status.includes('معدّل');

  // 🩸 حالةُ النظام نفسِه كانت تصل من الخادم ولا تُعرض في أي مكان:
  //    استشهادٌ من نظامٍ «لاغي» يظهر بلا تنبيهٍ إطلاقاً.
  const statuteStatus = (cited.statute_status || '').trim();
  const statuteRepealed = statuteStatus.includes('لاغ') || statuteStatus.includes('ملغ');

  /*
   * 🔴 وحالةٌ ثالثةٌ كانت تسقط صامتة: نظامٌ لا هو «ساري» ولا «لاغي» — سبعةُ
   *    أنظمةٍ «جاري العمل عليها» وواحدٌ «ساري بعد مدة 180 يوم من تاريخ النشر»
   *    وهو **نظام التنفيذ**، أكثرُ الأنظمة طَرْقاً. تُعرض حالتُها كما هي.
   */
  const statuteOdd = !statuteRepealed && statuteStatus !== '' && statuteStatus !== 'ساري';

  /*
   * 🔴 البطاقةُ كانت تعرض «نصُّ التعديل — وهو النافذ» ثمّ **أقدمَ** التعديلات
   *    أوّلاً، والفاصلُ `||` ظاهرٌ حرفياً. فيقرأ المحامي في الجواب «مائة
   *    وثمانون يوماً» ثمّ يفتح البطاقة ليتحقّق فيجد «تسعين» — والبطاقةُ هي
   *    موضعُ التحقّق، فتناقضُها للجواب أسوأُ من غيابها.
   *
   * 🔑 والخادمُ يُرسل التعديلاتِ مفصولةً محسوبةَ الحال. وحارسُ التراجع يقسّم
   *    بنفسه إن جاءت من خادمٍ أقدم — فلا يُطبع الخامُّ أبداً.
   */
  const amendments = cited.amendments?.length
    ? cited.amendments
    : (cited.amendment_note || '')
      .split('||')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text, i, arr) => ({ text, state: null, on: null, latest: i === arr.length - 1 }));

  const amended = amendments.length > 0;

  // الأحدثُ أوّلاً، وما قبله تاريخٌ يُطوى
  const current = amendments.find((a) => a.latest) ?? amendments[amendments.length - 1];
  const earlier = amendments.filter((a) => a !== current);

  /*
   * 🩸 وكانت مطويّةً دائماً — حتى لمادّةٍ متنُها منسوخ. فالمحامي المستعجل يقرأ
   *    اسمَ المادة ويمضي، والنافذُ خلف نقرةٍ لا يعلم أنّها هناك.
   */
  const [open, setOpen] = useState(repealed || amended);

  /** الاستشهادُ بصيغةٍ تُلصَق في مذكّرة مباشرةً */
  const citationText = `${cited.article_number || ''} من ${cited.statute_name}`.trim();

  return (
    <div className={`law-cited ${open ? 'law-cited--open' : ''}`}>
      <button className="law-cited__head" onClick={() => setOpen((v) => !v)}>
        <BookMarked size={14} />
        <span className="law-cited__statute">{cited.statute_name}</span>
        {cited.article_number && <span className="law-cited__number">{cited.article_number}</span>}
        {repealed && <span className="law-cited__flag law-cited__flag--danger">ملغاة</span>}
        {!repealed && statuteRepealed && <span className="law-cited__flag law-cited__flag--danger">نظام ملغى</span>}
        {!repealed && statuteOdd && <span className="law-cited__flag law-cited__flag--warn">{statuteStatus}</span>}
        {!repealed && !statuteRepealed && (amended || amendedStatus) && (
          <span className="law-cited__flag law-cited__flag--warn">معدَّلة</span>
        )}
        <ChevronDown size={14} className="law-cited__chev" />
      </button>
      {open && (
        <div className="law-cited__body">
          {cited.chapter && <div className="law-cited__chapter">{cited.chapter}</div>}
          {amended && (
            <div className="law-cited__amend">
              <div className="law-cited__amend-label">
                <TriangleAlert size={12} />
                {current.state === 'نافذ' && current.on
                  ? `النصُّ النافذ — منذ ${current.on}`
                  : current.state && current.on
                    ? `${current.state} — ${current.on}`
                    : 'نصُّ التعديل — وهو الأحدث'}
              </div>
              <p>{current.text}</p>
            </div>
          )}
          {earlier.length > 0 && (
            <details className="law-cited__earlier">
              <summary>{`تعديلاتٌ سابقة (${earlier.length})`}</summary>
              {earlier.map((a, i) => (
                <p key={i}>{a.text}</p>
              ))}
            </details>
          )}
          <div className="law-cited__amend-label law-cited__amend-label--plain">المتنُ الأصليّ</div>
          <p>{cited.text}</p>
          <div className="law-cited__actions">
            <button
              className="laws-link-btn laws-link-btn--primary"
              onClick={() => onOpen(cited.statute_serial, cited.article_id)}
            >
              فتح في النظام
              <ArrowLeft size={13} />
            </button>
            <button className="laws-link-btn" onClick={() => copy(citationText)} title="نسخ الاستشهاد بصيغة مذكّرة">
              {copied ? <Check size={13} /> : <Quote size={13} />}
              {copied ? 'نُسخ' : 'نسخ الاستشهاد'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * مؤشّر «يفكّر».
 *
 * 🩸 وكان مبنيّاً على **مؤقّتٍ لا على أحداثٍ من الخادم**: يعرض «أبحث في فهرس
 * الأنظمة…» ثم «أقرأ المواد…» بالتناوب كلَّ 2.2 ثانية سواءٌ جرى ذلك أم لا —
 * زخرفةٌ تدّعي معرفةً بما يحدث. الآن يقرأ مرحلةً حقيقيةً من البثّ بأسماء الأنظمة
 * التي تُفحص فعلاً، ولا يعود إلى العبارات المتناوبة إلا قبل وصول أوّل حدث.
 */
const ThinkingIndicator: React.FC<{ stage?: { label: string; detail: string | null } | null }> = ({ stage }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (stage) return;
    const t = setInterval(() => setStep((s) => (s + 1) % THINKING_STEPS.length), 2200);
    return () => clearInterval(t);
  }, [stage]);
  return (
    <motion.div
      className="law-msg law-msg--assistant"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <div className="law-msg__avatar law-msg__avatar--thinking"><Scale size={15} /></div>
      <div className="law-msg__bubble law-thinking">
        <AnimatePresence mode="wait">
          <motion.span
            key={stage ? stage.label : step}
            className="law-thinking__text"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            {stage ? stage.label : THINKING_STEPS[step]}
            {stage?.detail && <em className="law-thinking__detail">{stage.detail}</em>}
          </motion.span>
        </AnimatePresence>
        <span className="law-thinking__dots">
          <i /><i /><i />
        </span>
      </div>
    </motion.div>
  );
};

const LawChat: React.FC<Props> = ({ onOpenArticle }) => {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  /**
   * إجبارُ التمرير مرّةً واحدة — يُستهلك في أوّل تمريرٍ بعده.
   *
   * 🔴 تأكيدٌ خامسٌ من التدقيق: «أرسلت سؤالاً والصفحة في الأعلى؛ بقيت في
   *    الأعلى طوال البثّ حتى اكتماله». والسببُ أنّ الحارسَ `nearBottom`
   *    يحكم لحظةَ الإرسال أيضاً — وهو صوابٌ أثناء البثّ (فلا تُخطَف الشاشةُ
   *    من قارئٍ صعد يراجع مادّة) وخطأٌ عند الإرسال: الإرسالُ فعلٌ متعمَّد،
   *    والمحامي يريد أن يرى سؤالَه وجوابَه لا أن يبحث عنهما.
   */
  const forceScrollRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [], isLoading: convsLoading } = useLawConversations();
  const { data: conversation, isFetching: convFetching } = useLawConversation(conversationId);
  const chat = useLawChatStream();
  const remove = useDeleteLawConversation();
  const corpus = useLawCorpusSize();
  const qc = useQueryClient();
  const [copiedId, setCopiedId] = useState<number | null>(null);

  /**
   * الرسائل المعروضة = رسائل الخادم + التوفيق مع الإرسال الجاري:
   * أثناء الانتظار نعرض السؤال محلياً، وبعد النجاح نعرض السؤال+الرد محلياً
   * إلى أن يصل تحديث الخادم (يمنع أي وميض/اختفاء).
   */
  /*
   * 🩸 صيدُ المراجعة: وسمُ الاسترجاع الضعيف لا يُخزَّن (كـno_match)، فكانت اللافتةُ
   *    تومض ثم تختفي حين تحلّ نسخةُ الخادم محلّ الرسالة المحلية. المعرّفاتُ الموسومة
   *    تُحفظ للجلسة فتبقى اللافتة ما بقيت الصفحة.
   */
  const weakIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const msg = chat.answer?.message;
    if (msg?.weak_retrieval && msg.id > 0) weakIdsRef.current.add(msg.id);
  }, [chat.answer]);

  const displayed = useMemo(() => {
    const server: LawChatMessage[] = conversation?.messages ?? [];
    const items = server.map((m) => (weakIdsRef.current.has(m.id) ? { ...m, weak_retrieval: true } : m));

    // الدورُ الجاري يُعرض محلياً حتى يصل تحديثُ الخادم — فلا وميضَ ولا اختفاء
    const live = chat.status !== 'idle';
    const onServer = chat.answer && server.some((m) => m.id === chat.answer!.message.id);

    if (live && !onServer) {
      items.push({ id: -1, role: 'user', content: chat.question, cited_articles: null, created_at: '' });
      if (chat.text || chat.status === 'done') {
        items.push({
          id: chat.answer?.message.id ?? -2,
          role: 'assistant',
          content: chat.text,
          cited_articles: chat.answer?.message.cited_articles ?? null,
          weak_retrieval: chat.answer?.message.weak_retrieval ?? false,
          created_at: chat.answer?.message.created_at ?? '',
        });
      }
    }
    return items;
  }, [conversation, chat.status, chat.question, chat.text, chat.answer]);

  /**
   * التمرير أثناء البثّ.
   *
   * 🩸 والقيدُ ضروريّ: التمريرُ القسريُّ مع كلّ حرفٍ يخطف الشاشةَ من قارئٍ صعد
   * ليراجع مادّةً أعلى. فلا يُمرَّر إلا إن كان المستخدمُ عند القاع أصلاً.
   */
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (forceScrollRef.current || nearBottom || displayed.length <= 2) {
      forceScrollRef.current = false;
      el.scrollTo({ top: el.scrollHeight, behavior: chat.isStreaming ? 'auto' : 'smooth' });
    }
  }, [displayed.length, chat.text, chat.isStreaming, chat.question]);

  const submit = (text?: string) => {
    const question = (text ?? input).trim();
    if (question.length < 3 || chat.isStreaming) return;
    forceScrollRef.current = true;
    setInput('');
    chat.send(question, conversationId, (answer) => {
      setConversationId(answer.conversation_id);
      // قائمةُ المحادثات تتغيّر بأوّل سؤالٍ في محادثةٍ جديدة
      qc.invalidateQueries({ queryKey: ['laws', 'chats'] });
      qc.invalidateQueries({ queryKey: ['laws', 'chat', answer.conversation_id] });
    });
  };

  /**
   * إعادةُ توليدِ آخر جواب.
   *
   * 🩸 صيدُ المدقّق: كانت تُرسل السؤالَ في المحادثة نفسِها، فيُلحَق دورٌ ثانٍ
   * كامل (س، ج١، س، ج٢) — والأدهى أنّ (س، ج١) صارا في تاريخ السياق فيُعاد
   * توليدُ النموذج **مشروطاً بجوابه السابق** فيكرّره. الميزةُ تعِد بـ«إعادة»
   * وتفعل «تكرار». فالإعادةُ تبدأ سياقاً نظيفاً بالسؤال نفسِه.
   */
  const regenerate = () => {
    const q = chat.question || [...displayed].reverse().find((m) => m.role === 'user')?.content;
    if (!q || chat.isStreaming) return;
    setConversationId(null);
    chat.send(q, null, (answer) => {
      setConversationId(answer.conversation_id);
      qc.invalidateQueries({ queryKey: ['laws', 'chats'] });
      qc.invalidateQueries({ queryKey: ['laws', 'chat', answer.conversation_id] });
    });
  };

  const copyMessage = (id: number, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    }, () => { /* حافظةٌ محجوبة */ });
  };

  const startNew = () => {
    if (chat.isStreaming) return;
    setConversationId(null);
    chat.reset();
    inputRef.current?.focus();
  };

  const deleteConversation = (id: number) => {
    remove.mutate(id, {
      onSuccess: () => {
        setConfirmDelete(null);
        if (conversationId === id) startNew();
      },
    });
  };

  const showEmptyHero = !conversationId && displayed.length === 0 && chat.status === 'idle';

  return (
    <div className="law-chat">
      {/* قائمة المحادثات المحفوظة */}
      <aside className="law-chat__sidebar">
        <button className="law-chat__new" onClick={startNew} disabled={chat.isStreaming}>
          <MessageSquarePlus size={16} />
          محادثة جديدة
        </button>
        <div className="law-chat__convs">
          {convsLoading && <div className="laws-loading"><Loader2 className="laws-spin" size={16} /></div>}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`law-chat__conv ${conversationId === c.id ? 'law-chat__conv--active' : ''}`}
            >
              <button
                className="law-chat__conv-title"
                onClick={() => { if (!chat.isStreaming) { setConversationId(c.id); chat.reset(); } }}
                title={c.title}
              >
                {c.title}
              </button>
              {confirmDelete === c.id ? (
                <span className="law-chat__conv-confirm">
                  <button onClick={() => deleteConversation(c.id)} title="تأكيد الحذف" className="law-chat__conv-yes">
                    {remove.isPending ? <Loader2 className="laws-spin" size={13} /> : <Check size={13} />}
                  </button>
                  <button onClick={() => setConfirmDelete(null)} title="إلغاء" className="law-chat__conv-no">
                    <X size={13} />
                  </button>
                </span>
              ) : (
                <button className="law-chat__conv-del" onClick={() => setConfirmDelete(c.id)} title="حذف المحادثة">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
          {!convsLoading && conversations.length === 0 && (
            <div className="laws-empty-min">لا توجد محادثات بعد</div>
          )}
        </div>
      </aside>

      {/* سلسلة الرسائل */}
      <section className="law-chat__main">
        <div className="law-chat__thread" ref={threadRef}>
          {convFetching && displayed.length === 0 && (
            <div className="laws-loading laws-loading--center"><Loader2 className="laws-spin" size={22} /></div>
          )}

          {showEmptyHero && (
            <div className="laws-empty laws-empty--chat">
              <div className="law-chat__hero-icon"><Scale size={30} /></div>
              <h3>اسأل عن الأنظمة السعودية</h3>
              {/* العددُ مشتقٌّ من الفهرس لا مكتوبٌ رقماً — انظر useLawCorpusSize */}
              <p>
                {corpus.statutes
                  ? `إجابات مُسنَدة بالمواد النظامية من ${corpus.statutes} نظاماً ولائحة — وكل محادثة تُحفظ لك`
                  : 'إجابات مُسنَدة بالمواد النظامية — وكل محادثة تُحفظ لك'}
              </p>
              <div className="law-search__chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="law-search__chip" onClick={() => submit(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {displayed.map((m, i) => (
              <motion.div
                key={m.id === -1 ? `local-${i}` : m.id}
                className={`law-msg law-msg--${m.role}`}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
              >
                <div className="law-msg__avatar">
                  {m.role === 'assistant' ? <Scale size={15} /> : null}
                </div>
                <div className="law-msg__bubble">
                  {/*
                    * لافتةُ الاسترجاع الضعيف — توصية المختبر P0-2: «لافتة بارزة لا وسم صغير».
                    * تظهر فوق الجواب بعد اكتماله، حين لم يجد الخادمُ نصّاً يطابق حتى بعد
                    * إعادة الصياغة بمفردات النظام.
                    */}
                  {m.role === 'assistant' && m.weak_retrieval && !(chat.isStreaming && m.id === -2) && (
                    <div className="law-msg__weak" role="alert">
                      <TriangleAlert size={15} />
                      <div>
                        <strong>لم أجد نصّاً نظامياً يطابق سؤالك بدقّة.</strong>
                        ما يلي أقربُ ما وُجد — تحقّق من النص الرسمي قبل الاعتماد.
                      </div>
                    </div>
                  )}
                  {m.role === 'assistant' ? (
                    <AnswerBody content={m.content} />
                  ) : (
                    <div className="law-msg__content">{m.content}</div>
                  )}
                  {m.role === 'assistant' && (m.cited_articles?.length ?? 0) > 0 && (
                    <div className="law-msg__cited">
                      <div className="law-msg__cited-label">المواد المُستشهَد بها</div>
                      {m.cited_articles!.map((c, ci) => (
                        <CitedCard key={ci} cited={c} onOpen={onOpenArticle} />
                      ))}
                    </div>
                  )}
                  {/*
                    * التحذيرُ لا يظهر أثناء البثّ (الاستشهاداتُ تصل في نهايته)،
                    * ولا على ردٍّ لا يدّعي سنداً أصلاً.
                    * 🩸 كان المحامي يقول «شكراً» فيُنبَّه إلى مراجعة الجريدة الرسمية.
                    */}
                  {m.role === 'assistant' && (m.cited_articles?.length ?? 0) === 0
                    && !(chat.isStreaming && m.id === -2)
                    && !isConversational(m.content) && (
                    <div className="law-msg__nomatch">
                      <TriangleAlert size={13} />
                      بلا استشهاد مباشر — راجع النص الرسمي قبل الاعتماد
                    </div>
                  )}

                  {/* أدواتُ الرسالة — بعد اكتمالها فقط */}
                  {m.role === 'assistant' && m.content && !(chat.isStreaming && m.id === -2) && (
                    <div className="law-msg__tools">
                      <button onClick={() => copyMessage(m.id, m.content)} title="نسخ الإجابة">
                        {copiedId === m.id ? <Check size={13} /> : <Copy size={13} />}
                        {copiedId === m.id ? 'نُسخ' : 'نسخ'}
                      </button>
                      {i === displayed.length - 1 && (
                        <button onClick={regenerate} disabled={chat.isStreaming} title="إعادة توليد الإجابة">
                          <RefreshCw size={13} />
                          إعادة التوليد
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* مؤشّرُ المراحل — قبل وصول أوّل حرفٍ فقط، وبأسماء الأنظمة الفعلية */}
            {chat.isStreaming && !chat.text && (
              <ThinkingIndicator key="thinking" stage={chat.stage} />
            )}
            {/*
              * مرحلةٌ لاحقة أثناء البثّ (فحصُ اكتمال المدة): سطرٌ خافت تحت الجواب.
              * 🩸 صيدُ المراجعة: كانت تُبثّ ولا تُعرض، فيتجمّد الجواب ثم يتبدّل صامتاً.
              */}
            {chat.isStreaming && chat.text && chat.stage && (
              <div className="law-poststage" key="poststage">
                <em className="law-thinking__text">{chat.stage.label}</em>
              </div>
            )}
          </AnimatePresence>

          {/* اقتراحاتُ المتابعة — مشتقّةٌ من المواد المسترجَعة نفسِها */}
          {chat.status === 'done' && (chat.answer?.message.suggestions?.length ?? 0) > 0 && (
            <div className="law-chat__followups">
              <span className="law-chat__followups-label">تابِع بـ</span>
              {chat.answer!.message.suggestions!.map((sug) => (
                <button key={sug} className="law-search__chip" onClick={() => submit(sug)}>{sug}</button>
              ))}
            </div>
          )}

          {chat.stopped && (
            <div className="law-chat__stopped">
              أوقفتَ العرض — الإجابةُ محفوظةٌ كاملةً في المحادثة.
            </div>
          )}

          {chat.status === 'error' && (
            <div className="laws-error">{chat.error || 'تعذّر إرسال السؤال'}</div>
          )}
        </div>

        {/* صندوق الإدخال */}
        <div className="law-chat__composer">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="اكتب سؤالك عن الأنظمة السعودية... (Enter للإرسال)"
            value={input}
            disabled={chat.isStreaming}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          {chat.isStreaming ? (
            <button className="law-chat__send law-chat__send--stop" onClick={chat.stop} title="إيقاف التوليد">
              <Square size={15} />
            </button>
          ) : (
            <button
              className="law-chat__send"
              onClick={() => submit()}
              disabled={input.trim().length < 3}
              title="إرسال"
            >
              <Send size={17} />
            </button>
          )}
        </div>
        <div className="law-chat__footnote">
          إجابات ذكية مُسنَدة بالمواد — أداة مساعدة لا تُغني عن مراجعة المحامي للنص الرسمي
        </div>
      </section>
    </div>
  );
};

export default LawChat;
