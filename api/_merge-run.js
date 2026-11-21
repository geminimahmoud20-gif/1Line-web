// =============================================================
//  Writes «this request joins the client's open one» (the rules are in api/_merge-core.js): used by
//  api/assign.js (right after a form is saved) and api/merge-duplicates.js (the sweep that catches what slipped).
//  `fs` is a Firestore REST caller (method, path, body) → fetch Response. Any failure returns null and leaves
//  the record as a normal lead.
// =============================================================
import { findEarlier } from './_returning-core.js';
import { pickPrimary, mergeFields, toFirestore } from './_merge-core.js';

const fromValue = (v) => {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  return null;
};
export const plain = (doc) => Object.fromEntries(Object.entries(doc?.fields || {}).map(([k, v]) => [k, fromValue(v)]));

/** Writes the merge; returns the open lead's id, or null when there is nothing to merge into (or a write failed) */
export async function mergeIntoOpen({ fs, id, lead, doc }) {
  try {
    const earlier = await findEarlier({ fs, plain, lead, id });
    const primary = pickPrimary(earlier, lead);
    if (!primary) return null;
    const nowIso = new Date().toISOString();
    const fields = mergeFields(primary, lead, id, nowIso);
    const patch = (docId, f, updateTime) => fs('PATCH', `leads/${encodeURIComponent(docId)}?${Object.keys(f).map((k) => `updateMask.fieldPaths=${k}`).join('&')}&currentDocument.updateTime=${encodeURIComponent(updateTime)}`, {
      fields: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, toFirestore(v)]))
    });
    // The open client first: if that fails nothing has changed. Then this record; if that fails the client has the
    // entry and the CRM's duplicate view still shows the leftover.
    const a = await patch(primary.id, fields.primary, primary.updateTime);
    if (!a.ok) return null;
    const b = await patch(id, fields.incoming, doc.updateTime);
    if (!b.ok) console.error('assign: merged record not archived', b.status);
    const log = await fs('POST', 'audit_logs', {
      fields: {
        actorId: { stringValue: 'system' }, actorUid: { stringValue: 'system' }, actorEmail: { stringValue: 'auto-merge' },
        action: { stringValue: 'LEAD_REQUEST_MERGED' }, type: { stringValue: 'LEAD_REQUEST_MERGED' }, actionType: { stringValue: 'LEAD_REQUEST_MERGED' },
        entityType: { stringValue: 'leads' }, targetCollection: { stringValue: 'leads' }, entityId: { stringValue: primary.id }, targetId: { stringValue: primary.id },
        createdAt: { stringValue: nowIso }, timestamp: { timestampValue: nowIso },
        details: { mapValue: { fields: { from: { stringValue: id } } } }
      }
    });
    if (!log.ok) console.error('assign: merge audit entry not written', log.status);
    return primary.id;
  } catch (e) {
    console.error('assign: merge failed:', e?.message || e);
    return null;
  }
}

