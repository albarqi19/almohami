import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Search,
  ArrowRight,
  User,
  Clock,
  CheckCheck,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MessageService, type Conversation, type Message, type Recipient } from '../services/messageService';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import '../styles/client-messages.css';

const ClientMessages: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseInfo, setCaseInfo] = useState<{ id: number; title: string; file_number?: string } | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Check URL params for case_id
  useEffect(() => {
    const caseId = searchParams.get('case_id');
    if (caseId) {
      setSelectedCaseId(parseInt(caseId));
    }
  }, [searchParams]);

  // Load messages when case is selected
  useEffect(() => {
    if (selectedCaseId) {
      loadCaseMessages(selectedCaseId);
      loadRecipients(selectedCaseId);
    }
  }, [selectedCaseId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await MessageService.getConversations();
      setConversations(data);
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل المحادثات');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCaseMessages = async (caseId: number) => {
    try {
      setIsLoadingMessages(true);
      setError(null);
      const data = await MessageService.getCaseMessages(caseId);
      setMessages(data.messages.data);
      setCaseInfo(data.case);

      // Mark as read
      await MessageService.markCaseAsRead(caseId);

      // Update unread count in conversations
      setConversations(prev =>
        prev.map(conv =>
          conv.case_id === caseId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل الرسائل');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const loadRecipients = async (caseId: number) => {
    try {
      const data = await MessageService.getRecipients(caseId);
      setRecipients(data);
      if (data.length > 0 && !selectedRecipient) {
        setSelectedRecipient(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load recipients:', err);
    }
  };

  // تحديث تلقائي للمحادثات كل 10 ثواني
  useAutoRefresh({
    onRefresh: loadConversations,
    refetchOnFocus: true,
    pollingInterval: 10, // كل 10 ثواني
    minRefreshInterval: 5,
  });

  // تحديث تلقائي للرسائل كل 5 ثواني عند فتح محادثة
  useAutoRefresh({
    onRefresh: async () => {
      if (selectedCaseId) {
        try {
          const data = await MessageService.getCaseMessages(selectedCaseId);
          setMessages(data.messages.data);
        } catch (err) {
          console.error('Failed to refresh messages:', err);
        }
      }
    },
    refetchOnFocus: true,
    pollingInterval: 5, // كل 5 ثواني
    enabled: !!selectedCaseId, // فقط عند فتح محادثة
    minRefreshInterval: 3,
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedCaseId || !selectedRecipient) return;

    try {
      setIsSending(true);
      const sentMessage = await MessageService.sendMessage({
        case_id: selectedCaseId,
        recipient_id: selectedRecipient.id,
        message: newMessage.trim(),
        type: 'general'
      });

      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');

      // Update conversation list
      loadConversations();
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

  const selectConversation = (caseId: number) => {
    setSelectedCaseId(caseId);
    setSearchParams({ case_id: caseId.toString() });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'أمس';
    } else if (days < 7) {
      return date.toLocaleDateString('ar-SA', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.case?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.other_party?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      lawyer: 'محامي',
      admin: 'مدير',
      legal_assistant: 'مساعد قانوني',
      client: 'عميل'
    };
    return labels[role] || role;
  };

  return (
    <div className="client-messages-container">
      {/* Header */}
      <div className="messages-header">
        <div className="header-content">
          <MessageSquare className="header-icon" />
          <div>
            <h1>الرسائل</h1>
            <p>تواصل مع فريقك القانوني</p>
          </div>
        </div>
        <button onClick={loadConversations} className="refresh-btn" disabled={isLoading}>
          <RefreshCw className={`refresh-icon ${isLoading ? 'spinning' : ''}`} />
        </button>
      </div>

      <div className="messages-layout">
        {/* Conversations List */}
        <div className="conversations-panel">
          {/* Search */}
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="بحث في المحادثات..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Conversations */}
          <div className="conversations-list">
            {isLoading ? (
              <div className="loading-state">
                <Loader2 className="spinner" />
                <span>جاري التحميل...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="empty-state">
                <MessageSquare className="empty-icon" />
                <p>لا توجد محادثات</p>
                <span>ستظهر المحادثات هنا عند إرسال أو استلام رسائل</span>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <motion.div
                  key={conv.case_id}
                  className={`conversation-item ${selectedCaseId === conv.case_id ? 'active' : ''}`}
                  onClick={() => selectConversation(conv.case_id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="conversation-avatar">
                    {conv.other_party?.avatar ? (
                      <img src={conv.other_party.avatar} alt={conv.other_party.name} />
                    ) : (
                      <User />
                    )}
                    {conv.unread_count > 0 && (
                      <span className="unread-badge">{conv.unread_count}</span>
                    )}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <span className="party-name">{conv.other_party?.name || 'غير معروف'}</span>
                      <span className="message-time">{formatTime(conv.last_message.created_at)}</span>
                    </div>
                    <div className="case-title">
                      <FileText className="case-icon" />
                      <span>{conv.case?.title || 'قضية'}</span>
                    </div>
                    <p className="last-message">
                      {conv.last_message.is_mine && <span className="you-label">أنت: </span>}
                      {conv.last_message.message}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div className="messages-panel">
          {selectedCaseId ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <button className="back-btn" onClick={() => setSelectedCaseId(null)}>
                  <ArrowRight />
                </button>
                <div className="chat-info">
                  <h3>{caseInfo?.title || 'محادثة'}</h3>
                  {caseInfo?.file_number && (
                    <span className="file-number">رقم الملف: {caseInfo.file_number}</span>
                  )}
                </div>
                {recipients.length > 0 && (
                  <div className="recipient-selector">
                    <select
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
              </div>

              {/* Messages Area */}
              <div className="messages-area">
                {isLoadingMessages ? (
                  <div className="loading-state">
                    <Loader2 className="spinner" />
                    <span>جاري تحميل الرسائل...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="empty-messages">
                    <MessageSquare className="empty-icon" />
                    <p>لا توجد رسائل</p>
                    <span>ابدأ المحادثة بإرسال رسالة</span>
                  </div>
                ) : (
                  <AnimatePresence>
                    {messages.map((msg, index) => {
                      const isMine = msg.sender_id === (user?.id ? Number(user.id) : undefined);
                      const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

                      return (
                        <motion.div
                          key={msg.id}
                          className={`message ${isMine ? 'mine' : 'theirs'}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                        >
                          {!isMine && showAvatar && (
                            <div className="message-avatar">
                              {msg.sender?.avatar ? (
                                <img src={msg.sender.avatar} alt={msg.sender.name} />
                              ) : (
                                <User />
                              )}
                            </div>
                          )}
                          <div className="message-content">
                            {!isMine && showAvatar && (
                              <span className="sender-name">
                                {msg.sender?.name}
                                <span className="sender-role">({getRoleLabel(msg.sender?.role || '')})</span>
                              </span>
                            )}
                            <div className="message-bubble">
                              <p>{msg.message}</p>
                              <div className="message-meta">
                                <span className="message-time">
                                  <Clock size={12} />
                                  {formatTime(msg.created_at)}
                                </span>
                                {isMine && (
                                  <span className="read-status">
                                    {msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="message-input-area">
                {error && (
                  <div className="error-message">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>×</button>
                  </div>
                )}
                <div className="input-container">
                  <textarea
                    placeholder="اكتب رسالتك هنا..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows={1}
                    disabled={isSending || !selectedRecipient}
                  />
                  <button
                    className="send-btn"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending || !selectedRecipient}
                  >
                    {isSending ? <Loader2 className="spinner" /> : <Send />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <MessageSquare className="big-icon" />
              <h3>اختر محادثة</h3>
              <p>اختر محادثة من القائمة للبدء في المراسلة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientMessages;
