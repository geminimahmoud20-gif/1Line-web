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
  Home,
  Landmark,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Zap,
  MessageSquare,
  Eye,
  X
} from 'lucide-react';
import PropertyCard from '../components/properties/PropertyCard';
import MarketTickerBar from '../components/home/MarketTickerBar';
import LifestyleCollectionsSection from '../components/home/LifestyleCollectionsSection';
import PrivateOfficeSection from '../components/home/PrivateOfficeSection';
import GoldStandardsSection from '../components/home/GoldStandardsSection';
import { PROPERTY_TYPES, PROPERTIES_DATA } from '../data/propertiesData';
import { MEGA_PROJECTS } from '../data/projectsData';
import { INITIAL_DEMANDS } from '../data/mockData';
import { getFounderSettings, DEFAULT_FOUNDER_CMS, getWhatsAppUrl } from '../utils/founderCmsData';
import { getAreas } from '../utils/areasData';
import { updatePageSeo, buildOrganizationSchema } from '../utils/seoHelper';
import FaqSection from '../components/home/FaqSection';
import { parseSemanticQuery, SEMANTIC_SEARCH_PRESETS } from '../utils/semanticSearchEngine';
import ScrollReveal from '../components/common/ScrollReveal';
import { SELLER_PROOF } from '../config/siteConfig';
import { getHomepageSlots } from '../utils/featuredSlots';
import { useAdCampaigns, pickHeroCampaign, getInlineCampaigns } from '../utils/adCampaigns';
import { HeroSponsorChip, SponsoredStrip } from '../components/home/SponsoredPlacements';

