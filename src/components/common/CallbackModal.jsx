import { useState } from 'react';
import { X, Phone, Sparkles } from 'lucide-react';
import { checkFormSpamProtection } from '../../utils/securityShield';
import { getAreas } from '../../utils/areasData';

export default function CallbackModal({ isOpen, onClose, lang, onSubmitCallback, triggerToast }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    propertyType: 'apartment',
    area: 'sohag_jadida',
    preferredTime: 'immediate'
  });
  const [hpField, setHpField] = useState('');
  const isAr = lang === 'ar';

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    // 🛡️ Anti-Bot & Spam Rate-Limit Shield
    const spamCheck = checkFormSpamProtection(hpField, 'callback_modal');
    if (!spamCheck.allowed) {
      triggerToast(isAr ? spamCheck.message_ar : spamCheck.message_en, 'error');
      return;
    }

    if (!form.name || !form.name.trim()) {
      triggerToast(isAr ? 'الاسم بالكامل إلزامي' : 'Full name is required', 'error');
      return;
    }

    const cleanWhatsapp = (form.whatsapp || '').trim().replace(/[\s\-()]/g, '');
    if (!cleanWhatsapp) {
      triggerToast(isAr ? 'رقم الواتساب إلزامي للتواصل' : 'WhatsApp number is required', 'error');
      return;
    }

    if (!form.propertyType) {
      triggerToast(isAr ? 'تحديد نوع العقار المهتم به إلزامي' : 'Interested property type is required', 'error');
      return;
    }

    if (!form.area) {
      triggerToast(isAr ? 'تحديد الموقع / المنطقة بسوهاج إلزامي' : 'Target location/area is required', 'error');
      return;
    }

    onSubmitCallback({
      ...form,
      phone: form.phone || cleanWhatsapp,
      whatsapp: cleanWhatsapp
    });
    onClose();
  };

  const areas = getAreas().filter(a => a.id !== 'all');

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="track-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="track-modal-header">
          <div className="track-icon-wrap"><Phone size={22} /></div>
          <h3>{isAr ? 'طلب معاودة اتصال سريع ومباشر' : 'Request a Fast Callback'}</h3>
          <p>{isAr ? 'اترك بياناتك وسيتواصل معك مستشار عقاري متخصص خلال دقائق.' : 'Leave your info and our advisor will call you at your preferred time.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="booking-form-wrap">
          {/* 🍯 Invisible Honeypot Anti-Bot Shield */}
          <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
            <input
              type="text"
              name="callback_bot_trap_hp"
              tabIndex="-1"
              autoComplete="off"
              value={hpField}
              onChange={(e) => setHpField(e.target.value)}
            />
          </div>

          <div className="form-group-item">
            <label>{isAr ? 'الاسم بالكامل * (إلزامي)' : 'Full Name * (Required)'}</label>
            <input
              type="text"
              placeholder={isAr ? 'اسمك الكريم' : 'Your name'}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group-item">
            <label>{isAr ? 'رقم الواتساب * (إلزامي)' : 'WhatsApp Number * (Required)'}</label>
            <input
              type="tel"
              placeholder="01012345678"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              required
            />
          </div>

          <div className="form-group-item">
            <label>{isAr ? 'رقم الهاتف الأساسي (اختياري)' : 'Phone Number (Optional)'}</label>
            <input
              type="tel"
              placeholder="01012345678"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="form-group-item">
            <label>{isAr ? 'العقارات المهتم بها / نوع العقار * (إلزامي)' : 'Interested Property Type * (Required)'}</label>
            <select
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
              required
            >
              <option value="apartment">{isAr ? 'شقة سكنية' : 'Apartment'}</option>
              <option value="retail">{isAr ? 'محل ومساحة تجارية' : 'Commercial Shop'}</option>
              <option value="villa">{isAr ? 'فيلا / تاون هاوس' : 'Villa / Townhouse'}</option>
              <option value="office">{isAr ? 'مقر إداري / عيادة' : 'Office / Clinic'}</option>
              <option value="land">{isAr ? 'قطعة أرض' : 'Land Plot'}</option>
              <option value="building">{isAr ? 'عمارة كاملة' : 'Full Building'}</option>
            </select>
          </div>

          <div className="form-group-item">
            <label>{isAr ? 'الموقع / المنطقة بسوهاج * (إلزامي)' : 'Target Location / District * (Required)'}</label>
            <select
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              required
            >
              {areas.map(a => (
                <option key={a.id} value={a.id}>
                  {isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group-item">
            <label>{isAr ? 'الوقت المفضل للاتصال' : 'Preferred Callback Time'}</label>
            <select
              value={form.preferredTime}
              onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
            >
              <option value="immediate">{isAr ? 'اتصال فوري الآن' : 'Immediate / Right Now'}</option>
              <option value="morning">{isAr ? 'صباحاً (10 ص - 1 م)' : 'Morning (10 AM - 1 PM)'}</option>
              <option value="evening">{isAr ? 'مساءً (5 م - 9 م)' : 'Evening (5 PM - 9 PM)'}</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            <Sparkles size={16} />
            <span>{isAr ? 'إرسال طلب الاتصال' : 'Send Callback Request'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
