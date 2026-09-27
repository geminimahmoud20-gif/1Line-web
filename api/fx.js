// =============================================================
//  Vercel Function: indicative exchange rates for the expat currency converter.
//  Source: open.er-api.com (free, no key, daily mid-market rates).
//  Cached at the edge for 6 hours so visitors never hit the upstream directly.
//  The site always contracts in EGP — these figures are shown with "≈" only.
// =============================================================

const UPSTREAM = 'https://open.er-api.com/v6/latest/USD';
const CODES = ['EGP', 'SAR', 'AED', 'KWD', 'QAR'];

const json = (status, body, cache) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json',
    'cache-control': cache || 'no-store'
  }
});

export async function GET() {
  try {
    const res = await fetch(UPSTREAM, { headers: { accept: 'application/json' } });
    if (!res.ok) return json(502, { error: 'upstream-unavailable' });
    const data = await res.json();
    if (data?.result !== 'success' || !data.rates) return json(502, { error: 'upstream-invalid' });

    // Units of each currency per 1 USD
    const perUsd = {};
    for (const code of CODES) {
      const v = Number(data.rates[code]);
      if (!Number.isFinite(v) || v <= 0) return json(502, { error: `missing-${code}` });
      perUsd[code] = v;
    }

    return json(200, {
      perUsd,
      updatedAt: data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString() : new Date().toISOString(),
      source: 'open.er-api.com'
    }, 'public, s-maxage=21600, stale-while-revalidate=86400');
  } catch {
    return json(502, { error: 'upstream-error' });
  }
}
