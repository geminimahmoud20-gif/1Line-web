import { useState, useMemo } from 'react';
import { 
  Building, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Car, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  DollarSign, 
  User, 
  Edit3, 
  Trash2,
  ChevronRight,
  ChevronLeft,
  Filter,
  AlertTriangle,
  Shuffle,
  MapPin,
  Tag,
  Search,
  X
} from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';
import { getAreas } from '../../utils/areasData';

const PIPELINE_STAGES = [
  { id: 'new', title_ar: 'طلبات جديدة', title_en: 'New Inquiries', color: 'var(--crm-info)', bg: '#e0f2fe' },
  { id: 'contacted', title_ar: 'تم التواصل الأولي', title_en: 'Contacted', color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'site_visit', title_ar: 'معاينات مجدولة', title_en: 'Site Visits', color: 'var(--crm-accent-text)', bg: '#fef3c7' },
  { id: 'negotiating', title_ar: 'قيد التفاوض والتقييم', title_en: 'Negotiation', color: 'var(--crm-warn)', bg: '#ffedd5' },
  { id: 'closing', title_ar: 'توقيع عقود وحجز', title_en: 'Closing / Deposit', color: 'var(--crm-positive)', bg: '#d1fae5' },
  { id: 'closed', title_ar: 'صفقات ناجحة', title_en: 'Closed Won', color: 'var(--crm-positive)', bg: '#dcfce7' }
];

const PROPERTY_TYPE_NAMES = {
  apartment: 'شقة سكنية',
  retail: 'محل تجاري',
  villa: 'فيلا / تاون هاوس',
  office: 'مكتب / عيادة',
  land: 'قطعة أرض',
  building: 'عمارة كاملة',
  clinic: 'عيادة طبية',
  chalet: 'شاليه',
  commercial: 'تجاري (محلات ومعارض)',
  residential: 'سكني (شقق وفيلات)',
  administrative: 'مقر إداري / عيادة'
};

const AREA_NAMES = {
  thakafa: 'حي الثقافة',
  east: 'حي شرق',
  west: 'حي غرب',
  new_sohag: 'سوهاج الجديدة',
  corniche: 'كورنيش النيل',
  city: 'سيتي والشبان',
  kawthar: 'مدينة الكوثر',
  akhmeem: 'أخميم',
  tahta: 'طهطا',
  girga: 'جرجا',
  araba: 'عرابة أبيدوس'
};

