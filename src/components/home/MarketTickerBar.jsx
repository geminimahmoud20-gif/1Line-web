import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Zap, ShieldCheck } from 'lucide-react';
import { getAreas } from '../../utils/areasData';

// Every figure here comes from data the 1Line team maintains — nothing is hard-coded:
//  • price per m²  → Areas CMS in the CRM (avgPricePerMeter per district)
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

  const items = useMemo(() => {
    const priced = areas
      .filter((a) => a.id !== 'all' && toNumber(a.avgPricePerMeter) > 0)
      .sort((a, b) => toNumber(b.avgPricePerMeter) - toNumber(a.avgPricePerMeter))
      .slice(0, 6)
      .map((a) => ({
        key: `area-${a.id}`,
        icon: MapPin,
        to: `/properties?area=${encodeURIComponent(a.id)}`,
        label: isAr ? `متوسط سعر المتر — ${a.name_ar}` : `Avg. price / m² — ${a.name_en || a.name_ar}`,
        value: isAr ? `${fmt(toNumber(a.avgPricePerMeter), true)} ج.م` : `EGP ${fmt(toNumber(a.avgPricePerMeter), false)}`,
      }));

    const latestDemand = demands
      .filter((d) => (d.status || 'published') === 'published' && toNumber(d.budget) > 0)
      .sort((a, b) => new Date(b.approvedAt || b.createdAt || 0) - new Date(a.approvedAt || a.createdAt || 0))[0];

    const out = [...priced];
    if (latestDemand) {
      const text = (isAr ? latestDemand.text_ar : latestDemand.text_en || latestDemand.text_ar) || '';
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
      label: isAr ? 'ضمان 1Line' : '1Line guarantee',
      value: isAr ? 'نراجع مستندات الملكية قبل نشر أي عقار' : 'Title documents reviewed before any listing goes live',
    });
    return out;
  }, [areas, demands, isAr]);

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
