// =============================================================
//  Pure helpers behind the CRM leads views (CrmAdminPanel): dashboard counters and the
//  filter for the leads table. Kept free of React so tests/unit/crm-lead-views.test.mjs can
//  run them directly.
// =============================================================

/** Dashboard counters for the given leads */
export function computeCrmAnalytics(leads = []) {
  const todayStr = new Date().toDateString();
  let todayCount = 0;
  let buyersCount = 0;
  let sellersCount = 0;
  let brokersCount = 0;
  let requestsCount = 0;
  let closedCount = 0;

  for (const l of leads) {
    if (l.timestamp && new Date(l.timestamp).toDateString() === todayStr) todayCount++;
    if (l.type === 'buyer') buyersCount++;
    else if (l.type === 'seller') sellersCount++;
    else if (l.type === 'broker') brokersCount++;
    else if (l.type === 'request') requestsCount++;
    if (l.status === 'closed') closedCount++;
  }

  return {
    todayCount,
    buyersCount,
    sellersCount,
    brokersCount,
    requestsCount,
    closedCount,
    conversionSuccess: leads.length > 0 ? Math.round((closedCount / leads.length) * 100) + '%' : '0%'
  };
}

// ── Shared lead helpers ──────────────────────────────────────────────────────

/** ms since epoch from an ISO string, a number, a Date or a Firestore Timestamp; 0 when unknown */
export function toMs(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const t = Date.parse(v); return Number.isNaN(t) ? 0 : t; }
  if (v instanceof Date) return v.getTime();
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return 0;
}

export const leadCreatedMs = (l) => toMs(l?.createdAt) || toMs(l?.timestamp);

/** Same rules as securityShield.normalizePhoneNumber, kept here so this file stays dependency-free */
export function phoneKey(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let d = phone
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06F0))
    .replace(/[^0-9]/g, '');
  if (d.startsWith('0020') && d.length === 14) d = '0' + d.slice(4);
  else if (d.startsWith('20') && d.length === 12) d = '0' + d.slice(2);
  return d.length >= 8 ? d : '';
}

/** Why a deal was lost. Required when a lead moves to 'lost' so the reasons can be counted. */
export const LOST_REASONS = [
  { id: 'price', ar: 'السعر / الميزانية مش مناسبة', en: 'Price / budget mismatch' },
  { id: 'bought_elsewhere', ar: 'اشترى أو أجّر من مكان تاني', en: 'Bought elsewhere' },
  { id: 'financing', ar: 'مشكلة تمويل أو سيولة', en: 'Financing issue' },
  { id: 'no_response', ar: 'مش بيرد', en: 'No response' },
  { id: 'changed_mind', ar: 'أجّل أو غيّر رأيه', en: 'Postponed / changed mind' },
  { id: 'no_match', ar: 'مفيش عقار مناسب عندنا', en: 'No matching property' },
  { id: 'not_serious', ar: 'غير جاد / بيانات غلط', en: 'Not serious / bad data' },
  { id: 'other', ar: 'سبب آخر', en: 'Other' }
];

/** Where a lead came from, in a few buckets the team can filter and count by */
export const LEAD_SOURCES = [
  { id: 'website', ar: 'الموقع', en: 'Website' },
  { id: 'whatsapp', ar: 'واتساب', en: 'WhatsApp' },
  { id: 'ads', ar: 'إعلانات', en: 'Ads' },
  { id: 'broker', ar: 'وسيط', en: 'Broker' },
  { id: 'referral', ar: 'ترشيح', en: 'Referral' },
  { id: 'import', ar: 'استيراد ملف', en: 'File import' },
  { id: 'manual', ar: 'إدخال يدوي', en: 'Manual entry' },
  { id: 'other', ar: 'أخرى', en: 'Other' }
];

