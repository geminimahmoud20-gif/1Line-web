import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Zap, Sparkles, CheckCircle2, AlertCircle, MapPin, 
  Clock, Building2, Home, Store, Briefcase, Compass, Users, Coins, Flame, 
  Repeat2, MessageCircle, Send, Sprout, Factory
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAreas } from '../utils/areasData';
import { recordInArea, areaFromText } from '../utils/areaLookup';
import { isValidPhoneNumber } from '../utils/securityShield';
import '../styles/expat-suite.css';
import { recordTimeLabel } from '../utils/relativeTime';
import OwnerMatchSearch from './demands/OwnerMatchSearch';
import { DEMAND_CATEGORIES, inDemandCategory } from './demands/demandCategories';
import { siteLink } from '../config/siteConfig';
import { contactProblem } from '../utils/contactValidation';

export const DemandsPortal = ({
  lang,
  t,
  demands = [],
  ownerMatchesFound,
  setOwnerMatchesFound,
  navigateTo,
  setSellerAnswers,
  triggerToast,
  handleAddNewLead,
  onOpenAddDemand
}) => {
  const isAr = lang === 'ar';

  // Category & Area Filter States
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeAreaFilter, setActiveAreaFilter] = useState('all');
  const [isFilterActive, setIsFilterActive] = useState(false);

  // Refer Owner Modal State (Replaces primitive window.prompt)
  const [referringDemand, setReferringDemand] = useState(null);
  const [referralForm, setReferralForm] = useState({ name: '', phone: '', propertyNotes: '' });
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  const isSubmittingRef = useRef(false);

  // Lock background scroll and listen for Escape key on referral modal
  useEffect(() => {
    if (!referringDemand) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e) => {
      if (e.key === 'Escape') setReferringDemand(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [referringDemand]);

  const allPublished = useMemo(() => {
    const list = demands.filter(d => (d.status || 'published') === 'published');
    return list.sort((a, b) => {
      const timeA = new Date(a.approvedAt || a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.approvedAt || b.createdAt || b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [demands]);

  // The CRM's live areas; they can arrive after the page opened
  const [areas, setAreas] = useState(() => getAreas().filter(a => a.id !== 'all'));
  useEffect(() => {
    const refresh = () => setAreas(getAreas().filter(a => a.id !== 'all'));
    window.addEventListener('oneline_areas_updated', refresh);
    return () => window.removeEventListener('oneline_areas_updated', refresh);
  }, []);

  // «عندك عقار للبيع؟»: nothing picked means any type / any area
  const [search, setSearch] = useState({ type: '', area: '' });
  const runOwnerSearch = () => {
    const matched = allPublished.filter(d => inDemandCategory(d.type, search.type) && recordInArea(d, search.area, areas));
    setOwnerMatchesFound(matched.length);
    setSelectedCategory(search.type || 'all');
    setActiveAreaFilter(search.area || 'all');
    setIsFilterActive(Boolean(search.type || search.area));
    requestAnimationFrame(() => document.getElementById('demand-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const showAll = () => {
    setSelectedCategory('all');
    setActiveAreaFilter('all');
    setIsFilterActive(false);
    setOwnerMatchesFound(null);
    setSearch({ type: '', area: '' });
  };

  // Filtered Demands to display in the grid
  const displayedDemands = useMemo(() => {
    return allPublished.filter(d => {
      // Category filter (same groups as the pills and the owner search)
      if (!inDemandCategory(d.type, selectedCategory)) return false;
      // Area filter
      if (activeAreaFilter !== 'all') {
        // By the CRM's live areas: the id, or the area's name inside the request text
        const matchArea = recordInArea(d, activeAreaFilter, areas);
        if (!matchArea) return false;
      }
      return true;
    });
  }, [allPublished, selectedCategory, activeAreaFilter, areas]);

  // Helper for crisp property type tag with clear icons and 100% contrast
  const getPropertyTypeBadge = (type) => {
    switch (type) {
      case 'apartment':
        return { label: isAr ? 'شقة سكنية' : 'Apartment', Icon: Building2 };
      case 'villa':
        return { label: isAr ? 'فيلا مستقلة' : 'Villa', Icon: Home };
      case 'retail':
      case 'commercial':
      case 'shop':
        return { label: isAr ? 'محل تجاري / مساحة ريتيل' : 'Commercial / Retail', Icon: Store };
      case 'office':
      case 'administrative':
      case 'clinic':
        return { label: isAr ? 'مكتب إداري / عيادة' : 'Office / Clinic', Icon: Briefcase };
      case 'land':
        return { label: isAr ? 'أرض فضاء / استثمارية' : 'Land / Investment', Icon: Compass };
      case 'agri_land':
      case 'farm':
        return { label: isAr ? (type === 'farm' ? 'مزرعة / حديقة فاكهة' : 'أرض زراعية') : (type === 'farm' ? 'Farm' : 'Farmland'), Icon: Sprout };
      case 'factory':
      case 'warehouse':
      case 'industrial_land':
        return { label: isAr ? ({ factory: 'مصنع / ورشة', warehouse: 'مخزن / مستودع', industrial_land: 'أرض صناعية' })[type] : ({ factory: 'Factory', warehouse: 'Warehouse', industrial_land: 'Industrial land' })[type], Icon: Factory };
      default:
        return { label: isAr ? (t?.[type] || 'عقار متميز') : (type ? type.toUpperCase() : 'Property'), Icon: Zap };
    }
  };

  // Helper for clear urgency badges with high-contrast text and glowing dots
  const getUrgencyBadge = (urgency) => {
    if (urgency === 'high') {
      return {
        className: 'urgent-high',
        label: isAr ? 'عاجل جداً (كاش)' : 'Urgent Cash',
        dotColor: '#ef4444',
        accentColor: '#dc2626',
        hasPulse: true
      };
    }
    if (urgency === 'medium') {
      return {
        className: 'urgent-medium',
        label: isAr ? 'طلب جاد ومؤكد' : 'Verified Demand',
        dotColor: '#f59e0b',
        accentColor: '#d97706',
        hasPulse: false
      };
    }
    return {
      className: 'urgent-low',
      label: isAr ? 'تخطيط استثماري' : 'Future Planning',
      dotColor: '#10b981',
      accentColor: '#059669',
      hasPulse: false
    };
  };

  // Helper for robust location label
  const getAreaName = (dem) => {
    if (isAr) {
      return dem.area_ar || t?.[dem.area] || dem.area || 'محافظة سوهاج';
    }
    return dem.area_en || t?.[dem.area] || dem.area || 'Sohag';
  };

  // Helper for formatting budget neatly
  const formatBudget = (budget) => {
    if (typeof budget === 'number') {
      return budget.toLocaleString('en-US');
    }
    const parsed = parseInt(String(budget || 0).replace(/,/g, ''), 10);
    return isNaN(parsed) ? budget : parsed.toLocaleString('en-US');
  };

  // Handler for referral modal submission
  const handleReferralSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmittingReferral) return;

    const trimmedName = referralForm.name.trim();
    const trimmedPhone = referralForm.phone.trim();

    const problem = contactProblem({ name: trimmedName, phone: trimmedPhone }, isAr);
    if (problem) {
      triggerToast?.(problem, 'error');
      return;
    }

    if (!isValidPhoneNumber(trimmedPhone)) {
      triggerToast?.(isAr ? 'رقم الهاتف غير صالح، يرجى كتابة رقم هاتف مصري أو دولي صحيح' : 'Invalid phone number format', 'error');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmittingReferral(true);
    try {
      if (handleAddNewLead) {
        await handleAddNewLead({
          name: trimmedName,
          phone: trimmedPhone,
          whatsapp: trimmedPhone,
          type: 'referral',
          source: 'Demand Card Referral CTA',
          notes: `إحالة مالك لطلب مشتري (${referringDemand?.type} - ${referringDemand?.area_ar || referringDemand?.area}): ${referringDemand?.text_ar} | مواصفات الوحدة المرشحة: ${referralForm.propertyNotes || 'لم تُحدد'}`,
          details: {
            demandId: referringDemand?.id,
            demandText: referringDemand?.text_ar,
            propertyNotes: referralForm.propertyNotes
          }
        });
      }
      triggerToast?.(isAr ? 'شكراً لك! تم تسجيل ترشيحك وسيتواصل معك مستشار الصفقات لتأكيد المكافأة.' : 'Referral submitted! Our advisor will contact you.', 'success');
      setReferringDemand(null);
      setReferralForm({ name: '', phone: '', propertyNotes: '' });
    } catch (err) {
      console.error(err);
      triggerToast?.(isAr ? 'حدث خطأ أثناء الإرسال، يرجى المحاولة ثانية' : 'Submission error, please try again', 'error');
    } finally {
      setIsSubmittingReferral(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '10px 0' }}>
      {/* Primary Call To Action */}
      {onOpenAddDemand && (
        <div className="demands-add-cta">
          <button type="button" className="btn btn-primary" onClick={onOpenAddDemand}>
            <Sparkles size={17} aria-hidden="true" />
            <span>{isAr ? 'بتدوّر على عقار؟ اكتب طلبك مجاناً' : 'Post Your Buyer Request Now'}</span>
          </button>
        </div>
      )}

      {/* 🔁 Trade-in entry: owners who want to swap rather than sell */}
      <Link to="/trade-in" className="xs-trade-banner">
        <span className="xs-trade-banner-icon"><Repeat2 size={22} aria-hidden="true" /></span>
        <span className="xs-trade-banner-text">
          <strong>{isAr ? 'مش عايز تبيع؟ بدّل عقارك' : 'Rather swap than sell?'}</strong>
          <small>{isAr ? 'شقتك بفيلا، أرضك بعمارة للعيلة — نطابقك مع عروض بدل حقيقية بفرق كاش أو رأس برأس.' : 'Your apartment for a villa, land for a family building — matched with real swap offers.'}</small>
        </span>
        <span className="xs-trade-banner-cta">{isAr ? 'ابدأ البدل ←' : 'Start →'}</span>
      </Link>

      {/* «عندك عقار للبيع؟»: matching published requests for an owner's property */}
      <OwnerMatchSearch
        isAr={isAr}
        areas={areas}
        search={search}
        onChange={(next) => { setSearch(next); setOwnerMatchesFound(null); }}
        result={ownerMatchesFound}
        onSearch={runOwnerSearch}
        onShowAll={showAll}
        onListProperty={() => {
          setSellerAnswers?.(prev => ({ ...prev, propertyType: search.type || 'apartment', area: search.area || '' }));
          navigateTo('valuation');
        }}
      />

      {/* 🏷️ Quick Category Navigation Pills with Live Counts */}
      <div id="demand-results" style={{ scrollMarginTop: '96px', 
        display: 'flex', 
        gap: '8px', 
        overflowX: 'auto', 
        paddingBottom: '8px', 
        marginBottom: '16px',
        scrollbarWidth: 'none'
      }}>
        {[
          { id: 'all', label_ar: 'كل الطلبات', label_en: 'All requests', count: allPublished.length },
          ...DEMAND_CATEGORIES.map((c) => ({ ...c, count: allPublished.filter(d => c.test(d.type)).length }))
        ].filter((cat) => cat.count > 0 || !['agricultural', 'industrial'].includes(cat.id)).map(cat => {
          const isActive = selectedCategory === cat.id && activeAreaFilter === 'all';
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setActiveAreaFilter('all');
                setIsFilterActive(cat.id !== 'all');
                if (ownerMatchesFound !== null) setOwnerMatchesFound(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '24px',
                border: isActive ? '1.5px solid var(--primary, #0d48a1)' : '1px solid #e2e8f0',
                background: isActive ? 'var(--primary, #0d48a1)' : '#ffffff',
                color: isActive ? '#ffffff' : '#334155',
                fontSize: '0.84rem',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 2px 8px rgba(13, 72, 161, 0.2)' : 'none'
              }}
            >
              <span>{isAr ? cat.label_ar : cat.label_en}</span>
              <span style={{
                fontSize: '0.74rem',
                padding: '2px 7px',
                borderRadius: '12px',
                background: isActive ? 'rgba(255, 255, 255, 0.25)' : '#f1f5f9',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: '800'
              }}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Filter Notice */}
      {isFilterActive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          marginBottom: '20px',
          fontSize: '0.86rem'
        }}>
          <span style={{ color: '#1e40af', fontWeight: '700' }}>
            🔍 {isAr ? `نتائج التصفية الحالية: يعرض ${displayedDemands.length} طلب مطابق` : `Active filter: showing ${displayedDemands.length} matching requests`}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setActiveAreaFilter('all');
              setIsFilterActive(false);
              setOwnerMatchesFound(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              fontWeight: '800',
              cursor: 'pointer',
              fontSize: '0.84rem'
            }}
          >
            ✕ {isAr ? 'إلغاء التصفية وعرض الكل' : 'Clear filter'}
          </button>
        </div>
      )}

      {/* Demands List Grid */}
      {displayedDemands.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px dashed #cbd5e1'
        }}>
          <AlertCircle size={36} color="#d97706" style={{ margin: '0 auto 12px auto' }} />
          <h4 style={{ fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
            {isAr ? 'مفيش طلبات بالاختيار ده دلوقتي' : 'No demands match this filter'}
          </h4>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
            {isAr ? 'شوف كل الطلبات، أو لو بتدوّر على عقار اكتب طلبك مجاناً.' : 'Clear filter to see all demands or submit your request.'}
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setSelectedCategory('all');
              setActiveAreaFilter('all');
              setIsFilterActive(false);
            }}
          >
            {isAr ? 'كل الطلبات' : 'All requests'}
          </button>
        </div>
      ) : (
        <div className="demands-grid">
          {displayedDemands.map((dem) => {
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

                {/* Card Header: Property Type Tag + Credible Status Pill */}
                <div className="demand-card-header">
                  <span className="demand-type-tag">
                    <TypeIcon size={14} style={{ color: '#ffd700', flexShrink: 0 }} />
                    <span>{typeBadge.label}</span>
                  </span>

                  {dem.isDemo ? (
                    <span className="demand-urgency-pill urgent-medium" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#b45309', border: '1px solid rgba(217, 119, 6, 0.25)' }}>
                      <Sparkles size={12} style={{ color: '#d97706', flexShrink: 0 }} />
                      <span>{isAr ? 'طلب استرشادي معتمد' : 'Verified Benchmark'}</span>
                    </span>
                  ) : (
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
                  )}
                </div>

                {/* Card Body: Demand Text in a stylized box */}
                <div className="demand-description-box">
                  <p className="demand-description-text">
                    {isAr ? dem.text_ar : dem.text_en}
                  </p>
                </div>

                {/* Specs & Meta Bar: Area + Budget + Timestamp */}
                <div>
                  <div className="demand-meta-specs-bar">
                    <div className="demand-meta-spec-item" title={isAr ? 'منطقة الطلب' : 'Location'}>
                      <MapPin size={15} style={{ color: '#0284c7', flexShrink: 0 }} />
                      <span style={{ fontWeight: '700' }}>{areaName}</span>
                    </div>

                    <div className="demand-budget-badge" title={isAr ? 'الميزانية المرصودة' : 'Allocated Budget'}>
                      <Coins size={14} style={{ flexShrink: 0 }} />
                      <span>{formattedBudget} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>

                    {!dem.isDemo && (
                      <div 
                        className="demand-meta-spec-item" 
                        style={{ fontSize: '0.78rem', color: '#64748b' }}
                        title={isAr ? 'تاريخ النشر' : 'Published'}
                      >
                        <Clock size={13} style={{ flexShrink: 0 }} />
                        <span>{recordTimeLabel(dem, isAr)}</span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Action Buttons */}
                  <div className="demand-action-buttons">
                    {/* Primary: Match property with pre-filled specs */}
                    <button 
                      className="btn-match-property-modern"
                      onClick={() => {
                        setSellerAnswers(prev => ({
                          ...prev,
                          propertyType: dem.type === 'commercial' ? 'retail' : dem.type,
                          area: dem.area || areaFromText(dem.area_ar, areas)
                        }));
                        navigateTo('valuation');
                        triggerToast?.(isAr ? 'تم اختيار مواصفات الطلب! أكمل عقارك للمطابقة الفورية.' : 'Demand selected! Fill property specs.');
                      }}
                    >
                      <CheckCircle2 size={16} />
                      <span>{isAr ? 'عقاري يطابق هذا الطلب' : 'Match My Property'}</span>
                    </button>

                    {/* Secondary: Refer Owner with professional modal */}
                    <button 
                      className="btn-refer-owner-modern"
                      onClick={() => setReferringDemand(dem)}
                      title={isAr ? 'أعرف مالكاً لديه عقار مطابق وأود ترشيحه' : 'Refer an owner'}
                    >
                      <Users size={15} />
                      <span>{isAr ? 'أعرف مالكاً' : 'Refer Owner'}</span>
                    </button>

                    {/* Tertiary: Viral Social Referral loop via WhatsApp */}
                    <button
                      type="button"
                      onClick={() => {
                        const shareUrl = siteLink('/demands');
                        const text = isAr
                          ? `🔥 فرصة بيع مباشرة في سوهاج على منصة 1Line:\n${dem.text_ar}\n💰 الميزانية: ${formattedBudget} ج.م\n📍 المنطقة: ${areaName}\n\nإذا كان لديك عقار مطابق أو تعرف مالكاً، يمكنك المطابقة والتواصل فوراً هنا:\n${shareUrl}`
                          : `Buyer Demand in Sohag on 1Line:\n${dem.text_en}\nBudget: ${formattedBudget} EGP\n${shareUrl}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      style={{
                        background: 'rgba(37, 211, 102, 0.08)',
                        border: '1px solid rgba(37, 211, 102, 0.28)',
                        color: '#128C4A',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.82rem',
                        fontWeight: '700'
                      }}
                      title={isAr ? 'مشاركة هذا الطلب عبر واتساب' : 'Share on WhatsApp'}
                    >
                      <MessageCircle size={15} />
                      <span>{isAr ? 'مشاركة' : 'Share'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🤝 Professional Refer Owner Modal (Replaces amateur window.prompt) */}
      {referringDemand && (
        <div 
          className="track-modal-backdrop" 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReferringDemand(null);
          }} 
          style={{ zIndex: 1200 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="track-modal-card" style={{ maxWidth: '520px' }}>
            <div className="track-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="var(--primary, #0d48a1)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>
                  {isAr ? 'ترشيح مالك عقار مطابق' : 'Refer a Matching Property Owner'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setReferringDemand(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 14px',
              margin: '14px 0',
              fontSize: '0.85rem',
              color: '#334155',
              lineHeight: 1.5
            }}>
              <span style={{ fontWeight: '700', color: '#0d48a1', display: 'block', marginBottom: '4px' }}>
                📌 {isAr ? 'الطلب المراد ترشيح عقار له:' : 'Target Demand:'}
              </span>
              {isAr ? referringDemand.text_ar : referringDemand.text_en}
            </div>

            <form onSubmit={handleReferralSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                  {isAr ? 'اسمك الكريم (المُوصي / الوسيط) *' : 'Your Name *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'مثال: أسامة محمود' : 'Your Name'}
                    className="form-input"
                    value={referralForm.name}
                    onChange={(e) => setReferralForm({ ...referralForm, name: e.target.value })}
                    style={{ width: '100%', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                  {isAr ? 'رقم هاتفك للتواصل ومكافأة الإحالة *' : 'Your Phone Number *'}
                </label>
                <input
                  type="tel"
                  required
                  placeholder={isAr ? '010 1234 5678 أو مع كود الدولة' : 'Phone Number'}
                  className="form-input"
                  value={referralForm.phone}
                  onChange={(e) => setReferralForm({ ...referralForm, phone: e.target.value })}
                  style={{ width: '100%', borderRadius: '8px', direction: 'ltr', textAlign: isAr ? 'right' : 'left' }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                  {isAr ? 'مواصفات العقار وبيانات المالك المقترح (اختياري)' : 'Property Details & Owner Info (Optional)'}
                </label>
                <textarea
                  rows="3"
                  placeholder={isAr ? 'مثال: العقار شقة 150م بنفس الشارع، المالك أ/ أحمد ورقم هاتفه 010...' : 'Details about the suggested unit...'}
                  className="form-input"
                  value={referralForm.propertyNotes}
                  onChange={(e) => setReferralForm({ ...referralForm, propertyNotes: e.target.value })}
                  style={{ width: '100%', borderRadius: '8px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setReferringDemand(null)}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingReferral}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={15} />
                  <span>{isSubmittingReferral ? (isAr ? 'جارٍ الإرسال…' : 'Sending…') : (isAr ? 'إرسال الترشيح وتأكيد المكافأة' : 'Submit Referral')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandsPortal;
