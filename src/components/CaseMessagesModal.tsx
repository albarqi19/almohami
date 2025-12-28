import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  MessageSquare,
  Send,
  User,
  Clock,
  CheckCheck,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MessageService, type Message, type Recipient } from '../services/messageService';
import '../styles/case-messages-modal.css';

interface CaseMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: number;
  caseTitle: string;
  clientName?: string;
}

const CaseMessagesModal: React.FC<CaseMessagesModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseTitle,
  clientName
}) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && caseId) {
      loadMessages();
      loadRecipients();
    }
  }, [isOpen, caseId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use general endpoint for lawyers/admins
      const data = await MessageService.getAllCaseMessages(caseId);
      setMessages(data.messages.data);

      // Mark as read
      try {
        await MessageService.markCaseAsReadGeneral(caseId);
      } catch (e) {
        // Ignore - might not have permissions
      }
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل الرسائل');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecipients = async () => {
    try {
      // For lawyers/admins, get recipients from general endpoint
      const data = await MessageService.getRecipientsGeneral(caseId);
      setRecipients(data);
      // Auto-select client if available
      const client = data.find((r: Recipient) => r.role === 'client');
      if (client) {
        setSelectedRecipient(client);
      } else if (data.length > 0) {
        setSelectedRecipient(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load recipients:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRecipient) return;

    try {
      setIsSending(true);
      const sentMessage = await MessageService.sendMessageGeneral({
        case_id: caseId,
        recipient_id: selectedRecipient.id,
        message: newMessage.trim(),
        type: 'general'
      });

      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
    } catch (err: any) {
      setError(err.message || 'فشل في إرسال الرسالة');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'أمس ' + date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return date.toLocaleDateString('ar-SA', { weekday: 'long' }) + ' ' + date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      lawyer: 'محامي',
      admin: 'مدير',
      legal_assistant: 'مساعد قانوني',
      client: 'عميل'
    };
    return labels[role] || role;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="messages-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="messages-modal__header">
          <div className="messages-modal__title">
            <div className="messages-modal__title-icon">
              <MessageSquare size={20} />
            </div>
            <div className="messages-modal__title-text">
              <h3>رسائل القضية</h3>
              <span>{caseTitle}</span>
            </div>
          </div>
          <div className="messages-modal__actions">
            <button
              onClick={loadMessages}
              className="messages-modal__btn"
              disabled={isLoading}
              title="تحديث"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="messages-modal__close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Recipient Selector */}
        {recipients.length > 0 && (
          <div className="messages-modal__recipient">
            <span className="messages-modal__recipient-label">إرسال إلى:</span>
            <select
              className="messages-modal__recipient-select"
              value={selectedRecipient?.id || ''}
              onChange={e => {
                const recipient = recipients.find(r => r.id === parseInt(e.target.value));
                setSelectedRecipient(recipient || null);
              }}
            >
              {recipients.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({getRoleLabel(r.role)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Messages Area */}
        <div className="messages-modal__body">
          {isLoading ? (
            <div className="messages-modal__loading">
              <Loader2 size={32} className="animate-spin" />
              <span>جاري تحميل الرسائل...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="messages-modal__empty">
              <div className="messages-modal__empty-icon">
                <MessageSquare size={28} />
              </div>
              <h4 className="messages-modal__empty-title">لا توجد رسائل</h4>
              <p className="messages-modal__empty-text">ابدأ المحادثة مع العميل</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isMine = msg.sender_id === (user?.id ? Number(user.id) : undefined);
                const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

                return (
                  <div
                    key={msg.id}
                    className={`message-bubble ${isMine ? 'message-bubble--mine' : 'message-bubble--other'}`}
                  >
                    {!isMine && showAvatar && (
                      <div className="message-bubble__avatar">
                        {msg.sender?.avatar ? (
                          <img src={msg.sender.avatar} alt={msg.sender.name} />
                        ) : (
                          <User size={18} />
                        )}
                      </div>
                    )}
                    <div className="message-bubble__content">
                      {!isMine && showAvatar && (
                        <span className="message-bubble__sender">
                          {msg.sender?.name}
                          <span className="message-bubble__sender-role">
                            ({getRoleLabel(msg.sender?.role || '')})
                          </span>
                        </span>
                      )}
                      <div className="message-bubble__text">
                        {msg.message}
                      </div>
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
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="messages-modal__error">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="messages-modal__error-close"
            >
              ×
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="messages-modal__input">
          <div className="messages-modal__input-wrapper">
            <textarea
              className="messages-modal__textarea"
              placeholder={selectedRecipient ? `أرسل رسالة إلى ${selectedRecipient.name}...` : 'اختر المستلم أولاً...'}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={1}
              disabled={isSending || !selectedRecipient}
            />
            <button
              className="messages-modal__send-btn"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending || !selectedRecipient}
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CaseMessagesModal;
