// Local stand-in for Vercel during the audit: serves a build (DIST) with SPA fallback and runs the
// real /api/catalog handler against the Firestore emulator. Other /api routes answer 503, which is
// what production does when their secrets are not configured.
//   DIST=path/to/emulator-build PORT=4175 node scripts/release-audit/server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const { GET: catalog } = await import('../../api/catalog.js');
const root = path.resolve(process.env.DIST || 'dist-journey');
const port = Number(process.env.PORT || 4175);
const types = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.xml': 'application/xml',
  '.txt': 'text/plain', '.mp4': 'video/mp4', '.ico': 'image/x-icon'
};

http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/api/catalog')) {
      const r = await catalog(new Request(`http://local${req.url}`));
      res.writeHead(r.status, Object.fromEntries(r.headers));
      return res.end(await r.text());
    }
    if (req.url.startsWith('/api/')) { res.writeHead(503, { 'content-type': 'application/json' }); return res.end('{"error":"not-configured"}'); }
    let p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  } catch (err) {
    res.writeHead(500); res.end(String(err?.message || err));
  }
}).listen(port, '127.0.0.1', () => console.log(`release-audit server on ${port} serving ${root}`));
