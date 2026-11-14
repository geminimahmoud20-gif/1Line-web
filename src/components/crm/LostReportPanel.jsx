import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { lostReport } from '../../utils/lostReport';
import { STAGE_LABELS } from '../../utils/performanceReport';
import { EmptyState } from '../ui';
import './performance-report.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');

function Bars({ rows, total, label }) {
  return (
    <ul className="pr-funnel">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="pr-funnel__top"><span>{label ? label(r) : r.label}</span><b>{num(r.count)} <small>({total ? Math.round((r.count / total) * 100) : 0}%)</small></b></div>
          <div className="pr-bar" aria-hidden="true"><i style={{ width: `${total ? Math.max(2, Math.round((r.count / total) * 100)) : 0}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** «ضياع العملاء»: who we lost in the period, why, where in the pipeline, and which ones deserve a second try (managers) */
export default function LostReportPanel({ leads = [], range, prevRange = null, lang = 'ar', onOpenLead }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const r = useMemo(() => lostReport(leads, { range, prevRange }), [leads, range, prevRange]);
  const stageName = (id) => (STAGE_LABELS[id] ? (isAr ? STAGE_LABELS[id].ar : STAGE_LABELS[id].en) : id);
  const trend = r.change === null ? null : r.change > 0 ? 'is-bad' : r.change < 0 ? 'is-good' : '';

  if (r.total === 0) {
    return <section className="pr-panel"><EmptyState title={L('ماضيعناش عملاء في الفترة دي', 'No clients lost in this period')} description={prevRange && r.prevTotal ? L(`الفترة المقارنة كان فيها ${r.prevTotal}.`, `The comparison had ${r.prevTotal}.`) : undefined} /></section>;
  }
  return (
    <section className="pr-panel">
      <div className="pr-cards">
        <div className="pr-card">
          <span className="pr-card__label">{L('عملاء ضاعوا', 'Clients lost')}</span>
          <strong className="pr-card__value">{num(r.total)}</strong>
          {prevRange ? (
            <span className={`pr-card__delta ${trend || ''}`}>
              {r.change > 0 && <TrendingUp size={14} aria-hidden="true" />}{r.change < 0 && <TrendingDown size={14} aria-hidden="true" />}
              {r.change === null ? (r.total > 0 ? L('جديد', 'new') : '—') : `${r.change > 0 ? '+' : ''}${r.change}%`}<small>{L('كان', 'was')} {num(r.prevTotal)}</small>
            </span>
          ) : <span className="pr-card__delta">&#8203;</span>}
        </div>
        <div className="pr-card"><span className="pr-card__label">{L('عمولة ضاعت', 'Commission lost')}</span><strong className="pr-card__value">{num(r.valueLost)} {L('ج', 'EGP')}</strong><span className="pr-card__delta">&#8203;</span></div>
        <div className="pr-card"><span className="pr-card__label">{L('ضاعوا بعد معاينة أو أكتر', 'Lost after a viewing')}</span><strong className="pr-card__value">{num(r.close)}</strong><span className="pr-card__delta">{L('كانوا قريبين: يستاهلوا محاولة تانية', 'Close: worth a second try')}</span></div>
        <div className="pr-card"><span className="pr-card__label">{L('اتخسروا بعد', 'Lost after')}</span><strong className="pr-card__value">{num(r.daysToLose)} {L('يوم', 'days')}</strong><span className="pr-card__delta">{L('من وصولهم (متوسط)', 'on average')}</span></div>
      </div>

      <div className="pr-block"><h3>{L('ليه ضاعوا؟', 'Why?')}</h3><Bars rows={r.reasons} total={r.total} /></div>
      <div className="pr-block"><h3>{L('كانوا في أنهي مرحلة؟', 'At which stage?')}</h3><Bars rows={r.stages} total={r.total} label={(x) => stageName(x.id)} /></div>

      <div className="pr-block">
        <h3>{L('ومين كان معاهم؟', 'With whom?')}</h3>
        <div className="pr-table-wrap">
          <table className="pr-table">
            <thead><tr><th>{L('البياع', 'Seller')}</th><th>{L('ضاعوا', 'Lost')}</th><th>{L('بعد معاينة', 'After viewing')}</th><th>{L('عمولة ضاعت', 'Commission lost')}</th></tr></thead>
            <tbody>{r.sellers.map((s) => <tr key={s.id}><th scope="row">{s.label}</th><td>{num(s.count)}</td><td>{num(s.close)}</td><td>{num(s.commission)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className="pr-block"><h3>{L('وجايين منين؟', 'From which source?')}</h3><Bars rows={r.sources} total={r.total} /></div>

      <div className="pr-block">
        <h3>{L('أكبر الخسائر (القريبين الأول)', 'Biggest losses (close ones first)')}</h3>
        <ul className="pr-lost">
          {r.top.map(({ lead, reason, stage, commission, close }) => (
            <li key={lead.id}>
              <button type="button" onClick={() => onOpenLead?.(lead)}>
                <span className="pr-lost__name">{lead.name || L('عميل', 'Client')}</span>
                <span className="pr-lost__meta">
                  {close && <span className="pr-pill is-warn">{L('كان قريب', 'was close')}</span>}
                  <span className="pr-pill">{stageName(stage)}</span>
                  <span className="pr-pill">{r.reasons.find((x) => x.id === reason)?.label}</span>
                  {lead.ownerName && <span className="pr-pill">{lead.ownerName}</span>}
                  {commission > 0 && <span className="pr-pill">{num(commission)} {L('ج', 'EGP')}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="pr-note">{L('دوس على العميل يفتح ملفه عشان تحاول معاه تاني أو تراجع سبب الخسارة.', 'Open a client to try again or review the reason.')}</p>
      </div>
    </section>
  );
}
