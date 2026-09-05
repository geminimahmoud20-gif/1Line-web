import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  MapPin, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  MessageSquare, 
  PhoneCall, 
  ShieldCheck, 
  Flame, 
  Info, 
  Send,
  X,
  Megaphone,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getSponsoredAds } from '../../data/advertisementsData';
import { getWhatsAppUrl, cleanWhatsAppNumber } from '../../utils/founderCmsData';

export default function SponsoredAdsShowcase({ lang = 'ar' }) {
  const [ads, setAds] = useState(getSponsoredAds);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showAdvertiseModal, setShowAdvertiseModal] = useState(false);
  const timerRef = useRef(null);

  const isAr = lang === 'ar';
  const activeAds = ads.filter(a => a.active);

  // Auto-slide every 7 seconds if not hovered/paused
  useEffect(() => {
    if (activeAds.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeAds.length);
    }, 7000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeAds.length, isPaused]);

  if (activeAds.length === 0) return null;

  const currentAd = activeAds[currentIndex] || activeAds[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? activeAds.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeAds.length);
  };

  const handleWhatsAppInquiry = (ad) => {
    const cleanPhone = cleanWhatsAppNumber(ad.phone);
    const message = ad.whatsappMessage || `مرحباً، أستفسر عن إعلان ${isAr ? ad.title_ar : ad.title_en} المعروض على منصة 1Line.`;
    window.open(getWhatsAppUrl(message, cleanPhone), '_blank');
  };

  return (
    <section 
      className="homepage-section"
      style={{
        padding: '30px 0',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="section-container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* Top Header Label Strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 202, 40, 0.14)',
              border: '1px solid rgba(255, 202, 40, 0.45)',
              color: 'var(--brand-gold, #ffca28)',
              padding: '5px 14px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.78rem',
              fontWeight: 'bold',
              letterSpacing: '0.5px'
            }}>
              <Sparkles size={13} className="text-gold" />
              <span>{isAr ? 'مساحة إعلانية استثمارية معتمدة' : 'Verified Sponsored Showcase'}</span>
            </span>

            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={13} style={{ color: '#10b981' }} />
              {isAr ? 'عروض مباشرة ومفحوصة مع المطورين' : 'Direct Developer Offers'}
            </span>
          </div>

          {/* Ad Controls & "Advertise With Us" Link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setShowAdvertiseModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-gold, #ffca28)',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px 8px'
              }}
            >
              <Megaphone size={14} />
              <span>{isAr ? 'أعلن عن مشروعك هنا' : 'Advertise Your Project'}</span>
            </button>

            {/* Slider Navigation Dots & Arrows */}
            {activeAds.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handlePrev}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title={isAr ? 'الإعلان السابق' : 'Previous Ad'}
                >
                  {isAr ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                <div style={{ display: 'flex', gap: '5px' }}>
                  {activeAds.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      style={{
                        width: idx === currentIndex ? '22px' : '7px',
                        height: '7px',
                        borderRadius: '4px',
                        background: idx === currentIndex ? 'var(--brand-gold, #ffca28)' : 'rgba(255, 255, 255, 0.25)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title={isAr ? 'الإعلان التالي' : 'Next Ad'}
                >
                  {isAr ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* The Luxury Chic Showcase Card */}
        <div style={{
          background: 'linear-gradient(135deg, #092347 0%, #0d48a1 60%, #0a3880 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 202, 40, 0.35)',
          boxShadow: '0 20px 45px rgba(13, 72, 161, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          position: 'relative'
        }}>
          
          {/* Subtle Ambient Gold Glow behind card */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            [isAr ? 'right' : 'left']: '-50px',
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(255, 202, 40, 0.22) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Left Column: Details & Offer Content */}
          <div style={{
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '20px',
            zIndex: 2
          }}>
            
            {/* Header: Developer + Tags */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '0.78rem',
                    color: '#94a3b8',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <ShieldCheck size={14} style={{ color: 'var(--accent-gold)' }} />
                    {isAr ? currentAd.sponsor_ar : currentAd.sponsor_en}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#10b981',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    fontWeight: 'bold'
                  }}>
                    {isAr ? currentAd.discountBadge_ar : currentAd.discountBadge_en}
                  </span>

                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Flame size={12} />
                    {isAr ? currentAd.urgency_ar : currentAd.urgency_en}
                  </span>
                </div>
              </div>

              {/* Title & Headline */}
              <h2 style={{
                fontSize: '1.65rem',
                fontWeight: '900',
                color: '#ffffff',
                lineHeight: 1.3,
                marginBottom: '8px'
              }}>
                {isAr ? currentAd.title_ar : currentAd.title_en}
              </h2>

              <p style={{
                fontSize: '0.98rem',
                color: 'var(--accent-gold, #f59e0b)',
                fontWeight: 'bold',
                lineHeight: 1.4,
                marginBottom: '12px'
              }}>
                {isAr ? currentAd.headline_ar : currentAd.headline_en}
              </p>

              <p style={{
                fontSize: '0.86rem',
                color: '#cbd5e1',
                lineHeight: 1.6,
                marginBottom: '16px'
              }}>
                {isAr ? currentAd.description_ar : currentAd.description_en}
              </p>

              {/* Location Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#e2e8f0',
                marginBottom: '20px'
              }}>
                <MapPin size={14} style={{ color: 'var(--accent-gold)' }} />
                <span>{isAr ? currentAd.location_ar : currentAd.location_en}</span>
              </div>
            </div>

            {/* Financial Highlights Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '14px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div>
                <small style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{isAr ? 'الأسعار' : 'Starting Price'}</small>
                <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>{isAr ? currentAd.priceStarts_ar : currentAd.priceStarts_en}</strong>
              </div>
              <div>
                <small style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{isAr ? 'المقدم' : 'Down Payment'}</small>
                <strong style={{ fontSize: '0.85rem', color: '#10b981' }}>{isAr ? currentAd.downPayment_ar : currentAd.downPayment_en}</strong>
              </div>
              <div>
                <small style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>{isAr ? 'نظام الأقساط' : 'Installment Plan'}</small>
                <strong style={{ fontSize: '0.85rem', color: 'var(--accent-gold)' }}>{isAr ? currentAd.installment_ar : currentAd.installment_en}</strong>
              </div>
            </div>

            {/* Dual CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleWhatsAppInquiry(currentAd)}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                  cursor: 'pointer',
                  flex: 1,
                  justifyContent: 'center'
                }}
              >
                <MessageSquare size={16} />
                <span>{isAr ? currentAd.ctaText_ar : currentAd.ctaText_en}</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAdvertiseModal(true)}
                style={{
                  borderColor: 'rgba(217, 119, 6, 0.5)',
                  color: 'var(--accent-gold)',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(217, 119, 6, 0.08)'
                }}
              >
                <Info size={15} />
                <span>{isAr ? 'استفسار سريع' : 'Inquire'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Architectural Visual Media */}
          <div style={{
            position: 'relative',
            minHeight: '340px',
            overflow: 'hidden'
          }}>
            <img 
              src={currentAd.image} 
              alt={isAr ? currentAd.title_ar : currentAd.title_en}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.8s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />

            {/* Gradient Overlays for integration */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: isAr 
                ? 'linear-gradient(to left, transparent 50%, rgba(9, 35, 71, 0.95) 100%)' 
                : 'linear-gradient(to right, transparent 50%, rgba(9, 35, 71, 0.95) 100%)',
              pointerEvents: 'none'
            }} />

            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '80px',
              background: 'linear-gradient(to top, rgba(9, 35, 71, 0.92), transparent)',
              pointerEvents: 'none'
            }} />

            {/* Floating Luxury Badges on Media */}
            <div style={{
              position: 'absolute',
              top: '20px',
              [isAr ? 'left' : 'right']: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{
                background: 'rgba(13, 72, 161, 0.88)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 202, 40, 0.45)',
                color: '#fff',
                fontSize: '0.74rem',
                fontWeight: 'bold',
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 15px rgba(13, 72, 161, 0.4)'
              }}>
                <Sparkles size={12} className="text-gold" />
                <span>{isAr ? currentAd.tag_ar : currentAd.tag_en}</span>
              </span>

              <span style={{
                background: 'rgba(16, 185, 129, 0.9)',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                padding: '4px 10px',
                borderRadius: '8px',
                textAlign: 'center',
                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.4)'
              }}>
                {isAr ? 'عقود موثقة 100%' : '100% Certified Contracts'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 📢 Modal: Advertise With One Line (طلب حجز مساحة إعلانية للمطورين) */}
      {showAdvertiseModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(9, 35, 71, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowAdvertiseModal(false)}
        >
          <div 
            style={{
              background: 'linear-gradient(145deg, #092347 0%, #0d3b82 100%)',
              border: '1px solid rgba(255, 202, 40, 0.4)',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(9, 35, 71, 0.7)',
              position: 'relative',
              textAlign: isAr ? 'right' : 'left'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowAdvertiseModal(false)}
              style={{
                position: 'absolute',
                top: '18px',
                [isAr ? 'left' : 'right']: '18px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 202, 40, 0.18)',
                border: '1px solid rgba(255, 202, 40, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #ffca28)'
              }}>
                <Megaphone size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 'bold', margin: 0 }}>
                  {isAr ? 'احجز مساحتك الإعلانية على 1Line' : 'Book Your Sponsored Ad Slot'}
                </h3>
                <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                  {isAr ? 'الوصول المباشر لأكثر من 50,000 مشترٍ ومستثمر شهرياً' : 'Reach 50,000+ targeted property buyers'}
                </small>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '20px' }}>
              {isAr 
                ? 'تتيح منصة 1Line للشركات العقارية ومطوري المشاريع المعتمدين حجز بنرات إعلانية مميزة على الصفحة الرئيسية بظهور استثنائي يجذب المشترين الجادين في سوهاج ومحافظات الصعيد والمغتربين بالخليج.'
                : 'Feature your compound or commercial development on 1Line’s homepage with verified developer sponsorship and instant lead delivery directly to your sales team.'}
            </p>

            {/* Features checkmarks */}
            <div style={{ display: 'grid', gap: '8px', marginBottom: '24px' }}>
              {[
                isAr ? 'ظهور بارز في أعلى الواجهة الرئيسية للموقع' : 'Premium top-of-homepage showcase placement',
                isAr ? 'ربط مباشر بأرقام واتساب وفريق مبيعات مشروعك' : 'Direct WhatsApp & lead forwarding to your sales team',
                isAr ? 'تقرير تحليلي بعدد المشاهدات والنقرات والتحويلات' : 'Detailed performance analytics & CTR report',
                isAr ? 'إشراف وتوثيق قانوني من إدارة د. محمود الباز' : 'Accredited and vetted by Dr. Mahmoud Elbaz'
              ].map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#e2e8f0' }}>
                  <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Direct WhatsApp Call to Action to Office */}
            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={() => {
                const text = isAr 
                  ? 'مرحباً إدارة 1Line العقارية، أرغب في الاستفسار عن باقات وأسعار حجز المساحات الإعلانية لمشروعي على الواجهة الرئيسية للموقع.'
                  : 'Hello 1Line Real Estate, I would like to inquire about sponsored advertisement slots for my development.';
                window.open(getWhatsAppUrl(text), '_blank');
                setShowAdvertiseModal(false);
              }}
              style={{
                background: 'linear-gradient(135deg, #ffd54f 0%, #f59e0b 100%)',
                color: '#081226',
                fontWeight: 'bold',
                fontSize: '0.92rem',
                padding: '13px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.45)'
              }}
            >
              <Send size={16} />
              <span>{isAr ? 'تواصل مع إدارة التسويق لحجز مساحة' : 'Contact Marketing Dept via WhatsApp'}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
