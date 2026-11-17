import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Phone, MessageSquare, Building, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { getAreas } from '../../utils/areasData';
import { areaNameOf } from '../../utils/areaLookup';
import { trackEvent } from '../../utils/visitorTracker';
import LeadDrawerOverview from './lead-profile/LeadDrawerOverview';
import LeadDrawerMatching from './lead-profile/LeadDrawerMatching';
import LeadDrawerBuyers from './lead-profile/LeadDrawerBuyers';
import { boardStagesFor, buyersForSeller } from '../../utils/leadPipeline';
import { boardColumnOf } from '../../utils/dealStages';
import LostReasonModal from './LostReasonModal';
import { validateStageTransition } from '../../services/stateMachineEngine';
import StageDeliverableModal from './StageDeliverableModal';
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';
import { auditContactUse } from '../../utils/contactAudit';
import { leadScore, LEAD_SCORE_HIGH, isSellerLead, firstContactPatch } from '../../utils/crmLeadViews';
import { outcomeEntry, outcomeSave, outcomeById, guardStage } from '../../utils/stageGate';
import { useAuth } from '../../context/AuthContext';
import { scheduleNextAttempt } from '../../utils/retryCall';
import { suggestNextStep, SKIP_LOG } from '../../utils/nextStep';
import NextStepSheet from './NextStepSheet';
import { sellerRoleOf, SELLER_ROLE_LABEL } from '../../utils/sellerRole';
import { dueLabel, MAX_CALL_ATTEMPTS } from '../../utils/tasks';
import { sourceText } from '../../utils/crmLabels';
import { rankAndNominateProperties } from '../../services/matchingEngineV2';
import NotesThread from './NotesThread';
import { Drawer, Button, IconButton, Badge, Chip, Tabs, useConfirm } from '../ui';
import ClientDetails from './client-file/ClientDetails';
import ClientJourney from './client-file/ClientJourney';
import { buildTimeline } from '../../utils/clientTimeline';
import './lead-drawer.css';
import BrokerFile from './lead-profile/BrokerFile';
import { brokerUnits, brokerDemands } from '../../utils/brokerFile';

