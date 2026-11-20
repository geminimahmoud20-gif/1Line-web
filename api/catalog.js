// =============================================================
//  Vercel Function: the public catalog (properties + projects) in one cached response.
//    GET → { ok: true, at, properties: [...], projects: [...], site: {...} | null, developers: [...] }
//  `site` is settings/site_cms (contact, social, FAQ, testimonials, page SEO); `developers` is
//  settings/developers' list (the developer pages). The client cleans both.
//  Visitors load this instead of opening a live Firestore listener each, so a visit costs
//  no Firestore reads: Vercel's CDN serves the same copy to everyone and the function reads
//  Firestore at most about once every 15 minutes per region. The CRM keeps its live listener.
//
//  Environment (Vercel → Settings → Environment Variables):
//    FIREBASE_SERVICE_ACCOUNT — optional here; without it the (publicly readable) collections are
//    read anonymously, which stops working once App Check is enforced. The site falls back to
//    the live listener whenever this route fails.
// =============================================================
import { SignJWT, importPKCS8 } from 'jose';
import { CATALOG_COLLECTIONS, PAGE_SIZE, MAX_DOCS, toCatalogItems, decodeFields, siteListingsQuery, queryDocuments } from './_catalog-core.js';
import { saveLastGood, readLastGood } from './_catalog-backup.js';

// The Blob store (BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN); null when the project has none or the SDK fails to load
const blobApi = async () => {
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) return null;
  try { return await import('@vercel/blob'); } catch { return null; }
};

// Each refresh reads every listing and project document, so it is kept to about every 15 minutes
// (the free Firestore plan allows 50,000 reads a day); a stale copy may be served up to a day.
const FRESH_SECONDS = 900;
const STALE_SECONDS = 86400;
// While Firestore cannot answer, the saved copy is shared from the CDN and the database is asked again every 5 minutes
const BACKUP_FRESH_SECONDS = 300;

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
  // Without the service account the read is a visitor's: the rules allow only the listings on the site
  if (name === 'properties' && !headers.authorization) {
    const res = await fetch(`${base}/v1/${docRoot}:runQuery`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(siteListingsQuery())
    });
    if (!res.ok) throw new Error(`${name} ${res.status}`);
    return toCatalogItems(queryDocuments(await res.json()));
  }
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

// The published, contact-free demands visitors see (public_demands): inside the cached response, so a visit
// opens no Firestore listener of its own. A missing or unreadable list is not an error for the catalog.
async function readPublicDemands(base, docRoot, headers) {
  try {
    const res = await fetch(`${base}/v1/${docRoot}/public_demands?pageSize=100`, { headers });
    if (!res.ok) return [];
    const page = await res.json();
    return (page.documents || []).map((d) => ({ ...decodeFields(d.fields), id: String(d.name || '').split('/').pop() }));
  } catch {
    return [];
  }
}

// One settings document; a missing or unreadable one is not an error for the catalog
async function readSettings(base, docRoot, headers, key) {
  try {
    const res = await fetch(`${base}/v1/${docRoot}/settings/${key}`, { headers });
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
    const [[properties, projects], site, devs, demands] = await Promise.all([
      Promise.all(CATALOG_COLLECTIONS.map((name) => listCollection(base, docRoot, name, headers))),
      readSettings(base, docRoot, headers, 'site_cms'),
      readSettings(base, docRoot, headers, 'developers'),
      readPublicDemands(base, docRoot, headers)
    ]);
    const developers = Array.isArray(devs?.list) ? devs.list : [];
    const body = { ok: true, at: new Date().toISOString(), properties, projects, site, developers, demands };
    if (!emulator) await saveLastGood(body, { put: (await blobApi())?.put });
    return json(200, body, `public, max-age=0, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`);
  } catch (err) {
    console.error('catalog failed:', err?.message || err);
    // Firestore unavailable (e.g. the daily read quota used up): the last good copy, cached briefly by the CDN
    const backup = emulator ? null : await readLastGood({ head: (await blobApi())?.head });
    if (backup) {
      console.error('catalog: serving the saved copy from', backup.at);
      return json(200, backup, `public, max-age=0, s-maxage=${BACKUP_FRESH_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`);
    }
    return json(502, { ok: false });
  }
}
