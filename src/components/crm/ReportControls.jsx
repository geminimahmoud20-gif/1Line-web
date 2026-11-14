import { PRESETS, COMPARES, dayOf, rangeText } from '../../utils/reportPeriods';

/** Period chips, custom dates and the comparison choice, shared by every report tab. State lives in the hub. */
export default function ReportControls({ ctl, range, prevRange, now, isAr }) {
  const L = (ar, en) => (isAr ? ar : en);
  const { preset, setPreset, custom, setCustom, mode, setMode } = ctl;
  return (
    <div className="pr-controls">
      <div className="pr-chips" role="group" aria-label={L('الفترة', 'Period')}>
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className={preset === p.id ? 'is-on' : ''} aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>{isAr ? p.ar : p.en}</button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="pr-custom">
          <label><span>{L('من', 'From')}</span><input type="date" value={custom.from || range.from} max={dayOf(now)} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value, to: c.to || range.to }))} /></label>
          <label><span>{L('إلى', 'To')}</span><input type="date" value={custom.to || range.to} max={dayOf(now)} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value, from: c.from || range.from }))} /></label>
        </div>
      )}
      <label className="pr-compare"><span>{L('قارن بـ', 'Compare with')}</span>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>{COMPARES.map((c) => <option key={c.id} value={c.id}>{isAr ? c.ar : c.en}</option>)}</select>
      </label>
      <p className="pr-range"><b>{rangeText(range)}</b> ({range.days} {L('يوم', 'days')}){prevRange && <> · {L('مقابل', 'vs')} <b>{rangeText(prevRange)}</b></>}</p>
    </div>
  );
}
