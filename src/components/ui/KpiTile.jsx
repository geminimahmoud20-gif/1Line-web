import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import { Skeleton } from './States';
import { cx } from './cx';

const fmt = (n, digits) => Number(n).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });

// Counts up to `value` the first time it scrolls into view (instantly when motion is reduced).
export function AnimatedNumber({ value, digits = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const target = Number(value) || 0;
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!inView || reduce) { el.textContent = fmt(target, digits); return undefined; }
    const ctl = animate(0, target, { duration: 0.8, ease: [0.2, 0.8, 0.2, 1], onUpdate: (v) => { el.textContent = fmt(v, digits); } });
    return () => ctl.stop();
  }, [inView, reduce, target, digits]);
  return <span ref={ref} className="ui-num">{fmt(target, digits)}</span>;
}

// Tiny trend line. points: numbers, oldest first.
export function Sparkline({ points = [], width = 96, height = 28, label }) {
  // No line at all when nothing happened in the whole period (a flat zero line reads as data)
  if (points.length < 2 || points.every((p) => !p)) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(height - 2 - ((p - min) / span) * (height - 4)).toFixed(1)}`).join(' ');
  return (
    <svg className="ui-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A number that matters, with its unit, an optional change and trend. Pass value={null} for "no data yet".
// With onClick the tile is a button (it opens the list behind the number); the inner parts are spans so that stays valid.
// tone colours the icon chip and the trend line (info, accent, success, warning, danger, primary, neutral);
// invertDelta is for a figure where lower is better (reply time): a fall shows green, a rise red.
export function KpiTile({ label, value, unit, digits = 0, delta, deltaLabel, hint, icon = null, trend, tone, invertDelta = false, loading = false, emptyText = 'لسه مفيش', className, onClick }) {
  const up = typeof delta === 'number' && delta > 0;
  const down = typeof delta === 'number' && delta < 0;
  const good = invertDelta ? down : up;
  const bad = invertDelta ? up : down;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx('ui-card', 'ui-card--compact', 'ui-kpi', tone && `ui-tone-${tone}`, onClick && 'ui-card--interactive ui-kpi--button', className)}
    >
      <span className="ui-kpi__top">
        <span className="ui-kpi__label">{label}</span>
        {icon && <span className="ui-kpi__icon" aria-hidden="true">{icon}</span>}
      </span>
      <span className="ui-kpi__value">
        {loading ? <Skeleton width="55%" height={28} /> : value == null ? <span className="ui-kpi__unit">{emptyText}</span> : (
          <>
            <AnimatedNumber value={value} digits={digits} />
            {unit && <span className="ui-kpi__unit">{unit}</span>}
          </>
        )}
      </span>
      {(hint || delta != null || trend) && (
        <span className="ui-kpi__foot">
          <span>
            {delta != null && (
              <span className={cx('ui-kpi__delta', good && 'ui-kpi__delta--good', bad && 'ui-kpi__delta--bad', !good && !bad && 'ui-kpi__delta--flat')}>
                <bdi dir="ltr">{up ? '+' : ''}{fmt(delta, 0)}{deltaLabel ? (deltaLabel === '%' ? '%' : ` ${deltaLabel}`) : ''}</bdi>
              </span>
            )}
            {hint && <span>{delta != null ? ' · ' : ''}{hint}</span>}
          </span>
          {trend && <Sparkline points={trend} />}
        </span>
      )}
    </Tag>
  );
}

// A row of KPI tiles. On phones it scrolls sideways, so it is a focusable, labelled region for keyboard users.
export function KpiRow({ label, children }) {
  return (
    <div className="ui-kpi-row" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
