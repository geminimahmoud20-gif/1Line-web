import { useState, useRef, useEffect, useCallback } from 'react';
import useTeamMembers from '../../hooks/useTeamMembers';
import { assigneeValue, assignmentUpdates, assigneeLabel } from '../../utils/assignees';
import { getLiveLeadDesks } from '../../utils/rbacRules';
import { INBOX_STAGES, pipelineStageLabel } from '../../utils/inboxView';
import './client-profile.css';
import { Phone, MessageSquare, CheckCircle2, Plus, Send, Activity, Lock, Calendar, Download } from 'lucide-react';


import { canViewLeadPhone, maskPhoneNumber } from '../../utils/rbacRules';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendarSync';
import CustomerOverviewTab from './lead-profile/CustomerOverviewTab';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { parseMoney } from '../../utils/crmLeadViews';
import { normalizeAreaKey, getAreas } from '../../utils/areasData';
import { areaNameOf } from '../../utils/areaLookup';
import { isValidPhoneNumber } from '../../utils/securityShield';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';
import VisitorJourney from './analytics/VisitorJourney';
import LeadScorePill from './LeadScorePill';
import { useConfirm } from '../ui';
import { phoneProblem } from '../../utils/contactValidation';
import { auditContactUse } from '../../utils/contactAudit';

