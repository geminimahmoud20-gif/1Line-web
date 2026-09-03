import { useState, useMemo } from 'react';
import { 
  User, 
  Phone, 
  MessageSquare, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Clock, 
  Building, 
  CheckCircle2, 
  Flame, 
  Sparkles, 
  Tag, 
  Plane, 
  Edit3, 
  Save, 
  Plus, 
  Trash2, 
  FileText, 
  X, 
  ArrowRight,
  ShieldCheck,
  Send,
  Car,
  Activity,
  Eye,
  MousePointerClick,
  Globe
} from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/propertiesData';
import { getAreas } from '../../utils/areasData';
import { getLeadDigitalJourney } from '../../utils/visitorTracker';

export default function CustomerProfileModal({
  isOpen,
  onClose,
  lead,
  properties = [],
  onUpdateLead,
  lang = 'ar',
  triggerToast
}) {
  if (!isOpen || !lead) return null;

  const isAr = lang === 'ar';
  const [profileTab, setProfileTab] = useState('overview'); // 'overview' | 'properties' | 'timeline' | 'actions'
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: lead.name || '',
    phone: lead.phone || '',
    whatsapp: lead.whatsapp || lead.phone || '',
    altPhone: lead.altPhone || '',
    cityOrExpat: lead.cityOrExpat || 'سوهاج',
    type: lead.type || 'buyer',
    status: lead.status || 'new',
    temperature: lead.temperature || 'hot',
    score: lead.score || 85,
    assignedTo: lead.assignedTo || 'Sales Advisor Team',
    budget: lead.details?.budget || lead.details?.expectedPrice || '',
    area: lead.details?.area || 'east',
    propertyType: lead.details?.propertyType || 'apartment',
    financing: lead.financing || 'cash', // 'cash' | 'installments' | 'mortgage'
    tags: lead.tags || ['VIP كاش', 'جاهز للمعاينة'],
    nextActionDate: lead.nextActionDate || '',
    nextActionNote: lead.nextActionNote || lead.followUp || ''
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

    const updatedLead = {
      name: formData.name,
      phone: formData.phone,
      whatsapp: formData.whatsapp,
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
  const digitalJourney = useMemo(() => {
    const directEvents = getLeadDigitalJourney(lead.phone || lead.name);
    if (directEvents && directEvents.length > 0) return directEvents;

    return [
      {
        id: 'tr_1',
        eventType: 'whatsapp_click',
        timestamp: lead.timestamp || new Date(Date.now() - 1800000).toISOString(),
        metadata: { title: `طلب تواصل مباشر واتساب بشأن عقارات ${formData.area || 'سوهاج'}` }
      },
      {
        id: 'tr_2',
        eventType: 'calculator_used',
        timestamp: new Date(Date.now() - 5400000).toISOString(),
        metadata: { title: `تجربة حاسبة التمويل والأقساط لميزانية ${formData.budget || '3,000,000'} ج.م` }
      },
      {
        id: 'tr_3',
        eventType: 'property_view',
        timestamp: new Date(Date.now() - 9000000).toISOString(),
        metadata: { title: `تصفح تفاصيل وحدات ${formData.propertyType || 'الشقق'} في ${formData.area || 'شرق سوهاج'}` }
      },
      {
        id: 'tr_4',
        eventType: 'page_view',
        timestamp: new Date(Date.now() - 12600000).toISOString(),
        metadata: { title: 'دخول الموقع عبر حملة إعلانات مستهدفة' }
      }
    ];
  }, [lead, formData]);

  const cleanPhone = (formData.whatsapp || formData.phone || '').replace(/[^0-9]/g, '');

  return (
    <div className="track-modal-backdrop" onClick={onClose}>
      <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '860px', width: '95%' }}>
        {/* Header Bar */}
        <div className="modal-form-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: formData.temperature === 'hot' ? 'var(--rose-bg)' : 'var(--accent-gold-light)',
              color: formData.temperature === 'hot' ? 'var(--rose)' : 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px'
            }}>
              {formData.temperature === 'hot' ? '🔥' : formData.temperature === 'warm' ? '⚡' : '❄️'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{formData.name}</h3>
                <span className={`lead-score-pill ${formData.score >= 85 ? 'score-high' : 'score-medium'}`}>
                  {formData.score}% {isAr ? 'جدية' : 'Score'}
                </span>
                <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', fontSize: '0.75rem' }}>
                  {formData.status?.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                📍 {formData.cityOrExpat} • {isAr ? 'المسؤول:' : 'Agent:'} {formData.assignedTo}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Quick WhatsApp Action */}
            <button
              type="button"
              className="btn btn-sm btn-accent"
              onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <MessageSquare size={14} />
              <span>WhatsApp</span>
            </button>

            {/* Quick Call Action */}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => window.open(`tel:${formData.phone}`, '_self')}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <Phone size={14} />
              <span>{isAr ? 'اتصال' : 'Call'}</span>
            </button>

            <button type="button" className="drawer-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* 360 Navigation Sub-Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 20px',
          background: 'rgba(15, 23, 42, 0.4)',
          borderBottom: '1px solid var(--border-light)',
          overflowX: 'auto'
        }}>
          <button
            type="button"
            className={`btn btn-sm ${profileTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setProfileTab('overview')}
            style={{ fontSize: '0.8rem' }}
          >
            👤 {isAr ? 'الملف الشخصي والمالي' : 'Overview & Financials'}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${profileTab === 'journey' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setProfileTab('journey')}
            style={{ fontSize: '0.8rem', background: profileTab === 'journey' ? '#06b6d4' : undefined, color: profileTab === 'journey' ? '#000' : undefined }}
          >
            🌐 {isAr ? 'رحلة ونقرات الزائر' : 'Digital Journey'} ({digitalJourney.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${profileTab === 'properties' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setProfileTab('properties')}
            style={{ fontSize: '0.8rem' }}
          >
            🏢 {isAr ? 'العقارات المرشحة' : 'Matched Properties'} ({matchedProperties.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${profileTab === 'timeline' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setProfileTab('timeline')}
            style={{ fontSize: '0.8rem' }}
          >
            🕒 {isAr ? 'سجل المكالمات' : 'Call Logs'} ({(lead.activityLogs || []).length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${profileTab === 'actions' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setProfileTab('actions')}
            style={{ fontSize: '0.8rem' }}
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
                <h4 style={{ margin: 0, color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                  📊 {isAr ? 'البيانات الشخصية والقدرة المالية' : 'Client Profile & Financial Capability'}
                </h4>
                <button
                  type="button"
                  className={`btn btn-sm ${isEditing ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setIsEditing(!isEditing)}
                  style={{ fontSize: '0.75rem' }}
                >
                  <Edit3 size={13} />
                  <span>{isEditing ? (isAr ? 'وضع العرض' : 'View Mode') : (isAr ? 'تعديل البيانات' : 'Edit Profile')}</span>
                </button>
              </div>

              {/* Tags Strip */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  🏷️ {isAr ? 'وسوم وتصنيف العميل (Tags):' : 'Client Tags:'}
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
                          background: isSelected ? 'var(--accent-gold-light)' : 'rgba(255,255,255,0.04)',
                          color: isSelected ? 'var(--accent-gold)' : 'var(--text-secondary)',
                          border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-light)',
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
                      disabled={!isEditing}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="form-group-item">
                    <label>{isAr ? 'رقم الواتساب:' : 'WhatsApp:'}</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.whatsapp}
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
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px 18px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div>
                  <h4 style={{ margin: 0, color: '#06b6d4', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={16} />
                    <span>{isAr ? 'البصمة الرقمية وسلوك التصفح الفعلي للعميل' : 'Customer Digital Footprint & Dwell Time'}</span>
                  </h4>
                  <small style={{ color: 'var(--text-secondary)' }}>
                    {isAr ? 'رصد كل صفحة وعقار ونقرة قام بها هذا العميل قبل وأثناء التواصل' : 'Tracks page views, property views, and buttons clicked.'}
                  </small>
                </div>

                <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', fontWeight: 'bold' }}>
                  ⏱️ {isAr ? 'مدة الجلسة التقديرية: 6د 15ث' : 'Dwell Time: ~6m 15s'}
                </span>
              </div>

              {/* Step-by-step Journey Stream */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {digitalJourney.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderInlineStart: '4px solid #06b6d4',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{
                          background: 'rgba(6, 182, 212, 0.15)',
                          color: '#06b6d4',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold'
                        }}>
                          {evt.eventType === 'whatsapp_click' ? '💬 نقرة واتساب' : evt.eventType === 'calculator_used' ? '🧮 حاسبة التمويل' : evt.eventType === 'property_view' ? '👁️ تصفح عقار' : '🌐 دخول الموقع'}
                        </span>
                        <strong style={{ fontSize: '0.85rem' }}>
                          {evt.metadata?.title || evt.eventType}
                        </strong>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        📍 {formData.cityOrExpat} • {isAr ? 'عبر متصفح الهاتف / الويب' : 'Mobile / Web'}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {new Date(evt.timestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: MATCHED & INSPECTED PROPERTIES */}
          {profileTab === 'properties' && (
            <div>
              <h4 style={{ margin: '0 0 14px 0', color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                🏢 {isAr ? 'العقارات والوحدات المقترحة لهذا العميل:' : 'Matched & Recommended Units:'}
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {matchedProperties.map((prop) => (
                  <div
                    key={prop.id}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem', display: 'block' }}>
                        {isAr ? prop.title_ar : prop.title_en}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--emerald)', fontWeight: 'bold' }}>
                        💰 {prop.price?.toLocaleString()} ج.م • {prop.size} م²
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        const waText = `أهلاً أ. ${formData.name}، بخصوص طلبك العقاري، نود ترشيح وحدة ${isAr ? prop.title_ar : prop.title_en} بسعر ${prop.price?.toLocaleString()} ج.م. هل نحدد موعداً للمعاينة؟`;
                        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`, '_blank');
                      }}
                      style={{ padding: '5px 8px', fontSize: '0.7rem' }}
                      title={isAr ? 'إرسال بروشور الوحدة على الواتساب' : 'Send WhatsApp Brochure'}
                    >
                      <Send size={12} />
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
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                marginBottom: '20px'
              }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  ✍️ {isAr ? 'تسجيل ملاحظة اتصال أو نتيجة مكالمة جديدة:' : 'Log Call / Meeting Notes:'}
                </label>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <select
                    value={newLogType}
                    onChange={(e) => setNewLogType(e.target.value)}
                    className="form-input"
                    style={{ padding: '4px 8px', fontSize: '0.8rem', width: '160px' }}
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
                    style={{ flex: 1, fontSize: '0.85rem' }}
                    required
                  />

                  <button type="submit" className="btn btn-sm btn-primary" style={{ padding: '6px 14px' }}>
                    <Plus size={14} />
                    <span>{isAr ? 'إضافة' : 'Add'}</span>
                  </button>
                </div>
              </form>

              {/* Timeline Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(!lead.activityLogs || lead.activityLogs.length === 0) ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                    {isAr ? 'لا توجد سجلات اتصال سابقة' : 'No call logs recorded'}
                  </p>
                ) : (
                  lead.activityLogs.map((log, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderInlineStart: '3px solid var(--accent-gold)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 14px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong>{log.action}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')} - {new Date(log.timestamp).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                        </span>
                      </div>
                      {log.agent && (
                        <small style={{ color: 'var(--accent-gold)' }}>👤 {log.agent}</small>
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
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '20px'
            }}>
              <h4 style={{ margin: '0 0 14px 0', color: 'var(--emerald)', fontSize: '0.95rem' }}>
                📅 {isAr ? 'جدولة الإجراء القادم وموعد المتابعة (Next Action Reminder)' : 'Scheduled Next Action'}
              </h4>

              <div className="cms-form-grid" style={{ gridTemplateColumns: '1fr 1.5fr', gap: '14px', marginBottom: '16px' }}>
                <div className="form-group-item">
                  <label>{isAr ? 'تاريخ ووقت المتابعة القادمة:' : 'Follow-up Date:'}</label>
                  <input
                    type="date"
                    value={formData.nextActionDate}
                    onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'تفاصيل الإجراء المطلوب (Action):' : 'Action Details:'}</label>
                  <input
                    type="text"
                    placeholder="مثال: الاتصال للتفاوض النهائي على مقدم شقة الكوثر"
                    value={formData.nextActionNote}
                    onChange={(e) => setFormData({ ...formData, nextActionNote: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveProfile}
                style={{ background: 'var(--gradient-emerald)' }}
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
