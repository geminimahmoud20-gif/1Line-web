import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leadScore, filterLeads, computeCrmAnalytics, sortLeads, duplicatesById, buildMergedLead, leadSourceKey, waitingMs, phoneKey, lostReasonCounts, parseMoney, localDayKey, isOverdue, isDueToday, isStale, isUnassigned, computeDashboardMetrics, pipelineOverviewOf } from '../../src/utils/crmLeadViews.js';

const leads = [
  { id: 1, name: 'Ahmed', phone: '01011111111', type: 'buyer', status: 'new', assignedTo: 'Sales Team A', temperature: 'hot', details: { area: 'east' } },
  { id: 2, name: 'Mona', phone: '01022222222', type: 'seller', status: 'contacted', assignedTo: 'Sales Team B', temperature: 'cold', details: { area: 'kawthar' }, nextFollowUpAt: '2026-10-01T09:00:00Z' },
  { id: 3, name: 'Old', phone: '01033333333', type: 'buyer', status: 'closed', assignedTo: 'Unassigned', isArchived: true },
  { id: 4, name: 'Pool', phone: '01044444444', type: 'investor', assignedTo: 'Unassigned', tags: ['VIP'], notes: 'wants Clinic' }
];
const ids = (r) => r.map((l) => l.id);

test('archived leads only appear under "archived"', () => {
  assert.deepEqual(ids(filterLeads(leads)), [1, 2, 4]);
  assert.deepEqual(ids(filterLeads(leads, { leadFilter: 'archived' })), [3]);
});

test('stage, type, temperature and area filters', () => {
  assert.deepEqual(ids(filterLeads(leads, { leadFilter: 'new' })), [1, 4]); // no status counts as new
  // 'qualified' = computed score 60+ (negotiating 35 + reservation request 25 + phone 5)
  const hotDeal = { id: 9, name: 'Q', phone: '010', status: 'negotiating', type: 'reservation_request' };
  assert.deepEqual(ids(filterLeads([...leads, hotDeal], { leadFilter: 'qualified' })), [9]);
  assert.deepEqual(ids(filterLeads(leads, { leadFilter: 'due', today: '2026-10-02' })), [2]);
  assert.deepEqual(ids(filterLeads(leads, { leadFilter: 'seller' })), [2]);
  assert.deepEqual(ids(filterLeads(leads, { temperatureFilter: 'hot' })), [1]);
  assert.deepEqual(ids(filterLeads(leads, { temperatureFilter: 'unknown' })), [4]); // missing temperature is not 'hot'
  assert.deepEqual(ids(filterLeads(leads, { areaFilter: 'kawthar' })), [2]);
});

test('search matches name, phone, notes and tags, case-insensitively', () => {
  assert.deepEqual(ids(filterLeads(leads, { searchQuery: 'mona' })), [2]);
  assert.deepEqual(ids(filterLeads(leads, { searchQuery: '0104444' })), [4]);
  assert.deepEqual(ids(filterLeads(leads, { searchQuery: 'clinic' })), [4]);
  assert.deepEqual(ids(filterLeads(leads, { searchQuery: 'vip' })), [4]);
  assert.deepEqual(ids(filterLeads(leads, { searchQuery: '   ' })), [1, 2, 4]);
});

test('"my deals" keeps the agent\'s desk and the pool, except for the super admin', () => {
  assert.deepEqual(ids(filterLeads(leads, { myDealsOnly: true, activeRole: 'agent_east', agentName: 'Sales Team A' })), [1, 4]);
  assert.deepEqual(ids(filterLeads(leads, { myDealsOnly: true, activeRole: 'super_admin', agentName: 'x' })), [1, 2, 4]);
});

test('dashboard counters', () => {
  const a = computeCrmAnalytics(leads);
  assert.equal(a.buyersCount, 2);
  assert.equal(a.sellersCount, 1);
  assert.equal(a.closedCount, 1);
  assert.equal(a.conversionSuccess, '25%');
  assert.equal(computeCrmAnalytics([]).conversionSuccess, '0%');
});

