import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { portfolioReport, demandsReport, intakeReport } from '../../utils/operationsReport';
import './performance-report.css';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const money = (n) => (n ? `${num(n)} ج` : '—');

/** "was X, ±Y%" under a count that has a comparison */
function Delta({ v, L }) {
  if (v.prev === null) return null;
  const tone = v.change === null ? '' : v.change > 0 ? 'is-good' : v.change < 0 ? 'is-bad' : '';
  return (
    <span className={`pr-card__delta ${tone}`}>
      {v.change > 0 && <TrendingUp size={14} aria-hidden="true" />}{v.change < 0 && <TrendingDown size={14} aria-hidden="true" />}
      {v.change === null ? (v.cur > 0 ? L('جديد', 'new') : '—') : `${v.change > 0 ? '+' : ''}${v.change}%`}
      <small>{L('كان', 'was')} {num(v.prev)}</small>
    </span>
  );
}

function Card({ label, value, children }) {
  return (
    <div className="pr-card">
      <span className="pr-card__label">{label}</span>
      <strong className="pr-card__value">{value}</strong>
      {children || <span className="pr-card__delta">&#8203;</span>}
    </div>
  );
}

function Bars({ rows, total, unit = '' }) {
  return (
    <ul className="pr-funnel">
      {rows.map((r) => (
        <li key={r.id || r.label}>
          <div className="pr-funnel__top"><span>{r.label}</span><b>{num(r.count)}{unit} <small>({total ? Math.round((r.count / total) * 100) : 0}%)</small></b></div>
          <div className="pr-bar" aria-hidden="true"><i style={{ width: `${total ? Math.max(2, Math.round((r.count / total) * 100)) : 0}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

/** The portfolio, buyer demands and the expat / trade-in requests (managers). `part` picks which half to show. */
export default function OperationsReportsPanel({ part = 'portfolio', properties = [], demands = [], intake = [], areaNames = {}, range, prevRange = null, now, lang = 'ar' }) {
  const isAr = lang !== 'en';
  const L = (ar, en) => (isAr ? ar : en);
  const opts = { range, prevRange, now, areaNames };
  const portfolio = useMemo(() => portfolioReport(properties, opts), [properties, range, prevRange, now, areaNames]); // eslint-disable-line react-hooks/exhaustive-deps
  const dem = useMemo(() => demandsReport(demands, opts), [demands, range, prevRange, now, areaNames]); // eslint-disable-line react-hooks/exhaustive-deps
  const req = useMemo(() => intakeReport(intake, opts), [intake, range, prevRange, now]); // eslint-disable-line react-hooks/exhaustive-deps

  if (part === 'portfolio') {
    const live = portfolio.byStatus.published;
    return (
      <section className="pr-panel">
        <div className="pr-cards">
          <Card label={L('إجمالي العقارات', 'All listings')} value={num(portfolio.total)} />
          <Card label={L('منشورة على الموقع', 'Published')} value={num(live)} />
          <Card label={L('تحت التفاوض', 'Under negotiation')} value={num(portfolio.byStatus.under_negotiation)} />
          <Card label={L('اتباعت', 'Sold')} value={num(portfolio.byStatus.sold)} />
          <Card label={L('اتضافت في الفترة', 'Added in the period')} value={num(portfolio.added.cur)}><Delta v={portfolio.added} L={L} /></Card>
          <Card label={L('ناقصة بيانات', 'Incomplete')} value={num(portfolio.incomplete)} />
        </div>

        <div className="pr-block">
          <h3>{L('المعروض حسب النوع وسعر المتر', 'Listings by kind and price per m²')}</h3>
          {portfolio.kinds.length === 0 ? <p className="pr-note">{L('مفيش عقارات منشورة بسعر.', 'No priced published listings.')}</p> : (
            <div className="pr-table-wrap">
              <table className="pr-table">
                <thead><tr><th>{L('النوع', 'Kind')}</th><th>{L('العدد', 'Count')}</th><th>{L('سعر المتر (الوسيط)', 'Median per m²')}</th></tr></thead>
                <tbody>{portfolio.kinds.map((k) => <tr key={k.slug}><th scope="row">{k.label}</th><td>{num(k.count)}</td><td>{k.medianPpm ? money(k.medianPpm) : L('عينة صغيرة', 'small sample')}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pr-block">
          <h3>{L('المعروض حسب المنطقة', 'Listings by area')}</h3>
          {portfolio.areas.length ? <Bars rows={portfolio.areas} total={live} /> : <p className="pr-note">—</p>}
        </div>

        <div className="pr-block">
          <h3>{L('محتاج مراجعة', 'Needs attention')}</h3>
          <ul className="pr-findings">
            <li className={portfolio.incomplete ? 'is-warn' : 'is-good'}><span>{portfolio.incomplete
              ? `${portfolio.incomplete} عقار منشور ناقصه بيانات (${portfolio.issues.map((i) => `${i.label} ${i.count}`).join('، ')}) — الموقع بيخبّي الناقص.`
              : 'كل العقارات المنشورة بياناتها كاملة.'}</span></li>
            <li className={portfolio.stale ? 'is-warn' : 'is-good'}><span>{portfolio.stale
              ? `${portfolio.stale} عقار منشور محدّثش من أكتر من ٦٠ يوم — راجع سعره وإتاحته.`
              : 'مفيش عقار منشور قديم من غير تحديث.'}</span></li>
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="pr-panel">
      <div className="pr-cards">
        <Card label={L('طلبات المشترين', 'Buyer demands')} value={num(dem.total)} />
        <Card label={L('جديدة في الفترة', 'New in the period')} value={num(dem.added.cur)}><Delta v={dem.added} L={L} /></Card>
        <Card label={L('مستنية مراجعة', 'Pending review')} value={num(dem.pending)} />
        <Card label={L('ميزانية الطلبات المنشورة', 'Budget of published demands')} value={money(dem.totalBudget)} />
        <Card label={L('وسيط الميزانية', 'Median budget')} value={money(dem.medianBudget)} />
        <Card label={L('منشورة / أرشيف', 'Published / archived')} value={`${num(dem.published)} / ${num(dem.archived)}`} />
      </div>

      <div className="pr-block">
        <h3>{L('المشترين بيدوّروا فين؟', 'Where buyers are looking')}</h3>
        {dem.areas.length ? <Bars rows={dem.areas} total={dem.published} /> : <p className="pr-note">{L('مفيش طلبات منشورة.', 'No published demands.')}</p>}
      </div>

      <div className="pr-block">
        <h3>{L('طلبات المغتربين والتبادل العقاري', 'Expat inspections and trade-ins')}</h3>
        <div className="pr-table-wrap">
          <table className="pr-table">
            <thead><tr><th>{L('الخدمة', 'Service')}</th><th>{L('الإجمالي', 'Total')}</th><th>{L('جديدة في الفترة', 'New in period')}</th><th>{L('مفتوحة', 'Open')}</th><th>{L('أقدم مستني', 'Longest wait')}</th></tr></thead>
            <tbody>
              {[[L('خدمات المغتربين', 'Expat desk'), req.expat], [L('صفقات التبادل', 'Trade-ins'), req.tradeIns]].map(([label, r]) => (
                <tr key={label}>
                  <th scope="row">{label}</th><td>{num(r.total)}</td>
                  <td>{num(r.added.cur)}{r.added.prev !== null ? ` (${L('قبلها', 'before')} ${num(r.added.prev)})` : ''}</td>
                  <td className={r.open ? 'is-bad' : ''}>{num(r.open)}</td><td>{r.oldestWaitDays ? `${num(r.oldestWaitDays)} ${L('يوم', 'd')}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pr-note">{L('الأرقام من آخر ٣٠ طلب لكل خدمة.', 'Based on the latest 30 requests of each.')}</p>
      </div>
    </section>
  );
}
