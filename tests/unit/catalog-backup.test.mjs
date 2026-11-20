import test from 'node:test';
import assert from 'node:assert/strict';
import { saveLastGood, readLastGood, resetBackupClock, BACKUP_PATH, BACKUP_EVERY_MS } from '../../api/_catalog-backup.js';
import { fetchPublicCatalog } from '../../src/utils/publicCatalog.js';

const good = { ok: true, at: '2026-11-20T00:00:00Z', properties: [{ id: 'p1' }], projects: [], site: null, developers: [], demands: [] };

test('a good catalog is saved, overwriting the same public path, at most once per window', async () => {
  resetBackupClock();
  const calls = [];
  const put = async (path, body, opts) => { calls.push({ path, body, opts }); return { url: 'x' }; };
  assert.equal(await saveLastGood(good, { put, now: 1_000 }), true);
  assert.equal(await saveLastGood(good, { put, now: 1_000 + BACKUP_EVERY_MS - 1 }), false);
  assert.equal(await saveLastGood(good, { put, now: 1_000 + BACKUP_EVERY_MS + 1 }), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].path, BACKUP_PATH);
  assert.deepEqual(JSON.parse(calls[0].body), good);
  assert.equal(calls[0].opts.allowOverwrite, true);
  assert.equal(calls[0].opts.addRandomSuffix, false);
  assert.equal(calls[0].opts.access, 'public');
});

test('saving never throws, skips bad bodies, and retries after a failed write', async () => {
  resetBackupClock();
  assert.equal(await saveLastGood({ ok: false }, { put: async () => ({}) }), false);
  assert.equal(await saveLastGood(good, {}), false);
  let n = 0;
  const flaky = async () => { n++; if (n === 1) throw new Error('blob down'); return {}; };
  assert.equal(await saveLastGood(good, { put: flaky, now: 5 }), false);
  assert.equal(await saveLastGood(good, { put: flaky, now: 6 }), true, 'a failed write does not start the wait');
});

test('reading the saved copy marks it stale; anything missing or broken gives null', async () => {
  const head = async (p) => (p === BACKUP_PATH ? { url: 'https://store/catalog/last-good.json' } : null);
  const fetchImpl = async () => ({ ok: true, json: async () => good });
  const got = await readLastGood({ head, fetchImpl });
  assert.equal(got.stale, true);
  assert.deepEqual(got.properties, good.properties);
  assert.equal(await readLastGood({ head: async () => { throw new Error('not found'); }, fetchImpl }), null);
  assert.equal(await readLastGood({ head, fetchImpl: async () => ({ ok: false }) }), null);
  assert.equal(await readLastGood({ head, fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true }) }) }), null);
  assert.equal(await readLastGood({}), null);
});

const resp = (status, body, type = 'application/json') => ({
  ok: status >= 200 && status < 300, status,
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? type : null) },
  json: async () => (typeof body === 'string' ? JSON.parse(body) : body)
});

test('client: a missing route (dev/preview) is null, so the caller may read the database', async () => {
  assert.equal(await fetchPublicCatalog(async () => resp(404, {})), null);
  assert.equal(await fetchPublicCatalog(async () => resp(200, '<html>', 'text/html')), null);
});

test('client: a route that cannot answer is { failed: true }, never a reason to read the database per visitor', async () => {
  assert.deepEqual(await fetchPublicCatalog(async () => resp(502, { ok: false })), { failed: true });
  assert.deepEqual(await fetchPublicCatalog(async () => { throw new Error('offline'); }), { failed: true });
  assert.deepEqual(await fetchPublicCatalog(async () => resp(200, { ok: false })), { failed: true });
  assert.deepEqual(await fetchPublicCatalog(async () => resp(503, 'oops', 'text/plain')), { failed: true });
});

test('client: a good (or saved, stale) catalog comes through', async () => {
  const got = await fetchPublicCatalog(async () => resp(200, { ...good, stale: true }));
  assert.deepEqual(got.properties, good.properties);
  assert.deepEqual(got.demands, []);
});
