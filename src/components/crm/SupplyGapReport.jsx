import { useMemo, useState } from 'react';
import { Card, CardHeader } from '../ui';
import { supplyGapReport, bandLabel, cellLevel } from '../../utils/supplyGap';
import { NO_AREA } from '../../utils/listingReview';

const short = (n, isAr) => {
  if (!n) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')} ${isAr ? 'مليون' : 'M'}`;
  return Number(n).toLocaleString('en-US');
};

const STATUS = {
  empty: { ar: 'فاضية', en: 'Empty' },
  weak: { ar: 'ضعيفة', en: 'Thin' },
  ok: { ar: 'متنوعة', en: 'Covered' },
  unplaced: { ar: 'من غير منطقة', en: 'No area' }
};

/**
 * CRM → العقارات → التقارير: where the team has no listings. The matrix lists every area (empty
 * ones too) against every kind of property, and the price bands show which ranges nobody can buy.
 */
export default function SupplyGapReport({ properties, areas, isAr, onOpenArea }) {
  const L = (ar, en) => (isAr ? ar : en);
  const [basis, setBasis] = useState('live');
  const r = useMemo(() => supplyGapReport(properties, areas, basis), [properties, areas, basis]);
  const s = r.summary;
  const groupName = (g) => (isAr ? g.ar : g.en);
  const missing = r.groups.filter((g) => s.missingTypes.includes(g.id));

  return (
    <>
      <Card>
        <CardHeader
          title={L('نقاط العجز: فين مفيش وحدات؟', 'Gaps: where there is no stock')}
          description={L('كل منطقة قدّام كل نوع عقار. الأحمر معناه مفيش ولا وحدة.', 'Every area against every property kind. Red means no listing at all.')}
        />
        <div className="crm-gap__basis" role="group" aria-label={L('اللي بيتحسب', 'What is counted')}>
          <button type="button" className={basis === 'live' ? 'is-on' : ''} aria-pressed={basis === 'live'} onClick={() => setBasis('live')}>{L('المعروض للمشترين', 'Visible to buyers')}</button>
          <button type="button" className={basis === 'all' ? 'is-on' : ''} aria-pressed={basis === 'all'} onClick={() => setBasis('all')}>{L('كل اللي عندي (مع المراجعة)', 'Everything held (incl. review)')}</button>
        </div>

        <ul className="crm-gap__verdicts">
          <li className="is-bad"><strong>{s.gapCells}</strong> {L(`خانة فاضية من ${s.cells}`, `empty cells of ${s.cells}`)}</li>
          <li className={s.emptyAreas.length ? 'is-bad' : 'is-good'}>
            {s.emptyAreas.length
              ? <><strong>{s.emptyAreas.length}</strong> {L('منطقة من غير ولا وحدة:', 'areas with nothing:')} {s.emptyAreas.join('، ')}</>
              : L('كل المناطق فيها وحدات.', 'Every area has listings.')}
          </li>
          <li className={missing.length ? 'is-bad' : 'is-good'}>
            {missing.length
              ? <><strong>{missing.length}</strong> {L('نوع مش موجود خالص:', 'kinds missing entirely:')} {missing.map(groupName).join('، ')}</>
              : L('كل الأنواع ليها وحدات.', 'Every kind is stocked.')}
          </li>
          {s.weakAreas.length > 0 && (
            <li className="is-warn"><strong>{s.weakAreas.length}</strong> {L('منطقة ضعيفة (نوع واحد أو وحدتين بس):', 'thin areas (one kind or ≤2 units):')} {s.weakAreas.join('، ')}</li>
          )}
        </ul>

        <div className="crm-lrep__scroll">
          <table className="crm-lrep__table crm-gap__matrix">
            <thead>
              <tr>
                <th scope="col">{L('المنطقة', 'Area')}</th>
                {r.groups.map((g) => <th key={g.id} scope="col" className={s.missingTypes.includes(g.id) ? 'is-missing' : undefined}>{groupName(g)}</th>)}
                <th scope="col">{L('الإجمالي', 'Total')}</th>
                <th scope="col">{L('الحالة', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {r.areas.map((a) => (
                <tr key={a.id}>
                  <th scope="row">
                    {a.id === NO_AREA ? a.name : <button type="button" onClick={() => onOpenArea(a.id)}>{a.name}</button>}
                  </th>
                  {r.groups.map((g) => {
                    const n = a.cells[g.id];
                    return <td key={g.id} className={`crm-gap__cell is-${a.id === NO_AREA ? 'ok' : cellLevel(n)}`}>{n || '—'}</td>;
                  })}
                  <td>{a.total}</td>
                  <td><span className={`crm-gap__tag is-${a.status}`}>{L(STATUS[a.status].ar, STATUS[a.status].en)}</span></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">{L('الإجمالي', 'Total')}</th>
                {r.groups.map((g) => <td key={g.id}>{r.colTotals[g.id]}</td>)}
                <td>{r.areas.reduce((sum, a) => sum + a.total, 0)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="crm-lrep__note crm-gap__note">
          {L('بيحسب الأنواع الثمانية الأساسية فقط. الأحمر: ولا وحدة. الأصفر: وحدة واحدة بس. الأخضر: وحدتين أو أكتر.', 'Counts the eight main kinds. Red: none. Amber: one. Green: two or more.')}
          {r.other > 0 && ` ${L(`في ${r.other} وحدة نوعها مش من دول.`, `${r.other} units are of another kind.`)}`}
        </p>
      </Card>

      <Card>
        <CardHeader
          title={L('شرائح الأسعار: إيه الموجود وإيه الناقص؟', 'Price bands: what exists, what is missing')}
          description={L('لكل نوع خمس شرائح سعر. الشريحة الحمرا معناها مفيش وحدة بالسعر ده، وده سعر ممكن مشتري يدوّر عليه.', 'Five bands per kind. A red band means no listing at that price.')}
        />
        <div className="crm-gap__bands">
          {r.groups.map((g, gi) => {
            const b = r.bands[gi];
            return (
              <section key={g.id} className={`crm-gap__kind${b.total === 0 ? ' is-missing' : ''}`}>
                <header>
                  <h4>{groupName(g)}</h4>
                  <span>{b.total === 0 ? L('مفيش وحدات', 'None') : `${b.total} ${L('وحدة', 'units')} · ${L('وسيط', 'median')} ${short(b.median, isAr)}`}</span>
                </header>
                <ul>
                  {b.bands.map((x) => (
                    <li key={x.index} className={`is-${b.total === 0 ? 'gap' : cellLevel(x.count)}`}>
                      <span>{bandLabel(x.cuts, x.index, isAr)}</span>
                      <b>{x.count || '—'}</b>
                    </li>
                  ))}
                </ul>
                {b.noPrice > 0 && <p>{L(`${b.noPrice} وحدة من غير سعر`, `${b.noPrice} without a price`)}</p>}
              </section>
            );
          })}
        </div>
      </Card>
    </>
  );
}
