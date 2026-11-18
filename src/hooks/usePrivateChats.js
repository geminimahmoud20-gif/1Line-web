import { useEffect, useSyncExternalStore } from 'react';
import { subscribeToChats } from '../firebaseLazy';
import { sortChats, unreadChats } from '../utils/privateChat';

// One subscription for the whole CRM: the sidebar badge and the chat page read the same list of private conversations.
let state = { chats: [], ready: false, failed: false };
const listeners = new Set();
let stop = null;
let current = '';
const set = (next) => { state = next; listeners.forEach((l) => l()); };
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };

/** Call once, high in the CRM */
export function usePrivateChatsSync(uid) {
  useEffect(() => {
    if (!uid) return undefined;
    if (uid !== current) {
      if (stop) stop();
      current = uid;
      set({ chats: [], ready: false, failed: false });
      stop = subscribeToChats(uid, (chats) => set(chats ? { chats: sortChats(chats), ready: true, failed: false } : { chats: [], ready: true, failed: true }));
    }
    return () => { if (stop) { stop(); stop = null; } current = ''; };
  }, [uid]);
}

/** { chats, ready, failed, unread }: this person's conversations, newest first, and how many have something new */
export function usePrivateChats(uid) {
  const s = useSyncExternalStore(subscribe, () => state, () => state);
  return { ...s, unread: unreadChats(s.chats, uid) };
}
