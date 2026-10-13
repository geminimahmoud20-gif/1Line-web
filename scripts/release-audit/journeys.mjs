// Customer and staff journeys for the release audit, each verified in the Firestore emulator.
// Needs the emulators, scripts/release-audit/server.mjs on AUDIT_BASE, and staff from lib.seedAll().
// Taps are counted from the actions this script performs; reads from the Firestore traffic counter.
//   AUDIT_BASE=http://127.0.0.1:4175 node scripts/release-audit/journeys.mjs
import { loadPlaywright, chromiumPath, ensureDirs, writeJson, BASE, AUTH, FS, STAFF, PASSWORD, listDocs, setDoc, attachFirestoreCounter } from './lib.mjs';

const { chromium } = await loadPlaywright();
const ANDROID_FB = 'Mozilla/5.0 (Linux; Android 11; SM-A035F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.0;]';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const tag = Date.now().toString(36);
const results = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: chromiumPath() });
async function visitor({ w = 375, h = 667, ua = ANDROID_FB, slow = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, userAgent: ua, locale: 'ar-EG', serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { localStorage.setItem('oneline_consent_v1', 'declined'); } catch {} });
  const page = await ctx.newPage();
  if (slow) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  let taps = 0;
  const act = {
    click: async (loc) => { taps++; await loc.click({ timeout: 15000 }); },
    fill: async (loc, v) => { taps++; await loc.fill(v, { timeout: 15000 }); },
    get taps() { return taps; }
  };
  return { ctx, page, act, errors };
}

const leadsNamed = async (name) => (await listDocs('leads')).filter((l) => l.name === name);
async function waitForLeads(name, n = 1, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const found = await leadsNamed(name);
    if (found.length >= n) return found;
    await sleep(800);
  }
  return leadsNamed(name);
}
const contactOf = async (id) => (await listDocs('lead_contacts')).find((c) => c.id === id) || null;
const phoneInLead = (lead) => ['phone', 'whatsapp', 'email'].some((k) => k in lead) || JSON.stringify(lead.details || {}).match(/01\d{9}|\+20\d{10}/) !== null;

async function bookViewing(v, propertyId, name, phone, { query = '', date = '2026-10-25' } = {}) {
  const t0 = Date.now();
  await v.page.goto(`${BASE}/properties/${propertyId}${query}`, { waitUntil: 'domcontentloaded' });
  await v.act.click(v.page.locator('.pd-book-toggle').first());
  const form = v.page.locator('#pd-booking-form');
  await v.act.fill(form.locator('input[placeholder*="محمد"]').first(), name);
  await v.act.fill(form.locator('input[placeholder="01012345678"]').first(), phone);
  const dateInput = form.locator('input[type="date"]');
  if (await dateInput.count()) await v.act.fill(dateInput.first(), date);
  const morning = form.locator('.slot-pill').first();
  if (await morning.count()) await v.act.click(morning);
  await v.act.click(form.locator('button[type="submit"]'));
  return Date.now() - t0;
}

