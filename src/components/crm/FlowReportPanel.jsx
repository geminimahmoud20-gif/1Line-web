import { useMemo } from 'react';
import { flowReport, IDLE_HOURS } from '../../utils/flowReport';
import { STAGE_LABELS } from '../../utils/performanceReport';
import { EmptyState } from '../ui';
import './performance-report.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const limitText = (h, isAr) => (h < 48 ? `${h} ${isAr ? 'ساعة' : 'h'}` : `${Math.round(h / 24)} ${isAr ? 'أيام' : 'days'}`);

/** «تدفق الشغل»: where open clients wait now, who holds the late ones, and which stage is the bottleneck */
export default function FlowReportPanel({ leads = [], lang = 'ar', onOpenLead }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const r = useMemo(() => flowReport(leads), [leads]);
  const stageName = (id) => (STAGE_LABELS[id] ? (isAr ? STAGE_LABELS[id].ar : STAGE_LABELS[id].en) : id);

  if (!r.totals.open) return <section className="pr-panel"><EmptyState title={L('مفيش عملاء مفتوحين دلوقتي', 'No open clients')} /></section>;
  return (
    <section className="pr-panel">
      <div className="pr-cards">
        <div className="pr-card"><span className="pr-card__label">{L('عملاء مفتوحين', 'Open clients')}</span><strong className="pr-card__value">{num(r.totals.open)}</strong><span className="pr-card__delta">&#8203;</span></div>
        <div className="pr-card"><span className="pr-card__label">{L('متأخرين عن وقت مرحلتهم', 'Past their stage limit')}</span><strong className="pr-card__value">{num(r.totals.late)}</strong><span className={`pr-card__delta ${r.totals.latePct >= 30 ? 'is-bad' : ''}`}>{r.totals.latePct}% {L('من المفتوحين', 'of open')}</span></div>
        <div className="pr-card"><span className="pr-card__label">{L(`محدش لمسهم من ${IDLE_HOURS} ساعة`, `Untouched ${IDLE_HOURS}h+`)}</span><strong className="pr-card__value">{num(r.totals.idle)}</strong><span className="pr-card__delta">&#8203;</span></div>
        <div className="pr-card">
          <span className="pr-card__label">{L('عنق الزجاجة', 'Bottleneck')}</span>
          <strong className="pr-card__value">{r.bottleneck ? stageName(r.bottleneck.id) : L('مفيش', 'None')}</strong>
          <span className="pr-card__delta">{r.bottleneck ? L(`${num(r.bottleneck.late)} متأخر من ${num(r.bottleneck.count)}`, `${r.bottleneck.late} of ${r.bottleneck.count} late`) : L('الشغل ماشي في وقته', 'Everything on time')}</span>
        </div>
      </div>

      <div className="pr-block">
        <h3>{L('كل مرحلة: فيها كام، وكام متأخر', 'Each stage: how many, how many late')}</h3>
        <div className="pr-table-wrap">
          <table className="pr-table">
            <thead><tr><th>{L('المرحلة', 'Stage')}</th><th>{L('الوقت المسموح', 'Limit')}</th><th>{L('العملاء', 'Clients')}</th><th>{L('ملاك / مشترين', 'Owners / buyers')}</th><th>{L('متأخرين', 'Late')}</th><th>{L('متوسط المدة (الوسيط)', 'Median wait')}</th><th>{L('أطول انتظار', 'Longest')}</th></tr></thead>
            <tbody>
              {r.stages.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{stageName(s.id)}{r.bottleneck?.id === s.id && <> <span className="pr-pill is-warn">{L('الاختناق', 'bottleneck')}</span></>}</th>
                  <td>{limitText(s.limitHours, isAr)}</td>
                  <td>{num(s.count)}</td>
                  <td>{num(s.sellers)} / {num(s.buyers)}</td>
                  <td>{num(s.late)} <small>({s.latePct}%)</small></td>
                  <td>{s.medianDays} {L('يوم', 'd')}</td>
                  <td>{s.oldestDays} {L('يوم', 'd')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {r.stages.some((s) => s.unknown) && (
          <p className="pr-note">{L(`${num(r.stages.reduce((n, s) => n + s.unknown, 0))} عميل اتنقلوا قبل ما النظام يسجّل تاريخ المراحل، فمدتهم مش معروفة ومش محسوبين في المتأخرين.`, 'Some clients moved before stage dates were kept; their wait is unknown.')}</p>
        )}
      </div>

      <div className="pr-block">
        <h3>{L('عند مين؟', 'With whom?')}</h3>
        <div className="pr-table-wrap">
          <table className="pr-table">
            <thead><tr><th>{L('المسؤول', 'Owner')}</th><th>{L('مفتوحين', 'Open')}</th><th>{L('متأخرين', 'Late')}</th><th>{L(`من غير لمسة ${IDLE_HOURS} ساعة`, `Idle ${IDLE_HOURS}h+`)}</th><th>{L('أكتر مرحلة متأخر فيها', 'Most late in')}</th></tr></thead>
            <tbody>{r.owners.map((o) => (
              <tr key={o.id}>
                <th scope="row">{o.label || L('من غير مسؤول', 'Unclaimed')}</th>
                <td>{num(o.open)}</td><td>{num(o.late)}</td><td>{num(o.idle)}</td><td>{o.worstStage ? stageName(o.worstStage) : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {r.stuck.length > 0 && (
        <div className="pr-block">
          <h3>{L('أكتر عملاء واقفين', 'Most stuck clients')}</h3>
          <ul className="pr-lost">
            {r.stuck.map(({ lead, stage, waitedDays, overDays }) => (
              <li key={lead.id}>
                <button type="button" onClick={() => onOpenLead?.(lead)}>
                  <span className="pr-lost__name">{lead.name || L('عميل', 'Client')}</span>
                  <span className="pr-lost__meta">
                    <span className="pr-pill">{stageName(stage)}</span>
                    <span className="pr-pill is-warn">{L(`متأخر ${overDays} يوم`, `${overDays}d late`)}</span>
                    <span className="pr-pill">{L(`في المرحلة من ${waitedDays} يوم`, `${waitedDays}d in stage`)}</span>
                    {lead.ownerName && <span className="pr-pill">{lead.ownerName}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="pr-note">{L('دوس على العميل يفتح ملفه. الوقت المسموح لكل مرحلة من دليل الشركة.', 'Open a client to act. Stage limits come from the company playbook.')}</p>
        </div>
      )}
    </section>
  );
}
