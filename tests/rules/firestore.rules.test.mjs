// Firestore security rules tests. Needs the Firestore emulator (Java 11+):
//   npm run test:rules
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, orderBy, getDocs, collectionGroup, writeBatch, deleteField, documentId, serverTimestamp } from 'firebase/firestore';
import fs from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';

const ADMIN_UID = 'dB6GM2RoPQRE0iksDnqcdvUKgXy2'; // the owner account; admin only through its claim
const asAdmin = () => env.authenticatedContext(ADMIN_UID, { role: 'super_admin', admin: true }).firestore();
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-1line-rules',
    firestore: { rules: fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') }
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'leads/a'), { name: 'A', phone: '01000000001', assignedTo: 'Sales Team A', createdAt: 1 });
    await setDoc(doc(db, 'leads/b'), { name: 'B', phone: '01000000002', assignedTo: 'Sales Team B', createdAt: 2 });
    await setDoc(doc(db, 'leads/u'), { name: 'U', phone: '01000000003', assignedTo: 'Unassigned', createdAt: 3 });
    await setDoc(doc(db, 'leads/v'), { name: 'V', phone: '01000000004', assignedTo: 'Dr. Mahmoud Elbaz', createdAt: 4 });
    await setDoc(doc(db, 'demands/p1'), { name: 'X', phone: '01000000005', status: 'published', text_ar: 't' });
    await setDoc(doc(db, 'deals/a'), { assignedTo: 'Sales Team A', stage: 'proposal' });
    await setDoc(doc(db, 'deals/b'), { assignedTo: 'Sales Team B', stage: 'proposal' });
    // current format: contacts in lead_contacts
    await setDoc(doc(db, 'leads/c1'), { name: 'C1', assignedTo: 'Sales Team A', createdAt: 5 });
    await setDoc(doc(db, 'lead_contacts/c1'), { phone: '01000000011', assignedTo: 'Sales Team A' });
    await setDoc(doc(db, 'leads/c2'), { name: 'C2', assignedTo: 'Sales Team B', createdAt: 6 });
    await setDoc(doc(db, 'lead_contacts/c2'), { phone: '01000000012', assignedTo: 'Sales Team B' });
  });
});

const as = (role) => env.authenticatedContext(`u-${role}`, { role }).firestore();
const guest = () => env.unauthenticatedContext().firestore();

// ── Leads ────────────────────────────────────────────────────────────────
test('leads: desk agent reads own desk + pool only', async () => {
  const east = as('agent_east');
  await assertSucceeds(getDoc(doc(east, 'leads/a')));
  await assertSucceeds(getDoc(doc(east, 'leads/u')));
  await assertFails(getDoc(doc(east, 'leads/b')));
  await assertFails(getDoc(doc(east, 'leads/v')));
  await assertFails(getDoc(doc(as('sales_agent'), 'leads/a')));
});

test('leads: unfiltered list denied to agents, queue query allowed', async () => {
  const east = as('agent_east');
  await assertFails(getDocs(collection(east, 'leads')));
  const q = query(collection(east, 'leads'), where('assignedTo', 'in', ['Sales Team A', 'Unassigned']), orderBy('createdAt', 'desc'));
  const r = await assertSucceeds(getDocs(q));
  if (r.size !== 3) throw new Error(`expected 3 leads, got ${r.size}`);
});

test('leads: agents claim pool leads but cannot move leads to other desks', async () => {
  const east = as('agent_east');
  await assertSucceeds(setDoc(doc(east, 'leads/u'), { assignedTo: 'Sales Team A' }, { merge: true }));
  await assertFails(setDoc(doc(east, 'leads/a'), { assignedTo: 'Sales Team B' }, { merge: true }));
  await assertSucceeds(setDoc(doc(east, 'leads/a'), { status: 'contacted' }, { merge: true }));
  await assertFails(setDoc(doc(east, 'leads/b'), { status: 'contacted' }, { merge: true }));
});

