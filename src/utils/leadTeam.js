// =============================================================
//  Who is on a client: the owner, and every colleague who logged something on the client or has a task on it.
//  Pure (tests/unit/lead-team.test.mjs). A person is known by name: the history keeps names, not account ids.
// =============================================================

const SYSTEM = new Set(['النظام', 'System', 'system']);

/**
 * [{ name, role: 'owner' | 'worked', why: [{ ar, en }] }], the owner first, the rest by name.
 * `tasks`: the shared task list (only this client's are looked at).
 */
export function participantsOf(lead = {}, tasks = []) {
  const people = new Map();
  const add = (name, role, why) => {
    const n = String(name || '').trim();
    if (!n || SYSTEM.has(n)) return;
    const cur = people.get(n) || { name: n, role: 'worked', why: [] };
    if (role === 'owner') cur.role = 'owner';
    if (why && !cur.why.some((w) => w.ar === why.ar)) cur.why.push(why);
    people.set(n, cur);
  };
  add(lead.ownerName || lead.claimedBy, 'owner', null);
  const logs = Array.isArray(lead.activityLogs) ? lead.activityLogs : [];
  for (const e of logs) add(e?.agent, 'worked', { ar: 'سجّل على العميل', en: 'Logged on the client' });
  for (const o of Array.isArray(lead.outcomes) ? lead.outcomes : []) add(o?.n, 'worked', { ar: 'سجّل نتيجة', en: 'Logged an outcome' });
  for (const t of tasks) {
    if (String(t?.leadId) !== String(lead.id)) continue;
    add(t.assigneeName, 'worked', { ar: 'عنده مهمة', en: 'Has a task' });
    add(t.createdByName, 'worked', { ar: 'كلّف بمهمة', en: 'Gave a task' });
  }
  return [...people.values()].sort((a, b) => (a.role === 'owner' ? -1 : 0) - (b.role === 'owner' ? -1 : 0) || a.name.localeCompare(b.name, 'ar'));
}
