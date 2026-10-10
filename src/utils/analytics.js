// =============================================================
//  Visitor analytics → /api/track (server; see api/_track-core.js for what is kept).
//
//  • Events are queued and sent in small batches (every few seconds, and with sendBeacon when
//    the tab is hidden or closed) — no request per click.
//  • With analytics consent (ConsentBanner) the batch carries a random visitor id + session id,
//    so the CRM can see one visitor's interests over time and link them to their request.
//    Without consent nothing identifying is sent: the events only feed anonymous daily totals.
//  • Never sends names, phones, e-mails or free text; staff pages (/crm) are never tracked.
// =============================================================

const ENDPOINT = '/api/track';
const CONSENT_KEY = 'oneline_consent_v1';
const VID_KEY = 'oneline_vid';
const FIRST_SEEN_KEY = 'oneline_vid_first';
const SESSIONS_KEY = 'oneline_vid_sessions';
const DAY_KEY = 'oneline_vid_day';
const SESSION_KEY = 'oneline_an_session';
const STAGES_KEY = 'oneline_an_stages';
const SOURCE_KEY = 'oneline_an_source';
const SESSION_IDLE_MS = 30 * 60 * 1000;
const FLUSH_DELAY_MS = 5000;
const FLUSH_SIZE = 20;

const isBrowser = typeof window !== 'undefined';
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };
const randomId = () => (globalThis.crypto?.randomUUID
  ? globalThis.crypto.randomUUID().replace(/-/g, '')
  : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`);
const asKey = (v) => {
  const s = String(v ?? '').trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : undefined;
};

export const hasAnalyticsConsent = () => isBrowser && safe(() => localStorage.getItem(CONSENT_KEY) === 'accepted', false);
const isStaffPage = () => isBrowser && window.location.pathname.startsWith('/crm');

// ── Where the visit came from (first touch of the session) ───────────────────
const SOURCE_HOSTS = [
  ['facebook', /facebook\.|fb\.|messenger/], ['instagram', /instagram\./], ['google', /google\./],
  ['tiktok', /tiktok\./], ['youtube', /youtube\.|youtu\.be/], ['whatsapp', /whatsapp\.|wa\.me/],
  ['linkedin', /linkedin\./], ['twitter', /twitter\.|x\.com|t\.co/], ['bing', /bing\./],
];
function visitSource() {
  const stored = safe(() => JSON.parse(sessionStorage.getItem(SOURCE_KEY) || 'null'), null);
  if (stored) return stored;
  const params = new URLSearchParams(window.location.search);
  let referrerHost = '';
  safe(() => { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; });
  const internal = referrerHost && referrerHost === window.location.hostname;
  const utm = asKey((params.get('utm_source') || '').toLowerCase());
  const fromHost = !internal && referrerHost ? (SOURCE_HOSTS.find(([, re]) => re.test(referrerHost))?.[0] || 'referral') : '';
  const source = {
    source: utm || (params.get('gclid') ? 'google' : '') || (params.get('fbclid') ? 'facebook' : '') || fromHost || 'direct',
    medium: asKey((params.get('utm_medium') || (params.get('gclid') ? 'cpc' : '')).toLowerCase()),
    campaign: asKey(params.get('utm_campaign')),
    referrer: !internal && referrerHost ? referrerHost.slice(0, 80) : undefined,
    landing: window.location.pathname.slice(0, 120),
  };
  safe(() => sessionStorage.setItem(SOURCE_KEY, JSON.stringify(source)));
  return source;
}

const deviceClass = () => {
  const w = Math.min(window.screen?.width || window.innerWidth, window.innerWidth || 9999);
  return w < 768 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop';
};

// ── Visitor / session state ──────────────────────────────────────────────────
let queue = [];
let timer = null;
let pendingFlags = { newVisitor: false, dayFirst: false };
let pageProperty = null;
const beforeFlush = new Set();

function visitor() {
  if (!hasAnalyticsConsent()) return null;
  return safe(() => {
    let vid = localStorage.getItem(VID_KEY);
    if (!vid) {
      vid = `v_${randomId()}`;
      localStorage.setItem(VID_KEY, vid);
      localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
      pendingFlags.newVisitor = true;
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
    if (localStorage.getItem(DAY_KEY) !== today) {
      localStorage.setItem(DAY_KEY, today);
      pendingFlags.dayFirst = true;
    }
    return { vid, firstSeen: Number(localStorage.getItem(FIRST_SEEN_KEY)) || Date.now() };
  }, null);
}

/** Current session id; starts a new one (and queues session_start) after 30 idle minutes. */
function session() {
  return safe(() => {
    const now = Date.now();
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (s && now - s.last < SESSION_IDLE_MS) {
      s.last = now;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      return s.id;
    }
    const id = `s_${randomId()}`;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, last: now }));
    sessionStorage.removeItem(STAGES_KEY);
    let returning = false;
    if (hasAnalyticsConsent()) {
      const count = Number(localStorage.getItem(SESSIONS_KEY) || 0);
      returning = count > 0;
      localStorage.setItem(SESSIONS_KEY, String(count + 1));
    }
    queue.push({ t: 'session_start', ts: now, m: { returning } });
    return id;
  }, 's_unavailable0');
}

function markStage(stage) {
  const stages = safe(() => JSON.parse(sessionStorage.getItem(STAGES_KEY) || '[]'), []);
  if (stages.includes(stage)) return;
  stages.push(stage);
  safe(() => sessionStorage.setItem(STAGES_KEY, JSON.stringify(stages)));
  queue.push({ t: 'stage', ts: Date.now(), m: { s: stage } });
}

const STAGE_OF = {
  property_view: 'viewed', property_engaged: 'engaged', calculator_used: 'planned', compare_added: 'planned',
  favorite_added: 'planned', contact_click: 'contacted', reservation_requested: 'contacted', lead_submitted: 'lead',
};

// ── Sending ──────────────────────────────────────────────────────────────────
function send(useBeacon) {
  if (!queue.length) return;
  const events = queue.splice(0, 60);
  const v = visitor();
  const sid = session();
  const src = visitSource();
  const body = JSON.stringify({
    v: 1,
    consent: Boolean(v),
    vid: v?.vid,
    sid: v ? sid : undefined,
    firstSeen: v?.firstSeen,
    newVisitor: Boolean(v && pendingFlags.newVisitor),
    dayFirst: Boolean(v && pendingFlags.dayFirst),
    ctx: { device: deviceClass(), lang: document.documentElement.lang === 'en' ? 'en' : 'ar', ...src },
    events,
  });
  pendingFlags = { newVisitor: false, dayFirst: false };
  safe(() => {
    // text/plain keeps it a "simple" request (no CORS preflight)
    const blob = new Blob([body], { type: 'text/plain' });
    if (useBeacon && navigator.sendBeacon?.(ENDPOINT, blob)) return;
    fetch(ENDPOINT, { method: 'POST', body: blob, keepalive: true }).catch(() => {});
  });
  if (queue.length) send(useBeacon);
}

export function flushAnalytics(useBeacon = false) {
  if (timer) { clearTimeout(timer); timer = null; }
  // Only when the page is being hidden/closed: that's when reading time must be reported
  if (useBeacon) beforeFlush.forEach((fn) => safe(fn));
  send(useBeacon);
}

/** Queue one event (unknown types and fields are dropped by the server anyway). */
export function track(type, meta = {}) {
  if (!isBrowser || isStaffPage()) return;
  session();
  const m = { ...meta };
  // Events on a listing page without their own id belong to that listing
  if (pageProperty && !m.propertyId && ['gallery_open', 'virtual_tour', 'brochure_request', 'contact_click', 'calculator_used', 'reservation_requested'].includes(type)) {
    m.propertyId = pageProperty.propertyId;
  }
  queue.push({ t: type, ts: Date.now(), m });
  if (STAGE_OF[type]) markStage(STAGE_OF[type]);
  if (queue.length >= FLUSH_SIZE) flushAnalytics();
  else if (!timer) timer = setTimeout(() => { timer = null; flushAnalytics(); }, FLUSH_DELAY_MS);
}

/** The fields the collector keeps for a listing. */
export const propertyFacts = (p = {}) => ({
  propertyId: asKey(p.id),
  area: asKey(p.areaKey || p.area),
  type: asKey(p.type),
  price: Number(p.price) || undefined,
});

/** Lets the listing page attach its id to gallery / contact / calculator events. */
export const setPageProperty = (facts) => { pageProperty = facts || null; };

/** Called right before the page is hidden or closed (e.g. to report reading time so far). */
export const onBeforeFlush = (fn) => { beforeFlush.add(fn); return () => beforeFlush.delete(fn); };

/** The visitor id to save on a lead, only when the visitor agreed to analytics. */
export const analyticsVisitorId = () => (hasAnalyticsConsent() && !isStaffPage() ? safe(() => localStorage.getItem(VID_KEY), null) : null);

// ── Page-wide signals ────────────────────────────────────────────────────────
const formsStarted = new WeakSet();
function onClick(e) {
  const a = e.target?.closest?.('a[href]');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  const channel = /^https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)/.test(href) ? 'whatsapp' : href.startsWith('tel:') ? 'phone' : null;
  // wa.me/?text= without a number is "share with a friend", not contacting us
  if (channel === 'whatsapp' && /wa\.me\/?\?/.test(href)) return;
  if (channel) track('contact_click', { channel, placement: asKey(a.dataset.track) });
}
function onFocus(e) {
  const form = e.target?.closest?.('form');
  if (!form || formsStarted.has(form)) return;
  // Only request forms (they ask for a phone number), not search boxes
  if (!form.querySelector('input[type="tel"], input[name*="phone" i], input[autocomplete="tel"]')) return;
  formsStarted.add(form);
  const name = asKey(form.dataset.form || form.id) || asKey(window.location.pathname.split('/')[1]) || 'home';
  track('form_start', { form: name });
}

// Most "talk to us" buttons open WhatsApp with window.open rather than a link; count those too.
// A wa.me URL without a number is "share with a friend", not a contact.
function watchWindowOpen() {
  const nativeOpen = window.open;
  if (typeof nativeOpen !== 'function' || nativeOpen.__tracked) return;
  const tracked = function open(url, ...rest) {
    safe(() => {
      if (/^https?:\/\/(wa\.me|api\.whatsapp\.com\/send\?phone=)\/?\d/.test(String(url || ''))) track('contact_click', { channel: 'whatsapp' });
    });
    return nativeOpen.call(window, url, ...rest);
  };
  tracked.__tracked = true;
  window.open = tracked;
}

if (isBrowser) {
  watchWindowOpen();
  document.addEventListener('click', onClick, true);
  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAnalytics(true); });
  window.addEventListener('pagehide', () => flushAnalytics(true));
}
