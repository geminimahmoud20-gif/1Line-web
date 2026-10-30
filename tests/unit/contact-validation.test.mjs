import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameProblem, phoneProblem, parsePhone, emailProblem, looksLikeFakeNumber } from '../../src/utils/contactValidation.js';

const ok = (v) => assert.equal(v, '', `expected ok, got: ${v}`);
const bad = (v) => assert.notEqual(v, '', 'expected a problem');

test('names: first and family name, letters only, no placeholders', () => {
  for (const n of ['أحمد علي', 'محمد عبد الرحمن', 'Ahmed Ali', 'أ. زكريا الحويج', 'د. محمود الباز', 'Mary-Jane O\'Neil', '  منى   فؤاد  ']) ok(nameProblem(n));
  for (const n of ['', 'أحمد', 'Ahmed', 'a b', 'أحمد 2', 'Ahmed123 Ali', 'test user', 'تجربة تجربة', 'asdf asdf', 'ااا بببب', 'xxx yyy', 'علي@ حسن', 'محمد محمد', 'أ م']) bad(nameProblem(n));
});

test('phones: Egyptian and Gulf mobiles in any common spelling', () => {
  for (const p of ['01097531864', '0109 753 1864', '+201097531864', '00201097531864', '201097531864', '٠١٠٩٧٥٣١٨٦٤', '01283651794', '01584627391']) ok(phoneProblem(p));
  ok(phoneProblem('+966 50 864 2179'));
  ok(phoneProblem('0558642179', '+971'));
  ok(phoneProblem('98642179', '+965'));
  ok(phoneProblem('+974 3386 4217'));
  ok(phoneProblem('+968 9864 2179'));
  ok(phoneProblem('+973 3686 4217'));
  assert.deepEqual(parsePhone('+201097531864'), { code: '+20', local: '1097531864' });
});

test('phones: other countries, landlines, wrong lengths and placeholders are refused', () => {
  for (const p of ['', '+447911123456', '+12025550123', '0222345678', '0109876543', '010975318641', '01398765432', '01000000000', '01111111111', '01012345678', '01097531864x', '01212121212', '+966555555555', '0501234567']) {
    bad(phoneProblem(p, p.startsWith('050') ? '+966' : null));
  }
  assert.equal(looksLikeFakeNumber('98765432'), true);
  assert.equal(looksLikeFakeNumber('98761432'), false);
});

test('emails: valid, typo hints, throwaway and placeholder addresses', () => {
  ok(emailProblem(''));
  ok(emailProblem('ahmed.ali@gmail.com'));
  ok(emailProblem('info@1lineestate.com'));
  bad(emailProblem('', true, { required: true }));
  assert.match(emailProblem('ahmed@gmial.com'), /gmail\.com/);
  for (const e of ['ahmed', 'ahmed@', 'ahmed@gmail', 'a..b@gmail.com', 'x@mailinator.com', 'me@yopmail.com', 'test@gmail.com', 'ahmed@example.com']) bad(emailProblem(e));
});
