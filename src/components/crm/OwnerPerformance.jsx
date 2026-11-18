import { useMemo, useState } from 'react';
import { BarChart3, X, ChevronDown } from 'lucide-react';
import { ownerStats, matchesOwner, formatMins } from '../../utils/ownerPerformance';
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
export default function OwnerPerformance({ isAr, leads, owners, ownerFilter, onPickOwner }) {
  const [open, setOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const picked = ownerFilter && ownerFilter !== 'all';
  const row = useMemo(() => owners.find((o) => o.key === ownerFilter), [owners, ownerFilter]);
  const stats = useMemo(
    () => (picked ? ownerStats(leads.filter((l) => matchesOwner(l, ownerFilter))) : null),
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
    </section>
  );
}
