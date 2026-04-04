import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import { LegalServiceService } from '../../services/legalServiceService';
import type { ServiceTimeEntryItem } from '../../types/legalServices';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServiceTimerWidgetProps {
  serviceId: number;
  onTimerChange?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function secondsSince(startedAt: string): number {
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
}

// ─── Component ────────────────────────────────────────────────────────────────

const ServiceTimerWidget: React.FC<ServiceTimerWidgetProps> = ({
  serviceId,
  onTimerChange,
}) => {
  const [activeEntry, setActiveEntry] = useState<ServiceTimeEntryItem | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Tick ─────────────────────────────────────────────────────────────────

  const startTick = useCallback((startedAt: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setElapsed(secondsSince(startedAt));
    intervalRef.current = setInterval(() => {
      setElapsed(secondsSince(startedAt));
    }, 1000);
  }, []);

  const stopTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Fetch active timer on mount ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await LegalServiceService.getActiveTimer();
        if (cancelled) return;

        // Only claim it if it belongs to this service
        if (res.data && res.data.legal_service_id === serviceId) {
          setActiveEntry(res.data);
          setDescription(res.data.description ?? '');
          startTick(res.data.started_at);
        }
      } catch {
        // silently ignore — widget degrades to idle state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      stopTick();
    };
  }, [serviceId, startTick, stopTick]);

  // ── Start ─────────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const res = await LegalServiceService.startTimer(serviceId, description || undefined);
      setActiveEntry(res.data);
      startTick(res.data.started_at);
      onTimerChange?.();
    } catch (err) {
      console.error('Failed to start timer', err);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Stop ──────────────────────────────────────────────────────────────────

  const handleStop = async () => {
    if (!activeEntry) return;
    setActionLoading(true);
    try {
      await LegalServiceService.stopTimer(serviceId, activeEntry.id);
      stopTick();
      setActiveEntry(null);
      setElapsed(0);
      setDescription('');
      onTimerChange?.();
    } catch (err) {
      console.error('Failed to stop timer', err);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const isRunning = activeEntry !== null;

  if (loading) {
    return (
      <div className="lsd-timer-widget" dir="rtl">
        <div className="lsd-timer-widget__header">
          <div className="lsd-timer-widget__title">
            <Clock size={15} />
            تتبع الوقت
          </div>
          <div className="lsd-timer-widget__status-dot" />
        </div>
        <div className="lsd-timer-widget__display">
          <div className="lsd-timer-widget__elapsed" style={{ opacity: 0.3 }}>
            --:--:--
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={['lsd-timer-widget', isRunning ? 'lsd-timer-widget--running' : '']
        .filter(Boolean)
        .join(' ')}
      dir="rtl"
    >
      {/* Header */}
      <div className="lsd-timer-widget__header">
        <div className="lsd-timer-widget__title">
          <Clock size={15} />
          تتبع الوقت
        </div>
        <div className="lsd-timer-widget__status-dot" />
      </div>

      {/* Elapsed display */}
      <div className="lsd-timer-widget__display">
        <div className="lsd-timer-widget__elapsed lsd-timer-display">
          {formatElapsed(elapsed)}
        </div>
        <div className="lsd-timer-widget__label">
          {isRunning ? 'جاري التسجيل' : 'لا يوجد مؤقت نشط'}
        </div>
      </div>

      {/* Description input (only when running) */}
      {isRunning && (
        <textarea
          className="asm-textarea"
          rows={2}
          placeholder="وصف المهمة (اختياري)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: 54, fontSize: 12 }}
        />
      )}

      {/* Controls */}
      <div className="lsd-timer-widget__controls">
        {!isRunning ? (
          <button
            className="lsd-timer-btn lsd-timer-btn--start"
            onClick={handleStart}
            disabled={actionLoading}
          >
            <Play size={14} />
            {actionLoading ? 'جاري البدء...' : 'بدء المؤقت'}
          </button>
        ) : (
          <button
            className="lsd-timer-btn lsd-timer-btn--stop"
            onClick={handleStop}
            disabled={actionLoading}
          >
            <Square size={14} />
            {actionLoading ? 'جاري الإيقاف...' : 'إيقاف المؤقت'}
          </button>
        )}
      </div>
    </div>
  );
};

export default ServiceTimerWidget;
