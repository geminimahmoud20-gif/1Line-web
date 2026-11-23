import test from 'node:test';
import assert from 'node:assert/strict';
import { freshListings, matchAlerts, matchAlertPayload, freshBuyers, buyerMatchAlerts, buyerMatchAlertPayload, BUYERS_SHOWN } from '../../src/utils/matchAlerts.js';

let n = 0;
const flat = (over = {}) => ({ id: `p${++n}`, title_ar: 'شقة في سوهاج الجديدة', type: 'apartment', areaKey: 'new_sohag', price: 2_000_000, size: 120, bedrooms: 3, status: 'published', approval: 'approved', approvedAt: '2026-11-19T10:00:00Z', ...over });
const buyer = (over = {}) => ({ id: `b${++n}`, name: `عميل ${n}`, status: 'new', type: 'buyer', ownerUid: 'u1', details: { propertyType: 'apartment', area: 'new_sohag', budget: 2_000_000 }, ...over });

test('fresh listings: approved after the last run, live, and not announced before', () => {
  const props = [
    flat({ id: 'a', approvedAt: '2026-11-19T10:00:00Z' }),
    flat({ id: 'old', approvedAt: '2026-11-18T10:00:00Z' }),
    flat({ id: 'done', approvedAt: '2026-11-19T11:00:00Z' }),
    flat({ id: 'pend', approval: 'pending', approvedAt: '2026-11-19T11:00:00Z' }),
    flat({ id: 'sold', status: 'sold', approvedAt: '2026-11-19T11:00:00Z' }),
    flat({ id: 'demo', isDemo: true, approvedAt: '2026-11-19T11:00:00Z' })
  ];
  assert.deepEqual(freshListings(props, '2026-11-19T00:00:00Z', new Set(['done'])).map((p) => p.id), ['a']);
});

test('a listing that fits is told to the salesperson who owns that buyer, with the buyer\'s name', () => {
  const l = flat();
  const mine = buyer({ name: 'أحمد' });
  const map = matchAlerts([l], [mine]);
  assert.deepEqual([...map.keys()], ['u1']);
  const e = map.get('u1');
  assert.equal(e.buyerCount, 1);
  assert.deepEqual(e.items[0].buyers.map((b) => b.name), ['أحمد']);
});

test('buyers go to their own owner; a buyer with no owner, an owner selling, a closed or archived one are skipped', () => {
  const l = flat();
  const leads = [
    buyer({ ownerUid: 'u1' }), buyer({ ownerUid: 'u2' }),
    buyer({ ownerUid: '' }), buyer({ ownerUid: undefined }),
    buyer({ type: 'seller', details: { propertyType: 'apartment', area: 'new_sohag', budget: 2_000_000, sellerRole: 'owner' } }),
    buyer({ status: 'closed' }), buyer({ status: 'lost' }), buyer({ isArchived: true })
  ];
  const map = matchAlerts([l], leads);
  assert.deepEqual([...map.keys()].sort(), ['u1', 'u2']);
});

test('a buyer who turned the listing down, or whose request does not fit, is not told', () => {
  const l = flat({ id: 'x1' });
  const leads = [
    buyer({ details: { propertyType: 'apartment', area: 'new_sohag', budget: 2_000_000, matchDismissed: ['x1'] } }),
    buyer({ details: { propertyType: 'villa', area: 'new_sohag', budget: 2_000_000 } }),
    buyer({ details: { propertyType: 'apartment', area: 'east_sohag', budget: 2_000_000 } }),
    buyer({ details: { propertyType: 'apartment', area: 'new_sohag', budget: 500_000 } })
  ];
  assert.equal(matchAlerts([l], leads).size, 0);
});

