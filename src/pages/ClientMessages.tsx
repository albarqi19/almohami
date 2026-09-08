import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  RefreshCw,
  Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MessageService, type Conversation, type Message, type Recipient } from '../services/messageService';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
// الستايل يُحمَّل مركزياً عبر styles/appStyles.ts (ترتيب حقن ثابت — انظر التوثيق هناك)

/** مفتاحُ السلسلة العامة (بلا قضية) — يطابق `conversation_key` في الباك */
const GENERAL_KEY = 'general';

/** سلسلةٌ عامة فارغة تُثبَّت في أعلى القائمة كي يستطيع العميل مراسلة المكتب بلا قضية */
const emptyGeneralConversation = (): Conversation => ({
  conversation_key: GENERAL_KEY,
  is_general: true,
  case_id: null,
  case: null,
  other_party: { id: 0, name: 'المكتب', avatar: null, role: 'office' },
  last_message: { id: 0, message: 'راسل المكتب في أي موضوع لا يخصّ قضية بعينها', created_at: '', is_mine: false },
  unread_count: 0,
  total_messages: 0,
});

const ClientMessages: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
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

  const isGeneral = selectedKey === GENERAL_KEY;
  const selectedCaseId = selectedKey && !isGeneral ? Number(selectedKey) : null;

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Check URL params: ?thread=general أو ?case_id=
  useEffect(() => {
    const thread = searchParams.get('thread');
    const caseId = searchParams.get('case_id');
    if (thread === GENERAL_KEY) {
      setSelectedKey(GENERAL_KEY);
    } else if (caseId) {
      setSelectedKey(caseId);
    }
  }, [searchParams]);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (!selectedKey) return;
    setSelectedRecipient(null);
    if (selectedKey === GENERAL_KEY) {
      loadGeneralMessages();
      loadGeneralRecipients();
    } else {
      loadCaseMessages(Number(selectedKey));
      loadRecipients(Number(selectedKey));
    }
  }, [selectedKey]);

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
      // السلسلةُ العامة دائماً في الأعلى — موجودةً كانت أم لا
      const general = data.find(c => c.is_general) ?? emptyGeneralConversation();
      setConversations([general, ...data.filter(c => !c.is_general)]);
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

  const loadGeneralMessages = async () => {
    try {
      setIsLoadingMessages(true);
      setError(null);
      setCaseInfo(null);
      const data = await MessageService.getGeneralMessages();
      setMessages(data.messages.data);
      setConversations(prev => prev.map(conv => (conv.is_general ? { ...conv, unread_count: 0 } : conv)));
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
      setSelectedRecipient(data.length > 0 ? data[0] : null);
    } catch (err: any) {
      console.error('Failed to load recipients:', err);
    }
  };

  const loadGeneralRecipients = async () => {
    try {
      const data = await MessageService.getGeneralRecipients();
      setRecipients(data);
      // مديرُ العلاقة أولاً، وإلا أوّلُ متاح
      setSelectedRecipient(data.find(r => r.is_relationship_manager) ?? data[0] ?? null);
    } catch (err: any) {
      console.error('Failed to load recipients:', err);
    }
  };

  const refreshOpenThread = useCallback(async () => {
    if (!selectedKey) return;
    try {
      if (selectedKey === GENERAL_KEY) {
        const data = await MessageService.getGeneralMessages();
        setMessages(data.messages.data);
      } else {
        const data = await MessageService.getCaseMessages(Number(selectedKey));
        setMessages(data.messages.data);
      }
    } catch (err) {
      console.error('Failed to refresh messages:', err);
    }
  }, [selectedKey]);

  // تحديث تلقائي للمحادثات كل 10 ثواني
  useAutoRefresh({
    onRefresh: loadConversations,
    refetchOnFocus: true,
    pollingInterval: 10, // كل 10 ثواني
    minRefreshInterval: 5,
  });

  // تحديث تلقائي للرسائل كل 5 ثواني عند فتح محادثة
  useAutoRefresh({
    onRefresh: refreshOpenThread,
    refetchOnFocus: true,
    pollingInterval: 5, // كل 5 ثواني
    enabled: !!selectedKey, // فقط عند فتح محادثة
    minRefreshInterval: 3,
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedKey || !selectedRecipient) return;

    try {
      setIsSending(true);
      const sentMessage = await MessageService.sendMessage({
        case_id: isGeneral ? null : selectedCaseId,
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

  const selectConversation = (conv: Conversation) => {
    setSelectedKey(conv.conversation_key);
    setSearchParams(conv.is_general ? { thread: GENERAL_KEY } : { case_id: String(conv.case_id) });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
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
    conv.is_general ||
    conv.case?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.other_party?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      lawyer: 'محامي',
      admin: 'مدير',
      owner: 'مالك المكتب',
      partner: 'شريك',
      senior_lawyer: 'محامٍ أول',
      legal_assistant: 'مساعد قانوني',
      client: 'عميل'
    };
    // الأدوار المخصّصة لا تُعرض بمفتاحها التقني
    return labels[role] || 'فريق المكتب';
  };

  return (
    <div className="client-messages-container">
      {/* Header */}
      <div className="messages-header">
        <div className="header-content">
          <MessageSquare className="header-icon" />
          <div>
            <h1>الرسائل</h1>
            <p>تواصل مع فريقك القانوني — في قضية بعينها أو في أي موضوع عام</p>
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
                  key={conv.conversation_key}
                  className={`conversation-item ${selectedKey === conv.conversation_key ? 'active' : ''}`}
                  onClick={() => selectConversation(conv)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="conversation-avatar">
                    {conv.is_general ? (
                      <Building2 />
                    ) : conv.other_party?.avatar ? (
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
                      <span className="party-name">{conv.is_general ? 'المكتب — رسائل عامة' : (conv.other_party?.name || 'غير معروف')}</span>
                      <span className="message-time">{formatTime(conv.last_message.created_at)}</span>
                    </div>
                    <div className="case-title">
                      {conv.is_general ? <MessageSquare className="case-icon" /> : <FileText className="case-icon" />}
                      <span>{conv.is_general ? 'خارج ملفات القضايا' : (conv.case?.title || 'قضية')}</span>
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
          {selectedKey ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <button className="back-btn" onClick={() => setSelectedKey(null)}>
                  <ArrowRight />
                </button>
                <div className="chat-info">
                  <h3>{isGeneral ? 'رسائل عامة مع المكتب' : (caseInfo?.title || 'محادثة')}</h3>
                  {isGeneral ? (
                    <span className="file-number">لأي موضوع لا يخصّ قضية بعينها</span>
                  ) : caseInfo?.file_number ? (
                    <span className="file-number">رقم الملف: {caseInfo.file_number}</span>
                  ) : null}
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
                          {r.name} ({r.is_relationship_manager ? 'مدير علاقتك' : getRoleLabel(r.role)})
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
                    <span>{isGeneral ? 'اكتب للمكتب في أي موضوع — يصل مباشرةً لمن تختاره من فريقك' : 'ابدأ المحادثة بإرسال رسالة'}</span>
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
                    placeholder={selectedRecipient ? `اكتب رسالتك إلى ${selectedRecipient.name}...` : 'لا يوجد مستلم متاح'}
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
              <p>اختر محادثة من القائمة، أو «المكتب — رسائل عامة» لأي موضوع خارج القضايا</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientMessages;
