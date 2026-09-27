import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Check, MessageSquare, X, Calendar, MapPin, Building, Video, Phone, Printer } from 'lucide-react';
import { getWhatsAppUrl, getDynamicPhone } from '../../utils/founderCmsData';

const SLOT_AR = { morning: 'صباحاً (10 ص – 2 م)', evening: 'مساءً (5 م – 9 م)' };
const SLOT_EN = { morning: 'Morning (10:00–14:00)', evening: 'Evening (17:00–21:00)' };

/**
 * Receipt for a viewing REQUEST. The team still has to confirm the appointment,
 * so nothing here says "booked" or "official".
 */
export default function BookingConfirmationModal({
  isOpen,
  onClose,
  bookingData,
  property,
  lang = 'ar'
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !bookingData || !property) return null;

  const isAr = lang === 'ar';
  const dynamicPhone = getDynamicPhone();
  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const ref = bookingData.serialCode || '';
  const slotKey = bookingData.slot || bookingData.timeSlot || 'evening';
  const slotLabel = (isAr ? SLOT_AR : SLOT_EN)[slotKey] || (isAr ? SLOT_AR.evening : SLOT_EN.evening);
  const isVideo = bookingData.tourType === 'video';
  const tourLabel = isVideo ? (isAr ? 'معاينة فيديو حية' : 'Live video viewing') : (isAr ? 'معاينة ميدانية بالموقع' : 'On-site viewing');

  const whatsAppText = isAr
    ? [
      '*طلب معاينة — 1Line*',
      ref ? `رقم الطلب: ${ref}` : null,
      `الاسم: ${bookingData.name}`,
      `الهاتف: ${bookingData.phone}`,
      `العقار: ${title} (كود #${String(property.id).toUpperCase()})`,
      `نوع المعاينة: ${tourLabel}`,
      `الموعد المفضل: ${bookingData.date || 'أقرب موعد متاح'} — ${slotLabel}`,
      'أرجو تأكيد الموعد والعنوان.'
    ].filter(Boolean).join('\n')
    : [
      '*Viewing request — 1Line*',
      ref ? `Request ref: ${ref}` : null,
      `Name: ${bookingData.name}`,
      `Phone: ${bookingData.phone}`,
      `Property: ${title} (ID #${String(property.id).toUpperCase()})`,
      `Viewing: ${tourLabel}`,
      `Preferred: ${bookingData.date || 'Earliest slot'} — ${slotLabel}`,
      'Please confirm the appointment.'
    ].filter(Boolean).join('\n');

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="modal-backdrop-luxury" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="booking-receipt-title">
      <div className="booking-receipt-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close-receipt-btn" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>
          <X size={18} />
        </button>

        <div className="receipt-success-icon-wrap">
          <div className="receipt-pulse-ring" />
          <CheckCircle2 size={40} className="receipt-check-icon" />
        </div>

        <h3 className="receipt-main-title" id="booking-receipt-title">
          {isAr ? 'استلمنا طلب المعاينة' : 'We received your viewing request'}
        </h3>
        <p className="receipt-subtitle">
          {isAr
            ? 'سيتواصل معك فريق المعاينات على واتساب لتأكيد الموعد والعنوان. الموعد لا يُعتبر مؤكداً قبل رسالة التأكيد.'
            : 'Our viewing team will contact you on WhatsApp to confirm the time and address. The appointment is not confirmed until you receive that message.'}
        </p>

        {ref && (
          <div className="receipt-serial-badge-box">
            <span className="serial-label">{isAr ? 'رقم الطلب المرجعي:' : 'Request reference:'}</span>
            <div className="serial-code-row">
              <strong className="serial-code-text" dir="ltr">{ref}</strong>
              <button type="button" className="copy-serial-btn" onClick={handleCopyCode} title={isAr ? 'نسخ رقم الطلب' : 'Copy reference'}>
                {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>
            </div>
          </div>
        )}

        <div className="receipt-details-list">
          <div className="receipt-row">
            <span className="r-label"><Building size={14} /> {isAr ? 'العقار:' : 'Property:'}</span>
            <strong className="r-val">{title}</strong>
          </div>
          <div className="receipt-row">
            <span className="r-label"><MapPin size={14} /> {isAr ? 'الموقع:' : 'Location:'}</span>
            <span className="r-val">{location}</span>
          </div>
          <div className="receipt-row">
            <span className="r-label">{isVideo ? <Video size={14} /> : <MapPin size={14} />} {isAr ? 'نوع المعاينة:' : 'Viewing:'}</span>
            <span className="r-val">{tourLabel}{!isVideo && (isAr ? ' — مجانية' : ' — free')}</span>
          </div>
          <div className="receipt-row">
            <span className="r-label"><Calendar size={14} /> {isAr ? 'الموعد المفضل:' : 'Preferred time:'}</span>
            <span className="r-val">{bookingData.date || (isAr ? 'أقرب موعد متاح' : 'Earliest slot')} — {slotLabel}</span>
          </div>
        </div>

        <div className="receipt-actions-grid">
          <button type="button" className="btn-whatsapp-confirm" onClick={() => window.open(getWhatsAppUrl(whatsAppText), '_blank', 'noopener')}>
            <MessageSquare size={16} />
            <span>{isAr ? 'أكّد الموعد مع المستشار على واتساب' : 'Confirm the time with an advisor on WhatsApp'}</span>
          </button>

          <div className="receipt-sub-actions-row">
            <button type="button" className="btn-print-ticket" onClick={() => window.print()} title={isAr ? 'طباعة أو حفظ الطلب كـ PDF' : 'Print or save as PDF'}>
              <Printer size={15} />
              <span>{isAr ? 'طباعة الطلب' : 'Print request'}</span>
            </button>
            <a href={`tel:${dynamicPhone}`} className="btn-call-desk">
              <Phone size={15} />
              <span>{isAr ? 'اتصال هاتفي' : 'Call us'} (<bdi>{dynamicPhone}</bdi>)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