test('leads: managers, read-only roles and admins', async () => {
  await assertSucceeds(getDocs(collection(as('sales_manager'), 'leads')));
  await assertSucceeds(setDoc(doc(as('sales_manager'), 'leads/b'), { assignedTo: 'Sales Team A' }, { merge: true }));
  await assertSucceeds(getDocs(collection(as('viewer'), 'leads')));
  await assertFails(setDoc(doc(as('viewer'), 'leads/b'), { status: 'x' }, { merge: true }));
  await assertSucceeds(getDocs(collection(as('admin'), 'leads')));
  await assertSucceeds(getDocs(collection(asAdmin(), 'leads')));
  // the owner's user ID alone no longer grants anything — only the claim does
  await assertFails(getDocs(collection(env.authenticatedContext(ADMIN_UID, {}).firestore(), 'leads')));
  await assertFails(getDocs(collection(as('some_unknown_role'), 'leads')));
});

test('leads: guests create only', async () => {
  await assertFails(getDoc(doc(guest(), 'leads/a')));
  await assertSucceeds(setDoc(doc(guest(), 'leads/new1'), { name: 'Guest', phone: '01000000009', status: 'new' }));
  await assertFails(setDoc(doc(guest(), 'leads/new2'), { name: 'Guest', phone: '01000000009', status: 'won' }));
});

// ── Demands ──────────────────────────────────────────────────────────────
test('demands: contact-bearing docs are staff-only, even when published', async () => {
  await assertFails(getDoc(doc(guest(), 'demands/p1')));
  await assertFails(getDocs(query(collection(guest(), 'demands'), where('status', '==', 'published'))));
  await assertSucceeds(getDoc(doc(as('viewer'), 'demands/p1')));
  await assertSucceeds(setDoc(doc(guest(), 'demands/new1'), { name: 'Buyer', phone: '01000000002', status: 'pending' }));
  await assertFails(setDoc(doc(guest(), 'demands/new2'), { name: 'Buyer', phone: '01000000002', status: 'published' }));
});

test('public_demands: public read, editors write contact-free published copies', async () => {
  const pm = as('property_manager');
  await assertSucceeds(setDoc(doc(pm, 'public_demands/p1'), { text_ar: 't', status: 'published', budget: 1 }));
  await assertFails(setDoc(doc(pm, 'public_demands/p2'), { text_ar: 't', status: 'published', phone: '010' }));
  await assertFails(setDoc(doc(pm, 'public_demands/p3'), { text_ar: 't', status: 'pending' }));
  await assertFails(setDoc(doc(as('sales_agent'), 'public_demands/p4'), { text_ar: 't', status: 'published' }));
  await assertFails(setDoc(doc(guest(), 'public_demands/p5'), { text_ar: 't', status: 'published' }));
  await assertSucceeds(getDocs(collection(guest(), 'public_demands')));
  await assertSucceeds(deleteDoc(doc(pm, 'public_demands/p1')));
});

// ── Deals ────────────────────────────────────────────────────────────────
test('deals: desk scoping', async () => {
  const east = as('agent_east');
  await assertSucceeds(getDoc(doc(east, 'deals/a')));
  await assertFails(getDoc(doc(east, 'deals/b')));
  await assertSucceeds(setDoc(doc(east, 'deals/n'), { assignedTo: 'Sales Team A', stage: 'qualification' }));
  await assertFails(setDoc(doc(east, 'deals/m'), { assignedTo: 'Sales Team B', stage: 'qualification' }));
  await assertSucceeds(getDoc(doc(as('finance'), 'deals/b')));
  await assertSucceeds(setDoc(doc(as('sales_manager'), 'deals/b'), { stage: 'won' }, { merge: true }));
  await assertFails(getDoc(doc(as('property_manager'), 'deals/a')));
});

// ── Lead contacts ────────────────────────────────────────────────────────
const newLeadBatch = (db, id, lead, contact) => {
  const b = writeBatch(db);
  b.set(doc(db, 'leads', id), lead);
  b.set(doc(db, 'lead_contacts', id), contact);
  return b.commit();
};

