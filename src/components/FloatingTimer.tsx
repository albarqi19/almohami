import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, X, Clock, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { useTimer } from '../contexts/TimerContext';
import { TimeService } from '../services/timeService';

const FloatingTimer: React.FC = () => {
  const navigate = useNavigate();
  const { timerState, stopTimer, isLoading, showFloatingTimer, setShowFloatingTimer } = useTimer();
  const [isExpanded, setIsExpanded] = useState(false);
  const [stopDescription, setStopDescription] = useState('');
  const [showStopModal, setShowStopModal] = useState(false);

  if (!timerState.isRunning || !showFloatingTimer) {
    return null;
  }

  const handleStopClick = () => {
    setShowStopModal(true);
  };

  const handleConfirmStop = async () => {
    try {
      await stopTimer(stopDescription);
      setShowStopModal(false);
      setStopDescription('');
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const handleCancelStop = () => {
    setShowStopModal(false);
    setStopDescription('');
  };

  const handleNavigateToTask = () => {
    if (timerState.taskId) {
      navigate(`/tasks/${timerState.taskId}`);
    }
  };

  const formatTime = TimeService.formatTime;

  return (
    <>
      <motion.div
        className="floating-timer"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div
              key="minimized"
              className="floating-timer__minimized"
              onClick={() => setIsExpanded(true)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="floating-timer__pulse" />
              <div className="floating-timer__content">
                <Clock size={16} className="floating-timer__icon" />
                <span className="floating-timer__value">{formatTime(timerState.elapsedSeconds)}</span>
                <span className="floating-timer__task-title">
                  {timerState.taskTitle?.substring(0, 20) || 'مهمة'}
                  {(timerState.taskTitle?.length || 0) > 20 ? '...' : ''}
                </span>
              </div>
              <button
                className="floating-timer__stop-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStopClick();
                }}
                title="إيقاف التايمر"
              >
                <Pause size={14} />
              </button>
              <ChevronUp size={14} className="floating-timer__expand-icon" />
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              className="floating-timer__expanded"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="floating-timer__header">
                <div className="floating-timer__info">
                  <Clock size={18} />
                  <span className="floating-timer__value-lg">{formatTime(timerState.elapsedSeconds)}</span>
                </div>
                <div className="floating-timer__header-actions">
                  <button onClick={() => setIsExpanded(false)} title="تصغير">
                    <ChevronDown size={16} />
                  </button>
                  <button onClick={() => setShowFloatingTimer(false)} title="إخفاء">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="floating-timer__body">
                <div className="floating-timer__task-info">
                  <div className="floating-timer__task-name">{timerState.taskTitle || 'مهمة'}</div>
                  {timerState.caseTitle && (
                    <div className="floating-timer__case-name">{timerState.caseTitle}</div>
                  )}
                </div>

                <div className="floating-timer__actions">
                  <button
                    className="floating-timer__btn floating-timer__btn--stop"
                    onClick={handleStopClick}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="floating-timer__loader" />
                    ) : (
                      <>
                        <Pause size={16} />
                        إيقاف
                      </>
                    )}
                  </button>
                  <button
                    className="floating-timer__btn floating-timer__btn--goto"
                    onClick={handleNavigateToTask}
                  >
                    <ExternalLink size={14} />
                    الذهاب للمهمة
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Stop Modal */}
      <AnimatePresence>
        {showStopModal && (
          <motion.div
            className="floating-timer-modal__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancelStop}
          >
            <motion.div
              className="floating-timer-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="floating-timer-modal__title">إيقاف التايمر</h3>
              <p className="floating-timer-modal__time">
                الوقت المسجل: <strong>{formatTime(timerState.elapsedSeconds)}</strong>
              </p>
              <p className="floating-timer-modal__task">{timerState.taskTitle}</p>

              <div className="floating-timer-modal__field">
                <label>وصف العمل (اختياري):</label>
                <textarea
                  value={stopDescription}
                  onChange={(e) => setStopDescription(e.target.value)}
                  placeholder="ماذا أنجزت خلال هذا الوقت؟"
                  rows={3}
                />
              </div>

              <div className="floating-timer-modal__actions">
                <button className="button button--ghost" onClick={handleCancelStop}>
                  إلغاء
                </button>
                <button
                  className="button button--primary"
                  onClick={handleConfirmStop}
                  disabled={isLoading}
                >
                  {isLoading ? 'جاري الحفظ...' : 'إيقاف وحفظ'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* Floating Timer - ClickUp Modern Minimal */
        .floating-timer {
          position: fixed;
          bottom: var(--space-6, 24px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          direction: rtl;
        }

        /* Minimized State */
        .floating-timer__minimized {
          display: flex;
          align-items: center;
          gap: var(--space-3, 12px);
          background: var(--color-surface, #fff);
          color: var(--color-text, #1a1a1a);
          padding: var(--space-3, 12px) var(--space-5, 20px);
          border-radius: var(--radius-pill, 999px);
          border: 1px solid var(--color-border, #e5e5e5);
          cursor: pointer;
          box-shadow: var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.15));
          position: relative;
          overflow: hidden;
          transition: all var(--transition-base, 200ms ease);
        }

        .floating-timer__minimized:hover {
          border-color: var(--color-primary, #0A192F);
          box-shadow: var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.2));
        }

        .floating-timer__pulse {
          position: absolute;
          inset: -2px;
          border: 2px solid var(--color-success, #1B998B);
          border-radius: var(--radius-pill, 999px);
          animation: timer-pulse 2s infinite;
        }

        @keyframes timer-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.02); }
        }

        .floating-timer__content {
          display: flex;
          align-items: center;
          gap: var(--space-2, 8px);
          position: relative;
          z-index: 1;
        }

        .floating-timer__icon {
          color: var(--color-success, #1B998B);
        }

        .floating-timer__value {
          font-family: 'SF Mono', 'Consolas', monospace;
          font-size: var(--font-size-lg, 18px);
          font-weight: var(--font-weight-bold, 700);
          color: var(--color-success, #1B998B);
          min-width: 80px;
          text-align: center;
        }

        .floating-timer__task-title {
          font-size: var(--font-size-sm, 13px);
          color: var(--color-text-secondary, #666);
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .floating-timer__stop-btn {
          background: var(--color-error, #D1495B);
          border: none;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all var(--transition-fast, 120ms ease);
          position: relative;
          z-index: 1;
        }

        .floating-timer__stop-btn:hover {
          background: #c13a4b;
          transform: scale(1.1);
        }

        .floating-timer__expand-icon {
          color: var(--color-text-secondary, #666);
          position: relative;
          z-index: 1;
        }

        /* Expanded State */
        .floating-timer__expanded {
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: var(--radius-lg, 12px);
          min-width: 320px;
          box-shadow: var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.15));
          overflow: hidden;
        }

        .floating-timer__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4, 16px) var(--space-5, 20px);
          border-bottom: 1px solid var(--color-border, #e5e5e5);
          background: var(--color-surface-subtle, #f8f9fa);
        }

        .floating-timer__info {
          display: flex;
          align-items: center;
          gap: var(--space-3, 12px);
          color: var(--color-success, #1B998B);
        }

        .floating-timer__value-lg {
          font-family: 'SF Mono', 'Consolas', monospace;
          font-size: var(--font-size-2xl, 24px);
          font-weight: var(--font-weight-bold, 700);
        }

        .floating-timer__header-actions {
          display: flex;
          gap: var(--space-2, 8px);
        }

        .floating-timer__header-actions button {
          background: transparent;
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: var(--radius-sm, 6px);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary, #666);
          cursor: pointer;
          transition: all var(--transition-fast, 120ms ease);
        }

        .floating-timer__header-actions button:hover {
          background: var(--color-surface-subtle, #f8f9fa);
          color: var(--color-text, #1a1a1a);
          border-color: var(--color-primary, #0A192F);
        }

        .floating-timer__body {
          padding: var(--space-4, 16px) var(--space-5, 20px);
        }

        .floating-timer__task-info {
          margin-bottom: var(--space-4, 16px);
        }

        .floating-timer__task-name {
          font-size: var(--font-size-base, 15px);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--color-heading, #1a1a1a);
          margin-bottom: var(--space-1, 4px);
        }

        .floating-timer__case-name {
          font-size: var(--font-size-xs, 12px);
          color: var(--color-text-secondary, #666);
        }

        .floating-timer__actions {
          display: flex;
          gap: var(--space-3, 12px);
        }

        .floating-timer__btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2, 8px);
          padding: var(--space-3, 12px) var(--space-4, 16px);
          border-radius: var(--radius-md, 8px);
          font-size: var(--font-size-sm, 14px);
          font-weight: var(--font-weight-medium, 500);
          cursor: pointer;
          transition: all var(--transition-fast, 120ms ease);
        }

        .floating-timer__btn--stop {
          background: var(--color-error, #D1495B);
          color: white;
          border: none;
        }

        .floating-timer__btn--stop:hover:not(:disabled) {
          background: #c13a4b;
        }

        .floating-timer__btn--stop:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .floating-timer__btn--goto {
          background: transparent;
          color: var(--color-text, #1a1a1a);
          border: 1px solid var(--color-border, #e5e5e5);
        }

        .floating-timer__btn--goto:hover {
          border-color: var(--color-primary, #0A192F);
          color: var(--color-primary, #0A192F);
          background: var(--color-primary-soft, rgba(10, 25, 47, 0.08));
        }

        .floating-timer__loader {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Modal */
        .floating-timer-modal__overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
        }

        .floating-timer-modal {
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: var(--radius-lg, 12px);
          padding: var(--space-6, 24px);
          width: 100%;
          max-width: 400px;
          margin: var(--space-4, 16px);
          box-shadow: var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.2));
          direction: rtl;
        }

        .floating-timer-modal__title {
          margin: 0 0 var(--space-4, 16px);
          font-size: var(--font-size-xl, 18px);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--color-heading, #1a1a1a);
        }

        .floating-timer-modal__time {
          margin: var(--space-2, 8px) 0;
          color: var(--color-text-secondary, #666);
          font-size: var(--font-size-sm, 14px);
        }

        .floating-timer-modal__time strong {
          color: var(--color-success, #1B998B);
          font-family: 'SF Mono', 'Consolas', monospace;
        }

        .floating-timer-modal__task {
          color: var(--color-heading, #1a1a1a);
          font-weight: var(--font-weight-medium, 500);
          font-size: var(--font-size-base, 15px);
          margin-bottom: var(--space-4, 16px);
        }

        .floating-timer-modal__field {
          margin-top: var(--space-4, 16px);
        }

        .floating-timer-modal__field label {
          display: block;
          margin-bottom: var(--space-2, 8px);
          font-size: var(--font-size-sm, 13px);
          color: var(--color-text-secondary, #666);
        }

        .floating-timer-modal__field textarea {
          width: 100%;
          padding: var(--space-3, 12px);
          border: 1px solid var(--color-border, #e5e5e5);
          border-radius: var(--radius-md, 8px);
          font-size: var(--font-size-sm, 14px);
          resize: vertical;
          font-family: inherit;
          background: var(--color-surface, #fff);
          color: var(--color-text, #1a1a1a);
          transition: border-color var(--transition-fast, 120ms ease);
        }

        .floating-timer-modal__field textarea:focus {
          outline: none;
          border-color: var(--color-primary, #0A192F);
        }

        .floating-timer-modal__actions {
          display: flex;
          gap: var(--space-3, 12px);
          margin-top: var(--space-5, 20px);
        }

        .floating-timer-modal__actions .button {
          flex: 1;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Dark Theme */
        body.dark .floating-timer__minimized {
          background: var(--color-surface);
          border-color: var(--color-border);
        }

        body.dark .floating-timer__expanded {
          background: var(--color-surface);
          border-color: var(--color-border);
        }

        body.dark .floating-timer-modal {
          background: var(--color-surface);
          border-color: var(--color-border);
        }

        /* Classic Theme */
        body.classic .floating-timer__icon,
        body.classic .floating-timer__value,
        body.classic .floating-timer__info {
          color: #B8860B;
        }

        body.classic .floating-timer__pulse {
          border-color: #B8860B;
        }

        /* Mobile */
        @media (max-width: 480px) {
          .floating-timer__minimized {
            padding: var(--space-2, 8px) var(--space-4, 16px);
          }

          .floating-timer__task-title {
            display: none;
          }

          .floating-timer__expanded {
            min-width: calc(100vw - 32px);
          }
        }
      `}</style>
    </>
  );
};

export default FloatingTimer;
