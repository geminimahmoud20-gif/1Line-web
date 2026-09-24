import { useState, useMemo } from 'react';
import { 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Edit3, 
  Save, 
  Plus, 
  Send,
  Activity,
  Lock,
  Calendar,
  Download
} from 'lucide-react';
import { getAreas } from '../../utils/areasData';
import { getLeadDigitalJourney } from '../../utils/visitorTracker';
import { canViewLeadPhone, maskPhoneNumber, canEditLead } from '../../utils/rbacRules';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../../utils/calendarSync';

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
    temperature: lead?.temperature || 'hot',
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
  const { journeyEvents, isLiveTracked, dwellTimeLabel } = useMemo(() => {
    // Priority 1: Real events saved directly on the lead object (synced from Cloud/LocalStorage)
    if (Array.isArray(lead.digitalJourney) && lead.digitalJourney.length > 0) {
      return {
        journeyEvents: lead.digitalJourney,
        isLiveTracked: true,
        dwellTimeLabel: lead.dwellTimeFormatted || 'جلسة مباشرة'
      };
    }

    // Priority 2: Direct events recorded in active browser session matching phone/name
    const directEvents = getLeadDigitalJourney(lead.phone || lead.name);
    if (directEvents && directEvents.length > 0) {
      return {
        journeyEvents: directEvents,
        isLiveTracked: true,
        dwellTimeLabel: lead.dwellTimeFormatted || 'جلسة مباشرة'
      };
    }

    // Priority 3: Transparently identified demo journey for sample/mock leads
    const baseTime = lead.timestamp 
      ? (typeof lead.timestamp === 'string' ? new Date(lead.timestamp).getTime() : Number(lead.timestamp) || 1772700000000)
      : 1772700000000;

    return {
      journeyEvents: [
        {
          id: 'tr_1',
          eventType: 'whatsapp_click',
          timestamp: lead.timestamp || new Date(baseTime - 1800000).toISOString(),
          metadata: { title: `طلب تواصل مباشر واتساب بشأن عقارات ${formData.area || 'سوهاج'}` }
        },
        {
          id: 'tr_2',
          eventType: 'calculator_used',
          timestamp: new Date(baseTime - 5400000).toISOString(),
          metadata: { title: `تجربة حاسبة التمويل والأقساط لميزانية ${formData.budget || '3,000,000'} ج.م` }
        },
        {
          id: 'tr_3',
          eventType: 'property_view',
          timestamp: new Date(baseTime - 9000000).toISOString(),
          metadata: { title: `تصفح تفاصيل وحدات ${formData.propertyType || 'الشقق'} في ${formData.area || 'شرق سوهاج'}` }
        },
        {
          id: 'tr_4',
          eventType: 'page_view',
          timestamp: new Date(baseTime - 12600000).toISOString(),
          metadata: { title: 'دخول الموقع واستكشاف الفرص المتاحة' }
        }
      ],
      isLiveTracked: false,
      dwellTimeLabel: isAr ? '6د 15ث (تقديري استرشادي)' : '~6m 15s (Demo Estimate)'
    };
  }, [lead, formData, isAr]);

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
              background: formData.temperature === 'hot' ? '#fee2e2' : formData.temperature === 'warm' ? '#fef3c7' : '#e0f2fe',
              color: formData.temperature === 'hot' ? '#dc2626' : formData.temperature === 'warm' ? '#d97706' : '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
              {formData.temperature === 'hot' ? '🔥' : formData.temperature === 'warm' ? '⚡' : '❄️'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--crm-ink)', fontWeight: 700 }}>{formData.name}</h3>
                <span className={`lead-score-pill ${formData.score >= 85 ? 'score-high' : 'score-medium'}`}>
                  {formData.score}% {isAr ? 'جدية' : 'Score'}
                </span>
                <span className="badge" style={{ background: 'var(--crm-subtle-2)', color: 'var(--crm-body)', border: '1px solid var(--crm-line-strong)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {formData.status?.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--crm-muted)' }}>
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
                style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#ecfdf5', color: 'var(--crm-positive)', border: '1px solid #a7f3d0', fontWeight: 'bold' }}
              >
                <MessageSquare size={14} />
                <span>WhatsApp</span>
              </button>
            ) : (
              <span className="badge" style={{ fontSize: '0.75rem', background: 'var(--crm-subtle)', color: 'var(--crm-muted)', border: '1px solid var(--crm-line)' }}>
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
                style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#092347', color: '#ffffff', border: '1px solid #092347', fontWeight: 'bold' }}
              >
                <Phone size={14} />
                <span>{isAr ? 'اتصال' : 'Call'}</span>
              </button>
            ) : (
              <span className="badge" style={{ fontSize: '0.75rem', background: 'var(--crm-subtle)', color: 'var(--crm-muted)', border: '1px solid var(--crm-line)' }}>
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
                const calUrl = generateGoogleCalendarUrl({
                  title: `${isAr ? 'معاينة عقارية 1Line' : '1Line Property Viewing'}: ${formData.name}`,
                  description: `العميل: ${formData.name}\nالهاتف: ${formData.phone}\nنوع العقار: ${formData.propertyType}\nالملاحظات: ${formData.nextActionNote || (lead?.notes || 'معاينة ميدانية')}`,
                  location: `محافظة سوهاج - ${formData.area || 'المقر الرئيسي'}`,
                  startTime: formData.nextActionDate || new Date(Date.now() + 24 * 3600 * 1000)
                });
                window.open(calUrl, '_blank', 'noopener,noreferrer');
                if (triggerToast) {
                  triggerToast(isAr ? 'جاري فتح تقويم Google لجدولة الموعد...' : 'Opening Google Calendar...', 'info');
                }
              }}
              style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 'bold' }}
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
                downloadIcsFile({
                  title: `معاينة عقارية 1Line: ${formData.name}`,
                  description: `العميل: ${formData.name} (${formData.phone})\nالملاحظات: ${formData.nextActionNote || (lead?.notes || 'معاينة عقارية')}`,
                  location: `محافظة سوهاج - ${formData.area || 'المقر'}`,
                  startTime: formData.nextActionDate || new Date(Date.now() + 24 * 3600 * 1000)
                }, `1Line-${formData.name || 'Viewing'}.ics`);
                if (triggerToast) {
                  triggerToast(isAr ? 'تم تنزيل ملف الموعد لتقويم هاتفك بنجاح!' : 'Calendar file (.ics) downloaded!', 'success');
                }
              }}
              style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--crm-subtle)', color: 'var(--crm-body)', border: '1px solid var(--crm-line-strong)' }}
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
          fontSize: '0.78rem'
        }}>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: '0.68rem', fontWeight: '600' }}>{isAr ? 'نوع العميل' : 'Type'}</span>
            <span style={{ fontWeight: 'bold', color: '#b45309' }}>{formData.type === 'buyer' ? (isAr ? 'مشتري جاد' : 'Buyer') : (isAr ? 'بائع / معلن' : 'Seller')}</span>
          </div>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: '0.68rem', fontWeight: '600' }}>{isAr ? 'الميزانية' : 'Budget'}</span>
            <span style={{ fontWeight: 'bold', color: 'var(--crm-ink)' }}>{formData.budget ? `${formData.budget} ج.م` : (isAr ? 'مرنة / تفاوض' : 'Negotiable')}</span>
          </div>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: '0.68rem', fontWeight: '600' }}>{isAr ? 'المنطقة المطلوبة' : 'Target Area'}</span>
            <span style={{ fontWeight: 'bold', color: 'var(--crm-ink)' }}>{formData.area || 'سوهاج'}</span>
          </div>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: '0.68rem', fontWeight: '600' }}>{isAr ? 'المسؤول' : 'Agent'}</span>
            <span style={{ fontWeight: 'bold', color: 'var(--crm-ink)' }}>{formData.assignedTo}</span>
          </div>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: '0.68rem', fontWeight: '600' }}>{isAr ? 'مصدر الحملة' : 'Source'}</span>
            <span style={{ fontWeight: 'bold', color: '#7c3aed', fontSize: '0.74rem' }}>
              {lead?.marketingAttribution?.source || lead?.utmSource || (isAr ? 'مباشر' : 'Direct')}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--crm-muted)', display: 'block', fontSize: '0.68rem', fontWeight: '600' }}>{isAr ? 'المتابعة القادمة' : 'Next Action'}</span>
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
              fontSize: '0.8rem',
              fontWeight: profileTab === 'overview' ? 'bold' : '600',
              background: profileTab === 'overview' ? '#092347' : '#f8fafc',
              color: profileTab === 'overview' ? '#ffffff' : '#475569',
              border: profileTab === 'overview' ? '1px solid #092347' : '1px solid #e2e8f0',
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
              fontSize: '0.8rem',
              fontWeight: profileTab === 'journey' ? 'bold' : '600',
              background: profileTab === 'journey' ? '#0284c7' : '#f8fafc',
              color: profileTab === 'journey' ? '#ffffff' : '#475569',
              border: profileTab === 'journey' ? '1px solid #0284c7' : '1px solid #e2e8f0',
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
              fontSize: '0.8rem',
              fontWeight: profileTab === 'properties' ? 'bold' : '600',
              background: profileTab === 'properties' ? '#d97706' : '#f8fafc',
              color: profileTab === 'properties' ? '#ffffff' : '#475569',
              border: profileTab === 'properties' ? '1px solid #d97706' : '1px solid #e2e8f0',
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
              fontSize: '0.8rem',
              fontWeight: profileTab === 'timeline' ? 'bold' : '600',
              background: profileTab === 'timeline' ? '#7c3aed' : '#f8fafc',
              color: profileTab === 'timeline' ? '#ffffff' : '#475569',
              border: profileTab === 'timeline' ? '1px solid #7c3aed' : '1px solid #e2e8f0',
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
              fontSize: '0.8rem',
              fontWeight: profileTab === 'actions' ? 'bold' : '600',
              background: profileTab === 'actions' ? '#059669' : '#f8fafc',
              color: profileTab === 'actions' ? '#ffffff' : '#475569',
              border: profileTab === 'actions' ? '1px solid #059669' : '1px solid #e2e8f0',
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
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, color: '#092347', fontSize: '1rem', fontWeight: 700 }}>
                  📊 {isAr ? 'البيانات الشخصية والقدرة المالية' : 'Client Profile & Financial Capability'}
                </h4>
                {canEditLead(userRole, lead) ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setIsEditing(!isEditing)}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      background: isEditing ? '#092347' : '#f8fafc',
                      color: isEditing ? '#ffffff' : '#092347',
                      border: '1px solid var(--crm-line-strong)',
                      borderRadius: '8px'
                    }}
                  >
                    <Edit3 size={13} />
                    <span>{isEditing ? (isAr ? 'وضع العرض' : 'View Mode') : (isAr ? 'تعديل البيانات' : 'Edit Profile')}</span>
                  </button>
                ) : (
                  <span className="badge" style={{ fontSize: '0.72rem', background: 'var(--crm-subtle)', color: 'var(--crm-muted)', border: '1px solid var(--crm-line)' }}>
                    <Lock size={11} style={{ display: 'inline', marginInlineEnd: '4px' }} />
                    {isAr ? 'للقراءة فقط' : 'Read-only'}
                  </span>
                )}
              </div>

              {/* Tags Strip */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--crm-body)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  🏷️ {isAr ? 'وسوم وتصنيف العميل:' : 'Client Tags:'}
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {AVAILABLE_TAGS.map(tagObj => {
                    const isSelected = (formData.tags || []).includes(tagObj.name_ar);
                    return (
                      <button
                        key={tagObj.id}
                        type="button"
                        onClick={() => isEditing && handleToggleTag(tagObj.name_ar)}
                        style={{
                          background: isSelected ? '#eff6ff' : '#f8fafc',
                          color: isSelected ? '#2563eb' : '#64748b',
                          border: isSelected ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                          borderRadius: 'var(--radius-pill)',
                          padding: '4px 10px',
                          fontSize: '0.75rem',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          cursor: isEditing ? 'pointer' : 'default'
                        }}
                      >
                        {tagObj.name_ar}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fields Grid */}
              <form onSubmit={handleSaveProfile}>
                <div className="cms-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  {/* Phone */}
                  <div className="form-group-item">
                    <label>{isAr ? 'رقم الهاتف الأساسي:' : 'Primary Phone:'}</label>
                    <input
                      type="text"
                      disabled={!isEditing || !canViewLeadPhone(userRole)}
                      value={canViewLeadPhone(userRole) ? formData.phone : maskPhoneNumber(formData.phone, userRole)}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="form-group-item">
                    <label>{isAr ? 'رقم الواتساب:' : 'WhatsApp:'}</label>
                    <input
                      type="text"
                      disabled={!isEditing || !canViewLeadPhone(userRole)}
                      value={canViewLeadPhone(userRole) ? formData.whatsapp : maskPhoneNumber(formData.whatsapp, userRole)}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    />
                  </div>

                  {/* Alt Phone */}
                  <div className="form-group-item">
                    <label>{isAr ? 'رقم هاتف بديل / قريب:' : 'Alternative Phone:'}</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      placeholder="010XXXXXXXX"
                      value={formData.altPhone}
                      onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                    />
                  </div>

                  {/* City or Expat */}
                  <div className="form-group-item">
                    <label>{isAr ? 'محل الإقامة / دولة الاغتراب:' : 'City / Expat Location:'}</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      placeholder="مثال: سوهاج / السعودية - الرياض"
                      value={formData.cityOrExpat}
                      onChange={(e) => setFormData({ ...formData, cityOrExpat: e.target.value })}
                    />
                  </div>

                  {/* Budget */}
                  <div className="form-group-item">
                    <label>{isAr ? 'الميزانية المالية (ج.م):' : 'Budget (EGP):'}</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    />
                  </div>

                  {/* Financing Method */}
                  <div className="form-group-item">
                    <label>{isAr ? 'طريقة السداد المفضلة:' : 'Payment Preference:'}</label>
                    <select
                      disabled={!isEditing}
                      value={formData.financing}
                      onChange={(e) => setFormData({ ...formData, financing: e.target.value })}
                    >
                      <option value="cash">💵 كاش فوري (Cash)</option>
                      <option value="installments">💳 تقسيط على أقساط مريحة</option>
                      <option value="mortgage">🏦 تمويل عقاري بنكي</option>
                    </select>
                  </div>

                  {/* Area */}
                  <div className="form-group-item">
                    <label>{isAr ? 'المنطقة المستهدفة:' : 'Target Area:'}</label>
                    <select
                      disabled={!isEditing}
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    >
                      {getAreas().map(a => (
                        <option key={a.id} value={a.id}>{isAr ? (a.name_ar || a.label_ar) : (a.name_en || a.label_en)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Temperature */}
                  <div className="form-group-item">
                    <label>{isAr ? 'درجة حرارة العميل:' : 'Lead Temperature:'}</label>
                    <select
                      disabled={!isEditing}
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                    >
                      <option value="hot">🔥 ساخن جداً (Hot - شراء خلال 7 أيام)</option>
                      <option value="warm">⚡ دافئ (Warm - شراء خلال شهر)</option>
                      <option value="cold">❄️ بارد / مستكشف (Cold)</option>
                    </select>
                  </div>

                  {/* Assigned Agent */}
                  <div className="form-group-item">
                    <label>{isAr ? 'المستشار المسؤول:' : 'Assigned Agent:'}</label>
                    <select
                      disabled={!isEditing}
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    >
                      <option value="Dr. Mahmoud Elbaz">Dr. Mahmoud Elbaz</option>
                      <option value="Sales Team A">Sales Team A (شرق سوهاج والكوثر)</option>
                      <option value="Sales Team B">Sales Team B (سوهاج الجديدة)</option>
                      <option value="Sales Advisor Team">Sales Advisor Team</option>
                    </select>
                  </div>
                </div>

                {isEditing && (
                  <div className="cms-modal-actions" style={{ marginTop: '20px' }}>
                    <button type="submit" className="btn btn-primary" style={{ background: 'var(--gradient-gold)' }}>
                      <Save size={16} />
                      <span>{isAr ? 'حفظ كافة التعديلات' : 'Save Changes'}</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB: DIGITAL JOURNEY & VISITOR CLICKSTREAM */}
          {profileTab === 'journey' && (
            <div>
              <div style={{
                background: isLiveTracked ? '#ecfdf5' : '#f0f9ff',
                border: `1px solid ${isLiveTracked ? '#a7f3d0' : '#bae6fd'}`,
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
                  <h4 style={{ margin: 0, color: isLiveTracked ? '#059669' : '#0284c7', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                    <Activity size={16} />
                    <span>{isAr ? 'البصمة الرقمية وسلوك التصفح الفعلي للعميل' : 'Customer Digital Footprint & Dwell Time'}</span>
                  </h4>
                  <small style={{ color: 'var(--crm-body)' }}>
                    {isLiveTracked 
                      ? (isAr ? 'سجل حقيقي مباشر لكافة الصفحات والعقارات والنقرات التي قام بها العميل أثناء زيارته' : 'Live real-time log of pages, listings, and clicks during visitor session.') 
                      : (isAr ? 'بيانات استرشادية توضيحية لرحلة العميل النموذجية قبل بدء نشاطه الفعلي' : 'Illustrative sample footprint representing typical buyer journey.')}
                  </small>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge" style={{
                    background: isLiveTracked ? '#d1fae5' : '#fef3c7',
                    color: isLiveTracked ? '#065f46' : '#92400e',
                    fontWeight: 'bold',
                    border: `1px solid ${isLiveTracked ? '#6ee7b7' : '#fde68a'}`,
                    fontSize: '0.74rem'
                  }}>
                    {isLiveTracked ? '🟢 ' + (isAr ? 'رصد حي ومباشر 100%' : '100% Live Tracked') : '🟡 ' + (isAr ? 'نموذج محاكاة استرشادي' : 'Demo Simulation')}
                  </span>

                  <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 'bold', border: '1px solid #bae6fd' }}>
                    ⏱️ {isAr ? `مدة الجلسة: ${dwellTimeLabel}` : `Dwell Time: ${dwellTimeLabel}`}
                  </span>
                </div>
              </div>

              {/* Step-by-step Journey Stream */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {journeyEvents.map((evt, idx) => {
                  const getEventLabel = (type) => {
                    switch (type) {
                      case 'whatsapp_click':
                        return { text: isAr ? '💬 نقرة واتساب' : '💬 WhatsApp Click', color: 'var(--crm-positive)', bg: '#ecfdf5', border: '#a7f3d0' };
                      case 'calculator_used':
                        return { text: isAr ? '🧮 حاسبة التمويل' : '🧮 Calculator Used', color: 'var(--crm-info)', bg: '#eff6ff', border: '#bfdbfe' };
                      case 'property_view':
                        return { text: isAr ? '👁️ تصفح عقار' : '👁️ Listing Viewed', color: 'var(--crm-accent-text)', bg: '#fffbeb', border: '#fde68a' };
                      case 'compare_added':
                        return { text: isAr ? '⚖️ إضافة للمقارنة' : '⚖️ Added to Compare', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
                      case 'favorite_added':
                        return { text: isAr ? '❤️ إضافة للمفضلة' : '❤️ Favorited', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
                      case 'brochure_download':
                        return { text: isAr ? '📑 تنزيل بروشور' : '📑 PDF Brochure', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' };
                      default:
                        return { text: isAr ? '🌐 تصفح الموقع' : '🌐 Page View', color: 'var(--crm-info)', bg: '#f0f9ff', border: '#bae6fd' };
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
                            fontSize: '0.72rem',
                            fontWeight: 'bold'
                          }}>
                            {badgeInfo.text}
                          </span>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--crm-ink)' }}>
                            {title}
                          </strong>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--crm-muted)' }}>
                          📍 {formData.cityOrExpat || 'سوهاج'} • {isAr ? 'عبر متصفح الهاتف / الويب' : 'Mobile / Web'}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.72rem', color: 'var(--crm-faint)', whiteSpace: 'nowrap' }}>
                        {new Date(evt.timestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')}
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
              <h4 style={{ margin: '0 0 14px 0', color: '#092347', fontSize: '0.95rem', fontWeight: 700 }}>
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
                      <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--crm-ink)' }}>
                        {isAr ? prop.title_ar : prop.title_en}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--crm-positive)', fontWeight: 'bold' }}>
                        💰 {prop.price?.toLocaleString()} ج.م • {prop.size} م²
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        const waText = `أهلاً أ. ${formData.name}، بخصوص طلبك العقاري، نود ترشيح وحدة ${isAr ? prop.title_ar : prop.title_en} بسعر ${prop.price?.toLocaleString()} ج.م. هل نحدد موعداً للمعاينة؟`;
                        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer');
                      }}
                      style={{ padding: '6px 10px', fontSize: '0.75rem', background: '#092347', color: '#ffffff', borderRadius: '6px' }}
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
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '8px', color: 'var(--crm-ink)' }}>
                  ✍️ {isAr ? 'تسجيل ملاحظة اتصال أو نتيجة مكالمة جديدة:' : 'Log Call / Meeting Notes:'}
                </label>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={newLogType}
                    onChange={(e) => setNewLogType(e.target.value)}
                    className="form-input"
                    style={{ padding: '6px 10px', fontSize: '0.8rem', width: '160px', background: 'var(--crm-subtle)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
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
                    style={{ flex: 1, fontSize: '0.85rem', background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
                    required
                  />

                  <button type="submit" className="btn btn-sm btn-primary" style={{ padding: '6px 14px', background: '#092347', color: '#ffffff', borderRadius: '6px', fontWeight: 'bold' }}>
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
                        borderInlineStart: '4px solid #092347',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '0.85rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: 'var(--crm-ink)' }}>{log.action}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--crm-muted)' }}>
                          {new Date(log.timestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')} - {new Date(log.timestamp).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
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
              <h4 style={{ margin: '0 0 14px 0', color: '#092347', fontSize: '0.95rem', fontWeight: 700 }}>
                📅 {isAr ? 'جدولة الإجراء القادم وموعد المتابعة' : 'Scheduled Next Action'}
              </h4>

              <div className="cms-form-grid" style={{ gridTemplateColumns: '1fr 1.5fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group-item">
                  <label style={{ color: 'var(--crm-body)', fontWeight: 'bold', fontSize: '0.8rem' }}>{isAr ? 'تاريخ ووقت المتابعة القادمة:' : 'Follow-up Date:'}</label>
                  <input
                    type="date"
                    value={formData.nextActionDate}
                    onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
                    style={{ background: 'var(--crm-card)', border: '1px solid var(--crm-line-strong)', borderRadius: '6px', color: 'var(--crm-ink)' }}
                  />
                </div>

                <div className="form-group-item">
                  <label style={{ color: 'var(--crm-body)', fontWeight: 'bold', fontSize: '0.8rem' }}>{isAr ? 'تفاصيل الإجراء المطلوب:' : 'Action Details:'}</label>
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
                style={{ background: 'var(--crm-positive-solid)', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
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
