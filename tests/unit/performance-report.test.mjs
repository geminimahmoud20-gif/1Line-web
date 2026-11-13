import test from 'node:test';
import assert from 'node:assert/strict';
import { weekCompare, funnelReport, sourceReport, taskBoard, enteredAt } from '../../src/utils/performanceReport.js';
import { campaignReport } from '../../src/utils/campaignReport.js';

const NOW = Date.parse('2026-11-13T12:00:00Z');
const DAY = 86_400_000;
const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();
const lead = (o) => ({ id: Math.random().toString(36), status: 'new', createdAt: iso(3), ...o });

test('enteredAt takes the first time a lead reached any of the stages', () => {
  const l = lead({ stageHistory: [{ s: 'site_visit', at: iso(2) }, { s: 'closed', at: iso(1) }] });
  assert.equal(enteredAt(l, ['site_visit', 'closed']), Date.parse(iso(2)));
  assert.equal(enteredAt(lead({}), ['closed']), 0);
});

test('weekCompare sets this week against the one before', () => {
  const leads = [lead({ createdAt: iso(1) }), lead({ createdAt: iso(2) }), lead({ createdAt: iso(9) })];
  const w = weekCompare(leads, [], NOW);
  assert.deepEqual([w.newLeads.cur, w.newLeads.prev, w.newLeads.change], [2, 1, 100]);
  assert.equal(w.closed.change, null);
});

test('weekCompare counts commission only on deals closed in the week, and tasks done', () => {
  const won = lead({ status: 'closed', createdAt: iso(20), dealValue: 1_000_000, commissionPct: 2, stageHistory: [{ s: 'closed', at: iso(2) }] });
  const tasks = [{ status: 'done', doneAt: iso(1) }, { status: 'done', doneAt: iso(10) }, { status: 'open' }];
  const w = weekCompare([won], tasks, NOW);
  assert.equal(w.closed.cur, 1);
  assert.equal(w.commission.cur, 20000);
  assert.deepEqual([w.tasksDone.cur, w.tasksDone.prev], [1, 1]);
});

test('funnelReport counts how many reached each stage and the step between them', () => {
  const leads = [
    lead({ status: 'closed', stageHistory: [{ s: 'contacted', at: iso(2) }, { s: 'site_visit', at: iso(1) }, { s: 'closed', at: iso(0) }] }),
    lead({ status: 'contacted', stageHistory: [{ s: 'contacted', at: iso(2) }] }),
    lead({ status: 'lost', lostReason: 'price' }),
    lead({})
  ];
  const f = funnelReport(leads, { days: 30, now: NOW });
  const by = Object.fromEntries(f.rows.map((r) => [r.id, r]));
  assert.equal(f.total, 4);
  assert.equal(by.new.reached, 4);
  assert.equal(by.contacted.reached, 2);
  assert.equal(by.contacted.ofPrevious, 50);
  assert.equal(by.closed.reached, 1);
  assert.equal(f.lost, 1);
  assert.equal(f.topLostReason.id, 'price');
});

test('sourceReport gives the reply time and the viewing share per source', () => {
  const leads = [
    lead({ source: 'ads', createdAt: iso(2), firstContactedAt: new Date(NOW - 2 * DAY + 600_000).toISOString(), status: 'site_visit' }),
    lead({ source: 'ads', createdAt: iso(2) }),
    lead({ source: 'manual', createdAt: iso(2) })
  ];
  const rows = sourceReport(leads, { days: 30, now: NOW });
  const ads = rows.find((r) => r.leads === 2);
  assert.equal(ads.replied, 1);
  assert.equal(ads.medianReplyMs, 600_000);
  assert.equal(ads.visitPct, 50);
});

test('taskBoard totals done / open / overdue per assignee', () => {
  const t = [
    { assigneeUid: 'a', assigneeName: 'Ali', status: 'done', doneAt: iso(1) },
    { assigneeUid: 'a', status: 'open', dueAt: '2020-01-01' },
    { assigneeUid: 'b', assigneeName: 'Mona', status: 'open', dueAt: '2999-01-01' }
  ];
  const b = taskBoard(t, { days: 30, now: NOW });
  assert.deepEqual(b.find((r) => r.uid === 'a'), { uid: 'a', name: 'Ali', done: 1, open: 1, overdue: 1 });
  assert.equal(b.find((r) => r.uid === 'b').overdue, 0);
});

test('campaign report adds won / expected commission and the return per pound spent', () => {
  const won = lead({ status: 'closed', utmCampaign: 'x', dealValue: 1_000_000, commissionPct: 2, stageHistory: [{ s: 'closed', at: iso(1) }] });
  const open = lead({ status: 'negotiating', utmCampaign: 'x', dealValue: 1_000_000, commissionPct: 2 });
  const [row] = campaignReport([won, open], { spend: { x: 10000 } });
  assert.equal(row.wonCommission, 20000);
  assert.equal(row.expectedCommission, 10000);
  assert.equal(row.returnPerEgp, 2);
});
