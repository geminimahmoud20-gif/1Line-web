import test from 'node:test';
import assert from 'node:assert/strict';
import { sellerReport } from '../../src/utils/sellerReport.js';

const NOW = Date.parse('2026-11-13T12:00:00Z');
const MIN = 60000;
const at = (minAgo) => new Date(NOW - minAgo * MIN).toISOString();
const lead = (o) => ({ status: 'new', createdAt: at(600), ...o });

test('groups by the person the lead is with, and shows the unassigned ones too', () => {
  const rows = sellerReport([
    lead({ ownerUid: 'u1', ownerName: 'أحمد' }), lead({ ownerUid: 'u1', ownerName: 'أحمد' }),
    lead({ ownerUid: 'u2', ownerName: 'منى' }), lead({})
  ], { now: NOW, deskLabel: (v) => (v === 'Unassigned' ? 'غير مسند' : v) });
  assert.equal(rows.length, 3);
  assert.equal(rows.find((r) => r.label === 'أحمد').leads, 2);
  assert.equal(rows.find((r) => r.value === 'Unassigned').label, 'غير مسند');
});

test('reply speed: average minutes and the share answered within the target (15 min for ad clients)', () => {
  const ad = { marketingAttribution: { source: 'facebook', campaign: 'buyers' } };
  const rows = sellerReport([
    lead({ ...ad, ownerUid: 'u1', ownerName: 'أحمد', status: 'contacted', createdAt: at(300), firstContactedAt: at(295) }),
    lead({ ...ad, ownerUid: 'u1', ownerName: 'أحمد', status: 'contacted', createdAt: at(300), firstContactedAt: at(260) }),
    lead({ ownerUid: 'u1', ownerName: 'أحمد', status: 'contacted', createdAt: at(300), firstContactedAt: at(260) })
  ], { now: NOW });
  const r = rows[0];
  assert.equal(r.replied, 3);
  assert.equal(r.inTime, 2); // the ad client answered in 40 minutes is late; the other (2 h target) is in time
  assert.equal(r.avgReplyMin, 28);
  assert.equal(r.inTimeRate, 67);
});

test('waiting and late counts, visits including those later lost, closings, overdue follow-ups', () => {
  const rows = sellerReport([
    lead({ ownerUid: 'u1', ownerName: 'أحمد', createdAt: at(30), marketingAttribution: { source: 'facebook', campaign: 'c' } }),
    lead({ ownerUid: 'u1', ownerName: 'أحمد', status: 'lost', stageHistory: [{ s: 'new', at: at(600) }, { s: 'site_visit', at: at(300) }, { s: 'lost', at: at(100) }] }),
    lead({ ownerUid: 'u1', ownerName: 'أحمد', status: 'closed', closedAt: at(10) }),
    lead({ ownerUid: 'u1', ownerName: 'أحمد', status: 'negotiating', nextFollowUpAt: '2026-11-01T09:00:00Z' })
  ], { now: NOW });
  const r = rows[0];
  assert.equal(r.waiting, 1);
  assert.equal(r.late, 1);
  assert.equal(r.visits, 3);
  assert.equal(r.closed, 1);
  assert.equal(r.lost, 1);
  assert.equal(r.overdue, 1);
});

test('the period drops older leads', () => {
  const rows = sellerReport([lead({ ownerUid: 'u1', ownerName: 'أحمد', createdAt: at(60 * 24 * 20) }), lead({ ownerUid: 'u1', ownerName: 'أحمد', createdAt: at(60) })], { now: NOW, days: 7 });
  assert.equal(rows[0].leads, 1);
});
