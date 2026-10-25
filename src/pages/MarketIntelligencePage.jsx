import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, Building, Sparkles, ShieldCheck, MapPin, CheckCircle2, Calculator, ArrowRight, ArrowLeft, Home, Store } from 'lucide-react';
import { areaMarketStats, budgetMatches, liveListings } from '../utils/marketStats';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { getAreas } from '../utils/areasData';
import { updatePageSeo, buildBreadcrumbSchema } from '../utils/seoHelper';

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
  const stats = useMemo(() => areaMarketStats(properties), [properties]);
  const hasCommercial = stats.some((d) => d.commercial?.medianPpm);
  const matches = useMemo(() => budgetMatches(properties, userBudget), [properties, userBudget]);
  const overall = useMemo(() => {
    const ppm = live.filter((p) => Number(p.size) > 0 && ['apartment', 'villa', 'duplex', 'penthouse', 'studio', 'residential'].includes(p.type))
      .map((p) => Number(p.price) / Number(p.size)).sort((a, b) => a - b);
    return { residential: ppm.length ? Math.round(ppm[Math.floor(ppm.length / 2)]) : 0 };
  }, [live]);
  const areaName = (id) => {
    const a = areas.find((x) => x.id === id);
    return a ? (isAr ? a.name_ar : a.name_en || a.name_ar) : id;
  };
  const n = (v) => Number(v || 0).toLocaleString('en-US');
  const short = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)} ${isAr ? 'مليون' : 'M'}` : `${n(Math.round(v / 1000))} ${isAr ? 'ألف' : 'K'}`);

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
            <span>{isAr ? 'مؤشرات من العروض الحالية' : 'From current listings'}</span>
          </div>

          <h1>{isAr ? 'أسعار المتر في سوهاج حسب المنطقة' : 'Price per m² across Sohag'}</h1>
          <p>
            {isAr
              ? 'الأرقام هنا محسوبة من العقارات المعروضة على 1Line دلوقتي، مش من سجلات الشهر العقاري ولا توقعات. بتتغير مع كل عرض بيتضاف أو يتباع.'
              : 'Figures are computed from the listings on 1Line right now — not registry records or forecasts. They change as listings are added or sold.'}
          </p>
        </div>
      </div>

      <div className="market-content-container">
        <div className="market-summary-stats-grid">
          <div className="summary-stat-box">
            <div className="stat-icon-wrap bg-blue"><Building size={22} /></div>
            <div>
              <span className="stat-lbl">{isAr ? 'عقارات معروضة الآن' : 'Listings now'}</span>
              <strong className="stat-num text-primary">{n(live.length)}</strong>
            </div>
          </div>
          <div className="summary-stat-box">
            <div className="stat-icon-wrap bg-green"><Home size={22} /></div>
            <div>
              <span className="stat-lbl">{isAr ? 'متوسط متر السكني (الوسيط)' : 'Median home price / m²'}</span>
              <strong className="stat-num text-success">{overall.residential ? `${n(overall.residential)} ${isAr ? 'ج.م' : 'EGP'}` : '—'}</strong>
            </div>
          </div>
          <div className="summary-stat-box">
            <div className="stat-icon-wrap bg-gold"><MapPin size={22} /></div>
            <div>
              <span className="stat-lbl">{isAr ? 'أكتر منطقة فيها عروض' : 'Most listings in'}</span>
              <strong className="stat-num">{stats[0] ? areaName(stats[0].areaId) : '—'}</strong>
            </div>
          </div>
          <div className="summary-stat-box">
            <div className="stat-icon-wrap bg-purple"><ShieldCheck size={22} /></div>
            <div>
              <span className="stat-lbl">{isAr ? 'قبل أي نشر أو تعاقد' : 'Before listing or contract'}</span>
              <strong className="stat-num">{isAr ? 'مراجعة المستندات' : 'Document review'}</strong>
            </div>
          </div>
        </div>

        {/* What a budget can find right now */}
        <div className="market-budget-advisor-card">
          <div className="advisor-header-row">
            <div className="advisor-title-wrap">
              <div className="advisor-glow-icon"><Calculator size={20} className="text-white" /></div>
              <div>
                <h4>{isAr ? 'ميزانيتك تلاقي إيه دلوقتي؟' : 'What can your budget find now?'}</h4>
                <p>{isAr ? 'عدد العقارات المعروضة حالياً في حدود ميزانيتك، حسب المنطقة' : 'Listings currently within your budget, by district'}</p>
              </div>
            </div>
            <div className="advisor-input-box">
              <label htmlFor="mi-budget">{isAr ? 'ميزانيتك:' : 'Your budget:'}</label>
              <div className="advisor-num-input-wrap">
                <input id="mi-budget" type="number" min="100000" max="100000000" step="100000" value={userBudget}
                  onChange={(e) => setUserBudget(Math.max(0, parseInt(e.target.value) || 0))} className="advisor-direct-input" />
                <span>{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>
          <div className="advisor-result-banner">
            <div className="advisor-res-district">
              <span className="res-tag">{isAr ? 'في حدود ميزانيتك' : 'Within your budget'}</span>
              <h5>{isAr ? `${n(matches.count)} عقار معروض` : `${n(matches.count)} listings`}</h5>
              <p>
                {matches.areas.length
                  ? matches.areas.slice(0, 4).map(([id, c]) => `${areaName(id)} (${c})`).join(isAr ? '، ' : ', ')
                  : (isAr ? 'مفيش عروض حالياً في الحدود دي — اطلب اللي محتاجه ونبلغك أول ما يتوفر.' : 'Nothing listed in this range right now — post a request and we will tell you when it appears.')}
              </p>
            </div>
            <div className="advisor-res-yield">
              <Link to={`/properties?maxPrice=${userBudget}`} className="btn btn-primary">{isAr ? 'اعرض العقارات' : 'See listings'}</Link>
            </div>
          </div>
        </div>

        {/* District table from current listings */}
        <div className="market-matrix-card">
          <div className="matrix-header-flex">
            <div>
              <h3>{isAr ? 'سعر المتر حسب المنطقة (من العروض الحالية)' : 'Price per m² by district (current listings)'}</h3>
              <p>{isAr ? 'الوسيط = السعر اللي نص العروض أقل منه ونصها أعلى. السكني والتجاري محسوبين كل واحد لوحده.' : 'Median = half the listings are below it, half above. Homes and commercial are computed separately.'}</p>
            </div>
          </div>
          {/* The commercial column only shows once some area has a commercial median */}
          {stats.length === 0 ? (
            <p style={{ margin: '12px 0 0' }}>{isAr ? 'لسه مفيش عقارات منشورة كفاية لحساب المتوسطات.' : 'Not enough published listings yet.'}</p>
          ) : (
            <div className="matrix-table-scroll">
              <table className="market-data-table">
                <thead>
                  <tr>
                    <th>{isAr ? 'المنطقة' : 'District'}</th>
                    <th>{isAr ? 'عروض حالية' : 'Listings'}</th>
                    <th>{isAr ? 'متر السكني (وسيط)' : 'Homes / m² (median)'}</th>
                    {hasCommercial && <th>{isAr ? 'متر التجاري (وسيط)' : 'Commercial / m² (median)'}</th>}
                    <th>{isAr ? 'نطاق الأسعار' : 'Price range'}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((d) => {
                    const prices = [d.residential, d.commercial, d.land].filter((c) => c.count);
                    const min = Math.min(...prices.map((c) => c.minPrice));
                    const max = Math.max(...prices.map((c) => c.maxPrice));
                    return (
                      <tr key={d.areaId}>
                        <td><div className="district-cell"><MapPin size={15} className="text-primary" /><strong>{areaName(d.areaId)}</strong></div></td>
                        <td>{n(d.total)}</td>
                        <td>{d.residential.medianPpm ? <strong className="cell-price">{n(d.residential.medianPpm)} {isAr ? 'ج.م' : 'EGP'}</strong> : '—'}{d.residential.ppmSample ? <small style={{ display: 'block', opacity: 0.7 }}>{isAr ? `من ${d.residential.ppmSample} عرض` : `from ${d.residential.ppmSample}`}</small> : null}</td>
                        {hasCommercial && <td>{d.commercial.medianPpm ? <strong className="cell-price">{n(d.commercial.medianPpm)} {isAr ? 'ج.م' : 'EGP'}</strong> : '—'}{d.commercial.ppmSample ? <small style={{ display: 'block', opacity: 0.7 }}>{isAr ? `من ${d.commercial.ppmSample} عرض` : `from ${d.commercial.ppmSample}`}</small> : null}</td>}
                        <td>{Number.isFinite(min) ? `${short(min)} – ${short(max)}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '10px 4px 0' }}>
          {isAr
            ? 'دي أسعار معروضة مش أسعار بيع نهائية، ومش بنعرض توقعات نمو أو عوائد إيجارية لأن مفيش بيانات صفقات كفاية تثبتها. لعائد وحدة معينة اطلب إيجارات مقارنة فعلية.'
            : 'These are asking prices, not final sale prices. No growth or rental-yield forecasts are shown because there is not enough deal data to support them. Ask for real comparable rents for any unit.'}
        </p>

        <div className="market-insights-grid">
          <div className="insight-card">
            <div className="insight-card-header">
              <Sparkles size={18} className="text-gold" />
              <h4>{isAr ? 'قبل ما تقرر' : 'Before you decide'}</h4>
            </div>
            <ul className="insights-points-list">
              <li><CheckCircle2 size={16} className="text-success" /><span>{isAr ? 'قارن سعر المتر للوحدة بالوسيط في نفس المنطقة ونفس النوع (سكني مع سكني، تجاري مع تجاري).' : 'Compare a unit\'s price per m² with the median for the same district and type.'}</span></li>
              <li><CheckCircle2 size={16} className="text-success" /><span>{isAr ? 'للمحلات والعيادات: اطلب إيجارات مقارنة فعلية في نفس الشارع قبل ما تحسب أي عائد.' : 'For shops and clinics, ask for real comparable rents on the same street before estimating any return.'}</span></li>
              <li><CheckCircle2 size={16} className="text-success" /><span>{isAr ? 'راجع المستندات وموقف الترخيص والتسجيل مع محاميك قبل أي دفع.' : 'Review documents, licence and registration with your lawyer before paying anything.'}</span></li>
            </ul>
          </div>
          <div className="insight-card cta-consult-card">
            <div className="insight-card-header">
              <Store size={18} className="text-white" />
              <h4>{isAr ? 'عايز مقارنة لوحدة معينة؟' : 'Need a comparison for a specific unit?'}</h4>
            </div>
            <p>{isAr ? 'ابعتلنا الوحدة اللي بتفكر فيها، ونبعتلك العروض المشابهة في نفس المنطقة وأسعارها.' : 'Send us the unit you are considering and we will share similar listings in the same area with their prices.'}</p>
            <a href={getWhatsAppUrl(isAr ? 'مرحباً، عايز مقارنة أسعار لوحدة بفكر فيها' : 'Hello, I would like a price comparison for a unit')} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-full">
              <span>{isAr ? 'اطلب مقارنة على واتساب' : 'Ask on WhatsApp'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
