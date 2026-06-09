// خدمة «الأنظمة» — فهرس النظام السعودي
// تستهلك endpoints الباك-إند:
// GET    /api/v1/laws                     قائمة الأنظمة (75 نظاماً)
// GET    /api/v1/laws/{serial}            نظام بكامل مواده
// POST   /api/v1/laws/search              بحث دلالي ذكي
// POST   /api/v1/laws/chat                سؤال محادثة (ينشئ/يكمل محادثة)
// GET    /api/v1/laws/chats               محادثات المستخدم الحالي
// GET    /api/v1/laws/chats/{id}          رسائل محادثة
// DELETE /api/v1/laws/chats/{id}          حذف محادثة

import { apiClient } from '../utils/api';
import type { ApiResponse } from '../utils/api';

// ═══════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════

export interface LawStatuteSummary {
  id: number;
  serial: string;
  name: string;
  legal_type: string | null;
  status: string | null;
  articles_count: number;
}

export interface LawArticle {
  id: number;
  chapter: string | null;
  article_number: string | null;
  article_name: string | null;
  text: string;
  legal_status: string | null;
  order_index: number;
}

export interface LawStatuteDetail {
  statute: LawStatuteSummary;
  articles: LawArticle[];
}

export interface LawSearchResult {
  article_id: number | null;
  statute_serial: string;
  statute_name: string;
  legal_type: string | null;
  chapter: string | null;
  article_number: string | null;
  text: string;
  score: number;
}

export interface CitedArticle {
  article_id: number | null;
  statute_serial: string;
  statute_name: string;
  chapter: string | null;
  article_number: string | null;
  text: string;
}

export interface LawChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  cited_articles: CitedArticle[] | null;
  created_at: string;
}

export interface LawChatConversationSummary {
  id: number;
  title: string;
  last_message_at: string | null;
  created_at: string;
  messages_count: number;
}

export interface LawChatAnswer {
  conversation_id: number;
  title: string;
  message: {
    id: number;
    role: 'assistant';
    content: string;
    cited_articles: CitedArticle[];
    no_match: boolean;
    created_at: string;
  };
}

// ═══════════════════════════════════════════════════════
//  Service
// ═══════════════════════════════════════════════════════

export class LawsService {
  static async getStatutes(): Promise<LawStatuteSummary[]> {
    const res = await apiClient.get<ApiResponse<LawStatuteSummary[]>>('/laws');
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل جلب الأنظمة');
  }

  static async getStatute(serial: string): Promise<LawStatuteDetail> {
    const res = await apiClient.get<ApiResponse<LawStatuteDetail>>(`/laws/${encodeURIComponent(serial)}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل جلب النظام');
  }

  static async smartSearch(query: string): Promise<LawSearchResult[]> {
    const res = await apiClient.post<ApiResponse<{ results: LawSearchResult[] }>>('/laws/search', { query });
    if (res.success && res.data) return res.data.results;
    throw new Error(res.message || 'فشل البحث الذكي');
  }

  static async sendChat(question: string, conversationId?: number | null): Promise<LawChatAnswer> {
    const res = await apiClient.post<ApiResponse<LawChatAnswer>>('/laws/chat', {
      question,
      conversation_id: conversationId ?? undefined,
    });
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'تعذّر إرسال السؤال');
  }

  static async getConversations(): Promise<LawChatConversationSummary[]> {
    const res = await apiClient.get<ApiResponse<LawChatConversationSummary[]>>('/laws/chats');
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل جلب المحادثات');
  }

  static async getConversation(id: number): Promise<{ id: number; title: string; messages: LawChatMessage[] }> {
    const res = await apiClient.get<ApiResponse<{ id: number; title: string; messages: LawChatMessage[] }>>(`/laws/chats/${id}`);
    if (res.success && res.data) return res.data;
    throw new Error(res.message || 'فشل جلب المحادثة');
  }

  static async deleteConversation(id: number): Promise<void> {
    const res = await apiClient.delete<ApiResponse>(`/laws/chats/${id}`);
    if (!res.success) throw new Error(res.message || 'فشل حذف المحادثة');
  }
}
