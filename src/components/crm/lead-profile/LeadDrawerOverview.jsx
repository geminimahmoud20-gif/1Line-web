import { Phone, MessageSquare, Calendar, Send, Building, Download, ExternalLink, Plus, Search, Compass, Edit3, FileText, MapPin, CheckCircle2 } from 'lucide-react';
import { getGoogleCalendarUrl, downloadIcsFile } from '../../../utils/calendarHelper';
import { Button, Badge, Select, Input } from '../../ui';
import LeadCommissionBox from './LeadCommissionBox';
import SellerAskingPrice from './SellerAskingPrice';
import { auditContactUse } from '../../../utils/contactAudit';
import { isSellerLead, firstContactPatch, sellerMissing, leadBudget, SELLER_DETAIL_LABELS } from '../../../utils/crmLeadViews';
import { askingPriceOf } from '../../../utils/leadPipeline';
import { sharePagesFor, sharePageMessage, completeDetailsMessage } from '../../../utils/sharePages';
import { SITE_URL } from '../../../config/siteConfig';
import { useState } from 'react';
import { answersFacts } from '../../../utils/buyerMatch';
import { attributionFacts } from '../../../utils/attributionTouches';
import LeadTasks from './LeadTasks';
import ClientTimeline from '../client-file/ClientTimeline';
import { buildTimeline } from '../../../utils/clientTimeline';
import { sellerRoleOf, SELLER_ROLE_LABEL } from '../../../utils/sellerRole';
import { PROPERTY_TYPES } from '../../../data/propertiesData';
import { getAreas } from '../../../utils/areasData';
import { areaNameOf } from '../../../utils/areaLookup';
import { OUTCOMES, STAGE_RULES, attemptsOf, outcomesOf, outcomeById, FOLLOW_UP_ACTIONS } from '../../../utils/stageGate';
import { lostReasonsFor } from '../../../utils/crmLeadViews';
import { useSiteSettings } from '../../../utils/siteSettings';
import ReviewRequestCard from './ReviewRequestCard';
import ClientRequestsCard from './ClientRequestsCard';
import { findExistingLeadListing } from '../../../utils/listingDedupe';

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
  triggerToast,
  newNote,
  setNewNote,
  onAddNote,
  agentName = '',
  view = 'work',
  onOpenClient,
  allLeads = [],
  activeRole,
  onOpenInspection = () => {}
}) {
  const details = lead?.details || {};
  const isSeller = isSellerLead(lead || {}) || lead?.type === 'seller' || lead?.landingPage === '/sell' || Boolean(details.askingPrice) || Boolean(details.propertyType && details.size);
  const scheduledTime = lead?.nextFollowUpAt || details.visitDate;
  const scheduledDate = scheduledTime ? new Date(scheduledTime) : null;
  const hasSchedule = scheduledDate && Number.isFinite(scheduledDate.getTime());
  const viewingProp = properties.find(p => p.id === (lead?.viewingPropertyId || details.propertyId));
  const existingListing = isSeller ? findExistingLeadListing(properties, lead?.id, [lead?.convertedPropertyId, ...(Array.isArray(details.listingIds) ? details.listingIds : [])]) : null;
  const siteSettings = useSiteSettings();
  const L = (ar, en) => (isAr ? ar : en);
  const sellerRole = sellerRoleOf(lead);
  const SELLER_OUTCOME_LABELS = {
    reached: 'تم التواصل مع المالك',
    interested: 'أكّد الرغبة في البيع والسعر',
    viewing_set: 'تحديد موعد معاينة وتثمين',
    viewing_done: 'تمت معاينة العقار وتصويره',
    offer: 'تقديم عرض شراء للمالك',
    agreed: 'الاتفاق على السعر وعقد البيع',
    callback: 'طلب مهلة / كلّمني بعدين',
    no_answer: 'لم يرد',
    not_fit: 'غير مناسب / صرف نظر',
    wrong_number: 'رقم غلط'
  };
  // The outcomes this stage offers (utils/stageGate STAGE_RULES), «لم يرد» attempts so far
  const stageOutcomes = (STAGE_RULES.find((s) => s.id === (lead?.status || 'new'))?.outcomes || []).map((id) => OUTCOMES.find((o) => o.id === id)).filter(Boolean);
  const attempts = attemptsOf(lead || {});
  // What was logged last, shown next to the buttons: the record of what happened, and what was done after it
  const lastOut = outcomesOf(lead || {}).at(-1) || null;
  const lastOutMeta = lastOut ? outcomeById(lastOut.id) : null;
  const [nowMs] = useState(() => Date.now());
  const agoText = (ms) => {
    const m = Math.max(0, Math.floor((nowMs - ms) / 60000));
    if (m < 60) return L(`من ${Math.max(1, m)} د`, `${Math.max(1, m)}m ago`);
    const h = Math.floor(m / 60);
    return h < 48 ? L(`من ${h} س`, `${h}h ago`) : L(`من ${Math.floor(h / 24)} يوم`, `${Math.floor(h / 24)}d ago`);
  };
  const logFollowUp = (action) => {
    if (!onUpdateLead) return;
    const at = new Date().toISOString();
    onUpdateLead(lead.id, {
      activityLogs: [{ timestamp: at, action: `بعد ${lastOutMeta?.ar || 'النتيجة'}: ${action.ar}`, kind: 'note', ...(agentName ? { agent: agentName } : {}) }, ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])].slice(0, 100),
      lastActivityAt: at
    }, lead.version);
    triggerToast?.(L(`اتسجّل: ${action.ar}`, `Logged: ${action.en}`), 'success');
  };
  const [pendingNeg, setPendingNeg] = useState('');
  const [negReason, setNegReason] = useState('');
  const [editingPrice, setEditingPrice] = useState(false);
  const [inlinePriceInput, setInlinePriceInput] = useState('');
  const [editingSize, setEditingSize] = useState(false);
  const [inlineSizeInput, setInlineSizeInput] = useState('');

  const handleSavePrice = (e) => {
    e?.preventDefault();
    const cleanNum = Number(String(inlinePriceInput).replace(/[^0-9]/g, ''));
    if (!onUpdateLead || isNaN(cleanNum) || cleanNum <= 0) return;
    const at = new Date().toISOString();
    const prevPrice = askingPriceOf(lead) || Number(String(lead?.budget || 0).replace(/[^0-9.]/g, ''));
    onUpdateLead(lead.id, {
      budget: cleanNum,
      details: {
        ...(lead.details || {}),
        askingPrice: cleanNum,
        priceFormatted: `${cleanNum.toLocaleString('en-US')} ج.م`
      },
      activityLogs: [
        { timestamp: at, action: `تحديث السعر المطلوب: من ${prevPrice ? prevPrice.toLocaleString('en-US') : 'غير محدد'} إلى ${cleanNum.toLocaleString('en-US')} ج.م`, kind: 'note', ...(agentName ? { agent: agentName } : {}) },
        ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])
      ].slice(0, 100),
      lastActivityAt: at
    }, lead.version);
    setEditingPrice(false);
    triggerToast?.(L(`تم تحديث السعر إلى ${cleanNum.toLocaleString('en-US')} ج.م`, `Price updated to ${cleanNum.toLocaleString('en-US')} EGP`), 'success');
  };

  const handleSaveSize = (e) => {
    e?.preventDefault();
    const cleanSize = parseInt(String(inlineSizeInput).replace(/[^0-9]/g, ''), 10);
    if (!onUpdateLead || !cleanSize || cleanSize <= 0) return;
    const at = new Date().toISOString();
    onUpdateLead(lead.id, {
      details: {
        ...(lead.details || {}),
        size: cleanSize
      },
      activityLogs: [
        { timestamp: at, action: `تسجيل مساحة العقار: ${cleanSize} م²`, kind: 'note', ...(agentName ? { agent: agentName } : {}) },
        ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])
      ].slice(0, 100),
      lastActivityAt: at
    }, lead.version);
    setEditingSize(false);
    triggerToast?.(L(`تم تسجيل المساحة: ${cleanSize} م²`, `Size saved: ${cleanSize} m²`), 'success');
  };

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
  // An owner whose request lacks the size, the address or photos: one tap sends the full form and logs it
  const missing = sellerMissing(lead || {}).map((k) => SELLER_DETAIL_LABELS[k]);
  const completeMessage = completeDetailsMessage({ name: lead?.name, missing, siteUrl: SITE_URL });
  const sendCompletion = () => {
    auditContactUse(lead, 'whatsapp');
    if (!onUpdateLead) return;
    const at = new Date().toISOString();
    onUpdateLead(lead.id, {
      ...(firstContactPatch(lead, at) || {}),
      activityLogs: [{ timestamp: at, action: `بعتّله رابط تكملة البيانات (${missing.join('، ')})`, kind: 'note', ...(agentName ? { agent: agentName } : {}) }, ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])].slice(0, 100),
      lastActivityAt: at
    }, lead.version);
  };

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

  // What the one-step card collects (it asks little by design): type, area and the rough price; the size, address
  // and photos only come from the full form
  const isQuick = /1-step/i.test(String(lead?.source || ''));
  const rawArea = details.area || lead?.area;
  const quickType = PROPERTY_TYPES.find((t) => t.id === (details.propertyType || lead?.propertyType))?.name_ar;
  const quickArea = !rawArea ? '' : rawArea === 'all' ? L('كل المناطق', 'All areas') : areaNameOf(rawArea, getAreas(), isAr);
  
  const numBudget = Number(String(lead?.budget || 0).replace(/[^0-9.]/g, ''));
  const rawAskingPrice = askingPriceOf(lead) || numBudget;
  const isSuspiciouslyLowForTotal = isSeller && rawAskingPrice > 0 && rawAskingPrice < 100000;
  
  let formattedPriceDisplay = '';
  if (rawAskingPrice > 0) {
    const formattedNum = Number(rawAskingPrice).toLocaleString('en-US');
    if (isSuspiciouslyLowForTotal) {
      formattedPriceDisplay = `${formattedNum} ${L('ج.م (قد يكون للمتر)', 'EGP (may be per m²)')}`;
    } else {
      formattedPriceDisplay = `${formattedNum} ${L('ج.م', 'EGP')}`;
    }
  } else if (details.estimatedAvg) {
    formattedPriceDisplay = `${Number(details.estimatedAvg).toLocaleString('en-US')} ${L('ج.م (تقدير آلي)', 'EGP (estimate)')}`;
  }

  const finishVal = details.finishingLabelAr || details.finishing || details.finish;
  const finishDisplay = finishVal || (details.finishing === 'core' ? L('نصف تشطيب / محارة', 'Semi-finished') : (isAr ? 'غير محدد' : 'Unspecified'));
  const fullAddress = details.address || details.street || (rawArea ? areaNameOf(rawArea, getAreas(), isAr) : '');

  const sellerFacts = [
    [L('نوع العقار', 'Type'), quickType],
    [L('المنطقة', 'Area'), quickArea],
    [L('السعر المطلوب', 'Asking price'), formattedPriceDisplay],
    [L('المساحة', 'Size'), details.size ? `${details.size} ${L('م²', 'm²')}` : (isAr ? 'غير محددة' : 'Not set')],
    [L('الغرف', 'Rooms'), details.rooms || (isAr ? 'غير محدد' : '—')],
    [L('الدور', 'Floor'), details.floor ? (details.floor === 'ground' ? L('أرضي', 'Ground') : (String(details.floor).startsWith('الدور') ? details.floor : `${L('الدور', 'Floor')} ${details.floor}`)) : (isAr ? 'غير محدد' : '—')],
    [L('التشطيب', 'Finishing'), finishDisplay],
    [L('العنوان', 'Address'), fullAddress, true],
    [L('المميزات', 'Features'), Array.isArray(details.featuresAr) ? details.featuresAr.join('، ') : (Array.isArray(details.features) ? details.features.join('، ') : ''), true],
    [L('المستندات', 'Legal'), details.legalSummaryAr || details.legal || (isAr ? 'سليمة وجاهزة للمعاينة' : 'Ready')]
  ].filter(([, v]) => Boolean(v));
  // Newer requests name each photo's spot (street, frontage…) in photoLabels, same order as images
  const sellerPhotos = (Array.isArray(details.images) ? details.images : [])
    .filter((url) => typeof url === 'string' && url)
    .map((url, i) => ({ url, label: Array.isArray(details.photoLabels) ? details.photoLabels[i] || '' : '' }));

  // What the buyer answered in «رشح لي عقاري» (saved with the lead as data)
  const matchFacts = isSeller ? [] : answersFacts(details.matchAnswers, Array.isArray(details.areas) ? details.areas.filter(Boolean) : []);

  // Complete facts without stripping fields away
  const buyerBasics = [
    [L('نوع العقار', 'Type'), quickType],
    [L('المنطقة', 'Area'), quickArea],
    [L('الميزانية', 'Budget'), leadBudget(lead || {}) > 0 && `${leadBudget(lead).toLocaleString('en-US')} ${L('ج.م', 'EGP')}`],
    [L('المقدم المتاح', 'Down payment'), (details.downPayment || lead?.downPayment) && `${Number(String(details.downPayment || lead?.downPayment).replace(/[^0-9.]/g, '') || 0).toLocaleString('en-US')} ${L('ج.م', 'EGP')}`],
    [L('القسط الشهري', 'Monthly installment'), (details.monthlyInstallment || lead?.monthlyInstallment) && `${Number(String(details.monthlyInstallment || lead?.monthlyInstallment).replace(/[^0-9.]/g, '') || 0).toLocaleString('en-US')} ${L('ج.م/شهر', 'EGP/mo')}`],
    [L('طريقة السداد', 'Payment method'), (details.paymentMethod || details.financingType || lead?.financing) && (details.paymentMethod === 'cash' || lead?.financing === 'cash' ? L('كاش فوري', 'Cash') : (details.paymentMethod === 'installments' || lead?.financing === 'installments' ? L('تقسيط على دفعات', 'Installments') : L('تمويل عقاري', 'Mortgage')))],
    [L('الغرض من الشراء', 'Purpose'), details.reasonForBuying || (details.purpose === 'live' ? L('سكن عائلي أساسي', 'Primary residence') : (details.purpose === 'invest' ? L('استثمار وعائد إيجاري', 'Investment') : details.purpose))],
    [L('موعد الشراء', 'Timeframe'), details.timeframe === 'immediate' ? L('فوري وعاجل', 'Immediate') : (details.timeframe || details.moveInDate)],
    [L('مصدر الدخل / التمويل', 'Funding source'), details.sourceOfFunds || details.incomeSource],
    [L('عدد أفراد الأسرة', 'Family size'), details.familySize ? `${details.familySize} ${L('أفراد', 'members')}` : '']
  ].filter(([, v]) => Boolean(v));
  const briefFacts = isSeller ? sellerFacts : (matchFacts.length ? matchFacts : buyerBasics);

  // Where the client came from: the source, the campaign and ad, the page, and a return after an earlier visit
  const sourceFacts = attributionFacts(lead);
  // What the client wrote himself (the notes without the team's log lines)
  const words = buildTimeline(lead).words;

  return (
    <div className="crm-ld__stack">
      {view === 'work' && (
      <>
      {/* 0. What he asked for, in short (the whole file is under «العميل») */}
      <section className="crm-ld__block crm-ld__brief" aria-labelledby="crm-ld-brief">
        <div className="crm-ld__block-head">
          <h3 id="crm-ld-brief" className="crm-ld__h">
            {isSeller ? <Building size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
            {isSeller ? L('العقار المعروض للبيع', 'Property for sale') : L('طلب العميل', 'What he asked for')}
          </h3>
          {onOpenClient && <Button variant="ghost" size="sm" onClick={onOpenClient}>{L('كل التفاصيل', 'All details')}</Button>}
        </div>
        {briefFacts.length > 0 ? (
          <dl className="crm-ld__facts">
            {briefFacts.map(([label, value, wide]) => {
              const isPrice = label === L('السعر المطلوب', 'Asking price');
              const isSize = label === L('المساحة', 'Size');
              return (
                <div key={label} className={`${isPrice && editingPrice ? 'crm-ld__fact--editing' : ''} ${wide ? 'crm-ld__fact--wide' : ''}`}>
                  <dt>{label}</dt>
                  {isPrice && editingPrice ? (
                    <dd className="crm-ld__inline-edit-box">
                      <form onSubmit={handleSavePrice} className="crm-ld__inline-form">
                        <input
                          type="number"
                          autoFocus
                          value={inlinePriceInput}
                          onChange={(e) => setInlinePriceInput(e.target.value)}
                          placeholder={L('السعر بالجنيه...', 'Price in EGP...')}
                          className="crm-ld__inline-input"
                        />
                        <div className="crm-ld__inline-btns">
                          <Button variant="primary" size="xs" type="submit">{L('حفظ', 'Save')}</Button>
                          <Button variant="ghost" size="xs" type="button" onClick={() => setEditingPrice(false)}>{L('إلغاء', 'Cancel')}</Button>
                        </div>
                      </form>
                    </dd>
                  ) : isSize && editingSize ? (
                    <dd className="crm-ld__inline-edit-box">
                      <form onSubmit={handleSaveSize} className="crm-ld__inline-form">
                        <input
                          type="number"
                          autoFocus
                          value={inlineSizeInput}
                          onChange={(e) => setInlineSizeInput(e.target.value)}
                          placeholder={L('المساحة م²...', 'Size m²...')}
                          className="crm-ld__inline-input"
                        />
                        <div className="crm-ld__inline-btns">
                          <Button variant="primary" size="xs" type="submit">{L('حفظ', 'Save')}</Button>
                          <Button variant="ghost" size="xs" type="button" onClick={() => setEditingSize(false)}>{L('إلغاء', 'Cancel')}</Button>
                        </div>
                      </form>
                    </dd>
                  ) : (
                    <dd className="crm-ld__fact-val">
                      <span>{value}</span>
                      {isSeller && isPrice && onUpdateLead && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            className="crm-ld__inline-edit-btn"
                            onClick={() => { setEditingPrice(true); setInlinePriceInput(String(rawAskingPrice || '')); }}
                            title={L('تعديل السعر مباشرة', 'Edit price')}
                          >
                            <Edit3 size={12} aria-hidden="true" />
                          </button>
                          {isSuspiciouslyLowForTotal && details.size > 0 && (
                            <button
                              type="button"
                              className="ui-btn ui-btn--secondary ui-btn--xs"
                              style={{ fontSize: 'var(--crm-text-xs)', padding: '2px 6px', height: '22px' }}
                              onClick={() => {
                                const calculated = details.size * rawAskingPrice;
                                setInlinePriceInput(String(calculated));
                                setEditingPrice(true);
                              }}
                              title={L('احتساب السعر الإجمالي بضرب سعر المتر في المساحة', 'Calculate total')}
                            >
                              💡 {L(`احتساب الإجمالي (${(details.size * rawAskingPrice).toLocaleString('en-US')} ج.م)`, `Calc total`)}
                            </button>
                          )}
                        </div>
                      )}
                      {isSeller && isSize && onUpdateLead && (
                        <button
                          type="button"
                          className="crm-ld__inline-edit-btn"
                          onClick={() => { setEditingSize(true); setInlineSizeInput(String(details.size || '')); }}
                          title={L('تعديل المساحة مباشرة', 'Edit size')}
                        >
                          <Edit3 size={12} aria-hidden="true" />
                        </button>
                      )}
                    </dd>
                  )}
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="crm-ld__hint">{isSeller
            ? L('العميل ملاّ الاسم والرقم بس، ومفيش تفاصيل عن العقار لسه.', 'Only a name and number came with this request.')
            : L('العميل سايب الاسم والرقم بس، ومفيش تفاصيل عن طلبه لسه.', 'Only a name and number came with this request.')}</p>
        )}
        {isSeller && missing.length > 0 && (
          <div className="crm-ld__missing">
            <span className="crm-ld__missing-text">{L(`ناقص: ${missing.join('، ')}`, `Missing: ${missing.join(', ')}`)}</span>
            <div className="crm-ld__missing-actions">
              {!details.size && (
                editingSize ? (
                  <form onSubmit={handleSaveSize} className="crm-ld__inline-form">
                    <input
                      type="number"
                      autoFocus
                      value={inlineSizeInput}
                      onChange={(e) => setInlineSizeInput(e.target.value)}
                      placeholder={L('المساحة م²...', 'Size m²...')}
                      className="crm-ld__inline-input"
                    />
                    <Button variant="primary" size="xs" type="submit">{L('حفظ', 'Save')}</Button>
                    <Button variant="ghost" size="xs" type="button" onClick={() => setEditingSize(false)}>{L('إلغاء', 'Cancel')}</Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="ui-btn ui-btn--secondary ui-btn--xs"
                    onClick={() => { setEditingSize(true); setInlineSizeInput(''); }}
                  >
                    📐 {L('تسجيل المساحة', 'Add size')}
                  </button>
                )
              )}
              {egWhatsapp && (
                <a
                  href={`https://wa.me/${egWhatsapp}?text=${encodeURIComponent(completeMessage)}`}
                  onClick={sendCompletion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn--secondary ui-btn--xs"
                >
                  <Send size={14} aria-hidden="true" />{L('رابط تكملة البيانات', 'Send form link')}
                </a>
              )}
            </div>
          </div>
        )}
        {sellerPhotos.length > 0 && (
          <div className="crm-ld__photos-preview" style={{ marginTop: '12px' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--ui-text-3)', display: 'block', marginBottom: '6px' }}>
              📸 {isAr ? `صور العقار المرفوعة (${sellerPhotos.length})` : `Uploaded photos (${sellerPhotos.length})`}:
            </span>
            <ul className="crm-ld__photos">
              {sellerPhotos.map((photo, pIdx) => (
                <li key={photo.url || pIdx}>
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    <img src={photo.url} alt={photo.label || 'صورة العقار'} loading="lazy" />
                    {photo.label && <span>{photo.label}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {words && <p className="cf-words"><small>{L('كتب بنفسه', 'In his words')}</small>{words}</p>}
      </section>

      <ClientRequestsCard lead={lead} allLeads={allLeads} isAr={isAr} />

      {lead?.status === 'closed' && <ReviewRequestCard lead={lead} egWhatsapp={egWhatsapp} googleUrl={siteSettings.reviews?.googleUrl || ''} isAr={isAr} onUpdateLead={onUpdateLead} />}

      {/* 1. What to do next, and what just happened */}
      <LeadTasks lead={lead} isAr={isAr} triggerToast={triggerToast} onUpdateLead={onUpdateLead} title={L('الخطوة الجاية', 'Next step')} activeRole={activeRole} />

      <section className="crm-ld__block" aria-labelledby="crm-ld-call">
        <h3 id="crm-ld-call" className="crm-ld__h"><Phone size={16} aria-hidden="true" />{L('حصل إيه؟', 'What happened?')}</h3>
        <p className="crm-ld__hint">
          {L('سجّل نتيجة التواصل أو حدّد الخطوة القادمة لتحديث مسار العميل بسلاسة.', 'Log the activity outcome or next step to update stage smoothly.')}
          {attempts > 0 && ` ${L(`آخر ${attempts} محاولة بلا رد.`, `${attempts} tries without an answer.`)}`}
        </p>
        <div className="crm-ld__row">
          {stageOutcomes.map((o) => {
            const label = isSeller && isAr && SELLER_OUTCOME_LABELS[o.id] ? SELLER_OUTCOME_LABELS[o.id] : (isAr ? o.ar : o.id);
            return (
              <Button
                key={o.id}
                variant="secondary"
                size="sm"
                onClick={() => (o.kind === 'negative' ? (setPendingNeg(o.id), setNegReason('')) : handleLogCall(o.id))}
              >
                {label}
              </Button>
            );
          })}
        </div>
        {lastOutMeta && (
          <div className={`crm-ld__last is-${lastOutMeta.kind}`}>
            <span>{L('آخر نتيجة', 'Last result')}: <b>{(isSeller && isAr && SELLER_OUTCOME_LABELS[lastOut.id]) ? SELLER_OUTCOME_LABELS[lastOut.id] : lastOutMeta.ar}{lastOut.id === 'no_answer' && attempts > 0 ? ` · ${L(`محاولة ${attempts}`, `try ${attempts}`)}` : ''}</b></span>
            <small>{agoText(lastOut.at)}</small>
          </div>
        )}
        {lastOut && (lastOut.id === 'no_answer' || lastOut.id === 'callback') && (
          <div className="crm-ld__followup">
            <span>{L('عملت إيه بعدها؟', 'What did you do after?')}</span>
            <div className="crm-ld__row">
              {FOLLOW_UP_ACTIONS.map((a) => (
                <Button key={a.id} variant="ghost" size="sm" onClick={() => logFollowUp(a)}>{L(a.ar, a.en)}</Button>
              ))}
            </div>
          </div>
        )}
        {lastOut && lastOut.id === 'not_fit' && lead?.status !== 'lost' && lead?.status !== 'inactive' && (
          <div className="crm-ld__followup">
            <span>{L('العقار غير مناسب — الإجراء المقترح:', 'Not a fit — Suggested action:')}</span>
            <div className="crm-ld__row">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onUpdateLead?.(lead.id, {
                    status: 'lost',
                    lostReason: 'not_interested',
                    lostNote: 'غير مناسب / صرف نظر',
                    lostAt: new Date().toISOString()
                  }, lead.version);
                  triggerToast?.(L('تم نقل العميل إلى مرحلة خسارة', 'Moved to lost'), 'info');
                }}
              >
                {L('نقل إلى خسارة', 'Move to lost')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onUpdateLead?.(lead.id, {
                    status: 'inactive',
                    lastActivityAt: new Date().toISOString()
                  }, lead.version);
                  triggerToast?.(L('تم نقل العميل إلى غير متفاعل', 'Moved to inactive'), 'info');
                }}
              >
                {L('نقل إلى غير متفاعل', 'Move to inactive')}
              </Button>
            </div>
          </div>
        )}
        {pendingNeg && (
          <form
            className="crm-ld__form"
            onSubmit={(e) => { e.preventDefault(); if (!negReason) return; handleLogCall(pendingNeg, { reason: negReason, lose: true }); setPendingNeg(''); setNegReason(''); }}
          >
            <Select
              label={`${OUTCOMES.find((o) => o.id === pendingNeg)?.ar}: ${L('السبب', 'reason')}`}
              required
              value={negReason}
              onChange={(e) => setNegReason(e.target.value)}
              placeholder={L('اختار السبب', 'Choose a reason')}
              options={lostReasonsFor(lead).map((r) => ({ value: r.id, label: r.ar }))}
            />
            <div className="crm-ld__row">
              <Button type="submit" size="sm" disabled={!negReason}>{L('سجّل وانقله لخسارة', 'Log and mark as lost')}</Button>
              <Button type="button" variant="secondary" size="sm" disabled={!negReason} onClick={() => { handleLogCall(pendingNeg, { reason: negReason }); setPendingNeg(''); setNegReason(''); }}>{L('سجّل وسيبه في مرحلته', 'Log only')}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setPendingNeg(''); setNegReason(''); }}>{L('إلغاء', 'Cancel')}</Button>
            </div>
          </form>
        )}
      </section>

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

      {/* 📋 Field Inspection & Valuation Block */}
      <section className="crm-ld__block crm-ld__block--info" aria-labelledby="crm-ld-inspection" style={{ borderRight: '3px solid #D4AF37' }}>
        <div className="crm-ld__block-head">
          <h3 id="crm-ld-inspection" className="crm-ld__h" style={{ color: '#0B1C36', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} aria-hidden="true" style={{ color: '#D4AF37' }} />
            {L('الفحص الميداني والتثمين', 'Field Inspection & Valuation')}
          </h3>
          {lead.siteVisitReport ? (
            <Badge tone="accent">{L('تقرير معتمد ✅', 'Report Approved')}</Badge>
          ) : (
            <Badge tone="muted">{L('بانتظار المعاينة', 'Pending Viewing')}</Badge>
          )}
        </div>
        {lead.siteVisitReport ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', flexWrap: 'wrap', gap: '4px' }}>
              <span>{L('سعر المتر الميداني:', 'Price/sqm:')} <strong>{Number(lead.siteVisitReport.valuation?.askingPerSqm || 0).toLocaleString('en-US')} ج.م/م²</strong></span>
              <span style={{ fontWeight: 600 }}>{lead.siteVisitReport.valuation?.valuationText}</span>
            </div>
            {lead.siteVisitReport.gps?.lat && (
              <span style={{ fontSize: '12px', color: '#047857', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} /> {L('موقع GPS موثق', 'Verified GPS')} ({lead.siteVisitReport.gps.lat}, {lead.siteVisitReport.gps.lng})
              </span>
            )}
            <div className="crm-ld__row" style={{ marginTop: '6px' }}>
              <Button variant="secondary" size="sm" icon={<FileText size={14} />} onClick={onOpenInspection}>
                {L('عرض وتعديل تقرير الفحص 📋', 'View / Edit Inspection Report')}
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
              {L('سجّل فحص المرافق، الحالة الإنشائية، سند الملكية وتثمين 1Line الميداني واجتياز شروط مرحلة المعاينة.', 'Record utilities, structure, deed clearance, and 1Line valuation.')}
            </p>
            <div className="crm-ld__row">
              <Button variant="primary" size="sm" icon={<FileText size={14} />} onClick={onOpenInspection}>
                {L('فتح استمارة الفحص الميداني والتثمين 📋', 'Open Field Inspection Form')}
              </Button>
            </div>
          </div>
        )}
      </section>
      </>
      )}

      {view === 'client' && (
      <>
      {/* 2. What he asked for */}
      {(isSeller || matchFacts.length > 0 || words) && (
        <section className="crm-ld__block" aria-labelledby="crm-ld-seller">
          <div className="crm-ld__block-head">
            <h3 id="crm-ld-seller" className="crm-ld__h">
              {isSeller ? <Building size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
              {isSeller ? L('العقار المعروض للبيع', 'Property for sale') : L('طلب العميل', 'What he asked for')}
            </h3>
            {isSeller && sellerRole && <Badge tone={sellerRole === 'broker' ? 'warning' : 'accent'}>{L(`من ${SELLER_ROLE_LABEL[sellerRole].ar}`, `From ${SELLER_ROLE_LABEL[sellerRole].en.toLowerCase()}`)}</Badge>}
          </div>
          {isSeller && isQuick && (
            <p className="crm-ld__hint">{L('طلب سريع: الاسم والرقم ونوع العقار بس. المساحة والعنوان والصور لسه محتاجة منه (ابعتله صفحة «سجّل وحدتك» من «الأدوات»).', 'Quick request: name, phone and type only. Size, address and photos are still to collect (send the listing page from Tools).')}</p>
          )}
          {isSeller && missing.length > 0 && (
            <div className="crm-ld__missing">
              <span>{L(`ناقص: ${missing.join('، ')}`, `Missing: ${missing.join(', ')}`)}</span>
              {egWhatsapp && (
                <a
                  href={`https://wa.me/${egWhatsapp}?text=${encodeURIComponent(completeMessage)}`}
                  onClick={sendCompletion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn--secondary ui-btn--sm"
                >
                  <Send size={16} aria-hidden="true" />{L('ابعت له رابط تكملة البيانات', 'Send the form to complete it')}
                </a>
              )}
            </div>
          )}
          {(isSeller ? sellerFacts : matchFacts).length > 0 && (
            <dl className="crm-ld__facts">
              {(isSeller ? sellerFacts : matchFacts).map(([label, value, wide]) => (
                <div key={label} className={wide ? 'crm-ld__fact--wide' : undefined}><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
          )}
          {sellerPhotos.length > 0 && (
          <div className="crm-ld__photos-preview" style={{ marginTop: '12px' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 600, color: 'var(--ui-text-3)', display: 'block', marginBottom: '6px' }}>
              📸 {isAr ? `صور العقار المرفوعة (${sellerPhotos.length})` : `Uploaded photos (${sellerPhotos.length})`}:
            </span>
            <ul className="crm-ld__photos">
              {sellerPhotos.map((photo, pIdx) => (
                <li key={photo.url || pIdx}>
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    <img src={photo.url} alt={photo.label || 'صورة العقار'} loading="lazy" />
                    {photo.label && <span>{photo.label}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {words && <p className="cf-words"><small>{L('كتب بنفسه', 'In his words')}</small>{words}</p>}
          {isSeller && sellerPhotos.length > 0 && (
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
          {isSeller && onUpdateLead && <SellerAskingPrice key={lead.id} lead={lead} isAr={isAr} onUpdateLead={onUpdateLead} />}
          {isSeller && onConvertToProperty && (
            <Button block icon={<Building size={16} aria-hidden="true" />} onClick={() => onConvertToProperty(lead)}>
              {existingListing ? L('فتح وتعديل العقار المربوط', 'Edit linked listing') : L('اعمل منه مسودة عقار', 'Create a listing draft')}
            </Button>
          )}
        </section>
      )}
      </>
      )}

      {/* 3. Everything that happened */}
      {view === 'history' && (
      <ClientTimeline lead={lead} isAr={isAr} newNote={newNote} setNewNote={setNewNote} onAddNote={onAddNote} />
      )}

      {view === 'client' && (
      <>
      {/* 4. Tools, folded */}
      {sourceFacts.length > 0 && (
        <details className="crm-ld__block crm-ld__fold">
          <summary className="crm-ld__fold-sum"><Compass size={16} aria-hidden="true" />{L('من فين جه؟', 'Where from')}</summary>
          <dl className="crm-ld__facts">
            {sourceFacts.map(([label, value, wide]) => (
              <div key={label} className={wide ? 'crm-ld__fact--wide' : undefined}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </details>
      )}

      <LeadCommissionBox key={lead?.id} lead={lead} isAr={isAr} onUpdateLead={onUpdateLead} />
      </>
      )}

      {view === 'work' && (
        <div className="crm-ld__tools">
          <h3 className="crm-ld__tools-h">{L('إرسال وحجز', 'Send & book')}</h3>
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
      )}
    </div>
  );
}
