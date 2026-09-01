import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Award, 
  Building, 
  Users, 
  MessageSquare, 
  Phone, 
  TrendingUp, 
  FileCheck, 
  Sparkles, 
  CheckCircle2, 
  Quote, 
  ExternalLink,
  MapPin,
  Clock,
  Briefcase
} from 'lucide-react';
import LogoEmblem from '../LogoEmblem';
import { getFounderSettings } from '../../utils/founderCmsData';

export default function AboutFounderSection({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const [cms, setCms] = useState(() => getFounderSettings());

  // Listen to dynamic CMS updates from CRM Admin Panel
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

  const stats = [
    {
      num_ar: cms.stats?.[0]?.num_ar || '+500',
      num_en: cms.stats?.[0]?.num_en || '500+',
      label_ar: cms.stats?.[0]?.label_ar || 'صفقة عقارية ناجحة',
      label_en: cms.stats?.[0]?.label_en || 'Successful Deals',
      sub_ar: cms.stats?.[0]?.sub_ar || 'موثقة ومسجلة رسمياً',
      sub_en: cms.stats?.[0]?.sub_en || 'Officially Verified',
      icon: <FileCheck size={20} className="text-gold" />
    },
    {
      num_ar: cms.stats?.[1]?.num_ar || '+1.2B',
      num_en: cms.stats?.[1]?.num_en || '$25M+',
      label_ar: cms.stats?.[1]?.label_ar || 'جنيه حجم تداولات',
      label_en: cms.stats?.[1]?.label_en || 'Trading Volume',
      sub_ar: cms.stats?.[1]?.sub_ar || 'أصول واستثمارات مدارة',
      sub_en: cms.stats?.[1]?.sub_en || 'Managed Real Estate Assets',
      icon: <TrendingUp size={20} className="text-gold" />
    },
    {
      num_ar: cms.stats?.[2]?.num_ar || '100%',
      num_en: cms.stats?.[2]?.num_en || '100%',
      label_ar: cms.stats?.[2]?.label_ar || 'فحص وتدقيق قانوني',
      label_en: cms.stats?.[2]?.label_en || 'Legal Compliance',
      sub_ar: cms.stats?.[2]?.sub_ar || 'تراخيص وملكية معتمدة',
      sub_en: cms.stats?.[2]?.sub_en || 'Valid Title Deeds',
      icon: <ShieldCheck size={20} className="text-gold" />
    },
    {
      num_ar: cms.stats?.[3]?.num_ar || '+12K',
      num_en: cms.stats?.[3]?.num_en || '12K+',
      label_ar: cms.stats?.[3]?.label_ar || 'عميل ومستثمر يثقون بنا',
      label_en: cms.stats?.[3]?.label_en || 'Trusted Clients',
      sub_ar: cms.stats?.[3]?.sub_ar || 'بسوهاج ومغتربي الخليج',
      sub_en: cms.stats?.[3]?.sub_en || 'In Egypt & Gulf Expats',
      icon: <Users size={20} className="text-gold" />
    }
  ];

  const pillars = cms.pillars || [
    {
      icon: <ShieldCheck size={22} />,
      title_ar: 'الأمان القانوني المطلق',
      title_en: 'Absolute Legal Security',
      desc_ar: 'لا يتم عرض أو تسويق أي وحدة عقارية إلا بعد مراجعة شاملة لتسلسل الملكية، وتراخيص البناء، ومطابقة المخططات الهندسية من الإدارة القانونية.',
      desc_en: 'Every property undergoes thorough title deed review and building permit verification before listing.'
    },
    {
      icon: <TrendingUp size={22} />,
      title_ar: 'التقييم السعري العادل والمعتمد',
      title_en: 'Certified Fair Valuation',
      desc_ar: 'نعتمد على خوارزميات تقييم دقيقة ترصد سعر المتر الفعلي في كل منطقة بسوهاج لمنع أي مغالاة أو تسعير عشوائي يحمي أموال المشترين.',
      desc_en: 'Accurate valuation models tracking fair meter prices across Sohag to prevent inflated costs.'
    },
    {
      icon: <Briefcase size={22} />,
      title_ar: 'برنامج رعاية المستثمرين والمغتربين',
      title_en: 'Expats & Investors Care',
      desc_ar: 'إدارة متكاملة مخصصة للمغتربين بالخليج تتولى المعاينات الحية بالفيديو، وتسهيلات السداد والتوكيلات، وتحقيق أعلى عائد استثماري وإيجاري.',
      desc_en: 'Dedicated services for Gulf expats including live video tours, verified legal procedures, and high ROI deals.'
    }
  ];

  const pillarIcons = [<ShieldCheck size={22} />, <TrendingUp size={22} />, <Briefcase size={22} />];

  const cleanWhatsApp = (cms.whatsappNumber || '201012345678').replace(/[^0-9]/g, '');
  const cleanPhone = cms.phoneNumber || '+201012345678';

  return (
    <section id="about-us" className="homepage-section about-founder-section" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Subtle Background Glow */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(217, 119, 6, 0.07) 0%, rgba(10, 17, 40, 0) 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }}></div>

      <div className="section-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Section Header */}
        <div className="section-header-centered" style={{ marginBottom: '40px' }}>
          <span className="section-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Building size={14} className="text-gold" />
            <span>{isAr ? 'عن ون لاين ورؤية الإدارة' : 'About One Line & Leadership'}</span>
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', margin: '12px 0 10px 0', lineHeight: 1.3 }}>
            {isAr ? 'ريادة الحلول العقارية والاستثمار الآمن في سوهاج' : 'Pioneering Real Estate Intelligence in Sohag'}
          </h2>
          <p style={{ maxWidth: '680px', margin: '0 auto', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7 }}>
            {isAr 
              ? 'تأسست One Line لتكون المنظومة العقارية الأكثر موثوقية واحترافية، نضع بين يديك خبرة متراكمة وتقييمات معتمدة لضمان قرار استثماري ناجح بنسبة 100%.' 
              : 'One Line was founded to set new benchmarks in real estate trust, certified valuations, and secure investments in Upper Egypt.'}
          </p>
        </div>

        {/* 2-Column Showcase Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '30px',
          alignItems: 'stretch',
          marginBottom: '40px'
        }}>
          {/* 👤 LEFT COLUMN: THE FOUNDER PROFILE CARD */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(21, 31, 58, 0.95), rgba(15, 23, 42, 0.95))',
            border: '1px solid rgba(217, 119, 6, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '30px 26px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 10px 35px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            {/* Top Founder Identity */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
                  padding: '3px',
                  boxShadow: '0 4px 15px rgba(217, 119, 6, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {cms.founderPhoto ? (
                    <img 
                      src={cms.founderPhoto} 
                      alt={cms.founderName_ar} 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: '#0a1128',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-gold)'
                    }}>
                      <LogoEmblem size={34} />
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 'bold' }}>
                      {isAr ? (cms.founderName_ar || 'د. محمود الباز') : (cms.founderName_en || 'Dr. Mahmoud Elbaz')}
                    </h3>
                    <CheckCircle2 size={16} style={{ color: 'var(--emerald)' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', display: 'block', marginTop: '2px', fontWeight: '500' }}>
                    {isAr ? (cms.founderRole_ar || 'مؤسس ورئيس مجلس إدارة One Line') : (cms.founderRole_en || 'Founder & Chairman of One Line')}
                  </span>
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {isAr ? (cms.founderSub_ar || 'استشاري التقييم والتطوير العقاري بسوهاج') : (cms.founderSub_en || 'Real Estate Valuation Consultant')}
                  </small>
                </div>
              </div>

              {/* Founder Quote Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderInlineStart: '4px solid var(--accent-gold)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px 18px',
                marginBottom: '20px',
                position: 'relative'
              }}>
                <Quote size={24} style={{ color: 'rgba(217, 119, 6, 0.25)', position: 'absolute', top: '10px', left: isAr ? '10px' : 'auto', right: isAr ? 'auto' : '10px' }} />
                <p style={{
                  fontSize: '0.92rem',
                  lineHeight: 1.8,
                  color: 'var(--text-primary)',
                  margin: 0,
                  fontStyle: 'normal'
                }}>
                  {isAr ? cms.founderQuote_ar : cms.founderQuote_en}
                </p>
              </div>

              {/* Founder Accreditations */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {(cms.badges || []).map((b, idx) => (
                  <span 
                    key={idx} 
                    className="badge" 
                    style={{ 
                      background: idx === 0 ? 'rgba(217, 119, 6, 0.12)' : idx === 1 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(6, 182, 212, 0.12)', 
                      color: idx === 0 ? 'var(--accent-gold)' : idx === 1 ? 'var(--emerald)' : 'var(--cyan)', 
                      border: `1px solid ${idx === 0 ? 'rgba(217, 119, 6, 0.3)' : idx === 1 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`, 
                      fontSize: '0.75rem' 
                    }}
                  >
                    {isAr ? b.ar : b.en}
                  </span>
                ))}
              </div>
            </div>

            {/* Direct Consultation Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '1px solid var(--border-light)', paddingTop: '18px' }}>
              <a
                href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(`مرحباً د. محمود الباز، أود حجز استشارة عقارية خاصة مع مكتب الإدارة.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '170px', background: 'var(--gradient-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem' }}
              >
                <MessageSquare size={15} />
                <span>{isAr ? `استشارة مع ${cms.founderName_ar || 'د. محمود الباز'}` : 'Consult Dr. Elbaz'}</span>
              </a>

              <a
                href={`tel:${cleanPhone}`}
                className="btn btn-outline"
                style={{ minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <Phone size={15} />
                <span>{isAr ? 'مكتب الإدارة' : 'Call Office'}</span>
              </a>
            </div>
          </div>

          {/* 🏢 RIGHT COLUMN: THE ONE LINE CORPORATE PILLARS */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
            {/* Top 3 Core Values */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pillars.map((pillar, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    transition: 'var(--transition-normal)'
                  }}
                  className="pillar-hover-card"
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(217, 119, 6, 0.1)',
                    color: 'var(--accent-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {pillarIcons[idx % pillarIcons.length]}
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.98rem', color: '#ffffff', fontWeight: 'bold' }}>
                      {isAr ? pillar.title_ar : pillar.title_en}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {isAr ? pillar.desc_ar : pillar.desc_en}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Corporate Location & Headquarters Ribbon */}
            <div style={{
              background: 'linear-gradient(90deg, rgba(217, 119, 6, 0.08), rgba(6, 182, 212, 0.08))',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} className="text-gold" />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  {isAr ? (cms.headquarters_ar || 'المقر الرئيسي: محافظة سوهاج (شرق النيل - سوهاج الجديدة)') : (cms.headquarters_en || 'HQ: Sohag')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald)' }}></span>
                <span style={{ fontSize: '0.75rem', color: 'var(--emerald)', fontWeight: 'bold' }}>
                  {isAr ? 'سجل تجاري وبطاقة ضريبية معتمدة' : 'Officially Registered & Licensed'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 📊 BOTTOM 4 STATS ROW */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px'
        }}>
          {stats.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                {item.icon}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--accent-gold)', marginBottom: '4px', letterSpacing: '-0.5px' }}>
                {isAr ? item.num_ar : item.num_en}
              </div>
              <strong style={{ fontSize: '0.88rem', display: 'block', color: 'var(--text-primary)', marginBottom: '2px' }}>
                {isAr ? item.label_ar : item.label_en}
              </strong>
              <small style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {isAr ? item.sub_ar : item.sub_en}
              </small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
