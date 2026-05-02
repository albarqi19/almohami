const TOUR_PREFIX = 'tour:';

export const tourStorageKey = (tourKey: string): string => `${TOUR_PREFIX}${tourKey}:done`;

export const isTourDone = (tourKey: string): boolean =>
  localStorage.getItem(tourStorageKey(tourKey)) === '1';

export const markTourDone = (tourKey: string): void => {
  localStorage.setItem(tourStorageKey(tourKey), '1');
};

export const resetTour = (tourKey: string): void => {
  localStorage.removeItem(tourStorageKey(tourKey));
};

export const collectTourKeys = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(TOUR_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value !== null) out[key] = value;
    }
  }
  return out;
};

export const restoreTourKeys = (entries: Record<string, string>): void => {
  for (const [key, value] of Object.entries(entries)) {
    localStorage.setItem(key, value);
  }
};
