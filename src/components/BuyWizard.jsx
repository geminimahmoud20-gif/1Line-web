import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building, 
  Home, 
  Store, 
  Briefcase, 
  MapPin, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';
import PhoneInputField, { SUPPORTED_COUNTRIES } from './PhoneInputField';
import { getAreas } from '../utils/areasData';

export const BuyWizard = ({ 
  lang = 'ar', 
  t, 
  buyerStep = 1, 
  setBuyerStep, 
  buyerAnswers = {}, 
  setBuyerAnswers, 
  handleBuyerChoice, 
  submitBuyerJourney 
}) => {
  const [currentPhase, setCurrentPhase] = useState(1); // 1: Purpose & Type, 2: Budget & Payment, 3: Contact & Matching
  const [buyerCountry, setBuyerCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [whatsappError, setWhatsappError] = useState('');

  const isAr = lang === 'ar';

  const validateAndSubmit = (e) => {
    e.preventDefault();

    const cleanPhone = (buyerAnswers.phone || '').trim().replace(/[\s\-\(\)]/g, '');
    const cleanWhatsapp = (buyerAnswers.whatsapp || '').trim().replace(/[\s\-\(\)]/g, '');

    // Check phone format
    const phoneCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === buyerCountry);
    const isPhoneValid = phoneCountryObj ? phoneCountryObj.regex.test(cleanPhone) : true;
    
    let isWhatsappValid = true;
    if (cleanWhatsapp) {
      const whatsappCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === whatsappCountry);
      isWhatsappValid = whatsappCountryObj ? whatsappCountryObj.regex.test(cleanWhatsapp) : true;
    }

    if (!isPhoneValid) {
      setPhoneError(isAr ? 'رقم الهاتف غير متوافق مع صيغة الدولة المحددة' : 'Phone number does not match country format');
      return;
    }
    
    if (cleanWhatsapp && !isWhatsappValid) {
      setWhatsappError(isAr ? 'رقم الواتساب غير متوافق مع صيغة الدولة المحددة' : 'WhatsApp number does not match country format');
      return;
    }

    const normalizedPhone = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
    const normalizedWhatsapp = cleanWhatsapp.startsWith('0') ? cleanWhatsapp.substring(1) : cleanWhatsapp;

    const updatedAnswers = {
      ...buyerAnswers,
      phone: `${buyerCountry}${normalizedPhone}`,
      whatsapp: cleanWhatsapp ? `${whatsappCountry}${normalizedWhatsapp}` : ''
    };

    submitBuyerJourney(updatedAnswers);
  };

  const propertyTypes = [
    { id: 'apartment', label_ar: 'شقة سكنية', label_en: 'Apartment', icon: Building, desc_ar: 'شقق وأدوار سكنية ودوبلكس' },
    { id: 'retail', label_ar: 'محل تجاري', label_en: 'Retail Shop', icon: Store, desc_ar: 'محلات ومساحات تجارية على شوارع رئيسية' },
    { id: 'villa', label_ar: 'فيلا / تاون هاوس', label_en: 'Villa', icon: Home, desc_ar: 'فيلات مستقلة وتاون هاوس في كمبوندات' },
    { id: 'office', label_ar: 'مكتب إداري / عيادة', label_en: 'Office / Clinic', icon: Briefcase, desc_ar: 'مقرات إدارية وعيادات طبية جاهزة' },
    { id: 'land', label_ar: 'قطعة أرض', label_en: 'Land Plot', icon: MapPin, desc_ar: 'أراضي مباني وتجارية بترخيص معتمد' }
  ];

  const [districts, setDistricts] = useState(() => getAreas());

  useEffect(() => {
    const handleAreasUpdate = () => {
      setDistricts(getAreas());
    };
    window.addEventListener('oneline_areas_updated', handleAreasUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleAreasUpdate);
  }, []);

  return (
    <div className="smart-valuation-wizard-box">
      {/* Modern 3-Phase Stepper */}
      <div className="wizard-phases-tracker">
        <div className={`phase-item ${currentPhase >= 1 ? 'active' : ''} ${currentPhase > 1 ? 'done' : ''}`}>
          <div className="phase-circle">{currentPhase > 1 ? '✓' : '1'}</div>
          <div className="phase-text">
            <span className="phase-title">{isAr ? 'المواصفات والنوع' : 'Property & Location'}</span>
            <span className="phase-sub">{isAr ? 'الهدف والمنطقة' : 'Purpose & District'}</span>
          </div>
        </div>

        <div className="phase-line" />

        <div className={`phase-item ${currentPhase >= 2 ? 'active' : ''} ${currentPhase > 2 ? 'done' : ''}`}>
          <div className="phase-circle">{currentPhase > 2 ? '✓' : '2'}</div>
          <div className="phase-text">
            <span className="phase-title">{isAr ? 'الميزانية وطريقة الدفع' : 'Budget & Financing'}</span>
            <span className="phase-sub">{isAr ? 'كاش أو تقسيط' : 'Cash or Installments'}</span>
          </div>
        </div>

        <div className="phase-line" />

        <div className={`phase-item ${currentPhase >= 3 ? 'active' : ''}`}>
          <div className="phase-circle">3</div>
          <div className="phase-text">
            <span className="phase-title">{isAr ? 'المطابقة والفرص' : 'Matches & Contact'}</span>
            <span className="phase-sub">{isAr ? 'استلام العروض' : 'Receive Units'}</span>
          </div>
        </div>
      </div>

      {/* PHASE 1: Purpose, Type & Location */}
      {currentPhase === 1 && (
        <div className="wizard-step-body animate-fadeIn">
          {/* Purpose Selector */}
          <div className="form-group-block">
            <label className="block-label">{isAr ? 'ما هو الغرض الأساسي من الشراء؟' : 'Primary Purchase Purpose'}</label>
            <div className="options-pill-grid">
              <button
                type="button"
                className={`opt-pill-btn ${(buyerAnswers.purpose || 'live') === 'live' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, purpose: 'live' })}
              >
                <Home size={16} className="text-primary" />
                <span>{isAr ? '🏡 سكن عائلي شخصي' : 'Personal Residence'}</span>
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${buyerAnswers.purpose === 'investment' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, purpose: 'investment' })}
              >
                <TrendingUp size={16} className="text-success" />
                <span>{isAr ? '📈 استثمار وتأجير بعائد شهري' : 'Rental Investment'}</span>
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${buyerAnswers.purpose === 'commercial' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, purpose: 'commercial' })}
              >
                <Briefcase size={16} className="text-gold" />
                <span>{isAr ? '💼 نشاط تجاري / مقر لشركتي' : 'Business Activity'}</span>
              </button>
            </div>
          </div>

          {/* Property Type Grid */}
          <div className="step-prompt-row">
            <label className="block-label">{isAr ? 'ما هو نوع العقار المطلوب؟' : 'Target Property Type'}</label>
          </div>
          <div className="prop-types-rich-grid">
            {propertyTypes.map((type) => {
              const IconComp = type.icon;
              const isSelected = (buyerAnswers.propertyType || 'apartment') === type.id;
              return (
                <div
                  key={type.id}
                  className={`prop-type-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleBuyerChoice('propertyType', type.id)}
                >
                  <div className="prop-type-icon">
                    <IconComp size={24} />
                  </div>
                  <div className="prop-type-info">
                    <h4>{isAr ? type.label_ar : type.label_en}</h4>
                    <p>{isAr ? type.desc_ar : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Location Selector */}
          <div className="form-group-block">
            <label className="block-label">{isAr ? 'المنطقة المفضلة داخل محافظة سوهاج' : 'Preferred District in Sohag'}</label>
            <select
              className="form-select-styled"
              value={buyerAnswers.area || 'east'}
              onChange={(e) => handleBuyerChoice('area', e.target.value)}
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {isAr ? (d.label_ar || d.name_ar) : (d.label_en || d.name_en)}
                </option>
              ))}
            </select>
          </div>

          <div className="wizard-actions-bar">
            <button
              type="button"
              className="btn btn-primary btn-next-phase"
              onClick={() => setCurrentPhase(2)}
            >
              <span>{isAr ? 'متابعة الميزانية وطريقة الدفع' : 'Continue to Budget & Payment'}</span>
              {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: Budget & Payment Method */}
      {currentPhase === 2 && (
        <div className="wizard-step-body animate-fadeIn">
          {/* Budget Range */}
          <div className="form-group-block">
            <label className="block-label">{isAr ? 'الميزانية الإجمالية المرصودة للشراء' : 'Total Planned Budget'}</label>
            <div className="options-pill-grid">
              <button
                type="button"
                className={`opt-pill-btn ${(buyerAnswers.budget || '1-2m') === '1-2m' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, budget: '1-2m' })}
              >
                {isAr ? 'من 1 إلى 2 مليون ج.م' : '1M - 2M EGP'}
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${buyerAnswers.budget === '2-3.5m' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, budget: '2-3.5m' })}
              >
                {isAr ? 'من 2 إلى 3.5 مليون ج.م' : '2M - 3.5M EGP'}
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${buyerAnswers.budget === '3.5-5m' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, budget: '3.5-5m' })}
              >
                {isAr ? 'من 3.5 إلى 5 مليون ج.م' : '3.5M - 5M EGP'}
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${buyerAnswers.budget === '5m+' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, budget: '5m+' })}
              >
                {isAr ? 'أكثر من 5 مليون ج.م (VIP)' : '5M+ EGP (VIP)'}
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="form-group-block">
            <label className="block-label">{isAr ? 'طريقة السداد وتفضيل الدفع' : 'Payment Preference'}</label>
            <div className="options-pill-grid">
              <button
                type="button"
                className={`opt-pill-btn ${(buyerAnswers.paymentMethod || 'cash') === 'cash' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, paymentMethod: 'cash' })}
              >
                <DollarSign size={16} className="text-success" />
                <span>{isAr ? 'كاش فوري (للحصول على أعلى خصم)' : 'Cash Handover'}</span>
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${buyerAnswers.paymentMethod === 'installment' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, paymentMethod: 'installment' })}
              >
                <CreditCard size={16} className="text-primary" />
                <span>{isAr ? 'تقسيط مريح (مقدم وأقساط حتى 7 سنوات)' : 'Installments up to 7 Yrs'}</span>
              </button>
            </div>
          </div>

          {/* Timeframe */}
          <div className="form-group-block">
            <label className="block-label">{isAr ? 'الموعد المخطط لإتمام الشراء والاستلام' : 'Purchase Timeline'}</label>
            <div className="options-pill-grid">
              <button
                type="button"
                className={`opt-pill-btn ${(buyerAnswers.timeframe || 'immediate') === 'immediate' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, timeframe: 'immediate' })}
              >
                <Clock size={16} className="text-rose" />
                <span>{isAr ? '⚡ فوري / خلال 30 يوماً' : 'Immediate (Within 30 Days)'}</span>
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${buyerAnswers.timeframe === '3_months' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, timeframe: '3_months' })}
              >
                <span>{isAr ? 'خلال 3 إلى 6 أشهر' : 'Within 3-6 Months'}</span>
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${buyerAnswers.timeframe === 'exploring' ? 'active' : ''}`}
                onClick={() => setBuyerAnswers({ ...buyerAnswers, timeframe: 'exploring' })}
              >
                <span>{isAr ? 'استكشاف ومقارنة الفرص' : 'Exploring Options'}</span>
              </button>
            </div>
          </div>

          <div className="wizard-actions-bar space-between">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setCurrentPhase(1)}
            >
              {isAr ? '← السابق' : 'Back'}
            </button>

            <button
              type="button"
              className="btn btn-primary btn-next-phase"
              onClick={() => setCurrentPhase(3)}
            >
              <span>{isAr ? 'عرض الوحدات المطابقة واستلام العروض' : 'Find Matching Units'}</span>
              {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3: Matches Preview & Contact Verification */}
      {currentPhase === 3 && (
        <div className="wizard-step-body animate-fadeIn">
          {/* Matches Found Banner */}
          <div className="live-valuation-certificate-card">
            <div className="cert-header">
              <div className="cert-badge">
                <Sparkles size={16} className="text-gold" />
                <span>{isAr ? 'محرك المطابقة العقارية الذكي' : 'Instant Property Match Results'}</span>
              </div>
              <span className="cert-date">{isAr ? 'محدث لحظياً' : 'Live Updated'}</span>
            </div>

            <div className="cert-price-range">
              <span className="range-lbl">{isAr ? 'وجدنا لك فرصاً عقارية ممتازة مطابقة لمواصفاتك:' : 'Matching Inventory Discovered in Sohag:'}</span>
              <div className="range-numbers">
                <strong>{isAr ? '12 وحدة معتمدة' : '12 Verified Units'}</strong>
              </div>
              <span className="sqm-rate-sub">
                {isAr ? 'تشمل مشروعات حصرية وشققاً ومحلات جاهزة للمعاينة الفورية' : 'Includes off-market exclusive compounds and ready commercial units'}
              </span>
            </div>

            <div className="cert-perks-row">
              <div className="cert-perk"><CheckCircle2 size={15} className="text-success" /> <span>{isAr ? 'فحص قانوني معتمد 100%' : '100% Legally Verified'}</span></div>
              <div className="cert-perk"><CheckCircle2 size={15} className="text-success" /> <span>{isAr ? 'معاينة ميدانية مجانية بالسيارة' : 'Free Viewing Tour'}</span></div>
              <div className="cert-perk"><CheckCircle2 size={15} className="text-success" /> <span>{isAr ? 'تسهيلات حصرية بدون فوائد' : '0% Interest Direct Deals'}</span></div>
            </div>
          </div>

          {/* Contact Submission Form */}
          <form onSubmit={validateAndSubmit} className="seller-contact-submission-form">
            <h4 className="form-sub-title">{isAr ? 'سجل بياناتك لاستلام ملف الوحدات والمخططات عبر الواتساب فوراً' : 'Enter Details to Receive Unit Floorplans & Direct Prices'}</h4>

            <div className="form-group-block">
              <label>{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
              <input
                type="text"
                placeholder={isAr ? 'مثال: أحمد محمود' : 'Full Name'}
                className="form-input-styled"
                value={buyerAnswers.name || ''}
                onChange={(e) => setBuyerAnswers({ ...buyerAnswers, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group-block">
              <PhoneInputField
                label={isAr ? 'رقم الهاتف الأساسي' : 'Primary Phone Number'}
                value={buyerAnswers.phone || ''}
                onChange={(phone) => {
                  setBuyerAnswers({ ...buyerAnswers, phone });
                  if (phoneError) setPhoneError('');
                }}
                country={buyerCountry}
                onCountryChange={setBuyerCountry}
                error={phoneError}
                required
              />
            </div>

            <div className="form-group-block">
              <PhoneInputField
                label={isAr ? 'رقم الواتساب (لاستلام البروشور والموقع على الخريطة)' : 'WhatsApp (To receive brochure & location)'}
                value={buyerAnswers.whatsapp || ''}
                onChange={(whatsapp) => {
                  setBuyerAnswers({ ...buyerAnswers, whatsapp });
                  if (whatsappError) setWhatsappError('');
                }}
                country={whatsappCountry}
                onCountryChange={setWhatsappCountry}
                error={whatsappError}
              />
            </div>

            <div className="wizard-actions-bar space-between">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentPhase(2)}
              >
                {isAr ? '← السابق' : 'Back'}
              </button>

              <button
                type="submit"
                className="btn btn-primary btn-submit-valuation"
              >
                <Sparkles size={16} />
                <span>{isAr ? 'إرسال العقارات المطابقة وتحديد موعد معاينة' : 'Receive Matching Units & Book Tour'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
