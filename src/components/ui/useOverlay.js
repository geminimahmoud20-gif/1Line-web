import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let locks = 0;

// Shared behaviour for modals and drawers: Esc closes, Tab stays inside, the page behind does not
// scroll, and focus goes back to whatever opened the overlay when it closes.
export function useOverlay(open, onClose) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    locks += 1;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFirst = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE) || panel;
      target.focus({ preventScroll: true });
    });
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current?.(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)];
      if (!nodes.length) { e.preventDefault(); return; }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      cancelAnimationFrame(focusFirst);
      document.removeEventListener('keydown', onKey, true);
      locks -= 1;
      if (locks === 0) document.body.style.overflow = prevOverflow;
      if (opener && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
    };
  }, [open]);

  return panelRef;
}
