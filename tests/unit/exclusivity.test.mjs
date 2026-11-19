import test from 'node:test';
import assert from 'node:assert/strict';
import { exclusiveStatus, exclusiveLabel, exclusiveSummary, cleanExclusive, EXCLUSIVE_SOON_DAYS, todayKey } from '../../src/utils/exclusivity.js';

const TODAY = '2026-11-19';
const on = (until, from = '2026-10-01') => ({ exclusive: true, exclusiveFrom: from, exclusiveUntil: until });

test('where an agreement stands: active, soon, ending today, expired, open-ended, or not exclusive', () => {
  assert.deepEqual(exclusiveStatus(null, TODAY), { status: 'none', daysLeft: null });
  assert.deepEqual(exclusiveStatus({ exclusive: false, exclusiveUntil: '2027-01-01' }, TODAY), { status: 'none', daysLeft: null });
  assert.deepEqual(exclusiveStatus(on('2026-12-31'), TODAY), { status: 'active', daysLeft: 42 });
  assert.deepEqual(exclusiveStatus(on('2026-12-03'), TODAY), { status: 'soon', daysLeft: EXCLUSIVE_SOON_DAYS });
  assert.deepEqual(exclusiveStatus(on('2026-12-04'), TODAY), { status: 'active', daysLeft: EXCLUSIVE_SOON_DAYS + 1 });
  assert.deepEqual(exclusiveStatus(on('2026-11-19'), TODAY), { status: 'soon', daysLeft: 0 });
  assert.deepEqual(exclusiveStatus(on('2026-11-18'), TODAY), { status: 'expired', daysLeft: -1 });
  assert.deepEqual(exclusiveStatus({ exclusive: true }, TODAY), { status: 'open', daysLeft: null });
  assert.deepEqual(exclusiveStatus({ exclusive: true, exclusiveUntil: 'garbage' }, TODAY), { status: 'open', daysLeft: null });
});

test('the chip text says how long is left', () => {
  assert.equal(exclusiveLabel(exclusiveStatus(on('2026-12-01'), TODAY)), 'حصري · باقي 12 يوم');
  assert.equal(exclusiveLabel(exclusiveStatus(on('2026-11-19'), TODAY)), 'حصري · ينتهي النهارده');
  assert.equal(exclusiveLabel(exclusiveStatus(on('2026-11-01'), TODAY)), 'الحصرية انتهت');
  assert.equal(exclusiveLabel(exclusiveStatus({ exclusive: true }, TODAY)), 'حصري');
  assert.equal(exclusiveLabel(exclusiveStatus(null, TODAY)), '');
});

const prop = (id, over = {}) => ({ id, price: 1_000_000, status: 'published', ...over });

test('the summary: share of live listings that are exclusive, who ends soon, who already ended', () => {
  const props = [prop('a'), prop('b'), prop('c'), prop('d'), prop('e'), prop('hidden', { status: 'hidden' }), prop('demo', { isDemo: true })];
  const entries = new Map([
    ['a', on('2026-12-31')], ['b', on('2026-11-25')], ['c', on('2026-11-01')], ['d', { exclusive: true }],
    ['hidden', on('2026-12-31')], ['demo', on('2026-12-31')]
  ]);
  const s = exclusiveSummary(props, entries, TODAY);
  assert.equal(s.live, 5);
  assert.equal(s.exclusive, 3, 'a, b and d count; the expired c does not');
  assert.equal(s.share, 60);
  assert.deepEqual(s.soon.map((r) => [r.property.id, r.daysLeft]), [['b', 6]]);
  assert.deepEqual(s.expired.map((r) => r.property.id), ['c']);
  assert.equal(s.open, 1);
  assert.deepEqual(exclusiveSummary([], new Map(), TODAY), { live: 0, exclusive: 0, share: 0, soon: [], expired: [], open: 0 });
});

