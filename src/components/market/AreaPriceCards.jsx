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
                  {/* One line: kind + how many listings | price per m². Details on one quiet line under it */}
                  <div className="apc-row-main">
                    <div className="apc-row-name">
                      <span className="apc-class" title={L(label.hint_ar, label.hint_en) || undefined}>{L(label.ar, label.en)}</span>
                      <span className={`apc-chip is-${kind}`}>
                        {kind === 'median' ? L(`وسيط ${listings(c.ppmSample)}`, `median of ${c.ppmSample}`) : listings(c.count)}
                      </span>
                    </div>
                    {c.ppmSample > 0 ? (
                      <div className="apc-price">
                        <strong><bdi>{n(c.medianPpm)}</bdi></strong>
                        <small>{L('ج.م للمتر', 'EGP/m²')}</small>
                      </div>
                    ) : (
                      <span className="apc-na">{L('المساحة مش مسجلة', 'no area given')}</span>
                    )}
                  </div>
                  <p className="apc-detail">
                    {c.ppmSample >= 2 && c.minPpm !== c.maxPpm && (
                      <span>{L('المتر', 'Per m²')} {range(n(c.minPpm), n(c.maxPpm))}</span>
                    )}
                    <span>
                      {c.count > 1 && c.minPrice !== c.maxPrice
                        ? <>{L('الوحدة', 'Unit')} {range(money(c.minPrice), money(c.maxPrice))}</>
                        : <>{L('سعر الوحدة', 'Unit price')} <bdi>{money(c.minPrice)}</bdi></>}
                    </span>
                    {cls === 'villa' && <span>{L('السعر شامل الأرض', 'land included')}</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
  );
}
