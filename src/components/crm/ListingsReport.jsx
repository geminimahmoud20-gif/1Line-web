import { useMemo } from 'react';
import { Eye, ClipboardCheck, AlertTriangle, Handshake, BadgeCheck, Wallet, Download } from 'lucide-react';
import { Card, CardHeader, KpiRow, KpiTile, Button } from '../ui';
import { listingReport, ISSUES, NO_AREA } from '../../utils/listingReview';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { propertyTypeLabel } from '../../utils/placeLabels';

const money = (n) => (n ? Number(n).toLocaleString('en-US') : '—');
const short = (n, isAr) => {
  if (!n) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} ${isAr ? 'مليار' : 'B'}`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} ${isAr ? 'مليون' : 'M'}`;
  return money(n);
};

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * CRM → العقارات → التقارير: where the listings stand, what holds the review queue back, and how
 * each area and type compares. Every figure opens the list already filtered (onOpenList).
 */
export default function ListingsReport({ properties, areas, isAr, onOpenList }) {
  const L = (ar, en) => (isAr ? ar : en);
  const typeLabel = (id) => {
    const t = PROPERTY_TYPES.find((x) => x.id === id);
    return t ? (isAr ? t.name_ar : t.name_en) : propertyTypeLabel(id, isAr);
  };
  const r = useMemo(() => listingReport(properties, areas, typeLabel), [properties, areas, isAr]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    const rows = [
      [L('المنطقة', 'Area'), L('الإجمالي', 'Total'), L('معروض', 'On site'), L('للمراجعة', 'In review'), L('اتباع', 'Sold'), L('متوسط سعر المتر', 'Median per m²')],
      ...r.areas.map((a) => [a.label, a.count, a.onSite, a.hidden, a.sold, a.medianM2 || '']),
      [],
      [L('النوع', 'Type'), L('الإجمالي', 'Total'), L('معروض', 'On site'), L('متوسط السعر', 'Median price'), L('متوسط سعر المتر', 'Median per m²')],
      ...r.types.map((t) => [t.label, t.count, t.onSite, t.medianPrice || '', t.medianM2 || ''])
    ];
    const blob = new Blob([`${String.fromCharCode(0xfeff)}${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `1Line_Listings_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const incomplete = r.total - r.quality.ready;

  return (
    <div className="crm-lrep">
      <KpiRow label={L('ملخص العقارات', 'Listings summary')}>
        <KpiTile icon={<Eye size={18} />} label={L('معروض على الموقع', 'On the site')} value={r.byStatus.published} onClick={() => onOpenList({ status: 'published' })} />
        <KpiTile icon={<ClipboardCheck size={18} />} label={L('للمراجعة', 'In review')} value={r.byStatus.hidden} hint={L(`${r.readyHidden} منهم جاهزين للنشر`, `${r.readyHidden} ready to publish`)} onClick={() => onOpenList({ status: 'hidden' })} />
        <KpiTile icon={<AlertTriangle size={18} />} label={L('ناقص بيانات', 'Incomplete')} value={incomplete} onClick={() => onOpenList({ readiness: 'incomplete' })} />
        <KpiTile icon={<Handshake size={18} />} label={L('تحت التفاوض', 'Negotiating')} value={r.byStatus.under_negotiation} onClick={() => onOpenList({ status: 'under_negotiation' })} />
        <KpiTile icon={<BadgeCheck size={18} />} label={L('اتباع', 'Sold')} value={r.byStatus.sold} onClick={() => onOpenList({ status: 'sold' })} />
        <KpiTile
          icon={<Wallet size={18} />}
          label={L('قيمة المعروض', 'Value on site')}
          value={r.onSiteValue ? r.onSiteValue / (r.onSiteValue >= 1e9 ? 1e9 : 1e6) : null}
          digits={1}
          unit={r.onSiteValue >= 1e9 ? L('مليار', 'B') : L('مليون', 'M')}
          emptyText={L('مفيش أسعار', 'No prices')}
          hint={L('معروض + تحت التفاوض', 'Live + negotiating')}
        />
      </KpiRow>

      {r.readyHidden > 0 && (
        <div className="crm-lrep__cta" role="status">
          <span>{L(`${r.readyHidden} عقار بياناتهم كاملة ومستنيين النشر.`, `${r.readyHidden} complete listings are waiting to be published.`)}</span>
          <Button size="sm" onClick={() => onOpenList({ status: 'hidden', readiness: 'ready' })}>{L('اعرضهم وانشرهم', 'Review and publish')}</Button>
        </div>
      )}

      <Card>
        <CardHeader title={L('اكتمال البيانات', 'Data completeness')} description={L('اللي ناقص يمنع النشر. اضغط على أي سطر عشان تشوف العقارات دي.', 'What blocks publishing. Click a row to see those listings.')} />
        <ul className="crm-lrep__quality">
          {Object.keys(ISSUES).map((k) => {
            const n = r.quality[k];
            const pct = r.total ? Math.round((n / r.total) * 100) : 0;
            return (
              <li key={k}>
                <button type="button" onClick={() => onOpenList({ issue: k })} disabled={!n}>
                  <span className="crm-lrep__qlabel">{L(`من غير ${ISSUES[k].ar}`, `Missing ${ISSUES[k].en.toLowerCase()}`)}</span>
                  <span className="crm-lrep__bar" aria-hidden="true"><span style={{ inlineSize: `${pct}%` }} /></span>
                  <span className="crm-lrep__num">{n}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card padding="flush">
        <div className="crm-lrep__head">
          <CardHeader title={L('حسب المنطقة', 'By area')} />
          <Button size="sm" variant="secondary" icon={<Download size={14} aria-hidden="true" />} onClick={exportCsv}>{L('تنزيل التقرير', 'Download report')}</Button>
        </div>
        <div className="crm-lrep__scroll">
          <table className="crm-lrep__table">
            <thead>
              <tr>
                <th scope="col">{L('المنطقة', 'Area')}</th>
                <th scope="col">{L('الإجمالي', 'Total')}</th>
                <th scope="col">{L('معروض', 'On site')}</th>
                <th scope="col">{L('للمراجعة', 'Review')}</th>
                <th scope="col">{L('اتباع', 'Sold')}</th>
                <th scope="col">{L('متوسط المتر', 'Per m²')}</th>
              </tr>
            </thead>
            <tbody>
              {r.areas.map((a) => (
                <tr key={a.id} className={a.id === NO_AREA ? 'is-warn' : undefined}>
                  <th scope="row"><button type="button" onClick={() => onOpenList({ area: a.id })}>{a.label}</button></th>
                  <td>{a.count}</td>
                  <td>{a.onSite}</td>
                  <td>{a.hidden}</td>
                  <td>{a.sold}</td>
                  <td>{money(a.medianM2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding="flush">
        <div className="crm-lrep__head"><CardHeader title={L('حسب النوع', 'By type')} /></div>
        <div className="crm-lrep__scroll">
          <table className="crm-lrep__table">
            <thead>
              <tr>
                <th scope="col">{L('النوع', 'Type')}</th>
                <th scope="col">{L('الإجمالي', 'Total')}</th>
                <th scope="col">{L('معروض', 'On site')}</th>
                <th scope="col">{L('متوسط السعر', 'Median price')}</th>
                <th scope="col">{L('متوسط المتر', 'Per m²')}</th>
              </tr>
            </thead>
            <tbody>
              {r.types.map((t) => (
                <tr key={t.id}>
                  <th scope="row"><button type="button" onClick={() => onOpenList({ type: t.id })}>{t.label}</button></th>
                  <td>{t.count}</td>
                  <td>{t.onSite}</td>
                  <td>{short(t.medianPrice, isAr)}</td>
                  <td>{money(t.medianM2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="crm-lrep__note">{L('الأرقام من غير سلة المهملات والعينات التجريبية. "متوسط" هنا هو الوسيط.', 'Excludes trash and sample listings. "Median" is used for averages.')}</p>
    </div>
  );
}
