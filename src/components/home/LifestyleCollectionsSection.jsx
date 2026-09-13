import React from 'react';
import { Link } from 'react-router-dom';
import { Waves, Crown, Landmark, Building2, TrendingUp, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

export default function LifestyleCollectionsSection({ lang = 'ar' }) {
  const isAr = lang === 'ar';

  const collections = [
    {
      id: 'waterfront',
      icon: Waves,
      title_ar: 'الواجهة النيلية وكورنيش سوهاج',
      title_en: 'Nile Waterfront Living',
      desc_ar: 'شقق وبنتهاوس بإطلالات بانورامية مفتوحة على النيل وهواء نقي في أرقى المواقع.',
      desc_en: 'Panoramic riverfront residences and penthouses with unhindered Nile horizons.',
      badge_ar: 'إطلالة نيلية 100%',
      badge_en: 'Direct Nile View',
      link: '/properties?area=corniche',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80'
    },
    {
      id: 'villas',
      icon: Crown,
      title_ar: 'القصور والفيلات المستقلة',
      title_en: 'Signature Mansions & Villas',
      desc_ar: 'أقصى درجات الخصوصية، حدائق خاصة، ومساحات عائلية رحبة في سوهاج الجديدة وشرق النيل.',
      desc_en: 'Secluded luxury estates, private gardens, and grand architecture for discerning families.',
      badge_ar: 'خصوصية مطلقة',
      badge_en: 'Signature Privacy',
      link: '/properties?type=villa',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80'
    },
    {
      id: 'compounds',
      icon: Landmark,
      title_ar: 'الكمبوندات والمجتمعات المغلقة',
      title_en: 'Gated Luxury Compounds',
      desc_ar: 'أمان وحراسة 24/7، مسطحات خضراء ولاندسكيب، نوادٍ اجتماعية وبحيرات مائية متكاملة.',
      desc_en: 'All-inclusive gated living with 24/7 security, lush landscapes, and resort clubhouses.',
      badge_ar: 'مجتمعات راقية متكاملة',
      badge_en: 'Gated Community',
      link: '/projects',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80'
    },
    {
      id: 'commercial',
      icon: Building2,
      title_ar: 'مقرات ومكاتب الشركات VIP',
      title_en: 'Prime Commercial & Executive HQ',
      desc_ar: 'واجهات زجاجية عصرية ومقرات جاهزة للبنوك والشركات والمراكز الطبية الكبرى في أهم الميادين.',
      desc_en: 'Modern architectural facades and strategic spaces for corporations, banks, and clinics.',
      badge_ar: 'مواقع استراتيجية',
      badge_en: 'Prime Strategic Locations',
      link: '/properties?type=commercial',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80'
    },
    {
      id: 'investment',
      icon: TrendingUp,
      title_ar: 'أصول العائد الاستثماري المرتفع',
      title_en: 'High-Yield Investment Assets',
      desc_ar: 'أصول عقارية وتجارية منتقاة بعناية تضمن حماية رأس المال من التضخم وتحقق أعلى عائد إيجاري.',
      desc_en: 'Curated commercial & residential assets designed for wealth preservation and cashflow.',
      badge_ar: 'عائد حتى 18% سنوياً',
      badge_en: 'High Yield Potential',
      link: '/properties?budget=over_6m',
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80'
    }
  ];

  return (
    <section className="homepage-section lifestyle-collections-section">
      <div className="section-header-centered" style={{ marginBottom: '32px' }}>
        <div className="section-pill-tag">
          <Sparkles size={14} className="text-gold" />
          <span>{isAr ? 'تصنيفات أسلوب الحياة الفاخر (Sotheby’s Standard)' : 'Curated Luxury Lifestyles'}</span>
        </div>
        <h2 className="section-heading-primary luxury-serif-title">
          {isAr ? 'ابحث بأسلوب الحياة الذي تطمح إليه' : 'Search by Your Desired Lifestyle'}
        </h2>
        <p className="section-heading-desc">
          {isAr
            ? 'مجموعات عقارية منتقاة بعناية فائقة لتلائم تطلعات النخبة، العائلات الراقية، والمستثمرين الاستراتيجيين بسوهاج ومغتربي الخليج.'
            : 'Curated residential and commercial collections tailored for high-net-worth individuals, families, and Gulf investors.'}
        </p>
      </div>

      <div className="lifestyle-grid">
        {collections.map((item, idx) => {
          const IconComp = item.icon;
          const isLarge = idx === 0 || idx === 1; // Top 2 are hero lifestyle cards

          return (
            <Link
              key={item.id}
              to={item.link}
              className={`lifestyle-card ${isLarge ? 'lifestyle-card-large' : 'lifestyle-card-regular'}`}
            >
              <div className="lifestyle-image-wrapper">
                <img
                  src={item.image}
                  alt={isAr ? item.title_ar : item.title_en}
                  className="lifestyle-img"
                  loading="lazy"
                />
                <div className="lifestyle-gradient-overlay" />
              </div>

              {/* Floating Badge */}
              <div className="lifestyle-badge">
                <IconComp size={13} className="text-gold" />
                <span>{isAr ? item.badge_ar : item.badge_en}</span>
              </div>

              {/* Card Bottom Content */}
              <div className="lifestyle-content">
                <h3 className="lifestyle-title">
                  {isAr ? item.title_ar : item.title_en}
                </h3>
                <p className="lifestyle-desc">
                  {isAr ? item.desc_ar : item.desc_en}
                </p>

                <div className="lifestyle-action-link">
                  <span>{isAr ? 'استكشاف المجموعة' : 'Explore Collection'}</span>
                  {isAr ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
