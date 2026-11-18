import test from 'node:test';
import assert from 'node:assert/strict';
import { requestOf, missingInRequest } from '../../src/utils/buyerRequest.js';
import { findMatchingClientsForProperty, scoreForBuyer, MATCH_THRESHOLD } from '../../src/utils/matchingEngine.js';
import { rankAndNominateProperties } from '../../src/services/matchingEngineV2.js';

const flat = { id: 'p1', type: 'apartment', areaKey: 'new_sohag', price: 2_000_000, size: 120, bedrooms: 3, status: 'published' };
let n = 0;
const lead = (details = {}, extra = {}) => ({ id: `l${++n}`, name: `عميل ${n}`, status: 'new', type: 'buyer', phone: `0100000${String(n).padStart(4, '0')}`, details, ...extra });

test('a client entered by hand: the plain fields become the request', () => {
  const { answers, complete, source } = requestOf(lead({ propertyType: 'apartment', area: 'new_sohag', budget: '2 مليون', bedrooms: 3 }));
  assert.deepEqual([answers.kind, answers.areas, answers.payment, answers.budget, answers.family], ['residential', ['new_sohag'], 'cash', '2000000', '5-6']);
  assert.deepEqual([complete, source], [false, 'fields']);
  assert.deepEqual(missingInRequest(answers), []);
  assert.deepEqual(missingInRequest(requestOf(lead({})).answers), ['نوع العقار', 'المنطقة', 'الميزانية']);
});

test('what the advisor wrote in «طلب العميل» wins; what is empty still comes from the plain fields', () => {
  const l = lead({ propertyType: 'apartment', area: 'new_sohag', budget: 900000, matchAnswers: { advisor: true, kind: 'residential', payment: 'cash', budget: '2500000', areas: [], minSize: '100' } });
  const { answers, complete, source } = requestOf(l);
  assert.equal(answers.budget, '2500000');
  assert.deepEqual(answers.areas, ['new_sohag']); // not typed in the form: the client's own area
  assert.equal(answers.minSize, '100');
  assert.deepEqual([complete, source], [false, 'advisor']);
  // and the website's own answers are complete: what they left out is «any»
  assert.equal(requestOf(lead({ matchAnswers: { kind: 'residential', payment: 'cash', budget: '2000000', areas: ['new_sohag'] } })).source, 'wizard');
});

test('one scoring everywhere: a client with little written ranks below one with a full request', () => {
  const full = lead({ propertyType: 'apartment', area: 'new_sohag', budget: 2_000_000 });
  const noBudget = lead({ propertyType: 'apartment', area: 'new_sohag' });
  const noArea = lead({ propertyType: 'apartment', budget: 2_000_000 });
  const neither = lead({ propertyType: 'apartment' });
  const s = (l) => scoreForBuyer(flat, l)?.score;
  assert.equal(s(full), 100);
  assert.ok(s(noBudget) < s(full) && s(noBudget) >= MATCH_THRESHOLD);
  assert.ok(s(noArea) < s(full) && s(noArea) >= MATCH_THRESHOLD);
  assert.ok(s(neither) < MATCH_THRESHOLD); // too little to tell
  assert.deepEqual(scoreForBuyer(flat, noBudget).missing, ['الميزانية']);
});

test('the advisor\'s «طلب العميل» changes who the listing goes to', () => {
  const bigger = lead({ propertyType: 'apartment', area: 'new_sohag', budget: 2_500_000, matchAnswers: { advisor: true, kind: 'residential', payment: 'cash', budget: '2500000', minSize: '200' } });
  const rooms = lead({ propertyType: 'apartment', area: 'new_sohag', budget: 2_500_000 });
  const out = findMatchingClientsForProperty(flat, [bigger, rooms]);
  assert.deepEqual(out.map((m) => m.id), [rooms.id]); // 120 m² is under the 200 m² he asked for
});

test('a listing set aside for a client is not offered to him again, in the alerts or in his own list', () => {
  const l = lead({ propertyType: 'apartment', area: 'new_sohag', budget: 2_000_000, matchDismissed: ['p1'] });
  assert.equal(findMatchingClientsForProperty(flat, [l]).length, 0);
  const fresh = lead({ propertyType: 'apartment', area: 'new_sohag', budget: 2_000_000 });
  assert.equal(rankAndNominateProperties(l, [flat], { scorer: scoreForBuyer }).matches.length, 0);
  const own = rankAndNominateProperties(fresh, [flat], { scorer: scoreForBuyer });
  assert.equal(own.matches[0].score, scoreForBuyer(flat, fresh).score); // the same percentage as the alerts
});
