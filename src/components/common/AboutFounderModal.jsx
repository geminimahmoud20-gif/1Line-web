import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building, 
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
  ExternalLink
} from 'lucide-react';
import LogoEmblem from '../LogoEmblem';
import { 
  getFounderSettings, 
  cleanWhatsAppNumber, 
  cleanPhoneNumber, 
  getWhatsAppUrl, 
  getPhoneCallUrl 
} from '../../utils/founderCmsData';

export default function AboutFounderModal({ isOpen, onClose, lang = 'ar' }) {
  const isAr = lang === 'ar';
  const [cms, setCms] = useState(() => getFounderSettings());

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

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanWhatsApp = cleanWhatsAppNumber(cms.whatsappNumber);
  const cleanPhone = cleanPhoneNumber(cms.phoneNumber);

  const stats = [
    {
      num: isAr ? (cms.stats?.[0]?.num_ar || '+500') : (cms.stats?.[0]?.num_en || '500+'),
      label: isAr ? (cms.stats?.[0]?.label_ar || 'صفقة عقارية ناجحة') : (cms.stats?.[0]?.label_en || 'Successful Deals'),
      sub: isAr ? (cms.stats?.[0]?.sub_ar || 'موثقة ومسجلة رسمياً') : (cms.stats?.[0]?.sub_en || 'Officially Verified'),
      icon: <FileCheck size={18} className="text-gold" />
    },
    {
      num: isAr ? (cms.stats?.[1]?.num_ar || '+1.2B') : (cms.stats?.[1]?.num_en || '$25M+'),
      label: isAr ? (cms.stats?.[1]?.label_ar || 'جنيه حجم تداولات') : (cms.stats?.[1]?.label_en || 'Trading Volume'),
      sub: isAr ? (cms.stats?.[1]?.sub_ar || 'أصول واستثمارات مدارة') : (cms.stats?.[1]?.sub_en || 'Managed Assets'),
      icon: <TrendingUp size={18} className="text-gold" />
    },
    {
      num: isAr ? (cms.stats?.[2]?.num_ar || '100%') : (cms.stats?.[2]?.num_en || '100%'),
      label: isAr ? (cms.stats?.[2]?.label_ar || 'فحص وتدقيق قانوني') : (cms.stats?.[2]?.label_en || 'Legal Compliance'),
      sub: isAr ? (cms.stats?.[2]?.sub_ar || 'تراخيص وملكية معتمدة') : (cms.stats?.[2]?.sub_en || 'Valid Title Deeds'),
      icon: <ShieldCheck size={18} className="text-gold" />
    },
    {
      num: isAr ? (cms.stats?.[3]?.num_ar || '+12K') : (cms.stats?.[3]?.num_en || '12K+'),
      label: isAr ? (cms.stats?.[3]?.label_ar || 'عميل ومستثمر يثقون بنا') : (cms.stats?.[3]?.label_en || 'Trusted Clients'),
      sub: isAr ? (cms.stats?.[3]?.sub_ar || 'بسوهاج ومغتربي الخليج') : (cms.stats?.[3]?.sub_en || 'Egypt & Expats'),
      icon: <Users size={18} className="text-gold" />
    }
  ];

  const pillars = cms.pillars || [
    {
      icon: <ShieldCheck size={20} className="text-gold" />,
      title_ar: 'الأمان القانوني المطلق',
      title_en: 'Absolute Legal Security',
      desc_ar: 'مراجعة شاملة لتسلسل الملكية وتراخيص البناء قبل إدراج أي عقار على المنصة.',
      desc_en: 'Comprehensive title deed and building permit verification before any property listing.'
    },
    {
      icon: <TrendingUp size={20} className="text-gold" />,
      title_ar: 'التقييم السعري العادل',
      title_en: 'Certified Fair Valuation',
      desc_ar: 'دراسات ميدانية وتقييم هندسي دقيق يرصد سعر المتر الفعلي في كل منطقة بسوهاج لمنع أي مغالاة وحماية أموالك.',
      desc_en: 'Accurate field studies and certified engineering valuations tracking actual meter prices to protect buyer capital.'
    },
    {
      icon: <Briefcase size={20} className="text-gold" />,
      title_ar: 'رعاية المغتربين والمستثمرين',
      title_en: 'Expats & Investors Care',
      desc_ar: 'إدارة متخصصة لمتابعة الاستثمار والمعاينات الحية بالفيديو وعقود التوكيل المعتمدة.',
      desc_en: 'Dedicated management for overseas clients with live video tours and certified procedures.'
    }
  ];

  const handleScrollToSection = () => {
    onClose();
    if (window.location.pathname !== '/') {
      window.location.href = '/#about-us';
    } else {
      const el = document.getElementById('about-us');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        el.classList.add('section-highlight-pulse');
        setTimeout(() => el.classList.remove('section-highlight-pulse'), 3000);
      }
    }
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 12, 28, 0.82)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px',
      animation: 'fadeInModal 0.25s ease-out'
    }}>
      <div 
        className="about-founder-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(165deg, #0d1b38 0%, #081024 100%)',
          border: '1px solid rgba(217, 119, 6, 0.45)',
          borderRadius: '24px',
          maxWidth: '850px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.7), 0 0 35px rgba(217, 119, 6, 0.2)',
          color: '#ffffff',
          position: 'relative',
          padding: '28px'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            left: isAr ? '18px' : 'auto',
            right: isAr ? 'auto' : '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
            e.currentTarget.style.borderColor = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Top Header Pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(217, 119, 6, 0.18)', border: '1px solid rgba(217, 119, 6, 0.4)', borderRadius: '20px', padding: '4px 12px', marginBottom: '20px' }}>
          <Building size={14} className="text-gold" />
          <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 'bold' }}>
            {isAr ? 'عن 1Line ورؤية الإدارة والمؤسس' : 'About 1Line & Leadership Profile'}
          </span>
        </div>

        {/* Founder Profile Core Hero */}
        <div style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '18px',
          padding: '20px',
          marginBottom: '22px'
        }}>
          {/* Avatar / Emblem */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #d97706, #b45309)',
            padding: '3px',
            boxShadow: '0 4px 20px rgba(217, 119, 6, 0.45)',
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
                color: '#fbbf24'
              }}>
                <LogoEmblem size={40} />
              </div>
            )}
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.45rem', color: '#ffffff', fontWeight: '800' }}>
                {isAr ? (cms.founderName_ar || 'د. محمود الباز') : (cms.founderName_en || 'Dr. Mahmoud Elbaz')}
              </h2>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                background: 'rgba(16, 185, 129, 0.18)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontWeight: 'bold'
              }}>
                <CheckCircle2 size={12} />
                <span>{isAr ? 'موثق ومعتمد' : 'Verified'}</span>
              </span>
            </div>
            <div style={{ fontSize: '0.92rem', color: '#fbbf24', fontWeight: '700', marginTop: '4px' }}>
              {isAr ? (cms.founderRole_ar || 'مؤسس ورئيس مجلس إدارة 1Line') : (cms.founderRole_en || 'Founder & Chairman of 1Line')}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
              {isAr ? (cms.founderSub_ar || 'استشاري التقييم والتطوير العقاري بسوهاج') : (cms.founderSub_en || 'Real Estate Valuation & Investment Consultant')}
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
              {(cms.badges || []).map((b, idx) => (
                <span 
                  key={idx} 
                  style={{ 
                    background: idx === 0 ? 'rgba(217, 119, 6, 0.2)' : idx === 1 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)', 
                    color: idx === 0 ? '#fbbf24' : idx === 1 ? '#34d399' : '#38bdf8', 
                    border: `1px solid ${idx === 0 ? 'rgba(217, 119, 6, 0.45)' : idx === 1 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(6, 182, 212, 0.45)'}`, 
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    padding: '3px 9px',
                    borderRadius: '6px'
                  }}
                >
                  {isAr ? b.ar : b.en}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Founder Quote Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderInlineStart: '4px solid #d97706',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '22px',
          position: 'relative'
        }}>
          <Quote size={24} style={{ color: 'rgba(217, 119, 6, 0.4)', position: 'absolute', top: '10px', left: isAr ? '12px' : 'auto', right: isAr ? 'auto' : '12px' }} />
          <p style={{
            fontSize: '0.92rem',
            lineHeight: 1.8,
            color: '#f1f5f9',
            margin: 0,
            fontStyle: 'normal'
          }}>
            {isAr ? cms.founderQuote_ar : cms.founderQuote_en}
          </p>
        </div>

        {/* 4 Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          marginBottom: '22px'
        }}>
          {stats.map((s, idx) => (
            <div key={idx} style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '14px',
              padding: '14px 12px',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#fbbf24', lineHeight: 1.2 }}>{s.num}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ffffff', marginTop: '4px' }}>{s.label}</div>
              <small style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>{s.sub}</small>
            </div>
          ))}
        </div>

        {/* 3 Core Pillars */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '0.95rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>
            {isAr ? 'ركائز منظومة 1Line العقارية' : 'Core Pillars of 1Line'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {pillars.map((p, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '12px 14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {p.icon || <ShieldCheck size={18} className="text-gold" />}
                  <h5 style={{ margin: 0, fontSize: '0.85rem', color: '#ffffff', fontWeight: 'bold' }}>
                    {isAr ? p.title_ar : p.title_en}
                  </h5>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  {isAr ? p.desc_ar : p.desc_en}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Headquarters & Official Channels */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(13, 72, 161, 0.15)',
          border: '1px solid rgba(13, 72, 161, 0.3)',
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '22px',
          fontSize: '0.82rem',
          color: '#cbd5e1'
        }}>
          <MapPin size={16} className="text-gold" style={{ flexShrink: 0 }} />
          <span>{isAr ? cms.headquarters_ar : cms.headquarters_en}</span>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '18px'
        }}>
          <a
            href={`https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(isAr ? `مرحباً د. محمود الباز، أود الاستفسار والتنسيق بخصوص استشارة عقارية في سوهاج.` : `Hello Dr. Mahmoud Elbaz, I would like to consult with you regarding Sohag real estate.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{
              flex: 1,
              minWidth: '180px',
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.88rem',
              fontWeight: 'bold',
              padding: '12px 20px',
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(217, 119, 6, 0.35)',
              textDecoration: 'none'
            }}
          >
            <MessageSquare size={16} />
            <span>{isAr ? `واتساب مع ${cms.founderName_ar || 'د. محمود الباز'}` : 'Direct WhatsApp'}</span>
          </a>

          <a
            href={`tel:${cleanPhone}`}
            className="btn btn-outline"
            style={{
              minWidth: '130px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              padding: '12px 18px',
              borderRadius: '12px',
              textDecoration: 'none'
            }}
          >
            <Phone size={15} />
            <span>{isAr ? 'اتصال مباشر' : 'Direct Call'}</span>
          </a>

          <button
            type="button"
            onClick={handleScrollToSection}
            style={{
              background: 'transparent',
              border: '1px dashed rgba(217, 119, 6, 0.4)',
              color: '#fbbf24',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: '600',
              padding: '12px 16px',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(217, 119, 6, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <ExternalLink size={14} />
            <span>{isAr ? 'استعراض القسم بالصفحة الرئيسية' : 'View on Homepage'}</span>
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
