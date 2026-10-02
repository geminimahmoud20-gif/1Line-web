// The Content-Security-Policy in vercel.json allows index.html's inline scripts by hash. Editing one
// of them changes its hash, so this fails until the new hash is copied into vercel.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const read = (f) => fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
const sha = (s) => `'sha256-${crypto.createHash('sha256').update(s).digest('base64')}'`;

const cspHeader = () => {
  for (const rule of JSON.parse(read('vercel.json')).headers) {
    const h = rule.headers.find((x) => /^Content-Security-Policy(-Report-Only)?$/.test(x.key));
    if (h) return { source: rule.source, policy: h.value };
  }
  return null;
};
const directive = (policy, name) => (policy.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) || '').split(/\s+/).slice(1);

test('every inline script and inline event handler in index.html is allowed by hash', () => {
  const { policy } = cspHeader();
  const scriptSrc = directive(policy, 'script-src');
  const html = read('index.html');
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="(?:application\/ld\+json|module)")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const handlers = [...html.matchAll(/\son[a-z]+="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(inline.length > 0, 'expected inline scripts in index.html');
  for (const s of inline) assert.ok(scriptSrc.includes(sha(s)), `inline script not in script-src (new hash ${sha(s)}):\n${s.trim().slice(0, 80)}`);
  if (handlers.length) assert.ok(scriptSrc.includes("'unsafe-hashes'"), 'inline handlers need unsafe-hashes');
  for (const h of handlers) assert.ok(scriptSrc.includes(sha(h)), `inline handler "${h}" not in script-src (hash ${sha(h)})`);
  assert.ok(!scriptSrc.includes("'unsafe-inline'") && !scriptSrc.includes("'unsafe-eval'"), 'script-src must not allow arbitrary inline code');
});

test('the policy lets the services the site depends on through, and spares the service worker', () => {
  const { source, policy } = cspHeader();
  assert.match(source, /sw\\?\.js/, 'sw.js must be excluded from the page CSP');
  for (const host of ['https://*.googleapis.com', 'https://www.google.com']) assert.ok(directive(policy, 'connect-src').includes(host), `connect-src lacks ${host}`);
  for (const host of ['https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/']) assert.ok(directive(policy, 'script-src').includes(host), `script-src lacks ${host} (App Check)`);
  assert.ok(directive(policy, 'object-src').includes("'none'"));
  assert.ok(directive(policy, 'frame-ancestors').includes("'self'"));
});
