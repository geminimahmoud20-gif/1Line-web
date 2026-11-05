import test from 'node:test';
import assert from 'node:assert/strict';
import { matchUnit, rankHomes, answersMessage } from '../../src/utils/buyerMatch.js';

const areas = [{ id: 'new', name_ar: 'سوهاج الجديدة' }, { id: 'd5', name_ar: 'الحي الخامس', parentId: 'new' }, { id: 'east', name_ar: 'شرق' }];
const flat = (extra = {}) => ({ type: 'apartment', title_ar: 'شقة', status: 'published', price: 2_000_000, size: 140, bedrooms: 3, areaKey: 'd5', completionStatus: 'ready', finishing: 'full', ...extra });

test('a home that fits every answer scores 100 with readable reasons', () => {
  const r = matchUnit(flat(), { areas: ['new'], purpose: 'home', family: '5-6', delivery: 'now', payment: 'cash', budget: 2_200_000, minSize: 120 }, areas);
  assert.equal(r.score, 100);
  assert.equal(r.misses.length, 0);
  assert.ok(r.matches.some((t) => t.includes('في حدود ميزانيتك')));
  assert.ok(r.matches.includes('استلام فوري'));
});

test('wrong area, too few rooms and over budget lower the score and say why', () => {
  const r = matchUnit(flat({ areaKey: 'east', bedrooms: 2, price: 3_000_000 }), { areas: ['new'], family: '5-6', payment: 'cash', budget: 2_000_000 }, areas);
  assert.ok(r.score < 50, String(r.score));
  assert.equal(r.misses.length, 3);
});

test('installments: plan within the down payment and monthly limit fits, a cash-only home does not', () => {
  const plan = flat({ paymentType: 'installment', price: 0, downPayment: 300_000, installmentAmount: 15_000, installmentEvery: 1, installmentMonths: 84 });
  const fits = matchUnit(plan, { payment: 'installments', down: 400_000, monthly: 20_000 }, areas);
  assert.ok(fits.matches.some((t) => t.includes('في حدودك')));
  const cashOnly = matchUnit(flat({ price: 2_000_000 }), { payment: 'installments', down: 400_000, monthly: 20_000 }, areas);
  assert.ok(cashOnly.misses.some((t) => t.includes('كاش بس')));
  assert.ok(fits.score > cashOnly.score);
});

test('can wait: under construction ranks above ready; urgent: the other way round', () => {
  const uc = flat({ id: 'uc', completionStatus: 'under_construction', deliveryYear: 2028 });
  const ready = flat({ id: 'ready' });
  assert.equal(rankHomes([ready, uc], { delivery: 'wait' }, areas)[0].property.id, 'uc');
  assert.equal(rankHomes([uc, ready], { delivery: 'now' }, areas)[0].property.id, 'ready');
});

test('a marked priority weighs more; shops and hidden listings are left out', () => {
  const near = flat({ id: 'a', areaKey: 'd5', bedrooms: 1 });
  const roomy = flat({ id: 'b', areaKey: 'east', bedrooms: 4 });
  const a = { areas: ['new'], family: '5-6' };
  assert.equal(rankHomes([near, roomy], { ...a, priorities: ['area'] }, areas)[0].property.id, 'a');
  assert.equal(rankHomes([near, roomy], { ...a, priorities: ['rooms'] }, areas)[0].property.id, 'b');
  const out = rankHomes([flat({ type: 'commercial', title_ar: 'محل' }), flat({ status: 'hidden' })], {}, areas);
  assert.equal(out.length, 0);
});

test('the WhatsApp message lists the answers', () => {
  const msg = answersMessage({ priorities: ['area'], areas: ['new'], purpose: 'invest', family: '3-4', delivery: 'wait', payment: 'installments', down: 300000, monthly: 10000 }, (id) => (id === 'new' ? 'سوهاج الجديدة' : id));
  assert.ok(msg.includes('المنطقة: سوهاج الجديدة'));
  assert.ok(msg.includes('الغرض: استثمار'));
  assert.ok(msg.includes('المقدم: 300,000 ج.م'));
});
