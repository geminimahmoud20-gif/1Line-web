import { useState } from 'react';
import { 
  Send, 
  Car,
  X,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { leadScore } from '../../utils/crmLeadViews';
import { getGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendarHelper';
import { CONTACT } from '../../config/siteConfig';

export default function SiteVisitModal({
  isOpen,
  onClose,
  lead,
  properties = [],
  onScheduleVisit,
  lang = 'ar',
  triggerToast
}) {
  const defaultPropId = lead?.details?.targetPropertyId || (properties.length > 0 ? properties[0].id : '');
  const [selectedPropertyId, setSelectedPropertyId] = useState(defaultPropId);
  const [visitDate, setVisitDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [visitTime, setVisitTime] = useState('16:00');
  // The person who goes with the client: typed in (it is sent to the client), not picked from sample names
  const [agentName, setAgentName] = useState('');
  const [meetingLocation, setMeetingLocation] = useState(`مقر الشركة: ${CONTACT.address_ar}`);
  const [notes, setNotes] = useState('معاينة ميدانية للوحدة مع شرح الموقف القانوني');

  if (!isOpen || !lead) return null;

  const isAr = lang === 'ar';

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
      window.open(`https://wa.me/${formatWhatsAppPhone(cleanPhone)}?text=${encodeURIComponent(waText)}`, '_blank');
    }

    if (triggerToast) {
      triggerToast(isAr ? 'تم حجز موعد المعاينة وإرسال اللوكيشن والتأكيد على واتساب العميل!' : 'Site visit scheduled and confirmed on WhatsApp!', 'success');
    }

    onClose();
  };

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', background: 'var(--crm-card)', border: '1px solid var(--crm-line)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div className="modal-form-header" style={{ borderBottom: '1px solid var(--crm-line)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Car size={20} style={{ color: 'var(--crm-accent-text)' }} />
            <h3 style={{ margin: 0, color: 'var(--crm-ink)', fontSize: 'var(--crm-text-lg)', fontWeight: 700 }}>
              {isAr ? `جدولة وتأكيد معاينة ميدانية: ${lead.name}` : `Schedule Site Visit: ${lead.name}`}
            </h3>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose} aria-label="Close" style={{ color: 'var(--crm-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleConfirmSchedule} className="property-cms-form" style={{ padding: '20px' }}>
          {/* Client summary strip */}
          <div style={{
            background: 'var(--crm-warn-soft)',
            border: '1px solid var(--crm-warn-line)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              <strong style={{ color: 'var(--crm-ink)', display: 'block', fontSize: 'var(--crm-text-md)' }}>{lead.name}</strong>
              <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>{lead.phone}</span>
            </div>
            <span className="badge" style={{ background: 'var(--crm-positive-soft)', color: 'var(--crm-positive)', border: '1px solid var(--crm-positive-line)', fontWeight: 'bold' }}>
              {isAr ? 'درجة الاهتمام' : 'Lead score'} ({leadScore(lead).score}%)
            </span>
          </div>

          <div className="cms-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Property Select */}
            <div className="form-group-item" style={{ gridColumn: 'span 2' }}>
              <label style={{ color: 'var(--crm-body)', fontWeight: 'bold', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'العقار المراد معاينته *' : 'Target Property *'}</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                required
                style={{ fontWeight: 'bold', background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {isAr ? p.title_ar : p.title_en} — {p.price?.toLocaleString('en-US')} ج.م
                  </option>
                ))}
              </select>
            </div>

            {/* Visit Date */}
            <div className="form-group-item">
              <label style={{ color: 'var(--crm-body)', fontWeight: 'bold', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'تاريخ المعاينة *' : 'Visit Date *'}</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                style={{ background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
              />
            </div>

            {/* Visit Time */}
            <div className="form-group-item">
              <label style={{ color: 'var(--crm-body)', fontWeight: 'bold', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'وقت المعاينة *' : 'Visit Time *'}</label>
              <input
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                required
                style={{ background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
              />
            </div>

            {/* Assigned Consultant */}
            <div className="form-group-item">
              <label style={{ color: 'var(--crm-body)', fontWeight: 'bold', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'المستشار المرافق بالمعاينة *' : 'Accompanying Advisor *'}</label>
              <input
                type="text"
                required
                maxLength={60}
                value={agentName}
                placeholder={isAr ? 'اسم الموظف اللي هيحضر مع العميل' : 'Name of the staff member attending'}
                onChange={(e) => setAgentName(e.target.value)}
                style={{ background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
              />
            </div>

            {/* Meeting Point */}
            <div className="form-group-item">
              <label style={{ color: 'var(--crm-body)', fontWeight: 'bold', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'نقطة التجمع / اللقاء' : 'Meeting Point'}</label>
              <input
                type="text"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                placeholder="مثال: مقر 1Line أو أمام العقار مباشرة"
                style={{ background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group-item" style={{ marginTop: '14px' }}>
            <label style={{ color: 'var(--crm-body)', fontWeight: 'bold', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'ملاحظات المعاينة والتنبيهات' : 'Inspection Notes'}</label>
            <textarea
              rows="2"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب أي شروط خاصة أو استفسارات طلبها العميل..."
              style={{ background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
            />
          </div>

          <div className="cms-modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                style={{ fontSize: 'var(--crm-text-xs)', borderRadius: '6px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  if (!visitDate) return;
                  const startDt = new Date(`${visitDate}T${visitTime || '16:00'}`);
                  const propTitle = selectedProperty ? (isAr ? selectedProperty.title_ar : selectedProperty.title_en) : (isAr ? 'عقار 1Line' : '1Line Property');
                  downloadIcsFile({
                    title: `معاينة: ${propTitle} (${lead.name})`,
                    description: `معاينة ميدانية مع العميل: ${lead.name}\nالهاتف: ${lead.phone || lead.whatsapp}\nالمستشار: ${agentName}\nنقطة اللقاء: ${meetingLocation}\nملاحظات: ${notes}`,
                    location: meetingLocation || 'سوهاج',
                    start: startDt,
                    filename: `viewing-${lead.name}-${visitDate}.ics`
                  });
                  if (triggerToast) triggerToast(isAr ? 'تم تنزيل موعد المعاينة لتقويم الهاتف' : 'Viewing downloaded to calendar (.ics)', 'success');
                }}
                title={isAr ? 'تنزيل موعد المعاينة لتقويم الهاتف (Apple / Android)' : 'Download .ics calendar event'}
              >
                <Calendar size={14} />
                <span>{isAr ? 'حفظ بالتقويم (.ICS)' : 'Save (.ICS)'}</span>
              </button>

              <a
                href={getGoogleCalendarUrl({
                  title: `معاينة: ${selectedProperty ? (isAr ? selectedProperty.title_ar : selectedProperty.title_en) : 'عقار 1Line'} (${lead?.name})`,
                  description: `معاينة مع العميل ${lead?.name} - هاتف: ${lead?.phone || lead?.whatsapp}\nالمستشار: ${agentName}\nنقطة اللقاء: ${meetingLocation}`,
                  location: meetingLocation || 'سوهاج',
                  start: new Date(`${visitDate}T${visitTime || '16:00'}`)
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline"
                style={{ fontSize: 'var(--crm-text-xs)', borderRadius: '6px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                title={isAr ? 'فتح في تقويم Google' : 'Open Google Calendar'}
              >
                <ExternalLink size={13} />
                <span>{isAr ? 'تقويم Google' : 'Google Cal'}</span>
              </a>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={onClose} style={{ background: 'var(--crm-subtle)', border: '1px solid var(--crm-line-strong)', color: 'var(--crm-body)' }}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" className="btn btn-primary" style={{ background: 'var(--crm-brand-navy)', color: 'var(--crm-on-dark)', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
                <Send size={16} />
                <span>{isAr ? 'تأكيد وإرسال WhatsApp للعميل' : 'Confirm & Send WhatsApp'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
