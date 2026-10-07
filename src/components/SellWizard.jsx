import { useState, useMemo, useEffect } from 'react';
import { Building, Home, Store, Briefcase, MapPin, Sparkles, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft, MessageCircle } from 'lucide-react';
import PhoneInputField from './PhoneInputField';
import { SUPPORTED_COUNTRIES } from '../utils/phoneCountries';
import { getAreas } from '../utils/areasData';
import { getWhatsAppUrl } from '../utils/founderCmsData';
import SubmissionSuccess from './common/SubmissionSuccess';

// Greater Cairo coverage: no automated benchmark yet, valued manually
const CAIRO_AREAS = [
  { id: 'cairo_new_cairo', ar: 'القاهرة الجديدة والتجمع', en: 'New Cairo' },
  { id: 'cairo_zayed', ar: 'الشيخ زايد', en: 'Sheikh Zayed' },
  { id: 'cairo_october', ar: 'السادس من أكتوبر', en: '6th of October' },
  { id: 'cairo_capital', ar: 'العاصمة الإدارية', en: 'New Administrative Capital' },
  { id: 'cairo_other', ar: 'منطقة أخرى بالقاهرة الكبرى', en: 'Other Greater Cairo area' }
];

// Default fallback benchmark pricing per sqm
const FALLBACK_BENCHMARK_PRICING = {
  east: { base: 21500, name_ar: 'شرق سوهاج (الجمهورية وسيتي)', name_en: 'East Sohag' },
  new_sohag: { base: 17800, name_ar: 'سوهاج الجديدة (الحي الأول والثاني)', name_en: 'New Sohag' },
  corniche: { base: 31000, name_ar: 'كورنيش النيل', name_en: 'Nile Corniche' },
  thakafa: { base: 15200, name_ar: 'منطقة الثقافة والمخبز الآلي', name_en: 'El Thakafa' },
  center: { base: 18500, name_ar: 'وسط البلد والجامعة', name_en: 'City Center' },
  kawthar: { base: 12000, name_ar: 'حي الكوثر', name_en: 'Al-Kawthar' }
};

// Realistic granular legal title and licensing documents in Egypt & Sohag
export const REAL_ESTATE_LEGAL_DOCS = [
  { id: 'registered_deed', ar: 'عقد مسجل شهر عقاري', en: 'Registered Title Deed' },
  { id: 'cadastral_registry', ar: 'سجل عيني مطهر', en: 'Cadastral Land Registry' },
  { id: 'court_valid_enforceable', ar: 'حكم صحة ونفاذ', en: 'Court Validity & Enforcement' },
  { id: 'signature_validity', ar: 'حكم صحة توقيع', en: 'Court Signature Validity' },
  { id: 'preliminary_contract', ar: 'عقد بيع ابتدائي', en: 'Preliminary Sales Contract' },
  { id: 'city_authority_allocation', ar: 'تخصيص ومحضر استلام (جهاز المدينة)', en: 'City Authority Allocation & Handover' },
  { id: 'building_permit', ar: 'ترخيص بناء رسمي ساري', en: 'Official Building License' },
  { id: 'form10_reconciliation', ar: 'نموذج 10 تصالح نهائي معتمد', en: 'Form 10 Reconciliation Certificate' },
  { id: 'power_of_attorney', ar: 'توكيل رسمي بالبيع (تسلسل توكيلات)', en: 'Power of Attorney (POA Chain)' },
  { id: 'inheritance_deed', ar: 'إعلام وراثة رسمي وتوكيل الورثة', en: 'Inheritance Deed & Heirs POA' },
  { id: 'utility_meters', ar: 'عدادات مرافق رسمية باسم المالك', en: 'Official Utility Meters' },
  { id: 'land_share', ar: 'حصة بالأرض محددة بالعقد', en: 'Defined Land Share in Contract' }
];

// Comprehensive realistic finishing classifications in Egypt & Sohag
export const REAL_ESTATE_FINISHING_TYPES = [
  { 
    id: 'ultra_lux', 
    ar: 'ألترا سوبر لوكس (فاخر)', 
    en: 'Ultra Super Lux (Deluxe)',
    icon: '💎',
    multiplier: 1.25,
    desc_ar: 'رخام/بورسلين، جبس بورد، خامات وتجهيزات مستوردة'
  },
  { 
    id: 'super_lux', 
    ar: 'سوبر لوكس كامل', 
    en: 'Super Lux Finished',
    icon: '🌟',
    multiplier: 1.15,
    desc_ar: 'تشطيب كامل حديث، سيراميك فرز أول، جاهز للسكن'
  },
  { 
    id: 'lux', 
    ar: 'لوكس عادي', 
    en: 'Standard Lux',
    icon: '✨',
    multiplier: 1.05,
    desc_ar: 'تشطيب كامل كلاسيكي صالح للسكن أو التأجير'
  },
  { 
    id: 'semi', 
    ar: 'نصف تشطيب (محارة وحلوق)', 
    en: 'Semi-Finished',
    icon: '🏗️',
    multiplier: 1.00,
    desc_ar: 'محارة، حلوق، تأسيس سباكة وكهرباء'
  },
  { 
    id: 'core', 
    ar: 'بدون تشطيب (طوب أحمر / هيكل)', 
    en: 'Core & Shell',
    icon: '🧱',
    multiplier: 0.86,
    desc_ar: 'هيكل خرساني وجدران طوب بدون محارة'
  },
  { 
    id: 'furnished', 
    ar: 'مفروش بالكامل (بالأثاث والتكييفات)', 
    en: 'Fully Furnished',
    icon: '🛋️',
    multiplier: 1.35,
    desc_ar: 'جاهز فوراً بفرش راقٍ وتكييفات وأجهزة كهربائية'
  },
  { 
    id: 'mixed', 
    ar: 'تشطيب مختلط (أدوار مشطبة وأدوار عظم)', 
    en: 'Mixed Finishing (Multi-Story)',
    icon: '🏢',
    multiplier: 1.08,
    desc_ar: 'خاص بالعمارات والمنازل: جزء مشطب وجزء عظم أو محارة'
  },
  { 
    id: 'under_construction', 
    ar: 'تحت الإنشاء / جاري التشطيب', 
    en: 'Under Construction',
    icon: '⏳',
    multiplier: 0.90,
    desc_ar: 'أعمال البناء أو التشطيب جارية حالياً'
  }
];