export default function LeadQuickDrawer({
  lead,
  onClose,
  onUpdateLead,
  onDeleteLead,
  onConvertToProperty,
  onNavigate,
  tab: tabProp,
  onTabChange,
  properties = [],
  demands = [],
  filteredLeads = [],
  allLeads = [],
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
  const [localTab, setLocalTab] = useState('overview'); // 'overview' | 'details' | 'matching' | 'team' | 'journey'
  const activeTab = tabProp || localTab;
  const setActiveTab = (t) => { setLocalTab(t); onTabChange?.(t); };
  const confirm = useConfirm();
  const { currentUser } = useAuth();
  const [nextStepFor, setNextStepFor] = useState('');

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

  // An owner selling a unit gets buyers for it, not units to buy (utils/leadPipeline)
  const sellerFile = Boolean(lead) && isSellerLead(lead);
  // The same ranking the "matches" tab shows, so the tab count and the list agree
  const matchingResult = useMemo(
    () => (lead && !sellerFile ? rankAndNominateProperties(lead, properties) : { matches: [] }),
    [lead, sellerFile, properties]
  );
  const sellerBuyers = useMemo(
    () => (lead && sellerFile ? buyersForSeller(lead, allLeads.length ? allLeads : filteredLeads, demands) : []),
    [lead, sellerFile, allLeads, filteredLeads, demands]
  );

  // «ملف الوسيط»: for brokers, and for anyone who brought units or requests
  const brokerCount = useMemo(
    () => (lead ? brokerUnits(lead, properties).length + brokerDemands(lead, demands).length : 0),
    [lead, properties, demands]
  );
  const showBrokerFile = Boolean(lead) && (lead.type === 'broker' || brokerCount > 0);

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
  // A buyer's or an owner's stages (same ids, different names and rules)
  const STAGE_TONES = { new: 'info', contacted: 'primary', site_visit: 'warning', negotiating: 'warning', closed: 'success', inactive: 'neutral', lost: 'danger' };
  const stages = boardStagesFor(lead).map((st) => ({ ...st, tone: STAGE_TONES[st.id] }));

  // The old «توقيع وحجز» step sits in the «إغلاق» chip (boardColumnOf)
  const currentColumn = boardColumnOf(lead.status);

  const handleUpdateStatus = (newStatus, lostFields) => {
    if (!onUpdateLead) return;
    // The stage lock: log what happened first (and only a manager goes back a stage)
    if (!guardStage(lead, { status: newStatus, ...(newStatus === 'lost' ? { lostReason: lostFields?.lostReason || 'pending' } : {}) }, { role: activeRole, toast: triggerToast })) return;
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

  // Tapping call or WhatsApp counts as the first reply: the "no reply" clock stops without a manual log
  const markContacted = (channel) => {
    auditContactUse(lead, channel);
    const patch = firstContactPatch(lead);
    if (patch && onUpdateLead) onUpdateLead(lead.id, patch, lead.version);
  };

  // Activity outcome (utils/stageGate): one tap logs what happened. The stage lock reads it, a negative one carries
  // its reason, «لم يرد» counts the attempts, and a positive one moves a brand-new client to «مؤهل».
  const handleLogCall = (outcomeId, extra = {}) => {
    if (!onUpdateLead) return;
    const me = { uid: currentUser?.uid, name: currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || '' };
    const entry = outcomeEntry(outcomeId, me, extra);
    if (!entry) {
      triggerToast?.(isAr ? 'النتيجة السلبية لازم يتسجّل معاها السبب.' : 'A negative outcome needs a reason.', 'error');
      return;
    }
    const patch = outcomeSave(lead, entry);
    const label = outcomeById(outcomeId)?.ar || outcomeId;
    onUpdateLead(lead.id, patch, lead.version);
    triggerToast?.(isAr ? `اتسجّلت النتيجة: ${label}` : `Outcome logged: ${label}`, 'success');
    // «لم يرد»: the next try becomes a task, up to the third; after that the client can move to غير متفاعل
    if (outcomeId === 'no_answer') {
      const attempts = patch.outcomeAttempts;
      scheduleNextAttempt({ id: lead.id, name: lead.name }, attempts, me).then((t) => {
        if (t) triggerToast?.(isAr ? `محاولة ${attempts} من ${MAX_CALL_ATTEMPTS} بلا رد. اتضافت مهمة المحاولة الجاية: ${dueLabel(t.task, true)}` : `Try ${attempts} of ${MAX_CALL_ATTEMPTS} unanswered; next call added as a task`, 'info');
        else if (attempts >= MAX_CALL_ATTEMPTS) triggerToast?.(isAr ? `${MAX_CALL_ATTEMPTS} محاولات بلا رد. تقدر تنقله «غير متفاعل».` : `${MAX_CALL_ATTEMPTS} tries without an answer: you can mark it unresponsive.`, 'info');
      });
    }
    // every positive/neutral outcome must leave a next step (or a logged «no next step»)
    if (suggestNextStep(outcomeId)) setNextStepFor(outcomeId);
    trackEvent('crm_call_logged', { leadId: lead.id, outcome: outcomeId });
  };

  const skipNextStep = () => {
    const at = new Date().toISOString();
    const who = currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || '';
    onUpdateLead?.(lead.id, {
      activityLogs: [{ timestamp: at, action: SKIP_LOG, kind: 'note', ...(who ? { agent: who } : {}) }, ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])].slice(0, 100)
    }, lead.version);
    setNextStepFor('');
  };

  // Add Custom Note: saved in the activity log, so it has a real time in the client's history
  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim() || !onUpdateLead) return;
    const at = new Date().toISOString();
    const me = currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || '';
    onUpdateLead(lead.id, {
      activityLogs: [{ timestamp: at, action: newNote.trim(), kind: 'note', ...(me ? { agent: me } : {}) }, ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])].slice(0, 100),
      lastActivityAt: at
    }, lead.version);

    setNewNote('');
    triggerToast?.(isAr ? 'اتضافت الملاحظة' : 'Note added', 'success');
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
  // Live list; an id no longer in it shows as «منطقة محذوفة», not a code
  const areaName = !leadArea || leadArea === 'undefined' ? 'سوهاج' : leadArea === 'all' ? 'كل المناطق' : (areaNameOf(leadArea, getAreas()) || 'منطقة محذوفة');
  const rawPropType = lead.propertyType || lead.details?.propertyType;
  const propType = (!rawPropType || rawPropType === 'undefined' || rawPropType === 'null') ? 'عقار' : rawPropType;
  const propTypeName = PROPERTY_TYPES.find(p => p.id === propType)?.name_ar || (propType === 'undefined' ? 'عقار' : propType);

  const isSeller = sellerFile;
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
  const temperature = { hot: { ar: 'ساخن', en: 'Hot', tone: 'danger' }, warm: { ar: 'دافئ', en: 'Warm', tone: 'warning' }, cold: { ar: 'بارد', en: 'Cold', tone: 'info' } }[lead.temperature];
  const phoneText = formatPhoneNumber(lead.phone || lead.whatsapp) || '—';
  // One short line under the name: where it came from, who holds it (the campaign is in «من فين جه؟»)
  const holder = lead.ownerName || lead.claimedBy || (lead.assignedTo && lead.assignedTo !== 'Unassigned' ? lead.assignedTo : '');
  const headerLine = [sourceText(lead.source), holder ? (isAr ? `مع ${holder}` : `With ${holder}`) : null, lead.autoAssigned ? (isAr ? 'توزيع تلقائي' : 'auto-assigned') : null].filter(Boolean).join(' · ');
  const historyCount = buildTimeline(lead).events.length;

  return (
    <>
      <Drawer
        open
        onClose={safeClose}
        title={lead.name || (isAr ? 'عميل بدون اسم' : 'Unnamed client')}
        description={headerLine ? <span className="crm-ld__desc" title={headerLine}>{headerLine}</span> : null}
        closeLabel={isAr ? 'إغلاق' : 'Close'}
        headerActions={(
          <div className="crm-ld__nav">
            <IconButton
              size="sm"
              label={prevLead ? `${isAr ? 'العميل السابق' : 'Previous'}: ${prevLead.name || ''}` : (isAr ? 'العميل السابق' : 'Previous')}
              icon={isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              disabled={!prevLead}
              onClick={() => prevLead && onNavigate?.(prevLead)}
            />
            <span className="crm-ld__counter" dir="ltr">{currentIndex + 1} / {filteredLeads.length || 1}</span>
            <IconButton
              size="sm"
              label={nextLead ? `${isAr ? 'العميل التالي' : 'Next'}: ${nextLead.name || ''}` : (isAr ? 'العميل التالي' : 'Next')}
              icon={isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              disabled={!nextLead}
              onClick={() => nextLead && onNavigate?.(nextLead)}
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
              {isSeller && sellerRoleOf(lead) && (
                <Badge tone={sellerRoleOf(lead) === 'broker' ? 'warning' : 'accent'}>{SELLER_ROLE_LABEL[sellerRoleOf(lead)][isAr ? 'ar' : 'en']}</Badge>
              )}
            </div>
            {hasRealPhone && (
              <div className="crm-ld__quick">
                <a href={`tel:${cleanPhone}`} onClick={() => markContacted('call')} className="ui-btn ui-btn--secondary ui-btn--sm">
                  <Phone size={16} aria-hidden="true" />{isAr ? 'اتصال' : 'Call'}
                </a>
                <a href={`https://wa.me/${egWhatsapp}`} target="_blank" rel="noopener noreferrer" onClick={() => markContacted('whatsapp')} className="ui-btn ui-btn--secondary ui-btn--sm">
                  <MessageSquare size={16} aria-hidden="true" />{isAr ? 'واتساب' : 'WhatsApp'}
                </a>
              </div>
            )}
          </section>

          <section className="crm-ld__stage" aria-labelledby="crm-ld-stage">
            <div className="crm-ld__stage-head">
              <h3 id="crm-ld-stage" className="crm-ld__h">{isAr ? 'المرحلة' : 'Stage'}</h3>
            </div>
            <div className="crm-ld__stages">
              {stages.slice(0, 6).map((st) => (
                <Chip key={st.id} pressed={currentColumn === st.id} onClick={() => handleUpdateStatus(st.id)}>
                  {isAr ? st.label_ar : st.label_en}
                </Chip>
              ))}
              <Chip className="crm-ld__lost" pressed={lead.status === 'lost'} onClick={() => handleUpdateStatus('lost')}>
                {isAr ? 'خسارة' : 'Lost'}
              </Chip>
            </div>
          </section>

          <Tabs
            label={isAr ? 'أقسام ملف العميل' : 'Client sections'}
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { id: 'overview', label: isAr ? 'الملف' : 'File', count: historyCount || null },
              { id: 'details', label: isAr ? 'التفاصيل' : 'Details' },
              sellerFile
                ? { id: 'matching', label: isAr ? 'مشترين مناسبين' : 'Buyers', count: sellerBuyers.length }
                : { id: 'matching', label: isAr ? 'العقارات المناسبة' : 'Matches', count: matchingResult.matches.length },
              ...(showBrokerFile ? [{ id: 'broker', label: isAr ? 'ملف الوسيط' : 'Broker file', count: brokerCount || null }] : []),
              { id: 'team', label: isAr ? 'الفريق' : 'Team' },
              { id: 'journey', label: isAr ? 'رحلة الزائر' : 'Visitor journey' }
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
              triggerToast={triggerToast}
              newNote={newNote}
              setNewNote={setNewNote}
              onAddNote={handleAddNote}
            />
          )}

          {activeTab === 'details' && (
            <ClientDetails key={lead.id} lead={lead} onUpdateLead={onUpdateLead} isAr={isAr} lang={isAr ? 'ar' : 'en'} triggerToast={triggerToast} userRole={activeRole} />
          )}

          {activeTab === 'journey' && <ClientJourney lead={lead} properties={properties} isAr={isAr} />}

          {activeTab === 'matching' && sellerFile && (
            <LeadDrawerBuyers lead={lead} buyers={sellerBuyers} areaName={areaName} propTypeName={propTypeName} isAr={isAr} />
          )}

          {activeTab === 'matching' && !sellerFile && (
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

          {activeTab === 'broker' && showBrokerFile && (
            <BrokerFile lead={lead} properties={properties} demands={demands} />
          )}

          {activeTab === 'team' && (
            <NotesThread entityType="lead" entityId={lead.id} entityName={lead.name || ''} lang={isAr ? 'ar' : 'en'} className="crm-ld__team" />
          )}

        </div>
      </Drawer>
      {nextStepFor && (
        <NextStepSheet
          key={`${lead.id}-${nextStepFor}`}
          lead={lead}
          outcomeId={nextStepFor}
          isAr={isAr}
          me={{ uid: currentUser?.uid, name: currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || '' }}
          onSaved={(t) => { setNextStepFor(''); triggerToast?.(isAr ? `اتضافت الخطوة الجاية: ${t.title} (${dueLabel(t, true)}). هفكّرك قبلها.` : 'Next step saved', 'success'); }}
          onSkip={skipNextStep}
        />
      )}
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
