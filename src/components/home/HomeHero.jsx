import { HERO_POSTER_DEFAULT } from '../../pages/HomePageData';
import { Link } from 'react-router-dom';
import { Building, Search, TrendingUp, MapPin, Sparkles, Calculator, Home, Landmark, Pause, Play, Volume2, VolumeX, Zap, Maximize2, X } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { HeroSponsorChip } from './SponsoredPlacements';
import LogoEmblem from '../LogoEmblem';

export default function HomeHero({
  activeClipIndex,
  activeVideoUrl,
  clipFade,
  currentClip,
  districts,
  founderSettings,
  handleHeroSearch,
  handleVideoEnded,
  heroAd,
  heroClips,
  heroVideoRef,
  isDataSaver,
  lang,
  matchingDistricts,
  matchingProjects,
  matchingProperties,
  navigate,
  omniboxRef,
  searchArea,
  searchBudget,
  searchKeyword,
  searchPurpose,
  searchType,
  setSearchArea,
  setSearchBudget,
  setSearchKeyword,
  setSearchPurpose,
  setSearchType,
  setShowSuggestions,
  setShowTheaterModal,
  showHeroVideo,
  showSuggestions,
  switchClip,
  toggleVideoMute,
  toggleVideoPlayback,
  videoMuted,
  videoPlaying
}) {
  return (
    <section className="hx-hero" aria-label={lang === 'ar' ? 'البحث عن عقار' : 'Property search'}>
      {/* Cinematic Video Background Engine */}
      {showHeroVideo ? (
        <div className="hero-cinematic-video-wrap" aria-hidden="true">
          <video
            ref={heroVideoRef}
            key={activeVideoUrl}
            autoPlay
            preload="metadata"
            loop={heroClips.length <= 1 || !founderSettings.heroVideoAutoCycle}
            muted={videoMuted}
            playsInline
            onEnded={handleVideoEnded}
            poster={currentClip?.poster || founderSettings.heroPosterUrl || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=85'}
            className={`hero-cinematic-video ${clipFade ? 'clip-fading' : ''} fit-${founderSettings.heroVideoFit === 'contain' ? 'contain' : 'cover'}`}
            style={{
              objectFit: founderSettings.heroVideoFit || 'cover',
              objectPosition: founderSettings.heroVideoPosition || 'center'
            }}
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
          <button
            type="button"
            className="hero-media-ctrl-btn"
            onClick={() => setShowTheaterModal(true)}
            title={lang === 'ar' ? 'مشاهدة كامل الفيديو بدقة عالية' : 'Watch Full Video HD'}
            aria-label="Watch Full Video HD"
          >
            <Maximize2 size={13} />
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
          <LogoEmblem size={22} className="hx-eyebrow-emblem" />
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
                <span>{lang === 'ar' ? 'تقييم من صفقات فعلية في منطقتك، ومراجعة للمستندات — بدون أي التزام.' : 'Priced from real deals nearby, documents reviewed — no obligation.'}</span>
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
                <div className="hero-input-relative" ref={omniboxRef}>
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
                                <img 
                                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=75'} 
                                  alt="" 
                                  className="sug-thumb" 
                                  loading="lazy" 
                                />
                                <div className="sug-info">
                                  <span className="sug-title">{lang === 'ar' ? p.title_ar : p.title_en}</span>
                                  <span className="sug-meta">{p.size} {lang === 'ar' ? 'م²' : 'sqm'} • {(Number(p.price) || 0).toLocaleString('en-US')} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
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
            { ar: 'بيع كاش مباشر', en: 'Direct cash sale', to: '/properties?paymentPlan=cash', icon: Zap },
            { ar: 'سوهاج الجديدة', en: 'New Sohag', to: '/properties?area=new_sohag', icon: MapPin },
            { ar: 'كورنيش النيل', en: 'Nile Corniche', to: '/properties?area=corniche', icon: MapPin },
            { ar: 'شارع الجمهورية', en: 'El-Gomhoreya St.', to: `/properties?q=${encodeURIComponent('الجمهورية')}`, icon: Landmark },
            { ar: 'فيلات مستقلة', en: 'Villas', to: '/properties?type=villa', icon: Home },
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
  );
}
