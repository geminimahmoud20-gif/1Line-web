import { useEffect, useMemo, useState } from 'react';
import { subscribeToNotes } from '../firebaseLazy';
import { sortNotes } from '../utils/teamNotes';

/** The notes of one client / listing / project / the team thread, oldest first. `ready` once the first answer is in; `failed` when it can't be read */
export default function useNotes(entityType, entityId) {
  const key = entityType && entityId ? `${entityType}:${entityId}` : '';
  const [state, setState] = useState({ key: '', notes: [], failed: false });
  useEffect(() => {
    if (!key) return undefined;
    return subscribeToNotes({ entityType, entityId }, (notes) => setState({ key, notes: notes || [], failed: notes === null }));
  }, [key, entityType, entityId]);
  const current = state.key === key;
  const notes = useMemo(() => (current ? sortNotes(state.notes) : []), [current, state.notes]);
  return { notes, ready: current, failed: current && state.failed };
}
