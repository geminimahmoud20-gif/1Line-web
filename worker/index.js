// =============================================================
//  Cloudflare entry (wrangler.jsonc). Files in dist/ are served by Cloudflare before this runs; the
//  worker only sees what has no file:
//   - /api/*    → the same handlers Vercel runs from api/ (Request in, Response out)
//   - /media/*  → photos and videos from the R2 bucket (env.MEDIA)
//   - app pages without a prerendered shell (/crm/…, new listings…) → index.html, like vercel.json
//   - anything else → 404.html with a 404 status
//  Headers for these responses follow vercel.json, the same rules dist/_headers gives the files.
// =============================================================
import vercelConfig from '../vercel.json';
import * as catalog from '../api/catalog.js';
import * as cmsUpload from '../api/cms-upload.js';
import * as contactIntent from '../api/contact-intent.js';
import * as fx from '../api/fx.js';
import * as notify from '../api/notify.js';
import * as sellerUpload from '../api/seller-upload.js';
import * as team from '../api/team.js';
import * as track from '../api/track.js';
import { serveMedia } from '../api/_r2-core.js';
import { appRouteMatchers, headerRules, headersFor } from './routing.js';

const API = {
  '/api/catalog': catalog,
  '/api/cms-upload': cmsUpload,
  '/api/contact-intent': contactIntent,
  '/api/fx': fx,
  '/api/notify': notify,
  '/api/seller-upload': sellerUpload,
  '/api/team': team,
  '/api/track': track
};

const isAppRoute = appRouteMatchers(vercelConfig.rewrites);
const RULES = headerRules(vercelConfig.headers);

// The handlers read settings from process.env, as on Vercel
const exposeEnv = (env) => {
  if (typeof process === 'undefined') return;
  for (const [k, v] of Object.entries(env)) if (typeof v === 'string') process.env[k] = v;
};

// The handlers read the caller's address the way Vercel passes it
const withClientIp = (request) => {
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) return request;
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-for', ip);
  return new Request(request, { headers });
};

const withHeaders = (response, pathname) => {
  const out = new Response(response.body, response);
  for (const [k, v] of headersFor(RULES, pathname)) if (!out.headers.has(k)) out.headers.set(k, v);
  return out;
};

async function api(request, env, ctx, pathname) {
  const mod = API[pathname.replace(/\/+$/, '')];
  if (!mod) return Response.json({ error: 'not-found' }, { status: 404 });
  const handler = mod[request.method] || (request.method === 'HEAD' ? mod.GET : null);
  if (!handler) return new Response(null, { status: 405 });
  return handler(withClientIp(request), env, ctx);
}

async function page(request, env, pathname) {
  const appRoute = isAppRoute(pathname);
  const res = await env.ASSETS.fetch(new URL(appRoute ? '/index.html' : '/404.html', request.url));
  return new Response(res.body, { status: appRoute ? 200 : 404, headers: res.headers });
}

export default {
  async fetch(request, env, ctx) {
    exposeEnv(env);
    const { pathname } = new URL(request.url);
    try {
      if (pathname.startsWith('/api/')) return withHeaders(await api(request, env, ctx, pathname), pathname);
      if (pathname.startsWith('/media/')) {
        if (!env.MEDIA) return new Response('Not found', { status: 404 });
        return serveMedia(env.MEDIA, decodeURIComponent(pathname.slice('/media/'.length)), request);
      }
      return withHeaders(await page(request, env, pathname), pathname);
    } catch (error) {
      console.error('worker:', pathname, error?.message || error);
      return Response.json({ error: 'server-error' }, { status: 500 });
    }
  }
};
