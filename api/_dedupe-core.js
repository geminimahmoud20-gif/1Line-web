// =============================================================
//  The duplicate sweep: a client who filled a second form and was not merged at the time (a failed call, the
//  quota outage, a client signed in to their account) is merged afterwards. Only an untouched, recent request
//  is considered (nobody called, nobody owns it by hand), and the same rules as the live merge decide where it goes
//  (api/_merge-core.js). Pure: the route reads and writes Firestore and passes the functions in.
//  tests/unit/dedupe-sweep.test.mjs
// =============================================================
const DAY = 24 * 60 * 60 * 1000;
export const SWEEP_DAYS = 3;
export const MAX_SWEEP_DAYS = 14;
export const MAX_PER_RUN = 60;

const ms = (v) => {
  const t = Date.parse(v || '');
  return Number.isFinite(t) ? t : 0;
};
const createdMs = (d) => ms(d?.createdAt || d?.timestamp);

/** Requests worth trying to merge: new, untouched, not already archived/merged, created in the window; oldest first */
export function sweepCandidates(rows = [], { now = Date.now(), days = SWEEP_DAYS } = {}) {
  const from = now - Math.min(Math.max(1, days), MAX_SWEEP_DAYS) * DAY;
  return rows
    .filter(({ data }) => data && !data.isArchived && !data.mergedInto
      && (!data.status || data.status === 'new') && !data.firstContactedAt
      && createdMs(data) >= from && createdMs(data) <= now)
    .sort((a, b) => createdMs(a.data) - createdMs(b.data))
    .slice(0, MAX_PER_RUN);
}

/**
 * deps: { list() → [{ id, data, doc }], withContact({ id, data }) → lead with phone, mergeOne({ id, lead, doc }) → the open lead's id or null }
 * Returns { checked, merged, into: [ids] }. One failing record never stops the rest.
 */
export async function runSweep(deps, { now = Date.now(), days = SWEEP_DAYS } = {}) {
  const rows = sweepCandidates(await deps.list(), { now, days });
  let merged = 0;
  const into = [];
  for (const row of rows) {
    try {
      const lead = await deps.withContact({ id: row.id, data: row.data });
      const target = await deps.mergeOne({ id: row.id, lead, doc: row.doc });
      if (target) { merged += 1; into.push(target); }
    } catch (e) {
      console.error('dedupe sweep: one record skipped:', e?.message || e);
    }
  }
  return { checked: rows.length, merged, into };
}
