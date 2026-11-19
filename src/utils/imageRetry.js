// =============================================================
//  What a listing photo does when it fails to load, step by step, instead of dropping straight to a
//  generic placeholder: small copy → the full photo → the full photo once more after a pause → give up
//  (the card then says the photo is unavailable, and the failure is reported to the CRM's site-errors
//  list). Pure; tests/unit/image-retry.test.mjs.
// =============================================================

export const RETRY_DELAY_MS = 1500;

/**
 * The next address to try after `stage` failures of one photo, or null to give up.
 * stage 0: the small copy failed → the full photo. stage 1: the full photo failed → the same photo
 * again after a short pause (a flaky moment, a cold cache). stage 2+: give up.
 */
export function nextImageAttempt(stage, full, small) {
  if (!full) return null;
  if (stage === 0) return small && small !== full ? { src: full, delay: 0 } : { src: full, delay: RETRY_DELAY_MS };
  if (stage === 1 && small && small !== full) return { src: full, delay: RETRY_DELAY_MS };
  return null;
}

/** What to tell the site-errors list about a photo that never loaded (no query string, host + path only) */
export function imageFailureReport(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  try {
    const u = new URL(url);
    return { message: `صورة عقار ما اتحمّلتش (${u.hostname})`, source: `${u.origin}${u.pathname}`.slice(0, 300) };
  } catch {
    return null;
  }
}
