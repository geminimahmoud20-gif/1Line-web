import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeIntoOpen, plain } from '../../api/_merge-run.js';
import { withContact } from '../../api/_returning-core.js';

// A fake Firestore REST with leads, their lead_contacts, and PATCH/POST logging
const s = (v) => ({ stringValue: v });
const toDoc = (o) => ({ fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'boolean' ? { booleanValue: v } : s(String(v))])), updateTime: '2026-11-20T10:00:00Z' });

function fakeDb() {
  const leads = {
    old1: { status: 'contacted', createdAt: '2026-11-18T10:00:00Z', name: 'منى' },
    new1: { status: 'new', createdAt: '2026-11-20T09:00:00Z', name: 'منى', source: 'form' }
  };
  const contacts = { old1: { phone: '01094590572' }, new1: { phone: '+201094590572' } };
  const patches = [];
  const fs = async (method, path, body) => {
    if (method === 'POST' && path === ':runQuery') {
      const field = body.structuredQuery.where.fieldFilter.field.fieldPath;
      const wanted = body.structuredQuery.where.fieldFilter.value.arrayValue.values.map((v) => v.stringValue);
      const rows = Object.entries(contacts).filter(([, c]) => wanted.includes(c[field])).map(([id]) => ({ document: { name: `projects/p/databases/(default)/documents/lead_contacts/${id}` } }));
      return { ok: true, json: async () => (rows.length ? rows : [{}]) };
    }
    if (method === 'POST') { patches.push(['AUDIT', path]); return { ok: true, json: async () => ({}) }; }
    if (method === 'PATCH') { patches.push([decodeURIComponent(path.split('?')[0]), body]); return { ok: true, json: async () => ({}) }; }
    const [col, rawId] = path.split('/');
    const id = decodeURIComponent(rawId);
    const src = col === 'lead_contacts' ? contacts : leads;
    return src[id] ? { ok: true, json: async () => toDoc(src[id]) } : { ok: false, json: async () => ({}) };
  };
  return { fs, patches, leads };
}

test('a second form from the same phone joins the open request, found through lead_contacts', async () => {
  const { fs, patches, leads } = fakeDb();
  const leadDoc = toDoc(leads.new1);
  // As the server sees it: the lead document alone has no phone
  const lead = await withContact({ fs, plain, id: 'new1', lead: plain(leadDoc) });
  assert.ok(lead.phone);
  const into = await mergeIntoOpen({ fs, id: 'new1', lead, doc: leadDoc });
  assert.equal(into, 'old1');
  const targets = patches.filter((p) => p[0] !== 'AUDIT').map((p) => p[0]);
  assert.deepEqual(targets, ['leads/old1', 'leads/new1']);
  assert.ok(patches.some((p) => p[0] === 'AUDIT'));
});

test('without the phone nothing is found (this was the bug): the request stays separate', async () => {
  const { fs, leads } = fakeDb();
  const leadDoc = toDoc(leads.new1);
  assert.equal(await mergeIntoOpen({ fs, id: 'new1', lead: plain(leadDoc), doc: leadDoc }), null);
});
