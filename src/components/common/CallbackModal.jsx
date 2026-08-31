import { useState } from 'react';
import { X, Phone, Sparkles } from 'lucide-react';

export default function CallbackModal({ isOpen, onClose, lang, onSubmitCallback, triggerToast }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    preferredTime: 'immediate'
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      triggerToast(lang === 'ar' ? 'يرجى إدخال الاسم ورقم الهاتف' : 'Please fill name and phone', 'error');
      return;
    }

    onSubmitCallback(form);
    onClose();
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="track-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="track-modal-header">
          <div className="track-icon-wrap"><Phone size={22} /></div>
          <h3>{lang === 'ar' ? 'طلب معاودة اتصال سريع' : 'Request a Fast Callback'}</h3>
          <p>{lang === 'ar' ? 'اترك بياناتك وسيتصل بك أحد مستشارينا في أقرب وقت يناسبك.' : 'Leave your info and our advisor will call you at your preferred time.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="booking-form-wrap">
          <div className="form-group-item">
            <label>{lang === 'ar' ? 'الاسم بالكامل' : 'Full Name'}</label>
            <input
              type="text"
              placeholder={lang === 'ar' ? 'اسمك الكريم' : 'Your name'}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group-item">
            <label>{lang === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
            <input
              type="tel"
              placeholder="01012345678"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>

          <div className="form-group-item">
            <label>{lang === 'ar' ? 'الوقت المفضل للاتصال' : 'Preferred Callback Time'}</label>
            <select
              value={form.preferredTime}
              onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
            >
              <option value="immediate">{lang === 'ar' ? 'اتصال فوري الآن' : 'Immediate / Right Now'}</option>
              <option value="morning">{lang === 'ar' ? 'صباحاً (10 ص - 1 م)' : 'Morning (10 AM - 1 PM)'}</option>
              <option value="evening">{lang === 'ar' ? 'مساءً (5 م - 9 م)' : 'Evening (5 PM - 9 PM)'}</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            <Sparkles size={16} />
            <span>{lang === 'ar' ? 'إرسال طلب الاتصال' : 'Send Callback Request'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
