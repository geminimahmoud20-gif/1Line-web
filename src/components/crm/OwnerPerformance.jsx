import { useMemo, useState } from 'react';
import { BarChart3, X, ChevronDown } from 'lucide-react';
import { ownerStats, matchesOwner, formatMins, ownersPeriodTable, recentContacts } from '../../utils/ownerPerformance';
import { PRESETS, resolveRange, comparisonRange, rangeText } from '../../utils/reportPeriods';
import { cx } from '../ui/cx';
import './owner-performance.css';

const STAGES = [
  { key: 'new', ar: 'جديد', en: 'New' },
  { key: 'contacted', ar: 'تم التواصل', en: 'Contacted' },
  { key: 'site_visit', ar: 'معاينة', en: 'Visit' },
  { key: 'negotiating', ar: 'تفاوض', en: 'Negotiating' },
  { key: 'closing', ar: 'إغلاق', en: 'Closing' }
];

const agoLabel = (ms, now, isAr) => {
  if (!ms) return '—';
  const d = Math.floor((now - ms) / 86400000);
  if (d <= 0) return isAr ? 'النهارده' : 'Today';
  if (d === 1) return isAr ? 'امبارح' : 'Yesterday';
  return isAr ? `من ${d} يوم` : `${d}d ago`;
};

/**
 * What each salesperson has done with their clients. With nobody picked: a table of the team
 * (tap a row to open that person's clients). With a person picked: their stages, what is waiting,
 * how fast they first reply, and what they closed or lost.
 */