export const SellWizard = ({ 
  lang = 'ar', 
  sellerAnswers = {}, 
  setSellerAnswers, 
  handleSellerChoice, 
  submitSellerJourney
}) => {
  const [currentPhase, setCurrentPhase] = useState(1); // 1: Basic Info, 2: Specs & Legal, 3: Valuation & Contact
  const [sellerCountry, setSellerCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [whatsappError, setWhatsappError] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [districts, setDistricts] = useState(() => getAreas().filter(a => a.id !== 'all'));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState(null);

  const isAr = lang === 'ar';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oneline_wizard_started', { detail: { type: 'sell' } }));
    }
    const handleAreasUpdate = () => setDistricts(getAreas().filter(a => a.id !== 'all'));
    window.addEventListener('oneline_areas_updated', handleAreasUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleAreasUpdate);
  }, []);

  // Live Real-Time Estimated Valuation Range calculation dynamically tied to CMS
  const isCairo = String(sellerAnswers.area || '').startsWith('cairo_');

  // Selected legal documents as a flexible array (allows multi-select or zero-select)
  const selectedLegalDocs = useMemo(() => {
    if (Array.isArray(sellerAnswers.legalDocs)) {
      return sellerAnswers.legalDocs;
    }
    if (Array.isArray(sellerAnswers.legal)) {
      return sellerAnswers.legal;
    }
    if (typeof sellerAnswers.legal === 'string' && sellerAnswers.legal) {
      if (sellerAnswers.legal === 'registered') return ['registered_deed'];
      if (sellerAnswers.legal === 'contract') return ['preliminary_contract', 'signature_validity'];
      if (sellerAnswers.legal === 'permit') return ['building_permit', 'form10_reconciliation'];
      return [sellerAnswers.legal];
    }
    return [];
  }, [sellerAnswers.legalDocs, sellerAnswers.legal]);

  const handleToggleLegalDoc = (docId) => {
    const isSelected = selectedLegalDocs.includes(docId);
    const updated = isSelected
      ? selectedLegalDocs.filter(id => id !== docId)
      : [...selectedLegalDocs, docId];

    setSellerAnswers({
      ...sellerAnswers,
      legalDocs: updated,
      legal: updated
    });
  };

  const handleClearLegalDocs = () => {
    setSellerAnswers({
      ...sellerAnswers,
      legalDocs: [],
      legal: []
    });
  };

  const calculatedEstimate = useMemo(() => {
    const areaKey = sellerAnswers.area || 'east';
    const liveArea = districts.find(d => d.id === areaKey);
    const fallbackArea = FALLBACK_BENCHMARK_PRICING[areaKey] || FALLBACK_BENCHMARK_PRICING.east;
    const baseM2 = liveArea?.avgPricePerMeter || fallbackArea.base || 21500;
    const size = parseInt(sellerAnswers.size) || 140;
    
    // Type multiplier
    let typeMultiplier = 1.0;
    if (sellerAnswers.propertyType === 'retail') typeMultiplier = 1.45; // Shops have high sqm price
    if (sellerAnswers.propertyType === 'villa') typeMultiplier = 1.25;
    if (sellerAnswers.propertyType === 'office') typeMultiplier = 1.15;
    if (sellerAnswers.propertyType === 'land') typeMultiplier = 0.85;

    // Finishing multiplier
    let finishMultiplier = 1.0;
    const currentFinishing = sellerAnswers.finishing || 'super_lux';
    const foundFinish = REAL_ESTATE_FINISHING_TYPES.find(f => f.id === currentFinishing);
    if (foundFinish) {
      finishMultiplier = foundFinish.multiplier;
    } else if (currentFinishing === 'luxury') {
      finishMultiplier = 1.15;
    } else if (currentFinishing === 'core') {
      finishMultiplier = 0.86;
    } else if (currentFinishing === 'semi') {
      finishMultiplier = 1.00;
    }

    const baseVal = size * baseM2 * typeMultiplier * finishMultiplier;
    const minVal = Math.round((baseVal * 0.93) / 10000) * 10000;
    const maxVal = Math.round((baseVal * 1.07) / 10000) * 10000;

    return {
      min: minVal,
      max: maxVal,
      avg: Math.round(baseVal),
      sqmAvg: Math.round(baseM2 * typeMultiplier * finishMultiplier)
    };
  }, [sellerAnswers, districts]);

  const validateAndSubmit = async (e) => {
    e.preventDefault();

    const cleanPhone = (sellerAnswers.phone || '').trim().replace(/[\s\-()]/g, '');
    const cleanWhatsapp = (sellerAnswers.whatsapp || '').trim().replace(/[\s\-()]/g, '');

    if (!sellerAnswers.name || !sellerAnswers.name.trim()) {
      return;
    }

    if (!cleanWhatsapp) {
      setWhatsappError(isAr ? 'رقم الواتساب إلزامي لإرسال تقرير التقييم والمتابعة' : 'WhatsApp number is required');
      return;
    }

    // Check phone format
    const phoneCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === sellerCountry);
    const isPhoneValid = phoneCountryObj ? phoneCountryObj.regex.test(cleanPhone) : true;
    
    const whatsappCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === whatsappCountry);
    const isWhatsappValid = whatsappCountryObj ? whatsappCountryObj.regex.test(cleanWhatsapp) : true;

    if (!isPhoneValid) {
      setPhoneError(isAr ? 'رقم الهاتف غير متوافق مع صيغة الدولة المحددة' : 'Phone number does not match country format');
      return;
    }
    
    if (!isWhatsappValid) {
      setWhatsappError(isAr ? 'رقم الواتساب غير متوافق مع صيغة الدولة المحددة' : 'WhatsApp number does not match country format');
      return;
    }

    const normalizedPhone = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
    const normalizedWhatsapp = cleanWhatsapp.startsWith('0') ? cleanWhatsapp.substring(1) : cleanWhatsapp;

    const isNonResidential = sellerAnswers.propertyType === 'retail' || sellerAnswers.propertyType === 'land' || sellerAnswers.propertyType === 'office';
    const isHouse = sellerAnswers.propertyType === 'villa';
    const legalDocsList = selectedLegalDocs;
    const legalLabelsAr = legalDocsList
      .map(id => REAL_ESTATE_LEGAL_DOCS.find(d => d.id === id)?.ar || id)
      .join('، ');

    const floorDisplay = isHouse
      ? (sellerAnswers.totalFloors ? `${sellerAnswers.totalFloors} طوابق` : (sellerAnswers.floor || 'طابقان'))
      : (sellerAnswers.floor || '3');

    const finObj = REAL_ESTATE_FINISHING_TYPES.find(f => f.id === (sellerAnswers.finishing || 'super_lux')) 
      || (sellerAnswers.finishing === 'luxury' ? REAL_ESTATE_FINISHING_TYPES[1] : null);
    const finishingLabelAr = finObj ? finObj.ar : (sellerAnswers.finishing || 'سوبر لوكس');

    const updatedAnswers = {
      ...sellerAnswers,
      estimatedMin: isCairo ? null : calculatedEstimate.min,
      estimatedMax: isCairo ? null : calculatedEstimate.max,
      estimatedAvg: calculatedEstimate.avg,
      totalFloors: isHouse ? (sellerAnswers.totalFloors || sellerAnswers.floor || '2') : undefined,
      floor: floorDisplay,
      finishing: sellerAnswers.finishing || 'super_lux',
      finishingLabelAr,
      rooms: isNonResidential ? 0 : parseInt(sellerAnswers.rooms || (isHouse ? 5 : 3)),
      phone: `${sellerCountry}${normalizedPhone}`,
      whatsapp: `${whatsappCountry}${normalizedWhatsapp}`,
      legalDocs: legalDocsList,
      legal: legalDocsList,
      legalSummaryAr: legalLabelsAr || (isAr ? 'قيد المراجعة / لم يُحدد بعد' : 'Pending review / Not specified')
    };

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const lead = await submitSellerJourney(updatedAnswers);
      setSubmittedRef(lead?.id || `lead-${Date.now()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const propertyTypes = [
    { id: 'apartment', label_ar: 'شقة سكنية', label_en: 'Apartment', icon: Building, desc_ar: 'شقق وأدوار سكنية ودوبلكس' },
    { id: 'retail', label_ar: 'محل تجاري', label_en: 'Retail Shop', icon: Store, desc_ar: 'محلات ومساحات تجارية على شوارع رئيسية' },
    { id: 'villa', label_ar: 'منزل مستقل / بيت عائلي / فيلا', label_en: 'House / Villa / Building', icon: Home, desc_ar: 'منازل كاملة متعددة الأدوار وفيلات مستقلة' },
    { id: 'office', label_ar: 'مكتب إداري / عيادة', label_en: 'Office / Clinic', icon: Briefcase, desc_ar: 'مقرات إدارية وعيادات طبية جاهزة' },
    { id: 'land', label_ar: 'قطعة أرض', label_en: 'Land Plot', icon: MapPin, desc_ar: 'أراضي مباني وتجارية بترخيص معتمد' }
  ];

  if (submittedRef) {
    return (
      <div className="smart-valuation-wizard-box">
        <SubmissionSuccess
          lang={lang}
          reference={submittedRef}
          title_ar="استلمنا بيانات عقارك"
          title_en="We have your property details"
          steps={[
            { ar: 'يراجع مستشار التقييم البيانات ويتصل بك خلال يوم عمل.', en: 'A valuation advisor reviews your details and calls you within one business day.' },
            { ar: 'نحدد موعد معاينة لمراجعة المستندات والحالة الفعلية للعقار.', en: 'We schedule a visit to review documents and the actual condition.' },
            { ar: 'تستلم تقريراً بسعر مقترح واستراتيجية عرض قبل أي تسويق.', en: 'You receive a price recommendation and marketing plan before any listing.' },
          ]}
          whatsappText={isAr ? 'مرحباً 1Line، أرسلت بيانات عقاري للتقييم وأود المتابعة' : 'Hello 1Line, I submitted my property for valuation'}
          secondaryLink={{ to: '/demands', ar: 'اطلع على طلبات المشترين الحالية', en: 'See current buyer requests' }}
        />
      </div>
    );
  }

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

          {/* VIP Express WhatsApp Listing Callout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 18px',
            borderRadius: '12px',
            background: 'rgba(37, 211, 102, 0.08)',
            border: '1px solid rgba(37, 211, 102, 0.25)',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MessageCircle size={20} color="#25D366" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {isAr ? 'هل تفضل إدراج عقارك سريعاً وإرسال الصور مباشرة عبر واتساب؟' : 'Prefer to list fast and send photos directly via WhatsApp?'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const msg = isAr
                  ? 'مرحباً 1Line سوهاج، أرغب في عرض عقار للبيع / التقييم المباشر، وأود إرسال الصور والمواصفات لمستشار الإدراج المعتمد.'
                  : 'Hello 1Line Sohag, I would like to list my property directly via WhatsApp.';
                window.open(getWhatsAppUrl(msg), '_blank');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: '#128C4A',
                color: '#fff',
                border: 'none',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span>{isAr ? 'إدراج سريع عبر واتساب المشرف' : 'Fast WhatsApp Listing'}</span>
              {isAr ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
            </button>
          </div>

          <div className="prop-types-rich-grid">
            {propertyTypes.map((type) => {
              const IconComp = type.icon;
              const isSelected = (sellerAnswers.propertyType || 'apartment') === type.id;
              return (
                <div
                  key={type.id}
                  className={`prop-type-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    handleSellerChoice('propertyType', type.id);
                    if (type.id === 'retail' || type.id === 'land') {
                      setSellerAnswers(prev => ({
                        ...prev,
                        propertyType: type.id,
                        rooms: 0,
                        floor: type.id === 'land' ? 'ground' : (prev.floor || 'ground')
                      }));
                    } else if (type.id === 'office') {
                      setSellerAnswers(prev => ({
                        ...prev,
                        propertyType: type.id,
                        rooms: 0
                      }));
                    }
                  }}
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
              <label>{isAr ? 'موقع العقار' : 'Property location'}</label>
              <select
                className="form-select-styled"
                value={sellerAnswers.area || 'east'}
                onChange={(e) => handleSellerChoice('area', e.target.value)}
              >
                <optgroup label={isAr ? 'محافظة سوهاج' : 'Sohag'}>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {isAr ? (d.label_ar || d.name_ar) : (d.label_en || d.name_en)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={isAr ? 'القاهرة الكبرى' : 'Greater Cairo'}>
                  {CAIRO_AREAS.map((c) => (
                    <option key={c.id} value={c.id}>{isAr ? c.ar : c.en}</option>
                  ))}
                </optgroup>
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

          {/* Finishing Status - Only for built properties (apartments, houses, offices, shops) */}
          {sellerAnswers.propertyType !== 'land' && (
            <div className="form-group-block">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <label className="block-label" style={{ margin: 0 }}>
                  {isAr ? 'مستوى وحالة التشطيب' : 'Finishing Condition'}
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {isAr ? 'يؤثر بدقة على القيمة السوقية للمتر وسرعة البيع' : 'Directly impacts market valuation per m²'}
                </span>
              </div>
              <div className="options-pill-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {REAL_ESTATE_FINISHING_TYPES.map((type) => {
                  const isSelected = (sellerAnswers.finishing || 'super_lux') === type.id || 
                    (type.id === 'super_lux' && sellerAnswers.finishing === 'luxury');
                  return (
                    <button
                      key={type.id}
                      type="button"
                      className={`opt-pill-btn ${isSelected ? 'active' : ''}`}
                      onClick={() => setSellerAnswers({ ...sellerAnswers, finishing: type.id })}
                      style={{
                        justifyContent: 'flex-start',
                        textAlign: isAr ? 'right' : 'left',
                        padding: '11px 13px',
                        fontSize: '0.82rem',
                        lineHeight: 1.35
                      }}
                    >
                      <span style={{ fontSize: '1.15rem', flexShrink: 0 }}>{type.icon}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                        <span style={{ fontWeight: isSelected ? 800 : 700 }}>{isAr ? type.ar : type.en}</span>
                        <span style={{ fontSize: '0.72rem', opacity: isSelected ? 0.92 : 0.65, fontWeight: 500 }}>
                          {isAr ? type.desc_ar : type.en}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legal Status & Documents (Granular, Multi-Select & Fully Optional) */}
          <div className="form-group-block">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <label className="block-label" style={{ margin: 0 }}>
                  {isAr ? 'الموقف القانوني والمستندات المتوفرة' : 'Legal & Title Documents'}
                </label>
                <span style={{ 
                  fontSize: '0.75rem', 
                  padding: '3px 8px', 
                  borderRadius: '6px', 
                  background: selectedLegalDocs.length > 0 ? 'rgba(14, 165, 233, 0.12)' : 'rgba(100, 116, 139, 0.12)', 
                  color: selectedLegalDocs.length > 0 ? '#0284c7' : 'var(--text-secondary)',
                  fontWeight: 700 
                }}>
                  {selectedLegalDocs.length > 0
                    ? (isAr ? `تم تحديد (${selectedLegalDocs.length}) مستندات` : `${selectedLegalDocs.length} selected`)
                    : (isAr ? 'اختياري — غير إلزامي' : 'Optional')}
                </span>
              </div>
              {selectedLegalDocs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLegalDocs}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  {isAr ? 'مسح التحديد ✕' : 'Clear all ✕'}
                </button>
              )}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
              {isAr
                ? 'حدد كل بند ينطبق على عقارك (يمكنك اختيار أكثر من بند، أو عدم اختيار أي بند إذا كانت الأوراق قيد المراجعة).'
                : 'Select all documents that apply (multi-choice, or leave empty if documents are pending review).'}
            </p>

            <div className="options-pill-grid legal-docs-grid">
              {REAL_ESTATE_LEGAL_DOCS.map((doc) => {
                const isSelected = selectedLegalDocs.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    type="button"
                    className={`opt-pill-btn legal-doc-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => handleToggleLegalDoc(doc.id)}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? (
                      <CheckCircle2 size={16} className="text-success" style={{ flexShrink: 0, color: '#10b981' }} />
                    ) : (
                      <span className="legal-doc-checkbox-placeholder" />
                    )}
                    <span className="legal-doc-title">{isAr ? doc.ar : doc.en}</span>
                  </button>
                );
              })}
            </div>

            {selectedLegalDocs.length === 0 ? (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(241, 245, 249, 0.7)',
                border: '1px dashed rgba(203, 213, 225, 0.9)',
                fontSize: '0.78rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldCheck size={16} style={{ color: '#0284c7', flexShrink: 0 }} />
                <span>
                  {isAr
                    ? 'لم تختر أي بند — لا توجد مشكلة، سيقوم مستشار 1Line بمراجعة وتدقيق الموقف القانوني والتراخيص معك مجاناً.'
                    : 'No items selected — no worries, our legal advisor will audit your documents free of charge during on-site visit.'}
                </span>
              </div>
            ) : (
              <div style={{
                marginTop: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: '0.78rem',
                color: '#065f46',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>
                  {isAr
                    ? `رائع! توثيق ${selectedLegalDocs.length} مستندات يعزز من سرعة تسويق العقار وثقة المشترين الجادين.`
                    : `Great! Having ${selectedLegalDocs.length} documents speeds up verified buyer matching.`}
                </span>
              </div>
            )}
          </div>

          {/* Differentiated Property Structure Specs */}
          {sellerAnswers.propertyType === 'retail' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="phase-inputs-row">
                <div className="form-group-flex">
                  <label>{isAr ? 'موقع الطابق للمحل التجاري' : 'Retail Floor Level'}</label>
                  <select
                    className="form-select-styled"
                    value={sellerAnswers.retailFloor || 'ground'}
                    onChange={(e) => setSellerAnswers({ ...sellerAnswers, retailFloor: e.target.value, rooms: 0 })}
                  >
                    <option value="ground">{isAr ? 'أرضي واجهة شارع مباشرة' : 'Ground Floor Street Front'}</option>
                    <option value="mezzanine">{isAr ? 'ميزانين تجاري مرخص' : 'Licensed Mezzanine'}</option>
                    <option value="mall_ground">{isAr ? 'أرضي داخل مول تجاري' : 'Mall Ground Floor'}</option>
                    <option value="mall_upper">{isAr ? 'دور متكرر داخل مول' : 'Upper Floor inside Mall'}</option>
                    <option value="basement">{isAr ? 'بدروم تجاري مرخص' : 'Licensed Commercial Basement'}</option>
                  </select>
                </div>

                <div className="form-group-flex">
                  <label>{isAr ? 'طبيعة الواجهة والنشاط التجاري' : 'Storefront & Commercial Activity'}</label>
                  <select
                    className="form-select-styled"
                    value={sellerAnswers.frontageType || 'direct_frontage'}
                    onChange={(e) => setSellerAnswers({ ...sellerAnswers, frontageType: e.target.value, rooms: 0 })}
                  >
                    <option value="direct_frontage">{isAr ? 'واجهة مباشرة على شارع رئيسي' : 'Direct Main Street Frontage'}</option>
                    <option value="corner">{isAr ? 'محل ناصية على شارعين' : 'Corner Unit Dual Street'}</option>
                    <option value="commercial_strip">{isAr ? 'شريط تجاري حيوي' : 'Commercial Strip'}</option>
                    <option value="inside_mall">{isAr ? 'واجهة داخل ممر مول تجاري' : 'Inside Mall Corridor'}</option>
                  </select>
                </div>
              </div>
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.22)',
                fontSize: '0.82rem',
                color: 'var(--accent-gold, #d97706)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Store size={16} style={{ flexShrink: 0 }} />
                <span>{isAr ? '🏬 وحدة تجارية مرخصة (مساحة نشاط مفتوحة بدون غرف نوم سكنية)' : 'Commercial retail space (Open floor plan without residential bedrooms)'}</span>
              </div>
            </div>
          ) : sellerAnswers.propertyType === 'land' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="phase-inputs-row">
                <div className="form-group-flex">
                  <label>{isAr ? 'طبيعة الواجهة وعرض الشارع' : 'Frontage & Street Width'}</label>
                  <select
                    className="form-select-styled"
                    value={sellerAnswers.landStreet || 'wide_20'}
                    onChange={(e) => setSellerAnswers({ ...sellerAnswers, landStreet: e.target.value, rooms: 0, floor: 'ground' })}
                  >
                    <option value="wide_20">{isAr ? 'شارع رئيسي 20م فأكثر' : 'Main Street 20m+'}</option>
                    <option value="corner">{isAr ? 'ناصية مميزة على شارعين' : 'Prime Corner (2 Streets)'}</option>
                    <option value="mid_16">{isAr ? 'شارع 16 متر' : '16-Meter Street'}</option>
                    <option value="internal_12">{isAr ? 'شارع داخلي 10 - 12 متر' : 'Internal 10-12m Street'}</option>
                  </select>
                </div>

                <div className="form-group-flex">
                  <label>{isAr ? 'طبيعة الاستخدام والترخيص' : 'Zoning & Usage Permit'}</label>
                  <select
                    className="form-select-styled"
                    value={sellerAnswers.landZoning || 'residential_license'}
                    onChange={(e) => setSellerAnswers({ ...sellerAnswers, landZoning: e.target.value, rooms: 0, floor: 'ground' })}
                  >
                    <option value="residential_license">{isAr ? 'أرض مباني سكنية مرخصة' : 'Licensed Residential Plot'}</option>
                    <option value="commercial_mixed">{isAr ? 'سكني تجاري مختلط' : 'Mixed Commercial / Residential'}</option>
                    <option value="investment">{isAr ? 'استثماري / إداري متكامل' : 'Commercial Investment Plot'}</option>
                  </select>
                </div>
              </div>
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                fontSize: '0.82rem',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <MapPin size={16} style={{ flexShrink: 0 }} />
                <span>{isAr ? '📐 قطعة أرض فضاء استثمارية (بدون أدوار سكنية أو غرف نوم)' : 'Investment land plot (No residential floors or bedrooms)'}</span>
              </div>
            </div>
          ) : sellerAnswers.propertyType === 'office' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="phase-inputs-row">
                <div className="form-group-flex">
                  <label>{isAr ? 'الدور / الطابق' : 'Floor Level'}</label>
                  <select
                    className="form-select-styled"
                    value={sellerAnswers.floor || '2'}
                    onChange={(e) => setSellerAnswers({ ...sellerAnswers, floor: e.target.value })}
                  >
                    <option value="ground">{isAr ? 'أرضي / مدخل خاص' : 'Ground Floor / Private Entrance'}</option>
                    <option value="1">{isAr ? 'الدور الأول' : '1st Floor'}</option>
                    <option value="2">{isAr ? 'الدور الثاني' : '2nd Floor'}</option>
                    <option value="3">{isAr ? 'الدور الثالث' : '3rd Floor'}</option>
                    <option value="4">{isAr ? 'الدور الرابع' : '4th Floor'}</option>
                    <option value="5">{isAr ? 'الدور الخامس' : '5th Floor'}</option>
                    <option value="6">{isAr ? 'الدور السادس' : '6th Floor'}</option>
                    <option value="7">{isAr ? 'الدور السابع' : '7th Floor'}</option>
                    <option value="8">{isAr ? 'الدور الثامن' : '8th Floor'}</option>
                    <option value="9">{isAr ? 'الدور التاسع' : '9th Floor'}</option>
                    <option value="10">{isAr ? 'الدور العاشر' : '10th Floor'}</option>
                    <option value="11">{isAr ? 'الدور الحادي عشر' : '11th Floor'}</option>
                    <option value="12">{isAr ? 'الدور الثاني عشر' : '12th Floor'}</option>
                    <option value="13+">{isAr ? 'الدور 13 فأعلى' : '13th Floor or Higher'}</option>
                  </select>
                </div>

                <div className="form-group-flex">
                  <label>{isAr ? 'عدد الغرف الإدارية / التقسيمات' : 'Office Rooms / Divisions'}</label>
                  <select
                    className="form-select-styled"
                    value={sellerAnswers.divisionCount || '2'}
                    onChange={(e) => setSellerAnswers({ ...sellerAnswers, divisionCount: e.target.value, rooms: 0 })}
                  >
                    <option value="open">{isAr ? 'مساحة إدارية مفتوحة (Open Space)' : 'Open Space'}</option>
                    <option value="1">{isAr ? 'غرفة مكتب / عيادة مستقلة' : '1 Private Room'}</option>
                    <option value="2">{isAr ? 'غرفتان + ريسبشن استقبال' : '2 Rooms + Reception'}</option>
                    <option value="3">{isAr ? '3 غرف + ريسبشن استقبال' : '3 Rooms + Reception'}</option>
                    <option value="4+">{isAr ? '4 غرف إدارية فأكثر' : '4+ Administrative Rooms'}</option>
                  </select>
                </div>
              </div>
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.22)',
                fontSize: '0.82rem',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Briefcase size={16} style={{ flexShrink: 0 }} />
                <span>{isAr ? '💼 مقر إداري / عيادة مرخصة (تقسيمات إدارية متخصصة بدون غرف سكنية)' : 'Administrative / Medical facility (Corporate partitioning without residential rooms)'}</span>
              </div>
            </div>
          ) : sellerAnswers.propertyType === 'villa' ? (
            /* House / Villa / Full Building Specs */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="phase-inputs-row">
                <div className="form-group-flex">
                  <label>{isAr ? 'إجمالي عدد طوابق / أدوار المنزل' : 'Total Building Floors / Stories'}</label>
                  <select
                    className="form-select-styled"
                    value={sellerAnswers.totalFloors || sellerAnswers.floor || '2'}
                    onChange={(e) => setSellerAnswers({ 
                      ...sellerAnswers, 
                      totalFloors: e.target.value,
                      floor: `${e.target.value} ${isAr ? 'طوابق' : 'Floors'}`
                    })}
                  >
                    <option value="1">{isAr ? 'طابق واحد (أرضي فقط / فيلا دور واحد)' : '1 Floor (Ground Only)'}</option>
                    <option value="2">{isAr ? 'طابقان (أرضي + أول علوي)' : '2 Floors (Ground + 1)'}</option>
                    <option value="3">{isAr ? '3 طوابق (أرضي + دورين)' : '3 Floors (Ground + 2)'}</option>
                    <option value="4">{isAr ? '4 طوابق (أرضي + 3 أدوار)' : '4 Floors (Ground + 3)'}</option>
                    <option value="5">{isAr ? '5 طوابق (أرضي + 4 أدوار)' : '5 Floors (Ground + 4)'}</option>
                    <option value="6">{isAr ? '6 طوابق (أرضي + 5 أدوار)' : '6 Floors (Ground + 5)'}</option>
                    <option value="7">{isAr ? '7 طوابق' : '7 Floors'}</option>
                    <option value="8">{isAr ? '8 طوابق' : '8 Floors'}</option>
                    <option value="9">{isAr ? '9 طوابق' : '9 Floors'}</option>
                    <option value="10">{isAr ? '10 طوابق' : '10 Floors'}</option>
                    <option value="11">{isAr ? '11 طابقاً' : '11 Floors'}</option>
                    <option value="12+">{isAr ? '12 طابقاً فأكثر' : '12+ Floors'}</option>
                  </select>
                </div>

                <div className="form-group-flex">
                  <label>{isAr ? 'إجمالي عدد الغرف / الأجنحة بالمنزل' : 'Total Bedrooms / Suites'}</label>
                  <select
                    className="form-select-styled"
                    value={sellerAnswers.rooms || '5'}
                    onChange={(e) => setSellerAnswers({ ...sellerAnswers, rooms: e.target.value })}
                  >
                    <option value="3">{isAr ? '3 - 4 غرف' : '3 - 4 Rooms'}</option>
                    <option value="5">{isAr ? '5 - 6 غرف' : '5 - 6 Rooms'}</option>
                    <option value="7">{isAr ? '7 - 8 غرف' : '7 - 8 Rooms'}</option>
                    <option value="9">{isAr ? '9 - 10 غرف' : '9 - 10 Rooms'}</option>
                    <option value="12+">{isAr ? '12 غرفة فأكثر' : '12+ Rooms'}</option>
                  </select>
                </div>
              </div>
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.22)',
                fontSize: '0.82rem',
                color: 'var(--accent-gold, #d97706)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Home size={16} style={{ flexShrink: 0 }} />
                <span>{isAr ? '🏡 منزل مستقل / فيلا بالكامل: يشمل التقييم كامل أدوار المبنى وحصة الأرض الإجمالية.' : 'House / Full Building: Valuation covers all floors and the total land footprint.'}</span>
              </div>
            </div>
          ) : (
            /* Apartment Specs */
            <div className="phase-inputs-row">
              <div className="form-group-flex">
                <label>{isAr ? 'الدور / الطابق للشقة' : 'Apartment Floor Level'}</label>
                <select
                  className="form-select-styled"
                  value={sellerAnswers.floor || '3'}
                  onChange={(e) => setSellerAnswers({ ...sellerAnswers, floor: e.target.value })}
                >
                  <option value="ground">{isAr ? 'أرضي / مدخل خاص' : 'Ground Floor / Private Entrance'}</option>
                  <option value="1">{isAr ? 'الدور الأول' : '1st Floor'}</option>
                  <option value="2">{isAr ? 'الدور الثاني' : '2nd Floor'}</option>
                  <option value="3">{isAr ? 'الدور الثالث' : '3rd Floor'}</option>
                  <option value="4">{isAr ? 'الدور الرابع' : '4th Floor'}</option>
                  <option value="5">{isAr ? 'الدور الخامس' : '5th Floor'}</option>
                  <option value="6">{isAr ? 'الدور السادس' : '6th Floor'}</option>
                  <option value="7">{isAr ? 'الدور السابع' : '7th Floor'}</option>
                  <option value="8">{isAr ? 'الدور الثامن' : '8th Floor'}</option>
                  <option value="9">{isAr ? 'الدور التاسع' : '9th Floor'}</option>
                  <option value="10">{isAr ? 'الدور العاشر' : '10th Floor'}</option>
                  <option value="11">{isAr ? 'الدور الحادي عشر' : '11th Floor'}</option>
                  <option value="12">{isAr ? 'الدور الثاني عشر' : '12th Floor'}</option>
                  <option value="13+">{isAr ? 'الدور 13 فأعلى' : '13th Floor or Higher'}</option>
                  <option value="top">{isAr ? 'دور أخير مع روف (بنتهاوس)' : 'Top Floor + Roof (Penthouse)'}</option>
                </select>
              </div>

              <div className="form-group-flex">
                <label>{isAr ? 'عدد الغرف السكنية' : 'Bedrooms'}</label>
                <select
                  className="form-select-styled"
                  value={sellerAnswers.rooms || '3'}
                  onChange={(e) => setSellerAnswers({ ...sellerAnswers, rooms: e.target.value })}
                >
                  <option value="1">1 {isAr ? 'غرفة (استوديو)' : 'Room (Studio)'}</option>
                  <option value="2">2 {isAr ? 'غرف' : 'Rooms'}</option>
                  <option value="3">3 {isAr ? 'غرف' : 'Rooms'}</option>
                  <option value="4">4 {isAr ? 'غرف' : 'Rooms'}</option>
                  <option value="5+">5+ {isAr ? 'غرف أو أكثر' : '5+ Rooms'}</option>
                </select>
              </div>
            </div>
          )}

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
                <span>{isAr ? 'تقدير سعري استرشادي' : 'Indicative price estimate'}</span>
              </div>
              <span className="cert-date">{isAr ? 'تقدير آلي — ليس تقييماً رسمياً' : 'Automated — not a formal valuation'}</span>
            </div>

            {isCairo ? (
            <div className="cert-price-range">
              <span className="range-lbl">
                {isAr
                  ? 'عقارات القاهرة الكبرى نقيّمها يدوياً بمقارنات من نفس الكمبوند أو الحي. سجّل بياناتك ويتواصل معك مستشار التقييم.'
                  : 'Greater Cairo properties are valued manually against comparables in the same compound or district. Leave your details and a valuation advisor will call.'}
              </span>
            </div>
            ) : (
            <div className="cert-price-range">
              <span className="range-lbl">{isAr ? 'نطاق السعر المتوقع لعقارك:' : 'Estimated price range:'}</span>
              <div className="range-numbers">
                <strong>{calculatedEstimate.min.toLocaleString('en-US')}</strong>
                <span className="range-to">{isAr ? 'إلى' : 'to'}</span>
                <strong>{calculatedEstimate.max.toLocaleString('en-US')}</strong>
                <span className="range-curr">{isAr ? 'ج.م كاش' : 'EGP'}</span>
              </div>
              <span className="sqm-rate-sub">
                {isAr ? `متوسط سعر المتر المقدر: ${calculatedEstimate.sqmAvg.toLocaleString('en-US')} ج.م / م²` : `Est. ${calculatedEstimate.sqmAvg.toLocaleString('en-US')} EGP/sqm`}
              </span>
            </div>
            )}

            <div className="cert-perks-row">
              <div className="cert-perk"><CheckCircle2 size={15} className="text-success" /> <span>{isAr ? 'عرض أولي على المشترين المسجلين بطلبات مطابقة' : 'First shown to registered matching buyers'}</span></div>
              <div className="cert-perk"><CheckCircle2 size={15} className="text-success" /> <span>{isAr ? 'تصوير بروشور احترافي مجاناً' : 'Free Photo Brochure'}</span></div>
              <div className="cert-perk"><CheckCircle2 size={15} className="text-success" /> <span>{isAr ? 'معاينة مجانية للموقع' : 'Free on-site viewing'}</span></div>
              <div className="cert-perk">
                <ShieldCheck size={15} color={selectedLegalDocs.length > 0 ? '#10b981' : '#64748b'} />
                <span>
                  {selectedLegalDocs.length > 0
                    ? (isAr ? `توثيق: ${selectedLegalDocs.length} مستندات محددة` : `Audited: ${selectedLegalDocs.length} docs recorded`)
                    : (isAr ? 'تدقيق المستندات: مجاناً أثناء المعاينة' : 'Documents: Audited during visit')}
                </span>
              </div>
            </div>

            <div style={{
              marginTop: '14px',
              padding: '10px 14px',
              background: 'rgba(15, 23, 42, 0.04)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#64748b',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldCheck size={18} color="var(--accent-gold, #d97706)" style={{ flexShrink: 0 }} />
              <span>
                {isAr 
                  ? 'ملاحظة استشارية: هذا التقييم استرشادي رقمي مبني على مؤشرات صفقات سوهاج الميدانية 2026. يشمل طلبك معاينة مجانية لتدقيق الموقف القانوني والمعماري.' 
                  : 'Advisory Note: Digital valuation benchmarked on live 2026 transactions in Sohag with free on-site engineering audit.'}
              </span>
            </div>
          </div>

          {/* Contact Verification Form */}
          <form onSubmit={validateAndSubmit} className="seller-contact-submission-form">
            <h4 className="form-sub-title">{isAr ? 'سجل بياناتك لإرسال التقرير الكامل وعرض العقار فوراً' : 'Submit Details to Activate Listing & Receive Full PDF Report'}</h4>

            <div className="form-group-block">
              <label>{isAr ? 'الاسم بالكامل * (إلزامي)' : 'Full Name * (Required)'}</label>
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
                label={isAr ? 'رقم الهاتف الأساسي *' : 'Primary Phone Number *'}
                value={sellerAnswers.phone || ''}
                onChange={(phone) => {
                  const updated = { ...sellerAnswers, phone };
                  if (sameAsPhone) {
                    updated.whatsapp = phone;
                  }
                  setSellerAnswers(updated);
                  if (phoneError) setPhoneError('');
                  if (sameAsPhone && whatsappError) setWhatsappError('');
                }}
                country={sellerCountry}
                onCountryChange={(code) => {
                  setSellerCountry(code);
                  if (sameAsPhone) setWhatsappCountry(code);
                }}
                error={phoneError}
                required
              />
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  checked={sameAsPhone}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSameAsPhone(checked);
                    if (checked) {
                      setSellerAnswers(prev => ({ ...prev, whatsapp: prev.phone || '' }));
                      setWhatsappCountry(sellerCountry);
                      if (whatsappError) setWhatsappError('');
                    }
                  }}
                />
                <span>{isAr ? 'رقم الواتساب هو نفس رقم الهاتف الأساسي' : 'WhatsApp number is same as phone'}</span>
              </label>
            </div>

            <div className="form-group-block">
              <PhoneInputField
                label={isAr ? 'رقم الواتساب * (إلزامي لاستلام التقرير)' : 'WhatsApp * (Required for PDF Report)'}
                value={sellerAnswers.whatsapp || ''}
                onChange={(whatsapp) => {
                  setSellerAnswers({ ...sellerAnswers, whatsapp });
                  if (whatsapp !== sellerAnswers.phone) {
                    setSameAsPhone(false);
                  }
                  if (whatsappError) setWhatsappError('');
                }}
                country={whatsappCountry}
                onCountryChange={(code) => {
                  setWhatsappCountry(code);
                  if (code !== sellerCountry) setSameAsPhone(false);
                }}
                error={whatsappError}
                required
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
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                <Sparkles size={16} />
                <span>
                  {isSubmitting
                    ? (isAr ? 'جارٍ الإرسال…' : 'Sending…')
                    : (isAr ? 'أرسل عقاري للتقييم والمراجعة' : 'Send my property for valuation')}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
