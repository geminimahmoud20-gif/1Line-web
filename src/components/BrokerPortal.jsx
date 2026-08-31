import React, { useState } from 'react';
import { 
  Users, 
  Award, 
  DollarSign, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp, 
  Building 
} from 'lucide-react';
import PhoneInputField, { SUPPORTED_COUNTRIES } from './PhoneInputField';

export const BrokerPortal = ({
  lang = 'ar',
  t,
  brokerForm = {},
  setBrokerForm,
  handleBrokerCheckbox,
  submitBrokerPortal
}) => {
  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [whatsappError, setWhatsappError] = useState('');

  const isAr = lang === 'ar';

  const validateAndSubmit = (e) => {
    e.preventDefault();

    const phoneCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === phoneCountry);
    const isPhoneValid = phoneCountryObj ? phoneCountryObj.regex.test(brokerForm.phone) : true;
    
    let isWhatsappValid = true;
    if (brokerForm.whatsapp) {
      const whatsappCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === whatsappCountry);
      isWhatsappValid = whatsappCountryObj ? whatsappCountryObj.regex.test(brokerForm.whatsapp) : true;
    }

    if (!isPhoneValid) {
      setPhoneError(isAr ? 'رقم الهاتف غير متوافق مع صيغة الدولة المحددة' : 'Phone number does not match country format');
      return;
    }
    
    if (brokerForm.whatsapp && !isWhatsappValid) {
      setWhatsappError(isAr ? 'رقم الواتساب غير متوافق مع صيغة الدولة المحددة' : 'WhatsApp number does not match country format');
      return;
    }

    const updatedForm = {
      ...brokerForm,
      phone: `${phoneCountry}${brokerForm.phone}`,
      whatsapp: brokerForm.whatsapp ? `${whatsappCountry}${brokerForm.whatsapp}` : ''
    };

    submitBrokerPortal(updatedForm);
  };

  const commissionTiers = [
    { title_ar: 'وسيط معتمد (Silver)', rate: '2.0%', desc_ar: 'وصول لمخزون الوحدات المباشرة + إغلاق سريع', color: '#94a3b8' },
    { title_ar: 'شريك ذهبي (Gold Partner)', rate: '2.5% + بونص', desc_ar: 'أولوية في حجز مشروعات سوهاج الجديدة + عمولات فورية', color: '#fbbf24', featured: true },
    { title_ar: 'شريك استراتيجي (VIP Club)', rate: '3.0% + دعم تسويقي', desc_ar: 'تمويل حملات إعلانية مشتركة ورعاية صفقات كبرى', color: '#38bdf8' }
  ];

  return (
    <div className="smart-valuation-wizard-box">
      {/* Commission Tiers Strip */}
      <div className="step-prompt-row">
        <h3>{isAr ? 'باقات وحوافز شبكة وسطاء ون لاين بسوهاج' : 'Broker Commission Tiers & Partner Benefits'}</h3>
        <p>{isAr ? 'انضم لأكثر من 120 وسيطاً معتمداً واستفد من أسرع نظام صرف عمولات في الصعيد' : 'Join 120+ verified brokers with instant payouts'}</p>
      </div>

      <div className="prop-types-rich-grid" style={{ marginBottom: '32px' }}>
        {commissionTiers.map((tier, idx) => (
          <div key={idx} className={`prop-type-card ${tier.featured ? 'selected' : ''}`}>
            <div className="prop-type-icon" style={{ background: tier.featured ? 'var(--primary)' : 'rgba(13, 72, 161, 0.08)' }}>
              <Award size={24} style={{ color: tier.featured ? '#ffffff' : tier.color }} />
            </div>
            <div className="prop-type-info">
              <h4>{isAr ? tier.title_ar : ''}</h4>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--accent-gold)', marginBottom: '4px' }}>
                {tier.rate}
              </div>
              <p>{isAr ? tier.desc_ar : ''}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Broker Registration Form */}
      <form onSubmit={validateAndSubmit} className="seller-contact-submission-form">
        <h4 className="form-sub-title">{isAr ? 'سجل بياناتك ومكتبك العقاري للانضمام الفوري' : 'Register Broker / Agency Profile'}</h4>

        <div className="phase-inputs-row">
          <div className="form-group-flex">
            <label>{isAr ? 'الاسم بالكامل / اسم الشركة العقارية' : 'Full Name / Agency Name'}</label>
            <input
              type="text"
              placeholder={isAr ? 'مثال: أسامة القاضي (القاضي للتسويق العقاري)' : 'Agency Name'}
              className="form-input-styled"
              value={brokerForm.name || ''}
              onChange={(e) => setBrokerForm({ ...brokerForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group-flex">
            <label>{isAr ? 'سنوات الخبرة في سوق سوهاج' : 'Years of Experience in Sohag'}</label>
            <select
              className="form-select-styled"
              value={brokerForm.experience || '3'}
              onChange={(e) => setBrokerForm({ ...brokerForm, experience: e.target.value })}
            >
              <option value="1">1 {isAr ? 'سنة خبرة' : 'Year'}</option>
              <option value="2">2 {isAr ? 'سنتان' : 'Years'}</option>
              <option value="3">3-5 {isAr ? 'سنوات' : 'Years'}</option>
              <option value="5+">5+ {isAr ? 'سنوات أو أكثر' : 'Years+'}</option>
            </select>
          </div>
        </div>

        <div className="phase-inputs-row">
          <div className="form-group-flex">
            <PhoneInputField
              label={isAr ? 'رقم الهاتف الأساسي' : 'Primary Phone'}
              value={brokerForm.phone || ''}
              onChange={(phone) => {
                setBrokerForm({ ...brokerForm, phone });
                if (phoneError) setPhoneError('');
              }}
              country={phoneCountry}
              onCountryChange={setPhoneCountry}
              error={phoneError}
              required
            />
          </div>

          <div className="form-group-flex">
            <PhoneInputField
              label={isAr ? 'رقم الواتساب (لاستلام ملفات الوحدات الحصرية)' : 'WhatsApp (To receive exclusive inventory)'}
              value={brokerForm.whatsapp || ''}
              onChange={(whatsapp) => {
                setBrokerForm({ ...brokerForm, whatsapp });
                if (whatsappError) setWhatsappError('');
              }}
              country={whatsappCountry}
              onCountryChange={setWhatsappCountry}
              error={whatsappError}
            />
          </div>
        </div>

        <div className="wizard-actions-bar">
          <button
            type="submit"
            className="btn btn-primary btn-submit-valuation"
          >
            <Sparkles size={16} />
            <span>{isAr ? 'تأكيد التسجيل وتفعيل حساب الشريك المعتمد' : 'Activate Certified Broker Partner Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
