import { useMemo, useState } from 'react';
import { Users, Clock, Eye, Handshake, Percent, Banknote, AlertTriangle, CheckCircle2, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import { periodMetrics, compareMetrics, dailySeries, cohortReports, sellerPerformance, insights, metricLeads, biggestDrop, STAGE_LABELS } from '../../utils/performanceReport';
import { dateText } from '../../utils/reportPeriods';
import { KpiRow, KpiTile, AreaChart, Drawer, EmptyState } from '../ui';
import ExecutiveDigestWidget from './ExecutiveDigestWidget';
import './executive-summary.css';

// Points change for a percentage, % change for a count; null when there is nothing to compare with
const pointsDelta = (v) => (v.prev == null ? undefined : v.cur - v.prev);
const pctDelta = (v) => (v.prev == null ? undefined : v.change ?? undefined);

/**
 * «الملخص التنفيذي»: the six numbers that matter, what changed and why, how far clients get and where they
 * fall out. Every number opens the clients behind it. Range and comparison come from the hub's controls.
 */
export default function ExecutiveSummaryPanel({ leads = [], properties = [], range, prevRange = null, now, lang = 'ar', onOpenLead, triggerToast }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const { tasks } = useTasks();
  const [listOf, setListOf] = useState(null); // { id, title }

  const d = useMemo(() => {
    const cur = periodMetrics(leads, tasks, range);
    const prev = prevRange ? periodMetrics(leads, tasks, prevRange) : null;
    const reports = cohortReports(leads, range);
    const sellers = sellerPerformance(leads, tasks, range, now);
    const trend = dailySeries(leads, range);
    return {
      v: compareMetrics(cur, prev),
      trend,
      funnel: reports.funnel,
      drop: biggestDrop(reports.funnel),
      findings: insights({ metrics: cur, prev, funnel: reports.funnel, sources: reports.sources, sellers, leads, tasks, range, now })
    };
  }, [leads, tasks, range, prevRange, now]);

  const open = (id, title) => setListOf({ id, title });
  const list = useMemo(() => (listOf ? metricLeads(leads, range, listOf.id) : []), [listOf, leads, range]);
  const newSeries = d.trend.buckets.map((b) => b.newLeads);
  const closedSeries = d.trend.buckets.map((b) => b.closed);
  const vsText = prevRange ? L('عن الفترة المقارنة', 'vs comparison') : undefined;
  const toneIcon = { warn: AlertTriangle, good: CheckCircle2, info: Lightbulb };
  const Go = isAr ? ChevronLeft : ChevronRight;

  return (
    <section className="xs" aria-label={L('الملخص التنفيذي', 'Executive summary')}>
      <ExecutiveDigestWidget leads={leads} properties={properties} tasks={tasks} lang={lang} triggerToast={triggerToast} />
      <KpiRow label={L('أهم الأرقام', 'Key figures')}>
        <KpiTile label={L('عملاء جدد', 'New clients')} value={d.v.newLeads.cur} tone="info" icon={<Users size={16} />}
          delta={pctDelta(d.v.newLeads)} deltaLabel="%" hint={vsText} trend={newSeries} onClick={() => open('newLeads', L('العملاء الجدد', 'New clients'))} />
        <KpiTile label={L('الرد في الميعاد', 'Replied in time')} value={d.v.inTimePct.cur} unit="%" tone={d.v.inTimePct.cur >= 80 ? 'success' : d.v.inTimePct.cur >= 60 ? 'warning' : 'danger'} icon={<Clock size={16} />}
          delta={pointsDelta(d.v.inTimePct)} hint={L(`نقطة · من ${d.v.replied.cur} رد`, `pts · of ${d.v.replied.cur} replies`)} onClick={() => open('late', L('اتردّ عليهم متأخر', 'Replied late'))} />
        <KpiTile label={L('وصلوا لمعاينة', 'Reached a viewing')} value={d.v.viewings.cur} tone="accent" icon={<Eye size={16} />}
          delta={pctDelta(d.v.viewings)} deltaLabel="%" hint={vsText} onClick={() => open('viewings', L('وصلوا لمعاينة', 'Reached a viewing'))} />
        <KpiTile label={L('صفقات اتقفلت', 'Deals closed')} value={d.v.closed.cur} tone="success" icon={<Handshake size={16} />}
          delta={pctDelta(d.v.closed)} deltaLabel="%" hint={vsText} trend={closedSeries} onClick={() => open('closed', L('الصفقات المقفولة', 'Closed deals'))} />
        <KpiTile label={L('نسبة التحويل', 'Conversion')} value={d.v.conversionPct.cur} unit="%" tone="primary" icon={<Percent size={16} />}
          delta={pointsDelta(d.v.conversionPct)} hint={L('نقطة · من الجديد للإقفال', 'pts · new → closed')} />
        <KpiTile label={L('العمولة', 'Commission')} value={d.v.commission.cur > 0 ? d.v.commission.cur / 1000 : null} digits={0} unit={L('ألف ج.م', 'K EGP')}
          emptyText={L('لسه مفيش', 'None yet')} tone="warning" icon={<Banknote size={16} />} delta={pctDelta(d.v.commission)} deltaLabel="%" />
      </KpiRow>

      {d.findings.length > 0 && (
        <section className="xs-card" aria-labelledby="xs-why">
          <h2 id="xs-why" className="xs-h">{L('إيه اللي اتغيّر وتعمل إيه', 'What changed and what to do')}</h2>
          <ul className="xs-findings">
            {d.findings.slice(0, 4).map((f) => {
              const Icon = toneIcon[f.tone];
              return <li key={f.text} className={`is-${f.tone}`}><Icon size={16} aria-hidden="true" /><span>{f.text}</span></li>;
            })}
          </ul>
        </section>
      )}

      <div className="xs-grid">
        <section className="xs-card" aria-labelledby="xs-trend">
          <h2 id="xs-trend" className="xs-h">{L('العملاء الجدد والصفقات', 'New clients and deals')}{d.trend.step === 7 && <small>{L(' (كل نقطة أسبوع)', ' (weekly)')}</small>}</h2>
          {newSeries.some(Boolean) || closedSeries.some(Boolean) ? (
            <AreaChart
              series={[{ id: 'n', label: L('عملاء جدد', 'New clients'), values: newSeries, tone: 'info' }, { id: 'c', label: L('صفقات', 'Deals'), values: closedSeries, tone: 'success' }]}
              labels={d.trend.buckets.map((b) => dateText(b.day))}
              ariaLabel={L('العملاء الجدد والصفقات المقفولة على الفترة', 'New clients and closed deals over the period')}
              smooth
            />
          ) : <EmptyState title={L('مفيش حركة في الفترة دي', 'No activity in this period')} />}
        </section>

        <section className="xs-card" aria-labelledby="xs-funnel">
          <h2 id="xs-funnel" className="xs-h">{L('العميل بيوصل لحد فين؟', 'How far clients get')}<small> · {d.funnel.total} {L('عميل', 'clients')}</small></h2>
          {d.funnel.total === 0 ? <EmptyState title={L('مفيش عملاء جدد في الفترة', 'No new clients in this period')} /> : (
            <>
              <ol className="xs-funnel">
                {d.funnel.rows.filter((r) => r.id !== 'closing').map((r) => (
                  <li key={r.id} className={d.drop?.id === r.id ? 'is-drop' : ''}>
                    <span className="xs-funnel__label">{isAr ? STAGE_LABELS[r.id].ar : STAGE_LABELS[r.id].en}</span>
                    <span className="xs-funnel__bar" aria-hidden="true"><i style={{ inlineSize: `${Math.max(r.ofAll, r.reached ? 3 : 0)}%` }} /></span>
                    <b className="xs-funnel__num">{r.reached}<small> · {r.ofAll}%</small></b>
                  </li>
                ))}
              </ol>
              {d.drop && d.drop.ofPrevious < 60 && (
                <p className="xs-drop"><AlertTriangle size={14} aria-hidden="true" />
                  {L(`أكبر تسرّب: ${d.drop.lostHere} عميل وقفوا قبل «${STAGE_LABELS[d.drop.id].ar}» (${d.drop.ofPrevious}% بس كمّلوا).`, `Biggest drop: ${d.drop.lostHere} stopped before ${STAGE_LABELS[d.drop.id].en} (${d.drop.ofPrevious}% went on).`)}
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <Drawer open={Boolean(listOf)} onClose={() => setListOf(null)} title={listOf?.title || ''} description={L(`${list.length} عميل`, `${list.length} clients`)} closeLabel={L('إغلاق', 'Close')}>
        {list.length === 0 ? <EmptyState title={L('مفيش عملاء هنا', 'No clients here')} /> : (
          <ul className="xs-list">
            {list.slice(0, 200).map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => { setListOf(null); onOpenLead?.(l); }}>
                  <span><b>{l.name || L('عميل بدون اسم', 'Unnamed')}</b><small>{l.ownerName || l.claimedBy || L('من غير مسؤول', 'Unassigned')}</small></span>
                  <Go size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </section>
  );
}