const NOW = Date.parse('2026-10-08T12:00:00Z');
const H = 3600 * 1000;
const crm = [
  { id: 'a', name: 'A', phone: '+20 101 234 5678', status: 'new', createdAt: new Date(NOW - 5 * H).toISOString(), source: 'website', score: 70 },
  { id: 'b', name: 'B', whatsapp: '01012345678', status: 'contacted', createdAt: new Date(NOW - 30 * 24 * H).toISOString(), source: 'بوابة الوسطاء والشركاء', score: 95, notes: 'old note', tags: ['VIP'] },
  { id: 'c', name: 'C', phone: '01199999999', status: 'new', createdAt: { seconds: (NOW - 0.5 * H) / 1000 }, source: 'Direct Entry' },
  { id: 'd', name: 'D', phone: '01055555555', status: 'lost', lostReason: 'price', createdAt: new Date(NOW - 2 * H).toISOString(), utmSource: 'facebook' },
  { id: 'e', name: 'E', phone: '01012345678', status: 'new', isArchived: true, createdAt: new Date(NOW - H).toISOString() }
];

test('lost leads only show under "lost", and are counted by reason', () => {
  assert.deepEqual(ids(filterLeads(crm, { now: NOW })), ['a', 'b', 'c']);
  assert.deepEqual(ids(filterLeads(crm, { leadFilter: 'lost', now: NOW })), ['d']);
  assert.deepEqual(lostReasonCounts(crm), { price: 1 });
});

test('first-reply wait: only untouched new leads, archived ones ignored', () => {
  assert.equal(waitingMs(crm[0], NOW), 5 * H);
  assert.equal(waitingMs(crm[1], NOW), 0);
  assert.equal(waitingMs({ ...crm[0], firstContactedAt: 'x' }, NOW), 0);
  assert.equal(waitingMs(crm[4], NOW), 0);
  assert.deepEqual(ids(filterLeads(crm, { leadFilter: 'awaiting', now: NOW })), ['a', 'c']);
});

test('duplicates match the same number across formats, skipping archived leads', () => {
  assert.equal(phoneKey('+20 101 234 5678'), '01012345678');
  assert.equal(phoneKey('٠١٠١٢٣٤٥٦٧٨'), '01012345678');
  const d = duplicatesById(crm);
  assert.deepEqual(d.get('a'), ['b']);
  assert.deepEqual(d.get('b'), ['a']);
  assert.equal(d.has('e'), false);
  assert.deepEqual(ids(filterLeads(crm, { leadFilter: 'dupes', now: NOW })), ['a', 'b']);
});

test('merge keeps the oldest date, furthest stage, all notes and tags', () => {
  const m = buildMergedLead(crm[0], [crm[1]], '2026-10-08T12:00:00.000Z');
  assert.equal(m.createdAt, crm[1].createdAt);
  assert.equal(m.status, 'contacted');
  assert.deepEqual(m.tags, ['VIP']);
  assert.match(m.notes, /old note/);
  assert.equal(m.phone, '+20 101 234 5678');
  assert.equal(m.whatsapp, '01012345678');
  assert.deepEqual(m.mergedFrom, ['b']);
  assert.match(m.activityLogs[0].action, /دمج 1/);
});

test('source buckets, date range and sorting', () => {
  assert.deepEqual(crm.map(leadSourceKey), ['website', 'broker', 'manual', 'ads', 'website']);
  assert.equal(leadSourceKey({ source: 'Digital Brochure' }), 'other');
  assert.deepEqual(ids(filterLeads(crm, { sourceFilter: 'broker', now: NOW })), ['b']);
  assert.deepEqual(ids(filterLeads(crm, { dateFilter: '7d', now: NOW })), ['a', 'c']);
  assert.deepEqual(ids(sortLeads(crm.slice(0, 3), 'oldest', NOW)), ['b', 'a', 'c']);
  assert.deepEqual(ids(sortLeads(crm.slice(0, 3), 'newest', NOW)), ['c', 'a', 'b']);
  // score sort follows the computed score (highest first)
  const byScore = sortLeads(crm.slice(0, 3), 'score', NOW).map((l) => leadScore(l, NOW).score);
  assert.deepEqual(byScore, [...byScore].sort((x, y) => y - x));
  assert.deepEqual(ids(sortLeads(crm.slice(0, 3), 'waiting', NOW)), ['a', 'c', 'b']);
});

