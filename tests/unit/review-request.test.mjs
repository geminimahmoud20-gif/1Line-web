import test from 'node:test';
import assert from 'node:assert/strict';
import { canRequestReview, reviewRequestMessage, reviewRequestedAt } from '../../src/utils/reviewRequest.js';
import { normalizeSiteSettings } from '../../src/utils/siteSettings.js';

const URL = 'https://g.page/r/CabcDEF123/review';

test('only a closed deal, with a link set and a number to send to, can be asked', () => {
  assert.equal(canRequestReview({ status: 'closed' }, URL), true);
  assert.equal(canRequestReview({ status: 'negotiating' }, URL), false);
  assert.equal(canRequestReview({ status: 'closed' }, ''), false);
  assert.equal(canRequestReview({ status: 'closed' }, URL, false), false);
  assert.equal(canRequestReview(null, URL), false);
});

test('the message greets by first name, thanks, and ends with the link', () => {
  const m = reviewRequestMessage({ name: 'محمد علي' }, URL);
  assert.match(m, /^أهلاً محمد /);
  assert.match(m, /شكراً إنك اخترت 1Line/);
  assert.equal(m.split('\n').at(-1), URL);
  assert.doesNotMatch(reviewRequestMessage({}, URL).split('\n')[0], /undefined/);
});

test('already-asked is read from the client', () => {
  assert.equal(reviewRequestedAt({ reviewRequestedAt: '2026-11-19T10:00:00Z' }), '2026-11-19T10:00:00Z');
  assert.equal(reviewRequestedAt({}), '');
});

test('the review link in the site settings must be an https Google link', () => {
  const ok = (u) => normalizeSiteSettings({ reviews: { googleUrl: u } }).reviews;
  assert.deepEqual(ok(URL), { googleUrl: URL });
  assert.deepEqual(ok('https://www.google.com/maps/place/x'), { googleUrl: 'https://www.google.com/maps/place/x' });
  assert.deepEqual(ok('http://g.page/r/x/review'), {}, 'not https');
  assert.deepEqual(ok('https://evil.example/g.page/r/x'), {}, 'not a Google host');
  assert.deepEqual(ok('javascript:alert(1)'), {});
  assert.deepEqual(normalizeSiteSettings(null).reviews, {});
});
