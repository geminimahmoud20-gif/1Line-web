import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leadKind, kindInfo, requestedVisit, sortByRequestedVisit, describeRequest } from '../../src/utils/leadRequests.js';
import { filterLeads, leadSourceKey } from '../../src/utils/crmLeadViews.js';

const NOW = new Date(2026, 9, 11, 15, 0).getTime(); // 11 Oct 2026, 3 pm local

test('lead kind: old account sign-ups (buyer + client_account) are accounts, not buyers', () => {
  assert.equal(leadKind({ type: 'buyer', source: 'client_account' }), 'client_account');
  assert.equal(leadKind({ type: 'client_account' }), 'client_account');
  assert.equal(leadKind({ type: 'viewing_request', source: 'client_account' }), 'viewing_request');
  assert.equal(leadKind({}), 'buyer');
  assert.equal(kindInfo('reservation_request').ar, 'طلب حجز');
  assert.equal(kindInfo('nonsense').ar, 'طلب جديد');
});

test('requested visit: today, tomorrow, a later date, no date', () => {
  const v = (date, slot) => requestedVisit({ type: 'viewing_request', date, slot }, NOW);
  assert.equal(v('2026-10-11', 'evening').label, 'النهارده مساءً');
  assert.equal(v('2026-10-12', 'morning').label, 'بكرة صباحاً');
  assert.deepEqual([v('2026-10-20').dayDiff, v('2026-10-20').label], [9, '20/10']);
  assert.equal(v('2026-10-09').dayDiff, -2);
  assert.equal(v('', 'evening').label, 'أقرب موعد مساءً');
  assert.equal(requestedVisit({ type: 'buyer', date: '2026-10-12' }, NOW), null);
});

test('viewing requests sort by visit: soonest first, past and undated last', () => {
  const l = (id, date) => ({ id, type: 'viewing_request', date });
  const out = sortByRequestedVisit([l('later', '2026-10-20'), l('none', ''), l('past', '2026-10-01'), l('tomorrow', '2026-10-12'), l('today', '2026-10-11')], NOW);
  assert.deepEqual(out.map((x) => x.id), ['today', 'tomorrow', 'later', 'past', 'none']);
});

test('one-line description names the request, the listing and the visit', () => {
  const text = describeRequest({ name: 'منى', type: 'viewing_request', propertyTitle: 'شقة 150م', propertyId: 'p-120', date: '2026-10-12', slot: 'evening', returningClient: true }, true, NOW);
  assert.equal(text, '👁 طلب معاينة: منى — شقة 150م (P-120) — بكرة مساءً — عميل راجع');
});

test('CRM filters: reservation, viewing and account buttons; accounts left out of buyers', () => {
  const leads = [
    { id: 'r', name: 'a', type: 'reservation_request', status: 'new' },
    { id: 'v', name: 'b', type: 'viewing_request', status: 'new' },
    { id: 'acc_old', name: 'c', type: 'buyer', source: 'client_account', status: 'new' },
    { id: 'acc', name: 'd', type: 'client_account', status: 'new' },
    { id: 'b', name: 'e', type: 'buyer', status: 'new' },
  ];
  const ids = (leadFilter) => filterLeads(leads, { leadFilter, now: NOW }).map((l) => l.id);
  assert.deepEqual(ids('reservation_request'), ['r']);
  assert.deepEqual(ids('viewing_request'), ['v']);
  assert.deepEqual(ids('client_account'), ['acc_old', 'acc']);
  assert.deepEqual(ids('buyer'), ['b']);
  assert.equal(leadSourceKey({ source: 'client_account' }), 'website');
  assert.equal(leadSourceKey({ source: 'طلب معاينة (صفحة العقار)' }), 'website');
});
