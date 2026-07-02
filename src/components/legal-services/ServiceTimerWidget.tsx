import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { LegalServiceService } from '../../services/legalServiceService';
import { getApiErrorMessage } from '../../utils/apiError';
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
  // فشل جلب المؤقت النشط — يُعرض داخل الودجت مع زر إعادة محاولة بدل الابتلاع الصامت
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

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

  // ── Fetch active timer on mount (or on retry via reloadKey) ───────────────

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

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
      } catch (err) {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(err, 'تعذّر التحقق من وجود مؤقت نشط'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      stopTick();
    };
  }, [serviceId, reloadKey, startTick, stopTick]);

  // ── Start ─────────────────────────────────────────────────────────────────

  const handleStart = async () => {
    setActionLoading(true);
    try {
      const res = await LegalServiceService.startTimer(serviceId, description.trim() || undefined);
      setActiveEntry(res.data);
      startTick(res.data.started_at);
      onTimerChange?.();
    } catch (err) {
      // رسالة الخادم العربية كما هي (مثل: مؤقت نشط على خدمة أخرى)
      toast.error(getApiErrorMessage(err, 'تعذّر بدء المؤقت'));
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
      toast.error(getApiErrorMessage(err, 'تعذّر إيقاف المؤقت'));
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
          <div className="lsd-timer-widget__label">جارٍ التحقق من المؤقت...</div>
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

      {/* فشل جلب حالة المؤقت — رسالة الخادم + إعادة محاولة */}
      {loadError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 12,
            color: 'var(--status-red)',
            background: 'var(--status-red-light)',
            border: '1px solid var(--status-red)',
            borderRadius: 6,
            padding: '6px 10px',
          }}
        >
          <span>{loadError}</span>
          <button
            type="button"
            className="lsd-timer-btn lsd-timer-btn--secondary"
            style={{ flex: '0 0 auto', padding: '4px 10px' }}
            onClick={() => setReloadKey((k) => k + 1)}
          >
            <RefreshCw size={12} />
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Elapsed display */}
      <div className="lsd-timer-widget__display">
        <div className="lsd-timer-widget__elapsed lsd-timer-display">
          {formatElapsed(elapsed)}
        </div>
        <div className="lsd-timer-widget__label">
          {isRunning ? 'جاري التسجيل' : 'لا يوجد مؤقت نشط'}
        </div>
        {/* حالة الفراغ: ماذا أفعل الآن؟ ولماذا يهمّني؟ */}
        {!isRunning && (
          <div
            style={{
              fontSize: 11.5,
              lineHeight: 1.7,
              color: 'var(--color-text-secondary)',
              marginTop: 6,
            }}
          >
            اضغط «بدء المؤقت» لتسجيل وقت عملك على هذه الخدمة — الساعات المسجّلة تدخل في الفوترة بالساعة.
          </div>
        )}
      </div>

      {/* وصف المهمة — يُدخل قبل البدء (يُرسل مع بدء المؤقت)، ويُعرض للقراءة أثناء التسجيل */}
      <textarea
        className="asm-textarea"
        rows={2}
        placeholder="ما الذي ستعمل عليه؟ (اختياري)..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        readOnly={isRunning}
        title={isRunning ? 'الوصف يُحدَّد عند بدء المؤقت — أوقفه ثم ابدأ مؤقتاً جديداً لتغييره' : undefined}
        style={{ minHeight: 54, fontSize: 12, opacity: isRunning ? 0.75 : 1 }}
      />

      {/* Controls */}
      <div className="lsd-timer-widget__controls">
        {!isRunning ? (
          <button
            className="lsd-timer-btn lsd-timer-btn--start"
            onClick={handleStart}
            disabled={actionLoading}
            title={actionLoading ? 'جارٍ بدء المؤقت — انتظر لحظة' : 'بدء تسجيل الوقت على هذه الخدمة'}
          >
            <Play size={14} />
            {actionLoading ? 'جاري البدء...' : 'بدء المؤقت'}
          </button>
        ) : (
          <button
            className="lsd-timer-btn lsd-timer-btn--stop"
            onClick={handleStop}
            disabled={actionLoading}
            title={actionLoading ? 'جارٍ إيقاف المؤقت — انتظر لحظة' : 'إيقاف المؤقت وحفظ المدة المسجّلة'}
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
