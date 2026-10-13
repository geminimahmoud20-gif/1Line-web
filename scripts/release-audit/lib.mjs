// Shared helpers for the release-readiness audit. Everything here talks to the LOCAL Firebase
// emulators (Firestore 127.0.0.1:8080, Auth 127.0.0.1:9099) and a local build — never production.
//
// Playwright is not a project dependency: set PLAYWRIGHT_MODULE to its index.mjs, or install it
// with `npm i --no-save playwright`. axe-core is optional (AXE_PATH → axe.min.js).
import fs from 'node:fs';
import path from 'node:path';

export const PROJECT = 'line-c9601';
export const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
export const AUTH = 'http://127.0.0.1:9099';
export const OWNER = { Authorization: 'Bearer owner', 'content-type': 'application/json' };
export const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:4175';
export const OUT = path.resolve(process.env.AUDIT_OUT || 'docs/release-audit');
export const RAW = path.join(OUT, 'raw');
export const SHOTS = path.join(OUT, 'shots');

export async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const mod = process.env.PLAYWRIGHT_MODULE || '/opt/node-tools/node_modules/playwright/index.mjs';
    return import(mod);
  }
}
export const chromiumPath = () => process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
export const axeSource = () => {
  const p = process.env.AXE_PATH;
  return p && fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
};

export const ensureDirs = () => { for (const d of [OUT, RAW, SHOTS]) fs.mkdirSync(d, { recursive: true }); };
export const writeJson = (name, data) => fs.writeFileSync(path.join(RAW, name), JSON.stringify(data, null, 2));

// ── Firestore REST (emulator owner access bypasses rules: seeding and verification only) ──
const toValue = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
  return { stringValue: String(v) };
};
export const fromValue = (v) => {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  return null;
};
export const docData = (d) => ({ id: String(d.name).split('/').pop(), ...fromValue({ mapValue: { fields: d.fields || {} } }) });

export async function setDoc(collection, id, data) {
  const res = await fetch(`${FS}/${collection}/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields: toValue(data).mapValue.fields })
  });
  if (!res.ok) throw new Error(`setDoc ${collection}/${id}: ${res.status} ${await res.text()}`);
}
export async function listDocs(collection) {
  const out = [];
  let token = '';
  do {
    const res = await fetch(`${FS}/${collection}?pageSize=300${token ? `&pageToken=${token}` : ''}`, { headers: OWNER });
    const body = await res.json();
    out.push(...(body.documents || []).map(docData));
    token = body.nextPageToken || '';
  } while (token);
  return out;
}
export async function rawDoc(collection, id) {
  const res = await fetch(`${FS}/${collection}/${encodeURIComponent(id)}`, { headers: OWNER });
  return res.ok ? res.json() : null;
}

export async function resetEmulators() {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE', headers: OWNER });
}

export async function createUser(email, password, claims) {
  const signUp = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=audit`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true })
  }).then((r) => r.json());
  if (!signUp.localId) throw new Error(`signUp ${email}: ${JSON.stringify(signUp)}`);
  if (claims) {
    await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
      method: 'POST', headers: OWNER, body: JSON.stringify({ localId: signUp.localId, customAttributes: JSON.stringify(claims) })
    });
  }
  return signUp.localId;
}

// Staff accounts for the audit (emulator only). Desks follow src/components/crm/crmRoles.js.
export const STAFF = {
  admin: { email: 'admin@audit.test', claims: { role: 'super_admin', admin: true, staff: true } },
  manager: { email: 'manager@audit.test', claims: { role: 'sales_manager', staff: true } },
  agentA1: { email: 'agent-a1@audit.test', claims: { role: 'agent_east', staff: true } },
  agentA2: { email: 'agent-a2@audit.test', claims: { role: 'agent_east', staff: true } },
  agentB: { email: 'agent-b@audit.test', claims: { role: 'agent_new_sohag', staff: true } },
  inventory: { email: 'inventory@audit.test', claims: { role: 'property_manager', staff: true } },
  finance: { email: 'finance@audit.test', claims: { role: 'finance', staff: true } },
  viewer: { email: 'viewer@audit.test', claims: { role: 'viewer', staff: true } }
};
export const PASSWORD = 'audit-pass-1234';

const AREAS = ['east', 'west', 'new_sohag', 'kawthar', 'university', 'thawra'];
const TYPES = ['apartment', 'villa', 'land', 'retail', 'office', 'building'];
const IMG = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=60';

