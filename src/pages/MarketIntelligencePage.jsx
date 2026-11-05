import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, Calculator, ArrowRight, ArrowLeft, CheckCircle2, MessageCircle } from 'lucide-react';
import { budgetMatches, liveListings, pricedListings, assetClass, median } from '../utils/marketStats';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import MarketAreaList from '../components/market/MarketAreaList';
import { getAreas } from '../utils/areasData';
import { areaPrice } from '../utils/areaPricing';
import { mainAreas, areaPathName } from '../utils/areaLookup';
import '../components/market/market-page.css';
import { updatePageSeo, buildBreadcrumbSchema } from '../utils/seoHelper';
import { countPhrase } from '../utils/arabicCount';

export default function MarketIntelligencePage({ lang = 'ar', properties = [] }) {
  const navigate = useNavigate();
  const [userBudget, setUserBudget] = useState(2500000);
  const [areas, setAreas] = useState(getAreas);
  const isAr = lang === 'ar';

  // Dynamic SEO Meta Tags for Market Intelligence
  useEffect(() => {
    updatePageSeo({
      title: isAr ? 'أسعار المتر في سوهاج من العروض الحالية | 1Line' : 'Sohag price per m² from current listings | 1Line',
      description: isAr 
        ? 'متوسط سعر المتر في كل منطقة بسوهاج محسوب من العقارات المعروضة حالياً على 1Line، وإيه اللي تقدر تلاقيه بميزانيتك.'
        : 'Price per m² in each Sohag district, computed from the listings currently on 1Line, and what your budget can find.',
      url: '/market-intelligence',
      type: 'website',
      schemaId: 'breadcrumb-schema',
      schema: buildBreadcrumbSchema([
        { name: isAr ? 'الرئيسية' : 'Home', url: '/' },
        { name: isAr ? 'أسعار المتر ومؤشرات السوق' : 'Market Intelligence', url: '/market-intelligence' }
      ])
    });
  }, [lang, isAr]);

  // Live listen for area data updates from CRM
  useEffect(() => {
    const handleUpdate = () => setAreas(getAreas());
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const live = useMemo(() => liveListings(properties), [properties]);
  // Main areas that show a price, whichever source each one uses
  const pricedAreas = useMemo(() => mainAreas(areas).filter((a) => areaPrice(a, properties, areas).ppm > 0).length, [areas, properties]);
  const matches = useMemo(() => budgetMatches(properties, userBudget), [properties, userBudget]);
  const overall = useMemo(() => {
    // Same listings, classes and median as the area cards below: flats only, every area
    const ppm = pricedListings(properties).filter((p) => Number(p.size) > 0 && assetClass(p) === 'residential').map((p) => Number(p.price) / Number(p.size));
    return { residential: Math.round(median(ppm)), sample: ppm.length };
  }, [properties]);
  const areaName = (id) => areaPathName(id, areas, isAr) || (isAr ? 'منطقة تانية' : 'Other');
  const n = (v) => Number(v || 0).toLocaleString('en-US');

  return (
    <div className="market-intelligence-page-wrapper">
      {/* Hero Banner */}
      <div className="market-hero-banner">
        <div className="market-hero-container">
          {/* Quick Back Navigation Bar */}
          <div className="page-top-back-bar">
            <button
              type="button"
              className="btn-back-step"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              title={isAr ? 'الرجوع خطوة للخلف' : 'Go back one step'}
            >
              {isAr ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
              <span>{isAr ? 'رجوع خطوة للخلف' : 'Back'}</span>
            </button>
            <div className="page-breadcrumb-sub">
              <Link to="/">{isAr ? 'الرئيسية' : 'Home'}</Link>
              <span>/</span>
              <span className="crumb-current">{isAr ? 'أسعار المتر' : 'Price per m²'}</span>
            </div>
          </div>

          <div className="market-badge-pill">
            <TrendingUp size={16} className="text-gold" />
            <span>{isAr ? 'بيتحدّث مع كل عرض جديد' : 'Updated with every listing'}</span>
          </div>

          <h1>{isAr ? 'أسعار المتر في سوهاج' : 'Price per m² in Sohag'}</h1>
          <p>
            {isAr
              ? 'سعر المتر في كل منطقة ومناطقها الفرعية، ومكتوب جنب كل رقم مصدره: متوسط العروض الحالية على 1Line أو تقدير فريقنا.'
              : 'Price per m² for each area and its sub-areas, with the source next to every figure: current 1Line listings or our team\'s estimate.'}
          </p>
        </div>
      </div>

      <div className="market-content-container mi-body">
        <div className="mi-stats">
          <div className="mi-stat">
            <span>{isAr ? 'عقارات معروضة دلوقتي' : 'Listings now'}</span>
            <strong>{n(live.length)}</strong>
          </div>
          <div className="mi-stat">
            <span>{isAr ? 'وسيط متر الشقق' : 'Median flat price / m²'}</span>
            <strong>{overall.residential ? <><bdi>{n(overall.residential)}</bdi> <small>{isAr ? 'ج.م' : 'EGP'}</small></> : '—'}</strong>
            {overall.sample > 0 && <em>{isAr ? `من ${countPhrase('listing', overall.sample)} في كل المناطق` : `from ${countPhrase('listing', overall.sample, false)}`}</em>}
          </div>
          <div className="mi-stat">
            <span>{isAr ? 'مناطق ليها سعر' : 'Areas priced'}</span>
            <strong>{n(pricedAreas)}</strong>
          </div>
        </div>

        <section className="mi-section" aria-labelledby="mi-areas-title">
          <div className="mi-section-head">
            <h2 id="mi-areas-title">{isAr ? 'سعر المتر حسب المنطقة' : 'Price per m² by area'}</h2>
            <p>{isAr ? 'السعر الكبير لمتر الشقق في المنطقة كلها. افتح «الأسعار حسب النوع» للمحلات والمكاتب والأراضي.' : 'The large figure is for flats across the area. Open «Prices by kind» for shops, offices and land.'}</p>
          </div>
          <MarketAreaList areas={areas} properties={properties} isAr={isAr} />
        </section>

        {/* What a budget can find right now */}
        <section className="mi-budget" aria-labelledby="mi-budget-title">
          <div className="mi-budget-head">
            <span className="mi-budget-icon"><Calculator size={20} aria-hidden="true" /></span>
            <div>
              <h2 id="mi-budget-title">{isAr ? 'ميزانيتك تلاقي إيه دلوقتي؟' : 'What can your budget find now?'}</h2>
              <p>{isAr ? 'اكتب ميزانيتك ونقولك كام عقار معروض في حدودها وفين.' : 'Type your budget to see how many listings fit and where.'}</p>
            </div>
          </div>
          <div className="mi-budget-row">
            <label htmlFor="mi-budget" className="mi-budget-input">
              <span>{isAr ? 'الميزانية' : 'Budget'}</span>
              <span className="mi-budget-field">
                {/* Shown with thousands separators (2,500,000); typed digits in any script are read */}
                <input id="mi-budget" type="text" inputMode="numeric" dir="ltr" value={userBudget ? n(userBudget) : ''}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/\D/g, '');
                    setUserBudget(Math.min(1000000000, Number(digits) || 0));
                  }} />
                <em>{isAr ? 'ج.م' : 'EGP'}</em>
              </span>
            </label>
            <div className="mi-budget-result" aria-live="polite">
              <strong>{matches.count ? countPhrase('property', matches.count, isAr) : (isAr ? 'مفيش عقارات في الحدود دي' : 'No listings in this range')}</strong>
              <span>
                {matches.areas.length
                  ? matches.areas.slice(0, 4).map(([id, c]) => `${areaName(id)} (${c})`).join(isAr ? '، ' : ', ')
                  : (isAr ? 'اطلب اللي محتاجه ونبلغك أول ما يتوفر.' : 'Post a request and we will tell you when one appears.')}
              </span>
            </div>
            <Link to={matches.count ? `/properties?maxPrice=${userBudget}` : '/special-requests'} className="mi-budget-cta">
              {matches.count ? (isAr ? 'اعرض العقارات' : 'See listings') : (isAr ? 'اطلب عقار' : 'Request a property')}
            </Link>
          </div>
        </section>

        <div className="mi-bottom">
          <section className="mi-tips" aria-labelledby="mi-tips-title">
            <h2 id="mi-tips-title">{isAr ? 'قبل ما تقرر' : 'Before you decide'}</h2>
            <ul>
              <li><CheckCircle2 size={16} aria-hidden="true" /><span>{isAr ? 'قارن سعر متر الوحدة بسعر نفس المنطقة ونفس النوع (شقة مع شقة، محل مع محل).' : 'Compare a unit\'s price per m² with the same area and kind.'}</span></li>
              <li><CheckCircle2 size={16} aria-hidden="true" /><span>{isAr ? 'الرقم اللي جنبه «من عرض واحد» أو «عرضين» سعر وحدات بعينها، مش متوسط المنطقة.' : 'A figure from one or two listings is those units\' price, not the area\'s.'}</span></li>
              <li><CheckCircle2 size={16} aria-hidden="true" /><span>{isAr ? 'دي أسعار معروضة مش أسعار بيع نهائية. راجع المستندات مع محاميك قبل أي دفع.' : 'These are asking prices, not sale prices. Check the papers with your lawyer before paying.'}</span></li>
            </ul>
          </section>
          <section className="mi-cta" aria-labelledby="mi-cta-title">
            <h2 id="mi-cta-title">{isAr ? 'عايز مقارنة لوحدة معينة؟' : 'Need a comparison for a unit?'}</h2>
            <p>{isAr ? 'ابعتلنا الوحدة اللي بتفكر فيها ونبعتلك العروض المشابهة في نفس المنطقة وأسعارها.' : 'Send us the unit and we will send similar listings in the same area with their prices.'}</p>
            <a href={getWhatsAppUrl(isAr ? 'مرحباً، عايز مقارنة أسعار لوحدة بفكر فيها' : 'Hello, I would like a price comparison for a unit')} target="_blank" rel="noopener noreferrer" className="mi-cta-btn">
              <MessageCircle size={18} aria-hidden="true" />
              <span>{isAr ? 'اطلب مقارنة على واتساب' : 'Ask on WhatsApp'}</span>
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
