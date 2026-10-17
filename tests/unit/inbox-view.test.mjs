import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isInboxStage, pipelineStageLabel, isLeadUnclaimed, isLeadClaimedByMe, isInboxActive, matchesView,
  ageLabel, formatReceived, requestsCount, slaSummary, splitNotes, reassignUpdates, knownOwners
} from '../../src/utils/inboxView.js';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

test('only new / contacted / site_visit are set from the inbox', () => {
  assert.equal(isInboxStage(undefined), true);
  assert.equal(isInboxStage('site_visit'), true);
  assert.equal(isInboxStage('negotiating'), false);
  assert.equal(pipelineStageLabel('negotiating'), 'تفاوض');
});

test('a reassigned request belongs to the new account, not the old one', () => {
  const lead = { ownerUid: 'u2', ownerName: 'Ahmed', claimedBy: 'Ahmed' };
  assert.equal(isLeadClaimedByMe(lead, 'u1', 'Ahmed'), false); // same display name, other account
  assert.equal(isLeadClaimedByMe(lead, 'u2', 'Someone'), true);
  assert.equal(isLeadClaimedByMe({ ownerName: 'Sara' }, 'u1', 'Sara'), true); // older requests without a uid
});

test('finished requests leave the inbox; views pick what is shown', () => {
  assert.equal(isInboxActive({ isArchived: true }), false);
  assert.equal(isInboxActive({ status: 'closed' }), false);
  assert.equal(isInboxActive({ status: 'lost' }), false);
  const fresh = { status: 'new' };
  const mineCalled = { status: 'contacted', ownerUid: 'u1', ownerName: 'A' };
  const mineNew = { status: 'new', ownerUid: 'u1', ownerName: 'A' };
  const otherCalled = { status: 'negotiating', ownerUid: 'u2', ownerName: 'B' };
  assert.equal(isLeadUnclaimed(fresh), true);
  assert.deepEqual([fresh, mineCalled, mineNew, otherCalled].map((l) => matchesView(l, 'todo', 'u1', 'A')), [true, false, true, false]);
  assert.deepEqual([fresh, mineCalled, mineNew, otherCalled].map((l) => matchesView(l, 'mine', 'u1', 'A')), [false, true, true, false]);
  assert.deepEqual([fresh, mineCalled, mineNew, otherCalled].map((l) => matchesView(l, 'all', 'u1', 'A')), [true, true, true, true]);
});

test('age reads in Egyptian Arabic', () => {
  assert.equal(ageLabel(30 * 1000), 'دلوقتي');
  assert.equal(ageLabel(5 * MIN), 'من 5 دقايق');
  assert.equal(ageLabel(2 * 60 * MIN), 'من ساعتين');
  assert.equal(ageLabel(3 * DAY), 'من 3 أيام');
  assert.equal(ageLabel(23 * DAY), 'من 3 أسابيع');
  assert.equal(ageLabel(65 * DAY), 'من شهرين');
});

test('the date shows the year only when it is not this year', () => {
  const now = new Date(2026, 9, 17, 12).getTime();
  assert.ok(!/2026/.test(formatReceived(new Date(2026, 8, 24).getTime(), now)));
  assert.ok(/2025/.test(formatReceived(new Date(2025, 8, 24).getTime(), now)));
});

test('request counts without tanween', () => {
  assert.equal(requestsCount(26), '26 طلب');
  assert.equal(requestsCount(4), '4 طلبات');
  assert.equal(requestsCount(2), 'طلبين');
});

test('SLA counts open unclaimed requests and reports the oldest', () => {
  const now = 100 * DAY;
  const leads = [
    { id: 1, status: 'new', createdAt: now - 21 * DAY, type: 'seller' },
    { id: 2, status: 'new', createdAt: now - 20 * MIN, type: 'buyer' },
    { id: 3, status: 'new', createdAt: now - 5 * MIN },                          // still within target
    { id: 4, status: 'new', createdAt: now - 2 * DAY, isArchived: true },        // archived test lead
    { id: 5, status: 'new', createdAt: now - 2 * DAY, ownerUid: 'u1', ownerName: 'A' } // taken
  ];
  const s = slaSummary(leads, now, 15, (l) => l.type || 'buyers');
  assert.equal(s.count, 2);
  assert.equal(s.oldestMs, 21 * DAY);
  assert.deepEqual(s.byTab, { seller: 1, buyer: 1 });
});

test('CRM log lines are kept apart from what the client wrote', () => {
  // As LeadQuickDrawer writes it: the log entry on its own line above the older notes
  const { client, log } = splitNotes('[09:19 ص] تم تحديث المرحلة إلى: "تم التواصل"\nعرض بيع أرض بمساحة 280م | طلب إضافي: محل تجاري');
  assert.deepEqual(log, ['[09:19 ص] تم تحديث المرحلة إلى: "تم التواصل"']);
  assert.equal(client, 'عرض بيع أرض بمساحة 280م · طلب إضافي: محل تجاري');
  assert.deepEqual(splitNotes('').log, []);
});

test('reassigning writes the new account and desk, or clears the owner', () => {
  const lead = { assignedTo: 'Sales Team A', ownerUid: 'old', ownerName: 'Old' };
  const u = reassignUpdates(lead, { uid: 'u9', name: 'Mona', desk: 'Sales Team B' }, 'T');
  assert.deepEqual(u, { ownerName: 'Mona', claimedBy: 'Mona', ownerUid: 'u9', assignedTo: 'Sales Team B', claimedAt: 'T', assignedAt: 'T' });
  assert.equal(reassignUpdates(lead, { uid: 'u9', email: 'mona@x.com' }, 'T').assignedTo, 'Sales Team A');
  assert.equal(reassignUpdates(lead, { uid: 'u9', email: 'mona@x.com' }, 'T').ownerName, 'mona');
  const back = reassignUpdates(lead, null, 'T');
  assert.equal(back.ownerUid, null);
  assert.equal(isLeadUnclaimed({ ...lead, ...back }), true);
});

test('known owners are listed once each', () => {
  const list = knownOwners([{ ownerUid: 'a', ownerName: 'Sara' }, { ownerUid: 'a', ownerName: 'Sara' }, { claimedBy: 'Ali' }, {}]);
  assert.deepEqual(list.map((m) => m.name).sort(), ['Ali', 'Sara']);
});
