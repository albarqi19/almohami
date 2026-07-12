// Hooks لـ «رفيق الجلسة» — مساعد التحضير والتدوين
// - useCopilotBriefcase: polling ذكي أثناء generating (نمط useSessionAiBrief، سقف 90 ثانية)
// - useCopilotRun: polling 10s ما دامت التشغيلة حية
// - useCopilotAlerts: مراكمة التنبيهات بمؤشر after_id (نمط ServiceTeamChat 4s/30s)
// - useCopilotReport: polling 5s أثناء توليد التقرير

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SessionCopilotService,
  type AlertStatus,
  type AlertsPollResult,
  type BriefcaseUpdatePayload,
  type BriefcaseWatchItem,
  type CopilotAlertItem,
  type CopilotBriefcaseData,
  type CopilotReportResponse,
  type CopilotRunData,
  type RunStatus,
} from '../services/sessionCopilotService';

// ═══════════════════════════════════════════════════════
//  الحقيبة — polling ذكي أثناء التوليد
// ═══════════════════════════════════════════════════════

/**
 * Polling ذكي (نفس نمط useSessionAiBrief):
 * - كل 5 ثوانٍ فقط إذا كانت الحالة generating
 * - يتوقف عند tab hidden
 * - سقف 90 ثانية
 */
export function useCopilotBriefcase(sessionId: number) {
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const [docVisible, setDocVisible] = useState<boolean>(typeof document !== 'undefined' ? !document.hidden : true);

  useEffect(() => {
    const handler = () => setDocVisible(!document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  return useQuery({
    queryKey: ['copilotBriefcase', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<CopilotBriefcaseData> => SessionCopilotService.getBriefcase(sessionId),
    refetchInterval: (query) => {
      const data = query.state.data as CopilotBriefcaseData | undefined;
      if (!data) return false;
      if (data.status !== 'generating') {
        if (pollStartedAt !== null) setPollStartedAt(null);
        return false;
      }
      if (!docVisible) return false;
      if (pollStartedAt === null) {
        setPollStartedAt(Date.now());
        return 5000;
      }
      // سقف 90 ثانية
      if (Date.now() - pollStartedAt > 90_000) {
        return false;
      }
      return 5000;
    },
    refetchOnWindowFocus: false,
  });
}

export function useGenerateBriefcase(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => SessionCopilotService.generateBriefcase(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['copilotBriefcase', sessionId] });
    },
  });
}

export function useUpdateBriefcase(sessionId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BriefcaseUpdatePayload) => SessionCopilotService.updateBriefcase(sessionId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['copilotBriefcase', sessionId] });
      qc.invalidateQueries({ queryKey: ['copilotRun', sessionId] });
    },
  });
}

// ═══════════════════════════════════════════════════════
//  التشغيلة الحية
// ═══════════════════════════════════════════════════════

/** polling كل 10 ثوانٍ ما دامت التشغيلة حية (لرصد انتقال live → ended). */
export function useCopilotRun(sessionId: number) {
  return useQuery({
    queryKey: ['copilotRun', sessionId],
    enabled: !!sessionId,
    queryFn: async (): Promise<CopilotRunData> => SessionCopilotService.getRunForSession(sessionId),
    refetchInterval: (query) => {
      const data = query.state.data as CopilotRunData | undefined;
      return data?.status === 'live' ? 10_000 : false;
    },
    refetchOnWindowFocus: false,
  });
}

// ═══════════════════════════════════════════════════════
//  التنبيهات — مراكمة بمؤشر after_id (نمط ServiceTeamChat)
// ═══════════════════════════════════════════════════════

export interface CopilotAlertsState {
  alerts: CopilotAlertItem[];
  watchlist: BriefcaseWatchItem[];
  runStatus: RunStatus | null;
  /** تعديل حالة تنبيه محلياً بعد نجاح mutation (المؤشر لا يعيد جلب القدامى) */
  patchAlert: (alertId: number, status: AlertStatus) => void;
  refresh: () => void;
}

/**
 * مراكمة التنبيهات: كل جلب يمرّر after_id = آخر id معلوم فتصل الجديدة فقط
 * وتُلحق بالقائمة المحلية. polling كل 4 ثوانٍ أثناء live وإلا كل 30 ثانية.
 */
export function useCopilotAlerts(runId: number | undefined, enabled: boolean, live: boolean): CopilotAlertsState {
  const [alerts, setAlerts] = useState<CopilotAlertItem[]>([]);
  const [watchlist, setWatchlist] = useState<BriefcaseWatchItem[]>([]);
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const cursorRef = useRef(0);
  const busyRef = useRef(false);

  // تصفير الحالة عند تغيّر التشغيلة
  useEffect(() => {
    setAlerts([]);
    setWatchlist([]);
    setRunStatus(null);
    cursorRef.current = 0;
  }, [runId]);

  const fetchAlerts = useCallback(async () => {
    if (!runId || busyRef.current) return;
    busyRef.current = true;
    try {
      const res: AlertsPollResult = await SessionCopilotService.getAlerts(runId, cursorRef.current);
      if (res.alerts.length > 0) {
        cursorRef.current = res.alerts[res.alerts.length - 1].id;
        setAlerts((prev) => {
          const known = new Set(prev.map((a) => a.id));
          const fresh = res.alerts.filter((a) => !known.has(a.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      }
      setWatchlist(res.watchlist ?? []);
      setRunStatus(res.run_status);
    } catch {
      /* polling صامت — لا نزعج بالمحاولات الفاشلة العابرة */
    } finally {
      busyRef.current = false;
    }
  }, [runId]);

  useEffect(() => {
    if (!enabled || !runId) return;
    fetchAlerts();
    const interval = window.setInterval(fetchAlerts, live ? 4000 : 30_000);
    return () => window.clearInterval(interval);
  }, [enabled, runId, live, fetchAlerts]);

  const patchAlert = useCallback((alertId: number, status: AlertStatus) => {
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status } : a)));
  }, []);

  return { alerts, watchlist, runStatus, patchAlert, refresh: fetchAlerts };
}

export function useUpdateAlert(runId: number | undefined) {
  return useMutation({
    mutationFn: ({ alertId, status }: { alertId: number; status: 'dismissed' | 'accepted' }) => {
      if (!runId) return Promise.reject(new Error('لا توجد تشغيلة'));
      return SessionCopilotService.updateAlert(runId, alertId, status);
    },
  });
}

export function useEndRun(sessionId: number, runId: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => {
      if (!runId) return Promise.reject(new Error('لا توجد تشغيلة'));
      return SessionCopilotService.endRun(runId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['copilotRun', sessionId] });
      if (runId) qc.invalidateQueries({ queryKey: ['copilotReport', runId] });
    },
  });
}

// ═══════════════════════════════════════════════════════
//  التقرير البعدي
// ═══════════════════════════════════════════════════════

/**
 * polling كل 5 ثوانٍ أثناء generating؛ وكل 15 ثانية أثناء live
 * (لتحديث عدّادات الإحصاءات في الشريط الحي).
 */
export function useCopilotReport(runId: number | undefined, enabled: boolean, runLive: boolean = false) {
  return useQuery({
    queryKey: ['copilotReport', runId],
    enabled: enabled && !!runId,
    queryFn: async (): Promise<CopilotReportResponse> => SessionCopilotService.getReport(runId as number),
    refetchInterval: (query) => {
      const data = query.state.data as CopilotReportResponse | undefined;
      if (data?.report_status === 'generating') return 5000;
      if (runLive) return 15_000;
      return false;
    },
    refetchOnWindowFocus: false,
  });
}
