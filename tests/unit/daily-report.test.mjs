import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyReport, runDailyReport, reportDays, cairoDayRange, cairoDay, splitMessage, trend, mergeDaily } from '../../api/_daily-report-core.js';

// 12 Nov 2026, 08:00 Cairo (06:00 UTC, winter time UTC+2)
const NOW = Date.parse('2026-11-12T06:00:00Z');
const H = 3600 * 1000;

test('Cairo days: yesterday and the seven before it, midnight to midnight', () => {
  const { today, target, before } = reportDays(NOW);
  assert.equal(today, '2026-11-12');
  assert.equal(target, '2026-11-11');
  assert.deepEqual(before, ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10']);
  const [s, e] = cairoDayRange('2026-11-11');
  assert.equal(new Date(s).toISOString(), '2026-11-10T22:00:00.000Z');
  assert.equal(e - s, 24 * H);
  // the day summer time ends (last Thursday of October) starts at UTC+3 and lasts 25 hours
  const [ds, de] = cairoDayRange('2026-10-29');
  assert.equal(new Date(ds).toISOString(), '2026-10-28T21:00:00.000Z');
  assert.equal(de - ds, 25 * H);
  // summer time (UTC+3)
  assert.equal(new Date(cairoDayRange('2026-07-15')[0]).toISOString(), '2026-07-14T21:00:00.000Z');
  assert.equal(cairoDay(Date.parse('2026-10-29T22:30:00Z')), '2026-10-30');
});

const yest = (h) => new Date(Date.parse('2026-11-10T22:00:00Z') + h * H).toISOString();
const daysAgo = (d) => new Date(NOW - d * 24 * H).toISOString();

const data = () => ({
  leads: [
    { id: 'a', name: 'زينب', phone: '01011112222', type: 'buyer', source: 'website', area: 'new_sohag', status: 'new', createdAt: yest(10), assignedTo: 'Sales A' },
    { id: 'b', name: 'مرتضى', type: 'seller', source: 'facebook ads', area: 'new_sohag', status: 'contacted', createdAt: yest(12), firstContactedAt: yest(13), assignedTo: 'Sales A' },
    { id: 'c', type: 'visit', details: { propertyId: 'p1', visitDate: '2026-11-01' }, status: 'new', createdAt: yest(20) },
    { id: 'd', type: 'buyer', status: 'lost', lostReason: 'price', createdAt: daysAgo(5), updatedAt: daysAgo(1), assignedTo: 'Sales B' },
    { id: 'e', type: 'buyer', status: 'lost', lostReason: 'price', createdAt: daysAgo(6), updatedAt: daysAgo(2), assignedTo: 'Sales B' },
    { id: 'f', type: 'buyer', status: 'closed', createdAt: daysAgo(4), updatedAt: daysAgo(1), firstContactedAt: daysAgo(3.9), assignedTo: 'Sales B' },
    { id: 'g', type: 'buyer', status: 'contacted', createdAt: daysAgo(3), nextFollowUpAt: daysAgo(2), assignedTo: 'Sales A' }
  ],
  demands: [{ createdAt: yest(9) }],
  remoteInspections: [],
  tradeIns: [{ createdAt: yest(3) }],
  properties: [
    { id: 'p1', title_ar: 'شقة 150م بسوهاج الجديدة', areaKey: 'new_sohag', status: 'published' },
    { id: 'p2', title_ar: 'فيلا بالكوثر', areaKey: 'kawthar', status: 'published', createdAt: yest(11) },
    { id: 'p3', title_ar: 'محل', areaKey: 'sohag_east', status: 'sold' }
  ],
  daily: {
    '2026-11-11': { sessions: 130, pageViews: 600, propertyViews: 300, contacts: { whatsapp: 12, phone: 3 }, sources: { google: 60, facebook: 40 }, hours: { 21: 40, 10: 5 }, searchAreas: { sohag_east: 6, all: 50 } },
    ...Object.fromEntries(['04', '05', '06', '07', '08', '09', '10'].map((d) => [`2026-11-${d}`, { sessions: 100, propertyViews: 200, contacts: { whatsapp: 8 }, searchAreas: { sohag_east: 3 } }]))
  },
  propertyStats: [
    { id: 'p1', days: { '2026-11-11': 40, '2026-11-10': 10 } },
    { id: 'p2', days: { '2026-11-11': 25, '2026-11-09': 20 } }
  ],
  intents: [{ channel: 'whatsapp', propertyId: 'p1', createdAt: yest(1) }],
  errorsYesterday: 2,
  notifyStatus: { lastOkAt: NOW - H, lastFailAt: 0 },
  areaNames: { new_sohag: 'سوهاج الجديدة', sohag_east: 'سوهاج شرق', kawthar: 'الكوثر' }
});

test('the report counts yesterday, compares with the week and lists what needs doing', () => {
  const r = buildDailyReport(data(), { now: NOW, siteUrl: 'https://s' });
  assert.equal(r.day, '2026-11-11');
  assert.equal(r.numbers.leads, 3);
  assert.equal(r.numbers.sessions, 130);
  assert.match(r.text, /زيارات: 130 \(↑30%\)/);
  assert.match(r.text, /طلبات جديدة: 3/);
  assert.match(r.text, /سوهاج الجديدة \(2\)/);
  assert.match(r.text, /طلب مستني أول رد/);
  assert.match(r.text, /متابعة فات معادها/);
  assert.match(r.text, /أكتر ساعة زيارات: 21:00/);
  assert.match(r.text, /جايين منين: جوجل 60، فيسبوك 40/);
  assert.match(r.text, /اتقفلت: 1 · اتخسرت: 2/);
  assert.match(r.text, /السعر \/ الميزانية مش مناسبة \(2\)/);
  assert.match(r.text, /1\. شقة 150م بسوهاج الجديدة — 40 مشاهدة، 2 تواصل/);
  assert.match(r.text, /2 معروض · 1 جديد في اليوم ده/);
  assert.match(r.text, /كمان: طلبات مشترين 1 · بدل 1/);
  assert.match(r.text, /https:\/\/s\/crm/);
  // never a customer's name or phone
  assert.ok(!/زينب|مرتضى|01011112222/.test(r.text));
});

test('suggested decisions come from the numbers: supply gap, cold listing, price losses', () => {
  const d = data();
  d.propertyStats.push({ id: 'p4', days: { '2026-11-11': 10, '2026-11-08': 30 } });
  d.properties.push({ id: 'p4', title_ar: 'دوبلكس', areaKey: 'kawthar', status: 'published' });
  const r = buildDailyReport(d, { now: NOW });
  assert.match(r.text, /💡 قرارات مقترحة/);
  assert.match(r.text, /رد على الـ2 طلب المستنيين/);
  assert.match(r.text, /طلب على سوهاج شرق ومفيش ولا عقار معروض هناك/);
  assert.match(r.text, /أكتر سبب خسارة هو السعر/);
});

test('a quiet day still reads well', () => {
  const r = buildDailyReport({ leads: [], properties: [], daily: {} }, { now: NOW });
  assert.match(r.text, /طلبات جديدة: 0/);
  assert.match(r.text, /✅ مفيش طلبات متأخرة/);
  assert.ok(!/NaN|undefined/.test(r.text));
});

test('helpers: trend, merging shards, splitting long messages', () => {
  assert.equal(trend(130, 100), '(↑30%)');
  assert.equal(trend(70, 100), '(↓30%)');
  assert.equal(trend(102, 100), '(زي المعتاد)');
  assert.equal(trend(5, 0), '');
  assert.equal(trend(3, 0.57), '(متوسط الأسبوع 0.6 في اليوم)');
  assert.deepEqual(mergeDaily([{ sessions: 2, contacts: { whatsapp: 1 } }, { sessions: 3, contacts: { whatsapp: 2, phone: 1 }, date: 'x' }]), { sessions: 5, contacts: { whatsapp: 3, phone: 1 } });
  const parts = splitMessage(Array.from({ length: 60 }, (_, i) => `سطر رقم ${i} ${'x'.repeat(30)}`).join('\n'), 1000);
  assert.ok(parts.length > 1);
  assert.ok(parts.every((p) => p.length <= 1000));
  assert.match(parts[0], /^\(1\/\d\)/);
  assert.deepEqual(splitMessage('قصير'), ['قصير']);
});

test('one report a day: the cron claims the day, a second run is skipped, a failed send gives it back', async () => {
  const claimed = new Set();
  const sent = [];
  const deps = {
    now: () => NOW,
    load: async () => data(),
    claimDay: async (day) => (claimed.has(day) ? false : (claimed.add(day), true)),
    releaseDay: async (day) => claimed.delete(day),
    sendAll: async (t) => { sent.push(t); return 1; }
  };
  assert.equal((await runDailyReport(deps)).status, 200);
  assert.deepEqual((await runDailyReport(deps)).body, { skipped: 'already-sent', day: '2026-11-11' });
  assert.ok(sent.length >= 1);
  // a test send ignores the claim and says it is a test
  sent.length = 0;
  await runDailyReport(deps, { mode: 'test' });
  assert.match(sent[0], /نسخة تجربة/);
  // preview sends nothing
  sent.length = 0;
  const p = await runDailyReport(deps, { mode: 'preview' });
  assert.match(p.body.text, /تقرير 1Line اليومي/);
  assert.equal(sent.length, 0);
  // failure releases the day
  claimed.clear();
  const failing = { ...deps, sendAll: async () => 0 };
  assert.equal((await runDailyReport(failing)).status, 502);
  assert.equal(claimed.has('2026-11-11'), false);
});
