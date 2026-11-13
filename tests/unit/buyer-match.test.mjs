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

test('every kind of property: only listings of the kind asked for are ranked', async () => {
  const { rankUnits } = await import('../../src/utils/buyerMatch.js');
  const shop = flat({ id: 'shop', type: 'shop', title_ar: 'محل تجاري', bedrooms: 0 });
  const plot = flat({ id: 'plot', type: 'land', title_ar: 'أرض', bedrooms: 0, completionStatus: '' });
  const home = flat({ id: 'home' });
  assert.deepEqual(rankUnits([shop, plot, home], { kind: 'commercial' }, areas).map((x) => x.property.id), ['shop']);
  assert.deepEqual(rankUnits([shop, plot, home], { kind: 'land' }, areas).map((x) => x.property.id), ['plot']);
  assert.deepEqual(rankUnits([shop, plot, home], {}, areas).map((x) => x.property.id), ['home']);
});

test('a shop is not judged by rooms, and land not by handover or purpose', () => {
  const shop = flat({ type: 'shop', title_ar: 'محل', bedrooms: 0, completionStatus: 'ready' });
  const r = matchUnit(shop, { kind: 'commercial', family: '7+', purpose: 'home', delivery: 'now', payment: 'cash', budget: 2_500_000 }, areas);
  assert.equal(r.score, 100);
  assert.ok(r.matches.includes('جاهزة تبدأ فيها على طول'));
  const plot = flat({ type: 'land', title_ar: 'أرض', completionStatus: '' });
  const p = matchUnit(plot, { kind: 'land', purpose: 'invest', delivery: 'now', payment: 'cash', budget: 2_500_000 }, areas);
  assert.equal(p.score, 100);
});

test('investing in a rented shop reads as income from day one', () => {
  const shop = flat({ type: 'shop', title_ar: 'محل', features_ar: ['مؤجر حالياً'] });
  const r = matchUnit(shop, { kind: 'commercial', purpose: 'invest' }, areas);
  assert.ok(r.matches.some((t) => t.includes('مؤجّرة حالياً')));
});

test('the WhatsApp message names the kind and the purpose for it', async () => {
  const msg = answersMessage({ kind: 'land', purpose: 'home', payment: 'cash', budget: 1_000_000 });
  assert.ok(msg.includes('بدوّر على: أرض مباني'));
  assert.ok(msg.includes('الغرض: أبني عليها لنفسي'));
});

test('the buyer’s answers become readable rows for the client profile', async () => {
  const { answersFacts } = await import('../../src/utils/buyerMatch.js');
  const rows = answersFacts({ kind: 'residential', purpose: 'home', areas: ['new_sohag'], family: '3-4', minSize: '120', delivery: 'now', payment: 'installments', down: '300000', monthly: '8000', priorities: ['price', 'area'] }, ['سوهاج الجديدة']);
  const map = Object.fromEntries(rows.map(([k, v]) => [k, v]));
  assert.equal(map['بيدوّر على'], 'شقة');
  assert.equal(map['المنطقة'], 'سوهاج الجديدة');
  assert.equal(map['الأسرة'], '3 أو 4 أفراد');
  assert.equal(map['المساحة'], 'من 120 م²');
  assert.equal(map['الاستلام'], 'مستعجل (فوري)');
  assert.equal(map['المقدم'], '300,000 ج.م');
  assert.equal(map['القسط الشهري'], '8,000 ج.م');
  assert.equal(map['أهم حاجة عنده'], 'السعر ونظام السداد، الموقع');
  assert.equal(map['الميزانية (كاش)'], undefined);
  assert.deepEqual(answersFacts(undefined), []);
  assert.deepEqual(answersFacts({}), []);
  assert.equal(Object.fromEntries(answersFacts({ kind: 'land', payment: 'cash', budget: '900000', anyArea: true }))['الميزانية (كاش)'], '900,000 ج.م');
});
