import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneVariants, returningOwner } from '../../api/_assign-core.js';

test('a phone is looked up in every form it may be stored in', () => {
  const v = phoneVariants('01094590572');
  assert.deepEqual(v.sort(), ['+201094590572', '01094590572', '1094590572', '201094590572'].sort());
  assert.deepEqual(phoneVariants('+20 109 459 0572').sort(), v.sort());
  assert.deepEqual(phoneVariants('٠١٠٩٤٥٩٠٥٧٢').sort(), v.sort());
  assert.deepEqual(phoneVariants('12'), []);
  assert.deepEqual(phoneVariants(''), []);
});

const sellers = [{ uid: 'a', name: 'A' }, { uid: 'b', name: 'B' }];
test('a returning client goes back to the owner of their most recent request', () => {
  const earlier = [
    { id: '1', ownerUid: 'a', createdAt: '2026-11-10T10:00:00Z' },
    { id: '2', ownerUid: 'b', createdAt: '2026-11-12T10:00:00Z' }
  ];
  const r = returningOwner(earlier, sellers);
  assert.equal(r.seller.uid, 'b');
  assert.equal(r.previousLeadId, '2');
});
test('earlier requests with no owner, archived, or owned by someone no longer on the team are skipped', () => {
  const earlier = [
    { id: '1', createdAt: '2026-11-12T10:00:00Z' },
    { id: '2', ownerUid: 'a', isArchived: true, createdAt: '2026-11-12T10:00:00Z' },
    { id: '3', ownerUid: 'gone', createdAt: '2026-11-13T10:00:00Z' }
  ];
  assert.equal(returningOwner(earlier, sellers), null);
  assert.equal(returningOwner([], sellers), null);
});
