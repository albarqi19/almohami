import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { TimeService, type TimeEntry, type ActiveTimerResponse } from '../services/timeService';

interface TimerState {
  isRunning: boolean;
  currentEntry: TimeEntry | null;
  elapsedSeconds: number;
  taskId: string | null;
  taskTitle: string | null;
  caseTitle: string | null;
}

interface TimerContextType {
  timerState: TimerState;
  startTimer: (taskId: string, taskTitle?: string, caseTitle?: string) => Promise<void>;
  stopTimer: (description?: string) => Promise<void>;
  isLoading: boolean;
  showFloatingTimer: boolean;
  setShowFloatingTimer: (show: boolean) => void;
  refreshTimer: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const INITIAL_STATE: TimerState = {
  isRunning: false,
  currentEntry: null,
  elapsedSeconds: 0,
  taskId: null,
  taskTitle: null,
  caseTitle: null,
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timerState, setTimerState] = useState<TimerState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load active timer on mount
  const loadActiveTimer = useCallback(async () => {
    // Don't try to load timer if user is not logged in
    const token = localStorage.getItem('authToken');
    if (!token) {
      return;
    }

    try {
      const response = await TimeService.getActiveTimer();

      if (response && response.entry) {
        const entry = response.entry;
        setTimerState({
          isRunning: true,
          currentEntry: entry,
          elapsedSeconds: response.elapsed_seconds,
          taskId: entry.task_id,
          taskTitle: entry.task?.title || null,
          caseTitle: entry.task?.case?.title || null,
        });
        setShowFloatingTimer(true);
      } else {
        setTimerState(INITIAL_STATE);
        setShowFloatingTimer(false);
      }
    } catch (error) {
      console.error('Failed to load active timer:', error);
    }
  }, []);

  // Refresh timer state
  const refreshTimer = useCallback(async () => {
    await loadActiveTimer();
  }, [loadActiveTimer]);

  // Start timer
  const startTimer = useCallback(async (taskId: string, taskTitle?: string, caseTitle?: string) => {
    setIsLoading(true);
    try {
      const entry = await TimeService.startTimer(taskId);

      setTimerState({
        isRunning: true,
        currentEntry: entry,
        elapsedSeconds: 0,
        taskId: entry.task_id,
        taskTitle: taskTitle || entry.task?.title || null,
        caseTitle: caseTitle || entry.task?.case?.title || null,
      });
      setShowFloatingTimer(true);
    } catch (error) {
      console.error('Failed to start timer:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop timer
  const stopTimer = useCallback(async (description?: string) => {
    if (!timerState.currentEntry) return;

    setIsLoading(true);
    try {
      await TimeService.stopTimer(timerState.currentEntry.id, description);

      setTimerState(INITIAL_STATE);
      setShowFloatingTimer(false);
    } catch (error) {
      console.error('Failed to stop timer:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [timerState.currentEntry]);

  // Increment elapsed time every second when running
  useEffect(() => {
    if (timerState.isRunning) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => ({
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.isRunning]);

  // Load active timer on mount
  useEffect(() => {
    loadActiveTimer();
  }, [loadActiveTimer]);

  const value: TimerContextType = {
    timerState,
    startTimer,
    stopTimer,
    isLoading,
    showFloatingTimer,
    setShowFloatingTimer,
    refreshTimer,
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

export default TimerContext;
