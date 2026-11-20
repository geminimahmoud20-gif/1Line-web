import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Download, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { periodMetrics, compareMetrics, dailySeries, cohortReports, sellerPerformance, insights, STAGE_LABELS } from '../../utils/performanceReport';
import { dateText, rangeText } from '../../utils/reportPeriods';
import { LOST_REASONS } from '../../utils/crmLeadViews';
import { EmptyState, AreaChart } from '../ui';
import { biggestDrop } from '../../utils/performanceReport';
import './executive-summary.css';
import './performance-report.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const mins = (ms) => {
  if (!ms) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} د`;
  const h = Math.round(m / 6) / 10;
  return h < 48 ? `${h} س` : `${Math.round(h / 24)} يوم`;
};

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

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** The sales half of the reports hub: the range and comparison come from the hub's controls (managers) */
export default function PerformanceReportPanel({ leads = [], lang = 'ar', range, prevRange = null, now, hide = [] }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const { tasks } = useTasks();

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
  const drop = biggestDrop(data.reports.funnel);
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
    <section className="pr-panel">
      <div className="pr-toolbar">
        <button type="button" className="pr-export" onClick={exportCsv}><Download size={16} aria-hidden="true" /> {L('تصدير CSV', 'Export CSV')}</button>
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
        <AreaChart
          series={[
            { id: 'n', label: L('عملاء جدد', 'New clients'), values: data.trend.buckets.map((b) => b.newLeads), tone: 'info' },
            ...(data.prevTrend ? [{ id: 'p', label: L('الفترة المقارنة', 'Comparison'), values: data.prevTrend.buckets.slice(0, data.trend.buckets.length).map((b) => b.newLeads), tone: 'neutral' }] : []),
            { id: 'c', label: L('صفقات', 'Deals'), values: data.trend.buckets.map((b) => b.closed), tone: 'success' }
          ]}
          labels={data.trend.buckets.map((b) => dateText(b.day))}
          ariaLabel={L('العملاء الجدد والصفقات على الفترة، مع الفترة المقارنة', 'New clients and deals over the period, with the comparison')}
          smooth
        />
        {data.trend.step === 7 && <p className="pr-note">{L('كل نقطة أسبوع', 'One point = a week')}</p>}
      </div>

      <div className="pr-block">
        <h3>{L('العميل بيوصل لحد فين؟', 'How far clients get')} <small>({num(funnel.total)} {L('عميل وصل في الفترة', 'arrived in the period')}{data.prevReports ? ` · ${L('قبلها', 'before')} ${num(data.prevReports.funnel.total)}` : ''})</small></h3>
        {funnel.total === 0 ? <EmptyState title={L('مفيش عملاء في الفترة دي', 'No clients in this period')} /> : (
          <ol className="xs-funnel xs-funnel--detail">
            {funnel.rows.map((r, i) => (
              <li key={r.id} className={drop?.id === r.id ? 'is-drop' : ''}>
                <span className="xs-funnel__label">{isAr ? STAGE_LABELS[r.id].ar : STAGE_LABELS[r.id].en}</span>
                <span className="xs-funnel__bar" aria-hidden="true"><i style={{ inlineSize: `${Math.max(r.ofAll, r.reached ? 3 : 0)}%` }} /></span>
                <b className="xs-funnel__num">{num(r.reached)}<small> · {r.ofAll}%{r.id !== 'new' ? ` · ${r.ofPrevious}% ${L('من اللي قبلها', 'of previous')}` : ''}{r.avgDays ? ` · ${r.avgDays} ${L('يوم', 'd')}` : ''}{data.prevReports ? ` · ${L('قبلها', 'before')} ${num(data.prevReports.funnel.rows[i].reached)}` : ''}</small></b>
              </li>
            ))}
          </ol>
        )}
        {funnel.lost > 0 && <p className="pr-note">{L('خسرنا', 'Lost')} {num(funnel.lost)} {L('عميل', 'clients')}{funnel.topLostReason ? ` — ${L('أكتر سبب', 'main reason')}: ${reasonLabel(funnel.topLostReason.id)} (${funnel.topLostReason.count})` : ''}</p>}
      </div>

      {!hide.includes('sources') && <div className="pr-block">
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
      </div>}

      {!hide.includes('team') && <div className="pr-block">
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
      </div>}
    </section>
  );
}