test('names shown are capped, the rest are counted; the payload is a short push', () => {
  const l = flat({ title_ar: 'شقة مميزة' });
  const leads = Array.from({ length: BUYERS_SHOWN + 2 }, (_, i) => buyer({ name: `ع${i}` }));
  const e = matchAlerts([l], leads).get('u1');
  assert.equal(e.items[0].total, BUYERS_SHOWN + 2);
  assert.equal(e.items[0].buyers.length, BUYERS_SHOWN);
  const p = matchAlertPayload(e);
  assert.equal(p.title, `عقار جديد مناسب لـ ${BUYERS_SHOWN + 2} من عملاءك`);
  assert.match(p.body, /شقة مميزة — 2,000,000 ج\.م: /);
  assert.match(p.body, /و2 غيرهم/);
  assert.equal(p.url, '/crm?tab=matching');
});

test('several listings for one person come as one push', () => {
  const leads = [buyer({ name: 'سارة' })];
  const e = matchAlerts([flat({ title_ar: 'شقة أ' }), flat({ title_ar: 'شقة ب' }), flat({ title_ar: 'شقة ج' })], leads).get('u1');
  const p = matchAlertPayload(e);
  assert.equal(p.title, '3 عقارات جديدة مناسبة لعملاءك');
  assert.match(p.body, /و1 غيرهم/);
  assert.equal(matchAlertPayload(null), null);
});

// ── The other direction: a new buyer already fits a live listing ──

test('freshBuyers keeps only open buyers with an owner, not already announced', () => {
  const leads = [
    buyer({ id: 'a' }),
    buyer({ id: 'seller', type: 'seller', details: { propertyType: 'apartment', area: 'new_sohag', budget: 2_000_000, sellerRole: 'owner' } }),
    buyer({ id: 'noowner', ownerUid: '' }),
    buyer({ id: 'archived', isArchived: true }),
    buyer({ id: 'done' })
  ];
  assert.deepEqual(freshBuyers(leads, new Set(['done'])).map((l) => l.id), ['a']);
});

test('a fresh buyer whose request already fits a live listing is told to their own salesperson', () => {
  const l = flat({ title_ar: 'شقة في سوهاج الجديدة' });
  const mine = buyer({ name: 'نور', ownerUid: 'u1' });
  const map = buyerMatchAlerts([mine], [l]);
  assert.deepEqual([...map.keys()], ['u1']);
  const e = map.get('u1');
  assert.equal(e.listingCount, 1);
  assert.equal(e.items[0].lead.name, 'نور');
  assert.deepEqual(e.items[0].listings.map((p) => p.title), ['شقة في سوهاج الجديدة']);
});

test('a buyer with no fitting live listing, or a dismissed one, gets no entry', () => {
  const l = flat({ id: 'y1' });
  const leads = [
    buyer({ details: { propertyType: 'villa', area: 'new_sohag', budget: 2_000_000 } }),
    buyer({ details: { propertyType: 'apartment', area: 'new_sohag', budget: 2_000_000, matchDismissed: ['y1'] } })
  ];
  assert.equal(buyerMatchAlerts(leads, [l]).size, 0);
});

test('several fresh buyers for one salesperson come as one push, names and counts capped', () => {
  const props = [flat({ title_ar: 'شقة أ' }), flat({ title_ar: 'شقة ب' })];
  const leads = Array.from({ length: BUYERS_SHOWN + 1 }, (_, i) => buyer({ name: `ع${i}` }));
  const e = buyerMatchAlerts(leads, props).get('u1');
  const p = buyerMatchAlertPayload(e);
  assert.equal(p.title, `عقارات جاهزة تناسب ${BUYERS_SHOWN + 1} من عملاءك الجدد`);
  assert.equal(buyerMatchAlertPayload(null), null);

  const single = buyerMatchAlerts([leads[0]], props).get('u1');
  const sp = buyerMatchAlertPayload(single);
  assert.equal(sp.title, `2 عقار جاهز يناسب ${leads[0].name}`);
  assert.match(sp.body, /شقة أ، شقة ب/);
  assert.equal(sp.url, '/crm?tab=matching');
});
