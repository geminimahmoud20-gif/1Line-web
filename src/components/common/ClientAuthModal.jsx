import { useState, useEffect } from 'react';
import { X, ShieldCheck, Heart, Scale, MessageSquare, CheckCircle2, ArrowLeft, ArrowRight, Copy, Check, Sparkles, User, Mail, ExternalLink } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext';
import PhoneInputField from '../PhoneInputField';
import { SUPPORTED_COUNTRIES } from '../../utils/phoneCountries';
import { readAccounts } from '../../utils/clientAccounts';
import '../../styles/client-auth-modes.css';
import { nameProblem, phoneProblem, emailProblem } from '../../utils/contactValidation';

export default function ClientAuthModal({ lang = 'ar' }) {
  const isAr = lang === 'ar';
  const { 
    clientAuthModalOpen, 
    setClientAuthModalOpen, 
    authReasonMessage,
    activateClientDirectly,
    signInClient,
    verificationSession
  } = useClientAuth();

  // 'new' = register, 'signin' = «عندي حساب» (opens on sign-in when this device knows an account)
  const [mode, setMode] = useState(() => {
    try { return Object.keys(readAccounts(localStorage)).length ? 'signin' : 'new'; } catch { return 'new'; }
  });

  const [step, setStep] = useState('input'); // 'input' | 'activated'
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
  const [activatedClient, setActivatedClient] = useState(null);
  const [waitingReturn, setWaitingReturn] = useState(false);
  const [returnedCelebration, setReturnedCelebration] = useState(false);

  // Return-to-site detection: when client switches back from WhatsApp to 1Line website
  useEffect(() => {
    if (!waitingReturn) return;

    let timerId = null;
    const handleReturn = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        setReturnedCelebration(true);
        // Automatically close modal after user sees the celebratory success message
        timerId = setTimeout(() => {
          // Inline close: handleClose is declared after the early return below
          setClientAuthModalOpen(false);
          setStep('input');
          setWaitingReturn(false);
          setReturnedCelebration(false);
        }, 1800);
      }
    };

    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleReturn);

    return () => {
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleReturn);
      if (timerId) clearTimeout(timerId);
    };
  }, [waitingReturn, setClientAuthModalOpen]);

  if (!clientAuthModalOpen) return null;

  const handleClose = () => {
    setClientAuthModalOpen(false);
    setErrorMsg('');
    setPhoneError('');
    setStep('input');
    setWaitingReturn(false);
    setReturnedCelebration(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  // Direct 1-Click Activation upon clicking "تفعيل"
  const handleDirectActivate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setPhoneError('');

    const cleanName = (formData.name || '').trim();
    const cleanEmail = (formData.email || '').trim().toLowerCase();
    const cleanPhone = (formData.whatsapp || '').trim().replace(/[^0-9]/g, '');

    // 1. Strict Name Check
    const nameErr = nameProblem(cleanName, isAr);
    if (nameErr) {
      setErrorMsg(nameErr);
      return;
    }

    // 2. Strict Email Check
    const emailErr = emailProblem(cleanEmail, isAr, { required: true });
    if (emailErr) {
      setErrorMsg(emailErr);
      return;
    }

    // 3. Strict Phone Format Check according to selected country
    const countryObj = SUPPORTED_COUNTRIES.find(c => c.code === country) || SUPPORTED_COUNTRIES[0];
    if (!cleanPhone) {
      setPhoneError(isAr ? 'رقم الواتساب مطلوب للمصادقة والتفعيل' : 'WhatsApp number is required');
      return;
    }

    if (countryObj?.regex && !countryObj.regex.test(cleanPhone)) {
      const err = phoneProblem(cleanPhone, countryObj.code, isAr);
      setPhoneError(err);
      setErrorMsg(err);
      return;
    }

    setLoading(true);

    try {
      // 1-Click direct activation: saves account, merges favorites, registers CRM lead immediately
      const result = await activateClientDirectly({
        name: cleanName,
        email: cleanEmail,
        whatsapp: cleanPhone,
        country
      }, { keepModalOpen: true });

      setWhatsappUrl(result.whatsappUrl);
      setActivatedClient(result.verifiedAccount);
      setStep('activated');
      setWaitingReturn(true);

      // Directly open WhatsApp with the pre-filled verification ticket message
      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank');
      }
    } catch (err) {
      setErrorMsg(err.message || (isAr ? 'حدث خطأ أثناء تفعيل الحساب' : 'Activation error'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setErrorMsg('');
    setPhoneError('');
  };

  const handleSignIn = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setPhoneError('');
    const res = signInClient({ whatsapp: formData.whatsapp, country });
    if (res.ok) {
      setStep('input');
      return;
    }
    if (res.reason === 'invalid') {
      const countryObj = SUPPORTED_COUNTRIES.find((c) => c.code === country) || SUPPORTED_COUNTRIES[0];
      setPhoneError(isAr ? `اكتب رقم واتساب صحيح (${countryObj.placeholder})` : `Enter a valid WhatsApp number (${countryObj.placeholder})`);
      return;
    }
    setErrorMsg(isAr
      ? 'الرقم ده مش متسجل على الجهاز ده. سجّل من «حساب جديد» بنفس الرقم.'
      : 'This number has no account on this device. Register under "New account" with the same number.');
  };

  const handleCopyCode = () => {
    const token = activatedClient?.verificationToken || verificationSession?.token;
    if (token) {
      navigator.clipboard.writeText(token);
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
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>

        {/* Header Ribbon */}
        <div className="client-auth-header">
          <div className="client-auth-badge-pill">
            <ShieldCheck size={14} className="text-emerald" />
            <span>{isAr ? 'حساب عميل 1Line' : '1Line Client Account'}</span>
          </div>
          <h2 className="client-auth-title">
            {step === 'input' && mode === 'signin'
              ? (isAr ? 'أهلاً بيك تاني' : 'Welcome back')
              : step === 'input'
              ? (isAr ? 'تفعيل حسابك لحفظ ومقارنة العقارات' : 'Activate Your Account to Save & Compare')
              : (isAr ? 'تم تفعيل الحساب مباشرة' : 'Account Activated Directly')}
          </h2>
          <p className="client-auth-subtitle">
            {step === 'input' && mode === 'signin'
              ? (isAr ? 'اكتب رقم الواتساب اللي سجّلت بيه، وحسابك ومفضلتك يرجعوا على طول.' : 'Enter the WhatsApp number you registered with to get your account back.')
              : step === 'input'
              ? (authReasonMessage || (isAr 
                  ? 'احفظ عقاراتك في مفضلتك وقارن بين المشروعات بسوهاج وتلقّ إشعارات الأسعار الحصرية.'
                  : 'Save favorite properties, run smart comparisons, and get exclusive market price alerts.'))
              : (isAr
                  ? 'تم تفعيل حسابك على هذا الجهاز. أهلاً بك في منصة 1Line العقارية.'
                  : 'Your account is active on this device. Welcome to 1Line Real Estate.')}
          </p>

          {/* Stepper Pill */}
          {!(step === 'input' && mode === 'signin') && <div className="client-auth-stepper">
            <div className={`stepper-pill ${step === 'input' ? 'active' : 'completed'}`}>
              <Sparkles size={14} className="text-gold" />
              <span>{isAr ? 'تفعيل فوري بنقرة واحدة' : 'Instant 1-Click Activation'}</span>
            </div>
            {step === 'activated' && (
              <div className="stepper-pill completed">
                <CheckCircle2 size={14} className="text-emerald" />
                <span>{isAr ? 'تم تفعيل الحساب مباشرة' : 'Directly Activated'}</span>
              </div>
            )}
          </div>}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="client-auth-error-banner">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {step === 'input' && (
          <div className="client-auth-modes" role="tablist" aria-label={isAr ? 'نوع الدخول' : 'Sign-in type'}>
            <button type="button" role="tab" aria-selected={mode === 'new'} className={mode === 'new' ? 'is-active' : ''} onClick={() => switchMode('new')}>
              {isAr ? 'حساب جديد' : 'New account'}
            </button>
            <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'is-active' : ''} onClick={() => switchMode('signin')}>
              {isAr ? 'عندي حساب' : 'I have an account'}
            </button>
          </div>
        )}

        {/* «عندي حساب»: the WhatsApp number brings back the account saved on this device */}
        {step === 'input' && mode === 'signin' && (
          <form onSubmit={handleSignIn} className="client-auth-form">
            <div className="auth-input-group">
              <PhoneInputField
                label={isAr ? 'رقم الواتساب اللي سجّلت بيه' : 'The WhatsApp number you registered with'}
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
                {isAr ? 'مفضلتك ومقارناتك بترجع على نفس الجهاز اللي سجّلت منه.' : 'Your favourites come back on the device you registered on.'}
              </span>
            </div>
            <button type="submit" className="btn-client-auth-primary">
              <User size={18} />
              <span>{isAr ? 'دخول' : 'Sign in'}</span>
              {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* Body - Input Form: Name, Email, WhatsApp & 1-Click Activation */}
        {step === 'input' && mode === 'new' && (
          <form onSubmit={handleDirectActivate} className="client-auth-form">
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

            {/* PhoneInputField with Country Selector */}
            <div className="auth-input-group">
              <PhoneInputField
                label={isAr ? 'رقم الواتساب للتفعيل المباشر' : 'WhatsApp Number for Instant Activation'}
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
                {isAr ? 'بنقرة واحدة سيتم فتح واتساب وتفعيل حسابك تلقائياً دون خطوات معقدة' : 'One click activates your account and launches WhatsApp automatically'}
              </span>
            </div>

            {/* Perks Preview */}
            <div className="auth-perks-grid">
              <div className="perk-item">
                <Heart size={14} className="text-rose" />
                <span>{isAr ? 'حفظ المفضلة، وترجعلك بـ«عندي حساب» على نفس الجهاز' : 'Saved favourites, back with "I have an account" on this device'}</span>
              </div>
              <div className="perk-item">
                <Scale size={14} className="text-amber" />
                <span>{isAr ? 'مقارنة حتى 4 عقارات وتصدير تقرير استثماري' : 'Smart 4-Way Comparison Report'}</span>
              </div>
              <div className="perk-item">
                <Sparkles size={14} className="text-emerald" />
                <span>{isAr ? 'أولوية الحجز ومعاينات VIP مباشرة' : 'Priority VIP Tours & Direct Support'}</span>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-client-auth-primary btn-direct-activate"
            >
              <Sparkles size={18} />
              <span>
                {loading 
                  ? (isAr ? 'جاري تفعيل الحساب...' : 'Activating Account...') 
                  : (isAr ? 'تفعيل الحساب وإرسال الرسالة إلى واتساب مباشرة ✨' : 'Activate Account & Open WhatsApp Direct ✨')}
              </span>
              {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* Body - Activated State: Shows verification pass and direct success notification */}
        {step === 'activated' && (
          <div className="client-auth-step2-box">
            {/* Verified Pass Card */}
            <div className="wa-security-card">
              <div className="wa-security-top">
                <div className="wa-token-display">
                  <span className="token-label">{isAr ? 'كود التأكيد عبر واتساب:' : 'Your WhatsApp confirmation code:'}</span>
                  <div className="token-val-row">
                    <strong className="token-text">{activatedClient?.verificationToken || verificationSession?.token || '1L-****'}</strong>
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
                  <CheckCircle2 size={26} className="text-emerald" />
                </div>
              </div>

              {/* Verified Details Summary */}
              <div className="wa-client-details-summary">
                <div className="wa-detail-row">
                  <span className="detail-k">{isAr ? 'الاسم:' : 'Name:'}</span>
                  <span className="detail-v">{activatedClient?.name || formData.name}</span>
                </div>
                <div className="wa-detail-row">
                  <span className="detail-k">{isAr ? 'البريد:' : 'Email:'}</span>
                  <span className="detail-v" dir="ltr">{activatedClient?.email || formData.email}</span>
                </div>
                <div className="wa-detail-row">
                  <span className="detail-k">{isAr ? 'الواتساب:' : 'WhatsApp:'}</span>
                  <span className="detail-v wa-phone-v" dir="ltr">
                    <span>{activatedClient?.countryFlag || verificationSession?.countryFlag}</span>
                    <span>{activatedClient?.whatsapp || formData.whatsapp}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Activation Banner — No Step 1 / Step 2 divisions */}
            <div className={`direct-activated-banner ${returnedCelebration ? 'celebration-pulse' : ''}`}>
              <div className="direct-banner-icon">
                <CheckCircle2 size={32} className="text-emerald" />
              </div>
              <div className="direct-banner-content">
                <h3 className="direct-banner-title">
                  {isAr ? 'تم تفعيل الحساب مباشرة 🎉' : 'Account Activated Directly! 🎉'}
                </h3>
                <p className="direct-banner-desc">
                  {isAr 
                    ? 'حسابك اتفعّل والمفضلة والمقارنات شغالة. ابعت رسالة الواتساب بالكود عشان فريقنا يأكد رقمك ويتواصل معاك.'
                    : 'Your account is active. Send the WhatsApp message with your code so our team can confirm your number.'}
                </p>
              </div>
            </div>

            <div className="direct-activation-btn-row">
              <button 
                type="button" 
                onClick={handleClose}
                className="btn-client-auth-primary confirm-ready-btn"
              >
                <Sparkles size={18} />
                <span>{isAr ? 'تم تفعيل الحساب — استمرار للموقع ✨' : 'Account Activated — Continue ✨'}</span>
              </button>

              {whatsappUrl && (
                <a 
                  href={whatsappUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-reopen-wa"
                >
                  <MessageSquare size={16} />
                  <span>{isAr ? 'إعادة فتح محادثة واتساب 💬' : 'Reopen WhatsApp 💬'}</span>
                  <ExternalLink size={13} style={{ opacity: 0.7 }} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
