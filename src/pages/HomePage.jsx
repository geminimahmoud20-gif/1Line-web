import { useState } from 'react';
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
  Gift
} from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';
import AboutFounderSection from '../components/home/AboutFounderSection';
import MortgageRoiCalculator from '../components/calculators/MortgageRoiCalculator';
import { SOHAG_AREAS, PROPERTY_TYPES } from '../data/propertiesData';
import { FAQS, TESTIMONIALS } from '../data/mockData';

export default function HomePage({ 
  lang, 
  properties, 
  demands, 
  favorites, 
  onToggleFavorite, 
  compareList = [],
  onToggleCompare,
  onQuickView
}) {
  const navigate = useNavigate();

  // Smart Search States
  const [searchPurpose, setSearchPurpose] = useState('buy'); // 'buy' | 'rent' | 'invest'
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchArea, setSearchArea] = useState('all');
  const [searchType, setSearchType] = useState('all');
  const [searchBudget, setSearchBudget] = useState('all');

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Exclude hidden, draft, and deleted properties from public homepage
  const publishedProperties = properties.filter(
    (p) => !p.isDeleted && p.status !== 'trash' && p.status !== 'hidden' && p.status !== 'draft'
  );

  const matchingProperties = publishedProperties.filter(p => {
    if (!searchKeyword.trim()) return false;
    const q = searchKeyword.toLowerCase().trim();
    const tAr = (p.title_ar || '').toLowerCase();
    const tEn = (p.title_en || '').toLowerCase();
    const lAr = (p.locationName_ar || '').toLowerCase();
    return tAr.includes(q) || tEn.includes(q) || lAr.includes(q);
  }).slice(0, 3);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const queryParams = new URLSearchParams();
    if (searchKeyword.trim() !== '') queryParams.set('q', searchKeyword.trim());
    if (searchArea !== 'all') queryParams.set('area', searchArea);
    if (searchType !== 'all') queryParams.set('type', searchType);
    if (searchBudget !== 'all') queryParams.set('budget', searchBudget);
    navigate(`/properties?${queryParams.toString()}`);
  };

  const featuredProperties = publishedProperties
    .filter(p => p.featured)
    .slice(0, 4);
  
  // Fallback to latest published if no featured
  const displayProperties = featuredProperties.length > 0 ? featuredProperties : publishedProperties.slice(0, 4);

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
                onClick={() => setSearchPurpose('buy')}
              >
                {lang === 'ar' ? 'شراء عقار' : 'Buy Property'}
              </button>
              <button
                type="button"
                className={`hero-tab ${searchPurpose === 'invest' ? 'active' : ''}`}
                onClick={() => setSearchPurpose('invest')}
              >
                {lang === 'ar' ? 'فرص استثمارية' : 'Investment Deals'}
              </button>
              <button
                type="button"
                className={`hero-tab ${searchPurpose === 'rent' ? 'active' : ''}`}
                onClick={() => setSearchPurpose('rent')}
              >
                {lang === 'ar' ? 'إيجار وتجاري' : 'Rent / Commercial'}
              </button>
            </div>

            <form onSubmit={handleHeroSearch} className="hero-search-inputs-row">
              {/* Keyword / Area Search with Live Dropdown */}
              <div className="search-field keyword-search-field">
                <label>
                  <Search size={14} />
                  <span>{lang === 'ar' ? 'بحث ذكي بالكلمة' : 'Quick Search'}</span>
                </label>
                <div className="hero-input-relative">
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'مثال: شقة شرق سوهاج، محل تجاري...' : 'e.g. East Sohag apartment...'}
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

                  {/* Live Suggestions Dropdown */}
                  {showSuggestions && searchKeyword.trim().length > 0 && (
                    <div className="hero-live-suggestions-dropdown">
                      <div className="suggestions-header">
                        <span>{lang === 'ar' ? 'العقارات المطابقة فورياً' : 'Matching Listings'}</span>
                        <button type="button" className="close-sug-btn" onClick={() => setShowSuggestions(false)}>✕</button>
                      </div>

                      {matchingProperties.length > 0 ? (
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
                      ) : (
                        <div className="sug-empty">{lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matches'}</div>
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
                  {SOHAG_AREAS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {lang === 'ar' ? a.name_ar : a.name_en}
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
          </div>

          {/* Quick Stats Grid */}
          <div className="hero-stats-strip">
            <div className="stat-box">
              <span className="stat-num">+150</span>
              <span className="stat-lbl">{lang === 'ar' ? 'عقار مفحوص ومعتمد' : 'Verified Properties'}</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">100%</span>
              <span className="stat-lbl">{lang === 'ar' ? 'سلامة قانونية وتراخيص' : 'Legal Compliance'}</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">+12 M</span>
              <span className="stat-lbl">{lang === 'ar' ? 'حجم مبيعات سنوي' : 'Annual Volume'}</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">7 {lang === 'ar' ? 'سنوات' : 'Yrs'}</span>
              <span className="stat-lbl">{lang === 'ar' ? 'أطول فترة تقسيط' : 'Max Installment'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 2. QUICK ACTION TILES & PORTALS */}
      <section className="homepage-section quick-portals-section">
        <div className="section-header-centered">
          <span className="section-pill">{lang === 'ar' ? 'بوابات متخصصة' : 'Specialized Portals'}</span>
          <h2>{lang === 'ar' ? 'خدمات عقارية مصممة لتلبية هدفك' : 'Tailored Real Estate Services'}</h2>
          <p>{lang === 'ar' ? 'اختر البوابة المناسبة لاحتياجك لبدء تجربة مخصصة وفورية' : 'Select the portal that matches your goal for an instant customized flow'}</p>
        </div>

        <div className="portals-grid-cards">
          {/* Buy Card */}
          <Link to="/buy" className="portal-action-card">
            <div className="portal-icon-box bg-gold">
              <Building size={24} />
            </div>
            <h3>{lang === 'ar' ? 'معالج شراء عقار' : 'Buy Wizard'}</h3>
            <p>{lang === 'ar' ? 'حدد مواصفات شقتك أو مقرك التجاري وسنطابقها فورياً مع قاعدة بياناتنا.' : 'Specify your dream apartment or commercial space for instant matching.'}</p>
            <div className="card-arrow-link">
              <span>{lang === 'ar' ? 'ابدأ البحث الآن' : 'Start Now'}</span>
              {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </div>
          </Link>

          {/* Sell & Valuation Card */}
          <Link to="/sell" className="portal-action-card">
            <div className="portal-icon-box bg-blue">
              <TrendingUp size={24} />
            </div>
            <h3>{lang === 'ar' ? 'عرض عقار للبيع والتقييم' : 'Sell & Valuation'}</h3>
            <p>{lang === 'ar' ? 'احصل على تقييم سعري فوري ودقيق لعقارك واعرضه لأكثر من 500 مشترٍ جاد.' : 'Get instant accurate market valuation and list to 500+ ready buyers.'}</p>
            <div className="card-arrow-link">
              <span>{lang === 'ar' ? 'قيّم عقارك مجاناً' : 'Free Valuation'}</span>
              {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </div>
          </Link>

          {/* Financing Card */}
          <Link to="/financing" className="portal-action-card">
            <div className="portal-icon-box bg-emerald">
              <Calculator size={24} />
            </div>
            <h3>{lang === 'ar' ? 'التمويل وحاسبة الأقساط' : 'Mortgage & Installments'}</h3>
            <p>{lang === 'ar' ? 'برنامج One Line Now للتمويل العقاري بأقساط مريحة تصل إلى 7 سنوات.' : 'Flexible mortgage plans and installment calculator up to 7 years.'}</p>
            <div className="card-arrow-link">
              <span>{lang === 'ar' ? 'احسب قسطك' : 'Calculate'}</span>
              {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </div>
          </Link>

          {/* Investor Center Card */}
          <Link to="/investor" className="portal-action-card">
            <div className="portal-icon-box bg-purple">
              <Award size={24} />
            </div>
            <h3>{lang === 'ar' ? 'مركز كبار المستثمرين' : 'Investor Center'}</h3>
            <p>{lang === 'ar' ? 'فرص عقارية تجارية وإدارية حصرية بعوائد إيجارية تتجاوز 14% سنوياً.' : 'Exclusive commercial opportunities with 14%+ projected rental yield.'}</p>
            <div className="card-arrow-link">
              <span>{lang === 'ar' ? 'استكشف الفرص' : 'Explore Deals'}</span>
              {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </div>
          </Link>

          {/* Broker Network Card */}
          <Link to="/broker" className="portal-action-card">
            <div className="portal-icon-box bg-amber">
              <Users size={24} />
            </div>
            <h3>{lang === 'ar' ? 'شبكة الوسطاء والشركاء' : 'Brokers Network'}</h3>
            <p>{lang === 'ar' ? 'انضم لشبكة ون لاين كشريك معتمد واستفد من نظام العمولات والحوافز الفورية.' : 'Join our certified broker network with top-tier commission structures.'}</p>
            <div className="card-arrow-link">
              <span>{lang === 'ar' ? 'انضم للشبكة' : 'Join Network'}</span>
              {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </div>
          </Link>

          {/* Private Vault Card */}
          <Link to="/vault" className="portal-action-card highlight-card">
            <div className="portal-icon-box bg-dark">
              <Lock size={24} />
            </div>
            <h3>{lang === 'ar' ? 'خزينة الفرص السرية' : 'Private Vault'}</h3>
            <p>{lang === 'ar' ? 'عقارات وصفقات خاصة جداً غير معروضة للعامة بأسعار أقل من السوق.' : 'Off-market private deals below market value accessible via secret code.'}</p>
            <div className="card-arrow-link">
              <span>{lang === 'ar' ? 'دخول الخزينة' : 'Unlock Vault'}</span>
              {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </div>
          </Link>
        </div>
      </section>

      {/* 🏢 3. FEATURED PROPERTIES SHOWCASE */}
      <section className="homepage-section bg-surface">
        <div className="section-header-flex">
          <div>
            <span className="section-pill">{lang === 'ar' ? 'عقارات مختارة' : 'Featured Listings'}</span>
            <h2>{lang === 'ar' ? 'أفضل العقارات المتاحة حالياً بسوهاج' : 'Top Available Properties in Sohag'}</h2>
          </div>
          <Link to="/properties" className="btn btn-outline">
            <span>{lang === 'ar' ? 'عرض جميع العقارات' : 'View All Properties'}</span>
            {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          </Link>
        </div>

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
      </section>

      {/* 📣 4. LIVE MARKET DEMANDS (طلبات السوق اللحظية) */}
      <section className="homepage-section">
        <div className="section-header-flex">
          <div>
            <span className="section-pill bg-live">{lang === 'ar' ? 'مباشر من المشترين' : 'Live Buyer Demands'}</span>
            <h2>{lang === 'ar' ? 'طلبات حقيقية تبحث عن عقارات الآن' : 'Active Buyer Requests Looking for Sellers'}</h2>
          </div>
          <Link to="/demands" className="btn btn-outline">
            <span>{lang === 'ar' ? 'عرض كل الطلبات (+20)' : 'All Demands'}</span>
            {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          </Link>
        </div>

        <div className="demands-grid-compact">
          {demands.slice(0, 4).map((dem) => (
            <div key={dem.id} className="demand-card-box">
              <div className="demand-top-row">
                <span className="demand-time-tag">{dem.timestamp}</span>
                <span className={`urgency-badge ${dem.urgency}`}>
                  {dem.urgency === 'high' ? (lang === 'ar' ? 'مستعجل كاش' : 'Urgent Cash') : (lang === 'ar' ? 'طلب جاد' : 'Serious Buyer')}
                </span>
              </div>
              <p className="demand-text">{lang === 'ar' ? dem.text_ar : dem.text_en}</p>
              <div className="demand-footer-row">
                <div className="demand-meta-item">
                  <MapPin size={13} className="text-primary" />
                  <span>{lang === 'ar' ? (dem.area_ar || dem.area) : (dem.area_en || dem.area)}</span>
                </div>
                <div className="demand-meta-item text-primary font-bold">
                  <DollarSign size={13} className="text-gold" />
                  <span>{(typeof dem.budget === 'number' ? dem.budget : parseInt(String(dem.budget).replace(/,/g, ''))).toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                </div>
                <Link to="/sell" className="btn-match-demand">
                  {lang === 'ar' ? 'عقاري يطابق هذا الطلب ←' : 'Match My Property →'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🏛️ 5. ABOUT ONE LINE & FOUNDER PROFILE (الشركة ورؤية المؤسس د. محمود الباز) */}
      <AboutFounderSection lang={lang} />

      {/* 🧮 6. LIVE FINANCING & ROI SIMULATOR (حاسبة التمويل والأقساط التفاعلية) */}
      <section className="homepage-section bg-surface" id="mortgage-calculator">
        <div className="section-header-centered" style={{ marginBottom: '28px' }}>
          <span className="section-pill">{lang === 'ar' ? 'أدوات الذكاء المالي' : 'PropTech Financial Simulator'}</span>
          <h2>{lang === 'ar' ? 'احسب أقساطك أو عوائد استثمارك فوراً' : 'Simulate Your Mortgage & Rental ROI'}</h2>
          <p className="section-subtitle" style={{ maxWidth: '640px', margin: '8px auto 0' }}>
            {lang === 'ar' 
              ? 'أداة حسابية تفاعلية دقيقة مبنية على معدلات الفائدة وأنظمة السداد المعتمدة في سوهاج ومصر'
              : 'Interactive financial simulator customized for mortgage plans and rental yield benchmarks'}
          </p>
        </div>

        <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
          <MortgageRoiCalculator lang={lang} />
        </div>
      </section>

      {/* 💬 7. TESTIMONIALS */}
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

      {/* ❓ 7. FAQS */}
      <section className="homepage-section bg-surface">
        <div className="section-header-centered">
          <span className="section-pill">{lang === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}</span>
          <h2>{lang === 'ar' ? 'إجابات على أهم تساؤلاتك' : 'Frequently Asked Questions'}</h2>
        </div>

        <div className="faq-accordion-container">
          {FAQS.map((faq, index) => (
            <div 
              key={index} 
              className={`faq-item ${openFaqIndex === index ? 'open' : ''}`}
            >
              <button
                type="button"
                className="faq-question-btn"
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
              >
                <span>{lang === 'ar' ? faq.q_ar : faq.q_en}</span>
                <span className="faq-toggle-icon">{openFaqIndex === index ? '−' : '+'}</span>
              </button>
              {openFaqIndex === index && (
                <div className="faq-answer-content">
                  <p>{lang === 'ar' ? faq.a_ar : faq.a_en}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
