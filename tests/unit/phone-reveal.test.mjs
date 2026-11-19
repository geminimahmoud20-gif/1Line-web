import test from 'node:test';
import assert from 'node:assert/strict';
import { maskDigits, isRevealable, setPhonePolicy, isPhoneMasked, revealPhone, resetPhoneReveal, REVEAL_TTL_MS } from '../../src/utils/phoneReveal.js';
import { phoneRevealEvent, phoneCopyEvent, revealSummary, describeAudit, auditLabel, REVEAL_ALERT_PER_DAY } from '../../src/utils/auditEvents.js';

test('a number is shown as first four digits and last two', () => {
  assert.equal(maskDigits('01001234567'), '0100•••••67');
  assert.equal(maskDigits('0100 123 4567'), '0100•••••67');
  assert.equal(maskDigits(''), '');
  assert.equal(maskDigits('12345'), '•••');
});

test('an already hidden number is left alone and cannot be revealed', () => {
  assert.equal(maskDigits('010****67'), '010****67');
  assert.equal(isRevealable('010****67'), false);
  assert.equal(isRevealable('01001234567'), true);
  assert.equal(isRevealable(''), false);
});

test('numbers are plain unless the policy masks them; a reveal lasts two minutes', () => {
  resetPhoneReveal();
  assert.equal(isPhoneMasked('a'), false);
  setPhonePolicy({ mask: true });
  assert.equal(isPhoneMasked('a'), true);
  const t0 = 1_000_000;
  revealPhone('a', t0);
  assert.equal(isPhoneMasked('a', t0 + 1000), false);
  assert.equal(isPhoneMasked('b', t0 + 1000), true, 'another client stays hidden');
  assert.equal(isPhoneMasked('a', t0 + REVEAL_TTL_MS + 1), true, 'hides again after the time');
  setPhonePolicy({ mask: false });
  assert.equal(isPhoneMasked('a'), false);
  resetPhoneReveal();
});

test('the log entries carry the client id and screen, never the number', () => {
  const r = phoneRevealEvent('lead-9', 'leads');
  assert.deepEqual(r, { actionType: 'PHONE_REVEALED', targetCollection: 'leads', targetId: 'lead-9', details: { surface: 'leads' } });
  assert.equal(phoneCopyEvent('lead-9').actionType, 'PHONE_COPIED');
  assert.equal(phoneRevealEvent(''), null);
  assert.ok(auditLabel('PHONE_REVEALED').includes('رقم'));
  assert.equal(describeAudit({ action: 'PHONE_REVEALED', targetId: 'lead-9', details: { surface: 'kanban' } }), 'lead-9 · kanban');
});

test("today's reveals and copies are counted per person and flagged past the daily limit", () => {
  const now = new Date(2026, 10, 19, 15, 0).getTime();
  const at = now - 3600_000;
  const ev = (who, action, t = at) => ({ actorEmail: who, action, at: t });
  const events = [
    ...Array.from({ length: REVEAL_ALERT_PER_DAY }, () => ev('busy@x.com', 'PHONE_REVEALED')),
    ev('light@x.com', 'PHONE_REVEALED'), ev('light@x.com', 'PHONE_COPIED'),
    ev('old@x.com', 'PHONE_REVEALED', now - 3 * 86400_000),
    ev('light@x.com', 'CONTACT_USED')
  ];
  const rows = revealSummary(events, now);
  assert.deepEqual(rows.map((r) => r.actor), ['busy@x.com', 'light@x.com']);
  assert.equal(rows[0].flagged, true);
  assert.deepEqual([rows[1].reveals, rows[1].copies, rows[1].flagged], [1, 1, false]);
});
