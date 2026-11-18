// =============================================================
//  Vercel Function: forwards a lead / visit-request / contact click to Meta's Conversions API.
//    POST { event_name, event_id, event_source_url, fbp?, fbc?, custom_data?, pixel_id? }
//  (sent by src/utils/metaPixel.js next to the browser Pixel event; the shared event_id keeps
//  Meta from counting it twice). Answers 204 in normal cases so the page never shows an error.
//
//  Environment (Vercel → Settings → Environment Variables):
//    META_CAPI_TOKEN        — Events Manager → Settings → Conversions API → Generate access token
//    META_PIXEL_ID          — optional: the Pixel ID (otherwise the one set in the CRM is used)
//    META_TEST_EVENT_CODE   — optional: a "Test events" code, to see events arrive in Events Manager
//  Without the token the route answers 503 and the site carries on normally.
// =============================================================
import { buildCapiEvent, pickPixelId, CAPI_VERSION, MAX_CAPI_BODY } from './_capi-core.js';
import { createRateLimiter, clientIp } from './_rate-limit.js';

const limited = createRateLimiter({ max: 120, windowMs: 10 * 60 * 1000 });
const noContent = (status = 204) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

const siteHosts = (request) => {
  const hosts = [];
  try { hosts.push(new URL(request.url).host); } catch { /* ignore */ }
  try { if (process.env.SITE_URL) hosts.push(new URL(process.env.SITE_URL).host); } catch { /* ignore */ }
  hosts.push('www.1lineestate.com', '1lineestate.com');
  return hosts;
};

export async function POST(request) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return noContent(503);
  if (limited(clientIp(request))) return noContent(429);

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_CAPI_BODY) return noContent(413);
    body = JSON.parse(text);
  } catch {
    return noContent(400);
  }

  const event = buildCapiEvent(body, {
    ip: clientIp(request),
    ua: request.headers.get('user-agent') || '',
    siteHosts: siteHosts(request)
  });
  const pixelId = pickPixelId(process.env.META_PIXEL_ID, body?.pixel_id);
  if (!event || !pixelId) return noContent();

  const payload = { data: [event] };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  try {
    const res = await fetch(`https://graph.facebook.com/${CAPI_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error('capi failed:', res.status, (await res.text()).slice(0, 300));
      return noContent(502);
    }
  } catch (err) {
    console.error('capi failed:', err?.message || err);
    return noContent(502);
  }
  return noContent();
}
