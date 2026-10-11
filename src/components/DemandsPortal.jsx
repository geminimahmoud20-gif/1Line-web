import { useMemo, useState } from 'react';
import { Zap, Search, Sparkles, CheckCircle, CheckCircle2, AlertCircle, MapPin, Clock, Building2, Home, Store, Briefcase, Compass, Users, Coins, Flame, Repeat2, Share2, X, MessageSquare, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAreas } from '../utils/areasData';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import { sanitizePhoneNumber } from './SellWizard';
import '../styles/expat-suite.css';
import { recordTimeLabel } from '../utils/relativeTime';

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
  const [referralDemand, setReferralDemand] = useState(null);
  const [referralName, setReferralName] = useState('');
  const [referralPhone, setReferralPhone] = useState('');
  const [referralOwnerPhone, setReferralOwnerPhone] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);

  const isFilterActive = Boolean(
    (ownerSearch?.propertyType && ownerSearch.propertyType !== 'all') ||
    (ownerSearch?.area && ownerSearch.area !== 'all')
  );

  const handleMatchProperty = (dem) => {
    setSellerAnswers(prev => ({
      ...prev,
      propertyType: dem.type,
      area: dem.area || (dem.area_ar?.includes('شرق') ? 'east' : dem.area_ar?.includes('جديدة') ? 'new_sohag' : dem.area_ar?.includes('كوثر') ? 'kawthar' : 'center')
    }));
    navigateTo('valuation');
    triggerToast(lang === 'ar' ? 'تم اختيار الطلب! أكمل مواصفات عقارك لمطابقته فوراً.' : 'Demand selected! Enter your specs.');
  };

  const handleContactDemand = (dem) => {
    const areaName = getAreaName(dem);
    const typeBadge = getPropertyTypeBadge(dem.type);
    const budget = formatBudget(dem.budget);
    const demandCode = dem.id ? `#${dem.id}` : '';
    const msg = lang === 'ar'
      ? `مرحباً 1Line 👋\nاستفسار بخصوص طلب الشراء ${demandCode} (${typeBadge.label} في ${areaName} بميزانية ${budget} ج.م).\nلدي عقار مطابق / أرغب في التواصل والتنسيق مع المشتري.`
      : `Hello 1Line 👋\nInquiring about buyer demand ${demandCode} (${typeBadge.label} in ${areaName}, budget ${budget} EGP) for matching.`;
    window.open(getWhatsAppUrl(msg), '_blank', 'noopener,noreferrer');
  };

  const handleShareDemand = (dem) => {
    const areaName = getAreaName(dem);
    const typeBadge = getPropertyTypeBadge(dem.type);
    const budget = formatBudget(dem.budget);
    const textBrief = lang === 'ar' ? (dem.text_ar || dem.text_en) : (dem.text_en || dem.text_ar);
    const demandUrl = `${window.location.origin}/portals/demands`;

    const shareText = lang === 'ar'
      ? `🚨 *مطلوب مشترٍ جاد على منصة 1Line العقارية (سوهاج)*\n\n` +
        `🏢 *النوع:* ${typeBadge.label}\n` +
        `📍 *المنطقة:* ${areaName}\n` +
        `💰 *الميزانية:* ${budget} ج.م كاش ومتاح تمويل\n` +
        `📋 *المواصفات المطلوبة:* ${textBrief}\n\n` +
        `لو عندك عقار يطابق هذا الطلب أو تعرف مالكاً له، تواصل فوراً:\n${demandUrl}`
      : `🚨 *Active Buyer Demand on 1Line Sohag*\n\n` +
        `🏢 *Type:* ${typeBadge.label}\n` +
        `📍 *Area:* ${areaName}\n` +
        `💰 *Budget:* ${budget} EGP\n` +
        `📋 *Details:* ${textBrief}\n\n` +
        `View on 1Line: ${demandUrl}`;

    const shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitReferral = async (e) => {
    e.preventDefault();
    const cleanUserPhone = sanitizePhoneNumber(referralPhone);
    if (!cleanUserPhone || cleanUserPhone.length < 10) {
      triggerToast(lang === 'ar' ? 'يرجى إدخال رقم هاتفك بشكل صحيح (10 أرقام على الأقل)' : 'Please enter a valid phone number', 'warning');
      return;
    }
    if (!referralName.trim()) {
      triggerToast(lang === 'ar' ? 'يرجى إدخال اسمك الكريم' : 'Please enter your name', 'warning');
      return;
    }

    setIsSubmittingReferral(true);
    try {
      const cleanOwnerPhone = referralOwnerPhone ? sanitizePhoneNumber(referralOwnerPhone) : '';
      const demandCode = referralDemand?.id ? `#${referralDemand.id}` : '';
      const demandType = getPropertyTypeBadge(referralDemand?.type).label;
      const demandArea = getAreaName(referralDemand);
      const demandBudget = formatBudget(referralDemand?.budget);

      const leadNotes = [
        `🤝 إحالة/توصية بمالك عقار مطابق للطلب ${demandCode} (${demandType} في ${demandArea} - ميزانية: ${demandBudget} ج.م)`,
        `👤 اسم الموصي (الشريك): ${referralName.trim()}`,
        `📱 هاتف الموصي: ${cleanUserPhone}`,
        cleanOwnerPhone ? `📞 هاتف المالك المقترح: ${cleanOwnerPhone}` : '📞 هاتف المالك: لم يُحدد',
        referralNotes.trim() ? `📝 تفاصيل ومواصفات الوحدة المقترحة: ${referralNotes.trim()}` : null,
        `⏰ وقت التسجيل: ${new Date().toLocaleString('ar-EG')}`
      ].filter(Boolean).join('\n');

      if (handleAddNewLead) {
        await handleAddNewLead({
          name: referralName.trim(),
          phone: cleanUserPhone,
          whatsapp: cleanUserPhone,
          type: 'referral',
          source: `توصية طلب مشتري ${demandCode}`,
          propertyType: referralDemand?.type || 'residential',
          area: referralDemand?.area || 'new_sohag',
          notes: leadNotes,
          details: {
            demandId: referralDemand?.id,
            referralOwnerPhone: cleanOwnerPhone,
            notes: referralNotes.trim()
          }
        });
      }

      triggerToast(
        lang === 'ar' 
          ? 'تم تسجيل توصيتك بنجاح! تم حفظ البيانات بسجل الإحالات وسيتواصل معك مستشار الصفقة.' 
          : 'Referral submitted successfully! Our advisor will contact you.',
        'success'
      );
      setReferralDemand(null);
      setReferralName('');
      setReferralPhone('');
      setReferralOwnerPhone('');
      setReferralNotes('');
    } catch (err) {
      console.error('Referral submit error:', err);
      triggerToast(lang === 'ar' ? 'حدث خطأ أثناء الإرسال، يرجى المحاولة مرة أخرى' : 'Failed to submit referral', 'error');
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  const publishedDemands = useMemo(() => {
    const pub = demands.filter(d => (d.status || 'published') === 'published');
    return pub.sort((a, b) => {
      const timeA = new Date(a.approvedAt || a.createdAt || a.timestamp || 0).getTime();
      const timeB = new Date(b.approvedAt || b.createdAt || b.timestamp || 0).getTime();
      return timeB - timeA;
    });
  }, [demands]);

  // Dynamically filtered demands matching top search widget selections
  const filteredDemands = useMemo(() => {
    return publishedDemands.filter((d) => {
      // 1. Property Type Matching
      const typeFilter = ownerSearch?.propertyType || 'all';
      let matchesType = true;
      if (typeFilter && typeFilter !== 'all') {
        if (typeFilter === 'retail' || typeFilter === 'commercial') {
          matchesType = ['retail', 'commercial', 'shop'].includes(d.type);
        } else if (typeFilter === 'office') {
          matchesType = ['office', 'administrative', 'clinic'].includes(d.type);
        } else {
          matchesType = d.type === typeFilter;
        }
      }

      // 2. Area Location Matching
      const areaFilter = ownerSearch?.area || 'all';
      let matchesArea = true;
      if (areaFilter && areaFilter !== 'all') {
        matchesArea = 
          d.area === areaFilter ||
          (d.area_ar && d.area_ar.includes(areaFilter)) ||
          (areaFilter === 'east' && d.area_ar?.includes('شرق')) ||
          (areaFilter === 'new_sohag' && (d.area_ar?.includes('الجديدة') || d.area_ar?.includes('سوهاج الجديدة'))) ||
          (areaFilter === 'corniche' && d.area_ar?.includes('كورنيش')) ||
          (areaFilter === 'thakafa' && (d.area_ar?.includes('الثقافة') || d.area_ar?.includes('المخبز'))) ||
          (areaFilter === 'kawthar' && d.area_ar?.includes('الكوثر')) ||
          (areaFilter === 'center' && (d.area_ar?.includes('البلد') || d.area_ar?.includes('الجامعة') || d.area_ar?.includes('وسط')));
      }

      return matchesType && matchesArea;
    });
  }, [publishedDemands, ownerSearch?.propertyType, ownerSearch?.area]);

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
      return budget.toLocaleString('en-US');
    }
    const parsed = parseInt(String(budget || 0).replace(/,/g, ''), 10);
    return isNaN(parsed) ? budget : parsed.toLocaleString('en-US');
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '10px 0' }}>
      {/* The page header above already titles this portal: only the call to action here */}
      {onOpenAddDemand && (
        <div className="demands-add-cta">
          <button type="button" className="btn btn-primary" onClick={onOpenAddDemand}>
            <Sparkles size={17} aria-hidden="true" />
            <span>{lang === 'ar' ? 'أضف طلبك العقاري الآن (مجاناً)' : 'Post Your Buyer Request Now'}</span>
          </button>
        </div>
      )}

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
              value={ownerSearch?.propertyType || 'all'}
              onChange={(e) => {
                setOwnerSearch({ ...ownerSearch, propertyType: e.target.value });
                setOwnerMatchesFound(null);
              }}
            >
              <option value="all">{lang === 'ar' ? 'جميع أنواع العقارات (الكل)' : 'All Property Types'}</option>
              <option value="apartment">{lang === 'ar' ? 'شقق سكنية' : 'Apartment'}</option>
              <option value="villa">{lang === 'ar' ? 'فيلات ومنازل مستقلة' : 'Villa / House'}</option>
              <option value="retail">{lang === 'ar' ? 'محلات وتجاري' : 'Retail / Commercial'}</option>
              <option value="office">{lang === 'ar' ? 'مكاتب إدارية وعيادات' : 'Office / Clinic'}</option>
              <option value="land">{lang === 'ar' ? 'أراضي مباني واستثمار' : 'Land Plot'}</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-secondary, #475569)' }}>
              {t.stepArea}
            </label>
            <select 
              className="form-input"
              style={{ height: '46px', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}
              value={ownerSearch?.area || 'all'}
              onChange={(e) => {
                setOwnerSearch({ ...ownerSearch, area: e.target.value });
                setOwnerMatchesFound(null);
              }}
            >
              <option value="all">{lang === 'ar' ? 'جميع مناطق سوهاج (الكل)' : 'All Sohag Areas'}</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>
                  {lang === 'ar' ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-primary" 
              disabled={isScanningMap}
              style={{ 
                height: '46px', 
                flex: 1,
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
                  setScanningMessage(lang === 'ar' ? 'تصفية ومطابقة طلبات المشترين النشطين بمخزن البيانات...' : 'Analyzing active buyer profiles...');
                  setTimeout(() => {
                    const matchedCount = filteredDemands.length;
                    setOwnerMatchesFound(matchedCount);
                    setIsScanningMap(false);
                    // Scroll smoothly to results section
                    const listSection = document.getElementById('demands-list-section');
                    if (listSection) {
                      listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 650);
                }, 650);
              }}
            >
              <Sparkles size={17} />
              <span>{lang === 'ar' ? 'ابحث عن مشترين مطابقين' : 'Search Matching Buyers'}</span>
            </button>

            {(ownerSearch?.propertyType !== 'all' || ownerSearch?.area !== 'all') && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setOwnerSearch({ propertyType: 'all', area: 'all' });
                  setOwnerMatchesFound(null);
                }}
                style={{
                  height: '46px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  fontWeight: '700'
                }}
                title={lang === 'ar' ? 'إعادة ضبط الفلتر' : 'Reset Filter'}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
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

      {/* Demands List Grid Section Anchor */}
      <div id="demands-list-section" style={{ scrollMarginTop: '100px' }}>
        {/* Dynamic Filter Status Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          padding: '14px 20px',
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid rgba(13, 72, 161, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary, #0f172a)' }}>
              {lang === 'ar' ? 'طلبات المشترين النشطة' : 'Active Buyer Demands'}
            </span>
            <span style={{
              background: 'rgba(13, 72, 161, 0.08)',
              color: 'var(--primary, #0d48a1)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.82rem',
              fontWeight: 800
            }}>
              {lang === 'ar'
                ? `عرض ${filteredDemands.length} من أصل ${publishedDemands.length} طلب شراء معتمد`
                : `Showing ${filteredDemands.length} of ${publishedDemands.length} verified demands`}
            </span>

            {isFilterActive && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {ownerSearch.propertyType !== 'all' && (
                  <span style={{
                    fontSize: '0.78rem',
                    background: '#f1f5f9',
                    padding: '3px 9px',
                    borderRadius: '8px',
                    color: '#334155',
                    fontWeight: 700
                  }}>
                    {getPropertyTypeBadge(ownerSearch.propertyType).label}
                  </span>
                )}
                {ownerSearch.area !== 'all' && (
                  <span style={{
                    fontSize: '0.78rem',
                    background: '#f1f5f9',
                    padding: '3px 9px',
                    borderRadius: '8px',
                    color: '#334155',
                    fontWeight: 700
                  }}>
                    {areas.find(a => a.id === ownerSearch.area)?.name_ar || ownerSearch.area}
                  </span>
                )}
              </div>
            )}
          </div>

          {isFilterActive && (
            <button
              type="button"
              onClick={() => {
                setOwnerSearch({ propertyType: 'all', area: 'all' });
                setOwnerMatchesFound(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <RotateCcw size={14} />
              <span>{lang === 'ar' ? 'إلغاء التصفية وعرض الكل' : 'Clear filters & show all'}</span>
            </button>
          )}
        </div>

        {/* Empty State when zero results match active filter */}
        {filteredDemands.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            border: '1.5px dashed #cbd5e1',
            margin: '20px 0'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: '#64748b'
            }}>
              <Search size={30} />
            </div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              {lang === 'ar' ? 'لا توجد طلبات شراء تطابق هذا الفلتر حالياً' : 'No buyer demands match your current filter'}
            </h4>
            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              {lang === 'ar'
                ? 'جرب اختيار منطقة أخرى أو جميع الأنواع، أو سجل طلبك العقاري الخاص وسيقوم فريقنا بالبحث لك فوراً.'
                : 'Try clearing the filter or post a new request and our team will match it for you.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setOwnerSearch({ propertyType: 'all', area: 'all' });
                  setOwnerMatchesFound(null);
                }}
                style={{ fontWeight: 700 }}
              >
                <RotateCcw size={16} />
                <span>{lang === 'ar' ? 'عرض جميع طلبات المشترين' : 'Show All Demands'}</span>
              </button>
              {onOpenAddDemand && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onOpenAddDemand}
                  style={{ fontWeight: 800 }}
                >
                  <Sparkles size={16} />
                  <span>{lang === 'ar' ? 'أضف طلبك العقاري مجاناً' : 'Post Request'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="demands-grid">
            {filteredDemands.map((dem) => {
              const typeBadge = getPropertyTypeBadge(dem.type);
              const urgencyBadge = getUrgencyBadge(dem.urgency);
              const areaName = getAreaName(dem);
              const formattedBudget = formatBudget(dem.budget);
              const TypeIcon = typeBadge.Icon;

              return (
                <div key={dem.id} className="demand-card">
                  {/* Dynamic Urgency Top Accent Bar */}
                  {!dem.isDemo && (
                    <div 
                      className="demand-card-accent-bar" 
                      style={{ 
                        background: `linear-gradient(90deg, ${urgencyBadge.accentColor} 0%, transparent 100%)` 
                      }} 
                    />
                  )}

                  {/* Card Header: Property Type Tag + Urgency Pill */}
                  <div className="demand-card-header">
                    <span className="demand-type-tag">
                      <TypeIcon size={14} style={{ color: '#ffd700', flexShrink: 0 }} />
                      <span>{typeBadge.label}</span>
                    </span>
                    {dem.isDemo && <span className="xs-demo-tag">{lang === 'ar' ? 'مثال توضيحي' : 'Sample'}</span>}

                    {!dem.isDemo && <span className={`demand-urgency-pill ${urgencyBadge.className}`}>
                      {urgencyBadge.hasPulse ? (
                        <span 
                          className="demand-pulse-dot" 
                          style={{ background: urgencyBadge.dotColor }} 
                        />
                      ) : (
                        <Flame size={12} style={{ color: urgencyBadge.accentColor, flexShrink: 0 }} />
                      )}
                      <span>{urgencyBadge.label}</span>
                    </span>}
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

                      {!dem.isDemo && (
                        <div 
                          className="demand-meta-spec-item" 
                          style={{ fontSize: '0.78rem', color: '#64748b' }}
                          title={lang === 'ar' ? 'تاريخ النشر' : 'Published'}
                        >
                          <Clock size={13} style={{ flexShrink: 0 }} />
                          <span>{recordTimeLabel(dem, lang === 'ar')}</span>
                        </div>
                      )}
                    </div>

                    {/* Standardized 4 Action Buttons — Clean Layout, No duplicate 'Add Demand' */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                      {/* Row 1: Direct Match CTA + Details & Contact */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button 
                          type="button"
                          className="btn-match-property-modern"
                          onClick={() => handleMatchProperty(dem)}
                          title={lang === 'ar' ? 'سجل مواصفات عقارك لمطابقته فوراً مع المشتري' : 'Match My Property'}
                          style={{ padding: '9px 10px', fontSize: '0.84rem' }}
                        >
                          <CheckCircle2 size={15} />
                          <span>{lang === 'ar' ? 'لدي عقار مطابق' : 'I Have Match'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleContactDemand(dem)}
                          title={lang === 'ar' ? 'تواصل مع المستشار لمناقشة ومطابقة هذا الطلب' : 'Inquire on Demand'}
                          style={{
                            background: '#f8fafc',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '12px',
                            color: '#0f172a',
                            padding: '9px 10px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <MessageSquare size={14} style={{ color: '#0284c7' }} />
                          <span>{lang === 'ar' ? 'تفاصيل / تواصل' : 'Inquire / Match'}</span>
                        </button>
                      </div>

                      {/* Row 2: Refer an Owner (Reward) + Quick WhatsApp Share */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button 
                          type="button"
                          className="btn-refer-owner-modern"
                          onClick={() => setReferralDemand(dem)}
                          title={lang === 'ar' ? 'توصية بمالك عقار والحصول على عمولة الإحالة الرسمية' : 'Refer Owner'}
                          style={{ padding: '8px 10px', fontSize: '0.82rem' }}
                        >
                          <Users size={14} style={{ color: '#d97706' }} />
                          <span>{lang === 'ar' ? 'أعرف مالكاً' : 'Refer Owner'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareDemand(dem)}
                          title={lang === 'ar' ? 'مشاركة نص ورابط الطلب عبر واتساب' : 'Share on WhatsApp'}
                          style={{
                            background: 'rgba(37, 211, 102, 0.08)',
                            border: '1px solid rgba(37, 211, 102, 0.35)',
                            borderRadius: '12px',
                            color: '#15803d',
                            padding: '8px 10px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Share2 size={14} />
                          <span>{lang === 'ar' ? 'مشاركة الطلب' : 'Share'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🤝 High-End Luxury In-App Modal for Referring a Property Owner */}
      {referralDemand && (
        <div 
          className="track-modal-backdrop" 
          onClick={() => !isSubmittingReferral && setReferralDemand(null)} 
          style={{
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.72)', 
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 9999, 
            padding: '16px'
          }}
        >
          <div 
            style={{
              background: 'var(--bg-card, #ffffff)', 
              borderRadius: '24px', 
              maxWidth: '500px', 
              width: '100%',
              padding: '28px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
              position: 'relative',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxHeight: '92vh',
              overflowY: 'auto'
            }} 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(217, 119, 6, 0.1)',
                  color: '#b45309',
                  borderRadius: '20px',
                  padding: '3px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  marginBottom: '6px'
                }}>
                  <Sparkles size={12} />
                  {lang === 'ar' ? 'برنامج مكافآت الإحالة المعتمد من 1Line' : 'Official Referral Reward'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                  🤝 {lang === 'ar' ? 'التوصية بمالك عقار مطابق' : 'Refer a Matching Property Owner'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReferralDemand(null)}
                disabled={isSubmittingReferral}
                style={{ 
                  background: '#f1f5f9', 
                  border: 'none', 
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer', 
                  color: '#64748b' 
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Demand Highlight Box */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(13, 72, 161, 0.05) 0%, rgba(255, 202, 40, 0.08) 100%)',
              borderRadius: '14px',
              padding: '12px 14px',
              marginBottom: '18px',
              border: '1px solid rgba(13, 72, 161, 0.12)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(13, 72, 161, 0.1)',
                color: '#0d48a1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Building2 size={20} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a' }}>
                  {getPropertyTypeBadge(referralDemand.type).label} — {getAreaName(referralDemand)}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <span>الميزانية: <strong style={{ color: '#047857' }}>{formatBudget(referralDemand.budget)} ج.م</strong></span>
                  {referralDemand.id && <span>• كود: #{referralDemand.id}</span>}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
              {lang === 'ar'
                ? 'تعرف شخصاً يمتلك عقاراً يطابق هذا الطلب؟ سجل بياناتك وبيانات المالك، وسيقوم مستشار 1Line بالتواصل معه رسمياً، وعند إتمام الصفقة تستحق عمولة ومكافأة الإحالة المعتمدة.'
                : 'Know someone who owns a matching property? Submit their details to earn a verified referral reward upon closing.'}
            </p>

            <form onSubmit={handleSubmitReferral}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                    {lang === 'ar' ? 'اسمك بالكامل (الموصي) *' : 'Your Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'ar' ? 'مثال: أحمد عبد الله' : 'Your Name'}
                    className="form-input"
                    style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}
                    value={referralName}
                    onChange={e => setReferralName(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                    {lang === 'ar' ? 'رقم هاتفك للتواصل ومكافأة الإحالة *' : 'Your Phone Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="010XXXXXXXX"
                    className="form-input"
                    style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1.5px solid #cbd5e1', direction: 'ltr', textAlign: 'right' }}
                    value={referralPhone}
                    onChange={e => setReferralPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                    {lang === 'ar' ? 'رقم هاتف المالك المقترح (إن وجد)' : 'Owner Phone Number (Optional)'}
                  </label>
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    className="form-input"
                    style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1.5px solid #cbd5e1', direction: 'ltr', textAlign: 'right' }}
                    value={referralOwnerPhone}
                    onChange={e => setReferralOwnerPhone(e.target.value)}
                  />
                  <small style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                    {lang === 'ar' ? 'سنتواصل معه بصفة استشارية رسمية دون أي إحراج.' : 'We will reach out professionally.'}
                  </small>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#334155' }}>
                    {lang === 'ar' ? 'تفاصيل ومواصفات العقار المقترح' : 'Property Details & Location'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={lang === 'ar' ? 'الموقع التقريبي، المساحة، السعر التقريبي، الدور، أو أي تفاصيل...' : 'Location, area, asking price, floor...'}
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #cbd5e1', resize: 'vertical' }}
                    value={referralNotes}
                    onChange={e => setReferralNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Trust Guarantee Note */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '16px',
                fontSize: '0.75rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>
                  {lang === 'ar'
                    ? 'عمولة الإحالة مضمونة وموثقة بسجلات CRM فور إتمام الصفقة، مع الحفاظ الكامل على سرية بياناتك.'
                    : 'Referral rewards are documented and guaranteed upon deal closure with strict confidentiality.'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={isSubmittingReferral}
                  onClick={() => setReferralDemand(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: '#fff',
                    color: '#64748b',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReferral}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isSubmittingReferral ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span>{lang === 'ar' ? 'جاري التسجيل...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{lang === 'ar' ? 'إرسال التوصية وتوثيق المكافأة' : 'Submit Referral'}</span>
                    </>
                  )}
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