test('contacts: a guest submits lead + contact together; the lead itself carries no phone', async () => {
  const g = guest();
  await assertSucceeds(newLeadBatch(g, 'n1', { name: 'Guest', status: 'new', assignedTo: 'Sales Team A' }, { phone: '01000000020', assignedTo: 'Sales Team A' }));
  // contact desk must mirror the lead's desk
  await assertFails(newLeadBatch(g, 'n2', { name: 'Guest', assignedTo: 'Sales Team A' }, { phone: '01000000020', assignedTo: 'Sales Team B' }));
  // no lead without its contact doc in the new format
  await assertFails(setDoc(doc(g, 'leads/n3'), { name: 'Guest', assignedTo: 'Unassigned' }));
  // only contact fields allowed
  await assertFails(newLeadBatch(g, 'n4', { name: 'Guest', assignedTo: 'Unassigned' }, { phone: '01000000020', assignedTo: 'Unassigned', notes: 'x' }));
  // cannot attach / overwrite a contact of an existing lead
  await assertFails(setDoc(doc(g, 'lead_contacts/a'), { phone: '01099999999', assignedTo: 'Sales Team A' }));
  await assertFails(setDoc(doc(g, 'lead_contacts/c1'), { phone: '01099999999', assignedTo: 'Sales Team A' }));
});

test('contacts: read-only roles never read them; agents only their desk; managers all', async () => {
  for (const role of ['viewer', 'finance', 'property_manager']) {
    await assertFails(getDoc(doc(as(role), 'lead_contacts/c1')));
    await assertFails(getDocs(collection(as(role), 'lead_contacts')));
  }
  const east = as('agent_east');
  await assertSucceeds(getDoc(doc(east, 'lead_contacts/c1')));
  await assertFails(getDoc(doc(east, 'lead_contacts/c2')));
  await assertSucceeds(getDocs(query(collection(east, 'lead_contacts'), where('assignedTo', 'in', ['Sales Team A', 'Unassigned']))));
  await assertFails(getDocs(collection(east, 'lead_contacts')));
  const mgr = as('sales_manager');
  await assertSucceeds(getDocs(query(collection(mgr, 'lead_contacts'), where(documentId(), 'in', ['c1', 'c2']))));
});

test('contacts: a desk change moves the contact doc in the same batch', async () => {
  const mgr = as('sales_manager');
  await assertFails(setDoc(doc(mgr, 'leads/c1'), { assignedTo: 'Sales Team B' }, { merge: true }));
  const b = writeBatch(mgr);
  b.set(doc(mgr, 'leads/c1'), { assignedTo: 'Sales Team B' }, { merge: true });
  b.set(doc(mgr, 'lead_contacts/c1'), { assignedTo: 'Sales Team B' }, { merge: true });
  await assertSucceeds(b.commit());
  // and the old desk loses the phone
  await assertFails(getDoc(doc(as('agent_east'), 'lead_contacts/c1')));
});

test('contacts: agents edit their lead\'s contact, and leads never gain phone fields again', async () => {
  const east = as('agent_east');
  await assertSucceeds(setDoc(doc(east, 'lead_contacts/c1'), { whatsapp: '01000000099', assignedTo: 'Sales Team A' }, { merge: true }));
  await assertFails(setDoc(doc(east, 'lead_contacts/c2'), { whatsapp: '01000000099', assignedTo: 'Sales Team B' }, { merge: true }));
  await assertFails(setDoc(doc(east, 'leads/c1'), { phone: '01000000098' }, { merge: true }));
  await assertFails(setDoc(doc(as('sales_manager'), 'leads/a'), { phone: '01000000097' }, { merge: true }));
  // unchanged legacy phone on an un-migrated lead doesn't block other edits
  await assertSucceeds(setDoc(doc(east, 'leads/a'), { status: 'contacted' }, { merge: true }));
});

