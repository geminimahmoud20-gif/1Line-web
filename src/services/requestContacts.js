import { db, auth } from '../firebase.js';

import { collection, doc, setDoc, query, where, limit, onSnapshot, writeBatch, deleteField } from 'firebase/firestore';

import { ADMIN_USER_IDS } from './auth.js';

// ── Request contacts (demands, remote inspections, trade-ins) ───────────────────
// The client's phone/whatsapp/email go to request_contacts/{kind}__{id}, readable only by roles
// that may see client phones (firestore.rules seesClientContacts); the request itself keeps the
// rest, which every CRM role can read. Written in one batch with the request.
export const REQUEST_CONTACT_FIELDS = ['phone', 'whatsapp', 'email'];
const CONTACT_ROLES = ['admin', 'super_admin', 'sales_manager', 'sales_agent', 'agent_east', 'agent_new_sohag'];
const MANAGER_ROLES = ['admin', 'super_admin', 'sales_manager'];

export const requestContactRef = (kind, id) => doc(db, 'request_contacts', `${kind}__${id}`);

export const splitRequestFields = (record) => {
  const rest = {};
  const contact = {};
  for (const [key, value] of Object.entries(record || {})) {
    if (value === undefined) continue;
    if (REQUEST_CONTACT_FIELDS.includes(key)) {
      if (value !== null && value !== '') contact[key] = String(value);
    } else {
      rest[key] = value;
    }
  }
  return { rest, contact };
};

/** The signed-in user's CRM claims: { seesContacts, isManager }. */
export const contactAccess = async () => {
  const user = auth?.currentUser;
  if (!user) return { seesContacts: false, isManager: false };
  try {
    const claims = (await user.getIdTokenResult()).claims || {};
    const isManager = claims.admin === true || ADMIN_USER_IDS.has(user.uid) || MANAGER_ROLES.includes(claims.role);
    return { seesContacts: isManager || CONTACT_ROLES.includes(claims.role), isManager };
  } catch {
    return { seesContacts: false, isManager: false };
  }
};

/** Create a request and its contact doc together; returns the id used. */
export const createRequestWithContact = async (kind, id, record) => {
  const { rest, contact } = splitRequestFields(record);
  const batch = writeBatch(db);
  batch.set(doc(db, kind, id), rest);
  batch.set(requestContactRef(kind, id), { kind, parentId: id, ...contact });
  await batch.commit();
  return id;
};

/** Contact edits made from the CRM go to the contact doc (best effort: roles that can't see phones can't write them either). */
export const updateRequestContact = async (kind, id, contact) => {
  if (Object.keys(contact).length === 0) return;
  try {
    await setDoc(requestContactRef(kind, id), { kind, parentId: String(id), ...contact }, { merge: true });
  } catch (error) {
    if (error?.code !== 'permission-denied') console.error(`Firebase request contact [${kind}] error:`, error);
  }
};

/**
 * Wrap a staff list listener: merge contact docs in for roles allowed to see them, and let a
 * manager's session move phones still stored on the request (older records, older builds)
 * into request_contacts. `start(emit)` must start the list listener and return its unsubscribe.
 */
export const withRequestContacts = (kind, callback, start) => {
  let items = null;
  let meta = {};
  let contacts = new Map();
  let unsubContacts = null;
  let access = { seesContacts: false, isManager: false };
  const migrated = new Set();

  const emit = () => items && callback(items.map((r) => {
    const c = contacts.get(String(r.id));
    if (!c) return r;
    const merged = { ...r };
    REQUEST_CONTACT_FIELDS.forEach((f) => { if (c[f]) merged[f] = c[f]; });
    return merged;
  }), meta);

  const migrateInline = (list) => {
    if (!access.isManager) return;
    list.filter((r) => REQUEST_CONTACT_FIELDS.some((f) => f in r) && !migrated.has(r.id)).forEach((r) => {
      migrated.add(r.id);
      const { contact } = splitRequestFields(r);
      const batch = writeBatch(db);
      batch.set(requestContactRef(kind, String(r.id)), { kind, parentId: String(r.id), ...contact }, { merge: true });
      batch.update(doc(db, kind, String(r.id)), Object.fromEntries(REQUEST_CONTACT_FIELDS.filter((f) => f in r).map((f) => [f, deleteField()])));
      batch.commit().catch((error) => console.error(`Firebase migrate [${kind}] contacts error:`, error));
    });
  };

  const unsubList = start((list, listMeta = {}) => {
    items = list;
    meta = listMeta;
    if (!listMeta.fromCache && !listMeta.error) migrateInline(list);
    emit();
  });

  let stopped = false;
  contactAccess().then((a) => {
    access = a;
    if (stopped || !a.seesContacts) return;
    unsubContacts = onSnapshot(
      query(collection(db, 'request_contacts'), where('kind', '==', kind), limit(1000)),
      (snap) => { contacts = new Map(snap.docs.map((d) => [d.data().parentId, d.data()])); emit(); },
      (err) => { if (err?.code !== 'permission-denied') console.warn(`Firebase request contacts [${kind}] warning:`, err); }
    );
    if (items) migrateInline(items);
  });

  return () => {
    stopped = true;
    if (typeof unsubList === 'function') unsubList();
    if (unsubContacts) unsubContacts();
  };
};