// ── C1: Facebook in-app browser → listing → viewing request (Slow 4G, CPU ×4) ──
try {
  const v = await visitor({ slow: true });
  const counter = attachFirestoreCounter(v.page);
  const name = `عميل اختبار معاينة ${tag}`;
  const ms = await bookViewing(v, 'audit-p1', name, '01000000011', { query: '?utm_source=facebook&utm_campaign=audit' });
  await v.page.waitForTimeout(3000);
  const confirmation = (await v.page.locator('text=/تم|استلمنا|شكراً/').count()) > 0;
  const leads = await waitForLeads(name);
  const lead = leads[0] || {};
  const contact = lead.id ? await contactOf(lead.id) : null;
  results.C1_viewing_from_facebook = {
    taps: v.act.taps, msToSubmit: ms, confirmationShown: confirmation, stored: leads.length,
    type: lead.type, propertyId: lead.propertyId || lead.details?.propertyId, date: lead.date || lead.details?.date,
    utmSource: lead.utmSource || lead.marketingAttribution?.source, assignedTo: lead.assignedTo,
    phoneOnLeadOrDetails: leads.length ? phoneInLead(lead) : null, contactHasPhone: Boolean(contact?.phone || contact?.whatsapp),
    firestoreDocsReceived: counter.docsReceived, pageErrors: v.errors
  };
  // ── C6: same visitor, second request with the same phone (returning client) ──
  const name2 = `عميل اختبار راجع ${tag}`;
  await bookViewing(v, 'audit-p4', name2, '01000000011');
  await v.page.waitForTimeout(4000);
  const all = await listDocs('lead_contacts');
  const samePhone = all.filter((c) => String(c.phone || '').endsWith('1000000011'));
  const second = await waitForLeads(name2, 1, 12000);
  const firstAgain = (await listDocs('leads')).find((l) => l.id === lead.id) || {};
  results.C6_second_request_same_phone = {
    leadsWithThisPhone: samePhone.length, secondStoredUnderOwnName: second.length,
    firstLeadNameNow: firstAgain.name, firstLeadTypeNow: firstAgain.type,
    offlineQueue: await v.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('oneline_pending_leads_queue') || '[]').length; } catch { return 'n/a'; } }),
    pageErrors: v.errors
  };
  await v.ctx.close();
} catch (e) { results[`error_${Object.keys(results).length}`] = String(e.message || e).split('\n')[0].slice(0, 200); }

// ── C8: submit while offline, then back online ──
try {
  const v = await visitor({ ua: IOS, w: 390, h: 844 });
  const name = `عميل اختبار أوفلاين ${tag}`;
  await v.page.goto(`${BASE}/properties/audit-p10`, { waitUntil: 'domcontentloaded' });
  await v.page.waitForTimeout(6500); // let the Firebase SDK load first, as on a real visit
  await v.act.click(v.page.locator('.pd-book-toggle').first());
  const form = v.page.locator('#pd-booking-form');
  await v.act.fill(form.locator('input[placeholder*="محمد"]').first(), name);
  await v.act.fill(form.locator('input[placeholder="01012345678"]').first(), '01000000012');
  await v.ctx.setOffline(true);
  await v.act.click(form.locator('button[type="submit"]'));
  await v.page.waitForTimeout(2500);
  const toastOffline = await v.page.locator('text=/دون اتصال|بدون إنترنت|offline/i').count();
  const queued = await v.page.evaluate(() => { try { return JSON.parse(localStorage.getItem('oneline_pending_leads_queue') || '[]').length; } catch { return 'n/a'; } });
  await v.ctx.setOffline(false);
  await v.page.evaluate(() => window.dispatchEvent(new Event('online')));
  const after = await waitForLeads(name, 1, 25000);
  await v.page.waitForTimeout(5000);
  results.C8_offline_submit = { offlineMessageShown: toastOffline > 0, queuedLocally: queued, storedAfterReconnect: (await leadsNamed(name)).length, pageErrors: v.errors, firstSeenAfterMs: after.length ? 'within 25s' : 'not within 25s' };
  await v.ctx.close();
} catch (e) { results[`error_${Object.keys(results).length}`] = String(e.message || e).split('\n')[0].slice(0, 200); }

// ── C9: double tap on submit ──
try {
  const v = await visitor({ w: 360, h: 740 });
  const name = `عميل اختبار ضغطتين ${tag}`;
  await v.page.goto(`${BASE}/properties/audit-p11`, { waitUntil: 'domcontentloaded' });
  await v.page.waitForTimeout(6500);
  await v.act.click(v.page.locator('.pd-book-toggle').first());
  const form = v.page.locator('#pd-booking-form');
  await v.act.fill(form.locator('input[placeholder*="محمد"]').first(), name);
  await v.act.fill(form.locator('input[placeholder="01012345678"]').first(), '01000000013');
  await form.locator('button[type="submit"]').dblclick();
  await v.page.waitForTimeout(6000);
  results.C9_double_submit = { stored: (await leadsNamed(name)).length, pageErrors: v.errors };
  await v.ctx.close();
} catch (e) { results[`error_${Object.keys(results).length}`] = String(e.message || e).split('\n')[0].slice(0, 200); }

