import { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Heart, 
  Scale, 
  MessageSquare, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Copy, 
  Check, 
  Sparkles,
  User,
  Mail,
  ExternalLink
} from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext';
import PhoneInputField from '../PhoneInputField';
import { SUPPORTED_COUNTRIES } from '../../utils/phoneCountries';

export default function ClientAuthModal({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const { 
    clientAuthModalOpen, 
    setClientAuthModalOpen, 
    authReasonMessage,
    initiateClientRegistration,
    completeClientVerification,
    verificationSession
  } = useClientAuth();

  const [step, setStep] = useState(1); // 1: Personal Info Input, 2: WhatsApp Handshake
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: ''
  });
  const [country, setCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [waOpened, setWaOpened] = useState(false);

  if (!clientAuthModalOpen) return null;

  const handleClose = () => {
    setClientAuthModalOpen(false);
    setErrorMsg('');
    setPhoneError('');
    setStep(1);
    setWaOpened(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  // Step 1: Strict Validation & Initiate Registration
  const handleSubmitInfo = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setPhoneError('');

    const cleanName = (formData.name || '').trim();
    const cleanEmail = (formData.email || '').trim().toLowerCase();
    const cleanPhone = (formData.whatsapp || '').trim().replace(/[^0-9]/g, '');

    // 1. Strict Name Check
    if (!cleanName || cleanName.length < 3) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم صحيح لا يقل عن 3 أحرف' : 'Please enter a valid full name (at least 3 characters)');
      return;
    }

    // 2. Strict Email Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg(isAr ? 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@domain.com)' : 'Please enter a valid email address');
      return;
    }

    // 3. Strict Phone Format Check according to selected country
    const countryObj = SUPPORTED_COUNTRIES.find(c => c.code === country) || SUPPORTED_COUNTRIES[0];
    if (!cleanPhone) {
      setPhoneError(isAr ? 'رقم الواتساب مطلوب للمصادقة' : 'WhatsApp number is required');
      return;
    }

    if (countryObj?.regex && !countryObj.regex.test(cleanPhone)) {
      const err = isAr 
        ? `رقم الواتساب غير متوافق مع صيغة دولة ${countryObj.name} (${countryObj.placeholder})` 
        : `Invalid phone format for ${countryObj.name} (${countryObj.placeholder})`;
      setPhoneError(err);
      setErrorMsg(err);
      return;
    }

    try {
      const result = initiateClientRegistration({
        name: cleanName,
        email: cleanEmail,
        whatsapp: cleanPhone,
        country
      });

      setWhatsappUrl(result.whatsappUrl);
      setStep(2);
      setWaOpened(true);

      // Auto-open WhatsApp on desktop / mobile for seamless handshake UX
      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank');
      }
    } catch (err) {
      setErrorMsg(err.message || (isAr ? 'حدث خطأ في البيانات المدخلة' : 'Validation error'));
    }
  };

  // Step 2: Confirm Verification Handshake
  const handleConfirmVerification = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      await completeClientVerification();
      setStep(1);
      setWaOpened(false);
    } catch (err) {
      setErrorMsg(err.message || (isAr ? 'فشل التحقق، يرجى المحاولة مرة أخرى' : 'Verification failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (verificationSession?.token) {
      navigator.clipboard.writeText(verificationSession.token);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop-luxury client-auth-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="client-auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Close Button */}
        <button 
          type="button" 
          className="client-auth-close-btn" 
          onClick={handleClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header Ribbon */}
        <div className="client-auth-header">
          <div className="client-auth-badge-pill">
            <ShieldCheck size={14} className="text-emerald" />
            <span>{isAr ? 'حساب عميل 1Line المعتمد' : '1Line Verified Client Account'}</span>
          </div>
          <h2 className="client-auth-title">
            {step === 1 
              ? (isAr ? 'تفعيل حسابك لحفظ ومقارنة العقارات' : 'Activate Your Account to Save & Compare')
              : (isAr ? 'مصادقة وتوثيق الحساب عبر واتساب' : 'WhatsApp Verification Handshake')}
          </h2>
          <p className="client-auth-subtitle">
            {authReasonMessage || (isAr 
              ? 'احفظ عقاراتك في مفضلتك وقارن بين المشروعات بسوهاج وتلقّ إشعارات الأسعار الحصرية.'
              : 'Save favorite properties, run smart comparisons, and get exclusive market price alerts.')}
          </p>

          {/* Stepper Dots */}
          <div className="client-auth-stepper">
            <div className={`stepper-pill ${step === 1 ? 'active' : 'completed'}`}>
              <span className="step-num">1</span>
              <span>{isAr ? 'البيانات الشخصية' : 'Personal Info'}</span>
            </div>
            <span className="stepper-arrow">{isAr ? '←' : '→'}</span>
            <div className={`stepper-pill ${step === 2 ? 'active' : ''}`}>
              <span className="step-num">2</span>
              <span>{isAr ? 'مصادقة واتساب' : 'WhatsApp Handshake'}</span>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="client-auth-error-banner">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* Body - Step 1: User Data Input with Strict Validation */}
        {step === 1 && (
          <form onSubmit={handleSubmitInfo} className="client-auth-form">
            <div className="auth-input-group">
              <label htmlFor="client-name">
                <User size={14} className="text-muted" />
                <span>{isAr ? 'الاسم بالكامل *' : 'Full Name *'}</span>
              </label>
              <input
                id="client-name"
                name="name"
                type="text"
                required
                placeholder={isAr ? 'مثال: المهندس أحمد الشريف' : 'e.g. Ahmed El-Sherif'}
                value={formData.name}
                onChange={handleInputChange}
                className="auth-text-input"
                autoFocus
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="client-email">
                <Mail size={14} className="text-muted" />
                <span>{isAr ? 'البريد الإلكتروني *' : 'Email Address *'}</span>
              </label>
              <input
                id="client-email"
                name="email"
                type="email"
                required
                placeholder="example@domain.com"
                value={formData.email}
                onChange={handleInputChange}
                className="auth-text-input"
                dir="ltr"
              />
            </div>

            {/* Standard PhoneInputField with Flag & Strict Regex per Country */}
            <div className="auth-input-group">
              <PhoneInputField
                label={isAr ? 'رقم الواتساب للتأكيد والاستفسارات' : 'WhatsApp Number'}
                value={formData.whatsapp}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, whatsapp: val }));
                  if (phoneError) setPhoneError('');
                  if (errorMsg) setErrorMsg('');
                }}
                country={country}
                onCountryChange={(c) => {
                  setCountry(c);
                  if (phoneError) setPhoneError('');
                  if (errorMsg) setErrorMsg('');
                }}
                error={phoneError}
                required
              />
              <span className="input-hint">
                {isAr ? 'يتم التحقق من صحة الرقم ومطابقته لكود الدولة لضمان توثيق الحساب' : 'Phone is validated with the selected country code to ensure authentic account ownership'}
              </span>
            </div>

            {/* Perks Preview */}
            <div className="auth-perks-grid">
              <div className="perk-item">
                <Heart size={14} className="text-rose" />
                <span>{isAr ? 'حفظ المفضلة ومزامنتها عبر جميع أجهزتك' : 'Synced Favorites Across Devices'}</span>
              </div>
              <div className="perk-item">
                <Scale size={14} className="text-amber" />
                <span>{isAr ? 'مقارنة حتى 4 عقارات وتصدير تقرير استثماري' : 'Smart 4-Way Comparison Report'}</span>
              </div>
              <div className="perk-item">
                <Sparkles size={14} className="text-emerald" />
                <span>{isAr ? 'أولوية الحجز ومعاينات VIP مباشرة مع المستشار العقاري' : 'Priority VIP Tours with Real Estate Advisor'}</span>
              </div>
            </div>

            <button type="submit" className="btn-client-auth-primary">
              <span>{isAr ? 'متابعة وتأكيد الحساب عبر واتساب' : 'Proceed to WhatsApp Confirmation'}</span>
              {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* Body - Step 2: Solution 2 WhatsApp Handshake (No Confusing Code Input) */}
        {step === 2 && (
          <div className="client-auth-step2-box">
            {/* Verified Pass Card */}
            <div className="wa-security-card">
              <div className="wa-security-top">
                <div className="wa-token-display">
                  <span className="token-label">{isAr ? 'رمز التوثيق المعتمد لحسابك:' : 'Your Official Verification Token:'}</span>
                  <div className="token-val-row">
                    <strong className="token-text">{verificationSession?.token || '1L-****'}</strong>
                    <button 
                      type="button" 
                      onClick={handleCopyCode} 
                      className="btn-copy-code"
                      title={isAr ? 'نسخ الرمز' : 'Copy Token'}
                    >
                      {copiedCode ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                      <span>{copiedCode ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                    </button>
                  </div>
                </div>
                <div className="wa-icon-glow">
                  <MessageSquare size={24} />
                </div>
              </div>

              {/* Verified Details Summary */}
              <div className="wa-client-details-summary">
                <div className="wa-detail-row">
                  <span className="detail-k">{isAr ? 'الاسم:' : 'Name:'}</span>
                  <span className="detail-v">{verificationSession?.name}</span>
                </div>
                <div className="wa-detail-row">
                  <span className="detail-k">{isAr ? 'البريد:' : 'Email:'}</span>
                  <span className="detail-v" dir="ltr">{verificationSession?.email}</span>
                </div>
                <div className="wa-detail-row">
                  <span className="detail-k">{isAr ? 'الواتساب:' : 'WhatsApp:'}</span>
                  <span className="detail-v wa-phone-v" dir="ltr">
                    <span>{verificationSession?.countryFlag}</span>
                    <span>{verificationSession?.whatsapp}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Handshake Step 1: Open WhatsApp */}
            <div className="handshake-action-block">
              <div className="handshake-step-badge">
                <span className="badge-num">1</span>
                <span className="badge-text">{isAr ? 'الخطوة الأولى: إرسال رسالة التوثيق' : 'Step 1: Send Verification Message'}</span>
              </div>
              <p className="handshake-step-desc">
                {isAr 
                  ? 'ستفتح محادثة واتساب مع مستشارك العقاري في 1Line وبها رسالة جاهزة تتضمن رمز التوثيق. اضغط إرسال في واتساب فقط.'
                  : 'WhatsApp will open with a pre-filled verification ticket message. Simply send it to 1Line support.'}
              </p>
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => setWaOpened(true)}
                className="btn-open-wa-direct"
              >
                <MessageSquare size={18} />
                <span>{isAr ? 'فتح تطبيق واتساب وإرسال الرسالة الآن 💬' : 'Open WhatsApp & Send Message'}</span>
                <ExternalLink size={14} style={{ opacity: 0.8 }} />
              </a>
            </div>

            {/* Handshake Step 2: Instant Activation */}
            <div className="handshake-action-block">
              <div className="handshake-step-badge">
                <span className="badge-num">2</span>
                <span className="badge-text">{isAr ? 'الخطوة الثانية: تأكيد وتفعيل الحساب' : 'Step 2: Activate Your Account'}</span>
              </div>
              <p className="handshake-step-desc">
                {isAr
                  ? 'بعد إرسال الرسالة في واتساب، اضغط على الزر أدناه لتفعيل حسابك فوراً وحفظ عقاراتك في مفضلتك.'
                  : 'After sending the WhatsApp message, click below to immediately activate your account and sync your saved properties.'}
              </p>
              <button 
                type="button" 
                onClick={handleConfirmVerification}
                disabled={loading}
                className="btn-client-auth-primary confirm-ready-btn"
              >
                <CheckCircle2 size={18} />
                <span>
                  {loading 
                    ? (isAr ? 'جاري تفعيل الحساب...' : 'Activating Account...') 
                    : (isAr ? 'لقد أرسلت الرسالة — تفعيل حسابي الآن ✨' : 'I Sent The Message — Activate Now')}
                </span>
              </button>
            </div>

            <button 
              type="button" 
              onClick={() => setStep(1)} 
              className="btn-back-step"
            >
              {isAr ? '← تعديل البيانات الشخصية' : '← Edit Personal Info'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
