import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building, 
  Search, 
  TrendingUp, 
  Users, 
  MapPin, 
  DollarSign, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Calculator, 
  Award, 
  Zap, 
  Lock, 
  Gift,
  Filter,
  CheckCircle2,
  Flame,
  Clock
} from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';
import AboutFounderSection from '../components/home/AboutFounderSection';
import SponsoredAdsShowcase from '../components/home/SponsoredAdsShowcase';
import MortgageRoiCalculator from '../components/calculators/MortgageRoiCalculator';
import MarketTickerBar from '../components/home/MarketTickerBar';
import { PROPERTY_TYPES, PROPERTIES_DATA } from '../data/propertiesData';
import { MEGA_PROJECTS } from '../data/projectsData';
import { TESTIMONIALS, INITIAL_DEMANDS } from '../data/mockData';
import { getFounderSettings, DEFAULT_FOUNDER_CMS } from '../utils/founderCmsData';
import { getAreas } from '../utils/areasData';

export default function HomePage({ 
  lang, 
  properties, 
  demands = [], 
  favorites, 
  onToggleFavorite, 
  compareList = [],
  onToggleCompare,
  onQuickView,
  onOpenAddDemand
}) {
  const navigate = useNavigate();

  // Smart Search States
  const [searchPurpose, setSearchPurpose] = useState('buy'); // 'buy' | 'rent' | 'invest'
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchArea, setSearchArea] = useState('all');
  const [searchType, setSearchType] = useState('all');
  const [searchBudget, setSearchBudget] = useState('all');
  const [districts, setDistricts] = useState(() => getAreas());

  // Dynamic Corporate & Hero Stats Settings from CMS
  const [founderSettings, setFounderSettings] = useState(() => getFounderSettings());

  useEffect(() => {
    const handleUpdate = () => setFounderSettings(getFounderSettings());
    const handleAreasUpdate = () => setDistricts(getAreas());
    window.addEventListener('oneline_founder_cms_updated', handleUpdate);
    window.addEventListener('oneline_areas_updated', handleAreasUpdate);
    
    // Smooth scroll and highlight if navigated to #about-us
    if (window.location.hash === '#about-us') {
      setTimeout(() => {
        const el = document.getElementById('about-us');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          el.classList.add('section-highlight-pulse');
          setTimeout(() => el.classList.remove('section-highlight-pulse'), 3000);
        }
      }, 200);
    }

    return () => {
      window.removeEventListener('oneline_founder_cms_updated', handleUpdate);
      window.removeEventListener('oneline_areas_updated', handleAreasUpdate);
    };
  }, []);

  // Compact Hub Navigation Tabs
  const [marketplaceTab, setMarketplaceTab] = useState('properties'); // 'properties' | 'demands'
  const [insightsTab, setInsightsTab] = useState('calculator'); // 'calculator' | 'founder'
  const [marketplaceAreaFilter, setMarketplaceAreaFilter] = useState('all');

  // Safe fallback to default verified catalog if parent state was ever empty
  const safeProperties = (Array.isArray(properties) && properties.length > 0) ? properties : PROPERTIES_DATA;
  const safeDemands = (Array.isArray(demands) && demands.length > 0) ? demands : INITIAL_DEMANDS;

  // Exclude hidden, draft, and deleted properties from public homepage
  const publishedProperties = safeProperties.filter(
    (p) => !p.isDeleted && p.status !== 'trash' && p.status !== 'hidden' && p.status !== 'draft'
  );
  const activePublished = publishedProperties.length > 0 ? publishedProperties : PROPERTIES_DATA;

  // In-Tab Quick District Filter for Marketplace Properties
  const filteredMarketplaceProps = useMemo(() => {
    if (marketplaceAreaFilter === 'all') return activePublished;
    return activePublished.filter(p => p.areaKey === marketplaceAreaFilter || (p.locationName_ar || '').includes(marketplaceAreaFilter));
  }, [activePublished, marketplaceAreaFilter]);

  const featuredProperties = filteredMarketplaceProps.filter(p => p.featured);
  const displayProperties = featuredProperties.length > 0 ? featuredProperties.slice(0, 4) : filteredMarketplaceProps.slice(0, 4);

  // Active Demands List sorted with newest approved/published first
  const activeDemandsList = useMemo(() => {
    return safeDemands
      .filter(d => (d.status || 'published') === 'published')
      .sort((a, b) => {
        const timeA = new Date(a.approvedAt || a.createdAt || a.timestamp || 0).getTime();
        const timeB = new Date(b.approvedAt || b.createdAt || b.timestamp || 0).getTime();
        return timeB - timeA;
      });
  }, [safeDemands]);

  // Categorized Omnibox Search Matchers (Districts, Projects, and Properties)
  const matchingDistricts = useMemo(() => {
    if (!searchKeyword.trim()) return [];
    const q = searchKeyword.toLowerCase().trim();
    return districts.filter(a => 
      a.id !== 'all' && ((a.name_ar && a.name_ar.toLowerCase().includes(q)) || (a.name_en && a.name_en.toLowerCase().includes(q)))
    ).slice(0, 3);
  }, [searchKeyword, districts]);

  const matchingProjects = useMemo(() => {
    if (!searchKeyword.trim()) return [];
    const q = searchKeyword.toLowerCase().trim();
    return (MEGA_PROJECTS || []).filter(p =>
      (p.title_ar && p.title_ar.toLowerCase().includes(q)) || 
      (p.title_en && p.title_en.toLowerCase().includes(q))
    ).slice(0, 2);
  }, [searchKeyword]);

  const matchingProperties = useMemo(() => {
    if (!searchKeyword.trim()) return [];
    const q = searchKeyword.toLowerCase().trim();
    return activePublished.filter(p => {
      const tAr = (p.title_ar || '').toLowerCase();
      const tEn = (p.title_en || '').toLowerCase();
      const lAr = (p.locationName_ar || '').toLowerCase();
      return tAr.includes(q) || tEn.includes(q) || lAr.includes(q);
    }).slice(0, 3);
  }, [searchKeyword, activePublished]);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const queryParams = new URLSearchParams();
    if (searchKeyword.trim() !== '') queryParams.set('q', searchKeyword.trim());
    if (searchArea !== 'all') queryParams.set('area', searchArea);
    if (searchType !== 'all') queryParams.set('type', searchType);
    if (searchBudget !== 'all') queryParams.set('budget', searchBudget);
    navigate(`/properties?${queryParams.toString()}`);
  };

  return (
    <div className="homepage-wrapper">
      {/* 🌟 1. HERO SECTION */}
      <section className="hero-section-premium">
        <div className="hero-backdrop-gradient" />
        <div className="hero-content-container">
          <div className="hero-badge">
            <Sparkles size={14} className="text-gold" />
            <span>{lang === 'ar' ? 'المنصة العقارية الأكثر موثوقية في سوهاج' : 'Sohag’s Most Trusted Real Estate Platform'}</span>
          </div>

          <h1 className="hero-main-title">
            {lang === 'ar' ? (
              <>
                امتلك واستثمر في <span className="text-gradient-gold">أرقى عقارات سوهاج</span> بكل ثقة
              </>
            ) : (
              <>
                Own & Invest in <span className="text-gradient-gold">Sohag’s Finest Properties</span> with Full Confidence
              </>
            )}
          </h1>

          <p className="hero-description">
            {lang === 'ar' 
              ? 'شقق سكنية فاخرة، مقرات تجارية وإدارية، وفيلات مستقلة مسجلة ومفحوصة قانونياً مع برامج تقسيط مرنة حتى 7 سنوات.' 
              : 'Verified luxury apartments, retail shops, executive offices, and standalone villas with flexible financing up to 7 years.'}
          </p>

          {/* Smart Universal Search Bar */}
          <div className="hero-search-glassbox">
            <div className="hero-search-tabs">
              <button
                type="button"
                className={`hero-tab ${searchPurpose === 'buy' ? 'active' : ''}`}
                onClick={() => {
                  setSearchPurpose('buy');
                  setSearchType('all');
                }}
              >
                <Building size={14} />
                <span>{lang === 'ar' ? 'شراء عقار' : 'Buy Property'}</span>
              </button>
              <button
                type="button"
                className="hero-tab"
                onClick={() => navigate('/sell')}
                title={lang === 'ar' ? 'اعرض أو قيم عقارك للبيع' : 'Sell or Value Property'}
              >
                <TrendingUp size={14} />
                <span>{lang === 'ar' ? 'بيع / قيّم عقارك' : 'Sell / Value'}</span>
              </button>
              <button
                type="button"
                className={`hero-tab ${searchPurpose === 'invest' ? 'active' : ''}`}
                onClick={() => {
                  setSearchPurpose('invest');
                  setSearchType('commercial');
                }}
              >
                <Award size={14} />
                <span>{lang === 'ar' ? 'استثمار وتجاري' : 'Commercial & Invest'}</span>
              </button>
              <button
                type="button"
                className="hero-tab"
                onClick={() => {
                  setMarketplaceTab('demands');
                  const elem = document.getElementById('marketplace-hub');
                  if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Users size={14} />
                <span>{lang === 'ar' ? 'طلبات المشترين الحية' : 'Live Demands'}</span>
              </button>
            </div>

            <form onSubmit={handleHeroSearch} className="hero-search-inputs-row">
              {/* Keyword / Omnibox Search with Multi-Category Live Dropdown */}
              <div className="search-field keyword-search-field">
                <label>
                  <Search size={14} />
                  <span>{lang === 'ar' ? 'محرك البحث الذكي (Omnibox)' : 'Smart Omnibox Search'}</span>
                </label>
                <div className="hero-input-relative">
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'ابحث بالحي، المشروع، الكود، أو نوع العقار...' : 'Search by district, compound, code, or type...'}
                    value={searchKeyword}
                    onChange={(e) => {
                      setSearchKeyword(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  {searchKeyword.length > 0 && (
                    <button
                      type="button"
                      className="hero-clear-input-btn"
                      onClick={() => {
                        setSearchKeyword('');
                        setShowSuggestions(false);
                      }}
                      title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                    >
                      ✕
                    </button>
                  )}

                  {/* Multi-Category Omnibox Live Dropdown */}
                  {showSuggestions && searchKeyword.trim().length > 0 && (
                    <div className="hero-live-suggestions-dropdown">
                      <div className="suggestions-header">
                        <span>{lang === 'ar' ? 'نتائج البحث الذكي المقترحة' : 'Smart Suggestions'}</span>
                        <button type="button" className="close-sug-btn" onClick={() => setShowSuggestions(false)}>✕</button>
                      </div>

                      {/* 1. Matching Districts */}
                      {matchingDistricts.length > 0 && (
                        <div className="omnibox-section">
                          <div className="omnibox-sec-title">
                            <MapPin size={12} className="text-gold" />
                            <span>{lang === 'ar' ? 'الأحياء والمناطق' : 'Districts & Areas'}</span>
                          </div>
                          {matchingDistricts.map(area => (
                            <div
                              key={area.id}
                              className="omnibox-item-row"
                              onClick={() => {
                                setSearchArea(area.id);
                                setShowSuggestions(false);
                                navigate(`/properties?area=${area.id}`);
                              }}
                            >
                              <span className="omnibox-badge-area">📍</span>
                              <span className="omnibox-item-name">{lang === 'ar' ? area.name_ar : area.name_en}</span>
                              <small className="omnibox-item-action">{lang === 'ar' ? 'عرض عقارات المنطقة ←' : 'Explore Area →'}</small>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 2. Matching Mega Projects */}
                      {matchingProjects.length > 0 && (
                        <div className="omnibox-section">
                          <div className="omnibox-sec-title">
                            <Building size={12} className="text-gold" />
                            <span>{lang === 'ar' ? 'المشروعات والكمبوندات' : 'Mega Projects & Compounds'}</span>
                          </div>
                          {matchingProjects.map(proj => (
                            <Link
                              key={proj.id}
                              to="/projects"
                              className="omnibox-item-row"
                              onClick={() => setShowSuggestions(false)}
                            >
                              <span className="omnibox-badge-proj">🏢</span>
                              <div style={{ flex: 1 }}>
                                <div className="omnibox-item-name">{lang === 'ar' ? proj.title_ar : proj.title_en}</div>
                                <small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{lang === 'ar' ? proj.location_ar : proj.location_en}</small>
                              </div>
                              <small className="omnibox-item-action">{lang === 'ar' ? 'دليل المشروعات ←' : 'Projects Hub →'}</small>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* 3. Matching Direct Properties */}
                      {matchingProperties.length > 0 ? (
                        <div className="omnibox-section">
                          <div className="omnibox-sec-title">
                            <Sparkles size={12} className="text-gold" />
                            <span>{lang === 'ar' ? 'العقارات المطابقة مباشرة' : 'Matching Listings'}</span>
                          </div>
                          <div className="suggestions-list">
                            {matchingProperties.map((p) => (
                              <Link
                                key={p.id}
                                to={`/properties/${p.id}`}
                                className="sug-item-row"
                                onClick={() => setShowSuggestions(false)}
                              >
                                <img src={p.images[0]} alt={p.title_ar} className="sug-thumb" />
                                <div className="sug-info">
                                  <span className="sug-title">{lang === 'ar' ? p.title_ar : p.title_en}</span>
                                  <span className="sug-meta">{p.size} م² • {p.price.toLocaleString()} ج.م</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        matchingDistricts.length === 0 && matchingProjects.length === 0 && (
                          <div className="sug-empty">{lang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'No matches found'}</div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Location Select */}
              <div className="search-field">
                <label>
                  <MapPin size={14} />
                  <span>{lang === 'ar' ? 'المنطقة' : 'Location'}</span>
                </label>
                <select value={searchArea} onChange={(e) => setSearchArea(e.target.value)}>
                  {districts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {lang === 'ar' ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Type */}
              <div className="search-field">
                <label>
                  <Building size={14} />
                  <span>{lang === 'ar' ? 'نوع العقار' : 'Property Type'}</span>
                </label>
                <select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {lang === 'ar' ? t.name_ar : t.name_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget Range */}
              <div className="search-field">
                <label>
                  <DollarSign size={14} />
                  <span>{lang === 'ar' ? 'الميزانية' : 'Budget'}</span>
                </label>
                <select value={searchBudget} onChange={(e) => setSearchBudget(e.target.value)}>
                  <option value="all">{lang === 'ar' ? 'كل الميزانيات' : 'All Budgets'}</option>
                  <option value="under_3m">{lang === 'ar' ? 'أقل من 3 مليون' : 'Under 3M EGP'}</option>
                  <option value="3m_to_6m">{lang === 'ar' ? '3 إلى 6 مليون' : '3M - 6M EGP'}</option>
                  <option value="above_6m">{lang === 'ar' ? 'أكثر من 6 مليون' : 'Above 6M EGP'}</option>
                </select>
              </div>

              {/* Submit Button */}
              <button type="submit" className="hero-search-btn">
                <Search size={18} />
                <span>{lang === 'ar' ? 'بحث ذكي' : 'Search'}</span>
              </button>
            </form>

            {/* 🔥 Quick Area Discovery Tags */}
            <div className="hero-quick-tags-container">
              <span className="hero-quick-tag-label">
                <Sparkles size={13} className="text-gold" />
                <span>{lang === 'ar' ? 'الأكثر طلباً:' : 'Trending:'}</span>
              </span>
              <div className="hero-quick-tags-list">
                {[
                  { id: 'east', label_ar: 'شرق سوهاج', label_en: 'East Sohag', icon: '📍' },
                  { id: 'new_sohag', label_ar: 'سوهاج الجديدة', label_en: 'New Sohag', icon: '✨' },
                  { id: 'corniche', label_ar: 'الكورنيش', label_en: 'Corniche', icon: '🌊' },
                  { id: 'nasr', label_ar: 'مدينة ناصر', label_en: 'Nasr City', icon: '🏙️' }
                ].map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      setSearchArea(area.id);
                      navigate(`/properties?area=${area.id}`);
                    }}
                    className="hero-quick-area-tag"
                  >
                    <span>{area.icon}</span>
                    <span>{lang === 'ar' ? area.label_ar : area.label_en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 💰 Quick Budget Tier Discovery Pills */}
            <div className="hero-quick-tags-container budget-tier">
              <span className="hero-quick-tag-label budget">
                <DollarSign size={13} className="text-gold" />
                <span>{lang === 'ar' ? 'الميزانية السريعة:' : 'Quick Budget:'}</span>
              </span>
              <div className="hero-quick-tags-list">
                {[
                  { id: 'under_3m', label_ar: 'أقل من 3 مليون', label_en: 'Under 3M EGP', icon: '💵' },
                  { id: '3m_to_6m', label_ar: '3 إلى 6 مليون', label_en: '3M - 6M EGP', icon: '💎' },
                  { id: 'above_6m', label_ar: 'أكثر من 6 مليون', label_en: 'Above 6M EGP', icon: '👑' }
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSearchBudget(b.id);
                      navigate(`/properties?budget=${b.id}`);
                    }}
                    className="hero-quick-budget-tag"
                  >
                    <span>{b.icon}</span>
                    <span>{lang === 'ar' ? b.label_ar : b.label_en}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid - Live Dynamic & CMS Editable */}
          <div className="hero-stats-strip">
            {(founderSettings.heroStats || DEFAULT_FOUNDER_CMS.heroStats).map((st, idx) => {
              // If it's the first card and user wants live count from properties
              const displayNum = (idx === 0 && st.num_ar === '+150' && publishedProperties.length > 0)
                ? `+${publishedProperties.length}`
                : (lang === 'ar' ? st.num_ar : st.num_en);

              return (
                <div key={idx} className="stat-box">
                  <span className="stat-num">{displayNum}</span>
                  <span className="stat-lbl">{lang === 'ar' ? st.label_ar : st.label_en}</span>
                </div>
              );
            })}
          </div>
          {/* ⚡ Quick Portals & Action Services Deck (Instant 1-Click Access) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '22px',
            paddingTop: '18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {[
              { path: '/buy', icon: Building, label_ar: 'معالج الشراء', label_en: 'Buy Wizard', color: '#ffca28' },
              { path: '/sell', icon: TrendingUp, label_ar: 'عرض عقار وتقييم', label_en: 'Sell & Valuation', color: '#60a5fa' },
              { path: '/financing', icon: Calculator, label_ar: 'حاسبة الأقساط', label_en: 'Mortgage Plans', color: '#34d399' },
              { path: '/investor', icon: Award, label_ar: 'كبار المستثمرين', label_en: 'Investor Hub', color: '#c084fc' },
              { path: '/broker', icon: Users, label_ar: 'شبكة الوسطاء', label_en: 'Brokers', color: '#fbbf24' },
              { path: '/vault', icon: Lock, label_ar: 'الخزينة السرية', label_en: 'Private Vault', color: '#f87171' }
            ].map((p, idx) => {
              const IconComponent = p.icon;
              return (
                <Link
                  key={idx}
                  to={p.path}
                  style={{
                    background: 'rgba(10, 25, 47, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(10px)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-pill)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = p.color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 6px 20px ${p.color}33`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)';
                  }}
                >
                  <IconComponent size={15} style={{ color: p.color }} />
                  <span>{lang === 'ar' ? p.label_ar : p.label_en}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 📈 REAL-TIME SOHAG PROPTECH MARKET TICKER */}
      <MarketTickerBar lang={lang} />

      {/* 🏢 2. SOHAG LIVE MARKETPLACE HUB (Consolidated Segmented Discovery) */}
      <section className="homepage-section bg-surface" id="marketplace">
        <div className="section-header-flex" style={{ marginBottom: '22px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="section-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="live-pulse-dot" />
                {lang === 'ar' ? 'سوق سوهاج العقاري المعتمد' : 'Verified Sohag Marketplace'}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: '800', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                ● {lang === 'ar' ? 'تحديث لحظي مباشر' : 'Live Stream'}
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>
              {lang === 'ar' ? 'أحدث العقارات والطلبات الاستثمارية الحية' : 'Featured Properties & Live Demands'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px', marginBottom: 0 }}>
              {lang === 'ar' ? 'تصفح أحدث الوحدات المفحوصة هندسياً وقانونياً أو طابق عقارك مع مشتري الكاش الجاهزين فوراً' : 'Certified properties & instant matching with serious cash buyers in Sohag'}
            </p>
          </div>

          {/* Interactive Switcher Tabs (Ultra High Contrast Navy & Gold) */}
          <div className="marketplace-switcher-bar">
            <button
              type="button"
              onClick={() => setMarketplaceTab('properties')}
              className={`marketplace-tab-btn ${marketplaceTab === 'properties' ? 'active' : ''}`}
            >
              <Building size={16} />
              <span>{lang === 'ar' ? 'العقارات المعروضة' : 'Properties'}</span>
              <span className="tab-count-badge">
                {activePublished.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMarketplaceTab('demands')}
              className={`marketplace-tab-btn ${marketplaceTab === 'demands' ? 'active' : ''}`}
            >
              <Users size={16} />
              <span>{lang === 'ar' ? 'طلبات المشترين الكاش' : 'Cash Demands'}</span>
              <span className="tab-count-badge">
                {activeDemandsList.length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab 1: Properties */}
        {marketplaceTab === 'properties' && (
          <div>
            {/* Quick In-Tab District Filter Strip */}
            <div className="marketplace-filter-strip">
              <span className="filter-strip-label">
                <Filter size={14} className="text-gold" />
                <span>{lang === 'ar' ? 'تصفية سريعة بالمنطقة:' : 'Quick District Filter:'}</span>
              </span>
              <div className="filter-strip-chips">
                {[
                  { id: 'all', label_ar: 'الكل (جميع الأحياء)', label_en: 'All Districts' },
                  { id: 'east', label_ar: 'شرق سوهاج', label_en: 'East Sohag' },
                  { id: 'new_sohag', label_ar: 'سوهاج الجديدة', label_en: 'New Sohag' },
                  { id: 'corniche', label_ar: 'كورنيش النيل', label_en: 'Nile Corniche' },
                  { id: 'center', label_ar: 'وسط البلد والجامعة', label_en: 'City Center' },
                  { id: 'kawthar', label_ar: 'حي الكوثر', label_en: 'Al-Kawthar' }
                ].map(area => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setMarketplaceAreaFilter(area.id)}
                    className={`filter-chip-btn ${marketplaceAreaFilter === area.id ? 'active' : ''}`}
                  >
                    {lang === 'ar' ? area.label_ar : area.label_en}
                  </button>
                ))}
              </div>
            </div>

            {displayProperties.length > 0 ? (
              <div className="properties-grid-4">
                {displayProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    lang={lang}
                    isFavorite={favorites.includes(prop.id)}
                    onToggleFavorite={onToggleFavorite}
                    isCompared={compareList.some(c => c.id === prop.id)}
                    onToggleCompare={onToggleCompare}
                    onQuickView={onQuickView}
                  />
                ))}
              </div>
            ) : (
              <div className="marketplace-empty-box">
                <div className="empty-icon-circle">
                  <Building size={30} className="text-gold" />
                </div>
                <h3>{lang === 'ar' ? 'لا توجد وحدات معروضة حالياً في هذه المنطقة' : 'No properties in this district right now'}</h3>
                <p>{lang === 'ar' ? 'يمكنك إرسال مواصفات طلبك وسيتولى فريقنا الميداني توفير أفضل وحدة لك مباشرة بأعلى عائد وأفضل سعر.' : 'Submit your request and our advisory team will find the best match for you.'}</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '18px', flexWrap: 'wrap' }}>
                  <Link to="/buy" className="btn btn-primary" style={{ padding: '8px 20px', fontWeight: 'bold' }}>
                    {lang === 'ar' ? 'بدء معالج الشراء وتوفير عقار 🚀' : 'Start Buy Wizard'}
                  </Link>
                  <button type="button" className="btn btn-outline" onClick={() => setMarketplaceAreaFilter('all')}>
                    {lang === 'ar' ? 'استعراض كل المناطق' : 'Reset to All Districts'}
                  </button>
                </div>
              </div>
            )}

            {/* Executive Bottom Hub & Certified Trust Bar */}
            <div className="marketplace-bottom-hub">
              <div className="bottom-hub-trust">
                <div className="trust-icon-box">
                  <ShieldCheck size={22} className="text-gold" />
                </div>
                <div>
                  <strong>{lang === 'ar' ? 'ضمان 1Line المعتمد للأمان العقاري' : '1Line Certified Trust Guarantee'}</strong>
                  <p>{lang === 'ar' ? 'جميع الوحدات المعروضة مفحوصة هندسياً ومطابقة للتراخيص الرسمية وتخضع لإشراف قانوني كامل.' : '100% verified legal inspection on all listed units across Sohag governorate.'}</p>
                </div>
              </div>

              <div className="bottom-hub-actions">
                <Link to="/properties" className="btn btn-luxury-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}>
                  <span>{lang === 'ar' ? `استعراض كامل محفظة العقارات (${activePublished.length} عقار معتمد)` : 'Explore Full Portfolio'}</span>
                  {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                </Link>
                <Link to="/buy" className="btn btn-outline" style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}>
                  <span>{lang === 'ar' ? 'طلب توفير عقار خاص' : 'Custom Request'}</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Buyer Demands */}
        {marketplaceTab === 'demands' && (
          <div>
            {/* Live Demands Metrics Strip */}
            <div className="demands-metrics-strip">
              <div className="demand-metric-card">
                <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <DollarSign size={20} />
                </div>
                <div className="metric-info">
                  <span>{lang === 'ar' ? 'إجمالي القوة الشرائية المسجلة' : 'Total Purchasing Power'}</span>
                  <strong>
                    {(activeDemandsList.reduce((sum, d) => sum + (typeof d.budget === 'number' ? d.budget : parseInt(String(d.budget).replace(/,/g, '')) || 0), 0) / 1000000).toFixed(1)}M {lang === 'ar' ? 'مليون ج.م' : 'EGP'}
                  </strong>
                </div>
              </div>

              <div className="demand-metric-card">
                <div className="metric-icon" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
                  <Clock size={20} />
                </div>
                <div className="metric-info">
                  <span>{lang === 'ar' ? 'متوسط سرعة المطابقة المباشرة' : 'Avg. Direct Match Speed'}</span>
                  <strong>{lang === 'ar' ? '24 - 48 ساعة كاش' : '24 - 48 Hours'}</strong>
                </div>
              </div>

              <div className="demand-metric-card">
                <div className="metric-icon" style={{ background: 'rgba(13, 72, 161, 0.12)', color: '#0d48a1' }}>
                  <ShieldCheck size={20} />
                </div>
                <div className="metric-info">
                  <span>{lang === 'ar' ? 'فحص الجدية والقدرة المالية' : 'Buyer Financial Verification'}</span>
                  <strong>{lang === 'ar' ? '100% عملاء جادين' : '100% Verified'}</strong>
                </div>
              </div>
            </div>

            <div className="demands-grid-compact">
              {activeDemandsList.slice(0, 4).map((dem) => (
                <div key={dem.id} className="demand-card-box">
                  <div className="demand-top-row">
                    <span className="demand-time-tag">{dem.timestamp}</span>
                    <span 
                      className="urgency-badge"
                      style={dem.urgency === 'high' ? {
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #f87171',
                        fontWeight: '800'
                      } : {
                        background: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #60a5fa',
                        fontWeight: '800'
                      }}
                    >
                      {dem.urgency === 'high' ? (lang === 'ar' ? '🔥 مستعجل كاش' : 'Urgent Cash') : (lang === 'ar' ? '⭐ طلب جاد' : 'Serious Buyer')}
                    </span>
                  </div>
                  <p className="demand-text" style={{ color: '#0f172a', fontWeight: '700' }}>{lang === 'ar' ? dem.text_ar : dem.text_en}</p>
                  <div className="demand-footer-row">
                    <div className="demand-meta-item">
                      <MapPin size={14} style={{ color: '#0d48a1' }} />
                      <span style={{ color: '#1e293b', fontWeight: '800' }}>{lang === 'ar' ? (dem.area_ar || dem.area) : (dem.area_en || dem.area)}</span>
                    </div>
                    <div className="demand-meta-item">
                      <DollarSign size={14} style={{ color: '#d97706' }} />
                      <span style={{ color: '#0d48a1', fontWeight: '900', fontSize: '0.92rem' }}>
                        {(typeof dem.budget === 'number' ? dem.budget : parseInt(String(dem.budget).replace(/,/g, ''))).toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                    <Link 
                      to="/sell" 
                      className="btn-match-demand"
                      style={{
                        background: 'linear-gradient(135deg, #0d48a1, #1565c0)',
                        color: '#ffffff',
                        fontWeight: '800',
                        boxShadow: '0 2px 8px rgba(13, 72, 161, 0.25)',
                        padding: '6px 14px'
                      }}
                    >
                      {lang === 'ar' ? 'عقاري يطابق هذا الطلب ←' : 'Match My Property →'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
              {onOpenAddDemand && (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={onOpenAddDemand}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '10px 22px', fontWeight: 'bold' }}
                >
                  <Sparkles size={15} />
                  <span>{lang === 'ar' ? '➕ أضف طلبك العقاري مجاناً' : 'Post Buyer Request'}</span>
                </button>
              )}
              <Link to="/demands" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{lang === 'ar' ? `استعراض كل طلبات المشترين (${activeDemandsList.length})` : 'All Demands'}</span>
                {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 🌟 3. LUXURY SPONSORED ADS & FEATURED DEVELOPER SHOWCASE */}
      <SponsoredAdsShowcase lang={lang} />

      {/* 🧮 4. PROPTECH FINANCIAL INTELLIGENCE & INSTITUTIONAL TRUST HUB */}
      <section className="homepage-section bg-surface" id="mortgage-calculator">
        <div className="section-header-centered" style={{ marginBottom: '24px' }}>
          <span className="section-pill">{lang === 'ar' ? 'ذكاء السوق والضمان المؤسسي' : 'Financial Intelligence & Trust'}</span>
          <h2>{lang === 'ar' ? 'أدوات الحساب المالي والضمان القانوني المعتمد' : 'PropTech Simulator & Certified Legal Security'}</h2>

          {/* Dual Segment Switcher (Ultra High Contrast Navy & Gold) */}
          <div style={{
            display: 'inline-flex',
            background: '#081226',
            padding: '4px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255, 202, 40, 0.4)',
            gap: '4px',
            marginTop: '16px',
            boxShadow: '0 4px 16px rgba(8, 18, 38, 0.25)'
          }}>
            <button
              type="button"
              onClick={() => setInsightsTab('calculator')}
              style={{
                background: insightsTab === 'calculator' ? 'linear-gradient(135deg, #ffca28, #ff8f00)' : 'transparent',
                color: insightsTab === 'calculator' ? '#081226' : '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                padding: '9px 24px',
                fontSize: '0.86rem',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: insightsTab === 'calculator' ? '0 0 16px rgba(255, 202, 40, 0.4)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Calculator size={16} style={{ color: insightsTab === 'calculator' ? '#081226' : '#ffca28' }} />
              <span>{lang === 'ar' ? 'حاسبة التمويل والأقساط الذكية' : 'Mortgage & ROI Simulator'}</span>
            </button>

            <button
              type="button"
              onClick={() => setInsightsTab('founder')}
              style={{
                background: insightsTab === 'founder' ? 'linear-gradient(135deg, #ffca28, #ff8f00)' : 'transparent',
                color: insightsTab === 'founder' ? '#081226' : '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                padding: '9px 24px',
                fontSize: '0.86rem',
                fontWeight: '900',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: insightsTab === 'founder' ? '0 0 16px rgba(255, 202, 40, 0.4)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <ShieldCheck size={16} style={{ color: insightsTab === 'founder' ? '#081226' : '#ffca28' }} />
              <span>{lang === 'ar' ? 'عن 1Line والضمان القانوني' : 'About 1Line & Legal Pillars'}</span>
            </button>
          </div>
        </div>

        {insightsTab === 'calculator' ? (
          <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
            <MortgageRoiCalculator lang={lang} />
          </div>
        ) : (
          <AboutFounderSection lang={lang} />
        )}
      </section>

      {/* 💬 5. TESTIMONIALS */}
      <section className="homepage-section">
        <div className="section-header-centered">
          <span className="section-pill">{lang === 'ar' ? 'آراء العملاء' : 'Testimonials'}</span>
          <h2>{lang === 'ar' ? 'ماذا يقول عملاؤنا عنا؟' : 'What Our Clients Say'}</h2>
        </div>

        <div className="testimonials-grid">
          {TESTIMONIALS.map((item, idx) => (
            <div key={idx} className="testimonial-card">
              <div className="stars-row">★★★★★</div>
              <p className="testimonial-text">"{lang === 'ar' ? item.text_ar : item.text_en}"</p>
              <div className="testimonial-author">
                <div className="author-avatar">{item.name_ar.charAt(0)}</div>
                <div>
                  <h4>{lang === 'ar' ? item.name_ar : item.name_en}</h4>
                  <span>{lang === 'ar' ? item.role_ar : item.role_en}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🌟 6. EXECUTIVE VIP CONSULTATION CTA STRIP */}
      <section className="homepage-section" style={{ padding: '30px 20px 70px' }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          background: 'radial-gradient(circle at 15% 20%, #1565c0 0%, #0d48a1 40%, #081226 95%)',
          borderRadius: '28px',
          padding: '44px 40px',
          border: '1px solid rgba(255, 202, 40, 0.35)',
          boxShadow: '0 24px 60px rgba(13, 72, 161, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '26px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Ambient Glow */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 202, 40, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ maxWidth: '680px', position: 'relative', zIndex: 2 }}>
            <span style={{
              background: 'rgba(255, 202, 40, 0.18)',
              border: '1px solid rgba(255, 202, 40, 0.45)',
              color: '#ffca28',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              padding: '5px 14px',
              borderRadius: '999px',
              display: 'inline-block',
              marginBottom: '12px'
            }}>
              {lang === 'ar' ? 'استشارة عقارية وقانونية مجانية' : 'Free Certified Advisory'}
            </span>
            <h2 style={{ fontSize: '1.9rem', color: '#ffffff', fontWeight: 'bold', margin: '0 0 10px 0', lineHeight: 1.3 }}>
              {lang === 'ar' ? 'جاهز لتملك عقارك المثالي أو استثمارك القادم بسوهاج؟' : 'Ready to Secure Your Ideal Property in Sohag?'}
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', margin: 0, lineHeight: 1.6 }}>
              {lang === 'ar' 
                ? 'فريق خبراء ومستشاري 1Line جاهز لمساعدتك في فحص صحة الأوراق والتراخيص، التفاوض، واختيار العقار الأنسب لاحتياجك وميزانيتك مجاناً.' 
                : 'Our certified real estate advisors are ready to guide you through legal vetting, price negotiation, and financing.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
            <Link
              to="/buy"
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #ffca28, #ff8f00)',
                color: '#081226',
                fontWeight: '900',
                padding: '14px 28px',
                borderRadius: '14px',
                border: 'none',
                boxShadow: '0 8px 25px rgba(255, 202, 40, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{lang === 'ar' ? 'ابدأ معالج الشراء الآن' : 'Start Buy Wizard'}</span>
              {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </Link>

            <Link
              to="/sell"
              className="btn btn-outline"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.4)',
                color: '#ffffff',
                fontWeight: 'bold',
                padding: '14px 24px',
                borderRadius: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{lang === 'ar' ? 'اعرض عقارك للبيع' : 'List Property'}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
