// Pure helpers for src/components/ui/Charts.jsx (tests/unit/chart-math.test.mjs).

const TONES = ['info', 'accent', 'success', 'warning', 'neutral'];
export const toneAt = (i) => TONES[i % TONES.length];
export const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 });

/** A round upper bound for the axis: 1, 2, 5 × 10^k */
export function niceMax(max) {
  if (!(max > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const f = max / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

/** SVG path through the points with soft corners (quadratic through the midpoints) */
export function smoothPath(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${last[0].toFixed(1)},${last[1].toFixed(1)}`;
}

