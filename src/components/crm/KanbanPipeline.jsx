import { useState } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';

const PIPELINE_STAGES = [
  { id: 'new', title_ar: 'طلبات جديدة', title_en: 'New Inquiries', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.08)' },
  { id: 'contacted', title_ar: 'تم التواصل الأولي', title_en: 'Contacted', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.08)' },
  { id: 'site_visit', title_ar: 'معاينات مجدولة', title_en: 'Site Visits', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
  { id: 'negotiating', title_ar: 'قيد التفاوض والتقييم', title_en: 'Negotiation', color: '#f97316', bg: 'rgba(249, 115, 22, 0.08)' },
  { id: 'closing', title_ar: 'توقيع عقود وحجز', title_en: 'Closing / Deposit', color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
  { id: 'closed', title_ar: 'صفقات ناجحة', title_en: 'Closed Won', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' }
];

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

  const filteredLeads = leads.filter(l => {
    if (filterType !== 'all' && l.type !== filterType) return false;
    return true;
  });

  // Calculate Column metrics
  const getStageStats = (stageId) => {
    const stageLeads = filteredLeads.filter(l => (l.status || 'new') === stageId);
    const totalVolume = stageLeads.reduce((acc, curr) => {
      const budget = parseInt(curr.details?.budget) || parseInt(curr.details?.expectedPrice) || 2500000;
      return acc + budget;
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
        triggerToast(isAr ? `تم نقل العميل بنجاح إلى مرحلة ${PIPELINE_STAGES.find(s=>s.id===targetStageId)?.title_ar}` : `Lead moved to ${targetStageId}`, 'success');
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
        triggerToast(isAr ? `تمت الترقية إلى: ${nextStage.title_ar}` : `Moved to ${nextStage.title_en}`, 'success');
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
        triggerToast(isAr ? `تم الإرجاع إلى: ${prevStage.title_ar}` : `Moved to ${prevStage.title_en}`, 'info');
      }
    }
  };

  const onWhatsAppClick = (lead) => {
    const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
    const text = isAr 
      ? `مرحباً أ. ${lead.name}، معك مستشار شركة 1Line للحلول العقارية بسوهاج. نود متابعة طلبك بخصوص ${lead.details?.propertyType || 'الوحدات المتاحة'}.`
      : `Hello ${lead.name}, this is 1Line Real Estate following up on your request.`;
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
    <div className="kanban-pipeline-wrapper">
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
          <h3 style={{ margin: 0 }}>
            {isAr ? 'مسار الصفقات والمبيعات المرئي (Deals Kanban Pipeline)' : 'Visual Sales Deals Pipeline'}
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Filter size={13} /> {isAr ? 'تصفية النوع:' : 'Filter Type:'}
          </span>
          <button 
            className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('all')}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          <button 
            className={`btn btn-sm ${filterType === 'buyer' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('buyer')}
          >
            {isAr ? 'مشترين' : 'Buyers'}
          </button>
          <button 
            className={`btn btn-sm ${filterType === 'seller' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('seller')}
          >
            {isAr ? 'بائعين' : 'Sellers'}
          </button>
          <button 
            className={`btn btn-sm ${filterType === 'investor' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterType('investor')}
          >
            {isAr ? 'مستثمرين' : 'Investors'}
          </button>
        </div>
      </div>

      {/* Kanban Stages Board */}
      <div className="kanban-board-scroll-container" style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, minmax(260px, 1fr))`,
        gap: '14px',
        overflowX: 'auto',
        paddingBottom: '20px'
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
                background: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${stage.color}33`,
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                minHeight: '520px',
                display: 'flex',
                flexDirection: 'column'
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
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: stage.color, fontWeight: 'bold' }}>
                    {isAr ? stage.title_ar : stage.title_en}
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {(totalVolume / 1000000).toFixed(1)} {isAr ? 'مليون ج.م حجم الصفقات' : 'M EGP'}
                  </span>
                </div>
                <span style={{
                  background: stage.bg,
                  color: stage.color,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  {count}
                </span>
              </div>

              {/* Cards Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {stageLeads.length === 0 ? (
                  <div style={{
                    padding: '30px 10px',
                    textAlign: 'center',
                    border: '1px dashed rgba(255,255,255,0.08)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem'
                  }}>
                    {isAr ? 'اسحب بطاقة عميل إلى هنا' : 'Drop leads here'}
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const budget = lead.details?.budget || lead.details?.expectedPrice;
                    const propType = lead.details?.propertyType;
                    const area = lead.details?.area;

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
                          background: 'var(--bg-card)',
                          border: isOverdue ? '1px solid var(--rose)' : '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px',
                          boxShadow: isOverdue ? '0 0 12px rgba(244, 63, 94, 0.25)' : 'var(--shadow-sm)',
                          cursor: 'grab',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Overdue Warning Pill */}
                        {isOverdue && (
                          <div style={{
                            background: 'rgba(244, 63, 94, 0.12)',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            color: 'var(--rose)',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.68rem',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <AlertTriangle size={12} className="text-rose" />
                            <span>{isAr ? '🚨 متأخر عن الاتصال (> 24 ساعة)' : '🚨 Overdue Contact (> 24h)'}</span>
                          </div>
                        )}

                        {/* Header: Name + Score */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{lead.name}</strong>
                          <span className={`lead-score-pill ${lead.score >= 85 ? 'score-high' : 'score-medium'}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                            {lead.score || 85}%
                          </span>
                        </div>

                        {/* Specs tag */}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          {propType && <span>{propType} • </span>}
                          {area && <span>{area}</span>}
                          {budget && (
                            <div style={{ color: 'var(--emerald)', fontWeight: 'bold', marginTop: '2px' }}>
                              💰 {typeof budget === 'number' ? budget.toLocaleString() + ' ج.م' : budget + ' EGP'}
                            </div>
                          )}
                        </div>

                        {/* Scheduled Visit Badge if any */}
                        {lead.siteVisit && (
                          <div style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid var(--accent-gold-light)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            color: 'var(--accent-gold)',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Car size={12} />
                            <span>{lead.siteVisit.visitDate} ({lead.siteVisit.visitTime})</span>
                          </div>
                        )}

                        {/* Card Actions Footer */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid rgba(255,255,255,0.05)',
                          paddingTop: '8px',
                          marginTop: '6px'
                        }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {/* WhatsApp Button */}
                            <button
                              type="button"
                              className="btn btn-sm btn-accent"
                              onClick={() => onWhatsAppClick(lead)}
                              style={{ padding: '4px 6px', fontSize: '0.7rem' }}
                              title="WhatsApp"
                            >
                              <MessageSquare size={12} />
                            </button>

                            {/* Schedule Site Visit */}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setSchedulingVisitLead(lead)}
                              style={{ padding: '4px 6px', fontSize: '0.7rem', color: 'var(--accent-gold)' }}
                              title={isAr ? 'حجز موعد معاينة ميدانية' : 'Schedule Site Visit'}
                            >
                              <Car size={12} />
                            </button>

                            {/* Edit Lead */}
                            {onOpenEditLead && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => onOpenEditLead(lead)}
                                style={{ padding: '4px 6px', fontSize: '0.7rem' }}
                                title={isAr ? 'تعديل' : 'Edit'}
                              >
                                <Edit3 size={12} />
                              </button>
                            )}
                          </div>

                          {/* Stage Transition Arrows */}
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => isAr ? handleMoveToNextStage(lead) : handleMoveToPrevStage(lead)}
                              style={{ padding: '3px 5px', fontSize: '0.7rem' }}
                              title={isAr ? 'المرحلة التالية' : 'Previous stage'}
                            >
                              {isAr ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => isAr ? handleMoveToPrevStage(lead) : handleMoveToNextStage(lead)}
                              style={{ padding: '3px 5px', fontSize: '0.7rem' }}
                              title={isAr ? 'المرحلة السابقة' : 'Next stage'}
                            >
                              {isAr ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
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
