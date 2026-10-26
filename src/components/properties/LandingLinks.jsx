import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { landingPages } from '../../utils/seoLanding';
import '../../styles/landing.css';

/**
 * "Browse by kind and area": links to the search landing pages that have listings
 * (/sohag/apartments-for-sale/new-sohag…). Lets visitors and search engines reach them.
 */
export default function LandingLinks({ properties = [], isAr = true }) {
  const pages = useMemo(() => landingPages(properties), [properties]);
  if (!isAr || pages.length === 0) return null;
  const cities = pages.filter((p) => !p.area);
  return (
    <nav className="ld-page ld-browse" aria-label="تصفّح حسب النوع والمنطقة">
      <h2>تصفّح حسب النوع والمنطقة</h2>
      <div className="ld-links">
        {cities.map((c) => (
          <div key={c.path}>
            <h3><Link to={c.path}>{c.kind.ar} في سوهاج <small>({c.count})</small></Link></h3>
            <ul>
              {pages.filter((p) => p.area && p.kind === c.kind).map((p) => (
                <li key={p.path}><Link to={p.path}>{p.area.ar} <small>({p.count})</small></Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
