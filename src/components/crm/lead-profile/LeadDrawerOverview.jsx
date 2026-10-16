import { Phone, MessageSquare, Calendar, Send, Building, Download, ExternalLink, Plus } from 'lucide-react';
import { getGoogleCalendarUrl, downloadIcsFile } from '../../../utils/calendarHelper';
import { Button, Badge, Select, Input } from '../../ui';
import LeadCommissionBox from './LeadCommissionBox';

// One-tap call results; the text is what goes into the lead's history
const CALL_OUTCOMES = [
  { ar: 'لم يرد', en: 'No answer' },
  { ar: 'طلب مهلة للاتصال', en: 'Call back later' },
  { ar: 'مهتم ويبحث بجدية', en: 'Interested' },
  { ar: 'تم تحديد موعد معاينة', en: 'Viewing set' },
  { ar: 'غير مناسب / ميزانية أقل', en: 'Not a match' }
];

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
  whatsappTemplates,
  onUpdateLead
}) {
  const details = lead?.details || {};
  const isSeller = lead?.type === 'seller' || lead?.landingPage === '/sell' || Boolean(details.askingPrice) || Boolean(details.propertyType && details.size);
  const scheduledTime = lead?.nextFollowUpAt || details.visitDate;
  const scheduledDate = scheduledTime ? new Date(scheduledTime) : null;
  const hasSchedule = scheduledDate && Number.isFinite(scheduledDate.getTime());
  const viewingProp = properties.find(p => p.id === (lead?.viewingPropertyId || details.propertyId));
  const L = (ar, en) => (isAr ? ar : en);

  const handleDownloadCalendar = () => {
    if (!hasSchedule) return;
    const propTitle = viewingProp ? (isAr ? viewingProp.title_ar : viewingProp.title_en) : L('عقار 1Line', '1Line Property');
    downloadIcsFile({
      title: `معاينة: ${propTitle} (${lead.name})`,
      description: `معاينة ميدانية مع العميل: ${lead.name}\nالهاتف: ${lead.phone || lead.whatsapp}\nكود العقار: ${viewingProp?.id || '—'}\nملاحظات: ${lead.notes || '—'}`,
      location: lead.area || 'سوهاج',
      start: scheduledDate,
      filename: `viewing-${lead.name || 'client'}.ics`
    });
  };

  const googleCalUrl = hasSchedule ? getGoogleCalendarUrl({
    title: `معاينة عقار 1Line: ${lead?.name || ''}`,
    description: `معاينة مع العميل ${lead?.name || ''} - هاتف: ${lead?.phone || lead?.whatsapp || ''}`,
    location: lead?.area || 'سوهاج',
    start: scheduledDate
  }) : '';

  const sellerFacts = [
    [L('المساحة', 'Size'), details.size && `${details.size} ${L('م²', 'm²')}`],
    [details.askingPrice ? L('السعر المطلوب', 'Asking price') : L('التقدير الآلي', 'Estimate'), (details.askingPrice || details.estimatedAvg) && `${Number(details.askingPrice || details.estimatedAvg).toLocaleString('en-US')} ${L('ج.م', 'EGP')}`],
    [L('الغرف', 'Rooms'), details.rooms],
    [L('الدور', 'Floor'), details.floor && (details.floor === 'ground' ? L('أرضي', 'Ground') : details.floor)],
    [L('التشطيب', 'Finishing'), details.finishingLabelAr],
    [L('العنوان', 'Address'), details.address, true],
    [L('المميزات', 'Features'), Array.isArray(details.featuresAr) && details.featuresAr.join('، '), true],
    [L('المستندات', 'Legal'), details.legalSummaryAr]
  ].filter(([, v]) => v);
  // Newer requests name each photo's spot (street, frontage…) in photoLabels, same order as images
  const sellerPhotos = (Array.isArray(details.images) ? details.images : [])
    .filter((url) => typeof url === 'string' && url)
    .map((url, i) => ({ url, label: Array.isArray(details.photoLabels) ? details.photoLabels[i] || '' : '' }));

  return (
    <div className="crm-ld__stack">
      {isSeller && (
        <section className="crm-ld__block" aria-labelledby="crm-ld-seller">
          <div className="crm-ld__block-head">
            <h3 id="crm-ld-seller" className="crm-ld__h"><Building size={16} aria-hidden="true" />{L('العقار المعروض للبيع', 'Property for sale')}</h3>
            <Badge tone="accent">{L('من المالك', 'From owner')}</Badge>
          </div>
          {sellerFacts.length > 0 && (
            <dl className="crm-ld__facts">
              {sellerFacts.map(([label, value, wide]) => (
                <div key={label} className={wide ? 'crm-ld__fact--wide' : undefined}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          )}
          {sellerPhotos.length > 0 && (
            <ul className="crm-ld__photos" aria-label={L('صور المالك', 'Owner photos')}>
              {sellerPhotos.map((p, i) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <img src={p.url} alt={p.label || L(`صورة ${i + 1} من المالك`, `Owner photo ${i + 1}`)} loading="lazy" />
                    {p.label && <span>{p.label}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {onConvertToProperty && (
            <Button block icon={<Building size={16} aria-hidden="true" />} onClick={() => onConvertToProperty(lead)}>
              {L('اعمل منه مسودة عقار', 'Create a listing draft')}
            </Button>
          )}
        </section>
      )}

      <LeadCommissionBox key={lead?.id} lead={lead} isAr={isAr} onUpdateLead={onUpdateLead} />

      {hasSchedule && (
        <section className="crm-ld__block crm-ld__block--info" aria-labelledby="crm-ld-visit">
          <div className="crm-ld__block-head">
            <h3 id="crm-ld-visit" className="crm-ld__h"><Calendar size={16} aria-hidden="true" />{L('موعد المعاينة', 'Viewing')}</h3>
            <strong className="crm-ld__when">
              {scheduledDate.toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </strong>
          </div>
          <div className="crm-ld__row">
            <Button variant="secondary" size="sm" icon={<Download size={16} aria-hidden="true" />} onClick={handleDownloadCalendar}>
              {L('حفظ في تقويم الموبايل', 'Save to phone calendar')}
            </Button>
            {googleCalUrl && (
              <a href={googleCalUrl} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn--secondary ui-btn--sm">
                <ExternalLink size={16} aria-hidden="true" />{L('تقويم Google', 'Google Calendar')}
              </a>
            )}
          </div>
        </section>
      )}

      <section className="crm-ld__block" aria-labelledby="crm-ld-call">
        <h3 id="crm-ld-call" className="crm-ld__h"><Phone size={16} aria-hidden="true" />{L('نتيجة المكالمة', 'Call result')}</h3>
        <p className="crm-ld__hint">{L('دوسة واحدة بتسجّلها في سجل العميل.', 'One tap adds it to the client history.')}</p>
        <div className="crm-ld__row">
          {CALL_OUTCOMES.map((o) => (
            <Button key={o.ar} variant="secondary" size="sm" onClick={() => handleLogCall(isAr ? o.ar : o.en)}>
              {isAr ? o.ar : o.en}
            </Button>
          ))}
        </div>
      </section>

      {egWhatsapp && (
        <section className="crm-ld__block" aria-labelledby="crm-ld-wa">
          <h3 id="crm-ld-wa" className="crm-ld__h"><MessageSquare size={16} aria-hidden="true" />{L('رسايل واتساب جاهزة', 'WhatsApp templates')}</h3>
          <ul className="crm-ld__list">
            {whatsappTemplates.map((tpl) => (
              <li key={tpl.title} className="crm-ld__tpl">
                <div className="crm-ld__tpl-text">
                  <span className="crm-ld__tpl-title">{tpl.title}</span>
                  <span className="crm-ld__tpl-msg">{tpl.msg}</span>
                </div>
                <a
                  href={`https://wa.me/${egWhatsapp}?text=${encodeURIComponent(tpl.msg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn--secondary ui-btn--sm"
                >
                  <Send size={16} aria-hidden="true" />{L('ابعت', 'Send')}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="crm-ld__block" aria-labelledby="crm-ld-schedule">
        <div className="crm-ld__block-head">
          <h3 id="crm-ld-schedule" className="crm-ld__h"><Calendar size={16} aria-hidden="true" />{L('حجز معاينة', 'Book a viewing')}</h3>
          <Button
            variant="ghost"
            size="sm"
            icon={showViewingForm ? null : <Plus size={16} aria-hidden="true" />}
            aria-expanded={showViewingForm}
            onClick={() => setShowViewingForm(!showViewingForm)}
          >
            {showViewingForm ? L('إلغاء', 'Cancel') : L('احجز', 'Book')}
          </Button>
        </div>
        {showViewingForm && (
          <form onSubmit={handleScheduleViewing} className="crm-ld__form">
            <Select
              label={L('العقار', 'Property')}
              required
              value={selectedViewingPropId}
              onChange={(e) => setSelectedViewingPropId(e.target.value)}
              placeholder={L('اختار من المحفظة', 'Choose from the portfolio')}
              options={properties.map((p) => ({
                value: p.id,
                label: `${String(p.id).toUpperCase()} — ${p.title_ar || p.title_en}${p.price ? ` (${Number(p.price).toLocaleString('en-US')} ${L('ج.م', 'EGP')})` : ''}`
              }))}
            />
            <Input
              label={L('اليوم والساعة', 'Date and time')}
              type="datetime-local"
              required
              value={viewingDateTime}
              onChange={(e) => setViewingDateTime(e.target.value)}
            />
            <Button type="submit">{L('أكّد المعاينة', 'Confirm viewing')}</Button>
          </form>
        )}
      </section>
    </div>
  );
}
