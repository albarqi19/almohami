import React, { useEffect, useState } from 'react';
import { useAnnouncements } from '../../contexts/AnnouncementContext';
import AnnouncementModalView from './AnnouncementModalView';
import type { Announcement } from '../../services/announcementService';

/**
 * Surface-level component that pops a modal for any announcement targeting the
 * `modal` channel that the user hasn't seen this session, one at a time.
 *
 * The shown announcement is *pinned* in state: once chosen it stays mounted
 * until the user closes it. We must NOT re-derive it from a
 * `filter(!isSeenInSession)` each render, because marking it seen would then
 * immediately filter it back out — making the modal flash and vanish.
 */
const AnnouncementModal: React.FC = () => {
  const { byChannel, dismiss, track, isSeenInSession, markSeen } = useAnnouncements();
  const [shown, setShown] = useState<Announcement | null>(null);

  useEffect(() => {
    const modals = byChannel('modal');
    if (shown) {
      // Keep the open modal mounted — but auto-close it if the announcement was
      // unpublished/deleted upstream (so admin "deactivate" still hides it live).
      if (!modals.some((a) => a.id === shown.id)) setShown(null);
      return;
    }
    const next = modals.find((a) => !isSeenInSession(a.id));
    if (next) {
      setShown(next);
      track(next.id, 'seen');
      markSeen(next);
    }
  }, [byChannel, shown, isSeenInSession, track, markSeen]);

  if (!shown) return null;

  return (
    <AnnouncementModalView
      announcement={shown}
      onClose={() => setShown(null)}
      onDismiss={() => dismiss(shown.id)}
    />
  );
};

export default AnnouncementModal;
