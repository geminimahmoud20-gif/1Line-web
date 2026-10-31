import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ShieldCheck, CheckCircle2, Quote, MessageSquare, Phone, MapPin, TrendingUp, FileCheck, Users, Sparkles, ArrowRight, ArrowLeft, Award, Scale, Video, Clock } from 'lucide-react';
import LogoEmblem from '../components/LogoEmblem';
import { getFounderSettings, cleanPhoneNumber, getWhatsAppUrl, DEFAULT_FOUNDER_CMS } from '../utils/founderCmsData';
import { updatePageSeo, buildBreadcrumbSchema } from '../utils/seoHelper';
import { CONTACT } from '../config/siteConfig';
import { useSiteSettings } from '../utils/siteSettings';
import { readablePhone } from '../utils/phoneDisplay';
import { sectionOn, visibleCompanyFacts } from '../utils/aboutProfile';
import { AboutCompanyFacts, AboutTeam, AboutGallery } from '../components/about/AboutProfileSections';
import AboutShareCard from '../components/about/AboutShareCard';

// The questions (by category, with FAQPage schema) live here rather than on the long homepage
const FaqSection = lazy(() => import('../components/home/FaqSection'));

export default function AboutPage({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const { hash } = useLocation();

  // /about#faq (footer link): the questions load lazily, so scroll once they are on the page
  useEffect(() => {
    if (hash !== '#faq') return undefined;
    let tries = 0;
    const t = setInterval(() => {
      const el = document.getElementById('faq-title');
      if (el || ++tries > 30) {
        clearInterval(t);
        document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    return () => clearInterval(t);
  }, [hash]);
  const [cms, setCms] = useState(() => getFounderSettings());

  useEffect(() => {
    updatePageSeo({
      title: isAr 
        ? 'عن 1Line ورؤية المؤسس د. محمود الباز | وساطة واستشارات عقارية في سوهاج' 
        : 'About 1Line & Founder Dr. Mahmoud Elbaz | Premier Real Estate Platform in Sohag',
      description: isAr 
        ? 'تعرف على 1Line: إزاي بنشتغل، فريقنا ومستشارنا القانوني، وسيرة المؤسس د. محمود الباز استشاري التقييم والتطوير العقاري بسوهاج.' 
        : 'Discover 1Line story, certified institutional standards, and Dr. Mahmoud Elbaz leadership profile.',
      url: '/about',
      type: 'website',
      schemaId: 'breadcrumb-schema',
      schema: buildBreadcrumbSchema([
        { name: isAr ? 'الرئيسية' : 'Home', url: '/' },
        { name: isAr ? 'عن الشركة' : 'About Us', url: '/about' }
      ])
    });
  }, [lang, isAr]);

  useEffect(() => {
    const handleCmsUpdate = () => {
      setCms(getFounderSettings());
    };
    window.addEventListener('oneline_founder_cms_updated', handleCmsUpdate);
    window.addEventListener('storage', handleCmsUpdate);
    return () => {
      window.removeEventListener('oneline_founder_cms_updated', handleCmsUpdate);
      window.removeEventListener('storage', handleCmsUpdate);
    };
  }, []);

  const cleanPhone = cleanPhoneNumber(cms.phoneNumber);
  const { contact, social } = useSiteSettings();
  // Sections and company facts the team switched on in the CRM (الفريق وبيانات الشركة والصور)
  const about = cms.about;
  const show = (id) => sectionOn(about, id);
  const facts = visibleCompanyFacts(about, isAr);
  const factOf = (key) => facts.find((f) => f.key === key)?.value || '';
  // The address as saved, without a leading «المقر الرئيسي:» (the card already says where it is)
  const address = String(isAr ? (cms.headquarters_ar || CONTACT.address_ar) : (cms.headquarters_en || CONTACT.address_en)).replace(/^\s*(المقر الرئيسي|Headquarters)\s*[:：-]\s*/u, '');
  // One set of working hours for the whole site: بيانات الشركة if filled in, else إعدادات الموقع
  const hours = factOf('hours') || (isAr ? contact.hours_ar : contact.hours_en);
  const legalIds = [
    factOf('commercialReg') && `${isAr ? 'سجل تجاري' : 'Commercial registry'} ${factOf('commercialReg')}`,
    factOf('taxId') && `${isAr ? 'بطاقة ضريبية' : 'Tax ID'} ${factOf('taxId')}`,
    factOf('license') && `${isAr ? 'ترخيص' : 'Licence'} ${factOf('license')}`
  ].filter(Boolean);

  const stats = [
    {
      num: isAr ? (cms.stats?.[0]?.num_ar || DEFAULT_FOUNDER_CMS.stats[0].num_ar) : (cms.stats?.[0]?.num_en || DEFAULT_FOUNDER_CMS.stats[0].num_en),
      label: isAr ? (cms.stats?.[0]?.label_ar || DEFAULT_FOUNDER_CMS.stats[0].label_ar) : (cms.stats?.[0]?.label_en || DEFAULT_FOUNDER_CMS.stats[0].label_en),
      sub: isAr ? (cms.stats?.[0]?.sub_ar || DEFAULT_FOUNDER_CMS.stats[0].sub_ar) : (cms.stats?.[0]?.sub_en || DEFAULT_FOUNDER_CMS.stats[0].sub_en),
      icon: <FileCheck size={20} className="text-gold" />
    },
    {
      num: isAr ? (cms.stats?.[1]?.num_ar || DEFAULT_FOUNDER_CMS.stats[1].num_ar) : (cms.stats?.[1]?.num_en || DEFAULT_FOUNDER_CMS.stats[1].num_en),
      label: isAr ? (cms.stats?.[1]?.label_ar || DEFAULT_FOUNDER_CMS.stats[1].label_ar) : (cms.stats?.[1]?.label_en || DEFAULT_FOUNDER_CMS.stats[1].label_en),
      sub: isAr ? (cms.stats?.[1]?.sub_ar || DEFAULT_FOUNDER_CMS.stats[1].sub_ar) : (cms.stats?.[1]?.sub_en || DEFAULT_FOUNDER_CMS.stats[1].sub_en),
      icon: <TrendingUp size={20} className="text-gold" />
    },
    {
      num: isAr ? (cms.stats?.[2]?.num_ar || DEFAULT_FOUNDER_CMS.stats[2].num_ar) : (cms.stats?.[2]?.num_en || DEFAULT_FOUNDER_CMS.stats[2].num_en),
      label: isAr ? (cms.stats?.[2]?.label_ar || DEFAULT_FOUNDER_CMS.stats[2].label_ar) : (cms.stats?.[2]?.label_en || DEFAULT_FOUNDER_CMS.stats[2].label_en),
      sub: isAr ? (cms.stats?.[2]?.sub_ar || DEFAULT_FOUNDER_CMS.stats[2].sub_ar) : (cms.stats?.[2]?.sub_en || DEFAULT_FOUNDER_CMS.stats[2].sub_en),
      icon: <ShieldCheck size={20} className="text-gold" />
    },
    {
      num: isAr ? (cms.stats?.[3]?.num_ar || DEFAULT_FOUNDER_CMS.stats[3].num_ar) : (cms.stats?.[3]?.num_en || DEFAULT_FOUNDER_CMS.stats[3].num_en),
      label: isAr ? (cms.stats?.[3]?.label_ar || DEFAULT_FOUNDER_CMS.stats[3].label_ar) : (cms.stats?.[3]?.label_en || DEFAULT_FOUNDER_CMS.stats[3].label_en),
      sub: isAr ? (cms.stats?.[3]?.sub_ar || DEFAULT_FOUNDER_CMS.stats[3].sub_ar) : (cms.stats?.[3]?.sub_en || DEFAULT_FOUNDER_CMS.stats[3].sub_en),
      icon: <Users size={20} className="text-gold" />
    }
  ];

  const goldStandards = [
    {
      num: '01',
      icon: <ShieldCheck size={24} className="gold-std-icon text-emerald" />,
      title_ar: 'مراجعة المستندات قبل العرض',
      title_en: 'Documents reviewed before listing',
      desc_ar: 'بنراجع تسلسل الملكية وتراخيص البناء والعقود والتوكيلات مع المستشار القانوني قبل ما نعرض العقار، ونقولك على أي ملاحظة قبل التعاقد.',
      desc_en: 'We check the chain of title, building permits, contracts and powers of attorney with our legal advisor before listing, and tell you about anything we find before you sign.',
      badge_ar: 'قبل التعاقد',
      badge_en: 'Before contract'
    },
    {
      num: '02',
      icon: <Scale size={24} className="gold-std-icon text-gold" />,
      title_ar: 'سعر عادل بمقارنات حقيقية',
      title_en: 'Fair price from real comparables',
      desc_ar: 'تقرير سعر مبني على عروض وصفقات فعلية في نفس المنطقة ومعاينة ميدانية، يحمي البائع من البيع بأقل والمشتري من المغالاة.',
      desc_en: 'Real-time market price benchmarks rooted in closed deals to protect buyer capital from artificial inflation.',
      badge_ar: 'مؤشر سعر المتر',
      badge_en: 'Price Benchmark'
    },
    {
      num: '03',
      icon: <Award size={24} className="gold-std-icon text-gold" />,
      title_ar: 'أتعاب مكتوبة من الأول',
      title_en: 'Fees agreed in writing',
      desc_ar: 'بنتفق على الأتعاب كتابة قبل ما نبدأ، والمعاينة مجانية، وبنعرض عقارك الأول على المشترين المسجلين عندنا اللي طلبهم مطابق.',
      desc_en: 'Fees are agreed in writing before we start, viewings are free, and your property goes first to registered buyers whose requests match it.',
      badge_ar: 'للبايعين',
      badge_en: 'For sellers'
    },
    {
      num: '04',
      icon: <Video size={24} className="gold-std-icon text-sky" />,
      title_ar: 'خدمة المصريين في الخارج',
      title_en: 'For Egyptians abroad',
      desc_ar: 'معاينة بالفيديو المباشر، ومتابعة التوكيلات والتحويلات البنكية الرسمية، وتحديثات مكتوبة لحد ما تستلم.',
      desc_en: 'Live video viewings, help with powers of attorney and official bank transfers, and written updates until handover.',
      badge_ar: 'للمغتربين',
      badge_en: 'Expats'
    }
  ];

  return (
    <div className="about-page-wrapper" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 🌟 1. HERO HEADER: QUIET LUXURY & MONUMENTAL CREDENTIALS */}
      <section className="about-hero-section">
        <div className="about-hero-glow" aria-hidden="true" />

        <div className="about-hero-content section-container">
          {/* Breadcrumbs & Institutional Badge Container */}
          <div className="about-hero-top-badges">
            <nav className="about-breadcrumb" aria-label="Breadcrumb">
              <Link to="/" className="breadcrumb-link">{isAr ? 'الرئيسية' : 'Home'}</Link>
              <span className="breadcrumb-sep">{isAr ? '‹' : '›'}</span>
              <span className="breadcrumb-current">{isAr ? 'عن الشركة' : 'About Us'}</span>
            </nav>

            <div className="about-hero-badge">
              <Building2 size={16} className="text-gold" />
              <span>{isAr ? 'وساطة واستشارات عقارية — سوهاج والقاهرة الكبرى' : 'Real estate brokerage & advisory — Sohag & Greater Cairo'}</span>
            </div>
          </div>

          {/* Monumental Headline */}
          <h1 className="about-hero-title">
            {isAr ? (
              <>
                عن <span className="about-title-brand">1Line</span> • نصنع معايير الثقة والأمان العقاري في سوهاج
              </>
            ) : (
              <>
                About <span className="about-title-brand">1Line</span> • Engineering Trust & Security in Real Estate
              </>
            )}
          </h1>

          <p className="about-hero-subtitle">
            {isAr 
              ? '1Line شركة وساطة واستشارات عقارية في سوهاج. بنراجع مستندات العقار مع المستشار القانوني قبل ما نعرضه، وبنسعّر بمقارنات حقيقية من نفس المنطقة، وكل اتفاق معانا مكتوب.'
              : '1Line is a real estate brokerage and advisory firm in Sohag. We review a property’s papers with our legal advisor before listing it, price from real comparables in the same area, and put every agreement in writing.'}
          </p>

          {/* 4 Top Stats Counter Cards */}
          <div className="about-stats-grid">
            {stats.map((st, idx) => (
              <div key={idx} className="about-stat-card">
                <div className="about-stat-icon-box">{st.icon}</div>
                <div className="about-stat-number"><bdi>{st.num}</bdi></div>
                <div className="about-stat-label">{st.label}</div>
                <div className="about-stat-sub">{st.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AboutShareCard isAr={isAr} social={social} />

      {/* 👑 2. EXECUTIVE LEADERSHIP SHOWCASE: DR. MAHMOUD ELBAZ */}
      {show('founder') && (
      <section className="about-founder-feature-section section-container">
        <div className="about-founder-executive-card">
          {/* Portrait Column: Executive Frame with Radiant Gold Trim */}
          <div className="about-founder-portrait-col">
            <div className="about-portrait-frame">
              <img 
                src={cms.founderPhoto || '/founder-dr-mahmoud-elbaz.jpg'} 
                alt={isAr ? (cms.founderName_ar || 'د. محمود الباز') : (cms.founderName_en || 'Dr. Mahmoud Elbaz')}
                className="about-portrait-img"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/founder-dr-mahmoud-elbaz.jpg";
                }}
              />
              <div className="about-portrait-seal">
                <ShieldCheck size={14} className="seal-emerald-icon" />
                <span>{isAr ? 'المؤسس' : 'Founder'}</span>
              </div>
            </div>

            <div className="about-portrait-caption">
              <span className="founder-badge-pill">
                <CheckCircle2 size={13} />
                <span>{isAr ? 'القيادة التنفيذية' : 'Executive Board'}</span>
              </span>
            </div>
          </div>

          {/* Details Column: Credentials, Vision Quote & Contact */}
          <div className="about-founder-info-col">
            <div className="founder-header-row">
              <div className="founder-name-group">
                <h2 className="founder-name-main">
                  {isAr ? (cms.founderName_ar || 'د. محمود الباز') : (cms.founderName_en || 'Dr. Mahmoud Elbaz')}
                </h2>
                <div className="founder-role-text">
                  {isAr ? (cms.founderRole_ar || 'مؤسس ورئيس مجلس إدارة 1Line') : (cms.founderRole_en || 'Founder & Chairman of 1Line')}
                </div>
                <div className="founder-sub-text">
                  {isAr ? (cms.founderSub_ar || 'استشاري التقييم والتطوير العقاري بسوهاج') : (cms.founderSub_en || 'Real Estate Valuation & Investment Consultant')}
                </div>
              </div>
            </div>

            {/* Badges Strip */}
            <div className="founder-badges-cluster">
              {(cms.badges || []).map((b, idx) => (
                <span key={idx} className="founder-credential-pill">
                  {isAr ? b.ar : b.en}
                </span>
              ))}
            </div>

            {/* Founder Quote Card */}
            <div className="founder-quote-banner">
              <Quote size={28} className="quote-icon-decor" />
              <p className="founder-quote-content">
                {isAr ? cms.founderQuote_ar : cms.founderQuote_en}
              </p>
              <div className="founder-quote-auth">
                <span>{isAr ? `— ${cms.founderName_ar || 'د. محمود الباز'}` : `— ${cms.founderName_en || 'Dr. Mahmoud Elbaz'}`}</span>
              </div>
            </div>

            {/* Direct Consultation Actions */}
            <div className="founder-cta-row">
              <a
                href={getWhatsAppUrl(isAr ? 'مرحباً د. محمود الباز، أود الاستفسار والتنسيق بخصوص استشارة عقارية في سوهاج.' : 'Hello Dr. Mahmoud Elbaz, I would like to consult with you regarding Sohag real estate.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-founder-whatsapp"
              >
                <MessageSquare size={16} />
                <span>{isAr ? `استشارة واتساب مع ${cms.founderName_ar || 'د. محمود الباز'}` : 'Direct WhatsApp Consultation'}</span>
              </a>

              {/* One way to reach the founder here; the office line is in «زورنا» below */}
            </div>
          </div>
        </div>
      </section>
      )}

      <AboutCompanyFacts about={about} isAr={isAr} />
      <AboutTeam about={about} isAr={isAr} />
      <AboutGallery about={about} isAr={isAr} />

      {/* 🛡️ 3. THE 4 INSTITUTIONAL STANDARDS OF TRUST */}
      {show('standards') && (
      <section className="about-standards-section section-container">
        <div className="section-header-centered">
          <span className="section-pill">
            <ShieldCheck size={14} className="text-gold" />
            <span>{isAr ? 'إزاي بنشتغل' : 'How we work'}</span>
          </span>
          <h2 className="about-section-h2">
            {isAr ? 'ليه الملاك والمشترين بيتعاملوا مع 1Line؟' : 'Why owners and buyers work with 1Line'}
          </h2>
          <p className="about-section-desc">
            {isAr 
              ? 'أربع خطوات بنمشي عليها في كل صفقة عشان نقلل مخاطر البيع والشراء.'
              : 'Our process reduces buying and selling risk: documents reviewed before listing, comparable-based pricing and written agreements.'}
          </p>
        </div>

        <div className="about-standards-grid">
          {goldStandards.map((std) => (
            <div key={std.num} className="about-standard-card">
              <div className="standard-card-top">
                <div className="standard-num-badge">{std.num}</div>
                <span className="standard-pill-badge">{isAr ? std.badge_ar : std.badge_en}</span>
              </div>
              <div className="standard-icon-wrap">{std.icon}</div>
              <h3 className="standard-title">{isAr ? std.title_ar : std.title_en}</h3>
              <p className="standard-desc">{isAr ? std.desc_ar : std.desc_en}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {/* 📍 5. HEADQUARTERS & PHYSICAL ACCREDITATION */}
      {show('hq') && (
      <section className="about-hq-section section-container">
        <div className="hq-luxury-card">
          <div className="hq-details-col">
            <div className="hq-badge">
              <MapPin size={14} className="text-gold" />
              <span>{isAr ? 'زورنا' : 'Visit us'}</span>
            </div>
            <h2 className="hq-title">
              {isAr ? 'يسعدنا استقبالكم في مقر الشركة الرئيسي بسوهاج' : 'Visit Our Corporate Headquarters in Sohag'}
            </h2>
            <p className="hq-desc">
              {address}
            </p>

            <div className="hq-features-list">
              <div className="hq-feature-item">
                <Clock size={16} className="text-gold" />
                <span>{isAr ? 'مواعيد العمل' : 'Working hours'}: {hours}</span>
              </div>
              <div className="hq-feature-item">
                <Phone size={16} className="text-gold" />
                <a href={`tel:${cleanPhone}`} className="hq-phone-link"><bdi dir="ltr">{readablePhone(cleanPhone)}</bdi></a>
              </div>
              {/* Registry and tax numbers only when filled in (CRM → بيانات الشركة); no claim without them */}
              {legalIds.length > 0 && (
                <div className="hq-feature-item">
                  <ShieldCheck size={16} className="text-emerald" />
                  <span>{legalIds.join(' • ')}</span>
                </div>
              )}
            </div>

            <div className="hq-actions">
              <a
                href={CONTACT.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hq-map"
              >
                <MapPin size={15} />
                <span>{isAr ? 'موقعنا على خرائط جوجل' : 'View on Google Maps'}</span>
              </a>

              <a
                href={getWhatsAppUrl(isAr ? 'مرحباً 1Line، أود ترتيب موعد زيارة للمقر الرئيسي لمناقشة فرصة عقارية.' : 'Hello 1Line, booking an office visit.')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hq-wa"
              >
                <MessageSquare size={15} />
                <span>{isAr ? 'حجز موعد زيارة مسبق' : 'Book Office Appointment'}</span>
              </a>
            </div>
          </div>

          <div className="hq-emblem-col">
            <div className="hq-emblem-halo">
              <LogoEmblem size={80} />
              <span className="hq-emblem-name" dir="ltr">1Line</span>
              <span className="hq-emblem-sub">{isAr ? 'وساطة واستشارات عقارية • سوهاج' : 'Brokerage & advisory • Sohag'}</span>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 🚀 6. EXECUTIVE VIP CALL TO ACTION BANNER */}
      {show('faq') && (
      <div id="faq">
        <Suspense fallback={null}>
          <FaqSection lang={lang} />
        </Suspense>
      </div>
      )}

      {show('cta') && (
      <section className="about-vip-cta-section section-container">
        <div className="about-vip-cta-banner">
          <div className="vip-cta-text">
            <span className="vip-pill-badge">
              <Sparkles size={13} />
              <span>{isAr ? 'مش لاقي اللي بتدور عليه؟' : 'Not found it yet?'}</span>
            </span>
            <h2 className="vip-cta-heading">
              {isAr ? 'قولنا عايز إيه وإحنا ندوّرلك' : 'Tell us what you need and we will look for it'}
            </h2>
            <p className="vip-cta-sub">
              {isAr 
                ? `ابعتلنا طلبك، وفريق ${cms.founderName_ar || 'د. محمود الباز'} هيدوّرلك على العقارات المعروضة عندنا اللي تناسبه.`
                : 'Send your request and our team will match it with the properties we have.'}
            </p>
          </div>

          <div className="vip-cta-btns">
            <Link to="/properties" className="btn-vip-primary">
              <span>{isAr ? 'تصفح العقارات' : 'Browse properties'}</span>
              {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </Link>
            <Link to="/special-requests" className="btn-vip-secondary">
              <Sparkles size={15} className="text-gold" />
              <span>{isAr ? 'اطلب عقار بمواصفاتك' : 'Request a property'}</span>
            </Link>
          </div>
        </div>
      </section>
      )}
    </div>
  );
}
