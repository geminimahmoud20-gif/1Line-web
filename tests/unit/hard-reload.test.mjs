import test from 'node:test';
import assert from 'node:assert/strict';
import { hardReload, canHardRecover, HARD_RECOVERY_KEY } from '../../src/utils/hardReload.js';

const store = (init = {}) => { const m = { ...init }; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };

test('drops every service worker and cache, then reloads', async () => {
  const unregistered = []; const deleted = []; let reloaded = 0;
  const storage = store();
  await hardReload({
    navigator: { serviceWorker: { getRegistrations: async () => [{ unregister: async () => { unregistered.push(1); return true; } }, { unregister: async () => { unregistered.push(2); return true; } }] } },
    caches: { keys: async () => ['v17', 'other'], delete: async (k) => { deleted.push(k); return true; } },
    storage, reload: () => { reloaded++; }
  }, 1000);
  assert.deepEqual(unregistered, [1, 2]);
  assert.deepEqual(deleted, ['v17', 'other']);
  assert.equal(reloaded, 1);
  assert.equal(storage.m[HARD_RECOVERY_KEY], '1000');
});

test('still reloads when the browser has no service worker, no Cache API, or they throw', async () => {
  let reloaded = 0;
  await hardReload({ navigator: {}, caches: undefined, storage: undefined, reload: () => { reloaded++; } });
  await hardReload({
    navigator: { serviceWorker: { getRegistrations: async () => { throw new Error('x'); } } },
    caches: { keys: async () => { throw new Error('y'); } }, storage: store(), reload: () => { reloaded++; }
  });
  assert.equal(reloaded, 2);
});

test('a hard recovery is tried once a minute at most, so a real outage cannot loop', () => {
  assert.equal(canHardRecover(store(), 5000), true);
  assert.equal(canHardRecover(store({ [HARD_RECOVERY_KEY]: '4000' }), 5000), false);
  assert.equal(canHardRecover(store({ [HARD_RECOVERY_KEY]: '4000' }), 4000 + 61000), true);
  assert.equal(canHardRecover(undefined), true);
});
