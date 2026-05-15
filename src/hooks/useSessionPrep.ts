// Hooks لـ "غرفة تحضير الجلسة"
// - useSessionWorkspace: parent hook لجلب session + counts + readiness + ai status في query واحد (يمنع race conditions)
// - useSessionPreparations / useSessionMotions: قوائم تفصيلية
// - useSessionAiBrief: مع polling ذكي عند generating
// - useNeighborSessions: للـ horizontal session switcher

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import {
  SessionPrepService,
  type SessionPreparation,
  type SessionMotion,
  type MotionStatus,
  type MotionTag,
  type AiBriefResponse,
  type ApplyActionItem,
} from '../services/sessionPrepService';

// ═══════════════════════════════════════════════════════
//  Workspace meta (single source for header/stats)
// ═══════════════════════════════════════════════════════

export interface SessionWorkspaceData {
  id: number;
  case_id: number;
  session_type: string | null;
  session_date: string | null;
  session_date_gregorian: string | null;
  session_time: string | null;
  status: string;
  court: string | null;
  department: string | null;
  method: string | null;
  location: string | null;
  notes: string | null;
  readiness_score: number | null;
  readiness_status: 'ready' | 'needs_review' | 'high_risk' | 'unknown';
  ai_brief_status: 'pending' | 'generating' | 'ready' | 'failed' | 'stale';
  ai_brief_id: number | null;
  ai_brief_generated_at: string | null;
  preparations_count?: number;
  completed_preparations_count?: number;
  motions_count?: number;
  ready_motions_count?: number;
  case?: {
    id: number;
    title: string;
    file_number: string;
    case_type_arabic: string | null;
    client_name: string | null;
    court: string | null;
    lawyers?: Array<{ id: number; name: string }>;
    primaryLawyer?: Array<{ id: number; name: string }> | null;
    primary_lawyer?: Array<{ id: number; name: string }> | null;
  };
}

interface SessionSingleEnvelope {
  success: boolean;
  data: SessionWorkspaceData;
  message?: string;
}

/**
 * الـ Workspace Hook الرئيسي.
 * يستخدم endpoint مفرد GET /sessions/{id} لجلب الجلسة مع counts + readiness + ai_brief_status.
 */
export function useSessionWorkspace(sessionId: number | null) {
  return useQuery({
    queryKey: ['sessionWorkspace', sessionId],
    enabled: !!sessionId,
    staleTime: 30_000,
    queryFn: async (): Promise<SessionWorkspaceData | null> => {
      if (!sessionId) return null;
      const res = await apiClient.get<SessionSingleEnvelope>(`/sessions/${sessionId}`);
      if (!res.success) throw new Error(res.message || 'فشل في جلب الجلسة');
      return res.data ?? null;
    },
  });
}

// ═══════════════════════════════════════════════════════
//  Preparations
// ═══════════════════════════════════════════════════════

export function useSessionPreparations(sessionId: number) {
  return useQuery({
    queryKey: ['sessionPreparations', sessionId],
    enabled: !!sessionId,
    queryFn: () => SessionPrepService.getPreparations(sessionId),
  });
}

export function useCreatePreparation(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; notes?: string | null }) =>
      SessionPrepService.createPreparation(sessionId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionPreparations', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

export function useUpdatePreparation(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ prepId, payload }: { prepId: number; payload: { title?: string; notes?: string | null } }) =>
      SessionPrepService.updatePreparation(sessionId, prepId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessionPreparations', sessionId] }),
  });
}

