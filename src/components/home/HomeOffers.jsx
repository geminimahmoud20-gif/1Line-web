import { useEffect, useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import PropertyCard from '../properties/PropertyCard';
import { getOfferListings } from '../../utils/propertyOffers';

/**
 * "عروض لفترة محدودة" — listings with a running offer (CRM → العقارات → العرض), ending soonest first.
 * Renders nothing when no offer is running, and drops an offer the minute its last day ends.
 */
export default function HomeOffers({ properties = [], lang = 'ar', currency, favorites = [], compareList = [], onToggleFavorite, onToggleCompare, onQuickView }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const offers = useMemo(() => getOfferListings(properties, now), [properties, now]);
  if (offers.length === 0) return null;

  const isAr = lang === 'ar';
  return (
    <section className="homepage-section hx-offers" id="limited-offers" aria-labelledby="hx-offers-title">
      <div className="hx-offers-head">
        <span className="hx-offers-pill"><Flame size={14} aria-hidden="true" /> {isAr ? 'لفترة محدودة' : 'Limited time'}</span>
        <h2 id="hx-offers-title" className="section-heading-primary m-0">{isAr ? 'عروض لفترة محدودة' : 'Limited-time offers'}</h2>
        <p className="section-heading-desc mt-2 mb-0">
          {isAr
            ? 'أسعار كاش مخفّضة على وحدات مختارة حتى تاريخ محدد. السعر الأصلي هو سعر العرض المعتاد للوحدة، والعرض ينتهي تلقائياً في موعده.'
            : 'Reduced cash prices on selected units until a set date. The "was" price is the unit\'s usual asking price, and each offer ends automatically on its date.'}
        </p>
      </div>
      <div className="properties-grid-4 hx-market-rail">
        {offers.slice(0, 8).map(({ property }) => (
          <PropertyCard
            key={property.id}
            property={property}
            lang={lang}
            currency={currency}
            isFavorite={favorites.includes(property.id)}
            onToggleFavorite={onToggleFavorite}
            isCompared={compareList.some((c) => c.id === property.id)}
            onToggleCompare={onToggleCompare}
            onQuickView={onQuickView}
          />
        ))}
      </div>
    </section>
  );
}
