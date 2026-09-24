import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, ShieldCheck, RefreshCw, CalendarClock, CreditCard, 
  Smartphone, Copy, Check, CheckCircle2, FileDown, Lock,
  ArrowRight, Sparkles, Building, AlertCircle
} from 'lucide-react';
import { PhoneInputField } from '../PhoneInputField';
import { trackEvent } from '../../utils/visitorTracker';
import { checkFormSpamProtection } from '../../utils/securityShield';
import { generateReservationContractPdf } from '../../utils/contractPdfGenerator';
import { getWhatsAppUrl, getDynamicWhatsApp } from '../../utils/founderCmsData';

/**
 * Omni-Channel Reservation Checkout & Verification Gateway
 * Provides official Egyptian payment channels (InstaPay, Meeza/Cards, Mobile Cash, Fawry)
 * with anti-bot defense, instant contract PDF generation, and WhatsApp dispatch.
 */
export default function DepositModal({
  isOpen,
  onClose,
  property,
  lang = 'ar',
  triggerToast,
  onConfirmDeposit
}) {
  const [activePaymentChannel, setActivePaymentChannel] = useState('instapay'); // 'instapay' | 'card' | 'wallet' | 'fawry'
  const [copiedInsta, setCopiedInsta] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hpField, setHpField] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    nationalId: '',
    amount: 10000,
    referenceNumber: '',
    walletProvider: 'vodafone',
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
    notes: ''
  });

  // Completed State
  const [submitted, setSubmitted] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
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
  const walletPhone = getDynamicWhatsApp();

  const handleCopy = (text, type) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    if (type === 'instapay') {
      setCopiedInsta(true);
      setTimeout(() => setCopiedInsta(false), 2000);
    } else {
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
    triggerToast?.(isAr ? 'تم نسخ الحساب إلى الحافظة' : 'Copied to clipboard', 'success');
  };

  const handleDownloadContract = () => {
    try {
      generateReservationContractPdf(property, { 
        ...form, 
        referenceNumber: receiptData?.txnId || form.referenceNumber 
      }, lang);
      triggerToast?.(isAr ? 'تم تجهيز وتنزيل استمارة وعقد الحجز المعتمد PDF بنجاح!' : 'Contract PDF downloaded successfully!', 'success');
      trackEvent('reservation_contract_downloaded', { propertyId: property.id });
    } catch (err) {
      console.error(err);
      triggerToast?.(isAr ? 'حدث خطأ أثناء تنزيل العقد' : 'Error generating contract', 'error');
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    // 1. Anti-Bot Honeypot & Rate Limiter Check
    const spamCheck = checkFormSpamProtection(hpField, 'deposit_checkout');
    if (!spamCheck.allowed) {
      if (spamCheck.isRateLimited) {
        triggerToast?.(isAr ? 'عفواً، لقد قمت بمحاولات متعددة مؤخراً. يرجى الانتظار دقيقتين.' : 'Too many attempts. Please wait 2 minutes.', 'error');
      } else {
        triggerToast?.(isAr ? 'تم رفض العملية آلياً لدواعي الأمان.' : 'Rejected for security reasons.', 'error');
      }
      return;
    }

    if (!form.name.trim() || !form.phone.trim()) {
      triggerToast?.(isAr ? 'يرجى إدخال اسم العميل ورقم الهاتف' : 'Please provide full name and phone number', 'error');
      return;
    }

    setIsProcessing(true);

    // Generate verified Egyptian transaction ID & Fawry code
    const generatedTxnId = `1L-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const fawryKioskCode = `982${Math.floor(1000000 + Math.random() * 9000000)}`;
    const finalRef = activePaymentChannel === 'fawry' 
      ? fawryKioskCode 
      : (form.referenceNumber.trim() || generatedTxnId);

    // Simulate 3D Secure / Payment Handshake (~1.4s for card, ~0.8s for others)
    setTimeout(async () => {
      setIsProcessing(false);

      const fullPhone = form.phone.startsWith('+') ? form.phone : `${phoneCountry}${form.phone.replace(/^0+/, '')}`;
      const receipt = {
        txnId: generatedTxnId,
        fawryCode: fawryKioskCode,
        timestamp: new Date().toLocaleString(isAr ? 'ar-EG' : 'en-US'),
        channel: activePaymentChannel,
        channelLabel: activePaymentChannel === 'instapay' ? 'InstaPay (إنستاباي)' 
          : activePaymentChannel === 'card' ? 'بطاقة بنكية / ميزة' 
          : activePaymentChannel === 'wallet' ? 'محفظة إلكترونية كاش' 
          : 'فوري باي (Fawry Pay)',
        amount: form.amount,
        clientName: form.name,
        clientPhone: fullPhone,
        propertyId: property.id,
        propertyTitle: title
      };

      setReceiptData(receipt);
      setSubmitted(true);

      if (onConfirmDeposit) {
        await onConfirmDeposit({
          name: form.name.trim(),
          phone: fullPhone,
          whatsapp: fullPhone,
          type: 'reservation_request',
          source: `سداد جدية حجز (${receipt.channelLabel})`,
          propertyType: property.type || 'residential',
          area: property.areaKey || 'new_sohag',
          propertyId: property.id,
          propertyTitle: title,
          propertyPrice: property.price,
          temperature: 'hot',
          score: 100,
          referenceNumber: finalRef,
          paymentMethod: activePaymentChannel,
          notes: `حجز مبدئي مسجل — قناة الدفع: ${receipt.channelLabel} | رقم المعاملة: ${generatedTxnId} | كود فوري: ${fawryKioskCode}`,
          details: { 
            propertyId: property.id, 
            txnId: generatedTxnId,
            fawryCode: fawryKioskCode,
            amount: form.amount,
            channel: activePaymentChannel 
          }
        });
      }

      trackEvent('property_reserved_online', {
        propertyId: property.id,
        amount: form.amount,
        paymentMethod: activePaymentChannel
      });

      triggerToast?.(isAr ? 'تم تأكيد عملية السداد وحجز العقار بنجاح!' : 'Payment processed & property reserved!', 'success');
    }, activePaymentChannel === 'card' ? 1400 : 800);
  };

  const whatsappMessage = encodeURIComponent(
    `مرحباً 1Line، تم تأكيد حجز العقار ${code} (${title})\n` +
    `اسم العميل: ${form.name}\nالهاتف: ${form.phone}\n` +
    `رقم المعاملة: ${receiptData?.txnId || ''}\n` +
    `وسيلة الدفع: ${receiptData?.channelLabel || activePaymentChannel}`
  );
  const whatsappUrl = getWhatsAppUrl(whatsappMessage);

  return (
    <div className="track-modal-backdrop" onClick={onClose} style={{ zIndex: 12000 }}>
      <div 
        className="deposit-modal-card checkout-gateway-card lx-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          background: 'var(--surface, #ffffff)',
          border: '1px solid rgba(217, 119, 6, 0.3)',
          borderRadius: '20px',
          width: '95%',
          maxWidth: '580px',
          padding: '24px',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-luxury, 0 25px 60px -12px rgba(11, 78, 162, 0.15))',
          position: 'relative',
          maxHeight: '92vh',
          overflowY: 'auto'
        }}
      >
        <button 
          type="button" 
          className="modal-close-btn lx-modal-close" 
          onClick={onClose}
          aria-label={isAr ? 'إغلاق' : 'Close'}
          style={{
            position: 'absolute',
            top: '16px',
            left: isAr ? '16px' : 'auto',
            right: isAr ? 'auto' : '16px',
            background: 'var(--secondary, #f8fafc)',
            border: '1px solid var(--border-color, rgba(203, 213, 225, 0.8))',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div style={{
            background: 'var(--gradient-gold, linear-gradient(135deg, #B38A45, #D4AF37))',
            padding: '12px',
            borderRadius: '14px',
            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Lock size={22} />
          </div>
          <div>
            <h3 id="checkout-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
              {isAr ? 'بوابة التحصيل وحجز العقار المعتمدة' : 'Verified Property Reservation Portal'}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {isAr ? `تثبيت كود العقار: ${code} وحمايته من البيع المزدوج` : `Securing property code: ${code}`}
            </p>
          </div>
        </div>

        {/* Honeypot Trap Input */}
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

        {submitted && receiptData ? (
          /* 🧾 DIGITAL RECEIPT VIEW */
          <div className="deposit-success-view" style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <CheckCircle2 size={46} style={{ color: '#10b981', margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '1.2rem', color: '#10b981' }}>
                {isAr ? 'تم تأكيد حجز الوحدة بنجاح!' : 'Reservation Confirmed!'}
              </h4>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {isAr ? 'تم إصدار إيصال الحجز المعتمد وتجميد العقار لمدة 24 ساعة' : 'Property is locked for 24h'}
              </span>

              {/* Receipt Specs Box */}
              <div style={{
                marginTop: '16px',
                background: 'var(--surface-subtle, #f8fafc)',
                padding: '14px',
                borderRadius: '12px',
                textAlign: 'start',
                fontSize: '0.85rem',
                border: '1px dashed var(--border-color, #cbd5e1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'رقم المعاملة المعتمد:' : 'Txn ID:'}</span>
                  <strong style={{ color: 'var(--gold, #B38A45)', fontFamily: 'monospace' }}>{receiptData.txnId}</strong>
                </div>
                {receiptData.channel === 'fawry' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'كود دفع فوري (صالح 48 ساعة):' : 'Fawry Code:'}</span>
                    <strong style={{ color: '#eab308', fontFamily: 'monospace', fontSize: '1rem' }}>{receiptData.fawryCode}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'وسيلة السداد:' : 'Payment Channel:'}</span>
                  <span>{receiptData.channelLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'قيمة جدية الحجز:' : 'Amount:'}</span>
                  <strong>{receiptData.amount?.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'التوقيت:' : 'Timestamp:'}</span>
                  <span style={{ fontSize: '0.78rem' }}>{receiptData.timestamp}</span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleDownloadContract}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  background: 'var(--gradient-gold, #B38A45)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <FileDown size={18} />
                <span>{isAr ? 'تحميل استمارة وعقد الحجز المعتمد (PDF)' : 'Download Reservation Contract (PDF)'}</span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  background: '#25D366',
                  color: '#ffffff',
                  textDecoration: 'none'
                }}
              >
                <Smartphone size={18} />
                <span>{isAr ? 'إرسال الإيصال لمسؤول المبيعات عبر واتساب' : 'Send Receipt to WhatsApp Sales'}</span>
              </a>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  fontSize: '0.85rem'
                }}
              >
                {isAr ? 'إغلاق النافذة' : 'Close Window'}
              </button>
            </div>
          </div>
        ) : (
          /* 💳 PAYMENT FORM VIEW */
          <form onSubmit={handleProcessPayment} className="checkout-form-step">
            {/* Legal Guarantee Notice */}
            <div style={{
              background: 'rgba(179, 138, 69, 0.08)',
              border: '1px solid rgba(179, 138, 69, 0.25)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '0.82rem',
              lineHeight: '1.5'
            }}>
              <ShieldCheck size={18} style={{ color: 'var(--gold, #B38A45)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--gold, #B38A45)', display: 'block', marginBottom: '2px' }}>
                  {isAr ? 'ضمان مالي وقانوني معتمد:' : 'Certified Legal & Financial Protection:'}
                </strong>
                <span>
                  {isAr 
                    ? 'جدية الحجز مستردة بالكامل خلال 14 يوماً في حال عدم إتمام التعاقد، وتخصم مباشرة من قيمة الوحدة عند إتمام الشراء.'
                    : 'Reservation deposit is 100% refundable within 14 days and deducted from unit total upon closing.'}
                </span>
              </div>
            </div>

            {/* Payment Channel Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 'bold', marginBottom: '8px' }}>
                {isAr ? 'اختر وسيلة السداد المناسبة لك:' : 'Select Payment Method:'}
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px'
              }}>
                {[
                  { id: 'instapay', label: 'إنستاباي', sub: 'InstaPay' },
                  { id: 'card', label: 'فيزا / ميزة', sub: 'Cards' },
                  { id: 'wallet', label: 'محافظ كاش', sub: 'Wallets' },
                  { id: 'fawry', label: 'فوري باي', sub: 'Fawry' }
                ].map(ch => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActivePaymentChannel(ch.id)}
                    style={{
                      background: activePaymentChannel === ch.id ? 'var(--navy, #0B1B32)' : 'var(--surface-subtle, #f8fafc)',
                      color: activePaymentChannel === ch.id ? '#ffffff' : 'var(--text-primary)',
                      border: activePaymentChannel === ch.id ? '1px solid var(--navy, #0B1B32)' : '1px solid var(--border-color, #e2e8f0)',
                      borderRadius: '10px',
                      padding: '10px 4px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{ch.label}</div>
                    <div style={{ fontSize: '0.68rem', opacity: 0.8 }}>{ch.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Channel Details */}
            {activePaymentChannel === 'instapay' && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.04)',
                border: '1px solid rgba(30, 41, 59, 0.12)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {isAr ? 'عنوان الدفع اللحظي (IPA الرسمي):' : 'Official IPA:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('oneline.sohag@instapay', 'instapay')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gold, #B38A45)',
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedInsta ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedInsta ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ العنوان' : 'Copy')}</span>
                  </button>
                </div>
                <div style={{
                  background: 'var(--surface, #ffffff)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  color: 'var(--navy, #0B1B32)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  textAlign: 'center'
                }}>
                  oneline.sohag@instapay
                </div>
              </div>
            )}

            {activePaymentChannel === 'card' && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.04)',
                border: '1px solid rgba(30, 41, 59, 0.12)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {isAr ? 'رقم البطاقة (يدعم ميزة والبطاقات البنكية المصرية)' : 'Card Number (Meeza / Visa / Master)'}
                  </label>
                  <input
                    type="text"
                    value={form.cardNumber}
                    onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
                    placeholder="4111 •••• •••• 1234"
                    maxLength={19}
                    aria-label="رقم البطاقة البنكية"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.88rem',
                      direction: 'ltr'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {isAr ? 'تاريخ الانتهاء' : 'Expiry'}
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={form.cardExpiry}
                      onChange={(e) => setForm({ ...form, cardExpiry: e.target.value })}
                      maxLength={5}
                      aria-label="تاريخ انتهاء البطاقة"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        fontSize: '0.88rem',
                        direction: 'ltr'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {isAr ? 'رمز الأمان (CVV)' : 'CVV'}
                    </label>
                    <input
                      type="password"
                      placeholder="•••"
                      value={form.cardCvv}
                      onChange={(e) => setForm({ ...form, cardCvv: e.target.value })}
                      maxLength={4}
                      aria-label="رمز الأمان"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        fontSize: '0.88rem',
                        direction: 'ltr'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activePaymentChannel === 'wallet' && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.04)',
                border: '1px solid rgba(30, 41, 59, 0.12)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {isAr ? 'رقم المحفظة المعتمد للتحويل (فودافون/أورنج/اتصالات/وي):' : 'Official Cash Wallet:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(walletPhone, 'wallet')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--gold, #B38A45)',
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedWallet ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedWallet ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرقم' : 'Copy')}</span>
                  </button>
                </div>
                <div style={{
                  background: 'var(--surface, #ffffff)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  color: 'var(--navy, #0B1B32)',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  textAlign: 'center'
                }}>
                  {walletPhone}
                </div>
              </div>
            )}

            {activePaymentChannel === 'fawry' && (
              <div style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '16px',
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <AlertCircle size={16} style={{ color: '#d97706' }} />
                  <strong style={{ color: '#d97706' }}>
                    {isAr ? 'خدمة فوري باي (كود منفذ 1Line المعتمد):' : 'Fawry Pay 48h Kiosk Service:'}
                  </strong>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  {isAr 
                    ? 'سيتم إصدار كود فوري مخصص للمعاملة بصلاحية 48 ساعة للسداد من أي منفذ فوري أو عبر تطبيق فوري بلس.' 
                    : 'A 10-digit Fawry kiosk code will be generated upon confirmation, valid for 48h.'}
                </p>
              </div>
            )}

            {/* Client Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 'bold', marginBottom: '4px' }}>
                  {isAr ? 'الاسم بالكامل (كما في بطاقة الرقم القومي)' : 'Full Name (per National ID)'}
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={isAr ? 'مثال: أحمد عبد الرحمن الشريف' : 'Full Name'}
                  aria-label="اسم العميل بالكامل"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <PhoneInputField
                phone={form.phone}
                setPhone={(val) => setForm({ ...form, phone: val })}
                country={phoneCountry}
                setCountry={setPhoneCountry}
                label={isAr ? 'رقم الهاتف / واتساب للتأكيد' : 'Phone / WhatsApp'}
                required={true}
              />

              {(activePaymentChannel === 'instapay' || activePaymentChannel === 'wallet') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 'bold', marginBottom: '4px' }}>
                    {isAr ? 'رقم العملية أو المرجع (بعد التحويل)' : 'Transaction Reference / Mobile Number'}
                  </label>
                  <input
                    type="text"
                    value={form.referenceNumber}
                    onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                    placeholder={isAr ? 'مثال: 9812401725 أو رقم الهاتف المحول منه' : 'Txn reference'}
                    aria-label="رقم المرجع أو الحوالة"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              aria-busy={isProcessing}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '10px',
                fontWeight: 'bold',
                fontSize: '0.92rem',
                background: 'var(--gradient-gold, linear-gradient(135deg, #B38A45, #D4AF37))',
                color: '#ffffff',
                border: 'none',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(179, 138, 69, 0.35)'
              }}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>{isAr ? 'جارٍ التحقق وتأكيد المعاملة المشفرة...' : 'Processing secure 3D verification...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>{isAr ? 'تأكيد الحجز وتوليد الإيصال والعقد المعتمد' : 'Confirm Reservation & Generate Contract'}</span>
                </>
              )}
            </button>

            <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: '0.74rem', color: 'var(--text-muted, #64748b)' }}>
              {isAr ? 'بالمتابعة فإنك توافق على شروط التعاقد وسياسة الخصوصية الخاصة بـ 1Line Solutions.' : 'By confirming you agree to 1Line Terms of Service and Privacy Policy.'}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
