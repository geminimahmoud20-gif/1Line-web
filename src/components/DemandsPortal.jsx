import { useMemo } from 'react';
import { Zap, Search, Sparkles, CheckCircle, CheckCircle2, AlertCircle, MapPin, Clock, Building2, Home, Store, Briefcase, Compass, Users, Coins, Flame, Repeat2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAreas } from '../utils/areasData';
import '../styles/expat-suite.css';

export const DemandsPortal = ({
  lang,
  t,
  demands = [],
  ownerSearch,
  setOwnerSearch,
  isScanningMap,
  setIsScanningMap,
  ownerMatchesFound,
  setOwnerMatchesFound,
  scanningMessage,
  setScanningMessage,
  navigateTo,
  setSellerAnswers,
  triggerToast,
  handleAddNewLead,
  onOpenAddDemand
}) => {
  const publishedDemands = useMemo(() => {
    const publishedDemands = demands.filter(d => (d.status || 'published') === 'published');
    return publishedDemands.sort((a, b) => {
      const timeA = new Date(a.approvedAt || a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.approvedAt || b.createdAt || b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [demands]);

  const areas = useMemo(() => getAreas().filter(a => a.id !== 'all'), []);

  // Helper for crisp property type tag with clear icons and 100% contrast
  const getPropertyTypeBadge = (type) => {
    switch (type) {
      case 'apartment':
        return { label: lang === 'ar' ? 'شقة سكنية' : 'Apartment', Icon: Building2 };
      case 'villa':
        return { label: lang === 'ar' ? 'فيلا مستقلة' : 'Villa', Icon: Home };
      case 'retail':
      case 'commercial':
      case 'shop':
        return { label: lang === 'ar' ? 'محل تجاري / مساحة ريتيل' : 'Commercial / Retail', Icon: Store };
      case 'office':
      case 'administrative':
      case 'clinic':
        return { label: lang === 'ar' ? 'مكتب إداري / عيادة' : 'Office / Clinic', Icon: Briefcase };
      case 'land':
        return { label: lang === 'ar' ? 'أرض فضاء / استثمارية' : 'Land / Investment', Icon: Compass };
      default:
        return { label: lang === 'ar' ? (t[type] || 'عقار متميز') : (type ? type.toUpperCase() : 'Property'), Icon: Zap };
    }
  };

  // Helper for clear urgency badges with high-contrast text and glowing dots
  const getUrgencyBadge = (urgency) => {
    if (urgency === 'high') {
      return {
        className: 'urgent-high',
        label: lang === 'ar' ? 'عاجل جداً (كاش)' : 'Urgent Cash',
        dotColor: '#ef4444',
        accentColor: '#dc2626',
        hasPulse: true
      };
    }
    if (urgency === 'medium') {
      return {
        className: 'urgent-medium',
        label: lang === 'ar' ? 'طلب جاد ومؤكد' : 'Verified Demand',
        dotColor: '#f59e0b',
        accentColor: '#d97706',
        hasPulse: false
      };
    }
    return {
      className: 'urgent-low',
      label: lang === 'ar' ? 'تخطيط استثماري' : 'Future Planning',
      dotColor: '#10b981',
      accentColor: '#059669',
      hasPulse: false
    };
  };

  // Helper for robust location label
  const getAreaName = (dem) => {
    if (lang === 'ar') {
      return dem.area_ar || t[dem.area] || dem.area || 'محافظة سوهاج';
    }
    return dem.area_en || t[dem.area] || dem.area || 'Sohag';
  };

  // Helper for formatting budget neatly
  const formatBudget = (budget) => {
    if (typeof budget === 'number') {
      return budget.toLocaleString();
    }
    const parsed = parseInt(String(budget || 0).replace(/,/g, ''), 10);
    return isNaN(parsed) ? budget : parsed.toLocaleString();
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '10px 0' }}>
      {/* Hero Banner */}
      <div 
        className="investment-hero" 
        style={{ 
          background: 'linear-gradient(135deg, #092347 0%, #0d48a1 60%, #0a3880 100%)', 
          color: 'white', 
          padding: '38px 24px', 
          borderRadius: '24px', 
          marginBottom: '32px', 
          textAlign: 'center', 
          border: '1px solid rgba(255, 202, 40, 0.35)', 
          boxShadow: '0 20px 40px rgba(13, 72, 161, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(255, 202, 40, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <Zap size={42} className="text-gold" style={{ marginBottom: '14px' }} />
        <h2 style={{ fontSize: '1.85rem', fontWeight: '900', letterSpacing: '-0.5px', marginBottom: '8px' }}>
          {lang === 'ar' ? 'طلبات الشراء النشطة بسوهاج' : 'Active Market Demands in Sohag'}
        </h2>
        <p style={{ marginTop: '8px', fontSize: '1rem', opacity: 0.92, maxWidth: '640px', margin: '8px auto 22px', lineHeight: 1.6 }}>
          {lang === 'ar'
            ? 'قاعدة بيانات حية بمتطلبات المشترين والمستثمرين الفعليين الجادين لمطابقتها مع عقارك فوراً.'
            : 'A live directory of serious buyers looking for immediate property acquisitions.'}
        </p>

        {onOpenAddDemand && (
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onOpenAddDemand}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px 26px', 
              fontWeight: '800', 
              fontSize: '0.95rem',
              borderRadius: '12px',
              boxShadow: '0 8px 20px rgba(255, 202, 40, 0.35)'
            }}
          >
            <Sparkles size={17} className="text-gold" />
            <span>{lang === 'ar' ? 'أضف طلبك العقاري الآن (مجاناً)' : 'Post Your Buyer Request Now'}</span>
          </button>
        )}
      </div>

      {/* 🔁 Trade-in entry: owners who want to swap rather than sell */}
      <Link to="/trade-in" className="xs-trade-banner">
        <span className="xs-trade-banner-icon"><Repeat2 size={22} aria-hidden="true" /></span>
        <span className="xs-trade-banner-text">
          <strong>{lang === 'ar' ? 'مش عايز تبيع؟ بدّل عقارك' : 'Rather swap than sell?'}</strong>
          <small>{lang === 'ar' ? 'شقتك بفيلا، أرضك بعمارة للعيلة — نطابقك مع عروض بدل حقيقية بفرق كاش أو رأس برأس.' : 'Your apartment for a villa, land for a family building — matched with real swap offers.'}</small>
        </span>
        <span className="xs-trade-banner-cta">{lang === 'ar' ? 'ابدأ البدل ←' : 'Start →'}</span>
      </Link>

      {/* Owner Matching Search Widget */}
      <div style={{ 
        background: 'var(--bg-card, #ffffff)', 
        border: '1px solid rgba(13, 72, 161, 0.12)', 
        borderRadius: '20px', 
        padding: '28px', 
        marginBottom: '32px',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)'
      }}>
        <h3 style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          color: 'var(--text-primary, #0f172a)', 
          marginBottom: '18px',
          fontSize: '1.15rem',
          fontWeight: '800'
        }}>
          <Search size={20} style={{ color: '#d97706' }} />
          {lang === 'ar' ? 'هل لديك عقار تريد بيعه؟ ابحث عن مشترين مطابقين له فوراً' : 'Have a Property? Search for Matching Buyers Instantly'}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-secondary, #475569)' }}>
              {t.stepPropType}
            </label>
            <select 
              className="form-input"
              style={{ height: '46px', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}
              value={ownerSearch.propertyType}
              onChange={(e) => setOwnerSearch({ ...ownerSearch, propertyType: e.target.value })}
            >
              <option value="apartment">{t.apartment}</option>
              <option value="villa">{t.villa}</option>
              <option value="land">{t.land}</option>
              <option value="office">{t.office}</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-secondary, #475569)' }}>
              {t.stepArea}
            </label>
            <select 
              className="form-input"
              style={{ height: '46px', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}
              value={ownerSearch.area}
              onChange={(e) => setOwnerSearch({ ...ownerSearch, area: e.target.value })}
            >
              {areas.map(a => (
                <option key={a.id} value={a.id}>
                  {lang === 'ar' ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
                </option>
              ))}
            </select>
          </div>

          <button 
            className="btn btn-primary" 
            disabled={isScanningMap}
            style={{ 
              height: '46px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px',
              borderRadius: '12px',
              fontWeight: '800'
            }}
            onClick={() => {
              setIsScanningMap(true);
              setOwnerMatchesFound(null);
              setScanningMessage(lang === 'ar' ? 'جاري فحص إحداثيات الموقع بسوهاج...' : 'Scanning coordinates in Sohag...');
              setTimeout(() => {
                setScanningMessage(lang === 'ar' ? 'تحليل متطلبات المشترين النشطين بمخزن البيانات...' : 'Analyzing active buyer profiles...');
                setTimeout(() => {
                  const matchedCount = demands.filter(d => {
                    const matchType = !ownerSearch.propertyType || d.type === ownerSearch.propertyType;
                    const matchArea = !ownerSearch.area || 
                      d.area === ownerSearch.area || 
                      (d.area_ar && d.area_ar.includes(ownerSearch.area)) || 
                      (ownerSearch.area === 'east' && d.area_ar?.includes('شرق')) ||
                      (ownerSearch.area === 'new_sohag' && d.area_ar?.includes('الجديدة')) ||
                      (ownerSearch.area === 'kawthar' && d.area_ar?.includes('الكوثر')) ||
                      (ownerSearch.area === 'center' && (d.area_ar?.includes('البلد') || d.area_ar?.includes('الجامعة')));
                    return matchType && matchArea;
                  }).length;
                  setOwnerMatchesFound(matchedCount > 0 ? matchedCount : 1);
                  setIsScanningMap(false);
                }, 1000);
              }, 1000);
            }}
          >
            <Sparkles size={17} />
            <span>{lang === 'ar' ? 'ابحث عن مشترين مطابقين' : 'Search Matching Buyers'}</span>
          </button>
        </div>

        {isScanningMap && (
          <div style={{ 
            marginTop: '20px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '24px', 
            background: 'linear-gradient(135deg, rgba(13, 72, 161, 0.04) 0%, rgba(255, 202, 40, 0.06) 100%)', 
            borderRadius: '16px', 
            border: '1px dashed #d97706' 
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #fef3c7',
              borderTopColor: '#d97706',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#b45309' }}>
              {scanningMessage}
            </span>
          </div>
        )}

        {ownerMatchesFound !== null && (
          <div style={{ 
            marginTop: '22px', 
            padding: '18px 22px', 
            background: ownerMatchesFound > 0 ? 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)' : '#f8fafc', 
            border: ownerMatchesFound > 0 ? '1.5px solid #86efac' : '1px solid #e2e8f0', 
            borderRadius: '16px', 
            animation: 'fadeIn 0.4s ease' 
          }}>
            {ownerMatchesFound > 0 ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h4 style={{ color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: '800', fontSize: '1.05rem' }}>
                    <CheckCircle size={20} style={{ color: '#10b981' }} />
                    {lang === 'ar' ? `تم العثور على ${ownerMatchesFound} مشتري جاد مهتمين بعقارك!` : `Found ${ownerMatchesFound} active buyers for your property!`}
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: '#1e293b', margin: 0, lineHeight: 1.5 }}>
                    {lang === 'ar'
                      ? 'سجل مواصفات عقارك التفصيلية لنعرضها عليهم ويقوم مستشارونا بإتمام الصفقة لك بأعلى سعر عادل.'
                      : 'Register your property to match with these active buyers and close the transaction smoothly.'}
                  </p>
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: '800' }}
                  onClick={() => navigateTo('valuation')}
                >
                  {lang === 'ar' ? 'سجل عقارك للمطابقة الآن' : 'Match My Property Now'}
                </button>
              </div>
            ) : (
              <div>
                <h4 style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: '700' }}>
                  <AlertCircle size={18} style={{ color: '#f59e0b' }} />
                  {lang === 'ar' ? 'لم نجد مشترين مباشرين في هذه المنطقة حالياً' : 'No direct matches in this location currently'}
                </h4>
                <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                  {lang === 'ar'
                    ? 'يمكنك مع ذلك تسجيل طلبك لعرضه على مستشارينا وشركاء شبكة الوسطاء المعتمدين.'
                    : 'You can still register your request to display it to our advisors and brokers network.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Demands List Grid */}
      <div className="demands-grid">
        {publishedDemands.map((dem) => {
          const typeBadge = getPropertyTypeBadge(dem.type);
          const urgencyBadge = getUrgencyBadge(dem.urgency);
          const areaName = getAreaName(dem);
          const formattedBudget = formatBudget(dem.budget);
          const TypeIcon = typeBadge.Icon;

          return (
            <div key={dem.id} className="demand-card">
              {/* Dynamic Urgency Top Accent Bar */}
              <div 
                className="demand-card-accent-bar" 
                style={{ 
                  background: `linear-gradient(90deg, ${urgencyBadge.accentColor} 0%, transparent 100%)` 
                }} 
              />

              {/* Card Header: Property Type Tag + Urgency Pill */}
              <div className="demand-card-header">
                <span className="demand-type-tag">
                  <TypeIcon size={14} style={{ color: '#ffd700', flexShrink: 0 }} />
                  <span>{typeBadge.label}</span>
                </span>
                {dem.isDemo && <span className="xs-demo-tag">{lang === 'ar' ? 'مثال توضيحي' : 'Sample'}</span>}

                <span className={`demand-urgency-pill ${urgencyBadge.className}`}>
                  {urgencyBadge.hasPulse ? (
                    <span 
                      className="demand-pulse-dot" 
                      style={{ background: urgencyBadge.dotColor }} 
                    />
                  ) : (
                    <Flame size={12} style={{ color: urgencyBadge.accentColor, flexShrink: 0 }} />
                  )}
                  <span>{urgencyBadge.label}</span>
                </span>
              </div>

              {/* Card Body: Demand Text in a stylized box */}
              <div className="demand-description-box">
                <p className="demand-description-text">
                  {lang === 'ar' ? dem.text_ar : dem.text_en}
                </p>
              </div>

              {/* Specs & Meta Bar: Area + Budget + Timestamp */}
              <div>
                <div className="demand-meta-specs-bar">
                  <div className="demand-meta-spec-item" title={lang === 'ar' ? 'منطقة الطلب' : 'Location'}>
                    <MapPin size={15} style={{ color: '#0284c7', flexShrink: 0 }} />
                    <span style={{ fontWeight: '700' }}>{areaName}</span>
                  </div>

                  <div className="demand-budget-badge" title={lang === 'ar' ? 'الميزانية المرصودة' : 'Allocated Budget'}>
                    <Coins size={14} style={{ flexShrink: 0 }} />
                    <span>{formattedBudget} {lang === 'ar' ? 'ج.م' : 'EGP'}</span>
                  </div>

                  <div 
                    className="demand-meta-spec-item" 
                    style={{ fontSize: '0.78rem', color: '#64748b' }}
                    title={lang === 'ar' ? 'تاريخ النشر' : 'Published'}
                  >
                    <Clock size={13} style={{ flexShrink: 0 }} />
                    <span>{dem.timestamp || (lang === 'ar' ? 'حديثاً' : 'Recent')}</span>
                  </div>
                </div>

                {/* Interactive Action Buttons */}
                <div className="demand-action-buttons">
                  <button 
                    className="btn-match-property-modern"
                    onClick={() => {
                      setSellerAnswers(prev => ({
                        ...prev,
                        propertyType: dem.type,
                        area: dem.area || (dem.area_ar?.includes('شرق') ? 'east' : dem.area_ar?.includes('جديدة') ? 'new_sohag' : dem.area_ar?.includes('كوثر') ? 'kawthar' : 'center')
                      }));
                      navigateTo('valuation');
                      triggerToast(lang === 'ar' ? 'تم اختيار الطلب! أكمل مواصفات عقارك لمطابقته فوراً.' : 'Demand selected! Enter your specs.');
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{lang === 'ar' ? 'لدي عقار مطابق' : 'I Have Match'}</span>
                  </button>

                  <button 
                    className="btn-refer-owner-modern"
                    onClick={() => {
                      const referrer = prompt(lang === 'ar' ? 'أدخل اسمك ورقم هاتفك للتوصية بمالك عقار مطابق للطلب:' : 'Enter your name & phone to refer someone:');
                      if (referrer) {
                        handleAddNewLead('referral', { name: referrer, notes: `أوصى بمالك عقار مطابق للطلب المعرف: ${dem.id}` }, 'Demand Share CTA');
                        triggerToast(lang === 'ar' ? 'شكراً لك! تم تسجيل الإحالة وسنقوم بمتابعتها ومكافأتك.' : 'Thank you! Referral registered.');
                      }
                    }}
                  >
                    <Users size={15} />
                    <span>{lang === 'ar' ? 'أعرف مالكاً' : 'Refer Owner'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DemandsPortal;
