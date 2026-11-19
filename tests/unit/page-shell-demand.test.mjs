import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GET } from '../../api/page-shell.js';

const TEMPLATE = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

const withFetch = async (catalog, run) => {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith('/app.html')) return new Response(TEMPLATE, { status: 200 });
    if (String(url).endsWith('/api/catalog')) return new Response(JSON.stringify(catalog), { status: 200 });
    throw new Error(`unexpected fetch ${url}`);
  };
  try { return await run(calls); } finally { globalThis.fetch = real; }
};

const get = (id) => GET(new Request(`https://www.1lineestate.com/api/page-shell?kind=demand&id=${id}`));

test('a published request page is built from the cached catalog, with no direct Firestore read', async () => {
  const demands = [{ id: 'd1', status: 'published', type: 'apartment', area_ar: 'سوهاج الجديدة', budget: 3000000, text_ar: 'شقة تشطيب كامل' }];
  await withFetch({ demands }, async (calls) => {
    const res = await get('d1');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /سوهاج الجديدة/);
    assert.ok(!calls.some((u) => u.includes('firestore.googleapis.com')), calls.join(', '));
  });
});

test('an unknown or unpublished request falls back to the plain app', async () => {
  const demands = [{ id: 'd2', status: 'hidden', text_ar: 'x' }];
  await withFetch({ demands }, async () => {
    for (const id of ['d2', 'nope']) assert.equal(await (await get(id)).text(), TEMPLATE);
  });
  await withFetch({}, async () => assert.equal(await (await get('d1')).text(), TEMPLATE), 'a catalog with no demands list');
});
