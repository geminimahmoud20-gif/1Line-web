// After a wizard changes step (or finishes), bring the top of the form just under the sticky header.
// Scrolling to the top of the page, as it did, dropped the visitor on the hero, and on a phone the hero is
// close to a screen tall: every step pushed the form back below the fold.
export const FORM_SCROLL_OFFSET = 76;

export function scrollToForm(selector = '.sw', offset = FORM_SCROLL_OFFSET) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const run = () => {
    const el = document.querySelector(selector);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };
  // after React has drawn the next step
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run); else run();
}
