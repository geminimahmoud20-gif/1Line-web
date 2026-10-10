import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneVariants } from '../../src/utils/phoneVariants.js';

test('phoneVariants: local, +20, 20 and 0020 forms from any of them', () => {
  for (const input of ['01012345678', '+201012345678', '201012345678', '00201012345678', '1012345678']) {
    const v = phoneVariants(input);
    for (const form of ['01012345678', '+201012345678', '201012345678', '00201012345678']) assert.ok(v.includes(form), `${input} → ${form}`);
  }
  assert.ok(phoneVariants('010 1234 5678').includes('010 1234 5678')); // as typed, too
  assert.deepEqual(phoneVariants('12'), []);
});

test('phoneVariants: expat numbers keep their own country code', () => {
  for (const input of ['+966501234567', '00966501234567', '966501234567']) {
    const v = phoneVariants(input);
    for (const form of ['+966501234567', '00966501234567', '966501234567']) assert.ok(v.includes(form), `${input} → ${form}`);
    assert.ok(!v.some((f) => f.includes('20966')), `${input}: no Egyptian prefix`);
  }
});
