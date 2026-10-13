// Page × device sweep for the release audit (local build + emulators, never production).
// For every public route, and every CRM screen, on each device it measures from the live page:
// horizontal overflow (+ the element causing it), touch targets under 44px, text under 12px,
// form fields under 16px (iOS zoom), Eastern-Arabic digits, raw keys (undefined/NaN/new_sohag…),
// CLS and LCP, console errors and, when AXE_PATH is set, axe violations.
//   AUDIT_BASE=http://127.0.0.1:4175 AXE_PATH=…/axe.min.js node scripts/release-audit/sweep.mjs [public|crm|all]
import path from 'node:path';
import { loadPlaywright, chromiumPath, axeSource, ensureDirs, writeJson, BASE, RAW, STAFF, PASSWORD } from './lib.mjs';

const MODE = process.argv[2] || 'all';
const { chromium } = await loadPlaywright();
const AXE = axeSource();

export const PUBLIC_ROUTES = [
  '/', '/properties', '/properties/audit-p1', '/properties/audit-p2', '/properties/audit-p3', '/projects', '/buy', '/sell',
  '/valuation', '/demands', '/special-requests', '/special', '/off-market', '/private-office', '/investor', '/commercial-hub',
  '/market-intelligence', '/financing', '/compare', '/favorites', '/trade-in', '/broker', '/referral', '/vault', '/my-account',
  '/about', '/about-us', '/privacy', '/terms', '/no-such-page'
];

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 11; SM-A035F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const FB_UA = `${ANDROID_UA} [FB_IAB/FB4A;FBAV/450.0.0.0;]`;

export const DEVICES = [
  { id: '320x568', w: 320, h: 568, mobile: true, ua: IOS_UA, shot: true },
  { id: '280x653-fold', w: 280, h: 653, mobile: true, ua: ANDROID_UA },
  { id: '360x740', w: 360, h: 740, mobile: true, ua: FB_UA },
  { id: '375x667', w: 375, h: 667, mobile: true, ua: IOS_UA },
  { id: '390x844', w: 390, h: 844, mobile: true, ua: IOS_UA, shot: true },
  { id: '390x844-dark', w: 390, h: 844, mobile: true, ua: IOS_UA, dark: true, shot: true },
  { id: '390x844-en', w: 390, h: 844, mobile: true, ua: IOS_UA, lang: 'en' },
  { id: '430x932', w: 430, h: 932, mobile: true, ua: IOS_UA },
  { id: '844x390-landscape', w: 844, h: 390, mobile: true, ua: ANDROID_UA, shot: true },
  { id: '768x1024', w: 768, h: 1024, mobile: true, ua: IOS_UA },
  { id: '1366x768', w: 1366, h: 768, mobile: false, shot: true },
  { id: '1366x768-dark', w: 1366, h: 768, mobile: false, dark: true },
  { id: '1920x1080', w: 1920, h: 1080, mobile: false }
];

// Runs in the page. Returns plain data only.
function measure() {
  const vw = document.documentElement.clientWidth;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };
  const sel = (el) => {
    if (el.id) return `#${el.id}`;
    const cls = [...el.classList].slice(0, 2).join('.');
    return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`;
  };
  const overflowPx = document.documentElement.scrollWidth - vw;
  const culprits = [];
  if (overflowPx > 1) {
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        // keep the innermost offenders only
        if (![...el.children].some((c) => { const cr = c.getBoundingClientRect(); return cr.right > vw + 1 || cr.left < -1; })) {
          culprits.push(`${sel(el)} (${Math.round(r.left)}→${Math.round(r.right)})`);
          if (culprits.length >= 5) break;
        }
      }
    }
  }
  const smallText = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode;
    const el = t.parentElement;
    if (!el || seen.has(el) || !t.textContent.trim() || !visible(el)) continue;
    seen.add(el);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) smallText.push(`${sel(el)} ${fs}px "${t.textContent.trim().slice(0, 30)}"`);
  }
  const smallFields = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]):not([type=file]), select, textarea')]
    .filter(visible)
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 16)
    .map((el) => `${sel(el)} ${getComputedStyle(el).fontSize}`);
  const smallTargets = [...document.querySelectorAll('a[href], button, [role=button], input[type=checkbox], input[type=radio], select, summary')]
    .filter(visible)
    .filter((el) => { const r = el.getBoundingClientRect(); return (r.width < 44 || r.height < 44) && !el.closest('p, li > p'); })
    .map((el) => { const r = el.getBoundingClientRect(); return `${sel(el)} ${Math.round(r.width)}×${Math.round(r.height)} "${(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 20)}"`; });
  const text = document.body.innerText || '';
  const eastern = (text.match(/[٠-٩]+/g) || []).slice(0, 5);
  const rawKeys = (text.match(/\b(undefined|NaN|\[object Object\]|new_sohag|viewing_request|client_account|buyer_demand)\b/g) || []).slice(0, 8);
  const h1 = document.querySelectorAll('h1').length;
  const fixedArea = [...document.querySelectorAll('body *')].filter((el) => {
    const s = getComputedStyle(el);
    return (s.position === 'fixed' || s.position === 'sticky') && visible(el);
  }).reduce((sum, el) => {
    const r = el.getBoundingClientRect();
    const h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
    return sum + (w >= vw * 0.6 ? h : 0);
  }, 0);
  return {
    title: document.title, h1, overflowPx, culprits,
    smallText: { count: smallText.length, samples: smallText.slice(0, 5) },
    smallFields: { count: smallFields.length, samples: smallFields.slice(0, 5) },
    smallTargets: { count: smallTargets.length, samples: smallTargets.slice(0, 6) },
    eastern, rawKeys,
    contentShare: Math.round(100 * Math.max(0, innerHeight - fixedArea) / innerHeight),
    cls: Math.round((window.__cls || 0) * 1000) / 1000,
    lcpMs: Math.round(window.__lcp || 0)
  };
}

const VITALS = `
  window.__cls = 0; window.__lcp = 0;
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
`;

async function newContext(browser, d, extraStorage = {}) {
  const ctx = await browser.newContext({
    viewport: { width: d.w, height: d.h }, isMobile: d.mobile, hasTouch: d.mobile, userAgent: d.ua,
    locale: 'ar-EG', colorScheme: d.dark ? 'dark' : 'light', serviceWorkers: 'block'
  });
  const storage = { oneline_consent_v1: 'declined', oneline_theme: d.dark ? 'dark' : 'light', oneline_lang: d.lang || 'ar', ...extraStorage };
  await ctx.addInitScript((s) => { try { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } catch {} }, storage);
  await ctx.addInitScript(VITALS);
  return ctx;
}

async function auditPage(page, url, d, label, shotName) {
  const errors = [];
  const onConsole = (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errors.push(m.text().slice(0, 200)); };
  const onPageError = (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`);
  page.on('console', onConsole); page.on('pageerror', onPageError);
  if (url) await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(measure);
  let axe = null;
  if (AXE) {
    await page.addScriptTag({ content: AXE });
    axe = await page.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'], resultTypes: ['violations'] });
      return r.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
    }).catch((e) => [{ id: 'axe-error', impact: String(e).slice(0, 80), nodes: 0 }]);
  }
  if (d.shot && shotName) await page.screenshot({ path: path.join(RAW, 'shots', shotName), type: 'jpeg', quality: 55 });
  page.off('console', onConsole); page.off('pageerror', onPageError);
  return { page: label, device: d.id, ...m, axe, errors };
}

