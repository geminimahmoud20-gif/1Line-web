import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MessageSquare, Search, ShieldCheck } from 'lucide-react';
import NotFoundPage from './NotFoundPage';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { updatePageSeo, buildBreadcrumbSchema, injectJsonLdSchema } from '../utils/seoHelper';
import { LANDING_AREAS } from '../utils/seoLanding';
import { parseGuide, guideRows, guideCopy, guideFaq, guidePath, rowFigure } from '../utils/seoGuides';
import { liveListings } from '../utils/marketStats';
import '../styles/landing.css';

/**
 * A price guide: "سعر المتر في سوهاج الجديدة" (/guides/price-per-meter-<area|sohag>). The figures
 * are computed from the listings published now (utils/seoGuides); with none it is noindex.
 */
export default function GuidePage({ properties = [] }) {
  const { slug } = useParams();
  const page = parseGuide(slug);
  const area = page?.area || null;
  const listings = useMemo(() => liveListings(properties), [properties]);
  const rows = useMemo(() => (page ? guideRows(listings, area) : []), [listings, page, area]);
  const copy = page ? guideCopy(area, rows) : null;
  const faq = page ? guideFaq(area, rows) : [];
  const path = page ? guidePath(area) : '';
  // Other places with a guide of their own
  const others = useMemo(() => (page ? [null, ...LANDING_AREAS]
    .filter((a) => (a?.id || '') !== (area?.id || ''))
    .filter((a) => guideRows(listings, a).length) : []), [listings, page, area]);

  useEffect(() => {
    if (!page) return undefined;
    updatePageSeo({
      title: copy.title,
      description: copy.description,
      url: path,
      noindex: rows.length === 0,
      schemaId: 'breadcrumb-schema',
      schema: buildBreadcrumbSchema([{ name: 'الرئيسية', url: '/' }, { name: copy.h1, url: path }])
    });
    injectJsonLdSchema('guide-faq-schema', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });
    return () => document.getElementById('guide-faq-schema')?.remove();
  }, [page, path, copy?.title, copy?.description, rows.length, faq]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!page) return <NotFoundPage lang="ar" />;
  const where = area ? area.ar : 'سوهاج';

  return (
    <div className="ld-page" dir="rtl">
      <header className="ld-head">
        <nav className="ld-crumbs" aria-label="مسار الصفحة">
          <Link to="/">الرئيسية</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{copy.h1}</span>
        </nav>
        <h1>{copy.h1}</h1>
        <p className="ld-intro">{copy.intro}</p>
      </header>

      {rows.length > 0 && (
        <section aria-label="سعر المتر لكل نوع">
          <div className="gd-table" role="table">
            {rows.map((r) => (
              <Link key={r.kind.slug} to={r.path} className="gd-row" role="row">
                <span className="gd-kind">{r.kind.ar.replace(' للبيع', '')}</span>
                <span className="gd-fig">{rowFigure(r)}</span>
                <small className="gd-n">{r.count} {r.count === 1 ? 'عرض' : 'عروض'} — شوف العروض</small>
              </Link>
            ))}
          </div>
          <p className="ld-note"><ShieldCheck size={14} aria-hidden="true" /> الرقم «حوالي» معناه وسيط ٣ عروض فأكتر، وأقل من كده بنعرض النطاق بس.</p>
        </section>
      )}

      <section className="ld-ask">
        <div>
          <h2>عايز تعرف سعر عقار معيّن؟</h2>
          <p>ابعتلنا المنطقة والمساحة ونديك تقييم مبني على عروض مشابهة، ونراجع أوراق العقار قبل أي دفع.</p>
        </div>
        <div className="ld-ask-actions">
          <Link to="/valuation" className="ld-btn ld-btn--primary"><Search size={16} aria-hidden="true" />قيّم عقارك</Link>
          <a href={getWhatsAppUrl(`مرحباً 1Line، عايز أعرف سعر المتر في ${where}.`)} target="_blank" rel="noopener noreferrer" className="ld-btn ld-btn--wa"><MessageSquare size={16} aria-hidden="true" />واتساب</a>
        </div>
      </section>

      {others.length > 0 && (
        <nav className="ld-links" aria-label="أسعار مناطق تانية">
          <div>
            <h2>سعر المتر في مناطق تانية</h2>
            <ul>{others.map((a) => <li key={a?.id || 'city'}><Link to={guidePath(a)}>{a ? a.ar : 'كل سوهاج'}</Link></li>)}</ul>
          </div>
        </nav>
      )}

      <section className="ld-faq">
        <h2>أسئلة شائعة عن {copy.h1}</h2>
        {faq.map((f) => (
          <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
        ))}
        <p className="ld-note"><ShieldCheck size={14} aria-hidden="true" /> الأسعار معروضة على 1Line دلوقتي، مش أسعار بيع نهائية.</p>
      </section>
    </div>
  );
}
