import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Plus, ArrowRight, Search, Users, Settings2, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTeamChat } from '../../hooks/useTeamChat';
import { chatService, type ChatConversation } from '../../services/chatService';
import ChatGroupModal from './ChatGroupModal';
import { toast } from 'react-toastify';
// الستايل يُحقن مركزياً من styles/appStyles.ts — لا تستورده هنا (يكسر ترتيب الحقن)

/**
 * دردشة الفريق — زر عائم أسفل الشاشة يفتح لوحة محادثات حيّة.
 *
 * يُركَّب في Layout ضمن مجموعة الودجتات العائمة، وهي محجوبة أصلاً عن العملاء
 * (`user.role !== 'client'`) — مرآةً لحارس internal.user في الباك.
 */
const TeamChatWidget: React.FC = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    // إخفاء الشريط للجلسة الحالية فقط — لا يُحفظ، فيعود بتحديث الصفحة
    const [isDismissed, setIsDismissed] = useState(false);
    const [askDismiss, setAskDismiss] = useState(false);
    const [groupModal, setGroupModal] = useState<{ mode: 'create' | 'edit'; conversation?: ChatConversation } | null>(null);
    const [search, setSearch] = useState('');
    const [draft, setDraft] = useState('');

    const userId = Number(user?.id ?? 0);

    const {
        conversations,
        contacts,
        activeId,
        activeConversation,
        messages,
        totalUnread,
        isLoadingConversations,
        isLoadingMessages,
        hasMoreMessages,
        isSending,
        openConversation,
        closeConversation,
        loadOlderMessages,
        sendMessage,
        deleteMessage,
        refresh,
        refreshContacts,
    } = useTeamChat({ userId, isPanelOpen: isOpen });

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);

    // التمرير لأسفل عند وصول رسالة أو فتح محادثة
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages.length, activeId]);

    useEffect(() => {
        if (activeId && !isLoadingMessages) {
            inputRef.current?.focus();
        }
    }, [activeId, isLoadingMessages]);

    const handleScroll = useCallback(() => {
        if (scrollRef.current && scrollRef.current.scrollTop < 40 && hasMoreMessages) {
            void loadOlderMessages();
        }
    }, [hasMoreMessages, loadOlderMessages]);

    const handleSend = useCallback(async () => {
        const body = draft.trim();
        if (!body || isSending) return;
        setDraft('');
        await sendMessage(body);
    }, [draft, isSending, sendMessage]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter يرسل، Shift+Enter سطر جديد
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
        }
    };

    const handleStartDirect = async (contactId: number) => {
        try {
            const conversation = await chatService.openDirect(contactId);
            await refresh();
            await openConversation(conversation.id);
            setSearch('');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'تعذّر فتح المحادثة');
        }
    };

    const handleLeaveGroup = async (conversation: ChatConversation) => {
        if (!window.confirm(`مغادرة «${conversation.title}»؟ لن تصلك رسائله بعد الآن.`)) return;
        try {
            await chatService.removeMember(conversation.id, userId);
            closeConversation();
            await refresh();
            toast.success('غادرت القروب');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'تعذّرت المغادرة');
        }
    };

    if (!user || user.role === 'client') return null;
    // الاشتراك الحيّ يبقى قائماً بعد الإخفاء عمداً: الودجت يختفي، لا الدردشة —
    // فالرسائل ما زالت تصل بالتنبيه والصوت، ويعود الشريط بتحديث الصفحة.
    if (isDismissed) return null;

    const filteredConversations = conversations.filter(c =>
        c.title.toLowerCase().includes(search.trim().toLowerCase()),
    );

    // زملاء لا تجمعك بهم محادثة ثنائية بعد — لبدء واحدة من نفس مربع البحث
    const directPartnerIds = new Set(
        conversations
            .filter(c => c.type === 'direct')
            .flatMap(c => c.participants.map(p => p.id)),
    );
    const suggestedContacts = search.trim()
        ? contacts.filter(
              contact =>
                  !directPartnerIds.has(contact.id) &&
                  contact.name.toLowerCase().includes(search.trim().toLowerCase()),
          )
        : [];

    return (
        <>
            <div className="team-chat-dock">
                <button
                    className="team-chat-fab"
                    onClick={() => setIsOpen(prev => !prev)}
                    title="دردشة الفريق"
                    aria-label="دردشة الفريق"
                >
                    <MessageSquare size={14} />
                    <span>الدردشة</span>
                    {totalUnread > 0 && (
                        <em className="team-chat-fab__badge">{totalUnread > 99 ? '99+' : totalUnread}</em>
                    )}
                </button>
                <button
                    className="team-chat-dock__close"
                    onClick={() => {
                        setIsOpen(false);
                        setAskDismiss(true);
                    }}
                    title="إخفاء شريط الدردشة"
                    aria-label="إخفاء شريط الدردشة"
                >
                    <X size={13} />
                </button>
            </div>

            {askDismiss && (
                <div className="team-chat-dock__confirm" role="alertdialog" aria-label="تأكيد إخفاء الدردشة">
                    <p>
                        إخفاء شريط الدردشة؟
                        <small>يعود بتحديث الصفحة، والرسائل تظل تصلك.</small>
                    </p>
                    <div className="team-chat-dock__confirm-actions">
                        <button
                            className="is-yes"
                            onClick={() => {
                                setAskDismiss(false);
                                setIsDismissed(true);
                            }}
                        >
                            نعم، أخفِه
                        </button>
                        <button onClick={() => setAskDismiss(false)}>تراجع</button>
                    </div>
                </div>
            )}

            {isOpen && (
                <div className="team-chat-panel" role="dialog" aria-label="دردشة الفريق">
                    {/* ── الرأس ── */}
                    <header className="team-chat-panel__head">
                        {activeConversation ? (
                            <>
                                <button
                                    className="team-chat-icon-btn"
                                    onClick={closeConversation}
                                    title="رجوع للمحادثات"
                                >
                                    <ArrowRight size={16} />
                                </button>
                                <div className="team-chat-panel__title">
                                    <strong>{activeConversation.title}</strong>
                                    <span>
                                        {activeConversation.type === 'group'
                                            ? `${activeConversation.participants.length} أعضاء`
                                            : 'محادثة مباشرة'}
                                    </span>
                                </div>
                                {activeConversation.type === 'group' && (
                                    <button
                                        className="team-chat-icon-btn"
                                        onClick={() =>
                                            activeConversation.can_manage
                                                ? setGroupModal({ mode: 'edit', conversation: activeConversation })
                                                : void handleLeaveGroup(activeConversation)
                                        }
                                        title={activeConversation.can_manage ? 'إعدادات القروب' : 'مغادرة القروب'}
                                    >
                                        {activeConversation.can_manage ? <Settings2 size={16} /> : <Users size={16} />}
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="team-chat-panel__title">
                                    <strong>دردشة الفريق</strong>
                                    <span>{conversations.length} محادثة</span>
                                </div>
                                <button
                                    className="team-chat-icon-btn"
                                    onClick={() => setGroupModal({ mode: 'create' })}
                                    title="قروب جديد"
                                >
                                    <Plus size={16} />
                                </button>
                            </>
                        )}
                        <button className="team-chat-icon-btn" onClick={() => setIsOpen(false)} title="إغلاق">
                            <X size={16} />
                        </button>
                    </header>

                    {/* ── قائمة المحادثات ── */}
                    {!activeConversation && (
                        <>
                            <div className="team-chat-search">
                                <Search size={14} />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="ابحث عن محادثة أو زميل…"
                                />
                            </div>

                            <div className="team-chat-list">
                                {isLoadingConversations ? (
                                    <div className="team-chat-skeletons">
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={i} className="team-chat-skeleton" />
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        {filteredConversations.map(conversation => (
                                            <button
                                                key={conversation.id}
                                                className="team-chat-row"
                                                onClick={() => void openConversation(conversation.id)}
                                            >
                                                <span
                                                    className={`team-chat-row__avatar ${
                                                        conversation.type === 'group' ? 'is-group' : ''
                                                    }`}
                                                >
                                                    {conversation.type === 'group' ? (
                                                        <Users size={14} />
                                                    ) : (
                                                        initials(conversation.title)
                                                    )}
                                                </span>
                                                <span className="team-chat-row__body">
                                                    <span className="team-chat-row__top">
                                                        <strong>{conversation.title}</strong>
                                                        <time>{shortTime(conversation.last_message_at)}</time>
                                                    </span>
                                                    <span className="team-chat-row__preview">
                                                        {conversation.last_message
                                                            ? `${conversation.last_message.user_name}: ${conversation.last_message.body}`
                                                            : 'لا رسائل بعد'}
                                                    </span>
                                                </span>
                                                {conversation.unread_count > 0 && (
                                                    <em className="team-chat-row__badge">{conversation.unread_count}</em>
                                                )}
                                            </button>
                                        ))}

                                        {suggestedContacts.length > 0 && (
                                            <div className="team-chat-suggest">
                                                <span className="team-chat-suggest__label">بدء محادثة مع</span>
                                                {suggestedContacts.map(contact => (
                                                    <button
                                                        key={contact.id}
                                                        className="team-chat-row"
                                                        onClick={() => void handleStartDirect(contact.id)}
                                                    >
                                                        <span className="team-chat-row__avatar">
                                                            {initials(contact.name)}
                                                        </span>
                                                        <span className="team-chat-row__body">
                                                            <span className="team-chat-row__top">
                                                                <strong>{contact.name}</strong>
                                                            </span>
                                                            <span className="team-chat-row__preview">
                                                                {contact.role ?? 'عضو الفريق'}
                                                            </span>
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {filteredConversations.length === 0 && suggestedContacts.length === 0 && (
                                            <div className="team-chat-empty">
                                                <MessageSquare size={22} />
                                                <p>{search.trim() ? 'لا نتائج' : 'لا محادثات بعد'}</p>
                                                {!search.trim() && (
                                                    <button onClick={() => setGroupModal({ mode: 'create' })}>
                                                        أنشئ قروباً
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── نافذة الرسائل ── */}
                    {activeConversation && (
                        <>
                            <div className="team-chat-thread" ref={scrollRef} onScroll={handleScroll}>
                                {isLoadingMessages ? (
                                    <div className="team-chat-skeletons">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="team-chat-skeleton" />
                                        ))}
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="team-chat-empty">
                                        <MessageSquare size={22} />
                                        <p>ابدأ المحادثة</p>
                                    </div>
                                ) : (
                                    messages.map((message, index) => {
                                        const isMine = message.user_id === userId;
                                        const previous = messages[index - 1];
                                        const showAuthor =
                                            !isMine &&
                                            activeConversation.type === 'group' &&
                                            previous?.user_id !== message.user_id;

                                        return (
                                            <div
                                                key={message.id}
                                                className={`team-chat-msg ${isMine ? 'is-mine' : ''}`}
                                            >
                                                {showAuthor && (
                                                    <span className="team-chat-msg__author">{message.user_name}</span>
                                                )}
                                                <div className="team-chat-msg__bubble">
                                                    <p>{message.body}</p>
                                                    <span className="team-chat-msg__meta">
                                                        <time>{shortTime(message.created_at)}</time>
                                                        {isMine && (
                                                            <button
                                                                onClick={() => void deleteMessage(message.id)}
                                                                title="حذف الرسالة"
                                                            >
                                                                <Trash2 size={11} />
                                                            </button>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="team-chat-composer">
                                <textarea
                                    ref={inputRef}
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="اكتب رسالة… (Enter للإرسال)"
                                    rows={1}
                                    maxLength={5000}
                                />
                                <button
                                    onClick={() => void handleSend()}
                                    disabled={!draft.trim() || isSending}
                                    title="إرسال"
                                >
                                    <Send size={15} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {groupModal && (
                <ChatGroupModal
                    mode={groupModal.mode}
                    conversation={groupModal.conversation}
                    contacts={contacts}
                    currentUserId={userId}
                    onClose={() => setGroupModal(null)}
                    onSaved={async conversationId => {
                        setGroupModal(null);
                        await refresh();
                        await refreshContacts();
                        if (conversationId) {
                            await openConversation(conversationId);
                        }
                    }}
                    onDeleted={async () => {
                        setGroupModal(null);
                        closeConversation();
                        await refresh();
                    }}
                />
            )}
        </>
    );
};

/** أول حرفين من الاسم — بديل الصورة الرمزية */
function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`;
}

/** وقت مختصر: اليوم ساعة، وإلا تاريخ قصير */
function shortTime(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';

    const isToday = new Date().toDateString() === date.toDateString();
    return isToday
        ? date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'numeric' });
}

export default TeamChatWidget;
