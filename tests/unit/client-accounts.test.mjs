import test from 'node:test';
import assert from 'node:assert/strict';
import { intlPhone, phoneKey, readAccounts, rememberAccount, findAccount, forgetAccount, MAX_ACCOUNTS, ACCOUNTS_KEY } from '../../src/utils/clientAccounts.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
const acc = (n, extra = {}) => ({ id: `client_${n}`, name: `عميل ${n}`, email: `c${n}@x.com`, whatsapp: `+20100000000${n}`, verified: true, verificationToken: '1L-1234', ...extra });

test('phone formats: local number with the country code, digits as the key', () => {
  assert.equal(intlPhone('+20', '010 1234 5678'), '+201012345678');
  assert.equal(intlPhone('+966', '0501234567'), '+966501234567');
  assert.equal(intlPhone('+20', ''), '');
  assert.equal(phoneKey('+20 101-234-5678'), '201012345678');
});

test('a remembered account is found by its number in any format; the token is not kept', () => {
  const s = memory();
  rememberAccount(s, acc(1));
  const found = findAccount(s, '+20 100 000 0001');
  assert.equal(found.name, 'عميل 1');
  assert.equal(found.id, 'client_1');
  assert.equal(found.verificationToken, undefined);
  assert.equal(findAccount(s, '+201099999999'), null);
});

test('remembering again updates the same entry, and only the newest few stay', () => {
  const s = memory();
  rememberAccount(s, acc(1));
  rememberAccount(s, acc(1, { name: 'الاسم الجديد' }));
  assert.equal(Object.keys(readAccounts(s)).length, 1);
  assert.equal(findAccount(s, '+201000000001').name, 'الاسم الجديد');
  for (let i = 2; i <= MAX_ACCOUNTS + 2; i++) rememberAccount(s, acc(i));
  assert.equal(Object.keys(readAccounts(s)).length, MAX_ACCOUNTS);
  assert.ok(findAccount(s, `+20100000000${MAX_ACCOUNTS + 2}`));
});

test('forgetting removes it; broken storage reads as empty; nameless accounts are ignored', () => {
  const s = memory();
  rememberAccount(s, acc(1));
  assert.equal(forgetAccount(s, '+201000000001'), true);
  assert.equal(findAccount(s, '+201000000001'), null);
  assert.equal(forgetAccount(s, '+201000000001'), false);
  s.setItem(ACCOUNTS_KEY, 'not json');
  assert.deepEqual(readAccounts(s), {});
  assert.equal(rememberAccount(s, { whatsapp: '+201000000009' }), null);
});
