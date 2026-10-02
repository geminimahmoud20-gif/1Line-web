import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DollarSign, ArrowRight, ArrowLeft, ShieldCheck, Sparkles, Calculator, X, CheckCircle2, Lock, Target } from 'lucide-react';

import MarketTickerBar from '../components/home/MarketTickerBar';

import { MEGA_PROJECTS } from '../data/projectsData';
import { DEMO_PROPERTIES, DEMO_DEMANDS, isRealItem } from '../data/demoData';
import { getFounderSettings } from '../utils/founderCmsData';
import { getAreas } from '../utils/areasData';
import { updatePageSeo, buildOrganizationSchema } from '../utils/seoHelper';
import { parseSemanticQuery } from '../utils/semanticSearchEngine';
import ScrollReveal from '../components/common/ScrollReveal';
import { SELLER_PROOF } from '../config/siteConfig';
import { getHomepageSlots } from '../utils/featuredSlots';
import { useAdCampaigns, pickHeroCampaign, getInlineCampaigns } from '../utils/adCampaigns';
import { SponsoredStrip } from '../components/home/SponsoredPlacements';

import HomeHero from '../components/home/HomeHero';
import HomeMarketplace from '../components/home/HomeMarketplace';

// Below the fold: their own chunks, fetched right after the hero renders instead of in the entry bundle
const FamilyLegacySection = lazy(() => import('../components/family/FamilyLegacySection'));
const GoldStandardsSection = lazy(() => import('../components/home/GoldStandardsSection'));
const FaqSection = lazy(() => import('../components/home/FaqSection'));

