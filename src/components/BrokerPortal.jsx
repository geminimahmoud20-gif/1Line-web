import { useState } from 'react';
import { 
  Award, 
  Sparkles 
} from 'lucide-react';
import PhoneInputField from './PhoneInputField';
import { SUPPORTED_COUNTRIES } from '../utils/phoneCountries';
import { getAreas } from '../utils/areasData';
import { PROPERTY_TYPES } from '../data/propertiesData';

export const BrokerPortal = ({
  lang = 'ar',
  brokerForm = {},
  setBrokerForm,
  submitBrokerPortal
}) => {
  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [whatsappError, setWhatsappError] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(true);

  const isAr = lang === 'ar';

  const validateAndSubmit = (e) => {
    e.preventDefault();

    const cleanPhone = (brokerForm.phone || '').trim().replace(/[\s\-()]/g, '');
    const cleanWhatsapp = (brokerForm.whatsapp || '').trim().replace(/[\s\-()]/g, '');

    if (!brokerForm.name || !brokerForm.name.trim()) {
      return;
    }

    if (!cleanWhatsapp) {
      setWhatsappError(isAr ? 'رقم الواتساب إلزامي لتفعيل حساب الوسيط واستلام الصفقات' : 'WhatsApp number is required');
      return;
    }

    const phoneCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === phoneCountry);
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

    const targetArea = brokerForm.area || 'sohag_jadida';
    const targetType = brokerForm.propertyType || 'apartment';

    const normalizedPhone = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
    const normalizedWhatsapp = cleanWhatsapp.startsWith('0') ? cleanWhatsapp.substring(1) : cleanWhatsapp;

    const updatedForm = {
      ...brokerForm,
      name: brokerForm.name.trim(),
      phone: `${phoneCountry}${normalizedPhone}`,
      whatsapp: `${whatsappCountry}${normalizedWhatsapp}`,
      area: targetArea,
      propertyType: targetType,
      type: 'broker',
      source: 'بوابة الوسطاء والشركاء',
      notes: `تسجيل وسيط معتمد (خبرة: ${brokerForm.experience || '3'} سنوات) - المنطقة: ${targetArea} | التخصص: ${targetType}`
    };

    submitBrokerPortal(updatedForm);
  };

  const commissionTiers = [
    { title_ar: 'وسيط معتمد (Silver)', rate: '2.0%', desc_ar: 'وصول لمخزون الوحدات المباشرة + إغلاق سريع', color: '#94a3b8' },
    { title_ar: 'شريك ذهبي (Gold Partner)', rate: '2.5% + بونص', desc_ar: 'أولوية في حجز مشروعات سوهاج الجديدة + عمولات فورية', color: '#ffca28', featured: true },
    { title_ar: 'شريك استراتيجي (VIP Club)', rate: '3.0% + دعم تسويقي', desc_ar: 'تمويل حملات إعلانية مشتركة ورعاية صفقات كبرى', color: '#38bdf8' }
  ];

  return (
    <div className="smart-valuation-wizard-box">
      {/* Commission Tiers Strip */}
      <div className="step-prompt-row">
        <h3>{isAr ? 'باقات وحوافز شبكة وسطاء 1Line بسوهاج' : 'Broker Commission Tiers & Partner Benefits'}</h3>
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
            <label>{isAr ? 'الاسم بالكامل / اسم الشركة العقارية * (إلزامي)' : 'Full Name / Agency Name * (Required)'}</label>
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

        <div className="phase-inputs-row" style={{ marginTop: '14px' }}>
          <div className="form-group-flex">
            <label>{isAr ? 'الموقع / منطقة نشاطك الأساسية بسوهاج * (إلزامي)' : 'Primary District in Sohag * (Required)'}</label>
            <select
              className="form-select-styled"
              value={brokerForm.area || 'sohag_jadida'}
              onChange={(e) => setBrokerForm({ ...brokerForm, area: e.target.value })}
              required
            >
              {getAreas().filter(a => a.id !== 'all').map(a => (
                <option key={a.id} value={a.id}>{isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}</option>
              ))}
            </select>
          </div>

          <div className="form-group-flex">
            <label>{isAr ? 'فئات العقارات التي تعمل عليها * (إلزامي)' : 'Property Category * (Required)'}</label>
            <select
              className="form-select-styled"
              value={brokerForm.propertyType || 'apartment'}
              onChange={(e) => setBrokerForm({ ...brokerForm, propertyType: e.target.value })}
              required
            >
              {PROPERTY_TYPES.filter(t => t.id !== 'all').map(t => (
                <option key={t.id} value={t.id}>{isAr ? t.name_ar : t.name_en}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="phase-inputs-row" style={{ marginTop: '14px' }}>
          <div className="form-group-flex">
            <PhoneInputField
              label={isAr ? 'رقم الهاتف الأساسي *' : 'Primary Phone *'}
              value={brokerForm.phone || ''}
              onChange={(phone) => {
                const updated = { ...brokerForm, phone };
                if (sameAsPhone) {
                  updated.whatsapp = phone;
                }
                setBrokerForm(updated);
                if (phoneError) setPhoneError('');
                if (sameAsPhone && whatsappError) setWhatsappError('');
              }}
              country={phoneCountry}
              onCountryChange={(code) => {
                setPhoneCountry(code);
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
                    setBrokerForm(prev => ({ ...prev, whatsapp: prev.phone || '' }));
                    setWhatsappCountry(phoneCountry);
                    if (whatsappError) setWhatsappError('');
                  }
                }}
              />
              <span>{isAr ? 'رقم الواتساب هو نفس رقم الهاتف الأساسي' : 'WhatsApp number is same as phone'}</span>
            </label>
          </div>

          <div className="form-group-flex">
            <PhoneInputField
              label={isAr ? 'رقم الواتساب * (إلزامي لاستلام الصفقات)' : 'WhatsApp Number * (Required)'}
              value={brokerForm.whatsapp || ''}
              onChange={(whatsapp) => {
                setBrokerForm({ ...brokerForm, whatsapp });
                if (whatsapp !== brokerForm.phone) {
                  setSameAsPhone(false);
                }
                if (whatsappError) setWhatsappError('');
              }}
              country={whatsappCountry}
              onCountryChange={(code) => {
                setWhatsappCountry(code);
                if (code !== phoneCountry) setSameAsPhone(false);
              }}
              error={whatsappError}
              required
            />
          </div>
        </div>

        <div className="wizard-actions-bar">
          <button
            type="submit"
            className="btn btn-primary btn-submit-valuation"
          >
            <Sparkles size={16} className="text-gold" />
            <span>{isAr ? 'تأكيد التسجيل وتفعيل حساب الشريك المعتمد' : 'Activate Certified Broker Partner Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
