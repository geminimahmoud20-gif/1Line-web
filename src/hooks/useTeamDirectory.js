import { useEffect, useSyncExternalStore } from 'react';
import { registerSelf, subscribeToPeople } from '../firebaseLazy';

// The signed-in person and the team members who have opened the CRM (team_directory), shared by every
// notes thread so a colleague can be picked in an @mention. Call useTeamDirectorySync once, high in the CRM.
let state = { self: null, people: [] };
const listeners = new Set();
const set = (next) => { state = next; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

export function useTeamDirectorySync(self) {
  const uid = self?.uid || '';
  const name = self?.name || '';
  const desk = self?.desk || '';
  const role = self?.role || '';
  const canManage = Boolean(self?.canManage);
  useEffect(() => {
    if (!uid || !name) return undefined;
    const me = { uid, name, desk, role, canManage };
    set({ ...state, self: me });
    registerSelf(me).catch(() => {});
    const stop = subscribeToPeople((people) => set({ ...state, people }));
    return () => { stop(); set({ self: null, people: [] }); };
  }, [uid, name, desk, role, canManage]);
}

/** { self, people }: people always include self */
export function useTeamDirectory() {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  if (s.self && !s.people.some((p) => p.uid === s.self.uid)) return { self: s.self, people: [...s.people, s.self] };
  return s;
}
