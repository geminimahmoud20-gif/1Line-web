import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ShieldCheck, RefreshCw, CalendarClock } from 'lucide-react';
import { PhoneInputField } from '../PhoneInputField';
import { trackEvent } from '../../utils/visitorTracker';
import { checkFormSpamProtection } from '../../utils/securityShield';
import SubmissionSuccess from '../common/SubmissionSuccess';

/**
 * Reservation request (no online payment).
 * DO NOT reintroduce simulated payment channels here: the site has no payment gateway, so card
 * fields, generated Fawry codes or "confirmed" receipts would mislead customers into paying for
 * units that were never reserved. Availability and documents are confirmed first; the client then
 * receives an official reservation letter with payment terms.
 */
export default function DepositModal({
  isOpen,
  onClose,
  property,
  lang = 'ar',
  triggerToast,
  onConfirmDeposit
}) {
  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hpField, setHpField] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', preferredTime: 'any', notes: '' });
  const [submittedRef, setSubmittedRef] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => nameRef.current?.focus(), 50);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [isOpen, onClose]);

  if (!isOpen || !property) return null;
  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;
  const code = String(property.id).toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    const spamCheck = checkFormSpamProtection(hpField, 'reservation_request');
    if (!spamCheck.allowed) {
      triggerToast?.(isAr ? 'يرجى المحاولة بعد قليل.' : 'Please try again shortly.', 'error');
      return;
    }
    if (!form.name.trim() || !form.phone.trim()) {
      triggerToast?.(isAr ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please enter your name and phone', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const fullPhone = form.phone.startsWith('+') ? form.phone : `${phoneCountry}${form.phone.replace(/^0+/, '')}`;
      const timeLabel = { any: 'أي وقت', morning: 'صباحاً', evening: 'مساءً' }[form.preferredTime];
      const lead = onConfirmDeposit
        ? await onConfirmDeposit({
          name: form.name.trim(),
          phone: fullPhone,
          whatsapp: fullPhone,
          type: 'reservation_request',
          source: 'طلب حجز مبدئي (صفحة العقار)',
          propertyType: property.type || 'residential',
          area: property.areaKey || 'new_sohag',
          propertyId: property.id,
          propertyTitle: title,
          propertyPrice: property.price,
          temperature: 'hot',
          score: 95,
          notes: `طلب حجز مبدئي للعقار ${code} — ${title} | وقت التواصل المفضل: ${timeLabel}${form.notes ? ' | ملاحظات: ' + form.notes : ''}`,
          details: { propertyId: property.id, preferredTime: form.preferredTime, notes: form.notes }
        })
        : null;

      trackEvent('reservation_requested', { propertyId: property.id });
      setSubmittedRef(lead?.id || `lead-${Date.now()}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose} style={{ zIndex: 12000 }}>
      <div
        className="lx-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserve-title"
        dir={isAr ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="lx-modal-close" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>
          <X size={18} />
        </button>

        {submittedRef ? (
          <SubmissionSuccess
            lang={lang}
            reference={submittedRef}
            title_ar="استلمنا طلب الحجز المبدئي"
            title_en="Reservation request received"
            steps={[
              { ar: 'يتصل بك مستشارك لتأكيد إتاحة الوحدة وموعد المعاينة.', en: 'Your advisor calls to confirm availability and a viewing.' },
              { ar: 'نراجع معك مستندات الملكية والترخيص قبل أي التزام مالي.', en: 'We review ownership and permit documents with you before any payment.' },
              { ar: 'عند الاتفاق تستلم خطاب حجز رسمياً يحدد المبلغ والحساب وشروط الاسترداد.', en: 'Once agreed, you receive an official reservation letter with amount, account and refund terms.' },
            ]}
            whatsappText={isAr ? `مرحباً 1Line، أرسلت طلب حجز مبدئي للعقار ${code}` : `Hello 1Line, I requested a reservation for ${code}`}
          />
        ) : (
          <>
            <header className="lx-modal-head">
              <span className="lx-modal-icon"><CalendarClock size={22} aria-hidden="true" /></span>
              <div>
                <h3 id="reserve-title">{isAr ? 'طلب حجز مبدئي' : 'Reservation request'}</h3>
                <p>{isAr ? `العقار ${code} — ${title}` : `${code} — ${title}`}</p>
              </div>
            </header>

            <div className="lx-callout">
              <ShieldCheck size={18} aria-hidden="true" />
              <p>
                {isAr
                  ? 'لا تحوّل أي مبلغ الآن. نؤكد الإتاحة ونراجع المستندات أولاً، ثم نرسل لك خطاب حجز رسمياً قبل سداد أي جدية حجز.'
                  : "Don't transfer anything now. We confirm availability and review documents first, then send an official reservation letter before any deposit."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="lx-form">
              <input
                type="text"
                name="user_checkout_ref_hp"
                value={hpField}
                onChange={(e) => setHpField(e.target.value)}
                tabIndex="-1"
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none', height: 0 }}
              />

              <label className="lx-field">
                <span>{isAr ? 'الاسم بالكامل' : 'Full name'}</span>
                <input
                  ref={nameRef}
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>

              <PhoneInputField
                phone={form.phone}
                setPhone={(val) => setForm({ ...form, phone: val })}
                country={phoneCountry}
                setCountry={setPhoneCountry}
                label={isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}
                required={true}
              />

              <fieldset className="lx-field">
                <legend>{isAr ? 'أفضل وقت للاتصال' : 'Best time to call'}</legend>
                <div className="lx-segmented">
                  {[
                    ['any', isAr ? 'أي وقت' : 'Any time'],
                    ['morning', isAr ? 'صباحاً' : 'Morning'],
                    ['evening', isAr ? 'مساءً' : 'Evening'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      aria-pressed={form.preferredTime === val}
                      className={form.preferredTime === val ? 'is-active' : ''}
                      onClick={() => setForm({ ...form, preferredTime: val })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="lx-field">
                <span>{isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</span>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>

              <button type="submit" className="lx-btn lx-btn-primary lx-btn-block" disabled={isProcessing} aria-busy={isProcessing}>
                {isProcessing ? <RefreshCw size={17} className="animate-spin" /> : <ShieldCheck size={18} />}
                {isProcessing ? (isAr ? 'جارٍ الإرسال…' : 'Sending…') : (isAr ? 'أرسل طلب الحجز' : 'Send reservation request')}
              </button>

              <p className="lx-form-note">
                {isAr ? 'بإرسال الطلب توافق على تواصلنا معك بخصوصه وفق ' : 'By submitting you agree to be contacted about it under our '}
                <Link to="/privacy" onClick={onClose}>{isAr ? 'سياسة الخصوصية' : 'privacy policy'}</Link>.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
