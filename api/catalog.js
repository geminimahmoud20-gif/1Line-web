// =============================================================
//  Vercel Function: the public catalog (properties + projects) in one cached response.
//    GET → { ok: true, at, properties: [...], projects: [...], site: {...} | null }
//  `site` is settings/site_cms (contact, social, FAQ, testimonials, page SEO); the client cleans it.
//  Visitors load this instead of opening a live Firestore listener each, so a visit costs
//  no Firestore reads: Vercel's CDN serves the same copy to everyone and the function reads
//  Firestore at most about once a minute per region. The CRM keeps its live listener.
//
//  Environment (Vercel → Settings → Environment Variables):
//    FIREBASE_SERVICE_ACCOUNT — optional here; without it the (publicly readable) collections are
//    read anonymously, which stops working once App Check is enforced. The site falls back to
//    the live listener whenever this route fails.
// =============================================================
import { SignJWT, importPKCS8 } from 'jose';
import { CATALOG_COLLECTIONS, PAGE_SIZE, MAX_DOCS, toCatalogItems, decodeFields } from './_catalog-core.js';

const FRESH_SECONDS = 60;
const STALE_SECONDS = 600;

const json = (status, body, cache = 'no-store') => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache }
});

const serviceAccount = () => {
  try { return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ''); } catch { return null; }
};

let cached = { token: null, exp: 0 };
async function accessToken(sa) {
  if (cached.token && Date.now() < cached.exp - 60_000) return cached.token;
  const key = await importPKCS8(sa.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email).setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now).setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const { access_token: token, expires_in: ttl } = await res.json();
  cached = { token, exp: Date.now() + (ttl || 3600) * 1000 };
  return token;
}

async function listCollection(base, docRoot, name, headers) {
  const documents = [];
  let pageToken = '';
  do {
    const url = `${base}/v1/${docRoot}/${name}?pageSize=${PAGE_SIZE}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`${name} ${res.status}`);
    const page = await res.json();
    documents.push(...(page.documents || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken && documents.length < MAX_DOCS);
  return toCatalogItems(documents);
}

// One settings document; a missing or unreadable one is not an error for the catalog
async function readSiteSettings(base, docRoot, headers) {
  try {
    const res = await fetch(`${base}/v1/${docRoot}/settings/site_cms`, { headers });
    if (!res.ok) return null;
    const doc = await res.json();
    return decodeFields(doc.fields);
  } catch {
    return null;
  }
}

export async function GET() {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  const sa = serviceAccount();
  const projectId = sa?.project_id || process.env.FIREBASE_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID || 'line-c9601';
  const docRoot = `projects/${projectId}/databases/(default)/documents`;
  const base = emulator ? `http://${emulator}` : 'https://firestore.googleapis.com';
  try {
    const headers = emulator
      ? { authorization: 'Bearer owner' }
      : (sa?.private_key && sa?.client_email ? { authorization: `Bearer ${await accessToken(sa)}` } : {});
    const [[properties, projects], site] = await Promise.all([
      Promise.all(CATALOG_COLLECTIONS.map((name) => listCollection(base, docRoot, name, headers))),
      readSiteSettings(base, docRoot, headers)
    ]);
    return json(200, { ok: true, at: new Date().toISOString(), properties, projects, site },
      `public, max-age=0, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`);
  } catch (err) {
    console.error('catalog failed:', err?.message || err);
    return json(502, { ok: false });
  }
}
