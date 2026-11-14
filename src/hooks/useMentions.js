import { useEffect, useRef, useSyncExternalStore } from 'react';
import { subscribeToMentions } from '../firebaseLazy';

// The notifications addressed to the signed-in person (crm_mentions): the top-bar menu and its badge read
// this one subscription. `onNew(list)` runs for mentions that arrive while the CRM is open.
let state = { mentions: [], ready: false };
const listeners = new Set();
const set = (next) => { state = next; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export function useMentionsSync(uid, onNew) {
  const cb = useRef(onNew);
  useEffect(() => { cb.current = onNew; });
  useEffect(() => {
    if (!uid) return undefined;
    let known = null; // ids seen so far; the first snapshot is the backlog, not news
    set({ mentions: [], ready: false });
    const stop = subscribeToMentions(uid, (mentions) => {
      const fresh = known ? mentions.filter((m) => !known.has(m.id) && !m.readAt) : [];
      known = new Set(mentions.map((m) => m.id));
      set({ mentions, ready: true });
      if (fresh.length) cb.current?.(fresh);
    });
    return () => { stop(); set({ mentions: [], ready: false }); };
  }, [uid]);
}

export const useMentions = () => useSyncExternalStore(subscribe, () => state, () => state);
