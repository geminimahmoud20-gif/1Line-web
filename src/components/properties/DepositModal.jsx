import { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, DollarSign, Smartphone, Copy, Check, Sparkles, Send, FileDown, FileText } from 'lucide-react';
import { PhoneInputField } from '../PhoneInputField';
import { trackEvent } from '../../utils/visitorTracker';
import { generateReservationContractPdf } from '../../utils/contractPdfGenerator';

export default function DepositModal({ isOpen, onClose, property, lang = 'ar', triggerToast, onConfirmDeposit }) {
  const [copiedInsta, setCopiedInsta] = useState(false);
  const [copiedVoda, setCopiedVoda] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState('+20');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    nationalId: '',
    amount: 10000,
    paymentMethod: 'instapay',
    referenceNumber: ''
  });
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !property) return null;
  const isAr = lang === 'ar';
  const title = isAr ? property.title_ar : property.title_en;

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'instapay') {
      setCopiedInsta(true);
      setTimeout(() => setCopiedInsta(false), 2000);
    } else {
      setCopiedVoda(true);
      setTimeout(() => setCopiedVoda(false), 2000);
    }
    triggerToast(isAr ? 'تم نسخ المعرف بنجاح' : 'Copied successfully', 'success');
  };

  const handleDownloadContract = () => {
    try {
      generateReservationContractPdf({
        buyerName: form.name,
        buyerPhone: form.phone,
        buyerNationalId: form.nationalId || '29000000000000',
        property,
        depositAmount: form.amount,
        paymentMethod: form.paymentMethod === 'instapay' ? 'InstaPay (إنستاباي)' : 'Vodafone Cash (فودافون كاش)',
        transactionRef: form.referenceNumber
      });
      triggerToast(isAr ? 'تم تحميل استمارة وعقد الحجز الابتدائي بنجاح! 📄' : 'Contract downloaded successfully!', 'success');
      trackEvent('reservation_contract_downloaded', { propertyId: property.id });
    } catch (err) {
      console.error(err);
      triggerToast(isAr ? 'حدث خطأ أثناء إنشاء العقد' : 'Failed to generate contract', 'error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.referenceNumber) {
      triggerToast(isAr ? 'يرجى إدخال كافة بيانات التحويل ورقم العملية' : 'Please fill all details and reference number', 'error');
      return;
    }

    const fullPhone = form.phone.startsWith('+') ? form.phone : `${phoneCountry}${form.phone.replace(/^0+/, '')}`;

    if (onConfirmDeposit) {
      onConfirmDeposit({
        ...form,
        phone: fullPhone,
        propertyId: property.id,
        propertyTitle: title
      });
    }

    trackEvent('property_reserved_online', {
      propertyId: property.id,
      amount: form.amount,
      paymentMethod: form.paymentMethod
    });

    setSubmitted(true);
    triggerToast(isAr ? 'تم تسجيل طلب حجز وتثبيت العقار بنجاح!' : 'Deposit confirmation submitted!', 'success');
  };

  const whatsappReceiptMsg = encodeURIComponent(
    `مرحباً ون لاين، قمت بتحويل مقدم تثبيت وحجز لعقار (${property.id.toUpperCase()})\n` +
    `• الاسم: ${form.name}\n` +
    `• الهاتف: ${form.phone}\n` +
    `• الرقم القومي: ${form.nationalId || 'مرفق بالصورة'}\n` +
    `• طريقة الدفع: ${form.paymentMethod}\n` +
    `• رقم العملية المرجعي: ${form.referenceNumber}\n` +
    `مرفق صورة إيصال التحويل لتأكيد التثبيت.`
  );

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="deposit-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="deposit-modal-header">
          <div className="deposit-icon-glow">
            <DollarSign size={24} className="text-white" />
          </div>
          <div>
            <h3>{isAr ? 'تثبيت وحجز العقار مؤقتاً (24 ساعة)' : 'Hold & Reserve Property (24h)'}</h3>
            <p>{isAr ? `تثبيت كود العقار: ${property.id.toUpperCase()} لحين توقيع العقد الرسمي` : `Temporary reservation for code: ${property.id.toUpperCase()}`}</p>
          </div>
        </div>

        {submitted ? (
          <div className="deposit-success-view" style={{ textAlign: 'center', padding: '24px 16px' }}>
            <CheckCircle2 size={52} className="text-success" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>{isAr ? 'تم تأكيد طلب الحجز المبدئي بنجاح' : 'Reservation Request Logged'}</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '20px' }}>
              {isAr 
                ? `تم حجز العقار مؤقتاً باسم (${form.name}) برقم إيصال التحويل: ${form.referenceNumber}. يمكنك تحميل نسخة العقد الابتدائي فوراً أو إرسال الإيصال عبر الواتساب.`
                : 'Our contracts team will contact you to finalize the agreement.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 1-Click PDF Contract Download */}
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={handleDownloadContract}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--primary)' }}
              >
                <FileDown size={16} />
                <span>{isAr ? 'تحميل استمارة وعقد الحجز الابتدائي (PDF)' : 'Download Reservation Contract PDF'}</span>
              </button>

              <a
                href={`https://wa.me/201012345678?text=${whatsappReceiptMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-full"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--emerald)' }}
              >
                <Send size={15} />
                <span>{isAr ? 'إرسال صورة الإيصال عبر الواتساب فوراً' : 'Send Receipt on WhatsApp'}</span>
              </a>

              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {isAr ? 'إغلاق النافذة' : 'Close'}
              </button>
            </div>
          </div>
        ) : (
          <div className="deposit-modal-body">
            {/* Payment Details Box */}
            <div className="deposit-accounts-box">
              <span className="box-tag">{isAr ? 'حسابات الدفع الرسمية المعتمدة' : 'Official Payment Handles'}</span>

              {/* InstaPay */}
              <div className="payment-account-row">
                <div>
                  <strong>InstaPay (إنستاباي)</strong>
                  <span className="account-number">oneline.sohag@instapay</span>
                </div>
                <button
                  type="button"
                  className="btn-copy-mini"
                  onClick={() => handleCopy('oneline.sohag@instapay', 'instapay')}
                >
                  {copiedInsta ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedInsta ? (isAr ? 'تم' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                </button>
              </div>

              {/* Vodafone Cash */}
              <div className="payment-account-row">
                <div>
                  <strong>Vodafone Cash (فودافون كاش)</strong>
                  <span className="account-number">01012345678</span>
                </div>
                <button
                  type="button"
                  className="btn-copy-mini"
                  onClick={() => handleCopy('01012345678', 'voda')}
                >
                  {copiedVoda ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedVoda ? (isAr ? 'تم' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="deposit-form">
              <div className="form-group-item">
                <label>{isAr ? 'اسم الحاجز بالكامل *' : 'Full Name *'}</label>
                <input
                  type="text"
                  placeholder="محمد أحمد علي"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group-item">
                <label>{isAr ? 'الرقم القومي / جواز السفر (اختياري للتعاقد)' : 'National ID / Passport'}</label>
                <input
                  type="text"
                  placeholder="29001012600000"
                  value={form.nationalId}
                  onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                />
              </div>

              <div className="form-group-item">
                <PhoneInputField
                  phone={form.phone}
                  setPhone={(val) => setForm({ ...form, phone: val })}
                  country={phoneCountry}
                  setCountry={setPhoneCountry}
                  label={isAr ? 'رقم الهاتف المسجل للتحويل *' : 'Phone Number *'}
                  required={true}
                />
              </div>

              <div className="form-group-item">
                <label>{isAr ? 'رقم العملية / المرجع في إيصال التحويل *' : 'Transaction Reference / Receipt ID *'}</label>
                <input
                  type="text"
                  placeholder="مثال: REF-98745210"
                  value={form.referenceNumber}
                  onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full">
                <ShieldCheck size={16} />
                <span>{isAr ? 'تأكيد الحجز المبدئي رسمياً' : 'Confirm Official Reservation'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
