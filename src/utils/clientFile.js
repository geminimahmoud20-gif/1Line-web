// =============================================================
//  Unified client file: every request a person made under the same phone, shown together
//  (a campaign form, a sign-up on the site, a sell request, a broker form ...). Each request stays its
//  own lead — a viewing stays a viewing and a seller stays a seller — this only gathers them, so the
//  team sees one person instead of three strangers. Pure; tests/unit/client-file.test.mjs runs it.
// =============================================================
import { phoneKey, leadSourceKey, LEAD_SOURCES, leadCreatedMs, isOpenLead, isSellerLead } from './crmLeadViews.js';
import { dealStageName } from './dealStages.js';

const KIND_LABELS = {
  account: { ar: 'تسجيل حساب', en: 'Account sign-up' },
  client: { ar: 'تسجيل حساب', en: 'Account sign-up' },
  buyer: { ar: 'طلب شراء', en: 'Buy request' },
  buy: { ar: 'طلب شراء', en: 'Buy request' },
  seller: { ar: 'طلب بيع', en: 'Sell request' },
  sell: { ar: 'طلب بيع', en: 'Sell request' },
  broker: { ar: 'وسيط', en: 'Broker' },
  referral: { ar: 'ترشيح', en: 'Referral' },
  special_request: { ar: 'طلب خاص', en: 'Special request' }
};

/** What this request is, in a word: sign-up, buy, sell, broker ... */
export function requestKind(lead = {}, isAr = true) {
  const key = String(lead.type || '').toLowerCase();
  const l = KIND_LABELS[key] || (isSellerLead(lead) ? KIND_LABELS.seller : null);
  if (l) return isAr ? l.ar : l.en;
  return isAr ? 'طلب' : 'Request';
}

const isAccountLead = (l) => ['account', 'client'].includes(String(l?.type || '').toLowerCase())
  || /client_account|حساب|تسجيل/i.test(String(l?.source || ''));

const phoneKeysOf = (l) => [phoneKey(l?.phone), phoneKey(l?.whatsapp)].filter(Boolean);

const ownerOf = (l) => {
  const v = String(l.ownerName || l.claimedBy || l.assignedTo || '');
  return /^unassigned$/i.test(v) ? '' : v;
};

/** The other requests under the same phone as `lead`, newest first (archived ones are marked, not hidden) */
export function otherRequests(lead, allLeads = [], isAr = true) {
  if (!lead) return [];
  const mine = new Set(phoneKeysOf(lead));
  if (!mine.size) return [];
  const src = (l) => { const s = LEAD_SOURCES.find((x) => x.id === leadSourceKey(l)); return s ? (isAr ? s.ar : s.en) : ''; };
  return allLeads
    .filter((l) => l && l.id !== lead.id && phoneKeysOf(l).some((k) => mine.has(k)))
    .sort((a, b) => leadCreatedMs(b) - leadCreatedMs(a))
    .map((l) => ({
      id: l.id,
      kind: requestKind(l, isAr),
      source: src(l),
      stage: dealStageName(l.status, isAr),
      status: l.status || 'new',
      open: isOpenLead(l),
      archived: Boolean(l.isArchived),
      isAccount: isAccountLead(l),
      owner: ownerOf(l),
      createdMs: leadCreatedMs(l)
    }));
}

/** One line of the person's file: how many requests, how many still open, whether they have an account */
export function clientFileSummary(lead, allLeads = [], isAr = true) {
  const others = otherRequests(lead, allLeads, isAr);
  const all = [lead, ...others.map((o) => ({ ...o }))];
  return {
    others,
    total: others.length + 1,
    open: (isOpenLead(lead) ? 1 : 0) + others.filter((o) => o.open).length,
    hasAccount: isAccountLead(lead) || others.some((o) => o.isAccount),
    kinds: [...new Set(all.map((x) => x.kind || requestKind(x, isAr)))]
  };
}
