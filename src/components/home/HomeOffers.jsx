import { useEffect, useMemo, useState } from 'react';
import { Gift } from 'lucide-react';
import GiftOffer from './GiftOffer';
import { getOfferListings } from '../../utils/propertyOffers';
import './home-offers-gift.css';

/**
 * "عروض حصرية" — listings with a running offer (CRM → العقارات → العرض), ending soonest first,
 * each wrapped as a gift with its own live countdown. Renders nothing when no offer is running;
 * an offer drops out the second its last day ends.
 */
export default function HomeOffers({ properties = [], lang = 'ar', currency }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const offers = useMemo(() => getOfferListings(properties, now), [properties, now]);
  if (offers.length === 0) return null;

  const isAr = lang === 'ar';
  return (
    <section className="homepage-section gx-section" id="limited-offers" aria-labelledby="gx-title">
      <div className="gx-head">
        <span className="gx-kicker"><Gift size={15} aria-hidden="true" />{isAr ? 'لفترة محدودة' : 'Limited time'}</span>
        <h2 id="gx-title" className="gx-heading">
          {isAr ? <>هدايا كاش <span className="gx-heading-gold">مستنياك</span></> : <>Cash gifts <span className="gx-heading-gold">waiting for you</span></>}
        </h2>
        <p className="gx-sub">
          {isAr
            ? 'جوه كل هدية مبلغ هتوفّره كاش على وحدة مختارة. افتح هديتك واعرف هتكسب قد إيه، قبل ما العداد يخلص.'
            : 'Each gift hides a cash saving on a selected unit. Open yours and see how much you keep, before the clock runs out.'}
        </p>
      </div>
      <div className={`gx-grid ${offers.length === 1 ? 'gx-grid--one' : ''}`}>
        {offers.slice(0, 8).map(({ property, offer }, i) => (
          <GiftOffer key={property.id} property={property} offer={offer} lang={lang} currency={currency} index={i} />
        ))}
      </div>
      <p className="gx-note">
        {isAr
          ? 'السعر قبل الخصم هو سعر الوحدة المعلن، وكل عرض ينتهي تلقائياً في موعده.'
          : 'The "was" price is the unit\'s listed price; each offer ends automatically on its date.'}
      </p>
    </section>
  );
}