test('what is saved is clean: real dates only, and an end before the start is dropped', () => {
  assert.deepEqual(cleanExclusive({ exclusive: true, exclusiveFrom: '2026-10-01', exclusiveUntil: '2026-12-01' }), { exclusive: true, exclusiveFrom: '2026-10-01', exclusiveUntil: '2026-12-01' });
  assert.deepEqual(cleanExclusive({ exclusive: true, exclusiveFrom: '2026-10-01', exclusiveUntil: '2026-09-01' }), { exclusive: true, exclusiveFrom: '2026-10-01', exclusiveUntil: '' });
  assert.deepEqual(cleanExclusive({ exclusive: 'yes', exclusiveFrom: '1/2/2026' }), { exclusive: false, exclusiveFrom: '', exclusiveUntil: '' });
  assert.match(todayKey(Date.parse('2026-11-19T22:30:00Z')), /^2026-11-20$/, 'Cairo is already the next day at 00:30');
});

import { exclusiveAlerts, exclusiveAlertPayload } from '../../src/utils/exclusivity.js';

test('alerts: each agreement is announced once as it crosses 14, 7, 3 days and the day it ends', () => {
  const entries = new Map([['a', on('2026-12-03')], ['far', on('2027-03-01')], ['open', { exclusive: true }], ['off', { exclusive: false, exclusiveUntil: '2026-11-20' }]]);
  let r = exclusiveAlerts(entries, {}, '2026-11-19');
  assert.deepEqual(r.fresh.map((f) => [f.id, f.daysLeft]), [['a', 14]]);
  assert.deepEqual(r.next, { a: 14 });
  // the same day again: nothing new
  assert.deepEqual(exclusiveAlerts(entries, r.next, '2026-11-19').fresh, []);
  // a week later it crosses 7, then 3, then ends
  r = exclusiveAlerts(entries, r.next, '2026-11-26');
  assert.deepEqual([r.fresh.map((f) => f.id), r.next], [['a'], { a: 7 }]);
  assert.deepEqual(exclusiveAlerts(entries, r.next, '2026-11-27').fresh, [], '6 days left is still the 7 threshold');
  r = exclusiveAlerts(entries, r.next, '2026-11-30');
  assert.deepEqual([r.fresh.map((f) => f.daysLeft), r.next], [[3], { a: 3 }]);
  r = exclusiveAlerts(entries, r.next, '2026-12-03');
  assert.deepEqual([r.fresh.map((f) => f.daysLeft), r.next], [[0], { a: 0 }]);
  assert.deepEqual(exclusiveAlerts(entries, r.next, '2026-12-04').fresh, [], 'the day after it ended: already announced');
});

test('alerts: a renewed agreement is forgotten, so it can be announced again; one long ended is never news', () => {
  const entries = new Map([['a', on('2027-06-01')], ['old', on('2026-10-01')]]);
  const r = exclusiveAlerts(entries, { a: 3, old: 0 }, '2026-11-19');
  assert.deepEqual(r.next, {}, 'renewed (far out) and long ended are both dropped');
  assert.deepEqual(r.fresh, []);
  // later the renewed one gets close again and is announced afresh
  assert.deepEqual(exclusiveAlerts(new Map([['a', on('2027-06-01')]]), r.next, '2027-05-20').fresh.map((f) => f.daysLeft), [12]);
});

test('alerts: the closest agreement comes first, and the push reads plainly', () => {
  const entries = new Map([['x', on('2026-11-25')], ['y', on('2026-11-19')], ['z', on('2026-11-17')]]);
  const { fresh } = exclusiveAlerts(entries, {}, '2026-11-19');
  assert.deepEqual(fresh.map((f) => f.id), ['z', 'y', 'x']);
  const p = exclusiveAlertPayload(fresh, { x: 'شقة أ', y: 'فيلا ب', z: 'محل ج' });
  assert.equal(p.title, '3 اتفاقات حصرية محتاجة تجديد');
  assert.equal(p.body, 'محل ج (انتهت من 2 يوم)، فيلا ب (بتنتهي النهارده)، شقة أ (باقي 6 يوم)');
  assert.equal(p.url, '/crm?tab=properties');
  assert.equal(exclusiveAlertPayload([], {}), null);
  assert.equal(exclusiveAlertPayload(fresh.slice(0, 1), { z: 'محل ج' }).title, 'اتفاق حصري محتاج تجديد');
});
