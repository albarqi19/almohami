import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTour } from './useTour';
import { getModalTour, isTenantOlderThanLaunch } from '../data/pageTours';
import { isTourDone, markTourDone } from '../utils/tourStorage';

const MODAL_OPEN_DELAY_MS = 350; // wait for the modal to finish its open animation

export interface UseModalTourReturn {
  startTour: () => void;
  hasTour: boolean;
}

export const useModalTour = (modalKey: string, isOpen: boolean): UseModalTourReturn => {
  const { user } = useAuth();
  const { runTour } = useTour();
  const triggeredForOpenRef = React.useRef(false);
  const tour = getModalTour(modalKey);

  // Auto-run on first open for new tenants only.
  React.useEffect(() => {
    if (!isOpen) {
      triggeredForOpenRef.current = false;
      return;
    }
    if (!tour || !user || triggeredForOpenRef.current) return;
    if (isTourDone(tour.key)) return;

    const createdAt = user.createdAt ?? (user as { created_at?: string | Date }).created_at;
    if (isTenantOlderThanLaunch(createdAt)) {
      markTourDone(tour.key);
      return;
    }

    triggeredForOpenRef.current = true;
    const timer = setTimeout(() => {
      runTour(tour);
    }, MODAL_OPEN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isOpen, tour, user, runTour]);

  const startTour = React.useCallback(() => {
    if (!tour) return;
    runTour(tour, { force: true });
  }, [tour, runTour]);

  return {
    startTour,
    hasTour: tour !== null,
  };
};
