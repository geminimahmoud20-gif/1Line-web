import { useMemo } from 'react';
import { Users, Clock, Handshake, AlertTriangle } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { sellerPerformance, teamComparison } from '../../utils/performanceReport';
import { KpiRow, KpiTile, EmptyState } from '../ui';
import CallsReportPanel from './CallsReportPanel';
import './executive-summary.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const mins = (ms) => {
  if (!ms) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} د`;
  const h = Math.round(m / 6) / 10;
  return h < 48 ? `${h} س` : `${Math.round(h / 24)} يوم`;
};
const FLAG_TEXT = {
  slow_reply: { ar: 'ردّه أبطأ من الفريق', en: 'Slower replies' },
  no_close: { ar: 'مفيش إقفال', en: 'No closes' },
  late_tasks: { ar: 'مهام متأخرة', en: 'Late tasks' }
};

/** «الفريق»: each seller against the team's own average, who needs help and why, then the calls report */
export default function TeamReportPanel({ leads = [], range, prevRange = null, now, lang = 'ar' }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const { tasks } = useTasks();
  const { avg, rows } = useMemo(() => teamComparison(sellerPerformance(leads, tasks, range, now)), [leads, tasks, range, now]);
  const needHelp = rows.filter((r) => r.flags.length > 0);
  const overdue = rows.reduce((a, r) => a + r.tasksOverdue, 0);
  const closed = rows.reduce((a, r) => a + r.closed, 0);

  return (
    <div className="xs">
      <KpiRow label={L('ملخص الفريق', 'Team summary')}>
        <KpiTile label={L('في الفريق', 'Sellers')} value={rows.length} tone="info" icon={<Users size={16} />} />
        <KpiTile label={L('الرد في الميعاد (الفريق)', 'Team in-time replies')} value={avg.inTimePct} unit="%" tone={avg.inTimePct >= 80 ? 'success' : avg.inTimePct >= 60 ? 'warning' : 'danger'} hint={L(`وسيط الرد ${mins(avg.medianReplyMs)}`, `median ${mins(avg.medianReplyMs)}`)} icon={<Clock size={16} />} />
        <KpiTile label={L('صفقات الفريق', 'Team deals')} value={closed} tone="success" hint={L(`${avg.closePct}% من العملاء`, `${avg.closePct}% of clients`)} icon={<Handshake size={16} />} />
        <KpiTile label={L('محتاجين دعم', 'Need support')} value={needHelp.length} tone={needHelp.length ? 'danger' : 'success'} hint={overdue ? L(`${overdue} مهمة متأخرة في الفريق`, `${overdue} late tasks`) : L('مفيش مهام متأخرة', 'No late tasks')} icon={<AlertTriangle size={16} />} />
      </KpiRow>

      <section className="xs-card" aria-labelledby="tm-table">
        <h2 id="tm-table" className="xs-h">{L('كل واحد مقارنة بمتوسط الفريق', 'Each seller against the team average')}</h2>
        {rows.length === 0 ? <EmptyState title={L('مفيش عملاء أو مهام متوزعة في الفترة دي', 'No assigned clients or tasks in this period')} /> : (
          <div className="pr-table-wrap">
            <table className="pr-table tm-table">
              <thead><tr>
                <th>{L('البياع', 'Seller')}</th><th>{L('عملاء', 'Clients')}</th><th>{L('في الميعاد', 'In time')}</th><th>{L('وقت الرد', 'Reply time')}</th>
                <th>{L('معاينة', 'Viewing')}</th><th>{L('اتقفلت', 'Closed')}</th><th>{L('العمولة', 'Commission')}</th><th>{L('متأخرة', 'Late')}</th><th>{L('محتاج إيه', 'Needs')}</th>
              </tr></thead>
              <tbody>
                <tr className="tm-avg"><th scope="row">{L('متوسط الفريق', 'Team average')}</th><td>—</td><td>{avg.inTimePct}%</td><td>{mins(avg.medianReplyMs)}</td><td>—</td><td>{avg.closePct}%</td><td>—</td><td>—</td><td /></tr>
                {rows.map((r) => (
                  <tr key={r.key} className={r.flags.length ? 'is-flagged' : ''}>
                    <th scope="row">{r.name || L('غير معروف', 'Unknown')}</th>
                    <td>{num(r.leads)}</td>
                    <td className={r.flags.includes('slow_reply') ? 'is-bad' : r.replied && r.inTimePct >= avg.inTimePct ? 'is-good' : ''}>{r.replied ? `${r.inTimePct}%` : '—'}</td>
                    <td>{mins(r.medianReplyMs)}</td>
                    <td>{r.leads ? `${r.visitPct}%` : '—'}</td>
                    <td className={r.flags.includes('no_close') ? 'is-bad' : ''}>{num(r.closed)}{r.leads ? <small> · {r.closePct}%</small> : null}</td>
                    <td>{num(r.commission)}</td>
                    <td className={r.tasksOverdue ? 'is-bad' : ''}>{num(r.tasksOverdue)}</td>
                    <td>{r.flags.length ? r.flags.map((f) => <span key={f} className="tm-flag">{isAr ? FLAG_TEXT[f].ar : FLAG_TEXT[f].en}</span>) : <span className="tm-ok">{L('تمام', 'OK')}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="xs-card" aria-labelledby="tm-calls">
        <h2 id="tm-calls" className="xs-h">{L('الاتصالات: العملاء بيردّوا إمتى؟', 'Calls: when clients answer')}</h2>
        <CallsReportPanel leads={leads} range={range} prevRange={prevRange} lang={lang} />
      </section>
    </div>
  );
}