export function useTogglePreparation(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prepId: number) => SessionPrepService.togglePreparation(sessionId, prepId),
    onMutate: async (prepId: number) => {
      // Optimistic update — toggle is_completed locally
      await qc.cancelQueries({ queryKey: ['sessionPreparations', sessionId] });
      const previous = qc.getQueryData(['sessionPreparations', sessionId]) as
        | { items: SessionPreparation[]; progress: number }
        | undefined;
      if (previous) {
        const items = previous.items.map((p) =>
          p.id === prepId ? { ...p, is_completed: !p.is_completed } : p
        );
        const completedCount = items.filter((i) => i.is_completed).length;
        const progress = items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);
        qc.setQueryData(['sessionPreparations', sessionId], { items, progress });
      }
      return { previous };
    },
    onError: (_e, _prepId, ctx) => {
      if (ctx?.previous) qc.setQueryData(['sessionPreparations', sessionId], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['sessionPreparations', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

export function useDeletePreparation(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prepId: number) => SessionPrepService.deletePreparation(sessionId, prepId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionPreparations', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

// ═══════════════════════════════════════════════════════
//  Motions
// ═══════════════════════════════════════════════════════

export function useSessionMotions(sessionId: number) {
  return useQuery({
    queryKey: ['sessionMotions', sessionId],
    enabled: !!sessionId,
    queryFn: () => SessionPrepService.getMotions(sessionId),
  });
}

export function useCreateMotion(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; body?: string | null; tag?: MotionTag | null; status?: MotionStatus }) =>
      SessionPrepService.createMotion(sessionId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionMotions', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

export function useUpdateMotion(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ motionId, payload }: { motionId: number; payload: Partial<{ title: string; body: string | null; tag: MotionTag | null; result_note: string | null }> }) =>
      SessionPrepService.updateMotion(sessionId, motionId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessionMotions', sessionId] }),
  });
}

export function useUpdateMotionStatus(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ motionId, status, resultNote }: { motionId: number; status: MotionStatus; resultNote?: string }) =>
      SessionPrepService.updateMotionStatus(sessionId, motionId, status, resultNote),
    onMutate: async ({ motionId, status }) => {
      await qc.cancelQueries({ queryKey: ['sessionMotions', sessionId] });
      const previous = qc.getQueryData(['sessionMotions', sessionId]) as
        | { items: SessionMotion[]; counts: Record<string, number> }
        | undefined;
      if (previous) {
        const items = previous.items.map((m) => (m.id === motionId ? { ...m, status } : m));
        qc.setQueryData(['sessionMotions', sessionId], { ...previous, items });
      }
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['sessionMotions', sessionId], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['sessionMotions', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

export function useDeleteMotion(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (motionId: number) => SessionPrepService.deleteMotion(sessionId, motionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionMotions', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

// ═══════════════════════════════════════════════════════
//  AI Brief — with smart polling
// ═══════════════════════════════════════════════════════

/**
 * Polling ذكي:
 * - فقط إذا كانت الحالة generating
 * - يتوقف عند tab hidden
 * - timeout 60s
 */
export function useSessionAiBrief(sessionId: number) {
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const [docVisible, setDocVisible] = useState<boolean>(typeof document !== 'undefined' ? !document.hidden : true);

  useEffect(() => {
    const handler = () => setDocVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return useQuery({
    queryKey: ['sessionAiBrief', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<AiBriefResponse> => SessionPrepService.getAiBrief(sessionId),
    refetchInterval: (query) => {
      const data = query.state.data as AiBriefResponse | undefined;
      if (!data) return false;
      if (data.status !== 'generating') {
        if (pollStartedAt !== null) setPollStartedAt(null);
        return false;
      }
      if (!docVisible) return false;
      // Set start time on first generating poll
      if (pollStartedAt === null) {
        setPollStartedAt(Date.now());
        return 5000;
      }
      // Timeout 60s
      if (Date.now() - pollStartedAt > 60_000) {
        return false;
      }
      return 5000;
    },
    refetchOnWindowFocus: false,
  });
}

export function useGenerateAiBrief(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => SessionPrepService.generateAiBrief(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionAiBrief', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

export function useRegenerateAiBrief(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => SessionPrepService.regenerateAiBrief(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionAiBrief', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

export function useApplyAiActions(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: ApplyActionItem[]) => SessionPrepService.applyActions(sessionId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionPreparations', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionMotions', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

export function useReviewAiBrief(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => SessionPrepService.reviewBrief(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionAiBrief', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

// ═══════════════════════════════════════════════════════
//  Defaults
// ═══════════════════════════════════════════════════════

export function useImportDefaults(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => SessionPrepService.importDefaults(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionPreparations', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionMotions', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

export function useImportFromSession(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceSessionId: number) => SessionPrepService.importFromSession(sessionId, sourceSessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessionPreparations', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionMotions', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessionWorkspace', sessionId] });
    },
  });
}

// ═══════════════════════════════════════════════════════
//  Neighbor sessions (السابقة/التالية) للـ horizontal switcher
// ═══════════════════════════════════════════════════════

export interface NeighborSessions {
  previous: { id: number; session_date: string | null; session_type: string | null } | null;
  next: { id: number; session_date: string | null; session_type: string | null } | null;
}

/**
 * يعطي الجلسة السابقة والتالية من نفس القضية (مرتبة بالتاريخ).
 * يستخدم endpoint /sessions/case/{caseId} الموجود.
 */
export function useNeighborSessions(caseId: number | undefined, currentSessionId: number | undefined) {
  return useQuery({
    queryKey: ['neighborSessions', caseId, currentSessionId],
    enabled: !!caseId && !!currentSessionId,
    staleTime: 60_000,
    queryFn: async (): Promise<NeighborSessions> => {
      if (!caseId || !currentSessionId) return { previous: null, next: null };
      const res = await apiClient.get<{ success: boolean; data: Array<{ id: number; session_date: string | null; session_date_gregorian: string | null; session_type: string | null }> }>(
        `/sessions/case/${caseId}`
      );
      if (!res.success) return { previous: null, next: null };

      // sort ascending by date for deterministic neighbor lookup
      const sorted = [...res.data].sort((a, b) => {
        const da = a.session_date_gregorian || a.session_date || '';
        const db = b.session_date_gregorian || b.session_date || '';
        return da.localeCompare(db);
      });

      const idx = sorted.findIndex((s) => s.id === currentSessionId);
      if (idx === -1) return { previous: null, next: null };
      return {
        previous: idx > 0 ? { id: sorted[idx - 1].id, session_date: sorted[idx - 1].session_date_gregorian || sorted[idx - 1].session_date, session_type: sorted[idx - 1].session_type } : null,
        next: idx < sorted.length - 1 ? { id: sorted[idx + 1].id, session_date: sorted[idx + 1].session_date_gregorian || sorted[idx + 1].session_date, session_type: sorted[idx + 1].session_type } : null,
      };
    },
  });
}
