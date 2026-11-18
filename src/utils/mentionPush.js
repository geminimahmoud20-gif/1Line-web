// =============================================================
//  Phone notifications for team @mentions (scripts/send-mention-pushes.mjs): which unread mentions still need
//  one, grouped per person into one short message. Pure, so tests/unit/mention-push.test.mjs runs it.
// =============================================================
import { ENTITY_LABEL, noteSnippet } from './teamNotes.js';

export const LOOKBACK_MS = 18 * 3600 * 1000; // a mention older than this is no longer news
const TAB = { lead: 'leads', property: 'properties', project: 'projects', team: 'chat' };

const ms = (iso) => { const t = Date.parse(iso || ''); return Number.isNaN(t) ? 0 : t; };

/**
 * [{ toUid, ids, title, body, url, leadId, tag }]: one message per person for the mentions not yet read nor pushed.
 * @param {{id: string, toUid: string, fromName?: string, entityType: string, entityId: string, entityName?: string, snippet?: string, createdAt: string, readAt?: string, pushedAt?: string}[]} mentions
 */
export function pushPlan(mentions = [], { now = Date.now(), lookbackMs = LOOKBACK_MS } = {}) {
  const by = new Map();
  for (const m of mentions) {
    if (!m?.toUid || m.readAt || m.pushedAt) continue;
    const at = ms(m.createdAt);
    if (!at || now - at > lookbackMs) continue;
    if (!by.has(m.toUid)) by.set(m.toUid, []);
    by.get(m.toUid).push({ ...m, at });
  }
  const out = [];
  for (const [toUid, list] of by) {
    list.sort((a, b) => b.at - a.at);
    const latest = list[0];
    const where = (ENTITY_LABEL[latest.entityType] || {}).ar || '';
    const place = latest.entityType === 'team' ? where : `${where}${latest.entityName ? ` «${latest.entityName}»` : ''}`;
    const senders = [...new Set(list.map((m) => m.fromName).filter(Boolean))];
    const one = list.length === 1;
    out.push({
      toUid,
      ids: list.map((m) => m.id),
      title: one ? `${latest.fromName || 'زميل'} ذكرك في ${place}` : `${list.length} رسايل من الفريق ليك`,
      body: one ? noteSnippet(latest.snippet, 110) : `${senders.slice(0, 3).join('، ')}: ${noteSnippet(latest.snippet, 80)}`,
      url: `/crm?tab=${TAB[latest.entityType] || 'chat'}`,
      leadId: latest.entityType === 'lead' ? latest.entityId : '',
      tag: 'oneline-mentions'
    });
  }
  return out;
}
