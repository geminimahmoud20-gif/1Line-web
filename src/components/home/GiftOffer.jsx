import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, MapPin, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import GiftCountdown from './GiftCountdown';
import { formatCurrencyPrice } from '../../utils/currencyAndBenchmark';

const TYPE_AR = { apartment: 'شقة', villa: 'فيلا', land: 'أرض', commercial: 'محل تجاري', office: 'مكتب إداري', building: 'عمارة', duplex: 'دوبلكس' };
const TYPE_EN = { apartment: 'Apartment', villa: 'Villa', land: 'Land', commercial: 'Shop', office: 'Office', building: 'Building', duplex: 'Duplex' };

/** The bow on top of the box */
function Bow() {
  // Each bow on the page needs its own gradient id
  const id = `gx-gold-${useId().replace(/:/g, '')}`;
  const g = `url(#${id})`;
  return (
  <svg className="gx-bow" viewBox="0 0 120 64" aria-hidden="true">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F3E3BA" />
        <stop offset=".55" stopColor="#D4AF6A" />
        <stop offset="1" stopColor="#A9824A" />
      </linearGradient>
    </defs>
    <path d="M60 46 C40 8 6 6 10 30 C13 48 40 50 60 46 Z" fill={g} />
    <path d="M60 46 C80 8 114 6 110 30 C107 48 80 50 60 46 Z" fill={g} />
    <path d="M60 46 C46 30 26 26 24 32 C30 40 46 44 60 46 Z M60 46 C74 30 94 26 96 32 C90 40 74 44 60 46 Z" fill="#8C6A35" opacity=".35" />
    <path d="M56 46 L44 64 L52 62 L56 54 Z M64 46 L76 64 L68 62 L64 54 Z" fill={g} />
    <ellipse cx="60" cy="46" rx="9" ry="8" fill={g} stroke="#8C6A35" strokeOpacity=".4" />
  </svg>
  );
}

/**
 * One limited-time offer as a wrapped gift: the discount and the countdown are on the box;
 * tapping it opens the lid and shows the unit, the prices and the link to its page.
 */
export default function GiftOffer({ property, offer, lang = 'ar', currency, index = 0 }) {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [ended, setEnded] = useState(false);
  const isAr = lang === 'ar';
  if (ended) return null;

  const title = isAr ? (property.title_ar || property.title_en) : (property.title_en || property.title_ar);
  const location = isAr ? (property.locationName_ar || property.locationName_en) : (property.locationName_en || property.locationName_ar);
  const type = (isAr ? TYPE_AR : TYPE_EN)[property.type] || (isAr ? 'وحدة' : 'Unit');
  const image = Array.isArray(property.images) ? property.images.find(Boolean) : null;
  const now = formatCurrencyPrice(offer.price, currency, lang);
  const was = formatCurrencyPrice(offer.basePrice, currency, lang);
  const saved = formatCurrencyPrice(offer.savings, currency, lang);
  const Arrow = isAr ? ArrowLeft : ArrowRight;
  // Lid lifts first, then the offer appears (no wait when the visitor prefers reduced motion)
  const unwrap = () => {
    const calm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (calm) return setOpen(true);
    setOpening(true);
    setTimeout(() => { setOpen(true); setOpening(false); }, 480);
  };
  const teaser = isAr ? `${type}${location ? ` في ${location}` : ''}` : `${type}${location ? ` in ${location}` : ''}`;

  return (
    <div className={`gx-item ${open ? 'is-open' : ''}`} style={{ '--i': index }}>
      {!open ? (
        <button
          type="button"
          className={`gx-gift ${opening ? 'is-opening' : ''}`}
          onClick={unwrap}
          disabled={opening}
          aria-expanded="false"
          aria-label={isAr ? `افتح العرض: خصم ${offer.pct}% على ${teaser}` : `Open the offer: ${offer.pct}% off a ${teaser}`}
        >
          <Bow />
          <span className="gx-lid" aria-hidden="true" />
          <span className="gx-body">
            <span className="gx-label">
              <span className="gx-tag">{isAr ? 'عرض حصري' : 'Exclusive'}</span>
              <span className="gx-pct">
                <small>{isAr ? 'خصم' : 'Save'}</small>
                <b>{offer.pct}%</b>
              </span>
              <span className="gx-what">{teaser}</span>
              <GiftCountdown endsAt={offer.endsAt} isAr={isAr} compact onEnd={() => setEnded(true)} />
            </span>
            <span className="gx-hint"><Gift size={16} aria-hidden="true" />{isAr ? 'افتح الهدية وشوف العرض' : 'Open to see the offer'}</span>
          </span>
        </button>
      ) : (
        <div className="gx-reveal" role="region" aria-label={title}>
          <span className="gx-burst" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--k': i }} />)}</span>
          <div className="gx-photo">
            {image && <img src={image} alt={title} loading="lazy" decoding="async" />}
            <span className="gx-photo-pct">{isAr ? `خصم ${offer.pct}%` : `${offer.pct}% off`}</span>
            <button type="button" className="gx-close" onClick={() => setOpen(false)} aria-label={isAr ? 'اقفل الهدية' : 'Close the gift'}>
              <RotateCcw size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="gx-info">
            <h3 className="gx-title" title={title}>{title}</h3>
            {location && <p className="gx-loc"><MapPin size={13} aria-hidden="true" />{location}</p>}
            <div className="gx-prices">
              <strong>{now.primary} <small>{now.symbol}</small></strong>
              <del>{was.primary} {was.symbol}</del>
            </div>
            <p className="gx-saved">{isAr ? `توفّر ${saved.primary} ${saved.symbol} كاش` : `You save ${saved.primary} ${saved.symbol} cash`}</p>
            <GiftCountdown endsAt={offer.endsAt} isAr={isAr} onEnd={() => setEnded(true)} />
            <Link to={`/properties/${property.id}`} className="gx-cta">
              <span>{isAr ? 'شوف تفاصيل العرض' : 'See the offer'}</span>
              <Arrow size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
