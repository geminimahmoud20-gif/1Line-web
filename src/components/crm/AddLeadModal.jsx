import { useState } from 'react';
import { 
  UserPlus, 
  Phone, 
  MessageSquare, 
  Building, 
  DollarSign, 
  MapPin, 
  Tag, 
  ShieldCheck, 
  Sparkles, 
  X, 
  Save 
} from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { getAreas } from '../../utils/areasData';

export default function AddLeadModal({
  isOpen,
  onClose,
  onAddLead,
  lang = 'ar',
  triggerToast
}) {
  const isAr = lang === 'ar';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    altPhone: '',
    cityOrExpat: 'سوهاج',
    type: 'buyer',
    status: 'new',
    temperature: 'hot',
    score: 85,
    budget: '',
    area: 'east',
    propertyType: 'apartment',
    financing: 'cash',
    assignedTo: 'Sales Advisor Team',
    notes: '',
    tags: ['💎 VIP كاش', '🔥 مستعجل للشراء']
  });

  if (!isOpen) return null;

  const AVAILABLE_TAGS = [
    { id: 'vip', name_ar: '💎 VIP كاش', name_en: 'VIP Cash' },
    { id: 'expat', name_ar: '✈️ مغترب بالخليج', name_en: 'Gulf Expat' },
    { id: 'investor', name_ar: '📈 مستثمر تجاري', name_en: 'Commercial Investor' },
    { id: 'urgent', name_ar: '🔥 مستعجل للشراء', name_en: 'Urgent Buyer' },
    { id: 'installment', name_ar: '🏦 يفضل التقسيط', name_en: 'Installments Preferred' }
  ];

  const handleToggleTag = (tagText) => {
    const current = formData.tags || [];
    if (current.includes(tagText)) {
      setFormData({ ...formData, tags: current.filter(t => t !== tagText) });
    } else {
      setFormData({ ...formData, tags: [...current, tagText] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      if (triggerToast) triggerToast(isAr ? 'الرجاء إدخال اسم العميل ورقم الهاتف!' : 'Name and phone required!', 'error');
      return;
    }

    const leadPayload = {
      name: formData.name,
      phone: formData.phone,
      whatsapp: formData.whatsapp || formData.phone,
      altPhone: formData.altPhone,
      cityOrExpat: formData.cityOrExpat,
      type: formData.type,
      status: 'new',
      temperature: formData.temperature,
      score: parseInt(formData.score) || 85,
      assignedTo: formData.assignedTo,
      financing: formData.financing,
      tags: formData.tags,
      notes: formData.notes,
      source: 'Direct CRM Entry',
      details: {
        budget: formData.budget,
        expectedPrice: formData.budget,
        area: formData.area,
        propertyType: formData.propertyType
      }
    };

    if (onAddLead) {
      onAddLead(leadPayload);
    }

    if (triggerToast) {
      triggerToast(isAr ? `تم تسجيل العميل الجديد (${formData.name}) بنجاح! 👤` : 'Lead added successfully!', 'success');
    }

    onClose();
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '95%' }}>
        <div className="modal-form-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={22} className="text-gold" />
            <div>
              <h3 style={{ margin: 0 }}>
                {isAr ? 'إضافة عميل جديد يدوياً إلى قاعدة البيانات' : 'Register New Lead Manually'}
              </h3>
              <small style={{ color: 'var(--text-secondary)' }}>
                {isAr ? 'تسجيل بيانات العملاء القادمين عبر الاتصال المباشر أو زيارة المقر' : 'Add walk-in / direct call client to CRM'}
              </small>
            </div>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          <div className="cms-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
            {/* Name */}
            <div className="form-group-item">
              <label>{isAr ? 'اسم العميل بالكامل *' : 'Full Name *'}</label>
              <input
                type="text"
                required
                placeholder={isAr ? 'مثال: أ. أحمد عبد العال' : 'e.g. Ahmed Ali'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Primary Phone */}
            <div className="form-group-item">
              <label>{isAr ? 'رقم الهاتف الأساسي *' : 'Primary Phone *'}</label>
              <input
                type="text"
                required
                placeholder="010XXXXXXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            {/* WhatsApp */}
            <div className="form-group-item">
              <label>{isAr ? 'رقم الواتساب:' : 'WhatsApp:'}</label>
              <input
                type="text"
                placeholder="010XXXXXXXX"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              />
            </div>

            {/* City / Expat */}
            <div className="form-group-item">
              <label>{isAr ? 'محل الإقامة / الاغتراب:' : 'City / Expat Location:'}</label>
              <input
                type="text"
                placeholder="مثال: سوهاج / السعودية"
                value={formData.cityOrExpat}
                onChange={(e) => setFormData({ ...formData, cityOrExpat: e.target.value })}
              />
            </div>

            {/* Type */}
            <div className="form-group-item">
              <label>{isAr ? 'نوع العميل والطلب:' : 'Lead Type:'}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="buyer">👤 مشتري (Buyer)</option>
                <option value="seller">🏡 بائع / مالك (Seller)</option>
                <option value="investor">📈 مستثمر (Investor)</option>
                <option value="broker">🤝 وسيط عقاري (Broker)</option>
                <option value="request">⚡ طلب خاص (Special)</option>
              </select>
            </div>

            {/* Budget */}
            <div className="form-group-item">
              <label>{isAr ? 'الميزانية المالية المتوقعة (ج.م):' : 'Budget (EGP):'}</label>
              <input
                type="text"
                placeholder="مثال: 3,500,000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>

            {/* Area */}
            <div className="form-group-item">
              <label>{isAr ? 'المنطقة في سوهاج:' : 'Target Area:'}</label>
              <select
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              >
                {getAreas().filter(a => a.id !== 'all').map(a => (
                  <option key={a.id} value={a.id}>{isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}</option>
                ))}
              </select>
            </div>

            {/* Property Type */}
            <div className="form-group-item">
              <label>{isAr ? 'نوع العقار المطلوب:' : 'Property Type:'}</label>
              <select
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
              >
                {PROPERTY_TYPES.filter(t => t.id !== 'all').map(t => (
                  <option key={t.id} value={t.id}>{isAr ? t.name_ar : t.name_en}</option>
                ))}
              </select>
            </div>

            {/* Temperature */}
            <div className="form-group-item">
              <label>{isAr ? 'درجة حرارة الشراء:' : 'Temperature:'}</label>
              <select
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              >
                <option value="hot">🔥 ساخن جداً (Hot)</option>
                <option value="warm">⚡ دافئ (Warm)</option>
                <option value="cold">❄️ بارد (Cold)</option>
              </select>
            </div>

            {/* Assigned Agent */}
            <div className="form-group-item">
              <label>{isAr ? 'المستشار المسؤول:' : 'Assigned Agent:'}</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
              >
                <option value="Dr. Mahmoud Elbaz">Dr. Mahmoud Elbaz</option>
                <option value="Sales Team A">Sales Team A (شرق سوهاج والكوثر)</option>
                <option value="Sales Team B">Sales Team B (سوهاج الجديدة)</option>
                <option value="Sales Advisor Team">Sales Advisor Team</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginTop: '14px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
              🏷️ {isAr ? 'الوسوم وتصنيف العميل:' : 'Tags:'}
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {AVAILABLE_TAGS.map(tagObj => {
                const isSelected = (formData.tags || []).includes(tagObj.name_ar);
                return (
                  <button
                    key={tagObj.id}
                    type="button"
                    onClick={() => handleToggleTag(tagObj.name_ar)}
                    style={{
                      background: isSelected ? 'var(--accent-gold-light)' : 'rgba(255,255,255,0.04)',
                      color: isSelected ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-pill)',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {tagObj.name_ar}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Initial Notes */}
          <div className="form-group-item" style={{ marginTop: '14px' }}>
            <label>{isAr ? 'ملاحظات وتفاصيل طلب العميل:' : 'Initial Notes:'}</label>
            <textarea
              rows="3"
              className="form-input"
              style={{ width: '100%', resize: 'vertical' }}
              placeholder={isAr ? 'اكتب ملاحظات المكالمة وشروط العميل...' : 'Enter client requirements...'}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="cms-modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--gradient-gold)' }}>
              <Save size={16} />
              <span>{isAr ? 'تسجيل العميل وحفظه' : 'Save & Register Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
