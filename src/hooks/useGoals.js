import { useCallback, useEffect, useState } from 'react';
import { loadGoals, saveGoals } from '../firebaseLazy';
import { normalizeGoals } from '../utils/goals';

/** The saved monthly goals ({ team, people }), loaded once; save(goals, uid) → true when written */
export function useGoals() {
  const [state, setState] = useState({ goals: normalizeGoals(null), ready: false });
  useEffect(() => {
    let alive = true;
    loadGoals().then((g) => { if (alive) setState({ goals: normalizeGoals(g), ready: true }); }).catch(() => alive && setState((s) => ({ ...s, ready: true })));
    return () => { alive = false; };
  }, []);
  const save = useCallback(async (next, uid) => {
    const clean = normalizeGoals(next);
    const ok = await saveGoals(clean, uid);
    if (ok) setState({ goals: clean, ready: true });
    return ok;
  }, []);
  return { ...state, save };
}