test('money parsing: Arabic digits, separators, units and ranges', () => {
  assert.equal(parseMoney(2500000), 2500000);
  assert.equal(parseMoney('2,500,000'), 2500000);
  assert.equal(parseMoney('٢٫٥ مليون'), 2500000);
  assert.equal(parseMoney('٣٬٠٠٠٬٠٠٠'), 3000000);
  assert.equal(parseMoney('750 ألف'), 750000);
  assert.equal(parseMoney('EGP 1.2m'), 1200000);
  assert.equal(parseMoney('2-3 مليون'), 2000000);
  assert.equal(parseMoney('بدون'), 0);
  assert.equal(parseMoney(-5), 0);
});

test('follow-up days use the local calendar day, not the UTC one', () => {
  // 23:30 local on Oct 10 is still the 10th even where UTC has moved on
  const late = new Date(2026, 9, 10, 23, 30);
  assert.equal(localDayKey(late), '2026-10-10');
  const lead = { status: 'contacted', nextFollowUpAt: late.toISOString() };
  assert.equal(isDueToday(lead, '2026-10-10'), true);
  assert.equal(isOverdue(lead, '2026-10-11'), true);
  assert.equal(isOverdue({ ...lead, status: 'closed' }, '2026-10-11'), false);
});

test('overdue, unassigned and stale filters', () => {
  const now = new Date(2026, 9, 10, 12).getTime();
  const day = 864e5;
  const L = [
    { id: 1, status: 'contacted', assignedTo: 'Sales Team A', nextFollowUpAt: new Date(now - 2 * day).toISOString(), lastActivityAt: new Date(now - 3 * day).toISOString() },
    { id: 2, status: 'new', assignedTo: 'Unassigned', lastActivityAt: new Date(now - 3600e3).toISOString() },
    { id: 3, status: 'closed', assignedTo: 'Unassigned', lastActivityAt: new Date(now - 9 * day).toISOString() },
    { id: 4, status: 'negotiating', assignedTo: 'Sales Team B', nextFollowUpAt: new Date(now).toISOString(), lastActivityAt: new Date(now).toISOString() }
  ];
  assert.deepEqual(ids(filterLeads(L, { leadFilter: 'overdue', now })), [1]);
  assert.deepEqual(ids(filterLeads(L, { leadFilter: 'unassigned', now })), [2]);
  assert.deepEqual(ids(filterLeads(L, { leadFilter: 'stale', now })), [1]);
  assert.deepEqual(ids(filterLeads(L, { leadFilter: 'due', now })), [1, 4]);
  assert.equal(isUnassigned(L[2]), false);
  assert.equal(isStale(L[1], now), false);
});

test('dashboard: active pipeline excludes won, lost and archived; desk scope', () => {
  const now = Date.now();
  const L = [
    { id: 1, status: 'negotiating', budget: '٢ مليون', assignedTo: 'Sales Team A' },
    { id: 2, status: 'closed', budget: 5000000, assignedTo: 'Sales Team A' },
    { id: 3, status: 'lost', budget: 9000000, assignedTo: 'Sales Team B' },
    { id: 4, status: 'new', details: { budget: '1,500,000' }, assignedTo: 'Unassigned' },
    { id: 5, status: 'contacted', budget: 7000000, isArchived: true, assignedTo: 'Sales Team B' }
  ];
  const D = [{ budget: '3 مليون', status: 'pending' }, { budget: 4000000, status: 'archived' }];
  const all = computeDashboardMetrics(L, D, { now });
  assert.equal(all.pipelineValue, 3500000);
  assert.equal(all.openCount, 2);
  assert.equal(all.purchasingPower, 3000000);
  assert.equal(all.pendingDemandsCount, 1);
  assert.equal(all.wonCount, 1);
  assert.equal(all.lostCount, 1);
  assert.equal(all.winRate, 50);
  const desk = computeDashboardMetrics(L, D, { now, scopeDesk: 'Sales Team A' });
  assert.equal(desk.scoped, true);
  assert.equal(desk.pipelineValue, 2000000);
  assert.equal(desk.purchasingPower, 0);
  assert.equal(desk.wonCount, 1);
  assert.equal(desk.winRate, 100);
  assert.equal(desk.unassignedList.length, 1); // the shared pool stays visible
});

