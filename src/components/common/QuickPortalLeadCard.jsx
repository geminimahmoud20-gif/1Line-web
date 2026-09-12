import { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  Building, 
  MapPin, 
  User, 
  PhoneCall, 
  DollarSign,
  ShieldCheck 
} from 'lucide-react';
import PhoneInputField from '../PhoneInputField';
import { SUPPORTED_COUNTRIES } from '../../utils/phoneCountries';
import { getAreas } from '../../utils/areasData';
import { getWhatsAppUrl } from '../../utils/founderCmsData';

export default function QuickPortalLeadCard({
  portalType = 'buy',
  lang = 'ar',
  handleAddNewLead,
  triggerToast
}) {
  const isAr = lang === 'ar';
  const areas = getAreas();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappCountry, setWhatsappCountry] = useState('+20');
  const [propertyType, setPropertyType] = useState('residential');
  const [area, setArea] = useState('east');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmittedLead, setLastSubmittedLead] = useState(null);

  const getPortalLabels = () => {
    switch (portalType) {
      case 'sell':
      case 'valuation':
        return {
          title: isAr ? 'عرض عقار للبيع أو التقييم (فوري في دقيقة)' : 'Fast Property Listing / Valuation',
          subtitle: isAr ? 'سجل بيانات عقارك وسيتواصل معك خبير التقييم خلال ساعات لمطابقته مع المشترين.' : 'List your property and our advisor will match it with active buyers.',
          budgetLabel: isAr ? 'السعر المطلوب التقريبي (ج.م)' : 'Asking Price (EGP)',
          submitBtn: isAr ? 'إرسال العقار للتقييم والبيع المباشر ←' : 'Submit Property for Listing ←',
          leadType: 'seller_instant'
        };
      case 'investor':
        return {
          title: isAr ? 'طلب استشارة ومحفظة استثمارية فورية' : 'Instant Investment Portfolio Request',
          subtitle: isAr ? 'حدد ميزانيتك الاستثمارية وسنرسل لك دراسة جدوى لأعلى الفرص التجارية عائداً بسوهاج.' : 'Get customized high-yield investment options sent directly to your WhatsApp.',
          budgetLabel: isAr ? 'الميزانية الاستثمارية المتاحة (ج.م)' : 'Investment Budget (EGP)',
          submitBtn: isAr ? 'طلب الملف الاستثماري الفوري ←' : 'Get Investment Portfolio ←',
          leadType: 'investor_instant'
        };
      case 'buy':
      default:
        return {
          title: isAr ? 'طلب شراء عقار فوري (في خطوة واحدة)' : 'Fast 1-Step Buyer Request',
          subtitle: isAr ? 'حدد مواصفات ومكان العقار وسنقوم بالبحث والمطابقة الفورية مع الوحدات المتاحة.' : 'Tell us what you need and our advisors will find matching units instantly.',
          budgetLabel: isAr ? 'الميزانية المتاحة أو الحد الأقصى (ج.م)' : 'Budget Range (EGP)',
          submitBtn: isAr ? 'إرسال ومطابقة العقار فوراً ←' : 'Find Matching Properties Now ←',
          leadType: 'buyer_instant'
        };
    }
  };

  const labels = getPortalLabels();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPhoneError('');

    const cleanName = name.trim();
    if (!cleanName) {
      if (triggerToast) triggerToast(isAr ? 'الرجاء إدخال الاسم بالكامل' : 'Please enter full name', 'warning');
      return;
    }

    const cleanWa = (whatsapp || '').trim().replace(/[\s\-()]/g, '');
    if (!cleanWa) {
      setPhoneError(isAr ? 'رقم الواتساب إلزامي لاستلام المطابقات والملفات' : 'WhatsApp number is required');
      return;
    }

    const countryObj = SUPPORTED_COUNTRIES.find(c => c.code === whatsappCountry);
    if (countryObj && !countryObj.regex.test(cleanWa)) {
      setPhoneError(isAr ? 'رقم الواتساب غير متوافق مع صيغة الدولة المختارة' : 'Invalid WhatsApp format');
      return;
    }

    setIsSubmitting(true);

    const normalizedPhone = cleanWa.startsWith('0') ? cleanWa.substring(1) : cleanWa;
    const fullWaNumber = `${whatsappCountry}${normalizedPhone}`;

    const leadPayload = {
      name: cleanName,
      clientName: cleanName,
      whatsapp: fullWaNumber,
      phone: fullWaNumber,
      propertyType,
      area,
      budget: budget.trim(),
      notes: notes.trim(),
      source: `Portals 1-Step (${portalType})`,
      type: labels.leadType,
      status: 'new',
      timestamp: new Date().toISOString()
    };

    try {
      if (handleAddNewLead) {
        await handleAddNewLead(leadPayload, { type: labels.leadType }, `بوابة ${portalType} (طلب سريع)`);
      }
      setLastSubmittedLead(leadPayload);
      setSubmitted(true);
      if (triggerToast) {
        triggerToast(isAr ? 'تم استلام طلبك بنجاح! سيتم التواصل معك فوراً.' : 'Request received successfully!', 'success');
      }
    } catch (err) {
      console.error('Error submitting fast lead:', err);
      if (triggerToast) {
        triggerToast(isAr ? 'حدث خطأ أثناء الإرسال، يرجى المحاولة ثانية' : 'Submission error', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    const waText = isAr
      ? `مرحباً 1Line، أنا ${lastSubmittedLead?.name} سجلت طلباً سريعاً لـ (${lastSubmittedLead?.propertyType}) في (${lastSubmittedLead?.area}) وأريد المتابعة الفورية.`
      : `Hello 1Line, I submitted a quick request for ${lastSubmittedLead?.propertyType} in ${lastSubmittedLead?.area}.`;

    return (
      <div className="quick-portal-success-card">
        <div className="quick-success-icon-wrap">
          <CheckCircle2 size={44} className="text-emerald" />
        </div>
        <h3>{isAr ? 'تم استلام طلبك بنجاح وسرعة!' : 'Request Received Successfully!'}</h3>
        <p>
          {isAr 
            ? `شكراً أ/ ${lastSubmittedLead?.name}، تم توجيه طلبك لمستشار منطقة ${lastSubmittedLead?.area} وجارٍ تجهيز أفضل الخيارات المطابقة لميزانيتك فوراً.`
            : `Thank you ${lastSubmittedLead?.name}, our regional advisor is reviewing matching units now.`}
        </p>

        <div className="quick-success-actions">
          <a
            href={getWhatsAppUrl(waText)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp-direct"
          >
            <MessageSquare size={18} />
            <span>{isAr ? 'تأكيد ومتابعة فورية على الواتساب 💬' : 'Follow up via WhatsApp 💬'}</span>
          </a>
          <button
            type="button"
            className="btn btn-secondary-outline"
            onClick={() => {
              setSubmitted(false);
              setName('');
              setWhatsapp('');
              setNotes('');
              setBudget('');
            }}
          >
            {isAr ? 'تقديم طلب آخر' : 'Submit Another Request'}
          </button>
        </div>

        <div className="quick-success-guarantee">
          <ShieldCheck size={14} className="text-gold" />
          <span>{isAr ? 'خدمة مجانية 100% مع ضمان حماية وسرية بياناتك' : '100% Free & Confidential'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="quick-portal-lead-card">
      <div className="quick-card-header">
        <div className="quick-card-badge">
          <Sparkles size={14} className="text-gold" />
          <span>{isAr ? 'طلب مباشر في خطوة واحدة' : '1-Step Direct Request'}</span>
        </div>
        <h2 className="quick-card-title">{labels.title}</h2>
        <p className="quick-card-desc">{labels.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="quick-portal-form">
        <div className="quick-form-grid">
          {/* 1. Full Name */}
          <div className="quick-form-field">
            <label>
              <User size={15} />
              <span>{isAr ? 'الاسم بالكامل' : 'Full Name'}</span>
              <strong className="required-star">*</strong>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? 'مثال: أحمد محمود الشريف' : 'e.g. Ahmed Mahmoud'}
              className="quick-input"
            />
          </div>

          {/* 2. WhatsApp Number */}
          <div className="quick-form-field">
            <label>
              <PhoneCall size={15} />
              <span>{isAr ? 'رقم الواتساب للتواصل الفوري' : 'WhatsApp Number'}</span>
              <strong className="required-star">*</strong>
            </label>
            <PhoneInputField
              phone={whatsapp}
              onChangePhone={(val) => {
                setWhatsapp(val);
                if (phoneError) setPhoneError('');
              }}
              countryCode={whatsappCountry}
              onChangeCountry={setWhatsappCountry}
              isAr={isAr}
              error={phoneError}
              placeholder={isAr ? 'أدخل رقم الواتساب' : 'Enter WhatsApp Number'}
            />
          </div>

          {/* 3. Property Type */}
          <div className="quick-form-field">
            <label>
              <Building size={15} />
              <span>{isAr ? 'نوع العقار المطلوب' : 'Property Type'}</span>
              <strong className="required-star">*</strong>
            </label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="quick-input quick-select"
            >
              <option value="residential">{isAr ? 'شقة سكنية' : 'Apartment'}</option>
              <option value="commercial">{isAr ? 'محل تجاري / فرنشايز' : 'Retail / Shop'}</option>
              <option value="villa">{isAr ? 'فيلا مستقلة / تاون هاوس' : 'Villa / Townhouse'}</option>
              <option value="office">{isAr ? 'مكتب إداري / عيادة' : 'Office / Clinic'}</option>
              <option value="land">{isAr ? 'قطعة أرض' : 'Land Plot'}</option>
              <option value="building">{isAr ? 'عمارة كاملة' : 'Full Building'}</option>
            </select>
          </div>

          {/* 4. Area in Sohag */}
          <div className="quick-form-field">
            <label>
              <MapPin size={15} />
              <span>{isAr ? 'المنطقة أو الحي بسوهاج' : 'Target District'}</span>
              <strong className="required-star">*</strong>
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="quick-input quick-select"
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Budget / Asking Price */}
          <div className="quick-form-field">
            <label>
              <DollarSign size={15} />
              <span>{labels.budgetLabel}</span>
              <span className="optional-tag">({isAr ? 'اختياري' : 'Optional'})</span>
            </label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder={isAr ? 'مثال: 2,500,000 ج.م أو كاش فوري' : 'e.g. 2.5M EGP'}
              className="quick-input"
            />
          </div>

          {/* 6. Notes / Extra Specs */}
          <div className="quick-form-field quick-field-wide">
            <label>
              <span>{isAr ? 'ملاحظات أو مواصفات خاصة' : 'Additional Notes'}</span>
              <span className="optional-tag">({isAr ? 'اختياري' : 'Optional'})</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? 'أضف أي تفاصيل تهمك (الدور، المساحة، طريقة السداد، موعد الاستلام...)' : 'Any specific requirements (floor, size, payment plan...)'}
              className="quick-input quick-textarea"
            />
          </div>
        </div>

        <div className="quick-form-submit-row">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary-royal btn-submit-quick-lead"
          >
            {isSubmitting ? (
              <span>{isAr ? 'جارٍ الإرسال والمطابقة...' : 'Submitting...'}</span>
            ) : (
              <>
                <Send size={16} />
                <span>{labels.submitBtn}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
