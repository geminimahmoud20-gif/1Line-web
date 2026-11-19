import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellerRoleOf, SELLER_ROLE_LABEL } from '../../src/utils/sellerRole.js';

test('the role comes from the form answer first', () => {
  assert.equal(sellerRoleOf({ details: { sellerRole: 'broker' }, notes: 'المالك | عرض بيع' }), 'broker');
  assert.equal(sellerRoleOf({ sellerRole: 'owner' }), 'owner');
});

test('older requests are read from the notes prefix', () => {
  assert.equal(sellerRoleOf({ notes: 'وسيط عقاري | عرض بيع محل تجاري في طهطا' }), 'broker');
  assert.equal(sellerRoleOf({ notes: 'المالك | عرض بيع شقة' }), 'owner');
});

test('unknown stays unknown, never guessed as owner', () => {
  assert.equal(sellerRoleOf({ notes: 'عرض بيع شقة' }), null);
  assert.equal(sellerRoleOf({ details: { sellerRole: 'x' } }), null);
  assert.equal(sellerRoleOf({}), null);
  assert.equal(sellerRoleOf(null), null);
  assert.equal(SELLER_ROLE_LABEL.broker.ar, 'وسيط عقاري');
});

test('a unit added in the CRM records who offers it', () => {
  assert.equal(sellerRoleOf({ details: { listedBy: 'broker' } }), 'broker');
  assert.equal(sellerRoleOf({ details: { listedBy: 'owner' } }), 'owner');
  assert.equal(sellerRoleOf({ details: { listedBy: 'x' } }), null);
});
