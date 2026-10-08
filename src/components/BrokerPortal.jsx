import { useState } from 'react';
import {
  Sparkles, Users, FileCheck, Megaphone, Lock, FileSignature, MessageCircle
} from 'lucide-react';
import PhoneInputField from './PhoneInputField';
import { SUPPORTED_COUNTRIES } from '../utils/phoneCountries';
import { getAreas } from '../utils/areasData';
import { PROPERTY_TYPES } from '../data/propertiesData';

// What a broker gets from the network. Deliberately no rates or amounts: fees are agreed per deal in writing.
const BROKER_PERKS = [
  { Icon: Users, title_ar: 'طلبات مشترين جادة', title_en: 'Serious buyer requests',
    desc_ar: 'نوصّلك بطلبات شراء وإيجار فعلية بتوصلنا من الموقع والواتساب في منطقتك.',
    desc_en: 'We connect you with real purchase and rental requests reaching us in your area.' },
  { Icon: FileCheck, title_ar: 'مراجعة المستندات', title_en: 'Document review',
    desc_ar: 'فريقنا يراجع أوراق العقار قبل العرض، فتشتغل على صفقة أوضح وأسرع.',
    desc_en: 'Our team reviews the papers before listing, so your deals move with fewer surprises.' },
  { Icon: Megaphone, title_ar: 'دعم تسويقي', title_en: 'Marketing support',
    desc_ar: 'عرض عقاراتك على منصة 1Line بصفحة احترافية وصور وملف قابل للمشاركة.',
    desc_en: 'Your listings on the 1Line platform with a professional page, photos and a shareable brochure.' },
  { Icon: Lock, title_ar: 'عقارات خارج السوق', title_en: 'Off-market access',
    desc_ar: 'فرصة للتعاون على عقارات غير منشورة للعامة حسب كل صفقة.',
    desc_en: 'A chance to cooperate on properties not shown publicly, deal by deal.' },
  { Icon: FileSignature, title_ar: 'اتفاق مكتوب وواضح', title_en: 'Clear written terms',
    desc_ar: 'كل تعاون باتفاق مكتوب قبل البدء، يحدد دور كل طرف من غير لبس.',
    desc_en: 'Every cooperation starts with a written agreement setting out each side\'s role.' },
  { Icon: MessageCircle, title_ar: 'تواصل مباشر', title_en: 'Direct line',
    desc_ar: 'متابعة مع فريق 1Line على الواتساب من أول ترشيح لحد التعاقد.',
    desc_en: 'Follow-up with the 1Line team on WhatsApp from first lead to contract.' },
];

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

    const targetArea = brokerForm.area || 'new_sohag';
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


  return (
    <div className="smart-valuation-wizard-box">
      {/* No published rates: every arrangement is agreed in writing, deal by deal */}
      <div className="step-prompt-row">
        <h3>{isAr ? 'ليه تشتغل مع شبكة وسطاء 1Line؟' : 'Why work with the 1Line broker network?'}</h3>
        <p>{isAr
          ? 'سجّل بياناتك ونتواصل معك لنتفق على طريقة التعاون.'
          : 'Register and we will contact you to agree how we work together.'}</p>
      </div>

      <div className="prop-types-rich-grid broker-perks-grid" style={{ marginBottom: '16px' }}>
        {BROKER_PERKS.map(({ Icon, title_ar, title_en, desc_ar, desc_en }) => (
          <div key={title_en} className="prop-type-card">
            <div className="prop-type-icon" style={{ background: 'rgba(13, 72, 161, 0.08)' }}>
              <Icon size={22} style={{ color: 'var(--accent-gold)' }} />
            </div>
            <div className="prop-type-info">
              <h4>{isAr ? title_ar : title_en}</h4>
              <p>{isAr ? desc_ar : desc_en}</p>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 28px' }}>
        {isAr
          ? 'الأتعاب يتم الاتفاق عليها كتابياً لكل صفقة على حدة، ولا ينشأ أي التزام مالي قبل توقيع اتفاق مكتوب.'
          : 'Fees are agreed in writing for each deal; no financial obligation arises before a signed agreement.'}
      </p>

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
              value={brokerForm.area || 'new_sohag'}
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
            <span>{isAr ? 'سجّل كوسيط شريك' : 'Register as a partner broker'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
