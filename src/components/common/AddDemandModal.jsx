import { useState } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Building2, 
  MapPin, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  User, 
  Phone, 
  CheckCircle, 
  FileText, 
  Zap, 
  Info 
} from 'lucide-react';
import PhoneInputField, { SUPPORTED_COUNTRIES } from '../PhoneInputField';
import { getAreas } from '../../utils/areasData';

const PROP_TYPE_OPTIONS = [
  { value: 'apartment', label_ar: 'شقة سكنية', label_en: 'Apartment' },
  { value: 'villa', label_ar: 'فيلا / تاون هاوس', label_en: 'Villa / Townhouse' },
  { value: 'land', label_ar: 'أرض استثمارية / بناء', label_en: 'Land / Plot' },
  { value: 'retail', label_ar: 'محل تجاري / فرنشايز', label_en: 'Commercial Retail Shop' },
  { value: 'office', label_ar: 'مكتب إداري / عيادة', label_en: 'Admin Office / Clinic' },
  { value: 'building', label_ar: 'عمارة / برج سكني', label_en: 'Entire Building' }
];

const TIMEFRAME_OPTIONS = [
  { value: 'immediate', label_ar: 'شراء فوري كاش', label_en: 'Immediate Cash Purchase', urgency: 'high' },
  { value: 'within_1_month', label_ar: 'خلال شهر (جاهز للتعاقد)', label_en: 'Within 1 Month', urgency: 'high' },
  { value: 'within_3_months', label_ar: 'خلال 3 أشهر (تسهيلات أو كاش)', label_en: 'Within 3 Months', urgency: 'medium' },
  { value: 'flexible', label_ar: 'فرصة استثمارية مميزة', label_en: 'Flexible Investment Opportunity', urgency: 'low' }
];

