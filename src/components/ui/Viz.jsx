import { cx } from './cx';
import { niceMax, fmt } from '../../utils/chartMath';

// Small visuals for dashboards, drawn from the design tokens (colour through .ui-tone-*), no chart library.
// The widths and heights are data, so they are the only inline styles here.

const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));

/** A progress bar. value/max → fill; `over` (value past max) shows the overflow in the danger tone. */
export function Meter({ value = 0, max = 100, tone = 'info', label, valueText, size = 'md', className }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const t = pct > 100 ? 'danger' : tone;
  return (
    <div className={cx('ui-meter', `ui-meter--${size}`, `ui-tone-${t}`, className)}>
      {(label || valueText) && (
        <span className="ui-meter__head">
          {label && <span className="ui-meter__label">{label}</span>}
          {valueText && <span className="ui-meter__value">{valueText}</span>}
        </span>
      )}
      <span className="ui-meter__track" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={typeof label === 'string' ? label : undefined}>
        <span className="ui-meter__fill" style={{ width: `${clamp(pct)}%` }} />
      </span>
    </div>
  );
}

/** A ring that fills to `value` percent, with a big number in the middle */
export function RingGauge({ value, tone = 'info', size = 88, center, caption }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const v = value === null || value === undefined ? 0 : clamp(value);
  return (
    <div className={cx('ui-ring', `ui-tone-${tone}`)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle className="ui-ring__track" cx="50" cy="50" r={R} />
        <circle className="ui-ring__fill" cx="50" cy="50" r={R} strokeDasharray={`${(v / 100) * C} ${C}`} transform="rotate(-90 50 50)" />
      </svg>
      <span className="ui-ring__center">
        <strong>{center ?? (value === null || value === undefined ? '—' : `${Math.round(value)}%`)}</strong>
        {caption && <small>{caption}</small>}
      </span>
    </div>
  );
}

/** One bar split into parts: [{ id, value, tone, label }] (a stage's on-time and late clients) */
export function StackBar({ parts = [], total, ariaLabel }) {
  const sum = total ?? parts.reduce((n, p) => n + (p.value || 0), 0);
  return (
    <span className="ui-stack" role="img" aria-label={ariaLabel}>
      {sum > 0 && parts.filter((p) => p.value > 0).map((p) => (
        <span key={p.id} className={cx('ui-stack__part', `ui-tone-${p.tone || 'info'}`)} style={{ width: `${(p.value / sum) * 100}%` }} title={p.label ? `${p.label}: ${fmt(p.value)}` : undefined} />
      ))}
    </span>
  );
}

/**
 * Vertical bars, one per label (months). series: [{ id, label, values: number[], tone }] side by side;
 * time runs left to right, also on an Arabic page.
 */
export function ColumnChart({ series = [], labels = [], height = 180, ariaLabel, valueText = fmt }) {
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  return (
    <figure className="ui-cols">
      <ul className="ui-chart__legend">
        {series.map((s) => (
          <li key={s.id} className={`ui-tone-${s.tone || 'info'}`}>
            <span className="ui-chart__swatch" aria-hidden="true" />
            <span className="ui-chart__legend-label">{s.label}</span>
          </li>
        ))}
      </ul>
      <div className="ui-cols__plot" dir="ltr" role="img" aria-label={ariaLabel} style={{ height }}>
        <span className="ui-cols__ymax">{valueText(max)}</span>
        {labels.map((label, i) => (
          <div className="ui-cols__group" key={label}>
            <div className="ui-cols__bars">
              {series.map((s) => {
                const v = s.values[i] || 0;
                return (
                  <span key={s.id} className={cx('ui-cols__bar', `ui-tone-${s.tone || 'info'}`)} style={{ height: `${v > 0 ? Math.max(2, (v / max) * 100) : 0}%` }} title={`${s.label} · ${label}: ${valueText(v)}`}>
                    {v > 0 && <span className="ui-cols__tip">{valueText(v)}</span>}
                  </span>
                );
              })}
            </div>
            <span className="ui-cols__label">{label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

/** A coloured round icon for a tile or a list row */
export function IconBadge({ icon, tone = 'info', size = 'md' }) {
  return <span className={cx('ui-iconbadge', `ui-iconbadge--${size}`, `ui-tone-${tone}`)} aria-hidden="true">{icon}</span>;
}
