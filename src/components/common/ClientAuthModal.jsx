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
  Lock,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext';

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

  const [step, setStep] = useState(1); // 1: Info Input, 2: WhatsApp Verification
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: ''
  });
  const [enteredCode, setEnteredCode] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!clientAuthModalOpen) return null;

  const handleClose = () => {
    setClientAuthModalOpen(false);
    setErrorMsg('');
    setStep(1);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  // Step 1: Initiate and get WhatsApp link
  const handleSubmitInfo = (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const result = initiateClientRegistration(formData);
      setWhatsappUrl(result.whatsappUrl);
      setStep(2);
      // Auto-open WhatsApp on desktop/mobile for frictionless UX
      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank');
      }
    } catch (err) {
      setErrorMsg(err.message || (isAr ? 'حدث خطأ في البيانات المدخلة' : 'Validation error'));
    }
  };

  // Step 2: Confirm verification
  const handleConfirmVerification = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      await completeClientVerification(enteredCode);
      setStep(1);
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
              : (isAr ? 'تأكيد الحساب عبر تطبيق واتساب' : 'Confirm via WhatsApp')}
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
              <span>{isAr ? 'رسالة التأكيد (واتساب)' : 'WhatsApp Confirmation'}</span>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="client-auth-error-banner">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* Body - Step 1: User Data Input */}
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

            <div className="auth-input-group">
              <label htmlFor="client-whatsapp">
                <Phone size={14} className="text-muted" />
                <span>{isAr ? 'رقم الواتساب للتأكيد والاستفسارات *' : 'WhatsApp Number *'}</span>
              </label>
              <input
                id="client-whatsapp"
                name="whatsapp"
                type="tel"
                required
                placeholder="010XXXXXXXX"
                value={formData.whatsapp}
                onChange={handleInputChange}
                className="auth-text-input"
                dir="ltr"
              />
              <span className="input-hint">
                {isAr ? 'سيتم إرسال رسالة التأكيد عبر تطبيق واتساب لتوثيق ملكية الحساب' : 'Used for WhatsApp account verification & updates'}
              </span>
            </div>

            {/* Perks Preview */}
            <div className="auth-perks-grid">
              <div className="perk-item">
                <Heart size={14} className="text-rose" />
                <span>{isAr ? 'حفظ المفضلة ومزامنتها عبر الأجهزة' : 'Synced Favorites'}</span>
              </div>
              <div className="perk-item">
                <Scale size={14} className="text-amber" />
                <span>{isAr ? 'مقارنة 4 عقارات وتصدير تقرير PDF' : 'Smart 4-Way Compare'}</span>
              </div>
              <div className="perk-item">
                <Sparkles size={14} className="text-emerald" />
                <span>{isAr ? 'أولوية الحجز ومعاينات VIP المباشرة' : 'Priority VIP Tours'}</span>
              </div>
            </div>

            <button type="submit" className="btn-client-auth-primary">
              <span>{isAr ? 'متابعة وإرسال رسالة التأكيد عبر واتساب' : 'Proceed to WhatsApp Confirmation'}</span>
              {isAr ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* Body - Step 2: WhatsApp Confirmation */}
        {step === 2 && (
          <div className="client-auth-step2-box">
            <div className="wa-security-card">
              <div className="wa-security-top">
                <div className="wa-token-display">
                  <span className="token-label">{isAr ? 'كود التأكيد الخاص بحسابك:' : 'Your Security Code:'}</span>
                  <div className="token-val-row">
                    <strong className="token-text">{verificationSession?.token || '1L-****'}</strong>
                    <button 
                      type="button" 
                      onClick={handleCopyCode} 
                      className="btn-copy-code"
                      title={isAr ? 'نسخ الكود' : 'Copy Code'}
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

              <p className="wa-instructions-text">
                {isAr 
                  ? `أرسل رسالة التأكيد عبر الواتساب إلى إدارة 1Line العقارية لتفعيل حسابك باسم (${verificationSession?.name}) ورقمك (${verificationSession?.whatsapp}).`
                  : `Send the pre-filled verification message to 1Line support via WhatsApp to activate your account.`}
              </p>

              {/* Direct Open WhatsApp Button */}
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-open-wa-direct"
              >
                <MessageSquare size={18} />
                <span>{isAr ? 'فتح واتساب وإرسال رسالة التأكيد الآن 💬' : 'Open WhatsApp & Send Message'}</span>
              </a>
            </div>

            {/* Optional Verification Code Input for Extra Confirmation */}
            <div className="manual-verify-row">
              <label htmlFor="confirm-code-input">
                <Lock size={13} className="text-muted" />
                <span>{isAr ? 'تأكيد الكود (أو اضغط تفعيل مباشرة):' : 'Confirm Code:'}</span>
              </label>
              <input
                id="confirm-code-input"
                type="text"
                placeholder={verificationSession?.code || '1234'}
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value)}
                className="code-input-short"
                maxLength={8}
                dir="ltr"
              />
            </div>

            {/* Confirmation CTA */}
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
