// =============================================================
//  Site error reporting — visitors' JavaScript errors, React crashes and Content-Security-Policy
//  violations go to Firestore client_errors (admin-only; CRM → System → Site errors), so a broken
//  form shows up there instead of only as fewer leads.
//
//  Only on https (production and previews), at most MAX_PER_PAGE entries per page load, each
//  distinct error once. Sends the page path (no query string), never form contents.
// =============================================================

import { reportClientError } from '../firebaseLazy.js';
import { imageFailureReport } from './imageRetry.js';

const MAX_PER_PAGE = 8;
const seen = new Set();
let sent = 0;

const clip = (v, n) => String(v ?? '').slice(0, n);

// Not ours to fix: extensions, opaque cross-origin "Script error.", benign ResizeObserver notices
const IGNORE = [/^Script error\.?$/i, /ResizeObserver loop/i, /-extension:\/\//i, /^safari-web-extension/i];

export function reportError(kind, { message, source = '', line = 0, col = 0, stack = '' } = {}) {
  if (typeof window === 'undefined' || window.location.protocol !== 'https:') return;
  if (sent >= MAX_PER_PAGE) return;
  const msg = clip(message, 500).trim();
  const src = clip(source, 300);
  if (!msg || IGNORE.some((re) => re.test(msg) || re.test(src) || re.test(stack))) return;
  const key = `${kind}|${msg}|${src}|${line}`;
  if (seen.has(key)) return;
  seen.add(key);
  sent++;
  reportClientError({
    kind,
    message: msg,
    source: src,
    line: Number.isInteger(line) ? line : 0,
    col: Number.isInteger(col) ? col : 0,
    stack: clip(stack, 2000),
    path: clip(window.location.pathname, 200),
    ua: clip(navigator.userAgent, 300)
  }).catch(() => {});
}

// A listing photo that never loaded (after its retries). At most a few per page so a store-wide outage
// shows up in the list without using up the room real errors need. Rules only allow the usual kinds,
// so it is logged as an «error» whose message names the photo's host.
const MAX_IMAGE_REPORTS = 3;
let imageReports = 0;
export function reportImageFailure(url) {
  const r = imageFailureReport(url);
  if (!r || imageReports >= MAX_IMAGE_REPORTS) return;
  imageReports++;
  reportError('error', { message: r.message, source: r.source });
}

let installed = false;

export function installErrorReporter() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => {
    // Failed <img>/<script> loads don't bubble to window; only script errors arrive here
    reportError('error', { message: e.message, source: e.filename, line: e.lineno, col: e.colno, stack: e.error?.stack });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    reportError('rejection', { message: r?.message || String(r), stack: r?.stack });
  });
  document.addEventListener('securitypolicyviolation', (e) => {
    reportError('csp', {
      message: `${e.effectiveDirective} blocked ${e.blockedURI || 'inline'}`,
      source: e.sourceFile,
      line: e.lineNumber,
      col: e.columnNumber,
      stack: `${e.disposition}${e.sample ? ` | ${e.sample}` : ''}`
    });
  });
}
