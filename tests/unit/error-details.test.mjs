import test from 'node:test';
import assert from 'node:assert/strict';
import { showsTechnicalDetails } from '../../src/utils/errorDetails.js';

test('the stack trace is shown only in the CRM and in development, never on a public page', () => {
  for (const p of ['/', '/properties/abc', '/sohag/apartments-for-sale', '/crm-like-page', '/my-account', '']) assert.equal(showsTechnicalDetails(p, false), false, p);
  for (const p of ['/crm', '/crm/', '/crm/leads']) assert.equal(showsTechnicalDetails(p, false), true, p);
  assert.equal(showsTechnicalDetails('/', true), true, 'development');
});
