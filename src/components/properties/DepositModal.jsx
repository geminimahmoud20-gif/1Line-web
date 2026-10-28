import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ShieldCheck, RefreshCw, CalendarClock, AlertOctagon } from 'lucide-react';
import { PhoneInputField } from '../PhoneInputField';
import { trackEvent } from '../../utils/visitorTracker';
import { checkFormSpamProtection, isValidPhoneNumber } from '../../utils/securityShield';
import SubmissionSuccess from '../common/SubmissionSuccess';

/**
 * Reservation request (no online payment).
 * Availability and documents are confirmed first; the client then
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
  const isSubmittingRef = useRef(false);
  const nameRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => nameRef.current?.focus(), 60);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t); };
  }, [isOpen, onClose]);

  if (!isOpen || !property) return null;
  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;
  const code = String(property.id || '').toUpperCase();
  const isAlreadyBooked = ['reserved', 'deposit_paid', 'contracted', 'sold'].includes(property.status);

  const handleBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current || isProcessing) return;

    if (isAlreadyBooked) {
      triggerToast?.(isAr ? 'عذراً، هذه الوحدة لم تعد متاحة للحجز حالياً.' : 'This unit is no longer available.', 'error');
      return;
    }

    const spamCheck = checkFormSpamProtection(hpField, 'reservation_request');
    if (!spamCheck.allowed) {
      triggerToast?.(isAr ? 'يرجى المحاولة بعد قليل.' : 'Please try again shortly.', 'error');
      return;
    }
    const trimmedName = form.name.trim();
    const trimmedPhone = form.phone.trim();
    if (!trimmedName || !trimmedPhone) {
      triggerToast?.(isAr ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please enter your name and phone', 'error');
      return;
    }

    const fullPhone = trimmedPhone.startsWith('+') ? trimmedPhone : `${phoneCountry}${trimmedPhone.replace(/^0+/, '')}`;
    if (!isValidPhoneNumber(fullPhone)) {
      triggerToast?.(isAr ? 'رقم الهاتف غير صالح، يرجى كتابة رقم صحيح' : 'Invalid phone number format', 'error');
      return;
    }

    isSubmittingRef.current = true;
    setIsProcessing(true);
    try {
      const timeLabel = { any: 'أي وقت', morning: 'صباحاً', evening: 'مساءً' }[form.preferredTime];
      const lead = onConfirmDeposit
        ? await onConfirmDeposit({
          name: trimmedName,
          phone: fullPhone,
          whatsapp: fullPhone,
          type: 'reservation_request',
          source: 'طلب حجز مبدئي (صفحة العقار)',
          propertyType: property.type || 'residential',
          area: property.areaKey || '',
          propertyId: property.id,
          propertyTitle: title,
          propertyPrice: property.price,
          temperature: 'hot',
          notes: `طلب حجز مبدئي للعقار [${code}] — ${title} | وقت التواصل المفضل: ${timeLabel}${form.notes ? ' | ملاحظات: ' + form.notes : ''}`,
          details: { propertyId: property.id, preferredTime: form.preferredTime, notes: form.notes }
        })
        : null;

      trackEvent('reservation_requested', { propertyId: property.id });
      setSubmittedRef(lead?.id || `lead-${Date.now()}`);
    } catch (err) {
      console.error('Reservation request failed:', err);
      triggerToast?.(isAr
        ? 'تعذّر إرسال طلب الحجز. تأكد من الاتصال وحاول تاني، أو كلمنا على واتساب.'
        : 'Could not send the reservation request. Check your connection and try again, or message us on WhatsApp.', 'error');
    } finally {
      setIsProcessing(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div 
      className="track-modal-backdrop" 
      onMouseDown={handleBackdropMouseDown} 
      style={{ zIndex: 12000 }}
      role="presentation"
    >
      <div
        className="lx-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserve-title"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <button type="button" className="lx-modal-close" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>
          <X size={18} />
        </button>

        {isAlreadyBooked ? (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <AlertOctagon size={48} style={{ color: 'var(--crm-danger, #b91c1c)', margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: '8px' }}>{isAr ? 'الوحدة غير متاحة للحجز' : 'Unit Unavailable'}</h3>
            <p style={{ color: 'var(--crm-muted, #475569)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              {isAr 
                ? 'تم حجز هذه الوحدة أو بيعها مؤخراً. يمكنك استعراض وحدات مماثلة أو التواصل مع فريقنا لمساعدتك.'
                : 'This unit is already booked or sold. Please check our alternative listings.'}
            </p>
            <button type="button" className="lx-btn lx-btn-primary" onClick={onClose} style={{ marginTop: '16px' }}>
              {isAr ? 'تصفح وحدات أخرى' : 'Browse other properties'}
            </button>
          </div>
        ) : submittedRef ? (
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
            whatsappText={isAr ? `مرحباً 1Line، أرسلت طلب حجز مبدئي للعقار [${code}]` : `Hello 1Line, I requested a reservation for [${code}]`}
          />
        ) : (
          <>
            <header className="lx-modal-head">
              <span className="lx-modal-icon"><CalendarClock size={22} aria-hidden="true" /></span>
              <div>
                <h3 id="reserve-title">{isAr ? 'طلب حجز مبدئي' : 'Reservation request'}</h3>
                <p>
                  {isAr ? (
                    <>العقار <bdi dir="ltr">[{code}]</bdi> — {title}</>
                  ) : (
                    <><bdi dir="ltr">[{code}]</bdi> — {title}</>
                  )}
                </p>
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
                <span>{isAr ? 'الاسم بالكامل' : 'Full name'} *</span>
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
