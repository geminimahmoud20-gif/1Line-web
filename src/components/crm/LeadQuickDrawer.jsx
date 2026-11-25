import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Phone, MessageSquare, Building, ChevronRight, ChevronLeft, Trash2, AlertTriangle, CircleCheckBig, Sparkles, ShieldAlert } from 'lucide-react';
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
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';
import { auditContactUse } from '../../utils/contactAudit';
import { leadScore, LEAD_SCORE_HIGH, isSellerLead, isAccountLead, firstContactPatch, leadBudget, isOpenLead } from '../../utils/crmLeadViews';
import { outcomeEntry, outcomeSave, outcomeById, guardStage } from '../../utils/stageGate';
import { useAuth } from '../../context/AuthContext';
import { scheduleNextAttempt } from '../../utils/retryCall';
import { suggestNextStep, SKIP_LOG } from '../../utils/nextStep';
import NextStepSheet from './NextStepSheet';
import { sellerRoleOf, SELLER_ROLE_LABEL } from '../../utils/sellerRole';
import { dueLabel, MAX_CALL_ATTEMPTS } from '../../utils/tasks';
import { sourceText } from '../../utils/crmLabels';
import { deletePrompt } from '../../utils/deleteConfirm';
import { rankAndNominateProperties } from '../../services/matchingEngineV2';
import { scoreForBuyer } from '../../utils/matchingEngine';
import { liveListings } from '../../utils/marketStats';
import { Drawer, Button, IconButton, Badge, Chip, Tabs, useConfirm } from '../ui';
import ClientDetails from './client-file/ClientDetails';
import ClientJourney from './client-file/ClientJourney';
import ClientTimeline from './client-file/ClientTimeline';
import ClientDocuments from './client-file/ClientDocuments';
import { buildTimeline } from '../../utils/clientTimeline';
import './lead-drawer.css';
import BrokerFile from './lead-profile/BrokerFile';
import { brokerUnits, brokerDemands } from '../../utils/brokerFile';
import { userDisplayName } from '../../utils/assignees';
import LeadTeamPanel from './lead-profile/LeadTeamPanel';
import useTeamMembers from '../../hooks/useTeamMembers';
import PhoneText from './PhoneText';
import { attentionOf, nextStepFor as stepFor } from '../../utils/dealSignals';
import { clientRoleOf, missingFor } from '../../utils/clientRole';
import { ownerMessages } from '../../utils/ownerMessages';
import { stageSinceMs, toMs, daysLabel, shortMoney } from '../../utils/pipelineCards';
import { isActiveListing } from '../../utils/listingDedupe';

const SHORT_STEPPER_LABELS = {
  seller: {
    new: 'جديد',
    contacted: 'مؤهل',
    site_visit: 'معاينة',
    negotiating: 'عروض',
    closed: 'تم البيع'
  },
  buyer: {
    new: 'جديد',
    contacted: 'مؤهل',
    site_visit: 'معاينة',
    negotiating: 'تفاوض',
    closed: 'تم التعاقد'
  }
};