function Current({ isAr, leads, owners, ownerFilter, onPickOwner, onOpenLead }) {
  const [open, setOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const picked = ownerFilter && ownerFilter !== 'all';
  const row = useMemo(() => owners.find((o) => o.key === ownerFilter), [owners, ownerFilter]);
  const stats = useMemo(
    () => (picked ? ownerStats(leads.filter((l) => matchesOwner(l, ownerFilter))) : null),
    [leads, ownerFilter, picked]
  );

  const contacts = useMemo(
    () => (picked ? recentContacts(leads.filter((l) => matchesOwner(l, ownerFilter)), 8) : []),
    [leads, ownerFilter, picked]
  );

  if (!picked) {
    return (
      <section className="op" aria-label={isAr ? 'أداء الفريق' : 'Team performance'}>
        <button type="button" className="op__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <BarChart3 size={16} aria-hidden="true" />
          <span>{isAr ? 'أداء المسؤولين' : 'Team performance'}</span>
          <ChevronDown size={16} aria-hidden="true" className={cx('op__chev', open && 'is-open')} />
        </button>
        {open && (
          <div className="op__scroll">
            <table className="op__table">
              <thead>
                <tr>
                  <th>{isAr ? 'المسؤول' : 'Owner'}</th>
                  <th>{isAr ? 'مفتوح' : 'Open'}</th>
                  <th>{isAr ? 'بدون رد' : 'No reply'}</th>
                  <th>{isAr ? 'رد متأخر' : 'Late'}</th>
                  <th>{isAr ? 'متابعات متأخرة' : 'Overdue'}</th>
                  <th>{isAr ? 'راكد' : 'Stale'}</th>
                  <th>{isAr ? 'أول رد (وسيط)' : 'First reply'}</th>
                  <th>{isAr ? 'صفقات' : 'Won'}</th>
                  <th>{isAr ? 'خسارة' : 'Lost'}</th>
                  <th>{isAr ? 'آخر نشاط' : 'Last activity'}</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((o) => (
                  <tr key={o.key} onClick={() => onPickOwner(o.key)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onPickOwner(o.key); }}>
                    <th scope="row">{o.key === 'none' ? (isAr ? 'من غير مسؤول' : 'No owner') : o.name}</th>
                    <td>{o.stats.open}</td>
                    <td className={o.stats.unanswered ? 'is-bad' : ''}>{o.stats.unanswered}</td>
                    <td className={o.stats.late ? 'is-bad' : ''}>{o.stats.late}</td>
                    <td className={o.stats.overdue ? 'is-warn' : ''}>{o.stats.overdue}</td>
                    <td>{o.stats.stale}</td>
                    <td>{formatMins(o.stats.medianReplyMins, isAr)}</td>
                    <td className={o.stats.won ? 'is-good' : ''}>{o.stats.won}</td>
                    <td>{o.stats.lost}</td>
                    <td>{agoLabel(o.stats.lastActivity, now, isAr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  const name = ownerFilter === 'none' ? (isAr ? 'من غير مسؤول' : 'No owner') : (row?.name || '');
  const top = Math.max(1, ...STAGES.map((s) => stats.stages[s.key]));
  const tiles = [
    { label: isAr ? 'مفتوح' : 'Open', value: stats.open },
    { label: isAr ? 'بدون رد' : 'No reply', value: stats.unanswered, tone: stats.unanswered ? 'bad' : '' },
    { label: isAr ? 'رد متأخر' : 'Late reply', value: stats.late, tone: stats.late ? 'bad' : '' },
    { label: isAr ? 'متابعات متأخرة' : 'Overdue', value: stats.overdue, tone: stats.overdue ? 'warn' : '' },
    { label: isAr ? 'راكد' : 'Stale', value: stats.stale },
    { label: isAr ? 'أول رد (وسيط)' : 'First reply', value: formatMins(stats.medianReplyMins, isAr) },
    { label: isAr ? 'صفقات' : 'Won', value: stats.won, tone: stats.won ? 'good' : '' },
    { label: isAr ? 'خسارة' : 'Lost', value: stats.lost },
    { label: isAr ? 'نسبة النجاح' : 'Win rate', value: stats.winRate == null ? '—' : `${stats.winRate}%` }
  ];
  return (
    <section className="op op--picked" aria-label={isAr ? `أداء ${name}` : `${name} performance`}>
      <header className="op__head">
        <b>{name}</b>
        <span className="op__sub">{isAr ? `آخر نشاط: ${agoLabel(stats.lastActivity, now, isAr)}` : `Last activity: ${agoLabel(stats.lastActivity, now, isAr)}`}</span>
        <button type="button" className="op__close" onClick={() => onPickOwner('all')}>
          <X size={14} aria-hidden="true" /> {isAr ? 'كل الفريق' : 'Everyone'}
        </button>
      </header>
      <div className="op__funnel" aria-label={isAr ? 'العملاء في كل مرحلة' : 'Clients per stage'}>
        {STAGES.map((s) => (
          <div key={s.key} className="op__stage" data-stage={s.key}>
            <span className="op__bar"><i style={{ height: `${Math.max(6, (stats.stages[s.key] / top) * 100)}%` }} /></span>
            <b>{stats.stages[s.key]}</b>
            <small>{isAr ? s.ar : s.en}</small>
          </div>
        ))}
      </div>
      <dl className="op__tiles">
        {tiles.map((t) => (
          <div key={t.label} className={cx('op__tile', t.tone && `is-${t.tone}`)}>
            <dt>{t.label}</dt>
            <dd>{t.value}</dd>
          </div>
        ))}
      </dl>
      <div className="op__contacts">
        <h4>{isAr ? 'آخر التواصلات' : 'Latest contacts'}</h4>
        {contacts.length === 0 ? (
          <p className="op__empty">{isAr ? 'لسه مفيش تواصل متسجل مع عملائه.' : 'No contact logged yet.'}</p>
        ) : (
          <ul>
            {contacts.map((c, i) => (
              <li key={`${c.leadId}-${c.at}-${i}`}>
                <button type="button" className="op__contact" onClick={() => onOpenLead?.(leads.find((l) => l.id === c.leadId))}>
                  <i className={cx('op__dot', `is-${c.kind}`)} aria-hidden="true" />
                  <span className="op__who">{c.name || '—'}</span>
                  <span className="op__what">{c.label}{c.reason ? ` · ${c.reason}` : ''}</span>
                  <small>{agoLabel(c.at, now, isAr)}{c.by ? ` · ${c.by}` : ''}</small>
                  {c.note && <em>{c.note}</em>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const PERIOD_PRESETS = PRESETS.filter((p) => p.id !== 'custom');

const Change = ({ c, goodWhenDown = false }) => {
  if (c == null) return null;
  const up = c > 0;
  const good = goodWhenDown ? !up : up;
  return <small className={cx('op__chg', c !== 0 && (good ? 'is-good' : 'is-bad'))}>{c > 0 ? '▲' : c < 0 ? '▼' : '='} {Math.abs(c)}%</small>;
};

/** Each person's work inside a chosen period, next to the period before it */
function Period({ isAr, leads, tasks, people, ownerFilter, onPickOwner }) {
  const [preset, setPreset] = useState('30');
  const [now] = useState(() => Date.now());
  const range = useMemo(() => resolveRange(preset, now), [preset, now]);
  const prev = useMemo(() => comparisonRange(range, 'previous'), [range]);
  const picked = ownerFilter && ownerFilter !== 'all';
  const rows = useMemo(() => {
    const all = ownersPeriodTable(leads, people, tasks, range, prev, now);
    return picked ? all.filter((r) => r.key === ownerFilter) : all;
  }, [leads, people, tasks, range, prev, now, picked, ownerFilter]);
  const cell = (r, k, opts = {}) => (
    <td>
      {opts.fmt ? opts.fmt(r.cur[k]) : r.cur[k]}
      <Change c={r.cmp[k]?.change} goodWhenDown={opts.down} />
    </td>
  );
  return (
    <div className="op__period">
      <div className="op__periodbar">
        <select className="op__select" aria-label={isAr ? 'الفترة' : 'Period'} value={preset} onChange={(e) => setPreset(e.target.value)}>
          {PERIOD_PRESETS.map((p) => <option key={p.id} value={p.id}>{isAr ? p.ar : p.en}</option>)}
        </select>
        <small>{rangeText(range)}{prev ? (isAr ? ` · مقارنة بـ ${rangeText(prev)}` : ` · vs ${rangeText(prev)}`) : ''}</small>
      </div>
      {rows.length === 0 ? (
        <p className="op__empty">{isAr ? 'مفيش نشاط للمسؤولين في الفترة دي.' : 'No activity in this period.'}</p>
      ) : (
        <div className="op__scroll">
          <table className="op__table">
            <thead>
              <tr>
                <th>{isAr ? 'المسؤول' : 'Owner'}</th>
                <th>{isAr ? 'عملاء جُدد' : 'New'}</th>
                <th>{isAr ? 'اتردّ عليهم' : 'Replied'}</th>
                <th>{isAr ? 'في الوقت' : 'On time'}</th>
                <th>{isAr ? 'أول رد (وسيط)' : 'First reply'}</th>
                <th>{isAr ? 'وصلوا معاينة' : 'Viewings'}</th>
                <th>{isAr ? 'صفقات' : 'Won'}</th>
                <th>{isAr ? 'خسارة' : 'Lost'}</th>
                <th>{isAr ? 'مهام خلصت' : 'Tasks done'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} onClick={() => onPickOwner(r.key)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onPickOwner(r.key); }}>
                  <th scope="row">{r.key === 'none' ? (isAr ? 'من غير مسؤول' : 'No owner') : r.name}</th>
                  {cell(r, 'newLeads')}
                  {cell(r, 'replied')}
                  <td>{r.cur.replied ? `${r.cur.inTimePct}%` : '—'}</td>
                  <td>{r.cur.replied ? formatMins(r.cur.medianReplyMs / 60000, isAr) : '—'}</td>
                  {cell(r, 'viewings')}
                  {cell(r, 'closed')}
                  {cell(r, 'lost', { down: true })}
                  {cell(r, 'tasksDone')}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="op__note">{isAr ? 'العميل بيتحسب على المسؤول الحالي عنه. الأسهم مقارنة بالفترة اللي قبلها بنفس الطول.' : 'Clients count under their current owner. Arrows compare with the period before.'}</p>
    </div>
  );
}

/** «الوضع الحالي» (stages and what is waiting now) or «خلال فترة» (what was done in a chosen period) */
export default function OwnerPerformance(props) {
  const [mode, setMode] = useState('now');
  return (
    <div className="op-wrap">
      <div className="op__modes" role="tablist" aria-label={props.isAr ? 'نوع العرض' : 'View'}>
        <button type="button" role="tab" aria-selected={mode === 'now'} className={cx('op__mode', mode === 'now' && 'is-on')} onClick={() => setMode('now')}>{props.isAr ? 'الوضع الحالي' : 'Right now'}</button>
        <button type="button" role="tab" aria-selected={mode === 'period'} className={cx('op__mode', mode === 'period' && 'is-on')} onClick={() => setMode('period')}>{props.isAr ? 'خلال فترة' : 'In a period'}</button>
      </div>
      {mode === 'now' ? <Current {...props} /> : (
        <section className="op" aria-label={props.isAr ? 'أداء خلال فترة' : 'Performance in a period'}>
          <Period isAr={props.isAr} leads={props.leads} tasks={props.tasks || []} people={props.people || []} ownerFilter={props.ownerFilter} onPickOwner={props.onPickOwner} />
        </section>
      )}
    </div>
  );
}
