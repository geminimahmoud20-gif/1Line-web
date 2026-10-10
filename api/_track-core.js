// =============================================================
//  Visitor analytics: validation + aggregation (pure, unit-tested in tests/unit/track-core.test.mjs).
//
//  The browser sends batches of events; nothing is trusted. Each event type has a fixed list of
//  fields with types and limits, so no free text (names, phones, notes) can ever be stored.
//  Without consent the batch carries no visitor/session id and only feeds anonymous daily counts.
//
//  Firestore layout (written with the service account, read by staff only):
//   analytics_daily/{YYYY-MM-DD}_{shard}   counters for the day (sharded: one doc takes ~1 write/s)
//   analytics_properties/{propertyId}      per-listing interest
//   analytics_visitors/{visitorId}         interest profile + intent score   (consent only)
//   analytics_visitors/{visitorId}/batches/{id}  the raw events, kept 180 days (consent only)
//   analytics_sessions/{sessionId}         one visit, kept 180 days          (consent only)
// =============================================================

export const DAILY_SHARDS = 8;
export const RAW_RETENTION_DAYS = 180;
export const MAX_EVENTS = 60;
export const MAX_BODY_BYTES = 32 * 1024;

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const VID_RE = /^v_[A-Za-z0-9_-]{8,64}$/;
const SID_RE = /^s_[A-Za-z0-9_-]{8,64}$/;

const str = (max = 64) => (v) => {
  if (typeof v !== 'string') return undefined;
  const s = v.trim().slice(0, max);
  return s || undefined;
};
const key = (v) => {
  const s = typeof v === 'number' ? String(v) : v;
  return typeof s === 'string' && ID_RE.test(s) ? s : undefined;
};
const num = (min, max) => (v) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined;
};
const oneOf = (...values) => (v) => (values.includes(v) ? v : undefined);
// Free search text, minus anything that looks like a phone number or e-mail
const searchText = (v) => str(60)(typeof v === 'string' ? v.replace(/[\d٠-٩][\d٠-٩\s+-]{5,}/g, ' ').replace(/\S+@\S+/g, ' ').replace(/\s+/g, ' ') : v);
const path = (v) => (typeof v === 'string' && v.startsWith('/') ? v.split('?')[0].slice(0, 120) : undefined);

const PROPERTY = { propertyId: key, area: key, type: key, price: num(0, 5e9) };

// Every event type the site may send, with the only fields kept for it
export const EVENT_SCHEMA = {
  session_start: { returning: oneOf(true, false) },
  page_view: { path },
  property_view: PROPERTY,
  property_engaged: { ...PROPERTY, seconds: num(0, 3600), scroll: num(0, 100) },
  gallery_open: { propertyId: key },
  virtual_tour: { propertyId: key },
  search: { area: key, type: key, minPrice: num(0, 5e9), maxPrice: num(0, 5e9), bedrooms: key, payment: key, query: searchText },
  calculator_used: { propertyId: key, price: num(0, 5e9), downPct: num(0, 100), years: num(0, 30), mode: key },
  compare_added: PROPERTY,
  favorite_added: PROPERTY,
  share: { kind: key, count: num(0, 20) },
  brochure_request: { propertyId: key },
  form_start: { form: key },
  contact_click: { channel: oneOf('whatsapp', 'phone'), propertyId: key, placement: key },
  reservation_requested: { propertyId: key },
  lead_submitted: { form: key, leadId: key },
  stage: { s: oneOf('viewed', 'engaged', 'planned', 'contacted', 'lead') },
};

// How much each action says about buying intent (summed on the visitor profile)
export const INTENT_WEIGHTS = {
  session_start: 0, page_view: 0, property_view: 1, gallery_open: 1, virtual_tour: 2, search: 1,
  calculator_used: 4, compare_added: 3, favorite_added: 3, share: 3, brochure_request: 4,
  form_start: 4, contact_click: 8, reservation_requested: 12, lead_submitted: 15, stage: 0,
};

export const intentOf = (event) => {
  if (event.t === 'property_engaged') return 1 + Math.min(4, Math.floor((event.m.seconds || 0) / 30));
  if (event.t === 'session_start') return event.m.returning ? 2 : 0;
  return INTENT_WEIGHTS[event.t] || 0;
};

