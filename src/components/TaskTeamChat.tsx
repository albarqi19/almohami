import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { BookOpenText, CheckCircle2, ChevronsRight, Loader2, MessagesSquare, Send, Sparkles, Trash2 } from 'lucide-react';
import MentionInput from './MentionInput';
import { TaskCommentService, TASK_COMMENT_MAX_LENGTH, type TaskChatMessage } from '../services/taskCommentService';
import { getApiErrorMessage } from '../utils/apiError';
import { useAuth } from '../contexts/AuthContext';
import type { RaedState } from '../types/legalServices';

/**
 * محادثة فريق المهمة — تعليقات المهمة بواجهة شات (نفس عقد وشكل شات القضية
 * والخدمة المبسطة — كلاسات stc-*)، مع إشارة @ تُنبِّه المذكور في جرس الإشعارات.
 *
 * «رائد الذكي» (بوابة raed_assistant_enabled): عضو افتراضي مخصص لهذه المهمة —
 * يشرح المطلوب ويقسّمه لمهام فرعية، يستشهد من الأنظمة، ويدير الفرعيات بالاقتراح
 * أو بالتنفيذ عند الطلب الصريح.
 */

/* رائد يتصدر قائمة @ بترميز ذهبي — والاستدعاء بكلمة واحدة: @رائد */
const RAED_VIRTUAL_MEMBER = {
  id: 'raed',
  name: 'رائد الذكي',
  insertName: 'رائد',
  description: 'زميلكم الذكي في هذه المهمة — يرتّب الفرعيات ويستدل من الأنظمة',
  virtual: true,
};