export default function CustomerProfileModal({
  isOpen,
  onClose,
  lead,
  properties = [],
  onUpdateLead,
  lang = 'ar',
  triggerToast,
  userRole = 'super_admin'
}) {
  const confirm = useConfirm();
  const isAr = lang === 'ar';
  useBodyScrollLock(isOpen);
  const isSubmittingRef = useRef(false);
  const mouseDownOnBackdropRef = useRef(false);

  const [profileTab, setProfileTab] = useState('overview'); // 'overview' | 'properties' | 'timeline' | 'actions'
  const [isEditing, setIsEditing] = useState(false);

  // People on the team, for «المستشار المسؤول» by name
  const teamMembers = useTeamMembers(lead ? [lead] : []);

  // Form State
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    whatsapp: lead?.whatsapp || lead?.phone || '',
    altPhone: lead?.altPhone || '',
    cityOrExpat: (!lead?.cityOrExpat || lead?.cityOrExpat === 'undefined') ? 'سوهاج' : lead.cityOrExpat,
    type: lead?.type || 'buyer',
    status: lead?.status || 'new',
    temperature: lead?.temperature || '',
    // The owner as the select shows it: a desk, or `user:<uid>` for a person (utils/assignees)
    assignedTo: assigneeValue(lead || {}),
    budget: lead?.details?.budget || lead?.details?.expectedPrice || '',
    // No saved area stays empty (it used to become 'east', saved back on the next edit)
    area: (!lead?.details?.area || lead?.details?.area === 'undefined') ? (lead?.area || '') : lead.details.area,
    propertyType: (!lead?.details?.propertyType || lead?.details?.propertyType === 'undefined') ? 'apartment' : lead.details.propertyType,
    financing: lead?.financing || 'cash', // 'cash' | 'installments' | 'mortgage'
    tags: Array.isArray(lead?.tags) ? lead.tags : [],
    nextActionDate: lead?.nextActionDate || '',
    nextActionNote: lead?.nextActionNote || lead?.followUp || ''
  });
  // The owner by name for the header, never the select's internal value
  const ownerLabel = assigneeLabel(formData.assignedTo, teamMembers, isAr, getLiveLeadDesks()) || lead?.ownerName || '';

  // Call Log / Note Input State
  const [newLogText, setNewLogText] = useState('');
  const [newLogType, setNewLogType] = useState('call'); // 'call' | 'meeting' | 'whatsapp' | 'offer'

  // Dirty State (Unsaved Changes) Protection
  const hasUnsavedProfile = Boolean(isEditing || (newLogText && newLogText.trim()));

  const handleSafeClose = useCallback(async () => {
    if (hasUnsavedProfile) {
      const confirmClose = await confirm({ message: isAr
          ? 'لديك تعديلات أو ملاحظات غير محفوظة في ملف العميل، هل أنت متأكد من الخروج وتجاهلها؟'
          : 'You have unsaved changes or notes in this profile. Are you sure you want to discard them?', tone: 'primary' });
      if (!confirmClose) return;
    }
    onClose();
  }, [hasUnsavedProfile, isAr, onClose, confirm]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmittingRef.current) {
        handleSafeClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSafeClose]);

  // Available Tag Presets
  const AVAILABLE_TAGS = [
    { id: 'vip', name_ar: 'VIP كاش', name_en: 'VIP Cash' },
    { id: 'expat', name_ar: 'مغترب بالخليج', name_en: 'Gulf Expat' },
    { id: 'investor', name_ar: 'مستثمر تجاري', name_en: 'Commercial Investor' },
    { id: 'urgent', name_ar: 'مستعجل للشراء', name_en: 'Urgent Buyer' },
    { id: 'installment', name_ar: 'يفضل التقسيط', name_en: 'Installments Preferred' },
    { id: 'negotiator', name_ar: 'مفاوض جاد', name_en: 'Serious Negotiator' }
  ];

  // Toggle Tag
  const handleToggleTag = (tagText) => {
    const currentTags = formData.tags || [];
    if (currentTags.includes(tagText)) {
      setFormData({ ...formData, tags: currentTags.filter(t => t !== tagText) });
    } else {
      setFormData({ ...formData, tags: [...currentTags, tagText] });
    }
  };

  // Add Call Note / Timeline Entry
  const handleAddLog = (e) => {
    e.preventDefault();
    if (!newLogText.trim()) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      action: `${newLogType === 'call' ? '📞 مكالمة هاتفية' : newLogType === 'whatsapp' ? '💬 محادثة واتساب' : newLogType === 'meeting' ? '🤝 اجتماع / معاينة' : '📑 تقديم عرض مالي'}: ${newLogText}`,
      agent: formData.assignedTo
    };

    const updatedLogs = [logEntry, ...(lead.activityLogs || [])];

    if (onUpdateLead) {
      onUpdateLead(lead.id, {
        activityLogs: updatedLogs
      }, lead.version);
    }

    setNewLogText('');
    if (triggerToast) {
      triggerToast(isAr ? 'تم تسجيل الملاحظة في التايم لاين بنجاح!' : 'Note logged to timeline!', 'success');
    }
  };

  // Save Full Profile Edits
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    const nameTrimmed = (formData.name || '').trim();
    const whatsappTrimmed = (formData.whatsapp || formData.phone || '').trim();

    if (!nameTrimmed) {
      if (triggerToast) triggerToast(isAr ? 'اسم العميل إلزامي!' : 'Name is required!', 'error');
      return;
    }

    if (!whatsappTrimmed) {
      if (triggerToast) triggerToast(isAr ? 'رقم الواتساب إلزامي!' : 'WhatsApp number is required!', 'error');
      return;
    }

    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      if (triggerToast) triggerToast(`${isAr ? 'الرقم الأساسي' : 'Primary phone'}: ${phoneProblem(formData.phone, null, isAr)}`, 'error');
      return;
    }

    if (whatsappTrimmed && !isValidPhoneNumber(whatsappTrimmed)) {
      if (triggerToast) triggerToast(`${isAr ? 'الواتساب' : 'WhatsApp'}: ${phoneProblem(whatsappTrimmed, null, isAr)}`, 'error');
      return;
    }

    if (!formData.area) {
      if (triggerToast) triggerToast(isAr ? 'تحديد الموقع / المنطقة بسوهاج إلزامي!' : 'Area is required!', 'error');
      return;
    }

    if (!formData.propertyType) {
      if (triggerToast) triggerToast(isAr ? 'تحديد نوع العقار المهتم به إلزامي!' : 'Property type is required!', 'error');
      return;
    }

    try {
      isSubmittingRef.current = true;
      const updatedLead = {
        name: nameTrimmed,
        phone: (formData.phone || '').trim() || whatsappTrimmed,
        whatsapp: whatsappTrimmed,
        altPhone: formData.altPhone,
        cityOrExpat: formData.cityOrExpat,
        type: formData.type,
        status: formData.status,
        temperature: formData.temperature,
        // Only a changed owner is written, so saving other fields never reassigns the client
        ...(formData.assignedTo !== assigneeValue(lead) ? assignmentUpdates(lead, formData.assignedTo, teamMembers) : {}),
        financing: formData.financing,
        tags: formData.tags,
        nextActionDate: formData.nextActionDate,
        nextActionNote: formData.nextActionNote,
        followUp: formData.nextActionNote,
        details: {
          ...(lead.details || {}),
          budget: formData.budget,
          expectedPrice: formData.budget,
          area: formData.area,
          propertyType: formData.propertyType
        }
      };

      if (onUpdateLead) {
        const saved = await onUpdateLead(lead.id, updatedLead, lead.version);
        if (saved === false) return;
      }

      setIsEditing(false);
      if (triggerToast) {
        triggerToast(isAr ? 'تم حفظ وتحديث ملف العميل الشامل بنجاح!' : 'Customer 360 profile updated!', 'success');
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // Matched Properties for this client
  // Only what the client actually asked for (the form falls back to east/apartment for display)
  const wantArea = (lead?.details?.area || lead?.area) ? normalizeAreaKey(formData.area) : null;
  const wantType = (lead?.details?.propertyType || lead?.propertyType) ? formData.propertyType : null;
  const wantBudget = parseMoney(formData.budget) || parseMoney(lead?.budget);
  const matchedProperties = properties
    .filter((p) => !p.isDeleted && (p.status || 'published') === 'published' && Number(p.price) > 0)
    .map((p) => {
      const price = Number(p.price);
      // A different type, or a price far above the budget, is not a match at all
      if (wantType && p.type !== wantType) return null;
      if (wantBudget && price > wantBudget * 1.25) return null;
      let score = 0;
      if (wantArea && normalizeAreaKey(p.areaKey) === wantArea) score += 40;
      if (wantType) score += 30;
      if (wantBudget) score += price >= wantBudget * 0.75 ? 30 : 15;
      return { p, score };
    })
    .filter((m) => m && m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((m) => m.p);

  // Digital Journey & Clickstream History for this lead
  // Only the journey recorded on the customer's own device and saved with their request.
  // Nothing is read from this (staff) browser and nothing is invented when it is missing.
  const journeyEvents = Array.isArray(lead?.digitalJourney) ? lead.digitalJourney : [];
  const isLiveTracked = journeyEvents.length > 0;
  const dwellTimeLabel = lead?.dwellTimeFormatted || '';

  if (!isOpen || !lead) return null;

  const cleanPhone = (formData.whatsapp || formData.phone || '').replace(/[^0-9]/g, '');

  const canContact = canViewLeadPhone(userRole);
  const stageLabel = (INBOX_STAGES.find((st) => st.id === formData.status) || {})[isAr ? 'label_ar' : 'label_en'] || pipelineStageLabel(formData.status, isAr);
  const logs = Array.isArray(lead.activityLogs) ? lead.activityLogs : [];
  const when = (t) => {
    const d = new Date(t);
    return Number.isFinite(d.getTime()) ? `${d.toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit' })} · ${d.toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { day: 'numeric', month: 'short' })}` : '';
  };
  const eventTone = (type) => {
    switch (type) {
      case 'whatsapp_click': return ['positive', isAr ? 'نقرة واتساب' : 'WhatsApp Click'];
      case 'calculator_used': return ['info', isAr ? 'حاسبة التمويل' : 'Calculator Used'];
      case 'property_view': return ['warn', isAr ? 'تصفح عقار' : 'Listing Viewed'];
      case 'compare_added': return ['violet', isAr ? 'إضافة للمقارنة' : 'Added to Compare'];
      case 'favorite_added': return ['danger', isAr ? 'إضافة للمفضلة' : 'Favorited'];
      case 'brochure_request': return ['info', isAr ? 'طلب بروشور (واتساب)' : 'Brochure request'];
      case 'brochure_download': return ['info', isAr ? 'تنزيل بروشور' : 'PDF Brochure'];
      default: return ['info', isAr ? 'تصفح الموقع' : 'Page View'];
    }
  };
  const tabs = [
    { id: 'overview', label: isAr ? 'الملف' : 'Profile' },
    { id: 'timeline', label: isAr ? 'السجل' : 'History', count: logs.length },
    { id: 'actions', label: isAr ? 'المتابعة' : 'Follow-up' },
    { id: 'properties', label: isAr ? 'عقارات مرشحة' : 'Matches', count: matchedProperties.length },
    { id: 'journey', label: isAr ? 'رحلة الزائر' : 'Journey', count: journeyEvents.length }
  ];
  const stats = [
    [isAr ? 'النوع' : 'Type', formData.type === 'buyer' ? (isAr ? 'مشتري' : 'Buyer') : (isAr ? 'بائع / معلن' : 'Seller')],
    [isAr ? 'الميزانية' : 'Budget', formData.budget ? `${formData.budget} ${isAr ? 'ج.م' : 'EGP'}` : (isAr ? 'مرنة' : 'Flexible')],
    [isAr ? 'المنطقة' : 'Area', !formData.area ? 'سوهاج' : formData.area === 'all' ? (isAr ? 'كل المناطق' : 'All areas') : (areaNameOf(formData.area, getAreas(), isAr) || formData.area)],
    [isAr ? 'المسؤول' : 'Owner', ownerLabel || '—'],
    [isAr ? 'المصدر' : 'Source', lead?.marketingAttribution?.source || lead?.utmSource || (isAr ? 'مباشر' : 'Direct')],
    [isAr ? 'المتابعة' : 'Next', formData.nextActionDate || formData.nextActionNote || (isAr ? 'لسه' : 'Not set')]
  ];

  return (
    <div
      className="track-modal-backdrop"
      onMouseDown={(e) => { mouseDownOnBackdropRef.current = e.target === e.currentTarget; }}
      onClick={(e) => {
        if (e.target === e.currentTarget && mouseDownOnBackdropRef.current && !isSubmittingRef.current) {
          handleSafeClose();
        }
      }}
    >
      <div className="property-form-modal-card cp animate-fadeIn" role="dialog" aria-modal="true" aria-label={formData.name} onClick={(e) => e.stopPropagation()}>
        <header className="cp__head">
          <span className={`cp__avatar cp__avatar--${formData.temperature || 'none'}`} aria-hidden="true">{String(formData.name || '').trim().charAt(0) || '—'}</span>
          <div className="cp__who">
            <h3 className="cp__name">{formData.name}</h3>
            <p className="cp__meta">{[formData.cityOrExpat, ownerLabel ? `${isAr ? 'المسؤول:' : 'Owner:'} ${ownerLabel}` : ''].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" className="cp__close" onClick={handleSafeClose} aria-label={isAr ? 'إغلاق' : 'Close'}>✕</button>
          <div className="cp__badges">
            <LeadScorePill lead={{ ...lead, ...formData }} isAr={isAr} suffix={isAr ? ' اهتمام' : ' score'} />
            <span className="cp__stage">{stageLabel}</span>
          </div>
        </header>

        <div className="cp__actions">
          {canContact ? (
            <>
              <button type="button" className="cp__btn cp__btn--wa" onClick={() => { auditContactUse(lead, 'whatsapp'); window.open(`https://wa.me/${formatWhatsAppPhone(cleanPhone)}`, '_blank', 'noopener,noreferrer'); }}>
                <MessageSquare size={16} aria-hidden="true" /><span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
              </button>
              <button type="button" className="cp__btn cp__btn--call" onClick={() => { auditContactUse(lead, 'call'); window.open(`tel:${formData.phone}`, '_self'); }}>
                <Phone size={16} aria-hidden="true" /><span>{isAr ? 'اتصال' : 'Call'}</span>
              </button>
            </>
          ) : (
            <span className="cp__locked"><Lock size={14} aria-hidden="true" />{isAr ? 'الاتصال والواتساب محجوبين لدورك' : 'Call and WhatsApp are protected for your role'}</span>
          )}
          <button
            type="button"
            className="cp__btn cp__btn--icon"
            aria-label={isAr ? 'إضافة موعد معاينة في تقويم Google' : 'Add viewing to Google Calendar'}
            title={isAr ? 'تقويم Google' : 'Google Calendar'}
            onClick={() => {
              const displayPhone = canContact ? formData.phone : maskPhoneNumber(formData.phone, userRole);
              const calUrl = generateGoogleCalendarUrl({
                title: `${isAr ? 'معاينة عقارية 1Line' : '1Line Property Viewing'}: ${formData.name}`,
                description: `العميل: ${formData.name}\nالهاتف: ${displayPhone}\nنوع العقار: ${formData.propertyType}\nالملاحظات: ${formData.nextActionNote || (lead?.notes || 'معاينة ميدانية')}`,
                location: `محافظة سوهاج - ${formData.area || 'المقر الرئيسي'}`,
                startTime: formData.nextActionDate || new Date(Date.now() + 24 * 3600 * 1000)
              });
              window.open(calUrl, '_blank', 'noopener,noreferrer');
              if (triggerToast) triggerToast(isAr ? 'جاري فتح تقويم Google لجدولة الموعد...' : 'Opening Google Calendar...', 'info');
            }}
          >
            <Calendar size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="cp__btn cp__btn--icon"
            aria-label={isAr ? 'تنزيل ملف موعد .ics لأجهزة iPhone و Outlook' : 'Download .ics for Apple/Outlook'}
            title=".ics"
            onClick={() => {
              const displayPhone = canContact ? formData.phone : maskPhoneNumber(formData.phone, userRole);
              downloadIcsFile({
                title: `معاينة عقارية 1Line: ${formData.name}`,
                description: `العميل: ${formData.name} (${displayPhone})\nالملاحظات: ${formData.nextActionNote || (lead?.notes || 'معاينة عقارية')}`,
                location: `محافظة سوهاج - ${formData.area || 'المقر'}`,
                startTime: formData.nextActionDate || new Date(Date.now() + 24 * 3600 * 1000)
              }, `1Line-${formData.name || 'Viewing'}.ics`);
              if (triggerToast) triggerToast(isAr ? 'تم تنزيل ملف الموعد لتقويم هاتفك بنجاح!' : 'Calendar file (.ics) downloaded!', 'success');
            }}
          >
            <Download size={18} aria-hidden="true" />
          </button>
        </div>

        <dl className="cp__stats">
          {stats.map(([label, value]) => (
            <div key={label} className="cp__stat"><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>

        <div className="cp__tabs" role="tablist" aria-label={isAr ? 'أقسام ملف العميل' : 'Client sections'}>
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={profileTab === t.id} className="cp__tab" onClick={() => setProfileTab(t.id)}>
              {t.label}{t.count ? <span className="cp__count">{t.count}</span> : null}
            </button>
          ))}
        </div>

        <div className="cp__body">
          {profileTab === 'overview' && (
            <CustomerOverviewTab
              AVAILABLE_TAGS={AVAILABLE_TAGS}
              formData={formData}
              handleSaveProfile={handleSaveProfile}
              handleToggleTag={handleToggleTag}
              isAr={isAr}
              isEditing={isEditing}
              lang={lang}
              lead={lead}
              setFormData={setFormData}
              setIsEditing={setIsEditing}
              userRole={userRole}
              people={teamMembers}
            />
          )}

          {/* Server-side analytics profile (visitor accepted analytics when submitting) */}
          {profileTab === 'journey' && lead.analyticsVisitorId && (
            <VisitorJourney visitorId={lead.analyticsVisitorId} properties={properties} isAr={isAr} />
          )}
          {profileTab === 'journey' && !lead.analyticsVisitorId && (
            <div className="cp__stack">
              <div className={`cp__note ${isLiveTracked ? 'cp__note--ok' : ''}`}>
                <h4 className="cp__h"><Activity size={16} aria-hidden="true" />{isAr ? 'سلوك تصفح العميل قبل الطلب' : 'What the client browsed before the request'}</h4>
                <p>
                  {isLiveTracked
                    ? (isAr ? 'الصفحات والعقارات اللي العميل فتحها قبل ما يبعت طلبه، متسجلة من جهازه.' : 'Pages and listings the client opened before submitting, recorded on their device.')
                    : (isAr ? 'مفيش رحلة تصفح متسجلة للعميل ده (بتتسجل بس لما يبعت طلبه من الموقع على جهازه).' : 'No browsing journey recorded (only captured when the client submits from the site).')}
                </p>
                {dwellTimeLabel && <span className="cp__chip">{isAr ? `مدة الجلسة: ${dwellTimeLabel}` : `Dwell time: ${dwellTimeLabel}`}</span>}
              </div>
              <ol className="cp__events">
                {journeyEvents.map((evt, idx) => {
                  const [tone, text] = eventTone(evt.eventType);
                  return (
                    <li key={evt.id || idx} className="cp__event" data-tone={tone}>
                      <span className="cp__event-tag">{text}</span>
                      <strong className="cp__event-title">{evt.metadata?.title || evt.url || (isAr ? 'تصفح صفحة' : 'Page Visit')}</strong>
                      <span className="cp__event-time">{when(evt.timestamp)}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {profileTab === 'properties' && (
            <div className="cp__stack">
              <h4 className="cp__h">{isAr ? 'وحدات مقترحة للعميل' : 'Recommended units'}</h4>
              {matchedProperties.length === 0 && (
                <p className="cp__empty">{isAr ? 'مفيش وحدة منشورة بنفس النوع وفي حدود الميزانية دلوقتي.' : 'No published unit of this type within the budget right now.'}</p>
              )}
              <div className="cp__cards">
                {matchedProperties.map((prop) => (
                  <div key={prop.id} className="cp__card">
                    <div className="cp__card-text">
                      <strong>{isAr ? prop.title_ar : prop.title_en}</strong>
                      <span>{prop.price?.toLocaleString('en-US')} {isAr ? 'ج.م' : 'EGP'} · {prop.size} {isAr ? 'م²' : 'm²'}</span>
                    </div>
                    <button
                      type="button"
                      className="cp__btn cp__btn--icon"
                      aria-label={isAr ? 'إرسال الوحدة على الواتساب' : 'Send on WhatsApp'}
                      onClick={() => {
                        const waText = `أهلاً أ. ${formData.name}، بخصوص طلبك العقاري، نود ترشيح وحدة ${isAr ? prop.title_ar : prop.title_en} بسعر ${prop.price?.toLocaleString('en-US')} ج.م. هل نحدد موعداً للمعاينة؟`;
                        window.open(`https://wa.me/${formatWhatsAppPhone(cleanPhone)}?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <Send size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profileTab === 'timeline' && (
            <div className="cp__stack">
              <form onSubmit={handleAddLog} className="cp__logform">
                <label htmlFor="cp-log-text" className="cp__h">{isAr ? 'سجّل مكالمة أو ملاحظة' : 'Log a call or note'}</label>
                <div className="cp__logrow">
                  <select value={newLogType} onChange={(e) => setNewLogType(e.target.value)} className="form-input cp__logtype" aria-label={isAr ? 'نوع التسجيل' : 'Type'}>
                    <option value="call">مكالمة هاتفية</option>
                    <option value="whatsapp">محادثة واتساب</option>
                    <option value="meeting">اجتماع / معاينة</option>
                    <option value="offer">تقديم عرض سعر</option>
                  </select>
                  <input
                    id="cp-log-text"
                    type="text"
                    placeholder={isAr ? 'ملخص المكالمة أو الاتفاق...' : 'Enter note details...'}
                    value={newLogText}
                    onChange={(e) => setNewLogText(e.target.value)}
                    className="form-input cp__logtext"
                    required
                  />
                  <button type="submit" className="cp__btn cp__btn--primary"><Plus size={16} aria-hidden="true" /><span>{isAr ? 'إضافة' : 'Add'}</span></button>
                </div>
              </form>
              {logs.length === 0 ? (
                <p className="cp__empty">{isAr ? 'لسه مفيش سجل. أي مكالمة أو ملاحظة بتسجّلها هتظهر هنا.' : 'No history yet. Calls and notes you log show up here.'}</p>
              ) : (
                <ol className="cp__timeline">
                  {logs.map((log, idx) => (
                    <li key={idx} className="cp__tl-item">
                      <span className="cp__tl-time">{when(log.timestamp)}</span>
                      <span className="cp__tl-text">{log.action}</span>
                      {log.agent && <small className="cp__tl-agent">{log.agent}</small>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {profileTab === 'actions' && (
            <div className="cp__stack">
              <h4 className="cp__h">{isAr ? 'الإجراء القادم وموعد المتابعة' : 'Next action'}</h4>
              <div className="cp__fields">
                <label className="cp__field">
                  <span>{isAr ? 'تاريخ المتابعة' : 'Follow-up date'}</span>
                  <input type="date" value={formData.nextActionDate} onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })} />
                </label>
                <label className="cp__field">
                  <span>{isAr ? 'المطلوب' : 'What to do'}</span>
                  <input type="text" placeholder="مثال: الاتصال للتفاوض النهائي على مقدم الشقة" value={formData.nextActionNote} onChange={(e) => setFormData({ ...formData, nextActionNote: e.target.value })} />
                </label>
              </div>
              <button type="button" className="cp__btn cp__btn--primary cp__btn--block" onClick={handleSaveProfile}>
                <CheckCircle2 size={16} aria-hidden="true" /><span>{isAr ? 'احفظ موعد المتابعة' : 'Save reminder'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
