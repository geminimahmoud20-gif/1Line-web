import { HERO_POSTER_DEFAULT } from '../../pages/HomePageData';
import { Link } from 'react-router-dom';
import { Building, MapPin, Sparkles, Home, Landmark, Pause, Play, Volume2, VolumeX, Zap, Maximize2 } from 'lucide-react';
import { HeroSponsorChip } from './SponsoredPlacements';
import LogoEmblem from '../LogoEmblem';
import Advisor from '../match/Advisor';
import '../../styles/hero-match.css';

export default function HomeHero({
  activeClipIndex,
  activeStill = 0,
  activeVideoUrl,
  clipFade,
  currentClip,
  founderSettings,
  handleVideoEnded,
  heroAd,
  heroClips,
  heroStills = [],
  heroVideoRef,
  isDataSaver,
  lang,
  setActiveStill,
  setShowTheaterModal,
  showHeroVideo,
  stillsCycle,
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
            // Phones: one still per video, changing on the video timer (the first one stays the LCP image)
            if (heroStills.length > 1) {
              return heroStills.map((still, idx) => (
                <img
                  key={still.id}
                  src={still.poster}
                  sizes="100vw"
                  alt=""
                  className={`hero-cinematic-video hero-still ${idx === activeStill ? 'is-active' : ''}`}
                  fetchPriority={idx === 0 ? 'high' : 'low'}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  width="1600"
                  height="1067"
                />
              ));
            }
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

      {/* Phones: the same dots as the video playlist, for the stills */}
      {!showHeroVideo && heroStills.length > 1 && (
        <div className="hero-video-controls-badge hero-stills-badge">
          <div className="hero-clips-switcher">
            <div className="hero-clip-dots">
              {heroStills.map((still, idx) => (
                <button
                  key={still.id}
                  type="button"
                  className={`hero-clip-dot ${idx === activeStill ? 'active' : ''}`}
                  onClick={() => setActiveStill(idx)}
                  title={lang === 'ar' ? still.title_ar : still.title_en}
                  aria-label={lang === 'ar' ? `الصورة ${idx + 1} من ${heroStills.length}` : `Picture ${idx + 1} of ${heroStills.length}`}
                  aria-current={idx === activeStill ? 'true' : undefined}
                >
                  {idx === activeStill && stillsCycle && (
                    <span
                      key={`still-progress-${activeStill}`}
                      className="hero-clip-progress-fill"
                      style={{ animationDuration: `${Math.max(5, Number(founderSettings.heroVideoIntervalSec) || 10)}s` }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
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
              {/* Fixed break on phones: the fallback font and the web font (Cairo) wrap this line differently,
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

        {/* «رشّحلي وحدتي» in place of the search filters: the advisor asks five questions and ranks the homes (/match) */}
        <div className="hx-match" role="region" aria-label={lang === 'ar' ? 'رشّحلي وحدتي' : 'Find my home'}>
          <Advisor mood="talk" size={92} className="hx-match-advisor" />
          <div className="hx-match-text">
            <strong>{lang === 'ar' ? 'مش عارف تبدأ منين؟ نرشّحلك وحدتك في دقيقة' : 'Not sure where to start? We find your home in a minute'}</strong>
            <span>{lang === 'ar' ? '5 أسئلة بسيطة عن احتياجك وميزانيتك، ونوريك الوحدات المعروضة ونسبة مطابقة كل واحدة لطلبك.' : 'Five short questions about your needs and budget, then the listed homes ranked by fit.'}</span>
          </div>
          <Link to="/match" className="hx-match-btn">
            <Sparkles size={18} strokeWidth={2} aria-hidden="true" />
            <span>{lang === 'ar' ? 'رشّحلي وحدتي' : 'Find my home'}</span>
          </Link>
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