test('contacts: a manager migrates an inline phone into lead_contacts', async () => {
  const mgr = as('sales_manager');
  const b = writeBatch(mgr);
  b.set(doc(mgr, 'lead_contacts/a'), { phone: '01000000001', assignedTo: 'Sales Team A' }, { merge: true });
  b.update(doc(mgr, 'leads/a'), { phone: deleteField() });
  await assertSucceeds(b.commit());
  const snap = await getDoc(doc(as('viewer'), 'leads/a'));
  if ('phone' in snap.data()) throw new Error('phone still on the lead');
});

test('contacts: legacy-format submissions from old builds are still accepted', async () => {
  await assertSucceeds(setDoc(doc(guest(), 'leads/old1'), { name: 'Old build', phone: '01000000030', status: 'new' }));
});

// ── Request contacts (demands, remote inspections, trade-ins) ───────────────
const newRequestBatch = (db, kind, id, record, contact) => {
  const b = writeBatch(db);
  b.set(doc(db, kind, id), record);
  b.set(doc(db, 'request_contacts', `${kind}__${id}`), { kind, parentId: id, ...contact });
  return b.commit();
};
const tradeIn = { name: 'Guest', country: 'EG', offerType: 'apartment', offerGovernorate: 'sohag', wantType: 'villa', diffMode: 'even', status: 'new' };

test('request contacts: guests submit demands / trade-ins with the phone in request_contacts', async () => {
  const g = guest();
  await assertSucceeds(newRequestBatch(g, 'demands', 'd1', { name: 'Buyer', status: 'pending' }, { phone: '01000000040' }));
  await assertFails(setDoc(doc(g, 'demands/d2'), { name: 'Buyer', status: 'pending' })); // no phone anywhere
  await assertFails(newRequestBatch(g, 'demands', 'd3', { name: 'Buyer', status: 'pending' }, { phone: '01000000040', notes: 'x' }));
  // contact id must match kind + parent
  const b = writeBatch(g);
  b.set(doc(g, 'demands/d4'), { name: 'Buyer', status: 'pending' });
  b.set(doc(g, 'request_contacts/demands__other'), { kind: 'demands', parentId: 'd4', phone: '01000000040' });
  await assertFails(b.commit());
  // cannot attach a contact to an existing request
  await assertFails(setDoc(doc(g, 'request_contacts/demands__p1'), { kind: 'demands', parentId: 'p1', phone: '01099999999' }));
});

test('request contacts: only sales roles read them; read-only roles do not', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'trade_ins/t1'), tradeIn);
    await setDoc(doc(ctx.firestore(), 'request_contacts/trade_ins__t1'), { kind: 'trade_ins', parentId: 't1', phone: '01000000050' });
  });
  for (const role of ['viewer', 'finance', 'property_manager']) {
    await assertFails(getDoc(doc(as(role), 'request_contacts/trade_ins__t1')));
  }
  for (const role of ['sales_manager', 'agent_east', 'sales_agent']) {
    await assertSucceeds(getDocs(query(collection(as(role), 'request_contacts'), where('kind', '==', 'trade_ins'))));
  }
  // The requests themselves are for the team that follows them up, not read-only roles
  for (const role of ['viewer', 'finance', 'property_manager']) {
    await assertFails(getDoc(doc(as(role), 'trade_ins/t1')));
  }
  await assertSucceeds(getDoc(doc(as('agent_east'), 'trade_ins/t1')));
  await assertSucceeds(getDoc(doc(as('sales_manager'), 'trade_ins/t1')));
});

test('request contacts: a trade-in without a phone needs its contact doc; updates cannot add a phone', async () => {
  const g = guest();
  await assertSucceeds(newRequestBatch(g, 'trade_ins', 't2', { ...tradeIn, createdAt: serverTimestamp() }, { phone: '01000000060' }));
  await assertFails(setDoc(doc(g, 'trade_ins/t3'), { ...tradeIn, createdAt: serverTimestamp() }));
  await assertFails(setDoc(doc(as('agent_east'), 'trade_ins/t2'), { phone: '01011111111' }, { merge: true }));
  await assertSucceeds(setDoc(doc(as('agent_east'), 'trade_ins/t2'), { status: 'contacted' }, { merge: true }));
  await assertFails(setDoc(doc(as('property_manager'), 'demands/p1'), { phone: '01011111111' }, { merge: true }));
});

