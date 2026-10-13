import { Phone, MessageSquare, Calendar, Send, Building, Sparkles, Image, Download, ExternalLink } from 'lucide-react';
import { getGoogleCalendarUrl, downloadIcsFile } from '../../../utils/calendarHelper';

export default function LeadDrawerOverview({
  lead,
  egWhatsapp,
  handleLogCall,
  handleScheduleViewing,
  isAr,
  onConvertToProperty,
  properties = [],
  selectedViewingPropId,
  setSelectedViewingPropId,
  setShowViewingForm,
  setViewingDateTime,
  showViewingForm,
  viewingDateTime,
  whatsappTemplates
}) {
  const details = lead?.details || {};
  const isSeller = lead?.type === 'seller' || lead?.landingPage === '/sell' || Boolean(details.askingPrice) || Boolean(details.propertyType && details.size);
  const scheduledTime = lead?.nextFollowUpAt || details.visitDate;
  const viewingProp = properties.find(p => p.id === (lead?.viewingPropertyId || details.propertyId));

  const handleDownloadCalendar = () => {
    if (!scheduledTime) return;
    const propTitle = viewingProp ? (isAr ? viewingProp.title_ar : viewingProp.title_en) : (isAr ? 'عقار 1Line' : '1Line Property');
    downloadIcsFile({
      title: `معاينة: ${propTitle} (${lead.name})`,
      description: `معاينة ميدانية مع العميل: ${lead.name}\nالهاتف: ${lead.phone || lead.whatsapp}\nكود العقار: ${viewingProp?.id || '—'}\nملاحظات: ${lead.notes || '—'}`,
      location: lead.area || 'سوهاج',
      start: new Date(scheduledTime),
      filename: `viewing-${lead.name || 'client'}.ics`
    });
  };

  const googleCalUrl = scheduledTime ? getGoogleCalendarUrl({
    title: `معاينة عقار 1Line: ${lead?.name || ''}`,
    description: `معاينة مع العميل ${lead?.name || ''} - هاتف: ${lead?.phone || lead?.whatsapp || ''}`,
    location: lead?.area || 'سوهاج',
    start: new Date(scheduledTime)
  }) : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 0. Seller Unit Specs & 1-Click Conversion Card (Only for Seller Leads) */}
      {isSeller && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)',
          border: '1.5px solid rgba(217, 119, 6, 0.35)',
          borderRadius: '14px',
          padding: '16px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={16} style={{ color: 'var(--crm-accent-text)' }} />
              <strong style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-ink)' }}>
                {isAr ? '🏠 تفاصيل عقار عرض البيع من المالك:' : '🏠 Seller Property Specs:'}
              </strong>
            </div>
            <span className="badge" style={{ background: 'var(--crm-accent)', color: 'var(--crm-card)', fontSize: 'var(--crm-text-xs)', padding: '2px 8px', borderRadius: '12px' }}>
              {isAr ? 'عرض بيع مباشر' : 'Direct Listing'}
            </span>
          </div>

          {/* Specs Chips Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            {details.size && (
              <div style={{ background: 'var(--crm-card)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--crm-line)', fontSize: 'var(--crm-text-xs)' }}>
                <span style={{ color: 'var(--crm-muted)', display: 'block' }}>{isAr ? 'المساحة:' : 'Size:'}</span>
                <strong style={{ color: 'var(--crm-ink)' }}>{details.size} م²</strong>
              </div>
            )}
            {(details.askingPrice || details.estimatedAvg) && (
              <div style={{ background: 'var(--crm-card)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--crm-line)', fontSize: 'var(--crm-text-xs)' }}>
                <span style={{ color: 'var(--crm-muted)', display: 'block' }}>{details.askingPrice ? (isAr ? 'السعر المطلوب:' : 'Asking Price:') : (isAr ? 'التقدير الآلي:' : 'Estimate:')}</span>
                <strong style={{ color: 'var(--crm-accent-text)' }}>
                  {Number(details.askingPrice || details.estimatedAvg).toLocaleString('en-US')} ج.م
                </strong>
              </div>
            )}
            {details.rooms && (
              <div style={{ background: 'var(--crm-card)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--crm-line)', fontSize: 'var(--crm-text-xs)' }}>
                <span style={{ color: 'var(--crm-muted)', display: 'block' }}>{isAr ? 'الغرف / التقسيم:' : 'Rooms:'}</span>
                <strong style={{ color: 'var(--crm-ink)' }}>{details.rooms}</strong>
              </div>
            )}
            {details.floor && (
              <div style={{ background: 'var(--crm-card)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--crm-line)', fontSize: 'var(--crm-text-xs)' }}>
                <span style={{ color: 'var(--crm-muted)', display: 'block' }}>{isAr ? 'الدور / الطابق:' : 'Floor:'}</span>
                <strong style={{ color: 'var(--crm-ink)' }}>{details.floor === 'ground' ? (isAr ? 'أرضي' : 'Ground') : details.floor}</strong>
              </div>
            )}
            {details.finishingLabelAr && (
              <div style={{ background: 'var(--crm-card)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--crm-line)', fontSize: 'var(--crm-text-xs)' }}>
                <span style={{ color: 'var(--crm-muted)', display: 'block' }}>{isAr ? 'التشطيب:' : 'Finishing:'}</span>
                <strong style={{ color: 'var(--crm-ink)' }}>{details.finishingLabelAr}</strong>
              </div>
            )}
            {details.legalSummaryAr && (
              <div style={{ background: 'var(--crm-card)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--crm-line)', fontSize: 'var(--crm-text-xs)' }}>
                <span style={{ color: 'var(--crm-muted)', display: 'block' }}>{isAr ? 'المستندات:' : 'Legal Docs:'}</span>
                <strong style={{ color: 'var(--crm-ink)' }}>{details.legalSummaryAr}</strong>
              </div>
            )}
          </div>

          {/* Uploaded Photos Thumbnails Strip */}
          {Array.isArray(details.images) && details.images.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginBottom: '6px' }}>
                <Image size={13} />
                <span>{isAr ? `صور مرفوعة من المالك (${details.images.length} صور):` : `Owner Photos (${details.images.length}):`}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {details.images.slice(0, 5).map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt="Seller upload"
                    style={{ width: '56px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--crm-line)' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* One-Click Convert to Listing Action Button */}
          {onConvertToProperty && (
            <button
              type="button"
              onClick={() => onConvertToProperty(lead)}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: 'var(--crm-text-sm)',
                fontWeight: 700,
                background: 'var(--crm-accent)',
                color: 'var(--crm-card)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.25)'
              }}
            >
              <Sparkles size={16} />
              <span>{isAr ? '✨ اعتماد ونقل المواصفات لمسودة عقار بالمعرض' : 'Convert to Property Listing Draft'}</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Scheduled Viewing & Mobile Calendar Sync (If appointment exists) */}
      {scheduledTime && (
        <div style={{
          background: 'rgba(14, 165, 233, 0.08)',
          border: '1px solid rgba(14, 165, 233, 0.25)',
          borderRadius: '12px',
          padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--crm-info)' }}>
              <Calendar size={16} />
              <strong style={{ fontSize: 'var(--crm-text-sm)' }}>
                {isAr ? '📅 موعد المعاينة المجدول:' : '📅 Scheduled Viewing:'}
              </strong>
            </div>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 'bold', color: 'var(--crm-ink)' }}>
              {new Date(scheduledTime).toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button
              type="button"
              onClick={handleDownloadCalendar}
              className="btn btn-sm btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--crm-text-xs)',
                borderRadius: '6px',
                padding: '5px 10px',
                background: 'var(--crm-card)',
                color: 'var(--crm-ink)'
              }}
              title={isAr ? 'تنزيل ملف .ics لحفظ الموعد في تقويم الموبايل (Apple / Android)' : 'Download ICS calendar file'}
            >
              <Download size={13} />
              <span>{isAr ? 'حفظ بتقويم الموبايل (.ICS)' : 'Save to Mobile (.ICS)'}</span>
            </button>

            {googleCalUrl && (
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: 'var(--crm-text-xs)',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  background: 'var(--crm-card)',
                  color: 'var(--crm-ink)',
                  textDecoration: 'none'
                }}
                title={isAr ? 'فتح في تقويم Google' : 'Open in Google Calendar'}
              >
                <ExternalLink size={13} />
                <span>{isAr ? 'تقويم Google' : 'Google Calendar'}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* 2. Quick Call Logger */}
      <div style={{
        background: 'var(--crm-card)',
        border: '1px solid var(--crm-line)',
        borderRadius: '12px',
        padding: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <Phone size={15} style={{ color: 'var(--crm-accent, var(--crm-accent-text))' }} />
          <strong style={{ fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'تسجيل نتيجة مكالمة سريعة بنقرة واحدة:' : 'Log Call Outcome (1-Click):'}</strong>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { label: isAr ? 'لم يرد' : 'No Answer', color: 'var(--crm-muted)' },
            { label: isAr ? 'طلب مهلة للاتصال' : 'Callback', color: 'var(--crm-warn)' },
            { label: isAr ? 'مهتم ويبحث بجدية' : 'Interested', color: 'var(--crm-positive)' },
            { label: isAr ? 'تم تحديد موعد معاينة' : 'Viewing Set', color: 'var(--crm-info)' },
            { label: isAr ? 'غير مناسب / ميزانية أقل' : 'Not Match', color: 'var(--crm-danger)' }
          ].map((btn, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleLogCall(btn.label)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 600,
                background: 'var(--crm-subtle)',
                border: '1px solid var(--crm-line)',
                color: btn.color,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. WhatsApp Pre-formatted Pitches — only with a real (unmasked) number */}
      {egWhatsapp && <div style={{
        background: 'var(--crm-card)',
        border: '1px solid var(--crm-line)',
        borderRadius: '12px',
        padding: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <MessageSquare size={15} style={{ color: 'var(--brand-whatsapp)' }} />
          <strong style={{ fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'رسائل واتساب تسويقية جاهزة للإرسال:' : 'Instant WhatsApp Pitches:'}</strong>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {whatsappTemplates.map((tpl, i) => {
            const waHref = `https://wa.me/${egWhatsapp}?text=${encodeURIComponent(tpl.msg)}`;
            return (
              <div
                key={i}
                style={{
                  background: 'var(--crm-subtle)',
                  border: '1px solid var(--crm-line)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 700, color: 'var(--crm-ink)' }}>{tpl.title}</div>
                  <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px', lineClamp: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                    {tpl.msg}
                  </div>
                </div>

                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: 'var(--brand-whatsapp-solid)',
                    color: 'var(--crm-on-dark)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: 700,
                    textDecoration: 'none',
                    flexShrink: 0
                  }}
                >
                  <Send size={12} />
                  <span>{isAr ? 'إرسال' : 'Send'}</span>
                </a>
              </div>
            );
          })}
        </div>
      </div>}

      {/* 4. Schedule Viewing Toggle / Form */}
      <div style={{
        background: 'var(--crm-card)',
        border: '1px solid var(--crm-line)',
        borderRadius: '12px',
        padding: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} style={{ color: 'var(--crm-accent, var(--crm-accent-text))' }} />
            <strong style={{ fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'جدولة موعد معاينة ميدانية:' : 'Schedule Property Viewing:'}</strong>
          </div>

          <button
            type="button"
            onClick={() => setShowViewingForm(!showViewingForm)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--crm-accent, var(--crm-accent-text))',
              fontWeight: 700,
              fontSize: 'var(--crm-text-xs)',
              cursor: 'pointer'
            }}
          >
            {showViewingForm ? (isAr ? 'إلغاء' : 'Cancel') : (isAr ? '+ جدولة الآن' : '+ Schedule')}
          </button>
        </div>

        {showViewingForm && (
          <form onSubmit={handleScheduleViewing} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--crm-text-xs)', fontWeight: 600, marginBottom: '4px' }}>
                {isAr ? 'اختر الوحدة المراد معاينتها:' : 'Select Property:'}
              </label>
              <select
                value={selectedViewingPropId}
                onChange={(e) => setSelectedViewingPropId(e.target.value)}
                required
                className="form-input"
                style={{ width: '100%', padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: '8px' }}
              >
                <option value="">{isAr ? '-- اختر العقار من المحفظة --' : '-- Choose Property --'}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id.toUpperCase()} — {p.title_ar || p.title_en} ({p.price?.toLocaleString('en-US')} ج.م)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--crm-text-xs)', fontWeight: 600, marginBottom: '4px' }}>
                {isAr ? 'تاريخ ووقت المعاينة المفضل:' : 'Date & Time:'}
              </label>
              <input
                type="datetime-local"
                value={viewingDateTime}
                onChange={(e) => setViewingDateTime(e.target.value)}
                required
                className="form-input"
                style={{ width: '100%', padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: '8px' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: 'var(--crm-text-sm)',
                fontWeight: 700,
                background: 'var(--crm-accent)',
                color: 'var(--crm-on-dark)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {isAr ? 'تأكيد المعاينة وجدولة التنبيه' : 'Confirm Viewing Schedule'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
