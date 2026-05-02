import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTour } from '../hooks/useTour';
import { getTourForPath, isTenantOlderThanLaunch } from '../data/pageTours';
import { isTourDone, markTourDone } from '../utils/tourStorage';

const AUTO_RUN_DELAY_MS = 600;

const TourLoader: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { runTour } = useTour();
  const lastTriggeredKey = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!user) return;

    const tour = getTourForPath(location.pathname);
    if (!tour) return;
    if (lastTriggeredKey.current === tour.key) return;
    if (isTourDone(tour.key)) return;

    // Existing users (created before the feature launch) shouldn't get
    // surprised by auto-running tours — silently mark them as seen so
    // the ? menu still works on demand without auto-popping.
    // Laravel returns snake_case (created_at), TS type uses createdAt — accept either.
    const createdAt = user.createdAt ?? (user as { created_at?: string | Date }).created_at;
    if (isTenantOlderThanLaunch(createdAt)) {
      markTourDone(tour.key);
      return;
    }

    lastTriggeredKey.current = tour.key;
    const timer = setTimeout(() => {
      runTour(tour);
    }, AUTO_RUN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [location.pathname, user, runTour]);

  return null;
};

export default TourLoader;
