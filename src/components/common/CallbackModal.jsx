import { useState } from 'react';
import { X, Phone, Sparkles, ShieldCheck, TrendingUp, Home, Clock, Video, Building2 } from 'lucide-react';
import { checkFormSpamProtection } from '../../utils/securityShield';
import { getAreas } from '../../utils/areasData';
import PhoneInputField from '../PhoneInputField';

export default function CallbackModal({ isOpen, onClose, lang = 'ar', onSubmitCallback, triggerToast }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    propertyType: 'apartment',
    area: 'new_sohag',
    consultationTrack: 'investment', // 'investment' | 'legal' | 'luxury_home'
    meetingType: 'vip_call',          // 'vip_call' | 'office_meeting' | 'video_call'
    preferredTime: 'immediate'        // 'immediate' | 'evening' | 'tomorrow'
  });

  const [country, setCountry] = useState('+20');
  const [phoneError, setPhoneError] = useState('');
  const [hpField, setHpField] = useState('');
  const isAr = lang === 'ar';

  if (!isOpen) return null;

  const consultationTracks = [
    {
      id: 'investment',
      icon: TrendingUp,
      title_ar: 'استشارة استثمار وعوائد إيجارية',
      title_en: 'Investment & Rental Advisory',
      desc_ar: 'المشروعات التجارية والمولات والمقرات الإدارية بسوهاج الجديدة'
    },
    {
      id: 'legal',
      icon: ShieldCheck,
      title_ar: 'فحص قانوني وتدقيق أوراق الملكية',
      title_en: 'Legal Due Diligence & Title Deed',
      desc_ar: 'مراجعة تسلسل الملكية وتراخيص البناء ونموذج 10 للتصالح'
    },
    {
      id: 'luxury_home',
      icon: Home,
      title_ar: 'اختيار السكن الأول والكمبوندات',
      title_en: 'Luxury Residential & Compounds',
      desc_ar: 'فيلات وشقق فاخرة بأفضل أنظمة سداد وتسهيلات حتى 7 سنوات'
    }
  ];

  const meetingTypes = [
    { id: 'vip_call', icon: Phone, label_ar: 'مكالمة هاتفية VIP', label_en: 'VIP Phone Call' },
    { id: 'office_meeting', icon: Building2, label_ar: 'جلسة خاصة بمقر الشركة', label_en: 'Private Office Meeting' },
    { id: 'video_call', icon: Video, label_ar: 'اجتماع مرئي (Zoom / Meet)', label_en: 'Video Conference' }
  ];

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

    const cleanPhone = (form.phone || form.whatsapp || '').trim().replace(/[\s\-()]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setPhoneError(isAr ? 'يرجى إدخال رقم هاتف صحيح للتواصل' : 'Valid phone number is required');
      return;
    }

    const normalizedPhone = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
    const fullPhone = `${country}${normalizedPhone}`;

    onSubmitCallback({
      ...form,
      phone: fullPhone,
      whatsapp: fullPhone
    });
    onClose();
  };

  const areas = getAreas().filter(a => a.id !== 'all');

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div 
        className="track-modal-card luxury-consultation-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '640px',
          maxHeight: 'min(92vh, 760px)',
          overflowY: 'auto',
          padding: '24px 26px',
          boxSizing: 'border-box'
        }}
      >
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="إغلاق">
          <X size={20} />
        </button>

        <div className="track-modal-header text-center" style={{ marginBottom: '10px' }}>
          <div className="track-icon-wrap luxury-gold-glow" style={{ width: '44px', height: '44px', margin: '0 auto 6px' }}>
            <Sparkles size={22} className="text-gold" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0' }}>
            {isAr ? 'حجز جلسة استشارة عقارية خاصة 🏛️' : 'VIP Real Estate Consultation Booking'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            {isAr 
              ? 'تحدث مباشرة مع مستشاري 1Line المعتمدين بسوهاج لدراسة استثمارك وتأكيد الموقف القانوني مجاناً.'
              : 'Direct advisory with certified 1Line consultants for investment feasibility & legal due diligence.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="booking-form-wrap" style={{ marginTop: '12px' }}>
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

          {/* 1. Track Selector */}
          <div className="form-group-item">
            <label style={{ fontWeight: 700, marginBottom: '6px', display: 'block', fontSize: '0.86rem' }}>
              {isAr ? 'اختر مسار الاستشارة المتخصصة:' : 'Select Consultation Track:'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
              {consultationTracks.map((track) => {
                const Icon = track.icon;
                const isSelected = form.consultationTrack === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => setForm({ ...form, consultationTrack: track.id })}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid var(--accent-gold, #d97706)' : '1px solid rgba(148, 163, 184, 0.25)',
                      background: isSelected ? 'rgba(217, 119, 6, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <Icon size={15} color={isSelected ? 'var(--accent-gold, #d97706)' : '#64748b'} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                        {isAr ? track.title_ar : track.title_en}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, lineHeight: 1.3 }}>
                      {isAr ? track.desc_ar : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Client Name */}
          <div className="form-group-item" style={{ marginTop: '10px' }}>
            <label style={{ fontWeight: 700, fontSize: '0.86rem', display: 'block', marginBottom: '4px' }}>
              {isAr ? 'الاسم الكريم بالكامل * (إلزامي)' : 'Full Name * (Required)'}
            </label>
            <input
              type="text"
              className="form-input-styled"
              placeholder={isAr ? 'مثال: أ. أحمد رضوان' : 'Your Full Name'}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={{ width: '100%', boxSizing: 'border-box', minHeight: '44px', padding: '10px 14px' }}
            />
          </div>

          {/* 3. Phone Input with Country Code */}
          <div className="form-group-item" style={{ marginTop: '10px' }}>
            <PhoneInputField
              label={isAr ? 'رقم الهاتف والواتساب المفضل للتواصل *' : 'Phone / WhatsApp *'}
              value={form.phone}
              onChange={(phone) => {
                setForm({ ...form, phone, whatsapp: phone });
                if (phoneError) setPhoneError('');
              }}
              country={country}
              onCountryChange={setCountry}
              error={phoneError}
              required
            />
          </div>

          {/* 4. Target District */}
          <div className="form-group-item" style={{ marginTop: '10px' }}>
            <label style={{ fontWeight: 700, fontSize: '0.86rem', display: 'block', marginBottom: '4px' }}>
              {isAr ? 'المنطقة أو الحي المستهدف بسوهاج:' : 'Target District:'}
            </label>
            <select
              className="form-select-styled"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              style={{ width: '100%', boxSizing: 'border-box', minHeight: '44px', padding: '10px 14px' }}
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {isAr ? (a.label_ar || a.name_ar) : (a.label_en || a.name_en)}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Meeting Format & Timing */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginTop: '10px' }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: '0.84rem', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'قناة الاستشارة المفضلة:' : 'Meeting Channel:'}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {meetingTypes.map((m) => {
                  const Icon = m.icon;
                  const isSelected = form.meetingType === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setForm({ ...form, meetingType: m.id })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid var(--accent-gold, #d97706)' : '1px solid rgba(148, 163, 184, 0.2)',
                        background: isSelected ? 'rgba(217, 119, 6, 0.08)' : 'transparent',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: isAr ? 'right' : 'left'
                      }}
                    >
                      <Icon size={14} color={isSelected ? 'var(--accent-gold, #d97706)' : '#64748b'} />
                      <span>{isAr ? m.label_ar : m.label_en}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 700, fontSize: '0.84rem', display: 'block', marginBottom: '6px' }}>
                {isAr ? 'الوقت الأنسب للتواصل:' : 'Preferred Timing:'}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { id: 'immediate', label_ar: 'خلال 15 دقيقة (عاجل)', label_en: 'Within 15 mins (Urgent)' },
                  { id: 'evening', label_ar: 'فترة مسائية هادئة (6م - 10م)', label_en: 'Evening (6 PM - 10 PM)' },
                  { id: 'tomorrow', label_ar: 'غداً صباحاً (10ص - 2ظ)', label_en: 'Tomorrow Morning' }
                ].map((t) => {
                  const isSelected = form.preferredTime === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm({ ...form, preferredTime: t.id })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid var(--accent-gold, #d97706)' : '1px solid rgba(148, 163, 184, 0.2)',
                        background: isSelected ? 'rgba(217, 119, 6, 0.08)' : 'transparent',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <Clock size={14} color={isSelected ? 'var(--accent-gold, #d97706)' : '#64748b'} />
                      <span>{isAr ? t.label_ar : t.label_en}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit CTA */}
          <div style={{ marginTop: '16px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '12px 18px',
                fontSize: '0.98rem',
                fontWeight: 700,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                background: 'var(--gradient-gold, linear-gradient(135deg, #d97706, #b45309))',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={18} />
              <span>{isAr ? 'تأكيد حجز الاستشارة العقارية VIP' : 'Confirm VIP Consultation Booking'}</span>
            </button>
            <span style={{ display: 'block', textAlign: 'center', fontSize: '0.74rem', color: '#94a3b8', marginTop: '6px' }}>
              🔒 {isAr ? 'بياناتك مشفرة ومحمية بخصوصية تامة وفق ميثاق 1Line للأمان الرقمي' : 'Your details are strictly confidential under 1Line Privacy Charter'}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
