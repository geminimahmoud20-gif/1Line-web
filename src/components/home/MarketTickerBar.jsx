import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Zap, ShieldCheck } from 'lucide-react';
import { getAreas } from '../../utils/areasData';
import { useProperties } from '../../context/PropertiesContext';
import { areaPrice } from '../../utils/areaPricing';

// Every figure here comes from data the 1Line team maintains — nothing is hard-coded:
//  • price per m²  → per area as chosen in the CRM: the median of its listings (3+), or the typed figure
//  • buyer demand  → latest published demand (admin-approved)
const toNumber = (v) => (typeof v === 'number' ? v : parseInt(String(v || '').replace(/[^\d]/g, ''), 10) || 0);
// Latin digits everywhere, matching prices on the rest of the site
const fmt = (n) => n.toLocaleString('en-US');
const fmtMillions = (n, isAr) => {
  const s = (Math.round((n / 1_000_000) * 10) / 10).toLocaleString('en-US');
  return isAr ? `${s} مليون ج.م` : `EGP ${s}M`;
};

export default function MarketTickerBar({ lang = 'ar', demands = [] }) {
  const isAr = lang === 'ar';
  const [areas, setAreas] = useState(() => getAreas());

  useEffect(() => {
    const onUpdate = () => setAreas(getAreas());
    window.addEventListener('oneline_areas_updated', onUpdate);
    return () => window.removeEventListener('oneline_areas_updated', onUpdate);
  }, []);

  const { properties = [] } = useProperties();

  const items = useMemo(() => {
    const priced = areas
      .filter((a) => a.id !== 'all')
      .map((a) => ({ a, r: areaPrice(a, properties, areas) }))
      // One or two listings are those units' own prices, not the area's
      .filter(({ r }) => r.source === 'manual' || (r.source === 'listings' && r.sample >= 3))
      .sort((x, y) => y.r.ppm - x.r.ppm)
      .slice(0, 6)
      .map(({ a, r }) => ({
        key: `area-${a.id}`,
        icon: MapPin,
        to: `/properties?area=${encodeURIComponent(a.id)}`,
        label: isAr ? `متوسط سعر المتر — ${a.name_ar}` : `Avg. price / m² — ${a.name_en || a.name_ar}`,
        value: isAr ? `${fmt(r.ppm)} ج.م` : `EGP ${fmt(r.ppm)}`,
      }));

    const latestDemand = demands
      .filter((d) => (d.status || 'published') === 'published' && toNumber(d.budget) > 0)
      .sort((a, b) => new Date(b.approvedAt || b.createdAt || 0) - new Date(a.approvedAt || a.createdAt || 0))[0];

    const out = [...priced];
    if (latestDemand) {
      // Budget is appended separately, so drop the "بميزانية …" tail the demand text often carries
      const text = ((isAr ? latestDemand.text_ar : latestDemand.text_en || latestDemand.text_ar) || '')
        // (no \b: JS word boundaries are ASCII-only and never match after Arabic letters)
        .split(/\s+(?:بميزانية|ميزانية|with a budget|budget)(?=\s|$)/i)[0]
        .trim();
      out.splice(Math.min(2, out.length), 0, {
        key: `demand-${latestDemand.id}`,
        icon: Zap,
        tone: 'live',
        to: '/demands',
        label: isAr ? 'طلب شراء منشور' : 'Live buyer demand',
        value: `${text.length > 60 ? text.slice(0, 58).trim() + '…' : text} — ${fmtMillions(toNumber(latestDemand.budget), isAr)}`,
      });
    }
    out.push({
      key: 'guarantee',
      icon: ShieldCheck,
      tone: 'trust',
      to: '/about',
      label: isAr ? 'التزام 1Line' : '1Line commitment',
      value: isAr ? 'نراجع مستندات الملكية قبل نشر أي عقار' : 'Title documents reviewed before any listing goes live',
    });
    return out;
  }, [areas, properties, demands, isAr]);

  if (items.length === 0) return null;

  const renderItem = (item, clone = false) => {
    const Icon = item.icon;
    return (
      <Link
        key={(clone ? 'c-' : '') + item.key}
        to={item.to}
        className={`hx-tick ${item.tone ? `hx-tick--${item.tone}` : ''}`}
        tabIndex={clone ? -1 : undefined}
        aria-hidden={clone || undefined}
      >
        <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
        <span className="hx-tick-label">{item.label}:</span>
        <bdi className="hx-tick-value">{item.value}</bdi>
      </Link>
    );
  };

  return (
    <section className="hx-ticker" aria-label={isAr ? 'مؤشرات السوق' : 'Market pulse'}>
      <div className="hx-ticker-tag">
        <span className="hx-live-dot" aria-hidden="true" />
        <span>{isAr ? 'نبض السوق' : 'Market pulse'}</span>
        <small title={isAr ? 'متوسطات استرشادية يحدّثها فريق 1Line من لوحة التحكم' : 'Indicative averages maintained by the 1Line team'}>
          {isAr ? 'متوسطات استرشادية' : 'Indicative'}
        </small>
      </div>
      <div className="hx-ticker-viewport">
        <div className="hx-ticker-track">
          {items.map((it) => renderItem(it))}
          {items.map((it) => renderItem(it, true))}
        </div>
      </div>
    </section>
  );
}
