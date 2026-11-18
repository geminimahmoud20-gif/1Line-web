import { useId, useRef } from 'react';
import { m } from 'motion/react';
import { DUR, EASE_OUT } from './motionPresets';
import { cx } from './cx';

const moveFocus = (e, items, value, onChange, refs) => {
  const keys = { ArrowLeft: 1, ArrowRight: -1, Home: 'first', End: 'last' };
  if (!(e.key in keys)) return;
  e.preventDefault();
  const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
  const i = items.findIndex((t) => t.id === value);
  let next;
  if (keys[e.key] === 'first') next = 0;
  else if (keys[e.key] === 'last') next = items.length - 1;
  else next = (i + (rtl ? keys[e.key] : -keys[e.key]) + items.length) % items.length;
  onChange(items[next].id);
  refs.current[next]?.focus();
};

// items: [{ id, label, count?, icon? }]. The active marker slides between tabs.
export function Tabs({ items, value, onChange, label, className }) {
  const group = useId();
  const refs = useRef([]);
  return (
    <div role="tablist" aria-label={label} className={cx('ui-tabs', className)} onKeyDown={(e) => moveFocus(e, items, value, onChange, refs)}>
      {items.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className="ui-tab"
            onClick={() => onChange(t.id)}
          >
            {t.icon}
            {t.label}
            {t.count != null && <span className="ui-count">{t.count}</span>}
            {on && <m.span layoutId={`${group}-bar`} className="ui-tab__bar" transition={{ duration: DUR.base, ease: EASE_OUT }} />}
          </button>
        );
      })}
    </div>
  );
}

// A compact either/or switch (period, view mode). options: [{ value, label }]
export function SegmentedControl({ options, value, onChange, label, className }) {
  const group = useId();
  const refs = useRef([]);
  const items = options.map((o) => ({ id: o.value, label: o.label }));
  return (
    <div role="radiogroup" aria-label={label} className={cx('ui-seg', className)} onKeyDown={(e) => moveFocus(e, items, value, onChange, refs)}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className="ui-seg__opt"
            onClick={() => onChange(o.value)}
          >
            {on && <m.span layoutId={`${group}-pill`} className="ui-seg__pill" transition={{ duration: DUR.base, ease: EASE_OUT }} />}
            <span className="ui-seg__label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