test('request contacts: a manager migrates an inline demand phone', async () => {
  const mgr = as('sales_manager');
  const b = writeBatch(mgr);
  b.set(doc(mgr, 'request_contacts/demands__p1'), { kind: 'demands', parentId: 'p1', phone: '01000000005' });
  b.update(doc(mgr, 'demands/p1'), { phone: deleteField() });
  await assertSucceeds(b.commit());
});

// ── Audit logs ───────────────────────────────────────────────────────────
const auditEntry = (uid, email, overrides = {}) => {
  const base = {
    actorId: uid, actorUid: uid, actorEmail: email,
    action: 'LEAD_CLAIMED', type: 'LEAD_CLAIMED', actionType: 'LEAD_CLAIMED',
    entityType: 'leads', targetCollection: 'leads', entityId: 'a', targetId: 'a',
    before: null, after: null, ipHashOrMetadata: {}, details: {}, metadata: {},
    createdAt: new Date().toISOString(), timestamp: serverTimestamp()
  };
  return { ...base, ...overrides };
};

test('audit logs: staff log only as themselves, with the server time, and never edit', async () => {
  const email = 'east@1line.test';
  const east = env.authenticatedContext('u-east', { role: 'agent_east', email }).firestore();
  await assertSucceeds(setDoc(doc(east, 'audit_logs/ok'), auditEntry('u-east', email)));
  // someone else's name, a made-up email, a back-dated time, extra fields
  await assertFails(setDoc(doc(east, 'audit_logs/x1'), auditEntry('u-other', email)));
  await assertFails(setDoc(doc(east, 'audit_logs/x2'), auditEntry('u-east', email, { actorUid: 'u-other' })));
  await assertFails(setDoc(doc(east, 'audit_logs/x3'), auditEntry('u-east', 'admin@1line.com')));
  await assertFails(setDoc(doc(east, 'audit_logs/x4'), auditEntry('u-east', email, { timestamp: new Date('2020-01-01') })));
  await assertFails(setDoc(doc(east, 'audit_logs/x5'), auditEntry('u-east', email, { forged: true })));
  await assertFails(setDoc(doc(east, 'audit_logs/x6'), auditEntry('u-east', email, { type: 'OTHER' })));
  // immutable, admin-only reads, no guests
  await assertFails(setDoc(doc(east, 'audit_logs/ok'), { action: 'X' }, { merge: true }));
  await assertFails(deleteDoc(doc(east, 'audit_logs/ok')));
  await assertFails(getDoc(doc(east, 'audit_logs/ok')));
  await assertFails(setDoc(doc(guest(), 'audit_logs/g'), auditEntry('anon', '')));
  await assertSucceeds(getDoc(doc(asAdmin(), 'audit_logs/ok')));
});

// ── Ad stats ─────────────────────────────────────────────────────────────
test('ad stats: +1 steps only, and only for published campaigns', async () => {
  const g = guest();
  // no campaigns published yet → nothing to count
  await assertFails(setDoc(doc(g, 'ad_stats/ad-1'), { impressions: 1, clicks: 0 }));
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'settings/ad_campaigns'), { campaigns: [{ id: 'ad-1' }], campaignIds: ['ad-1'] });
  });
  await assertSucceeds(setDoc(doc(g, 'ad_stats/ad-1'), { impressions: 1, clicks: 0 }));
  await assertSucceeds(setDoc(doc(g, 'ad_stats/ad-1'), { impressions: 2, clicks: 1 }));
  await assertFails(setDoc(doc(g, 'ad_stats/ad-1'), { impressions: 500, clicks: 1 }));
  await assertFails(setDoc(doc(g, 'ad_stats/ad-1'), { impressions: 1, clicks: 1 }));
  await assertFails(setDoc(doc(g, 'ad_stats/junk-id'), { impressions: 1, clicks: 0 }));
  await assertFails(getDoc(doc(g, 'ad_stats/ad-1')));
  await assertSucceeds(getDoc(doc(as('viewer'), 'ad_stats/ad-1')));
  // settings saved by an older build (no campaignIds) still count
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'settings/ad_campaigns'), { campaigns: [{ id: 'ad-2' }] });
  });
  await assertSucceeds(setDoc(doc(g, 'ad_stats/ad-2'), { impressions: 1, clicks: 0 }));
});

