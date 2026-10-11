// How the dashboard keeps its every-lead copy fresh without re-reading every lead.
// Accounts that see all leads read only what changed since the newest change they hold
// (server timestamps, so a wrong device clock can't skip anything), plus a full reload
// once an hour to drop deleted leads. Desk-scoped accounts reload in full, less often.

export const STATS_TICK_MS = 5 * 60 * 1000;
export const FULL_RELOAD_MS = 60 * 60 * 1000;
export const SCOPED_RELOAD_MS = 15 * 60 * 1000;
// Changes are read from slightly before the newest one held: writes committed in the same
// moment, or still landing, are read again rather than missed (merging them twice is harmless).
export const CHANGE_OVERLAP_MS = 2 * 60 * 1000;

const tsMs = (v) => {
  if (!v) return 0;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
};

/** Newest server write time among the leads (createdAt / updatedAt). */
export const newestChangeMs = (leads = []) =>
  leads.reduce((max, l) => Math.max(max, tsMs(l?.createdAt), tsMs(l?.updatedAt)), 0);

/** Changed leads replace their older copies; new ones are added. */
export function mergeLeadChanges(base = [], changes = []) {
  if (!changes.length) return base;
  const byId = new Map(base.map((l) => [String(l.id), l]));
  changes.forEach((l) => byId.set(String(l.id), l));
  return [...byId.values()];
}

/** 'full' | 'changes' | 'wait' for this tick. */
export function nextStatsRead({ hasData, scoped, fullAt, now }) {
  if (!hasData) return 'full';
  if (scoped) return now - fullAt >= SCOPED_RELOAD_MS ? 'full' : 'wait';
  return now - fullAt >= FULL_RELOAD_MS ? 'full' : 'changes';
}
