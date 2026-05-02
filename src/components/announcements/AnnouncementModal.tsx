import React, { useEffect, useState } from 'react';
import { useAnnouncements } from '../../contexts/AnnouncementContext';
import AnnouncementModalView from './AnnouncementModalView';

/**
 * Surface-level component that pops a modal for any announcement
 * targeting the `modal` channel that the user hasn't seen this session.
 * Shows announcements one at a time, by priority.
 */
const AnnouncementModal: React.FC = () => {
  const { byChannel, dismiss, track, isSeenInSession, markSeen } = useAnnouncements();
  const [shownId, setShownId] = useState<number | null>(null);

  const candidates = byChannel('modal').filter((a) => !isSeenInSession(a.id));
  const current = candidates[0];

  useEffect(() => {
    if (current && shownId !== current.id) {
      setShownId(current.id);
      track(current.id, 'seen');
      markSeen(current);
    } else if (!current && shownId !== null) {
      setShownId(null);
    }
  }, [current, shownId, track, markSeen]);

  if (!current) return null;

  return (
    <AnnouncementModalView
      announcement={current}
      onClose={() => setShownId(null)}
      onDismiss={() => dismiss(current.id)}
    />
  );
};

export default AnnouncementModal;
