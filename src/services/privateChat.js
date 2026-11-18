import { db, isFirebaseConfigured } from '../firebase.js';
import { collection, doc, getDoc, setDoc, updateDoc, writeBatch, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { buildChat, buildMessage, afterSend } from '../utils/privateChat.js';

// Private team chats (chats and chats/{id}/messages: who reads them is decided in firestore.rules).
const MAX_MESSAGES = 150;

/** callback(chats[]) for every conversation this person is in (sorted by the caller); returns the unsubscribe */
export function subscribeToChats(uid, callback) {
  if (!isFirebaseConfigured() || !db || !uid) { callback([]); return () => {}; }
  return onSnapshot(
    query(collection(db, 'chats'), where('members', 'array-contains', uid)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => { console.warn('chats subscription:', err?.code || err?.message); callback(null); }
  );
}

/** callback(messages[]) oldest first, the latest 150 */
export function subscribeToMessages(chatId, callback) {
  if (!isFirebaseConfigured() || !db || !chatId) { callback([]); return () => {}; }
  return onSnapshot(
    query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'), limit(MAX_MESSAGES)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()),
    (err) => { console.warn('messages subscription:', err?.code || err?.message); callback(null); }
  );
}

/** Opens the conversation with colleagues, creating it when it is new. Returns its id, or null when it could not be made */
export async function openChat({ me, others, title }) {
  if (!isFirebaseConfigured() || !db) return null;
  const chat = buildChat({ me, others, title });
  if (!chat) return null;
  try {
    // One conversation per pair: the same id, so open it if it is already there
    if (chat.id) {
      const existing = await getDoc(doc(db, 'chats', chat.id)).catch(() => null);
      if (existing?.exists()) return chat.id;
      await setDoc(doc(db, 'chats', chat.id), chat.data);
      return chat.id;
    }
    const ref = doc(collection(db, 'chats'));
    await setDoc(ref, chat.data);
    return ref.id;
  } catch (e) {
    console.warn('openChat failed:', e?.code || e?.message);
    return null;
  }
}

/** The message and the conversation's preview, written together. true when sent */
export async function sendChatMessage(chatId, { text, author }) {
  if (!isFirebaseConfigured() || !db || !chatId) return false;
  const message = buildMessage({ text, author });
  if (!message) return false;
  try {
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'chats', chatId, 'messages')), message);
    // sending also means they have seen everything up to here
    batch.update(doc(db, 'chats', chatId), { ...afterSend(message), [`reads.${message.authorUid}`]: message.createdAt });
    await batch.commit();
    return true;
  } catch (e) {
    console.warn('sendChatMessage failed:', e?.code || e?.message);
    return false;
  }
}

/** This person has seen the conversation up to now */
export async function markChatRead(chatId, uid) {
  if (!isFirebaseConfigured() || !db || !chatId || !uid) return false;
  try {
    await updateDoc(doc(db, 'chats', chatId), { [`reads.${uid}`]: Date.now() });
    return true;
  } catch (e) {
    console.warn('markChatRead failed:', e?.code || e?.message);
    return false;
  }
}
