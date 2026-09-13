import { useState, useEffect, useMemo, useRef } from 'react';
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
  Lock, 
  Filter, 
  Clock, 
  FileText,
  Home,
  Landmark,
  Pause,
  Play,
  Volume2,
  VolumeX
} from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';
import MarketTickerBar from '../components/home/MarketTickerBar';
import LifestyleCollectionsSection from '../components/home/LifestyleCollectionsSection';
import PrivateOfficeSection from '../components/home/PrivateOfficeSection';
import GoldStandardsSection from '../components/home/GoldStandardsSection';
import { PROPERTY_TYPES, PROPERTIES_DATA } from '../data/propertiesData';
import { MEGA_PROJECTS } from '../data/projectsData';
import { INITIAL_DEMANDS } from '../data/mockData';
import { getFounderSettings, DEFAULT_FOUNDER_CMS } from '../utils/founderCmsData';
import { getAreas } from '../utils/areasData';
import { updatePageSeo, buildOrganizationSchema } from '../utils/seoHelper';
import { parseSemanticQuery, SEMANTIC_SEARCH_PRESETS } from '../utils/semanticSearchEngine';

export default function HomePage({ 
  lang, 
  currency = 'EGP',
  properties, 
  demands = [], 
  favorites, 
  onToggleFavorite, 
  compareList = [],
  onToggleCompare,
  onQuickView,
  onOpenAddDemand,
  onAddNewLead,
  triggerToast
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

  // 🎬 Cinematic Hero Video State & Controls (Multi-clip Short Video Engine)
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [clipFade, setClipFade] = useState(false);
  const heroVideoRef = useRef(null);

  const heroClips = (founderSettings.heroVideoClips && founderSettings.heroVideoClips.length > 0)
    ? founderSettings.heroVideoClips
    : [{
        id: 'default',
        url: founderSettings.heroVideoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-modern-architecture-buildings-and-skyscrapers-41551-large.mp4',
        title_ar: 'واجهات وأبراج معمارية حديثة',
        title_en: 'Modern Architecture & Glass Towers'
      }];

  const currentClip = heroClips[activeClipIndex] || heroClips[0];
  const activeVideoUrl = currentClip?.url || founderSettings.heroVideoUrl;

  const toggleVideoPlayback = () => {
    if (!heroVideoRef.current) return;
    if (videoPlaying) {
      heroVideoRef.current.pause();
      setVideoPlaying(false);
    } else {
      heroVideoRef.current.play();
      setVideoPlaying(true);
    }
  };

  const toggleVideoMute = () => {
    if (!heroVideoRef.current) return;
    heroVideoRef.current.muted = !videoMuted;
    setVideoMuted(!videoMuted);
  };

  const switchClip = (newIndex) => {
    setClipFade(true);
    setTimeout(() => {
      setActiveClipIndex(newIndex);
      setClipFade(false);
    }, 400);
  };

  // Auto-cycle through short clips smoothly
  useEffect(() => {
    if (!founderSettings.heroVideoAutoCycle || heroClips.length <= 1 || !videoPlaying) return;

    const intervalMs = (founderSettings.heroVideoIntervalSec || 10) * 1000;
    const timer = setInterval(() => {
      setClipFade(true);
      setTimeout(() => {
        setActiveClipIndex((prev) => (prev + 1) % heroClips.length);
        setClipFade(false);
      }, 400);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [founderSettings.heroVideoAutoCycle, founderSettings.heroVideoIntervalSec, heroClips.length, videoPlaying]);

  const handleVideoEnded = () => {
    if (heroClips.length > 1) {
      switchClip((activeClipIndex + 1) % heroClips.length);
    }
  };

  useEffect(() => {
    const handleUpdate = () => setFounderSettings(getFounderSettings());
    const handleAreasUpdate = () => setDistricts(getAreas());
    window.addEventListener('oneline_founder_cms_updated', handleUpdate);
    window.addEventListener('oneline_areas_updated', handleAreasUpdate);
    
    // 🌐 Update Homepage SEO & Organization Schema
    updatePageSeo({
      title: lang === 'ar' ? 'المنصة العقارية الذكية بسوهاج' : 'Smart Real Estate in Sohag',
      description: lang === 'ar' 
        ? 'المنصة العقارية الأولى المعتمدة بسوهاج وسوهاج الجديدة برؤية د. محمود الباز. عقارات مفحوصة هندسياً وقانونياً 100%، طلبات كاش فورية، ومؤشرات السوق المعتمدة.'
        : 'Sohag premier verified real estate portal by Dr. Mahmoud Elbaz. 100% legally audited properties, cash buyer matching, and certified price benchmarks.',
      url: '/',
      type: 'website',
      schemaId: 'organization-jsonld-schema',
      schema: buildOrganizationSchema()
    });

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
  }, [lang]);

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
    const trimmed = searchKeyword.trim();
    
    if (trimmed !== '') {
      queryParams.set('q', trimmed);
      // Run deep semantic NLP extraction
      const parsed = parseSemanticQuery(trimmed);
      if (parsed.filters.area && searchArea === 'all') queryParams.set('area', parsed.filters.area);
      if (parsed.filters.type && searchType === 'all') queryParams.set('type', parsed.filters.type);
      if (parsed.filters.maxPrice && searchBudget === 'all') {
        if (parsed.filters.maxPrice <= 3000000) queryParams.set('budget', 'under_3m');
        else if (parsed.filters.maxPrice <= 6000000) queryParams.set('budget', '3m_to_6m');
        else queryParams.set('budget', 'above_6m');
      }
      if (parsed.filters.bedrooms) queryParams.set('bedrooms', String(parsed.filters.bedrooms));
    }

    if (searchArea !== 'all') queryParams.set('area', searchArea);
    if (searchType !== 'all') queryParams.set('type', searchType);
    if (searchBudget !== 'all') queryParams.set('budget', searchBudget);
    navigate(`/properties?${queryParams.toString()}`);
  };

  return (
    <div className="homepage-wrapper">
      {/* 🌟 1. HERO SECTION */}
      {/* 🌟 1. HERO SECTION (The Agency RE Cinematic Luxury Experience) */}
      <section className="hero-section-premium hero-cinematic-mode">
        {/* Cinematic Video Background Engine */}
        {founderSettings.heroVideoEnabled !== false ? (
          <div className="hero-cinematic-video-wrap" aria-hidden="true">
            <video
              ref={heroVideoRef}
              key={activeVideoUrl}
              autoPlay
              loop={heroClips.length <= 1}
              muted={videoMuted}
              playsInline
              onEnded={handleVideoEnded}
              poster={currentClip?.poster || founderSettings.heroPosterUrl || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=85'}
              className={`hero-cinematic-video ${clipFade ? 'clip-fading' : ''}`}
            >
              <source src={activeVideoUrl} type="video/mp4" />
            </video>
            <div 
              className="hero-video-overlay-gradient"
              style={{
                opacity: founderSettings.heroOverlayOpacity !== undefined ? founderSettings.heroOverlayOpacity : 0.65
              }}
            />
          </div>
        ) : (
          <>
            <div className="hero-ambient-mesh" aria-hidden="true">
              <div className="hero-orb hero-orb-1" />
              <div className="hero-orb hero-orb-2" />
              <div className="hero-orb hero-orb-3" />
            </div>
            <div className="hero-backdrop-gradient" />
          </>
        )}

        {/* Video Playback & Sound Control Badge */}
        {founderSettings.heroVideoEnabled !== false && (
          <div className="hero-video-controls-badge">
            <button
              type="button"
              className="hero-media-ctrl-btn"
              onClick={toggleVideoPlayback}
              title={videoPlaying ? (lang === 'ar' ? 'إيقاف الفيديو مؤقتاً' : 'Pause Video') : (lang === 'ar' ? 'تشغيل الفيديو' : 'Play Video')}
              aria-label="Toggle Video Playback"
            >
              {videoPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              type="button"
              className="hero-media-ctrl-btn"
              onClick={toggleVideoMute}
              title={videoMuted ? (lang === 'ar' ? 'تشغيل الصوت' : 'Unmute Sound') : (lang === 'ar' ? 'كتم الصوت' : 'Mute Sound')}
              aria-label="Toggle Video Sound"
            >
              {videoMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>

            {/* Short video clips playlist indicator & selector */}
            {heroClips.length > 1 && (
              <div className="hero-clips-switcher">
                <span className="hero-clip-title-label">
                  {lang === 'ar' ? (currentClip?.title_ar || `مقطع ${activeClipIndex + 1}`) : (currentClip?.title_en || `Clip ${activeClipIndex + 1}`)}
                </span>
                <div className="hero-clip-dots">
                  {heroClips.map((clip, idx) => (
                    <button
                      key={clip.id || idx}
                      type="button"
                      className={`hero-clip-dot ${idx === activeClipIndex ? 'active' : ''}`}
                      onClick={() => switchClip(idx)}
                      title={lang === 'ar' ? clip.title_ar : clip.title_en}
                      aria-label={`Switch to clip ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="hero-content-container">
          <div className="hero-badge">
            <span className="hero-badge-sparkle">
              <Sparkles size={14} />
            </span>
            <span>
              {lang === 'ar' 
                ? (founderSettings.heroBadge_ar || 'المنصة العقارية الأكثر موثوقية في سوهاج') 
                : (founderSettings.heroBadge_en || 'Sohag’s Most Trusted Real Estate Platform')}
            </span>
          </div>

          <h1 className="hero-main-title">
            {lang === 'ar' ? (
              <>
                <span className="hero-title-line">
                  {founderSettings.heroTitle_ar || 'امتلك واستثمر في أرقى عقارات سوهاج'}
                </span>
                <span className="hero-title-line hero-title-highlight hero-title-shimmer">
                  {founderSettings.heroHighlight_ar || 'بكل ثقة وضمان قانوني معتمد'}
                </span>
              </>
            ) : (
              <>
                <span className="hero-title-line">
                  {founderSettings.heroTitle_en || 'Own & Invest in Sohag’s Finest Properties'}
                </span>
                <span className="hero-title-line hero-title-highlight hero-title-shimmer">
                  {founderSettings.heroHighlight_en || 'With Full Confidence & Legal Security'}
                </span>
              </>
            )}
          </h1>

          <p className="hero-description">
            {lang === 'ar' 
              ? (founderSettings.heroSubtitle_ar || 'شقق سكنية فاخرة، مقرات تجارية وإدارية، وفيلات مستقلة مسجلة ومفحوصة قانونياً مع برامج تقسيط مرنة حتى 7 سنوات.') 
              : (founderSettings.heroSubtitle_en || 'Verified luxury apartments, retail shops, executive offices, and standalone villas with flexible financing up to 7 years.')}
          </p>

          {/* Smart Universal Search Bar */}
          <div className="hero-search-glassbox">
            <div className="hero-search-tabs">
              <button
                type="button"
                className={`hero-tab ${searchType === 'all' ? 'active' : ''}`}
                onClick={() => setSearchType('all')}
              >
                <Building size={14} />
                <span>{lang === 'ar' ? 'جميع العقارات' : 'All'}</span>
              </button>
              <button
                type="button"
                className={`hero-tab ${searchType === 'apartment' ? 'active' : ''}`}
                onClick={() => setSearchType('apartment')}
              >
                <Home size={14} />
                <span>{lang === 'ar' ? 'شقق وسكني' : 'Residential'}</span>
              </button>
              <button
                type="button"
                className={`hero-tab ${searchType === 'commercial' ? 'active' : ''}`}
                onClick={() => setSearchType('commercial')}
              >
                <Award size={14} />
                <span>{lang === 'ar' ? 'تجاري وإداري' : 'Commercial'}</span>
              </button>
              <button
                type="button"
                className={`hero-tab ${searchType === 'villa' ? 'active' : ''}`}
                onClick={() => setSearchType('villa')}
              >
                <Sparkles size={14} />
                <span>{lang === 'ar' ? 'فيلات ودوبلكس' : 'Villas'}</span>
              </button>
              <button
                type="button"
                className={`hero-tab ${searchType === 'land' ? 'active' : ''}`}
                onClick={() => setSearchType('land')}
              >
                <Landmark size={14} />
                <span>{lang === 'ar' ? 'أراضي' : 'Lands'}</span>
              </button>
            </div>

            <form onSubmit={handleHeroSearch} className="hero-search-inputs-row">
              {/* 1. Keyword Search */}
              <div className="search-field keyword-search-field">
                <label>
                  <Search size={14} />
                  <span>{lang === 'ar' ? 'البحث الذكي' : 'Search'}</span>
                </label>
                <div className="hero-input-relative">
                  <input
                    type="text"
                    placeholder={lang === 'ar' ? 'ابحث بالحي، اسم المشروع، أو كود العقار...' : 'Search by district, compound, or property ID...'}
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
                        <span>{lang === 'ar' ? 'أفضل النتائج والمقترحات' : 'Suggested Results'}</span>
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
                              <MapPin size={14} className="text-muted" />
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
                              <Building size={14} className="text-muted" />
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

              {/* 2. Location Select */}
              <div className="search-field">
                <label>
                  <MapPin size={14} />
                  <span>{lang === 'ar' ? 'المنطقة أو الحي' : 'Location'}</span>
                </label>
                <select value={searchArea} onChange={(e) => setSearchArea(e.target.value)}>
                  {districts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {lang === 'ar' ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Budget Range */}
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

              {/* 4. Submit Button */}
              <button type="submit" className="hero-search-btn">
                <Search size={18} />
                <span>{lang === 'ar' ? 'ابحث الآن' : 'Search'}</span>
              </button>
            </form>

            {/* Clean Quick Discovery Strip */}
            <div className="hero-quick-discovery-strip">
              <span className="discovery-label">
                {lang === 'ar' ? 'أبرز مناطق سوهاج:' : 'Top Locations:'}
              </span>
              <div className="discovery-chips-list">
                {[
                  { id: 'new_sohag', label_ar: 'سوهاج الجديدة', label_en: 'New Sohag' },
                  { id: 'east', label_ar: 'شرق سوهاج', label_en: 'East Sohag' },
                  { id: 'corniche', label_ar: 'الكورنيش', label_en: 'Corniche' },
                  { id: 'nasr', label_ar: 'مدينة ناصر', label_en: 'Nasr City' },
                  { id: 'center', label_ar: 'وسط البلد', label_en: 'City Center' }
                ].map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => {
                      setSearchArea(area.id);
                      navigate(`/properties?area=${area.id}`);
                    }}
                    className="discovery-chip"
                  >
                    <span>{lang === 'ar' ? area.label_ar : area.label_en}</span>
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
        </div>
      </section>

      {/* 📈 REAL-TIME SOHAG PROPTECH MARKET TICKER */}
      <MarketTickerBar lang={lang} />

      {/* 🌟 SOTHEBY'S BENCHMARK: CURATED LIFESTYLE COLLECTIONS */}
      <LifestyleCollectionsSection lang={lang} />

      {/* 🏢 2. SOHAG LIVE MARKETPLACE HUB (Consolidated Segmented Discovery) */}
      <section className="homepage-section bg-surface" id="marketplace-hub">
        <div className="section-header-flex" style={{ marginBottom: '22px' }}>
          <div>
            <div style={{ marginBottom: '8px' }}>
              <span className="section-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="live-pulse-dot" />
                {lang === 'ar' ? 'سوق سوهاج العقاري المعتمد' : 'Verified Sohag Marketplace'}
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
                    currency={currency}
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
                <Link to="/special-requests" className="btn btn-glass-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontSize: '0.88rem' }}>
                  <FileText size={15} style={{ color: '#ffca28' }} />
                  <span>{lang === 'ar' ? 'طلب توفير عقار خاص VIP' : 'Bespoke Request VIP'}</span>
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
                <div className="metric-icon" style={{ background: 'rgba(255, 202, 40, 0.16)', color: 'var(--brand-gold-warm, #f59e0b)' }}>
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
                  <p className="demand-text" style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{lang === 'ar' ? dem.text_ar : dem.text_en}</p>
                  <div className="demand-footer-clean">
                    <div className="demand-meta-specs-row">
                      <div className="demand-meta-item">
                        <MapPin size={14} style={{ color: 'var(--brand-navy-light, #0284c7)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '800' }}>{lang === 'ar' ? (dem.area_ar || dem.area) : (dem.area_en || dem.area)}</span>
                      </div>
                      <div className="demand-meta-item">
                        <DollarSign size={14} className="text-gold" />
                        <span style={{ color: 'var(--brand-gold-warm, #f59e0b)', fontWeight: '900', fontSize: '0.94rem' }}>
                          {(typeof dem.budget === 'number' ? dem.budget : parseInt(String(dem.budget).replace(/,/g, ''))).toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                    </div>
                    <Link 
                      to="/sell" 
                      className="btn-match-demand-full"
                    >
                      <span>{lang === 'ar' ? 'عقاري يطابق هذا الطلب' : 'Match My Property'}</span>
                      <span className="btn-match-arrow">{lang === 'ar' ? '←' : '→'}</span>
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
                  <Sparkles size={15} className="text-gold" />
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

      {/* 🛡️ THE 4 1LINE GOLDEN STANDARDS OF INSTITUTIONAL TRUST */}
      <GoldStandardsSection lang={lang} />

      {/* 🔒 SOTHEBY'S BENCHMARK: 1LINE PRIVATE OFFICE (OFF-MARKET POCKET LISTINGS) */}
      <PrivateOfficeSection lang={lang} />

      {/* 🌟 6. EXECUTIVE VIP CONSULTATION CTA STRIP (Architectural Royal Navy & Sun Gold) */}
      <section className="homepage-section" style={{ padding: '30px 20px 70px' }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          background: 'linear-gradient(135deg, #092347 0%, #0d48a1 60%, #08214d 100%)',
          borderRadius: '28px',
          padding: '48px 44px',
          border: '1px solid rgba(255, 202, 40, 0.35)',
          boxShadow: '0 20px 50px rgba(9, 35, 71, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '26px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Ambient Warm Sun-Gold Nebula */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 202, 40, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div style={{ maxWidth: '680px', position: 'relative', zIndex: 2 }}>
            <span style={{
              background: 'rgba(255, 202, 40, 0.14)',
              border: '1px solid rgba(255, 202, 40, 0.45)',
              color: '#ffca28',
              fontSize: '0.82rem',
              fontWeight: '800',
              padding: '6px 18px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '14px'
            }}>
              <Sparkles size={13} style={{ color: '#ffca28' }} />
              <span>{lang === 'ar' ? 'استشارة عقارية وقانونية معتمدة' : 'Certified Advisory & Legal Security'}</span>
            </span>
            <h2 style={{ fontSize: '1.9rem', color: '#ffffff', fontWeight: '900', margin: '0 0 10px 0', lineHeight: 1.3 }}>
              {lang === 'ar' ? 'جاهز لتملك عقارك المثالي أو استثمارك القادم بسوهاج؟' : 'Ready to Secure Your Ideal Property in Sohag?'}
            </h2>
            <p style={{ color: '#e0f2fe', fontSize: '0.95rem', margin: 0, lineHeight: 1.65, fontWeight: '500' }}>
              {lang === 'ar' 
                ? 'فريق خبراء ومستشاري 1Line جاهز لمساعدتك في فحص صحة الأوراق والتراخيص، التفاوض، واختيار العقار الأنسب لاحتياجك وميزانيتك مجاناً.' 
                : 'Our certified real estate advisors are ready to guide you through legal vetting, price negotiation, and financing.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
            <Link
              to="/buy"
              className="btn btn-white-navy"
              style={{
                background: '#ffffff',
                color: '#092347',
                fontWeight: '900',
                padding: '14px 28px',
                borderRadius: '14px',
                border: 'none',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.95rem'
              }}
            >
              <span style={{ color: '#092347', fontWeight: '900' }}>{lang === 'ar' ? 'ابدأ معالج الشراء الآن' : 'Start Buy Wizard'}</span>
              {lang === 'ar' ? <ArrowLeft size={16} style={{ color: '#092347' }} /> : <ArrowRight size={16} style={{ color: '#092347' }} />}
            </Link>

            <Link
              to="/sell"
              className="btn btn-glass-outline"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.65)',
                background: 'rgba(255, 255, 255, 0.14)',
                color: '#ffffff',
                fontWeight: '700',
                padding: '14px 24px',
                borderRadius: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.95rem'
              }}
            >
              <span style={{ color: '#ffffff' }}>{lang === 'ar' ? 'اعرض عقارك للبيع' : 'List Property'}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
