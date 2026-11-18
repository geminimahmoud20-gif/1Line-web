import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isIosSafari, installMode } from '../../src/utils/pwaInstall.js';

test('iPhone Safari gets the Add-to-Home-Screen steps; in-app and other iOS browsers do not', () => {
  const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  assert.equal(isIosSafari(safari), true);
  assert.equal(isIosSafari(safari.replace('Version/17.4', 'CriOS/124.0')), false);
  assert.equal(isIosSafari('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS]'), false);
  assert.equal(isIosSafari('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36'), false);
  assert.equal(installMode(), null); // no window, no prompt: nothing to offer
});

test('manifest: real icon sizes, a maskable icon, id and screenshots that exist', () => {
  const m = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));
  assert.equal(m.id, '/');
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of [...m.icons, ...m.screenshots]) {
    const buf = fs.readFileSync(`public${i.src}`);
    const [w, h] = i.sizes.split('x').map(Number);
    if (i.type === 'image/png') assert.deepEqual([buf.readUInt32BE(16), buf.readUInt32BE(20)], [w, h], i.src);
    else assert.ok(buf.length > 10000, i.src);
  }
  assert.ok(m.screenshots.some((s) => s.form_factor === 'wide') && m.screenshots.some((s) => s.form_factor === 'narrow'));
});