export function leadSourceKey(l = {}) {
  const raw = `${l.source || ''} ${l.utmSource && l.utmSource !== 'مباشر' ? l.utmSource : ''}`.toLowerCase();
  if (/import|استيراد|ملف|excel|csv|sheet/.test(raw)) return 'import';
  if (/وسيط|وسطاء|broker|شريك|partner/.test(raw)) return 'broker';
  if (/ترشيح|referral|refer/.test(raw)) return 'referral';
  if (/\b(facebook|fb|instagram|ig|google|tiktok|ads?|cpc|meta)\b|إعلان|اعلان|campaign/.test(raw)) return 'ads';
  if (/whats|واتس/.test(raw)) return 'whatsapp';
  if (/direct entry|manual|يدوي|crm|admin|مكالمة|هاتف|walk/.test(raw)) return 'manual';
  if (!raw.trim() || /web|site|موقع|form|نموذج|online|بوابة|portal/.test(raw)) return 'website';
  return 'other';
}

// ── Money, dates and attention flags (dashboard + filters) ───────────────────

const AR_DIGITS = /[٠-٩۰-۹]/g;
const toLatin = (str) => String(str).replace(AR_DIGITS, (d) => { const c = d.charCodeAt(0); return String(c >= 0x06F0 ? c - 0x06F0 : c - 0x0660); });

/**
 * Money from whatever the forms stored: 2500000, "2,500,000", "٢٫٥ مليون", "2.5M", "750 ألف",
 * "EGP 1.2m". A range ("2-3 مليون") counts its lower end. 0 when there is no number.
 */
export function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : 0;
  if (!value) return 0;
  let t = toLatin(value).toLowerCase().replace(/٬/g, ',').replace(/٫/g, '.');
  const m = t.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!m) return 0;
  const raw = m[1];
  // "2,500,000" → thousands separators; "2,5" (comma decimal) → 2.5
  const num = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw) ? Number(raw.replace(/,/g, '')) : Number(raw.replace(',', '.'));
  if (!Number.isFinite(num)) return 0;
  // A range shares the unit written after its upper end: "2-3 مليون"
  const after = t.slice(m.index + raw.length).replace(/^\s*(?:-|–|to|إلى|الى)\s*\d[\d,.]*/, '').slice(0, 14);
  if (/^\s*(مليون|ملايين|million|mn|m\b)/.test(after)) return num * 1e6;
  if (/^\s*(مليار|billion|bn|b\b)/.test(after)) return num * 1e9;
  if (/^\s*(ألف|الف|آلاف|الاف|thousand|k\b)/.test(after)) return num * 1e3;
  return num;
}

