import { MapPin } from 'lucide-react';
import { sampleKind, CLASS_LABELS } from '../../utils/marketStats';
import './area-price-cards.css';

// CRM-free view of areaMarketStats(): one card per area, one line per kind of property
// (homes, shops, offices, land…). Each line has its own price per m² and its own price range, so
// a shop's price never stretches the homes' range, and a single listing is labelled as one listing.

// Shared helpers for the per-kind lines
function formatters(isAr) {
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
  return { L, n, money, range, listings };
}

/** One line per kind of property in an area (a row of areaMarketStats) */
export function AreaClassRows({ row, isAr = true, flat = false }) {
  const { L, n, money, range, listings } = formatters(isAr);
  return (
    <ul className={`apc-rows${flat ? ' is-flat' : ''}`}>
      {row.classes.map((cls) => {
        const c = row[cls];
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
  );
}

export default function AreaPriceCards({ stats = [], areaName = (id) => id, isAr = true }) {
  const { listings } = formatters(isAr);
  return (
    <div className="apc-grid">
      {stats.map((d) => (
        <article key={d.areaId} className="apc-card">
          <header className="apc-head">
            <MapPin size={16} aria-hidden="true" />
            <h4>{areaName(d.areaId)}</h4>
            <span className="apc-count">{listings(d.total)}</span>
          </header>
          <AreaClassRows row={d} isAr={isAr} />
        </article>
      ))}
    </div>
  );
}
