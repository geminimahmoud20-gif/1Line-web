import test from 'node:test';
import assert from 'node:assert/strict';
import { trackedListingUrl, leadIdFromSearch, searchWithoutLead, isLeadId, LEAD_PARAM } from '../../src/utils/linkTracking.js';
import { sanitizeOpen, openDocId, firstOpenFields } from '../../api/_link-open-core.js';

test('the link carries the client id, and falls back to the plain link without a usable one', () => {
  assert.equal(trackedListingUrl('https://www.1lineestate.com/', 'p1', 'AbC123xyz'), 'https://www.1lineestate.com/properties/p1?lc=AbC123xyz');
  assert.equal(trackedListingUrl('https://x.com', 'a b', 'lead-1'), 'https://x.com/properties/a%20b?lc=lead-1');
  for (const bad of ['', undefined, null, 'a', '01012345678', '+201012345678', 'x/y', 'a b c']) {
    assert.equal(trackedListingUrl('https://x.com', 'p1', bad), 'https://x.com/properties/p1', String(bad));
  }
});

test('a phone number is never a client tag', () => {
  assert.equal(isLeadId('01001234567'), false);
  assert.equal(isLeadId('AbC123xyz'), true);
  assert.equal(isLeadId(123456), false);
});

test('the tag is read from the address and removed again, keeping other parameters', () => {
  assert.equal(leadIdFromSearch('?lc=AbC123xyz&utm_source=wa'), 'AbC123xyz');
  assert.equal(leadIdFromSearch('?lc=01012345678'), '');
  assert.equal(leadIdFromSearch(''), '');
  assert.equal(searchWithoutLead('?lc=AbC123xyz&utm_source=wa'), '?utm_source=wa');
  assert.equal(searchWithoutLead('?lc=AbC123xyz'), '');
  assert.equal(searchWithoutLead(''), '');
  assert.equal(LEAD_PARAM, 'lc');
});

test('the server takes only two ids, and rejects anything else', () => {
  assert.deepEqual(sanitizeOpen({ lead: 'AbC123xyz', property: 'prop-1' }), { leadId: 'AbC123xyz', propertyId: 'prop-1' });
  assert.equal(sanitizeOpen({ lead: '01012345678', property: 'p1' }), null);
  assert.equal(sanitizeOpen({ lead: 'AbC123xyz', property: '../etc' }), null);
  assert.equal(sanitizeOpen({ lead: 'AbC123xyz' }), null);
  assert.equal(sanitizeOpen(null), null);
  assert.deepEqual(sanitizeOpen({ lead: 'AbC123xyz', property: 'p1', name: 'سارة', phone: '0100' }), { leadId: 'AbC123xyz', propertyId: 'p1' }, 'extra fields are dropped');
});

test('one document per client and listing, with the first open recorded', () => {
  assert.equal(openDocId('L1abc', 'p1'), 'L1abc__p1');
  const f = firstOpenFields({ leadId: 'L1abc', propertyId: 'p1' }, 'u1', '2026-11-19T10:00:00.000Z');
  assert.deepEqual(Object.keys(f).sort(), ['count', 'firstAt', 'lastAt', 'leadId', 'ownerUid', 'propertyId']);
  assert.deepEqual(f.count, { integerValue: '1' });
  assert.deepEqual(f.ownerUid, { stringValue: 'u1' });
});
