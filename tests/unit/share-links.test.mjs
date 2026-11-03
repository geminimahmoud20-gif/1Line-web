import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareTargets, tagged } from '../../src/utils/shareLinks.js';

test('every platform link is tagged with its source', () => {
  const t = shareTargets({ url: 'https://www.1lineestate.com/demands/d1', text: 'مطلوب شقة' });
  assert.equal(decodeURIComponent(t.facebook.split('u=')[1]), 'https://www.1lineestate.com/demands/d1?utm_source=facebook&utm_medium=social_share');
  assert.match(decodeURIComponent(t.whatsapp), /مطلوب شقة\nhttps:\/\/www.1lineestate.com\/demands\/d1\?utm_source=whatsapp/);
  assert.match(t.telegram, /^https:\/\/t.me\/share\/url\?url=.*utm_source%3Dtelegram.*&text=/);
  assert.match(t.x, /utm_source%3Dx/);
  assert.match(t.copy, /utm_source=copy_link&utm_medium=social_share$/);
});

test('a hash stays at the end', () => {
  assert.equal(tagged('https://x.com/demands#demand-1', 'facebook'), 'https://x.com/demands?utm_source=facebook&utm_medium=social_share#demand-1');
});
