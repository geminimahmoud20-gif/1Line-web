import { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, DollarSign, Smartphone, Copy, Check, Sparkles } from 'lucide-react';

export default function DepositModal({ isOpen, onClose, property, lang = 'ar', triggerToast, onConfirmDeposit }) {
  const [copiedInsta, setCopiedInsta] = useState(false);
  const [copiedVoda, setCopiedVoda] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.referenceNumber) {
      triggerToast(isAr ? 'يرجى إدخال كافة بيانات التحويل ورقم العملية' : 'Please fill all details and reference number', 'error');
      return;
    }

    if (onConfirmDeposit) {
      onConfirmDeposit({
        ...form,
        propertyId: property.id,
        propertyTitle: title
      });
    }

    setSubmitted(true);
    triggerToast(isAr ? 'تم تسجيل طلب حجز وتثبيت العقار بنجاح!' : 'Deposit confirmation submitted!', 'success');
  };

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
          <div className="deposit-success-view">
            <CheckCircle2 size={48} className="text-success" />
            <h4>{isAr ? 'تم تأكيد طلب الحجز المبدئي بنجاح' : 'Reservation Request Logged'}</h4>
            <p>
              {isAr 
                ? `تم حجز العقار مؤقتاً باسم (${form.name}) برقم إيصال التحويل: ${form.referenceNumber}. سيتواصل معك قسم العقود فوراً لتحديد موعد إبرام العقد وتسليم الإيصال الرسمي.`
                : 'Our contracts team will contact you to finalize the agreement.'}
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {isAr ? 'تم، إغلاق' : 'Done'}
            </button>
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
                <label>{isAr ? 'رقم الهاتف المسجل للتحويل *' : 'Phone Number *'}</label>
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
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
