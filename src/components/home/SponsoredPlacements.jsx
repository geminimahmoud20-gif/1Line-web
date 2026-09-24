import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { trackAd } from '../../utils/adCampaigns';
import { getWhatsAppUrl } from '../../utils/founderCmsData';

const pick = (c, isAr, key) => (isAr ? c[`${key}_ar`] : (c[`${key}_en`] || c[`${key}_ar`])) || '';

/** Internal paths stay in the SPA; external links are marked sponsored (Google policy) and open in a new tab */
export function AdLink({ campaign, className, children, ...rest }) {
  const onClick = () => trackAd(campaign.id, 'clicks');
  const url = String(campaign.url || '').trim();
  if (url.startsWith('/')) {
    return <Link to={url} className={className} onClick={onClick} {...rest}>{children}</Link>;
  }
  return (
    <a href={url} className={className} onClick={onClick} target="_blank" rel="sponsored noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

/** Counts an impression once the element is at least half visible */
function useImpression(campaignId) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !campaignId) return undefined;
    if (!('IntersectionObserver' in window)) { trackAd(campaignId, 'impressions'); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { trackAd(campaignId, 'impressions'); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [campaignId]);
  return ref;
}

/** Hero takeover credit line — the headline and search stay 1Line's */
export function HeroSponsorChip({ campaign, lang = 'ar' }) {
  const isAr = lang === 'ar';
  const ref = useImpression(campaign?.id);
  if (!campaign) return null;
  const title = pick(campaign, isAr, 'title');
  const cta = pick(campaign, isAr, 'cta') || (isAr ? 'اكتشف' : 'Discover');
  return (
    <div ref={ref} className="hx-sponsor-wrap">
      <AdLink campaign={campaign} className="hx-sponsor" aria-label={`${isAr ? 'إعلان مُموَّل' : 'Sponsored'}: ${campaign.advertiser || ''} — ${title}`}>
        <span className="hx-sponsor-tag">{isAr ? 'مُموَّل' : 'Sponsored'}</span>
        <span className="hx-sponsor-text">
          {campaign.advertiser && <strong>{campaign.advertiser}</strong>}
          {campaign.advertiser && title && <span aria-hidden="true"> — </span>}
          <span>{title}</span>
        </span>
        <span className="hx-sponsor-cta">
          {cta}
          {isAr ? <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" /> : <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />}
        </span>
      </AdLink>
    </div>
  );
}

function StripSlide({ campaign, isAr }) {
  const ref = useImpression(campaign.id);
  const title = pick(campaign, isAr, 'title');
  const subtitle = pick(campaign, isAr, 'subtitle');
  const cta = pick(campaign, isAr, 'cta') || (isAr ? 'اعرف أكثر' : 'Learn more');
  return (
    <article ref={ref} className="hx-ad-card">
      <picture className="hx-ad-media">
        {campaign.imageMobile && <source media="(max-width: 700px)" srcSet={campaign.imageMobile} />}
        <img src={campaign.imageDesktop} alt={title} loading="lazy" decoding="async" width="1200" height="600" />
      </picture>
      <div className="hx-ad-copy">
        <span className="hx-ad-tag">{isAr ? 'مُموَّل' : 'Sponsored'}{campaign.advertiser ? ` · ${campaign.advertiser}` : ''}</span>
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
        <AdLink campaign={campaign} className="hx-btn hx-btn--gold hx-ad-cta">
          <span>{cta}</span>
          {isAr ? <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" /> : <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />}
        </AdLink>
      </div>
    </article>
  );
}

/** In-page sponsored banners (one at a time, auto-rotating, pauses on hover/focus and reduced motion) */
export function SponsoredStrip({ campaigns = [], lang = 'ar' }) {
  const isAr = lang === 'ar';
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = campaigns.length;
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);
  useEffect(() => {
    if (count <= 1 || paused || reduceMotion) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), 8000);
    return () => clearInterval(t);
  }, [count, paused, reduceMotion]);

  if (count === 0) return null;
  const current = campaigns[Math.min(index, count - 1)];
  const go = (d) => setIndex((i) => (i + d + count) % count);
  const advertiseMsg = isAr
    ? 'مرحباً 1Line، أرغب في الاستفسار عن الإعلان على الموقع (الواجهة الرئيسية / المساحة الإعلانية).'
    : 'Hello 1Line, I would like to advertise on your website.';

  return (
    <section
      className="hx-section hx-ads"
      aria-roledescription={isAr ? 'عرض إعلاني' : 'carousel'}
      aria-label={isAr ? 'إعلانات مُموَّلة' : 'Sponsored'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hx-ads-head">
        <span className="hx-ads-label">{isAr ? 'مساحة إعلانية' : 'Advertising'}</span>
        <div className="hx-ads-tools">
          <a className="hx-ads-advertise" href={getWhatsAppUrl(advertiseMsg)} target="_blank" rel="noopener noreferrer">
            <Megaphone size={14} strokeWidth={1.75} aria-hidden="true" />
            {isAr ? 'أعلن معنا' : 'Advertise with us'}
          </a>
          {count > 1 && (
            <div className="hx-ads-nav">
              <button type="button" onClick={() => go(-1)} aria-label={isAr ? 'الإعلان السابق' : 'Previous'}>
                {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
              <span aria-live="polite">{index + 1} / {count}</span>
              <button type="button" onClick={() => go(1)} aria-label={isAr ? 'الإعلان التالي' : 'Next'}>
                {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
          )}
        </div>
      </div>
      <StripSlide key={current.id} campaign={current} isAr={isAr} />
    </section>
  );
}
