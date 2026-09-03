import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building, 
  Home, 
  Store, 
  Briefcase, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Calculator, 
  Phone, 
  FileText,
  DollarSign
} from 'lucide-react';
import PhoneInputField, { SUPPORTED_COUNTRIES } from './PhoneInputField';
import { getAreas } from '../utils/areasData';

export const SellWizard = ({ 
  lang = 'ar', 
  t, 
  sellerStep = 1, 
  setSellerStep, 
  sellerAnswers = {}, 
  setSellerAnswers, 
  handleSellerChoice, 
  submitSellerJourney,
  estimatedValue,
  triggerToast
}) => {
  const [currentPhase, setCurrentPhase] = useState(1); // 1: Basic Info, 2: Specs & Legal, 3: Valuation & Contact
  const [sellerCountry, setSellerCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [whatsappError, setWhatsappError] = useState('');

  const isAr = lang === 'ar';

  // Benchmark pricing per sqm based on district and type
  const benchmarkPricing = {
    east: { base: 21500, name_ar: 'شرق سوهاج (الجمهورية وسيتي)', name_en: 'East Sohag' },
    new_sohag: { base: 17800, name_ar: 'سوهاج الجديدة (الحي الأول والثاني)', name_en: 'New Sohag' },
    corniche: { base: 31000, name_ar: 'كورنيش النيل', name_en: 'Nile Corniche' },
    thakafa: { base: 15200, name_ar: 'منطقة الثقافة والمخبز الآلي', name_en: 'El Thakafa' },
    center: { base: 18500, name_ar: 'وسط البلد والجامعة', name_en: 'City Center' },
    kawthar: { base: 12000, name_ar: 'حي الكوثر', name_en: 'Al-Kawthar' }
  };

  // Live Real-Time Estimated Valuation Range calculation
  const calculatedEstimate = useMemo(() => {
    const areaKey = sellerAnswers.area || 'east';
    const areaData = benchmarkPricing[areaKey] || benchmarkPricing.east;
    const size = parseInt(sellerAnswers.size) || 140;
    
    // Type multiplier
    let typeMultiplier = 1.0;
    if (sellerAnswers.propertyType === 'retail') typeMultiplier = 1.45; // Shops have high sqm price
    if (sellerAnswers.propertyType === 'villa') typeMultiplier = 1.25;
    if (sellerAnswers.propertyType === 'office') typeMultiplier = 1.15;
    if (sellerAnswers.propertyType === 'land') typeMultiplier = 0.85;

    // Finishing multiplier
    let finishMultiplier = 1.0;
    if (sellerAnswers.finishing === 'luxury') finishMultiplier = 1.18;
    if (sellerAnswers.finishing === 'semi') finishMultiplier = 1.0;
    if (sellerAnswers.finishing === 'core') finishMultiplier = 0.88;

    const baseVal = size * areaData.base * typeMultiplier * finishMultiplier;
    const minVal = Math.round((baseVal * 0.93) / 10000) * 10000;
    const maxVal = Math.round((baseVal * 1.07) / 10000) * 10000;

    return {
      min: minVal,
      max: maxVal,
      avg: Math.round(baseVal),
      sqmAvg: Math.round(areaData.base * typeMultiplier * finishMultiplier)
    };
  }, [sellerAnswers]);

  const validateAndSubmit = (e) => {
    e.preventDefault();

    const cleanPhone = (sellerAnswers.phone || '').trim().replace(/[\s\-\(\)]/g, '');
    const cleanWhatsapp = (sellerAnswers.whatsapp || '').trim().replace(/[\s\-\(\)]/g, '');

    // Check phone format
    const phoneCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === sellerCountry);
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
      ...sellerAnswers,
      estimatedMin: calculatedEstimate.min,
      estimatedMax: calculatedEstimate.max,
      estimatedAvg: calculatedEstimate.avg,
      phone: `${sellerCountry}${normalizedPhone}`,
      whatsapp: cleanWhatsapp ? `${whatsappCountry}${normalizedWhatsapp}` : ''
    };

    submitSellerJourney(updatedAnswers);
  };

  const propertyTypes = [
    { id: 'apartment', label_ar: 'شقة سكنية', label_en: 'Apartment', icon: Building, desc_ar: 'شقق وأدوار سكنية ودوبلكس' },
    { id: 'retail', label_ar: 'محل تجاري', label_en: 'Retail Shop', icon: Store, desc_ar: 'محلات ومساحات تجارية على شوارع رئيسية' },
    { id: 'villa', label_ar: 'فيلا / تاون هاوس', label_en: 'Villa', icon: Home, desc_ar: 'فيلات مستقلة وتاون هاوس في كمبوندات' },
    { id: 'office', label_ar: 'مكتب إداري / عيادة', label_en: 'Office / Clinic', icon: Briefcase, desc_ar: 'مقرات إدارية وعيادات طبية جاهزة' },
    { id: 'land', label_ar: 'قطعة أرض', label_en: 'Land Plot', icon: MapPin, desc_ar: 'أراضي مباني وتجارية بترخيص معتمد' }
  ];

  const [districts, setDistricts] = useState(() => getAreas().filter(a => a.id !== 'all'));

  useEffect(() => {
    const handleAreasUpdate = () => {
      setDistricts(getAreas().filter(a => a.id !== 'all'));
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
            <span className="phase-title">{isAr ? 'البيانات الأساسية' : 'Basic Details'}</span>
            <span className="phase-sub">{isAr ? 'النوع والموقع والمساحة' : 'Type & Area'}</span>
          </div>
        </div>

        <div className="phase-line" />

        <div className={`phase-item ${currentPhase >= 2 ? 'active' : ''} ${currentPhase > 2 ? 'done' : ''}`}>
          <div className="phase-circle">{currentPhase > 2 ? '✓' : '2'}</div>
          <div className="phase-text">
            <span className="phase-title">{isAr ? 'المواصفات والترخيص' : 'Specs & Legal'}</span>
            <span className="phase-sub">{isAr ? 'التشطيب والموقف القانوني' : 'Finishing & Title'}</span>
          </div>
        </div>

        <div className="phase-line" />

        <div className={`phase-item ${currentPhase >= 3 ? 'active' : ''}`}>
          <div className="phase-circle">3</div>
          <div className="phase-text">
            <span className="phase-title">{isAr ? 'التقييم واعتماد الطلب' : 'Valuation & Submit'}</span>
            <span className="phase-sub">{isAr ? 'شهادة السعر والتواصل' : 'Price Certificate'}</span>
          </div>
        </div>
      </div>

      {/* PHASE 1: Basic Property Details */}
      {currentPhase === 1 && (
        <div className="wizard-step-body animate-fadeIn">
          <div className="step-prompt-row">
            <h3>{isAr ? 'ما هو نوع عقارك المعروض للتقييم والبيع؟' : 'What type of property are you valuing & selling?'}</h3>
            <p>{isAr ? 'اختر الفئة الأساسية لعقارك لتحديد معادلة التسعير المناسبة' : 'Select property category for accurate pricing formula'}</p>
          </div>

          <div className="prop-types-rich-grid">
            {propertyTypes.map((type) => {
              const IconComp = type.icon;
              const isSelected = (sellerAnswers.propertyType || 'apartment') === type.id;
              return (
                <div
                  key={type.id}
                  className={`prop-type-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSellerChoice('propertyType', type.id)}
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

          <div className="phase-inputs-row">
            {/* District Selector */}
            <div className="form-group-flex">
              <label>{isAr ? 'موقع وعنوان العقار في سوهاج' : 'Property Location in Sohag'}</label>
              <select
                className="form-select-styled"
                value={sellerAnswers.area || 'east'}
                onChange={(e) => handleSellerChoice('area', e.target.value)}
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {isAr ? (d.label_ar || d.name_ar) : (d.label_en || d.name_en)}
                  </option>
                ))}
              </select>
            </div>

            {/* Total Area in Sqm */}
            <div className="form-group-flex">
              <label>{isAr ? 'المساحة الإجمالية (بالمتر المربع م²)' : 'Total Built Area (Sqm)'}</label>
              <div className="input-with-tag">
                <input
                  type="number"
                  min="30"
                  max="5000"
                  placeholder="مثال: 150"
                  className="form-input-styled"
                  value={sellerAnswers.size || ''}
                  onChange={(e) => setSellerAnswers({ ...sellerAnswers, size: e.target.value })}
                />
                <span className="input-tag">م²</span>
              </div>
            </div>
          </div>

          <div className="wizard-actions-bar">
            <button
              type="button"
              className="btn btn-primary btn-next-phase"
              disabled={!sellerAnswers.size || parseInt(sellerAnswers.size) < 20}
              onClick={() => setCurrentPhase(2)}
            >
              <span>{isAr ? 'متابعة المواصفات والترخيص' : 'Continue to Specs & Legal'}</span>
              {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: Specs & Legal Status */}
      {currentPhase === 2 && (
        <div className="wizard-step-body animate-fadeIn">
          <div className="step-prompt-row">
            <h3>{isAr ? 'المواصفات الفنية والموقف القانوني للعقار' : 'Technical Specifications & Legal Status'}</h3>
            <p>{isAr ? 'تساعدنا هذه البيانات في رفع دقة التقييم إلى 98% وتحديد سرعة البيع' : 'Helps calculate valuation accuracy up to 98%'}</p>
          </div>

          {/* Finishing Status */}
          <div className="form-group-block">
            <label className="block-label">{isAr ? 'مستوى وحالة التشطيب' : 'Finishing Condition'}</label>
            <div className="options-pill-grid">
              <button
                type="button"
                className={`opt-pill-btn ${(sellerAnswers.finishing || 'luxury') === 'luxury' ? 'active' : ''}`}
                onClick={() => setSellerAnswers({ ...sellerAnswers, finishing: 'luxury' })}
              >
                {isAr ? '🌟 تشطيب سوبر لوكس / ألترا لوكس' : 'Ultra Luxury Finished'}
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${sellerAnswers.finishing === 'semi' ? 'active' : ''}`}
                onClick={() => setSellerAnswers({ ...sellerAnswers, finishing: 'semi' })}
              >
                {isAr ? '🏗️ نصف تشطيب (محارة وحلوق)' : 'Semi-Finished'}
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${sellerAnswers.finishing === 'core' ? 'active' : ''}`}
                onClick={() => setSellerAnswers({ ...sellerAnswers, finishing: 'core' })}
              >
                {isAr ? '🧱 بدون تشطيب (طوب أحمر / هيكل)' : 'Core & Shell'}
              </button>
            </div>
          </div>

          {/* Legal Status */}
          <div className="form-group-block">
            <label className="block-label">{isAr ? 'الموقف القانوني وتسلسل الملكية' : 'Legal & Title Status'}</label>
            <div className="options-pill-grid">
              <button
                type="button"
                className={`opt-pill-btn ${(sellerAnswers.legal || 'registered') === 'registered' ? 'active' : ''}`}
                onClick={() => setSellerAnswers({ ...sellerAnswers, legal: 'registered' })}
              >
                <ShieldCheck size={16} className="text-success" />
                <span>{isAr ? 'مسجل شهر عقاري / سجل عيني' : 'Registered Title Deed'}</span>
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${sellerAnswers.legal === 'contract' ? 'active' : ''}`}
                onClick={() => setSellerAnswers({ ...sellerAnswers, legal: 'contract' })}
              >
                <span>{isAr ? 'عقد بيع ابتدائي + صحة توقيع' : 'Signed Contract + Court Validity'}</span>
              </button>
              <button
                type="button"
                className={`opt-pill-btn ${sellerAnswers.legal === 'permit' ? 'active' : ''}`}
                onClick={() => setSellerAnswers({ ...sellerAnswers, legal: 'permit' })}
              >
                <span>{isAr ? 'ترخيص بناء رسمي + تصالح معتمد' : 'Licensed + Reconciled'}</span>
              </button>
            </div>
          </div>

          {/* Floor & Rooms */}
          <div className="phase-inputs-row">
            <div className="form-group-flex">
              <label>{isAr ? 'الدور / الطابق' : 'Floor Level'}</label>
              <select
                className="form-select-styled"
                value={sellerAnswers.floor || '3'}
                onChange={(e) => setSellerAnswers({ ...sellerAnswers, floor: e.target.value })}
              >
                <option value="ground">{isAr ? 'أرضي / مدخل خاص' : 'Ground Floor'}</option>
                <option value="1">{isAr ? 'الدور الأول' : '1st Floor'}</option>
                <option value="2">{isAr ? 'الدور الثاني' : '2nd Floor'}</option>
                <option value="3">{isAr ? 'الدور الثالث' : '3rd Floor'}</option>
                <option value="4">{isAr ? 'الدور الرابع' : '4th Floor'}</option>
                <option value="top">{isAr ? 'دور أخير مع روف' : 'Top Floor + Roof'}</option>
              </select>
            </div>

            <div className="form-group-flex">
              <label>{isAr ? 'عدد الغرف' : 'Bedrooms'}</label>
              <select
                className="form-select-styled"
                value={sellerAnswers.rooms || '3'}
                onChange={(e) => setSellerAnswers({ ...sellerAnswers, rooms: e.target.value })}
              >
                <option value="1">1 {isAr ? 'غرفة' : 'Room'}</option>
                <option value="2">2 {isAr ? 'غرف' : 'Rooms'}</option>
                <option value="3">3 {isAr ? 'غرف' : 'Rooms'}</option>
                <option value="4">4 {isAr ? 'غرف' : 'Rooms'}</option>
                <option value="5+">5+ {isAr ? 'غرف أو أكثر' : '5+ Rooms'}</option>
              </select>
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
              <span>{isAr ? 'عرض نتيجة التقييم واعتماد الطلب' : 'View Valuation & Finalize'}</span>
              {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3: Valuation Result Preview & Contact Form */}
      {currentPhase === 3 && (
        <div className="wizard-step-body animate-fadeIn">
          {/* Real-time Valuation Output Card */}
          <div className="live-valuation-certificate-card">
            <div className="cert-header">
              <div className="cert-badge">
                <Sparkles size={16} className="text-gold" />
                <span>{isAr ? 'شهادة التقييم السوقي التقديري المبدئي' : 'Preliminary AI Market Valuation'}</span>
              </div>
              <span className="cert-date">{isAr ? 'ساري لعام 2026' : 'Valid for 2026'}</span>
            </div>

            <div className="cert-price-range">
              <span className="range-lbl">{isAr ? 'نطاق السعر العادل المتوقع لعقارك:' : 'Estimated Fair Market Value Range:'}</span>
              <div className="range-numbers">
                <strong>{calculatedEstimate.min.toLocaleString()}</strong>
                <span className="range-to">{isAr ? 'إلى' : 'to'}</span>
                <strong>{calculatedEstimate.max.toLocaleString()}</strong>
                <span className="range-curr">{isAr ? 'ج.م كاش' : 'EGP'}</span>
              </div>
              <span className="sqm-rate-sub">
                {isAr ? `متوسط سعر المتر المقدر: ${calculatedEstimate.sqmAvg.toLocaleString()} ج.م / م²` : `Est. ${calculatedEstimate.sqmAvg.toLocaleString()} EGP/sqm`}
              </span>
            </div>

            <div className="cert-perks-row">
              <div className="cert-perk"><CheckCircle2 size={15} className="text-success" /> <span>{isAr ? 'أكثر من 500 مشترٍ مسجل' : '500+ Qualified Buyers'}</span></div>
              <div className="cert-perk"><CheckCircle2 size={15} className="text-success" /> <span>{isAr ? 'تصوير بروشور احترافي مجاناً' : 'Free Photo Brochure'}</span></div>
              <div className="cert-perk"><CheckCircle2 size={15} className="text-success" /> <span>{isAr ? 'بدون أي عمولات على البائع' : 'Zero Seller Commission'}</span></div>
            </div>
          </div>

          {/* Contact Verification Form */}
          <form onSubmit={validateAndSubmit} className="seller-contact-submission-form">
            <h4 className="form-sub-title">{isAr ? 'سجل بياناتك لإرسال التقرير الكامل وعرض العقار فوراً' : 'Submit Details to Activate Listing & Receive Full PDF Report'}</h4>

            <div className="form-group-block">
              <label>{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
              <input
                type="text"
                placeholder={isAr ? 'مثال: أسامة الشريف' : 'Full Name'}
                className="form-input-styled"
                value={sellerAnswers.name || ''}
                onChange={(e) => setSellerAnswers({ ...sellerAnswers, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group-block">
              <PhoneInputField
                label={isAr ? 'رقم الهاتف الأساسي' : 'Primary Phone Number'}
                value={sellerAnswers.phone || ''}
                onChange={(phone) => {
                  setSellerAnswers({ ...sellerAnswers, phone });
                  if (phoneError) setPhoneError('');
                }}
                country={sellerCountry}
                onCountryChange={setSellerCountry}
                error={phoneError}
                required
              />
            </div>

            <div className="form-group-block">
              <PhoneInputField
                label={isAr ? 'رقم الواتساب (اختياري لاستلام التقرير)' : 'WhatsApp (Optional for PDF Report)'}
                value={sellerAnswers.whatsapp || ''}
                onChange={(whatsapp) => {
                  setSellerAnswers({ ...sellerAnswers, whatsapp });
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
                <span>{isAr ? 'اعتماد التقييم وعرض عقاري للبيع مجاناً' : 'Confirm Valuation & List Property Free'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
