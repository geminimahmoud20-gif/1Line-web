import test from 'node:test';
import assert from 'node:assert/strict';
import { monthWindow, cleanTargets, normalizeGoals, monthActuals, paceOf, goalProgress, myGoalRows } from '../../src/utils/goals.js';

const NOW = Date.parse('2026-11-14T10:00:00Z'); // day 14 of 30
const DAY = 86_400_000;
const iso = (d) => new Date(NOW - d * DAY).toISOString();

test('the month window runs from the 1st to today in Cairo', () => {
  assert.deepEqual(monthWindow(NOW), { from: '2026-11-01', to: '2026-11-14', day: 14, days: 30 });
  assert.equal(monthWindow(Date.parse('2026-02-10T10:00:00Z')).days, 28);
});

test('targets keep known keys as positive whole numbers and drop the rest', () => {
  assert.deepEqual(cleanTargets({ closed: '8', commission: '400,000', leads: 0, viewings: -3, junk: 5 }), { closed: 8, commission: 400000 });
  assert.deepEqual(normalizeGoals({ team: { closed: 2 }, people: { a: { closed: 1 }, b: {}, c: { x: 1 } } }), { team: { closed: 2 }, people: { a: { closed: 1 } } });
  assert.deepEqual(normalizeGoals(null), { team: {}, people: {} });
});

const lead = (o) => ({ id: Math.random().toString(36), status: 'new', createdAt: iso(3), ...o });

test('month actuals count each thing on its own day, for the team and per owner', () => {
  const leads = [
    lead({ ownerUid: 'a', ownerName: 'Ali', status: 'closed', dealValue: 1e6, commissionPct: 2, stageHistory: [{ s: 'site_visit', at: iso(2) }, { s: 'closed', at: iso(1) }] }),
    lead({ ownerUid: 'a', ownerName: 'Ali' }),
    lead({ ownerUid: 'b', ownerName: 'Mona', createdAt: iso(20) }), // October
    lead({ isArchived: true })
  ];
  const a = monthActuals(leads, NOW);
  assert.deepEqual(a.team, { leads: 2, viewings: 1, closed: 1, commission: 20000 });
  assert.deepEqual(a.people.a, { name: 'Ali', leads: 2, viewings: 1, closed: 1, commission: 20000 });
  assert.equal(a.people.b.leads, 0);
});

test('pace: done, ahead, on pace or behind against the share of the month gone', () => {
  const win = monthWindow(NOW); // 47% of the month
  assert.equal(paceOf(5, 10, win).status, 'on');       // 50%
  assert.equal(paceOf(7, 10, win).status, 'ahead');    // 70%
  assert.equal(paceOf(2, 10, win).status, 'behind');   // 20%
  assert.equal(paceOf(10, 10, win).status, 'done');
  assert.equal(paceOf(3, 0, win), null);
  assert.equal(paceOf(7, 10, win).projected, 15);      // 7 in 14 days → 15 by the 30th
});

test('goalProgress lists only goals that are set, and a person sees their own rows', () => {
  const leads = [lead({ ownerUid: 'a', ownerName: 'Ali', status: 'closed', stageHistory: [{ s: 'closed', at: iso(1) }], dealValue: 1e6 })];
  const goals = { team: { closed: 4 }, people: { a: { closed: 2, leads: 5 } } };
  const p = goalProgress(leads, goals, NOW);
  assert.deepEqual(p.team.map((r) => [r.key, r.actual, r.target]), [['closed', 1, 4]]);
  assert.deepEqual(p.people[0].rows.map((r) => r.key), ['leads', 'closed']);
  assert.equal(myGoalRows(leads, goals, 'a', NOW).length, 2);
  assert.deepEqual(myGoalRows(leads, goals, 'nobody', NOW), []);
});
