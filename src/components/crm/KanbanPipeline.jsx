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
  Tag
} from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';
import { getAreas } from '../../utils/areasData';

const PIPELINE_STAGES = [
  { id: 'new', title_ar: 'طلبات جديدة', title_en: 'New Inquiries', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
  { id: 'contacted', title_ar: 'تم التواصل الأولي', title_en: 'Contacted', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  { id: 'site_visit', title_ar: 'معاينات مجدولة', title_en: 'Site Visits', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'negotiating', title_ar: 'قيد التفاوض والتقييم', title_en: 'Negotiation', color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)' },
  { id: 'closing', title_ar: 'توقيع عقود وحجز', title_en: 'Closing / Deposit', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  { id: 'closed', title_ar: 'صفقات ناجحة', title_en: 'Closed Won', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' }
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
  commercial: 'تجاري',
  residential: 'سكني'
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
  onOpenEditLead,
  lang = 'ar',
  triggerToast
}) {
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [schedulingVisitLead, setSchedulingVisitLead] = useState(null);
  const [filterType, setFilterType] = useState('all');

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
        return { label: isAr ? 'بائع (عرض عقار)' : 'Seller', bg: 'rgba(245, 158, 11, 0.18)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.35)' };
      case 'investor':
        return { label: isAr ? 'مستثمر' : 'Investor', bg: 'rgba(168, 85, 247, 0.18)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' };
      case 'broker':
        return { label: isAr ? 'وسيط عقاري' : 'Broker', bg: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' };
      case 'buyer':
      default:
        return { label: isAr ? 'مشتري' : 'Buyer', bg: 'rgba(6, 182, 212, 0.18)', color: '#38bdf8', border: 'rgba(6, 182, 212, 0.35)' };
    }
  };

  const filteredLeads = leads.filter(l => {
    if (filterType !== 'all' && l.type !== filterType) return false;
    return true;
  });

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
      {/* Top Filter Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} className="text-gold" />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>
            {isAr ? 'مسار الصفقات والمبيعات المرئي (Deals Kanban Pipeline)' : 'Visual Sales Deals Pipeline'}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={13} /> {isAr ? 'تصفية النوع:' : 'Filter Type:'}
          </span>
          <button 
            className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('all')}
            style={{ borderRadius: '8px', fontSize: '0.78rem' }}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          <button 
            className={`btn btn-sm ${filterType === 'buyer' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('buyer')}
            style={{ borderRadius: '8px', fontSize: '0.78rem' }}
          >
            {isAr ? 'مشترين' : 'Buyers'}
          </button>
          <button 
            className={`btn btn-sm ${filterType === 'seller' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('seller')}
            style={{ borderRadius: '8px', fontSize: '0.78rem' }}
          >
            {isAr ? 'بائعين' : 'Sellers'}
          </button>
          <button 
            className={`btn btn-sm ${filterType === 'investor' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('investor')}
            style={{ borderRadius: '8px', fontSize: '0.78rem' }}
          >
            {isAr ? 'مستثمرين' : 'Investors'}
          </button>

          {/* Quick Demo Balancer */}
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleAutoDistributeStages}
            title={isAr ? 'توزيع الصفقات تلقائياً على كل مراحل خط الأنابيب لاختبار النظام' : 'Distribute across pipeline'}
            style={{ borderRadius: '8px', fontSize: '0.78rem', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24', marginLeft: '6px' }}
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
                background: 'rgba(11, 20, 38, 0.85)',
                border: `1px solid ${stage.color}35`,
                borderRadius: '12px',
                padding: '14px',
                minHeight: '560px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
              }}
            >
              {/* Stage Header */}
              <div style={{
                borderBottom: `2px solid ${stage.color}`,
                paddingBottom: '10px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: stage.color, fontWeight: '800' }}>
                    {isAr ? stage.title_ar : stage.title_en}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600' }}>
                    {(totalVolume / 1000000).toFixed(1)} {isAr ? 'مليون ج.م حجم الصفقات' : 'M EGP'}
                  </span>
                </div>
                <span style={{
                  background: stage.bg,
                  color: stage.color,
                  border: `1px solid ${stage.color}55`,
                  padding: '2px 10px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: '800'
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
                    border: '1px dashed rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    color: '#64748b',
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
                          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 30, 0.98) 100%)',
                          border: isOverdue ? '1px solid #f43f5e' : '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: '10px',
                          padding: '13px',
                          boxShadow: isOverdue ? '0 0 16px rgba(244, 63, 94, 0.3)' : '0 4px 15px rgba(0, 0, 0, 0.35)',
                          cursor: 'grab',
                          transition: 'all 0.2s ease',
                          color: '#ffffff'
                        }}
                      >
                        {/* Overdue Warning Pill */}
                        {isOverdue && (
                          <div style={{
                            background: 'rgba(244, 63, 94, 0.15)',
                            border: '1px solid rgba(244, 63, 94, 0.4)',
                            color: '#fda4af',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <AlertTriangle size={13} className="text-rose" />
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

                          <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} />
                            <span>{timeAgoText}</span>
                          </span>
                        </div>

                        {/* Name + Lead Quality Score */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '0.98rem', color: '#ffffff', fontWeight: '800', letterSpacing: '-0.2px' }}>
                            {lead.name || (isAr ? 'عميل بدون اسم' : 'Unnamed Lead')}
                          </strong>
                          
                          <span 
                            title={isAr ? 'درجة جودة واكتمال العميل' : 'Lead Quality Score'}
                            style={{ 
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
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
                          color: '#cbd5e1', 
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          padding: '5px 8px',
                          borderRadius: '6px'
                        }}>
                          <Building size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />
                          <span style={{ fontWeight: '600' }}>{propType}</span>
                          <span style={{ color: '#64748b' }}>•</span>
                          <MapPin size={12} style={{ color: '#38bdf8', flexShrink: 0 }} />
                          <span>{area}</span>
                        </div>

                        {/* Direct Phone / WhatsApp display */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          color: '#94a3b8',
                          marginBottom: '8px',
                          direction: 'ltr',
                          justifyContent: 'flex-end'
                        }}>
                          <span style={{ fontFamily: 'monospace', color: '#f1f5f9', fontWeight: '600' }}>
                            {phoneDisplay}
                          </span>
                          <Phone size={12} style={{ color: '#22c55e' }} />
                        </div>

                        {/* Prominent Budget Pill */}
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '6px',
                          padding: '4px 9px',
                          marginBottom: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {isAr ? 'قيمة الصفقة المتوقعة:' : 'Deal Budget:'}
                          </span>
                          <strong style={{ fontSize: '0.86rem', color: '#34d399', fontWeight: '800' }}>
                            💰 {budget.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </strong>
                        </div>

                        {/* Scheduled Visit Badge if any */}
                        {lead.siteVisit && (
                          <div style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            color: '#fbbf24',
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
                          borderTop: '1px solid rgba(255,255,255,0.08)',
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
                                background: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: 'pointer'
                              }}
                              title={isAr ? 'محادثة فورية عبر واتساب' : 'WhatsApp Chat'}
                            >
                              <MessageSquare size={13} />
                              <span style={{ fontSize: '0.68rem', fontWeight: '700' }}>واتساب</span>
                            </button>

                            {/* Schedule Site Visit */}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setSchedulingVisitLead(lead)}
                              style={{ 
                                padding: '5px 7px', 
                                fontSize: '0.72rem', 
                                color: '#fbbf24',
                                borderColor: 'rgba(245, 158, 11, 0.4)',
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
                                className="btn btn-sm btn-outline"
                                onClick={() => onOpenEditLead(lead)}
                                style={{ 
                                  padding: '5px 7px', 
                                  fontSize: '0.72rem',
                                  borderRadius: '6px',
                                  borderColor: 'rgba(255, 255, 255, 0.2)'
                                }}
                                title={isAr ? 'تعديل بيانات العميل' : 'Edit Lead'}
                              >
                                <Edit3 size={13} />
                              </button>
                            )}
                          </div>

                          {/* RTL/LTR Intuitive Stage Transitions */}
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {/* Move to Previous Stage */}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleMoveToPrevStage(lead)}
                              style={{ 
                                padding: '4px 6px', 
                                fontSize: '0.7rem',
                                borderRadius: '6px',
                                borderColor: 'rgba(255, 255, 255, 0.15)'
                              }}
                              title={isAr ? 'إرجاع للمرحلة السابقة' : 'Previous Stage'}
                            >
                              {isAr ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                            </button>

                            {/* Move to Next Stage */}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleMoveToNextStage(lead)}
                              style={{ 
                                padding: '4px 6px', 
                                fontSize: '0.7rem',
                                borderRadius: '6px',
                                borderColor: 'rgba(245, 158, 11, 0.5)',
                                color: '#fbbf24'
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
    </div>
  );
}
