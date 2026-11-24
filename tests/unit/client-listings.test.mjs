import test from 'node:test';
import assert from 'node:assert/strict';
import { clientOwnedListings, interestedBuyersFor } from '../../src/utils/clientListings.js';

test('clientOwnedListings finds a unit by details.listingIds on the client\'s own lead', () => {
  const leads = [{ id: 'lead1', details: { listingIds: ['prop-1', 'prop-2'] } }];
  const properties = [{ id: 'prop-1' }, { id: 'prop-2' }, { id: 'prop-3' }];
  const found = clientOwnedListings(properties, leads);
  assert.deepEqual(found.map((p) => p.id), ['prop-1', 'prop-2']);
});

test('clientOwnedListings also finds a unit by its own sourceLeadId pointing back to the client', () => {
  const leads = [{ id: 'lead1' }];
  const properties = [{ id: 'prop-9', sourceLeadId: 'lead1' }, { id: 'prop-10', sourceLeadId: 'lead2' }];
  const found = clientOwnedListings(properties, leads);
  assert.deepEqual(found.map((p) => p.id), ['prop-9']);
});

test('clientOwnedListings is empty for a buyer with no listed units', () => {
  const leads = [{ id: 'lead1', details: { budget: '1000000' } }];
  const properties = [{ id: 'prop-1' }];
  assert.deepEqual(clientOwnedListings(properties, leads), []);
});

test('interestedBuyersFor matches leads carrying this exact propertyId', () => {
  const leads = [
    { id: 1, propertyId: 'prop-1', name: 'أحمد' },
    { id: 2, propertyId: 'prop-2', name: 'سارة' },
    { id: 3, name: 'بلا عقار محدد' }
  ];
  assert.deepEqual(interestedBuyersFor('prop-1', leads).map((l) => l.name), ['أحمد']);
  assert.deepEqual(interestedBuyersFor('prop-9', leads), []);
  assert.deepEqual(interestedBuyersFor('', leads), []);
});
