import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock, FileText, AlertCircle } from 'lucide-react';
import { TimeService, type TimeEntry } from '../services/timeService';
import { useTimer } from '../contexts/TimerContext';

interface TaskTimerProps {
  taskId: string;
  taskTitle?: string;
  caseTitle?: string;
  compact?: boolean; // عرض مضغوط بدون سجل الوقت
}

const TaskTimer: React.FC<TaskTimerProps> = ({ taskId, taskTitle, caseTitle, compact = false }) => {
  const { timerState, startTimer, stopTimer, isLoading } = useTimer();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  const isTimerForThisTask = timerState.isRunning && timerState.taskId === taskId;

  useEffect(() => {
    loadTimeEntries();
  }, [taskId]);

  const loadTimeEntries = async () => {
    setLoadingEntries(true);
    try {
      const response = await TimeService.getTaskEntries(taskId);
      setEntries(response.entries);
      setTotalSeconds(response.total_seconds);
    } catch (error) {
      console.error('Failed to load time entries:', error);
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleStartTimer = async () => {
    try {
      await startTimer(taskId, taskTitle, caseTitle);
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStopTimer = async () => {
    try {
      await stopTimer();
      await loadTimeEntries();
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    // Ensure we have a positive integer
    const totalSeconds = Math.max(0, Math.floor(Math.abs(seconds || 0)));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 7) return `منذ ${diffDays} يوم`;
    return date.toLocaleDateString('ar-SA');
  };

  const displayTotalSeconds = isTimerForThisTask
    ? totalSeconds + timerState.elapsedSeconds
    : totalSeconds;

  // عرض مضغوط للاستخدام في النوافذ المحدودة
  if (compact) {
    return (
      <div className="task-timer-compact">
        <button
          className={`task-timer-compact__btn ${isTimerForThisTask ? 'task-timer-compact__btn--running' : ''}`}
          onClick={isTimerForThisTask ? handleStopTimer : handleStartTimer}
          disabled={isLoading || (timerState.isRunning && !isTimerForThisTask)}
          title={
            timerState.isRunning && !isTimerForThisTask
              ? 'يوجد تايمر نشط في مهمة أخرى'
              : isTimerForThisTask
                ? 'إيقاف التايمر'
                : 'بدء تتبع الوقت'
          }
        >
          {isLoading ? (
            <span className="task-timer-compact__loader" />
          ) : isTimerForThisTask ? (
            <Pause size={14} />
          ) : (
            <Play size={14} />
          )}
          <span className="task-timer-compact__time">
            {isTimerForThisTask ? formatTime(timerState.elapsedSeconds) : formatTime(totalSeconds)}
          </span>
        </button>

        <style>{`
          .task-timer-compact__btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            background: var(--color-surface-subtle, #f8f9fa);
            border: 1px solid var(--color-border, #e5e5e5);
            border-radius: 6px;
            font-size: 12px;
            font-family: 'SF Mono', 'Consolas', monospace;
            color: var(--color-text-secondary, #666);
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .task-timer-compact__btn:hover:not(:disabled) {
            background: var(--color-primary-soft, rgba(10, 25, 47, 0.08));
            border-color: var(--color-primary, #0A192F);
            color: var(--color-primary, #0A192F);
          }

          .task-timer-compact__btn--running {
            background: var(--color-success, #1B998B);
            border-color: var(--color-success, #1B998B);
            color: white;
            animation: compact-timer-pulse 2s infinite;
          }

          .task-timer-compact__btn--running:hover:not(:disabled) {
            background: #178a7d;
            border-color: #178a7d;
            color: white;
          }

          @keyframes compact-timer-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(27, 153, 139, 0.3); }
            50% { box-shadow: 0 0 0 4px rgba(27, 153, 139, 0); }
          }

          .task-timer-compact__btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .task-timer-compact__loader {
            width: 14px;
            height: 14px;
            border: 2px solid rgba(0, 0, 0, 0.1);
            border-top-color: currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .task-timer-compact__time {
            min-width: 55px;
            text-align: center;
          }

          body.dark .task-timer-compact__btn {
            background: var(--color-surface-subtle);
            border-color: var(--color-border);
          }
        `}</style>
      </div>
    );
  }

  // ── النسخة الكاملة: مسطّحة بالنمط الملتصق (تُستخدم في مساحة المهمة) ──
  return (
    <div className="task-timer task-timer--fused">
      {/* شريط التحكم: القراءة الكبيرة + زر مسطّح */}
      <div className="task-timer__bar">
        <div className="task-timer__readout">
          <span className={`task-timer__value ${isTimerForThisTask ? 'task-timer__value--running' : ''}`}>
            {isTimerForThisTask ? formatTime(timerState.elapsedSeconds) : formatTime(displayTotalSeconds)}
          </span>
          <span className="task-timer__label">
            {isTimerForThisTask ? (
              <><span className="task-timer__live-dot" /> يعمل الآن</>
            ) : (
              'الإجمالي المسجّل'
            )}
          </span>
        </div>
        <button
          className={`task-timer__btn ${isTimerForThisTask ? 'task-timer__btn--stop' : 'task-timer__btn--start'}`}
          onClick={isTimerForThisTask ? handleStopTimer : handleStartTimer}
          disabled={isLoading || (timerState.isRunning && !isTimerForThisTask)}
          title={
            timerState.isRunning && !isTimerForThisTask
              ? 'يوجد تايمر نشط في مهمة أخرى'
              : isTimerForThisTask
                ? 'إيقاف التايمر'
                : 'بدء التايمر'
          }
        >
          {isLoading ? (
            <span className="task-timer__loader" />
          ) : isTimerForThisTask ? (
            <Pause size={15} />
          ) : (
            <Play size={15} />
          )}
          <span>{isTimerForThisTask ? 'إيقاف' : 'بدء'}</span>
        </button>
      </div>

      {isTimerForThisTask && (
        <div className="task-timer__running-total">
          <Clock size={12} /> الإجمالي مع الجلسة الحالية: {formatTime(displayTotalSeconds)}
        </div>
      )}

      {timerState.isRunning && !isTimerForThisTask && (
        <div className="task-timer__warning">
          <AlertCircle size={12} /> التايمر يعمل على: {timerState.taskTitle || 'مهمة أخرى'}
        </div>
      )}

      {/* سجل الوقت */}
      <div className="task-timer__log">
        <div className="task-timer__log-head"><Clock size={13} /> سجل الوقت</div>

        {loadingEntries ? (
          <div className="task-timer__log-empty">جارٍ التحميل...</div>
        ) : entries.length === 0 ? (
          <div className="task-timer__log-empty">لم يُسجَّل وقت بعد</div>
        ) : (
          <div className="task-timer__log-list">
            {entries.slice(0, 5).map((entry) => {
              const hasNote = !!entry.description && entry.description.trim().length > 0;
              const isExpanded = expandedEntryId === entry.id;
              return (
                <div key={entry.id} className="task-timer__entry-wrap">
                  <div className="task-timer__entry">
                    <div className="task-timer__entry-user">
                      <div className="task-timer__entry-avatar">
                        {entry.user?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="task-timer__entry-name">{entry.user?.name || 'مستخدم'}</span>
                    </div>
                    <div className="task-timer__entry-duration">
                      {entry.ended_at ? formatTime(entry.duration_seconds) : (
                        <span className="task-timer__entry-running">جاري...</span>
                      )}
                    </div>
                    <div className="task-timer__entry-date">
                      {formatDate(entry.started_at)}
                    </div>
                    {hasNote && (
                      <button
                        type="button"
                        className={`task-timer__entry-note-btn ${isExpanded ? 'task-timer__entry-note-btn--open' : ''}`}
                        onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                        title={isExpanded ? 'إخفاء ما أُنجز' : 'عرض ما أُنجز'}
                        aria-expanded={isExpanded}
                      >
                        <FileText size={13} />
                      </button>
                    )}
                  </div>
                  {hasNote && isExpanded && (
                    <div className="task-timer__entry-note">{entry.description}</div>
                  )}
                </div>
              );
            })}

            {entries.length > 5 && (
              <div className="task-timer__log-more">
                +{entries.length - 5} سجلات أخرى
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .task-timer--fused { padding: 0; }

        /* شريط التحكم */
        .task-timer__bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 14px;
        }

        .task-timer__readout {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .task-timer__value {
          font-size: 24px;
          font-weight: 700;
          font-family: 'SF Mono', 'Consolas', monospace;
          color: var(--color-text-primary, #1a1a1a);
          letter-spacing: 0.5px;
          line-height: 1.1;
        }

        .task-timer__value--running { color: var(--color-success, #1B998B); }

        .task-timer__label {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary, #777);
        }

        .task-timer__live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--color-success, #1B998B);
          animation: twk-timer-pulse 1.6s infinite;
        }

        @keyframes twk-timer-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

        .task-timer__btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
          padding: 8px 16px;
          border: none;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
        }

        .task-timer__btn--start { background: var(--law-navy, #0A192F); color: #fff; }
        .task-timer__btn--start:hover:not(:disabled) { background: #16305a; }

        .task-timer__btn--stop {
          background: var(--color-error, #D1495B);
          color: #fff;
          animation: twk-timer-btn 2s infinite;
        }

        @keyframes twk-timer-btn {
          0%, 100% { box-shadow: 0 0 0 0 rgba(209, 73, 91, 0.35); }
          50% { box-shadow: 0 0 0 6px rgba(209, 73, 91, 0); }
        }

        .task-timer__btn--stop:hover:not(:disabled) { background: #c13a4b; }
        .task-timer__btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .task-timer__loader {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* أشرطة الحالة الرفيعة */
        .task-timer__running-total,
        .task-timer__warning {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 11.5px;
          border-top: 1px solid var(--color-border, #e5e5e5);
        }

        .task-timer__running-total { color: var(--color-text-secondary, #777); }
        .task-timer__warning { color: var(--status-amber, #a15c1e); background: rgba(244, 162, 89, 0.1); }

        /* سجل الوقت — صفوف ملتصقة بفواصل، بلا بطاقات */
        .task-timer__log { border-top: 1px solid var(--color-border, #e5e5e5); }

        .task-timer__log-head {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 14px 6px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-text-secondary, #777);
        }

        .task-timer__log-head svg { color: var(--law-gold, #C9A227); }

        .task-timer__log-empty {
          padding: 6px 14px 14px;
          font-size: 11.5px;
          color: var(--color-text-secondary, #777);
        }

        .task-timer__log-list { display: flex; flex-direction: column; }

        .task-timer__entry-wrap { border-top: 1px dashed var(--color-border, #ececec); }
        .task-timer__entry-wrap:first-child { border-top: none; }

        .task-timer__entry {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 14px;
          font-size: 11.5px;
        }

        .task-timer__entry-user {
          display: flex;
          align-items: center;
          gap: 7px;
          flex: 1;
          min-width: 0;
        }

        .task-timer__entry-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--law-navy, #0A192F);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .task-timer__entry-name {
          color: var(--color-text-primary, #1a1a1a);
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .task-timer__entry-duration {
          font-family: 'SF Mono', 'Consolas', monospace;
          font-weight: 700;
          color: var(--color-text-primary, #1a1a1a);
          flex-shrink: 0;
        }

        .task-timer__entry-running { color: var(--color-success, #1B998B); font-size: 10.5px; }
        .task-timer__entry-date { color: var(--color-text-secondary, #777); font-size: 10.5px; flex-shrink: 0; }

        .task-timer__entry-note-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          flex-shrink: 0;
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: 6px;
          background: transparent;
          color: var(--color-text-secondary, #777);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .task-timer__entry-note-btn:hover { border-color: var(--law-navy, #0A192F); color: var(--law-navy, #0A192F); }
        .task-timer__entry-note-btn--open { background: var(--law-navy, #0A192F); border-color: var(--law-navy, #0A192F); color: #fff; }

        .task-timer__entry-note {
          padding: 8px 14px;
          background: var(--quiet-gray-50, #f6f7f9);
          font-size: 11.5px;
          line-height: 1.6;
          color: var(--color-text-primary, #1a1a1a);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .task-timer__log-more {
          padding: 8px 14px;
          font-size: 11px;
          color: var(--law-navy, #0A192F);
          text-align: center;
        }

        body.dark .task-timer__entry-note { background: var(--quiet-gray-100, #23262b); }
      `}</style>
    </div>
  );
};

export default TaskTimer;
