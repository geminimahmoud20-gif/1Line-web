import { useEffect } from 'react';

let locks = 0;
let saved = '';

/**
 * Stops the page behind an open drawer or sheet from scrolling, so a swipe moves the drawer's
 * own content instead. Counted, so two open layers don't unlock each other.
 */
export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;
    if (locks === 0) {
      saved = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) document.body.style.overflow = saved;
    };
  }, [active]);
}
