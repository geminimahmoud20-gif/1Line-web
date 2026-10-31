import { MapPin } from 'lucide-react';
import { sampleKind } from '../../utils/marketStats';
import './area-price-cards.css';

// CRM-free view of areaMarketStats(): one card per area, one line per kind of property
// (homes, shops, offices, land…). Each line has its own price per m² and its own price range, so
// a shop's price never stretches the homes' range, and a single listing is labelled as one listing.

const CLASS_LABELS = {
  residential: { ar: 'شقق', en: 'Flats', hint_ar: 'سكني', hint_en: 'homes' },
  villa: { ar: 'فيلات وبيوت', en: 'Villas', hint_ar: 'شامل الأرض', hint_en: 'land included' },
  commercial: { ar: 'تجاري', en: 'Shops', hint_ar: 'محلات ومعارض', hint_en: 'shops and showrooms' },
  administrative: { ar: 'إداري', en: 'Offices', hint_ar: 'مكاتب وعيادات', hint_en: 'offices and clinics' },
  land: { ar: 'أراضي مباني', en: 'Building land', hint_ar: '', hint_en: '' },
  building: { ar: 'مباني كاملة', en: 'Whole buildings', hint_ar: '', hint_en: '' },
  agricultural: { ar: 'زراعي', en: 'Farmland', hint_ar: '', hint_en: '' },
  industrial: { ar: 'صناعي', en: 'Industrial', hint_ar: '', hint_en: '' }
};

export default function AreaPriceCards({ stats = [], areaName = (id) => id, isAr = true }) {
  const L = (ar, en) => (isAr ? ar : en);
  const n = (v) => Math.round(Number(v) || 0).toLocaleString('en-US');
  const money = (v) => {
    const x = Number(v) || 0;
    if (x >= 1e6) return `${(x / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${L('مليون', 'M')}`;
    return `${n(Math.round(x / 1000))} ${L('ألف', 'K')}`;
  };
  // «من 2 مليون لـ 9.75 مليون»: a dash between two numbers reads backwards in Arabic text
  const range = (lo, hi) => (isAr
    ? <>من <bdi>{lo}</bdi> لـ <bdi>{hi}</bdi></>
    : <><bdi>{lo}</bdi> – <bdi>{hi}</bdi></>);
  const listings = (c) => (isAr
    ? (c === 1 ? 'عرض واحد' : c === 2 ? 'عرضين' : `${n(c)} عروض`)
    : `${n(c)} listing${c === 1 ? '' : 's'}`);

  return (
    <div className="apc-grid">
      {stats.map((d) => (
        <article key={d.areaId} className="apc-card">
          <header className="apc-head">
            <MapPin size={16} aria-hidden="true" />
            <h4>{areaName(d.areaId)}</h4>
            <span className="apc-count">{listings(d.total)}</span>
          </header>
          <ul className="apc-rows">
            {d.classes.map((cls) => {
              const c = d[cls];
              const kind = sampleKind(c.ppmSample);
              const label = CLASS_LABELS[cls] || { ar: cls, en: cls };
              return (
                <li key={cls} className="apc-row">
                  <div className="apc-row-top">
                    <span className="apc-class">
                      {L(label.ar, label.en)}
                      {(isAr ? label.hint_ar : label.hint_en) && <small> · {L(label.hint_ar, label.hint_en)}</small>}
                    </span>
                    {c.ppmSample > 0 ? (
                      <strong className="apc-ppm"><bdi>{n(c.medianPpm)}</bdi> {L('ج.م/م²', 'EGP/m²')}</strong>
                    ) : (
                      <span className="apc-na">{L('المساحة مش مسجلة', 'no area given')}</span>
                    )}
                  </div>
                  <div className="apc-row-meta">
                    <span className={`apc-basis is-${kind}`}>
                      {kind === 'median' && L(`وسيط ${listings(c.ppmSample)}`, `median of ${c.ppmSample}`)}
                      {kind === 'pair' && L('متوسط عرضين بس', 'average of 2 only')}
                      {kind === 'single' && L('سعر عرض واحد، مش متوسط منطقة', 'one listing, not an area average')}
                      {kind === 'none' && listings(c.count)}
                    </span>
                    {c.ppmSample >= 2 && c.minPpm !== c.maxPpm && (
                      <span>{L('المتر', 'Per m²')} {range(n(c.minPpm), n(c.maxPpm))}</span>
                    )}
                    <span>
                      {c.count > 1 && c.minPrice !== c.maxPrice
                        ? <>{L('الوحدة', 'Unit')} {range(money(c.minPrice), money(c.maxPrice))}</>
                        : <>{L('سعر الوحدة', 'Unit price')} <bdi>{money(c.minPrice)}</bdi></>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
  );
}
