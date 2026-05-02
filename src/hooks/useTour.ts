import { useCallback } from 'react';
import { driver } from 'driver.js';
import type { DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { isTourDone, markTourDone } from '../utils/tourStorage';

// Ensure driver.js renders above any modal in the app.
// Project modals top out around z-index 9999; we sit above them.
if (typeof document !== 'undefined' && !document.getElementById('tour-zindex-overrides')) {
  const style = document.createElement('style');
  style.id = 'tour-zindex-overrides';
  style.textContent = `
    .driver-overlay { z-index: 100000 !important; }
    .driver-popover { z-index: 100002 !important; }
    .driver-active-element { z-index: 100001 !important; position: relative; }
  `;
  document.head.appendChild(style);
}

export interface RunnableTour {
  key: string;
  steps: DriveStep[];
}

export interface UseTourReturn {
  runTour: (tour: RunnableTour, options?: { force?: boolean }) => boolean;
  hasSeenTour: (tourKey: string) => boolean;
}

const stepHasElementInDom = (step: DriveStep): boolean => {
  if (!step.element) return true;
  if (typeof step.element !== 'string') return true;
  return document.querySelector(step.element) !== null;
};

export const useTour = (): UseTourReturn => {
  const runTour = useCallback((tour: RunnableTour, options?: { force?: boolean }): boolean => {
    if (!options?.force && isTourDone(tour.key)) {
      return false;
    }

    const steps = tour.steps.filter(stepHasElementInDom);
    if (steps.length === 0) return false;

    const instance = driver({
      showProgress: true,
      animate: true,
      // smoothScroll causes the highlight box to lag behind when going from
      // a far-down step back to an above-the-fold one. Instant scroll fixes it.
      smoothScroll: false,
      allowClose: true,
      overlayOpacity: 0.5,
      stagePadding: 6,
      stageRadius: 8,
      progressText: '{{current}} من {{total}}',
      nextBtnText: 'التالي',
      prevBtnText: 'السابق',
      doneBtnText: 'تم',
      steps,
      onHighlightStarted: (element, _step, { driver: drv }) => {
        if (element instanceof HTMLElement) {
          element.scrollIntoView({ block: 'center', behavior: 'auto' });
          // Force driver to recompute the stage box after our scroll lands,
          // otherwise the highlight rectangle stays at the old position.
          requestAnimationFrame(() => drv.refresh());
        }
      },
      onDestroyed: () => {
        markTourDone(tour.key);
      },
    });

    instance.drive();
    return true;
  }, []);

  return {
    runTour,
    hasSeenTour: isTourDone,
  };
};
