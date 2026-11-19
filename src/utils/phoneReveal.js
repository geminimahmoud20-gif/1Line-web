// =============================================================
//  Phones in the CRM are shown masked (0100•••••12) until someone taps «إظهار», which is logged
//  (utils/contactAudit → سجل المراجعة). A reveal lasts REVEAL_TTL_MS, then the number hides again,
//  so a screen left open does not keep showing it. The policy (who sees masked numbers) is set once
//  by the CRM shell; this file is the tiny store the screens read.
//  This is a deterrent and an audit trail, not encryption: whoever may read a number can still read it.
//  Pure apart from the module state: tests/unit/phone-reveal.test.mjs.
// =============================================================

export const REVEAL_TTL_MS = 2 * 60 * 1000;

/** 01001234567 → 0100•••••67; a value that is already hidden (***, •••) or too short is returned as it is */
export function maskDigits(text) {
  const s = String(text ?? '').trim();
  if (!s || /[*•]/.test(s)) return s;
  const keep = s.replace(/\s/g, '');
  if (keep.length <= 6) return '•••';
  return `${keep.slice(0, 4)}•••••${keep.slice(-2)}`;
}

/** Can this text still be revealed (there is a real number behind it)? */
export const isRevealable = (text) => Boolean(String(text ?? '').trim()) && !/[*•]/.test(String(text));

let policy = { mask: false };
const revealed = new Map(); // leadId -> expiry (ms)
const listeners = new Set();
let version = 0;

const notify = () => { version += 1; listeners.forEach((fn) => fn()); };

export function setPhonePolicy(next = {}) {
  const mask = Boolean(next.mask);
  if (mask === policy.mask) return;
  policy = { mask };
  if (!mask) revealed.clear();
  notify();
}

export const phonePolicy = () => policy;
export const subscribePhoneReveal = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const phoneRevealVersion = () => version;

/** Is this client's number hidden right now? */
export function isPhoneMasked(leadId, now = Date.now()) {
  if (!policy.mask) return false;
  const until = revealed.get(String(leadId));
  return !(until !== undefined && until > now);
}

/** Show this client's number for REVEAL_TTL_MS, then hide it again */
export function revealPhone(leadId, now = Date.now()) {
  if (!leadId) return;
  const id = String(leadId);
  revealed.set(id, now + REVEAL_TTL_MS);
  notify();
  const timer = setTimeout(() => {
    if ((revealed.get(id) || 0) <= Date.now()) { revealed.delete(id); notify(); }
  }, REVEAL_TTL_MS + 50);
  timer.unref?.();
}

/** For tests: forget everything */
export function resetPhoneReveal() { policy = { mask: false }; revealed.clear(); notify(); }
