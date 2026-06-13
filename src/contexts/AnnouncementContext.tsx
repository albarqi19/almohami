import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AnnouncementService, type Announcement, type AnnouncementChannel } from '../services/announcementService';
import { useAuth } from './AuthContext';

interface AnnouncementContextValue {
  active: Announcement[];
  byChannel: (channel: AnnouncementChannel) => Announcement[];
  dismiss: (id: number) => Promise<void>;
  track: (id: number, action: 'seen' | 'click') => void;
  refetch: () => Promise<void>;
  isSeenInSession: (id: number) => boolean;
  markSeen: (a: Announcement) => void;
}

const AnnouncementContext = createContext<AnnouncementContextValue | null>(null);

const POLL_INTERVAL_MS = 90_000;
const SESSION_SEEN_KEY = 'announcements_session_seen';
const ONCE_SEEN_KEY = 'announcements_once_seen';
const DAILY_SEEN_KEY = 'announcements_daily_seen';

const readSet = (key: string, storage: Storage): Set<number> => {
  try {
    const raw = storage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
};
const writeSet = (key: string, set: Set<number>, storage: Storage) => {
  try { storage.setItem(key, JSON.stringify([...set])); } catch { /* ignore */ }
};
const readMap = (key: string, storage: Storage): Record<number, string> => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};
const writeMap = (key: string, map: Record<number, string>, storage: Storage) => {
  try { storage.setItem(key, JSON.stringify(map)); } catch { /* ignore */ }
};

const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Run a fire-and-forget task when the browser is idle, so analytics writes
 * never compete with the user's interactions. Falls back to a microtask-ish
 * timeout where requestIdleCallback is unavailable (Safari).
 */
const runWhenIdle = (fn: () => void) => {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
  if (typeof ric === 'function') ric(fn, { timeout: 2000 });
  else setTimeout(fn, 0);
};

export const AnnouncementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [active, setActive] = useState<Announcement[]>([]);
  const sessionSeenRef = useRef<Set<number>>(readSet(SESSION_SEEN_KEY, sessionStorage));
  const onceSeenRef = useRef<Set<number>>(readSet(ONCE_SEEN_KEY, localStorage));
  const dailySeenRef = useRef<Record<number, string>>(readMap(DAILY_SEEN_KEY, localStorage));
  // Ids whose 'seen' beacon already fired this page-load — dedup network/DB writes.
  const seenSentRef = useRef<Set<number>>(new Set());

  const fetchActive = useCallback(async () => {
    if (!user) {
      setActive([]);
      return;
    }
    try {
      const list = await AnnouncementService.getActive();
      const today = todayStr();
      const filtered = list.filter((a) => {
        if (a.repeat_policy === 'once' && onceSeenRef.current.has(a.id)) return false;
        if (a.repeat_policy === 'session' && sessionSeenRef.current.has(a.id)) return false;
        if (a.repeat_policy === 'daily' && dailySeenRef.current[a.id] === today) return false;
        return true;
      });
      setActive(filtered);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchActive();
    if (!user) return;
    const id = setInterval(fetchActive, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchActive();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, fetchActive]);

  const byChannel = useCallback(
    (channel: AnnouncementChannel) =>
      active
        .filter((a) => Array.isArray(a.channels) && a.channels.includes(channel))
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)),
    [active]
  );

  const dismiss = useCallback(async (id: number) => {
    try {
      await AnnouncementService.dismiss(id);
    } catch { /* ignore */ }
    setActive((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const track = useCallback((id: number, action: 'seen' | 'click') => {
    if (action === 'seen') {
      // A view is recorded at most once per page-load, and only while the
      // browser is idle — so impression tracking never blocks the UI or
      // hammers the API on every re-render / across multiple channels.
      if (seenSentRef.current.has(id)) return;
      seenSentRef.current.add(id);
      runWhenIdle(() => { void AnnouncementService.track(id, 'seen'); });
      return;
    }
    // Clicks are rare and meaningful → fire immediately (still non-blocking).
    void AnnouncementService.track(id, 'click');
  }, []);

  const isSeenInSession = useCallback((id: number) => sessionSeenRef.current.has(id), []);

  /**
   * Persist that the user has seen this announcement, branching on the
   * announcement's `repeat_policy`:
   *   - session  → sessionStorage only (resets on tab close)
   *   - once     → localStorage permanently
   *   - daily    → localStorage with today's date stamp
   *   - until_dismissed / always → only marked in-session for UX (do not
   *     re-pop within the same session); permanent dismiss happens via
   *     the explicit dismiss() API call.
   */
  const markSeen = useCallback((a: Announcement) => {
    sessionSeenRef.current.add(a.id);
    writeSet(SESSION_SEEN_KEY, sessionSeenRef.current, sessionStorage);

    if (a.repeat_policy === 'once') {
      onceSeenRef.current.add(a.id);
      writeSet(ONCE_SEEN_KEY, onceSeenRef.current, localStorage);
    } else if (a.repeat_policy === 'daily') {
      dailySeenRef.current[a.id] = todayStr();
      writeMap(DAILY_SEEN_KEY, dailySeenRef.current, localStorage);
    }
  }, []);

  return (
    <AnnouncementContext.Provider
      value={{ active, byChannel, dismiss, track, refetch: fetchActive, isSeenInSession, markSeen }}
    >
      {children}
    </AnnouncementContext.Provider>
  );
};

export const useAnnouncements = (): AnnouncementContextValue => {
  const ctx = useContext(AnnouncementContext);
  if (!ctx) throw new Error('useAnnouncements must be used within AnnouncementProvider');
  return ctx;
};
