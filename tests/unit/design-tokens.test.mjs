// Guards for the 1Line design system (src/styles/tokens.css + src/components/ui).
// - every role token exists in light and dark, and text pairs pass WCAG AA (4.5:1)
// - raw colours live in tokens.css only; the UI kit uses tokens for colour and radius
// - the old CRM code may only shrink: hard-coded colours, inline styles and !important are capped
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

const tokens = read('src/styles/tokens.css');
const block = (selector) => {
  const start = tokens.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} block missing`);
  return tokens.slice(start, tokens.indexOf('\n}', start));
};
const vars = (css) => Object.fromEntries([...css.matchAll(/(--ui-[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
const light = vars(block(':root'));
const dark = { ...light, ...vars(block("[data-theme='dark']")) };

const resolve = (theme, name, seen = new Set()) => {
  const v = theme[name];
  assert.ok(v, `${name} not defined`);
  const ref = v.match(/^var\((--ui-[a-z0-9-]+)\)$/);
  if (!ref) return v;
  assert.ok(!seen.has(ref[1]), `cycle at ${name}`);
  seen.add(name);
  return resolve(theme, ref[1], seen);
};
const lum = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const ROLES = [
  'bg', 'surface', 'surface-2', 'line', 'line-strong', 'text', 'text-2', 'text-3', 'primary', 'primary-hover', 'on-primary',
  'primary-tint', 'primary-text', 'accent', 'accent-text', 'accent-tint', 'success', 'success-tint', 'warning', 'warning-tint',
  'danger', 'danger-tint', 'info', 'info-tint', 'on-danger'
].map((r) => `--ui-${r}`);

// [foreground, background] pairs that carry text
const TEXT_PAIRS = [
  ['text', 'surface'], ['text', 'bg'], ['text-2', 'surface'], ['text-2', 'surface-2'], ['text-3', 'surface'], ['text-3', 'bg'], ['text-3', 'surface-2'],
  ['on-primary', 'primary'], ['on-primary', 'primary-hover'], ['primary-text', 'primary-tint'], ['accent-text', 'accent-tint'], ['accent-text', 'surface'],
  ['success', 'success-tint'], ['warning', 'warning-tint'], ['danger', 'danger-tint'], ['info', 'info-tint'], ['on-danger', 'danger'],
  ['success', 'surface'], ['warning', 'surface'], ['danger', 'surface'], ['info', 'surface']
].map(([f, b]) => [`--ui-${f}`, `--ui-${b}`]);

test('every role token is defined in both themes and resolves to a colour', () => {
  for (const theme of [light, dark]) {
    for (const role of ROLES) assert.match(resolve(theme, role), /^#[0-9A-Fa-f]{6}$/, `${role} must resolve to a hex colour`);
  }
});

test('text on every surface it is used on passes WCAG AA (4.5:1) in light and dark', () => {
  for (const [name, theme] of [['light', light], ['dark', dark]]) {
    for (const [f, b] of TEXT_PAIRS) {
      const r = ratio(resolve(theme, f), resolve(theme, b));
      assert.ok(r >= 4.5, `${name}: ${f} on ${b} is ${r.toFixed(2)}:1`);
    }
  }
});

test('the light palette stays at 24 colours or fewer', () => {
  const raw = new Set(Object.values(light).filter((v) => /^#[0-9A-Fa-f]{6}$/.test(v)).map((v) => v.toUpperCase()));
  assert.ok(raw.size <= 24, `light palette has ${raw.size} colours`);
});

test('the UI kit uses tokens only: no raw colours, radii come from --ui-r-*', () => {
  const files = walk('src/components/ui').concat(['src/components/crm/UiKitPanel.jsx', 'src/components/crm/ui-kit.css']);
  for (const f of files) {
    const src = read(f);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(src), `${f}: raw colour — add a token to src/styles/tokens.css instead`);
    for (const m of src.matchAll(/border-radius:\s*([^;}]+)/g)) {
      assert.match(m[1].trim(), /^(var\(--ui-r-[a-z]+\)|inherit|calc\(var\(--ui-r-[a-z]+\)[^)]*\)|0)$/, `${f}: border-radius ${m[1]} — use --ui-r-sm|md|lg|full`);
    }
  }
});

// Ratchet for the CRM before the redesign (docs/crm-redesign/AUDIT.md). Lower these numbers as screens
// move to src/components/ui; raising them means new code skipped the design system.
const CRM_LIMITS = { hex: 296, inlineStyle: 1424, important: 315 };

test('old CRM code does not gain hard-coded colours, inline styles or !important', () => {
  const files = walk('src/components/crm').filter((f) => /\.(jsx|css)$/.test(f) && !/UiKitPanel|ui-kit/.test(f));
  let hex = 0; let inlineStyle = 0; let important = 0;
  for (const f of files) {
    const s = read(f);
    hex += (s.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || []).length;
    inlineStyle += (s.match(/style=\{\{/g) || []).length;
    important += (s.match(/!important/g) || []).length;
  }
  assert.ok(hex <= CRM_LIMITS.hex, `CRM hex colours ${hex} > ${CRM_LIMITS.hex}: use var(--ui-*) tokens`);
  assert.ok(inlineStyle <= CRM_LIMITS.inlineStyle, `CRM style={{}} ${inlineStyle} > ${CRM_LIMITS.inlineStyle}: use src/components/ui or a class`);
  assert.ok(important <= CRM_LIMITS.important, `CRM !important ${important} > ${CRM_LIMITS.important}`);
});

// One typeface across the site and the CRM (owner's choice: Cairo). index.html loads only Cairo, and
// no stylesheet or component names another family; numbers use tabular figures instead of monospace.
test('Cairo is the only font the site loads or names', () => {
  const html = read('index.html');
  const families = [...html.matchAll(/fonts\.googleapis\.com\/css2\?([^"]+)/g)].flatMap((m) => [...m[1].matchAll(/family=([^:&]+)/g)].map((f) => f[1]));
  assert.ok(families.length > 0 && families.every((f) => f === 'Cairo'), `index.html loads ${families.join(', ')}`);
  const banned = /(Alexandria|Plus Jakarta Sans|IBM Plex|Outfit|Playfair|Montserrat|Tajawal|Readex|Noto Kufi|\bInter\b|monospace)/;
  const files = walk('src').filter((f) => /\.(css|jsx|js)$/.test(f));
  for (const f of files) {
    for (const m of read(f).matchAll(/font-?[fF]amily\s*[:=]\s*([^;\n}]+)/g)) {
      assert.ok(!banned.test(m[1]), `${f}: font-family ${m[1].trim()} — use var(--font-ar) / var(--ui-font) (Cairo)`);
    }
  }
  for (const f of ['src/index.css', 'src/styles/luxury-system.css', 'src/styles/mobile-polish.css', 'src/components/crm/crm-luxury.css', 'src/styles/tokens.css']) {
    for (const m of read(f).matchAll(/--(?:font-[a-z]+|crm-font|ui-font)\s*:\s*([^;]+);/g)) {
      assert.match(m[1], /^'Cairo'/, `${f}: ${m[0]}`);
    }
  }
});
