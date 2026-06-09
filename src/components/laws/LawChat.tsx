import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BookMarked, Check, ChevronDown, Loader2, MessageSquarePlus,
  Scale, Send, Trash2, TriangleAlert, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useDeleteLawConversation, useLawConversation, useLawConversations, useSendLawChat,
} from '../../hooks/useLaws';
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

/** تنسيق نص الإجابة: تهريب HTML ثم **عريض** وأسطر — بلا مكتبة markdown كاملة */
function renderAnswer(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

/** بطاقة مادة مُستشهَد بها — قابلة للفتح */
const CitedCard: React.FC<{ cited: CitedArticle; onOpen: Props['onOpenArticle'] }> = ({ cited, onOpen }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`law-cited ${open ? 'law-cited--open' : ''}`}>
      <button className="law-cited__head" onClick={() => setOpen((v) => !v)}>
        <BookMarked size={14} />
        <span className="law-cited__statute">{cited.statute_name}</span>
        {cited.article_number && <span className="law-cited__number">{cited.article_number}</span>}
        <ChevronDown size={14} className="law-cited__chev" />
      </button>
      {open && (
        <div className="law-cited__body">
          {cited.chapter && <div className="law-cited__chapter">{cited.chapter}</div>}
          <p>{cited.text}</p>
          <button
            className="laws-link-btn laws-link-btn--primary"
            onClick={() => onOpen(cited.statute_serial, cited.article_id)}
          >
            فتح في النظام
            <ArrowLeft size={13} />
          </button>
        </div>
      )}
    </div>
  );
};

/** مؤشّر «يفكّر» — نبض أيقونة + نقاط متحركة + عبارات متبدّلة */
const ThinkingIndicator: React.FC = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % THINKING_STEPS.length), 2200);
    return () => clearInterval(t);
  }, []);
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
            key={step}
            className="law-thinking__text"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            {THINKING_STEPS[step]}
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [], isLoading: convsLoading } = useLawConversations();
  const { data: conversation, isFetching: convFetching } = useLawConversation(conversationId);
  const send = useSendLawChat();
  const remove = useDeleteLawConversation();

  /**
   * الرسائل المعروضة = رسائل الخادم + التوفيق مع الإرسال الجاري:
   * أثناء الانتظار نعرض السؤال محلياً، وبعد النجاح نعرض السؤال+الرد محلياً
   * إلى أن يصل تحديث الخادم (يمنع أي وميض/اختفاء).
   */
  const displayed = useMemo(() => {
    const server: LawChatMessage[] = conversation?.messages ?? [];
    const items = [...server];
    const vars = send.variables as { question: string; conversationId?: number | null } | undefined;

    if (send.isPending && vars) {
      items.push({ id: -1, role: 'user', content: vars.question, cited_articles: null, created_at: '' });
    } else if (send.isSuccess && send.data && vars) {
      const answerOnServer = server.some((m) => m.id === send.data.message.id);
      const belongsHere = send.data.conversation_id === conversationId;
      if (!answerOnServer && belongsHere) {
        items.push({ id: -1, role: 'user', content: vars.question, cited_articles: null, created_at: '' });
        items.push({
          id: send.data.message.id,
          role: 'assistant',
          content: send.data.message.content,
          cited_articles: send.data.message.cited_articles,
          created_at: send.data.message.created_at,
        });
      }
    }
    return items;
  }, [conversation, send.isPending, send.isSuccess, send.data, send.variables, conversationId]);

  // تمرير تلقائي لآخر رسالة
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [displayed.length, send.isPending]);

  const submit = (text?: string) => {
    const question = (text ?? input).trim();
    if (question.length < 3 || send.isPending) return;
    setInput('');
    send.mutate(
      { question, conversationId },
      { onSuccess: (answer) => setConversationId(answer.conversation_id) }
    );
  };

  const startNew = () => {
    if (send.isPending) return;
    setConversationId(null);
    send.reset();
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

  const showEmptyHero = !conversationId && displayed.length === 0 && !send.isPending;

  return (
    <div className="law-chat">
      {/* قائمة المحادثات المحفوظة */}
      <aside className="law-chat__sidebar">
        <button className="law-chat__new" onClick={startNew} disabled={send.isPending}>
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
                onClick={() => { if (!send.isPending) { setConversationId(c.id); send.reset(); } }}
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
              <p>إجابات مُسنَدة بالمواد النظامية من 75 نظاماً ولائحة — وكل محادثة تُحفظ لك</p>
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
                  {m.role === 'assistant' ? (
                    <div
                      className="law-msg__content"
                      dangerouslySetInnerHTML={{ __html: renderAnswer(m.content) }}
                    />
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
                  {m.role === 'assistant' && (m.cited_articles?.length ?? 0) === 0 && (
                    <div className="law-msg__nomatch">
                      <TriangleAlert size={13} />
                      بلا استشهاد مباشر — راجع النص الرسمي قبل الاعتماد
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {send.isPending && <ThinkingIndicator key="thinking" />}
          </AnimatePresence>

          {send.isError && (
            <div className="laws-error">{(send.error as Error)?.message || 'تعذّر إرسال السؤال'}</div>
          )}
        </div>

        {/* صندوق الإدخال */}
        <div className="law-chat__composer">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="اكتب سؤالك عن الأنظمة السعودية... (Enter للإرسال)"
            value={input}
            disabled={send.isPending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            className="law-chat__send"
            onClick={() => submit()}
            disabled={input.trim().length < 3 || send.isPending}
            title="إرسال"
          >
            {send.isPending ? <Loader2 className="laws-spin" size={17} /> : <Send size={17} />}
          </button>
        </div>
        <div className="law-chat__footnote">
          إجابات ذكية مُسنَدة بالمواد — أداة مساعدة لا تُغني عن مراجعة المحامي للنص الرسمي
        </div>
      </section>
    </div>
  );
};

export default LawChat;
