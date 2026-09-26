import { useState, useMemo, useEffect } from 'react';
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
  X,
  Zap,
  MoreHorizontal
} from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';
import './crm-kanban.css';
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
  onOpenLead,
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

  // Auto distribute leads across stages for realistic demo (with confirmation safeguard)
  const handleAutoDistributeStages = () => {
    if (!onUpdateLead || leads.length === 0) return;
    const confirmed = typeof window !== 'undefined' && window.confirm(
      isAr 
        ? `⚠️ تنبيه تشغيلي:\nهل أنت متأكد من رغبتك في إعادة توزيع حالات جميع العملاء (${leads.length} عميل) على مراحل المسار تجريبياً؟\nسيؤدي ذلك إلى تعديل مراحل الصفقات الحالية.`
        : `⚠️ Operational Warning:\nAre you sure you want to test-redistribute all ${leads.length} leads across pipeline stages? This will update their active deal stages.`
    );
    if (!confirmed) return;

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
          <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: 'var(--crm-text-xs)', fontWeight: 'bold' }}>
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
              fontSize: 'var(--crm-text-xs)',
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
              fontSize: 'var(--crm-text-xs)',
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
              fontSize: 'var(--crm-text-xs)',
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
              fontSize: 'var(--crm-text-xs)',
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
                  <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', fontWeight: '600' }}>
                    {(totalVolume / 1000000).toFixed(1)} {isAr ? 'مليون ج.م حجم الصفقات' : 'M EGP'}
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
                    border: '2px dashed #cbd5e1',
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
                          {lead.score ? <><span aria-hidden="true">·</span><span>{isAr ? `جودة ${lead.score}%` : `${lead.score}% fit`}</span></> : null}
                        </p>

                        <div className="kb-value">
                          {budget > 0 ? (
                            <><bdi>{budget.toLocaleString('en-US')}</bdi><small>{isAr ? 'ج.م' : 'EGP'}</small></>
                          ) : (
                            <span className="kb-value-empty">{isAr ? 'لم تُحدَّد الميزانية' : 'Budget not set'}</span>
                          )}
                          <bdi className="kb-phone">{lead.whatsapp || lead.phone || '—'}</bdi>
                        </div>

                        {isOverdue && (
                          <p className="kb-flag kb-flag--danger"><AlertTriangle size={13} aria-hidden="true" />{isAr ? 'متأخر عن الاتصال أكثر من 24 ساعة' : 'Not contacted for 24h+'}</p>
                        )}
                        {lead.nextFollowUpAt && (
                          <p className="kb-flag"><Calendar size={13} aria-hidden="true" />{isAr ? 'متابعة:' : 'Follow-up:'} {new Date(lead.nextFollowUpAt).toLocaleString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</p>
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
                <Trash2 size={20} style={{ color: '#dc2626' }} />
                <h3 style={{ margin: 0, color: '#092347', fontSize: '1.1rem', fontWeight: 700 }}>
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
