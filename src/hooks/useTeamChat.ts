import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getEcho } from '../lib/echo';
import { playNotificationSound } from '../utils/notificationSound';
import {
    chatService,
    type ChatContact,
    type ChatConversation,
    type ChatConversationBroadcast,
    type ChatMessage,
    type ChatMessageBroadcast,
} from '../services/chatService';

interface UseTeamChatOptions {
    /** معرّف المستخدم الحالي — قناة البثّ الخاصة به */
    userId: number;
    /** هل لوحة الدردشة مفتوحة الآن؟ يمنع التنبيه على محادثة يقرأها المستخدم فعلاً */
    isPanelOpen: boolean;
}

/**
 * حالة دردشة الفريق: المحادثات، رسائل المحادثة المفتوحة، والاستقبال الحيّ.
 *
 * الاشتراك قناة واحدة فقط (`chat.user.{id}`) تصل عليها رسائل كل المحادثات —
 * فلا اشتراك/إلغاء عند كل تبديل محادثة، ويصل التنبيه والصوت حتى واللوحة مغلقة.
 */
export function useTeamChat({ userId, isPanelOpen }: UseTeamChatOptions) {
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [contacts, setContacts] = useState<ChatContact[]>([]);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // مرايا للمعالج الحيّ — المستمع يُسجَّل مرة واحدة ولا يرى الحالة المتجددة
    const activeIdRef = useRef<number | null>(null);
    const isPanelOpenRef = useRef(isPanelOpen);
    const knownIdsRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        activeIdRef.current = activeId;
    }, [activeId]);

    useEffect(() => {
        isPanelOpenRef.current = isPanelOpen;
    }, [isPanelOpen]);

    useEffect(() => {
        knownIdsRef.current = new Set(conversations.map(c => c.id));
    }, [conversations]);

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

    // ─────────────── تحميل ───────────────

    const loadConversations = useCallback(async () => {
        try {
            setConversations(await chatService.getConversations());
        } catch (error) {
            console.error('تعذّر تحميل المحادثات:', error);
        } finally {
            setIsLoadingConversations(false);
        }
    }, []);

    const loadContacts = useCallback(async () => {
        try {
            setContacts(await chatService.getContacts());
        } catch (error) {
            console.error('تعذّر تحميل جهات الاتصال:', error);
        }
    }, []);

    useEffect(() => {
        if (!userId) return;
        void loadConversations();
        void loadContacts();
    }, [userId, loadConversations, loadContacts]);

    /** فتح محادثة: تحميل رسائلها وتصفير عدّادها */
    const openConversation = useCallback(async (conversationId: number) => {
        setActiveId(conversationId);
        setIsLoadingMessages(true);
        try {
            const { messages: loaded, hasMore } = await chatService.getMessages(conversationId);
            setMessages(loaded);
            setHasMoreMessages(hasMore);

            await chatService.markAsRead(conversationId);
            setConversations(prev =>
                prev.map(c => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
            );
        } catch (error) {
            console.error('تعذّر فتح المحادثة:', error);
            toast.error('تعذّر فتح المحادثة');
        } finally {
            setIsLoadingMessages(false);
        }
    }, []);

    const closeConversation = useCallback(() => {
        setActiveId(null);
        setMessages([]);
        setHasMoreMessages(false);
    }, []);

    /** تحميل دفعة أقدم عند التمرير للأعلى */
    const loadOlderMessages = useCallback(async () => {
        const conversationId = activeIdRef.current;
        if (!conversationId || messages.length === 0 || !hasMoreMessages) return;

        try {
            const { messages: older, hasMore } = await chatService.getMessages(conversationId, messages[0].id);
            setMessages(prev => [...older, ...prev]);
            setHasMoreMessages(hasMore);
        } catch (error) {
            console.error('تعذّر تحميل الرسائل الأقدم:', error);
        }
    }, [messages, hasMoreMessages]);

    // ─────────────── إرسال ───────────────

    const sendMessage = useCallback(async (body: string) => {
        const conversationId = activeIdRef.current;
        const trimmed = body.trim();
        if (!conversationId || !trimmed) return;

        setIsSending(true);
        try {
            const message = await chatService.sendMessage(conversationId, trimmed);

            // البثّ يصل للمرسل أيضاً؛ الحارس أدناه يمنع الازدواج
            setMessages(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, message]));
            setConversations(prev =>
                prev
                    .map(c =>
                        c.id === conversationId
                            ? {
                                  ...c,
                                  last_message_at: message.created_at,
                                  last_message: {
                                      id: message.id,
                                      body: message.body,
                                      user_name: message.user_name,
                                      created_at: message.created_at,
                                  },
                              }
                            : c,
                    )
                    .sort(sortByRecency),
            );
        } catch (error) {
            console.error('تعذّر إرسال الرسالة:', error);
            toast.error(error instanceof Error ? error.message : 'تعذّر إرسال الرسالة');
        } finally {
            setIsSending(false);
        }
    }, []);

    const deleteMessage = useCallback(async (messageId: number) => {
        try {
            await chatService.deleteMessage(messageId);
            setMessages(prev => prev.filter(m => m.id !== messageId));
        } catch (error) {
            console.error('تعذّر حذف الرسالة:', error);
            toast.error('تعذّر حذف الرسالة');
        }
    }, []);

    // ─────────────── الاستقبال الحيّ ───────────────

    useEffect(() => {
        if (!userId) return;

        const authToken = localStorage.getItem('authToken') ?? '';
        const echo = getEcho(authToken);
        const channelName = `chat.user.${userId}`;
        const channel = echo.private(channelName);

        channel.listen('.chat.message.sent', (payload: ChatMessageBroadcast) => {
            const isMine = payload.user_id === userId;
            const isActive = activeIdRef.current === payload.conversation_id;

            // محادثة لا نعرفها بعد (قروب أُضيف إليه للتو) — أعد جلب القائمة كاملة
            // بدل محاولة ترقيعها محلياً، ثم أكمل للتنبيه أدناه.
            if (!knownIdsRef.current.has(payload.conversation_id)) {
                knownIdsRef.current.add(payload.conversation_id);
                void loadConversations();
            }

            // الرسالة تُضاف للنافذة المفتوحة فقط — وبحارس ضد الازدواج مع رد الإرسال
            if (isActive) {
                setMessages(prev =>
                    prev.some(m => m.id === payload.id)
                        ? prev
                        : [
                              ...prev,
                              {
                                  id: payload.id,
                                  conversation_id: payload.conversation_id,
                                  user_id: payload.user_id,
                                  user_name: payload.user_name,
                                  body: payload.body,
                                  created_at: payload.created_at,
                              },
                          ],
                );

                if (!isMine) {
                    void chatService.markAsRead(payload.conversation_id);
                }
            }

            setConversations(prev =>
                prev
                    .map(c =>
                        c.id === payload.conversation_id
                            ? {
                                  ...c,
                                  last_message_at: payload.created_at,
                                  last_message: {
                                      id: payload.id,
                                      body: payload.body,
                                      user_name: payload.user_name,
                                      created_at: payload.created_at,
                                  },
                                  // العدّاد يرتفع فقط لرسالة الغير في محادثة غير معروضة الآن
                                  unread_count:
                                      isMine || (isActive && isPanelOpenRef.current)
                                          ? c.unread_count
                                          : (c.unread_count || 0) + 1,
                              }
                            : c,
                    )
                    .sort(sortByRecency),
            );

            // تنبيه وصوت: لرسالة الغير، وما لم تكن محادثتها معروضة أمامه
            const isVisible = isActive && isPanelOpenRef.current && document.visibilityState === 'visible';
            if (!isMine && !isVisible) {
                playNotificationSound();
                toast.info(`${payload.user_name}: ${truncate(payload.body)}`, {
                    icon: () => '💬',
                });
            }
        });

        channel.listen('.chat.conversation.updated', (payload: ChatConversationBroadcast) => {
            if (payload.action === 'deleted' || payload.action === 'member_removed') {
                if (activeIdRef.current === payload.conversation_id) {
                    setActiveId(null);
                    setMessages([]);
                }
            }
            void loadConversations();
        });

        return () => {
            echo.leave(channelName);
        };
    }, [userId, loadConversations]);

    return {
        conversations,
        contacts,
        activeId,
        activeConversation: conversations.find(c => c.id === activeId) ?? null,
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
        refresh: loadConversations,
        refreshContacts: loadContacts,
    };
}

/** الأحدث أولاً — بآخر رسالة، وبتاريخ الإنشاء للمحادثات الفارغة */
function sortByRecency(a: ChatConversation, b: ChatConversation): number {
    const at = a.last_message_at ? Date.parse(a.last_message_at) : 0;
    const bt = b.last_message_at ? Date.parse(b.last_message_at) : 0;
    return bt - at;
}

function truncate(text: string, max = 60): string {
    return text.length > max ? `${text.slice(0, max)}…` : text;
}
