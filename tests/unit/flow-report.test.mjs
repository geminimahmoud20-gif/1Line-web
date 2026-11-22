import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flowReport, stageEnteredMs, STAGE_LIMIT_HOURS } from '../../src/utils/flowReport.js';

const NOW = Date.parse('2026-11-22T12:00:00Z');
const ago = (h) => new Date(NOW - h * 3600000).toISOString();

test('a client enters his stage when the last matching history entry says so; a new one when he arrived', () => {
  assert.equal(stageEnteredMs({ status: 'contacted', stageHistory: [{ s: 'new', at: ago(100) }, { s: 'contacted', at: ago(10) }] }), NOW - 10 * 3600000);
  assert.equal(stageEnteredMs({ status: 'new', createdAt: ago(5) }), NOW - 5 * 3600000);
  assert.equal(stageEnteredMs({ status: 'negotiating' }), 0, 'moved before history was kept: unknown');
});

test('late, unknown, bottleneck and per-person load', () => {
  const leads = [
    { id: 'a', status: 'new', createdAt: ago(30), ownerName: 'Ali', lastActivityAt: ago(1) },              // late (24h)
    { id: 'b', status: 'new', createdAt: ago(2), ownerName: 'Ali', lastActivityAt: ago(60) },              // on time, idle
    { id: 'c', status: 'contacted', stageHistory: [{ s: 'contacted', at: ago(100) }], ownerName: 'Mona', lastActivityAt: ago(1) }, // late (72h)
    { id: 'd', status: 'contacted', stageHistory: [{ s: 'contacted', at: ago(80) }], ownerName: 'Mona', type: 'seller', lastActivityAt: ago(1) }, // late
    { id: 'e', status: 'negotiating', ownerName: 'Mona', lastActivityAt: ago(1) },                         // unknown since
    { id: 'f', status: 'closed', createdAt: ago(500) },                                                    // not open
    { id: 'g', status: 'lost', createdAt: ago(500) },
    { id: 'h', status: 'new', createdAt: ago(500), isArchived: true },
  ];
  const r = flowReport(leads, { now: NOW });
  assert.equal(r.totals.open, 5);
  assert.equal(r.totals.late, 3);
  const st = Object.fromEntries(r.stages.map((s) => [s.id, s]));
  assert.equal(st.new.count, 2); assert.equal(st.new.late, 1);
  assert.equal(st.contacted.late, 2); assert.equal(st.contacted.sellers, 1); assert.equal(st.contacted.buyers, 1);
  assert.equal(st.negotiating.unknown, 1); assert.equal(st.negotiating.late, 0);
  assert.equal(r.bottleneck.id, 'contacted');
  assert.equal(r.owners[0].label, 'Mona'); assert.equal(r.owners[0].late, 2); assert.equal(r.owners[0].worstStage, 'contacted');
  const ali = r.owners.find((o) => o.label === 'Ali');
  assert.equal(ali.idle, 1);
  assert.equal(r.stuck[0].lead.id, 'c', 'the longest over its limit first');
  assert.equal(r.stuck[0].overDays, Math.round(((100 - STAGE_LIMIT_HOURS.contacted) / 24) * 10) / 10);
});

test('nothing late means no bottleneck', () => {
  const r = flowReport([{ id: 'x', status: 'new', createdAt: ago(1) }], { now: NOW });
  assert.equal(r.bottleneck, null);
  assert.equal(r.totals.latePct, 0);
});
