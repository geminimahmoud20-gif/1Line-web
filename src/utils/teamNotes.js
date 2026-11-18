// =============================================================
//  Team notes and chat: a note on a client, a listing or a project (or in the team's general thread), with
//  @mentions that reach the person as a notification. Pure helpers; storage and access are in
//  src/services/teamNotes.js and firestore.rules (crm_notes, crm_mentions, team_directory).
//  Tests: tests/unit/team-notes.test.mjs
// =============================================================

export const NOTE_MAX = 1500;
export const MAX_MENTIONS = 10;
/** Files on a note: photos and PDFs, a few per note (the upload route /api/cms-upload signs the same list) */
export const MAX_ATTACHMENTS = 4;
export const ATTACH_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const ATTACH_MAX_BYTES = 8 * 1024 * 1024;

/** One attachment as stored on the note, or null when it is not a safe https link to an allowed file */
export function cleanAttachment(a) {
  if (!a || typeof a !== 'object') return null;
  const url = String(a.url || '');
  const size = Number(a.size);
  if (!/^https:\/\/[^\s]{4,380}$/.test(url) || !ATTACH_TYPES.includes(a.type) || !(size > 0 && size <= ATTACH_MAX_BYTES)) return null;
  return { url, name: String(a.name || 'ملف').slice(0, 120), type: a.type, size: Math.round(size) };
}
/** Where a file goes: lead-files/<entity>/<time>-<n>-<name> (the route /api/cms-upload accepts exactly this shape) */
export function attachmentPath(entityId, n, name, now = Date.now()) {
  const folder = String(entityId).replace(/[^\w-]/g, '_').slice(0, 100) || 'x';
  const safe = String(name || '').normalize('NFKD').replace(/[^\w.-]+/g, '-').slice(-60) || 'file';
  return `lead-files/${folder}/${now}-${n}-${safe}`;
}
export const isImageType = (t) => String(t || '').startsWith('image/');
export const fileSizeText = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
export const ENTITY_TYPES = ['lead', 'property', 'project', 'team'];
/** The team's general thread: entityType 'team', this id */
export const TEAM_THREAD_ID = 'general';

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A name ends where a letter, digit or underscore would continue it («@أحمد» must not match inside «@أحمدين»)
const LETTER = /[\p{L}\p{N}_]/u;

/**
 * Every «@name» in the text that points at a known person: the full name, or its first word when only one
 * person has it. [{ uid, start, end }] in reading order; a name must be a whole word.
 */
export function matchMentions(text, people = []) {
  const body = String(text || '');
  if (!body.includes('@')) return [];
  const firstWords = new Map();
  for (const p of people) {
    const w = String(p?.name || '').trim().split(/\s+/)[0];
    if (w) firstWords.set(w, (firstWords.get(w) || 0) + 1);
  }
  const candidates = [];
  for (const p of people) {
    const name = String(p?.name || '').trim();
    if (!p?.uid || !name) continue;
    candidates.push({ uid: p.uid, label: name });
    const first = name.split(/\s+/)[0];
    if (first && first !== name && firstWords.get(first) === 1) candidates.push({ uid: p.uid, label: first });
  }
  candidates.sort((a, b) => b.label.length - a.label.length); // «@أحمد علي» before «@أحمد»
  const found = [];
  for (const c of candidates) {
    const re = new RegExp(`@${escapeRe(c.label)}`, 'giu');
    let m;
    while ((m = re.exec(body))) {
      const end = m.index + m[0].length;
      if (end < body.length && LETTER.test(body[end])) continue;
      if (found.some((f) => m.index < f.end && end > f.start)) continue; // inside a longer name already matched
      found.push({ uid: c.uid, start: m.index, end });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** The uids those mentions point at: without the author and repeats, at most MAX_MENTIONS */
export function mentionedUids(text, people = [], selfUid = '') {
  const out = [];
  for (const m of matchMentions(text, people)) if (m.uid !== selfUid && !out.includes(m.uid)) out.push(m.uid);
  return out.slice(0, MAX_MENTIONS);
}

/** The text cut into [{ text, mention }] so the @names can be shown highlighted */
export function mentionSegments(text, people = []) {
  const body = String(text || '');
  const out = [];
  let at = 0;
  for (const m of matchMentions(body, people)) {
    if (m.start > at) out.push({ text: body.slice(at, m.start), mention: false });
    out.push({ text: body.slice(m.start, m.end), mention: true });
    at = m.end;
  }
  if (at < body.length) out.push({ text: body.slice(at), mention: false });
  return out;
}

/** The «@…» being typed right before the caret: { query, start } or null (what the suggestion list filters by) */
export function mentionDraft(text, caret) {
  const before = String(text || '').slice(0, Math.max(0, caret));
  const m = /(^|[\s(])@([^\s@]{0,30})$/u.exec(before);
  return m ? { query: m[2], start: before.length - m[2].length - 1 } : null;
}

/** First characters of a note, one line, for a notification */
export function noteSnippet(text, max = 120) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * The note document and its mention notifications, or { error } when the text is empty or too long.
 * @returns {{ note: object, mentions: object[] } | { error: 'empty' | 'too-long' }}
 */
export function buildNote({ entityType, entityId, entityName = '', text, author, people = [], attachments = [], now = new Date() }) {
  const body = String(text || '').trim();
  const files = (Array.isArray(attachments) ? attachments : []).map(cleanAttachment).filter(Boolean).slice(0, MAX_ATTACHMENTS);
  if (!body && !files.length) return { error: 'empty' };
  if (body.length > NOTE_MAX) return { error: 'too-long' };
  if (!ENTITY_TYPES.includes(entityType) || !entityId) return { error: 'empty' };
  const mentions = mentionedUids(body, people, author?.uid);
  const createdAt = now.toISOString();
  const note = {
    entityType,
    entityId: String(entityId).slice(0, 128),
    entityName: String(entityName || '').slice(0, 80),
    text: body,
    mentions,
    authorUid: author?.uid || '',
    authorName: String(author?.name || '').slice(0, 80),
    ...(files.length ? { attachments: files } : {}),
    createdAt
  };
  const notices = mentions.map((toUid) => ({
    toUid,
    fromUid: note.authorUid,
    fromName: note.authorName,
    entityType: note.entityType,
    entityId: note.entityId,
    entityName: note.entityName,
    snippet: body ? noteSnippet(body, 140) : `📎 ${files.length === 1 ? files[0].name : `${files.length} مرفقات`}`,
    createdAt
  }));
  return { note, mentions: notices };
}

/** Oldest first, as a conversation reads */
export const sortNotes = (notes = []) => [...notes].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

/** Newest first, unread before read: the list in the mentions menu */
export const sortMentions = (list = []) => [...list].sort((a, b) => (Boolean(a.readAt) - Boolean(b.readAt)) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

export const unreadMentions = (list = []) => list.filter((m) => !m.readAt).length;

/** Words for where a note was written */
export const ENTITY_LABEL = { lead: { ar: 'عميل', en: 'Client' }, property: { ar: 'وحدة', en: 'Listing' }, project: { ar: 'مشروع', en: 'Project' }, team: { ar: 'محادثة الفريق', en: 'Team chat' } };
