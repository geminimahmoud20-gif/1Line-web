import { useEffect, useRef } from 'react';
import { getLockMinutes, getLastActive, markCrmActive, isIdleExpired } from '../../utils/idleLock';

const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'];

/**
 * While signed in to the CRM: record activity (at most every 15 s) and call onLock() once the
 * device has been idle for the chosen minutes. Checked every 30 s, when the window regains focus
 * or becomes visible (the computer woke up), and on open (an app left signed in overnight).
 */
export default function useIdleLock(active, onLock) {
  const lockRef = useRef(onLock);
  useEffect(() => { lockRef.current = onLock; }, [onLock]);

  useEffect(() => {
    if (!active) return undefined;
    let locked = false;
    let lastWrite = 0;
    const check = () => {
      if (locked) return;
      if (isIdleExpired(getLastActive(), Date.now(), getLockMinutes())) {
        locked = true;
        lockRef.current();
      }
    };
    // First use on this device (no record yet) starts the clock now
    if (!getLastActive()) markCrmActive();
    check();
    const onActivity = () => {
      if (locked) return;
      const now = Date.now();
      if (now - lastWrite < 15000) return;
      // Activity after a long pause (laptop lid opened) must not reset the clock before the check
      check();
      if (locked) return;
      lastWrite = now;
      markCrmActive(now);
    };
    EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const timer = setInterval(check, 30000);
    return () => {
      EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      clearInterval(timer);
    };
  }, [active]);
}
