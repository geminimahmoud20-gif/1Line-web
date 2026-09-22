import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  Quote, 
  MessageSquare, 
  Phone, 
  MapPin, 
  TrendingUp, 
  FileCheck, 
  Users, 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  Award,
  Scale,
  Video,
  Clock
} from 'lucide-react';
import LogoEmblem from '../components/LogoEmblem';
import { 
  getFounderSettings, 
  cleanWhatsAppNumber, 
  cleanPhoneNumber, 
  getWhatsAppUrl 
} from '../utils/founderCmsData';
import { updatePageSeo } from '../utils/seoHelper';

export default function AboutPage({ lang = 'ar', triggerToast }) {
  const isAr = lang === 'ar';
  const [cms, setCms] = useState(() => getFounderSettings());

  useEffect(() => {
    updatePageSeo({
      title: isAr 
        ? 'عن 1Line ورؤية المؤسس د. محمود الباز | المنصة العقارية الأولى بسوهاج' 
        : 'About 1Line & Founder Dr. Mahmoud Elbaz | Premier Real Estate Platform in Sohag',
      description: isAr 
        ? 'تعرف على قصة 1Line، معايير الأمان الأربعة المعتمدة، وسيرة المؤسس د. محمود الباز استشاري التقييم والتطوير العقاري بسوهاج.' 
        : 'Discover 1Line story, certified institutional standards, and Dr. Mahmoud Elbaz leadership profile.',
      url: '/about',
      type: 'website'
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

  const cleanWhatsApp = cleanWhatsAppNumber(cms.whatsappNumber);
  const cleanPhone = cleanPhoneNumber(cms.phoneNumber);

  const stats = [
    {
      num: isAr ? (cms.stats?.[0]?.num_ar || '+500') : (cms.stats?.[0]?.num_en || '500+'),
      label: isAr ? (cms.stats?.[0]?.label_ar || 'صفقة عقارية ناجحة') : (cms.stats?.[0]?.label_en || 'Successful Deals'),
      sub: isAr ? (cms.stats?.[0]?.sub_ar || 'موثقة ومسجلة رسمياً') : (cms.stats?.[0]?.sub_en || 'Officially Verified'),
      icon: <FileCheck size={20} className="text-gold" />
    },
    {
      num: isAr ? (cms.stats?.[1]?.num_ar || '+1.2B') : (cms.stats?.[1]?.num_en || '$25M+'),
      label: isAr ? (cms.stats?.[1]?.label_ar || 'جنيه حجم تداولات') : (cms.stats?.[1]?.label_en || 'Trading Volume'),
      sub: isAr ? (cms.stats?.[1]?.sub_ar || 'أصول واستثمارات مدارة') : (cms.stats?.[1]?.sub_en || 'Managed Assets'),
      icon: <TrendingUp size={20} className="text-gold" />
    },
    {
      num: isAr ? (cms.stats?.[2]?.num_ar || '100%') : (cms.stats?.[2]?.num_en || '100%'),
      label: isAr ? (cms.stats?.[2]?.label_ar || 'فحص وتدقيق قانوني') : (cms.stats?.[2]?.label_en || 'Legal Compliance'),
      sub: isAr ? (cms.stats?.[2]?.sub_ar || 'تراخيص وملكية معتمدة') : (cms.stats?.[2]?.sub_en || 'Valid Title Deeds'),
      icon: <ShieldCheck size={20} className="text-gold" />
    },
    {
      num: isAr ? (cms.stats?.[3]?.num_ar || '+12K') : (cms.stats?.[3]?.num_en || '12K+'),
      label: isAr ? (cms.stats?.[3]?.label_ar || 'عميل ومستثمر يثقون بنا') : (cms.stats?.[3]?.label_en || 'Trusted Clients'),
      sub: isAr ? (cms.stats?.[3]?.sub_ar || 'بسوهاج ومغتربي الخليج') : (cms.stats?.[3]?.sub_en || 'Egypt & Expats'),
      icon: <Users size={20} className="text-gold" />
    }
  ];

  const goldStandards = [
    {
      num: '01',
      icon: <ShieldCheck size={24} className="gold-std-icon text-emerald" />,
      title_ar: 'التدقيق القانوني الصارم 100%',
      title_en: '100% Verified Legal Audit',
      desc_ar: 'فحص شامل لتسلسل الملكية، تراخيص البناء، ومراجعة العقود والتوكيلات من الإدارة القانونية قبل عرض أي عقار.',
      desc_en: 'Comprehensive title deed review, municipal permits verification, and zero legal disputes before any listing.',
      badge_ar: 'أمان قانوني قطعي',
      badge_en: 'Absolute Security'
    },
    {
      num: '02',
      icon: <Scale size={24} className="gold-std-icon text-gold" />,
      title_ar: 'التقييم السعري العادل والمعتمد',
      title_en: 'Certified Fair Valuation',
      desc_ar: 'مؤشرات سعرية لحظية مبنية على صفقات حقيقية منفذة بسوهاج، تضمن حماية مدخرات المشتري من أي مغالاة تسعيرية.',
      desc_en: 'Real-time market price benchmarks rooted in closed deals to protect buyer capital from artificial inflation.',
      badge_ar: 'مؤشر سعر المتر',
      badge_en: 'Price Benchmark'
    },
    {
      num: '03',
      icon: <Award size={24} className="gold-std-icon text-gold" />,
      title_ar: 'صفر عمولة على البائع ومطابقة فورية',
      title_en: 'Zero Seller Fees & Fast Match',
      desc_ar: 'تسويق احترافي مجاني بالكامل لأصحاب العقارات، مع مطابقة مباشرة مع أكثر من 500 مشترٍ ومستثمر كاش جاهزين.',
      desc_en: 'Free professional marketing for sellers with direct matching to 500+ pre-qualified cash buyers.',
      badge_ar: '0% عمولة بائع',
      badge_en: '0% Commission'
    },
    {
      num: '04',
      icon: <Video size={24} className="gold-std-icon text-sky" />,
      title_ar: 'منظومة رعاية مغتربي الخليج',
      title_en: 'Gulf Expats Concierge Desk',
      desc_ar: 'معاينات فيديو حية 4K، وتسهيلات التحويلات البنكية الرسمية، ومتابعة الإجراءات والتوكيلات حتى تسليم مفتاح الوحدة.',
      desc_en: 'Live 4K video walk-throughs, certified power of attorney facilitation, and complete remote ownership procedures.',
      badge_ar: 'خدمة كبار المغتربين',
      badge_en: 'Expats VIP'
    }
  ];

  const corporatePillars = [
    {
      title_ar: 'الرؤية المؤسسية',
      title_en: 'Our Vision',
      desc_ar: 'أن تكون 1Line المرجع الأول والأكثر موثوقية للاستثمار والوساطة العقارية المعتمدة في سوهاج والصعيد، مع تطبيق أعلى المعايير الرقمية الشفافة.',
      desc_en: 'To be Upper Egypt’s benchmark in institutional real estate intelligence, legal certainty, and transparent proptech solutions.'
    },
    {
      title_ar: 'الرسالة والقيم',
      title_en: 'Our Mission & Values',
      desc_ar: 'حماية وتنمية ثروات الأسر والمستثمرين من خلال الفحص القانوني المعتمد، التسعير الهندسي الدقيق، وإنهاء الصفقات بأعلى درجات الاحترافية والنزاهة.',
      desc_en: 'Protecting and multiplying client capital through strict legal validation, fair engineering valuations, and ethical deal-making.'
    },
    {
      title_ar: 'الالتزام التام',
      title_en: 'Our Commitment',
      desc_ar: 'لا ندرج أي عقار غير مرخص، ولا نقبل أي ممارسات تضليلية. كل عقار معروض على منصتنا يمر بلجنة اعتماد ثلاثية قبل ظهوره للعملاء.',
      desc_en: 'Zero tolerance for unlicensed units. Every property undergoes a 3-tier vetting committee before being presented to clients.'
    }
  ];

  return (
    <div className="about-page-wrapper" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 🌟 1. HERO HEADER: QUIET LUXURY & MONUMENTAL CREDENTIALS */}
      <section className="about-hero-section">
        <div className="about-hero-glow" aria-hidden="true" />

        <div className="about-hero-content section-container">
          {/* Breadcrumb navigation */}
          <nav className="about-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">{isAr ? 'الرئيسية' : 'Home'}</Link>
            <span className="breadcrumb-sep">{isAr ? '‹' : '›'}</span>
            <span className="breadcrumb-current">{isAr ? 'عن الشركة' : 'About Us'}</span>
          </nav>

          {/* Institutional Badge */}
          <div className="about-hero-badge">
            <Building2 size={15} className="text-gold" />
            <span>{isAr ? 'المنظومة العقارية الأولى المعتمدة بسوهاج' : 'Sohag’s Premier Accredited Platform'}</span>
          </div>

          {/* Monumental Headline */}
          <h1 className="about-hero-title">
            {isAr ? 'عن 1Line • نصنع معايير الثقة والأمان العقاري في سوهاج' : 'About 1Line • Engineering Trust in Real Estate'}
          </h1>

          <p className="about-hero-subtitle">
            {isAr 
              ? 'تأسست 1Line Solutions لتكون المؤسسة العقارية الأكثر احترافية وأماناً؛ نجمع بين الخبرة الميدانية المتراكمة، التدقيق القانوني الصارم 100%، والتقييم السعري العادل لضمان نجاح كل قرار استثماري.' 
              : 'Founded to lead Upper Egypt’s real estate landscape through uncompromising legal compliance, fair pricing benchmarks, and bespoke investor advisory.'}
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

      {/* 👑 2. EXECUTIVE LEADERSHIP SHOWCASE: DR. MAHMOUD ELBAZ */}
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
                <span>{isAr ? 'موثق ومعتمد رسمياً' : 'Officially Accredited'}</span>
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
                <span>{isAr ? '— رؤية التأسيس والريادة، د. محمود الباز' : '— Dr. Mahmoud Elbaz, Founder & Chairman'}</span>
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

              <a
                href={`tel:${cleanPhone}`}
                className="btn-founder-phone"
              >
                <Phone size={15} />
                <span>{isAr ? 'الاتصال بمكتب الإدارة' : 'Call Executive Office'}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 🛡️ 3. THE 4 INSTITUTIONAL STANDARDS OF TRUST */}
      <section className="about-standards-section section-container">
        <div className="section-header-centered">
          <span className="section-pill">
            <ShieldCheck size={14} className="text-gold" />
            <span>{isAr ? 'معايير 1Line المعتمدة' : 'Institutional Standards'}</span>
          </span>
          <h2 className="about-section-h2">
            {isAr ? 'لماذا يأتمننا مئات المستثمرين وأهالينا بسوهاج والخليج؟' : 'Why Prime Investors & Expat Families Trust 1Line'}
          </h2>
          <p className="about-section-desc">
            {isAr 
              ? 'صممنا منظومة عمل صارمة تضمن أعلى درجات الحماية والربحية، وتلغي تماماً أي مخاطر في شراء وبيع العقارات.' 
              : 'Our institutional safeguards eliminate speculative risks and guarantee secure ownership.'}
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

      {/* 🏛️ 4. CORPORATE PILLARS: VISION, MISSION & VALUES */}
      <section className="about-pillars-section section-container">
        <div className="pillars-grid">
          {corporatePillars.map((p, idx) => (
            <div key={idx} className="pillar-luxury-card">
              <div className="pillar-glow-accent" />
              <div className="pillar-header">
                <Sparkles size={18} className="text-gold" />
                <h3 className="pillar-title">{isAr ? p.title_ar : p.title_en}</h3>
              </div>
              <p className="pillar-desc">{isAr ? p.desc_ar : p.desc_en}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 📍 5. HEADQUARTERS & PHYSICAL ACCREDITATION */}
      <section className="about-hq-section section-container">
        <div className="hq-luxury-card">
          <div className="hq-details-col">
            <div className="hq-badge">
              <MapPin size={14} className="text-gold" />
              <span>{isAr ? 'المقر الرئيسي المعتمد' : 'Corporate Headquarters'}</span>
            </div>
            <h2 className="hq-title">
              {isAr ? 'يسعدنا استقبالكم في مقر الشركة الرئيسي بسوهاج' : 'Visit Our Corporate Headquarters in Sohag'}
            </h2>
            <p className="hq-desc">
              {isAr ? (cms.headquarters_ar || 'محافظة سوهاج - شارع الجمهورية - برج أحمد حلمي الشريف') : (cms.headquarters_en || 'Sohag - El Gomhoria St., Ahmed Helmy El Sherif Tower')}
            </p>

            <div className="hq-features-list">
              <div className="hq-feature-item">
                <Clock size={16} className="text-gold" />
                <span>{isAr ? 'ساعات العمل: يومياً من 10:00 صباحاً حتى 10:00 مساءً (ما عدا الجمعة)' : 'Working Hours: 10:00 AM – 10:00 PM (Sat–Thu)'}</span>
              </div>
              <div className="hq-feature-item">
                <Phone size={16} className="text-gold" />
                <span><bdi>{cleanPhone}</bdi> — {isAr ? 'مكتب الإدارة والحجوزات' : 'Executive Desk'}</span>
              </div>
              <div className="hq-feature-item">
                <ShieldCheck size={16} className="text-emerald" />
                <span>{isAr ? 'سجل تجاري وبطاقة ضريبية معتمدة • استشارات هندسية وقانونية مرخصة' : 'Licensed Real Estate Firm • Certified Advisory'}</span>
              </div>
            </div>

            <div className="hq-actions">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent('شارع الجمهورية برج احمد حلمي الشريف سوهاج')}`}
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
              <span className="hq-emblem-name">1LINE REAL ESTATE</span>
              <span className="hq-emblem-sub">{isAr ? 'عقارات سوهاج المعتمدة' : 'Accredited Sohag Real Estate'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 6. EXECUTIVE VIP CALL TO ACTION BANNER */}
      <section className="about-vip-cta-section section-container">
        <div className="about-vip-cta-banner">
          <div className="vip-cta-text">
            <span className="vip-pill-badge">
              <Sparkles size={13} />
              <span>{isAr ? 'استشارة استثمارية خاصة' : 'VIP Private Advisory'}</span>
            </span>
            <h2 className="vip-cta-heading">
              {isAr ? 'جاهز لاستثمار عقاري آمن ومدروس في سوهاج؟' : 'Ready for a Secure & Lucrative Real Estate Move?'}
            </h2>
            <p className="vip-cta-sub">
              {isAr 
                ? 'فريقنا الاستشاري برئاسة د. محمود الباز مستعد لمراجعة طلبك ومطابقته فورياً مع أفضل الفرص المسجلة والمرخصة.' 
                : 'Our certified advisors are ready to evaluate your portfolio and match you with prime off-market deals.'}
            </p>
          </div>

          <div className="vip-cta-btns">
            <Link to="/properties" className="btn-vip-primary">
              <span>{isAr ? 'تصفح العقارات المعتمدة' : 'Explore Verified Properties'}</span>
              {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </Link>
            <Link to="/special-requests" className="btn-vip-secondary">
              <Sparkles size={15} className="text-gold" />
              <span>{isAr ? 'طلب عقار خاص VIP' : 'Submit Bespoke Request'}</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
