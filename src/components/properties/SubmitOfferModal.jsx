import { useState } from 'react';
import {
  Tag,
  CheckCircle2,
  X,
  Send,
  MessageCircle,
  Building2,
  ShieldCheck,
  Scale,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { normalizeBookingPhone, phoneProblem, nameProblem } from '../../utils/contactValidation';
import { checkFormSpamProtection } from '../../utils/securityShield';
import { saveLead } from '../../firebaseLazy';

const money = (n) => (n ? Number(n).toLocaleString('en-US') : '0');

export default function SubmitOfferModal({
  isOpen = false,
  onClose,
  property,
  isAr = true,
  onSubmitOffer,
  triggerToast
}) {
  if (!isOpen || !property) return null;

  const L = (ar, en) => (isAr ? ar : en);
  const listPrice = Number(property.price) || 0;

  const [proposedPrice, setProposedPrice] = useState('');
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentPreference, setPaymentPreference] = useState('cash'); // 'cash' | 'installments' | 'financing'
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  // Quick discount calculation chips
  const quickDiscounts = [
    { pct: 5, label: L('خصم 5%', '-5% Discount'), price: Math.round(listPrice * 0.95) },
    { pct: 10, label: L('خصم 10%', '-10% Discount'), price: Math.round(listPrice * 0.90) },
    { pct: 15, label: L('خصم 15%', '-15% Discount'), price: Math.round(listPrice * 0.85) }
  ];

  const handleSelectDiscount = (discount) => {
    setSelectedDiscount(discount.pct);
    setProposedPrice(discount.price);
  };

  const handleCustomPriceChange = (val) => {
    setSelectedDiscount(null);
    setProposedPrice(val ? Number(val) : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr('');

    const spam = checkFormSpamProtection('', 'property_price_offer');
    if (!spam.allowed) {
      setErr(isAr ? spam.message_ar : spam.message_en);
      return;
    }

    const nErr = nameProblem(name, isAr);
    if (nErr) {
      setErr(nErr);
      return;
    }

    const fullPhone = normalizeBookingPhone(phone);
    const pErr = phoneProblem(fullPhone || phone, null, isAr);
    if (!fullPhone || pErr) {
      setErr(pErr || L('يرجى كتابة رقم هاتف صالح', 'Enter a valid phone number'));
      return;
    }

    const offerAmount = Number(proposedPrice);
    if (!offerAmount || offerAmount <= 0) {
      setErr(L('يرجى تحديد السعر المقترح', 'Please enter a proposed price'));
      return;
    }

    setBusy(true);
    try {
      const propTitle = isAr
        ? (property.title_ar || property.title_en || property.id)
        : (property.title_en || property.title_ar || property.id);

      const paymentLabelAr = {
        cash: 'دفع كاش فوري',
        installments: 'مقدم وتسهيلات على أقساط',
        financing: 'تمويل عقاري بنكي'
      }[paymentPreference] || paymentPreference;

      const record = {
        name: name.trim(),
        phone: fullPhone,
        whatsapp: fullPhone,
        propertyId: property.id,
        propertyTitle: propTitle,
        propertyPrice: listPrice,
        offeredPrice: offerAmount,
        area: property.areaKey || '',
        propertyType: property.type || 'residential',
        type: 'price_offer',
        source: 'عرض سعر تفاوضي (Modal)',
        notes: `عرض سعر تفاوضي على وحدة (${propTitle} - كود ${String(property.id).toUpperCase()}) | سعر المالك المعروض: ${money(listPrice)} ج.م | السعر المقترح من المشتري: ${money(offerAmount)} ج.م | طريقة الدفع: ${paymentLabelAr}${notes.trim() ? ` | ملاحظة: ${notes.trim()}` : ''}`,
        createdAt: new Date().toISOString()
      };

      if (typeof onSubmitOffer === 'function') {
        await onSubmitOffer(record);
      } else {
        await saveLead(record);
      }

      setSuccess(true);
      if (triggerToast) {
        triggerToast(
          isAr
            ? 'تم استلام عرض السعر المقترح بنجاح! سيتواصل معك مستشارنا للتفاوض مع المالك.'
            : 'Offer received! Our advisor will negotiate on your behalf.',
          'success'
        );
      }
    } catch {
      setErr(L('تعذر إرسال العرض حالياً، حاول مرة أخرى أو تواصل مباشرة عبر واتساب.', 'Could not submit offer now, please contact us on WhatsApp.'));
    } finally {
      setBusy(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = '201012345678'; // fallback agency number or advisor
    const propTitle = isAr
      ? (property.title_ar || property.title_en || property.id)
      : (property.title_en || property.title_ar || property.id);
    const msg = isAr
      ? `مرحباً 1Line، قدمت عرض سعر تفاوضي بقيمة ${money(proposedPrice)} ج.م على عقار كود (${String(property.id).toUpperCase()}: ${propTitle}) وأود المتابعة معكم.`
      : `Hello 1Line, I submitted a counter-offer of ${money(proposedPrice)} EGP on property (${String(property.id).toUpperCase()}).`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(11, 28, 54, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '1px solid #E2E8F0',
          position: 'relative',
          padding: '24px'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            inlineSize: '32px',
            blockSize: '32px',
            borderRadius: '50%',
            backgroundColor: '#F1F5F9',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748B',
            transition: 'all 0.15s ease',
            insetInlineEnd: '18px'
          }}
          aria-label={L('إغلاق', 'Close')}
        >
          <X size={18} />
        </button>

        {!success ? (
          <form onSubmit={handleSubmit} noValidate>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(212, 175, 55, 0.15)',
                color: '#D4AF37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Tag size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0B1C36' }}>
                  {L('قدّم عرض سعر تفاوضي', 'Submit a Counter-Offer')}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  {L('تفاوض رسمي وسري عبر مستشار وان لاين المعتمد', 'Official confidential negotiation via 1Line')}
                </span>
              </div>
            </div>

            {/* Property Summary Pill */}
            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              padding: '12px 14px',
              margin: '14px 0',
              border: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0B1C36' }}>
                  {isAr ? (property.title_ar || property.id) : (property.title_en || property.id)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  كود العقار: {String(property.id).toUpperCase()}
                </div>
              </div>
              <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', display: 'block' }}>
                  {L('سعر المالك المطلوب', 'Owner Asking Price')}
                </span>
                <strong style={{ fontSize: '1rem', color: '#0B1C36' }}>
                  {money(listPrice)} ج.م
                </strong>
              </div>
            </div>

            {/* Quick Discount Selection */}
            {listPrice > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {L('اختر نسبة الخصم المقترحة أو اكتب سعرك:', 'Select a discount or enter your price:')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {quickDiscounts.map((d) => (
                    <button
                      key={d.pct}
                      type="button"
                      onClick={() => handleSelectDiscount(d)}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        border: selectedDiscount === d.pct ? '2px solid #0B1C36' : '1px solid #CBD5E1',
                        backgroundColor: selectedDiscount === d.pct ? '#0B1C36' : '#FFFFFF',
                        color: selectedDiscount === d.pct ? '#D4AF37' : '#0B1C36',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{d.label}</div>
                      <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>{money(d.price)} ج.م</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Offer Price Input */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                {L('السعر المقترح من طرفك (ج.م) *', 'Your Proposed Price (EGP) *')}
              </label>
              <input
                type="number"
                min="10000"
                step="10000"
                dir="ltr"
                placeholder={L('مثال: 9,000,000', 'e.g. 9000000')}
                value={proposedPrice}
                onChange={(e) => handleCustomPriceChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: '#0B1C36',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>

            {/* Name and Phone Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {L('الاسم بالكامل *', 'Full Name *')}
                </label>
                <input
                  type="text"
                  maxLength={70}
                  placeholder={L('اسمك الكريم', 'Your name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    color: '#0B1C36',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  {L('رقم الواتساب / الهاتف *', 'WhatsApp / Phone *')}
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    color: '#0B1C36',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
            </div>

            {/* Payment Preference */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                {L('طريقة السداد المقترحة:', 'Preferred Payment:')}
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'cash', ar: 'كاش فوري (جاهز للتعاقد)', en: 'Immediate Cash' },
                  { id: 'installments', ar: 'مقدم وتسهيلات على أقساط', en: 'Installments' },
                  { id: 'financing', ar: 'تمويل عقاري بنكي', en: 'Mortgage' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentPreference(m.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: paymentPreference === m.id ? '2px solid #0B1C36' : '1px solid #CBD5E1',
                      backgroundColor: paymentPreference === m.id ? '#EFF6FF' : '#FFFFFF',
                      color: paymentPreference === m.id ? '#1D4ED8' : '#64748B',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? m.ar : m.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Note */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                {L('ملاحظة إضافية للمالك (اختياري)', 'Note for seller (optional)')}
              </label>
              <input
                type="text"
                maxLength={180}
                placeholder={L('مثال: متاح للتوقيع هذا الأسبوع، جاهز لدفع جدية الحجز...', 'e.g. Ready to sign this week...')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  color: '#0B1C36',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Error Message */}
            {err && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#991B1B',
                fontSize: '0.82rem',
                fontWeight: 700
              }}>
                <AlertCircle size={16} />
                <span>{err}</span>
              </div>
            )}

            {/* Advisory Note */}
            <div style={{
              fontSize: '0.75rem',
              color: '#64748B',
              backgroundColor: '#F8FAFC',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <ShieldCheck size={16} color="#059669" style={{ flexShrink: 0 }} />
              <span>
                {L('يقوم مستشار 1Line بنقل عرضك الرسمي للمالك والتفاوض نيابة عنك للوصول لأفضل سعر شراء ممكن.', 'Our advisor negotiates on your behalf with complete confidentiality.')}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={busy}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '10px',
                backgroundColor: '#0B1C36',
                color: '#D4AF37',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: busy ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={16} />
              <span>{busy ? L('جارٍ إرسال العرض...', 'Submitting...') : L('إرسال عرض السعر للمستشار للتفاوض 🤝', 'Submit Counter-Offer 🤝')}</span>
            </button>
          </form>
        ) : (
          /* Success Screen */
          <div style={{ textAlign: 'center', padding: '20px 10px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0B1C36', marginBottom: '8px' }}>
              {L('تم استلام عرضك المقترح بنجاح!', 'Your Counter-Offer Was Received!')}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.6, marginBottom: '20px' }}>
              {L(
                `تم تسجيل عرضك بقيمة (${money(proposedPrice)} ج.م) بنجاح. سيتواصل معك مستشار وان لاين للتنسيق وعرض المقترح على مالك العقار مباشرة.`,
                `Your offer of (${money(proposedPrice)} EGP) was recorded. Our advisor will reach out to coordinate with the seller.`
              )}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: '#25D366',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <MessageCircle size={18} />
                <span>{L('متابعة العرض فوراً عبر واتساب', 'Follow up via WhatsApp now')}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {L('إغلاق النافذة والعودة للعقار', 'Close and return to listing')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