test('leadCampaign: the ad that brought the lead, nothing for a visit without one', async () => {
  const { leadCampaign } = await import('../../src/utils/crmLeadViews.js');
  assert.deepEqual(
    leadCampaign({ utmSource: 'facebook', utmCampaign: 'buyers-sohag', marketingAttribution: { source: 'facebook', campaign: 'buyers-sohag', content: 'v10-life-savings' } }),
    { campaign: 'buyers-sohag', ad: 'v10-life-savings', source: 'facebook' }
  );
  assert.equal(leadCampaign({ utmSource: 'مباشر', utmCampaign: 'direct' }), null);
  assert.equal(leadCampaign({ marketingAttribution: { source: 'Facebook', campaign: 'organic_referral' } }), null);
  assert.equal(leadCampaign({}), null);
});

test('an ad client must be answered within 15 minutes, the rest within 2 hours', async () => {
  const { responseSlaMs, AD_RESPONSE_SLA_MS, RESPONSE_SLA_MS } = await import('../../src/utils/crmLeadViews.js');
  assert.equal(responseSlaMs({ marketingAttribution: { source: 'facebook', campaign: 'buyers-sohag' } }), AD_RESPONSE_SLA_MS);
  assert.equal(responseSlaMs({ source: 'Facebook Ads' }), AD_RESPONSE_SLA_MS);
  assert.equal(responseSlaMs({ source: 'Direct Entry' }), RESPONSE_SLA_MS);
  assert.equal(AD_RESPONSE_SLA_MS, 15 * 60 * 1000);
});

test('tapping call or WhatsApp on an uncontacted client records the first contact once, without moving the stage', async () => {
  const { firstContactPatch } = await import('../../src/utils/crmLeadViews.js');
  const p = firstContactPatch({ status: 'new' }, '2026-11-12T10:00:00.000Z');
  assert.deepEqual(p, { lastContactedAt: '2026-11-12T10:00:00.000Z', lastActivityAt: '2026-11-12T10:00:00.000Z' });
  assert.equal(firstContactPatch({ status: 'new', lastContactedAt: '2026-11-12T09:00:00Z' }), null);
  assert.equal(firstContactPatch({ status: 'new', firstContactedAt: '2026-11-12T09:00:00Z' }), null);
  assert.equal(firstContactPatch({ status: 'negotiating' }).status, undefined);
  assert.equal(firstContactPatch(null), null);
});

test('the «شراء» filter takes every client who wants to buy, not only those typed exactly "buyer"', async () => {
  const { isBuyerLead } = await import('../../src/utils/crmLeadViews.js');
  const yes = [{ type: 'buyer' }, { type: 'request' }, { type: 'buyer_demand' }, { type: '' }, {}];
  const no = [{ type: 'seller' }, { type: 'valuation' }, { type: 'investor' }, { type: 'broker' }, { type: 'account' }, { type: 'client_registration' }, { type: 'viewing_request' }, { type: 'buyer', details: { askingPrice: 1e6 } }, { type: 'request', notes: 'عايز معاينة' }];
  for (const l of yes) assert.equal(isBuyerLead(l), true, JSON.stringify(l));
  for (const l of no) assert.equal(isBuyerLead(l), false, JSON.stringify(l));
});

test('a request from the one-step sell card is a seller request', async () => {
  const { isSellerLead } = await import('../../src/utils/crmLeadViews.js');
  assert.equal(isSellerLead({ type: 'seller_instant', source: 'Portals 1-Step (sell)' }), true);
  assert.equal(isSellerLead({ source: 'Portals 1-Step (valuation)' }), true);
  assert.equal(isSellerLead({ details: { sellerRole: 'broker' } }), true);
  // the buyer and investor cards are not
  assert.equal(isSellerLead({ type: 'buyer_instant', source: 'Portals 1-Step (buy)' }), false);
  assert.equal(isSellerLead({ type: 'investor_instant', source: 'Portals 1-Step (investor)' }), false);
});

