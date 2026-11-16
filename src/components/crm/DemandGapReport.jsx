import { useMemo } from 'react';
import { Card, CardHeader } from '../ui';
import { TYPE_GROUPS } from '../../utils/supplyGap';
import { demandGapReport, bandLabel } from '../../utils/demandGap';

const STATUS = {
  empty: { ar: 'فاضية', en: 'Empty' },
  weak: { ar: 'ضعيفة', en: 'Thin' },
  ok: { ar: 'متنوعة', en: 'Covered' }
};

/**
 * CRM → العقارات → التقارير: what active buyers ask for next to what the team holds. The ranked
 * list says what to source first; the table compares each kind; each area gets a short read-out.
 */
export default function DemandGapReport({ properties, leads, areas, isAr, onOpenArea }) {
  const L = (ar, en) => (isAr ? ar : en);
  const r = useMemo(() => demandGapReport(properties, leads || [], areas), [properties, leads, areas]);
  const gName = (id) => {
    const g = TYPE_GROUPS.find((x) => x.id === id);
    return g ? (isAr ? g.ar : g.en) : id;
  };
  const areaName = (id) => areas.find((a) => a.id === id)?.name_ar || id;
  const maxKind = Math.max(1, ...r.kinds.map((k) => Math.max(k.demand, k.supply)));
  const noDemand = r.buyers.classified === 0;

  return (
    <>
      <Card>
        <CardHeader
          title={L('أولويات التوريد: هات إيه الأول؟', 'Sourcing priorities: what to find first')}
          description={L('مقارنة طلبات المشترين النشطين بالوحدات المعروضة. الأعلى نقصًا فوق.', 'Active buyers against live stock, biggest shortfall first.')}
        />
        {noDemand ? (
          <p className="crm-gap__empty">{L('مفيش مشترين نشطين محدد عندهم نوع عقار، فمفيش طلب نقارنه بالعرض. أول ما يتسجّل مشترين من «رشح لي عقاري» أو من العملاء، التقرير بيتملي لوحده.', 'No active buyers with a property kind yet, so there is no demand to compare.')}</p>
        ) : (
          <>
            <ol className="crm-gap__prio">
              {r.priorities.slice(0, 8).map((p, i) => (
                <li key={`${p.kind}-${p.areaId || ''}-${p.group}-${p.index ?? ''}`}>
                  <span className="crm-gap__rank">{i + 1}</span>
                  <span className="crm-gap__what">
                    <span className="crm-gap__line">
                      {p.kind === 'area' ? (
                        <>
                          <strong>{gName(p.group)}</strong> {L('في', 'in')}{' '}
                          <button type="button" onClick={() => onOpenArea(p.areaId)}>{areaName(p.areaId)}</button>
                        </>
                      ) : (
                        <><strong>{gName(p.group)}</strong> {L('بسعر', 'priced')} {bandLabel(p.cuts, p.index, isAr)}</>
                      )}
                    </span>
                    <small>{L(`${p.demand} طلب مقابل ${p.supply} وحدة`, `${p.demand} asking, ${p.supply} listed`)}</small>
                  </span>
                  <span className="crm-gap__short">{L(`ناقص ${p.shortfall}`, `short ${p.shortfall}`)}</span>
                </li>
              ))}
              {r.priorities.length === 0 && <li className="is-good">{L('العرض بيغطي كل الطلبات الحالية.', 'Stock covers every current request.')}</li>}
            </ol>
            <p className="crm-lrep__note crm-gap__note">
              {L(`${r.buyers.total} مشتري نشط، منهم ${r.buyers.classified} حددوا نوع العقار. شرائح الأسعار بتحسب اللي ذكروا ميزانية كاش بس.`, `${r.buyers.total} active buyers, ${r.buyers.classified} with a kind. Price bands count cash budgets only.`)}
            </p>
          </>
        )}
      </Card>

      {!noDemand && (
        <Card padding="flush">
          <div className="crm-lrep__head"><CardHeader title={L('العرض مقابل الطلب حسب النوع', 'Supply vs demand by kind')} /></div>
          <div className="crm-lrep__scroll">
            <table className="crm-lrep__table">
              <thead>
                <tr>
                  <th scope="col">{L('النوع', 'Kind')}</th>
                  <th scope="col">{L('طلب', 'Demand')}</th>
                  <th scope="col">{L('عرض', 'Supply')}</th>
                  <th scope="col">{L('الفرق', 'Gap')}</th>
                  <th scope="col" aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {r.kinds.map((k) => (
                  <tr key={k.id}>
                    <th scope="row">{gName(k.id)}</th>
                    <td>{k.demand}</td>
                    <td>{k.supply}</td>
                    <td className={k.gap > 0 ? 'crm-gap__neg' : k.gap < 0 ? 'crm-gap__pos' : undefined}>{k.gap > 0 ? `-${k.gap}` : k.gap < 0 ? `+${-k.gap}` : '0'}</td>
                    <td className="crm-gap__pair" aria-hidden="true">
                      <span className="crm-gap__bar is-demand" style={{ inlineSize: `${(k.demand / maxKind) * 100}%` }} />
                      <span className="crm-gap__bar is-supply" style={{ inlineSize: `${(k.supply / maxKind) * 100}%` }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title={L('تحليل كل منطقة', 'Area by area')} description={L('اللي موجود واللي ناقص وطلب المشترين في كل منطقة.', 'What exists, what is missing and buyer demand per area.')} />
        <div className="crm-gap__areas">
          {r.areas.map((a) => {
            const need = a.topNeed;
            const verdict = a.status === 'empty'
              ? L('مفيش ولا وحدة معروضة هنا.', 'Nothing listed here.')
              : a.status === 'weak'
                ? L('المنطقة ضعيفة: نوع واحد أو وحدتين بس.', 'Thin: one kind or two units.')
                : L('المنطقة متنوعة.', 'Well covered.');
            return (
              <section key={a.id} className={`crm-gap__area is-${a.status}`}>
                <header>
                  <h4><button type="button" onClick={() => onOpenArea(a.id)}>{a.name}</button></h4>
                  <span className={`crm-gap__tag is-${a.status}`}>{L(STATUS[a.status].ar, STATUS[a.status].en)}</span>
                </header>
                <p className="crm-gap__nums">
                  <span><b>{a.supply}</b> {L('وحدة معروضة', 'listed')}</span>
                  <span><b>{a.demand}</b> {L('مشتري عايزها', 'buyers want it')}</span>
                </p>
                <p className="crm-gap__verdict">{verdict}</p>
                {a.covered.length > 0 && <p><em>{L('الموجود:', 'Has:')}</em> {a.covered.map(gName).join('، ')}</p>}
                {a.missing.length > 0 && a.missing.length < TYPE_GROUPS.length && (
                  <p><em>{L('الناقص:', 'Missing:')}</em> {a.missing.map(gName).join('، ')}</p>
                )}
                {need && <p className="crm-gap__need">{L(`الأكتر طلبًا ومش موجود: ${gName(need.id)} (${need.demand} طلب)`, `Most wanted, short: ${gName(need.id)} (${need.demand})`)}</p>}
              </section>
            );
          })}
        </div>
      </Card>
    </>
  );
}
