import { useSyncExternalStore } from 'react';

/** true while the media query matches (re-renders when it changes); false where matchMedia does not exist */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false
  );
}