test('dashboard: buyers\' budgets and owners\' asking prices are never added together', () => {
  const L = [
    { id: 1, status: 'new', budget: 2000000 },
    { id: 2, status: 'new', type: 'seller', budget: 35000000 },
    { id: 3, status: 'closed', budget: 9000000 }
  ];
  const m = computeDashboardMetrics(L, []);
  assert.equal(m.pipelineValue, 2000000);
  assert.equal(m.supplyValue, 35000000);
  assert.equal(m.openCount, 2);
});

import { defaultLeadFilter } from '../../src/utils/crmLeadViews.js';
test('the clients list opens on «الكل» for a salesperson (it used to open on viewing requests and look empty)', () => {
  for (const role of ['sales_agent', 'agent_east', 'agent_new_sohag', 'sales_manager', 'super_admin']) assert.equal(defaultLeadFilter(role), 'all', role);
  assert.equal(defaultLeadFilter('property_manager'), 'seller');
});

import { computeDashboardMetrics as dashMetrics } from '../../src/utils/crmLeadViews.js';
test('dashboard: the open-deal count matches what the budgets add up, and won and lost skip archived the same way', () => {
  const now = Date.parse('2026-11-18T12:00:00');
  const iso = (h) => new Date(now - h * 3600000).toISOString();
  const m = dashMetrics([
    { id: 'b1', type: 'buyer', status: 'new', budget: 2000000, createdAt: iso(2) },
    { id: 'b2', type: 'buyer', status: 'contacted', createdAt: iso(50) },
    { id: 's1', type: 'seller', status: 'new', details: { askingPrice: 9000000, sellerRole: 'owner' }, createdAt: iso(60) },
    { id: 'w1', type: 'buyer', status: 'closed', createdAt: iso(300) },
    { id: 'w2', type: 'buyer', status: 'closed', isArchived: true, createdAt: iso(300) },
    { id: 'l1', type: 'buyer', status: 'lost', createdAt: iso(300) }
  ], [{ status: 'published', budget: 1000000 }, { status: 'rejected', budget: 5000000 }, { status: 'archived', budget: 7000000 }], { now });
  assert.equal(m.openBuyers, 2);
  assert.equal(m.budgetedBuyers, 1);
  assert.equal(m.openSellers, 1);
  assert.equal(m.pipelineValue, 2000000);
  assert.equal(m.createdTodayCount, 1);
  assert.equal(m.wonCount, 1);
  assert.equal(m.winRate, 50);
  assert.equal(m.liveDemandsCount, 1);
  assert.equal(m.purchasingPower, 1000000);
});

import { isListedOnSite } from '../../src/utils/crmLeadViews.js';
test('«معروض على الموقع» counts only real listings visitors can see and buy', () => {
  assert.equal(isListedOnSite({ status: 'published' }), true);
  assert.equal(isListedOnSite({}), true);
  assert.equal(isListedOnSite({ status: 'reserved' }), true);
  for (const p of [{ status: 'hidden' }, { status: 'draft' }, { status: 'trash' }, { status: 'sold' }, { status: 'contracted' }, { status: 'published', isDemo: true }, { status: 'published', approval: 'pending' }, { status: 'published', approval: 'rejected' }, { status: 'published', isDeleted: true }]) {
    assert.equal(isListedOnSite(p), false, JSON.stringify(p));
  }
});

