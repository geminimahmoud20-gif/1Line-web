import { CheckCircle2, Circle, ChevronDown } from 'lucide-react';
import './property-form-steps.css';

/** One numbered step of the unit form; optional steps fold away until opened */
export function FormStep({ id, n, title, hint, collapsible = false, children }) {
  const head = (
    <span className="pfs-head">
      <span className="pfs-num" aria-hidden="true">{n}</span>
      <span className="pfs-title">
        <b>{title}</b>
        {hint && <small>{hint}</small>}
      </span>
      {collapsible && <ChevronDown size={18} className="pfs-chev" aria-hidden="true" />}
    </span>
  );
  if (collapsible) {
    return (
      <details id={id} className="pfs is-collapsible">
        <summary>{head}</summary>
        <div className="pfs-body">{children}</div>
      </details>
    );
  }
  return (
    <section id={id} className="pfs" aria-label={title}>
      {head}
      <div className="pfs-body">{children}</div>
    </section>
  );
}

/** «7 من 8 جاهزين»: what the listing still needs, each chip jumping to its step */
export function FormChecklist({ items = [], isAr = true }) {
  const done = items.filter((i) => i.ok).length;
  const jump = (target) => {
    const el = document.getElementById(target);
    if (!el) return;
    if (el.tagName === 'DETAILS') el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div className={`pfc ${done === items.length ? 'is-done' : ''}`} role="status">
      <div className="pfc-top">
        <b>{done === items.length ? (isAr ? 'كل البيانات الأساسية جاهزة' : 'Everything essential is in') : (isAr ? `${done} من ${items.length} جاهزين` : `${done} of ${items.length} done`)}</b>
        <span className="pfc-bar" aria-hidden="true"><span style={{ width: `${(done / Math.max(1, items.length)) * 100}%` }} /></span>
      </div>
      <div className="pfc-chips">
        {items.map((i) => (
          <button key={i.key} type="button" className={`pfc-chip ${i.ok ? 'is-ok' : ''}`} onClick={() => jump(i.target)}>
            {i.ok ? <CheckCircle2 size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
            <span>{i.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
