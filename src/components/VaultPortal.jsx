import { useState } from 'react';
import { 
  Lock, 
  Unlock,
  X, 
  Sparkles, 
  KeyRound,
  CheckCircle2,
  Phone,
  MessageSquare
} from 'lucide-react';
import PhoneInputField from './PhoneInputField';
import { SUPPORTED_COUNTRIES } from '../utils/phoneCountries';
import { getWhatsAppUrl, getDynamicPhone } from '../utils/founderCmsData';

export const VaultPortal = ({
  lang = 'ar',
  triggerToast,
  handleAddNewLead
}) => {
  const [showVaultUnlockModal, setShowVaultUnlockModal] = useState(false);
  const [selectedVaultProperty, setSelectedVaultProperty] = useState(null);
  const [unlockedVaultIds, setUnlockedVaultIds] = useState(() => {
    try {
      const stored = sessionStorage.getItem('oneline_unlocked_vault_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
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
  const dynamicPhone = getDynamicPhone();

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
      propertyType: selectedVaultProperty?.type_ar || 'vault_unit',
      targetProperty: selectedVaultProperty?.desc_ar || 'Off-Market Asset',
      urgency: 'high'
    };

    if (handleAddNewLead) {
      handleAddNewLead('vault', updatedForm, 'Vault Unlock Form');
    }

    if (selectedVaultProperty?.id) {
      setUnlockedVaultIds(prev => {
        const updated = [...new Set([...prev, selectedVaultProperty.id])];
        try {
          sessionStorage.setItem('oneline_unlocked_vault_ids', JSON.stringify(updated));
        } catch {
          // storage fallback
        }
        return updated;
      });
    }

    setShowVaultUnlockModal(false);
    setVaultForm({ name: '', phone: '', whatsapp: '', confirmedBudget: '5,000,000' });
    if (triggerToast) {
      triggerToast(
        isAr 
          ? 'تم فك قفل الأصل السري بنجاح! يمكنك الآن استعراض التفاصيل الكاملة والتواصل مع المستشار.' 
          : 'Asset unlocked successfully! You can now explore full details.',
        'success'
      );
    }
  };

  const properties = [
    { 
      id: 'v1', 
      type_ar: 'فيلا مستقلة VIP', 
      type_en: 'Standalone VIP Villa',
      area_ar: 'سوهاج الجديدة - كمبوند النخبة', 
      area_en: 'New Sohag - Elite Compound',
      desc_ar: 'فيلا مستقلة صف أول مطلة على المحور الرئيسي مباشرة مع حمام سباحة خاص وحديقة 200م', 
      desc_en: 'Prime front-row villa facing main axis with private pool and 200 sqm garden',
      size: '550 م²', 
      estPrice: '9,500,000 ج.م',
      roi_ar: 'عائد إعادة بيع متوقع 22% سنوياً',
      advisorContact: dynamicPhone
    },
    { 
      id: 'v2', 
      type_ar: 'أرض تجارية استثمارية', 
      type_en: 'Commercial Investment Land',
      area_ar: 'شرق سوهاج - شارع الجمهورية', 
      area_en: 'East Sohag - El Gomhoureya St',
      desc_ar: 'أرض تجارية ناصية صريحة مرخصة برج سكني تجاري أو مجمع طبي متكامل مع بدروم جراج', 
      desc_en: 'Corner commercial plot licensed for commercial/medical tower with basement parking',
      size: '1,200 م²', 
      estPrice: '26,000,000 ج.م',
      roi_ar: 'عائد إيجاري وتشغيلي سنوي متوقع 18%',
      advisorContact: dynamicPhone
    },
    { 
      id: 'v3', 
      type_ar: 'بنتهاوس بانورامي', 
      type_en: 'Panoramic Penthouse',
      area_ar: 'كورنيش النيل الشرقي', 
      area_en: 'East Nile Corniche',
      desc_ar: 'بنتهاوس فاخر بتراس خاص وإطلالة بانورامية مباشرة وغير محجوبة على نيل سوهاج', 
      desc_en: 'Luxury penthouse with private terrace and 180 unobstructed direct Nile view',
      size: '340 م²', 
      estPrice: '8,200,000 ج.م',
      roi_ar: 'عائد استثماري وفندقي 15% سنوياً',
      advisorContact: dynamicPhone
    }
  ];

  return (
    <div className="smart-valuation-wizard-box">
      <div className="step-prompt-row">
        <h3>{isAr ? 'العقارات السرية الحصرية (Off-Market Vault)' : 'Confidential Off-Market Real Estate Assets'}</h3>
        <p>{isAr ? 'عقارات وصفقات استثنائية لا تُعرض للعلن حفاظاً على خصوصية الملاك. انقر على العقار لطلب فك القفل ومعاينة الملف السري.' : 'Confidential deals not listed on public portals. Click to request authorized unlock access.'}</p>
      </div>

      {/* Confidential Cards Grid */}
      <div className="prop-types-rich-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {properties.map((prop) => {
          const isUnlocked = unlockedVaultIds.includes(prop.id);

          return (
            <div 
              key={prop.id} 
              className="prop-type-card" 
              style={{ 
                flexDirection: 'column', 
                position: 'relative', 
                overflow: 'hidden',
                background: isUnlocked ? 'var(--bg-card, #ffffff)' : '#ffffff',
                border: isUnlocked ? '1.5px solid #10b981' : '1.5px solid rgba(251, 191, 36, 0.4)',
                boxShadow: isUnlocked ? '0 10px 30px rgba(16, 185, 129, 0.15)' : 'none',
                cursor: isUnlocked ? 'default' : 'pointer'
              }}
              onClick={() => {
                if (!isUnlocked) {
                  setSelectedVaultProperty(prop);
                  setShowVaultUnlockModal(true);
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                <span className={`badge ${isUnlocked ? 'badge-success' : 'badge-gold'}`} style={{ fontSize: '0.74rem', background: isUnlocked ? 'rgba(16, 185, 129, 0.15)' : undefined, color: isUnlocked ? '#10b981' : undefined }}>
                  {isUnlocked ? (isAr ? '🔓 أصل سري مفتوح' : '🔓 Unlocked Deal') : (isAr ? prop.type_ar : prop.type_en)}
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '700' }}>{isAr ? prop.area_ar : prop.area_en}</span>
              </div>

              {/* Property Details (Clear if Unlocked, Blurred if Locked) */}
              <div style={{ 
                filter: isUnlocked ? 'none' : 'blur(3.5px)', 
                userSelect: isUnlocked ? 'auto' : 'none', 
                pointerEvents: isUnlocked ? 'auto' : 'none', 
                margin: '8px 0',
                transition: 'all 0.3s ease'
              }}>
                <h4 style={{ fontSize: '0.94rem', color: 'var(--text-primary)', marginBottom: '6px', fontWeight: '800' }}>
                  {isAr ? prop.desc_ar : prop.desc_en}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <span>{isAr ? `المساحة: ${prop.size}` : `Area: ${prop.size}`}</span>
                  <strong style={{ color: 'var(--brand-gold-warm, #f59e0b)', fontWeight: '900' }}>{prop.estPrice}</strong>
                </div>

                {isUnlocked && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    color: '#059669',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '10px'
                  }}>
                    <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                    <span>{prop.roi_ar}</span>
                  </div>
                )}
              </div>

              {/* Action Layer */}
              {isUnlocked ? (
                <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '6px' }}>
                  <a
                    href={getWhatsAppUrl(`مرحباً 1Line، تم فك قفل الأصل السري (${prop.type_ar} - ${prop.area_ar}) وأرغب في حجز جلسة استشارية خاصة مع المستشار المسؤول.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '0.78rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <MessageSquare size={13} />
                    <span>{isAr ? 'واتساب المستشار' : 'WhatsApp'}</span>
                  </a>
                  <a
                    href={`tel:${dynamicPhone}`}
                    className="btn btn-outline"
                    style={{ padding: '8px 12px', fontSize: '0.78rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title={isAr ? 'اتصال بالمستشار الخاص' : 'Call'}
                  >
                    <Phone size={13} />
                    <span>{isAr ? 'اتصال' : 'Call'}</span>
                  </a>
                </div>
              ) : (
                /* Unlock Floating Action Overlay */
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  background: 'rgba(9, 35, 71, 0.45)', 
                  backdropFilter: 'blur(2px)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '6px' 
                }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--accent-gold, #f59e0b)', color: '#0d2c54', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)' }}>
                    <Lock size={20} />
                  </div>
                  <span style={{ color: '#ffffff', fontWeight: '900', fontSize: '0.82rem', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                    {isAr ? 'اضغط لطلب فك القفل ومعاينة الأصل 🔓' : 'Request Security Unlock'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
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
