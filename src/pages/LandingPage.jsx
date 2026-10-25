import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Search, MessageSquare, ShieldCheck } from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';
import NotFoundPage from './NotFoundPage';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { updatePageSeo, buildBreadcrumbSchema, injectJsonLdSchema } from '../utils/seoHelper';
import {
  LANDING_KINDS, LANDING_AREAS, parseLanding, landingListings, landingSummary, landingCopy, landingFaq, landingPath
} from '../utils/seoLanding';
import '../styles/landing.css';

/**
 * A search landing page: "شقق للبيع في سوهاج الجديدة" (/sohag/:kind/:area?). Real listings of the
 * kind in the area, the figures behind them, links to the neighbouring searches, and an FAQ.
 * Pages with no listings stay out of the sitemap and are marked noindex.
 */
export default function LandingPage({ properties = [], lang = 'ar', currency = 'EGP', favorites = [], onToggleFavorite, compareList = [], onToggleCompare, onQuickView }) {
  const { kind: kindSlug, area: areaSlug } = useParams();
  const page = parseLanding(kindSlug, areaSlug);
  const kind = page?.kind;
  const area = page?.area || null;

  const listings = useMemo(() => (kind ? landingListings(properties, kind, area) : []), [properties, kind, area]);
  const summary = useMemo(() => landingSummary(listings), [listings]);
  const copy = kind ? landingCopy(kind, area, summary) : null;
  const faq = kind ? landingFaq(kind, area, summary) : [];
  const path = kind ? landingPath(kind, area) : '';

  // Neighbouring searches that have listings: same kind in other areas, other kinds here
  const otherAreas = useMemo(() => (kind ? LANDING_AREAS
    .filter((a) => a.id !== area?.id)
    .map((a) => ({ a, n: landingListings(properties, kind, a).length }))
    .filter((x) => x.n > 0) : []), [properties, kind, area]);
  const otherKinds = useMemo(() => (kind ? LANDING_KINDS
    .filter((k) => k.slug !== kind.slug)
    .map((k) => ({ k, n: landingListings(properties, k, area).length }))
    .filter((x) => x.n > 0) : []), [properties, kind, area]);

  useEffect(() => {
    if (!kind) return;
    const crumbs = [{ name: 'الرئيسية', url: '/' }, { name: `${kind.ar} في سوهاج`, url: landingPath(kind) }];
    if (area) crumbs.push({ name: copy.h1, url: path });
    updatePageSeo({
      title: copy.title,
      description: copy.description,
      url: path,
      noindex: listings.length === 0,
      schemaId: 'breadcrumb-schema',
      schema: buildBreadcrumbSchema(crumbs)
    });
    injectJsonLdSchema('landing-faq-schema', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });
    injectJsonLdSchema('landing-list-schema', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: copy.h1,
      numberOfItems: listings.length,
      itemListElement: listings.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${window.location.origin}/properties/${encodeURIComponent(p.id)}`, name: p.title_ar || p.title_en || '' }))
    });
    // These two describe this page only
    return () => ['landing-faq-schema', 'landing-list-schema'].forEach((id) => document.getElementById(id)?.remove());
  }, [kind, area, path, copy?.title, copy?.description, listings, faq]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!kind) return <NotFoundPage lang={lang} />;

  const where = area ? area.ar : 'سوهاج';
  const waText = `مرحباً 1Line، أبحث عن ${kind.one_ar} للبيع في ${where}. الميزانية: ... والمساحة: ...`;

  return (
    <div className="ld-page" dir="rtl">
      <header className="ld-head">
        <nav className="ld-crumbs" aria-label="مسار الصفحة">
          <Link to="/">الرئيسية</Link>
          <span aria-hidden="true">/</span>
          {area ? <Link to={landingPath(kind)}>{kind.ar} في سوهاج</Link> : <Link to="/properties">العقارات</Link>}
          {area && (<><span aria-hidden="true">/</span><span aria-current="page">{area.ar}</span></>)}
        </nav>
        <h1>{copy.h1}</h1>
        <p className="ld-intro">{copy.intro}</p>
        {summary.count > 0 && (
          <dl className="ld-facts">
            <div><dt>عروض متاحة</dt><dd>{summary.count}</dd></div>
            {summary.medianPpm > 0 && <div><dt>متوسط سعر المتر</dt><dd>{summary.medianPpm.toLocaleString('en-US')} <small>ج.م</small></dd></div>}
            {summary.minPrice > 0 && <div><dt>يبدأ من</dt><dd>{summary.minPrice.toLocaleString('en-US')} <small>ج.م</small></dd></div>}
          </dl>
        )}
      </header>

      {listings.length > 0 ? (
        <section aria-label={copy.h1}>
          <div className="properties-grid-full ld-grid">
            {listings.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                lang={lang}
                currency={currency}
                isFavorite={favorites.includes(p.id)}
                onToggleFavorite={onToggleFavorite}
                isCompared={compareList.some((c) => c.id === p.id)}
                onToggleCompare={onToggleCompare}
                onQuickView={onQuickView}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="ld-ask">
        <div>
          <h2>مش لاقي اللي يناسبك؟</h2>
          <p>ابعت المساحة والميزانية ونظام الدفع، ونبعتلك العروض المطابقة في {where}، ومنها عروض مش منشورة على الموقع.</p>
        </div>
        <div className="ld-ask-actions">
          <Link to="/buy" className="ld-btn ld-btn--primary"><Search size={16} aria-hidden="true" />اطلب بمواصفاتك</Link>
          <a href={getWhatsAppUrl(waText)} target="_blank" rel="noopener noreferrer" className="ld-btn ld-btn--wa"><MessageSquare size={16} aria-hidden="true" />واتساب</a>
        </div>
      </section>

      {(otherAreas.length > 0 || otherKinds.length > 0) && (
        <nav className="ld-links" aria-label="عمليات بحث قريبة">
          {otherAreas.length > 0 && (
            <div>
              <h2>{kind.ar} في مناطق تانية</h2>
              <ul>
                {area && <li><Link to={landingPath(kind)}>كل سوهاج</Link></li>}
                {otherAreas.map(({ a, n }) => <li key={a.id}><Link to={landingPath(kind, a)}><MapPin size={13} aria-hidden="true" />{a.ar} <small>({n})</small></Link></li>)}
              </ul>
            </div>
          )}
          {otherKinds.length > 0 && (
            <div>
              <h2>عقارات تانية في {where}</h2>
              <ul>
                {otherKinds.map(({ k, n }) => <li key={k.slug}><Link to={landingPath(k, area)}>{k.ar} <small>({n})</small></Link></li>)}
              </ul>
            </div>
          )}
        </nav>
      )}

      <section className="ld-faq">
        <h2>أسئلة شائعة عن {copy.h1}</h2>
        {faq.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
        <p className="ld-note"><ShieldCheck size={14} aria-hidden="true" /> الأسعار المذكورة أسعار معروضة على 1Line دلوقتي، مش أسعار بيع نهائية.</p>
      </section>
    </div>
  );
}