export default function KanbanPipeline({
  leads = [],
  properties = [],
  onUpdateLead,
  onDeleteLead,
  onOpenEditLead,
  lang = 'ar',
  triggerToast
}) {
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [schedulingVisitLead, setSchedulingVisitLead] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isAr = lang === 'ar';

  const allAreas = useMemo(() => getAreas(), []);

  // Format and localize property type
  const getLocalizedPropertyType = (typeKey) => {
    if (!typeKey) return isAr ? 'عقار غير محدد' : 'Property';
    const cleanKey = String(typeKey).trim().toLowerCase();
    if (PROPERTY_TYPE_NAMES[cleanKey]) {
      return isAr ? PROPERTY_TYPE_NAMES[cleanKey] : typeKey;
    }
    return typeKey;
  };

  // Format and localize area
  const getLocalizedArea = (areaKey) => {
    if (!areaKey) return isAr ? 'سوهاج' : 'Sohag';
    const cleanKey = String(areaKey).trim().toLowerCase();
    if (AREA_NAMES[cleanKey]) {
      return isAr ? AREA_NAMES[cleanKey] : areaKey;
    }
    const found = allAreas.find(a => a.id === cleanKey || a.id === areaKey);
    if (found) {
      return isAr ? (found.name_ar || found.label_ar) : (found.name_en || found.label_en);
    }
    return areaKey;
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return isAr ? 'اليوم' : 'Today';
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 2) return isAr ? 'الآن' : 'Just now';
      if (diffMins < 60) return isAr ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return isAr ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return isAr ? `منذ ${diffDays} يوم` : `${diffDays}d ago`;
    } catch {
      return isAr ? 'مؤخراً' : 'Recent';
    }
  };

  // Extract lead budget
  const getLeadBudget = (lead) => {
    const b = lead.details?.budget || lead.budget || lead.details?.expectedPrice || lead.expectedPrice;
    if (b) {
      const num = parseInt(String(b).replace(/[^0-9]/g, ''));
      if (!isNaN(num) && num > 0) return num;
    }
    if (lead.estimatedAvg) return lead.estimatedAvg;
    return 2500000;
  };

  // Lead Type Badge
  const getLeadTypeBadge = (lead) => {
    const type = lead.type || 'buyer';
    switch (type) {
      case 'seller':
        return { label: isAr ? 'بائع (عرض عقار)' : 'Seller', bg: '#fef3c7', color: '#92400e', border: '#fde68a' };
      case 'investor':
        return { label: isAr ? 'مستثمر' : 'Investor', bg: '#f5f3ff', color: '#6b21a8', border: '#ddd6fe' };
      case 'broker':
        return { label: isAr ? 'وسيط عقاري' : 'Broker', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
      case 'buyer':
      default:
        return { label: isAr ? 'مشتري' : 'Buyer', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' };
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (filterType !== 'all' && l.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const nameMatch = (l.name || '').toLowerCase().includes(q);
        const phoneMatch = (l.phone || l.whatsapp || '').replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, ''));
        const areaMatch = (l.area || l.details?.area || l.location || '').toLowerCase().includes(q);
        const propTypeMatch = (l.propertyType || l.details?.propertyType || '').toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !areaMatch && !propTypeMatch) return false;
      }
      return true;
    });
  }, [leads, filterType, searchQuery]);

  // Calculate Column metrics
  const getStageStats = (stageId) => {
    const stageLeads = filteredLeads.filter(l => (l.status || 'new') === stageId);
    const totalVolume = stageLeads.reduce((acc, curr) => {
      return acc + getLeadBudget(curr);
    }, 0);
    return { count: stageLeads.length, totalVolume };
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, leadId) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStageId) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      if (onUpdateLead) {
        onUpdateLead(leadId, { status: targetStageId });
        if (triggerToast) {
          triggerToast(isAr ? `تم نقل العميل بنجاح إلى مرحلة ${PIPELINE_STAGES.find(s=>s.id===targetStageId)?.title_ar}` : `Lead moved to ${targetStageId}`, 'success');
        }
      }
    }
    setDraggedLeadId(null);
  };

  // Quick Move to Next Stage
  const handleMoveToNextStage = (lead) => {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === (lead.status || 'new'));
    if (currentIndex < PIPELINE_STAGES.length - 1) {
      const nextStage = PIPELINE_STAGES[currentIndex + 1];
      if (onUpdateLead) {
        onUpdateLead(lead.id, { status: nextStage.id });
        if (triggerToast) {
          triggerToast(isAr ? `تم نقل العميل إلى مرحلة: ${nextStage.title_ar}` : `Moved to ${nextStage.title_en}`, 'success');
        }
      }
    }
  };

  // Quick Move to Previous Stage
  const handleMoveToPrevStage = (lead) => {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === (lead.status || 'new'));
    if (currentIndex > 0) {
      const prevStage = PIPELINE_STAGES[currentIndex - 1];
      if (onUpdateLead) {
        onUpdateLead(lead.id, { status: prevStage.id });
        if (triggerToast) {
          triggerToast(isAr ? `تم إرجاع العميل إلى مرحلة: ${prevStage.title_ar}` : `Moved back to ${prevStage.title_en}`, 'info');
        }
      }
    }
  };

  // Auto distribute leads across stages for realistic demo
  const handleAutoDistributeStages = () => {
    if (!onUpdateLead || leads.length === 0) return;
    const stages = ['new', 'contacted', 'site_visit', 'negotiating', 'closing'];
    leads.forEach((lead, idx) => {
      const assignedStage = stages[idx % stages.length];
      onUpdateLead(lead.id, { status: assignedStage });
    });
    if (triggerToast) {
      triggerToast(isAr ? 'تم توزيع الصفقات على مسار المبيعات بنجاح!' : 'Leads distributed across stages!', 'success');
    }
  };

  const onWhatsAppClick = (lead) => {
    const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
    const propTitle = getLocalizedPropertyType(lead.propertyType || lead.details?.propertyType);
    const areaTitle = getLocalizedArea(lead.area || lead.details?.area || lead.location);
    const text = isAr 
      ? `مرحباً أ. ${lead.name || 'العميل الكريم'}، معك مستشار شركة 1Line للحلول العقارية بسوهاج بخصوص طلبكم (${propTitle} في ${areaTitle}). يسعدنا تزويدك بالتفاصيل.`
      : `Hello ${lead.name}, this is 1Line Real Estate following up on your request for ${propTitle} in ${areaTitle}.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleScheduleVisit = (leadId, visitDetails) => {
    if (onUpdateLead) {
      onUpdateLead(leadId, {
        status: 'site_visit',
        siteVisit: visitDetails,
        followUp: `معاينة مجدولة يوم ${visitDetails.visitDate} الساعة ${visitDetails.visitTime}`
      });
    }
  };

  return (
    <div className="kanban-pipeline-wrapper" style={{ paddingBottom: '70px' }}>
      {/* Top Filter & Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} style={{ color: 'var(--crm-accent-text)' }} />
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#092347' }}>
            {isAr ? 'مسار الصفقات والمبيعات المرئي' : 'Visual Sales Deals Pipeline'}
          </h3>
          <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.75rem', fontWeight: 'bold' }}>
            {filteredLeads.length} {isAr ? 'صفقة' : 'deals'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Live Search Input */}
          <div style={{ position: 'relative', width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', [isAr ? 'right' : 'left']: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--crm-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'بحث بالاسم أو الهاتف...' : 'Search lead...'}
              className="form-input"
              style={{
                width: '100%',
                paddingTop: '6px',
                paddingBottom: '6px',
                [isAr ? 'paddingRight' : 'paddingLeft']: '30px',
                [isAr ? 'paddingLeft' : 'paddingRight']: searchQuery ? '24px' : '10px',
                fontSize: '0.78rem',
                borderRadius: '8px',
                background: 'var(--crm-card)',
                border: '1px solid var(--crm-line-strong)',
                color: 'var(--crm-ink)'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  [isAr ? 'left' : 'right']: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--crm-muted)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--crm-body)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
            <Filter size={13} /> {isAr ? 'النوع:' : 'Type:'}
          </span>
          <button 
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterType('all')}
            style={{
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: filterType === 'all' ? 'bold' : '600',
              background: filterType === 'all' ? '#092347' : '#ffffff',
              color: filterType === 'all' ? '#ffffff' : '#334155',
              border: filterType === 'all' ? '1px solid #092347' : '1px solid #cbd5e1'
            }}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          <button 
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterType('buyer')}
            style={{
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: filterType === 'buyer' ? 'bold' : '600',
              background: filterType === 'buyer' ? '#0284c7' : '#ffffff',
              color: filterType === 'buyer' ? '#ffffff' : '#334155',
              border: filterType === 'buyer' ? '1px solid #0284c7' : '1px solid #cbd5e1'
            }}
          >
            {isAr ? 'مشترين' : 'Buyers'}
          </button>
          <button 
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterType('seller')}
            style={{
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: filterType === 'seller' ? 'bold' : '600',
              background: filterType === 'seller' ? '#d97706' : '#ffffff',
              color: filterType === 'seller' ? '#ffffff' : '#334155',
              border: filterType === 'seller' ? '1px solid #d97706' : '1px solid #cbd5e1'
            }}
          >
            {isAr ? 'بائعين' : 'Sellers'}
          </button>
          <button 
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterType('investor')}
            style={{
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: filterType === 'investor' ? 'bold' : '600',
              background: filterType === 'investor' ? '#7c3aed' : '#ffffff',
              color: filterType === 'investor' ? '#ffffff' : '#334155',
              border: filterType === 'investor' ? '1px solid #7c3aed' : '1px solid #cbd5e1'
            }}
          >
            {isAr ? 'مستثمرين' : 'Investors'}
          </button>

          {/* Quick Demo Balancer */}
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleAutoDistributeStages}
            title={isAr ? 'توزيع الصفقات تلقائياً على كل مراحل خط الأنابيب لاختبار النظام' : 'Distribute across pipeline'}
            style={{
              borderRadius: '8px',
              fontSize: '0.78rem',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#b45309',
              fontWeight: 'bold',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Shuffle size={13} />
            <span>{isAr ? 'توزيع المراحل' : 'Auto Distribute'}</span>
          </button>
        </div>
      </div>

      {/* Kanban Stages Board */}
      <div className="kanban-board-scroll-container" style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, minmax(280px, 1fr))`,
        gap: '14px',
        overflowX: 'auto',
        paddingBottom: '40px'
      }}>
        {PIPELINE_STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter(l => (l.status || 'new') === stage.id);
          const { count, totalVolume } = getStageStats(stage.id);

          return (
            <div
              key={stage.id}
              className="kanban-stage-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              style={{
                background: 'var(--crm-subtle)',
                border: '1px solid var(--crm-line)',
                borderTop: `4px solid ${stage.color}`,
                borderRadius: '12px',
                padding: '14px',
                minHeight: '560px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              {/* Stage Header */}
              <div style={{
                borderBottom: '1px solid var(--crm-line)',
                paddingBottom: '10px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: stage.color, fontWeight: 700 }}>
                    {isAr ? stage.title_ar : stage.title_en}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--crm-muted)', fontWeight: '600' }}>
                    {(totalVolume / 1000000).toFixed(1)} {isAr ? 'مليون ج.م حجم الصفقات' : 'M EGP'}
                  </span>
                </div>
                <span style={{
                  background: stage.bg,
                  color: stage.color,
                  border: `1px solid ${stage.color}35`,
                  padding: '2px 10px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  {count}
                </span>
              </div>

              {/* Cards Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {stageLeads.length === 0 ? (
                  <div style={{
                    padding: '40px 10px',
                    textAlign: 'center',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '10px',
                    color: 'var(--crm-faint)',
                    fontSize: '0.78rem'
                  }}>
                    {isAr ? 'اسحب بطاقة عميل إلى هنا' : 'Drop leads here'}
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const budget = getLeadBudget(lead);
                    const propTypeRaw = lead.propertyType || lead.details?.propertyType;
                    const areaRaw = lead.area || lead.details?.area || lead.details?.district || lead.location;
                    const propType = getLocalizedPropertyType(propTypeRaw);
                    const area = getLocalizedArea(areaRaw);
                    const typeBadge = getLeadTypeBadge(lead);
                    const timeAgoText = formatTimeAgo(lead.timestamp || lead.createdAt);
                    const phoneDisplay = lead.whatsapp || lead.phone || 'غير مسجل';

                    // 🚨 Check if inquiry is pending contact > 24 hours
                    const isOverdue = (lead.status === 'new' || !lead.status) && 
                      lead.timestamp && (Date.now() - new Date(lead.timestamp).getTime() > 24 * 60 * 60 * 1000);

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className="kanban-lead-card animate-fadeIn"
                        style={{
                          background: 'var(--crm-card)',
                          border: isOverdue ? '1px solid #f43f5e' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '13px',
                          boxShadow: isOverdue ? '0 0 12px rgba(244, 63, 94, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.04)',
                          cursor: 'grab',
                          transition: 'all 0.2s ease',
                          color: 'var(--crm-ink)'
                        }}
                      >
                        {/* Overdue Warning Pill */}
                        {isOverdue && (
                          <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#991b1b',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <AlertTriangle size={13} style={{ color: '#dc2626' }} />
                            <span>{isAr ? '🚨 متأخر عن الاتصال (> 24 ساعة)' : '🚨 Overdue Contact (> 24h)'}</span>
                          </div>
                        )}

                        {/* Card Top Meta: Type Badge + Time Ago */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{
                            background: typeBadge.bg,
                            color: typeBadge.color,
                            border: `1px solid ${typeBadge.border}`,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: '700'
                          }}>
                            {typeBadge.label}
                          </span>

                          <span style={{ fontSize: '0.68rem', color: 'var(--crm-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} />
                            <span>{timeAgoText}</span>
                          </span>
                        </div>

                        {/* Name + Lead Quality Score */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '0.96rem', color: '#092347', fontWeight: 700, letterSpacing: '-0.2px' }}>
                            {lead.name || (isAr ? 'عميل بدون اسم' : 'Unnamed Lead')}
                          </strong>
                          
                          <span 
                            title={isAr ? 'درجة جودة واكتمال العميل' : 'Lead Quality Score'}
                            style={{ 
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              borderRadius: '20px',
                              padding: '2px 7px',
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <Sparkles size={10} />
                            <span>{lead.score || 95}% {isAr ? 'جودة' : ''}</span>
                          </span>
                        </div>

                        {/* Localized Property Type & Area */}
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: 'var(--crm-body)', 
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'var(--crm-subtle)',
                          border: '1px solid var(--crm-line)',
                          padding: '5px 8px',
                          borderRadius: '6px'
                        }}>
                          <Building size={13} style={{ color: 'var(--crm-accent-text)', flexShrink: 0 }} />
                          <span style={{ fontWeight: '700' }}>{propType}</span>
                          <span style={{ color: '#cbd5e1' }}>•</span>
                          <MapPin size={12} style={{ color: 'var(--crm-info)', flexShrink: 0 }} />
                          <span>{area}</span>
                        </div>

                        {/* Direct Phone / WhatsApp display */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          color: 'var(--crm-muted)',
                          marginBottom: '8px',
                          direction: 'ltr',
                          justifyContent: 'flex-end'
                        }}>
                          <span style={{ fontFamily: 'monospace', color: 'var(--crm-ink)', fontWeight: '700' }}>
                            {phoneDisplay}
                          </span>
                          <Phone size={12} style={{ color: 'var(--crm-positive)' }} />
                        </div>

                        {/* Prominent Budget Pill */}
                        <div style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: '6px',
                          padding: '5px 9px',
                          marginBottom: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.72rem', color: '#065f46', fontWeight: '600' }}>
                            {isAr ? 'قيمة الصفقة المتوقعة:' : 'Deal Budget:'}
                          </span>
                          <strong style={{ fontSize: '0.86rem', color: '#047857', fontWeight: 700 }}>
                            💰 {budget.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </strong>
                        </div>

                        {/* Scheduled Next Follow-up Badge if any */}
                        {lead.nextFollowUpAt && (
                          <div style={{
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            color: '#0369a1',
                            fontWeight: '600',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <Calendar size={12} />
                            <span>{isAr ? 'متابعة قادمة:' : 'Follow-up:'} {new Date(lead.nextFollowUpAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                        )}

                        {/* Scheduled Visit Badge if any */}
                        {lead.siteVisit && (
                          <div style={{
                            background: '#fef3c7',
                            border: '1px solid #fde68a',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            color: '#92400e',
                            fontWeight: '600',
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <Car size={13} />
                            <span>{isAr ? 'موعد معاينة:' : 'Visit:'} {lead.siteVisit.visitDate} ({lead.siteVisit.visitTime})</span>
                          </div>
                        )}

                        {/* Card Actions Footer */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid #f1f5f9',
                          paddingTop: '9px',
                          marginTop: '6px'
                        }}>
                          {/* Quick Actions */}
                          <div style={{ display: 'flex', gap: '5px' }}>
                            {/* WhatsApp Button */}
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => onWhatsAppClick(lead)}
                              style={{ 
                                padding: '5px 8px', 
                                fontSize: '0.72rem',
                                background: 'var(--crm-positive-solid)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                              title={isAr ? 'محادثة فورية عبر واتساب' : 'WhatsApp Chat'}
                            >
                              <MessageSquare size={13} />
                              <span>واتساب</span>
                            </button>

                            {/* Schedule Site Visit */}
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => setSchedulingVisitLead(lead)}
                              style={{ 
                                padding: '5px 7px', 
                                fontSize: '0.72rem', 
                                color: 'var(--crm-accent-text)',
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: '6px'
                              }}
                              title={isAr ? 'حجز موعد معاينة ميدانية' : 'Schedule Site Visit'}
                            >
                              <Car size={13} />
                            </button>

                            {/* Edit Lead */}
                            {onOpenEditLead && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => onOpenEditLead(lead)}
                                style={{ 
                                  padding: '5px 7px', 
                                  fontSize: '0.72rem', 
                                  borderRadius: '6px',
                                  background: 'var(--crm-subtle)',
                                  border: '1px solid var(--crm-line-strong)',
                                  color: 'var(--crm-body)'
                                }}
                                title={isAr ? 'تعديل بيانات العميل' : 'Edit Lead'}
                              >
                                <Edit3 size={13} />
                              </button>
                            )}

                            {/* Delete Lead */}
                            {onDeleteLead && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => setLeadToDelete(lead)}
                                style={{ 
                                  padding: '5px 7px', 
                                  fontSize: '0.72rem', 
                                  borderRadius: '6px',
                                  border: '1px solid #fecaca',
                                  background: '#fef2f2',
                                  color: '#dc2626'
                                }}
                                title={isAr ? 'حذف العميل' : 'Delete Lead'}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* RTL/LTR Intuitive Stage Transitions */}
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {/* Move to Previous Stage */}
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleMoveToPrevStage(lead)}
                              style={{ 
                                padding: '4px 6px', 
                                fontSize: '0.7rem', 
                                borderRadius: '6px',
                                border: '1px solid var(--crm-line-strong)',
                                background: 'var(--crm-card)',
                                color: 'var(--crm-body)'
                              }}
                              title={isAr ? 'إرجاع للمرحلة السابقة' : 'Previous Stage'}
                            >
                              {isAr ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                            </button>

                            {/* Move to Next Stage */}
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => handleMoveToNextStage(lead)}
                              style={{ 
                                padding: '4px 6px', 
                                fontSize: '0.7rem', 
                                borderRadius: '6px',
                                border: '1px solid #fde68a',
                                background: '#fffbeb',
                                color: '#b45309'
                              }}
                              title={isAr ? 'ترقية للمرحلة التالية' : 'Next Stage'}
                            >
                              {isAr ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule Visit Modal */}
      {schedulingVisitLead && (
        <SiteVisitModal
          isOpen={Boolean(schedulingVisitLead)}
          onClose={() => setSchedulingVisitLead(null)}
          lead={schedulingVisitLead}
          properties={properties}
          onScheduleVisit={handleScheduleVisit}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* Delete Confirmation Modal */}
      {leadToDelete && (
        <div className="track-modal-backdrop" onClick={() => setLeadToDelete(null)}>
          <div className="property-form-modal-card animate-fadeIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%', background: 'var(--crm-card)', border: '1px solid var(--crm-line)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div className="modal-form-header" style={{ borderBottom: '1px solid var(--crm-line)', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={20} style={{ color: '#dc2626' }} />
                <h3 style={{ margin: 0, color: '#092347', fontSize: '1.1rem', fontWeight: 700 }}>
                  {isAr ? 'تأكيد حذف العميل' : 'Confirm Delete Lead'}
                </h3>
              </div>
              <button type="button" className="drawer-close-btn" onClick={() => setLeadToDelete(null)}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ color: 'var(--crm-body)', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                {isAr 
                  ? `هل أنت متأكد من رغبتك في حذف العميل "${leadToDelete.name || 'بدون اسم'}" نهائياً من خط أنابيب المبيعات؟ لا يمكن التراجع عن هذا الإجراء.`
                  : `Are you sure you want to permanently delete lead "${leadToDelete.name || 'Unnamed'}"? This action cannot be undone.`}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setLeadToDelete(null)}
                  style={{ background: 'var(--crm-subtle)', border: '1px solid var(--crm-line-strong)', color: 'var(--crm-body)' }}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (onDeleteLead) {
                      onDeleteLead(leadToDelete.id);
                      if (triggerToast) {
                        triggerToast(isAr ? 'تم حذف العميل بنجاح من مسار المبيعات' : 'Lead deleted successfully', 'info');
                      }
                    }
                    setLeadToDelete(null);
                  }}
                  style={{ background: '#dc2626', color: '#ffffff', border: 'none' }}
                >
                  <Trash2 size={15} />
                  <span>{isAr ? 'تأكيد الحذف' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
