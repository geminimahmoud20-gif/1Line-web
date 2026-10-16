import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Phone, MessageSquare, Building, ChevronRight, ChevronLeft, Trash2, Plus, Eye } from 'lucide-react';
import { SOHAG_AREAS, PROPERTY_TYPES } from '../../data/propertiesData';
import { trackEvent } from '../../utils/visitorTracker';
import LeadDrawerOverview from './lead-profile/LeadDrawerOverview';
import LeadDrawerMatching from './lead-profile/LeadDrawerMatching';
import LostReasonModal from './LostReasonModal';
import { validateStageTransition } from '../../services/stateMachineEngine';
import StageDeliverableModal from './StageDeliverableModal';
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';
import { leadScore, LEAD_SCORE_HIGH } from '../../utils/crmLeadViews';
import { rankAndNominateProperties } from '../../services/matchingEngineV2';
import { Drawer, Button, IconButton, Badge, Chip, Tabs, Textarea, EmptyState, useConfirm } from '../ui';
import './lead-drawer.css';

// One history line: "[stamp]: text", older lines start with an emoji and can carry "undefined" from missing form fields
function parseNoteLine(line) {
  const clean = line
    .replace(/^(?:\u{1F4DE}|\u{1F4DD}|\u{1F4CD}|\u{2705}|\u{26A0}\u{FE0F}?|\s)+/u, '')
    .replace(/في\s+(undefined|null)\b/gi, 'في سوهاج')
    .replace(/\b(undefined|null)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!clean) return null;
  const m = clean.match(/^\[([^\]]+)\]:?\s*(.*)$/);
  return m ? { meta: m[1], text: m[2] || m[1] } : { meta: '', text: clean };
}
export default function LeadQuickDrawer({
  lead,
  onClose,
  onUpdateLead,
  onDeleteLead,
  onConvertToProperty,
  onOpenFullProfile,
  properties = [],
  filteredLeads = [],
  isAr = true,
  triggerToast,
  activeRole = 'super_admin'
}) {
  const [newNote, setNewNote] = useState('');
  const [selectedViewingPropId, setSelectedViewingPropId] = useState('');
  const [viewingDateTime, setViewingDateTime] = useState('');
  const [showViewingForm, setShowViewingForm] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [blockerModal, setBlockerModal] = useState({ isOpen: false, blockerInfo: null });
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'matching' | 'timeline'
  const confirm = useConfirm();

  // Dirty State (Unsaved Changes) Protection
  const hasUnsavedChanges = Boolean(newNote.trim() || (showViewingForm && (viewingDateTime || selectedViewingPropId)));

  const safeClose = useCallback(async () => {
    if (hasUnsavedChanges) {
      const discard = await confirm({
        title: isAr ? 'تقفل من غير ما تحفظ؟' : 'Close without saving?',
        message: isAr ? 'الملاحظة أو موعد المعاينة اللي كتبته هيضيع.' : 'The note or viewing you typed will be lost.',
        confirmLabel: isAr ? 'اقفل وامسحها' : 'Discard and close'
      });
      if (!discard) return;
    }
    onClose();
  }, [hasUnsavedChanges, isAr, onClose, confirm]);

  // The phone's back gesture closes the drawer instead of leaving the CRM (Esc is handled by the Drawer)
  // Runs once per opening: it used to re-run whenever safeClose changed (every update to the lead),
  // and its cleanup's history.back() fired a popstate that the next run took as "close", so logging
  // a call, changing the stage or saving anything closed the drawer.
  const isOpen = Boolean(lead);
  const safeCloseRef = useRef(safeClose);
  useEffect(() => { safeCloseRef.current = safeClose; }, [safeClose]);
  useEffect(() => {
    if (!isOpen) return undefined;
    window.history.pushState({ modalOpen: true }, '');
    const handlePopState = () => { safeCloseRef.current(); };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modalOpen) {
        window.history.back();
      }
    };
  }, [isOpen]);

  // The same ranking the "matches" tab shows, so the tab count and the list agree
  const matchingResult = useMemo(
    () => (lead ? rankAndNominateProperties(lead, properties) : { matches: [] }),
    [lead, properties]
  );

  // Every hook above runs on each render; the early return must stay after them (React rules of hooks)
  if (!lead) return null;

  // Next / Prev lead navigation index
  const currentIndex = filteredLeads.findIndex(l => l.id === lead.id);
  const prevLead = currentIndex > 0 ? filteredLeads[currentIndex - 1] : null;
  const nextLead = currentIndex < filteredLeads.length - 1 ? filteredLeads[currentIndex + 1] : null;

  const cleanPhone = (lead.phone || '').replace(/[^0-9+]/g, '');
  // Masked numbers (010****78) are shown as text only: no call / WhatsApp link to a broken number
  const hasRealPhone = Boolean(lead.phone || lead.whatsapp) && !/\*/.test(`${lead.phone || ''}${lead.whatsapp || ''}`);
  const cleanWhatsapp = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
  const egWhatsapp = cleanWhatsapp.startsWith('0') ? `2${cleanWhatsapp}` : (cleanWhatsapp.startsWith('20') ? cleanWhatsapp : `20${cleanWhatsapp}`);

  // Stage Pipeline Steps
  const stages = [
    { id: 'new', label_ar: 'جديد', label_en: 'New', tone: 'info' },
    { id: 'contacted', label_ar: 'اتصلنا', label_en: 'Contacted', tone: 'primary' },
    { id: 'site_visit', label_ar: 'معاينة', label_en: 'Viewing', tone: 'warning' },
    { id: 'negotiating', label_ar: 'تفاوض', label_en: 'Negotiating', tone: 'warning' },
    { id: 'closing', label_ar: 'توقيع وحجز', label_en: 'Closing', tone: 'success' },
    { id: 'closed', label_ar: 'صفقة ناجحة', label_en: 'Closed', tone: 'success' },
    { id: 'lost', label_ar: 'خسرانة', label_en: 'Lost', tone: 'danger' }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === (lead.status || 'new'));

  const handleUpdateStatus = (newStatus, lostFields) => {
    if (!onUpdateLead) return;
    // A lost deal needs a reason first
    if (newStatus === 'lost' && !lostFields) { setLostOpen(true); return; }

    const validation = validateStageTransition(lead, newStatus, {
      userRole: activeRole,
      lostReason: lostFields?.lostReason || (newStatus === 'lost' ? lostFields?.reason : undefined),
      isFounderApproved: lead.isFounderApproved || activeRole === 'super_admin'
    });

    if (!validation.allowed) {
      setBlockerModal({ isOpen: true, blockerInfo: validation });
      triggerToast?.(validation.missingDeliverable, 'error');
      return;
    }

    const stageObj = stages.find(s => s.id === newStatus);
    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const noteEntry = `[${timeStr}] تم تحديث المرحلة إلى: "${isAr ? stageObj?.label_ar : stageObj?.label_en}"`;
    const updatedNotes = lead.notes ? `${noteEntry}\n${lead.notes}` : noteEntry;

    const updates = {
      status: newStatus,
      ...(newStatus === 'lost' ? { ...lostFields, lostAt: new Date().toISOString() } : (lead.status === 'lost' ? { lostReason: null, lostNote: null, lostAt: null } : {})),
      notes: updatedNotes,
      lastActivityAt: new Date().toISOString()
    };

    if (validation.nextTask) {
      updates.latestHandoffTask = validation.nextTask;
    }

    onUpdateLead(lead.id, updates, lead.version);

    triggerToast?.(isAr ? `تم تحديث مرحلة العميل إلى "${stageObj?.label_ar}"` : `Stage updated to ${stageObj?.label_en}`, 'success');
  };

  // Quick Call Outcome Logger
  const handleLogCall = (outcome) => {
    if (!onUpdateLead) return;
    const dateStr = new Date().toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US');
    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const callEntry = `[مكالمة ${dateStr} ${timeStr}]: ${outcome}`;
    const updatedNotes = lead.notes ? `${callEntry}\n${lead.notes}` : callEntry;

    const nextStatus = outcome.includes('معاينة') ? 'site_visit' : (lead.status === 'new' ? 'contacted' : lead.status);

    onUpdateLead(lead.id, {
      notes: updatedNotes,
      status: nextStatus,
      lastContactedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    }, lead.version);

    triggerToast?.(isAr ? `تم تسجيل المكالمة: "${outcome}"` : `Call logged: ${outcome}`, 'success');
    trackEvent('crm_call_logged', { leadId: lead.id, outcome });
  };

  // Add Custom Note
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim() || !onUpdateLead) return;
    const dateStr = new Date().toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US');
    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const noteEntry = `[ملاحظة ${dateStr} ${timeStr}]: ${newNote.trim()}`;
    const updatedNotes = lead.notes ? `${noteEntry}\n${lead.notes}` : noteEntry;

    onUpdateLead(lead.id, {
      notes: updatedNotes,
      lastActivityAt: new Date().toISOString()
    }, lead.version);

    setNewNote('');
    triggerToast?.(isAr ? 'تمت إضافة الملاحظة بنجاح' : 'Note added', 'success');
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: isAr ? `حذف ${lead.name || 'العميل'}؟` : `Delete ${lead.name || 'this lead'}?`,
      message: isAr ? 'العميل وسجله هيتمسحوا ومش هتقدر ترجّعهم.' : 'The lead and its history are removed for good.',
      confirmLabel: isAr ? 'احذف العميل' : 'Delete lead'
    });
    if (!ok) return;
    onDeleteLead(lead.id);
    onClose();
  };

  // Schedule Viewing Action
  const handleScheduleViewing = (e) => {
    e.preventDefault();
    if (!selectedViewingPropId || !viewingDateTime || !onUpdateLead) {
      triggerToast?.(isAr ? 'يرجى اختيار العقار وموعد المعاينة' : 'Please select property & date', 'error');
      return;
    }
    const matchedProp = properties.find(p => p.id === selectedViewingPropId);
    const dateFormatted = new Date(viewingDateTime).toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-US');
    const viewingEntry = `[معاينة مجدولة ${dateFormatted}]: عقار ${matchedProp?.id} — ${matchedProp?.title_ar || matchedProp?.title_en}`;
    const updatedNotes = lead.notes ? `${viewingEntry}\n${lead.notes}` : viewingEntry;

    onUpdateLead(lead.id, {
      status: 'site_visit',
      nextFollowUpAt: new Date(viewingDateTime).toISOString(),
      notes: updatedNotes,
      viewingPropertyId: selectedViewingPropId,
      lastActivityAt: new Date().toISOString()
    }, lead.version);

    setShowViewingForm(false);
    triggerToast?.(isAr ? 'تمت جدولة المعاينة بنجاح وتحديث موعد المتابعة' : 'Viewing scheduled successfully', 'success');
    trackEvent('crm_viewing_scheduled', { leadId: lead.id, propertyId: selectedViewingPropId });
  };

  const rawLeadArea = lead.area || lead.details?.area;
  const leadArea = (!rawLeadArea || rawLeadArea === 'undefined' || rawLeadArea === 'null') ? 'سوهاج' : rawLeadArea;
  const areaName = SOHAG_AREAS.find(a => a.id === leadArea)?.name_ar || (leadArea === 'undefined' ? 'سوهاج' : leadArea);
  const rawPropType = lead.propertyType || lead.details?.propertyType;
  const propType = (!rawPropType || rawPropType === 'undefined' || rawPropType === 'null') ? 'عقار' : rawPropType;
  const propTypeName = PROPERTY_TYPES.find(p => p.id === propType)?.name_ar || (propType === 'undefined' ? 'عقار' : propType);

  const isSeller = lead.type === 'seller' || lead.landingPage === '/sell' || Boolean(lead.details?.askingPrice);
  const isViewingRequest = lead.type === 'viewing_request' || lead.type === 'visit' || Boolean(lead.details?.visitDate) || Boolean(lead.viewingPropertyId);

  let whatsappTemplates;

  if (isSeller) {
    whatsappTemplates = [
      {
        title: isAr ? 'متابعة تقييم العقار وتأكيد المعاينة' : 'Valuation & Inspection Follow-up',
        msg: `أهلاً بك أستاذ ${lead.name}، معك استشاري الإدراج والتقييم من شركة 1Line بسوهاج. نراجع بيانات عرض بيع عقاركم في ${areaName} بمساحة ${lead.details?.size || ''}م². يسعدنا تحديد موعد لزيارة الوحدة ومعاينتها وتصويرها رسمياً لبدء تسويقها للعملاء المشترين.`
      },
      {
        title: isAr ? 'إبلاغ بمطابقات مشترين جاهزين' : 'Buyer Matches Alert',
        msg: `أستاذ ${lead.name} المحترم، لدينا مشترون مسجلون يبحثون عن ${propTypeName} في ${areaName} بميزانيات مطابقة لعقاركم المعروض. نود تأكيد تفاصيل الوحدة والسعر المطلوب لعرضها عليهم فوراً.`
      },
      {
        title: isAr ? 'طلب استكمال مستندات أو صور' : 'Documents & Photos Request',
        msg: `تحياتنا أستاذ ${lead.name}، لاستكمال ملف تسويق عقاركم ورفعه في المعرض المعتمد على منصة 1Line، هل يمكن إرسال صور إضافية واضحة للوحدة والموقف القانوني عبر واتساب؟`
      }
    ];
  } else if (isViewingRequest) {
    whatsappTemplates = [
      {
        title: isAr ? 'تأكيد موعد المعاينة وإرسال اللوكيشن' : 'Confirm Viewing & Location',
        msg: `أهلاً بك أستاذ ${lead.name}، بخصوص طلب معاينة العقار في ${areaName}، يسعدنا تأكيد الموعد المناسب لحضرتك. مستشارك العقاري سيكون بانتظارك في الموقع، ونرسل لحضرتك اللوكيشن وتفاصيل النقطة المحددة.`
      },
      {
        title: isAr ? 'اقتراح موعد بديل للمعاينة' : 'Reschedule / Alternative Slot',
        msg: `مرحباً أستاذ ${lead.name}، نتواصل معك بخصوص معاينة ${propTypeName} في ${areaName}. هل يناسبك ترتيب موعد غداً أو في نهاية الأسبوع في الفترة الصباحية أم المسائية؟`
      },
      {
        title: isAr ? 'إرسال بروشور وتفاصيل الوحدة' : 'Send Brochure & Specs',
        msg: `تحياتنا أستاذ ${lead.name}، تجد مرفقاً كافة تفاصيل ومواصفات العقار الذي طلبت معاينته في ${areaName} مع خطة الأسعار وطرق السداد المتاحة.`
      }
    ];
  } else {
    whatsappTemplates = [
      {
        title: isAr ? 'ترحيب واستكشاف الاحتياج' : 'Welcome & Discovery',
        msg: `أهلاً بك أستاذ ${lead.name}، معك فريق 1Line Solutions للاستشارات العقارية بسوهاج. نتابع طلبك بخصوص ${propTypeName} في منطقة ${areaName}. هل يناسبك اتصال سريع لمناقشة أفضل الخيارات المتاحة حالياً؟`
      },
      {
        title: isAr ? 'دعوة لمعاينة ميدانية' : 'Viewing Invite',
        msg: `أستاذ ${lead.name} العزيز، تم تجهيز قائمة وحدات مميزة ومفحوصة قانونياً ومطابقة لطلبك في ${areaName}. يسعدنا ترتيب موعد معاينة ميدانية بصحبة مستشارك العقاري في الموعد الذي يناسبك.`
      },
      {
        title: isAr ? 'عروض وتسهيلات سداد' : 'Financing & Offers',
        msg: `تحياتنا أستاذ ${lead.name}، لدينا وحدات في ${areaName} يقبل أصحابها التفاوض على طريقة السداد. شروط السداد يتم الاتفاق عليها مع المالك كتابياً، وتقدر تستعرض التفاصيل معنا.`
      }
    ];
  }

  const score = leadScore(lead);
  const currentStage = stages[currentStageIndex] || stages[0];
  const temperature = { hot: { ar: 'ساخن', en: 'Hot', tone: 'danger' }, warm: { ar: 'دافئ', en: 'Warm', tone: 'warning' }, cold: { ar: 'بارد', en: 'Cold', tone: 'info' } }[lead.temperature];
  const phoneText = formatPhoneNumber(lead.phone || lead.whatsapp) || '—';
  const timeline = (lead.notes || '').split('\n').map(parseNoteLine).filter(Boolean);

  return (
    <>
      <Drawer
        open
        onClose={safeClose}
        title={lead.name || (isAr ? 'عميل بدون اسم' : 'Unnamed client')}
        description={[lead.source, lead.assignedTo && lead.assignedTo !== 'Unassigned' ? (isAr ? `مع ${lead.assignedTo}` : `With ${lead.assignedTo}`) : null].filter(Boolean).join(' · ') || null}
        closeLabel={isAr ? 'إغلاق' : 'Close'}
        headerActions={(
          <div className="crm-ld__nav">
            <IconButton
              size="sm"
              label={prevLead ? `${isAr ? 'العميل السابق' : 'Previous'}: ${prevLead.name || ''}` : (isAr ? 'العميل السابق' : 'Previous')}
              icon={isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              disabled={!prevLead}
              onClick={() => prevLead && onOpenFullProfile?.(prevLead)}
            />
            <span className="crm-ld__counter" dir="ltr">{currentIndex + 1} / {filteredLeads.length || 1}</span>
            <IconButton
              size="sm"
              label={nextLead ? `${isAr ? 'العميل التالي' : 'Next'}: ${nextLead.name || ''}` : (isAr ? 'العميل التالي' : 'Next')}
              icon={isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              disabled={!nextLead}
              onClick={() => nextLead && onOpenFullProfile?.(nextLead)}
            />
          </div>
        )}
        footer={(
          <>
            {activeRole === 'super_admin' && onDeleteLead && (
              <Button variant="ghost" size="sm" className="crm-ld__delete" icon={<Trash2 size={16} aria-hidden="true" />} onClick={handleDelete}>
                {isAr ? 'حذف' : 'Delete'}
              </Button>
            )}
            {onConvertToProperty && (
              <Button variant="secondary" size="sm" icon={<Building size={16} aria-hidden="true" />} onClick={() => onConvertToProperty(lead)}>
                {isAr ? 'حوّله لعقار' : 'To listing'}
              </Button>
            )}
            <Button size="sm" icon={<Eye size={16} aria-hidden="true" />} onClick={() => onOpenFullProfile?.(lead)}>
              {isAr ? 'ملف العميل' : 'Client profile'}
            </Button>
          </>
        )}
      >
        <div className="crm-ld">
          <section className="crm-ld__summary" aria-label={isAr ? 'ملخص العميل' : 'Client summary'}>
            <div className="crm-ld__contact">
              <span className="crm-ld__phone"><Phone size={14} aria-hidden="true" /><bdi dir="ltr">{phoneText}</bdi></span>
              <Badge tone={score.score >= LEAD_SCORE_HIGH ? 'success' : 'warning'} title={score.reasons.join(' • ')}>
                {isAr ? `اهتمام ${score.score}%` : `Score ${score.score}%`}
              </Badge>
              {temperature && <Badge tone={temperature.tone} dot>{isAr ? temperature.ar : temperature.en}</Badge>}
            </div>
            {hasRealPhone && (
              <div className="crm-ld__quick">
                <a href={`tel:${cleanPhone}`} className="ui-btn ui-btn--secondary ui-btn--sm">
                  <Phone size={16} aria-hidden="true" />{isAr ? 'اتصال' : 'Call'}
                </a>
                <a href={`https://wa.me/${egWhatsapp}`} target="_blank" rel="noopener noreferrer" className="ui-btn ui-btn--secondary ui-btn--sm">
                  <MessageSquare size={16} aria-hidden="true" />{isAr ? 'واتساب' : 'WhatsApp'}
                </a>
              </div>
            )}
          </section>

          <section className="crm-ld__stage" aria-labelledby="crm-ld-stage">
            <div className="crm-ld__stage-head">
              <h3 id="crm-ld-stage" className="crm-ld__h">{isAr ? 'المرحلة' : 'Stage'}</h3>
              <Badge tone={currentStage.tone}>{isAr ? currentStage.label_ar : currentStage.label_en}</Badge>
            </div>
            <div className="crm-ld__stages">
              {stages.slice(0, 6).map((st) => (
                <Chip key={st.id} pressed={(lead.status || 'new') === st.id} onClick={() => handleUpdateStatus(st.id)}>
                  {isAr ? st.label_ar : st.label_en}
                </Chip>
              ))}
              <Chip className="crm-ld__lost" pressed={lead.status === 'lost'} onClick={() => handleUpdateStatus('lost')}>
                {isAr ? 'خسرانة' : 'Lost'}
              </Chip>
            </div>
          </section>

          <Tabs
            label={isAr ? 'أقسام ملف العميل' : 'Client sections'}
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { id: 'overview', label: isAr ? 'المتابعة' : 'Follow-up' },
              { id: 'matching', label: isAr ? 'العقارات المناسبة' : 'Matches', count: matchingResult.matches.length },
              { id: 'timeline', label: isAr ? 'السجل' : 'History', count: timeline.length || null }
            ]}
          />

          {activeTab === 'overview' && (
            <LeadDrawerOverview
              lead={lead}
              egWhatsapp={hasRealPhone ? egWhatsapp : ''}
              handleLogCall={handleLogCall}
              handleScheduleViewing={handleScheduleViewing}
              isAr={isAr}
              onConvertToProperty={onConvertToProperty}
              properties={properties}
              selectedViewingPropId={selectedViewingPropId}
              setSelectedViewingPropId={setSelectedViewingPropId}
              setShowViewingForm={setShowViewingForm}
              setViewingDateTime={setViewingDateTime}
              showViewingForm={showViewingForm}
              viewingDateTime={viewingDateTime}
              whatsappTemplates={whatsappTemplates}
              onUpdateLead={onUpdateLead}
            />
          )}

          {activeTab === 'matching' && (
            <LeadDrawerMatching
              areaName={areaName}
              egWhatsapp={hasRealPhone ? egWhatsapp : ''}
              isAr={isAr}
              lead={lead}
              matchingResult={matchingResult}
              properties={properties}
              onUpdateLead={onUpdateLead}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === 'timeline' && (
            <div className="crm-ld__timeline">
              <form onSubmit={handleAddNote} className="crm-ld__note-form">
                <Textarea
                  label={isAr ? 'ملاحظة جديدة' : 'New note'}
                  rows={2}
                  placeholder={isAr ? 'نتيجة مكالمة، طلب جديد من العميل...' : 'Call result, new request...'}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <Button type="submit" size="sm" icon={<Plus size={16} aria-hidden="true" />} disabled={!newNote.trim()}>
                  {isAr ? 'أضف للسجل' : 'Add to history'}
                </Button>
              </form>
              {timeline.length === 0 ? (
                <EmptyState title={isAr ? 'لسه مفيش ملاحظات' : 'No notes yet'} description={isAr ? 'أي مكالمة أو ملاحظة بتسجّلها هتظهر هنا.' : 'Calls and notes you log show up here.'} />
              ) : (
                <ol className="crm-ld__events">
                  {timeline.map((ev, i) => (
                    <li key={i}>
                      {ev.meta && <span className="crm-ld__event-meta">{ev.meta}</span>}
                      <span className="crm-ld__event-text">{ev.text}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      </Drawer>
      {lostOpen && (
        <LostReasonModal
          lead={lead}
          isAr={isAr}
          onCancel={() => setLostOpen(false)}
          onConfirm={(fields) => { setLostOpen(false); handleUpdateStatus('lost', fields); }}
        />
      )}
      <StageDeliverableModal
        isOpen={blockerModal.isOpen}
        onClose={() => setBlockerModal({ isOpen: false, blockerInfo: null })}
        blockerInfo={blockerModal.blockerInfo}
        lead={lead}
        onOpenDeliverableAction={() => {
          setBlockerModal({ isOpen: false, blockerInfo: null });
          setActiveTab('overview');
        }}
      />
    </>
  );
}