import { sellerMissing, needsDetails } from '../../src/utils/crmLeadViews.js';
import { completeDetailsMessage } from '../../src/utils/sharePages.js';
test('an owner whose request lacks the size, the address or photos is found, and asked for exactly those', () => {
  const quick = { type: 'seller', source: 'Portals 1-Step (sell)', status: 'new', details: { sellerRole: 'owner', propertyType: 'apartment' } };
  assert.deepEqual(sellerMissing(quick), ['size', 'address', 'photos']);
  assert.equal(needsDetails(quick), true);
  const full = { ...quick, details: { ...quick.details, size: 120, address: 'شارع الجمهورية', images: ['https://x/y.jpg'] } };
  assert.deepEqual(sellerMissing(full), []);
  assert.deepEqual(sellerMissing({ type: 'buyer', status: 'new' }), []);
  assert.equal(needsDetails({ ...quick, status: 'closed' }), false);
  assert.equal(needsDetails({ ...quick, isArchived: true }), false);
  assert.equal(filterLeads([quick, full, { type: 'buyer', status: 'new' }], { leadFilter: 'incomplete' }).length, 1);
  const msg = completeDetailsMessage({ name: 'محمد الضبع', missing: ['المساحة', 'العنوان'], siteUrl: 'https://www.1lineestate.com/' });
  assert.match(msg, /أهلاً أستاذ محمد/);
  assert.match(msg, /المساحة، العنوان/);
  assert.match(msg, /https:\/\/www\.1lineestate\.com\/sell\?/);
});

test('a contact saved from a unit added in the CRM is a seller, even an older one typed «broker»', async () => {
  const { isSellerLead, isBuyerLead } = await import('../../src/utils/crmLeadViews.js');
  const oldBroker = { type: 'broker', source: 'إضافة وحدة من الـ CRM', details: { listingIds: ['p1'], listedBy: 'broker' } };
  assert.equal(isSellerLead(oldBroker), true);
  assert.equal(isBuyerLead(oldBroker), false);
  assert.equal(isSellerLead({ type: 'broker', details: { listingIds: ['p1'], listedBy: 'owner' } }), true);
  // a partner broker from the broker portal offers no unit: not a seller
  assert.equal(isSellerLead({ type: 'broker', source: 'بوابة الوسطاء والشركاء' }), false);
  assert.equal(isSellerLead({ type: 'broker', details: { listingIds: ['p1'] } }), false, 'a link without who offers it is not enough');
});

test('lost reasons fit the client: owners are not asked about budget or financing', async () => {
  const { lostReasonsFor, LOST_REASONS } = await import('../../src/utils/crmLeadViews.js');
  const ownerIds = lostReasonsFor({ type: 'seller' }).map((r) => r.id);
  const buyerIds = lostReasonsFor({ type: 'buyer' }).map((r) => r.id);
  assert.ok(ownerIds.includes('not_selling') && ownerIds.includes('refused_terms') && ownerIds.includes('other'));
  assert.ok(!ownerIds.includes('price') && !ownerIds.includes('financing') && !ownerIds.includes('bought_elsewhere'));
  assert.ok(buyerIds.includes('price') && buyerIds.includes('financing') && !buyerIds.includes('not_selling'));
  // every reason id is unique so reports can still label old and new records
  assert.equal(new Set(LOST_REASONS.map((r) => r.id)).size, LOST_REASONS.length);
});

test('«غير مناسب» lists every client it counts, the lost ones too; «الكل» still hides lost', () => {
  const rows = [
    { id: 'a', name: 'A', phone: '01011111111', status: 'new' },
    { id: 'b', name: 'B', phone: '01022222222', status: 'lost' },
    { id: 'c', name: 'C', phone: '01033333333', status: 'lost' },
    { id: 'd', name: 'D', phone: '01044444444', status: 'new' }
  ];
  const situationById = new Map([['a', 'not_fit'], ['b', 'not_fit'], ['c', 'no_answer'], ['d', 'converted']]);
  assert.deepEqual(ids(filterLeads(rows, { leadFilter: 'not_fit', situationById })), ['a', 'b']);
  assert.deepEqual(ids(filterLeads(rows, { leadFilter: 'all', situationById })), ['a', 'd']);
  assert.deepEqual(ids(filterLeads(rows, { leadFilter: 'lost', situationById })), ['b', 'c']);
});

