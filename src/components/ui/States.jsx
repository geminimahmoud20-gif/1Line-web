import { AlertTriangle, Inbox } from 'lucide-react';
import Button from './Button';
import { cx } from './cx';

export function EmptyState({ icon = <Inbox size={22} />, title, description, action = null, className }) {
  return (
    <div className={cx('ui-state', className)}>
      <span className="ui-state__icon" aria-hidden="true">{icon}</span>
      <p className="ui-state__title">{title}</p>
      {description && <p className="ui-state__desc">{description}</p>}
      {action && <div className="ui-state__action">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, description, onRetry, retryLabel = 'حاول تاني', className }) {
  return (
    <div className={cx('ui-state', 'ui-state--error', className)} role="alert">
      <span className="ui-state__icon" aria-hidden="true"><AlertTriangle size={22} /></span>
      <p className="ui-state__title">{title}</p>
      {description && <p className="ui-state__desc">{description}</p>}
      {onRetry && <div className="ui-state__action"><Button variant="secondary" onClick={onRetry}>{retryLabel}</Button></div>}
    </div>
  );
}

// Placeholder while data loads. lines > 1 draws a paragraph; the last line is shorter.
export function Skeleton({ width = '100%', height = 14, radius, lines = 1, className }) {
  if (lines > 1) {
    return (
      <span className={cx('ui-skeleton-lines', className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span key={i} className="ui-skeleton" style={{ width: i === lines - 1 ? '60%' : width, height, borderRadius: radius }} />
        ))}
      </span>
    );
  }
  return <span className={cx('ui-skeleton', className)} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}
