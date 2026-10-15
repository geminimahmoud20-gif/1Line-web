import { cx } from './cx';

// tone: neutral | primary | accent | success | warning | danger | info. `dot` marks a status.
export function Badge({ tone = 'neutral', dot = false, icon = null, className, children, ...rest }) {
  return (
    <span className={cx('ui-badge', tone !== 'neutral' && `ui-badge--${tone}`, className)} {...rest}>
      {dot && <span className="ui-badge__dot" aria-hidden="true" />}
      {icon}
      {children}
    </span>
  );
}

export function Count({ children, label }) {
  return <span className="ui-count" aria-label={label}>{children}</span>;
}

// A filter chip: a toggle button with an optional count.
export function Chip({ pressed = false, count, icon = null, className, children, ...rest }) {
  return (
    <button type="button" aria-pressed={pressed} className={cx('ui-chip', className)} {...rest}>
      {icon}
      {children}
      {count != null && <span className="ui-count">{count}</span>}
    </button>
  );
}
