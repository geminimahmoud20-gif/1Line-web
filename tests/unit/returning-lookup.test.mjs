import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupReturning } from '../../api/_returning-core.js';

// A fake Firestore REST: lead_contacts rows by phone, and lead documents
const sv = (v) => ({ stringValue: v });
const doc = (fields) => ({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, typeof v === 'boolean' ? { booleanValue: v } : sv(v)])) });
const plain = (d) => Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, v.stringValue ?? v.booleanValue]));

function fakeDb({ contacts = {}, leads = {} }) {
  const calls = [];
  const fs = async (method, path, body) => {
    calls.push([method, path]);
    if (method === 'POST') {
      const field = body.structuredQuery.where.fieldFilter.field.fieldPath;
      const wanted = body.structuredQuery.where.fieldFilter.value.arrayValue.values.map((v) => v.stringValue);
      const rows = Object.entries(contacts).filter(([, c]) => wanted.includes(c[field])).map(([leadId]) => ({ document: { name: `projects/p/databases/(default)/documents/lead_contacts/${leadId}` } }));
      return { ok: true, json: async () => (rows.length ? rows : [{}]) };
    }
    const id = decodeURIComponent(path.split('/')[1]);
    return leads[id] ? { ok: true, json: async () => doc(leads[id]) } : { ok: false, json: async () => ({}) };
  };
  return { fs, calls };
}

const sellers = [{ uid: 'a', name: 'A' }, { uid: 'b', name: 'B' }];

test('a new request from a known phone goes back to the earlier request\'s owner', async () => {
  const { fs } = fakeDb({
    contacts: { old1: { phone: '01094590572' }, new1: { phone: '01094590572' } },
    leads: { old1: { ownerUid: 'b', createdAt: '2026-11-10T10:00:00Z' }, new1: { createdAt: '2026-11-17T10:00:00Z' } }
  });
  const r = await lookupReturning({ fs, plain, lead: { phone: '+201094590572' }, id: 'new1', sellers });
  assert.equal(r.seller.uid, 'b');
  assert.equal(r.previousLeadId, 'old1');
});

test('the request itself is never its own earlier request', async () => {
  const { fs } = fakeDb({ contacts: { new1: { phone: '01094590572' } }, leads: { new1: { ownerUid: 'a', createdAt: '2026-11-17T10:00:00Z' } } });
  assert.equal(await lookupReturning({ fs, plain, lead: { phone: '01094590572' }, id: 'new1', sellers }), null);
});

test('a phone stored only as the WhatsApp number is found too', async () => {
  const { fs } = fakeDb({ contacts: { old1: { whatsapp: '201094590572' } }, leads: { old1: { ownerUid: 'a', createdAt: '2026-11-10T10:00:00Z' } } });
  const r = await lookupReturning({ fs, plain, lead: { phone: '01094590572' }, id: 'new1', sellers });
  assert.equal(r.seller.uid, 'a');
});

test('no phone, an unknown phone, or a database error all mean "no returning owner"', async () => {
  const { fs } = fakeDb({});
  assert.equal(await lookupReturning({ fs, plain, lead: {}, id: 'x', sellers }), null);
  assert.equal(await lookupReturning({ fs, plain, lead: { phone: '01012345678' }, id: 'x', sellers }), null);
  const boom = async () => { throw new Error('down'); };
  assert.equal(await lookupReturning({ fs: boom, plain, lead: { phone: '01012345678' }, id: 'x', sellers }), null);
});

test('an earlier request whose owner left the team is not used', async () => {
  const { fs } = fakeDb({ contacts: { old1: { phone: '01094590572' } }, leads: { old1: { ownerUid: 'gone', createdAt: '2026-11-10T10:00:00Z' } } });
  assert.equal(await lookupReturning({ fs, plain, lead: { phone: '01094590572' }, id: 'new1', sellers }), null);
});

import { withContact } from '../../api/_returning-core.js';
test('the phone is read from lead_contacts: the lead document itself has none', async () => {
  const contactsDb = { c1: doc({ phone: '01094590572', whatsapp: '01094590572' }) };
  const fs = async (method, path) => {
    const id = decodeURIComponent(path.split('/')[1]);
    return path.startsWith('lead_contacts/') && contactsDb[id] ? { ok: true, json: async () => contactsDb[id] } : { ok: false, json: async () => ({}) };
  };
  const lead = { name: 'x', status: 'new' };
  const full = await withContact({ fs, plain, id: 'c1', lead });
  assert.equal(full.phone, '01094590572');
  assert.equal(full.name, 'x');
  assert.deepEqual(await withContact({ fs, plain, id: 'none', lead }), lead);              // no contact doc: unchanged
  assert.equal((await withContact({ fs: async () => { throw new Error('down'); }, plain, id: 'c1', lead })).phone, undefined); // failure: unchanged
  assert.equal((await withContact({ fs, plain, id: 'c1', lead: { phone: '0100' } })).phone, '0100'); // already has one: untouched
});

import { isStaffClaims } from '../../src/services/staffNotify.js';
test('a client account is not staff; a CRM role is', () => {
  assert.equal(isStaffClaims({}), false);
  assert.equal(isStaffClaims(null), false);
  assert.equal(isStaffClaims({ role: 'sales_agent' }), true);
  assert.equal(isStaffClaims({ admin: true }), true);
});
