import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, User, Clock, CheckCheck, Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MessageService, type Message } from '../services/messageService';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
// الستايل: بدائيّات messages-modal/message-bubble القائمة (case-messages-modal.css) داخل لوحةٍ مضمّنة

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
  const endRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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

  return (
    <div className="messages-modal" style={{ position: 'static', width: '100%', maxWidth: 'none', maxHeight: 'none', boxShadow: 'none', border: '1px solid var(--color-border)', transform: 'none' }}>
      <div className="messages-modal__header">
        <div className="messages-modal__title">
          <div className="messages-modal__title-icon"><MessageSquare size={20} /></div>
          <div className="messages-modal__title-text">
            <h3>الرسائل العامة</h3>
            <span>مراسلة {clientName} خارج ملفات القضايا — تصله في بوابته</span>
          </div>
        </div>
        <div className="messages-modal__actions">
          <button onClick={() => void load()} className="messages-modal__btn" disabled={loading} title="تحديث">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="messages-modal__body" style={{ maxHeight: 420 }}>
        {loading ? (
          <div className="messages-modal__loading"><Loader2 size={28} className="animate-spin" /><span>جاري تحميل الرسائل...</span></div>
        ) : messages.length === 0 ? (
          <div className="messages-modal__empty">
            <div className="messages-modal__empty-icon"><MessageSquare size={28} /></div>
            <h4 className="messages-modal__empty-title">لا رسائل عامة بعد</h4>
            <p className="messages-modal__empty-text">ما يُكتب هنا يصل العميل في صفحة «الرسائل» ببوابته</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isMine = msg.sender_id === (user?.id ? Number(user.id) : undefined);
              const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;
              return (
                <div key={msg.id} className={`message-bubble ${isMine ? 'message-bubble--mine' : 'message-bubble--other'}`}>
                  {!isMine && showAvatar && (
                    <div className="message-bubble__avatar">
                      {msg.sender?.avatar ? <img src={msg.sender.avatar} alt={msg.sender.name} /> : <User size={18} />}
                    </div>
                  )}
                  <div className="message-bubble__content">
                    {!isMine && showAvatar && <span className="message-bubble__sender">{msg.sender?.name}</span>}
                    <div className="message-bubble__text">{msg.message}</div>
                    <div className="message-bubble__meta">
                      <Clock size={10} />
                      <span>{formatTime(msg.created_at)}</span>
                      {isMine && (
                        <span className={`message-bubble__status ${msg.is_read ? 'message-bubble__status--read' : ''}`}>
                          {msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </>
        )}
      </div>

      {error && (
        <div className="messages-modal__error">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="messages-modal__error-close">×</button>
        </div>
      )}

      <div className="messages-modal__input">
        <div className="messages-modal__input-wrapper">
          <textarea
            className="messages-modal__textarea"
            placeholder={`أرسل رسالة إلى ${clientName}...`}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyPress={onKey}
            rows={1}
            disabled={sending}
          />
          <button className="messages-modal__send-btn" onClick={() => void send()} disabled={!text.trim() || sending}>
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientGeneralMessagesPanel;
