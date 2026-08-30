// هوكات «الأنظمة» — TanStack Query فوق LawsService

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LawsService } from '../services/lawsService';
import type { LawChatAnswer } from '../services/lawsService';

export function useLawStatutes() {
  return useQuery({
    queryKey: ['laws', 'statutes'],
    queryFn: () => LawsService.getStatutes(),
    staleTime: 60 * 60 * 1000, // الفهرس شبه ثابت — يتغيّر فقط عند إعادة الاستيراد
  });
}

/**
 * حجمُ الذخيرة كما هو الآن — يُشتقّ من فهرس الأنظمة المُحمَّل، لا يُكتب رقماً.
 *
 * 🩸 كان العددُ مثبَّتاً نصّاً في ثلاثة مواضع («من 75 نظاماً ولائحة»)، فبقي 75
 * بينما صارت الذخيرةُ 602 نظاماً و22,840 مادة — أي أن الواجهةَ كانت تَعِد المحامي
 * بأقلَّ من ثُمنِ ما تملك، وتكذب عليه من حيث أرادت طمأنته. والفهرسُ محمَّلٌ أصلاً
 * ومخزَّنٌ ساعةً في TanStack Query، فالاشتقاقُ بلا نداءٍ إضافيّ.
 *
 * ويُرجع null ما دام الفهرسُ لم يصل — فلا يُعرض رقمٌ صفريٌّ لحظةَ التحميل.
 */
export function useLawCorpusSize() {
  const { data: statutes } = useLawStatutes();

  if (!statutes || statutes.length === 0) {
    return { statutes: null, articles: null };
  }

  return {
    statutes: statutes.length,
    articles: statutes.reduce((sum, s) => sum + (s.articles_count || 0), 0),
  };
}

export function useLawStatute(serial: string | null) {
  return useQuery({
    queryKey: ['laws', 'statute', serial],
    queryFn: () => LawsService.getStatute(serial!),
    enabled: !!serial,
    staleTime: 60 * 60 * 1000,
  });
}

export function useLawSmartSearch() {
  return useMutation({
    mutationFn: (query: string) => LawsService.smartSearch(query),
  });
}

export function useLawConversations() {
  return useQuery({
    queryKey: ['laws', 'chats'],
    queryFn: () => LawsService.getConversations(),
  });
}

export function useLawConversation(id: number | null) {
  return useQuery({
    queryKey: ['laws', 'chat', id],
    queryFn: () => LawsService.getConversation(id!),
    enabled: !!id,
  });
}

export function useSendLawChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ question, conversationId }: { question: string; conversationId?: number | null }) =>
      LawsService.sendChat(question, conversationId),
    onSuccess: (answer: LawChatAnswer) => {
      queryClient.invalidateQueries({ queryKey: ['laws', 'chat', answer.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['laws', 'chats'] });
    },
  });
}

export function useDeleteLawConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => LawsService.deleteConversation(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['laws', 'chat', id] });
      queryClient.invalidateQueries({ queryKey: ['laws', 'chats'] });
    },
  });
}
