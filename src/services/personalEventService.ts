import { apiClient } from '../utils/api';
import type { MeetingColor } from './meetingService';
import type { AgendaSource } from './myDayService';

export type PersonalEventKind = 'appointment' | 'reminder';

export interface PersonalEvent {
  id: number;
  kind: PersonalEventKind;
  title: string;
  notes: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  color: MeetingColor;
  blocks_availability: boolean;
  reminder_minutes: number | null;
}

export interface PersonalEventPayload {
  kind?: PersonalEventKind;
  title: string;
  notes?: string | null;
  /** محلّي بلا منطقة زمنية: «YYYY-MM-DDTHH:mm:00» */
  starts_at: string;
  ends_at?: string | null;
  all_day?: boolean;
  color?: MeetingColor;
  blocks_availability?: boolean;
  reminder_minutes?: number | null;
}

export const personalEventService = {
  async create(payload: PersonalEventPayload): Promise<PersonalEvent> {
    const response = await apiClient.post<{ success: boolean; data: PersonalEvent }>('/personal-events', payload);
    return response.data;
  },

  async update(id: number, payload: Partial<PersonalEventPayload>): Promise<PersonalEvent> {
    const response = await apiClient.put<{ success: boolean; data: PersonalEvent }>(`/personal-events/${id}`, payload);
    return response.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/personal-events/${id}`);
  },
};

// ─── تعليقات بنود الأجندة ───────────────────────────────────

export interface AgendaComment {
  id: number;
  content: string;
  author_id: number;
  created_at: string;
  author?: { id: number; name: string };
}

/**
 * المصادر التي تقبل التعليق.
 *
 * المهمة مستثناة عمداً: لها خيط `task_comments` كامل بالمنشن ودعم «رائد»،
 * وخيطان على الكيان نفسه خطأ تصميمي لا ميزة. لوحة التفاصيل تُحيل إلى صفحة
 * المهمة بدل أن تفتح خيطاً ثانياً.
 */
export const COMMENTABLE_SOURCES: AgendaSource[] = [
  'session', 'deadline', 'meeting', 'client_meeting', 'personal',
];

export const agendaCommentService = {
  supports(source: AgendaSource): boolean {
    return COMMENTABLE_SOURCES.includes(source);
  },

  async list(source: AgendaSource, id: number): Promise<AgendaComment[]> {
    const response = await apiClient.get<{ success: boolean; data: AgendaComment[] }>(
      `/agenda/${source}/${id}/comments`
    );
    return response.data ?? [];
  },

  async add(source: AgendaSource, id: number, content: string): Promise<AgendaComment> {
    const response = await apiClient.post<{ success: boolean; data: AgendaComment }>(
      `/agenda/${source}/${id}/comments`,
      { content }
    );
    return response.data;
  },

  async remove(source: AgendaSource, id: number, commentId: number): Promise<void> {
    await apiClient.delete(`/agenda/${source}/${id}/comments/${commentId}`);
  },
};

export default personalEventService;