const TaskTeamChat: React.FC<{
  taskId: string;
  /* طيّ عمود المحادثة إلى شريط رفيع (زر في رأس البطاقة) */
  onCollapse?: () => void;
  /* يُستدعى حين ينفّذ رائد فعلاً (مهمة فرعية) كي تتحدث بقية الأقسام */
  onTaskMutated?: () => void;
}> = ({ taskId, onCollapse, onTaskMutated }) => {
  const { user } = useAuth();
  const myId = user?.id != null ? Number(user.id) : null;

  const [messages, setMessages] = useState<TaskChatMessage[]>([]);
  const [raed, setRaed] = useState<RaedState | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  /* إعادة mount لمُدخل المنشن بعد الإرسال — يصفّر قائمته الداخلية للمذكورين */
  const [inputKey, setInputKey] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  /* رسائل رائد المنفِّذة لأفعال عولجت — كي لا نعيد تحديث الصفحة لكل fetch */
  const seenActionIds = useRef<Set<number>>(new Set());
  const firstLoad = useRef(true);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const digestRaedActions = useCallback((list: TaskChatMessage[]) => {
    let mutated = false;
    for (const m of list) {
      if (m.author_type === 'assistant' && m.meta?.status === 'done' && (m.meta.actions?.length ?? 0) > 0) {
        if (!seenActionIds.current.has(m.id)) {
          seenActionIds.current.add(m.id);
          mutated = true;
        }
      }
    }
    /* أول تحميل: نُحصي القديم بلا تحديث — الأفعال الجديدة فقط تحرّك الصفحة */
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (mutated) onTaskMutated?.();
  }, [onTaskMutated]);

  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const res = await TaskCommentService.getChat(taskId);
      setMessages(res.messages);
      setRaed(res.raed ?? null);
      digestRaedActions(res.messages);
      if (initial) scrollToEnd();
    } catch {
      /* polling صامت — لا نزعج بالمحاولات الفاشلة العابرة */
    } finally {
      setLoading(false);
    }
  }, [taskId, digestRaedActions]);

  /* polling ذكي: 4 ثوانٍ ما دام رائد يفكر أو الجلسة حية، وإلا 30 ثانية */
  const hasThinkingMessage = messages.some((m) => m.author_type === 'assistant' && m.meta?.status === 'thinking');
  const fastPoll = Boolean(raed?.thinking || raed?.session?.active || hasThinkingMessage);

  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  useEffect(() => {
    const interval = window.setInterval(() => fetchMessages(), fastPoll ? 4000 : 30000);
    return () => window.clearInterval(interval);
  }, [fetchMessages, fastPoll]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    /* كتابة @رائد يدوياً (بلا اختيار من القائمة) تكفي لاستدعائه */
    const finalMentions = raed?.enabled && /@رائد(?=\s|$|[.!؟،])/u.test(body) && !mentions.includes('raed')
      ? [...mentions, 'raed']
      : mentions;
    try {
      const res = await TaskCommentService.sendChatMessage(taskId, body, finalMentions);
      const appended: TaskChatMessage[] = [res.message];
      /* منشن رائد أو ردّه المقنن — الفقاعة تظهر بنفس لحظة الإرسال */
      if (res.raed?.message) appended.push(res.raed.message);
      setMessages((prev) => [...prev, ...appended]);
      if (res.raed) {
        setRaed({
          enabled: true,
          session: res.raed.session ?? null,
          thinking: Boolean(res.raed.thinking),
        });
      }
      setText('');
      setMentions([]);
      setInputKey((k) => k + 1);
      scrollToEnd();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إرسال الرسالة'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (messageId: number) => {
    try {
      await TaskCommentService.deleteTaskComment(taskId, String(messageId));
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حذف الرسالة'));
    }
  };

  /* تنفيذ اقتراح رائد بنقرة — بصلاحية الناقر (tasks.edit على المسار) */
  const runSuggested = async (messageId: number, index: number) => {
    const key = `${messageId}:${index}`;
    if (busyAction) return;
    setBusyAction(key);
    try {
      const res: any = await TaskCommentService.executeRaedAction(taskId, messageId, index);
      if (res.success) {
        toast.success(res.message || 'نُفِّذ الاقتراح');
        await fetchMessages();
        onTaskMutated?.();
        scrollToEnd();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر تنفيذ الاقتراح'));
    } finally {
      setBusyAction(null);
    }
  };

  /* إبراز الإشارات @فلان داخل نص الرسالة */
  const renderBody = (body: string) => {
    const parts = body.split(/(@[^\s@]+(?:\s[^\s@]+)?)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <mark key={i} className="stc-mention">{part}</mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    );
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });

  /* ── فقاعة رائد الذكي بحالاتها: يفكر / رد مكتمل / فشل ── */
  const renderRaedMessage = (m: TaskChatMessage) => {
    const meta = m.meta ?? {};
    const thinking = meta.status === 'thinking';
    const failed = meta.status === 'failed';

    return (
      <div key={m.id} className="stc-msg stc-msg--raed">
        <span className={`stc-raed-avatar${thinking ? ' stc-raed-avatar--breathing' : ''}`} title="رائد الذكي">
          <Sparkles size={13} />
        </span>
        <div className={`stc-msg__bubble stc-raed-bubble${failed ? ' stc-raed-bubble--failed' : ''}`}>
          <span className="stc-msg__author stc-raed-name">رائد الذكي</span>

          {thinking ? (
            <span className="stc-raed-typing" aria-label="رائد يكتب الآن">
              <span className="stc-raed-typing__label">يكتب</span>
              <span className="stc-raed-dot" /><span className="stc-raed-dot" /><span className="stc-raed-dot" />
            </span>
          ) : (
            <>
              <p className="stc-msg__body">{renderBody(m.comment)}</p>

              {/* شارات الأفعال المنفَّذة */}
              {(meta.actions?.length ?? 0) > 0 && (
                <div className="stc-raed-actions">
                  {meta.actions!.map((a, i) => (
                    <span key={i} className="stc-raed-action-chip">
                      <CheckCircle2 size={11} /> {a.label}
                    </span>
                  ))}
                </div>
              )}

              {/* استشهادات المواد النظامية — قابلة للفتح */}
              {(meta.citations?.length ?? 0) > 0 && (
                <div className="stc-raed-cites">
                  {meta.citations!.map((c) => (
                    <details key={c.n} className="stc-raed-cite">
                      <summary>
                        <BookOpenText size={11} /> [{c.n}] {c.statute_name}{c.article_number ? ` — ${c.article_number}` : ''}
                      </summary>
                      <p className="stc-raed-cite__text">{c.text}</p>
                    </details>
                  ))}
                </div>
              )}

              {/* اقتراحات قابلة للنقر — تنفيذ بصلاحية الناقر */}
              {(meta.suggested_actions?.length ?? 0) > 0 && (
                <div className="stc-raed-suggestions">
                  {meta.suggested_actions!.map((s, i) => {
                    const key = `${m.id}:${i}`;
                    const executed = Boolean(s.executed_at);
                    return (
                      <button
                        key={i}
                        className={`stc-raed-suggest-btn${executed ? ' stc-raed-suggest-btn--done' : ''}`}
                        disabled={executed || busyAction !== null}
                        onClick={() => runSuggested(m.id, i)}
                        title={executed ? `نفّذها ${s.executed_by ?? ''}` : 'تنفيذ الاقتراح'}
                      >
                        {busyAction === key ? <Loader2 size={11} className="ssp2-spin" /> : executed ? <CheckCircle2 size={11} /> : null}
                        {executed ? `تم — ${s.label_ar}` : s.label_ar}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* تلميح الأدب: يظهر من الرد الثالث المتتالي */}
              {meta.stop_hint && (
                <span className="stc-raed-stophint">💡 إذا تبوني أسكت قولوا: وقف</span>
              )}
            </>
          )}

          <span className="stc-msg__time">{fmtTime(m.created_at)}</span>
        </div>
      </div>
    );
  };

  return (
    <section className="ssp2-card" id="task-team-chat">
      <div className="ssp2-card__head">
        <span className="ssp2-card__title"><MessagesSquare size={15} /> محادثة المهمة</span>
        <span className="ssp2-card__headtools">
          <span className="ssp2-card__meta">داخلية — لا تظهر للعميل</span>
          {onCollapse && (
            <button className="ssp2-icon-btn" onClick={onCollapse} title="تصغير المحادثة">
              <ChevronsRight size={15} />
            </button>
          )}
        </span>
      </div>

      {/* شريط الجلسة: شفافية كاملة — الفريق يعرف أن رائد يسمع */}
      {raed?.session?.active && (
        <div className="stc-raed-sessionbar">
          <span className="stc-raed-sessionbar__dot" />
          رائد يتابع النقاش — اكتب «وقف» لإيقافه
        </div>
      )}

      <div className="stc-list" ref={listRef}>
        {loading ? (
          <p className="ssp2-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ التحميل...</p>
        ) : messages.length === 0 ? (
          <p className="ssp2-empty">
            لا رسائل بعد — ناقشوا المهمة هنا، واستخدم @ لتنبيه زميل{raed?.enabled ? ' أو لاستدعاء رائد الذكي ✨' : ''}.
          </p>
        ) : (
          messages.map((m) => {
            if (m.author_type === 'assistant') return renderRaedMessage(m);
            const mine = myId !== null && Number(m.user_id) === myId;
            return (
              <div key={m.id} className={`stc-msg${mine ? ' stc-msg--mine' : ''}`}>
                <div className="stc-msg__bubble">
                  {!mine && <span className="stc-msg__author">{m.user?.name ?? '—'}</span>}
                  <p className="stc-msg__body">{renderBody(m.comment)}</p>
                  <span className="stc-msg__time">
                    {fmtTime(m.created_at)}
                    {mine && (
                      <button className="stc-msg__delete" onClick={() => remove(m.id)} title="حذف الرسالة">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* مؤشر عائم: رائد يعالج رسالة متابعة (قد يرد وقد يكتفي بالقراءة) */}
        {raed?.thinking && !hasThinkingMessage && !loading && (
          <div className="stc-msg stc-msg--raed stc-raed-floating">
            <span className="stc-raed-avatar stc-raed-avatar--breathing"><Sparkles size={13} /></span>
            <span className="stc-raed-typing">
              <span className="stc-raed-typing__label">رائد يقرأ</span>
              <span className="stc-raed-dot" /><span className="stc-raed-dot" /><span className="stc-raed-dot" />
            </span>
          </div>
        )}
      </div>

      <div className="stc-compose">
        <MentionInput
          key={inputKey}
          value={text}
          onChange={setText}
          onMentionsChange={(ids) => setMentions(ids)}
          onSubmit={send}
          placeholder={raed?.enabled
            ? 'ناقش المهمة... @ لتنبيه زميل — و@رائد يستدعي زميلكم الذكي (Enter للإرسال)'
            : 'ناقش المهمة مع فريقك... @ للإشارة لزميل (Enter للإرسال)'}
          disabled={busy}
          className="stc-compose__input"
          virtualMembers={raed?.enabled ? [RAED_VIRTUAL_MEMBER] : undefined}
          maxLength={TASK_COMMENT_MAX_LENGTH}
        />
        <button className="ssp2-btn ssp2-btn--primary" onClick={send} disabled={busy || !text.trim()}>
          {busy ? <Loader2 size={14} className="ssp2-spin" /> : <Send size={14} />} إرسال
        </button>
      </div>
    </section>
  );
};

export default TaskTeamChat;
