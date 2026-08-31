import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calculator, 
  DollarSign, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Store, 
  Briefcase 
} from 'lucide-react';
import PhoneInputField, { SUPPORTED_COUNTRIES } from './PhoneInputField';

export const InvestorCenter = ({
  lang = 'ar',
  t,
  invAmount = 3000000,
  setInvAmount,
  invPeriod = 5,
  setInvPeriod,
  invPropType = 'commercial',
  setInvPropType,
  investorForm = {},
  setInvestorForm,
  showInvResultForm,
  setShowInvResultForm,
  roiRes,
  submitInvestorForm
}) => {
  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [whatsappError, setWhatsappError] = useState('');

  const isAr = lang === 'ar';

  // Dynamic ROI Yields based on property type in Sohag
  const yieldRates = {
    commercial: { name_ar: 'محلات ومساحات تجارية', yieldPercent: 15.5, growthPercent: 18.0, icon: Store },
    medical: { name_ar: 'عيادات ومراكز طبية', yieldPercent: 13.5, growthPercent: 16.5, icon: Briefcase },
    residential: { name_ar: 'شقق وأدوار سكنية فاخرة', yieldPercent: 9.5, growthPercent: 14.0, icon: Building2 }
  };

  const selectedYield = yieldRates[invPropType] || yieldRates.commercial;

  // Real-time financial calculations
  const investmentSim = useMemo(() => {
    const annualRent = Math.round(invAmount * (selectedYield.yieldPercent / 100));
    const totalRentOverPeriod = annualRent * invPeriod;
    const futureCapitalValue = Math.round(invAmount * Math.pow(1 + selectedYield.growthPercent / 100, invPeriod));
    const netProfit = (futureCapitalValue + totalRentOverPeriod) - invAmount;
    const totalRoiPercent = Math.round((netProfit / invAmount) * 100);

    return {
      annualRent,
      totalRentOverPeriod,
      futureCapitalValue,
      netProfit,
      totalRoiPercent
    };
  }, [invAmount, invPeriod, invPropType]);

  const validateAndSubmit = (e) => {
    e.preventDefault();

    const cleanPhone = (investorForm.phone || '').trim().replace(/[\s\-\(\)]/g, '');
    const cleanWhatsapp = (investorForm.whatsapp || '').trim().replace(/[\s\-\(\)]/g, '');

    const phoneCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === phoneCountry);
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

    const updatedForm = {
      ...investorForm,
      investmentAmount: invAmount,
      investmentPeriod: invPeriod,
      targetType: invPropType,
      projectedProfit: investmentSim.netProfit,
      phone: `${phoneCountry}${normalizedPhone}`,
      whatsapp: cleanWhatsapp ? `${whatsappCountry}${normalizedWhatsapp}` : ''
    };

    submitInvestorForm(updatedForm);
  };

  return (
    <div className="smart-valuation-wizard-box">
      {/* Top Asset Class Selector */}
      <div className="form-group-block">
        <label className="block-label">{isAr ? 'اختر فئة الاستثمار المستهدفة بسوهاج' : 'Select Target Investment Asset Class'}</label>
        <div className="options-pill-grid">
          {Object.entries(yieldRates).map(([key, data]) => {
            const IconC = data.icon;
            const isSelected = invPropType === key;
            return (
              <button
                key={key}
                type="button"
                className={`opt-pill-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setInvPropType(key)}
              >
                <IconC size={16} />
                <span>{isAr ? data.name_ar : key} ({data.yieldPercent}%)</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="phase-inputs-row">
        {/* Investment Capital Slider & Direct Input */}
        <div className="form-group-flex">
          <div className="flex-between">
            <label className="block-label">{isAr ? 'رأس المال المستثمر' : 'Investment Capital'}</label>
            <span className="text-gold font-bold">{(invAmount).toLocaleString()} ج.م</span>
          </div>
          <input
            type="range"
            min="500000"
            max="30000000"
            step="250000"
            value={invAmount}
            onChange={(e) => setInvAmount(parseInt(e.target.value))}
            className="styled-slider"
          />
          <div className="input-with-tag">
            <input
              type="number"
              min="500000"
              max="50000000"
              step="50000"
              value={invAmount}
              onChange={(e) => setInvAmount(parseInt(e.target.value) || 0)}
              className="form-input-styled"
            />
            <span className="input-tag">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        {/* Holding Period Slider */}
        <div className="form-group-flex">
          <div className="flex-between">
            <label className="block-label">{isAr ? 'مدة الاستثمار والاحتفاظ' : 'Holding Period'}</label>
            <span className="text-gold font-bold">{invPeriod} {isAr ? 'سنوات' : 'Years'}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={invPeriod}
            onChange={(e) => setInvPeriod(parseInt(e.target.value))}
            className="styled-slider"
          />
          <div className="input-with-tag">
            <input
              type="number"
              min="1"
              max="15"
              value={invPeriod}
              onChange={(e) => setInvPeriod(parseInt(e.target.value) || 1)}
              className="form-input-styled"
            />
            <span className="input-tag">{isAr ? 'سنوات' : 'Yrs'}</span>
          </div>
        </div>
      </div>

      {/* Dynamic ROI Simulation Output Card */}
      <div className="live-valuation-certificate-card" style={{ marginTop: '24px' }}>
        <div className="cert-header">
          <div className="cert-badge">
            <Sparkles size={16} className="text-gold" />
            <span>{isAr ? 'توقعات العائد المالي التراكمي' : 'Projected Investment Returns'}</span>
          </div>
          <span className="cert-date">{isAr ? `خلال ${invPeriod} سنوات` : `${invPeriod} Years Simulation`}</span>
        </div>

        <div className="cert-price-range">
          <span className="range-lbl">{isAr ? 'صافي الأرباح الرأسمالية والإيجارية المتوقعة:' : 'Projected Net Cumulative Profits:'}</span>
          <div className="range-numbers">
            <strong>+{investmentSim.netProfit.toLocaleString()}</strong>
            <span className="range-curr">{isAr ? 'ج.م ربح' : 'EGP'}</span>
          </div>
          <span className="sqm-rate-sub" style={{ color: '#4ade80' }}>
            {isAr ? `إجمالي العائد على الاستثمار: +${investmentSim.totalRoiPercent}% خلال المدة` : `Total ROI: +${investmentSim.totalRoiPercent}%`}
          </span>
        </div>

        <div className="calc-breakdown-list">
          <div className="calc-breakdown-glass-row">
            <span className="glass-row-lbl">{isAr ? 'العائد الإيجاري السنوي المتوقع' : 'Estimated Annual Rent'}</span>
            <strong className="text-emerald">{investmentSim.annualRent.toLocaleString()} ج.م / سنوياً</strong>
          </div>
          <div className="calc-breakdown-glass-row">
            <span className="glass-row-lbl">{isAr ? 'القيمة السوقية المتوقعة للأصل بعد المدة' : 'Projected Asset Capital Value'}</span>
            <strong className="text-gold">{investmentSim.futureCapitalValue.toLocaleString()} ج.م</strong>
          </div>
          <div className="calc-breakdown-glass-row">
            <span className="glass-row-lbl">{isAr ? 'إجمالي الإيجارات المحصلة خلال المدة' : 'Total Rental Income Collected'}</span>
            <strong className="text-sky">{investmentSim.totalRentOverPeriod.toLocaleString()} ج.م</strong>
          </div>
        </div>
      </div>

      {/* VIP Consultation Booking Form */}
      <form onSubmit={validateAndSubmit} className="seller-contact-submission-form" style={{ marginTop: '28px' }}>
        <h4 className="form-sub-title">{isAr ? 'احجز استشارة استثمارية خاصة مع مستشاري ون لاين (VIP)' : 'Book a Confidential VIP Investment Advisory Session'}</h4>

        <div className="phase-inputs-row">
          <div className="form-group-flex">
            <label>{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
            <input
              type="text"
              placeholder={isAr ? 'مثال: م. طارق الصاوي' : 'Full Name'}
              className="form-input-styled"
              value={investorForm.name || ''}
              onChange={(e) => setInvestorForm({ ...investorForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group-flex">
            <PhoneInputField
              label={isAr ? 'رقم الهاتف الأساسي' : 'Primary Phone Number'}
              value={investorForm.phone || ''}
              onChange={(phone) => {
                setInvestorForm({ ...investorForm, phone });
                if (phoneError) setPhoneError('');
              }}
              country={phoneCountry}
              onCountryChange={setPhoneCountry}
              error={phoneError}
              required
            />
          </div>
        </div>

        <div className="wizard-actions-bar">
          <button
            type="submit"
            className="btn btn-primary btn-submit-valuation"
          >
            <Sparkles size={16} />
            <span>{isAr ? 'طلب خطة المحفظة الاستثمارية وتحديد موعد VIP' : 'Request Portfolio Plan & Book Session'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