export default function LeadQuickDrawer({
  lead,
  onClose,
  onUpdateLead,
  onDeleteLead,
  canDeleteLeads = false,
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
  activeRole = 'super_admin',
  mayAssignTasks = false
}) {
  const [newNote, setNewNote] = useState('');
  const [selectedViewingPropId, setSelectedViewingPropId] = useState('');
  const [viewingDateTime, setViewingDateTime] = useState('');
  const [showViewingForm, setShowViewingForm] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [localTab, setLocalTab] = useState('work'); // 'work' | 'client' | 'team' | 'history' | 'matching' | 'broker'
  const members = useTeamMembers(allLeads);
  const activeTab = tabProp || localTab;
  const setActiveTab = (t) => { setLocalTab(t); onTabChange?.(t); };
  const [inlineBlocker, setInlineBlocker] = useState(null);
  const confirm = useConfirm();
  const { currentUser } = useAuth();
  const [nextStepFor, setNextStepFor] = useState('');
  const [nextStepConfig, setNextStepConfig] = useState(null);

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
    () => (lead && !sellerFile ? rankAndNominateProperties(lead, liveListings(properties), { scorer: scoreForBuyer }) : { matches: [] }),
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

  const linkedProperty = useMemo(() => {
    if (!lead?.id || !properties?.length) return null;
    return properties.find(p => String(p.sourceLeadId) === String(lead.id) && isActiveListing(p))
      || properties.find(p => String(p.sourceLeadId) === String(lead.id))
      || null;
  }, [lead?.id, properties]);
  const hasActiveLinkedProperty = Boolean(linkedProperty && isActiveListing(linkedProperty));

  // Every hook above runs on each render; the early return must stay after them (React rules of hooks)
  // Clock for the decision banner, fixed when the drawer opens
  const [nowMs] = useState(() => Date.now());
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

  const STAGE_ORDER = ['new', 'contacted', 'site_visit', 'negotiating', 'closed'];
  const nextStageFor = (curr) => {
    const idx = STAGE_ORDER.indexOf(curr);
    return (idx >= 0 && idx < STAGE_ORDER.length - 1) ? STAGE_ORDER[idx + 1] : (curr || 'new');
  };

  const handleUpdateStatus = (newStatus, lostFields, forceBypass = false) => {
    if (!onUpdateLead) return;
    if (newStatus === 'lost' && !lostFields) { setLostOpen(true); return; }

    if (!forceBypass) {
      if (!guardStage(lead, { status: newStatus, ...(newStatus === 'lost' ? { lostReason: lostFields?.lostReason || 'pending' } : {}) }, { role: activeRole, toast: triggerToast })) return;

      const validation = validateStageTransition(lead, newStatus, {
        userRole: activeRole,
        lostReason: lostFields?.lostReason || (newStatus === 'lost' ? lostFields?.reason : undefined),
        isFounderApproved: lead.isFounderApproved || activeRole === 'super_admin'
      });

      if (!validation.allowed) {
        setInlineBlocker({
          targetStatus: newStatus,
          deliverableKey: validation.deliverableKey,
          missingDeliverable: validation.missingDeliverable
        });
        triggerToast?.(validation.missingDeliverable, 'error');
        return;
      }
    }

    setInlineBlocker(null);
    setBlockerModal({ isOpen: false, blockerInfo: null });

    const stageObj = stages.find(s => s.id === newStatus);
    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const noteEntry = `[${timeStr}] تم تحديث المرحلة إلى: "${isAr ? stageObj?.label_ar : stageObj?.label_en}"`;
    const updatedNotes = lead.notes ? `${noteEntry}\n${lead.notes}` : noteEntry;

    const updates = {
      status: newStatus,
      _bypassGate: true,
      _forceStage: true,
      ...(newStatus === 'lost' ? { ...lostFields, lostAt: new Date().toISOString() } : (lead.status === 'lost' ? { lostReason: null, lostNote: null, lostAt: null } : {})),
      notes: updatedNotes,
      lastActivityAt: new Date().toISOString()
    };

    onUpdateLead(lead.id, updates, lead.version);
    triggerToast?.(isAr ? `تم تحديث مرحلة العميل إلى "${stageObj?.label_ar}"` : `Stage updated to ${stageObj?.label_en}`, 'success');
  };

  const handleUnifiedSave = (meta = {}, task = null) => {
    const { newStage, note, channel } = meta;
    const nowIso = new Date().toISOString();
    const channelLabels = {
      whatsapp: isAr ? 'واتساب' : 'WhatsApp',
      call: isAr ? 'اتصال هاتف' : 'Phone Call',
      visit: isAr ? 'معاينة ميدانية' : 'Viewing',
      meeting: isAr ? 'اجتماع في المكتب' : 'Office Meeting',
      note: isAr ? 'ملاحظة داخلية' : 'Internal Note'
    };
    const chLabel = channelLabels[channel] || (isAr ? 'تواصل' : 'Contact');

    const logText = note 
      ? `تواصل (${chLabel}): ${note}`
      : `تم التواصل مع العميل (${chLabel})`;

    const newLogs = [
      {
        timestamp: nowIso,
        action: logText,
        kind: 'contact',
        channel: channel || 'whatsapp',
        agent: userDisplayName(currentUser)
      },
      ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])
    ].slice(0, 100);

    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const noteEntry = note ? `[${timeStr}] ${chLabel}: ${note}` : `[${timeStr}] تم التواصل عبر ${chLabel}`;
    const updatedNotes = lead.notes ? `${noteEntry}\n${lead.notes}` : noteEntry;

    const patch = {
      _bypassGate: true,
      _forceStage: true,
      activityLogs: newLogs,
      notes: updatedNotes,
      lastActivityAt: nowIso,
      lastContactedAt: nowIso
    };

    if (newStage && newStage !== lead.status) {
      patch.status = newStage;
      if (newStage === 'lost' && meta.lostReason) {
        patch.lostReason = meta.lostReason;
        patch.lostAt = nowIso;
      }
    }

    if (onUpdateLead) {
      onUpdateLead(lead.id, patch, lead.version);
    }

    const stageLabel = stages.find(s => s.id === newStage)?.[isAr ? 'label_ar' : 'label_en'] || newStage;
    const taskMsg = task ? (isAr ? ` وجدولة: ${task.title}` : ` & task scheduled`) : '';
    triggerToast?.(isAr ? `تم تسجيل التواصل ونقل العميل إلى "${stageLabel}"${taskMsg}` : 'Contact logged & stage updated', 'success');
  };

  const markContacted = (channel) => {
    auditContactUse(lead, channel);
    const patch = firstContactPatch(lead);
    if (patch && onUpdateLead) onUpdateLead(lead.id, { ...patch, _logAction: channel === 'whatsapp' ? 'تواصل بالواتساب' : 'اتصال بالعميل' }, lead.version);
  };

  const handleWhatsAppClick = () => {
    markContacted('whatsapp');
    setNextStepConfig({
      channel: 'whatsapp',
      targetStage: nextStageFor(lead.status)
    });
  };

  const handleCallClick = () => {
    markContacted('call');
    setNextStepConfig({
      channel: 'call',
      targetStage: nextStageFor(lead.status)
    });
  };

  // Activity outcome (utils/stageGate): one tap logs what happened. The stage lock reads it, a negative one carries
  // its reason, «لم يرد» counts the attempts, and only a qualifying one (interested, viewing booked) moves a brand-new client to «مؤهل».
  const handleLogCall = (outcomeId, extra = {}) => {
    if (!onUpdateLead) return;
    const me = { uid: currentUser?.uid, name: userDisplayName(currentUser) };
    const entry = outcomeEntry(outcomeId, me, extra);
    if (!entry) {
      triggerToast?.(isAr ? 'النتيجة السلبية لازم يتسجّل معاها السبب.' : 'A negative outcome needs a reason.', 'error');
      return;
    }
    const patch = outcomeSave(lead, entry, { lose: extra.lose });
    const label = outcomeById(outcomeId)?.ar || outcomeId;
    onUpdateLead(lead.id, patch, lead.version);
    triggerToast?.(isAr ? `اتسجّلت النتيجة: ${label}${patch.status === 'lost' ? ' · واتنقل لخسارة' : ''}` : `Outcome logged: ${label}`, 'success');
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
    const who = userDisplayName(currentUser);
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
    const me = userDisplayName(currentUser);
    onUpdateLead(lead.id, {
      activityLogs: [{ timestamp: at, action: newNote.trim(), kind: 'note', ...(me ? { agent: me } : {}) }, ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])].slice(0, 100),
      lastActivityAt: at
    }, lead.version);

    setNewNote('');
    triggerToast?.(isAr ? 'اتضافت الملاحظة' : 'Note added', 'success');
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: isAr ? `حذف ملف "${lead.name || 'العميل'}"؟` : `Delete "${lead.name || 'client'}"?`,
      message: isAr 
        ? 'هل أنت متأكد من الحذف النهائي للعميل؟ سيتم مسح سجل المكالمات والمتابعات بالكامل. إذا كان العميل غير مهتم، يفضل نقله لمرحلة «خسارة» مع ذكر السبب لحفظ السجل.'
        : 'Are you sure you want to permanently delete this lead? All call logs and history will be lost.',
      confirmLabel: isAr ? 'تأكيد الحذف النهائي' : 'Delete',
      cancelLabel: isAr ? 'إلغاء' : 'Cancel'
    });
    if (!ok) return;
    onDeleteLead(lead.id);
    onClose();
  };

  const handleSafeConvertToProperty = async () => {
    if (!onConvertToProperty) return;
    if (hasActiveLinkedProperty) {
      onConvertToProperty(lead);
      return;
    }
    const details = lead.details || {};
    const size = parseInt(details.size, 10);
    const hasPrice = askingPriceOf(lead) > 0 || (lead.budget && Number(String(lead.budget).replace(/[^0-9]/g, '')) > 0);
    const hasPhotos = Array.isArray(details.images) && details.images.length > 0;

    const missingSpecs = [];
    if (!size) missingSpecs.push(isAr ? 'المساحة' : 'Size');
    if (!hasPrice) missingSpecs.push(isAr ? 'السعر' : 'Price');
    if (!hasPhotos) missingSpecs.push(isAr ? 'الصور' : 'Photos');

    if (missingSpecs.length > 0) {
      const ok = await confirm({
        title: isAr ? 'تحويل العقار كمسودة غير منشورة' : 'Convert as Hidden Draft',
        message: isAr
          ? `الوحدة تنقصها بيانات أساسية (${missingSpecs.join('، ')}). هل تريد إنشاء مسودة عقار غير منشورة (مخفية) واستكمال مواصفاتها في لوحة العقارات؟`
          : `Missing specs (${missingSpecs.join(', ')}). Create a hidden draft?`,
        confirmLabel: isAr ? 'إنشاء مسودة مخفية' : 'Create Draft',
        cancelLabel: isAr ? 'إلغاء' : 'Cancel'
      });
      if (!ok) return;
    }
    onConvertToProperty(lead);
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
    // Owner wording and a default that follows the stage (utils/ownerMessages)
    whatsappTemplates = ownerMessages(lead, { areaName, propTypeName });
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
  // Clean holder display name (resolves raw emails/UIDs to human names)
  const holder = lead.ownerName || lead.claimedBy || (lead.assignedTo && lead.assignedTo !== 'Unassigned' ? lead.assignedTo : '');
  const holderLower = String(holder || '').toLowerCase();
  
  let cleanHolder = '';
  if (holderLower.includes('elbaz') || holderLower.includes('moudelbaz') || holderLower.includes('mahmoud') || holderLower.includes('ahmoud')) {
    cleanHolder = isAr ? 'د. محمود الباز' : 'Dr. Mahmoud Elbaz';
  } else {
    const matchedMember = members?.find(m => 
      m.email === holder || 
      m.uid === holder || 
      m.id === holder ||
      (m.email && holder && m.email.toLowerCase().startsWith(holderLower)) ||
      (m.email && holder && holderLower.startsWith(m.email.split('@')[0].toLowerCase()))
    ) || (currentUser && (
      currentUser.email === holder || 
      currentUser.uid === holder || 
      (currentUser.email && holder && holderLower.startsWith(currentUser.email.split('@')[0].toLowerCase()))
    ) ? currentUser : null);

    cleanHolder = matchedMember?.name || matchedMember?.displayName 
      || (holder ? (holder.includes('@') ? holder.split('@')[0] : holder).replace(/[0-9._-]+/g, ' ').trim() : null);
  }

  if (!cleanHolder && currentUser) {
    cleanHolder = currentUser.displayName || (currentUser.email?.includes('elbaz') ? (isAr ? 'د. محمود الباز' : 'Dr. Mahmoud Elbaz') : '');
  }
  if (cleanHolder && (cleanHolder.includes('@') || /^[a-z0-9._-]+$/i.test(cleanHolder))) {
    if (/elbaz|mahmoud|ahmoud/i.test(cleanHolder)) {
      cleanHolder = isAr ? 'د. محمود الباز' : 'Dr. Mahmoud Elbaz';
    } else {
      cleanHolder = cleanHolder.split('@')[0].replace(/[0-9._-]+/g, ' ').trim();
    }
  }

  const headerLine = [
    sourceText(lead.source),
    cleanHolder ? (isAr ? `المسؤول: ${cleanHolder}` : `Owner: ${cleanHolder}`) : null,
    lead.autoAssigned ? (isAr ? 'توزيع تلقائي' : 'auto-assigned') : null
  ].filter(Boolean).join(' · ');
  const historyCount = buildTimeline(lead).events.length;
  // The decision first: what is wrong with this deal, and the one thing to do next
  const dealValue = leadBudget(lead);
  const signal = isOpenLead(lead) ? attentionOf(lead, { now: nowMs, value: dealValue }) : null;
  const accountOnly = isOpenLead(lead) && isAccountLead(lead) && !isSellerLead(lead);
  const role = clientRoleOf(lead);
  const missing = missingFor(lead);
  const nextLine = isOpenLead(lead) ? (accountOnly ? stepFor(lead, 'new') : stepFor(lead)) : '';
  const setClientType = (type) => {
    const prev = lead.type || 'account';
    onUpdateLead?.(lead.id, { type, lastActivityAt: new Date().toISOString() }, lead.version);
    triggerToast?.(isAr ? 'اتحدّد نوع العميل' : 'Client type set', 'success', {
      onUndo: () => onUpdateLead?.(lead.id, { type: prev, _undo: true, lastActivityAt: new Date().toISOString() }),
      undoLabel: isAr ? 'تراجع' : 'Undo',
      duration: 6000
    });
  };
  const sinceMs = stageSinceMs(lead);
  const touchedMs = toMs(lead.lastContactedAt);
  const facts = [
    Number.isFinite(sinceMs) ? (isAr ? `في المرحلة ${daysLabel(nowMs - sinceMs, true)}` : `In stage ${daysLabel(nowMs - sinceMs, false)}`) : null,
    Number.isFinite(touchedMs) ? (isAr ? `آخر تواصل ${daysLabel(nowMs - touchedMs, true)}` : `Last contact ${daysLabel(nowMs - touchedMs, false)}`) : (isAr ? 'لسه ما اتكلمش معاه' : 'Not contacted yet'),
    dealValue > 0 ? (isAr ? `${shortMoney(dealValue, true)} ج.م` : `${shortMoney(dealValue, false)} EGP`) : null
  ].filter(Boolean);

  return (
    <>
      <Drawer
        open
        onClose={safeClose}
        title={lead.name || (isAr ? 'عميل بدون اسم' : 'Unnamed client')}
        description={headerLine ? (
          <span className="crm-ld__desc" title={headerLine}>
            <span className="crm-ld__desc-item">{sourceText(lead.source)}</span>
            {hasRealPhone && (
              <>
                <span className="crm-ld__desc-dot">·</span>
                <span className="crm-ld__desc-item crm-ld__desc-phone" dir="ltr">
                  <Phone size={11} aria-hidden="true" style={{ verticalAlign: 'middle', marginInlineEnd: '3px' }} />
                  <PhoneText leadId={lead.id} value={phoneText === '—' ? '' : phoneText} surface="drawer-head" isAr={isAr} />
                </span>
              </>
            )}
            {cleanHolder && (
              <>
                <span className="crm-ld__desc-dot">·</span>
                <span className="crm-ld__desc-item crm-ld__desc-owner">
                  {isAr ? `المسؤول: ${cleanHolder}` : `Owner: ${cleanHolder}`}
                </span>
              </>
            )}
            {lead.autoAssigned && (
              <>
                <span className="crm-ld__desc-dot">·</span>
                <span className="crm-ld__desc-item">{isAr ? 'توزيع تلقائي' : 'auto-assigned'}</span>
              </>
            )}
          </span>
        ) : null}
        closeLabel={isAr ? 'إغلاق' : 'Close'}
        headerActions={(
          <div className="crm-ld__nav">
            {hasRealPhone && (
              <div className="crm-ld__nav-contact">
                <a
                  href={`https://wa.me/${egWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick}
                  className="crm-ld__nav-btn crm-ld__nav-btn--wa"
                  title={isAr ? 'محادثة واتساب مباشرة' : 'WhatsApp'}
                >
                  <MessageSquare size={14} aria-hidden="true" />
                </a>
                <a
                  href={`tel:${cleanPhone}`}
                  onClick={handleCallClick}
                  className="crm-ld__nav-btn crm-ld__nav-btn--call"
                  title={isAr ? 'اتصال هاتف' : 'Call'}
                >
                  <Phone size={14} aria-hidden="true" />
                </a>
              </div>
            )}
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
            {(activeRole === 'super_admin' || canDeleteLeads) && onDeleteLead && (
              <Button variant="ghost" size="sm" className="crm-ld__delete" icon={<Trash2 size={16} aria-hidden="true" />} onClick={handleDelete}>
                {isAr ? 'حذف' : 'Delete'}
              </Button>
            )}
            {sellerFile && onConvertToProperty && (
              <Button variant="secondary" size="sm" icon={<Building size={16} aria-hidden="true" />} onClick={() => onConvertToProperty(lead)}>
                {hasActiveLinkedProperty ? (isAr ? 'تعديل العقار المربوط' : 'Edit linked listing') : (isAr ? 'حوّله لعقار' : 'To listing')}
              </Button>
            )}
          </>
        )}
      >
        <div className="crm-ld" data-stage={lead.status || 'new'}>
          {/* Who this client is, first of all: owner, broker, buyer, investor or a site account */}
          <section className={`crm-ld__role is-${role.id}`} aria-label={isAr ? 'نوع العميل' : 'Client type'}>
            <Badge tone={role.tone}>{isAr ? role.ar : role.en}</Badge>
            {role.hint && isAr && <span className="crm-ld__role-hint">{role.hint}</span>}
            {missing.length > 0 && (
              <button type="button" className="crm-ld__role-missing" onClick={() => setActiveTab('client')} title={isAr ? 'افتح بيانات العميل وكمّلها' : 'Open the client details'}>
                {isAr ? `ناقص: ${missing.map((m) => m.ar).join(' · ')}` : `Missing: ${missing.length}`}
              </button>
            )}
          </section>
          {nextLine && (
            <section className={`crm-ld__decide${signal ? ` is-${signal.tone}` : ''}`} aria-label={isAr ? 'القرار المطلوب' : 'Next decision'}>
              <span className="crm-ld__decide-icon" aria-hidden="true">{signal ? <AlertTriangle size={18} /> : <CircleCheckBig size={18} />}</span>
              <div className="crm-ld__decide-text">
                <strong>{signal ? `${signal.label}${signal.days ? (isAr ? ` · ${signal.days} يوم` : ` · ${signal.days}d`) : ''}` : (isAr ? 'ماشي في معاده' : 'On track')}</strong>
                <span>{isAr ? 'الخطوة الجاية: ' : 'Next: '}{nextLine}</span>
                <small>{facts.join(' · ')}</small>
                {accountOnly && onUpdateLead && (
                  <div className="crm-ld__classify" role="group" aria-label={isAr ? 'حدّد نوع العميل' : 'Set the client type'}>
                    <span>{isAr ? 'عايز إيه؟' : 'Wants to:'}</span>
                    <button type="button" onClick={() => setClientType('buyer')}>{isAr ? 'مشتري' : 'Buyer'}</button>
                    <button type="button" onClick={() => setClientType('seller')}>{isAr ? 'بائع / مالك' : 'Seller'}</button>
                    <button type="button" onClick={() => setClientType('broker')}>{isAr ? 'وسيط' : 'Broker'}</button>
                    <button type="button" onClick={() => setClientType('investor')}>{isAr ? 'مستثمر' : 'Investor'}</button>
                  </div>
                )}
              </div>
            </section>
          )}
          {linkedProperty && (linkedProperty.approval === 'rejected' || linkedProperty.status === 'rejected') && (
            <div style={{
              margin: '0 0 12px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontSize: '12px', fontWeight: 700 }}>
                <ShieldAlert size={16} />
                <span>{isAr ? 'تم رفض العقار المربوط بهذا العميل من قِبل الإدارة.' : 'Property from this lead was rejected by management.'}</span>
              </div>
              {lead.status !== 'lost' && onUpdateLead && (
                <button
                  type="button"
                  className="ui-btn ui-btn--danger ui-btn--xs"
                  onClick={() => handleUpdateStatus('lost', { lostReason: 'property_rejected', lostReasonDetails: 'تم رفض العقار من قِبل الإدارة' }, true)}
                >
                  {isAr ? 'نقل الصفقة إلى مرفوض / خسارة' : 'Mark Lost / Rejected'}
                </button>
              )}
            </div>
          )}

          <section className="crm-ld__summary" aria-label={isAr ? 'ملخص العميل' : 'Client summary'}>
            <div className="crm-ld__contact">
              <span className="crm-ld__phone"><Phone size={14} aria-hidden="true" /><PhoneText leadId={lead.id} value={phoneText === '—' ? '' : phoneText} surface="drawer" isAr={isAr} /></span>
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
                <a href={`tel:${cleanPhone}`} onClick={handleCallClick} className="ui-btn ui-btn--secondary ui-btn--sm">
                  <Phone size={16} aria-hidden="true" />{isAr ? 'اتصال' : 'Call'}
                </a>
                <a href={`https://wa.me/${egWhatsapp}`} target="_blank" rel="noopener noreferrer" onClick={handleWhatsAppClick} className="ui-btn ui-btn--secondary ui-btn--sm">
                  <MessageSquare size={16} aria-hidden="true" />{isAr ? 'واتساب' : 'WhatsApp'}
                </a>
              </div>
            )}
          </section>

          <section className="crm-ld__stage" aria-labelledby="crm-ld-stage">
            <div className="crm-ld__stage-head">
              <h3 id="crm-ld-stage" className="crm-ld__h">{isAr ? 'مسار الصفقة' : 'Deal Pipeline'}</h3>
            </div>
            <div className="crm-ld__stages">
              <div className="crm-ld__stages-row" role="radiogroup" aria-label={isAr ? 'مراحل المسار' : 'Pipeline stages'}>
                {stages.slice(0, 5).map((st, idx) => {
                  const isCurrent = currentColumn === st.id;
                  const currentIdx = stages.findIndex(s => s.id === currentColumn);
                  const isPassed = currentIdx > idx && currentColumn !== 'lost' && currentColumn !== 'inactive';
                  const shortText = (isAr && SHORT_STEPPER_LABELS[isSeller ? 'seller' : 'buyer']?.[st.id]) || (isAr ? st.label_ar : st.label_en);
                  return (
                    <button
                      type="button"
                      key={st.id}
                      className={`crm-ld__stage-chip${isCurrent ? ' is-current' : ''}${isPassed ? ' is-passed' : ''}`}
                      onClick={() => {
                        setNextStepConfig({
                          targetStage: st.id,
                          channel: 'call'
                        });
                      }}
                      title={isAr ? st.label_ar : st.label_en}
                    >
                      <span className="crm-ld__stage-num">{idx + 1}</span>
                      <span>{shortText}</span>
                    </button>
                  );
                })}
              </div>
              <div className="crm-ld__stage-sides">
                <button
                  type="button"
                  className={`crm-ld__side-chip${currentColumn === 'inactive' ? ' is-current' : ''}`}
                  onClick={() => handleUpdateStatus('inactive')}
                >
                  {isAr ? 'غير متفاعل' : 'Unresponsive'}
                </button>
                <button
                  type="button"
                  className={`crm-ld__side-chip is-lost${currentColumn === 'lost' || lead.status === 'lost' ? ' is-current' : ''}`}
                  onClick={() => handleUpdateStatus('lost')}
                >
                  {isAr ? 'خسارة' : 'Lost'}
                </button>
              </div>
              <button
                type="button"
                className="crm-ld__flow-trigger-btn"
                onClick={() => {
                  setNextStepConfig({
                    targetStage: nextStageFor(lead.status),
                    channel: 'whatsapp'
                  });
                }}
              >
                <Sparkles size={15} />
                <span>{isAr ? '⚡ تسجيل تواصل وتحديث المرحلة والحدث القادم' : '⚡ Log Contact, Stage & Next Event'}</span>
              </button>
            </div>
          </section>

          {inlineBlocker && (
            <div style={{
              margin: '8px 0 16px',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--crm-warning)', fontWeight: 'bold', fontSize: 'var(--crm-text-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️ {isAr ? 'مطلوب استكمال المخرج:' : 'Required deliverable:'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setInlineBlocker(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--crm-muted)', padding: '2px', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--crm-text-xs)', color: 'var(--crm-ink)', lineHeight: 1.5 }}>
                {inlineBlocker.missingDeliverable}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setActiveTab('overview');
                  }}
                >
                  {isAr ? 'استكمال البيانات بالملف' : 'Fill details'}
                </Button>
                {activeRole === 'super_admin' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUpdateStatus(inlineBlocker.targetStatus, null, true)}
                  >
                    {isAr ? 'تجاوز بصلاحية الإدارة' : 'Bypass (Admin)'}
                  </Button>
                )}
              </div>
            </div>
          )}

          <Tabs
            label={isAr ? 'أقسام ملف العميل' : 'Client sections'}
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { id: 'work', label: isAr ? 'الشغل' : 'Work' },
              { id: 'client', label: isAr ? 'العميل' : 'Client' },
              { id: 'docs', label: isAr ? 'المستندات' : 'Docs', count: (lead?.documents || []).length || null },
              { id: 'team', label: isAr ? 'الفريق' : 'Team' },
              { id: 'history', label: isAr ? 'السجل' : 'History', count: historyCount || null },
              sellerFile
                ? { id: 'matching', label: isAr ? 'مشترين مناسبين' : 'Buyers', count: sellerBuyers.length }
                : { id: 'matching', label: isAr ? 'العقارات المناسبة' : 'Matches', count: matchingResult.matches.length },
              ...(showBrokerFile ? [{ id: 'broker', label: isAr ? 'ملف الوسيط' : 'Broker file', count: brokerCount || null }] : [])
            ]}
          />

          {activeTab === 'work' && (
            <LeadDrawerOverview
              view="work"
              onOpenClient={() => setActiveTab('client')}
              allLeads={allLeads.length ? allLeads : filteredLeads}
              lead={lead}
              egWhatsapp={hasRealPhone ? egWhatsapp : ''}
              handleLogCall={handleLogCall}
              agentName={userDisplayName(currentUser)}
              handleScheduleViewing={handleScheduleViewing}
              isAr={isAr}
              onConvertToProperty={handleSafeConvertToProperty}
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

          {activeTab === 'client' && (
            <ClientDetails key={lead.id} lead={lead} onUpdateLead={onUpdateLead} isAr={isAr} lang={isAr ? 'ar' : 'en'} triggerToast={triggerToast} userRole={activeRole} />
          )}

          {activeTab === 'docs' && (
            <ClientDocuments
              key={lead.id}
              lead={lead}
              isAr={isAr}
              onUpdateLead={onUpdateLead}
              triggerToast={triggerToast}
            />
          )}

          {activeTab === 'history' && (
            <div className="crm-ld__stack">
              <ClientTimeline
                lead={lead}
                isAr={isAr}
                newNote={newNote}
                setNewNote={setNewNote}
                onAddNote={handleAddNote}
              />
              <details className="crm-ld__block crm-ld__fold" open>
                <summary className="crm-ld__fold-sum">{isAr ? 'رحلة الزائر على الموقع' : 'Visitor journey'}</summary>
                <ClientJourney lead={lead} properties={properties} isAr={isAr} />
              </details>
            </div>
          )}

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
            <LeadTeamPanel key={lead.id} lead={lead} isAr={isAr} triggerToast={triggerToast} onUpdateLead={onUpdateLead} members={members} canAssign={mayAssignTasks} />
          )}

        </div>
      </Drawer>
      {(nextStepFor || nextStepConfig) && (
        <NextStepSheet
          key={`${lead.id}-${nextStepConfig?.targetStage || nextStepFor || 'step'}`}
          lead={lead}
          outcomeId={nextStepFor}
          initialChannel={nextStepConfig?.channel || 'whatsapp'}
          targetStage={nextStepConfig?.targetStage}
          stages={stages}
          isAr={isAr}
          me={{ uid: currentUser?.uid, name: userDisplayName(currentUser) }}
          onSaved={(t, meta) => {
            setNextStepFor('');
            setNextStepConfig(null);
            handleUnifiedSave(meta, t);
          }}
          onStageOnly={(targetStage, meta) => {
            setNextStepFor('');
            setNextStepConfig(null);
            handleUnifiedSave({ ...meta, newStage: targetStage }, null);
          }}
          onSkip={skipNextStep}
          onClose={() => {
            setNextStepFor('');
            setNextStepConfig(null);
          }}
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
    </>
  );
}
