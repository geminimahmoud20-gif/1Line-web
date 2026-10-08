import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Phone, MessageSquare, Building, ChevronRight, ChevronLeft, Trash2, Plus, Eye } from 'lucide-react';
import { SOHAG_AREAS, PROPERTY_TYPES } from '../../data/propertiesData';
import { trackEvent } from '../../utils/visitorTracker';
import LeadDrawerOverview from './lead-profile/LeadDrawerOverview';
import LeadDrawerMatching from './lead-profile/LeadDrawerMatching';
import LostReasonModal from './LostReasonModal';

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
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'matching' | 'timeline'
  const drawerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
    const stageObj = stages.find(s => s.id === newStatus);
    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const noteEntry = `[${timeStr}] تم تحديث المرحلة إلى: "${isAr ? stageObj?.label_ar : stageObj?.label_en}"`;
    const updatedNotes = lead.notes ? `${noteEntry}\n${lead.notes}` : noteEntry;

    onUpdateLead(lead.id, {
      status: newStatus,
      ...(newStatus === 'lost' ? { ...lostFields, lostAt: new Date().toISOString() } : (lead.status === 'lost' ? { lostReason: null, lostNote: null, lostAt: null } : {})),
      notes: updatedNotes,
      lastActivityAt: new Date().toISOString()
    });

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
    });

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
    });

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
    });

    setShowViewingForm(false);
    triggerToast?.(isAr ? 'تمت جدولة المعاينة بنجاح وتحديث موعد المتابعة' : 'Viewing scheduled successfully', 'success');
    trackEvent('crm_viewing_scheduled', { leadId: lead.id, propertyId: selectedViewingPropId });
  };

  // WhatsApp Pitch Templates
  const leadArea = lead.area || lead.details?.area || 'سوهاج';
  const areaName = SOHAG_AREAS.find(a => a.id === leadArea)?.name_ar || leadArea;
  const propType = lead.propertyType || lead.details?.propertyType || 'عقار';
  const propTypeName = PROPERTY_TYPES.find(p => p.id === propType)?.name_ar || propType;

  const whatsappTemplates = [
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

  return (
    <>
      {/* Dim Backdrop */}
      <div
        className="crm-drawer-backdrop is-visible"
        onClick={onClose}
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
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          [isAr ? 'left' : 'right']: 0,
          width: '100%',
          maxWidth: '540px',
          background: 'var(--crm-card)',
          color: 'var(--crm-ink)',
          zIndex: 11050,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--crm-shadow, -10px 0 40px rgba(0,0,0,0.18))',
          borderInlineStart: '1px solid var(--crm-line)',
          animation: isAr ? 'drawerSlideInRtl 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'drawerSlideInLtr 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Top Header Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--crm-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--crm-subtle)'
        }}>
          {/* Previous / Next Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={!prevLead}
              onClick={() => prevLead && onOpenFullProfile && onOpenFullProfile(prevLead)}
              title={prevLead ? `${isAr ? 'العميل السابق' : 'Prev'}: ${prevLead.name}` : ''}
              style={{
                background: 'var(--crm-card)',
                border: '1px solid var(--crm-line)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: prevLead ? 'pointer' : 'not-allowed',
                opacity: prevLead ? 1 : 0.4
              }}
            >
              {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted, var(--crm-faint))', fontWeight: 600 }}>
              {currentIndex + 1} / {filteredLeads.length || 1}
            </span>

            <button
              type="button"
              disabled={!nextLead}
              onClick={() => nextLead && onOpenFullProfile && onOpenFullProfile(nextLead)}
              title={nextLead ? `${isAr ? 'العميل التالي' : 'Next'}: ${nextLead.name}` : ''}
              style={{
                background: 'var(--crm-card)',
                border: '1px solid var(--crm-line)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: nextLead ? 'pointer' : 'not-allowed',
                opacity: nextLead ? 1 : 0.4
              }}
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
              onClick={onClose}
              aria-label={isAr ? 'إغلاق الدرج' : 'Close Drawer'}
              style={{
                background: 'var(--crm-card)',
                border: '1px solid var(--crm-line)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--crm-ink)'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Lead Header Card */}
          <div style={{
            background: 'var(--crm-card)',
            border: '1px solid var(--crm-line)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '16px',
            boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 id="drawer-lead-name" style={{ margin: 0, fontSize: 'var(--crm-text-lg)', fontWeight: 800 }}>
                    {lead.name}
                  </h2>
                  {lead.score && (
                    <span style={{
                      fontSize: 'var(--crm-text-xs)',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: lead.score >= 85 ? 'rgba(4, 120, 87, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                      color: lead.score >= 85 ? 'var(--crm-positive)' : 'var(--crm-accent, var(--crm-accent-text))'
                    }}>
                      ⚡ {lead.score}% {isAr ? 'جدية' : 'Score'}
                    </span>
                  )}
                  {lead.temperature && (
                    <span style={{
                      fontSize: 'var(--crm-text-xs)',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: lead.temperature === 'hot' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                      color: lead.temperature === 'hot' ? 'var(--crm-danger)' : 'var(--crm-info)'
                    }}>
                      {lead.temperature === 'hot' ? '🔥 ساخن' : lead.temperature === 'warm' ? '⚡ دافئ' : '❄️ بارد'}
                    </span>
                  )}
                </div>

                {/* Subtitle Contact & Source */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted, var(--crm-faint))', flexWrap: 'wrap' }}>
                  <span>{lead.phone}</span>
                  {lead.source && (
                    <span style={{ background: 'var(--crm-subtle-2, var(--crm-subtle))', padding: '2px 6px', borderRadius: '4px', fontSize: 'var(--crm-text-xs)' }}>
                      {lead.source}
                    </span>
                  )}
                  {lead.assignedTo && lead.assignedTo !== 'Unassigned' && (
                    <span>👤 {lead.assignedTo}</span>
                  )}
                </div>
              </div>

              {/* Instant Call / WhatsApp Direct triggers */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
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
              </div>
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

              {/* Stage Pills Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {stages.slice(0, 6).map((st) => {
                  const isActive = lead.status === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleUpdateStatus(st.id)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '8px',
                        fontSize: 'var(--crm-text-xs)',
                        fontWeight: isActive ? 800 : 600,
                        // solid fill keeps white text readable in both themes (st.color is the text tone)
                        background: isActive ? st.fill : 'var(--crm-subtle)',
                        color: isActive ? 'var(--crm-on-dark)' : 'var(--crm-muted)',
                        border: isActive ? `1px solid ${st.fill}` : '1px solid var(--crm-line)',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isAr ? st.label_ar : st.label_en}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Tabs: Overview / Matching / Timeline */}
          <div style={{
            display: 'flex',
            background: 'var(--crm-subtle)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '16px',
            border: '1px solid var(--crm-line)'
          }}>
            {[
              { id: 'overview', label_ar: 'العمليات والمتابعة', label_en: 'Operations' },
              { id: 'matching', label_ar: `المطابقات الذكية (${matchedProperties.length})`, label_en: `Matches (${matchedProperties.length})` },
              { id: 'timeline', label_ar: 'سجل النشاط والملاحظات', label_en: 'Timeline' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '7px',
                  fontSize: 'var(--crm-text-xs)',
                  fontWeight: activeTab === tab.id ? 800 : 600,
                  background: activeTab === tab.id ? 'var(--crm-card)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--crm-ink)' : 'var(--crm-muted, var(--crm-faint))',
                  border: activeTab === tab.id ? '1px solid var(--crm-line)' : 'none',
                  boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  cursor: 'pointer'
                }}
              >
                {isAr ? tab.label_ar : tab.label_en}
              </button>
            ))}
          </div>

          {/* TAB 1: OPERATIONS & QUICK ACTIONS */}
          {activeTab === 'overview' && (
            <LeadDrawerOverview
              egWhatsapp={egWhatsapp}
              handleLogCall={handleLogCall}
              handleScheduleViewing={handleScheduleViewing}
              isAr={isAr}
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
              egWhatsapp={egWhatsapp}
              isAr={isAr}
              lead={lead}
              matchedProperties={matchedProperties}
              properties={properties}
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
                    {lead.notes.split('\n').filter(Boolean).map((line, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: 'var(--crm-text-xs)',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: 'var(--crm-subtle)',
                          borderInlineStart: '3px solid var(--crm-accent)',
                          lineHeight: '1.4'
                        }}
                      >
                        {line}
                      </div>
                    ))}
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
            <span>{isAr ? 'فتح الملف الشامل 360°' : 'Open 360 Profile'}</span>
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
    </>
  );
}
