import { useEffect, useMemo } from 'react';
import { track, propertyFacts, setPageProperty, onBeforeFlush } from '../utils/analytics';

const MAX_REPORT_SECONDS = 30 * 60;

/**
 * Reading time and scroll depth on a listing page, sent as `property_engaged`
 * when the visitor leaves the listing, switches tab or closes the page.
 * Only time with the tab visible counts.
 */
export default function usePropertyEngagement(property) {
  const facts = useMemo(
    () => (property?.id ? propertyFacts(property) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the listing's identity, not every re-render's object
    [property?.id, property?.price, property?.areaKey, property?.type]
  );

  useEffect(() => {
    if (!facts?.propertyId) return undefined;
    setPageProperty(facts);
    let visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
    let accumulatedMs = 0;
    let reportedSeconds = 0;
    let maxScroll = 0;

    const onScroll = () => {
      const doc = document.documentElement;
      const pct = Math.round(((window.scrollY + window.innerHeight) / Math.max(1, doc.scrollHeight)) * 100);
      if (pct > maxScroll) maxScroll = Math.min(100, pct);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (visibleSince) accumulatedMs += Date.now() - visibleSince;
        visibleSince = null;
      } else if (!visibleSince) {
        visibleSince = Date.now();
      }
    };
    const report = () => {
      const totalMs = accumulatedMs + (visibleSince ? Date.now() - visibleSince : 0);
      const seconds = Math.min(MAX_REPORT_SECONDS, Math.round(totalMs / 1000) - reportedSeconds);
      if (seconds < 5) return;
      reportedSeconds += seconds;
      track('property_engaged', { ...facts, seconds, scroll: maxScroll });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    const stopFlushHook = onBeforeFlush(report);
    return () => {
      report();
      stopFlushHook();
      setPageProperty(null);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [facts]);
}
