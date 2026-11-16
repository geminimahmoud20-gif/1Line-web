import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringMessage } from '../../src/utils/ringMessage.js';

test('message follows the percentage', () => {
  assert.match(ringMessage(0), /نبدأ/);
  assert.match(ringMessage(25), /بداية/);
  assert.match(ringMessage(50), /ماشي/);
  assert.match(ringMessage(80), /قربت/);
  assert.match(ringMessage(100), /جاهز/);
});
test('english copy', () => assert.equal(ringMessage(100, false), 'All set!'));