export const priceBand = (price) => {
  const p = Number(price) || 0;
  if (!p) return undefined;
  if (p < 1e6) return 'lt1m';
  if (p < 2e6) return 'm1_2';
  if (p < 3e6) return 'm2_3';
  if (p < 5e6) return 'm3_5';
  if (p < 10e6) return 'm5_10';
  return 'gte10m';
};

const sanitizeEvent = (raw, now) => {
  if (!raw || typeof raw !== 'object') return null;
  const schema = EVENT_SCHEMA[raw.t];
  if (!schema) return null;
  const m = {};
  const src = raw.m && typeof raw.m === 'object' ? raw.m : {};
  for (const [field, clean] of Object.entries(schema)) {
    const v = clean(src[field]);
    if (v !== undefined) m[field] = v;
  }
  const ts = Number(raw.ts);
  // Client clocks drift; anything more than a day off is replaced by the server time
  const at = Number.isFinite(ts) && Math.abs(ts - now) < 86_400_000 ? ts : now;
  return { t: raw.t, ts: at, m };
};

const sanitizeContext = (ctx = {}) => ({
  device: oneOf('mobile', 'tablet', 'desktop')(ctx.device) || 'unknown',
  lang: oneOf('ar', 'en')(ctx.lang) || 'ar',
  source: key(ctx.source) || 'direct',
  medium: key(ctx.medium),
  campaign: key(ctx.campaign),
  referrer: str(80)(ctx.referrer),
  landing: path(ctx.landing),
});

/** Validate one POST body. Returns null when nothing usable was sent. */
export function sanitizeBatch(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.events)) return null;
  const consent = body.consent === true;
  const events = body.events.slice(0, MAX_EVENTS).map((e) => sanitizeEvent(e, now)).filter(Boolean);
  if (!events.length) return null;
  const vid = consent && VID_RE.test(body.vid || '') ? body.vid : null;
  const sid = consent && SID_RE.test(body.sid || '') ? body.sid : null;
  return {
    consent: Boolean(consent && vid && sid),
    vid,
    sid,
    firstSeen: num(0, 1e13)(body.firstSeen),
    newVisitor: body.newVisitor === true,
    dayFirst: body.dayFirst === true,
    ctx: sanitizeContext(body.ctx),
    events,
  };
}

/** Calendar day and hour in Egypt (DST-aware). */
export function cairoParts(ms) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: parts.hour };
}

// ── Firestore REST write building ────────────────────────────────────────────
const quote = (seg) => (/^[A-Za-z_][A-Za-z_0-9]*$/.test(seg) ? seg : `\`${String(seg).replace(/[`\\]/g, (c) => `\\${c}`)}\``);
const fieldPath = (...segs) => segs.map(quote).join('.');

const toValue = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
  return { stringValue: String(v) };
};

/** Collects "set these fields" + "add to these counters" for one document. */
class DocWrite {
  constructor(name) { this.name = name; this.sets = {}; this.incs = new Map(); }
  set(field, value) { if (value !== undefined) this.sets[field] = value; return this; }
  inc(segs, by = 1) {
    if (!by) return this;
    const p = fieldPath(...segs);
    this.incs.set(p, (this.incs.get(p) || 0) + by);
    return this;
  }
  toWrite() {
    const fields = Object.fromEntries(Object.entries(this.sets).map(([k, v]) => [k, toValue(v)]));
    return {
      update: { name: this.name, fields },
      updateMask: { fieldPaths: Object.keys(this.sets).map((k) => quote(k)) },
      updateTransforms: [...this.incs].map(([p, by]) => ({ fieldPath: p, increment: toValue(by) })),
    };
  }
}

const propertyFacts = (m) => ({ area: m.area, type: m.type, band: priceBand(m.price) });

/**
 * Turn a sanitized batch into Firestore commit writes.
 * `docRoot` is "projects/<id>/databases/(default)/documents".
 */
