import { useState } from 'react';
import { Phone, MessageSquare, CheckCircle2, Plus, Send, Activity, Lock, Calendar, Download } from 'lucide-react';


import { canViewLeadPhone, maskPhoneNumber } from '../../utils/rbacRules';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendarSync';
import CustomerOverviewTab from './lead-profile/CustomerOverviewTab';

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
  const isAr = lang === 'ar';
  const [profileTab, setProfileTab] = useState('overview'); // 'overview' | 'properties' | 'timeline' | 'actions'
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    phone: lead?.phone || '',
    whatsapp: lead?.whatsapp || lead?.phone || '',
    altPhone: lead?.altPhone || '',
    cityOrExpat: lead?.cityOrExpat || 'سوهاج',
    type: lead?.type || 'buyer',
    status: lead?.status || 'new',
    temperature: lead?.temperature || '',
    score: lead?.score || 85,
    assignedTo: lead?.assignedTo || 'Sales Advisor Team',
    budget: lead?.details?.budget || lead?.details?.expectedPrice || '',
    area: lead?.details?.area || 'east',
    propertyType: lead?.details?.propertyType || 'apartment',
    financing: lead?.financing || 'cash', // 'cash' | 'installments' | 'mortgage'
    tags: lead?.tags || ['VIP كاش', 'جاهز للمعاينة'],
    nextActionDate: lead?.nextActionDate || '',
    nextActionNote: lead?.nextActionNote || lead?.followUp || ''
  });

  // Call Log / Note Input State
  const [newLogText, setNewLogText] = useState('');
  const [newLogType, setNewLogType] = useState('call'); // 'call' | 'meeting' | 'whatsapp' | 'offer'

  // Available Tag Presets
  const AVAILABLE_TAGS = [
    { id: 'vip', name_ar: '💎 VIP كاش', name_en: 'VIP Cash' },
    { id: 'expat', name_ar: '✈️ مغترب بالخليج', name_en: 'Gulf Expat' },
    { id: 'investor', name_ar: '📈 مستثمر تجاري', name_en: 'Commercial Investor' },
    { id: 'urgent', name_ar: '🔥 مستعجل للشراء', name_en: 'Urgent Buyer' },
    { id: 'installment', name_ar: '🏦 يفضل التقسيط', name_en: 'Installments Preferred' },
    { id: 'negotiator', name_ar: '🤝 مفاوض جاد', name_en: 'Serious Negotiator' }
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
      });
    }

    setNewLogText('');
    if (triggerToast) {
      triggerToast(isAr ? 'تم تسجيل الملاحظة في التايم لاين بنجاح!' : 'Note logged to timeline!', 'success');
    }
  };

  // Save Full Profile Edits
  const handleSaveProfile = async (e) => {
    e.preventDefault();

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

    if (!formData.area) {
      if (triggerToast) triggerToast(isAr ? 'تحديد الموقع / المنطقة بسوهاج إلزامي!' : 'Area is required!', 'error');
      return;
    }

    if (!formData.propertyType) {
      if (triggerToast) triggerToast(isAr ? 'تحديد نوع العقار المهتم به إلزامي!' : 'Property type is required!', 'error');
      return;
    }

    const updatedLead = {
      name: nameTrimmed,
      phone: (formData.phone || '').trim() || whatsappTrimmed,
      whatsapp: whatsappTrimmed,
      altPhone: formData.altPhone,
      cityOrExpat: formData.cityOrExpat,
      type: formData.type,
      status: formData.status,
      temperature: formData.temperature,
      score: parseInt(formData.score) || 85,
      assignedTo: formData.assignedTo,
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
      const saved = await onUpdateLead(lead.id, updatedLead);
      if (saved === false) return;
    }

    setIsEditing(false);
    if (triggerToast) {
      triggerToast(isAr ? 'تم حفظ وتحديث ملف العميل الشامل بنجاح! 💾' : 'Customer 360 profile updated!', 'success');
    }
  };

  // Matched Properties for this client
  const matchedProperties = properties.filter(p => {
    const clientArea = formData.area || 'east';
    return p.areaKey === clientArea || !p.isDeleted;
  }).slice(0, 4);

  // Digital Journey & Clickstream History for this lead
  // Only the journey recorded on the customer's own device and saved with their request.
  // Nothing is read from this (staff) browser and nothing is invented when it is missing.
  const journeyEvents = Array.isArray(lead?.digitalJourney) ? lead.digitalJourney : [];
  const isLiveTracked = journeyEvents.length > 0;
  const dwellTimeLabel = lead?.dwellTimeFormatted || '';

  if (!isOpen || !lead) return null;

  const cleanPhone = (formData.whatsapp || formData.phone || '').replace(/[^0-9]/g, '');

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '860px', width: '95%', background: 'var(--crm-card)', color: 'var(--crm-ink)', border: '1px solid var(--crm-line-strong)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
        {/* Header Bar */}
        <div className="modal-form-header" style={{ borderBottom: '1px solid var(--crm-line)', paddingBottom: '16px', background: 'var(--crm-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: formData.temperature === 'hot' ? 'var(--crm-danger-soft)' : formData.temperature === 'warm' ? 'var(--crm-warn-soft)' : 'var(--crm-info-soft)',
              color: formData.temperature === 'hot' ? 'var(--crm-danger)' : formData.temperature === 'warm' ? 'var(--crm-warn)' : 'var(--crm-info)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--crm-text-xl)'
            }}>
              {formData.temperature === 'hot' ? '🔥' : formData.temperature === 'warm' ? '⚡' : formData.temperature === 'cold' ? '❄️' : '—'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--crm-text-lg)', color: 'var(--crm-ink)', fontWeight: 700 }}>{formData.name}</h3>
                <span className={`lead-score-pill ${formData.score >= 85 ? 'score-high' : 'score-medium'}`}>
                  {formData.score}% {isAr ? 'جدية' : 'Score'}
                </span>
                <span className="badge" style={{ background: 'var(--crm-subtle-2)', color: 'var(--crm-body)', border: '1px solid var(--crm-line-strong)', fontSize: 'var(--crm-text-xs)', fontWeight: 'bold' }}>
                  {formData.status?.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
                📍 {formData.cityOrExpat} • {isAr ? 'المسؤول:' : 'Agent:'} {formData.assignedTo}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Quick WhatsApp Action */}
            {canViewLeadPhone(userRole) ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer')}
                style={{ padding: '6px 12px', fontSize: 'var(--crm-text-sm)', background: 'var(--crm-positive-soft)', color: 'var(--crm-positive)', border: '1px solid var(--crm-positive-line)', fontWeight: 'bold' }}
              >
                <MessageSquare size={14} />
                <span>WhatsApp</span>
              </button>
            ) : (
              <span className="badge" style={{ fontSize: 'var(--crm-text-xs)', background: 'var(--crm-subtle)', color: 'var(--crm-muted)', border: '1px solid var(--crm-line)' }}>
                <Lock size={12} style={{ display: 'inline', marginInlineEnd: '4px' }} />
                {isAr ? 'واتساب محجوب' : 'WhatsApp Protected'}
              </span>
            )}

            {/* Quick Call Action */}
            {canViewLeadPhone(userRole) ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => window.open(`tel:${formData.phone}`, '_self')}
                style={{ padding: '6px 12px', fontSize: 'var(--crm-text-sm)', background: 'var(--crm-brand-navy)', color: 'var(--crm-on-dark)', border: '1px solid var(--crm-brand-navy)', fontWeight: 'bold' }}
              >
                <Phone size={14} />
                <span>{isAr ? 'اتصال' : 'Call'}</span>
              </button>
            ) : (
              <span className="badge" style={{ fontSize: 'var(--crm-text-xs)', background: 'var(--crm-subtle)', color: 'var(--crm-muted)', border: '1px solid var(--crm-line)' }}>
                <Lock size={12} style={{ display: 'inline', marginInlineEnd: '4px' }} />
                {isAr ? 'اتصال محجوب' : 'Call Protected'}
              </span>
            )}

            {/* Quick Google Calendar Sync */}
            <button
              type="button"
              className="btn btn-sm"
              title={isAr ? 'إضافة موعد معاينة في تقويم Google' : 'Sync viewing to Google Calendar'}
              onClick={() => {
                const displayPhone = canViewLeadPhone(userRole) ? formData.phone : maskPhoneNumber(formData.phone, userRole);
                const calUrl = generateGoogleCalendarUrl({
                  title: `${isAr ? 'معاينة عقارية 1Line' : '1Line Property Viewing'}: ${formData.name}`,
                  description: `العميل: ${formData.name}\nالهاتف: ${displayPhone}\nنوع العقار: ${formData.propertyType}\nالملاحظات: ${formData.nextActionNote || (lead?.notes || 'معاينة ميدانية')}`,
                  location: `محافظة سوهاج - ${formData.area || 'المقر الرئيسي'}`,
                  startTime: formData.nextActionDate || new Date(Date.now() + 24 * 3600 * 1000)
                });
                window.open(calUrl, '_blank', 'noopener,noreferrer');
                if (triggerToast) {
                  triggerToast(isAr ? 'جاري فتح تقويم Google لجدولة الموعد...' : 'Opening Google Calendar...', 'info');
                }
              }}
              style={{ padding: '6px 12px', fontSize: 'var(--crm-text-sm)', background: 'var(--crm-info-soft)', color: 'var(--crm-info)', border: '1px solid var(--crm-info-line)', fontWeight: 'bold' }}
            >
              <Calendar size={14} />
              <span>{isAr ? 'تقويم Google' : 'Google Cal'}</span>
            </button>

            {/* Download .ics for Apple / Outlook */}
            <button
              type="button"
              className="btn btn-sm"
              title={isAr ? 'تنزيل ملف موعد .ics لأجهزة iPhone و Outlook' : 'Download .ics for Apple/Outlook'}
              onClick={() => {
                const displayPhone = canViewLeadPhone(userRole) ? formData.phone : maskPhoneNumber(formData.phone, userRole);
                downloadIcsFile({
                  title: `معاينة عقارية 1Line: ${formData.name}`,
                  description: `العميل: ${formData.name} (${displayPhone})\nالملاحظات: ${formData.nextActionNote || (lead?.notes || 'معاينة عقارية')}`,
                  location: `محافظة سوهاج - ${formData.area || 'المقر'}`,
                  startTime: formData.nextActionDate || new Date(Date.now() + 24 * 3600 * 1000)
                }, `1Line-${formData.name || 'Viewing'}.ics`);
                if (triggerToast) {
                  triggerToast(isAr ? 'تم تنزيل ملف الموعد لتقويم هاتفك بنجاح!' : 'Calendar file (.ics) downloaded!', 'success');
                }
              }}
              style={{ padding: '6px 10px', fontSize: 'var(--crm-text-sm)', background: 'var(--crm-subtle)', color: 'var(--crm-body)', border: '1px solid var(--crm-line-strong)' }}
            >
              <Download size={13} />
              <span>.ICS</span>
            </button>

            <button type="button" className="drawer-close-btn" onClick={onClose} style={{ background: 'var(--crm-subtle-2)', color: 'var(--crm-ink)', border: '1px solid var(--crm-line-strong)' }}>✕</button>
          </div>
        </div>

        {/* 📇 TOP CONDENSED SNAPSHOT STRIP - Clean Slate White */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '8px',
          background: 'var(--crm-subtle)',
          borderBottom: '1px solid var(--crm-line)',
          padding: '10px 20px',
          fontSize: 'var(--crm-text-xs)'
        }}>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: 'var(--crm-text-xs)', fontWeight: '600' }}>{isAr ? 'نوع العميل' : 'Type'}</span>
            <span style={{ fontWeight: 'bold', color: 'var(--crm-warn)' }}>{formData.type === 'buyer' ? (isAr ? 'مشتري جاد' : 'Buyer') : (isAr ? 'بائع / معلن' : 'Seller')}</span>
          </div>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: 'var(--crm-text-xs)', fontWeight: '600' }}>{isAr ? 'الميزانية' : 'Budget'}</span>
            <span style={{ fontWeight: 'bold', color: 'var(--crm-ink)' }}>{formData.budget ? `${formData.budget} ج.م` : (isAr ? 'مرنة / تفاوض' : 'Negotiable')}</span>
          </div>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: 'var(--crm-text-xs)', fontWeight: '600' }}>{isAr ? 'المنطقة المطلوبة' : 'Target Area'}</span>
            <span style={{ fontWeight: 'bold', color: 'var(--crm-ink)' }}>{formData.area || 'سوهاج'}</span>
          </div>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: 'var(--crm-text-xs)', fontWeight: '600' }}>{isAr ? 'المسؤول' : 'Agent'}</span>
            <span style={{ fontWeight: 'bold', color: 'var(--crm-ink)' }}>{formData.assignedTo}</span>
          </div>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: 'var(--crm-text-xs)', fontWeight: '600' }}>{isAr ? 'مصدر الحملة' : 'Source'}</span>
            <span style={{ fontWeight: 'bold', color: 'var(--crm-violet)', fontSize: 'var(--crm-text-xs)' }}>
              {lead?.marketingAttribution?.source || lead?.utmSource || (isAr ? 'مباشر' : 'Direct')}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: 'var(--crm-text-xs)', fontWeight: '600' }}>{isAr ? 'المتابعة القادمة' : 'Next Action'}</span>
            <span style={{ fontWeight: 'bold', color: 'var(--crm-info)' }}>{formData.nextActionDate || formData.nextActionNote || (isAr ? 'قريباً' : 'Soon')}</span>
          </div>
        </div>

        {/* 360 Navigation Sub-Tabs - Clean White */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 20px',
          background: 'var(--crm-card)',
          borderBottom: '1px solid var(--crm-line)',
          overflowX: 'auto'
        }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setProfileTab('overview')}
            style={{
              fontSize: 'var(--crm-text-sm)',
              fontWeight: profileTab === 'overview' ? 'bold' : '600',
              background: profileTab === 'overview' ? 'var(--crm-brand-navy)' : 'var(--crm-subtle)',
              color: profileTab === 'overview' ? 'var(--crm-on-dark)' : 'var(--crm-muted)',
              border: profileTab === 'overview' ? '1px solid var(--crm-brand-navy)' : '1px solid var(--crm-line)',
              borderRadius: '8px'
            }}
          >
            👤 {isAr ? 'الملف الشخصي والمالي' : 'Overview & Financials'}
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setProfileTab('journey')}
            style={{
              fontSize: 'var(--crm-text-sm)',
              fontWeight: profileTab === 'journey' ? 'bold' : '600',
              background: profileTab === 'journey' ? 'var(--crm-info-solid)' : 'var(--crm-subtle)',
              color: profileTab === 'journey' ? 'var(--crm-on-dark)' : 'var(--crm-muted)',
              border: profileTab === 'journey' ? '1px solid var(--crm-info)' : '1px solid var(--crm-line)',
              borderRadius: '8px'
            }}
          >
            🌐 {isAr ? 'رحلة ونقرات الزائر' : 'Digital Journey'} ({journeyEvents.length})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setProfileTab('properties')}
            style={{
              fontSize: 'var(--crm-text-sm)',
              fontWeight: profileTab === 'properties' ? 'bold' : '600',
              background: profileTab === 'properties' ? 'var(--crm-warn-solid)' : 'var(--crm-subtle)',
              color: profileTab === 'properties' ? 'var(--crm-on-dark)' : 'var(--crm-muted)',
              border: profileTab === 'properties' ? '1px solid var(--crm-warn)' : '1px solid var(--crm-line)',
              borderRadius: '8px'
            }}
          >
            🏢 {isAr ? 'العقارات المرشحة' : 'Matched Properties'} ({matchedProperties.length})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setProfileTab('timeline')}
            style={{
              fontSize: 'var(--crm-text-sm)',
              fontWeight: profileTab === 'timeline' ? 'bold' : '600',
              background: profileTab === 'timeline' ? 'var(--crm-violet-solid)' : 'var(--crm-subtle)',
              color: profileTab === 'timeline' ? 'var(--crm-on-dark)' : 'var(--crm-muted)',
              border: profileTab === 'timeline' ? '1px solid var(--crm-violet)' : '1px solid var(--crm-line)',
              borderRadius: '8px'
            }}
          >
            🕒 {isAr ? 'سجل المكالمات' : 'Call Logs'} ({(lead.activityLogs || []).length})
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setProfileTab('actions')}
            style={{
              fontSize: 'var(--crm-text-sm)',
              fontWeight: profileTab === 'actions' ? 'bold' : '600',
              background: profileTab === 'actions' ? 'var(--crm-positive-solid)' : 'var(--crm-subtle)',
              color: profileTab === 'actions' ? 'var(--crm-on-dark)' : 'var(--crm-muted)',
              border: profileTab === 'actions' ? '1px solid var(--crm-positive)' : '1px solid var(--crm-line)',
              borderRadius: '8px'
            }}
          >
            📅 {isAr ? 'المتابعة القادمة' : 'Next Action'}
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', maxHeight: '550px', overflowY: 'auto' }}>
          {/* TAB 1: OVERVIEW & FINANCIALS */}
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
            />
          )}

          {/* TAB: DIGITAL JOURNEY & VISITOR CLICKSTREAM */}
          {profileTab === 'journey' && (
            <div>
              <div style={{
                background: isLiveTracked ? 'var(--crm-positive-soft)' : 'var(--crm-info-soft)',
                border: `1px solid ${isLiveTracked ? 'var(--crm-positive-line)' : 'var(--crm-info-line)'}`,
                borderRadius: '8px',
                padding: '14px 18px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <h4 style={{ margin: 0, color: isLiveTracked ? 'var(--crm-positive)' : 'var(--crm-info)', fontSize: 'var(--crm-text-md)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <Activity size={16} />
                    <span>{isAr ? 'البصمة الرقمية وسلوك التصفح الفعلي للعميل' : 'Customer Digital Footprint & Dwell Time'}</span>
                  </h4>
                  <small style={{ color: 'var(--crm-body)' }}>
                    {isLiveTracked 
                      ? (isAr ? 'الصفحات والعقارات اللي العميل فتحها قبل ما يبعت طلبه' : 'Pages and listings the client opened before submitting.') 
                      : (isAr ? 'مفيش رحلة تصفح متسجلة للعميل ده (بتتسجل بس لما يبعت طلبه من الموقع على جهازه)' : 'No browsing journey recorded (only captured when the client submits from the site).')}
                  </small>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge" style={{
                    background: isLiveTracked ? 'var(--crm-positive-soft)' : 'var(--crm-warn-soft)',
                    color: isLiveTracked ? 'var(--crm-positive)' : 'var(--crm-warn)',
                    fontWeight: 'bold',
                    border: `1px solid ${isLiveTracked ? 'var(--crm-positive)' : 'var(--crm-warn-line)'}`,
                    fontSize: 'var(--crm-text-xs)'
                  }}>
                    {isLiveTracked ? '🟢 ' + (isAr ? 'مسجلة من جهاز العميل' : 'Recorded on client device') : (isAr ? 'غير متاحة' : 'Not available')}
                  </span>

                  {dwellTimeLabel && (
                  <span className="badge" style={{ background: 'var(--crm-info-soft)', color: 'var(--crm-info)', fontWeight: 'bold', border: '1px solid var(--crm-info-line)' }}>
                    ⏱️ {isAr ? `مدة الجلسة: ${dwellTimeLabel}` : `Dwell Time: ${dwellTimeLabel}`}
                  </span>
                  )}
                </div>
              </div>

              {/* Step-by-step Journey Stream */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {journeyEvents.map((evt, idx) => {
                  const getEventLabel = (type) => {
                    switch (type) {
                      case 'whatsapp_click':
                        return { text: isAr ? '💬 نقرة واتساب' : '💬 WhatsApp Click', color: 'var(--crm-positive)', bg: 'var(--crm-positive-soft)', border: 'var(--crm-positive-line)' };
                      case 'calculator_used':
                        return { text: isAr ? '🧮 حاسبة التمويل' : '🧮 Calculator Used', color: 'var(--crm-info)', bg: 'var(--crm-info-soft)', border: 'var(--crm-info-line)' };
                      case 'property_view':
                        return { text: isAr ? '👁️ تصفح عقار' : '👁️ Listing Viewed', color: 'var(--crm-accent-text)', bg: 'var(--crm-warn-soft)', border: 'var(--crm-warn-line)' };
                      case 'compare_added':
                        return { text: isAr ? '⚖️ إضافة للمقارنة' : '⚖️ Added to Compare', color: 'var(--crm-violet)', bg: 'var(--crm-violet-soft)', border: 'var(--crm-violet-line)' };
                      case 'favorite_added':
                        return { text: isAr ? '❤️ إضافة للمفضلة' : '❤️ Favorited', color: 'var(--crm-danger)', bg: 'var(--crm-danger-soft)', border: 'var(--crm-danger-line)' };
                      case 'brochure_request':
                        return { text: isAr ? '📑 طلب بروشور (واتساب)' : '📑 Brochure request', color: 'var(--crm-info)', bg: 'var(--crm-info-soft)', border: 'var(--crm-info-line)' };
                      case 'brochure_download':
                        return { text: isAr ? '📑 تنزيل بروشور' : '📑 PDF Brochure', color: 'var(--crm-info)', bg: 'var(--crm-info-soft)', border: 'var(--crm-info-line)' };
                      default:
                        return { text: isAr ? '🌐 تصفح الموقع' : '🌐 Page View', color: 'var(--crm-info)', bg: 'var(--crm-info-soft)', border: 'var(--crm-info-line)' };
                    }
                  };

                  const badgeInfo = getEventLabel(evt.eventType);
                  const title = evt.metadata?.title || evt.url || (isAr ? 'تصفح صفحة' : 'Page Visit');

                  return (
                    <div
                      key={evt.id || idx}
                      style={{
                        background: 'var(--crm-card)',
                        border: '1px solid var(--crm-line)',
                        borderInlineStart: `4px solid ${badgeInfo.color}`,
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                          <span style={{
                            background: badgeInfo.bg,
                            color: badgeInfo.color,
                            border: `1px solid ${badgeInfo.border}`,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: 'var(--crm-text-xs)',
                            fontWeight: 'bold'
                          }}>
                            {badgeInfo.text}
                          </span>
                          <strong style={{ fontSize: 'var(--crm-text-base)', color: 'var(--crm-ink)' }}>
                            {title}
                          </strong>
                        </div>
                        <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
                          📍 {formData.cityOrExpat || 'سوهاج'} • {isAr ? 'عبر متصفح الهاتف / الويب' : 'Mobile / Web'}
                        </span>
                      </div>

                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)', whiteSpace: 'nowrap' }}>
                        {new Date(evt.timestamp).toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: MATCHED & INSPECTED PROPERTIES */}
          {profileTab === 'properties' && (
            <div>
              <h4 style={{ margin: '0 0 14px 0', color: 'var(--crm-ink)', fontSize: 'var(--crm-text-md)', fontWeight: 700 }}>
                🏢 {isAr ? 'العقارات والوحدات المقترحة لهذا العميل:' : 'Matched & Recommended Units:'}
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {matchedProperties.map((prop) => (
                  <div
                    key={prop.id}
                    style={{
                      background: 'var(--crm-card)',
                      border: '1px solid var(--crm-line)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 'var(--crm-text-base)', display: 'block', color: 'var(--crm-ink)' }}>
                        {isAr ? prop.title_ar : prop.title_en}
                      </strong>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-positive)', fontWeight: 'bold' }}>
                        💰 {prop.price?.toLocaleString('en-US')} ج.م • {prop.size} م²
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        const waText = `أهلاً أ. ${formData.name}، بخصوص طلبك العقاري، نود ترشيح وحدة ${isAr ? prop.title_ar : prop.title_en} بسعر ${prop.price?.toLocaleString('en-US')} ج.م. هل نحدد موعداً للمعاينة؟`;
                        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer');
                      }}
                      style={{ padding: '6px 10px', fontSize: 'var(--crm-text-xs)', background: 'var(--crm-brand-navy)', color: 'var(--crm-on-dark)', borderRadius: '6px' }}
                      title={isAr ? 'إرسال بروشور الوحدة على الواتساب' : 'Send WhatsApp Brochure'}
                    >
                      <Send size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CALL LOGS & INTERACTIVE TIMELINE */}
          {profileTab === 'timeline' && (
            <div>
              {/* Add New Note Box */}
              <form onSubmit={handleAddLog} style={{
                background: 'var(--crm-card)',
                border: '1px solid var(--crm-line-strong)',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}>
                <label style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: 'var(--crm-ink)' }}>
                  ✍️ {isAr ? 'تسجيل ملاحظة اتصال أو نتيجة مكالمة جديدة:' : 'Log Call / Meeting Notes:'}
                </label>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={newLogType}
                    onChange={(e) => setNewLogType(e.target.value)}
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: 'var(--crm-text-sm)', width: '160px', background: 'var(--crm-subtle)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
                  >
                    <option value="call">📞 مكالمة هاتفية</option>
                    <option value="whatsapp">💬 محادثة واتساب</option>
                    <option value="meeting">🤝 اجتماع / معاينة</option>
                    <option value="offer">📑 تقديم عرض سعر</option>
                  </select>

                  <input
                    type="text"
                    placeholder={isAr ? 'اكتب ملخص المكالمة أو الاتفاق هنا...' : 'Enter note details...'}
                    value={newLogText}
                    onChange={(e) => setNewLogText(e.target.value)}
                    className="form-input"
                    style={{ flex: 1, fontSize: 'var(--crm-text-base)', background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
                    required
                  />

                  <button type="submit" className="btn btn-sm btn-primary" style={{ padding: '6px 14px', background: 'var(--crm-brand-navy)', color: 'var(--crm-on-dark)', borderRadius: '6px', fontWeight: 'bold' }}>
                    <Plus size={14} />
                    <span>{isAr ? 'إضافة' : 'Add'}</span>
                  </button>
                </div>
              </form>

              {/* Timeline Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(!lead.activityLogs || lead.activityLogs.length === 0) ? (
                  <p style={{ textAlign: 'center', color: 'var(--crm-muted)', padding: '20px' }}>
                    {isAr ? 'لا توجد سجلات اتصال سابقة' : 'No call logs recorded'}
                  </p>
                ) : (
                  lead.activityLogs.map((log, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--crm-card)',
                        border: '1px solid var(--crm-line)',
                        borderInlineStart: '4px solid var(--crm-brand-navy)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: 'var(--crm-text-base)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: 'var(--crm-ink)' }}>{log.action}</strong>
                        <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
                          {new Date(log.timestamp).toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US')} - {new Date(log.timestamp).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US')}
                        </span>
                      </div>
                      {log.agent && (
                        <small style={{ color: 'var(--crm-accent-text)', fontWeight: 'bold' }}>👤 {log.agent}</small>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: NEXT ACTIONS & REMINDERS */}
          {profileTab === 'actions' && (
            <div style={{
              background: 'var(--crm-card)',
              border: '1px solid var(--crm-line-strong)',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <h4 style={{ margin: '0 0 14px 0', color: 'var(--crm-ink)', fontSize: 'var(--crm-text-md)', fontWeight: 700 }}>
                📅 {isAr ? 'جدولة الإجراء القادم وموعد المتابعة' : 'Scheduled Next Action'}
              </h4>

              <div className="cms-form-grid" style={{ gridTemplateColumns: '1fr 1.5fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group-item">
                  <label style={{ color: 'var(--crm-body)', fontWeight: 'bold', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'تاريخ ووقت المتابعة القادمة:' : 'Follow-up Date:'}</label>
                  <input
                    type="date"
                    value={formData.nextActionDate}
                    onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
                    style={{ background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
                  />
                </div>

                <div className="form-group-item">
                  <label style={{ color: 'var(--crm-body)', fontWeight: 'bold', fontSize: 'var(--crm-text-sm)' }}>{isAr ? 'تفاصيل الإجراء المطلوب:' : 'Action Details:'}</label>
                  <input
                    type="text"
                    placeholder="مثال: الاتصال للتفاوض النهائي على مقدم شقة الكوثر"
                    value={formData.nextActionNote}
                    onChange={(e) => setFormData({ ...formData, nextActionNote: e.target.value })}
                    style={{ background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveProfile}
                style={{ background: 'var(--crm-positive-solid)', color: 'var(--crm-on-dark)', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
              >
                <CheckCircle2 size={16} />
                <span>{isAr ? 'اعتماد وحفظ موعد التذكير' : 'Save Reminder'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