import { isAccountLead } from '../../src/utils/crmLeadViews.js';
test('a client who only registered an account is in neither pipeline; saying what they want makes them a real lead', () => {
  const acct = { id: 'a', status: 'new', type: 'account', source: 'تسجيل حساب بالموقع', createdAt: Date.now() };
  assert.equal(isAccountLead(acct), true);
  // the source still says «حساب», but once the type is a real one the client is no longer «just an account»
  assert.equal(isAccountLead({ ...acct, type: 'buyer' }), false);
  assert.equal(isAccountLead({ ...acct, type: 'seller' }), false);
  const buyer = { id: 'b', status: 'new', type: 'buyer', budget: '2000000', createdAt: Date.now() };
  const m = dashMetrics([acct, buyer], []);
  assert.equal(m.openBuyers, 1);
  assert.equal(m.budgetedBuyers, 1);
  assert.equal(m.openAccounts, 1);
  assert.equal(m.openCount, 2); // nobody is dropped from the open total
});

test('every lost reason the team can pick is accepted when a deal moves to lost', async () => {
  const { validateStageTransition } = await import('../../src/services/stateMachineEngine.js');
  const { LOST_REASONS: reasons } = await import('../../src/utils/crmLeadViews.js');
  for (const r of reasons) {
    assert.equal(validateStageTransition({ id: 'x', status: 'new' }, 'lost', { lostReason: r.id }).allowed, true, r.id);
  }
  assert.equal(validateStageTransition({ id: 'x', status: 'new' }, 'lost', { lostReason: 'nonsense' }).allowed, false);
  assert.equal(validateStageTransition({ id: 'x', status: 'new' }, 'lost', {}).allowed, false);
});

test('an owner counts at the price he asks, wherever it was saved', async () => {
  const { leadBudget } = await import('../../src/utils/crmLeadViews.js');
  assert.equal(leadBudget({ type: 'seller', askingPrice: 1900000 }), 1900000);
  assert.equal(leadBudget({ type: 'seller', details: { askingPrice: '2,500,000', budget: '1000' } }), 2500000);
  assert.equal(leadBudget({ type: 'seller', details: { budget: '1500000' } }), 1500000);
  assert.equal(leadBudget({ type: 'buyer', budget: '800000', askingPrice: 9 }), 800000); // a buyer never reads asking price
});

test('pipelineOverviewOf counts a client once, not once per un-merged duplicate lead', () => {
  const open = [
    { id: 1, type: 'buyer', status: 'new', phone: '01011111111', budget: 2_000_000 },
    // Same number, a second form never merged: must not double the buyer total or the open count
    { id: 2, type: 'buyer', status: 'new', phone: '01011111111', budget: 2_000_000 },
    { id: 3, type: 'seller', status: 'contacted', phone: '01022222222', askingPrice: 6_000_000 },
    { id: 4, type: 'buyer', status: 'closed', phone: '01033333333', budget: 9_000_000 } // closed: not open
  ];
  const r = pipelineOverviewOf(open);
  assert.equal(r.activeCount, 2); // the duplicate buyer and the seller, not 3
  assert.equal(r.totalVol, 2_000_000);
  assert.equal(r.supplyVol, 6_000_000);
  assert.equal(r.highValue, 1); // the 6M seller only; the closed 9M lead is not open
});

test('pipelineOverviewOf keeps the larger value when two open leads share a number', () => {
  const open = [
    { id: 1, type: 'seller', status: 'new', phone: '01011111111', askingPrice: 1_000_000 },
    { id: 2, type: 'seller', status: 'contacted', phone: '01011111111', askingPrice: 7_000_000 }
  ];
  const r = pipelineOverviewOf(open);
  assert.equal(r.activeCount, 1);
  assert.equal(r.supplyVol, 7_000_000);
  assert.equal(r.highValue, 1);
});

test('pipelineOverviewOf falls back to the lead id when neither phone nor whatsapp is set', () => {
  const open = [
    { id: 'a', type: 'buyer', status: 'new', budget: 1_000_000 },
    { id: 'b', type: 'buyer', status: 'new', budget: 1_000_000 }
  ];
  assert.equal(pipelineOverviewOf(open).activeCount, 2);
});
