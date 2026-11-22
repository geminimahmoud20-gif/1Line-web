import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kpiScorecard, colourOf, KPI_TARGETS } from '../../src/utils/kpiScorecard.js';

const NOW = Date.parse('2026-11-22T12:00:00Z');
const ago = (h) => new Date(NOW - h * 3600000).toISOString();

test('colours: higher-is-better and lower-is-better, and no target or no value says nothing', () => {
  assert.equal(colourOf(85, KPI_TARGETS.replyOnTime), 'good');
  assert.equal(colourOf(70, KPI_TARGETS.replyOnTime), 'ok');
  assert.equal(colourOf(30, KPI_TARGETS.replyOnTime), 'bad');
  assert.equal(colourOf(10, KPI_TARGETS.latePct), 'good');
  assert.equal(colourOf(25, KPI_TARGETS.latePct), 'ok');
  assert.equal(colourOf(50, KPI_TARGETS.latePct), 'bad');
  assert.equal(colourOf(0, KPI_TARGETS.unassigned), 'good');
  assert.equal(colourOf(5, KPI_TARGETS.unassigned), 'bad');
  assert.equal(colourOf(1200, KPI_TARGETS.costPerQualified), 'none', 'no target set yet');
  assert.equal(colourOf(null, KPI_TARGETS.winRate), 'none');
});

test('reply on time, conversion and win rate from the recent clients', () => {
  const leads = [
    { id: 1, createdAt: ago(48), firstContactedAt: ago(47.9), status: 'contacted' },                       // 6 min: on time
    { id: 2, createdAt: ago(48), firstContactedAt: ago(40), status: 'site_visit' },                         // 8h: late
    { id: 3, createdAt: ago(5), status: 'new' },                                                            // waiting 5h > 2h: late
    { id: 4, createdAt: ago(0.5), status: 'new' },                                                          // 30 min, not due yet
    { id: 5, createdAt: ago(24 * 60), status: 'closed', updatedAt: ago(24) },                               // old, but decided recently
    { id: 6, createdAt: ago(24 * 60), status: 'lost', updatedAt: ago(24) },
  ];
  const { items } = kpiScorecard(leads, { now: NOW });
  const k = Object.fromEntries(items.map((x) => [x.id, x]));
  assert.equal(k.replyOnTime.value, 33, '1 of 3 judged');
  assert.equal(k.qualifiedPct.value, 50, '2 of the 4 recent');
  assert.equal(k.visitPct.value, 25);
  assert.equal(k.winRate.value, 50);
  assert.equal(k.loadPct.value, null, 'no team list: no load');
  assert.equal(k.costPerQualified.colour, 'none');
  assert.equal(k.unassigned.value, 4, 'the open clients nobody holds');
});
