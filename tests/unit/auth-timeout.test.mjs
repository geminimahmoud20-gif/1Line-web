import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The sign-in spinner must never be endless: a slow notice first, the sign-in screen after a hard limit.
const src = readFileSync(new URL('../../src/context/AuthContext.jsx', import.meta.url), 'utf8');
const page = readFileSync(new URL('../../src/pages/CrmPage.jsx', import.meta.url), 'utf8');

test('the auth check has a slow notice and a give-up limit', () => {
  const slow = Number(/AUTH_SLOW_MS = (\d+)/.exec(src)?.[1]);
  const giveUp = Number(/AUTH_GIVE_UP_MS = (\d+)/.exec(src)?.[1]);
  assert.ok(slow >= 3000 && slow < giveUp, 'slow notice comes first');
  assert.ok(giveUp <= 20000, 'the spinner ends within 20 seconds');
  assert.match(src, /setIsAuthInitializing\(false\), AUTH_GIVE_UP_MS/);
  assert.match(src, /authSlow,\s*\n\s*handleCrmLogout/);
});

test('the spinner screen shows the slow hint and a retry button', () => {
  assert.match(page, /authSlow &&/);
  assert.match(page, /window\.location\.reload\(\)/);
});
