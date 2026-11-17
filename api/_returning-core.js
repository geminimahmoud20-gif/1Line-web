// =============================================================
//  Looking up a client's earlier requests by phone, for api/assign.js. The Firestore REST caller (`fs`) and the
//  document reader (`plain`) are passed in, so tests/unit/returning-lookup.test.mjs runs it against a fake database.
// =============================================================
import { phoneVariants, returningOwner } from './_assign-core.js';

/**
 * The owner this lead's person already has, or null (no phone, no earlier request, or any failure: the caller then
 * falls back to the fewest-clients rule).
 * @param {(method: string, path: string, body?: object) => Promise<{ok: boolean, json: () => Promise<any>}>} fs
 * @param {(doc: object) => object} plain  Firestore document -> plain object
 */
export async function lookupReturning({ fs, plain, lead, id, sellers }) {
  try {
    const variants = phoneVariants(lead?.phone || lead?.whatsapp);
    if (!variants.length) return null;
    const ids = new Set();
    // The phone may be stored as «phone» or «whatsapp» on the contact record
    for (const field of ['phone', 'whatsapp']) {
      const cq = await fs('POST', ':runQuery', {
        structuredQuery: {
          from: [{ collectionId: 'lead_contacts' }],
          where: { fieldFilter: { field: { fieldPath: field }, op: 'IN', value: { arrayValue: { values: variants.map((v) => ({ stringValue: v })) } } } },
          limit: 20
        }
      });
      if (!cq.ok) continue;
      for (const r of await cq.json()) if (r.document) ids.add(String(r.document.name).split('/').pop());
    }
    ids.delete(String(id));
    const earlier = [];
    for (const earlierId of [...ids].slice(0, 10)) {
      const r = await fs('GET', `leads/${encodeURIComponent(earlierId)}`);
      if (r.ok) earlier.push({ id: earlierId, ...plain(await r.json()) });
    }
    return returningOwner(earlier, sellers);
  } catch (e) {
    console.error('assign: returning-client lookup failed:', e?.message || e);
    return null;
  }
}
