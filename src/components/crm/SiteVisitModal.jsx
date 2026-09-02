import { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Building, 
  Send, 
  Check, 
  X, 
  Navigation, 
  Car,
  MessageSquare,
  Sparkles
} from 'lucide-react';

export default function SiteVisitModal({
  isOpen,
  onClose,
  lead,
  properties = [],
  onScheduleVisit,
  lang = 'ar',
  triggerToast
}) {
  if (!isOpen || !lead) return null;

  const isAr = lang === 'ar';

  const defaultPropId = lead.details?.targetPropertyId || (properties.length > 0 ? properties[0].id : '');
  const [selectedPropertyId, setSelectedPropertyId] = useState(defaultPropId);
  const [visitDate, setVisitDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [visitTime, setVisitTime] = useState('16:00');
  const [agentName, setAgentName] = useState(lead.assignedTo || 'Dr. Mahmoud Elbaz');
  const [meetingLocation, setMeetingLocation] = useState('مقر شركة 1Line العقارية - شرق سوهاج');
  const [notes, setNotes] = useState('معاينة ميدانية للوحدة مع شرح الموقف القانوني');

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || properties[0] || {};

  const handleConfirmSchedule = (e) => {
    e.preventDefault();

    const visitDetails = {
      propertyId: selectedPropertyId,
      propertyTitle: isAr ? selectedProperty.title_ar : selectedProperty.title_en,
      propertyLocation: isAr ? selectedProperty.locationName_ar : selectedProperty.locationName_en,
      visitDate,
      visitTime,
      agentName,
      meetingLocation,
      notes,
      scheduledAt: new Date().toISOString()
    };

    if (onScheduleVisit) {
      onScheduleVisit(lead.id, visitDetails);
    }

    // Auto-generate WhatsApp confirmation message
    const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
    const propTitle = isAr ? selectedProperty.title_ar : selectedProperty.title_en;
    const propLoc = isAr ? selectedProperty.locationName_ar : selectedProperty.locationName_en;
    
    const waText = isAr
      ? `🏛️ *تأكيد موعد معاينة عقارية - شركة 1Line للحلول العقارية*\n\n` +
        `أهلاً أ. *${lead.name}*،\n` +
        `يسعدنا تأكيد موعد معاينتكم الميدانية للعقار:\n` +
        `🏢 *العقار:* ${propTitle}\n` +
        `📍 *الموقع:* ${propLoc}\n` +
        `📅 *التاريخ:* ${visitDate}\n` +
        `⏰ *الوقت:* ${visitTime}\n` +
        `🤝 *المستشار المرافق:* ${agentName}\n` +
        `📍 *نقطة التجمع:* ${meetingLocation}\n\n` +
        `📌 للتواصل المباشر مع المستشار المسؤول، نتمنى لكم تجربة موفقة.`
      : `🏛️ *Property Site Visit Confirmation - 1Line Real Estate*\n\n` +
        `Dear Mr/Ms *${lead.name}*,\n` +
        `We look forward to meeting you for the site viewing:\n` +
        `🏢 *Property:* ${propTitle}\n` +
        `📅 *Date:* ${visitDate} at ${visitTime}\n` +
        `🤝 *Accompanying Advisor:* ${agentName}`;

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`, '_blank');
    }

    if (triggerToast) {
      triggerToast(isAr ? 'تم حجز موعد المعاينة وإرسال اللوكيشن والتأكيد على واتساب العميل!' : 'Site visit scheduled and confirmed on WhatsApp!', 'success');
    }

    onClose();
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-form-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Car size={20} className="text-gold" />
            <h3 style={{ margin: 0 }}>
              {isAr ? `جدولة وتأكيد معاينة ميدانية: ${lead.name}` : `Schedule Site Visit: ${lead.name}`}
            </h3>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleConfirmSchedule} className="property-cms-form" style={{ padding: '20px' }}>
          {/* Client summary strip */}
          <div style={{
            background: 'rgba(255, 179, 0, 0.08)',
            border: '1px solid var(--accent-gold-light)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              <strong style={{ color: 'var(--accent-gold)', display: 'block' }}>{lead.name}</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{lead.phone}</span>
            </div>
            <span className="badge" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald)' }}>
              {isAr ? 'عميل مؤكد الجدية' : 'Verified Lead'} ({lead.score || 85}%)
            </span>
          </div>

          <div className="cms-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Property Select */}
            <div className="form-group-item" style={{ gridColumn: 'span 2' }}>
              <label>{isAr ? 'العقار المراد معاينته *' : 'Target Property *'}</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                required
                style={{ fontWeight: 'bold' }}
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {isAr ? p.title_ar : p.title_en} — {p.price?.toLocaleString()} ج.م ({p.areaKey})
                  </option>
                ))}
              </select>
            </div>

            {/* Visit Date */}
            <div className="form-group-item">
              <label>{isAr ? 'تاريخ المعاينة *' : 'Visit Date *'}</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
              />
            </div>

            {/* Visit Time */}
            <div className="form-group-item">
              <label>{isAr ? 'وقت المعاينة *' : 'Visit Time *'}</label>
              <input
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                required
              />
            </div>

            {/* Assigned Consultant */}
            <div className="form-group-item">
              <label>{isAr ? 'المستشار المرافق بالمعاينة' : 'Accompanying Advisor'}</label>
              <select
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              >
                <option value="Dr. Mahmoud Elbaz">Dr. Mahmoud Elbaz</option>
                <option value="Sales Team A - م/ أحمد عثمان">م/ أحمد عثمان (Sales A)</option>
                <option value="Sales Team B - أ/ كريم الشريف">أ/ كريم الشريف (Sales B)</option>
                <option value="Executive Management">Executive Management</option>
              </select>
            </div>

            {/* Meeting Point */}
            <div className="form-group-item">
              <label>{isAr ? 'نقطة التجمع / اللقاء' : 'Meeting Point'}</label>
              <input
                type="text"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                placeholder="مثال: مقر 1Line أو أمام العقار مباشرة"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group-item" style={{ marginTop: '14px' }}>
            <label>{isAr ? 'ملاحظات المعاينة والتنبيهات' : 'Inspection Notes'}</label>
            <textarea
              rows="2"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب أي شروط خاصة أو استفسارات طلبها العميل..."
            />
          </div>

          <div className="cms-modal-actions" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--gradient-gold)' }}>
              <Send size={16} />
              <span>{isAr ? 'تأكيد المعاينة وإرسال WhatsApp للعميل' : 'Confirm & Send WhatsApp'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
