import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, MessageSquare, X, Calendar, MapPin, Building, ShieldCheck, Phone } from 'lucide-react';
import { getWhatsAppUrl, getDynamicPhone } from '../../utils/founderCmsData';

export default function BookingConfirmationModal({
  isOpen,
  onClose,
  bookingData,
  property,
  lang = 'ar'
}) {
  const [copied, setCopied] = useState(false);
  if (!isOpen || !bookingData || !property) return null;

  const isAr = lang === 'ar';
  const dynamicPhone = getDynamicPhone();
  const title = isAr ? property.title_ar : property.title_en;
  const location = isAr ? property.locationName_ar : property.locationName_en;
  const serialCode = bookingData.serialCode || `1LINE-BK-${Math.floor(1000 + Math.random() * 9000)}`;

  const whatsAppText = isAr
    ? `*🏛️ تذكرة تأكيد حجز معاينة رسمية - منصة 1Line بسوهاج*
----------------------------------------
🎟️ *كود الحجز المرجعي:* ${serialCode}
👤 *اسم العميل:* ${bookingData.name}
📞 *رقم الهاتف:* ${bookingData.phone}
🏠 *العقار المطلوب معاينته:* ${title} (كود: #${property.id})
📍 *الموقع:* ${location}
💰 *السعر المعلن:* ${property.price?.toLocaleString()} ج.م
🗓️ *الموعد المقترح:* ${bookingData.date || 'أقرب موعد متاح'} (${bookingData.timeSlot === 'morning' ? 'صباحاً (10 ص - 2 ظ)' : 'مساءً (4 م - 9 م)'})
----------------------------------------
يرجى تأكيد اعتماد الموعد وتخصيص المستشار الميداني للمعاينة.`
    : `*🏛️ Official Property Viewing Booking Ticket - 1Line Sohag*
----------------------------------------
🎟️ *Booking Ref:* ${serialCode}
👤 *Client Name:* ${bookingData.name}
📞 *Phone:* ${bookingData.phone}
🏠 *Property:* ${title} (ID: #${property.id})
📍 *Location:* ${location}
💰 *Price:* ${property.price?.toLocaleString()} EGP
🗓️ *Preferred Time:* ${bookingData.date || 'Earliest slot'} (${bookingData.timeSlot === 'morning' ? 'Morning' : 'Evening'})
----------------------------------------
Please confirm my viewing appointment.`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(serialCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    window.open(getWhatsAppUrl(whatsAppText), '_blank');
  };

  return (
    <div className="modal-backdrop-luxury" onClick={onClose} role="dialog" aria-modal="true">
      <div className="booking-receipt-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close-receipt-btn" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>
          <X size={18} />
        </button>

        {/* Top Success Header */}
        <div className="receipt-success-icon-wrap">
          <div className="receipt-pulse-ring" />
          <CheckCircle2 size={40} className="receipt-check-icon" />
        </div>

        <h3 className="receipt-main-title">
          {isAr ? 'تم تسجيل وتوثيق حجز المعاينة بنجاح' : 'Viewing Booked Successfully'}
        </h3>
        <p className="receipt-subtitle">
          {isAr 
            ? 'تم إدراج طلبك ضمن جدول المعاينات الميدانية المعتمدة تحت إشراف مستشاري 1Line.' 
            : 'Your appointment is officially registered with 1Line advisory team.'}
        </p>

        {/* Official Serial Badge */}
        <div className="receipt-serial-badge-box">
          <span className="serial-label">{isAr ? 'كود التذكرة المرجعي:' : 'Booking Serial Ref:'}</span>
          <div className="serial-code-row">
            <strong className="serial-code-text">{serialCode}</strong>
            <button
              type="button"
              className="copy-serial-btn"
              onClick={handleCopyCode}
              title={isAr ? 'نسخ كود الحجز' : 'Copy Code'}
            >
              {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الكود' : 'Copy')}</span>
            </button>
          </div>
        </div>

        {/* Ticket Details Summary */}
        <div className="receipt-details-list">
          <div className="receipt-row">
            <span className="r-label"><Building size={14} /> {isAr ? 'العقار:' : 'Property:'}</span>
            <strong className="r-val">{title}</strong>
          </div>
          <div className="receipt-row">
            <span className="r-label"><MapPin size={14} /> {isAr ? 'الموقع:' : 'Location:'}</span>
            <span className="r-val">{location}</span>
          </div>
          {bookingData.date && (
            <div className="receipt-row">
              <span className="r-label"><Calendar size={14} /> {isAr ? 'الموعد المفضل:' : 'Slot:'}</span>
              <span className="r-val">
                {bookingData.date} ({bookingData.timeSlot === 'morning' ? (isAr ? 'صباحاً' : 'Morning') : (isAr ? 'مساءً' : 'Evening')})
              </span>
            </div>
          )}
          <div className="receipt-row">
            <span className="r-label"><ShieldCheck size={14} /> {isAr ? 'الضمان القانوني:' : 'Legal Guarantee:'}</span>
            <span className="r-val text-emerald">{isAr ? 'معاينة مجانية وفحص شامل للأوراق' : 'Free inspection & full title audit'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="receipt-actions-grid">
          <button
            type="button"
            className="btn-whatsapp-confirm"
            onClick={handleOpenWhatsApp}
          >
            <MessageSquare size={16} />
            <span>{isAr ? 'تأكيد الحجز فوراً عبر واتساب المستشار' : 'Instant WhatsApp Confirmation'}</span>
          </button>

          <a
            href={`tel:${dynamicPhone}`}
            className="btn-call-desk"
          >
            <Phone size={15} />
            <span>{isAr ? `اتصال مباشر بغرفة المعاينات (${dynamicPhone})` : `Call Desk (${dynamicPhone})`}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
