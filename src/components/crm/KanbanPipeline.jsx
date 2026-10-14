import { useState, useMemo, useEffect } from 'react';
import { MessageSquare, Calendar, Car, Clock, Sparkles, Edit3, Trash2, ChevronRight, ChevronLeft, Filter, AlertTriangle, Search, X, Zap, MoreHorizontal, ShieldAlert } from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';
import StageDeliverableModal from './StageDeliverableModal';
import './crm-kanban.css';
import { getAreas } from '../../utils/areasData';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { leadScore } from '../../utils/crmLeadViews';
import { validateStageTransition, HIGH_VALUE_DEAL_THRESHOLD } from '../../services/stateMachineEngine';

const PIPELINE_STAGES = [
  { id: 'new', title_ar: 'طلبات جديدة', title_en: 'New Inquiries', color: 'var(--crm-info)', bg: 'var(--crm-info-soft)' },
  { id: 'contacted', title_ar: 'تم التواصل الأولي', title_en: 'Contacted', color: 'var(--crm-violet)', bg: 'var(--crm-violet-soft)' },
  { id: 'site_visit', title_ar: 'معاينات مجدولة', title_en: 'Site Visits', color: 'var(--crm-accent-text)', bg: 'var(--crm-warn-soft)' },
  { id: 'negotiating', title_ar: 'قيد التفاوض والتقييم', title_en: 'Negotiation', color: 'var(--crm-warn)', bg: 'var(--crm-warn-soft)' },
  { id: 'closing', title_ar: 'توقيع عقود وحجز', title_en: 'Closing / Deposit', color: 'var(--crm-positive)', bg: 'var(--crm-positive-soft)' },
  { id: 'closed', title_ar: 'صفقات ناجحة', title_en: 'Closed Won', color: 'var(--crm-positive)', bg: 'var(--crm-positive-soft)' }
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
  onOpenLead,
  lang = 'ar',
  triggerToast,
  activeRole = 'sales_agent'
}) {
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [schedulingVisitLead, setSchedulingVisitLead] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [blockerModal, setBlockerModal] = useState({ isOpen: false, blockerInfo: null, lead: null });
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isAr = lang === 'ar';

  const allAreas = useMemo(() => getAreas(), []);

  // Format and localize property type
  const getLocalizedPropertyType = (typeKey) => {
    if (!typeKey) return isAr ? 'عقار غير محدد' : 'Property';
    const cleanKey = String(typeKey).trim().toLowerCase();
    if (cleanKey === 'buyer' || cleanKey === 'request' || cleanKey === 'lead') {
      return isAr ? 'طلب شراء' : 'Buyer Request';
    }
    if (cleanKey === 'seller') {
      return isAr ? 'عرض بيع' : 'Seller Listing';
    }
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
      // eslint-disable-next-line react-hooks/purity -- "time ago" label must use the current clock
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
    // Unknown budget stays 0 — the old 2,500,000 default inflated stage totals with invented money
    return 0;
  };

  // Lead Type Badge
  const getLeadTypeBadge = (lead) => {
    const type = lead.type || 'buyer';
    switch (type) {
      case 'seller':
        return { label: isAr ? 'بائع (عرض عقار)' : 'Seller', bg: 'var(--crm-warn-soft)', color: 'var(--crm-warn)', border: 'var(--crm-warn-line)' };
      case 'investor':
        return { label: isAr ? 'مستثمر' : 'Investor', bg: 'var(--crm-violet-soft)', color: 'var(--crm-violet)', border: 'var(--crm-violet-line)' };
      case 'broker':
        return { label: isAr ? 'وسيط عقاري' : 'Broker', bg: 'var(--crm-info-soft)', color: 'var(--crm-info)', border: 'var(--crm-info-line)' };
      case 'buyer':
      default:
        return { label: isAr ? 'مشتري' : 'Buyer', bg: 'var(--crm-info-soft)', color: 'var(--crm-info)', border: 'var(--crm-info-line)' };
    }
  };

  // "More" menus are <details> disclosures: close them on outside click or Esc
  useEffect(() => {
    const closeAll = (e) => {
      document.querySelectorAll('.kb-more[open]').forEach((d) => {
        if (e.type === 'keydown' ? e.key === 'Escape' : !d.contains(e.target)) d.removeAttribute('open');
      });
    };
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', closeAll);
    return () => {
      document.removeEventListener('click', closeAll);
      document.removeEventListener('keydown', closeAll);
    };
  }, []);
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

  // Pre-grouped leads & metrics by stage in a single O(N) pass
  const { leadsByStage, stageStatsMap } = useMemo(() => {
    const groups = {};
    const stats = {};
    PIPELINE_STAGES.forEach((s) => {
      groups[s.id] = [];
      stats[s.id] = { count: 0, totalVolume: 0, budgetedCount: 0, unbudgetedCount: 0 };
    });
    filteredLeads.forEach((l) => {
      const st = l.status || 'new';
      if (!groups[st]) {
        groups[st] = [];
        stats[st] = { count: 0, totalVolume: 0, budgetedCount: 0, unbudgetedCount: 0 };
      }
      groups[st].push(l);
      stats[st].count += 1;
      const b = getLeadBudget(l);
      stats[st].totalVolume += b;
      if (b > 0) {
        stats[st].budgetedCount += 1;
      } else {
        stats[st].unbudgetedCount += 1;
      }
    });
    return { leadsByStage: groups, stageStatsMap: stats };
  }, [filteredLeads]);

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
      const targetLead = leads.find(l => l.id === leadId);
      if (targetLead && onUpdateLead) {
        const validation = validateStageTransition(targetLead, targetStageId, {
          userRole: activeRole,
          isFounderApproved: targetLead.isFounderApproved || activeRole === 'super_admin'
        });

        if (!validation.allowed) {
          setBlockerModal({ isOpen: true, blockerInfo: validation, lead: targetLead });
          if (triggerToast) {
            triggerToast(validation.missingDeliverable, 'error');
          }
          setDraggedLeadId(null);
          return;
        }

        const updates = { status: targetStageId };
        if (validation.nextTask) {
          updates.latestHandoffTask = validation.nextTask;
        }
        onUpdateLead(leadId, updates);
        if (triggerToast) {
          triggerToast(isAr ? `تم نقل العميل بنجاح إلى مرحلة ${PIPELINE_STAGES.find(s=>s.id===targetStageId)?.title_ar || targetStageId}` : `Lead moved to ${targetStageId}`, 'success');
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
      const validation = validateStageTransition(lead, nextStage.id, {
        userRole: activeRole,
        isFounderApproved: lead.isFounderApproved || activeRole === 'super_admin'
      });

      if (!validation.allowed) {
        setBlockerModal({ isOpen: true, blockerInfo: validation, lead });
        if (triggerToast) {
          triggerToast(validation.missingDeliverable, 'error');
        }
        return;
      }

      if (onUpdateLead) {
        const updates = { status: nextStage.id };
        if (validation.nextTask) {
          updates.latestHandoffTask = validation.nextTask;
        }
        onUpdateLead(lead.id, updates);
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

  const onWhatsAppClick = (lead) => {
    const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
    const propTitle = getLocalizedPropertyType(lead.propertyType || lead.details?.propertyType);
    const areaTitle = getLocalizedArea(lead.area || lead.details?.area || lead.location);
    const text = isAr 
      ? `مرحباً أ. ${lead.name || 'العميل الكريم'}، معك مستشار شركة 1Line للحلول العقارية بسوهاج بخصوص طلبكم (${propTitle} في ${areaTitle}). يسعدنا تزويدك بالتفاصيل.`
      : `Hello ${lead.name}, this is 1Line Real Estate following up on your request for ${propTitle} in ${areaTitle}.`;
    window.open(`https://wa.me/${formatWhatsAppPhone(cleanPhone)}?text=${encodeURIComponent(text)}`, '_blank');
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
          <h3 style={{ margin: 0, fontSize: 'var(--crm-text-lg)', fontWeight: 700, color: 'var(--crm-ink)' }}>
            {isAr ? 'مسار الصفقات والمبيعات المرئي' : 'Visual Sales Deals Pipeline'}
          </h3>
          <span className="badge" style={{ background: 'var(--crm-warn-soft)', color: 'var(--crm-warn)', border: '1px solid var(--crm-warn-line)', fontSize: 'var(--crm-text-xs)', fontWeight: 'bold' }}>
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
                fontSize: 'var(--crm-text-xs)',
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

          <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-body)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
            <Filter size={13} /> {isAr ? 'النوع:' : 'Type:'}
          </span>
          <button 
            type="button"
            className="btn btn-sm"
            onClick={() => setFilterType('all')}
            style={{
              borderRadius: '8px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: filterType === 'all' ? 'bold' : '600',
              background: filterType === 'all' ? 'var(--crm-brand-navy)' : 'var(--crm-card)',
              color: filterType === 'all' ? 'var(--crm-on-dark)' : 'var(--crm-body)',
              border: filterType === 'all' ? '1px solid var(--crm-brand-navy)' : '1px solid var(--crm-line-strong)'
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
              fontSize: 'var(--crm-text-xs)',
              fontWeight: filterType === 'buyer' ? 'bold' : '600',
              background: filterType === 'buyer' ? 'var(--crm-info-solid)' : 'var(--crm-card)',
              color: filterType === 'buyer' ? 'var(--crm-on-dark)' : 'var(--crm-body)',
              border: filterType === 'buyer' ? '1px solid var(--crm-info)' : '1px solid var(--crm-line-strong)'
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
              fontSize: 'var(--crm-text-xs)',
              fontWeight: filterType === 'seller' ? 'bold' : '600',
              background: filterType === 'seller' ? 'var(--crm-warn-solid)' : 'var(--crm-card)',
              color: filterType === 'seller' ? 'var(--crm-on-dark)' : 'var(--crm-body)',
              border: filterType === 'seller' ? '1px solid var(--crm-warn)' : '1px solid var(--crm-line-strong)'
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
              fontSize: 'var(--crm-text-xs)',
              fontWeight: filterType === 'investor' ? 'bold' : '600',
              background: filterType === 'investor' ? 'var(--crm-violet-solid)' : 'var(--crm-card)',
              color: filterType === 'investor' ? 'var(--crm-on-dark)' : 'var(--crm-body)',
              border: filterType === 'investor' ? '1px solid var(--crm-violet)' : '1px solid var(--crm-line-strong)'
            }}
          >
            {isAr ? 'مستثمرين' : 'Investors'}
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
          const stageLeads = leadsByStage[stage.id] || [];
          const { count, totalVolume, budgetedCount, unbudgetedCount } = stageStatsMap[stage.id] || { count: 0, totalVolume: 0, budgetedCount: 0, unbudgetedCount: 0 };

          return (
            <div
              key={stage.id}
              className="kanban-stage-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              style={{
                background: 'var(--crm-subtle)',
                border: '1px solid var(--crm-line)',
                borderTop: `3px solid ${stage.color}`,
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
                  <h4 style={{ margin: 0, fontSize: 'var(--crm-text-md)', color: 'var(--crm-ink)', fontWeight: 700 }}>
                    {isAr ? stage.title_ar : stage.title_en}
                  </h4>
                  <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', fontWeight: '600', display: 'block', marginTop: '2px' }}>
                    {totalVolume > 0 ? (
                      <>
                        <bdi>{(totalVolume / 1000000).toFixed(1)}</bdi> {isAr ? 'مليون ج.م' : 'M EGP'}
                        {unbudgetedCount > 0 && (
                          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-faint)', marginInlineStart: '4px' }}>
                            ({budgetedCount} {isAr ? 'محددة' : 'set'} • {unbudgetedCount} {isAr ? 'قيد التحديد' : 'pending'})
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: 'var(--crm-faint)' }}>
                        {count > 0 ? (isAr ? 'الميزانيات قيد التحديد' : 'Budgets pending') : (isAr ? 'لا توجد صفقات' : 'No deals')}
                      </span>
                    )}
                  </span>
                </div>
                <span style={{
                  background: 'var(--crm-card)',
                  color: 'var(--crm-body)',
                  border: '1px solid var(--crm-line)',
                  padding: '2px 10px',
                  borderRadius: '20px',
                  fontSize: 'var(--crm-text-xs)',
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
                    border: '2px dashed var(--crm-line-strong)',
                    borderRadius: '10px',
                    color: 'var(--crm-faint)',
                    fontSize: 'var(--crm-text-xs)'
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

                    // 🚨 Check if inquiry is pending contact > 24 hours
                    const isOverdue = (lead.status === 'new' || !lead.status) && 
                      lead.timestamp && (Date.now() - new Date(lead.timestamp).getTime() > 24 * 60 * 60 * 1000);

                    const stageIndex = PIPELINE_STAGES.findIndex(s => s.id === (lead.status || 'new'));
                    const closeMenu = (e) => e.currentTarget.closest('details')?.removeAttribute('open');
                    const leadName = lead.name?.trim() || (isAr ? 'عميل بدون اسم' : 'Unnamed lead');

                    // Neutral card (audit DEF-10): the stage colour lives only on the column rule;
                    // state that needs attention is a single icon line, not another coloured box.
                    return (
                      <article
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className={`kb-card animate-fadeIn ${isOverdue ? 'is-overdue' : ''}`}
                        aria-label={`${leadName} — ${isAr ? stage.title_ar : stage.title_en}`}
                      >
                        <div className="kb-card-top">
                          <span className="kb-type">{typeBadge.label}</span>
                          {budget >= HIGH_VALUE_DEAL_THRESHOLD && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: 'var(--crm-danger-soft, rgba(239, 68, 68, 0.12))',
                                color: 'var(--crm-danger)',
                                border: '1px solid var(--crm-danger-line, rgba(239, 68, 68, 0.3))',
                                fontSize: 'var(--crm-text-xs)',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px'
                              }}
                              title={isAr ? 'صفقة كبرى (≥ 5 مليون ج) تتطلب اعتماد المؤسس' : 'High value (5M+) requires Founder sign-off'}
                            >
                              <ShieldAlert size={11} aria-hidden="true" />
                              {isAr ? 'صفقة كبرى (5M+)' : '5M+ Deal'}
                            </span>
                          )}
                          <span className="kb-time"><Clock size={11} aria-hidden="true" />{timeAgoText}</span>
                        </div>

                        <button
                          type="button"
                          className="kb-name"
                          onClick={() => (onOpenLead ? onOpenLead(lead) : onOpenEditLead?.(lead))}
                          title={isAr ? 'فتح المعاينة السريعة للعميل' : 'Open lead'}
                        >
                          {leadName}
                        </button>

                        <p className="kb-meta">
                          <span>{propType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{area}</span>
                          <span aria-hidden="true">·</span><span title={leadScore(lead).reasons.join(' • ')}>{isAr ? `اهتمام ${leadScore(lead).score}%` : `${leadScore(lead).score}% score`}</span>
                        </p>

                        <div className="kb-value">
                          {budget > 0 ? (
                            <><bdi>{budget.toLocaleString('en-US')}</bdi><small>{isAr ? 'ج.م' : 'EGP'}</small></>
                          ) : (
                            <span className="kb-value-empty">{isAr ? 'لم تُحدَّد الميزانية' : 'Budget not set'}</span>
                          )}
                          <bdi dir="ltr" className="kb-phone" style={{ unicodeBidi: 'isolate' }}>{lead.whatsapp || lead.phone || '—'}</bdi>
                        </div>

                        {isOverdue && (
                          <p className="kb-flag kb-flag--danger"><AlertTriangle size={13} aria-hidden="true" />{isAr ? 'متأخر عن الاتصال أكثر من 24 ساعة' : 'Not contacted for 24h+'}</p>
                        )}
                        {lead.nextFollowUpAt && (
                          <p className="kb-flag"><Calendar size={13} aria-hidden="true" />{isAr ? 'متابعة:' : 'Follow-up:'} {new Date(lead.nextFollowUpAt).toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        )}
                        {lead.siteVisit && (
                          <p className="kb-flag"><Car size={13} aria-hidden="true" />{isAr ? 'معاينة:' : 'Visit:'} {lead.siteVisit.visitDate} ({lead.siteVisit.visitTime})</p>
                        )}

                        <div className="kb-actions">
                          <button type="button" className="kb-btn kb-btn--wa" onClick={() => onWhatsAppClick(lead)} title={isAr ? 'محادثة فورية عبر واتساب' : 'WhatsApp'}>
                            <MessageSquare size={14} aria-hidden="true" /><span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                          </button>
                          {onOpenLead && (
                            <button type="button" className="kb-btn" onClick={() => onOpenLead(lead)} title={isAr ? 'معاينة سريعة وتسجيل مكالمة' : 'Quick view'}>
                              <Zap size={14} aria-hidden="true" /><span>{isAr ? 'معاينة' : 'Open'}</span>
                            </button>
                          )}

                          <details className="kb-more">
                            <summary className="kb-btn kb-btn--icon" aria-label={isAr ? 'إجراءات أخرى' : 'More actions'}>
                              <MoreHorizontal size={16} aria-hidden="true" />
                            </summary>
                            <div className="kb-menu">
                              <button type="button" onClick={(e) => { closeMenu(e); setSchedulingVisitLead(lead); }}>
                                <Car size={14} aria-hidden="true" />{isAr ? 'حجز موعد معاينة' : 'Schedule visit'}
                              </button>
                              {onOpenEditLead && (
                                <button type="button" onClick={(e) => { closeMenu(e); onOpenEditLead(lead); }}>
                                  <Edit3 size={14} aria-hidden="true" />{isAr ? 'تعديل البيانات' : 'Edit'}
                                </button>
                              )}
                              <button type="button" disabled={stageIndex <= 0} onClick={(e) => { closeMenu(e); handleMoveToPrevStage(lead); }}>
                                {isAr ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}{isAr ? 'إرجاع للمرحلة السابقة' : 'Previous stage'}
                              </button>
                              {onDeleteLead && (
                                <button type="button" className="is-danger" onClick={(e) => { closeMenu(e); setLeadToDelete(lead); }}>
                                  <Trash2 size={14} aria-hidden="true" />{isAr ? 'حذف العميل' : 'Delete'}
                                </button>
                              )}
                            </div>
                          </details>

                          <button
                            type="button"
                            className="kb-btn kb-btn--icon kb-next"
                            onClick={() => handleMoveToNextStage(lead)}
                            disabled={stageIndex >= PIPELINE_STAGES.length - 1}
                            aria-label={isAr ? `نقل إلى: ${PIPELINE_STAGES[stageIndex + 1]?.title_ar || ''}` : `Move to: ${PIPELINE_STAGES[stageIndex + 1]?.title_en || ''}`}
                            title={isAr ? 'نقل للمرحلة التالية' : 'Next stage'}
                          >
                            {isAr ? <ChevronLeft size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                          </button>
                        </div>
                      </article>
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
                <Trash2 size={20} style={{ color: 'var(--crm-danger)' }} />
                <h3 style={{ margin: 0, color: 'var(--crm-ink)', fontSize: 'var(--crm-text-lg)', fontWeight: 700 }}>
                  {isAr ? 'تأكيد حذف العميل' : 'Confirm Delete Lead'}
                </h3>
              </div>
              <button type="button" className="drawer-close-btn" onClick={() => setLeadToDelete(null)}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ color: 'var(--crm-body)', fontSize: 'var(--crm-text-base)', lineHeight: '1.6', margin: '0 0 20px 0' }}>
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
                  style={{ background: 'var(--crm-danger-solid)', color: 'var(--crm-on-dark)', border: 'none' }}
                >
                  <Trash2 size={15} />
                  <span>{isAr ? 'تأكيد الحذف' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1Line OS Deliverable Gate Blocker Modal */}
      <StageDeliverableModal
        isOpen={blockerModal.isOpen}
        onClose={() => setBlockerModal({ isOpen: false, blockerInfo: null, lead: null })}
        blockerInfo={blockerModal.blockerInfo}
        lead={blockerModal.lead}
        onOpenDeliverableAction={(leadToEdit) => {
          setBlockerModal({ isOpen: false, blockerInfo: null, lead: null });
          if (onOpenLead) onOpenLead(leadToEdit);
          else if (onOpenEditLead) onOpenEditLead(leadToEdit);
        }}
      />
    </div>
  );
}