ensureDirs();
import fs from 'node:fs';
fs.mkdirSync(path.join(RAW, 'shots'), { recursive: true });
const browser = await chromium.launch({ executablePath: chromiumPath() });
const results = [];

if (MODE === 'public' || MODE === 'all') {
  for (const d of DEVICES) {
    const ctx = await newContext(browser, d);
    const page = await ctx.newPage();
    for (const route of PUBLIC_ROUTES) {
      const name = `pub_${route.replace(/[^a-z0-9]+/gi, '_') || 'home'}_${d.id}.jpg`;
      try { results.push(await auditPage(page, BASE + route, d, route, name)); } catch (e) { results.push({ page: route, device: d.id, failed: String(e).slice(0, 200) }); }
    }
    await ctx.close();
    console.log(`public ${d.id} done`);
  }
}

if (MODE === 'crm' || MODE === 'all') {
  for (const d of DEVICES.filter((x) => ['390x844', '390x844-dark', '360x740', '768x1024', '1366x768', '1366x768-dark', '1920x1080'].includes(x.id))) {
    const ctx = await newContext(browser, d);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/crm`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').fill(STAFF.admin.email);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(7000);
    results.push(await auditPage(page, null, d, 'crm:home', `crm_home_${d.id}.jpg`));
    // Mobile hides the sidebar behind a menu button; open it when present
    const items = async () => page.locator('.crm-sidebar-item, .crm-sidebar-subitem');
    const count = await (await items()).count();
    for (let i = 0; i < count; i++) {
      const menu = page.locator('.crm-topbar-toggle-btn').first();
      if (d.mobile && await menu.count() && !(await (await items()).nth(i).isVisible())) await menu.click().catch(() => {});
      const item = (await items()).nth(i);
      const label = ((await item.innerText().catch(() => '')) || `item${i}`).split('\n')[0].trim().slice(0, 40);
      try {
        await item.click({ timeout: 4000 });
        results.push(await auditPage(page, null, d, `crm:${label}`, `crm_${i}_${d.id}.jpg`));
      } catch (e) {
        results.push({ page: `crm:${label}`, device: d.id, failed: String(e).slice(0, 160) });
      }
    }
    await ctx.close();
    console.log(`crm ${d.id} done`);
  }
}

// Blocked storage (Safari "block all cookies", some in-app browsers): does the site still render?
{
  const d = DEVICES.find((x) => x.id === '390x844');
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, isMobile: true, hasTouch: true, userAgent: d.ua, serviceWorkers: 'block' });
  await ctx.addInitScript(() => {
    const thrower = { get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } };
    Object.defineProperty(window, 'localStorage', thrower);
    Object.defineProperty(window, 'sessionStorage', thrower);
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const textLen = await page.evaluate(() => (document.getElementById('root')?.innerText || '').trim().length);
  results.push({ page: '/', device: '390x844-storage-blocked', renderedTextChars: textLen, errors: errs });
  await ctx.close();
}

await browser.close();
writeJson(`sweep-${MODE}.json`, results);
console.log(`wrote ${results.length} results`);
