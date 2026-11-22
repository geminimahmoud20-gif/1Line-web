import { useMemo } from 'react';
import { Users, AlarmClock, Hourglass, Filter, UserX, Inbox, UserCheck, CalendarCheck, Handshake, Briefcase } from 'lucide-react';
import { flowReport, IDLE_HOURS } from '../../utils/flowReport';
import { STAGE_LABELS } from '../../utils/performanceReport';
import { EmptyState, KpiRow, KpiTile, StackBar, Donut, Avatar, Badge, Meter, IconBadge } from '../ui';
import './report-dash.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const limitText = (h) => (h < 48 ? `${h} ساعة` : `${Math.round(h / 24)} أيام`);
const STAGE_ICON = { new: Inbox, contacted: UserCheck, site_visit: CalendarCheck, negotiating: Handshake, closing: Briefcase };
const STAGE_TONE = { new: 'info', contacted: 'accent', site_visit: 'success', negotiating: 'warning', closing: 'primary' };

/** «تدفق الشغل»: where open clients wait now, who holds the late ones, and which stage is the bottleneck */
export default function FlowReportPanel({ leads = [], lang = 'ar', onOpenLead }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const r = useMemo(() => flowReport(leads), [leads]);
  const stageName = (id) => (STAGE_LABELS[id] ? (isAr ? STAGE_LABELS[id].ar : STAGE_LABELS[id].en) : id);

  if (!r.totals.open) return <EmptyState title={L('مفيش عملاء مفتوحين دلوقتي', 'No open clients')} />;
  const unknown = r.stages.reduce((n, s) => n + s.unknown, 0);
  const b = r.bottleneck;

  return (
    <div className="rd">
      <KpiRow label={L('أرقام تدفق الشغل', 'Workflow figures')}>
        <KpiTile label={L('عملاء مفتوحين', 'Open clients')} value={r.totals.open} icon={<Users size={18} />} tone="info" hint={L('من جديد لحد الإغلاق', 'new to closing')} />
        <KpiTile label={L('متأخرين عن وقت مرحلتهم', 'Past stage limit')} value={r.totals.late} icon={<AlarmClock size={18} />} tone={r.totals.latePct >= 30 ? 'danger' : r.totals.latePct >= 15 ? 'warning' : 'success'} hint={L(`${r.totals.latePct}% من المفتوحين`, `${r.totals.latePct}% of open`)} />
        <KpiTile label={L(`من غير لمسة ${IDLE_HOURS} ساعة`, `Idle ${IDLE_HOURS}h+`)} value={r.totals.idle} icon={<Hourglass size={18} />} tone="warning" hint={L('محدش كلّمهم ولا سجّل حاجة', 'no call or note')} />
        <KpiTile label={L('من غير مسؤول', 'Unclaimed')} value={r.owners.find((o) => o.id === '—')?.open || 0} icon={<UserX size={18} />} tone="accent" hint={L('مستنيين حد يستلمهم', 'waiting for an owner')} />
      </KpiRow>

      <div className={`rd-alert ui-tone-${b ? 'danger' : 'success'}`} role="status">
        <IconBadge icon={<Filter size={20} />} tone={b ? 'danger' : 'success'} />
        <div>
          <strong>{b ? L(`عنق الزجاجة: ${stageName(b.id)}`, `Bottleneck: ${stageName(b.id)}`) : L('مفيش اختناق: الشغل ماشي في وقته', 'No bottleneck')}</strong>
          {b && <p>{L(`${num(b.late)} عميل من ${num(b.count)} عدّوا ${limitText(b.limitHours)} في المرحلة دي (${b.latePct}%). أطول انتظار ${b.oldestDays} يوم.`, `${b.late} of ${b.count} past the limit.`)}</p>}
        </div>
      </div>

      <div className="rd-grid">
        <section className="rd-card" aria-labelledby="fl-stages">
          <div className="rd-card__head">
            <div>
              <h3 id="fl-stages" className="rd-card__title">{L('المراحل', 'Stages')}</h3>
              <p className="rd-card__sub">{L('كل مرحلة: فيها كام، وكام عدّى الوقت المسموح', 'How many, and how many are late')}</p>
            </div>
            <div className="rd-legend">
              <span className="ui-tone-success"><i />{L('في الوقت', 'On time')}</span>
              <span className="ui-tone-danger"><i />{L('متأخر', 'Late')}</span>
              {unknown > 0 && <span className="ui-tone-neutral"><i />{L('مدة مش معروفة', 'Unknown')}</span>}
            </div>
          </div>
          {r.stages.map((s) => {
            const Icon = STAGE_ICON[s.id] || Inbox;
            return (
              <div className="rd-stage" key={s.id}>
                <div className="rd-stage__top">
                  <span className="rd-stage__name">
                    <IconBadge icon={<Icon size={16} />} tone={STAGE_TONE[s.id]} size="sm" />
                    {stageName(s.id)}
                    {b?.id === s.id && <Badge tone="danger" dot>{L('الاختناق', 'Bottleneck')}</Badge>}
                  </span>
                  <span className="rd-stage__meta">
                    <span><b>{num(s.count)}</b> {L('عميل', 'clients')}</span>
                    <span>{L('ملاك', 'owners')} <b>{num(s.sellers)}</b> · {L('مشترين', 'buyers')} <b>{num(s.buyers)}</b></span>
                    <span>{L('المسموح', 'limit')} <b>{limitText(s.limitHours)}</b></span>
                  </span>
                </div>
                <StackBar ariaLabel={`${stageName(s.id)}: ${s.late} متأخر من ${s.count}`} parts={[
                  { id: 'ok', value: s.count - s.late - s.unknown, tone: 'success', label: L('في الوقت', 'On time') },
                  { id: 'late', value: s.late, tone: 'danger', label: L('متأخر', 'Late') },
                  { id: 'unknown', value: s.unknown, tone: 'neutral', label: L('مش معروف', 'Unknown') },
                ]} />
                <span className="rd-stage__meta">
                  <span>{L('متأخرين', 'late')} <b>{num(s.late)}</b> ({s.latePct}%)</span>
                  <span>{L('الوسيط', 'median')} <b>{s.medianDays}</b> {L('يوم', 'd')}</span>
                  <span>{L('أطول انتظار', 'longest')} <b>{s.oldestDays}</b> {L('يوم', 'd')}</span>
                </span>
              </div>
            );
          })}
          {unknown > 0 && <p className="rd-note">{L(`${num(unknown)} عميل اتنقلوا قبل ما النظام يسجّل تاريخ المراحل، فمدتهم مش معروفة ومش محسوبين في المتأخرين.`, 'Some clients moved before stage dates were kept.')}</p>}
        </section>

        <section className="rd-card" aria-labelledby="fl-share">
          <div>
            <h3 id="fl-share" className="rd-card__title">{L('المفتوحين في أنهي مرحلة', 'Open clients by stage')}</h3>
            <p className="rd-card__sub">{L(`الوقت المسموح من دليل الشركة`, 'Limits from the playbook')}</p>
          </div>
          <Donut centerLabel={L('عميل مفتوح', 'open')} ariaLabel={L('العملاء المفتوحين حسب المرحلة', 'Open clients by stage')}
            items={r.stages.filter((s) => s.count).map((s) => ({ id: s.id, label: stageName(s.id), value: s.count, pct: Math.round((s.count / r.totals.open) * 100) }))} />
        </section>
      </div>

      <div className="rd-grid rd-grid--even">
        <section className="rd-card" aria-labelledby="fl-owners">
          <div>
            <h3 id="fl-owners" className="rd-card__title">{L('عند مين؟', 'With whom?')}</h3>
            <p className="rd-card__sub">{L('نسبة المتأخرين من عملاء كل مسؤول', 'Share of late clients per owner')}</p>
          </div>
          <ul className="rd-list">
            {r.owners.map((o) => {
              const latePct = o.open ? Math.round((o.late / o.open) * 100) : 0;
              return (
                <li className="rd-row" key={o.id}>
                  <Avatar name={o.label || '؟'} size="sm" />
                  <div className="rd-row__main">
                    <span className="rd-row__title">
                      {o.label || L('من غير مسؤول', 'Unclaimed')}
                      {o.idle > 0 && <Badge tone="warning">{L(`${num(o.idle)} من غير لمسة`, `${o.idle} idle`)}</Badge>}
                      {o.worstStage && <Badge>{L('أكتر تأخير:', 'most late:')} {stageName(o.worstStage)}</Badge>}
                    </span>
                    <Meter value={o.late} max={o.open || 1} tone={latePct >= 30 ? 'danger' : latePct >= 15 ? 'warning' : 'success'} size="sm" />
                  </div>
                  <div className="rd-row__side"><strong>{num(o.late)}/{num(o.open)}</strong><small>{L('متأخر', 'late')}</small></div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rd-card" aria-labelledby="fl-stuck">
          <div>
            <h3 id="fl-stuck" className="rd-card__title">{L('أكتر عملاء واقفين', 'Most stuck clients')}</h3>
            <p className="rd-card__sub">{L('دوس على العميل يفتح ملفه', 'Open a client to act')}</p>
          </div>
          {r.stuck.length === 0 ? <EmptyState title={L('مفيش عملاء متأخرين', 'Nobody is late')} /> : (
            <ul className="rd-list">
              {r.stuck.slice(0, 8).map(({ lead, stage, waitedDays, overDays }) => (
                <li key={lead.id}>
                  <button type="button" className="rd-row" onClick={() => onOpenLead?.(lead)}>
                    <Avatar name={lead.name || '؟'} size="sm" />
                    <span className="rd-row__main">
                      <span className="rd-row__title">{lead.name || L('عميل', 'Client')} <Badge tone={STAGE_TONE[stage]}>{stageName(stage)}</Badge></span>
                      <span className="rd-row__sub">{L(`في المرحلة من ${waitedDays} يوم`, `${waitedDays}d in stage`)}{lead.ownerName ? ` · ${lead.ownerName}` : ''}</span>
                    </span>
                    <span className="rd-row__side"><Badge tone="danger" dot>{L(`متأخر ${overDays} يوم`, `${overDays}d late`)}</Badge></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
