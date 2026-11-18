import test from 'node:test';
import assert from 'node:assert/strict';
import { rejectionText, rejectionField, rejectionNotice, uploaderText, REJECT_MARK } from '../../src/utils/listingMeta.js';
import { pushPlan } from '../../src/utils/mentionPush.js';

test('a rejection needs a reason: a listed one, or the manager\'s own words for «other»', () => {
  assert.equal(rejectionText('photos'), 'الصور ناقصة أو مش واضحة');
  assert.equal(rejectionText('price', ' السعر عالي   عن السوق '), 'السعر محتاج مراجعة — السعر عالي عن السوق');
  assert.equal(rejectionText('other', ''), null);
  assert.equal(rejectionText('other', 'ab'), null);
  assert.equal(rejectionText('other', 'مفيش صور للواجهة'), 'مفيش صور للواجهة');
  assert.equal(rejectionText('nope'), null);
});

test('the notice goes to who added it, from the manager, and never to the manager themself', () => {
  const manager = { uid: 'm1', name: 'المدير' };
  const n = rejectionNotice({ property: { id: 'p9', title_ar: 'شقة بحري' }, toUid: 'u7', text: 'الصور ناقصة', manager, now: '2026-11-18T10:00:00Z' });
  assert.equal(n.toUid, 'u7');
  assert.equal(n.fromUid, 'm1');
  assert.equal(n.entityType, 'property');
  assert.ok(n.snippet.startsWith(REJECT_MARK));
  assert.ok(n.snippet.length <= 160);
  assert.equal(rejectionNotice({ property: { id: 'p9' }, toUid: 'm1', text: 'x', manager }), null);
  assert.equal(rejectionNotice({ property: { id: 'p9' }, toUid: '', text: 'x', manager }), null);
  assert.deepEqual(Object.keys(rejectionField('x', manager)).sort(), ['at', 'byName', 'byUid', 'reason']);
});

test('the phone push says the listing was sent back', () => {
  const now = Date.parse('2026-11-18T10:05:00Z');
  const notice = rejectionNotice({ property: { id: 'p9', title_ar: 'شقة بحري' }, toUid: 'u7', text: 'الصور ناقصة', manager: { uid: 'm1', name: 'المدير' }, now: '2026-11-18T10:00:00Z' });
  const [p] = pushPlan([{ id: 'x', ...notice }], { now });
  assert.match(p.title, /المدير رجّع/);
  assert.match(p.body, /^اترفضت: الصور ناقصة/);
});

test('the list says who added a listing, and nothing for older ones', () => {
  assert.match(uploaderText({ submittedByName: 'محمود', submittedAt: '2026-11-12T08:00:00Z' }), /^رفعه محمود · /);
  assert.equal(uploaderText({}), '');
  assert.equal(uploaderText(null), '');
});
