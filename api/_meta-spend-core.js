// =============================================================
//  What each Facebook / Instagram campaign and ad cost, from the Meta Marketing API (the «insights» of the
//  ad account), turned into the {key: EGP} the CRM's «تقرير الحملات» keeps per campaign. Used by
//  api/ads-spend.js. A Meta campaign matches a report row when its name, made into a link slug the way the
//  link builder does, equals the utm_campaign (ad: utm_content). Pure apart from the injected `fetchImpl`.
//  Tests: tests/unit/meta-spend.test.mjs
// =============================================================
import { slugify } from '../src/utils/utmLinks.js';

export const GRAPH = 'https://graph.facebook.com/v21.0';
const MAX_PAGES = 20;

/** Error with a code the route turns into a message: 'not-configured' | 'bad-token' | 'meta-error' */
const fail = (code, detail = '') => Object.assign(new Error(`${code}${detail ? `: ${detail}` : ''}`), { code });

const accountPath = (id) => `act_${String(id).replace(/^act_/, '').replace(/\D/g, '')}`;

/** All pages of the account's insights (lifetime spend per ad: campaign, ad, spend, currency) */
export async function fetchAdInsights({ accountId, token, fetchImpl = fetch }) {
  if (!accountId || !token) throw fail('not-configured');
  const params = new URLSearchParams({ level: 'ad', fields: 'campaign_id,campaign_name,ad_name,spend,account_currency', date_preset: 'maximum', limit: '500' });
  let url = `${GRAPH}/${accountPath(accountId)}/insights?${params}`;
  const rows = [];
  for (let page = 0; url && page < MAX_PAGES; page += 1) {
    const res = await fetchImpl(url, { headers: { authorization: `Bearer ${token}` } });
    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) {
      const code = body?.error?.code;
      throw fail(code === 190 || res.status === 401 ? 'bad-token' : 'meta-error', String(body?.error?.message || res.status).slice(0, 160));
    }
    rows.push(...(Array.isArray(body?.data) ? body.data : []));
    url = body?.paging?.next || '';
  }
  return rows;
}

/**
 * { currency, campaigns: { slug: egp }, ads: { 'slug::ad': egp }, names: { slug: 'Original name' } } from the rows.
 * Amounts are rounded pounds; rows without a name or with no spend are dropped.
 */
export function spendFromInsights(rows = []) {
  const campaigns = {};
  const ads = {};
  const names = {};
  const metas = new Map(); // every campaign with spend, by Meta's own id, whatever its name's script
  const currencies = new Set();
  const skipped = new Set(); // campaigns whose names have no Latin letters or digits: they can't match a link
  for (const r of rows) {
    const amount = Number(r?.spend);
    const camp = slugify(r?.campaign_name || '');
    if (r?.campaign_name && amount > 0) {
      const id = String(r.campaign_id || r.campaign_name).slice(0, 64);
      const m = metas.get(id) || { id, name: String(r.campaign_name).slice(0, 80), spend: 0 };
      m.spend += amount;
      metas.set(id, m);
    }
    if (r?.campaign_name && !camp && amount > 0) skipped.add(String(r.campaign_name).slice(0, 80));
    if (!camp || !(amount > 0)) continue;
    if (r.account_currency) currencies.add(String(r.account_currency).toUpperCase());
    campaigns[camp] = (campaigns[camp] || 0) + amount;
    names[camp] = String(r.campaign_name).slice(0, 80);
    const ad = slugify(r?.ad_name || '');
    if (ad) ads[`${camp}::${ad}`] = (ads[`${camp}::${ad}`] || 0) + amount;
  }
  const round = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Math.round(v)]));
  const metaCampaigns = [...metas.values()].map((m) => ({ ...m, spend: Math.round(m.spend) })).filter((m) => m.spend > 0);
  return { currency: currencies.size === 1 ? [...currencies][0] : currencies.size ? 'MIXED' : '', campaigns: round(campaigns), ads: round(ads), names, skipped: [...skipped], metaCampaigns };
}

/**
 * What to do with a pull given the report's known keys: amounts to save, and the campaigns that matched nothing.
 * `links` ({ metaCampaignId: reportCampaignKey }) is the manual pairing for campaigns whose names can't match
 * a link (Arabic names, or a name that differs from the utm_campaign): their spend goes to the paired campaign.
 */
export function applyPull(pull, { campaignKeys = [], adKeys = [], links = {} } = {}) {
  const known = new Set(campaignKeys);
  const knownAds = new Set(adKeys);
  const amounts = {};
  for (const [k, v] of Object.entries(pull.campaigns || {})) if (known.has(k)) amounts[k] = v;
  for (const [k, v] of Object.entries(pull.ads || {})) if (knownAds.has(k)) amounts[k] = v;
  const linked = [];
  let unmatched;
  if (Array.isArray(pull.metaCampaigns)) {
    unmatched = [];
    for (const m of pull.metaCampaigns) {
      const slug = slugify(m.name);
      if (slug && known.has(slug)) continue; // matched by its name already
      const target = links?.[m.id];
      if (target && known.has(target)) {
        amounts[target] = (amounts[target] || 0) + m.spend;
        linked.push({ id: m.id, name: m.name, spend: m.spend, target });
      } else {
        unmatched.push({ id: m.id, slug, name: m.name, spend: m.spend });
      }
    }
  } else {
    unmatched = Object.keys(pull.campaigns || {}).filter((k) => !known.has(k)).map((k) => ({ slug: k, name: pull.names?.[k] || k, spend: pull.campaigns[k] }));
  }
  return { amounts, matched: Object.keys(amounts).filter((k) => !k.includes('::')).length, unmatched, linked };
}
