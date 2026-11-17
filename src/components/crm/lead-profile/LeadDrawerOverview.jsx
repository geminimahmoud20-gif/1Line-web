import { Phone, MessageSquare, Calendar, Send, Building, Download, ExternalLink, Plus, Search, Compass } from 'lucide-react';
import { getGoogleCalendarUrl, downloadIcsFile } from '../../../utils/calendarHelper';
import { Button, Badge, Select, Input } from '../../ui';
import LeadCommissionBox from './LeadCommissionBox';
import SellerAskingPrice from './SellerAskingPrice';
import { auditContactUse } from '../../../utils/contactAudit';
import { isSellerLead, firstContactPatch } from '../../../utils/crmLeadViews';
import { askingPriceOf } from '../../../utils/leadPipeline';
import { sharePagesFor, sharePageMessage } from '../../../utils/sharePages';
import { SITE_URL } from '../../../config/siteConfig';
import { useState } from 'react';
import { answersFacts } from '../../../utils/buyerMatch';
import { attributionFacts } from '../../../utils/attributionTouches';
import LeadTasks from './LeadTasks';
import { sellerRoleOf, SELLER_ROLE_LABEL } from '../../../utils/sellerRole';
import { OUTCOMES, STAGE_RULES, attemptsOf } from '../../../utils/stageGate';
import { LOST_REASONS } from '../../../utils/crmLeadViews';

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
  onUpdateLead,
  triggerToast
}) {
  const details = lead?.details || {};
  const isSeller = isSellerLead(lead || {}) || lead?.type === 'seller' || lead?.landingPage === '/sell' || Boolean(details.askingPrice) || Boolean(details.propertyType && details.size);
  const scheduledTime = lead?.nextFollowUpAt || details.visitDate;
  const scheduledDate = scheduledTime ? new Date(scheduledTime) : null;
  const hasSchedule = scheduledDate && Number.isFinite(scheduledDate.getTime());
  const viewingProp = properties.find(p => p.id === (lead?.viewingPropertyId || details.propertyId));
  const L = (ar, en) => (isAr ? ar : en);
  const sellerRole = sellerRoleOf(lead);
  // The outcomes this stage offers (utils/stageGate STAGE_RULES), «لم يرد» attempts so far
  const stageOutcomes = (STAGE_RULES.find((s) => s.id === (lead?.status || 'new'))?.outcomes || []).map((id) => OUTCOMES.find((o) => o.id === id)).filter(Boolean);
  const attempts = attemptsOf(lead || {});
  const [pendingNeg, setPendingNeg] = useState('');
  const [negReason, setNegReason] = useState('');
  // Sending a message counts as the first reply: the "no reply" clock stops
  const markContacted = () => {
    auditContactUse(lead, 'whatsapp');
    const patch = firstContactPatch(lead);
    if (patch && onUpdateLead) onUpdateLead(lead.id, patch, lead.version);
  };
  // «ابعتله صفحة»: a page of the site on WhatsApp, owners' pages first for an owner
  const pages = sharePagesFor(isSeller);
  const [pagePath, setPagePath] = useState(pages[0].path);
  const page = pages.find((p) => p.path === pagePath) || pages[0];
  const pageMessage = sharePageMessage(page, { name: lead?.name, siteUrl: SITE_URL });

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
    [askingPriceOf(lead) ? L('السعر المطلوب', 'Asking price') : L('التقدير الآلي', 'Estimate'), (askingPriceOf(lead) || details.estimatedAvg) && `${Number(askingPriceOf(lead) || details.estimatedAvg).toLocaleString('en-US')} ${L('ج.م', 'EGP')}`],
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

  // What the buyer answered in «رشح لي عقاري» (saved with the lead as data)
  const matchFacts = isSeller ? [] : answersFacts(details.matchAnswers, Array.isArray(details.areas) ? details.areas.filter(Boolean) : []);

  // Where the client came from: the source, the campaign and ad, the page, and a return after an earlier visit
  const sourceFacts = attributionFacts(lead);

  return (
    <div className="crm-ld__stack">
      <LeadTasks lead={lead} isAr={isAr} triggerToast={triggerToast} onUpdateLead={onUpdateLead} />
      {sourceFacts.length > 0 && (
        <section className="crm-ld__block" aria-labelledby="crm-ld-source">
          <div className="crm-ld__block-head">
            <h3 id="crm-ld-source" className="crm-ld__h"><Compass size={16} aria-hidden="true" />{L('من فين جه؟', 'Where from')}</h3>
          </div>
          <dl className="crm-ld__facts">
            {sourceFacts.map(([label, value, wide]) => (
              <div key={label} className={wide ? 'crm-ld__fact--wide' : undefined}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </section>
      )}
      {matchFacts.length > 0 && (
        <section className="crm-ld__block" aria-labelledby="crm-ld-match">
          <div className="crm-ld__block-head">
            <h3 id="crm-ld-match" className="crm-ld__h"><Search size={16} aria-hidden="true" />{L('طلب العميل (رشح لي عقاري)', 'What the buyer asked for')}</h3>
          </div>
          <dl className="crm-ld__facts">
            {matchFacts.map(([label, value, wide]) => (
              <div key={label} className={wide ? 'crm-ld__fact--wide' : undefined}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </section>
      )}
      {isSeller && (
        <section className="crm-ld__block" aria-labelledby="crm-ld-seller">
          <div className="crm-ld__block-head">
            <h3 id="crm-ld-seller" className="crm-ld__h"><Building size={16} aria-hidden="true" />{L('العقار المعروض للبيع', 'Property for sale')}</h3>
            {sellerRole && <Badge tone={sellerRole === 'broker' ? 'warning' : 'accent'}>{L(`من ${SELLER_ROLE_LABEL[sellerRole].ar}`, `From ${SELLER_ROLE_LABEL[sellerRole].en.toLowerCase()}`)}</Badge>}
          </div>
          {sellerFacts.length > 0 && (
            <dl className="crm-ld__facts">
              {sellerFacts.map(([label, value, wide]) => (
                <div key={label} className={wide ? 'crm-ld__fact--wide' : undefined}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          )}
          {sellerPhotos.length > 0 && (
            <ul className="crm-ld__photos" aria-label={L('صور العقار', 'Property photos')}>
              {sellerPhotos.map((p, i) => (
                <li key={p.url}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <img src={p.url} alt={p.label || L(`صورة ${i + 1} للعقار`, `Property photo ${i + 1}`)} loading="lazy" />
                    {p.label && <span>{p.label}</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {onUpdateLead && <SellerAskingPrice key={lead.id} lead={lead} isAr={isAr} onUpdateLead={onUpdateLead} />}
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
        <h3 id="crm-ld-call" className="crm-ld__h"><Phone size={16} aria-hidden="true" />{L('نتيجة النشاط', 'Activity outcome')}</h3>
        <p className="crm-ld__hint">
          {L('سجّل اللي حصل: ده اللي بيفتح المرحلة اللي بعدها.', 'Log what happened: it unlocks the next stage.')}
          {attempts > 0 && ` ${L(`آخر ${attempts} محاولة بلا رد.`, `${attempts} tries without an answer.`)}`}
        </p>
        <div className="crm-ld__row">
          {stageOutcomes.map((o) => (
            <Button
              key={o.id}
              variant={o.kind === 'negative' ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => (o.kind === 'negative' ? (setPendingNeg(o.id), setNegReason('')) : handleLogCall(o.id))}
            >
              {o.ar}
            </Button>
          ))}
        </div>
        {pendingNeg && (
          <form
            className="crm-ld__form"
            onSubmit={(e) => { e.preventDefault(); if (!negReason) return; handleLogCall(pendingNeg, { reason: negReason }); setPendingNeg(''); setNegReason(''); }}
          >
            <Select
              label={`${OUTCOMES.find((o) => o.id === pendingNeg)?.ar}: ${L('السبب', 'reason')}`}
              required
              value={negReason}
              onChange={(e) => setNegReason(e.target.value)}
              placeholder={L('اختار السبب', 'Choose a reason')}
              options={LOST_REASONS.map((r) => ({ value: r.id, label: r.ar }))}
            />
            <div className="crm-ld__row">
              <Button type="submit" size="sm" disabled={!negReason}>{L('سجّل', 'Log')}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setPendingNeg(''); setNegReason(''); }}>{L('إلغاء', 'Cancel')}</Button>
            </div>
          </form>
        )}
      </section>

      {egWhatsapp && (
        <details className="crm-ld__block crm-ld__fold">
          <summary className="crm-ld__fold-sum"><MessageSquare size={16} aria-hidden="true" />{L('رسايل واتساب جاهزة', 'WhatsApp templates')}</summary>
          <ul className="crm-ld__list">
            {whatsappTemplates.map((tpl) => (
              <li key={tpl.title} className="crm-ld__tpl">
                <div className="crm-ld__tpl-text">
                  <span className="crm-ld__tpl-title">{tpl.title}</span>
                  <span className="crm-ld__tpl-msg">{tpl.msg}</span>
                </div>
                <a
                  href={`https://wa.me/${egWhatsapp}?text=${encodeURIComponent(tpl.msg)}`}
                  onClick={markContacted}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn--secondary ui-btn--sm"
                >
                  <Send size={16} aria-hidden="true" />{L('ابعت', 'Send')}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      {egWhatsapp && (
        <details className="crm-ld__block crm-ld__fold">
          <summary className="crm-ld__fold-sum"><ExternalLink size={16} aria-hidden="true" />{L('ابعتله صفحة من الموقع', 'Send a page of the site')}</summary>
          <Select
            label={L('الصفحة', 'Page')}
            value={pagePath}
            onChange={(e) => setPagePath(e.target.value)}
            options={pages.map((p) => ({ value: p.path, label: p.ar }))}
          />
          <p className="crm-ld__tpl-msg crm-ld__page-preview">{pageMessage}</p>
          <div className="crm-ld__row">
            <a
              href={`https://wa.me/${egWhatsapp}?text=${encodeURIComponent(pageMessage)}`}
              onClick={markContacted}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-btn ui-btn--secondary ui-btn--sm"
            >
              <Send size={16} aria-hidden="true" />{L('ابعتها واتساب', 'Send on WhatsApp')}
            </a>
          </div>
        </details>
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