export function buildWrites(batch, { docRoot, now = Date.now(), shard = 0, batchId } = {}) {
  const { day, hour } = cairoParts(now);
  const at = new Date(now);
  const expireAt = new Date(now + RAW_RETENTION_DAYS * 86_400_000);

  const daily = new DocWrite(`${docRoot}/analytics_daily/${day}_${shard}`).set('date', day).set('updatedAt', at);
  const props = new Map();
  const propDoc = (id) => {
    if (!props.has(id)) props.set(id, new DocWrite(`${docRoot}/analytics_properties/${id}`).set('propertyId', id));
    return props.get(id);
  };
  const visitor = batch.consent ? new DocWrite(`${docRoot}/analytics_visitors/${batch.vid}`) : null;
  const session = batch.consent ? new DocWrite(`${docRoot}/analytics_sessions/${batch.sid}`) : null;

  daily.inc(['batches']);
  if (!batch.consent) daily.inc(['anonymousBatches']);
  if (batch.consent && batch.dayFirst) daily.inc(['visitors']);
  if (batch.consent && batch.newVisitor) daily.inc(['newVisitors']);

  let intent = 0;
  for (const e of batch.events) {
    const { m } = e;
    daily.inc(['events', e.t]);
    const score = intentOf(e);
    intent += score;

    switch (e.t) {
      case 'session_start':
        daily.inc(['sessions']).inc(['sources', batch.ctx.source]).inc(['devices', batch.ctx.device]);
        if (batch.ctx.campaign) daily.inc(['campaigns', batch.ctx.campaign]);
        if (m.returning) daily.inc(['returningSessions']);
        visitor?.inc(['sessions']).inc(['sources', batch.ctx.source]);
        break;
      case 'page_view':
        daily.inc(['pageViews']).inc(['hours', hour]);
        visitor?.inc(['pageViews']);
        session?.inc(['pageViews']).set('lastPath', m.path);
        break;
      case 'property_view':
      case 'compare_added':
      case 'favorite_added': {
        const f = propertyFacts(m);
        const counter = { property_view: 'views', compare_added: 'compares', favorite_added: 'favorites' }[e.t];
        if (m.propertyId) {
          const pd = propDoc(m.propertyId).inc([counter]).set('area', f.area).set('type', f.type).set('price', m.price);
          if (e.t === 'property_view') pd.inc(['days', day]).set('lastViewedAt', at);
        }
        const weight = e.t === 'property_view' ? 1 : 2;
        if (e.t === 'property_view') {
          daily.inc(['propertyViews']);
          if (f.area) daily.inc(['viewAreas', f.area]);
          if (f.type) daily.inc(['viewTypes', f.type]);
          if (f.band) daily.inc(['viewBands', f.band]);
          visitor?.inc(['propertyViews']);
          session?.inc(['propertyViews']);
        }
        if (visitor) {
          if (f.area) visitor.inc(['areas', f.area], weight);
          if (f.type) visitor.inc(['types', f.type], weight);
          if (f.band) visitor.inc(['bands', f.band], weight);
          if (m.propertyId) visitor.inc([counter === 'views' ? 'props' : counter, m.propertyId]);
        }
        break;
      }
      case 'property_engaged': {
        const secs = m.seconds || 0;
        if (secs < 5) break;
        const f = propertyFacts(m);
        daily.inc(['engagedViews']).inc(['engagedSeconds'], secs);
        if (m.propertyId) propDoc(m.propertyId).inc(['engagedViews']).inc(['engagedSeconds'], secs);
        session?.inc(['engagedSeconds'], secs);
        if (visitor) {
          visitor.inc(['engagedSeconds'], secs);
          if (m.propertyId) visitor.inc(['propSecs', m.propertyId], secs);
          // Reading a listing for a while is a stronger signal than opening it
          if (secs >= 30) {
            if (f.area) visitor.inc(['areas', f.area], 2);
            if (f.type) visitor.inc(['types', f.type], 2);
            if (f.band) visitor.inc(['bands', f.band], 2);
          }
        }
        break;
      }
      case 'gallery_open':
      case 'virtual_tour':
      case 'brochure_request':
      case 'reservation_requested': {
        const counter = { gallery_open: 'gallery', virtual_tour: 'tours', brochure_request: 'brochures', reservation_requested: 'reservations' }[e.t];
        if (m.propertyId) propDoc(m.propertyId).inc([counter]);
        visitor?.inc([counter]);
        break;
      }
      case 'search': {
        const band = priceBand(m.maxPrice || m.minPrice);
        if (m.area && m.area !== 'all') { daily.inc(['searchAreas', m.area]); visitor?.inc(['areas', m.area]); }
        if (m.type && m.type !== 'all') { daily.inc(['searchTypes', m.type]); visitor?.inc(['types', m.type]); }
        if (band) { daily.inc(['searchBands', band]); visitor?.inc(['bands', band]); }
        visitor?.inc(['searches']).set('lastSearch', { ...m, at });
        break;
      }
      case 'calculator_used': {
        daily.inc(['calculatorUses']);
        if (m.propertyId) propDoc(m.propertyId).inc(['calculator']);
        const band = priceBand(m.price);
        if (band) daily.inc(['calcBands', band]);
        if (visitor) {
          visitor.inc(['calculatorUses']).set('lastCalc', { ...m, at });
          if (band) visitor.inc(['bands', band], 2);
        }
        break;
      }
      case 'share':
        daily.inc(['shares']);
        visitor?.inc(['shares']);
        break;
      case 'form_start':
        daily.inc(['formStarts']);
        visitor?.inc(['formStarts']);
        break;
      case 'contact_click':
        daily.inc(['contacts', m.channel || 'whatsapp']);
        if (m.propertyId) propDoc(m.propertyId).inc(['contacts']);
        visitor?.inc(['contacts', m.channel || 'whatsapp']).set('lastContactAt', at);
        session?.inc(['contacts']);
        break;
      case 'lead_submitted':
        daily.inc(['leads']);
        if (visitor) {
          visitor.inc(['leads']);
          if (m.leadId) visitor.set('leadId', m.leadId);
        }
        session?.set('converted', true);
        break;
      case 'stage':
        if (m.s) daily.inc(['funnel', m.s]);
        break;
      default:
        break;
    }
  }

  const writes = [daily.toWrite(), ...[...props.values()].map((p) => p.toWrite())];

  if (visitor) {
    visitor
      .set('visitorId', batch.vid)
      .set('lastSeenAt', at)
      .set('lastSessionId', batch.sid)
      .set('device', batch.ctx.device)
      .set('lang', batch.ctx.lang)
      .set('lastSource', batch.ctx.source)
      .inc(['events'], batch.events.length)
      .inc(['intent'], intent);
    if (batch.firstSeen) visitor.set('firstSeenAt', new Date(batch.firstSeen));
    if (batch.ctx.campaign) visitor.set('lastCampaign', batch.ctx.campaign);
    writes.push(visitor.toWrite());

    session
      .set('sessionId', batch.sid)
      .set('visitorId', batch.vid)
      .set('lastSeenAt', at)
      .set('device', batch.ctx.device)
      .set('source', batch.ctx.source)
      .set('expireAt', expireAt)
      .inc(['events'], batch.events.length)
      .inc(['intent'], intent);
    if (batch.ctx.campaign) session.set('campaign', batch.ctx.campaign);
    if (batch.ctx.medium) session.set('medium', batch.ctx.medium);
    if (batch.ctx.referrer) session.set('referrer', batch.ctx.referrer);
    if (batch.ctx.landing) session.set('landing', batch.ctx.landing);
    if (batch.events.some((e) => e.t === 'session_start')) session.set('startedAt', at);
    writes.push(session.toWrite());

    const id = batchId || `${now}_${Math.random().toString(36).slice(2, 8)}`;
    writes.push(new DocWrite(`${docRoot}/analytics_visitors/${batch.vid}/batches/${id}`)
      .set('sessionId', batch.sid)
      .set('at', at)
      .set('expireAt', expireAt)
      .set('events', batch.events.map((e) => ({ t: e.t, at: new Date(e.ts), ...e.m })))
      .toWrite());
  }

  return writes;
}

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegram/i;
export const isBot = (userAgent = '') => !userAgent || BOT_RE.test(userAgent);