/** Properties with the edge cases the audit needs (no photos, very long text, extreme prices, hidden). */
export function auditProperties(n = 30) {
  return Array.from({ length: n }, (_, i) => {
    const id = `audit-p${i + 1}`;
    const base = {
      id,
      title_ar: `عقار اختبار ${i + 1} — ${['شقة', 'فيلا', 'أرض', 'محل', 'مكتب', 'عمارة'][i % 6]} في ${AREAS[i % 6]}`,
      title_en: `Audit property ${i + 1}`,
      type: TYPES[i % 6], category: i % 6 >= 3 ? 'commercial' : 'residential', purpose: 'sale',
      areaKey: AREAS[i % 6], price: 900000 + i * 350000, size: 90 + i * 12,
      bedrooms: (i % 4) + 1, bathrooms: (i % 3) + 1, floor: i % 9,
      images: [IMG], status: 'published', verified: i % 3 === 0,
      createdAt: new Date(Date.now() - i * 86400000).toISOString()
    };
    if (i === 1) base.images = [];
    if (i === 2) base.description_ar = 'وصف طويل جداً للاختبار '.repeat(120);
    if (i === 3) base.title_ar = 'عقار باسم طويل جداً جداً جداً لاختبار كسر السطر والقص في الكروت على الموبايل الصغير وشاشات 320 بكسل';
    if (i === 4) base.price = 0;
    if (i === 5) base.price = 185000000;
    if (i === 6) base.status = 'hidden';
    return base;
  });
}

/** n leads across kinds and stages, each with its phone in lead_contacts only (the current format). */
export function auditLeads(n = 500) {
  const kinds = ['viewing_request', 'seller', 'buyer', 'investor', 'broker', 'reservation_request', 'callback_request'];
  const stages = ['new', 'new', 'contacted', 'site_visit', 'negotiating', 'closing', 'closed', 'lost'];
  const desks = ['Sales Team A', 'Sales Team B', 'Unassigned'];
  return Array.from({ length: n }, (_, i) => {
    const id = `audit-l${String(i + 1).padStart(4, '0')}`;
    const lead = {
      id, name: `عميل اختبار ${i + 1}`, type: kinds[i % kinds.length], status: stages[i % stages.length],
      source: ['website', 'facebook', 'whatsapp', 'referral'][i % 4], assignedTo: desks[i % 3],
      area: AREAS[i % 6], propertyType: TYPES[i % 6], notes: i % 11 === 0 ? 'ملاحظة فيها كلمة معاينة' : '',
      createdAt: new Date(Date.now() - i * 3600000).toISOString(), updatedAt: new Date(Date.now() - i * 3600000).toISOString()
    };
    if (lead.type === 'viewing_request') lead.details = { propertyId: `audit-p${(i % 30) + 1}`, date: '2026-10-20', slot: 'evening' };
    const contact = { phone: `0100000${String(i).padStart(4, '0')}`, assignedTo: lead.assignedTo };
    return { lead, contact };
  });
}

export async function seedAll({ leads = 500, properties = 30 } = {}) {
  await resetEmulators();
  const uids = {};
  for (const [key, s] of Object.entries(STAFF)) uids[key] = await createUser(s.email, PASSWORD, s.claims);
  for (const p of auditProperties(properties)) await setDoc('properties', p.id, p);
  const batch = auditLeads(leads);
  // Sequential keeps the emulator happy; ~1-2 s per 100 docs
  for (const { lead, contact } of batch) {
    await setDoc('leads', lead.id, lead);
    await setDoc('lead_contacts', lead.id, contact);
  }
  return uids;
}

/** Firestore traffic counter for a page: documents the client received and writes it sent. */
export function attachFirestoreCounter(page) {
  const counts = { docsReceived: 0, writes: 0, listenResponses: 0 };
  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('127.0.0.1:8080') && !url.includes('firestore.googleapis.com')) return;
    try {
      const body = await res.text();
      // Listen channel frames carry documentChange; RunQuery/Get responses carry "document": entries.
      counts.docsReceived += (body.match(/"documentChange"\s*:/g) || []).length;
      counts.docsReceived += (body.match(/"found"\s*:/g) || []).length;
      if (url.includes(':runQuery') || url.includes(':runAggregationQuery')) counts.docsReceived += (body.match(/"document"\s*:/g) || []).length;
      if (url.includes('/Listen/')) counts.listenResponses += 1;
    } catch { /* streaming bodies may be unavailable */ }
  });
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes(':commit') || url.includes('/Write/')) {
      const body = req.postData() || '';
      counts.writes += (body.match(/"update"\s*:|"delete"\s*:/g) || []).length || (url.includes(':commit') ? 1 : 0);
    }
  });
  return counts;
}
