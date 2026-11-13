import test from 'node:test';
import assert from 'node:assert/strict';
import { findMatchingClientsForProperty, scoreBuyer, MATCH_THRESHOLD } from '../../src/utils/matchingEngine.js';

const apartment = { id: 'p1', type: 'apartment', areaKey: 'new_sohag', price: 2000000 };
let n = 0;
const buyer = (details, extra = {}) => ({ id: `l${++n}`, name: `عميل ${n}`, status: 'new', type: 'buyer', phone: `0100000${String(n).padStart(4, '0')}`, details, ...extra });
const ids = (list) => list.map((m) => m.id);

test('the kind is compared by market class, so «residential» from the website fits an apartment', () => {
  const fromForm = buyer({ propertyType: 'residential', area: 'new_sohag', budget: 2000000 });
  const wrongKind = buyer({ propertyType: 'commercial', area: 'new_sohag', budget: 2000000 });
  const out = findMatchingClientsForProperty(apartment, [fromForm, wrongKind]);
  assert.deepEqual(ids(out), [fromForm.id]);
  assert.equal(out[0].score, 100);
});

test('a unit has to fit the budget: far above is dropped, a little above is shown lower, below is fine', () => {
  const room = buyer({ propertyType: 'apartment', area: 'new_sohag', budget: 1600000 });   // unit is 25% above
  const stretch = buyer({ propertyType: 'apartment', area: 'new_sohag', budget: 1800000 }); // 11% above
  const inside = buyer({ propertyType: 'apartment', area: 'new_sohag', budget: 2500000 });
  const rich = buyer({ propertyType: 'apartment', area: 'new_sohag', budget: 6000000 });
  const out = findMatchingClientsForProperty(apartment, [room, stretch, inside, rich]);
  assert.ok(!ids(out).includes(room.id));
  const score = (b) => out.find((m) => m.id === b.id).score;
  assert.equal(score(inside), 100);
  assert.ok(score(stretch) < score(inside));
  assert.ok(score(rich) < score(inside) && score(rich) >= MATCH_THRESHOLD);
});

test('a budget written in words or Arabic digits is read', () => {
  const words = buyer({ propertyType: 'apartment', area: 'new_sohag' }, { budget: '2 مليون' });
  const arabic = buyer({ propertyType: 'apartment', area: 'new_sohag', budget: '٢٠٠٠٠٠٠' });
  const tooLow = buyer({ propertyType: 'apartment', area: 'new_sohag', budget: '1 مليون' });
  const out = findMatchingClientsForProperty(apartment, [words, arabic, tooLow]);
  assert.deepEqual(ids(out).sort(), [words.id, arabic.id].sort());
  assert.ok(out.every((m) => m.score === 100));
});

test('the area counts, and a buyer with no area is open to any', () => {
  const elsewhere = buyer({ propertyType: 'apartment', area: 'akhmeem', budget: 2000000 });
  const open = buyer({ propertyType: 'apartment', budget: 2000000 });
  const out = findMatchingClientsForProperty(apartment, [elsewhere, open]);
  assert.deepEqual(ids(out), [open.id]);
});

test('lead.type is the kind of request, never the kind of property', () => {
  const l = buyer({ area: 'new_sohag', budget: 2000000 }, { type: 'buyer' });
  assert.equal(scoreBuyer(apartment, { type: l.type === 'buyer' ? '' : l.type, area: 'new_sohag', budget: 2000000 }).score, 80);
  const out = findMatchingClientsForProperty(apartment, [l]);
  assert.equal(out.length, 1); // unknown kind is neutral, not a mismatch
  assert.equal(out[0].score, 80);
});

test('closed, lost, archived and seller leads are left out; so is anyone without a number', () => {
  const base = { propertyType: 'apartment', area: 'new_sohag', budget: 2000000 };
  const out = findMatchingClientsForProperty(apartment, [
    buyer(base, { status: 'closed' }), buyer(base, { status: 'lost' }), buyer(base, { isArchived: true }),
    buyer(base, { type: 'seller' }), buyer(base, { phone: '', whatsapp: '' })
  ]);
  assert.equal(out.length, 0);
});

test('the same person registered twice (lead and request) appears once with the best score', () => {
  const lead = buyer({ propertyType: 'apartment', area: 'new_sohag', budget: 2500000 }, { phone: '01011112222' });
  const demand = { id: 'd1', status: 'published', type: 'apartment', area: 'new_sohag', budget: 1900000, phone: '01011112222', clientName: 'نفس العميل' };
  const out = findMatchingClientsForProperty(apartment, [lead], [demand]);
  assert.equal(out.length, 1);
  assert.equal(out[0].score, 100);
});

test('results are best first', () => {
  const best = buyer({ propertyType: 'apartment', area: 'new_sohag', budget: 2200000 });
  const lower = buyer({ propertyType: 'apartment', area: 'new_sohag', budget: 1800000 });
  const out = findMatchingClientsForProperty(apartment, [lower, best]);
  assert.deepEqual(ids(out), [best.id, lower.id]);
});
