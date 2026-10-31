// =============================================================
//  Pure helpers for api/catalog.js (no network), unit-tested in tests/unit/catalog-core.test.mjs.
// =============================================================

export const CATALOG_COLLECTIONS = ['properties', 'projects'];
export const PAGE_SIZE = 300;
export const MAX_DOCS = 5000;

/** One Firestore REST value → plain JSON (timestamps as ISO strings, like the client writes them). */
export function decodeValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('geoPointValue' in v) return { latitude: v.geoPointValue.latitude ?? 0, longitude: v.geoPointValue.longitude ?? 0 };
  if ('bytesValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields);
  return null;
}

export const decodeFields = (fields = {}) =>
  Object.fromEntries(Object.entries(fields || {}).map(([k, val]) => [k, decodeValue(val)]));

/**
 * REST documents → the list subscribeToCatalog hands the app: { ...data, id } with the item's own
 * id field winning. Tombstones stay (as { id, deleted }) so visitors' cached copies drop the item.
 * An item waiting for (or refused) the general manager's approval goes out as a tombstone too:
 * visitors never receive it (src/utils/publishApproval.js).
 */
export function toCatalogItems(documents = []) {
  return documents.map((d) => {
    const data = decodeFields(d.fields);
    const docId = String(d.name || '').split('/').pop();
    const id = data.id ?? docId;
    const offSite = data.deleted || data.approval === 'pending' || data.approval === 'rejected';
    return offSite ? { id, deleted: true, updatedAt: data.updatedAt || null } : { ...data, id };
  });
}