test('ad stats shards: same +1 rules, shard ids 0-9, staff read them as a group', async () => {
  const g = guest();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'settings/ad_campaigns'), { campaigns: [{ id: 'ad-9' }], campaignIds: ['ad-9'] });
  });
  await assertSucceeds(setDoc(doc(g, 'ad_stats/ad-9/ad_stat_shards/3'), { impressions: 1, clicks: 0 }));
  await assertSucceeds(setDoc(doc(g, 'ad_stats/ad-9/ad_stat_shards/3'), { impressions: 2, clicks: 1 }));
  await assertFails(setDoc(doc(g, 'ad_stats/ad-9/ad_stat_shards/3'), { impressions: 50, clicks: 1 }));
  await assertFails(setDoc(doc(g, 'ad_stats/ad-9/ad_stat_shards/42'), { impressions: 1, clicks: 0 }));
  await assertFails(setDoc(doc(g, 'ad_stats/ad-unpublished/ad_stat_shards/1'), { impressions: 1, clicks: 0 }));
  await assertFails(getDocs(collectionGroup(g, 'ad_stat_shards')));
  await assertSucceeds(getDocs(collectionGroup(as('viewer'), 'ad_stat_shards')));
});

// ── Site error log ───────────────────────────────────────────────────────
test('client errors: anyone files a bounded entry; only the admin reads or clears', async () => {
  const entry = { kind: 'error', message: 'x is not a function', source: 'https://site/assets/a.js', line: 1, col: 2,
    stack: 'at a', path: '/sell', ua: 'UA', release: 'abc123', createdAt: serverTimestamp() };
  const g = guest();
  await assertSucceeds(setDoc(doc(g, 'client_errors/e1'), entry));
  await assertFails(setDoc(doc(g, 'client_errors/e2'), { ...entry, kind: 'other' }));
  await assertFails(setDoc(doc(g, 'client_errors/e3'), { ...entry, message: 'm'.repeat(501) }));
  await assertFails(setDoc(doc(g, 'client_errors/e4'), { ...entry, phone: '01000000000' }));
  await assertFails(setDoc(doc(g, 'client_errors/e5'), { ...entry, createdAt: new Date('2020-01-01') }));
  await assertFails(setDoc(doc(g, 'client_errors/e1'), { ...entry, message: 'edited' }));
  await assertFails(getDoc(doc(g, 'client_errors/e1')));
  await assertFails(getDoc(doc(as('sales_manager'), 'client_errors/e1')));
  await assertSucceeds(getDoc(doc(asAdmin(), 'client_errors/e1')));
  await assertSucceeds(deleteDoc(doc(asAdmin(), 'client_errors/e1')));
});

// ── api/notify.js against the emulator (REST reads + once-only claim) ──
test('notify: reads the stored record over REST and claims each record once', async () => {
  const { firestore } = await import('../../api/notify.js');
  const db = firestore({ project_id: 'demo-1line-rules' });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'leads/n1'), { name: 'نادر', type: 'buyer', assignedTo: 'Sales Team A', details: { area: 'الكوثر', budget: 2000000 }, createdAt: serverTimestamp() });
  });
  const rec = await db.readRecord('leads', 'n1');
  if (rec.data.name !== 'نادر' || rec.data.details.area !== 'الكوثر' || rec.data.details.budget !== 2000000) throw new Error(`decoded ${JSON.stringify(rec.data)}`);
  if (!(Date.now() - rec.createdAtMs < 60_000)) throw new Error(`createdAtMs ${rec.createdAtMs}`);
  if ((await db.readRecord('leads', 'missing')) !== null) throw new Error('missing record should be null');
  if ((await db.claimOnce('leads', 'n1')) !== true) throw new Error('first claim should win');
  if ((await db.claimOnce('leads', 'n1')) !== false) throw new Error('second claim should lose');
  // nobody reaches the log through the SDK
  await assertFails(getDoc(doc(asAdmin(), 'notify_log/leads__n1')));
});

