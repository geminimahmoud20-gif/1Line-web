import React, { useState } from 'react';
import { 
  Gift 
} from 'lucide-react';
import PhoneInputField, { SUPPORTED_COUNTRIES } from './PhoneInputField';

export const ReferralPortal = ({
  lang,
  t,
  handleAddNewLead,
  triggerToast
}) => {
  const [referralForm, setReferralForm] = useState({
    referrerName: '',
    referrerPhone: '',
    referralName: '',
    referralPhone: '',
    relationship: 'friend',
    referralType: 'buyer',
    notes: ''
  });

  const [referrerCountry, setReferrerCountry] = useState('+20');
  const [referrerError, setReferrerError] = useState('');
  const [referralCountry, setReferralCountry] = useState('+20');
  const [referralError, setReferralError] = useState('');

  const validateAndSubmit = (e) => {
    e.preventDefault();

    // Check referrer phone format
    const referrerCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === referrerCountry);
    const isReferrerValid = referrerCountryObj ? referrerCountryObj.regex.test(referralForm.referrerPhone) : true;
    
    // Check referral phone format
    const referralCountryObj = SUPPORTED_COUNTRIES.find(c => c.code === referralCountry);
    const isReferralValid = referralCountryObj ? referralCountryObj.regex.test(referralForm.referralPhone) : true;

    if (!isReferrerValid) {
      setReferrerError(lang === 'ar' ? 'رقم الهاتف غير متوافق مع صيغة الدولة المحددة' : 'Referrer phone number does not match country format');
      return;
    }
    
    if (!isReferralValid) {
      setReferralError(lang === 'ar' ? 'رقم الهاتف المحال غير متوافق مع صيغة الدولة المحددة' : 'Referral phone number does not match country format');
      return;
    }

    // Include country code in values submitted
    const updatedForm = {
      ...referralForm,
      referrerPhone: `${referrerCountry}${referralForm.referrerPhone}`,
      referralPhone: `${referralCountry}${referralForm.referralPhone}`
    };

    handleAddNewLead('referral', updatedForm, 'Referral Portal');
    setReferralForm({
      referrerName: '',
      referrerPhone: '',
      referralName: '',
      referralPhone: '',
      relationship: 'friend',
      referralType: 'buyer',
      notes: ''
    });
    setReferrerError('');
    setReferralError('');
    triggerToast(lang === 'ar' ? 'تم تسجيل الإحالة بنجاح في قاعدة البيانات!' : 'Referral registered successfully!');
  };

  return (
    <div>
      <div className="investment-hero" style={{ background: 'linear-gradient(135deg, #0e1630 0%, #15224e 100%)', color: 'white', padding: '40px 20px', borderRadius: 'var(--radius-lg)', marginBottom: '30px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
        <Gift size={40} style={{ color: 'var(--accent-gold)', marginBottom: '16px' }} />
        <h2>{lang === 'ar' ? 'برنامج شركاء النجاح وعمولات الإحالة' : 'Referral Reward Partner Program'}</h2>
        <p style={{ marginTop: '10px', fontSize: '0.95rem', opacity: 0.9 }}>
          {lang === 'ar'
            ? 'أوصِ ببائع، مشتري، مستثمر، أو وسيط عقاري في سوهاج، واحصل على عمولة مضمونة فور إتمام الصفقة.'
            : 'Refer buyers, sellers, or investors and earn a guaranteed percentage upon deal completion.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', alignItems: 'start' }}>
        {/* How it works */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>{lang === 'ar' ? 'كيف يعمل البرنامج؟' : 'How does it work?'}</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>١</div>
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{lang === 'ar' ? 'سجل بياناتك والمُحال' : 'Submit referral info'}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {lang === 'ar' ? 'املأ نموذج التوصية بالعميل أو مالك العقار بسرية تامة.' : 'Complete the referral form details confidentially.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>٢</div>
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{lang === 'ar' ? 'يقوم فريقنا بالعمل والمطابقة' : 'We contact & close'}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {lang === 'ar' ? 'نقوم بالتواصل مع العميل والوصول لأفضل الصفقات بفضل شبكتنا وعلاقاتنا.' : 'Our experts match requirements & close transactions.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>٣</div>
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{lang === 'ar' ? 'احصل على عمولتك المضمونة' : 'Get paid rewards'}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {lang === 'ar' ? 'تستلم ما يصل لـ 20% من عمولة المنفذ فورياً بمجرد استلام الأرباح.' : 'Receive your share of brokerage revenues immediately.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submission Form */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gift size={20} style={{ color: 'var(--accent-gold)' }} />
            {lang === 'ar' ? 'سجل بيانات التوصية / الإحالة' : 'New Referral Submission'}
          </h3>

          <form onSubmit={validateAndSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'اسمك الكريم' : 'Your Name'}</label>
                <input 
                  type="text" required className="form-input"
                  value={referralForm.referrerName}
                  onChange={(e) => setReferralForm({ ...referralForm, referrerName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <PhoneInputField
                  phone={referralForm.referrerPhone}
                  setPhone={(val) => {
                    setReferralForm({ ...referralForm, referrerPhone: val });
                    setReferrerError('');
                  }}
                  country={referrerCountry}
                  setCountry={setReferrerCountry}
                  error={referrerError}
                  label={lang === 'ar' ? 'رقم هاتفك' : 'Your Phone'}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'اسم العميل المُحال' : 'Referral Name'}</label>
                <input 
                  type="text" required className="form-input"
                  value={referralForm.referralName}
                  onChange={(e) => setReferralForm({ ...referralForm, referralName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <PhoneInputField
                  phone={referralForm.referralPhone}
                  setPhone={(val) => {
                    setReferralForm({ ...referralForm, referralPhone: val });
                    setReferralError('');
                  }}
                  country={referralCountry}
                  setCountry={setReferralCountry}
                  error={referralError}
                  label={lang === 'ar' ? 'رقم هاتف العميل المُحال' : 'Referral Phone'}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'الصلة بالعميل' : 'Relationship'}</label>
                <select 
                  className="form-input"
                  value={referralForm.relationship}
                  onChange={(e) => setReferralForm({ ...referralForm, relationship: e.target.value })}
                >
                  <option value="friend">{lang === 'ar' ? 'صديق / زميل' : 'Friend / Colleague'}</option>
                  <option value="client">{lang === 'ar' ? 'عميل خاص بي' : 'My Client'}</option>
                  <option value="relative">{lang === 'ar' ? 'قريب من العائلة' : 'Relative'}</option>
                  <option value="myself">{lang === 'ar' ? 'مالك عقار / وسيط مشارك' : 'Co-Broker / Owner'}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{lang === 'ar' ? 'نوع الإحالة' : 'Referral Type'}</label>
                <select 
                  className="form-input"
                  value={referralForm.referralType}
                  onChange={(e) => setReferralForm({ ...referralForm, referralType: e.target.value })}
                >
                  <option value="buyer">{lang === 'ar' ? 'مشتري مهتم بسوهاج' : 'Buyer'}</option>
                  <option value="seller">{lang === 'ar' ? 'مالك عقار يريد البيع' : 'Seller'}</option>
                  <option value="investor">{lang === 'ar' ? 'مستثمر برأس مال' : 'Investor'}</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">{lang === 'ar' ? 'تفاصيل عن طلب أو عقار المُحال' : 'Referral Notes'}</label>
              <textarea 
                className="form-input" rows="3"
                placeholder={lang === 'ar' ? 'مثال: يملك قطعة أرض بمدينة سوهاج الجديدة يريد بيعها فورا...' : 'e.g. wants to buy an apartment in East Sohag...'}
                value={referralForm.notes}
                onChange={(e) => setReferralForm({ ...referralForm, notes: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full">
              {lang === 'ar' ? 'تسجيل الإحالة ومكافأة العمولة' : 'Register Referral Share'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReferralPortal;
