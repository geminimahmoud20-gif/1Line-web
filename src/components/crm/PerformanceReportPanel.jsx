import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Download, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { periodMetrics, compareMetrics, dailySeries, cohortReports, sellerPerformance, insights, STAGE_LABELS } from '../../utils/performanceReport';
import { PRESETS, COMPARES, resolveRange, comparisonRange, dayOf } from '../../utils/reportPeriods';
import { LOST_REASONS } from '../../utils/crmLeadViews';
import { EmptyState } from '../ui';
import './performance-report.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const mins = (ms) => {
  if (!ms) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} د`;
  const h = Math.round(m / 6) / 10;
  return h < 48 ? `${h} س` : `${Math.round(h / 24)} يوم`;
};
const dateText = (key) => new Date(`${key}T12:00:00Z`).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const rangeText = (r) => (r.from === r.to ? dateText(r.from) : `${dateText(r.from)} – ${dateText(r.to)}`);

// The headline numbers: how each is shown, and whether a fall is the good direction
const METRICS = [
  { id: 'newLeads', ar: 'عملاء جدد', en: 'New clients', fmt: num },
  { id: 'replied', ar: 'اتردّ عليهم', en: 'First replies', fmt: num },
  { id: 'inTimePct', ar: 'الرد في الميعاد', en: 'Replied in time', fmt: (v) => `${v}%`, points: true },
  { id: 'medianReplyMs', ar: 'وقت الرد (الوسيط)', en: 'Reply time (median)', fmt: mins, lowerBetter: true },
  { id: 'viewings', ar: 'وصلوا لمعاينة', en: 'Reached a viewing', fmt: num },
  { id: 'closed', ar: 'صفقات اتقفلت', en: 'Deals closed', fmt: num },
  { id: 'conversionPct', ar: 'نسبة التحويل', en: 'Conversion', fmt: (v) => `${v}%`, points: true },
  { id: 'lost', ar: 'عملاء خسرناهم', en: 'Clients lost', fmt: num, lowerBetter: true },
  { id: 'commission', ar: 'عمولة الصفقات', en: 'Commission won', fmt: (v) => `${num(v)} ج` },
  { id: 'tasksDone', ar: 'مهام خلصت', en: 'Tasks done', fmt: num }
];

/** How a number moved against the comparison: the text, and good / bad / flat */
function delta(m, v, compared) {
  if (!compared) return null;
  const { cur, prev, change } = v;
  if (m.points) {
    const d = cur - prev;
    return { text: d === 0 ? 'زي ما هو' : `${d > 0 ? '+' : ''}${d} نقطة`, tone: d === 0 ? 'flat' : (d > 0) !== Boolean(m.lowerBetter) ? 'good' : 'bad', up: d > 0 };
  }
  if (change === null) return { text: cur > 0 ? 'جديد' : '—', tone: 'flat', up: cur > 0 };
  if (change === 0) return { text: 'زي ما هو', tone: 'flat', up: false };
  return { text: `${change > 0 ? '+' : ''}${change}%`, tone: (change > 0) !== Boolean(m.lowerBetter) ? 'good' : 'bad', up: change > 0 };
}

function Trend({ cur, prev, L }) {
  const W = 600;
  const H = 130;
  const n = cur.buckets.length;
  const max = Math.max(1, ...cur.buckets.map((b) => b.newLeads), ...(prev ? prev.buckets.map((b) => b.newLeads) : [0]));
  const slot = W / Math.max(n, 1);
  const bar = Math.max(2, slot * 0.6);
  const y = (v) => H - 18 - (v / max) * (H - 30);
  const line = prev ? prev.buckets.slice(0, n).map((b, i) => `${(i * slot + slot / 2).toFixed(1)},${y(b.newLeads).toFixed(1)}`).join(' ') : '';
  const total = cur.buckets.reduce((s, b) => s + b.newLeads, 0);
  return (
    <figure className="pr-trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={L(`عملاء جدد: ${total} على ${n} ${cur.step === 7 ? 'أسبوع' : 'يوم'}`, `New clients: ${total}`)} preserveAspectRatio="none">
        <line x1="0" y1={H - 18} x2={W} y2={H - 18} className="pr-trend__axis" />
        {cur.buckets.map((b, i) => {
          const h = (H - 18) - y(b.newLeads);
          return <rect key={b.day} x={i * slot + (slot - bar) / 2} y={y(b.newLeads)} width={bar} height={h} rx="2" className="pr-trend__bar"><title>{`${dateText(b.day)}: ${b.newLeads}`}</title></rect>;
        })}
        {line && <polyline points={line} className="pr-trend__prev" fill="none" />}
        {cur.buckets.map((b, i) => b.closed > 0 && <circle key={`c${b.day}`} cx={i * slot + slot / 2} cy={y(b.newLeads) - 6} r="4" className="pr-trend__won"><title>{`${dateText(b.day)}: ${b.closed} ${L('صفقة', 'deals')}`}</title></circle>)}
      </svg>
      <figcaption>
        <span><i className="pr-dot pr-dot--bar" /> {L('عملاء جدد', 'New clients')}</span>
        {prev && <span><i className="pr-dot pr-dot--prev" /> {L('الفترة المقارنة', 'Comparison')}</span>}
        <span><i className="pr-dot pr-dot--won" /> {L('يوم فيه صفقة', 'Deal closed')}</span>
        {cur.step === 7 && <span>{L('(كل عمود أسبوع)', '(one bar = a week)')}</span>}
      </figcaption>
    </figure>
  );
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** «تقارير الأداء»: any dates, against another period, with a trend, funnel, sources, team and findings (managers) */
export default function PerformanceReportPanel({ leads = [], lang = 'ar' }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const { tasks } = useTasks();
  const [now] = useState(() => Date.now());
  const [preset, setPreset] = useState('30');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [mode, setMode] = useState('previous');

  const range = useMemo(() => resolveRange(preset, now, custom), [preset, now, custom]);
  const prevRange = useMemo(() => comparisonRange(range, mode), [range, mode]);

  const data = useMemo(() => {
    const cur = periodMetrics(leads, tasks, range);
    const prev = prevRange ? periodMetrics(leads, tasks, prevRange) : null;
    const reports = cohortReports(leads, range);
    const prevReports = prevRange ? cohortReports(leads, prevRange) : null;
    const sellers = sellerPerformance(leads, tasks, range, now);
    return {
      cur, prev, compared: compareMetrics(cur, prev), reports, prevReports, sellers,
      trend: dailySeries(leads, range), prevTrend: prevRange ? dailySeries(leads, prevRange) : null,
      findings: insights({ metrics: cur, prev, funnel: reports.funnel, sources: reports.sources, sellers, leads, tasks, range, now })
    };
  }, [leads, tasks, range, prevRange, now]);

  const hasPrev = Boolean(prevRange);
  const { funnel, sources } = data.reports;
  const prevSource = (id) => data.prevReports?.sources.find((s) => s.id === id);
  const reasonLabel = (id) => LOST_REASONS.find((r) => r.id === id)?.ar || id;
  const toneIcon = { warn: AlertTriangle, good: CheckCircle2, info: Lightbulb };

  const exportCsv = () => {
    const rows = [[L('المؤشر', 'Metric'), rangeText(range), prevRange ? rangeText(prevRange) : '', L('التغيير', 'Change')]];
    for (const m of METRICS) {
      const v = data.compared[m.id];
      const d = delta(m, v, hasPrev);
      rows.push([L(m.ar, m.en), m.fmt(v.cur), hasPrev ? m.fmt(v.prev) : '', d?.text || '']);
    }
    rows.push([], [L('المصدر', 'Source'), L('عملاء', 'Clients'), L('اتردّ عليهم', 'Replied'), L('وقت الرد', 'Reply time'), L('معاينة %', 'Viewing %'), L('اتقفلت', 'Closed')]);
    for (const s of sources) rows.push([s.label, s.leads, s.replied, mins(s.medianReplyMs), `${s.visitPct}%`, s.closed]);
    rows.push([], [L('البياع', 'Seller'), L('عملاء', 'Clients'), L('اتردّ عليهم', 'Replied'), L('وقت الرد', 'Reply time'), L('اتقفلت', 'Closed'), L('العمولة', 'Commission'), L('مهام خلصت', 'Tasks done'), L('متأخرة', 'Overdue')]);
    for (const s of data.sellers) rows.push([s.name || s.uid, s.leads, s.replied, mins(s.medianReplyMs), s.closed, s.commission, s.tasksDone, s.tasksOverdue]);
    const blob = new Blob([`\uFEFF${rows.map((r) => r.map(csvCell).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `performance-${range.from}_${range.to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <section className="pr-panel" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="pr-head">
        <div>
          <h2><BarChart3 size={22} aria-hidden="true" /> {L('تقارير الأداء', 'Performance reports')}</h2>
          <p>{L('اختار أي فترة وقارنها بفترة تانية.', 'Pick any dates and compare them with another period.')}</p>
        </div>
        <button type="button" className="pr-export" onClick={exportCsv}><Download size={16} aria-hidden="true" /> {L('تصدير CSV', 'Export CSV')}</button>
      </header>

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

      {data.findings.length > 0 && (
        <ul className="pr-findings" aria-label={L('ملاحظات', 'Findings')}>
          {data.findings.map((f) => {
            const Icon = toneIcon[f.tone];
            return <li key={f.text} className={`is-${f.tone}`}><Icon size={18} aria-hidden="true" /><span>{f.text}</span></li>;
          })}
        </ul>
      )}

      <div className="pr-cards">
        {METRICS.map((m) => {
          const v = data.compared[m.id];
          const d = delta(m, v, hasPrev);
          return (
            <div key={m.id} className="pr-card">
              <span className="pr-card__label">{L(m.ar, m.en)}</span>
              <strong className="pr-card__value">{m.fmt(v.cur)}</strong>
              {d ? (
                <span className={`pr-card__delta is-${d.tone}`}>
                  {d.tone !== 'flat' && (d.up ? <TrendingUp size={14} aria-hidden="true" /> : <TrendingDown size={14} aria-hidden="true" />)} {d.text}
                  <small>{L('كان', 'was')} {m.fmt(v.prev)}</small>
                </span>
              ) : <span className="pr-card__delta">&nbsp;</span>}
            </div>
          );
        })}
      </div>

      <div className="pr-block">
        <h3>{L('العملاء الجدد يوم بيوم', 'New clients over time')}</h3>
        <Trend cur={data.trend} prev={data.prevTrend} L={L} />
      </div>

      <div className="pr-block">
        <h3>{L('العميل بيوصل لحد فين؟', 'How far clients get')} <small>({num(funnel.total)} {L('عميل وصل في الفترة', 'arrived in the period')}{data.prevReports ? ` · ${L('قبلها', 'before')} ${num(data.prevReports.funnel.total)}` : ''})</small></h3>
        {funnel.total === 0 ? <EmptyState title={L('مفيش عملاء في الفترة دي', 'No clients in this period')} /> : (
          <ul className="pr-funnel">
            {funnel.rows.map((r, i) => (
              <li key={r.id}>
                <div className="pr-funnel__top">
                  <span>{isAr ? STAGE_LABELS[r.id].ar : STAGE_LABELS[r.id].en}</span>
                  <b>{num(r.reached)} <small>({r.ofAll}%)</small>{data.prevReports && <small className="pr-funnel__prev"> {L('قبلها', 'before')} {num(data.prevReports.funnel.rows[i].reached)}</small>}</b>
                </div>
                <div className="pr-bar" aria-hidden="true"><i style={{ width: `${Math.max(r.ofAll, r.reached ? 2 : 0)}%` }} /></div>
                <span className="pr-funnel__meta">{r.id !== 'new' && <>{r.ofPrevious}% {L('من اللي قبلها', 'of the previous')}{r.avgDays ? ` · ${L('بعد', 'after')} ${r.avgDays} ${L('يوم', 'd')}` : ''}</>}</span>
              </li>
            ))}
          </ul>
        )}
        {funnel.lost > 0 && <p className="pr-note">{L('خسرنا', 'Lost')} {num(funnel.lost)} {L('عميل', 'clients')}{funnel.topLostReason ? ` — ${L('أكتر سبب', 'main reason')}: ${reasonLabel(funnel.topLostReason.id)} (${funnel.topLostReason.count})` : ''}</p>}
      </div>

      <div className="pr-block">
        <h3>{L('كل مصدر عامل إيه؟', 'How each source does')}</h3>
        {sources.length === 0 ? <EmptyState title={L('مفيش عملاء في الفترة دي', 'No clients in this period')} /> : (
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead><tr>
                <th>{L('المصدر', 'Source')}</th><th>{L('عملاء', 'Clients')}</th>{hasPrev && <th>{L('قبلها', 'Before')}</th>}<th>{L('اتردّ عليهم', 'Replied')}</th>
                <th>{L('وقت الرد', 'Reply time')}</th><th>{L('في الميعاد', 'In time')}</th><th>{L('معاينة', 'Viewing')}</th><th>{L('اتقفلت', 'Closed')}</th>
              </tr></thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">{s.label}</th><td>{num(s.leads)}</td>{hasPrev && <td>{num(prevSource(s.id)?.leads || 0)}</td>}<td>{num(s.replied)}</td>
                    <td>{mins(s.medianReplyMs)}</td><td>{s.replied ? `${s.inTimePct}%` : '—'}</td><td>{s.visitPct}%</td><td>{num(s.closed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pr-block">
        <h3>{L('أداء الفريق', 'Team performance')}</h3>
        {data.sellers.length === 0 ? <EmptyState title={L('مفيش عملاء أو مهام متوزعة في الفترة دي', 'No assigned clients or tasks in this period')} /> : (
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead><tr>
                <th>{L('البياع', 'Seller')}</th><th>{L('عملاء', 'Clients')}</th><th>{L('وقت الرد', 'Reply time')}</th><th>{L('في الميعاد', 'In time')}</th>
                <th>{L('اتقفلت', 'Closed')}</th><th>{L('العمولة', 'Commission')}</th><th>{L('مهام خلصت', 'Tasks done')}</th><th>{L('متأخرة', 'Overdue')}</th>
              </tr></thead>
              <tbody>
                {data.sellers.map((s) => (
                  <tr key={s.key}>
                    <th scope="row">{s.name || L('غير معروف', 'Unknown')}</th><td>{num(s.leads)}</td><td>{mins(s.medianReplyMs)}</td><td>{s.replied ? `${s.inTimePct}%` : '—'}</td>
                    <td>{num(s.closed)}</td><td>{num(s.commission)}</td><td>{num(s.tasksDone)}</td><td className={s.tasksOverdue ? 'is-bad' : ''}>{num(s.tasksOverdue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
