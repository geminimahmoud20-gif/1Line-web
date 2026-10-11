import { useEffect, useMemo, useRef, useState } from 'react';
import { loadAllLeadsForStats, loadLeadChangesSince } from '../firebaseLazy';
import { STATS_TICK_MS, CHANGE_OVERLAP_MS, newestChangeMs, mergeLeadChanges, nextStatsRead } from '../utils/leadStatsSync';

/**
 * Dashboard totals over EVERY lead the account may read, not just the newest ones loaded live.
 * Only fetches when the live list is a partial window (`hasMore`); the loaded leads stay the
 * fresher copy for the ones both lists hold. After the first full read, refreshes read only
 * the leads that changed (see utils/leadStatsSync). Returns { leads, coverage }.
 */
export default function useFullLeadStats(liveLeads, { enabled, hasMore }) {
  const [state, setState] = useState({ leads: null, truncated: false, loading: false, failed: false });
  const [tick, setTick] = useState(0);
  // Survives tab switches: coming back to the dashboard continues from what was read
  const sync = useRef({ leads: null, scoped: false, fullAt: 0, truncated: false });

  useEffect(() => {
    if (!enabled || !hasMore) return undefined;
    let cancelled = false;
    const s = sync.current;
    const step = nextStatsRead({ hasData: Boolean(s.leads), scoped: s.scoped, fullAt: s.fullAt, now: Date.now() });
    const publish = (failed = false) => {
      if (!cancelled) setState({ leads: s.leads, truncated: s.truncated, loading: false, failed });
    };
    const full = () => {
      setState((prev) => ({ ...prev, loading: true }));
      return loadAllLeadsForStats().then((res) => {
        if (res.ok || res.leads.length) {
          Object.assign(s, { leads: res.leads, scoped: Boolean(res.scoped), fullAt: Date.now(), truncated: res.truncated });
        }
        publish(!res.ok);
      });
    };
    if (step === 'full') full();
    else if (step === 'changes') {
      loadLeadChangesSince(newestChangeMs(s.leads) - CHANGE_OVERLAP_MS).then((res) => {
        if (cancelled) return;
        if (!res.ok || res.truncated) { full(); return; }
        s.leads = mergeLeadChanges(s.leads, res.leads);
        publish();
      });
    } else publish();
    const t = setTimeout(() => setTick((n) => n + 1), STATS_TICK_MS);
    return () => { cancelled = true; clearTimeout(t); };
  }, [enabled, hasMore, tick]);

  return useMemo(() => {
    if (!hasMore || !state.leads) {
      return { leads: liveLeads, coverage: { complete: !hasMore, loading: Boolean(hasMore && state.loading), failed: state.failed, count: liveLeads.length } };
    }
    const byId = new Map(state.leads.map((l) => [String(l.id), l]));
    liveLeads.forEach((l) => byId.set(String(l.id), { ...byId.get(String(l.id)), ...l }));
    const all = [...byId.values()];
    return { leads: all, coverage: { complete: !state.truncated, loading: state.loading, failed: state.failed, count: all.length } };
  }, [liveLeads, hasMore, state]);
}
