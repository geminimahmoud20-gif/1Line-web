import test from 'node:test';
import assert from 'node:assert/strict';
import { carryTouch, isDirectTouch, attributionFacts, TOUCH_TTL_MS } from '../../src/utils/attributionTouches.js';

const NOW = Date.parse('2026-11-13T10:00:00Z');
const ad = { source: 'facebook', medium: 'paid_social', campaign: 'sohag-buyers', content: 'video-01', landingPage: '/match', capturedAt: '2026-11-12T10:00:00Z' };
const direct = { source: 'مباشر (Direct / Organic)', medium: 'none', campaign: 'direct_visit', landingPage: '/sell', capturedAt: '2026-11-13T10:00:00Z' };

test('a visit that came from somewhere is its own touch and is remembered', () => {
  assert.equal(isDirectTouch(ad), false);
  const r = carryTouch(ad, null, NOW);
  assert.equal(r.attribution, ad);
  assert.equal(r.remember, true);
});

test('a direct return within 30 days is credited to the earlier touch', () => {
  const r = carryTouch(direct, ad, NOW);
  assert.equal(r.remember, false);
  assert.equal(r.attribution.campaign, 'sohag-buyers');
  assert.equal(r.attribution.source, 'facebook');
  assert.equal(r.attribution.returning, true);
});

test('an old touch, no touch, or a touch from the future does not stand in', () => {
  assert.equal(carryTouch(direct, { ...ad, capturedAt: new Date(NOW - TOUCH_TTL_MS - 1000).toISOString() }, NOW).attribution, direct);
  assert.equal(carryTouch(direct, null, NOW).attribution, direct);
  assert.equal(carryTouch(direct, { ...ad, capturedAt: '2027-01-01T00:00:00Z' }, NOW).attribution, direct);
  assert.equal(carryTouch(direct, direct, NOW).attribution, direct);
});

test('the profile lists source, campaign, ad, page, return and a different first touch', () => {
  const lead = {
    source: 'website', utmSource: 'facebook',
    marketingAttribution: { ...ad, returning: true, firstTouch: { source: 'google', medium: 'organic', campaign: 'organic_referral', capturedAt: '2026-11-01T10:00:00Z' } }
  };
  const rows = Object.fromEntries(attributionFacts(lead).map(([k, v]) => [k, v]));
  assert.equal(rows['الحملة'], 'sohag-buyers');
  assert.equal(rows['الإعلان / الفيديو'], 'video-01');
  assert.equal(rows['دخل على صفحة'], '/match');
  assert.match(rows['زيارة'], /رجع مباشرة بعد ما جه من facebook/);
  assert.match(rows['أول مرة جه'], /google/);
  // a client typed in by hand: only the source
  assert.deepEqual(attributionFacts({ source: 'manual' }).map(([k]) => k), ['المصدر']);
  // the first touch is not repeated when it is the same as this one
  assert.ok(!attributionFacts({ marketingAttribution: { ...ad, firstTouch: ad } }).some(([k]) => k === 'أول مرة جه'));
});
