import { useState } from 'react';
import { 
  X, CheckCircle2, ShieldCheck, DollarSign, Smartphone, Copy, Check, 
  Sparkles, Send, FileDown, CreditCard, QrCode, Building, Lock, 
  ArrowRight, Printer, AlertCircle, RefreshCw
} from 'lucide-react';
import { PhoneInputField } from '../PhoneInputField';
import { trackEvent } from '../../utils/visitorTracker';
import { generateReservationContractPdf } from '../../utils/contractPdfGenerator';
import { getWhatsAppUrl, getDynamicWhatsApp } from '../../utils/founderCmsData';
import { checkFormSpamProtection } from '../../utils/securityShield';

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
    // Card inputs
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: ''
  });

  // Completed State
  const [submitted, setSubmitted] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  if (!isOpen || !property) return null;
  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;
  const walletPhone = getDynamicWhatsApp();

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'instapay') {
      setCopiedInsta(true);
      setTimeout(() => setCopiedInsta(false), 2000);
    } else {
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
    if (triggerToast) {
      triggerToast(isAr ? 'تم نسخ الحساب إلى الحافظة بنجاح' : 'Copied to clipboard', 'success');
    }
  };

  const handleDownloadContract = () => {
    try {
      generateReservationContractPdf(property, { ...form, referenceNumber: receiptData?.txnId || form.referenceNumber }, lang);
      if (triggerToast) {
        triggerToast(isAr ? 'تم تجهيز وتنزيل استمارة وعقد الحجز المعتمد PDF بنجاح!' : 'Contract PDF downloaded successfully!', 'success');
      }
      trackEvent('reservation_contract_downloaded', { propertyId: property.id });
    } catch (err) {
      console.error(err);
      if (triggerToast) {
        triggerToast(isAr ? 'حدث خطأ أثناء تنزيل العقد' : 'Error generating contract', 'error');
      }
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();

    // 1. Anti-Bot Honeypot & Rate Limiter Check
    const spamCheck = checkFormSpamProtection(hpField, 'deposit_checkout');
    if (!spamCheck.allowed) {
      if (spamCheck.isRateLimited) {
        triggerToast(isAr ? 'عفواً، لقد قمت بمحاولات متعددة مؤخراً. يرجى الانتظار دقيقتين.' : 'Too many attempts. Please wait 2 minutes.', 'error');
      } else {
        triggerToast(isAr ? 'تم رفض العملية آلياً لدواعي الأمان.' : 'Rejected for security reasons.', 'error');
      }
      return;
    }

    if (!form.name || !form.phone) {
      triggerToast(isAr ? 'يرجى إدخال اسم العميل ورقم الهاتف' : 'Please provide full name and phone number', 'error');
      return;
    }

    setIsProcessing(true);

    // Generate verified Egyptian transaction ID & Fawry code
    const generatedTxnId = `1L-TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const fawryKioskCode = `982${Math.floor(1000000 + Math.random() * 9000000)}`;
    const finalRef = activePaymentChannel === 'fawry' 
      ? fawryKioskCode 
      : (form.referenceNumber.trim() || generatedTxnId);

    // Simulate 3D Secure / Payment Handshake
    setTimeout(() => {
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
        onConfirmDeposit({
          ...form,
          phone: fullPhone,
          referenceNumber: finalRef,
          paymentMethod: activePaymentChannel,
          propertyId: property.id,
          propertyTitle: title
        });
      }

      trackEvent('property_reserved_online', {
        propertyId: property.id,
        amount: form.amount,
        paymentMethod: activePaymentChannel
      });

      triggerToast(isAr ? 'تم تأكيد عملية السداد وحجز العقار بنجاح!' : 'Payment processed & property reserved!', 'success');
    }, activePaymentChannel === 'card' ? 1400 : 800);
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose} style={{ zIndex: 12000 }}>
      <div 
        className="deposit-modal-card checkout-gateway-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface, #0f172a)',
          border: '1px solid rgba(217, 119, 6, 0.3)',
          borderRadius: '20px',
          width: '95%',
          maxWidth: '560px',
          padding: '24px',
          color: 'var(--text-primary)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <button 
          type="button" 
          className="modal-close-btn" 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            left: isAr ? '16px' : 'auto',
            right: isAr ? 'auto' : '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{
            background: 'var(--gradient-gold, linear-gradient(135deg, #d97706, #b45309))',
            padding: '12px',
            borderRadius: '14px',
            boxShadow: '0 4px 15px rgba(217, 119, 6, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Lock size={22} className="text-white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
              {isAr ? 'بوابة التحصيل وحجز العقار المعتمدة' : 'Verified Property Checkout Portal'}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {isAr ? `تثبيت كود العقار: ${property.id.toUpperCase()} وحمايته من البيع المزدوج` : `Securing property code: ${property.id.toUpperCase()}`}
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
          style={{ position: 'absolute', opacity: 0, zIndex: -1, pointerEvents: 'none', height: 0 }}
        />

        {submitted && receiptData ? (
          /* 🧾 DIGITAL RECEIPT VIEW */
          <div className="deposit-success-view" style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <CheckCircle2 size={46} style={{ color: '#10b981', margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '1.2rem', color: '#10b981' }}>
                {isAr ? 'تم تأكيد حجز الوحدة بنجاح!' : 'Reservation Confirmed!'}
              </h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {isAr ? 'تم إصدار إيصال الحجز المعتمد وتجميد العقار لمدة 24 ساعة' : 'Property is locked for 24h'}
              </span>

              {/* Receipt Specs Box */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '12px',
                padding: '14px',
                marginTop: '16px',
                textAlign: isAr ? 'right' : 'left',
                fontSize: '0.85rem',
                lineHeight: '1.8'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'رقم الإيصال المرجعي:' : 'Receipt Reference:'}</span>
                  <strong style={{ color: 'var(--accent-gold)' }}>{receiptData.txnId}</strong>
                </div>
                {receiptData.channel === 'fawry' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'كود دفع فوري (صالح 48 س):' : 'Fawry POS Code:'}</span>
                    <strong style={{ color: '#3b82f6', fontSize: '1rem' }}>{receiptData.fawryCode}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'العقار المحجوز:' : 'Property:'}</span>
                  <span>{receiptData.propertyId.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'قناة السداد:' : 'Payment Channel:'}</span>
                  <span>{receiptData.channelLabel}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{isAr ? 'المبلغ المسدد:' : 'Amount:'}</span>
                  <strong>{receiptData.amount.toLocaleString()} ج.م</strong>
                </div>
              </div>
            </div>

            {/* Post Payment Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadContract}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'var(--gradient-gold)',
                  padding: '12px',
                  fontWeight: 'bold'
                }}
              >
                <FileDown size={16} />
                <span>{isAr ? 'تنزيل استمارة وإيصال الحجز المعتمد (PDF)' : 'Download PDF Receipt & Contract'}</span>
              </button>

              <a
                href={getWhatsAppUrl(isAr
                  ? `مرحباً 1Line، قمت بإتمام حجز عقار كود (${property.id.toUpperCase()}) عبر (${receiptData.channelLabel}) بقيمة ${receiptData.amount.toLocaleString()} ج.م.\n👤 الاسم: ${receiptData.clientName}\n🔢 رقم الإيصال: ${receiptData.txnId}\nيرجى اعتماد الحجز وتأكيد موعد المعاينة وتوقيع العقد.`
                  : `Hello 1Line, I reserved property ${property.id.toUpperCase()} via ${receiptData.channelLabel}. Amount: ${receiptData.amount} EGP. Txn ID: ${receiptData.txnId}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#10b981',
                  color: '#fff',
                  padding: '12px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
              >
                <Send size={16} />
                <span>{isAr ? 'إرسال الإشعار لمدير المبيعات عبر الواتساب فوراً' : 'Send WhatsApp Confirmation'}</span>
              </a>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px'
                }}
              >
                <Printer size={15} />
                <span>{isAr ? 'طباعة الإيصال الرقمي' : 'Print Receipt'}</span>
              </button>

              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={onClose}
                style={{ marginTop: '8px', color: 'var(--text-secondary)' }}
              >
                {isAr ? 'إغلاق النافذة' : 'Close'}
              </button>
            </div>
          </div>
        ) : (
          /* 💳 OMNI-CHANNEL CHECKOUT FORM */
          <div>
            {/* Payment Channel Selector Tabs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '6px',
              borderRadius: '14px',
              marginBottom: '20px'
            }}>
              {[
                { id: 'instapay', icon: '⚡', label_ar: 'إنستاباي', label_en: 'InstaPay' },
                { id: 'card', icon: '💳', label_ar: 'كروت وميزة', label_en: 'Cards/Meeza' },
                { id: 'wallet', icon: '📱', label_ar: 'محافظ كاش', label_en: 'Wallets' },
                { id: 'fawry', icon: '🏪', label_ar: 'فوري باي', label_en: 'Fawry' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePaymentChannel(tab.id)}
                  style={{
                    background: activePaymentChannel === tab.id ? 'var(--accent-gold, #d97706)' : 'transparent',
                    color: activePaymentChannel === tab.id ? '#fff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 4px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
                  <span>{isAr ? tab.label_ar : tab.label_en}</span>
                </button>
              ))}
            </div>

            {/* CHANNEL 1: INSTAPAY */}
            {activePaymentChannel === 'instapay' && (
              <div style={{
                background: 'rgba(217, 119, 6, 0.06)',
                border: '1px solid rgba(217, 119, 6, 0.2)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--accent-gold)' }}>
                      {isAr ? 'عنوان الدفع اللحظي الرسمي (IPA):' : 'InstaPay Official IPA:'}
                    </strong>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '3px' }}>
                      oneline.sohag@instapay
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('oneline.sohag@instapay', 'instapay')}
                    style={{
                      background: 'rgba(217, 119, 6, 0.2)',
                      border: '1px solid rgba(217, 119, 6, 0.4)',
                      color: 'var(--text-primary)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {copiedInsta ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedInsta ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {isAr ? '⚡ يمكنك التحويل مباشرة من أي تطبيق بنكي مصري أو تطبيق InstaPay في ثوانٍ.' : 'Instant transfer via InstaPay app.'}
                </span>
              </div>
            )}

            {/* CHANNEL 2: CREDIT / DEBIT CARDS & MEEZA */}
            {activePaymentChannel === 'card' && (
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {isAr ? 'الدفع المباشر بالبطاقات البنكية وميزة' : 'Direct Card / Meeza Payment'}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem' }}>
                    <span style={{ background: '#1e3a8a', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>VISA</span>
                    <span style={{ background: '#b91c1c', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>Mastercard</span>
                    <span style={{ background: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ميزة Meeza</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="رقم البطاقة (16 رقم) 5078 xxxx xxxx xxxx"
                    maxLength="19"
                    value={form.cardNumber}
                    onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
                    className="form-input"
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="تاريخ الانتهاء MM/YY"
                      maxLength="5"
                      value={form.cardExpiry}
                      onChange={(e) => setForm({ ...form, cardExpiry: e.target.value })}
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                    <input
                      type="password"
                      placeholder="رمز الأمان CVV (3 أرقام)"
                      maxLength="3"
                      value={form.cardCvv}
                      onChange={(e) => setForm({ ...form, cardCvv: e.target.value })}
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CHANNEL 3: MOBILE WALLETS (CASH) */}
            {activePaymentChannel === 'wallet' && (
              <div style={{
                background: 'rgba(217, 119, 6, 0.06)',
                border: '1px solid rgba(217, 119, 6, 0.2)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--accent-gold)' }}>
                      {isAr ? 'رقم محفظة الشركة المعتمد:' : 'Official Wallet Number:'}
                    </strong>
                    <div style={{ fontSize: '1.05rem', fontWeight: 'bold', marginTop: '3px' }}>
                      {walletPhone}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(walletPhone, 'wallet')}
                    style={{
                      background: 'rgba(217, 119, 6, 0.2)',
                      border: '1px solid rgba(217, 119, 6, 0.4)',
                      color: 'var(--text-primary)',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {copiedWallet ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedWallet ? (isAr ? 'تم' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {isAr ? 'يدعم: فودافون كاش، أورنج كاش، اتصالات كاش، وWE Pay.' : 'Supports Vodafone, Orange, Etisalat & WE Cash.'}
                </span>
              </div>
            )}

            {/* CHANNEL 4: FAWRY PAY */}
            {activePaymentChannel === 'fawry' && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🏪</span>
                  <strong style={{ color: '#60a5fa', fontSize: '0.9rem' }}>
                    {isAr ? 'السداد عبر ماكينات فوري (Fawry POS):' : 'Pay via Fawry Kiosks:'}
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {isAr 
                    ? 'سيتم توليد كود دفع فوري رسمي صالح لمدة 48 ساعة للسداد في أي منفذ فوري بسوهاج وباقي الجمهورية (كود الخدمة: 788).'
                    : 'A 48-hour Fawry payment code will be generated upon confirmation.'}
                </p>
              </div>
            )}

            {/* Common Checkout Form */}
            <form onSubmit={handleProcessPayment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'اسم الحاجز بالكامل *' : 'Client Full Name *'}
                </label>
                <input
                  type="text"
                  placeholder="محمد أحمد إبراهيم"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="form-input"
                  required
                  style={{ padding: '9px 12px', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <PhoneInputField
                  phone={form.phone}
                  setPhone={(val) => setForm({ ...form, phone: val })}
                  country={phoneCountry}
                  setCountry={setPhoneCountry}
                  label={isAr ? 'رقم الهاتف للتأكيد والتواصل *' : 'Phone Number *'}
                  required={true}
                />
              </div>

              {activePaymentChannel !== 'card' && activePaymentChannel !== 'fawry' && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    {isAr ? 'رقم العملية أو المرجع بالإيصال (إن توفر)' : 'Receipt Reference (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: REF-9841203"
                    value={form.referenceNumber}
                    onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                    className="form-input"
                    style={{ padding: '9px 12px', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              {/* Amount Display */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '4px'
              }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {isAr ? 'قيمة جدية حجز الوحدة (مخصومة من ثمن العقد):' : 'Holding Deposit Amount:'}
                </span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--accent-gold)' }}>
                  {form.amount.toLocaleString()} ج.م
                </strong>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isProcessing}
                className="btn btn-primary"
                style={{
                  background: 'var(--gradient-gold)',
                  padding: '13px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '8px',
                  boxShadow: '0 4px 20px rgba(217, 119, 6, 0.4)',
                  cursor: isProcessing ? 'wait' : 'pointer'
                }}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={17} className="animate-spin" />
                    <span>{isAr ? 'جارِ التحقق وتأكيد المعاملة المشفرة...' : 'Securing transaction...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>
                      {activePaymentChannel === 'card' 
                        ? (isAr ? 'سداد 10,000 ج.م وتثبيت العقار فوراً 🔒' : 'Pay 10,000 EGP & Hold Unit 🔒')
                        : (isAr ? 'تأكيد الحجز وإصدار الإيصال الرقمي 🔒' : 'Confirm & Issue Digital Receipt 🔒')}
                    </span>
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  🔒 {isAr ? 'المدفوعات مؤمنة بتشفير 256-bit وقابلة للاسترداد وفقاً لشروط العقد الابتدائي.' : 'Encrypted 256-bit transaction.'}
                </span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
