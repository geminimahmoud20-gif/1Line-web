import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { callStats, slotLabel, WEEKDAYS_AR, MIN_SLOT_CALLS, MIN_TOTAL_CALLS } from '../../utils/callOutcomes';
import { EmptyState } from '../ui';
import './performance-report.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');

/** «الاتصالات»: how often clients answer, and when (from the result the team marks after each call) (managers) */
export default function CallsReportPanel({ leads = [], range, prevRange = null, lang = 'ar' }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const cur = useMemo(() => callStats(leads, range), [leads, range]);
  const prev = useMemo(() => (prevRange ? callStats(leads, prevRange) : null), [leads, prevRange]);
  const all = useMemo(() => callStats(leads, null), [leads]);

  if (all.total === 0) {
    return <section className="pr-panel"><EmptyState title={L('لسه مفيش مكالمات متسجّلة', 'No calls recorded yet')} description={L('بعد كل مكالمة من الـ CRM (زرار «اتصل») هيظهر سؤال «ردّ ولا ما ردّش؟». لما النتايج تتجمّع هتشوف هنا أنهي ساعات وأيام العملاء بيردّوا فيها.', 'After each call a question appears; the results build this report.')} /></section>;
  }
  const change = prev && prev.total > 0 ? Math.round(((cur.total - prev.total) / prev.total) * 100) : null;
  const pointsDelta = prev && prev.total > 0 ? cur.rate - prev.rate : null;
  const bar = (rate) => ({ width: `${Math.max(rate, rate ? 3 : 0)}%` });

  return (
    <section className="pr-panel">
      <div className="pr-cards">
        <div className="pr-card">
          <span className="pr-card__label">{L('مكالمات متسجّلة', 'Calls recorded')}</span>
          <strong className="pr-card__value">{num(cur.total)}</strong>
          {prev ? (
            <span className={`pr-card__delta ${change > 0 ? 'is-good' : change < 0 ? 'is-bad' : ''}`}>
              {change > 0 && <TrendingUp size={14} aria-hidden="true" />}{change < 0 && <TrendingDown size={14} aria-hidden="true" />}
              {change === null ? (cur.total > 0 ? L('جديد', 'new') : '—') : `${change > 0 ? '+' : ''}${change}%`}<small>{L('كان', 'was')} {num(prev.total)}</small>
            </span>
          ) : <span className="pr-card__delta">&#8203;</span>}
        </div>
        <div className="pr-card">
          <span className="pr-card__label">{L('نسبة الرد', 'Answer rate')}</span>
          <strong className="pr-card__value">{cur.rate}%</strong>
          {pointsDelta !== null ? <span className={`pr-card__delta ${pointsDelta > 0 ? 'is-good' : pointsDelta < 0 ? 'is-bad' : ''}`}>{pointsDelta > 0 ? '+' : ''}{pointsDelta} {L('نقطة', 'pts')}<small>{L('كان', 'was')} {prev.rate}%</small></span> : <span className="pr-card__delta">&#8203;</span>}
        </div>
        <div className="pr-card"><span className="pr-card__label">{L('رقم غلط', 'Wrong numbers')}</span><strong className="pr-card__value">{num(cur.wrong)}</strong><span className="pr-card__delta">{L('بيانات محتاجة تصليح', 'data to fix')}</span></div>
        <div className="pr-card"><span className="pr-card__label">{L('ردّوا فعلًا', 'Answered')}</span><strong className="pr-card__value">{num(cur.answered)}</strong><span className="pr-card__delta">&#8203;</span></div>
      </div>

      {!all.enough && (
        <ul className="pr-findings"><li className="is-info"><Info size={18} aria-hidden="true" /><span>{L(`عدد المكالمات المتسجّلة ${all.total} لحد دلوقتي. الأوقات أدناه إرشادية، وهتبقى أدق لما توصل ${MIN_TOTAL_CALLS} مكالمة فأكتر.`, 'Few calls so far: treat the times as a hint.')}</span></li></ul>
      )}

      <div className="pr-block">
        <h3>{L('أحسن وقت للاتصال', 'Best time to call')}</h3>
        {cur.best.length === 0 ? <p className="pr-note">{L(`مفيش فترة فيها ${MIN_SLOT_CALLS} مكالمات على الأقل في المدى ده.`, 'No time slot has enough calls yet.')}</p> : (
          <ul className="pr-findings">
            {cur.best.map((s) => <li key={s.from} className="is-good"><span>{slotLabel(s.from, s.to)} — {L('الرد', 'answered')} {s.rate}% ({num(s.calls)} {L('مكالمة', 'calls')})</span></li>)}
          </ul>
        )}
        <ul className="pr-funnel">
          {cur.slots.map((s) => (
            <li key={s.from}>
              <div className="pr-funnel__top"><span>{slotLabel(s.from, s.to)}</span><b>{s.rate}% <small>({num(s.calls)})</small></b></div>
              <div className="pr-bar" aria-hidden="true"><i style={bar(s.rate)} /></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="pr-block">
        <h3>{L('حسب اليوم', 'By weekday')}</h3>
        <ul className="pr-funnel">
          {cur.days.map((d) => (
            <li key={d.weekday}>
              <div className="pr-funnel__top"><span>{WEEKDAYS_AR[d.weekday]}</span><b>{d.rate}% <small>({num(d.calls)})</small></b></div>
              <div className="pr-bar" aria-hidden="true"><i style={bar(d.rate)} /></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="pr-block">
        <h3>{L('حسب البياع', 'By salesperson')}</h3>
        <div className="pr-table-wrap">
          <table className="pr-table">
            <thead><tr><th>{L('البياع', 'Seller')}</th><th>{L('مكالمات', 'Calls')}</th><th>{L('نسبة الرد', 'Answer rate')}</th></tr></thead>
            <tbody>{cur.sellers.map((s) => <tr key={s.id}><th scope="row">{s.name || L('غير معروف', 'Unknown')}</th><td>{num(s.calls)}</td><td>{s.rate}%</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
