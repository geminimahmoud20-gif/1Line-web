import { test } from 'node:test';
import assert from 'node:assert/strict';
import { offerState, getActiveOffer, getOfferListings, formatTimeLeft, validateOffer, isExtension } from '../../src/utils/propertyOffers.js';

const at = (s) => new Date(s).getTime();
const NOW = at('2026-10-10T12:00:00');
const prop = (offer, extra = {}) => ({ id: 'p1', price: 3_450_000, status: 'published', offer, ...extra });
const cash = (o = {}) => ({ type: 'cash_discount', price: 3_150_000, from: '2026-10-05', until: '2026-10-15', ...o });

test('state follows the dates (inclusive of the last day)', () => {
  assert.equal(offerState(prop(cash()), NOW), 'active');
  assert.equal(offerState(prop(cash({ from: '2026-10-11' })), NOW), 'scheduled');
  assert.equal(offerState(prop(cash({ until: '2026-10-09' })), NOW), 'expired');
  assert.equal(offerState(prop(cash({ until: '2026-10-10' })), at('2026-10-10T23:59:00')), 'active');
  assert.equal(offerState(prop(cash({ until: '2026-10-10' })), at('2026-10-11T00:00:01')), 'expired');
  assert.equal(offerState(prop(null), NOW), 'none');
});

test('an offer that is not cheaper, has no end, or an unknown type is never shown', () => {
  assert.equal(offerState(prop(cash({ price: 3_450_000 })), NOW), 'invalid');
  assert.equal(offerState(prop(cash({ price: 3_600_000 })), NOW), 'invalid');
  assert.equal(offerState(prop(cash({ until: null })), NOW), 'invalid');
  assert.equal(offerState(prop(cash({ type: 'mystery' })), NOW), 'none');
  assert.equal(getActiveOffer(prop(cash({ price: 0 })), NOW), null);
});

test('the "was" price is the listing price and the percent never overstates', () => {
  const o = getActiveOffer(prop(cash({ price: 3_175_000 })), NOW);
  assert.equal(o.basePrice, 3_450_000);
  assert.equal(o.savings, 275_000);
  assert.equal(o.pct, 7); // 7.97% → 7, not 8
  assert.ok(o.msLeft > 0);
});

test('raising the listing price mid-offer does not inflate the discount', () => {
  const p = prop(cash({ basePrice: 3_450_000 }), { price: 4_000_000 });
  assert.equal(getActiveOffer(p, NOW).basePrice, 3_450_000);
  // Lowering it below the saved price is honest and shows the lower "was" price
  assert.equal(getActiveOffer(prop(cash({ basePrice: 3_450_000 }), { price: 3_300_000 }), NOW).basePrice, 3_300_000);
});

test('offer listings: real, published, running — soonest ending first', () => {
  const list = [
    prop(cash({ until: '2026-10-20' }), { id: 'late' }),
    prop(cash({ until: '2026-10-12' }), { id: 'soon' }),
    prop(cash(), { id: 'demo', isDemo: true }),
    prop(cash(), { id: 'sold', status: 'sold' }),
    prop(cash({ from: '2026-10-11' }), { id: 'scheduled' }),
    prop(null, { id: 'plain' })
  ];
  assert.deepEqual(getOfferListings(list, NOW).map((x) => x.property.id), ['soon', 'late']);
});

test('time left reads naturally in Arabic and English', () => {
  const H = 3600000, D = 24 * H;
  assert.equal(formatTimeLeft(3 * D + 5 * H), '3 أيام و5 ساعات');
  assert.equal(formatTimeLeft(2 * D), 'يومين');
  assert.equal(formatTimeLeft(1 * D + 1 * H), 'يوم وساعة');
  assert.equal(formatTimeLeft(12 * D), '12 يوم');
  assert.equal(formatTimeLeft(5 * H + 12 * 60000), '5 ساعات و12 دقيقة');
  assert.equal(formatTimeLeft(45 * 60000), '45 دقيقة');
  assert.equal(formatTimeLeft(10_000), 'دقيقة');
  assert.equal(formatTimeLeft(3 * D + 5 * H, false), '3d 5h');
});

test('validation catches what would mislead or never end', () => {
  const msgs = (o, base = 3_450_000) => validateOffer(o, base, NOW).map((e) => e.en);
  assert.deepEqual(msgs(cash()), []);
  assert.ok(msgs(cash({ price: 3_500_000 })).some((m) => /below/.test(m)));
  assert.ok(msgs(cash({ price: 1_000_000 })).some((m) => /50%/.test(m)));
  assert.ok(msgs(cash({ until: '' })).some((m) => /must end/.test(m)));
  assert.ok(msgs(cash({ until: '2026-10-01' })).some((m) => /past/.test(m)));
  assert.ok(msgs(cash({ from: '2026-10-10', until: '2027-03-01' })).some((m) => /90 days/.test(m)));
  assert.ok(msgs(cash(), 0).some((m) => /listing price first/.test(m)));
});

test('moving a running offer\'s end later counts as an extension', () => {
  assert.equal(isExtension(cash(), cash({ until: '2026-10-20' }), NOW), true);
  assert.equal(isExtension(cash(), cash({ until: '2026-10-12' }), NOW), false);
  assert.equal(isExtension(cash({ from: '2026-10-11' }), cash({ from: '2026-10-11', until: '2026-10-20' }), NOW), false); // not started yet
  assert.equal(isExtension(null, cash(), NOW), false);
});
