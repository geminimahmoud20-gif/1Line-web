import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { weekCompare, funnelReport, sourceReport, taskBoard, STAGE_LABELS } from '../../utils/performanceReport';
import { LOST_REASONS } from '../../utils/crmLeadViews';
import { EmptyState } from '../ui';
import './performance-report.css';

const PERIODS = [
  { days: 7, ar: 'آخر ٧ أيام', en: 'Last 7 days' },
  { days: 30, ar: 'آخر ٣٠ يوم', en: 'Last 30 days' },
  { days: 90, ar: 'آخر ٩٠ يوم', en: 'Last 90 days' }
];
const num = (n) => Number(n || 0).toLocaleString('en-US');
const mins = (ms) => {
  if (!ms) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} د`;
  const h = Math.round(m / 6) / 10;
  return h < 48 ? `${h} س` : `${Math.round(h / 24)} يوم`;
};

/** «تقارير الأداء»: this week vs last, the stage funnel, each source and the team's tasks (managers) */
export default function PerformanceReportPanel({ leads = [], lang = 'ar' }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const { tasks } = useTasks();
  const [days, setDays] = useState(30);
  const [now] = useState(() => Date.now());

  const week = useMemo(() => weekCompare(leads, tasks, now), [leads, tasks, now]);
  const funnel = useMemo(() => funnelReport(leads, { days, now }), [leads, days, now]);
  const sources = useMemo(() => sourceReport(leads, { days, now }), [leads, days, now]);
  const board = useMemo(() => taskBoard(tasks, { days, now }), [tasks, days, now]);

  const cards = [
    { id: 'newLeads', ar: 'عملاء جدد', en: 'New clients' },
    { id: 'replied', ar: 'اتردّ عليهم', en: 'First replies' },
    { id: 'viewings', ar: 'وصلوا لمعاينة', en: 'Reached a viewing' },
    { id: 'closed', ar: 'صفقات اتقفلت', en: 'Deals closed' },
    { id: 'commission', ar: 'عمولة الصفقات', en: 'Commission won', money: true },
    { id: 'tasksDone', ar: 'مهام خلصت', en: 'Tasks done' }
  ];
  const reasonLabel = (id) => LOST_REASONS.find((r) => r.id === id)?.ar || id;

  return (
    <section className="pr-panel" dir={isAr ? 'rtl' : 'ltr'}>
      <header className="pr-head">
        <div>
          <h2><BarChart3 size={22} aria-hidden="true" /> {L('تقارير الأداء', 'Performance reports')}</h2>
          <p>{L('الأسبوع ده قصاد اللي قبله، وكل مرحلة وصلها العملاء، ومصادرك، وشغل الفريق.', 'This week vs last, how far clients get, each source, and the team’s work.')}</p>
        </div>
        <div className="pr-seg" role="group" aria-label={L('الفترة', 'Period')}>
          {PERIODS.map((p) => (
            <button key={p.days} type="button" className={days === p.days ? 'is-on' : ''} aria-pressed={days === p.days} onClick={() => setDays(p.days)}>{isAr ? p.ar : p.en}</button>
          ))}
        </div>
      </header>

      <div className="pr-cards">
        {cards.map((c) => {
          const v = week[c.id];
          const up = v.change > 0;
          return (
            <div key={c.id} className="pr-card">
              <span className="pr-card__label">{L(c.ar, c.en)}</span>
              <strong className="pr-card__value">{num(v.cur)}{c.money ? ` ${L('ج', 'EGP')}` : ''}</strong>
              <span className={`pr-card__delta ${v.change === null ? '' : up ? 'is-up' : v.change < 0 ? 'is-down' : ''}`}>
                {v.change === null ? L('مفيش قبله للمقارنة', 'Nothing to compare')
                  : <>{up ? <TrendingUp size={14} aria-hidden="true" /> : v.change < 0 ? <TrendingDown size={14} aria-hidden="true" /> : null} {v.change > 0 ? '+' : ''}{v.change}% {L('عن اللي فات', 'vs before')}</>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="pr-block">
        <h3>{L('العميل بيوصل لحد فين؟', 'How far clients get')} <small>({num(funnel.total)} {L('عميل', 'clients')})</small></h3>
        {funnel.total === 0 ? <EmptyState title={L('مفيش عملاء في الفترة دي', 'No clients in this period')} /> : (
          <ul className="pr-funnel">
            {funnel.rows.map((r) => (
              <li key={r.id}>
                <div className="pr-funnel__top">
                  <span>{isAr ? STAGE_LABELS[r.id].ar : STAGE_LABELS[r.id].en}</span>
                  <b>{num(r.reached)} <small>({r.ofAll}%)</small></b>
                </div>
                <div className="pr-bar" aria-hidden="true"><i style={{ width: `${Math.max(r.ofAll, r.reached ? 2 : 0)}%` }} /></div>
                <span className="pr-funnel__meta">
                  {r.id !== 'new' && <>{r.ofPrevious}% {L('من اللي قبلها', 'of the previous')}{r.avgDays ? ` · ${L('بعد', 'after')} ${r.avgDays} ${L('يوم', 'd')}` : ''}</>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {funnel.lost > 0 && (
          <p className="pr-note">{L('خسرنا', 'Lost')} {num(funnel.lost)} {L('عميل', 'clients')}{funnel.topLostReason ? ` — ${L('أكتر سبب', 'main reason')}: ${reasonLabel(funnel.topLostReason.id)} (${funnel.topLostReason.count})` : ''}</p>
        )}
      </div>

      <div className="pr-block">
        <h3>{L('كل مصدر عامل إيه؟', 'How each source does')}</h3>
        {sources.length === 0 ? <EmptyState title={L('مفيش عملاء في الفترة دي', 'No clients in this period')} /> : (
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead><tr>
                <th>{L('المصدر', 'Source')}</th><th>{L('عملاء', 'Clients')}</th><th>{L('اتردّ عليهم', 'Replied')}</th>
                <th>{L('وقت الرد', 'Reply time')}</th><th>{L('في الميعاد', 'In time')}</th><th>{L('معاينة', 'Viewing')}</th><th>{L('اتقفلت', 'Closed')}</th>
              </tr></thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">{s.label}</th><td>{num(s.leads)}</td><td>{num(s.replied)}</td>
                    <td>{mins(s.medianReplyMs)}</td><td>{s.replied ? `${s.inTimePct}%` : '—'}</td><td>{s.visitPct}%</td><td>{num(s.closed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pr-block">
        <h3>{L('شغل الفريق في المهام', 'Team task activity')}</h3>
        {board.length === 0 ? <EmptyState title={L('لسه مفيش مهام متوزعة على الفريق', 'No tasks assigned to the team yet')} /> : (
          <ul className="pr-team">
            {board.map((m) => (
              <li key={m.uid}>
                <span className="pr-team__name">{m.name || m.uid.slice(0, 6)}</span>
                <span><b>{num(m.done)}</b> {L('خلصت', 'done')}</span>
                <span><b>{num(m.open)}</b> {L('مفتوحة', 'open')}</span>
                <span className={m.overdue ? 'is-bad' : ''}><b>{num(m.overdue)}</b> {L('متأخرة', 'overdue')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
