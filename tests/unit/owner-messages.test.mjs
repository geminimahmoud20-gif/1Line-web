import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownerMessages, ownerMessageFor } from '../../src/utils/ownerMessages.js';

test('owner messages are about selling, never about buying', () => {
  const lead = { name: 'سامي', type: 'seller', details: { sellerRole: 'owner', size: 120 } };
  const all = ownerMessages(lead, { areaName: 'سوهاج الجديدة', propTypeName: 'شقة' });
  assert.deepEqual(all.map((m) => m.id), ['intro', 'valuation', 'exclusive', 'price', 'buyers', 'docs', 'decline']);
  for (const m of all) {
    assert.ok(m.msg.includes('سامي'), m.id);
    assert.ok(!/وحدات مميزة|قائمة وحدات|ميزانيتك|اشتري/.test(m.msg), m.id);
  }
  assert.match(all[0].msg, /120 م²/);
});

test('no size means no «بمساحة م²»; a broker is not called the owner', () => {
  const m = ownerMessages({ name: 'ك', type: 'seller', details: { sellerRole: 'broker' } })[0].msg;
  assert.ok(!m.includes('بمساحة'));
  assert.match(m, /بتعرضها/);
});

test('the default message follows the stage of the sale', () => {
  const at = (status) => ownerMessageFor({ name: 'س', type: 'seller', status }).id;
  assert.equal(at('new'), 'intro');
  assert.equal(at('contacted'), 'valuation');
  assert.equal(at('site_visit'), 'exclusive');
  assert.equal(at('negotiating'), 'buyers');
});
