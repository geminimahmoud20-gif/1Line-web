import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Building, 
  MapPin, 
  DollarSign, 
  Clock, 
  FileText, 
  MessageSquare, 
  Phone, 
  Award, 
  Send,
  Lock,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,
  Zap
} from 'lucide-react';
import PhoneInputField, { SUPPORTED_COUNTRIES } from './PhoneInputField';
import { getAreas } from '../utils/areasData';
import { getFounderSettings, getWhatsAppUrl } from '../utils/founderCmsData';
import { checkFormSpamProtection } from '../utils/securityShield';

export const SpecialRequests = ({
  lang = 'ar',
  t = {},
  specialForm: externalForm,
  setSpecialForm: setExternalForm,
  submitSpecialRequest,
  triggerToast,
  handleAddNewLead
}) => {
  const isAr = lang === 'ar';
  const [areas, setAreas] = useState(() => getAreas().filter(a => a.id !== 'all'));
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedRefCode, setSubmittedRefCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hpField, setHpField] = useState('');

  // Fallback internal state if not managed externally
  const [internalForm, setInternalForm] = useState({
    propertyType: 'apartment',
    area: 'new_sohag',
    budget: '',
    minSize: '',
    priority: 'high',
    purpose: 'residential',
    specialConditions: '',
    name: '',
    phone: '',
    whatsapp: '',
    allowPublicListing: true
  });

  const form = externalForm || internalForm;
  const setForm = setExternalForm || setInternalForm;

  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [whatsappError, setWhatsappError] = useState('');

  useEffect(() => {
    const handleUpdate = () => {
      setAreas(getAreas().filter(a => a.id !== 'all'));
    };
    window.addEventListener('oneline_areas_updated', handleUpdate);
    return () => window.removeEventListener('oneline_areas_updated', handleUpdate);
  }, []);

  const validateAndSubmit = async (e) => {
    e.preventDefault();

    // 🛡️ Anti-Bot & Spam Rate-Limit Shield
    const spamCheck = checkFormSpamProtection(hpField, 'special_requests_form');
    if (!spamCheck.allowed) {
      triggerToast?.(isAr ? spamCheck.message_ar : spamCheck.message_en, 'error');
      return;
    }

    if (!form.name || !form.name.trim()) {
      triggerToast?.(isAr ? 'يرجى إدخال اسمك الكريم' : 'Please enter your name', 'error');
      return;
    }

    if (!form.phone || !form.phone.trim()) {
      setPhoneError(isAr ? 'يرجى إدخال رقم الهاتف' : 'Phone is required');
      return;
    }

    // Check phone number format
    const phoneCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === phoneCountry);
    const isPhoneValid = phoneCountryObj ? phoneCountryObj.regex.test(form.phone) : true;
    
    // Check whatsapp format if provided
    let isWhatsappValid = true;
    if (form.whatsapp) {
      const whatsappCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === whatsappCountry);
      isWhatsappValid = whatsappCountryObj ? whatsappCountryObj.regex.test(form.whatsapp) : true;
    }

    if (!isPhoneValid) {
      setPhoneError(isAr ? 'رقم الهاتف غير متوافق مع صيغة الدولة المحددة' : 'Phone number does not match country format');
      return;
    }
    
    if (form.whatsapp && !isWhatsappValid) {
      setWhatsappError(isAr ? 'رقم الواتساب غير متوافق مع صيغة الدولة المحددة' : 'WhatsApp number does not match country format');
      return;
    }

    setSubmitting(true);

    const fullPhone = `${phoneCountry}${form.phone}`;
    const fullWhatsapp = form.whatsapp ? `${whatsappCountry}${form.whatsapp}` : fullPhone;
    const refCode = `REQ-${Math.floor(100000 + Math.random() * 900000)}`;

    const payload = {
      ...form,
      phone: fullPhone,
      whatsapp: fullWhatsapp,
      refCode,
      source: 'special_requests_portal',
      type: 'special_request',
      status: 'pending',
      createdAt: new Date().toISOString(),
      timestamp: new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')
    };

    try {
      if (typeof submitSpecialRequest === 'function') {
        await submitSpecialRequest(payload);
      } else if (typeof handleAddNewLead === 'function') {
        await handleAddNewLead({
          name: form.name,
          phone: fullPhone,
          whatsapp: fullWhatsapp,
          type: 'طلب عقار بمواصفات خاصة',
          source: 'بوابة الطلبات الخاصة',
          details: payload
        });
      }

      setSubmittedRefCode(refCode);
      setIsSubmitted(true);
      triggerToast?.(
        isAr 
          ? `تم استلام طلبك الخاص بنجاح برقم مرجعي ${refCode}` 
          : `Special request received successfully! Ref: ${refCode}`,
        'success'
      );
    } catch (err) {
      console.error(err);
      triggerToast?.(isAr ? 'حدث خطأ أثناء الإرسال، يرجى المحاولة ثانية' : 'Submission error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="wizard-container" style={{ textAlign: 'center', padding: '40px 24px', animation: 'fadeIn 0.3s ease' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
        }}>
          <CheckCircle2 size={40} />
        </div>

        <span className="section-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Sparkles size={14} className="text-gold" />
          <span>{isAr ? 'تم استلام طلبك الخاص في منظومة 1Line' : 'Special Request Received'}</span>
        </span>

        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: '0 0 10px 0', fontWeight: '800' }}>
          {isAr ? 'شكراً لك، جاري مطابقة طلبك فورياً!' : 'Thank you, matching your request now!'}
        </h2>

        <p style={{ maxWidth: '560px', margin: '0 auto 24px', color: 'var(--text-secondary)', fontSize: '0.96rem', lineHeight: 1.7 }}>
          {isAr 
            ? 'تم تحويل مواصفات طلبك إلى فريق الاستشارات والاستحواذ العقاري. سيقوم مستشارك المخصص بالتواصل معك خلال ساعات قليلة بأفضل الخيارات المتاحة والمفحوصة قانونياً.' 
            : 'Your bespoke property request has been dispatched to our acquisitions team. A senior consultant will reach out with verified options.'}
        </p>

        {/* Ref Code Box */}
        <div style={{
          background: 'rgba(13, 72, 161, 0.07)',
          border: '1px dashed var(--primary)',
          borderRadius: '14px',
          padding: '16px 20px',
          maxWidth: '420px',
          margin: '0 auto 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
            {isAr ? 'الرقم المرجعي للطلب:' : 'Reference Code:'}
          </span>
          <strong style={{ fontSize: '1.1rem', color: 'var(--primary)', letterSpacing: '1px', fontWeight: '800' }}>
            {submittedRefCode}
          </strong>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href={getWhatsAppUrl(isAr ? `مرحباً 1Line، بخصوص طلبي الخاص رقم (${submittedRefCode})، أود المتابعة المباشرة مع المستشار.` : `Hello 1Line, following up on my special request (${submittedRefCode}).`)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp"
            style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 'bold' }}
          >
            <MessageSquare size={18} />
            <span>{isAr ? 'متابعة فورية عبر واتساب' : 'Instant WhatsApp Follow-up'}</span>
          </a>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setIsSubmitted(false);
              setForm({
                propertyType: 'apartment',
                area: 'new_sohag',
                budget: '',
                minSize: '',
                priority: 'high',
                purpose: 'residential',
                specialConditions: '',
                name: '',
                phone: '',
                whatsapp: '',
                allowPublicListing: true
              });
            }}
            style={{ padding: '12px 22px', fontSize: '0.92rem' }}
          >
            {isAr ? 'تقديم طلب خاص آخر' : 'Submit Another Request'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-container" style={{ maxWidth: '860px', margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.3)', borderRadius: '20px', padding: '5px 14px', marginBottom: '12px' }}>
          <Award size={14} className="text-gold" />
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-gold-hover, #d97706)', fontWeight: 'bold' }}>
            {isAr ? 'بوابة 1Line للطلبات والاستشارات الاستثنائية' : '1Line Bespoke Property Acquisition'}
          </span>
        </div>
        <h2 className="wizard-question" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.1rem)', margin: '0 0 10px 0' }}>
          {isAr ? 'طلب توفير عقار بمواصفات خاصة وحصرية' : 'Request Custom Property Specifications'}
        </h2>
        <p className="wizard-subtitle" style={{ maxWidth: '640px', margin: '0 auto', fontSize: '0.92rem', lineHeight: 1.7 }}>
          {isAr 
            ? 'سواء كنت تبحث عن مقر لعلامة تجارية، فيلا مستقلة بتشطيب خاص، أرض بموقع استراتيجي، أو دور كامل في سوهاج؛ نلتزم بتوفير أدق المواصفات بأعلى معايير الأمان القانوني.' 
            : 'Looking for a prime franchise location, luxury standalone villa, commercial plot, or full building in Sohag? Our dedicated acquisition consultants deliver.'}
        </p>
      </div>

      <form onSubmit={validateAndSubmit} className="wizard-step-container" style={{ background: 'var(--bg-surface, #ffffff)', padding: '28px', borderRadius: '20px', boxShadow: '0 10px 35px rgba(0, 0, 0, 0.06)', border: '1px solid var(--border-color)' }}>
        {/* 🍯 Invisible Honeypot Anti-Bot Shield */}
        <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
          <input
            type="text"
            name="client_contact_website_hp"
            tabIndex="-1"
            autoComplete="off"
            value={hpField}
            onChange={(e) => setHpField(e.target.value)}
          />
        </div>
        
        {/* Section 1: Property Specifications */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', color: 'var(--primary, #0d48a1)', marginBottom: '16px', fontWeight: '800', borderBottom: '2px solid rgba(13, 72, 161, 0.1)', paddingBottom: '8px' }}>
            <Building size={18} />
            <span>{isAr ? '1. مواصفات ونوع العقار المطلوب' : '1. Desired Property Details'}</span>
          </h4>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>
                {isAr ? 'نوع العقار' : 'Property Type'} *
              </label>
              <select 
                className="form-input" 
                required 
                value={form.propertyType}
                onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                style={{ height: '46px', fontWeight: '600' }}
              >
                <option value="apartment">{isAr ? '🏢 شقة سكنية فاخرة / دوبلكس' : 'Apartment / Duplex'}</option>
                <option value="villa">{isAr ? '🏡 فيلا مستقلة / تاون هاوس' : 'Standalone Villa / Townhouse'}</option>
                <option value="commercial">{isAr ? '🛍️ مقر تجاري / محل لبراند أو توكيل' : 'Retail / Commercial Shop'}</option>
                <option value="office">{isAr ? '💼 مقر إداري / عيادة / مكتب شركات' : 'Administrative Office / Clinic'}</option>
                <option value="land">{isAr ? '📐 قطعة أرض للبناء أو الاستثمار' : 'Plot of Land'}</option>
                <option value="building">{isAr ? '🏛️ عمارة كاملة / مجمع سكني أو تجاري' : 'Full Building / Complex'}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>
                {isAr ? 'المنطقة أو الحي المستهدف' : 'Target District'} *
              </label>
              <select 
                className="form-input" 
                required 
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
                style={{ height: '46px', fontWeight: '600' }}
              >
                {areas.map(a => (
                  <option key={a.id} value={a.id}>
                    📍 {isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>
                {isAr ? 'الميزانية التقريبية المرصودة (جنيه مصري)' : 'Target Budget (EGP)'} *
              </label>
              <input 
                type="text" 
                required 
                placeholder={isAr ? 'مثال: 4,500,000 ج.م' : 'e.g. 4,500,000'} 
                className="form-input" 
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                style={{ height: '46px', fontWeight: '600' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>
                {isAr ? 'الحد الأدنى للمساحة (م²)' : 'Minimum Size (sqm)'}
              </label>
              <input 
                type="number" 
                placeholder={isAr ? 'مثال: 180 م²' : 'e.g. 180'} 
                className="form-input" 
                value={form.minSize || ''}
                onChange={(e) => setForm({ ...form, minSize: e.target.value })}
                style={{ height: '46px', fontWeight: '600' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700' }}>
                {isAr ? 'أولوية وسرعة الشراء' : 'Purchase Priority'}
              </label>
              <select 
                className="form-input" 
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                style={{ height: '46px', fontWeight: '600' }}
              >
                <option value="high">{isAr ? '🔥 عاجل جداً (جاهزية كاش فورية)' : 'Urgent (Ready Cash)'}</option>
                <option value="normal">{isAr ? '⚡ خلال شهر إلى شهرين' : 'Within 1-2 Months'}</option>
                <option value="low">{isAr ? '🌱 استثماري مستقبلي' : 'Future Investment'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Special Requirements & Conditions */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', color: 'var(--primary, #0d48a1)', marginBottom: '16px', fontWeight: '800', borderBottom: '2px solid rgba(13, 72, 161, 0.1)', paddingBottom: '8px' }}>
            <FileText size={18} />
            <span>{isAr ? '2. الشروط والمواصفات الاستثنائية' : '2. Bespoke Requirements & Conditions'}</span>
          </h4>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: '700' }}>
              {isAr ? 'صف بدقة ما تبحث عنه (التشطيب، الدور، الإطلالة، الواجهة، التراخيص...)' : 'Describe your exact requirements'}
            </label>
            <textarea 
              rows="4" 
              placeholder={isAr ? 'مثال: مطلوب شقة أرضي بحديقة خاصة بمدينة سوهاج الجديدة، واجهة بحرية غير مجروحة، رخصة بناء سارية، حصة بالأرض مع إمكانية السداد على سنتين.' : 'e.g., Ground floor with private garden in New Sohag, north-facing, valid permits, installment options.'} 
              className="form-input"
              style={{ resize: 'vertical', lineHeight: 1.6, padding: '12px 14px' }}
              value={form.specialConditions}
              onChange={(e) => setForm({ ...form, specialConditions: e.target.value })}
            />
          </div>
        </div>

        {/* Section 3: Contact Details */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', color: 'var(--primary, #0d48a1)', marginBottom: '16px', fontWeight: '800', borderBottom: '2px solid rgba(13, 72, 161, 0.1)', paddingBottom: '8px' }}>
            <ShieldCheck size={18} />
            <span>{isAr ? '3. بيانات التواصل للمستشار العقاري' : '3. Client Contact Info'}</span>
          </h4>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontWeight: '700' }}>
              {isAr ? 'الاسم بالكامل' : 'Full Name'} *
            </label>
            <input 
              type="text" 
              required 
              placeholder={isAr ? 'أدخل اسمك الكريم' : 'Your full name'}
              className="form-input" 
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ height: '46px', fontWeight: '600' }}
            />
          </div>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <PhoneInputField
                phone={form.phone}
                setPhone={(val) => {
                  setForm({ ...form, phone: val });
                  setPhoneError('');
                }}
                country={phoneCountry}
                setCountry={setPhoneCountry}
                error={phoneError}
                label={isAr ? 'رقم الهاتف الأساسي' : 'Primary Phone Number'}
              />
            </div>
            <div className="form-group">
              <PhoneInputField
                phone={form.whatsapp}
                setPhone={(val) => {
                  setForm({ ...form, whatsapp: val });
                  setWhatsappError('');
                }}
                country={whatsappCountry}
                setCountry={setWhatsappCountry}
                error={whatsappError}
                label={isAr ? 'رقم الواتساب (اختياري)' : 'WhatsApp Number (Optional)'}
              />
            </div>
          </div>
        </div>

        {/* Privacy & Confidentiality Guarantee */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '24px',
          fontSize: '0.84rem',
          color: 'var(--text-secondary)'
        }}>
          <Lock size={18} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>
            {isAr 
              ? '🔒 خصوصية تامة: بياناتك وتفاصيل ميزانيتك محمية وتخضع لاتفاقية سرية مطلقة ولا يتم مشاركتها إلا مع المستشار المباشر المسؤول عن طلبك.' 
              : '100% Confidential: Your data and budget details are strictly protected and never shared.'}
          </span>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={submitting}
          className="btn btn-primary btn-full" 
          style={{ 
            height: '52px', 
            fontSize: '1.05rem', 
            fontWeight: '800', 
            background: 'linear-gradient(135deg, #0d48a1 0%, #092347 100%)',
            boxShadow: '0 6px 20px rgba(13, 72, 161, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {submitting ? (
            <span>{isAr ? 'جاري تسجيل الطلب...' : 'Submitting...'}</span>
          ) : (
            <>
              <Send size={18} />
              <span>{isAr ? 'إرسال الطلب للاستحواذ والبحث العقاري الذكي 🚀' : 'Submit Bespoke Request 🚀'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SpecialRequests;
