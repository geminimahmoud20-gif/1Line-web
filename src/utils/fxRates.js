// =============================================================
//  1LINE — Indicative exchange rates for expat buyers
//  Contracts are always in EGP. Every foreign figure on the site is shown with "≈"
//  and the rate date, never as the price itself.
//
//  Rate precedence:
//   1. Manual rate set by the super admin in CRM → settings/fx_rates { mode: 'manual', usdEgp, kwdEgp? }
//   2. Live daily rate from /api/fx (open.er-api.com, cached 6h at the edge)
//   3. Last good rate cached in this browser
//   4. None → conversion hidden, EGP only
// =============================================================

import { subscribeToSettings } from '../firebaseLazy.js';

export const CURRENCY_META = {
  EGP: { code: 'EGP', flag: '🇪🇬', symbol_ar: 'ج.م', symbol_en: 'EGP', name_ar: 'جنيه مصري', name_en: 'Egyptian Pound' },
  SAR: { code: 'SAR', flag: '🇸🇦', symbol_ar: 'ر.س', symbol_en: 'SAR', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal' },
  AED: { code: 'AED', flag: '🇦🇪', symbol_ar: 'د.إ', symbol_en: 'AED', name_ar: 'درهم إماراتي', name_en: 'UAE Dirham' },
  KWD: { code: 'KWD', flag: '🇰🇼', symbol_ar: 'د.ك', symbol_en: 'KWD', name_ar: 'دينار كويتي', name_en: 'Kuwaiti Dinar' },
  QAR: { code: 'QAR', flag: '🇶🇦', symbol_ar: 'ر.ق', symbol_en: 'QAR', name_ar: 'ريال قطري', name_en: 'Qatari Riyal' },
  USD: { code: 'USD', flag: '🇺🇸', symbol_ar: '$', symbol_en: 'USD', name_ar: 'دولار أمريكي', name_en: 'US Dollar' }
};
export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_META);

// Official fixed pegs (units per 1 USD). KWD floats against a basket, so it needs a live or manual rate.
const USD_PEGS = { SAR: 3.75, AED: 3.6725, QAR: 3.64 };

const CACHE_KEY = 'oneline_fx_cache_v1';
const LIVE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

let manual = null;   // { usdEgp, kwdEgp, updatedAt }
let live = null;     // { perUsd, updatedAt, source, fetchedAt }
const listeners = new Set();

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.perUsd?.EGP > 0 ? parsed : null;
  } catch {
    return null;
  }
};
const writeCache = (v) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch { /* storage blocked */ }
};

const toIso = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
  return null;
};

/** Resolved rates: units of each currency per 1 USD, plus provenance. */
export function getFxState() {
  if (manual?.usdEgp > 0) {
    const perUsd = { USD: 1, EGP: manual.usdEgp, ...USD_PEGS };
    if (manual.kwdEgp > 0) perUsd.KWD = manual.usdEgp / manual.kwdEgp;
    else if (live?.perUsd?.KWD) perUsd.KWD = live.perUsd.KWD;
    return { perUsd, updatedAt: manual.updatedAt, source: 'manual', ready: true };
  }
  if (live?.perUsd?.EGP > 0) {
    return { perUsd: { USD: 1, ...live.perUsd }, updatedAt: live.updatedAt, source: live.source || 'live', ready: true };
  }
  return { perUsd: null, updatedAt: null, source: null, ready: false };
}

export function isCurrencyAvailable(code) {
  if (code === 'EGP') return true;
  const { perUsd } = getFxState();
  return Boolean(perUsd && perUsd[code] > 0);
}

/** EGP amount → amount in `code` (null when no rate is known). */
export function convertFromEgp(amountEgp, code) {
  const n = Number(amountEgp);
  if (!Number.isFinite(n)) return null;
  if (code === 'EGP') return n;
  const { perUsd } = getFxState();
  if (!perUsd || !(perUsd[code] > 0) || !(perUsd.EGP > 0)) return null;
  return (n / perUsd.EGP) * perUsd[code];
}

/** How many EGP one unit of `code` buys, for the rate badge. */
export function egpPerUnit(code) {
  const { perUsd } = getFxState();
  if (!perUsd || !(perUsd[code] > 0)) return null;
  return perUsd.EGP / perUsd[code];
}

const roundFx = (v) => {
  const abs = Math.abs(v);
  if (abs >= 100000) return Math.round(v / 100) * 100;
  if (abs >= 1000) return Math.round(v / 10) * 10;
  if (abs >= 100) return Math.round(v);
  return Math.round(v * 10) / 10;
};

/** "≈ 75,400 ر.س" style string, or '' when the currency is EGP or unavailable. */
export function formatApprox(amountEgp, code, lang = 'ar') {
  if (!code || code === 'EGP') return '';
  const v = convertFromEgp(amountEgp, code);
  if (v === null) return '';
  const meta = CURRENCY_META[code];
  const num = roundFx(v).toLocaleString('en-US');
  return lang === 'ar' ? `≈ ${num} ${meta.symbol_ar}` : `≈ ${meta.symbol_en} ${num}`;
}

export function subscribeFx(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const notify = () => listeners.forEach((fn) => { try { fn(getFxState()); } catch { /* listener error */ } });

async function fetchLive() {
  // Production: our edge-cached route. Dev (no /api routes): the same public source directly.
  const urls = import.meta.env?.DEV
    ? ['https://open.er-api.com/v6/latest/USD']
    : ['/api/fx', 'https://open.er-api.com/v6/latest/USD'];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { accept: 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json();
      let perUsd = data?.perUsd;
      let updatedAt = data?.updatedAt;
      if (!perUsd && data?.rates) {
        perUsd = {};
        for (const c of ['EGP', 'SAR', 'AED', 'KWD', 'QAR']) perUsd[c] = Number(data.rates[c]);
        updatedAt = data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString() : new Date().toISOString();
      }
      if (perUsd?.EGP > 0) {
        return { perUsd, updatedAt, source: 'open.er-api.com', fetchedAt: Date.now() };
      }
    } catch { /* try next source */ }
  }
  return null;
}

let initialized = false;
let unsubSettings = null;

/** Starts rate loading once per page; safe to call repeatedly. */
export function initFxRates() {
  if (initialized) return () => {};
  initialized = true;

  live = readCache();
  if (live) notify();

  const stale = !live || (Date.now() - (live.fetchedAt || 0)) > LIVE_MAX_AGE_MS;
  if (stale) {
    fetchLive().then((fresh) => {
      if (fresh) {
        live = fresh;
        writeCache(fresh);
        notify();
      }
    });
  }

  unsubSettings = subscribeToSettings('fx_rates', (data) => {
    if (data?.mode === 'manual' && Number(data.usdEgp) > 0) {
      manual = { usdEgp: Number(data.usdEgp), kwdEgp: Number(data.kwdEgp) || 0, updatedAt: toIso(data.updatedAt) };
    } else {
      manual = null;
    }
    notify();
  });

  return () => {
    if (typeof unsubSettings === 'function') unsubSettings();
    initialized = false;
  };
}
