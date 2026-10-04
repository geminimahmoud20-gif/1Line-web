import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, MapPin, ArrowLeft, ArrowRight, RotateCcw, Flame, Sparkles } from 'lucide-react';
import GiftCountdown from './GiftCountdown';
import { formatCurrencyPrice } from '../../utils/currencyAndBenchmark';
import { savingsHeadline } from '../../utils/propertyOffers';

const TYPE_AR = { apartment: 'شقة', villa: 'فيلا', land: 'أرض', commercial: 'محل تجاري', office: 'مكتب إداري', building: 'عمارة', duplex: 'دوبلكس' };
const TYPE_EN = { apartment: 'Apartment', villa: 'Villa', land: 'Land', commercial: 'Shop', office: 'Office', building: 'Building', duplex: 'Duplex' };

/** Counts a number up once when it first shows (skipped for reduced motion) */
function useCountUp(target, ms = 900) {
  const [v, setV] = useState(() => (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? target : 0));
  useEffect(() => {
    if (v === target) return undefined;
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

/** How urgent the offer is, for the badge on the box */
const urgency = (msLeft, isAr) => {
  const days = Math.ceil(msLeft / 86400000);
  if (msLeft <= 86400000) return { hot: true, text: isAr ? 'اليوم الأخير للعرض' : 'Final day' };
  if (days <= 3) return { hot: true, text: isAr ? `ينتهي خلال ${days === 2 ? 'يومين' : `${days} أيام`}` : `Ends in ${days} days` };
  return { hot: false, text: isAr ? 'عرض حصري' : 'Exclusive' };
};

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

/** The saving, counted up when the gift opens */
function RevealSaving({ amount, isAr }) {
  const v = useCountUp(amount);
  return (
    <div className="gx-win" role="note">
      <Sparkles size={16} aria-hidden="true" className="gx-win-icon" />
      <small>{isAr ? 'خصم مباشر' : 'Direct discount'}</small>
      <b><bdi>{v.toLocaleString('en-US')}</bdi> {isAr ? 'ج.م' : 'EGP'}</b>
    </div>
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
  const head = savingsHeadline(offer.savings, isAr);
  const badge = urgency(offer.msLeft, isAr);
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
          aria-label={isAr ? `اعرض التفاصيل: خصم ${head.value} ${head.unit} على ${teaser}` : `View the offer: ${head.value}${head.unit} off a ${teaser}`}
        >
          <Bow />
          <span className="gx-lid" aria-hidden="true" />
          <span className="gx-body">
            <span className="gx-label">
              <span className={`gx-tag ${badge.hot ? 'is-hot' : ''}`}>
                {badge.hot && <Flame size={13} aria-hidden="true" />}{badge.text}
              </span>
              <span className="gx-save-kicker">{isAr ? 'خصم مباشر' : 'Direct discount'}</span>
              <span className="gx-save">
                <b><bdi>{head.value}</bdi></b>
                <small>{head.unit}</small>
              </span>
              <span className="gx-pct-chip">{isAr ? `${offer.pct}% من سعر الوحدة` : `${offer.pct}% of the listed price`}</span>
              <span className="gx-what">{teaser}</span>
              <GiftCountdown endsAt={offer.endsAt} isAr={isAr} compact onEnd={() => setEnded(true)} />
            </span>
            <span className="gx-hint"><Gift size={16} aria-hidden="true" />{isAr ? 'اكتشف تفاصيل العرض' : 'View offer details'}</span>
          </span>
        </button>
      ) : (
        <div className="gx-reveal" role="region" aria-label={title}>
          <span className="gx-burst" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ '--k': i }} />)}</span>
          <div className="gx-photo">
            {image && <img src={image} alt={title} loading="lazy" decoding="async" />}
            <button type="button" className="gx-close" onClick={() => setOpen(false)} aria-label={isAr ? 'إغلاق' : 'Close'}>
              <RotateCcw size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="gx-info">
            <h3 className="gx-title" title={title}>{title}</h3>
            {location && <p className="gx-loc"><MapPin size={13} aria-hidden="true" />{location}</p>}
            <RevealSaving amount={offer.savings} isAr={isAr} />
            <div className="gx-prices">
              <span className="gx-price-label">{isAr ? 'سعر الوحدة بعد الخصم (كاش)' : 'Unit price after discount (cash)'}</span>
              <strong>{now.primary} <small>{now.symbol}</small></strong>
              <span className="gx-was">{isAr ? 'بدلاً من' : 'instead of'} <del>{was.primary} {was.symbol}</del></span>
            </div>
            <p className="gx-ends">{isAr ? 'ينتهي العرض خلال' : 'Offer ends in'}</p>
            <GiftCountdown endsAt={offer.endsAt} isAr={isAr} onEnd={() => setEnded(true)} />
            <Link to={`/properties/${property.id}`} className="gx-cta">
              <span>{isAr ? 'تفاصيل الوحدة وحجز معاينة' : 'Unit details & viewing'}</span>
              <Arrow size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
