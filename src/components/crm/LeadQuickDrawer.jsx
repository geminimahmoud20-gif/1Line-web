import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Phone, MessageSquare, Building, ChevronRight, ChevronLeft, Trash2, Plus, Eye } from 'lucide-react';
import { SOHAG_AREAS, PROPERTY_TYPES } from '../../data/propertiesData';
import { trackEvent } from '../../utils/visitorTracker';
import LeadDrawerOverview from './lead-profile/LeadDrawerOverview';
import LeadDrawerMatching from './lead-profile/LeadDrawerMatching';
import LostReasonModal from './LostReasonModal';
import LeadScorePill from './LeadScorePill';
import { validateStageTransition } from '../../services/stateMachineEngine';
import StageDeliverableModal from './StageDeliverableModal';
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';

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
  const drawerRef = useRef(null);

  // Dirty State (Unsaved Changes) Protection
  const hasUnsavedChanges = Boolean(newNote.trim() || (showViewingForm && (viewingDateTime || selectedViewingPropId)));

  const safeClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        isAr 
          ? 'لديك ملاحظات أو بيانات غير محفوظة، هل أنت متأكد من الإغلاق وتجاهل التغييرات؟'
          : 'You have unsaved notes or changes. Are you sure you want to discard them?'
      );
      if (!confirmDiscard) return;
    }
    onClose();
  }, [hasUnsavedChanges, isAr, onClose]);

  // Close on Escape key & browser back navigation (mobile gesture)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') safeClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    window.history.pushState({ modalOpen: true }, '');
    const handlePopState = () => {
      safeClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.modalOpen) {
        window.history.back();
      }
    };
  }, [safeClose]);

  // Smart Context Matching Properties for this Lead
  const matchedProperties = useMemo(() => {
    if (!lead || !properties || properties.length === 0) return [];
    const leadBudgetNum = parseInt(String(lead.budget || lead.details?.budget || 0).replace(/[^0-9]/g, '')) || 0;
    const targetArea = lead.area || lead.details?.area || '';
    const targetType = lead.propertyType || lead.details?.propertyType || '';

    return properties.map(prop => {
      let score = 0;
      if (targetArea && prop.areaKey === targetArea) score += 40;
      if (targetType && prop.type === targetType) score += 35;
      if (leadBudgetNum > 0 && prop.price) {
        const diffRatio = Math.abs(prop.price - leadBudgetNum) / leadBudgetNum;
        if (diffRatio <= 0.15) score += 25;
        else if (diffRatio <= 0.3) score += 15;
      }
      return { ...prop, _matchScore: score };
    })
    .filter(p => p._matchScore > 20)
    .sort((a, b) => b._matchScore - a._matchScore)
    .slice(0, 4);
  }, [properties, lead]);

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
    { id: 'new', label_ar: 'جديد', label_en: 'New', color: 'var(--crm-info)', fill: 'var(--crm-info-solid)' },
    { id: 'contacted', label_ar: 'تم التواصل', label_en: 'Contacted', color: 'var(--crm-violet)', fill: 'var(--crm-violet-solid)' },
    { id: 'site_visit', label_ar: 'معاينة', label_en: 'Viewing', color: 'var(--crm-warn)', fill: 'var(--crm-warn-solid)' },
    { id: 'negotiating', label_ar: 'تفاوض', label_en: 'Negotiating', color: 'var(--crm-warn)', fill: 'var(--crm-warn-solid)' },
    { id: 'closing', label_ar: 'توقيع وحجز', label_en: 'Closing', color: 'var(--crm-positive)', fill: 'var(--crm-positive-solid)' },
    { id: 'closed', label_ar: 'صفقة ناجحة', label_en: 'Closed', color: 'var(--crm-positive)', fill: 'var(--crm-positive-solid)' },
    { id: 'lost', label_ar: 'مفقود', label_en: 'Lost', color: 'var(--crm-danger)', fill: 'var(--crm-danger-solid)' }
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
    const callEntry = `📞 [اتصال هاتف ${dateStr} ${timeStr}]: ${outcome}`;
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
    const noteEntry = `📝 [ملاحظة ${dateStr} ${timeStr}]: ${newNote.trim()}`;
    const updatedNotes = lead.notes ? `${noteEntry}\n${lead.notes}` : noteEntry;

    onUpdateLead(lead.id, {
      notes: updatedNotes,
      lastActivityAt: new Date().toISOString()
    }, lead.version);

    setNewNote('');
    triggerToast?.(isAr ? 'تمت إضافة الملاحظة بنجاح' : 'Note added', 'success');
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
    const viewingEntry = `📍 [معاينة مجدولة ${dateFormatted}]: عقار ${matchedProp?.id} — ${matchedProp?.title_ar || matchedProp?.title_en}`;
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

  return (
    <>
      {/* Dim Backdrop */}
      <div
        className="crm-drawer-backdrop is-visible"
        onClick={safeClose}
        style={{ zIndex: 11000 }}
        aria-hidden="true"
      />

      {/* Sliding Drawer Container */}
      <aside
        ref={drawerRef}
        className="crm-lead-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-lead-name"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top Header Bar */}
        <div className="crm-drawer-header">
          {/* Previous / Next Navigator */}
          <div className="crm-drawer-nav-group">
            <button
              type="button"
              className="crm-drawer-nav-btn"
              disabled={!prevLead}
              onClick={() => prevLead && onOpenFullProfile && onOpenFullProfile(prevLead)}
              title={prevLead ? `${isAr ? 'العميل السابق' : 'Prev'}: ${prevLead.name}` : ''}
            >
              {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            <span dir="ltr" className="crm-drawer-nav-counter">
              {currentIndex + 1} / {filteredLeads.length || 1}
            </span>

            <button
              type="button"
              className="crm-drawer-nav-btn"
              disabled={!nextLead}
              onClick={() => nextLead && onOpenFullProfile && onOpenFullProfile(nextLead)}
              title={nextLead ? `${isAr ? 'العميل التالي' : 'Next'}: ${nextLead.name}` : ''}
            >
              {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {/* Action buttons on header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onConvertToProperty && (
              <button
                type="button"
                onClick={() => onConvertToProperty(lead)}
                className="btn btn-sm btn-outline"
                style={{ fontSize: 'var(--crm-text-xs)', padding: '5px 10px', borderRadius: '8px' }}
                title={isAr ? 'تحويل العميل إلى وحدة عقارية معروضة' : 'Convert to Property'}
              >
                <Building size={13} />
                <span>{isAr ? 'تحويل لعقار' : 'To Unit'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={safeClose}
              className="crm-drawer-close-btn"
              aria-label={isAr ? 'إغلاق الدرج' : 'Close Drawer'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="crm-drawer-body">
          {/* Lead Header Card */}
          <div className="crm-drawer-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 id="drawer-lead-name" style={{ margin: 0, fontSize: 'var(--crm-text-lg)', fontWeight: 800 }}>
                    {lead.name}
                  </h2>
                  <LeadScorePill lead={lead} isAr={isAr} suffix={isAr ? ' اهتمام' : ' score'} />
                  {lead.temperature && (
                    <span className={`crm-temp-tag is-${lead.temperature}`}>
                      {lead.temperature === 'hot' ? '🔥 ساخن' : lead.temperature === 'warm' ? '⚡ دافئ' : '❄️ بارد'}
                    </span>
                  )}
                </div>

                {/* Subtitle Contact & Source */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted, var(--crm-faint))', flexWrap: 'wrap' }}>
                  <span className="crm-phone-mono-pill">
                    <bdi dir="ltr">{formatPhoneNumber(lead.phone || lead.whatsapp) || '—'}</bdi>
                  </span>
                  {lead.source && (
                    <span style={{ background: 'var(--crm-subtle)', border: '1px solid var(--crm-line)', padding: '2px 8px', borderRadius: '6px', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
                      {lead.source}
                    </span>
                  )}
                  {lead.assignedTo && lead.assignedTo !== 'Unassigned' && (
                    <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-body)', fontWeight: 600 }}>👤 {lead.assignedTo}</span>
                  )}
                </div>
              </div>

              {/* Instant Call / WhatsApp Direct triggers — not for a masked number (role without ld.phone) */}
              {hasRealPhone && <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <a
                  href={`tel:${cleanPhone}`}
                  title={isAr ? 'اتصال هاتفي مباشر' : 'Direct Call'}
                  style={{
                    background: 'var(--crm-brand-navy)',
                    color: 'var(--crm-on-dark)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none'
                  }}
                >
                  <Phone size={16} />
                </a>

                <a
                  href={`https://wa.me/${egWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={isAr ? 'محادثة فورية على واتساب' : 'WhatsApp'}
                  style={{
                    background: 'var(--brand-whatsapp-solid)',
                    color: 'var(--crm-on-dark)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none'
                  }}
                >
                  <MessageSquare size={16} />
                </a>
              </div>}
            </div>

            {/* Stepper / Stage Selector */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--crm-line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 700, color: 'var(--crm-muted, var(--crm-faint))' }}>
                  {isAr ? 'مرحلة الصفقة الحالية:' : 'Current Pipeline Stage:'}
                </span>
                <span style={{
                  fontSize: 'var(--crm-text-xs)',
                  fontWeight: 800,
                  color: stages[currentStageIndex]?.color || 'var(--crm-accent)'
                }}>
                  {isAr ? stages[currentStageIndex]?.label_ar : stages[currentStageIndex]?.label_en}
                </span>
              </div>

              {/* Stage Pills Grid (Balanced 3x2 for 6 stages) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {stages.slice(0, 6).map((st) => {
                  const isActive = lead.status === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleUpdateStatus(st.id)}
                      className={`crm-drawer-stepper-btn ${isActive ? 'is-active' : ''}`}
                      style={isActive ? { background: st.fill, borderColor: st.fill } : undefined}
                    >
                      {isAr ? st.label_ar : st.label_en}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Tabs: Overview / Matching / Timeline */}
          <div className="crm-drawer-tabs">
            {[
              { id: 'overview', label_ar: 'العمليات والمتابعة', label_en: 'Operations' },
              { id: 'matching', label_ar: `المطابقات الذكية (${matchedProperties.length})`, label_en: `Matches (${matchedProperties.length})` },
              { id: 'timeline', label_ar: 'سجل النشاط والملاحظات', label_en: 'Timeline' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`crm-drawer-tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
              >
                {isAr ? tab.label_ar : tab.label_en}
              </button>
            ))}
          </div>

          {/* TAB 1: OPERATIONS & QUICK ACTIONS */}
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
            />
          )}

          {/* TAB 2: SMART MATCHING IN CONTEXT */}
          {activeTab === 'matching' && (
            <LeadDrawerMatching
              areaName={areaName}
              egWhatsapp={hasRealPhone ? egWhatsapp : ''}
              isAr={isAr}
              lead={lead}
              matchedProperties={matchedProperties}
              properties={properties}
              onUpdateLead={onUpdateLead}
              triggerToast={triggerToast}
            />
          )}

          {/* TAB 3: TIMELINE & ACTIVITY LOG */}
          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  rows={2}
                  placeholder={isAr ? 'اكتب ملاحظة أو نتيجة اتصال...' : 'Add a note or action result...'}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '8px 12px', fontSize: 'var(--crm-text-sm)', borderRadius: '8px' }}
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="btn btn-primary"
                  style={{
                    alignSelf: 'flex-start',
                    padding: '6px 14px',
                    borderRadius: '7px',
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: 700,
                    background: 'var(--crm-accent)',
                    color: 'var(--crm-on-dark)',
                    border: 'none',
                    cursor: newNote.trim() ? 'pointer' : 'not-allowed',
                    opacity: newNote.trim() ? 1 : 0.5
                  }}
                >
                  <Plus size={14} />
                  <span>{isAr ? 'إضافة للسجل' : 'Add to Log'}</span>
                </button>
              </form>

              {/* Timeline Items */}
              <div style={{
                background: 'var(--crm-card)',
                border: '1px solid var(--crm-line)',
                borderRadius: '12px',
                padding: '14px'
              }}>
                <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 800, color: 'var(--crm-ink)', marginBottom: '10px' }}>
                  {isAr ? 'سجل النشاط والملاحظات:' : 'Activity History:'}
                </div>

                {lead.notes ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {lead.notes.split('\n').filter(Boolean).map((line, idx) => {
                      const cleanedLine = line
                        .replace(/في\s+undefined\b/gi, 'في سوهاج')
                        .replace(/في\s+null\b/gi, 'في سوهاج')
                        .replace(/\b(undefined|null)\b/gi, '')
                        .replace(/\s{2,}/g, ' ')
                        .trim();
                      if (!cleanedLine) return null;
                      return (
                        <div
                          key={idx}
                          style={{
                            fontSize: 'var(--crm-text-xs)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            background: 'var(--crm-subtle)',
                            borderInlineStart: '3px solid var(--crm-accent)',
                            lineHeight: '1.5'
                          }}
                        >
                          {cleanedLine}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
                    {isAr ? 'لا توجد ملاحظات سابقة مسجلة لهذا العميل.' : 'No notes recorded yet.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Open 360 Full Profile */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--crm-line)',
          background: 'var(--crm-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={() => onOpenFullProfile && onOpenFullProfile(lead)}
            className="btn btn-outline"
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Eye size={14} />
            <span>{isAr ? 'فتح ملف العميل' : 'Open client profile'}</span>
          </button>

          {activeRole === 'super_admin' && onDeleteLead && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(isAr ? `هل أنت متأكد من حذف العميل "${lead.name}"؟` : `Delete lead "${lead.name}"?`)) {
                  onDeleteLead(lead.id);
                  onClose();
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--crm-danger)',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Trash2 size={13} />
              <span>{isAr ? 'حذف العميل' : 'Delete'}</span>
            </button>
          )}
        </div>
      </aside>
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
