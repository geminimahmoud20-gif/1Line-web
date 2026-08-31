import React, { useState } from 'react';
import PhoneInputField, { SUPPORTED_COUNTRIES } from './PhoneInputField';

export const SpecialRequests = ({
  lang,
  t,
  specialForm,
  setSpecialForm,
  submitSpecialRequest
}) => {
  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [whatsappError, setWhatsappError] = useState('');

  const validateAndSubmit = (e) => {
    e.preventDefault();

    // Check phone number format
    const phoneCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === phoneCountry);
    const isPhoneValid = phoneCountryObj ? phoneCountryObj.regex.test(specialForm.phone) : true;
    
    // Check whatsapp format if provided
    let isWhatsappValid = true;
    if (specialForm.whatsapp) {
      const whatsappCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === whatsappCountry);
      isWhatsappValid = whatsappCountryObj ? whatsappCountryObj.regex.test(specialForm.whatsapp) : true;
    }

    if (!isPhoneValid) {
      setPhoneError(lang === 'ar' ? 'رقم الهاتف غير متوافق مع صيغة الدولة المحددة' : 'Phone number does not match country format');
      return;
    }
    
    if (specialForm.whatsapp && !isWhatsappValid) {
      setWhatsappError(lang === 'ar' ? 'رقم الواتساب غير متوافق مع صيغة الدولة المحددة' : 'WhatsApp number does not match country format');
      return;
    }

    // Include country code in values submitted
    const updatedForm = {
      ...specialForm,
      phone: `${phoneCountry}${specialForm.phone}`,
      whatsapp: specialForm.whatsapp ? `${whatsappCountry}${specialForm.whatsapp}` : ''
    };

    submitSpecialRequest(updatedForm);
  };

  return (
    <div className="wizard-container">
      <h2 className="wizard-question">{t.reqTitle}</h2>
      <p className="wizard-subtitle" style={{ marginBottom: '30px' }}>{t.reqSub}</p>

      <form onSubmit={validateAndSubmit} className="wizard-step-container">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t.stepPropType}</label>
            <select 
              className="form-input" 
              required 
              value={specialForm.propertyType}
              onChange={(e) => setSpecialForm({...specialForm, propertyType: e.target.value})}
            >
              <option value="">-- اختر النوع --</option>
              <option value="apartment">{t.apartment}</option>
              <option value="villa">{t.villa}</option>
              <option value="land">{t.land}</option>
              <option value="office">{t.office}</option>
              <option value="retail">{t.retail}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t.stepArea}</label>
            <select 
              className="form-input" 
              required 
              value={specialForm.area}
              onChange={(e) => setSpecialForm({...specialForm, area: e.target.value})}
            >
              <option value="">-- اختر المنطقة --</option>
              <option value="east">{t.east}</option>
              <option value="new_sohag">{t.new_sohag}</option>
              <option value="kawthar">{t.kawthar}</option>
              <option value="center">{t.center}</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">الميزانية المقترحة (جنيه مصري)</label>
            <input 
              type="text" 
              required 
              placeholder="مثال: 5,000,000" 
              className="form-input" 
              value={specialForm.budget}
              onChange={(e) => setSpecialForm({...specialForm, budget: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.priority}</label>
            <select 
              className="form-input" 
              value={specialForm.priority}
              onChange={(e) => setSpecialForm({...specialForm, priority: e.target.value})}
            >
              <option value="low">{t.low}</option>
              <option value="normal">{t.normal}</option>
              <option value="high">{t.urgent}</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.specCond}</label>
          <textarea 
            rows="4" 
            placeholder="مثال: شقة بمساحة لا تقل عن 200م، تشطيب الترا لوكس، إطلالة أمامية على النيل مباشرة، طابق رابع أو خامس." 
            className="form-input"
            style={{ resize: 'none' }}
            value={specialForm.specialConditions}
            onChange={(e) => setSpecialForm({...specialForm, specialConditions: e.target.value})}
          ></textarea>
        </div>

        <hr style={{ borderColor: 'var(--border-light)', margin: '10px 0' }} />

        <div className="form-group">
          <label className="form-label">{t.fullName}</label>
          <input 
            type="text" 
            required 
            className="form-input" 
            value={specialForm.name}
            onChange={(e) => setSpecialForm({...specialForm, name: e.target.value})}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <PhoneInputField
              phone={specialForm.phone}
              setPhone={(val) => {
                setSpecialForm({...specialForm, phone: val});
                setPhoneError('');
              }}
              country={phoneCountry}
              setCountry={setPhoneCountry}
              error={phoneError}
              label={t.phoneNum}
            />
          </div>
          <div className="form-group">
            <PhoneInputField
              phone={specialForm.whatsapp}
              setPhone={(val) => {
                setSpecialForm({...specialForm, whatsapp: val});
                setWhatsappError('');
              }}
              country={whatsappCountry}
              setCountry={setWhatsappCountry}
              error={whatsappError}
              label={t.whatsappNum}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '20px' }}>
          {lang === 'ar' ? 'تقديم الطلب للبحث العقاري الذكي' : 'Submit Special Opportunity Request'}
        </button>
      </form>
    </div>
  );
};

export default SpecialRequests;
