import { test } from 'node:test';
import assert from 'node:assert/strict';
import { persistDemands, DEMANDS_STORAGE_KEY } from '../../src/utils/demandStorage.js';

const memoryStorage = () => {
  const data = {};
  return { data, setItem: (k, v) => { data[k] = String(v); }, getItem: (k) => data[k] ?? null };
};

test('demands are written to storage once, without contact fields', () => {
  const storage = memoryStorage();
  const list = [{ id: 'd1', text_ar: 'شقة', budget: 2000000, phone: '01011111111', whatsapp: '01011111111', email: 'a@b.co', clientName: 'سارة', name: 'سارة' }];
  assert.equal(persistDemands(list, storage), true);
  const saved = JSON.parse(storage.data[DEMANDS_STORAGE_KEY]);
  assert.deepEqual(saved, [{ id: 'd1', text_ar: 'شقة', budget: 2000000 }]);
  assert.equal(list[0].phone, '01011111111'); // the caller's list is not changed
});

test('a full or blocked storage is reported, never thrown (and never recurses)', () => {
  const blocked = { setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.equal(persistDemands([{ id: 'x' }], blocked), false);
});
