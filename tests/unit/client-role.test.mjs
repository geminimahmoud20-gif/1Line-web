import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientRoleOf, missingFor } from '../../src/utils/clientRole.js';

test('every kind of client says who it is', () => {
  assert.equal(clientRoleOf({ type: 'buyer' }).id, 'buyer');
  assert.equal(clientRoleOf({ type: 'seller', details: { sellerRole: 'owner' } }).id, 'owner');
  assert.equal(clientRoleOf({ type: 'seller', details: { sellerRole: 'broker' } }).id, 'broker_seller');
  assert.equal(clientRoleOf({ type: 'seller' }).id, 'seller_unknown');
  assert.equal(clientRoleOf({ type: 'valuation', details: { sellerRole: 'owner' } }).id, 'owner_valuation');
  assert.equal(clientRoleOf({ type: 'investor' }).id, 'investor');
  assert.equal(clientRoleOf({ type: 'broker', source: 'بوابة الوسطاء والشركاء' }).id, 'broker');
  assert.equal(clientRoleOf({ type: 'account', source: 'تسجيل حساب بالموقع' }).id, 'account');
});

test('what is missing depends on the kind of client', () => {
  const ids = (l) => missingFor(l).map((m) => m.id);
  assert.deepEqual(ids({ type: 'buyer' }), ['budget', 'area', 'propertyType']);
  assert.deepEqual(ids({ type: 'buyer', budget: '1000000', details: { area: 'x', propertyType: 'land' } }), []);
  const owner = ids({ type: 'seller', details: { sellerRole: 'owner' } });
  assert.ok(owner.includes('askingPrice') && owner.includes('size') && owner.includes('address') && owner.includes('photos'));
  assert.ok(!owner.includes('budget'));
  assert.ok(ids({ type: 'seller' }).includes('sellerRole'));
  assert.deepEqual(ids({ type: 'account', source: 'تسجيل حساب بالموقع' }), []);
  assert.deepEqual(ids({ type: 'investor' }), []);
});
