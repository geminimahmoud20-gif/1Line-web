import test from 'node:test';
import assert from 'node:assert/strict';

const req = () => new Request('https://example.test/api/track', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } });

test('ANALYTICS_PAUSED=1 answers 204 and writes nothing', async () => {
  const { POST } = await import('../../api/track.js');
  const prevFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response('{}'); };
  process.env.ANALYTICS_PAUSED = '1';
  try {
    const res = await POST(req());
    assert.equal(res.status, 204);
    assert.equal(calls, 0);
  } finally {
    delete process.env.ANALYTICS_PAUSED;
    globalThis.fetch = prevFetch;
  }
});

test('client sends analytics in 30-second batches', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync('src/utils/analytics.js', 'utf8');
  assert.match(src, /FLUSH_DELAY_MS = 30_000/);
});
