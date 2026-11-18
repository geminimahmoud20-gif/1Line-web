// =============================================================
//  Vercel Function: /sitemap.xml (vercel.json rewrite), built from the live catalog so a listing
//  published after the last deploy, and the search pages that depend on it
//  (/sohag/apartments-for-sale…), are offered to search engines straight away.
//  Data: /api/catalog (CDN cached), so this adds no database reads; the response is itself cached
//  for an hour. If the catalog can't be read, the copy the build made (/sitemap-build.xml) is served.
// =============================================================
import { isPublicListing, isPublicProject, newestFirst } from '../src/utils/seoShell.js';
import { sitemapUrls, renderSitemap } from '../src/utils/sitemapXml.js';

const SITE_URL = (process.env.SITE_URL || 'https://www.1lineestate.com').replace(/\/$/, '');
const xml = (body, cache) => new Response(body, { status: 200, headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': cache } });

export async function GET(request) {
  const origin = new URL(request.url).origin;
  try {
    const res = await fetch(`${origin}/api/catalog`);
    if (res.ok) {
      const data = await res.json();
      if (data?.ok !== false && Array.isArray(data.properties) && Array.isArray(data.projects)) {
        const listings = newestFirst(data.properties.filter(isPublicListing));
        const projects = data.projects.filter(isPublicProject);
        return xml(renderSitemap(SITE_URL, sitemapUrls({ listings, projects })), 'public, s-maxage=3600, stale-while-revalidate=86400');
      }
    }
  } catch (err) {
    console.error('sitemap: catalog unavailable:', err?.message || err);
  }
  try {
    const fallback = await fetch(`${origin}/sitemap-build.xml`);
    if (fallback.ok) return xml(await fallback.text(), 'public, s-maxage=300');
  } catch { /* nothing to serve */ }
  return new Response('', { status: 503, headers: { 'cache-control': 'no-store', 'retry-after': '60' } });
}
