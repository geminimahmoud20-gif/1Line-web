import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Building, 
  MapPin, 
  Eye, 
  KeyRound 
} from 'lucide-react';
import PhoneInputField, { SUPPORTED_COUNTRIES } from './PhoneInputField';

export const VaultPortal = ({
  lang = 'ar',
  t,
  triggerToast,
  handleAddNewLead
}) => {
  const [showVaultUnlockModal, setShowVaultUnlockModal] = useState(false);
  const [selectedVaultProperty, setSelectedVaultProperty] = useState(null);
  
  const [vaultForm, setVaultForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    confirmedBudget: '5,000,000'
  });

  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [whatsappError, setWhatsappError] = useState('');

  const isAr = lang === 'ar';

  const validateAndSubmit = (e) => {
    e.preventDefault();

    const phoneCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === phoneCountry);
    const isPhoneValid = phoneCountryObj ? phoneCountryObj.regex.test(vaultForm.phone) : true;
    
    let isWhatsappValid = true;
    if (vaultForm.whatsapp) {
      const whatsappCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === whatsappCountry);
      isWhatsappValid = whatsappCountryObj ? whatsappCountryObj.regex.test(vaultForm.whatsapp) : true;
    }

    if (!isPhoneValid) {
      setPhoneError(isAr ? 'رقم الهاتف غير متوافق مع صيغة الدولة المحددة' : 'Phone number does not match country format');
      return;
    }
    
    if (vaultForm.whatsapp && !isWhatsappValid) {
      setWhatsappError(isAr ? 'رقم الواتساب غير متوافق مع صيغة الدولة المحددة' : 'WhatsApp number does not match country format');
      return;
    }

    const updatedForm = {
      ...vaultForm,
      phone: `${phoneCountry}${vaultForm.phone}`,
      whatsapp: vaultForm.whatsapp ? `${whatsappCountry}${vaultForm.whatsapp}` : '',
      propertyType: selectedVaultProperty?.type || 'vault_unit',
      targetProperty: selectedVaultProperty?.desc_ar || 'Off-Market Asset',
      urgency: 'high'
    };

    if (handleAddNewLead) {
      handleAddNewLead('vault', updatedForm, 'Vault Unlock Form');
    }
    setShowVaultUnlockModal(false);
    setSelectedVaultProperty(null);
    setVaultForm({ name: '', phone: '', whatsapp: '', confirmedBudget: '5,000,000' });
    if (triggerToast) {
      triggerToast(isAr ? 'تم استلام طلبك لفك القفل وسيقوم المستشار المعتمد بالتواصل معك فوراً!' : 'Unlock request submitted successfully!');
    }
  };

  const properties = [
    { 
      id: 'v1', 
      type_ar: 'فيلا مستقلة VIP', 
      area_ar: 'سوهاج الجديدة - كمبوند النخبة', 
      desc_ar: 'فيلا مستقلة صف أول مطلة على المحور الرئيسي مباشرة مع حمام سباحة خاص', 
      size: '550 م²', 
      estPrice: '9,500,000 ج.م' 
    },
    { 
      id: 'v2', 
      type_ar: 'أرض تجارية استثمارية', 
      area_ar: 'شرق سوهاج - شارع الجمهورية', 
      desc_ar: 'أرض تجارية ناصية صريحة مرخصة برج سكني تجاري أو مجمع طبي متكامل', 
      size: '1,200 م²', 
      estPrice: '26,000,000 ج.م' 
    },
    { 
      id: 'v3', 
      type_ar: 'بنتهاوس بانورامي', 
      area_ar: 'كورنيش النيل الشرقي', 
      desc_ar: 'بنتهاوس فاخر بتراس خاص وإطلالة بانورامية مباشرة وغير محجوبة على النيل', 
      size: '340 م²', 
      estPrice: '8,200,000 ج.م' 
    }
  ];

  return (
    <div className="smart-valuation-wizard-box">
      <div className="step-prompt-row">
        <h3>{isAr ? 'العقارات السرية الحصرية (Off-Market Vault)' : 'Confidential Off-Market Real Estate Assets'}</h3>
        <p>{isAr ? 'عقارات وصفقات استثنائية لا تُعرض للعلن حفاظاً على خصوصية الملاك. انقر على العقار لطلب فك القفل ومعاينة الملف السري.' : 'Confidential deals not listed on public portals. Click to request authorized unlock access.'}</p>
      </div>

      {/* Blurred Confidential Cards Grid */}
      <div className="prop-types-rich-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {properties.map((prop) => (
          <div 
            key={prop.id} 
            className="prop-type-card" 
            style={{ 
              flexDirection: 'column', 
              position: 'relative', 
              overflow: 'hidden',
              background: '#ffffff',
              border: '1.5px solid rgba(251, 191, 36, 0.4)'
            }}
            onClick={() => {
              setSelectedVaultProperty(prop);
              setShowVaultUnlockModal(true);
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
              <span className="badge badge-gold" style={{ fontSize: '0.74rem' }}>{prop.type_ar}</span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '700' }}>{prop.area_ar}</span>
            </div>

            {/* Blurred Content */}
            <div style={{ filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none', margin: '8px 0' }}>
              <h4 style={{ fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '6px' }}>{prop.desc_ar}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>المساحة: {prop.size} | السعر: {prop.estPrice}</p>
            </div>

            {/* Unlock Floating Action Overlay */}
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(9, 35, 71, 0.4)', 
              backdropFilter: 'blur(2px)', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px' 
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gold)', color: '#0d2c54', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={20} />
              </div>
              <span style={{ color: '#ffffff', fontWeight: '900', fontSize: '0.82rem' }}>
                {isAr ? 'اضغط لطلب فك القفل 🔓' : 'Request Security Unlock'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Unlock Request Modal */}
      {showVaultUnlockModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowVaultUnlockModal(false)}>
          <div className="modal-card-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-flex">
              <div className="flex-center gap-8">
                <KeyRound size={20} className="text-gold" />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{isAr ? 'طلب تصريح فك القفل ومعاينة الأصل السري' : 'Request Off-Market Unlock Authorization'}</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setShowVaultUnlockModal(false)}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: 1.5 }}>
              {isAr 
                ? 'نظراً لسرية العقار، يرجى تسجيل بياناتك ليقوم مستشار كبار العملاء بإرسال كود فك القفل والملف القانوني المعتمد.' 
                : 'To maintain confidentiality, enter your details to receive authorized access credentials.'}
            </p>

            <form onSubmit={validateAndSubmit} className="seller-contact-submission-form">
              <div className="form-group-block">
                <label>{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
                <input
                  type="text"
                  placeholder={isAr ? 'مثال: المستشار محمد عبد العال' : 'Full Name'}
                  className="form-input-styled"
                  value={vaultForm.name}
                  onChange={(e) => setVaultForm({ ...vaultForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group-block">
                <PhoneInputField
                  label={isAr ? 'رقم الهاتف الأساسي' : 'Primary Phone'}
                  value={vaultForm.phone}
                  onChange={(phone) => {
                    setVaultForm({ ...vaultForm, phone });
                    if (phoneError) setPhoneError('');
                  }}
                  country={phoneCountry}
                  onCountryChange={setPhoneCountry}
                  error={phoneError}
                  required
                />
              </div>

              <div className="form-group-block">
                <PhoneInputField
                  label={isAr ? 'رقم الواتساب (لاستلام البروشور السري)' : 'WhatsApp (To receive private brochure)'}
                  value={vaultForm.whatsapp}
                  onChange={(whatsapp) => {
                    setVaultForm({ ...vaultForm, whatsapp });
                    if (whatsappError) setWhatsappError('');
                  }}
                  country={whatsappCountry}
                  onCountryChange={setWhatsappCountry}
                  error={whatsappError}
                />
              </div>

              <div className="wizard-actions-bar space-between">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVaultUnlockModal(false)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary btn-submit-valuation">
                  <Sparkles size={16} />
                  <span>{isAr ? 'إرسال طلب فتح الخزينة' : 'Submit Unlock Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