/** YYYY-MM-DD of a moment in the browser's own time zone (toISOString() gives the UTC day) */
export function localDayKey(value = new Date()) {
  const ms = value instanceof Date ? value.getTime() : toMs(value);
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const isClosedOut = (l) => l.isArchived || l.status === 'closed' || l.status === 'lost';
const followUpDay = (l) => (l.nextFollowUpAt ? localDayKey(l.nextFollowUpAt) : '');

/** Follow-up date already passed (open leads only) */
export const isOverdue = (l, todayKey = localDayKey()) => !isClosedOut(l) && !!followUpDay(l) && followUpDay(l) < todayKey;

/** Follow-up due today, or the legacy free-text followUp mentions today's date */
export const isDueToday = (l, todayKey = localDayKey()) => !isClosedOut(l)
  && (followUpDay(l) === todayKey || (typeof l.followUp === 'string' && l.followUp.includes(todayKey)));

export const isUnassigned = (l) => !l.isArchived && l.status !== 'lost' && l.status !== 'closed'
  && (!l.assignedTo || l.assignedTo === 'Unassigned');

/** Open lead with no activity for `hours` (default 48) */
export const STALE_HOURS = 48;
export function isStale(l, now = Date.now(), hours = STALE_HOURS) {
  if (isClosedOut(l)) return false;
  const last = toMs(l.lastActivityAt) || toMs(l.updatedAt) || leadCreatedMs(l);
  return !!last && now - last > hours * 3600 * 1000;
}

const ACTIVE_STAGES = ['new', 'contacted', 'site_visit', 'negotiating', 'closing'];
const leadBudget = (l) => parseMoney(l.budget) || parseMoney(l.details?.budget) || parseMoney(l.details?.expectedPrice);

/**
 * Dashboard numbers. The active pipeline is open deals only (not archived, won or lost).
 * scopeDesk: when set (a desk agent), every count is for that desk's leads and the shared pool
 * is reported separately; company-wide money is left out.
 */
export function computeDashboardMetrics(allLeads = [], demands = [], { now = Date.now(), scopeDesk = null, commissionRate = 0.025 } = {}) {
  const todayKey = localDayKey(now);
  const leads = scopeDesk ? allLeads.filter((l) => l.assignedTo === scopeDesk) : allLeads;
  const open = leads.filter((l) => !l.isArchived && ACTIVE_STAGES.includes(l.status || 'new'));
  const pipelineValue = open.reduce((sum, l) => sum + leadBudget(l), 0);
  const liveDemands = scopeDesk ? [] : demands.filter((d) => !d.isArchived && d.status !== 'archived' && d.status !== 'rejected');
  const purchasingPower = liveDemands.reduce((sum, d) => sum + parseMoney(d.budget), 0);
  const won = leads.filter((l) => l.status === 'closed');
  const lost = leads.filter((l) => l.status === 'lost' && !l.isArchived);
  const decided = won.length + lost.length;

  return {
    todayKey,
    scoped: !!scopeDesk,
    pipelineValue,
    purchasingPower,
    expectedCommission: pipelineValue * commissionRate,
    openCount: open.length,
    newCount: open.filter((l) => !l.status || l.status === 'new').length,
    qualifiedCount: open.filter((l) => ['contacted', 'site_visit', 'negotiating'].includes(l.status)).length,
    closingCount: open.filter((l) => ['negotiating', 'closing'].includes(l.status)).length,
    wonCount: won.length,
    lostCount: lost.length,
    winRate: decided ? Math.round((won.length / decided) * 100) : null,
    overdueList: leads.filter((l) => isOverdue(l, todayKey)),
    dueTodayList: leads.filter((l) => isDueToday(l, todayKey)),
    unassignedList: allLeads.filter(isUnassigned),
    staleList: leads.filter((l) => isStale(l, now)),
    awaitingList: leads.filter((l) => waitingMs(l, now) > 0),
    pendingDemandsCount: liveDemands.filter((d) => d.status === 'pending').length
  };
}

const isOpenNew = (l) => !l.isArchived && (!l.status || l.status === 'new');

/** A new lead nobody has contacted yet: ms it has waited, or 0 when it isn't waiting */
export function waitingMs(l, now = Date.now()) {
  if (!isOpenNew(l) || l.firstContactedAt || l.lastContactedAt) return 0;
  const created = leadCreatedMs(l);
  return created ? Math.max(0, now - created) : 0;
}

/** Leads waiting longer than this without a first reply are flagged */
export const RESPONSE_SLA_MS = 2 * 60 * 60 * 1000;

/** Map normalised phone -> ids, for phones held by two or more active leads */
export function findDuplicateGroups(leads = []) {
  const byPhone = new Map();
  for (const l of leads) {
    if (!l || l.isArchived) continue;
    const keys = new Set([phoneKey(l.phone), phoneKey(l.whatsapp)].filter(Boolean));
    for (const k of keys) {
      if (!byPhone.has(k)) byPhone.set(k, []);
      byPhone.get(k).push(l.id);
    }
  }
  const groups = new Map();
  for (const [k, ids] of byPhone) if (ids.length > 1) groups.set(k, ids);
  return groups;
}

/** lead id -> ids of the other leads sharing its phone */
export function duplicatesById(leads = []) {
  const out = new Map();
  for (const ids of findDuplicateGroups(leads).values()) {
    for (const id of ids) {
      const others = new Set(out.get(id) || []);
      ids.forEach((o) => { if (o !== id) others.add(o); });
      out.set(id, [...others]);
    }
  }
  return out;
}

const STAGE_RANK = { new: 0, contacted: 1, site_visit: 2, negotiating: 3, closing: 4, closed: 5 };
const MAX_LOGS = 100;

/**
 * Fields to write on the kept lead when merging duplicates into it. The others are then deleted.
 * Keeps the oldest creation date, the furthest stage, the best score, every note, tag and log.
 */
export function buildMergedLead(primary, others = [], nowIso = new Date().toISOString()) {
  const all = [primary, ...others];
  const pick = (f) => all.map((l) => l[f]).find((v) => v !== undefined && v !== null && v !== '');
  const created = all.map(leadCreatedMs).filter(Boolean);
  const stage = all.map((l) => l.status || 'new').filter((s) => s in STAGE_RANK)
    .sort((a, b) => STAGE_RANK[b] - STAGE_RANK[a])[0] || 'new';
  const notes = all.map((l) => (l.notes || '').trim()).filter(Boolean);
  const tags = [...new Set(all.flatMap((l) => (Array.isArray(l.tags) ? l.tags : [])))];
  const logs = all.flatMap((l) => (Array.isArray(l.activityLogs) ? l.activityLogs : []))
    .sort((a, b) => toMs(b.timestamp) - toMs(a.timestamp));
  const scores = all.map((l) => l.score).filter((v) => typeof v === 'number');
  const firstContacts = all.map((l) => toMs(l.firstContactedAt)).filter(Boolean);
  const assigned = [primary, ...others].map((l) => l.assignedTo).find((a) => a && a !== 'Unassigned');

  const fields = {
    name: pick('name') || primary.name || '',
    phone: pick('phone') || '',
    whatsapp: pick('whatsapp') || '',
    email: pick('email') || '',
    status: primary.status === 'lost' ? 'lost' : stage,
    notes: [...new Set(notes)].join('\n— — —\n'),
    tags,
    details: Object.assign({}, ...others.map((l) => l.details || {}).reverse(), primary.details || {}),
    activityLogs: [{ timestamp: nowIso, action: `دمج ${others.length} سجل مكرر في هذا العميل` }, ...logs].slice(0, MAX_LOGS),
    mergedFrom: [...new Set([...(primary.mergedFrom || []), ...others.map((l) => String(l.id))])]
  };
  if (assigned) fields.assignedTo = assigned;
  if (scores.length) fields.score = Math.max(...scores);
  if (created.length) fields.createdAt = new Date(Math.min(...created)).toISOString();
  if (firstContacts.length) fields.firstContactedAt = new Date(Math.min(...firstContacts)).toISOString();
  ['temperature', 'budget', 'propertyType', 'area', 'type', 'source', 'cityOrExpat', 'nextFollowUpAt']
    .forEach((f) => { const v = pick(f); if (v !== undefined) fields[f] = v; });
  return fields;
}

function inDateRange(l, range, now) {
  if (!range || range === 'all') return true;
  const t = leadCreatedMs(l);
  if (!t) return false;
  const day = 24 * 60 * 60 * 1000;
  if (range === 'today') return new Date(t).toDateString() === new Date(now).toDateString();
  if (range === '7d') return now - t <= 7 * day;
  if (range === '30d') return now - t <= 30 * day;
  if (range === 'month') { const a = new Date(t), b = new Date(now); return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
  return true;
}

/**
 * Leads table filter.
 * opts: { myDealsOnly, activeRole, agentName, leadFilter, temperatureFilter, areaFilter, sourceFilter,
 *         dateFilter, searchQuery, today, now, duplicateIds }
 * leadFilter: 'all' | 'archived' | 'lost' | 'new' | 'awaiting' | 'dupes' | 'due' | 'overdue' | 'unassigned'
 *   | 'stale' | 'qualified' | a lead type.
 * Archived and lost leads only show under their own filter. today (YYYY-MM-DD) and now (ms)
 * default to the current time; tests pass them in.
 */
export function filterLeads(leads = [], opts = {}) {
  const {
    myDealsOnly = false, activeRole, agentName, leadFilter = 'all',
    temperatureFilter = 'all', areaFilter = 'all', sourceFilter = 'all', dateFilter = 'all', searchQuery = '',
    today, now = Date.now(), duplicateIds = null
  } = opts;
  const q = searchQuery.trim().toLowerCase();
  const todayKey = today || localDayKey(now);
  const dupes = leadFilter === 'dupes' ? (duplicateIds || duplicatesById(leads)) : null;

  return leads.filter((l) => {
    if (myDealsOnly && activeRole !== 'super_admin') {
      if (l.assignedTo !== agentName && l.assignedTo !== 'Unassigned') return false;
    }

    if (leadFilter === 'archived') {
      if (!l.isArchived) return false;
    } else if (l.isArchived) {
      return false;
    } else if (leadFilter === 'lost') {
      if (l.status !== 'lost') return false;
    } else if (l.status === 'lost') {
      return false;
    } else if (leadFilter === 'new') {
      if (l.status !== 'new' && l.status) return false;
    } else if (leadFilter === 'awaiting') {
      if (!waitingMs(l, now)) return false;
    } else if (leadFilter === 'dupes') {
      if (!dupes.has(l.id)) return false;
    } else if (leadFilter === 'due') {
      // Due today or already late
      if (!isDueToday(l, todayKey) && !isOverdue(l, todayKey)) return false;
    } else if (leadFilter === 'overdue') {
      if (!isOverdue(l, todayKey)) return false;
    } else if (leadFilter === 'unassigned') {
      if (!isUnassigned(l)) return false;
    } else if (leadFilter === 'stale') {
      if (!isStale(l, now)) return false;
    } else if (leadFilter === 'qualified') {
      if ((l.score || 0) < 80) return false;
    } else if (leadFilter !== 'all' && l.type !== leadFilter) {
      return false;
    }

    if (temperatureFilter !== 'all') {
      const t = l.temperature || 'unknown';
      if (t !== temperatureFilter) return false;
    }
    if (areaFilter !== 'all' && l.details?.area !== areaFilter) return false;
    if (sourceFilter !== 'all' && leadSourceKey(l) !== sourceFilter) return false;
    if (!inDateRange(l, dateFilter, now)) return false;
    if (q) {
      const matchName = (l.name || '').toLowerCase().includes(q);
      const matchPhone = (l.phone || '').includes(q);
      const matchNotes = l.notes && l.notes.toLowerCase().includes(q);
      const matchCity = l.cityOrExpat && l.cityOrExpat.toLowerCase().includes(q);
      const matchTags = l.tags && l.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchPhone && !matchNotes && !matchCity && !matchTags) return false;
    }
    return true;
  });
}

/** Sort keys for the leads table. Stable: ties keep the incoming (newest-first) order. */
export const LEAD_SORTS = [
  { id: 'newest', ar: 'الأحدث', en: 'Newest' },
  { id: 'oldest', ar: 'الأقدم', en: 'Oldest' },
  { id: 'activity', ar: 'آخر نشاط', en: 'Last activity' },
  { id: 'followup', ar: 'أقرب متابعة', en: 'Next follow-up' },
  { id: 'score', ar: 'الأعلى جدية', en: 'Highest score' },
  { id: 'waiting', ar: 'الأطول انتظاراً للرد', en: 'Longest waiting' }
];

export function sortLeads(list = [], key = 'newest', now = Date.now()) {
  const val = {
    newest: (l) => -leadCreatedMs(l),
    oldest: (l) => leadCreatedMs(l) || Number.MAX_SAFE_INTEGER,
    activity: (l) => -(toMs(l.lastActivityAt) || toMs(l.updatedAt) || leadCreatedMs(l)),
    followup: (l) => toMs(l.nextFollowUpAt) || Number.MAX_SAFE_INTEGER,
    score: (l) => -(typeof l.score === 'number' ? l.score : -1),
    waiting: (l) => -waitingMs(l, now)
  }[key];
  if (!val) return list;
  return list.map((l, i) => ({ l, i, v: val(l) }))
    .sort((a, b) => (a.v - b.v) || (a.i - b.i))
    .map((x) => x.l);
}

/** Count of lost leads per reason id */
export function lostReasonCounts(leads = []) {
  const out = {};
  for (const l of leads) if (l.status === 'lost' && !l.isArchived) out[l.lostReason || 'other'] = (out[l.lostReason || 'other'] || 0) + 1;
  return out;
}
