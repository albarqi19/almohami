import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Loader2, MessagesSquare, Send, Trash2 } from 'lucide-react';
import MentionInput from '../MentionInput';
import { LegalServiceService } from '../../services/legalServiceService';
import { getApiErrorMessage } from '../../utils/apiError';
import { useAuth } from '../../contexts/AuthContext';
import type { ServiceTeamMessageItem } from '../../types/legalServices';

/**
 * محادثة الفريق الداخلية على الخدمة — شات بين أعضاء المكتب (لا يظهر للعميل)
 * مع إشارة @ تُنبِّه المذكور في جرس الإشعارات وتوجّهه إلى هنا (#team-chat).
 */
const ServiceTeamChat: React.FC<{ serviceId: number }> = ({ serviceId }) => {
  const { user } = useAuth();
  const myId = user?.id != null ? Number(user.id) : null;

  const [messages, setMessages] = useState<ServiceTeamMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [mentions, setMentions] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  /* إعادة mount لمُدخل المنشن بعد الإرسال — يصفّر قائمته الداخلية للمذكورين */
  const [inputKey, setInputKey] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const fetchMessages = useCallback(async (initial = false) => {
    try {
      const res = await LegalServiceService.getTeamChat(serviceId);
      if (res.success) {
        setMessages(res.data ?? []);
        if (initial) scrollToEnd();
      }
    } catch {
      /* polling صامت — لا نزعج بالمحاولات الفاشلة العابرة */
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchMessages(true);
    const interval = window.setInterval(() => fetchMessages(), 30000);
    return () => window.clearInterval(interval);
  }, [fetchMessages]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const res = await LegalServiceService.sendTeamChatMessage(serviceId, body, mentions);
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
        setText('');
        setMentions([]);
        setInputKey((k) => k + 1);
        scrollToEnd();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر إرسال الرسالة'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (messageId: number) => {
    try {
      await LegalServiceService.deleteTeamChatMessage(serviceId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'تعذّر حذف الرسالة'));
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

  return (
    <section className="ssp2-card" id="team-chat">
      <div className="ssp2-card__head">
        <span className="ssp2-card__title"><MessagesSquare size={15} /> محادثة الفريق</span>
        <span className="ssp2-card__meta">داخلية — لا تظهر للعميل</span>
      </div>

      <div className="stc-list" ref={listRef}>
        {loading ? (
          <p className="ssp2-empty"><Loader2 size={14} className="ssp2-spin" /> جارٍ التحميل...</p>
        ) : messages.length === 0 ? (
          <p className="ssp2-empty">لا رسائل بعد — ناقش الخدمة مع فريقك هنا، واستخدم @ لتنبيه زميل.</p>
        ) : (
          messages.map((m) => {
            const mine = myId !== null && Number(m.user_id) === myId;
            return (
              <div key={m.id} className={`stc-msg${mine ? ' stc-msg--mine' : ''}`}>
                <div className="stc-msg__bubble">
                  {!mine && <span className="stc-msg__author">{m.user?.name ?? '—'}</span>}
                  <p className="stc-msg__body">{renderBody(m.body)}</p>
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
      </div>

      <div className="stc-compose">
        <MentionInput
          key={inputKey}
          value={text}
          onChange={setText}
          onMentionsChange={(ids) => setMentions(ids.map(Number))}
          onSubmit={send}
          placeholder="اكتب لفريقك... @ للإشارة لزميل (Enter للإرسال)"
          disabled={busy}
          className="stc-compose__input"
        />
        <button className="ssp2-btn ssp2-btn--primary" onClick={send} disabled={busy || !text.trim()}>
          {busy ? <Loader2 size={14} className="ssp2-spin" /> : <Send size={14} />} إرسال
        </button>
      </div>
    </section>
  );
};

export default ServiceTeamChat;
