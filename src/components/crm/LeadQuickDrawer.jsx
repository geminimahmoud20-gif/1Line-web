import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Phone, MessageSquare, Calendar, Building, Sparkles,
  CheckCircle2, Clock, User, Tag, ArrowRight, ArrowLeft,
  ChevronRight, ChevronLeft, ExternalLink, ShieldCheck,
  Send, Edit3, Trash2, AlertCircle, Plus, Eye, Share2
} from 'lucide-react';
import { SOHAG_AREAS, PROPERTY_TYPES } from '../../data/propertiesData';
import { trackEvent } from '../../utils/visitorTracker';

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
    { id: 'new', label_ar: 'جديد', label_en: 'New', color: '#3b82f6' },
    { id: 'contacted', label_ar: 'تم التواصل', label_en: 'Contacted', color: '#8b5cf6' },
    { id: 'site_visit', label_ar: 'معاينة', label_en: 'Viewing', color: 'var(--crm-warn)' },
    { id: 'negotiating', label_ar: 'تفاوض', label_en: 'Negotiating', color: '#f59e0b' },
    { id: 'closing', label_ar: 'توقيع وحجز', label_en: 'Closing', color: 'var(--crm-positive)' },
    { id: 'closed', label_ar: 'صفقة ناجحة', label_en: 'Closed', color: 'var(--crm-positive)' },
    { id: 'lost', label_ar: 'مفقود', label_en: 'Lost', color: '#ef4444' }
  ];

  const currentStageIndex = stages.findIndex(s => s.id === (lead.status || 'new'));

  const handleUpdateStatus = (newStatus) => {
    if (!onUpdateLead) return;
    const stageObj = stages.find(s => s.id === newStatus);
    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const noteEntry = `[${timeStr}] تم تحديث المرحلة إلى: "${isAr ? stageObj?.label_ar : stageObj?.label_en}"`;
    const updatedNotes = lead.notes ? `${noteEntry}\n${lead.notes}` : noteEntry;

    onUpdateLead(lead.id, {
      status: newStatus,
      notes: updatedNotes,
      lastActivityAt: new Date().toISOString()
    });

    triggerToast?.(isAr ? `تم تحديث مرحلة العميل إلى "${stageObj?.label_ar}"` : `Stage updated to ${stageObj?.label_en}`, 'success');
  };

  // Quick Call Outcome Logger
  const handleLogCall = (outcome) => {
    if (!onUpdateLead) return;
    const dateStr = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
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
    const dateStr = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
    const timeStr = new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
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
    const dateFormatted = new Date(viewingDateTime).toLocaleString(isAr ? 'ar-EG' : 'en-US');
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
      msg: `تحياتنا أستاذ ${lead.name}، يتوفر لدينا حالياً أنظمة سداد ميسرة وتقسيط مباشر بدون فوائد بنكية لوحدات في ${areaName}. يمكنك استعراض التفاصيل الكاملة معنا فوراً.`
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
          background: 'var(--crm-card, #ffffff)',
          color: 'var(--crm-ink, #0f172a)',
          zIndex: 11050,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--crm-shadow, -10px 0 40px rgba(0,0,0,0.18))',
          borderInlineStart: '1px solid var(--crm-line, #e2e8f0)',
          animation: isAr ? 'drawerSlideInRtl 0.28s cubic-bezier(0.16, 1, 0.3, 1)' : 'drawerSlideInLtr 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Top Header Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--crm-line, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--crm-subtle, #f9f8f5)'
        }}>
          {/* Previous / Next Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={!prevLead}
              onClick={() => prevLead && onOpenFullProfile && onOpenFullProfile(prevLead)}
              title={prevLead ? `${isAr ? 'العميل السابق' : 'Prev'}: ${prevLead.name}` : ''}
              style={{
                background: 'var(--crm-card, #ffffff)',
                border: '1px solid var(--crm-line, #e2e8f0)',
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

            <span style={{ fontSize: '0.78rem', color: 'var(--crm-muted, #64748b)', fontWeight: 600 }}>
              {currentIndex + 1} / {filteredLeads.length || 1}
            </span>

            <button
              type="button"
              disabled={!nextLead}
              onClick={() => nextLead && onOpenFullProfile && onOpenFullProfile(nextLead)}
              title={nextLead ? `${isAr ? 'العميل التالي' : 'Next'}: ${nextLead.name}` : ''}
              style={{
                background: 'var(--crm-card, #ffffff)',
                border: '1px solid var(--crm-line, #e2e8f0)',
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
                style={{ fontSize: '0.74rem', padding: '5px 10px', borderRadius: '8px' }}
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
                background: 'var(--crm-card, #ffffff)',
                border: '1px solid var(--crm-line, #e2e8f0)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--crm-ink, #0f172a)'
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
            background: 'var(--crm-card, #ffffff)',
            border: '1px solid var(--crm-line, #e2e8f0)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '16px',
            boxShadow: 'var(--crm-shadow, 0 1px 3px rgba(0,0,0,0.04))'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 id="drawer-lead-name" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                    {lead.name}
                  </h2>
                  {lead.score && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: lead.score >= 85 ? 'rgba(4, 120, 87, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                      color: lead.score >= 85 ? 'var(--crm-positive, #047857)' : 'var(--crm-accent, #A9824A)'
                    }}>
                      ⚡ {lead.score}% {isAr ? 'جدية' : 'Score'}
                    </span>
                  )}
                  {lead.temperature && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: lead.temperature === 'hot' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                      color: lead.temperature === 'hot' ? '#dc2626' : '#2563eb'
                    }}>
                      {lead.temperature === 'hot' ? '🔥 ساخن' : '⚡ دافئ'}
                    </span>
                  )}
                </div>

                {/* Subtitle Contact & Source */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.82rem', color: 'var(--crm-muted, #64748b)', flexWrap: 'wrap' }}>
                  <span>{lead.phone}</span>
                  {lead.source && (
                    <span style={{ background: 'var(--crm-subtle-2, #f2f0ea)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>
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
                    background: '#092347',
                    color: '#ffffff',
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
                    background: '#25D366',
                    color: '#ffffff',
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
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--crm-line, #e2e8f0)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--crm-muted, #64748b)' }}>
                  {isAr ? 'مرحلة الصفقة الحالية:' : 'Current Pipeline Stage:'}
                </span>
                <span style={{
                  fontSize: '0.75rem',
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
                        fontSize: '0.72rem',
                        fontWeight: isActive ? 800 : 600,
                        background: isActive ? st.color : 'var(--crm-subtle, #f9f8f5)',
                        color: isActive ? '#ffffff' : 'var(--crm-muted, #64748b)',
                        border: isActive ? `1px solid ${st.color}` : '1px solid var(--crm-line, #e2e8f0)',
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
            background: 'var(--crm-subtle, #f9f8f5)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '16px',
            border: '1px solid var(--crm-line, #e2e8f0)'
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
                  fontSize: '0.78rem',
                  fontWeight: activeTab === tab.id ? 800 : 600,
                  background: activeTab === tab.id ? 'var(--crm-card, #ffffff)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--crm-ink, #0f172a)' : 'var(--crm-muted, #64748b)',
                  border: activeTab === tab.id ? '1px solid var(--crm-line, #e2e8f0)' : 'none',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. Quick Call Logger */}
              <div style={{
                background: 'var(--crm-card, #ffffff)',
                border: '1px solid var(--crm-line, #e2e8f0)',
                borderRadius: '12px',
                padding: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <Phone size={15} style={{ color: 'var(--crm-accent, #A9824A)' }} />
                  <strong style={{ fontSize: '0.84rem' }}>{isAr ? 'تسجيل نتيجة مكالمة سريعة بنقرة واحدة:' : 'Log Call Outcome (1-Click):'}</strong>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { label: isAr ? 'لم يرد' : 'No Answer', color: 'var(--crm-muted)' },
                    { label: isAr ? 'طلب مهلة للاتصال' : 'Callback', color: '#f59e0b' },
                    { label: isAr ? 'مهتم ويبحث بجدية' : 'Interested', color: '#047857' },
                    { label: isAr ? 'تم تحديد موعد معاينة' : 'Viewing Set', color: '#2563eb' },
                    { label: isAr ? 'غير مناسب / ميزانية أقل' : 'Not Match', color: '#ef4444' }
                  ].map((btn, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleLogCall(btn.label)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        background: 'var(--crm-subtle, #f9f8f5)',
                        border: '1px solid var(--crm-line, #e2e8f0)',
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

              {/* 2. WhatsApp Pre-formatted Pitches */}
              <div style={{
                background: 'var(--crm-card, #ffffff)',
                border: '1px solid var(--crm-line, #e2e8f0)',
                borderRadius: '12px',
                padding: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <MessageSquare size={15} style={{ color: '#25D366' }} />
                  <strong style={{ fontSize: '0.84rem' }}>{isAr ? 'رسائل واتساب تسويقية جاهزة للإرسال:' : 'Instant WhatsApp Pitches:'}</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {whatsappTemplates.map((tpl, i) => {
                    const waHref = `https://wa.me/${egWhatsapp}?text=${encodeURIComponent(tpl.msg)}`;
                    return (
                      <div
                        key={i}
                        style={{
                          background: 'var(--crm-subtle, #f9f8f5)',
                          border: '1px solid var(--crm-line, #e2e8f0)',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--crm-ink)' }}>{tpl.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', marginTop: '2px', lineClamp: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                            {tpl.msg}
                          </div>
                        </div>

                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                          style={{
                            background: '#25D366',
                            color: '#ffffff',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
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
              </div>

              {/* 3. Schedule Viewing Toggle / Form */}
              <div style={{
                background: 'var(--crm-card, #ffffff)',
                border: '1px solid var(--crm-line, #e2e8f0)',
                borderRadius: '12px',
                padding: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} style={{ color: 'var(--crm-accent, #A9824A)' }} />
                    <strong style={{ fontSize: '0.84rem' }}>{isAr ? 'جدولة موعد معاينة ميدانية:' : 'Schedule Property Viewing:'}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowViewingForm(!showViewingForm)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--crm-accent, #A9824A)',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    {showViewingForm ? (isAr ? 'إلغاء' : 'Cancel') : (isAr ? '+ جدولة الآن' : '+ Schedule')}
                  </button>
                </div>

                {showViewingForm && (
                  <form onSubmit={handleScheduleViewing} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '4px' }}>
                        {isAr ? 'اختر الوحدة المراد معاينتها:' : 'Select Property:'}
                      </label>
                      <select
                        value={selectedViewingPropId}
                        onChange={(e) => setSelectedViewingPropId(e.target.value)}
                        required
                        className="form-input"
                        style={{ width: '100%', padding: '6px 10px', fontSize: '0.78rem', borderRadius: '8px' }}
                      >
                        <option value="">{isAr ? '-- اختر العقار من المحفظة --' : '-- Choose Property --'}</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.id.toUpperCase()} — {p.title_ar || p.title_en} ({p.price?.toLocaleString()} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, marginBottom: '4px' }}>
                        {isAr ? 'تاريخ ووقت المعاينة المفضل:' : 'Date & Time:'}
                      </label>
                      <input
                        type="datetime-local"
                        value={viewingDateTime}
                        onChange={(e) => setViewingDateTime(e.target.value)}
                        required
                        className="form-input"
                        style={{ width: '100%', padding: '6px 10px', fontSize: '0.78rem', borderRadius: '8px' }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: 'var(--crm-accent, #A9824A)',
                        color: '#ffffff',
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
          )}

          {/* TAB 2: SMART MATCHING IN CONTEXT */}
          {activeTab === 'matching' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: 'rgba(169, 130, 74, 0.08)',
                border: '1px solid rgba(169, 130, 74, 0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.78rem',
                color: 'var(--crm-ink)'
              }}>
                <Sparkles size={15} style={{ color: 'var(--crm-accent)', marginInlineEnd: '6px', verticalAlign: 'middle' }} />
                <span>
                  {isAr 
                    ? `وحدات معتمدة مطابقة لميزانية (${lead.budget || lead.details?.budget || 'غير محددة'}) ومنطقة (${areaName}):` 
                    : `Matching properties for budget and area:`}
                </span>
              </div>

              {matchedProperties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--crm-muted)' }}>
                  <Building size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.82rem' }}>
                    {isAr ? 'لا توجد وحدات مطابقة تماماً حالياً بالمحفظة. جرب توسيع معايير البحث.' : 'No direct property matches found.'}
                  </p>
                </div>
              ) : (
                matchedProperties.map(p => {
                  const propShareMsg = encodeURIComponent(
                    `أهلاً بك أستاذ ${lead.name}، بناءً على طلبك أرشح لك وحدة مميزة بمحفظة 1Line:\n` +
                    `🏢 ${p.title_ar || p.title_en}\n` +
                    `📍 الموقع: ${p.locationName_ar || p.areaKey}\n` +
                    `💰 السعر: ${p.price?.toLocaleString()} ج.م\n` +
                    `🔗 تفاصيل الوحدة: https://1-line-qkzp9.vercel.app/properties/${p.id}`
                  );
                  const shareHref = `https://wa.me/${egWhatsapp}?text=${propShareMsg}`;

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: 'var(--crm-card, #ffffff)',
                        border: '1px solid var(--crm-line, #e2e8f0)',
                        borderRadius: '12px',
                        padding: '12px',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center'
                      }}
                    >
                      <img
                        src={p.images?.[0] || '/og-image.jpg'}
                        alt={p.title_ar || 'Property'}
                        style={{
                          width: '74px',
                          height: '74px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          flexShrink: 0
                        }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(4, 120, 87, 0.1)',
                            color: '#047857'
                          }}>
                            {p._matchScore}% {isAr ? 'تطابق' : 'Match'}
                          </span>
                          <strong style={{ fontSize: '0.84rem', color: 'var(--crm-accent)' }}>
                            {p.price?.toLocaleString()} ج.م
                          </strong>
                        </div>

                        <div style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          marginTop: '3px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {p.title_ar || p.title_en}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', marginTop: '2px' }}>
                          {p.locationName_ar || p.areaKey} • {p.area} م²
                        </div>

                        {/* Direct Match Action */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                          <a
                            href={shareHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm"
                            style={{
                              background: '#25D366',
                              color: '#ffffff',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Share2 size={12} />
                            <span>{isAr ? 'إرسال للعميل عبر واتساب' : 'Share via WA'}</span>
                          </a>

                          <a
                            href={`/properties/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              textDecoration: 'none',
                              color: 'var(--crm-ink)'
                            }}
                          >
                            <ExternalLink size={12} />
                            <span>{isAr ? 'معاينة' : 'View'}</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="btn btn-primary"
                  style={{
                    alignSelf: 'flex-start',
                    padding: '6px 14px',
                    borderRadius: '7px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: 'var(--crm-accent, #A9824A)',
                    color: '#ffffff',
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
                background: 'var(--crm-card, #ffffff)',
                border: '1px solid var(--crm-line, #e2e8f0)',
                borderRadius: '12px',
                padding: '14px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--crm-ink)', marginBottom: '10px' }}>
                  {isAr ? 'سجل النشاط والملاحظات:' : 'Activity History:'}
                </div>

                {lead.notes ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {lead.notes.split('\n').filter(Boolean).map((line, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: '0.76rem',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: 'var(--crm-subtle, #f9f8f5)',
                          borderInlineStart: '3px solid var(--crm-accent, #A9824A)',
                          lineHeight: '1.4'
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.76rem', color: 'var(--crm-muted)' }}>
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
          borderTop: '1px solid var(--crm-line, #e2e8f0)',
          background: 'var(--crm-subtle, #f9f8f5)',
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
              fontSize: '0.78rem',
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
                color: '#ef4444',
                fontSize: '0.75rem',
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
    </>
  );
}
