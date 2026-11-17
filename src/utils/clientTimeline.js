// =============================================================
//  One timeline for a client: everything that happened, newest first. The activity log is the source (every entry has a
//  real time: outcomes, notes, tasks done, forms, assignments); the older free-text lines saved in the notes follow it
//  as «قديم». The client's own words (the notes without those lines) are returned apart, for the request card.
//  Pure: tests/unit/client-timeline.test.mjs
// =============================================================
import { toMs } from './crmLeadViews.js';
import { splitNotes } from './inboxView.js';

const KIND_BY_PREFIX = [
  [/^نتيجة النشاط/, 'outcome'],
  [/^طلب (جديد|سابق)/, 'request'],
  [/^(أنجز مهمة|Task done)/, 'task'],
  [/^(تعيين|توزيع)/, 'owner'],
  [/^تغيير المرحلة/, 'stage']
];

const kindOf = (e) => e.kind || KIND_BY_PREFIX.find(([re]) => re.test(String(e.action || '')))?.[1] || 'note';

/** One older note line: "[stamp]: text", with the emoji and the «undefined» a missing form field left cleaned off */
export function parseNoteLine(line) {
  const clean = String(line || '')
    .replace(/^(?:\u{1F4DE}|\u{1F4DD}|\u{1F4CD}|\u{2705}|\u{26A0}\u{FE0F}?|\s)+/u, '')
    .replace(/في\s+(undefined|null)\b/gi, 'في سوهاج')
    .replace(/\b(undefined|null)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!clean) return null;
  const m = clean.match(/^\[([^\]]+)\]:?\s*(.*)$/);
  return m ? { meta: m[1], text: m[2] || m[1] } : { meta: '', text: clean };
}

/** { events: [{ key, at, meta, text, kind, agent, legacy }], words } */
export function buildTimeline(input) {
  const lead = input || {};
  const logs = (Array.isArray(lead.activityLogs) ? lead.activityLogs : [])
    .filter((e) => e && e.action)
    .map((e, i) => ({ key: `a${i}`, at: toMs(e.timestamp) || 0, meta: '', text: String(e.action), kind: kindOf(e), agent: e.agent || '', legacy: false }))
    .sort((a, b) => b.at - a.at);
  // The older lines kept in the notes; the client's words are the rest
  const parsed = String(lead.notes || '').split('\n').map((raw) => ({ raw, line: parseNoteLine(raw) }));
  const lines = parsed.map((p) => p.line).filter((l) => l && l.meta);
  const legacy = lines.map((l, i) => ({ key: `n${i}`, at: 0, meta: l.meta, text: l.text, kind: 'note', agent: '', legacy: true }));
  // A line the activity log already holds (older saves wrote both) is not shown twice
  const have = new Set(logs.map((e) => e.text));
  return {
    events: [...logs, ...legacy.filter((l) => !have.has(l.text))],
    words: splitNotes(parsed.filter((p) => !(p.line && p.line.meta)).map((p) => p.raw).join('\n')).client
  };
}
