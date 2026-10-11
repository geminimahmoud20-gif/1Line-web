import { useEffect, useMemo, useState } from 'react';
import { loadAllLeadsForStats } from '../firebaseLazy';

const REFRESH_MS = 5 * 60 * 1000;

/**
 * Dashboard totals over EVERY lead the account may read, not just the newest ones loaded live.
 * Only fetches when the live list is a partial window (`hasMore`); the loaded leads stay the
 * fresher copy for the ones both lists hold. Returns { leads, coverage }.
 */
export default function useFullLeadStats(liveLeads, { enabled, hasMore }) {
  const [state, setState] = useState({ leads: null, truncated: false, at: 0, loading: false, failed: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !hasMore) return undefined;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- shows "computing…" while the read runs
    setState((s) => ({ ...s, loading: true }));
    loadAllLeadsForStats().then((res) => {
      if (cancelled) return;
      setState({ leads: res.ok || res.leads.length ? res.leads : null, truncated: res.truncated, at: Date.now(), loading: false, failed: !res.ok });
    });
    const t = setTimeout(() => setTick((n) => n + 1), REFRESH_MS);
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
