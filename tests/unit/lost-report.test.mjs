import test from 'node:test';
import assert from 'node:assert/strict';
import { lostReport, lostIn, stageBeforeLoss } from '../../src/utils/lostReport.js';

const NOW = Date.parse('2026-11-14T10:00:00Z');
const DAY = 86_400_000;
const iso = (d) => new Date(NOW - d * DAY).toISOString();
const week = { from: '2026-11-08', to: '2026-11-14', days: 7 };
const before = { from: '2026-11-01', to: '2026-11-07', days: 7 };
let n = 0;
const lost = (o) => ({ id: `l${n += 1}`, status: 'lost', createdAt: iso(30), source: 'ads', ...o });

test('the stage before the loss comes from the history, else from whether anyone replied', () => {
  assert.equal(stageBeforeLoss(lost({ stageHistory: [{ s: 'new', at: iso(10) }, { s: 'site_visit', at: iso(5) }, { s: 'lost', at: iso(2) }] })), 'site_visit');
  assert.equal(stageBeforeLoss(lost({ firstContactedAt: iso(9) })), 'contacted');
  assert.equal(stageBeforeLoss(lost({})), 'new');
});

test('lostIn counts a client on the day he was lost, only while he is still lost', () => {
  const a = lost({ stageHistory: [{ s: 'new', at: iso(20) }, { s: 'lost', at: iso(2) }] });
  const b = lost({ lostAt: iso(10) });
  const reopened = lost({ status: 'contacted', stageHistory: [{ s: 'lost', at: iso(2) }] });
  assert.deepEqual(lostIn([a, b, reopened], week).map((l) => l.id), [a.id]);
});

test('the report: reasons, stages, sellers, sources, value, the close ones and the biggest losses', () => {
  const leads = [
    lost({ lostReason: 'price', ownerUid: 'a', ownerName: 'Ali', dealValue: 2e6, commissionPct: 2, stageHistory: [{ s: 'new', at: iso(20) }, { s: 'negotiating', at: iso(6) }, { s: 'lost', at: iso(2) }] }),
    lost({ lostReason: 'price', ownerUid: 'a', ownerName: 'Ali', stageHistory: [{ s: 'new', at: iso(20) }, { s: 'lost', at: iso(3) }] }),
    lost({ lostReason: 'no_response', ownerUid: 'b', ownerName: 'Mona', source: 'manual', lostAt: iso(1) }),
    lost({ lostReason: 'price', lostAt: iso(10) }), // the week before
    lost({ lostAt: iso(30) })
  ];
  const r = lostReport(leads, { range: week, prevRange: before });
  assert.deepEqual([r.total, r.prevTotal, r.change], [3, 1, 200]);
  assert.equal(r.valueLost, 40000);
  assert.equal(r.close, 1);
  assert.deepEqual(r.reasons.map((x) => [x.id, x.count]), [['price', 2], ['no_response', 1]]);
  assert.equal(r.reasons[0].label, 'السعر / الميزانية مش مناسبة');
  assert.deepEqual(r.stages.map((x) => [x.id, x.count]), [['new', 2], ['negotiating', 1]]);
  assert.deepEqual(r.sellers.map((s) => [s.label, s.count, s.close]), [['Ali', 2, 1], ['Mona', 1, 0]]);
  assert.equal(r.sources.length, 2);
  assert.equal(r.top[0].close, true); // the close one first
  assert.equal(r.top[0].commission, 40000);
});

test('an empty range gives zeros, not NaN', () => {
  const r = lostReport([], { range: week });
  assert.ok(!/NaN|undefined/.test(JSON.stringify(r)));
  assert.equal(r.prevTotal, null);
  assert.equal(r.daysToLose, 0);
});