// ── Staff helpers ──
async function staff(key, { w = 1366, h = 768, mobile = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, locale: 'ar-EG', serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { localStorage.setItem('oneline_consent_v1', 'declined'); } catch {} });
  const page = await ctx.newPage();
  const counter = attachFirestoreCounter(page);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error' && /claim|transaction|permission|PERMISSION/i.test(m.text())) errors.push(m.text().slice(0, 200)); });
  await page.goto(`${BASE}/crm`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(STAFF[key].email);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(7000);
  return { ctx, page, counter, errors };
}
const openSection = async (s, label) => {
  const item = s.page.locator('.crm-sidebar-item, .crm-sidebar-subitem', { hasText: label }).first();
  if (await item.count()) { await item.click(); await s.page.waitForTimeout(2500); return true; }
  return false;
};
const toasts = async (page) => page.evaluate(() => [...document.querySelectorAll('[class*="toast"]')].map((t) => t.innerText.trim()).filter(Boolean).slice(-3));

// ── S1: a new request reaches a signed-in manager (how long until it shows in the CRM) ──
try {
  const m = await staff('manager');
  await openSection(m, 'العملاء والمبيعات');
  const v = await visitor({ w: 390, h: 844, ua: IOS });
  const name = `عميل اختبار تنبيه ${tag}`;
  await v.page.goto(`${BASE}/properties/audit-p12`, { waitUntil: 'domcontentloaded' });
  await v.page.waitForTimeout(6500);
  const t0 = Date.now();
  await bookViewing(v, 'audit-p12', name, '01000000014');
  let seenMs = null;
  for (let i = 0; i < 40; i++) {
    if (await m.page.locator(`text=${name}`).count()) { seenMs = Date.now() - t0; break; }
    await sleep(500);
  }
  const bellBadge = await m.page.locator('.crm-topbar [class*="badge"], .crm-topbar [class*="count"]').first().innerText().catch(() => null);
  results.S1_new_request_reaches_crm = { visibleInCrmAfterMs: seenMs, bellBadge, managerErrors: m.errors };
  await v.ctx.close(); await m.ctx.close();
} catch (e) { results[`error_${Object.keys(results).length}`] = String(e.message || e).split('\n')[0].slice(0, 200); }

// ── S2: two agents claim the same unassigned request at the same moment (smart inbox) ──
try {
  await setDoc('leads', `audit-claim-${tag}`, { id: `audit-claim-${tag}`, name: `عميل اختبار استلام ${tag}`, type: 'viewing_request', status: 'new', source: 'website', createdAt: new Date().toISOString(), details: { propertyId: 'audit-p2' } });
  await setDoc('lead_contacts', `audit-claim-${tag}`, { phone: '01000000015' });
  const a1 = await staff('agentA1'); const a2 = await staff('agentA2');
  for (const s of [a1, a2]) await openSection(s, 'صندوق الوارد');
  const visitsTab = async (s) => { const t = s.page.locator('button', { hasText: 'طلبات المعاينة' }).first(); if (await t.count()) await t.click(); await s.page.waitForTimeout(1000); };
  await visitsTab(a1); await visitsTab(a2);
  const claimBtn = (s) => s.page.locator('button', { hasText: 'استلمت الطلب' }).first();
  const visible = [await claimBtn(a1).count(), await claimBtn(a2).count()];
  if (visible[0] && visible[1]) await Promise.all([claimBtn(a1).click(), claimBtn(a2).click()]);
  await sleep(4000);
  const doc = (await listDocs('leads')).find((l) => l.id === `audit-claim-${tag}`) || {};
  results.S2_concurrent_claim = { claimButtonShown: visible, assignedToAfter: doc.assignedTo ?? null, toastsAgent1: await toasts(a1.page), toastsAgent2: await toasts(a2.page), errors: [...a1.errors, ...a2.errors].slice(0, 6) };
  // ── S3: the inbox "خلص" chip on a request that is not a deal ──
  const target = (await listDocs('leads')).find((l) => l.assignedTo === 'Sales Team A' && l.status === 'new' && l.type === 'buyer');
  if (target) {
    await a1.page.locator('button', { hasText: 'استفسارات وطلبات الشراء' }).first().click().catch(() => {});
    await a1.page.waitForTimeout(800);
    const card = a1.page.locator('div', { has: a1.page.locator(`h4:text-is("${target.name}")`) }).last();
    const done = card.locator('button', { hasText: 'خلص' }).first();
    const clicked = await done.count() ? (await done.click().then(() => true).catch(() => false)) : false;
    await sleep(3000);
    const after = (await listDocs('leads')).find((l) => l.id === target.id) || {};
    results.S3_inbox_done_chip = { lead: target.id, clicked, statusAfter: after.status, meaning: after.status === 'closed' ? 'counted as a won deal (Kanban "صفقات ناجحة")' : 'not closed' };
  }
  await a1.ctx.close(); await a2.ctx.close();
} catch (e) { results[`error_${Object.keys(results).length}`] = String(e.message || e).split('\n')[0].slice(0, 200); }

