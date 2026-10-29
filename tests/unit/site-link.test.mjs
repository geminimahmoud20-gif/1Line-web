import test from 'node:test';
import assert from 'node:assert/strict';
import { SITE_URL, siteLink, CANONICAL_URL } from '../../src/config/siteConfig.js';

test('shared links always name the official domain', () => {
  assert.equal(CANONICAL_URL, 'https://www.1lineestate.com');
  assert.equal(SITE_URL, CANONICAL_URL);
  assert.equal(siteLink('/demands'), 'https://www.1lineestate.com/demands');
  assert.equal(siteLink('properties/12'), 'https://www.1lineestate.com/properties/12');
  assert.ok(!siteLink('/x').includes('vercel.app'));
});