test('staff registry is server-only (api/team.js with the service account)', async () => {
  await assertFails(getDoc(doc(asAdmin(), 'staff_registry/u1')));
  await assertFails(setDoc(doc(asAdmin(), 'staff_registry/u1'), { role: 'super_admin' }));
  await assertFails(setDoc(doc(guest(), 'staff_registry/u1'), { role: 'super_admin' }));
});

test('client downloads: anyone files a bounded record; only managers read it', async () => {
  const entry = { kind: 'property_brochure', itemId: 'p1', itemTitle: 'شقة', clientName: 'سارة', clientPhone: '+201001112223',
    clientEmail: 's@x.test', path: '/properties/p1', createdAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(guest(), 'client_downloads/d1'), entry));
  await assertFails(setDoc(doc(guest(), 'client_downloads/d2'), { ...entry, kind: 'anything' }));
  await assertFails(setDoc(doc(guest(), 'client_downloads/d3'), { ...entry, clientName: '' }));
  await assertFails(setDoc(doc(guest(), 'client_downloads/d4'), { ...entry, extra: 1 }));
  await assertFails(getDoc(doc(guest(), 'client_downloads/d1')));
  await assertFails(getDoc(doc(as('agent_east'), 'client_downloads/d1')));
  await assertFails(getDoc(doc(as('viewer'), 'client_downloads/d1')));
  await assertSucceeds(getDoc(doc(as('sales_manager'), 'client_downloads/d1')));
  await assertSucceeds(getDoc(doc(asAdmin(), 'client_downloads/d1')));
  await assertFails(setDoc(doc(guest(), 'client_downloads/d1'), { ...entry, clientName: 'تعديل' }));
});

// ── Access model claims (staff: true + perms + desk, set by api/team.js) ─────
test('new-model claims: perms list is the whole truth; desk scopes leads and deals', async () => {
  const team = env.authenticatedContext('u-team-x', { role: 'r_team_x', staff: true, perms: ['ld.edit', 'ld.phone', 'deal.edit'], desk: 'Sales Team A' }).firestore();
  await assertSucceeds(getDoc(doc(team, 'leads/a')));
  await assertSucceeds(getDoc(doc(team, 'leads/u')));
  await assertFails(getDoc(doc(team, 'leads/b')));
  await assertSucceeds(setDoc(doc(team, 'deals/t1'), { assignedTo: 'Sales Team A', stage: 'qualification' }));
  await assertFails(setDoc(doc(team, 'deals/t2'), { assignedTo: 'Sales Team B', stage: 'qualification' }));
  await assertFails(getDoc(doc(team, 'deals/b')));
  // a role named like a built-in one gets only the perms in its token, not the old fixed list
  const narrowed = env.authenticatedContext('u-narrow', { role: 'sales_manager', staff: true, perms: ['ld.all'], desk: '' }).firestore();
  await assertSucceeds(getDoc(doc(narrowed, 'leads/b')));
  await assertFails(setDoc(doc(narrowed, 'leads/b'), { status: 'contacted' }, { merge: true }));
  await assertFails(getDoc(doc(narrowed, 'client_downloads/x')));
});

