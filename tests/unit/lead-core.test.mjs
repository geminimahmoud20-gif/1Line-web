import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePublicLead, verifyTurnstile, LEAD_LIMITS } from '../../api/_lead-core.js';

const good = { name: 'أحمد علي', phone: '01001234567', type: 'buyer', notes: 'عايز شقة', details: { area: 'x', phone: '010' } };

test('a normal request keeps its fields and splits the contact off', () => {
  const r = sanitizePublicLead(good);
  assert.equal(r.ok, true);
  assert.deepEqual(r.contact, { phone: '01001234567' });
  assert.equal(r.lead.phone, undefined);
  assert.deepEqual(r.lead.details, { area: 'x' }, 'a phone copied into details is dropped');
  assert.equal(r.lead.type, 'buyer');
});

test('staff-only and server fields are stripped, not trusted', () => {
  const r = sanitizePublicLead({ ...good, id: 'x', ownerUid: 'u', createdAt: 1, isAdmin: true, role: 'admin', outcomes: [1], 'a/b': 1 });
  assert.equal(r.ok, true);
  for (const k of ['id', 'ownerUid', 'createdAt', 'isAdmin', 'role', 'outcomes', 'a/b']) assert.equal(k in r.lead, false, k);
});

test('rejects a bad name, no phone, a long note, a non-new status, an oversize body', () => {
  assert.equal(sanitizePublicLead({ ...good, name: 'أ' }).error, 'bad-name');
  assert.equal(sanitizePublicLead({ ...good, name: 'x'.repeat(101) }).error, 'bad-name');
  assert.equal(sanitizePublicLead({ name: 'محمد', notes: 'x' }).error, 'bad-phone');
  assert.equal(sanitizePublicLead({ ...good, phone: '123' }).error, 'bad-phone');
  assert.equal(sanitizePublicLead({ ...good, notes: 'x'.repeat(LEAD_LIMITS.textMax + 1) }).error, 'bad-text');
  assert.equal(sanitizePublicLead({ ...good, status: 'closed' }).error, 'bad-status');
  assert.equal(sanitizePublicLead({ ...good, details: { blob: 'x'.repeat(LEAD_LIMITS.jsonMax) } }).error, 'too-large');
  assert.equal(sanitizePublicLead(null).error, 'bad-lead');
  assert.equal(sanitizePublicLead([]).error, 'bad-lead');
});

test('a WhatsApp number alone is enough; a bad email is dropped not fatal', () => {
  const r = sanitizePublicLead({ name: 'سارة', whatsapp: '+20 100 123 4567', email: 'not-an-email' });
  assert.equal(r.ok, true);
  assert.equal(r.contact.email, undefined);
  assert.equal(r.contact.whatsapp, '+20 100 123 4567');
});

const fakeFetch = (body, ok = true) => async () => ({ ok, json: async () => body });

test('Turnstile: no secret passes; with a secret the token must verify', async () => {
  assert.deepEqual(await verifyTurnstile({ secret: '', token: '' }), { ok: true, skipped: true });
  assert.equal((await verifyTurnstile({ secret: 's', token: '' }, fakeFetch({ success: true }))).error, 'captcha');
  assert.equal((await verifyTurnstile({ secret: 's', token: 't' }, fakeFetch({ success: true }))).ok, true);
  assert.equal((await verifyTurnstile({ secret: 's', token: 't' }, fakeFetch({ success: false }))).error, 'captcha');
  assert.equal((await verifyTurnstile({ secret: 's', token: 't' }, fakeFetch({}, false))).error, 'captcha-unavailable');
  assert.equal((await verifyTurnstile({ secret: 's', token: 't' }, async () => { throw new Error('net'); })).error, 'captcha-unavailable');
});

test('the desk the site routed to is kept when it looks like a desk name, otherwise Unassigned', () => {
  assert.equal(sanitizePublicLead({ ...good, assignedTo: 'Sales Team A' }).lead.assignedTo, 'Sales Team A');
  assert.equal(sanitizePublicLead({ ...good, assignedTo: 'فريق المبيعات' }).lead.assignedTo, 'فريق المبيعات');
  assert.equal(sanitizePublicLead({ ...good, assignedTo: '<script>' }).lead.assignedTo, 'Unassigned');
  assert.equal('assignedTo' in sanitizePublicLead(good).lead, false);
});