// ── S5: desk isolation and phone protection, asked directly (REST with each user's ID token) ──
try {
  const token = async (key) => (await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=audit`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: STAFF[key].email, password: PASSWORD, returnSecureToken: true })
  }).then((r) => r.json())).idToken;
  const leads = await listDocs('leads');
  const bLead = leads.find((l) => l.assignedTo === 'Sales Team B');
  const get = async (key, path) => (await fetch(`${FS}/${path}`, { headers: { authorization: `Bearer ${await token(key)}` } })).status;
  results.S5_isolation = {
    agentA_reads_teamB_lead: await get('agentA1', `leads/${bLead.id}`),
    agentA_reads_teamB_phone: await get('agentA1', `lead_contacts/${bLead.id}`),
    viewer_reads_phone: await get('viewer', `lead_contacts/${bLead.id}`),
    inventory_reads_phone: await get('inventory', `lead_contacts/${bLead.id}`),
    finance_reads_phone: await get('finance', `lead_contacts/${bLead.id}`),
    visitor_reads_lead: (await fetch(`${FS}/leads/${bLead.id}`)).status,
    visitor_lists_leads: (await fetch(`${FS}/leads?pageSize=5`)).status,
    visitor_reads_audit_logs: (await fetch(`${FS}/audit_logs?pageSize=5`)).status,
    note: '200 = allowed, 403 = denied by the rules'
  };
} catch (e) { results[`error_${Object.keys(results).length}`] = String(e.message || e).split('\n')[0].slice(0, 200); }

// ── Q: Firestore documents read per visit and per staff session (measured from network traffic) ──
try {
  const v = await visitor({ w: 390, h: 844, ua: IOS });
  const c = attachFirestoreCounter(v.page);
  for (const p of ['/', '/properties', '/properties/audit-p1', '/properties/audit-p9', '/projects', '/about']) {
    await v.page.goto(BASE + p, { waitUntil: 'domcontentloaded' });
    await v.page.mouse.wheel(0, 800);
    await v.page.waitForTimeout(4000);
  }
  results.Q_visitor_6_pages = { firestoreDocsReceived: c.docsReceived, firestoreWrites: c.writes };
  await v.ctx.close();
  for (const key of ['admin', 'agentA1']) {
    const s = await staff(key);
    const afterLogin = s.counter.docsReceived;
    for (const label of ['لوحة القيادة', 'العملاء والمبيعات', 'مسار الصفقات', 'صندوق الوارد', 'محفظة العقارات']) await openSection(s, label);
    await s.page.reload({ waitUntil: 'domcontentloaded' });
    await s.page.waitForTimeout(8000);
    results[`Q_staff_${key}`] = { docsOnSignIn: afterLogin, docsAfter5ScreensAndOneReload: s.counter.docsReceived, writes: s.counter.writes, errors: s.errors.slice(0, 4) };
    await s.ctx.close();
  }
} catch (e) { results[`error_${Object.keys(results).length}`] = String(e.message || e).split('\n')[0].slice(0, 200); }

await browser.close();
ensureDirs();
writeJson('journeys.json', results);
console.log(JSON.stringify(results, null, 2));