// Keep in sync with the <link rel="preload"> in index.html
const HERO_POSTER_DEFAULT = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=70';

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
  const [searchPurpose, setSearchPurpose] = useState('buy'); // 'buy' | 'sell' | 'invest'
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchArea, setSearchArea] = useState('all');
  const [searchType, setSearchType] = useState('all');
  const [searchBudget, setSearchBudget] = useState('all');
  const [districts, setDistricts] = useState(() => getAreas());

  // Dynamic Corporate & Hero Stats Settings from CMS
  const [founderSettings, setFounderSettings] = useState(() => getFounderSettings());

  // 🎬 Cinematic Hero Video State & Controls (Multi-clip Short Video Engine)
  const isDataSaver = typeof navigator !== 'undefined' && navigator.connection
    ? (navigator.connection.saveData === true || ['slow-2g', '2g'].includes(navigator.connection.effectiveType))
    : false;

  const isReducedMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const [videoPlaying, setVideoPlaying] = useState(!isDataSaver && !isReducedMotion);
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

  // Paid placements managed from CRM → الإعلانات (scheduled, labelled "مُموَّل")
  const { campaigns: adCampaigns, now: adNow } = useAdCampaigns();
  const heroAd = useMemo(() => pickHeroCampaign(adCampaigns, adNow), [adCampaigns, adNow]);
  const inlineAds = useMemo(() => getInlineCampaigns(adCampaigns, adNow), [adCampaigns, adNow]);
  const showHeroVideo = !heroAd && founderSettings.heroVideoEnabled !== false;

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

    // Pause auto-cycle on mobile devices, slow networks, or when user prefers reduced motion
    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth <= 768;
    if (isMobileDevice || isReducedMotion) return;

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
      title: lang === 'ar' ? 'وساطة واستشارات عقارية في سوهاج والقاهرة الكبرى' : 'Real Estate Brokerage & Advisory in Sohag and Greater Cairo',
      description: lang === 'ar'
        ? 'ون لاين للاستشارات والتسويق العقاري: بيع وشراء وتقييم الأراضي والوحدات عالية القيمة في سوهاج والقاهرة الكبرى، مع مراجعة قانونية للمستندات قبل التعاقد، بإشراف د. محمود الباز.'
        : '1Line Solutions: buying, selling and valuing high-value land and property in Sohag and Greater Cairo, with legal document review before contract, led by Dr. Mahmoud Elbaz.',
      url: '/',
      type: 'website',
      schemaId: 'org-schema',
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

  // Longest installment plan actually on offer — the discovery pill quotes it instead of a fixed number
  const maxInstallmentYears = useMemo(
    () => activePublished.reduce((max, p) => (Number(p.monthlyInstallment) > 0 ? Math.max(max, Number(p.installmentYears) || 0) : max), 0),
    [activePublished]
  );

  // Homepage slots: scheduled/ordered featured listings from the CRM first, then newest listings
  const displayProperties = useMemo(
    () => getHomepageSlots(filteredMarketplaceProps).map((s) => s.property),
    [filteredMarketplaceProps]
  );

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

    // 📡 Telemetry event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oneline_search_started', {
        detail: { keyword: trimmed, area: searchArea, type: searchType, budget: searchBudget }
      }));
    }

    navigate(`/properties?${queryParams.toString()}`);
  };

  return (
    <div className="homepage-wrapper">
      {/* 🌟 1. HERO SECTION */}
      {/* 🌟 1. HERO SECTION (The Agency RE Cinematic Luxury Experience) */}
      <section className="hx-hero" aria-label={lang === 'ar' ? 'البحث عن عقار' : 'Property search'}>
        {/* Cinematic Video Background Engine */}
        {showHeroVideo ? (
          <div className="hero-cinematic-video-wrap" aria-hidden="true">
            <video
              ref={heroVideoRef}
              key={activeVideoUrl}
              autoPlay
              preload="metadata"
              loop={heroClips.length <= 1}
              muted={videoMuted}
              playsInline
              onEnded={handleVideoEnded}
              poster={currentClip?.poster || founderSettings.heroPosterUrl || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=85'}
              className={`hero-cinematic-video ${clipFade ? 'clip-fading' : ''}`}
            >
              <source src={activeVideoUrl} type="video/mp4" />
            </video>
            <div 
              className="hx-vignette"
              style={{
                opacity: founderSettings.heroOverlayOpacity !== undefined ? founderSettings.heroOverlayOpacity : 0.58
              }}
            />
          </div>
        ) : (
          <div className="hero-cinematic-video-wrap" aria-hidden="true">
            {(() => {
              // LCP image: phones get a 640/960px file instead of the 1600px one.
              // index.html preloads the default poster with the same srcset.
              // An active hero campaign (CRM → الإعلانات) replaces the poster; headline and search stay ours
              const src = heroAd?.imageDesktop || founderSettings.heroPosterUrl || HERO_POSTER_DEFAULT;
              const sized = (w) => src.replace(/([?&])w=\d+/, `$1w=${w}`);
              // Campaign images are served as uploaded (index.html preloads that exact URL)
              const srcSet = !heroAd && /images\.unsplash\.com/.test(src) && /[?&]w=\d+/.test(src)
                ? `${sized(640)} 640w, ${sized(960)} 960w, ${sized(1600)} 1600w`
                : undefined;
              return (
                <picture>
                  {heroAd?.imageMobile && <source media="(max-width: 700px)" srcSet={heroAd.imageMobile} />}
                  <img
                    src={src}
                    srcSet={srcSet}
                    sizes="100vw"
                    alt=""
                    className="hero-cinematic-video"
                    fetchPriority="high"
                    width="1600"
                    height="1067"
                  />
                </picture>
              );
            })()}
            <div
              className="hx-vignette"
              style={{
                opacity: founderSettings.heroOverlayOpacity !== undefined ? founderSettings.heroOverlayOpacity : 0.58
              }}
            />
          </div>
        )}

        {/* Video Playback & Sound Control Badge */}
        {showHeroVideo && (
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
                    >
                      {idx === activeClipIndex && videoPlaying && founderSettings.heroVideoAutoCycle !== false && (
                        <span 
                          key={`progress-${activeClipIndex}-${videoPlaying}`}
                          className="hero-clip-progress-fill"
                          style={{
                            animationDuration: `${founderSettings.heroVideoIntervalSec || 10}s`
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Subtle Data Saver indicator when active */}
            {isDataSaver && !videoPlaying && (
              <span 
                className="hero-data-saver-indicator" 
                title={lang === 'ar' ? 'وضع توفير البيانات مفعّل - انقر زر التشغيل لبدء الفيديو' : 'Data saver active - Click play to stream video'}
              >
                <Zap size={11} className="text-gold" />
                <span>{lang === 'ar' ? 'توفير بيانات' : 'Data Saver'}</span>
              </span>
            )}
          </div>
        )}

        <div className="hx-hero-inner">
          <p className="hx-eyebrow">
            <span dir="ltr">1LINE REAL ESTATE SOLUTIONS</span>
            <i aria-hidden="true" />
            <span>{lang === 'ar' ? 'سوهاج • القاهرة الكبرى' : 'SOHAG • GREATER CAIRO'}</span>
          </p>

          <h1 className="hx-title">
            {lang === 'ar' ? (
              <>
                <span>العقار ليس مجرد مساحة..</span>
                {/* Fixed break on phones: the fallback font and IBM Plex wrap this line differently,
                    which shifted the search capsule 40px when the web font arrived (CLS 0.26). */}
                <span>بل <em>قيمة</em> تُبنى <span className="hx-title-break">على <em>قرار</em> صحيح.</span></span>
              </>
            ) : (
              <>
                <span>Real estate is more than space.</span>
                <span>It is <em>value</em> built on the right <em>decision</em>.</span>
              </>
            )}
          </h1>

          <p className="hx-lede">
            {lang === 'ar' ? (
              <>
                <span>وساطة واستشارات للأصول العقارية عالية القيمة في سوهاج والقاهرة الكبرى.</span>
                <span>مراجعة المستندات قبل العرض، تسعير بمقارنات حقيقية، وإدارة الصفقة بسرية تامة.</span>
              </>
            ) : (
              <>
                <span>Brokerage and advisory for high-value property in Sohag and Greater Cairo.</span>
                <span>Documents reviewed before listing, pricing from real comparables, discreet deal management.</span>
              </>
            )}
          </p>

          {/* Floating search capsule: intent tabs + hairline-divided fields */}
          <div className="hx-capsule" role="search">
            <div className="hx-intents" role="tablist" aria-label={lang === 'ar' ? 'ماذا تريد؟' : 'What are you looking for?'}>
              {[
                { id: 'buy', icon: Home, ar: 'شراء وحدات', en: 'Buy' },
                { id: 'sell', icon: Building, ar: 'بيع عقارك', en: 'Sell' },
                { id: 'invest', icon: TrendingUp, ar: 'استثمار وتجاري', en: 'Invest' }
              ].map(({ id, icon: Icon, ar, en }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={searchPurpose === id}
                  className={`hx-intent ${searchPurpose === id ? 'is-active' : ''}`}
                  onClick={() => {
                    setSearchPurpose(id);
                    if (id === 'invest' && !['all', 'commercial', 'office', 'land'].includes(searchType)) setSearchType('all');
                  }}
                >
                  <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                  <span>{lang === 'ar' ? ar : en}</span>
                </button>
              ))}
            </div>

            {searchPurpose === 'sell' ? (
              <div className="hx-capsule-row hx-capsule-row--sell" role="tabpanel">
                <div className="hx-sell-copy">
                  <strong>{lang === 'ar' ? 'اعرف القيمة العادلة لعقارك قبل أن تعرضه' : 'Know your fair price before you list'}</strong>
                  <span>{lang === 'ar' ? 'تقييم من صفقات فعلية في منطقتك، ومراجعة للمستندات — بدون أي التزام وبدون عمولة على البائع.' : 'Priced from real deals nearby, documents reviewed — no obligation, no seller commission.'}</span>
                </div>
                <Link to="/valuation" className="hx-go hx-go--wide">
                  <Calculator size={17} strokeWidth={1.75} aria-hidden="true" />
                  <span>{lang === 'ar' ? 'احسب القيمة العادلة' : 'Get a valuation'}</span>
                </Link>
                <Link to="/sell" className="hx-go-ghost">
                  {lang === 'ar' ? 'اعرض عقارك للبيع' : 'List your property'}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleHeroSearch} className="hx-capsule-row" role="tabpanel">
                <div className="hx-field hx-field--keyword">
                  <span className="hx-field-label" id="hx-kw-label">{lang === 'ar' ? 'البحث الذكي' : 'Smart search'}</span>
                  <div className="hero-input-relative">
                    <input
                      type="text"
                      aria-labelledby="hx-kw-label"
                      placeholder={lang === 'ar' ? 'مثال: شقة 3 غرف في الكوثر تحت 3 مليون' : 'e.g. 3-bed apartment in El Kawthar under 3M'}
                      value={searchKeyword}
                      onChange={(e) => {
                        setSearchKeyword(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setShowSuggestions(false); }}
                    />
                    {searchKeyword.length > 0 && (
                      <button
                        type="button"
                        className="hero-clear-input-btn"
                        onClick={() => {
                          setSearchKeyword('');
                          setShowSuggestions(false);
                        }}
                        aria-label={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                      >
                        <X size={13} />
                      </button>
                    )}

                    {/* Multi-Category Omnibox Live Dropdown */}
                    {showSuggestions && searchKeyword.trim().length > 0 && (
                      <div className="hero-live-suggestions-dropdown">
                        <div className="suggestions-header">
                          <span>{lang === 'ar' ? 'أفضل النتائج والمقترحات' : 'Suggested Results'}</span>
                          <button type="button" className="close-sug-btn" onClick={() => setShowSuggestions(false)} aria-label={lang === 'ar' ? 'إغلاق المقترحات' : 'Close suggestions'}>
                            <X size={13} />
                          </button>
                        </div>

                        {matchingDistricts.length > 0 && (
                          <div className="omnibox-section">
                            <div className="omnibox-sec-title">
                              <MapPin size={12} className="text-gold" />
                              <span>{lang === 'ar' ? 'الأحياء والمناطق' : 'Districts & Areas'}</span>
                            </div>
                            {matchingDistricts.map(area => (
                              <button
                                type="button"
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
                              </button>
                            ))}
                          </div>
                        )}

                        {matchingProjects.length > 0 && (
                          <div className="omnibox-section">
                            <div className="omnibox-sec-title">
                              <Building size={12} className="text-gold" />
                              <span>{lang === 'ar' ? 'المشروعات والكمبوندات' : 'Mega Projects & Compounds'}</span>
                            </div>
                            {matchingProjects.map(proj => (
                              <Link key={proj.id} to="/projects" className="omnibox-item-row" onClick={() => setShowSuggestions(false)}>
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

                        {matchingProperties.length > 0 ? (
                          <div className="omnibox-section">
                            <div className="omnibox-sec-title">
                              <Sparkles size={12} className="text-gold" />
                              <span>{lang === 'ar' ? 'العقارات المطابقة مباشرة' : 'Matching Listings'}</span>
                            </div>
                            <div className="suggestions-list">
                              {matchingProperties.map((p) => (
                                <Link key={p.id} to={`/properties/${p.id}`} className="sug-item-row" onClick={() => setShowSuggestions(false)}>
                                  <img src={p.images?.[0]} alt="" className="sug-thumb" loading="lazy" />
                                  <div className="sug-info">
                                    <span className="sug-title">{lang === 'ar' ? p.title_ar : p.title_en}</span>
                                    <span className="sug-meta">{p.size} {lang === 'ar' ? 'م²' : 'sqm'} • {(Number(p.price) || 0).toLocaleString()} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ) : (
                          matchingDistricts.length === 0 && matchingProjects.length === 0 && (
                            <div className="sug-empty">{lang === 'ar' ? 'اضغط بحث للبحث الذكي بهذه الكلمات' : 'Press search to run a smart search'}</div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <label className="hx-field">
                  <span className="hx-field-label">{lang === 'ar' ? 'المنطقة' : 'Area'}</span>
                  <select value={searchArea} onChange={(e) => setSearchArea(e.target.value)} aria-label={lang === 'ar' ? 'المنطقة' : 'Area'}>
                    {districts.map((a) => (
                      <option key={a.id} value={a.id}>{lang === 'ar' ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}</option>
                    ))}
                  </select>
                </label>

                <label className="hx-field">
                  <span className="hx-field-label">{lang === 'ar' ? 'نوع العقار' : 'Type'}</span>
                  <select value={searchType} onChange={(e) => setSearchType(e.target.value)} aria-label={lang === 'ar' ? 'نوع العقار' : 'Property type'}>
                    {PROPERTY_TYPES
                      .filter((t) => searchPurpose !== 'invest' || ['all', 'commercial', 'office', 'land'].includes(t.id))
                      .map((t) => (
                        <option key={t.id} value={t.id}>{lang === 'ar' ? t.name_ar : t.name_en}</option>
                      ))}
                  </select>
                </label>

                <label className="hx-field">
                  <span className="hx-field-label">{lang === 'ar' ? 'الميزانية' : 'Budget'}</span>
                  <select value={searchBudget} onChange={(e) => setSearchBudget(e.target.value)} aria-label={lang === 'ar' ? 'الميزانية' : 'Budget'}>
                    <option value="all">{lang === 'ar' ? 'أي ميزانية' : 'Any budget'}</option>
                    <option value="under_3m">{lang === 'ar' ? 'أقل من 3 مليون' : 'Under 3M EGP'}</option>
                    <option value="3m_to_6m">{lang === 'ar' ? '3 – 6 مليون' : '3M – 6M EGP'}</option>
                    <option value="above_6m">{lang === 'ar' ? 'أكثر من 6 مليون' : 'Above 6M EGP'}</option>
                  </select>
                </label>

                <button type="submit" className="hx-go" aria-label={lang === 'ar' ? 'ابحث' : 'Search'}>
                  <Search size={19} strokeWidth={1.75} aria-hidden="true" />
                  <span className="hx-go-text">{lang === 'ar' ? 'ابحث' : 'Search'}</span>
                </button>
              </form>
            )}
          </div>

          {/* One-tap discovery pills — each maps to a filter the listings page actually supports */}
          <nav className="hx-pills" aria-label={lang === 'ar' ? 'اختصارات البحث' : 'Quick searches'}>
            {[
              { ar: 'سوهاج الجديدة', en: 'New Sohag', to: '/properties?area=new_sohag', icon: MapPin },
              { ar: 'شارع الجمهورية', en: 'El-Gomhoreya St.', to: `/properties?q=${encodeURIComponent('الجمهورية')}`, icon: Landmark },
              { ar: 'كاش فوري', en: 'Cash deals', to: '/properties?paymentPlan=cash', icon: Zap },
              {
                ar: maxInstallmentYears ? `تقسيط حتى ${maxInstallmentYears} سنوات` : 'تقسيط مباشر',
                en: maxInstallmentYears ? `Up to ${maxInstallmentYears}-yr installments` : 'Installments',
                to: '/properties?paymentPlan=installments',
                icon: Clock
              },
              { ar: 'محلات تجارية', en: 'Retail shops', to: '/properties?type=commercial', icon: Building }
            ].map(({ ar, en, to, icon: Icon }) => (
              <Link key={to} to={to} className="hx-pill">
                <Icon size={13} strokeWidth={1.75} aria-hidden="true" />
                <span>{lang === 'ar' ? ar : en}</span>
              </Link>
            ))}
          </nav>

          <HeroSponsorChip campaign={heroAd} lang={lang} />
        </div>
      </section>

      {/* 📈 REAL-TIME SOHAG PROPTECH MARKET TICKER */}
      <MarketTickerBar lang={lang} demands={activeDemandsList} />

      {/* 🌟 SOTHEBY'S BENCHMARK: CURATED LIFESTYLE COLLECTIONS */}
      <ScrollReveal>
        <LifestyleCollectionsSection lang={lang} />
      </ScrollReveal>

      {/* 🏢 2. SOHAG LIVE MARKETPLACE HUB (Consolidated Segmented Discovery) */}
      <section className="homepage-section bg-surface" id="marketplace-hub">
        <ScrollReveal>
          <div className="section-header-flex mb-6">
            <div>
              <div className="mb-2">
                <span className="section-pill-tag">
                  <span className="live-pulse-dot" />
                  {lang === 'ar' ? 'سوق سوهاج العقاري المعتمد' : 'Verified Sohag Marketplace'}
                </span>
              </div>
              <h2 className="section-heading-primary m-0">
                {lang === 'ar' ? 'أحدث العقارات والطلبات الاستثمارية الحية' : 'Featured Properties & Live Demands'}
              </h2>
              <p className="section-heading-desc mt-2 mb-0" style={{ marginInline: 0 }}>
                {lang === 'ar' ? 'تصفح أحدث الوحدات المفحوصة هندسياً وقانونياً أو طابق عقارك مع مشتري الكاش الجاهزين فوراً' : 'Certified properties & instant matching with serious cash buyers in Sohag'}
              </p>
            </div>

          {/* Interactive Switcher Tabs (Ultra High Contrast Navy & Gold) */}
          <div className="hx-seg" role="tablist" aria-label={lang === 'ar' ? 'نوع العرض' : 'Listing view'}>
            {[
              { id: 'properties', icon: Building, ar: 'العقارات المعروضة', en: 'Properties', count: activePublished.length },
              { id: 'demands', icon: Users, ar: 'طلبات المشترين الكاش', en: 'Cash buyer demands', count: activeDemandsList.length }
            ].map(({ id, icon: Icon, ar, en, count }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={marketplaceTab === id}
                onClick={() => setMarketplaceTab(id)}
                className={`hx-seg-btn ${marketplaceTab === id ? 'is-active' : ''}`}
              >
                <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                <span>{lang === 'ar' ? ar : en}</span>
                <span className="hx-seg-count"><span className="hx-live-dot" aria-hidden="true" />{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Properties */}
        {marketplaceTab === 'properties' && (
          <div>
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
                    {lang === 'ar' ? 'بدء معالج الشراء وتوفير عقار' : 'Start Buy Wizard'}
                  </Link>
                  <button type="button" className="btn btn-outline" onClick={() => setMarketplaceAreaFilter('all')}>
                    {lang === 'ar' ? 'استعراض كل المناطق' : 'Reset to All Districts'}
                  </button>
                </div>
              </div>
            )}

            {/* Clean, Refined Navigation Action */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '28px' }}>
              <Link to="/properties" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontWeight: 'bold' }}>
                <span>{lang === 'ar' ? `استعراض كل العقارات المتاحة (${activePublished.length} عقار)` : `Explore All Properties (${activePublished.length})`}</span>
                {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>
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

              {/* Figures below are computed from published demands — no fixed marketing numbers */}
              <div className="demand-metric-card">
                <div className="metric-icon" style={{ background: 'rgba(169, 130, 74, 0.14)', color: 'var(--gold-dark, #7C5E30)' }}>
                  <Users size={20} />
                </div>
                <div className="metric-info">
                  <span>{lang === 'ar' ? 'طلبات شراء منشورة الآن' : 'Published buyer demands'}</span>
                  <strong>{activeDemandsList.length} {lang === 'ar' ? 'طلب' : 'demands'}</strong>
                </div>
              </div>

              <div className="demand-metric-card">
                <div className="metric-icon" style={{ background: 'rgba(13, 72, 161, 0.12)', color: '#0d48a1' }}>
                  <ShieldCheck size={20} />
                </div>
                <div className="metric-info">
                  <span>{lang === 'ar' ? 'مراجعة قبل النشر' : 'Reviewed before publishing'}</span>
                  <strong>{lang === 'ar' ? 'كل طلب يراجعه فريقنا' : 'Every demand is vetted'}</strong>
                </div>
              </div>
            </div>

            <div className="demands-grid-compact">
              {activeDemandsList.slice(0, 4).map((dem) => (
                <div 
                  key={dem.id} 
                  className="demand-card-box titanium-card"
                  onClick={() => navigate('/demands')}
                  style={{ cursor: 'pointer' }}
                  title={lang === 'ar' ? 'انقر للانتقال إلى بوابة طلبات المشترين' : 'Click to view in Demands Portal'}
                >
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
                      {dem.urgency === 'high' ? (lang === 'ar' ? 'مستعجل كاش' : 'Urgent Cash') : (lang === 'ar' ? 'طلب جاد' : 'Serious Buyer')}
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
                      onClick={(e) => e.stopPropagation()}
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
                  <span>{lang === 'ar' ? 'أضف طلبك العقاري مجاناً' : 'Post Buyer Request'}</span>
                </button>
              )}
              <Link to="/demands" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{lang === 'ar' ? `استعراض كل طلبات المشترين (${activeDemandsList.length})` : 'All Demands'}</span>
                {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>
            </div>
          </div>
        )}
        </ScrollReveal>
      </section>

      {/* 📢 Sponsored banners (CRM → الإعلانات, placement "inline"); renders nothing when no campaign is live */}
      <SponsoredStrip campaigns={inlineAds} lang={lang} />

      {/* 🏡 3. SELLER INVITATION SECTION (Architectural Editorial Contrast) */}
      <ScrollReveal>
        <section className="hx-seller" aria-labelledby="hx-seller-title">
          <div className="hx-seller-copy">
            <span className="hx-kicker hx-kicker--dark">
              {lang === 'ar' ? 'لأصحاب العقارات وإدارة الأصول' : 'Owners & asset advisory'}
            </span>
            <h2 id="hx-seller-title">
              {lang === 'ar' ? (
                <>اعرض عقارك أمام <em>نخبة المستثمرين الجادين</em></>
              ) : (
                <>Present your property to <em>serious, qualified investors</em></>
              )}
            </h2>
            <p>
              {lang === 'ar'
                ? `مع تدقيق قانوني يحمي صفقتك${SELLER_PROOF.sellerCommissionPct === 0 ? '، وبدون أي عمولة على البائع' : ''}. نسعّر عقارك بمقارنات فعلية ونطابقه مع طلبات شراء مسجلة لدينا.`
                : `With legal due diligence that protects your deal${SELLER_PROOF.sellerCommissionPct === 0 ? ' — and no seller commission' : ''}. We price from real comparables and match against registered buyer demands.`}
            </p>

            {/* Proof points: live counts or owner-confirmed facts only (config/siteConfig.js → SELLER_PROOF) */}
            <dl className="hx-proof">
              {activeDemandsList.length > 0 && (
                <div>
                  <dt><bdi>{activeDemandsList.length}</bdi></dt>
                  <dd>{lang === 'ar' ? 'طلب شراء منشور من مشترين مسجلين الآن' : 'published demands from registered buyers'}</dd>
                </div>
              )}
              {SELLER_PROOF.avgDaysToClose && (
                <div>
                  <dt><bdi>{SELLER_PROOF.avgDaysToClose}</bdi> {lang === 'ar' ? 'يوماً' : 'days'}</dt>
                  <dd>{lang === 'ar' ? 'متوسط إتمام الصفقات المسعّرة بدقة' : 'average time to close accurately priced deals'}</dd>
                </div>
              )}
              {SELLER_PROOF.sellerCommissionPct !== null && SELLER_PROOF.sellerCommissionPct !== undefined && (
                <div>
                  <dt><bdi>{SELLER_PROOF.sellerCommissionPct}%</bdi></dt>
                  <dd>{lang === 'ar' ? 'عمولة تسويق أو وساطة على البائع' : 'marketing or brokerage fee to the seller'}</dd>
                </div>
              )}
            </dl>

            <div className="hx-seller-actions">
              <Link to="/valuation" className="hx-btn hx-btn--gold">
                <Calculator size={17} strokeWidth={1.75} aria-hidden="true" />
                <span>{lang === 'ar' ? 'احسب القيمة العادلة لعقارك الآن' : 'Calculate your fair value now'}</span>
              </Link>
              <Link to="/demands" className="hx-btn hx-btn--line">
                <span>{lang === 'ar' ? 'تصفح طلبات المشترين' : 'Browse buyer demands'}</span>
                {lang === 'ar' ? <ArrowLeft size={16} strokeWidth={1.75} /> : <ArrowRight size={16} strokeWidth={1.75} />}
              </Link>
            </div>
          </div>
          <div className="hx-seller-media">
            <img
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=70"
              alt={lang === 'ar' ? 'فيلا حديثة معروضة للبيع عبر 1Line' : 'Modern villa listed with 1Line'}
              loading="lazy"
              decoding="async"
              width="1200"
              height="800"
            />
          </div>
        </section>
      </ScrollReveal>

      {/* 🛡️ THE 4 1LINE GOLDEN STANDARDS OF INSTITUTIONAL TRUST */}
      <ScrollReveal>
        <GoldStandardsSection lang={lang} />
      </ScrollReveal>

      {/* 🔒 SOTHEBY'S BENCHMARK: 1LINE PRIVATE OFFICE (OFF-MARKET POCKET LISTINGS) */}
      <ScrollReveal>
        <PrivateOfficeSection lang={lang} />
      </ScrollReveal>

      {/* 🏛️ 6. EXECUTIVE CONSULTATION (Deep Navy Brand Authority Surface) */}
      <ScrollReveal>
        <section className="homepage-section consultation-authority-section">
          <div className="consultation-navy-surface">
            <div className="consultation-content-wrap">
              <span className="consultation-pill-eyebrow">
                {lang === 'ar' ? 'الاستشارة الاستراتيجية والتدقيق' : 'Strategic Advisory & Due Diligence'}
              </span>
              <h2 className="consultation-main-statement">
                {lang === 'ar' ? 'قرارك العقاري يستحق أكثر من مجرد إعلان.' : 'Your Real Estate Decision Deserves More Than Just An Ad.'}
              </h2>
              <p className="consultation-sub-statement">
                {lang === 'ar' 
                  ? 'سواء كنت تبيع أرضاً، أو تشتري مسكن العائلة، أو تستثمر في أصل تجاري، يضع مستشارو 1Line بين يديك مقارنات السوق ونتيجة مراجعة المستندات لتتخذ قرارك على أساس واضح.'
                  : 'Whether selling land, buying a family home or investing in a commercial asset, 1Line advisors give you market comparables and a document review so you decide on solid ground.'}
              </p>
              <div className="consultation-actions-row">
                <a
                  href={getWhatsAppUrl(lang === 'ar' ? 'مرحباً 1Line، أريد استشارة عقارية متخصصة بخصوص فرصة شراء أو استثمار.' : 'Hello 1Line, I would like to schedule a property consultation.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-consultation-primary"
                >
                  <MessageSquare size={16} />
                  <span>{lang === 'ar' ? 'تحدث مع مستشار' : 'Speak With An Advisor'}</span>
                </a>
                <Link to="/buy" className="btn btn-consultation-secondary">
                  <span>{lang === 'ar' ? 'احجز معاينة ميدانية' : 'Book Field Inspection'}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* FAQ — answer-engine friendly, with FAQPage schema */}
      <FaqSection lang={lang} />

      {/* 🏁 7. PRE-FOOTER EMOTIONAL CONCLUSION STATEMENT */}
      <ScrollReveal>
        <section className="pre-footer-conclusion-section">
          <div className="conclusion-container">
            <div className="conclusion-text-block">
              <h3 className="conclusion-statement-title">
                {lang === 'ar' ? (
                  <>
                    <span>ابحث عن العقار.</span>{' '}
                    <span>وافهم القيمة.</span>{' '}
                    <span className="text-navy-bold">واتخذ القرار بثقة.</span>
                  </>
                ) : (
                  <>
                    <span>Discover The Property.</span>{' '}
                    <span>Understand The Value.</span>{' '}
                    <span className="text-navy-bold">Decide With Confidence.</span>
                  </>
                )}
              </h3>
              <Link to="/special-requests" className="conclusion-link-action">
                <span>{lang === 'ar' ? 'تحدث مع 1Line' : 'Connect with 1Line'}</span>
                {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </Link>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </div>
  );
}
