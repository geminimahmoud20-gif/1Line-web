import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist';
const files = [
  'index.html',
  'trade-in/index.html',
  'about/index.html',
  'properties/index.html',
  'commercial-hub/index.html',
  'projects/index.html',
  'market-intelligence/index.html',
  'financing/index.html',
  'privacy/index.html',
  'properties/prop-1792517248233/index.html',
  '404.html'
];

console.log('=== SEO OUTPUT VERIFICATION ===');
let allPassed = true;

for (const file of files) {
  const filePath = path.join(dist, file);
  if (!fs.existsSync(filePath)) {
    console.error(`FAIL: Missing ${file}`);
    allPassed = false;
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="(.*?)"/)?.[1];
  const ogTitle = html.match(/<meta property="og:title" content="(.*?)"/)?.[1];
  const ogUrl = html.match(/<meta property="og:url" content="(.*?)"/)?.[1];
  const twTitle = html.match(/<meta name="twitter:title" content="(.*?)"/)?.[1];
  const twCard = html.match(/<meta name="twitter:card" content="(.*?)"/)?.[1];
  const robots = html.match(/<meta name="robots" content="(.*?)"/)?.[1];
  const hasBreadcrumbs = html.includes('"@type": "BreadcrumbList"');
  const unresolved = html.match(/%[A-Z0-9_]+%/g);

  const checks = {
    canonicalHttps: canonical && canonical.startsWith('https://'),
    canonicalNoParams: canonical && !canonical.includes('?'),
    noPlaceholders: !unresolved || unresolved.length === 0,
    hasTwitterCard: Boolean(twCard),
    hasTwitterTitle: Boolean(twTitle),
    ogMatchesCanonical: ogUrl === canonical
  };

  const status = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';
  if (status === 'FAIL') allPassed = false;

  console.log(`[${status}] ${file}`);
  console.log(`  Title: ${title}`);
  console.log(`  Canonical: ${canonical}`);
  console.log(`  OG Url: ${ogUrl}`);
  console.log(`  Robots: ${robots || 'none'}`);
  console.log(`  BreadcrumbList: ${hasBreadcrumbs}`);
  console.log(`  Checks:`, checks);
  console.log('');
}

// Check sitemap.xml
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
const sitemapValidXml = sitemap.startsWith('<?xml') && sitemap.includes('</urlset>');
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
const privateInSitemap = sitemapUrls.some(u => u.includes('/crm') || u.includes('/my-account'));
console.log('=== SITEMAP VERIFICATION ===');
console.log(`Valid XML: ${sitemapValidXml}`);
console.log(`Total URLs: ${sitemapUrls.length}`);
console.log(`Private URLs in sitemap: ${privateInSitemap ? 'FAIL' : 'PASS (None)'}`);
console.log(`Contains /trade-in: ${sitemapUrls.includes('https://www.1lineestate.com/trade-in') ? 'PASS' : 'FAIL'}`);

// Check robots.txt
const robotsTxt = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
console.log('=== ROBOTS.TXT VERIFICATION ===');
console.log(`Disallow /crm: ${robotsTxt.includes('Disallow: /crm') ? 'PASS' : 'FAIL'}`);
console.log(`Disallow /my-account: ${robotsTxt.includes('Disallow: /my-account') ? 'PASS' : 'FAIL'}`);
console.log(`Sitemap directive: ${robotsTxt.includes('Sitemap: https://www.1lineestate.com/sitemap.xml') ? 'PASS' : 'FAIL'}`);

if (allPassed && sitemapValidXml && !privateInSitemap) {
  console.log('\n>>> ALL AUDIT & IMPLEMENTATION CHECKS PASSED <<<');
} else {
  console.error('\n>>> SOME CHECKS FAILED <<<');
  process.exit(1);
}
