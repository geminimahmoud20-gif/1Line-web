import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';

/**
 * The "…" menu of a table row. Drawn on <body> at the button (inside a table the rows below and the
 * scroll area painted over it), flips up when there is no room below, closes on Escape, an outside
 * click, scroll or resize. items: [{ id, label, icon, onSelect, danger, separator }] (falsy items skipped).
 */
export default function RowMenu({ items, label, isAr = true }) {
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const open = Boolean(pos);
  const list = items.filter(Boolean);

  const toggle = () => {
    if (open) return setPos(null);
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, bottom: r.top - 4, left: r.left, right: r.right });
  };

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el || !pos) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    const rtl = getComputedStyle(triggerRef.current).direction === 'rtl';
    const top = pos.top + h > window.innerHeight - 8 ? Math.max(8, pos.bottom - h) : pos.top;
    const left = Math.min(Math.max(8, rtl ? pos.left : pos.right - w), window.innerWidth - w - 8);
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    el.style.visibility = 'visible';
    el.querySelector('button')?.focus();
  }, [pos]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) setPos(null);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { setPos(null); triggerRef.current?.focus(); }
    };
    const onMove = () => setPos(null);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="crm-icon-btn"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        aria-label={label}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && createPortal(
        <div ref={menuRef} className="kb-menu crm-row-menu" role="menu" dir={isAr ? 'rtl' : 'ltr'}>
          {list.map((it) => (
            <div key={it.id} className="crm-row-menu__group">
              {it.separator && <div className="crm-row-menu__sep" role="separator" />}
              <button
                type="button"
                role="menuitem"
                className={it.danger ? 'is-danger' : undefined}
                disabled={it.disabled}
                onClick={() => { setPos(null); it.onSelect(); }}
              >
                {it.icon} <span>{it.label}</span>
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