// Keep in sync with the <link rel="preload"> in index.html

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
  onOpenAddDemand
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
  const [showTheaterModal, setShowTheaterModal] = useState(false);
  const heroVideoRef = useRef(null);
  const omniboxRef = useRef(null);

  // Close omnibox live suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (omniboxRef.current && !omniboxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync CMS founder & contact updates in real time
  useEffect(() => {
    const handleUpdate = () => setFounderSettings(getFounderSettings());
    window.addEventListener('oneline_founder_cms_updated', handleUpdate);
    return () => window.removeEventListener('oneline_founder_cms_updated', handleUpdate);
  }, []);

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

    // If cycle-on-end is active, do not cut off before video finishes
    if (founderSettings.heroVideoCycleOnEnd) return;

    const intervalMs = (founderSettings.heroVideoIntervalSec || 10) * 1000;
    const timer = setInterval(() => {
      setClipFade(true);
      setTimeout(() => {
        setActiveClipIndex((prev) => (prev + 1) % heroClips.length);
        setClipFade(false);
      }, 400);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [founderSettings.heroVideoAutoCycle, founderSettings.heroVideoIntervalSec, founderSettings.heroVideoCycleOnEnd, heroClips.length, videoPlaying, isReducedMotion]);

  const handleVideoEnded = () => {
    if (heroClips.length > 1 && founderSettings.heroVideoAutoCycle !== false) {
      switchClip((activeClipIndex + 1) % heroClips.length);
    } else if (heroVideoRef.current) {
      // Loop the same video smoothly
      heroVideoRef.current.currentTime = 0;
      heroVideoRef.current.play().catch(() => {});
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
  const [marketplaceAreaFilter, setMarketplaceAreaFilter] = useState('all');

  // Safe fallback to default verified catalog if parent state was ever empty
  const safeProperties = (Array.isArray(properties) && properties.length > 0) ? properties : DEMO_PROPERTIES;
  const safeDemands = (Array.isArray(demands) && demands.length > 0) ? demands : DEMO_DEMANDS;

  // Exclude hidden, draft, and deleted properties from public homepage
  const publishedProperties = safeProperties.filter(
    (p) => !p.isDeleted && p.status !== 'trash' && p.status !== 'hidden' && p.status !== 'draft'
  );
  const activePublished = publishedProperties.length > 0 ? publishedProperties : DEMO_PROPERTIES;

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

  // Demo (sample) demands are shown with a label but never counted or totalled
  const realDemands = useMemo(() => activeDemandsList.filter(isRealItem), [activeDemandsList]);

  // Total buyer capital liquidity represented in published demands
  // Budgets arrive as numbers or strings like "3,000,000"
  const totalDemandLiquidity = useMemo(() => {
    return realDemands.reduce((acc, d) => acc + (Number(String(d.budget ?? '').replace(/[^\d.]/g, '')) || 0), 0);
  }, [realDemands]);

  // null hides the tile — never show a placeholder figure
  const demandLiquidityMillions = useMemo(() => {
    if (!(totalDemandLiquidity >= 1000000)) return null;
    return (Math.round((totalDemandLiquidity / 1000000) * 10) / 10).toLocaleString('en-US');
  }, [totalDemandLiquidity]);

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
      <HomeHero
        activeClipIndex={activeClipIndex}
        activeVideoUrl={activeVideoUrl}
        clipFade={clipFade}
        currentClip={currentClip}
        districts={districts}
        founderSettings={founderSettings}
        handleHeroSearch={handleHeroSearch}
        handleVideoEnded={handleVideoEnded}
        heroAd={heroAd}
        heroClips={heroClips}
        heroVideoRef={heroVideoRef}
        isDataSaver={isDataSaver}
        lang={lang}
        matchingDistricts={matchingDistricts}
        matchingProjects={matchingProjects}
        matchingProperties={matchingProperties}
        maxInstallmentYears={maxInstallmentYears}
        navigate={navigate}
        omniboxRef={omniboxRef}
        searchArea={searchArea}
        searchBudget={searchBudget}
        searchKeyword={searchKeyword}
        searchPurpose={searchPurpose}
        searchType={searchType}
        setSearchArea={setSearchArea}
        setSearchBudget={setSearchBudget}
        setSearchKeyword={setSearchKeyword}
        setSearchPurpose={setSearchPurpose}
        setSearchType={setSearchType}
        setShowSuggestions={setShowSuggestions}
        setShowTheaterModal={setShowTheaterModal}
        showHeroVideo={showHeroVideo}
        showSuggestions={showSuggestions}
        switchClip={switchClip}
        toggleVideoMute={toggleVideoMute}
        toggleVideoPlayback={toggleVideoPlayback}
        videoMuted={videoMuted}
        videoPlaying={videoPlaying}
      />

      {/* 📈 REAL-TIME SOHAG PROPTECH MARKET TICKER */}
      <MarketTickerBar lang={lang} demands={realDemands} />

      {/* 🏢 2. SOHAG LIVE MARKETPLACE HUB (Consolidated Segmented Discovery) */}
      <HomeMarketplace
        activeDemandsList={activeDemandsList}
        activePublished={activePublished}
        compareList={compareList}
        currency={currency}
        displayProperties={displayProperties}
        favorites={favorites}
        lang={lang}
        marketplaceTab={marketplaceTab}
        navigate={navigate}
        onOpenAddDemand={onOpenAddDemand}
        onQuickView={onQuickView}
        onToggleCompare={onToggleCompare}
        onToggleFavorite={onToggleFavorite}
        realDemands={realDemands}
        setMarketplaceAreaFilter={setMarketplaceAreaFilter}
        setMarketplaceTab={setMarketplaceTab}
      />

      {/* 📢 Sponsored banners (CRM → الإعلانات, placement "inline"); renders nothing when no campaign is live */}
      <SponsoredStrip campaigns={inlineAds} lang={lang} />

      {/* 👨‍👩‍👧‍👦 بيت العيلة — family-sized listings + cost split calculator */}
      <ScrollReveal>
        <Suspense fallback={null}>
          <FamilyLegacySection lang={lang} currency={currency} properties={activePublished} />
        </Suspense>
      </ScrollReveal>

      {/* 🏡 3. SELLER INVITATION SECTION (Architectural Editorial Contrast & Proof Showcase) */}
      <ScrollReveal>
        <section className="hx-seller" aria-labelledby="hx-seller-title">
          <div className="hx-seller-copy">
            <span className="hx-kicker hx-kicker--dark">
              <Sparkles size={13} className="hx-kicker-sparkle" aria-hidden="true" />
              {lang === 'ar' ? 'لأصحاب العقارات وإدارة الأصول' : 'Owners & Asset Advisory'}
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
                ? `منظومة بيع مؤسسية متكاملة تضمن حماية حقوقك المالية والقانونية، مع ربط مباشر بطلبات شراء كاش جاهزة للتنفيذ بدون إضاعة للوقت.`
                : `An institutional sales framework ensuring full legal and financial protection, with direct matching to pre-qualified cash buyer demands.`}
            </p>

            {/* 🛡️ درع المالك الثلاثي (The Owner's Triple Shield) */}
            <div className="hx-seller-pillars" role="list">
              <div className="hx-seller-pillar" role="listitem">
                <div className="hx-pillar-icon-box">
                  <DollarSign size={18} strokeWidth={2.2} aria-hidden="true" />
                </div>
                <div className="hx-pillar-content">
                  <strong className="hx-pillar-title">
                    {lang === 'ar' ? 'أتعاب واضحة ومكتوبة' : 'Clear written fees'}
                  </strong>
                  <p className="hx-pillar-desc">
                    {lang === 'ar' ? 'تعرف أتعاب الوساطة كتابياً قبل ما نبدأ تسويق عقارك — بدون أي مفاجآت.' : 'Brokerage fees agreed in writing before marketing starts — no surprises.'}
                  </p>
                </div>
              </div>

              <div className="hx-seller-pillar" role="listitem">
                <div className="hx-pillar-icon-box">
                  <Lock size={17} strokeWidth={2.2} aria-hidden="true" />
                </div>
                <div className="hx-pillar-content">
                  <strong className="hx-pillar-title">
                    {lang === 'ar' ? 'خصوصية وسرية تامة' : 'Discreet Off-Market Option'}
                  </strong>
                  <p className="hx-pillar-desc">
                    {lang === 'ar' ? 'خيار العرض الحصري المباشر للمشترين المعتمدين دون نشر علني.' : 'Confidential direct matching to vetted buyers without public listing.'}
                  </p>
                </div>
              </div>

              <div className="hx-seller-pillar" role="listitem">
                <div className="hx-pillar-icon-box">
                  <ShieldCheck size={18} strokeWidth={2.2} aria-hidden="true" />
                </div>
                <div className="hx-pillar-content">
                  <strong className="hx-pillar-title">
                    {lang === 'ar' ? 'تقييم هندسي وعقد محكم' : 'Engineering Fair Valuation'}
                  </strong>
                  <p className="hx-pillar-desc">
                    {lang === 'ar' ? 'تسعير مبني على مقارنات السوق الفعلية وتدقيق قانوني يحمي التعاقد.' : 'Realistic market comparables pricing and binding contracts guarding all rights.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Proof points: live counts and dynamic capital liquidity */}
            <dl className="hx-proof">
              {SELLER_PROOF.sellerCommissionPct !== null && SELLER_PROOF.sellerCommissionPct !== undefined && (
                <div>
                  <dt><bdi>{SELLER_PROOF.sellerCommissionPct}%</bdi></dt>
                  <dd>{lang === 'ar' ? 'عمولة تسويق أو وساطة على البائع' : 'brokerage fee to the seller'}</dd>
                </div>
              )}
              {realDemands.length > 0 && (
                <div>
                  <dt><bdi>{realDemands.length}</bdi></dt>
                  <dd>{lang === 'ar' ? 'طلب شراء كاش مسجل الآن' : 'registered buyer demands active'}</dd>
                </div>
              )}
              {demandLiquidityMillions && (
                <div>
                  <dt>
                    <bdi>{demandLiquidityMillions}</bdi>
                    <span className="hx-proof-unit">{lang === 'ar' ? 'مليون ج.م' : 'M EGP'}</span>
                  </dt>
                  <dd>{lang === 'ar' ? 'سيولة كاش جاهزة للتنفيذ' : 'cash liquidity ready to execute'}</dd>
                </div>
              )}
              {SELLER_PROOF.avgDaysToClose && (
                <div>
                  <dt>
                    <bdi>{SELLER_PROOF.avgDaysToClose}</bdi>
                    <span className="hx-proof-unit">{lang === 'ar' ? 'يوماً' : 'days'}</span>
                  </dt>
                  <dd>{lang === 'ar' ? 'متوسط إتمام الصفقات المسعّرة بدقة' : 'average time to close accurately priced deals'}</dd>
                </div>
              )}
            </dl>

            <div className="hx-seller-actions">
              <Link to="/valuation" className="hx-btn hx-btn--gold hx-btn--glow">
                <Calculator size={18} strokeWidth={2} aria-hidden="true" />
                <span>{lang === 'ar' ? 'احسب القيمة العادلة لعقارك الآن' : 'Calculate your fair value now'}</span>
              </Link>
              <Link to="/demands" className="hx-btn hx-btn--line">
                <span>{lang === 'ar' ? 'تصفح طلبات المشترين' : 'Browse buyer demands'}</span>
                {realDemands.length > 0 && (
                  <span className="hx-btn-demands-count">{realDemands.length}</span>
                )}
                {lang === 'ar' ? <ArrowLeft size={16} strokeWidth={2} /> : <ArrowRight size={16} strokeWidth={2} />}
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
            <div className="hx-seller-media-overlay" aria-hidden="true" />

            {/* Floating Glass Card 1: free on-site viewing (a real offer — no invented deals or fee claims) */}
            <div className="hx-seller-float-card hx-seller-float-card--top">
              <div className="hx-seller-float-icon hx-seller-float-icon--success">
                <CheckCircle2 size={20} strokeWidth={2.2} />
              </div>
              <div className="hx-seller-float-info">
                <div className="hx-seller-float-title">
                  {lang === 'ar' ? 'معاينة ميدانية للموقع' : 'On-site viewing'}
                </div>
                <div className="hx-seller-float-sub">
                  {lang === 'ar' ? 'قبل أي التزام' : 'Before any commitment'}
                </div>
              </div>
              <span className="hx-seller-float-badge hx-seller-float-badge--gold">
                {lang === 'ar' ? 'مجاناً' : 'Free'}
              </span>
            </div>

            {/* Floating Glass Center Tag: Smart Cash Buyer Match */}
            <div className="hx-seller-float-tag">
              <span className="hx-live-dot" />
              <Target size={14} className="hx-seller-tag-icon" />
              <span>{lang === 'ar' ? 'مطابقة ذكية مع مشترين جاهزين' : 'AI Match with Cash Buyers'}</span>
            </div>

            {/* Floating Glass Card 2: Bottom (Legal & Engineering Audit) */}
            <div className="hx-seller-float-card hx-seller-float-card--bottom">
              <div className="hx-seller-float-icon hx-seller-float-icon--shield">
                <ShieldCheck size={22} strokeWidth={2} />
              </div>
              <div className="hx-seller-float-info">
                <div className="hx-seller-float-title">
                  {lang === 'ar' ? 'مراجعة قانونية وهندسية' : 'Legal & technical review'}
                </div>
                <div className="hx-seller-float-sub">
                  {lang === 'ar' ? 'فحص تسلسل الملكية وتراخيص البناء' : 'Title deed & permits verified'}
                </div>
              </div>
              <span className="hx-seller-float-badge hx-seller-float-badge--shield">
                {lang === 'ar' ? 'حماية تامة' : 'Protected'}
              </span>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* 🛡️ THE 4 1LINE GOLDEN STANDARDS OF INSTITUTIONAL TRUST */}
      <ScrollReveal>
        <Suspense fallback={null}>
          <GoldStandardsSection lang={lang} />
        </Suspense>
      </ScrollReveal>

      {/* FAQ — answer-engine friendly, with FAQPage schema */}
      <Suspense fallback={null}>
        <FaqSection lang={lang} />
      </Suspense>

      {/* 🎬 Hero Video Theater Modal (Full uncropped HD viewing) */}
      {showTheaterModal && (
        <div 
          className="hero-video-theater-modal" 
          role="dialog" 
          aria-modal="true"
          onClick={() => setShowTheaterModal(false)}
        >
          <div className="hero-video-theater-box" onClick={(e) => e.stopPropagation()}>
            <div className="hero-video-theater-header">
              <h4>
                <span>{lang === 'ar' ? (currentClip?.title_ar || 'الفيديو التعريفي الرسمي — 1Line Solutions') : (currentClip?.title_en || 'Official Showcase Video — 1Line Solutions')}</span>
              </h4>
              <button 
                type="button" 
                className="hero-video-theater-close"
                onClick={() => setShowTheaterModal(false)}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X size={20} />
              </button>
            </div>
            <div className="hero-video-theater-viewport">
              <video
                src={activeVideoUrl}
                autoPlay
                controls
                playsInline
                className="hero-video-theater-player"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
