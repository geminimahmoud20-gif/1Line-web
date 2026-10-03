import { Link } from 'react-router-dom';
import { Building, Users, MapPin, DollarSign, ArrowRight, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import PropertyCard from '../properties/PropertyCard';
import ScrollReveal from '../common/ScrollReveal';

const toBudget = (b) => (typeof b === 'number' ? b : Number(String(b ?? '').replace(/[^\d.]/g, '')) || 0);

/** 3200000 → "3.2 مليون ج.م" / "EGP 3.2M" (one unit, not "3.2M مليون") */
const formatMillions = (n, lang) => {
  const m = n / 1e6;
  const num = m >= 100 ? Math.round(m).toLocaleString('en-US') : String(Math.round(m * 10) / 10);
  return lang === 'ar' ? `${num} مليون ج.م` : `EGP ${num}M`;
};

export default function HomeMarketplace({
  activeDemandsList,
  activePublished,
  compareList,
  currency,
  displayProperties,
  favorites,
  lang,
  marketplaceTab,
  navigate,
  onOpenAddDemand,
  onQuickView,
  onToggleCompare,
  onToggleFavorite,
  realDemands,
  setMarketplaceAreaFilter,
  setMarketplaceTab
}) {
  return (
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
              {realDemands.length > 0
                ? (lang === 'ar' ? 'أحدث العقارات والطلبات الاستثمارية الحية' : 'Featured Properties & Live Demands')
                : (lang === 'ar' ? 'أحدث العقارات وطلبات المشترين' : 'Featured Properties & Buyer Demands')}
            </h2>
            <p className="section-heading-desc mt-2 mb-0" style={{ marginInline: 0 }}>
              {realDemands.length > 0
                ? (lang === 'ar' ? 'أحدث الوحدات المعروضة، وطلبات شراء منشورة من مشترين جادين يمكنك مطابقة عقارك معها.' : 'The latest listings, plus published buyer demands you can match your property against.')
                : (lang === 'ar' ? 'أحدث الوحدات المعروضة، ومساحة ينشر فيها المشترون طلباتهم لنطابقها مع العقارات المتاحة.' : 'The latest listings, and a place for buyers to post what they want so we can match it.')}
            </p>
          </div>

        {/* Interactive Switcher Tabs (Ultra High Contrast Navy & Gold) */}
        <div className="hx-seg" role="tablist" aria-label={lang === 'ar' ? 'نوع العرض' : 'Listing view'}>
          {[
            { id: 'properties', icon: Building, ar: 'العقارات المعروضة', en: 'Properties', count: activePublished.length },
            { id: 'demands', icon: Users, ar: 'طلبات المشترين الكاش', en: 'Cash buyer demands', count: realDemands.length }
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
              {/* A "0" next to the tab reads as an empty marketplace; show the count once there is one */}
              {count > 0 && <span className="hx-seg-count"><span className="hx-live-dot" aria-hidden="true" />{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Properties */}
      {marketplaceTab === 'properties' && (
        <div>
          {displayProperties.length > 0 ? (
            <div className="properties-grid-4 hx-market-rail">
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
              <p>{lang === 'ar' ? 'أرسل مواصفات طلبك ويبحث فريقنا الميداني عن الوحدات المناسبة لك.' : 'Submit your request and our advisory team will find the best match for you.'}</p>
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
          {/* Live Demands Metrics Strip — only once real demands are published (zeros read as an empty market) */}
          {realDemands.length > 0 ? (
            <div className="demands-metrics-strip">
              <div className="demand-metric-card">
                <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <DollarSign size={20} />
                </div>
                <div className="metric-info">
                  <span>{lang === 'ar' ? 'إجمالي القوة الشرائية المسجلة' : 'Total Purchasing Power'}</span>
                  <strong>{formatMillions(realDemands.reduce((sum, d) => sum + toBudget(d.budget), 0), lang)}</strong>
                </div>
              </div>

              {/* Figures below are computed from published demands — no fixed marketing numbers */}
              <div className="demand-metric-card">
                <div className="metric-icon" style={{ background: 'rgba(169, 130, 74, 0.14)', color: 'var(--gold-dark, #7C5E30)' }}>
                  <Users size={20} />
                </div>
                <div className="metric-info">
                  <span>{lang === 'ar' ? 'طلبات شراء منشورة الآن' : 'Published buyer demands'}</span>
                  <strong>{realDemands.length} {lang === 'ar' ? 'طلب' : 'demands'}</strong>
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
          ) : (
            <div className="demands-empty-invite">
              <Sparkles size={18} className="text-gold" aria-hidden="true" />
              <p>
                {lang === 'ar'
                  ? 'كن أول مشترٍ ينشر طلبه — نراجعه ثم نطابقه مع العقارات المتاحة ونتواصل معك. الكروت التالية أمثلة توضيحية لشكل الطلب.'
                  : 'Be the first buyer to post a request — we review it, match it with available properties and get back to you. The cards below are examples.'}
              </p>
            </div>
          )}

          <div className="demands-grid-compact">
            {activeDemandsList.slice(0, 4).map((dem) => (
              <div 
                key={dem.id} 
                className={`demand-card-box titanium-card${dem.isDemo ? ' is-sample' : ''}`}
                onClick={() => navigate('/demands')}
                style={{ cursor: 'pointer' }}
                title={lang === 'ar' ? 'انقر للانتقال إلى بوابة طلبات المشترين' : 'Click to view in Demands Portal'}
              >
                <div className="demand-top-row">
                  {dem.isDemo
                    ? <span className="xs-demo-tag">{lang === 'ar' ? 'مثال توضيحي' : 'Sample'}</span>
                    : <span className="demand-time-tag">{dem.timestamp}</span>}
                  {/* "Urgent cash" / "serious buyer" describe a real person — never on a sample */}
                  {!dem.isDemo && <span
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
                  </span>}
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
                    {/* A sample has no buyer behind it, so it can't be "matched" */}
                    <span>{dem.isDemo ? (lang === 'ar' ? 'اعرض عقارك للبيع' : 'List your property') : (lang === 'ar' ? 'عقاري يطابق هذا الطلب' : 'Match My Property')}</span>
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
              <span>{lang === 'ar' ? `استعراض كل طلبات المشترين${realDemands.length > 0 ? ` (${realDemands.length})` : ''}` : 'All Demands'}</span>
              {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </Link>
          </div>
        </div>
      )}
      </ScrollReveal>
    </section>
  );
}
