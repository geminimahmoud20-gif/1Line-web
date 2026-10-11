import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeValue, toCatalogItems } from '../../api/_catalog-core.js';

test('decodes every Firestore REST value type the catalog uses', () => {
  assert.equal(decodeValue({ stringValue: 'شقة' }), 'شقة');
  assert.equal(decodeValue({ integerValue: '2500000' }), 2500000);
  assert.equal(decodeValue({ doubleValue: 12.5 }), 12.5);
  assert.equal(decodeValue({ booleanValue: false }), false);
  assert.equal(decodeValue({ nullValue: null }), null);
  assert.equal(decodeValue({ timestampValue: '2026-10-11T06:00:00Z' }), '2026-10-11T06:00:00Z');
  assert.deepEqual(decodeValue({ arrayValue: {} }), []);
  assert.deepEqual(
    decodeValue({ mapValue: { fields: { lat: { doubleValue: 26.5 }, tags: { arrayValue: { values: [{ stringValue: 'a' }] } } } } }),
    { lat: 26.5, tags: ['a'] }
  );
});

test('catalog items keep their own id, and tombstones carry nothing but the id', () => {
  const items = toCatalogItems([
    { name: 'projects/p/databases/(default)/documents/properties/abc', fields: { id: { integerValue: '7' }, price: { integerValue: '100' } } },
    { name: 'projects/p/databases/(default)/documents/properties/xyz', fields: { title_ar: { stringValue: 'فيلا' } } },
    { name: 'projects/p/databases/(default)/documents/properties/old', fields: { id: { stringValue: 'old' }, deleted: { booleanValue: true }, price: { integerValue: '1' } } },
  ]);
  assert.deepEqual(items[0], { id: 7, price: 100 });
  assert.deepEqual(items[1], { title_ar: 'فيلا', id: 'xyz' });
  assert.deepEqual(items[2], { id: 'old', deleted: true, updatedAt: null });
});

test('the site falls back to the live listener when the catalog route is missing or wrong', async () => {
  const { fetchPublicCatalog } = await import('../../src/utils/publicCatalog.js');
  const reply = (status, type, body) => async () => ({ ok: status === 200, headers: { get: () => type }, json: async () => body });
  assert.equal(await fetchPublicCatalog(reply(404, 'text/html', null)), null);
  // A preview server answering every path with index.html
  assert.equal(await fetchPublicCatalog(reply(200, 'text/html', null)), null);
  assert.equal(await fetchPublicCatalog(reply(200, 'application/json', { ok: false })), null);
  assert.equal(await fetchPublicCatalog(async () => { throw new Error('offline'); }), null);
  assert.deepEqual(
    await fetchPublicCatalog(reply(200, 'application/json; charset=utf-8', { ok: true, properties: [{ id: 1 }], projects: [] })),
    { properties: [{ id: 1 }], projects: [] }
  );
});