test('session_revocations: a member reads only their own marker; nobody writes from a client', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'session_revocations/u-agent_east'), { at: serverTimestamp() });
  });
  const east = as('agent_east');
  await assertSucceeds(getDoc(doc(east, 'session_revocations/u-agent_east')));
  await assertFails(getDoc(doc(east, 'session_revocations/u-sales_agent')));
  await assertFails(setDoc(doc(east, 'session_revocations/u-agent_east'), { at: serverTimestamp() }));
  await assertFails(setDoc(doc(asAdmin(), 'session_revocations/u-agent_east'), { at: serverTimestamp() }));
  await assertFails(getDoc(doc(guest(), 'session_revocations/u-agent_east')));
});

test('leads: moving a lead to closing / won needs deal.edit; other stages are lead work', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'leads/w1'), { name: 'صفقة', status: 'negotiating', assignedTo: 'Sales Team A' });
  });
  // a custom role that edits its team's leads but has no deal rights
  const noDeals = env.authenticatedContext('u-nodeal', { role: 'r_nodeal', staff: true, perms: ['ld.edit', 'ld.phone'], desk: 'Sales Team A' }).firestore();
  await assertSucceeds(setDoc(doc(noDeals, 'leads/w1'), { status: 'site_visit' }, { merge: true }));
  await assertFails(setDoc(doc(noDeals, 'leads/w1'), { status: 'closed' }, { merge: true }));
  await assertFails(setDoc(doc(noDeals, 'leads/w1'), { status: 'closing' }, { merge: true }));
  const withDeals = env.authenticatedContext('u-deal', { role: 'r_deal', staff: true, perms: ['ld.edit', 'ld.phone', 'deal.edit'], desk: 'Sales Team A' }).firestore();
  await assertSucceeds(setDoc(doc(withDeals, 'leads/w1'), { status: 'closed' }, { merge: true }));
  // editing other fields of an already-won lead is not a new close
  await assertSucceeds(setDoc(doc(noDeals, 'leads/w1'), { notes: 'متابعة بعد البيع' }, { merge: true }));
});

test('analytics: read by managers/admins only, never written from a browser', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'analytics_daily/2026-10-10_0'), { date: '2026-10-10', pageViews: 3 });
    await setDoc(doc(db, 'analytics_visitors/v_abcdefgh1234'), { intent: 12, leadId: 'a' });
    await setDoc(doc(db, 'analytics_visitors/v_abcdefgh1234/batches/b1'), { events: [] });
  });
  for (const path of ['analytics_daily/2026-10-10_0', 'analytics_visitors/v_abcdefgh1234', 'analytics_visitors/v_abcdefgh1234/batches/b1']) {
    await assertSucceeds(getDoc(doc(asAdmin(), path)));
    await assertSucceeds(getDoc(doc(as('sales_manager'), path)));
    await assertFails(getDoc(doc(as('sales_agent'), path)));
    await assertFails(getDoc(doc(as('viewer'), path)));
    await assertFails(getDoc(doc(guest(), path)));
  }
  await assertSucceeds(getDocs(query(collection(as('sales_manager'), 'analytics_daily'), where('date', '>=', '2026-10-01'))));
  // the collector writes with the service account; browsers (even admins) cannot forge numbers
  await assertFails(setDoc(doc(guest(), 'analytics_daily/2026-10-10_1'), { pageViews: 999 }));
  await assertFails(setDoc(doc(asAdmin(), 'analytics_visitors/v_abcdefgh1234'), { intent: 999 }));
  await assertFails(setDoc(doc(guest(), 'analytics_properties/prop-1'), { views: 999 }));
});

test('backup restore: an admin re-creates a lead with its original id and contact doc', async () => {
  const restore = (db) => {
    const b = writeBatch(db);
    b.set(doc(db, 'leads/lead-1700000000000'), { name: 'Restored', assignedTo: 'Sales Team A', status: 'closed', createdAt: '2025-01-02T10:00:00.000Z', restoredAt: serverTimestamp() });
    b.set(doc(db, 'lead_contacts/lead-1700000000000'), { phone: '01000000099', assignedTo: 'Sales Team A' });
    return b.commit();
  };
  await assertSucceeds(restore(asAdmin()));
  await assertFails(restore(as('viewer')));
});