export default function AddDemandModal({
  isOpen,
  onClose,
  lang = 'ar',
  onSubmitDemand,
  triggerToast
}) {
  const isAr = lang === 'ar';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    type: 'apartment',
    area: 'east',
    budget: '',
    paymentMethod: 'cash',
    timeframe: 'immediate',
    urgency: 'high',
    minSize: '',
    notes: ''
  });

  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [whatsappError, setWhatsappError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPhoneError('');
    setWhatsappError('');

    // Validation
    if (!formData.name.trim()) {
      triggerToast?.(isAr ? 'يرجى إدخال اسمك الكريم' : 'Please enter your name', 'error');
      return;
    }

    if (!formData.budget) {
      triggerToast?.(isAr ? 'يرجى تحديد الميزانية المقترحة' : 'Please enter your estimated budget', 'error');
      return;
    }

    // Phone validation
    const phoneCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === phoneCountry);
    const isPhoneValid = phoneCountryObj ? phoneCountryObj.regex.test(formData.phone) : true;
    if (!formData.phone || !isPhoneValid) {
      setPhoneError(isAr ? 'يرجى كتابة رقم هاتف صحيح متوافق مع الدولة' : 'Invalid phone number for selected country');
      return;
    }

    if (formData.whatsapp) {
      const waCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === whatsappCountry);
      const isWaValid = waCountryObj ? waCountryObj.regex.test(formData.whatsapp) : true;
      if (!isWaValid) {
        setWhatsappError(isAr ? 'صيغة رقم الواتساب غير صحيحة' : 'Invalid WhatsApp number format');
        return;
      }
    }

    setIsSubmitting(true);

    const fullPhone = `${phoneCountry}${formData.phone.replace(/^0+/, '')}`;
    const fullWhatsapp = formData.whatsapp ? `${whatsappCountry}${formData.whatsapp.replace(/^0+/, '')}` : fullPhone;
    
    // Construct rich text for Arabic & English
    const areaObj = AREA_OPTIONS.find(a => a.value === formData.area) || AREA_OPTIONS[0];
    const typeObj = PROP_TYPE_OPTIONS.find(t => t.value === formData.type) || PROP_TYPE_OPTIONS[0];
    const budgetNum = parseInt(String(formData.budget).replace(/,/g, '')) || 2500000;
    
    const textAr = `مطلوب ${typeObj.label_ar} في ${areaObj.label_ar} بميزانية ${budgetNum.toLocaleString()} جنيه ${formData.paymentMethod === 'cash' ? 'كاش' : 'تسهيلات'}${formData.minSize ? ` بمساحة لا تقل عن ${formData.minSize} متر` : ''}. ${formData.notes ? `(${formData.notes})` : ''}`;
    const textEn = `Wanted: ${typeObj.label_en} in ${areaObj.label_en} with a budget of ${budgetNum.toLocaleString()} EGP (${formData.paymentMethod})${formData.minSize ? `, min size ${formData.minSize} sqm` : ''}. ${formData.notes || ''}`;

    const newDemandPayload = {
      id: `dem-pub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 8)}`,
      clientName: formData.name.trim(),
      phone: fullPhone,
      whatsapp: fullWhatsapp,
      text_ar: textAr,
      text_en: textEn,
      area: formData.area,
      area_ar: areaObj.label_ar,
      area_en: areaObj.label_en,
      type: formData.type,
      budget: budgetNum,
      paymentMethod: formData.paymentMethod,
      timeframe: formData.timeframe,
      urgency: formData.timeframe === 'immediate' ? 'high' : formData.timeframe === 'within_1_month' ? 'high' : 'medium',
      minSize: formData.minSize,
      notes: formData.notes,
      timestamp: isAr ? 'الآن' : 'Just now',
      createdAt: new Date().toISOString(),
      status: 'pending',
      source: 'public_web_demand_form'
    };

    try {
      if (onSubmitDemand) {
        await onSubmitDemand(newDemandPayload);
      }
      setIsSubmitting(false);
      setSubmittedSuccess(true);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      triggerToast?.(isAr ? 'حدث خطأ أثناء الإرسال، يرجى المحاولة ثانية' : 'Submission error, please try again', 'error');
    }
  };

  const handleResetAndClose = () => {
    setSubmittedSuccess(false);
    onClose();
  };

  return (
    <div className="track-modal-backdrop" onClick={handleResetAndClose} style={{ zIndex: 1200 }}>
      <div 
        className="track-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '680px', 
          width: '95%', 
          maxHeight: '90vh', 
          overflowY: 'auto', 
          borderRadius: '20px', 
          border: '1px solid rgba(217, 119, 6, 0.3)', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' 
        }}
      >
        <button type="button" className="modal-close-btn" onClick={handleResetAndClose} aria-label="Close">
          <X size={20} />
        </button>

        {submittedSuccess ? (
          <div style={{ padding: '30px 15px', textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ 
              width: '70px', 
              height: '70px', 
              borderRadius: '50%', 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: '#10b981', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px', 
              border: '2px solid #10b981' 
            }}>
              <CheckCircle size={40} />
            </div>

            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
              {isAr ? 'تم استلام طلبك العقاري بنجاح!' : 'Your Request Has Been Received!'}
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.7', maxWidth: '520px', margin: '0 auto 24px' }}>
              {isAr 
                ? 'شكراً لك! سيقوم فريق إدارة منصة 1Line بمراجعة مواصفات طلبك وتدقيقه، ثم نشره فوراً في قسم طلبات المشترين النشطة مع الحفاظ الكامل على سرية بياناتك الشخصية.'
                : 'Thank you! The 1Line team will review your demand specs and publish it to the active market demands with full identity protection.'}
            </p>

            <div style={{ 
              background: 'rgba(15, 23, 42, 0.6)', 
              border: '1px dashed var(--accent-gold)', 
              borderRadius: '12px', 
              padding: '16px', 
              margin: '0 auto 24px', 
              maxWidth: '480px', 
              textAlign: isAr ? 'right' : 'left' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px' }}>
                <ShieldCheck size={16} />
                <span>{isAr ? 'حماية الخصوصية ومطابقة العروض' : 'Privacy Protection & Matching'}</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: '1.5' }}>
                {isAr 
                  ? 'لن يظهر اسمك أو رقم هاتفك للعامة. فقط عندما يتقدم مالك بعقار يطابق مواصفاتك سيقوم مستشارنا المعتمد بالتواصل معك مباشرة لإتمام المعاينة.'
                  : 'Your phone and identity remain strictly private. Our advisors will contact you once a verified matching unit is found.'}
              </p>
            </div>

            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleResetAndClose}
              style={{ minWidth: '180px', margin: '0 auto' }}
            >
              <span>{isAr ? 'إغلاق ومتابعة التصفح' : 'Close & Continue'}</span>
            </button>
          </div>
        ) : (
          <>
            <div className="track-modal-header" style={{ marginBottom: '20px' }}>
              <div className="track-icon-wrap" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                <Zap size={22} style={{ color: '#fff' }} />
              </div>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                {isAr ? 'أضف طلبك العقاري للشراء أو الاستثمار' : 'Submit Your Property Acquisition Request'}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {isAr 
                  ? 'سجل مواصفات العقار المطلوب وميزانيتك لننشرها للبائعين والمطورين بسوهاج مع حماية كاملة لخصوصيتك.'
                  : 'Register your target property specifications to match with direct sellers in Sohag.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="booking-form-wrap" style={{ gap: '16px' }}>
              {/* Privacy Notice Banner */}
              <div style={{ 
                background: 'rgba(217, 119, 6, 0.08)', 
                border: '1px solid rgba(217, 119, 6, 0.3)', 
                borderRadius: '10px', 
                padding: '10px 14px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                fontSize: '0.8rem', 
                color: 'var(--accent-gold)' 
              }}>
                <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                <span>
                  {isAr 
                    ? 'يخضع الطلب لمراجعة إدارة المنصة لضمان الجدية وتجنب العشوائية قبل النشر العام.' 
                    : 'All requests undergo admin review to verify authenticity before public listing.'}
                </span>
              </div>

              {/* Row 1: Property Type & Area */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div className="form-group-item">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={14} className="text-gold" />
                    <span>{isAr ? 'نوع العقار المطلوب' : 'Property Type'} *</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    {PROP_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {isAr ? opt.label_ar : opt.label_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group-item">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} className="text-gold" />
                    <span>{isAr ? 'المنطقة المستهدفة' : 'Target Location / District'} *</span>
                  </label>
                  <select
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    required
                  >
                    {getAreas().filter(a => a.id !== 'all').map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {isAr ? (opt.label_ar || opt.name_ar) : (opt.label_en || opt.name_en)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Budget & Payment Method */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div className="form-group-item">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={14} className="text-gold" />
                    <span>{isAr ? 'الميزانية المتاحة (جنيه مصري)' : 'Target Budget (EGP)'} *</span>
                  </label>
                  <input
                    type="number"
                    placeholder={isAr ? 'مثال: 3200000' : 'e.g. 3200000'}
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    required
                    min="100000"
                    step="50000"
                  />
                </div>

                <div className="form-group-item">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} className="text-gold" />
                    <span>{isAr ? 'طريقة السداد والتوقيت' : 'Payment & Readiness'} *</span>
                  </label>
                  <select
                    value={formData.timeframe}
                    onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                    required
                  >
                    {TIMEFRAME_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {isAr ? opt.label_ar : opt.label_en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Min Size & Payment preference */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div className="form-group-item">
                  <label>{isAr ? 'المساحة المطلوبة التقريبية (م²)' : 'Min Area Size (Sqm)'}</label>
                  <input
                    type="number"
                    placeholder={isAr ? 'مثال: 150' : 'e.g. 150'}
                    value={formData.minSize}
                    onChange={(e) => setFormData({ ...formData, minSize: e.target.value })}
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'نظام السداد المفضل' : 'Payment Mode'}</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  >
                    <option value="cash">{isAr ? 'كاش فوري (دفع كامل)' : '100% Full Cash'}</option>
                    <option value="installments">{isAr ? 'مقدم + أقساط مريحة' : 'Downpayment + Installments'}</option>
                    <option value="flexible">{isAr ? 'مرن حسب العرض والموقع' : 'Flexible based on deal'}</option>
                  </select>
                </div>
              </div>

              {/* Notes & Special specs */}
              <div className="form-group-item">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} className="text-gold" />
                  <span>{isAr ? 'شروط أو مواصفات خاصة (الدور، الواجهة، الشارع...)' : 'Specific Requirements / Notes'}</span>
                </label>
                <textarea
                  rows={2}
                  placeholder={isAr ? 'مثال: يفضل دور ثاني أو ثالث، واجهة بحرية، تشطيب سوبر لوكس أو نصف تشطيب...' : 'e.g. 2nd or 3rd floor preferred, sea/north facing, super lux finish...'}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-input, rgba(255,255,255,0.05))',
                    border: '1px solid var(--border-light, rgba(255,255,255,0.15))',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Section Divider: Contact Info */}
              <div style={{ 
                borderTop: '1px solid var(--border-light, rgba(255,255,255,0.12))', 
                paddingTop: '14px', 
                marginTop: '4px' 
              }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} className="text-gold" />
                  <span>{isAr ? 'بيانات التواصل (سرية للإدارة فقط)' : 'Your Contact Details (Strictly Confidential)'}</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div className="form-group-item">
                    <label>{isAr ? 'الاسم بالكامل' : 'Your Full Name'} *</label>
                    <input
                      type="text"
                      placeholder={isAr ? 'الاسم الكريم' : 'Full Name'}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-item">
                    <PhoneInputField
                      label={isAr ? 'رقم الهاتف الأساسي *' : 'Primary Phone Number *'}
                      value={formData.phone}
                      onChange={(val) => setFormData({ ...formData, phone: val })}
                      country={phoneCountry}
                      onCountryChange={setPhoneCountry}
                      error={phoneError}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <PhoneInputField
                    label={isAr ? 'رقم الواتساب (اختياري للتواصل السريع)' : 'WhatsApp Number (Optional)'}
                    value={formData.whatsapp}
                    onChange={(val) => setFormData({ ...formData, whatsapp: val })}
                    country={whatsappCountry}
                    onCountryChange={setWhatsappCountry}
                    error={whatsappError}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="btn btn-primary btn-full" 
                disabled={isSubmitting}
                style={{ 
                  marginTop: '8px', 
                  padding: '14px', 
                  fontSize: '0.98rem', 
                  fontWeight: 'bold', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px' 
                }}
              >
                {isSubmitting ? (
                  <span>{isAr ? 'جاري إرسال الطلب للمراجعة...' : 'Submitting for Review...'}</span>
                ) : (
                  <>
                    <Send size={18} />
                    <span>{isAr ? 'إرسال الطلب لمراجعة الإدارة والنشر' : 'Submit Demand for Admin Review & Listing'}</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
