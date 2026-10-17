// CRM inbox (CrmInboxPanel): which requests it lists, who holds each one, how old it is and how
// its notes split into the client's words and the CRM's own log lines.
// Pure helpers, unit-tested in tests/unit/inbox-view.test.mjs.

/** The stages the inbox itself moves a request through; later ones belong to the pipeline */
export const INBOX_STAGES = [
  { id: 'new', label_ar: 'جديد', label_en: 'New' },
  { id: 'contacted', label_ar: 'اتصلنا', label_en: 'Contacted' },
  { id: 'site_visit', label_ar: 'معاينة', label_en: 'Site visit' }
];
export const isInboxStage = (status) => INBOX_STAGES.some((s) => s.id === (status || 'new'));

const PIPELINE_LABELS = {
  negotiating: { ar: 'تفاوض', en: 'Negotiation' },
  closing: { ar: 'توقيع وحجز', en: 'Closing' },
  closed: { ar: 'صفقة ناجحة', en: 'Won' },
  lost: { ar: 'خسرناه', en: 'Lost' }
};
/** Name of a stage the inbox can't set (shown instead of the stage buttons) */
export const pipelineStageLabel = (status, isAr = true) => {
  const l = PIPELINE_LABELS[status];
  return l ? (isAr ? l.ar : l.en) : String(status || '');
};

// General desks a request sits on before someone takes it
export const TEAM_DESKS = [
  'Sales Team A',
  'Sales Team B',
  'Sales Management',
  'Sales Advisor Team',
  'Dr. Mahmoud Elbaz',
  'Unassigned',
  'غير مسند'
];

export function isLeadUnclaimed(lead) {
  if (!lead) return true;
  if (lead.ownerUid || lead.ownerName || lead.claimedBy) return false;
  return !lead.assignedTo || TEAM_DESKS.includes(lead.assignedTo) || lead.status === 'new';
}

export function isLeadClaimedByMe(lead, uid, staffName) {
  if (!lead) return false;
  // The account decides when the request records one (a reassignment rewrites it)
  if (lead.ownerUid) return Boolean(uid) && lead.ownerUid === uid;
  if (lead.ownerName && staffName && lead.ownerName === staffName) return true;
  if (lead.claimedBy && staffName && lead.claimedBy === staffName) return true;
  return !lead.ownerName && !lead.claimedBy && Boolean(staffName) && lead.assignedTo === staffName;
}

/** Archived, won and lost requests are finished: they never show in the inbox */
export const isInboxActive = (lead) => Boolean(lead) && !lead.isArchived && lead.status !== 'closed' && lead.status !== 'lost';

/** Still needs someone: nobody took it yet, or it was taken but nobody has called */
export const needsAction = (lead) => isLeadUnclaimed(lead) || (lead.status || 'new') === 'new';

export const INBOX_VIEWS = [
  { id: 'todo', label_ar: 'محتاجة تصرّف', label_en: 'To do' },
  { id: 'unclaimed', label_ar: 'مش مستلمة', label_en: 'Unclaimed' },
  { id: 'mine', label_ar: 'معايا', label_en: 'Mine' },
  { id: 'all', label_ar: 'الكل', label_en: 'All' }
];

export function matchesView(lead, view, uid, staffName) {
  if (!isInboxActive(lead)) return false;
  if (view === 'unclaimed') return isLeadUnclaimed(lead);
  if (view === 'mine') return isLeadClaimedByMe(lead, uid, staffName);
  if (view === 'all') return true;
  return needsAction(lead);
}

export function toMillis(v) {
  if (!v) return NaN;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return new Date(v).getTime();
}
export const receivedMs = (lead) => {
  const t = toMillis(lead?.createdAt);
  return Number.isFinite(t) ? t : toMillis(lead?.timestamp);
};

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "دلوقتي" · "من 5 دقايق" · "من 3 ساعات" · "من يومين" · "من 3 أسابيع" · "من شهرين" */
export function ageLabel(ms, isAr = true) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const unit = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : `${n} ${n <= 10 ? few : many}`);
  if (ms < MIN) return isAr ? 'دلوقتي' : 'just now';
  if (ms < HOUR) {
    const n = Math.floor(ms / MIN);
    return isAr ? `من ${unit(n, 'دقيقة', 'دقيقتين', 'دقايق', 'دقيقة')}` : `${n} min ago`;
  }
  if (ms < DAY) {
    const n = Math.floor(ms / HOUR);
    return isAr ? `من ${unit(n, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}` : `${n} h ago`;
  }
  if (ms < 14 * DAY) {
    const n = Math.floor(ms / DAY);
    return isAr ? `من ${unit(n, 'يوم', 'يومين', 'أيام', 'يوم')}` : `${n} d ago`;
  }
  if (ms < 60 * DAY) {
    const n = Math.floor(ms / (7 * DAY));
    return isAr ? `من ${unit(n, 'أسبوع', 'أسبوعين', 'أسابيع', 'أسبوع')}` : `${n} wk ago`;
  }
  if (ms < 365 * DAY) {
    const n = Math.floor(ms / (30 * DAY));
    return isAr ? `من ${unit(n, 'شهر', 'شهرين', 'شهور', 'شهر')}` : `${n} mo ago`;
  }
  const n = Math.floor(ms / (365 * DAY));
  return isAr ? `من ${unit(n, 'سنة', 'سنتين', 'سنين', 'سنة')}` : `${n} y ago`;
}

