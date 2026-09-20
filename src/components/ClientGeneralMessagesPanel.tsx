import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, User, Clock, CheckCheck, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MessageService, type Message } from '../services/messageService';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
// الستايل: أصناف cgm-* في client-detail.css — لوحة محادثة مضمّنة تملأ التبويب.
// (كانت تستعير أصناف مودال الرسائل `messages-modal` وتُبطل تموضعه بستايل مضمّن، فخرج شكلها مكسوراً.)

interface Props {
  clientId: number;
  clientName: string;
}

/**
 * الرسائلُ العامة (بلا قضية) بين العميل والمكتب — لوحةٌ في صفحة العميل عند المكتب.
 * الفريقُ الذي يخدم العميل يرى السلسلة كاملةً ويردّ باسمه؛ المستلمُ دائماً العميل.
 */
const ClientGeneralMessagesPanel: React.FC<Props> = ({ clientId, clientName }) => {
  const { user } = useAuth();
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) { setLoading(true); setError(null); }
      const data = await MessageService.getClientGeneralMessages(clientId);
      setMessages(data.messages.data);
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'فشل في تحميل الرسائل');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { void load(); }, [load]);

  // 🔴 لا `scrollIntoView`: يمرّر كل الحاويات الأم ومنها قشرة التطبيق فيصعد الهيدر — وكان يُستدعى مع كل
  // تحديث دوري (كل 5 ثوانٍ). نمرّر منطقة الرسائل وحدها، وفقط حين يزيد عدد الرسائل.
  useEffect(() => {
    if (messages.length === lastCountRef.current) return;
    lastCountRef.current = messages.length;
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages]);

  useAutoRefresh({
    onRefresh: () => load(true),
    refetchOnFocus: true,
    pollingInterval: 5,
    minRefreshInterval: 3,
  });

  const send = async () => {
    if (!text.trim()) return;
    try {
      setSending(true);
      const sent = await MessageService.sendMessageGeneral({
        case_id: null,
        recipient_id: clientId,
        message: text.trim(),
        type: 'general',
      });
      setMessages(prev => [...prev, sent]);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل في إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const myId = user?.id ? Number(user.id) : undefined;

  return (
    <section className="cgm" aria-label="الرسائل العامة">
      <header className="cgm__head">
        <span className="cgm__icon"><MessageSquare size={15} /></span>
        <div className="cgm__title">
          <h3>الرسائل العامة</h3>
          <span>خارج ملفات القضايا — تصل {clientName} في بوابته</span>
        </div>
        <button type="button" className="cgm__refresh" onClick={() => void load()} disabled={loading} title="تحديث">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="cgm__body" ref={bodyRef}>
        {loading ? (
          <div className="cgm__state"><Loader2 size={22} className="animate-spin" /><span>جاري تحميل الرسائل...</span></div>
        ) : messages.length === 0 ? (
          <div className="cgm__state">
            <MessageSquare size={26} />
            <strong>لا رسائل عامة بعد</strong>
            <span>ما يُكتب هنا يصل العميل في صفحة «الرسائل» ببوابته</span>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.sender_id === myId;
            const startsGroup = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
            return (
              <div key={msg.id} className={`cgm-msg ${isMine ? 'cgm-msg--mine' : 'cgm-msg--other'} ${startsGroup ? 'is-first' : ''}`}>
                {!isMine && (
                  <div className="cgm-msg__avatar" aria-hidden="true">
                    {startsGroup && (msg.sender?.avatar ? <img src={msg.sender.avatar} alt="" /> : <User size={14} />)}
                  </div>
                )}
                <div className="cgm-msg__content">
                  {!isMine && startsGroup && <span className="cgm-msg__sender">{msg.sender?.name}</span>}
                  <div className="cgm-msg__text">{msg.message}</div>
                  <div className="cgm-msg__meta">
                    <Clock size={10} />
                    <span>{formatTime(msg.created_at)}</span>
                    {isMine && (
                      <span className={`cgm-msg__status ${msg.is_read ? 'is-read' : ''}`} title={msg.is_read ? 'قُرئت' : 'أُرسلت'}>
                        {msg.is_read ? <CheckCheck size={13} /> : <Check size={13} />}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="cgm__error">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="إغلاق">×</button>
        </div>
      )}

      <div className="cgm__composer">
        <textarea
          className="cgm__input"
          placeholder={`اكتب رسالة إلى ${clientName}…`}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          disabled={sending}
          data-dictate="whatsapp"
        />
        <button type="button" className="cgm__send" onClick={() => void send()} disabled={!text.trim() || sending} title="إرسال (Enter)">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </section>
  );
};

export default ClientGeneralMessagesPanel;
