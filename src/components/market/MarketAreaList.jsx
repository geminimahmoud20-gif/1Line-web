import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ChevronDown } from 'lucide-react';
import { areaPrice } from '../../utils/areaPricing';
import { areaMarketStats, classLabel } from '../../utils/marketStats';
import { groupedAreas, mainAreaOf, shortAreaName, inArea } from '../../utils/areaLookup';
import { projectPriceStats } from '../../utils/projectStats';
import { projectPath } from '../../utils/projectFacts';
import { useDevelopers, projectDeveloper } from '../../utils/developers';
import { AreaClassRows } from './AreaPriceCards';
import './market-area-list.css';

// The market page's main list: each main area with its price per m² (from its listings or typed
// in the CRM, as chosen per area), its sub-areas under it, and the prices by kind folded away.

export default function MarketAreaList({ areas = [], properties = [], projects = [], isAr = true }) {
  const L = (ar, en) => (isAr ? ar : en);
  const n = (v) => Math.round(Number(v) || 0).toLocaleString('en-US');
  const developers = useDevelopers();

  const groups = useMemo(() => {
    // Listings counted under their main area for the «by kind» lines
    const asMain = properties.map((p) => ({ ...p, areaKey: mainAreaOf(p?.areaKey, areas)?.id || p?.areaKey }));
    const byKind = new Map(areaMarketStats(asMain).map((row) => [row.areaId, row]));
    return groupedAreas(areas)
      .map(({ main, children }) => ({
        main,
        price: areaPrice(main, properties, areas),
        kinds: byKind.get(main.id) || null,
        // Projects in the area or its sub-areas, priced from their listed units or the developer's figure
        projects: projects
          .filter((p) => !p.isDemo && p.areaKey && inArea(p.areaKey, main.id, areas))
          .map((p) => ({ p, stats: projectPriceStats(p, properties), dev: projectDeveloper(p, developers) })),
        subs: children
          .map((c) => ({ area: c, price: areaPrice(c, properties, areas) }))
          .filter((s) => s.price.ppm > 0 || s.price.count > 0)
          .sort((a, b) => b.price.count - a.price.count)
      }))
      .filter((g) => g.price.ppm > 0 || g.price.count > 0 || g.projects.length > 0)
      .sort((a, b) => b.price.count - a.price.count || b.price.ppm - a.price.ppm);
  }, [areas, properties, projects, developers]);

  const listings = (c) => (isAr
    ? (c === 1 ? 'عرض واحد' : c === 2 ? 'عرضين' : `${n(c)} عروض`)
    : `${n(c)} listing${c === 1 ? '' : 's'}`);

  // Where the figure comes from, said next to it
  const source = (r) => {
    if (r.source === 'manual') return { tone: 'manual', text: L('تقدير فريق 1Line', '1Line estimate') };
    if (r.source === 'listings') {
      const kind = r.cls === 'residential' ? '' : L(` (${classLabel(r.cls, true)})`, ` (${classLabel(r.cls, false)})`);
      if (r.kind === 'median') return { tone: 'ok', text: L(`متوسط ${listings(r.sample)}${kind}`, `median of ${r.sample}${kind}`) };
      return { tone: 'thin', text: L(`من ${listings(r.sample)} بس${kind}`, `from ${r.sample} only${kind}`) };
    }
    return { tone: 'none', text: L('لسه مفيش عروض', 'No listings yet') };
  };

  const priceTag = (r, big = false) => (r.ppm > 0 ? (
    <span className={`mal-price${big ? ' is-big' : ''}`}>
      <bdi>{n(r.ppm)}</bdi>
      <small>{L('ج.م للمتر', 'EGP/m²')}</small>
    </span>
  ) : <span className="mal-price is-none">—</span>);

  if (!groups.length) {
    return <p className="mal-empty">{L('لسه مفيش أسعار كفاية للمناطق.', 'Not enough prices yet.')}</p>;
  }

  return (
    <div className="mal-list">
      {groups.map(({ main, price, kinds, subs, projects: areaProjects }) => {
        const src = source(price);
        return (
          <article key={main.id} className="mal-card">
            <header className="mal-head">
              <div className="mal-name">
                <MapPin size={18} aria-hidden="true" />
                <div>
                  <h3>{shortAreaName(main, areas, isAr)}</h3>
                  <span className={`mal-src is-${src.tone}`}>{src.text}</span>
                </div>
              </div>
              {priceTag(price, true)}
            </header>

            {subs.length > 0 && (
              <ul className="mal-subs" aria-label={L('المناطق الفرعية', 'Sub-areas')}>
                {subs.map(({ area, price: sp }) => {
                  const s = source(sp);
                  return (
                    <li key={area.id}>
                      <div className="mal-sub-name">
                        <span>{shortAreaName(area, areas, isAr)}</span>
                        <small className={`mal-src is-${s.tone}`}>{s.text}</small>
                      </div>
                      {priceTag(sp)}
                    </li>
                  );
                })}
              </ul>
            )}

            {areaProjects.length > 0 && (
              <div className="mal-projects">
                <h4>{L('المشروعات في المنطقة', 'Projects here')}</h4>
                <ul>
                  {areaProjects.map(({ p, stats, dev }) => (
                    <li key={p.id}>
                      <Link to={projectPath(p)} className="mal-project">
                        <span className="mal-project-name">
                          <span>{isAr ? p.title_ar : p.title_en || p.title_ar}</span>
                          {dev && <small>{isAr ? dev.name_ar : dev.name_en || dev.name_ar}</small>}
                        </span>
                        {stats.avgPricePerMeter > 0
                          ? priceTag({ ppm: stats.avgPricePerMeter })
                          : <span className="mal-price is-none">{L('اسأل', 'Ask')}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <footer className="mal-foot">
              {kinds && kinds.classes.length > 0 && (
                <details className="mal-kinds">
                  <summary>
                    <span>{L('الأسعار حسب النوع', 'Prices by kind')}</span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </summary>
                  <AreaClassRows row={kinds} isAr={isAr} flat />
                </details>
              )}
              {price.count > 0 && (
                <Link className="mal-link" to={`/properties?area=${encodeURIComponent(main.id)}`}>
                  {L(`شوف ${listings(price.count)}`, `See ${listings(price.count)}`)}
                </Link>
              )}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
