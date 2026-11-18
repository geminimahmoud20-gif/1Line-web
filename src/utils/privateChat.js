// =============================================================
//  Private team chats: a conversation between two colleagues («dm») or a small private group. Only the
//  people in `members` can read it (firestore.rules: chats and chats/{id}/messages): not the other
//  team members, not the managers, not the admin. Pure functions (tests/unit/private-chat.test.mjs).
// =============================================================
export const MESSAGE_MAX = 2000;
export const PREVIEW_MAX = 120;
export const TITLE_MAX = 60;
export const GROUP_MAX = 30;

/** The one conversation between two people: the same id whoever opens it first */
export const dmId = (a, b) => `dm_${[String(a), String(b)].sort().join('_')}`;

const squash = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
export const previewOf = (text) => {
  const t = squash(text);
  return t.length > PREVIEW_MAX ? `${t.slice(0, PREVIEW_MAX - 1)}…` : t;
};

/**
 * A new conversation document and its id, or null when it can't be made (nobody to talk to, too many
 * people, a group with no name). `others`: uids of the colleagues; `me`: the signed-in person's uid.
 */
export function buildChat({ me, others = [], title = '', now = Date.now() } = {}) {
  const uid = String(me || '');
  const rest = [...new Set(others.map(String).filter((u) => u && u !== uid))];
  if (!uid || rest.length === 0 || rest.length + 1 > GROUP_MAX) return null;
  const members = [uid, ...rest].sort();
  if (rest.length === 1) {
    return { id: dmId(uid, rest[0]), data: { kind: 'dm', members, createdBy: uid, createdAt: now, lastMessageAt: 0, reads: { [uid]: now } } };
  }
  const name = squash(title).slice(0, TITLE_MAX);
  if (!name) return null;
  return { id: null, data: { kind: 'group', title: name, members, createdBy: uid, createdAt: now, lastMessageAt: 0, reads: { [uid]: now } } };
}

/** A message document, or null when it is empty */
export function buildMessage({ text, author, now = Date.now() } = {}) {
  const body = String(text ?? '').replace(/\r\n/g, '\n').trim().slice(0, MESSAGE_MAX);
  if (!body || !author?.uid) return null;
  return { text: body, authorUid: String(author.uid), authorName: squash(author.name).slice(0, 80) || 'عضو', createdAt: now };
}

/** What changes on the conversation document when a message is sent (so the list can sort and preview it) */
export const afterSend = (message) => ({ lastMessageAt: message.createdAt, lastMessageText: previewOf(message.text), lastSenderUid: message.authorUid });

/** A message from someone else that this person has not opened yet */
export const isUnread = (chat, uid) => Boolean(chat?.lastMessageAt) && chat.lastSenderUid !== uid && Number(chat.lastMessageAt) > Number(chat.reads?.[uid] || 0);
export const unreadChats = (chats = [], uid) => chats.filter((c) => isUnread(c, uid)).length;

/** Newest conversation first; one never written in goes by its creation */
export const sortChats = (chats = []) => [...chats].sort((a, b) => (Number(b.lastMessageAt || b.createdAt || 0) - Number(a.lastMessageAt || a.createdAt || 0)));

/** The name a conversation shows: the colleague's for a dm, the group's title otherwise */
export function chatTitle(chat, uid, people = [], isAr = true) {
  if (chat?.kind === 'group') return chat.title || (isAr ? 'مجموعة' : 'Group');
  const other = (chat?.members || []).find((m) => m !== uid);
  return people.find((p) => p.uid === other)?.name || (isAr ? 'زميل' : 'Colleague');
}

/** Members of a group, as names, for its subtitle */
export const memberNames = (chat, people = [], uid = '') => (chat?.members || []).filter((m) => m !== uid).map((m) => people.find((p) => p.uid === m)?.name || '').filter(Boolean);
