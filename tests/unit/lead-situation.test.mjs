import test from 'node:test';
import assert from 'node:assert/strict';
import { leadSituation, listingByLead, situationKinds } from '../../src/utils/leadSituation.js';

const at = (h) => new Date(Date.now() - h * 3600000).toISOString();

test('a client with a listing made from him says so, with the listing state', () => {
  const m = listingByLead([{ id: 'p1', sourceLeadId: 'L1', status: 'hidden' }, { id: 'p2', sourceLeadId: 'L2', status: 'sold' }]);
  assert.equal(leadSituation({ id: 'L1' }, m.get('L1')).label, 'اتحوّل لعقار · مسودة غير منشورة');
  assert.equal(leadSituation({ id: 'L2' }, m.get('L2')).tone, 'good');
});

test('a client whose converted listing was rejected says so with bad tone', () => {
  const m = listingByLead([{ id: 'p3', sourceLeadId: 'L3', status: 'hidden', approval: 'rejected' }]);
  const s = leadSituation({ id: 'L3' }, m.get('L3'));
  assert.equal(s.kind, 'converted_rejected');
  assert.equal(s.tone, 'bad');
  assert.match(s.label, /تم رفضه|مرفوض/);
});

test('otherwise the last logged outcome, with the reason when it was «غير مناسب»', () => {
  const l = { id: 'a', outcomes: [{ id: 'reached', at: at(30) }, { id: 'not_fit', at: at(2), reason: 'price' }] };
  const s = leadSituation(l);
  assert.equal(s.kind, 'not_fit');
  assert.equal(s.tone, 'bad');
  assert.match(s.label, /غير مناسب · السعر/);
  const n = leadSituation({ id: 'b', outcomes: [{ id: 'no_answer', at: at(30) }, { id: 'no_answer', at: at(5) }] });
  assert.equal(n.label, 'لم يرد · محاولة 2');
  assert.equal(leadSituation({ id: 'c' }), null);
});

test('situationKinds maps clients to converted / outcome kinds', () => {
  const kinds = situationKinds(
    [{ id: 'L1' }, { id: 'L3', outcomes: [{ id: 'not_fit', at: at(1), reason: 'price' }] }, { id: 'L4' }],
    [{ id: 'p1', sourceLeadId: 'L1', status: 'published' }]
  );
  assert.equal(kinds.get('L1'), 'converted');
  assert.equal(kinds.get('L3'), 'not_fit');
  assert.equal(kinds.has('L4'), false);
});

test('seller lead gets seller-specific outcome labels', () => {
  const s = leadSituation({ id: 's1', type: 'seller', outcomes: [{ id: 'not_fit', at: at(1) }] });
  assert.equal(s.label, 'غير مناسب / صرف نظر');
  assert.equal(s.tone, 'bad');
  const s2 = leadSituation({ id: 's2', type: 'seller', outcomes: [{ id: 'interested', at: at(2) }] });
  assert.equal(s2.label, 'أكّد الرغبة في البيع والسعر');
  assert.equal(s2.tone, 'good');
});
