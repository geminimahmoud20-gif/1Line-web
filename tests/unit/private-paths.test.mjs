import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivatePath } from '../../src/utils/privatePaths.js';

test('CRM and client account pages are private; public pages are not', () => {
  for (const p of ['/crm', '/crm/leads', '/CRM', '/my-account', '/my-account/favorites']) assert.ok(isPrivatePath(p), p);
  for (const p of ['/', '/sell', '/properties/abc', '/crmx', '/my-accounting', '']) assert.equal(isPrivatePath(p), false, p);
});
