import { useState } from 'react';
import { Zap, Send, Phone, MessageSquare, CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';
import { getWhatsAppUrl, getPhoneCallUrl } from '../../utils/founderCmsData';
import { checkFormSpamProtection, normalizePhoneNumber } from '../../utils/securityShield';

export default function ExpressLeadStrip({ lang = 'ar', onAddNewLead, triggerToast }) {
  const isAr = lang === 'ar';
  const [requirement, setRequirement] = useState('');
  const [phone, setPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hpField, setHpField] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🛡️ Anti-bot check
    const spamCheck = checkFormSpamProtection(hpField, 'express_strip');
    if (!spamCheck.allowed) {
      if (triggerToast) {
        triggerToast(isAr ? spamCheck.message_ar : spamCheck.message_en, 'error');
      }
      return;
    }

    if (!phone || phone.trim().length < 8) {
      if (triggerToast) {
        triggerToast(isAr ? 'يرجى إدخال رقم هاتف صحيح للتواصل' : 'Please enter a valid phone number', 'error');
      }
      return;
    }

    setLoading(true);

    const cleanPhone = normalizePhoneNumber(phone.trim());
    const leadData = {
      name: clientName.trim() || (isAr ? 'عميل طلب سريع' : 'Express Lead'),
      phone: cleanPhone,
      source: 'express_hero_strip',
      type: 'express_buyer',
      status: 'new',
      notes: requirement.trim() || (isAr ? 'طلب عروض عقارية سريعة بسوهاج' : 'Quick property specs requested'),
      createdAt: new Date().toISOString()
    };

    try {
      if (onAddNewLead) {
        await onAddNewLead(leadData);
      }
      setSubmitted(true);
      if (triggerToast) {
        triggerToast(
          isAr ? 'تم استلام طلبك بنجاح! جاري تحويلك لمستشار 1LINE...' : 'Request received! Connecting with advisor...',
          'success'
        );
      }

      // Automatically compose tailored WhatsApp link and open after 1 second
      setTimeout(() => {
        const waMsg = isAr
          ? `مرحباً 1Line، سجلت طلبي السريع عبر المنصة: ${requirement.trim() || 'عقار مناسب بسوهاج'}، اسمي: ${clientName.trim() || 'عميل مهتم'}، رقمي: ${cleanPhone}. أرجو تزويدي بأفضل 3 عروض فوراً.`
          : `Hello 1Line, I submitted an express inquiry for: ${requirement.trim() || 'Property in Sohag'}, Name: ${clientName.trim() || 'Client'}, Phone: ${cleanPhone}. Please send top 3 matches.`;
        window.open(getWhatsAppUrl(waMsg), '_blank');
      }, 1200);
    } catch (err) {
      console.error('Express request submit error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="express-lead-section">
      <div className="express-lead-card">
        <div className="express-lead-glow" />

        <div className="express-lead-header">
          <div className="express-lead-badge">
            <Zap size={15} className="text-gold" />
            <span>{isAr ? 'الطلب السريع في 10 ثوانٍ' : '10-Second Express Match'}</span>
          </div>
          <h3 className="express-lead-title">
            {isAr ? 'مش لاقي طلبك في القائمة؟ سجل مواصفاتك وهيجيلك أفضل 3 عروض فوراً' : 'Can’t find your match? Post brief specs & get 3 curated deals'}
          </h3>
          <p className="express-lead-subtitle">
            {isAr 
              ? 'وفر وقت البحث الطويل: اكتب اللي بتدور عليه ورقمك ومستشار 1LINE المعتمد هيتواصل معاك بعروض حصرية قبل نزولها السوق.' 
              : 'Save search time: Drop your requirements & contact to receive verified off-market deals directly.'}
          </p>
        </div>

        {submitted ? (
          <div className="express-lead-success">
            <CheckCircle2 size={38} className="text-emerald animate-pop" />
            <div className="success-text">
              <h4>{isAr ? 'تم تسجيل طلبك بأعلى أولوية!' : 'Request Received with High Priority!'}</h4>
              <p>
                {isAr 
                  ? 'جاري فتح محادثة واتساب المباشرة مع مستشار المبيعات الآن لمتابعة طلبك...' 
                  : 'Opening direct WhatsApp consultation with our sales desk now...'}
              </p>
            </div>
            <button
              type="button"
              className="express-reset-btn"
              onClick={() => {
                setSubmitted(false);
                setRequirement('');
                setPhone('');
                setClientName('');
              }}
            >
              {isAr ? 'تسجيل طلب آخر ←' : 'Submit Another Request →'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="express-lead-form">
            {/* 🍯 Invisible Anti-Bot Honeypot */}
            <div style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none', height: 0, overflow: 'hidden' }} aria-hidden="true">
              <input
                type="text"
                name="express_bot_trap_hp"
                tabIndex="-1"
                autoComplete="off"
                value={hpField}
                onChange={(e) => setHpField(e.target.value)}
              />
            </div>

            <div className="express-inputs-grid">
              <div className="express-field-wrap">
                <input
                  type="text"
                  className="express-input"
                  placeholder={isAr ? 'طلبك إيه؟ (مثال: شقة بسوهاج الجديدة، محل تمليك بسيتي...)' : 'What are you looking for? (e.g. 3-bed in New Sohag...)'}
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  required
                />
              </div>

              <div className="express-field-wrap">
                <input
                  type="text"
                  className="express-input"
                  placeholder={isAr ? 'اسمك الكريم (اختياري)' : 'Your Name (Optional)'}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>

              <div className="express-field-wrap">
                <input
                  type="tel"
                  className="express-input phone-input"
                  placeholder={isAr ? 'رقم تليفونك المحمول (01xxxxxxxxx)' : 'Phone Number (01xxxxxxxxx)'}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                className="express-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span>{isAr ? 'جاري الإرسال...' : 'Sending...'}</span>
                ) : (
                  <>
                    <span>{isAr ? 'ابعتلي أفضل العروض' : 'Send Top Matches'}</span>
                    <Send size={16} />
                  </>
                )}
              </button>
            </div>

            <div className="express-trust-bar">
              <div className="trust-item">
                <ShieldCheck size={14} className="text-emerald" />
                <span>{isAr ? 'بياناتك في سرية تامة 100%' : '100% Confidential'}</span>
              </div>
              <div className="trust-item">
                <MessageSquare size={14} className="text-gold" />
                <span>{isAr ? 'تواصل فوري ومباشر عبر واتساب' : 'Direct WhatsApp Follow-up'}</span>
              </div>
              <div className="trust-item">
                <Phone size={14} className="text-blue" />
                <a href={getPhoneCallUrl()} className="trust-call-link">
                  {isAr ? 'أو اتصل مباشرة بالخط الساخن' : 'Or Call Hot-Line Directly'}
                </a>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
