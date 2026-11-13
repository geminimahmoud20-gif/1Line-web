import { useMemo, useState } from 'react';
import { Gauge } from 'lucide-react';
import { sellerReport, PERIODS } from '../../utils/sellerReport';
import { getLiveLeadDesks } from '../../utils/rbacRules';
import { getActiveAccessConfig } from '../../services/accessConfig';
import { EmptyState } from '../ui';
import './seller-report.css';

/** «أداء البياعين»: reply speed, visits, closings and what is waiting, per person or team. */
export default function SellerReportPanel({ leads = [], lang = 'ar' }) {
  const isAr = lang === 'ar';
  const L = (ar, en) => (isAr ? ar : en);
  const [period, setPeriod] = useState('30');

  const rows = useMemo(() => {
    const desks = getLiveLeadDesks(getActiveAccessConfig());
    const deskLabel = (v) => {
      if (!v || v === 'Unassigned') return L('غير مسند', 'Unassigned');
      const d = desks.find((x) => x.value === v);
      return d ? (isAr ? d.label_ar : d.label_en) : v;
    };
    return sellerReport(leads, { days: PERIODS.find((p) => p.id === period)?.days || 0, deskLabel });
  }, [leads, period, isAr]); // eslint-disable-line react-hooks/exhaustive-deps -- L only reads isAr

  return (
    <section className="sr-panel" aria-labelledby="sr-title">
      <header className="sr-head">
        <h3 id="sr-title"><Gauge size={20} aria-hidden="true" /> {L('أداء البياعين', 'Seller performance')}</h3>
        <p>{L('سرعة الرد، والمعاينات، والإغلاق، واللي مستني رد دلوقتي، لكل بياع أو فريق.', 'Reply speed, visits, closings and what is waiting, per person or team.')}</p>
      </header>

      <div className="sr-seg" role="radiogroup" aria-label={L('الفترة', 'Period')}>
        {PERIODS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={period === p.id} className={period === p.id ? 'is-on' : ''} onClick={() => setPeriod(p.id)}>{isAr ? p.ar : p.en}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={<Gauge size={22} />} title={L('مفيش عملاء في الفترة دي', 'No leads in this period')} description={L('أول ما عملاء يتوزعوا على البياعين هتظهر أرقامهم هنا.', 'Numbers appear once leads are assigned.')} />
      ) : (
        <ul className="sr-rows">
          {rows.map((r) => (
            <li key={r.value} className="sr-row">
              <div className="sr-name">
                <strong>{r.label || L('بدون اسم', 'No name')}</strong>
                <small>{r.person ? L('بياع', 'Person') : L('فريق', 'Team')}</small>
              </div>
              <dl className="sr-nums">
                <div><dt>{L('عملاء', 'Leads')}</dt><dd>{r.leads}</dd></div>
                <div><dt>{L('متوسط الرد', 'Avg reply')}</dt><dd>{r.replied ? L(`${r.avgReplyMin} د`, `${r.avgReplyMin} min`) : '—'}</dd></div>
                <div><dt>{L('رد في المهلة', 'In time')}</dt><dd>{r.replied ? `${r.inTimeRate}%` : '—'}</dd></div>
                <div><dt>{L('معاينة', 'Visits')}</dt><dd>{r.visits}<small> ({r.visitRate}%)</small></dd></div>
                <div><dt>{L('اتقفل', 'Closed')}</dt><dd>{r.closed}</dd></div>
              </dl>
              <div className="sr-now">
                <span className={r.late > 0 ? 'is-bad' : ''}>{L(`${r.waiting} مستني رد`, `${r.waiting} waiting`)}{r.late > 0 ? L(` (${r.late} متأخر)`, ` (${r.late} late)`) : ''}</span>
                <span className={r.overdue > 0 ? 'is-bad' : ''}>{L(`${r.overdue} متابعة متأخرة`, `${r.overdue} overdue follow-ups`)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-note">{L('المهلة المطلوبة للرد: ١٥ دقيقة لعملاء الإعلانات، وساعتين للباقي.', 'Reply target: 15 minutes for ad clients, 2 hours for the rest.')}</p>
    </section>
  );
}
