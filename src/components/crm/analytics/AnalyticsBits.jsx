// Small presentational pieces of the visitor analytics dashboard (theme tokens only).
import { card, LEVEL_STYLE } from './analyticsStyles';


export function Section({ title, hint, children, style }) {
  return (
    <section style={{ ...card, ...style }}>
      <h3 style={{ margin: 0, fontSize: 'var(--crm-text-md)', color: 'var(--crm-ink)' }}>{title}</h3>
      {hint && <p style={{ margin: '4px 0 12px', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', lineHeight: 1.6 }}>{hint}</p>}
      {!hint && <div style={{ height: '10px' }} />}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, tone = 'info' }) {
  return (
    <div style={{ ...card, padding: '14px 16px' }}>
      <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 'var(--crm-text-xl)', fontWeight: 800, color: `var(--crm-${tone})`, margin: '4px 0 2px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)' }}>{sub}</div>}
    </div>
  );
}

/** Horizontal bars: rows = [{ key, label, value, sub? }] */
export function BarList({ rows, tone = 'info', empty, format = (v) => v.toLocaleString('en-US') }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.some((r) => r.value > 0)) {
    return <p style={{ margin: 0, fontSize: 'var(--crm-text-sm)', color: 'var(--crm-faint)' }}>{empty}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rows.map((r) => (
        <div key={r.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-body)' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            <strong style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--crm-ink)' }}>{format(r.value)}{r.sub ? <span style={{ color: 'var(--crm-faint)', fontWeight: 500 }}> {r.sub}</span> : null}</strong>
          </div>
          <div style={{ height: '6px', background: 'var(--crm-subtle)', borderRadius: '4px', marginTop: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(r.value / max) * 100}%`, height: '100%', background: `var(--crm-${tone}-solid, var(--crm-${tone}))`, borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Daily columns: days = [{ day, value, mark }] (mark = leads that day) */
export function DayColumns({ days, isAr }) {
  const max = Math.max(1, ...days.map((d) => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '140px', direction: 'ltr' }} role="img"
      aria-label={isAr ? 'الزيارات اليومية' : 'Daily visits'}>
      {days.map((d) => (
        <div key={d.day} title={`${d.day}: ${d.value}${d.mark ? ` • ${isAr ? 'طلبات' : 'leads'} ${d.mark}` : ''}`}
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
          {d.mark > 0 && (
            <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--crm-positive-solid)' }} />
          )}
          <div style={{ height: `${Math.max(2, (d.value / max) * 85)}%`, background: 'var(--crm-info-solid)', borderRadius: '3px 3px 0 0', opacity: d.value ? 1 : 0.25 }} />
        </div>
      ))}
    </div>
  );
}


export function LevelBadge({ level, score, isAr }) {
  const s = LEVEL_STYLE[level] || LEVEL_STYLE.cold;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: 'var(--crm-text-xs)', fontWeight: 700, background: `var(--crm-${s.tone}-soft)`, color: `var(--crm-${s.tone})`, whiteSpace: 'nowrap' }}>
      {isAr ? s.ar : s.en}{typeof score === 'number' ? ` • ${score}` : ''}
    </span>
  );
}
