// =============================================================
//  Vercel Function: the HTML for /properties/<id> and /projects/<id> that the build had no shell
//  for (added or approved after the last deploy). Same page as the build's shells
//  (src/utils/seoShell.js): head tags, JSON-LD and the page's text inside #root, so search engines
//  read a new listing right away instead of waiting for the next deploy.
//    GET ?kind=property|project&id=…   (vercel.json rewrites; built shells are served first)
//  Data: /api/catalog (CDN cached), so this adds no database reads. Anything missing → the
//  plain app (app.html), exactly what these URLs served before.
// =============================================================
import { buildPropertyShell, buildProjectShell, isPublicListing, isPublicProject } from '../src/utils/seoShell.js';

const SITE_URL = (process.env.SITE_URL || 'https://www.1lineestate.com').replace(/\/$/, '');
const html = (body, cache) => new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache } });

export async function GET(request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') === 'project' ? 'project' : 'property';
  const id = url.searchParams.get('id') || '';
  const appRes = await fetch(`${url.origin}/app.html`).catch(() => null);
  const template = appRes?.ok ? await appRes.text() : '';
  if (!template) return new Response('', { status: 503, headers: { 'cache-control': 'no-store', 'retry-after': '5' } });
  const plain = () => html(template, 'public, s-maxage=60');
  if (!/^[\w-]{1,80}$/.test(id)) return plain();

  try {
    const res = await fetch(`${url.origin}/api/catalog`);
    if (!res.ok) return plain();
    const data = await res.json();
    const items = kind === 'project' ? data.projects : data.properties;
    const item = (Array.isArray(items) ? items : []).find((x) => String(x?.id) === id);
    if (!item || !(kind === 'project' ? isPublicProject(item) : isPublicListing(item))) return plain();
    const page = kind === 'project' ? buildProjectShell(template, item, SITE_URL) : buildPropertyShell(template, item, SITE_URL);
    return html(page, 'public, s-maxage=600, stale-while-revalidate=86400');
  } catch (err) {
    console.error('page-shell failed:', err?.message || err);
    return plain();
  }
}
