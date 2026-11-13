// =============================================================
//  Vercel Function: the HTML for /properties/<id> and /projects/<id> that the build had no shell
//  for (added or approved after the last deploy), and for /demands/<id> (a shared buyer request). Same page as the build's shells
//  (src/utils/seoShell.js): head tags, JSON-LD and the page's text inside #root, so search engines
//  read a new listing right away instead of waiting for the next deploy.
//    GET ?kind=property|project&id=…   (vercel.json rewrites; built shells are served first)
//    GET ?kind=landing&slug=…&area=…   a search page (/sohag/apartments-for-sale/new-sohag) that
//                                      has listings but no built shell yet; empty ones stay the app
//  Data: /api/catalog (CDN cached), so this adds no database reads. Anything missing → the
//  plain app (app.html), exactly what these URLs served before.
// =============================================================
import { buildPropertyShell, buildProjectShell, buildDemandShell, buildLandingShell, isPublicListing, isPublicProject } from '../src/utils/seoShell.js';
import { parseLanding, landingListings } from '../src/utils/seoLanding.js';
import { decodeFields } from './_catalog-core.js';

// public_demands is readable by anyone (firestore.rules): the site's own web key reads one request
const FIRESTORE_DOC = 'https://firestore.googleapis.com/v1/projects/line-c9601/databases/(default)/documents';
const WEB_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyDPgFF3temb0pgQfSbycUj3DMkZdzcNGRs';

const SITE_URL = (process.env.SITE_URL || 'https://www.1lineestate.com').replace(/\/$/, '');
const html = (body, cache) => new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache } });

export async function GET(request) {
  const url = new URL(request.url);
  const kind = ['project', 'demand', 'landing'].includes(url.searchParams.get('kind')) ? url.searchParams.get('kind') : 'property';
  const id = url.searchParams.get('id') || '';
  const appRes = await fetch(`${url.origin}/app.html`).catch(() => null);
  const template = appRes?.ok ? await appRes.text() : '';
  if (!template) return new Response('', { status: 503, headers: { 'cache-control': 'no-store', 'retry-after': '5' } });
  const plain = () => html(template, 'public, s-maxage=60');

  if (kind === 'landing') {
    const slug = url.searchParams.get('slug') || '';
    const areaSlug = url.searchParams.get('area') || '';
    if (!/^[\w-]{1,60}$/.test(slug) || (areaSlug && !/^[\w-]{1,60}$/.test(areaSlug))) return plain();
    const page = parseLanding(slug, areaSlug);
    if (!page) return plain();
    try {
      const res = await fetch(`${url.origin}/api/catalog`);
      if (!res.ok) return plain();
      const data = await res.json();
      const listings = (Array.isArray(data.properties) ? data.properties : []).filter(isPublicListing);
      // A page with nothing to list stays the plain app: thin pages are not offered to search engines
      if (!landingListings(listings, page.kind, page.area).length) return plain();
      return html(buildLandingShell(template, page, listings, SITE_URL), 'public, s-maxage=600, stale-while-revalidate=86400');
    } catch (err) {
      console.error('page-shell landing failed:', err?.message || err);
      return plain();
    }
  }

  if (!/^[\w-]{1,80}$/.test(id)) return plain();

  if (kind === 'demand') {
    try {
      const res = await fetch(`${FIRESTORE_DOC}/public_demands/${encodeURIComponent(id)}?key=${WEB_KEY}`);
      if (!res.ok) return plain();
      const doc = await res.json();
      const demand = { ...decodeFields(doc.fields), id };
      if ((demand.status || 'published') !== 'published') return plain();
      return html(buildDemandShell(template, demand, SITE_URL), 'public, s-maxage=600, stale-while-revalidate=86400');
    } catch (err) {
      console.error('page-shell demand failed:', err?.message || err);
      return plain();
    }
  }

  try {
    const res = await fetch(`${url.origin}/api/catalog`);
    if (!res.ok) return plain();
    const data = await res.json();
    const items = kind === 'project' ? data.projects : data.properties;
    const item = (Array.isArray(items) ? items : []).find((x) => String(x?.id) === id);
    if (!item || !(kind === 'project' ? isPublicProject(item) : isPublicListing(item))) return plain();
    const page = kind === 'project' ? buildProjectShell(template, item, SITE_URL) : buildPropertyShell(template, item, SITE_URL, Array.isArray(data.properties) ? data.properties : []);
    return html(page, 'public, s-maxage=600, stale-while-revalidate=86400');
  } catch (err) {
    console.error('page-shell failed:', err?.message || err);
    return plain();
  }
}
