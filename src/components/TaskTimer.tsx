import React, { useState, useEffect } from 'react';
import { Play, Pause, Clock } from 'lucide-react';
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

  return (
    <div className="task-timer">
      {/* Timer Display */}
      <div className="task-timer__display">
        <div className="task-timer__main">
          <div className={`task-timer__value ${isTimerForThisTask ? 'task-timer__value--running' : ''}`}>
            {isTimerForThisTask ? formatTime(timerState.elapsedSeconds) : '00:00:00'}
          </div>
          <button
            className={`task-timer__toggle ${isTimerForThisTask ? 'task-timer__toggle--stop' : 'task-timer__toggle--start'}`}
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
              <Pause size={20} />
            ) : (
              <Play size={20} />
            )}
          </button>
        </div>

        <div className="task-timer__total">
          <Clock size={14} />
          <span>الإجمالي: {formatTime(displayTotalSeconds)}</span>
        </div>

        {timerState.isRunning && !isTimerForThisTask && (
          <div className="task-timer__warning">
            التايمر يعمل على: {timerState.taskTitle || 'مهمة أخرى'}
          </div>
        )}
      </div>

      {/* Time Entries */}
      <div className="task-timer__entries">
        <h4 className="task-timer__entries-title">
          <Clock size={14} />
          سجل الوقت
        </h4>

        {loadingEntries ? (
          <div className="task-timer__entries-loading">جاري التحميل...</div>
        ) : entries.length === 0 ? (
          <div className="task-timer__entries-empty">لم يتم تسجيل وقت بعد</div>
        ) : (
          <div className="task-timer__entries-list">
            {entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="task-timer__entry">
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
              </div>
            ))}

            {entries.length > 5 && (
              <div className="task-timer__entries-more">
                +{entries.length - 5} سجلات أخرى
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .task-timer {
          background: var(--color-surface-subtle, #f8f9fa);
          border-radius: var(--radius-md, 8px);
          padding: var(--space-4, 16px);
        }

        .task-timer__display {
          text-align: center;
          padding-bottom: var(--space-4, 16px);
          border-bottom: 1px solid var(--color-border, #e5e5e5);
          margin-bottom: var(--space-4, 16px);
        }

        .task-timer__main {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-4, 16px);
          margin-bottom: var(--space-3, 12px);
        }

        .task-timer__value {
          font-size: 28px;
          font-weight: var(--font-weight-bold, 700);
          font-family: 'SF Mono', 'Consolas', monospace;
          color: var(--color-heading, #1a1a1a);
          min-width: 120px;
        }

        .task-timer__value--running {
          color: var(--color-success, #1B998B);
          animation: timer-text-pulse 2s infinite;
        }

        @keyframes timer-text-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .task-timer__toggle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast, 120ms ease);
        }

        .task-timer__toggle--start {
          background: var(--color-primary, #0A192F);
          color: white;
        }

        .task-timer__toggle--start:hover:not(:disabled) {
          background: var(--color-primary-hover, #162d50);
          transform: scale(1.05);
        }

        .task-timer__toggle--stop {
          background: var(--color-error, #D1495B);
          color: white;
          animation: timer-button-pulse 2s infinite;
        }

        @keyframes timer-button-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(209, 73, 91, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(209, 73, 91, 0); }
        }

        .task-timer__toggle--stop:hover:not(:disabled) {
          background: #c13a4b;
        }

        .task-timer__toggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .task-timer__loader {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .task-timer__total {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2, 8px);
          color: var(--color-text-secondary, #666);
          font-size: var(--font-size-sm, 13px);
        }

        .task-timer__warning {
          margin-top: var(--space-2, 8px);
          padding: var(--space-2, 8px) var(--space-3, 12px);
          background: var(--color-warning-soft, rgba(244, 162, 89, 0.15));
          color: var(--color-warning, #a15c1e);
          border-radius: var(--radius-sm, 4px);
          font-size: var(--font-size-xs, 12px);
        }

        .task-timer__entries-title {
          display: flex;
          align-items: center;
          gap: var(--space-2, 8px);
          font-size: var(--font-size-sm, 13px);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--color-text-secondary, #666);
          margin-bottom: var(--space-3, 12px);
        }

        .task-timer__entries-loading,
        .task-timer__entries-empty {
          text-align: center;
          color: var(--color-text-secondary, #666);
          font-size: var(--font-size-sm, 13px);
          padding: var(--space-4, 16px);
        }

        .task-timer__entries-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2, 8px);
        }

        .task-timer__entry {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-2, 8px);
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: var(--radius-sm, 6px);
          font-size: var(--font-size-xs, 12px);
        }

        .task-timer__entry-user {
          display: flex;
          align-items: center;
          gap: var(--space-2, 8px);
          flex: 1;
        }

        .task-timer__entry-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--color-primary, #0A192F);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: var(--font-weight-semibold, 600);
        }

        .task-timer__entry-name {
          color: var(--color-text, #1a1a1a);
          font-weight: var(--font-weight-medium, 500);
        }

        .task-timer__entry-duration {
          font-family: 'SF Mono', 'Consolas', monospace;
          color: var(--color-text, #1a1a1a);
          font-weight: var(--font-weight-semibold, 600);
        }

        .task-timer__entry-running {
          color: var(--color-success, #1B998B);
          font-size: 11px;
        }

        .task-timer__entry-date {
          color: var(--color-text-secondary, #666);
          font-size: 11px;
        }

        .task-timer__entries-more {
          text-align: center;
          color: var(--color-primary, #0A192F);
          font-size: var(--font-size-xs, 12px);
          padding: var(--space-2, 8px);
          cursor: pointer;
        }

        .task-timer__entries-more:hover {
          text-decoration: underline;
        }

        /* Dark Theme */
        body.dark .task-timer {
          background: var(--color-surface-subtle);
        }

        body.dark .task-timer__entry {
          background: var(--color-surface);
          border-color: var(--color-border);
        }

        /* Classic Theme */
        body.classic .task-timer__toggle--start {
          background: var(--color-primary);
        }

        body.classic .task-timer__entry-avatar {
          background: var(--color-primary);
        }
      `}</style>
    </div>
  );
};

export default TaskTimer;
