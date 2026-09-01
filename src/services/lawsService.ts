// خدمة «الأنظمة» — فهرس النظام السعودي
// تستهلك endpoints الباك-إند:
// GET    /api/v1/laws                     قائمة الأنظمة كاملةً (بلا ترقيم صفحات)
// GET    /api/v1/laws/{serial}            نظام بكامل مواده
// POST   /api/v1/laws/search              بحث دلالي ذكي
// POST   /api/v1/laws/chat                سؤال محادثة (ينشئ/يكمل محادثة)
// GET    /api/v1/laws/chats               محادثات المستخدم الحالي
// GET    /api/v1/laws/chats/{id}          رسائل محادثة
// DELETE /api/v1/laws/chats/{id}          حذف محادثة

import { apiClient, API_BASE_URL } from '../utils/api';
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
  /** حالةُ المادّة النظامية (أصلية · معدلة · ملغاة · مضافة) */
  legal_status?: string | null;
  /**
   * 🔴 نصُّ التعديل — والنافذُ فيه لا في المتن.
   * عُرفُ هيئة الخبراء أن يبقى المتنُ نصَّ المرسوم الأصليّ وتُثبَت التعديلاتُ
   * في حاشية: المادة 53 من نظام العمل تقول في متنها «تسعين يوماً» وفي حاشيتها
   * «(مائة وثمانين) يوماً» بالمرسوم م/44 لعام 1446هـ.
   */
  amendment_note?: string | null;
  /** حالةُ النظام نفسِه (ساري · لاغي · …) */
  statute_status?: string | null;
  /**
   * تعديلاتُ المادّة مفصولةً ومحسوبةَ الحال في الخادم.
   *
   * 🔑 الحسابُ هناك لا هنا: الخادمُ وحدَه يملك تاريخَ اليوم ومنطقَ التقويم
   *    الهجريّ. والواجهةُ تعرض ما حُكم به ولا تستنتج.
   */
  amendments?: Array<{
    text: string;
    state: string | null;
    on: string | null;
    latest: boolean;
  }>;
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
    /** أسئلةُ متابعةٍ مشتقّةٌ من المواد المسترجَعة نفسِها — لا عبارات عامة */
    suggestions?: string[];
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

// ═══════════════════════════════════════════════════════
//  البثّ الحيّ (SSE)
// ═══════════════════════════════════════════════════════

/** حدثُ مرحلةٍ يصل قبل الحروف — بأسماء الأنظمة التي تُفحص فعلاً */
export interface LawChatStage {
  stage: string;
  label: string;
  detail: string | null;
}

export interface LawChatStreamHandlers {
  onStage?: (s: LawChatStage) => void;
  onToken?: (t: string) => void;
  onDone?: (answer: LawChatAnswer) => void;
  onError?: (message: string) => void;
}

/**
 * سؤالٌ ببثٍّ حيّ — الحروفُ تصل أوّلاً بأوّل بدل سقوط الإجابة دفعةً.
 *
 * 🔑 `fetch` لا `EventSource`: الأخيرةُ لا تُرسل إلا GET ولا تحمل ترويسةَ
 * `Authorization`، ومسارُنا POST مُصادَق. فالقراءةُ يدويّةٌ من الجسم.
 *
 * 🩸 والحدثُ قد يصل **مقطوعاً في أيّ موضع** — حتى في منتصف حرفٍ عربيٍّ متعدّدِ
 * البايتات. لذلك `TextDecoder({stream:true})` الذي يحتفظ بالبايتات الناقصة،
 * ومخزنٌ نصّيٌّ لا يُقطَع إلا عند فاصل الأحداث `\n\n`.
 *
 * @returns دالّةُ إيقافٍ تقطع البثّ (زرّ «إيقاف»)
 */
export function streamLawChat(
  question: string,
  conversationId: number | null | undefined,
  handlers: LawChatStreamHandlers,
): () => void {
  const controller = new AbortController();
  const token = localStorage.getItem('authToken');

  (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/laws/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question, conversation_id: conversationId ?? undefined }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        // 🩸 الفشلُ قبل بدء البثّ يأتي رمزَ حالةٍ وجسمَ JSON عاديّ
        let message = 'تعذّر إرسال السؤال';
        try {
          const body: { message?: string; errors?: Record<string, string[]> } = await res.json();
          const firstFieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
          message = body?.message || firstFieldError || message;
        } catch { /* جسمٌ غير JSON — تُبقى الرسالةُ العامة */ }
        handlers.onError?.(message);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);

          let event = 'message';
          let data = '';
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (!data) continue;

          let payload: any;
          try { payload = JSON.parse(data); } catch { continue; }

          if (event === 'stage') handlers.onStage?.(payload as LawChatStage);
          else if (event === 'token') handlers.onToken?.(String(payload.t ?? ''));
          else if (event === 'done') handlers.onDone?.(payload as LawChatAnswer);
          else if (event === 'error') handlers.onError?.(String(payload.message ?? 'تعذّر توليد الإجابة'));
        }
      }
    } catch (e: any) {
      // الإيقافُ المتعمَّد ليس خطأً يُعرض
      if (e?.name !== 'AbortError') {
        handlers.onError?.(e?.message || 'انقطع الاتصال أثناء التوليد');
      }
    }
  })();

  return () => controller.abort();
}
