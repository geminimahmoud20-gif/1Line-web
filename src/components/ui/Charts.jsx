import { cx } from './cx';

// Small charts drawn as SVG/HTML from the design tokens, no chart library (the CRM chunk is big enough).
// Colour comes from a tone (info, accent, success, warning, neutral) through the .ui-tone-* classes, so dark mode
// and any palette change happen in src/styles/tokens.css. Time always runs left to right, also on an Arabic page.

import { toneAt, niceMax, smoothPath, fmt } from '../../utils/chartMath';

/**
 * Lines with a soft fill under them. series: [{ id, label, values: number[], tone? }], labels: one per point
 * (the first, middle and last are shown). `ariaLabel` says in words what the chart shows.
 */
export function AreaChart({ series = [], labels = [], height = 176, ariaLabel, smooth = false }) {
  const W = 600;
  const PAD = 8;
  const n = Math.max(0, ...series.map((s) => s.values.length));
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const x = (i) => (n > 1 ? (i * W) / (n - 1) : W / 2);
  const y = (v) => height - PAD - (Math.max(0, v) / max) * (height - PAD * 2);
  const mid = Math.floor((n - 1) / 2);
  return (
    <figure className="ui-chart">
      <ul className="ui-chart__legend">
        {series.map((s, i) => (
          <li key={s.id} className={`ui-tone-${s.tone || toneAt(i)}`}>
            <span className="ui-chart__swatch" aria-hidden="true" />
            <span className="ui-chart__legend-label">{s.label}</span>
            <strong>{fmt(s.values.reduce((a, b) => a + b, 0))}</strong>
          </li>
        ))}
      </ul>
      <div className="ui-chart__plot" dir="ltr">
        <span className="ui-chart__ymax">{fmt(max)}</span>
        <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img" aria-label={ariaLabel} height={height}>
          {[0, 0.5, 1].map((f) => (
            <line key={f} className="ui-chart__grid" x1="0" x2={W} y1={PAD + f * (height - PAD * 2)} y2={PAD + f * (height - PAD * 2)} />
          ))}
          {series.map((s, i) => {
            const pts = s.values.map((v, k) => [x(k), y(v)]);
            const line = smooth ? smoothPath(pts) : pts.map((q, k) => `${k ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
            return (
              <g key={s.id} className={`ui-tone-${s.tone || toneAt(i)}`}>
                {pts.length > 1 && <path className="ui-chart__area" d={`${line} L${W},${height - PAD} L0,${height - PAD} Z`} />}
                <path className="ui-chart__line" d={line} />
              </g>
            );
          })}
        </svg>
        {n > 0 && (
          <div className="ui-chart__x">
            <span>{labels[0]}</span>
            <span>{labels[mid]}</span>
            <span>{labels[n - 1]}</span>
          </div>
        )}
      </div>
    </figure>
  );
}

/** A ring split into slices with its total in the middle and a legend. items: [{ id, label, value, pct? }] */
export function Donut({ items = [], centerLabel, ariaLabel, size = 132 }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const R = 48;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <figure className="ui-donut">
      <div className="ui-donut__ring" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={ariaLabel}>
          <circle className="ui-donut__track" cx="60" cy="60" r={R} />
          {total > 0 && items.map((it, i) => {
            const len = (it.value / total) * C;
            const seg = (
              <circle
                key={it.id}
                className={`ui-donut__slice ui-tone-${toneAt(i)}`}
                cx="60" cy="60" r={R}
                strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
              />
            );
            offset += len;
            return seg;
          })}
        </svg>
        <div className="ui-donut__center">
          <strong>{fmt(total)}</strong>
          {centerLabel && <span>{centerLabel}</span>}
        </div>
      </div>
      <ul className="ui-donut__legend">
        {items.map((it, i) => (
          <li key={it.id} className={`ui-tone-${toneAt(i)}`}>
            <span className="ui-chart__swatch" aria-hidden="true" />
            <span className="ui-chart__legend-label">{it.label}</span>
            <strong>{fmt(it.value)}</strong>
            {it.pct != null && <small>{it.pct}%</small>}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/**
 * Horizontal bars with a label, a value and an optional note (a funnel step's conversion, a seller's reply time).
 * items: [{ id, label, value, note?, tone? }]; the longest bar is the largest value unless `max` is given.
 */
export function BarList({ items = [], max, tone = 'info', ariaLabel, valueText }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="ui-bars" aria-label={ariaLabel}>
      {items.map((it) => (
        <li key={it.id} className={cx('ui-bars__row', `ui-tone-${it.tone || tone}`)}>
          <span className="ui-bars__head">
            <span className="ui-bars__label">{it.label}</span>
            {it.note && <span className="ui-bars__note">{it.note}</span>}
          </span>
          <span className="ui-bars__value">{valueText ? valueText(it) : fmt(it.value)}</span>
          <span className="ui-bars__track" aria-hidden="true">
            <span className="ui-bars__fill" style={{ width: `${Math.max(it.value > 0 ? 2 : 0, Math.round((it.value / top) * 100))}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