/** The request's date: time if today, day + month this year, day + month + year before that */
export function formatReceived(t, now, isAr = true) {
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  const today = new Date(now);
  const locale = isAr ? 'ar-EG-u-nu-latn' : 'en-GB';
  if (today.toDateString() === d.toDateString()) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  const opts = { day: 'numeric', month: 'short' };
  if (d.getFullYear() !== today.getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(locale, opts);
}

/** "26 طلب" (Egyptian usage, no tanween) */
export const requestsCount = (n, isAr = true) => {
  if (!isAr) return `${n} request${n === 1 ? '' : 's'}`;
  if (n === 1) return 'طلب واحد';
  if (n === 2) return 'طلبين';
  return `${n} ${n <= 10 ? 'طلبات' : 'طلب'}`;
};

/**
 * Unclaimed open requests older than the response target.
 * Returns { count, oldestMs, byTab } where byTab counts them per inbox tab (via categoryOf).
 */
export function slaSummary(leads = [], now = Date.now(), minutes = 15, categoryOf = () => 'other') {
  const cutoff = now - (minutes || 15) * MIN;
  let count = 0;
  let oldest = Infinity;
  const byTab = {};
  for (const l of leads) {
    if (!isInboxActive(l) || !isLeadUnclaimed(l)) continue;
    const t = receivedMs(l);
    if (!Number.isFinite(t) || t <= 0 || t >= cutoff) continue;
    count += 1;
    if (t < oldest) oldest = t;
    const tab = categoryOf(l);
    byTab[tab] = (byTab[tab] || 0) + 1;
  }
  return { count, oldestMs: count ? now - oldest : 0, byTab };
}

// "[09:19 ص] تم تحديث المرحلة إلى: …" and the like are written by the CRM, not by the client
const LOG_LINE = /^\[\s*\d{1,2}:\d{2}(\s*(ص|م|AM|PM|am|pm))?\s*\]/;

/** Splits the notes into the client's own text and the CRM's timestamped log lines */
export function splitNotes(notes = '') {
  const client = [];
  const log = [];
  String(notes || '')
    .split(/\n+/)
    .forEach((chunk) => {
      // One stored line can hold a log entry followed by "| client text"
      chunk.split(/\s*\|\s*/).forEach((part) => {
        const p = part.trim();
        if (!p) return;
        (LOG_LINE.test(p) ? log : client).push(p);
      });
    });
  return { client: client.join(' · '), log };
}

/**
 * Field changes for handing a request to a team member, or back to nobody (member = null).
 * The member's own desk is used when they have one, so their desk queue can see the request.
 */
export function reassignUpdates(lead, member, nowIso = new Date().toISOString()) {
  if (!member) {
    return {
      ownerName: null,
      claimedBy: null,
      ownerUid: null,
      claimedAt: null,
      assignedAt: nowIso
    };
  }
  const name = member.name || (member.email ? member.email.split('@')[0] : '') || member.uid;
  return {
    ownerName: name,
    claimedBy: name,
    ownerUid: member.uid || null,
    assignedTo: member.desk || lead?.assignedTo || 'Unassigned',
    claimedAt: nowIso,
    assignedAt: nowIso
  };
}

/** People who already hold requests, for the reassign list when the team list can't load */
export function knownOwners(leads = []) {
  const byKey = new Map();
  for (const l of leads) {
    const name = l.ownerName || l.claimedBy;
    if (!name) continue;
    const key = l.ownerUid || `name:${name}`;
    if (!byKey.has(key)) byKey.set(key, { uid: l.ownerUid || '', name, desk: '' });
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}
