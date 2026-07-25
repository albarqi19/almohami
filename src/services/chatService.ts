import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

/**
 * دردشة الفريق — قروبات ومحادثات ثنائية بين منسوبي المكتب.
 * الباك يحجب العملاء تماماً (internal.user)، ويحصر الرؤية بالعضوية.
 */

export type ConversationType = 'group' | 'direct';
export type ChatRole = 'owner' | 'member';

export interface ChatParticipant {
    id: number;
    name: string;
    role: string | null;
    chat_role: ChatRole;
}

export interface ChatLastMessage {
    id: number;
    body: string;
    user_name: string;
    created_at: string | null;
}

export interface ChatConversation {
    id: number;
    type: ConversationType;
    name: string | null;
    /** العنوان كما يراه المستخدم الحالي — اسم القروب أو اسم الطرف الآخر */
    title: string;
    created_by: number | null;
    can_manage: boolean;
    my_role: ChatRole;
    last_message_at: string | null;
    last_message: ChatLastMessage | null;
    unread_count: number;
    participants: ChatParticipant[];
}

export interface ChatMessage {
    id: number;
    conversation_id: number;
    user_id: number | null;
    user_name: string;
    body: string;
    created_at: string | null;
}

export interface ChatContact {
    id: number;
    name: string;
    role: string | null;
}

/** حمولة حدث البث `.chat.message.sent` عبر Reverb */
export interface ChatMessageBroadcast {
    id: number;
    conversation_id: number;
    conversation_name: string;
    conversation_type: ConversationType;
    user_id: number | null;
    user_name: string;
    body: string;
    created_at: string | null;
}

/** حمولة حدث `.chat.conversation.updated` */
export interface ChatConversationBroadcast {
    conversation_id: number;
    action: 'created' | 'updated' | 'deleted' | 'member_removed';
}

export const chatService = {
    /** محادثاتي مرتبة بالأحدث */
    async getConversations(): Promise<ChatConversation[]> {
        const res = await apiClient.get<ApiResponse<ChatConversation[]>>('/chat/conversations');
        return res.data ?? [];
    },

    /** إنشاء قروب مسمّى */
    async createGroup(name: string, memberIds: number[]): Promise<ChatConversation> {
        const res = await apiClient.post<ApiResponse<ChatConversation>>('/chat/conversations', {
            type: 'group',
            name,
            member_ids: memberIds,
        });
        return res.data as ChatConversation;
    },

    /** فتح محادثة ثنائية — يعيد القائمة إن وُجدت بدل إنشاء نسخة ثانية */
    async openDirect(userId: number): Promise<ChatConversation> {
        const res = await apiClient.post<ApiResponse<ChatConversation>>('/chat/conversations', {
            type: 'direct',
            member_ids: [userId],
        });
        return res.data as ChatConversation;
    },

    async getConversation(id: number): Promise<ChatConversation> {
        const res = await apiClient.get<ApiResponse<ChatConversation>>(`/chat/conversations/${id}`);
        return res.data as ChatConversation;
    },

    async renameGroup(id: number, name: string): Promise<ChatConversation> {
        const res = await apiClient.put<ApiResponse<ChatConversation>>(`/chat/conversations/${id}`, { name });
        return res.data as ChatConversation;
    },

    async deleteGroup(id: number): Promise<void> {
        await apiClient.delete<ApiResponse<null>>(`/chat/conversations/${id}`);
    },

    async addMembers(id: number, memberIds: number[]): Promise<ChatConversation> {
        const res = await apiClient.post<ApiResponse<ChatConversation>>(`/chat/conversations/${id}/members`, {
            member_ids: memberIds,
        });
        return res.data as ChatConversation;
    },

    /** إزالة عضو — أو مغادرة القروب بتمرير معرّف المستخدم نفسه */
    async removeMember(id: number, userId: number): Promise<void> {
        await apiClient.delete<ApiResponse<null>>(`/chat/conversations/${id}/members/${userId}`);
    },

    /** زملاء المكتب المتاحون (بلا عملاء وبلا المستخدم نفسه) */
    async getContacts(): Promise<ChatContact[]> {
        const res = await apiClient.get<ApiResponse<ChatContact[]>>('/chat/contacts');
        return res.data ?? [];
    },

    /** رسائل المحادثة تصاعدياً؛ beforeId للتمرير نحو الأقدم */
    async getMessages(id: number, beforeId?: number): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
        const query = beforeId ? `?before_id=${beforeId}` : '';
        const res = await apiClient.get<ApiResponse<ChatMessage[]> & { has_more?: boolean }>(
            `/chat/conversations/${id}/messages${query}`,
        );
        return { messages: res.data ?? [], hasMore: Boolean(res.has_more) };
    },

    async sendMessage(id: number, body: string): Promise<ChatMessage> {
        const res = await apiClient.post<ApiResponse<ChatMessage>>(`/chat/conversations/${id}/messages`, { body });
        return res.data as ChatMessage;
    },

    async deleteMessage(messageId: number): Promise<void> {
        await apiClient.delete<ApiResponse<null>>(`/chat/messages/${messageId}`);
    },

    async markAsRead(id: number): Promise<void> {
        await apiClient.post<ApiResponse<{ last_read_message_id: number | null }>>(`/chat/conversations/${id}/read`);
    },

    async getUnreadCount(): Promise<number> {
        const res = await apiClient.get<ApiResponse<{ count: number }>>('/chat/unread-count');
        return res.data?.count ?? 0;
    },
};
