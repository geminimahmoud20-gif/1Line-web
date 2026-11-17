import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkStageChange, outcomeEntry, outcomePatchFor, attemptsOf, lastOutcomeLabel, stageEnteredMs, STAGE_RULES, OUTCOMES } from '../../src/utils/stageGate.js';

const T0 = Date.parse('2026-11-17T10:00:00Z');
const at = (min) => new Date(T0 + min * 60000).toISOString();
const lead = (o = {}) => ({ id: 'l1', status: 'new', createdAt: at(0), ...o });
const log = (l, id, min, extra = {}) => ({ ...l, ...outcomePatchFor(l, outcomeEntry(id, { uid: 'u' }, extra, T0 + min * 60000)) });

test('a stage cannot change without a logged outcome', () => {
  const r = checkStageChange(lead(), { status: 'contacted' });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'outcome');
  assert.match(r.message, /تم التواصل/);
  assert.equal(checkStageChange(log(lead(), 'reached', 5), { status: 'contacted' }).ok, true);
});

test('the outcome can come in the same save', () => {
  const l = lead();
  const patch = { status: 'contacted', ...outcomePatchFor(l, outcomeEntry('reached', {}, {}, T0 + 60000)) };
  assert.equal(checkStageChange(l, patch).ok, true);
});

test('«لم يرد» never moves a client forward', () => {
  assert.equal(checkStageChange(log(lead(), 'no_answer', 5), { status: 'contacted' }).ok, false);
  assert.equal(checkStageChange(log(lead(), 'callback', 5), { status: 'contacted' }).ok, false);
});

test('each stage needs its own outcome; an older stage\'s outcome does not count', () => {
  let l = log(lead(), 'reached', 5);
  assert.equal(checkStageChange(l, { status: 'site_visit' }).ok, false);
  l = log(l, 'viewing_set', 6);
  assert.equal(checkStageChange(l, { status: 'site_visit' }).ok, true);
  // entered site_visit at minute 10: the outcomes before that no longer count for negotiating
  const inVisit = { ...l, status: 'site_visit', stageHistory: [{ s: 'new', at: at(0) }, { s: 'site_visit', at: at(10) }] };
  assert.equal(checkStageChange(inVisit, { status: 'negotiating' }).ok, false);
  assert.equal(checkStageChange(log(inVisit, 'viewing_done', 20), { status: 'negotiating' }).ok, true);
  assert.equal(stageEnteredMs(inVisit), T0 + 10 * 60000);
});

test('a negative outcome needs a reason', () => {
  assert.equal(outcomeEntry('not_fit', {}, {}), null);
  assert.equal(outcomeEntry('not_fit', {}, { reason: 'nope' }), null);
  assert.equal(outcomeEntry('not_fit', {}, { reason: 'price' }).reason, 'price');
  assert.equal(outcomeEntry('no_answer', {}, {}).id, 'no_answer');
  assert.equal(outcomeEntry('???', {}, {}), null);
});

test('lost: an outcome and a lost reason; inactive: an outcome', () => {
  assert.equal(checkStageChange(lead(), { status: 'lost', lostReason: 'price' }).code, 'outcome');
  const l = log(lead(), 'not_fit', 5, { reason: 'price' });
  assert.equal(checkStageChange(l, { status: 'lost' }).code, 'reason');
  assert.equal(checkStageChange(l, { status: 'lost', lostReason: 'price' }).ok, true);
  assert.equal(checkStageChange(lead(), { status: 'inactive' }).ok, false);
  assert.equal(checkStageChange(log(lead(), 'no_answer', 5), { status: 'inactive' }).ok, true);
});

test('going back is for managers; so is leaving closed and lost', () => {
  const l = lead({ status: 'negotiating' });
  assert.equal(checkStageChange(l, { status: 'contacted' }).code, 'manager');
  assert.equal(checkStageChange(l, { status: 'contacted' }, { isManager: true }).ok, true);
  assert.equal(checkStageChange(lead({ status: 'closed' }), { status: 'negotiating' }).code, 'manager');
  assert.equal(checkStageChange(lead({ status: 'lost' }), { status: 'new' }).code, 'manager');
  assert.equal(checkStageChange(lead({ status: 'lost' }), { status: 'new' }, { isManager: true }).ok, true);
});

test('an unresponsive client who answers again can come back', () => {
  const l = lead({ status: 'inactive', stageHistory: [{ s: 'new', at: at(0) }, { s: 'inactive', at: at(10) }] });
  assert.equal(checkStageChange(l, { status: 'contacted' }).ok, false);
  assert.equal(checkStageChange(log(l, 'reached', 20), { status: 'contacted' }).ok, true);
});

test('Undo and a same-stage save pass', () => {
  assert.equal(checkStageChange(lead({ status: 'negotiating' }), { status: 'new', _undo: true }).ok, true);
  assert.equal(checkStageChange(lead(), { status: 'new', name: 'x' }).ok, true);
  assert.equal(checkStageChange(lead(), { name: 'x' }).ok, true);
});

test('attempts count the «لم يرد» in a row and reset on an answer', () => {
  let l = log(lead(), 'no_answer', 1);
  l = log(l, 'no_answer', 2);
  assert.equal(attemptsOf(l), 2);
  assert.equal(lastOutcomeLabel(l), 'لم يرد · محاولة 2');
  l = log(l, 'reached', 3);
  assert.equal(attemptsOf(l), 0);
  assert.equal(lastOutcomeLabel(l), 'تم التواصل');
  assert.equal(lastOutcomeLabel(lead()), '');
});

test('the call prompt\'s answers count as outcomes', () => {
  const l = lead({ callOutcomes: [{ o: 'answered', at: at(5) }] });
  assert.equal(checkStageChange(l, { status: 'contacted' }).ok, true);
  assert.equal(lastOutcomeLabel({ callOutcomes: [{ o: 'no_answer', at: at(5) }] }), 'لم يرد · محاولة 1');
});

test('the history line says what happened', () => {
  const l = log(log(lead(), 'no_answer', 1), 'not_fit', 2, { reason: 'price', note: 'غالي' });
  assert.match(l.activityLogs[0].action, /غير مناسب/);
  assert.match(l.activityLogs[0].action, /السعر/);
  assert.match(l.activityLogs[1].action, /محاولة 1/);
});

test('the table covers every outcome and stage the pipeline uses', () => {
  assert.deepEqual(STAGE_RULES.map((s) => s.id), ['new', 'contacted', 'site_visit', 'negotiating', 'closing', 'closed', 'inactive', 'lost']);
  const ids = new Set(OUTCOMES.map((o) => o.id));
  for (const s of STAGE_RULES) for (const o of [...s.outcomes, ...(Array.isArray(s.entry) ? s.entry : [])]) assert.ok(ids.has(o), `${s.id}: ${o}`);
  for (const must of ['no_answer', 'reached', 'closed_reason']) assert.ok(ids.has(must));
});

test('a call answer saved both ways is counted once', async () => {
  const { outcomePatch, callEntry } = await import('../../src/utils/callOutcomes.js');
  let l = lead();
  for (const m of [1, 2]) l = { ...l, ...outcomePatch(l, callEntry('no_answer', { uid: 'u' }, T0 + m * 60000)) };
  assert.equal(attemptsOf(l), 2);
  assert.equal(l.outcomeAttempts, 2);
  const a = { ...l, ...outcomePatch(l, callEntry('answered', { uid: 'u' }, T0 + 5 * 60000)) };
  assert.equal(a.status, 'contacted');
  assert.equal(attemptsOf(a), 0);
});
