import { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Columns3, Rows3, MessageSquare, Calendar, Car, Clock, Edit3, Trash2, ChevronRight, ChevronLeft, AlertTriangle, Search, Zap, MoreHorizontal, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';
import StageDeliverableModal from './StageDeliverableModal';
import './crm-kanban.css';
import { getAreas } from '../../utils/areasData';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { leadScore } from '../../utils/crmLeadViews';
import { validateStageTransition, HIGH_VALUE_DEAL_THRESHOLD } from '../../services/stateMachineEngine';
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';
import { PageHeader, KpiRow, KpiTile, Chip } from '../ui';
import './kanban-redesign.css';

const CARDS_PER_STAGE = 5;

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
  const [collapsedStages, setCollapsedStages] = useState(() => {
    try {
      const saved = localStorage.getItem('oneline_kanban_collapsed_stages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Each column shows the first few deals; "show all" opens the rest (per column, not saved)
  const [openStages, setOpenStages] = useState([]);
  const toggleStageOpen = (stageId) => setOpenStages((prev) => (prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]));

  // Compact view: narrower columns and shorter cards, so more stages fit on one screen
  const [compact, setCompact] = useState(() => {
    try { return localStorage.getItem('oneline_kanban_compact') === '1'; } catch { return false; }
  });
  const toggleCompact = () => setCompact((prev) => {
    try { localStorage.setItem('oneline_kanban_compact', prev ? '0' : '1'); } catch { /* ignore storage error */ }
    return !prev;
  });

  const saveCollapsed = (next) => {
    try { localStorage.setItem('oneline_kanban_collapsed_stages', JSON.stringify(next)); } catch { /* ignore storage error */ }
    return next;
  };
  const collapseAll = () => setCollapsedStages(saveCollapsed(PIPELINE_STAGES.map((st) => st.id)));
  const expandAll = () => setCollapsedStages(saveCollapsed([]));

  // A second scrollbar above the board, kept in sync, so wide boards scroll without going to the bottom
  const boardRef = useRef(null);
  const topBarRef = useRef(null);
  const topTrackRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(0);
  useEffect(() => {
    if (topTrackRef.current) topTrackRef.current.style.width = `${boardWidth}px`;
  }, [boardWidth]);
  useEffect(() => {
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => setBoardWidth(board.scrollWidth > board.clientWidth + 1 ? board.scrollWidth : 0);
    const ro = new ResizeObserver(measure);
    ro.observe(board);
    measure();
    return () => ro.disconnect();
  }, [collapsedStages, compact]);
  // The echo scroll on the other bar finds the positions already equal and stops there
  const syncScroll = (from, to) => {
    if (from && to && Math.abs(to.scrollLeft - from.scrollLeft) >= 1) to.scrollLeft = from.scrollLeft;
  };

  const toggleStageCollapse = (stageId) => {
    setCollapsedStages(prev => {
      const next = prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId];
      try { localStorage.setItem('oneline_kanban_collapsed_stages', JSON.stringify(next)); } catch { /* ignore storage error */ }
      return next;
    });
  };

  const isAr = lang === 'ar';

  const allAreas = useMemo(() => getAreas(), []);

  // Format and localize property type (returns null for general tags that duplicate the top card badge)
  const getLocalizedPropertyType = (typeKey) => {
    if (!typeKey) return null;
    const cleanKey = String(typeKey).trim().toLowerCase();
    if (cleanKey === 'buyer' || cleanKey === 'request' || cleanKey === 'lead' || cleanKey === 'seller') {
      return null;
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
    // An unknown internal key (e.g. "new_area_2") must not reach the card as raw text
    return /^[a-z0-9_-]+$/i.test(String(areaKey)) ? (isAr ? 'سوهاج' : 'Sohag') : areaKey;
  };

  // Format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return isAr ? 'اليوم' : 'Today';
    try {
      // Firestore Timestamps (createdAt on imported and staff-added leads) are not Dates: new Date(ts) gave NaN
      const ms = typeof timestamp?.toMillis === 'function' ? timestamp.toMillis()
        : typeof timestamp?.seconds === 'number' ? timestamp.seconds * 1000
        : new Date(timestamp).getTime();
      if (!Number.isFinite(ms)) return isAr ? 'مؤخراً' : 'Recent';
      // eslint-disable-next-line react-hooks/purity -- "time ago" label must use the current clock
      const diffMs = Date.now() - ms;
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

  // Clock for overdue calculations
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // Executive pipeline metrics overview
  const pipelineOverview = useMemo(() => {
    let totalVol = 0;
    let highValue = 0;
    let overdue = 0;
    filteredLeads.forEach(l => {
      const b = getLeadBudget(l);
      totalVol += b;
      if (b >= HIGH_VALUE_DEAL_THRESHOLD) highValue++;
      const created = l.createdAt?.toMillis ? l.createdAt.toMillis() : (typeof l.createdAt?.seconds === 'number' ? l.createdAt.seconds * 1000 : new Date(l.createdAt || l.timestamp || NaN).getTime());
      const isOverdue = (l.status === 'new' || !l.status) && Number.isFinite(created) && (now - created > 24 * 60 * 60 * 1000);
      if (isOverdue) overdue++;
    });
    return {
      totalVol,
      highValue,
      overdue,
      activeCount: filteredLeads.length
    };
  }, [filteredLeads, now]);

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

        const prevStageId = targetLead.status || 'new';
        const updates = { 
          status: targetStageId,
          statusUpdatedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString()
        };
        if (validation.nextTask) {
          updates.latestHandoffTask = validation.nextTask;
        }
        onUpdateLead(leadId, updates, targetLead.version);
        if (triggerToast) {
          triggerToast(
            isAr ? `تم نقل العميل بنجاح إلى مرحلة ${PIPELINE_STAGES.find(s=>s.id===targetStageId)?.title_ar || targetStageId}` : `Lead moved to ${targetStageId}`,
            'success',
            {
              onUndo: () => {
                onUpdateLead(leadId, { status: prevStageId, lastActivityAt: new Date().toISOString() });
              },
              undoLabel: isAr ? 'تراجع' : 'Undo',
              duration: 6000
            }
          );
        }
      }
    }
    setDraggedLeadId(null);
  };

  // Quick Move to Next Stage
  const handleMoveToNextStage = (lead) => {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === (lead.status || 'new'));
    if (currentIndex < PIPELINE_STAGES.length - 1) {
      const prevStageId = lead.status || 'new';
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
        const updates = { 
          status: nextStage.id,
          statusUpdatedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString()
        };
        if (validation.nextTask) {
          updates.latestHandoffTask = validation.nextTask;
        }
        onUpdateLead(lead.id, updates, lead.version);
        if (triggerToast) {
          triggerToast(
            isAr ? `تم نقل العميل إلى مرحلة: ${nextStage.title_ar}` : `Moved to ${nextStage.title_en}`,
            'success',
            {
              onUndo: () => {
                onUpdateLead(lead.id, { status: prevStageId, lastActivityAt: new Date().toISOString() });
              },
              undoLabel: isAr ? 'تراجع' : 'Undo',
              duration: 6000
            }
          );
        }
      }
    }
  };

  // Quick Move to Previous Stage
  const handleMoveToPrevStage = (lead) => {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === (lead.status || 'new'));
    if (currentIndex > 0) {
      const currentStageId = lead.status || 'new';
      const prevStage = PIPELINE_STAGES[currentIndex - 1];
      if (onUpdateLead) {
        onUpdateLead(lead.id, { 
          status: prevStage.id,
          statusUpdatedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString()
        }, lead.version);
        if (triggerToast) {
          triggerToast(
            isAr ? `تم إرجاع العميل إلى مرحلة: ${prevStage.title_ar}` : `Moved back to ${prevStage.title_en}`,
            'info',
            {
              onUndo: () => {
                onUpdateLead(lead.id, { status: currentStageId, lastActivityAt: new Date().toISOString() });
              },
              undoLabel: isAr ? 'تراجع' : 'Undo',
              duration: 6000
            }
          );
        }
      }
    }
  };

  // Direct Move to Any Specific Stage
  const handleMoveToSpecificStage = (lead, targetStageId) => {
    if (!lead || !targetStageId || lead.status === targetStageId) return;
    const prevStageId = lead.status || 'new';
    const validation = validateStageTransition(lead, targetStageId, {
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
      const updates = { 
        status: targetStageId,
        statusUpdatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString()
      };
      if (validation.nextTask) {
        updates.latestHandoffTask = validation.nextTask;
      }
      onUpdateLead(lead.id, updates, lead.version);
      const targetStage = PIPELINE_STAGES.find(s => s.id === targetStageId);
      if (triggerToast) {
        triggerToast(
          isAr ? `تم نقل العميل مباشرة إلى مرحلة: ${targetStage?.title_ar || targetStageId}` : `Moved to ${targetStage?.title_en || targetStageId}`,
          'success',
          {
            onUndo: () => {
              onUpdateLead(lead.id, { status: prevStageId, lastActivityAt: new Date().toISOString() });
            },
            undoLabel: isAr ? 'تراجع' : 'Undo',
            duration: 6000
          }
        );
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
    <div className="kanban-pipeline-wrapper crm-kanban">
      <PageHeader
        title={isAr ? 'مسار الصفقات' : 'Pipeline'}
        description={isAr ? 'اسحب الصفقة من مرحلة لمرحلة، أو افتحها علشان تسجّل مكالمة.' : 'Drag a deal between stages, or open it to log a call.'}
      />

      <KpiRow label={isAr ? 'ملخص المسار' : 'Pipeline summary'}>
        <KpiTile
          label={isAr ? 'صفقات ظاهرة' : 'Deals shown'}
          value={pipelineOverview.activeCount}
          icon={<Users size={16} />}
        />
        <KpiTile
          label={isAr ? 'قيمة الصفقات' : 'Pipeline value'}
          value={pipelineOverview.totalVol > 0 ? pipelineOverview.totalVol / 1000000 : null}
          digits={1}
          unit={isAr ? 'مليون ج.م' : 'M EGP'}
          emptyText={isAr ? 'مفيش ميزانيات متسجّلة' : 'No budgets yet'}
          icon={<TrendingUp size={16} />}
        />
        <KpiTile
          label={isAr ? 'صفقات كبيرة (5 مليون+)' : 'Large deals (5M+)'}
          value={pipelineOverview.highValue}
          icon={<ShieldAlert size={16} />}
        />
        <KpiTile
          label={isAr ? 'جديدة من غير رد +24 ساعة' : 'New, no reply 24h+'}
          value={pipelineOverview.overdue}
          className={pipelineOverview.overdue > 0 ? 'crm-kanban__kpi-alert' : undefined}
          icon={<AlertTriangle size={16} />}
        />
      </KpiRow>

      <div className="crm-kanban__toolbar">
        <div className="crm-kanban__views" role="group" aria-label={isAr ? 'نوع العميل' : 'Client type'}>
          <Chip pressed={filterType === 'all'} count={leads.length} onClick={() => setFilterType('all')}>{isAr ? 'الكل' : 'All'}</Chip>
          <Chip pressed={filterType === 'buyer'} onClick={() => setFilterType('buyer')}>{isAr ? 'مشترين' : 'Buyers'}</Chip>
          <Chip pressed={filterType === 'seller'} onClick={() => setFilterType('seller')}>{isAr ? 'بايعين' : 'Sellers'}</Chip>
          <Chip pressed={filterType === 'investor'} onClick={() => setFilterType('investor')}>{isAr ? 'مستثمرين' : 'Investors'}</Chip>
        </div>
        <div className="crm-kanban__layout" role="group" aria-label={isAr ? 'شكل العرض' : 'Layout'}>
          <Chip pressed={compact} onClick={toggleCompact} icon={<Rows3 size={14} aria-hidden="true" />}>{isAr ? 'عرض مضغوط' : 'Compact'}</Chip>
          {collapsedStages.length < PIPELINE_STAGES.length ? (
            <Chip onClick={collapseAll} icon={<Columns3 size={14} aria-hidden="true" />}>{isAr ? 'طي كل الأعمدة' : 'Collapse all'}</Chip>
          ) : (
            <Chip onClick={expandAll} icon={<Columns3 size={14} aria-hidden="true" />}>{isAr ? 'فتح كل الأعمدة' : 'Expand all'}</Chip>
          )}
        </div>
        <label className="crm-kanban__search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label={isAr ? 'بحث في الصفقات' : 'Search deals'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'اسم أو تليفون' : 'Name or phone'}
          />
        </label>
      </div>

      {/* Kanban Stages Board */}
      {boardWidth > 0 && (
        <div
          ref={topBarRef}
          className="crm-kanban__topscroll"
          aria-hidden="true"
          onScroll={() => syncScroll(topBarRef.current, boardRef.current)}
        >
          <div ref={topTrackRef} />
        </div>
      )}
      <div
        ref={boardRef}
        className={`kanban-board-scroll-container${compact ? ' is-compact' : ''}`}
        onScroll={() => syncScroll(boardRef.current, topBarRef.current)}
        style={{
          display: 'grid',
          gridTemplateColumns: PIPELINE_STAGES.map(s => collapsedStages.includes(s.id) ? '54px' : (compact ? 'minmax(160px, 1fr)' : 'minmax(280px, 1fr)')).join(' ')
        }}
      >
        {PIPELINE_STAGES.map((stage) => {
          const isCollapsed = collapsedStages.includes(stage.id);
          const allStageLeads = leadsByStage[stage.id] || [];
          const isOpen = openStages.includes(stage.id);
          const stageLeads = isOpen ? allStageLeads : allStageLeads.slice(0, CARDS_PER_STAGE);
          const hiddenCount = allStageLeads.length - stageLeads.length;
          const { count, totalVolume, budgetedCount, unbudgetedCount } = stageStatsMap[stage.id] || { count: 0, totalVolume: 0, budgetedCount: 0, unbudgetedCount: 0 };

          if (isCollapsed) {
            return (
              <div
                key={stage.id}
                className="kanban-stage-column is-collapsed"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                onClick={() => toggleStageCollapse(stage.id)}
                title={isAr ? `انقر لتوسيع مرحلة "${stage.title_ar}" (${count} صفقات)` : `Click to expand "${stage.title_en}" (${count})`}
                style={{ borderTop: `3px solid ${stage.color}` }}
              >
                <button
                  type="button"
                  className="kanban-stage-collapse-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStageCollapse(stage.id);
                  }}
                  title={isAr ? 'توسيع المرحلة' : 'Expand stage'}
                >
                  <ChevronRight size={14} style={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
                </button>

                <span style={{
                  background: 'var(--crm-card)',
                  color: stage.color,
                  border: `1px solid ${stage.color}`,
                  borderRadius: '12px',
                  padding: '2px 6px',
                  fontSize: 'var(--crm-text-xs)',
                  fontWeight: 800
                }}>
                  {count}
                </span>

                <div style={{
                  writingMode: 'vertical-rl',
                  transform: isAr ? 'rotate(180deg)' : 'none',
                  fontSize: 'var(--crm-text-xs)',
                  fontWeight: 700,
                  color: 'var(--crm-ink)',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                  marginTop: '10px'
                }}>
                  {isAr ? stage.title_ar : stage.title_en}
                </div>
              </div>
            );
          }

          return (
            <div
              key={stage.id}
              className="kanban-stage-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              style={{ borderTop: `3px solid ${stage.color}` }}
            >
              {/* Stage Header */}
              <div className="kanban-stage-header">
                <div className="kanban-stage-title-wrap">
                  <h2 className="kanban-stage-title">{isAr ? stage.title_ar : stage.title_en}</h2>
                  <span className="kanban-stage-volume-sub">
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="kanban-stage-count-pill">
                    {count}
                  </span>
                  <button
                    type="button"
                    className="kanban-stage-collapse-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStageCollapse(stage.id);
                    }}
                    title={isAr ? 'طي هذا العمود لتقليل العرض' : 'Collapse column'}
                    aria-label={isAr ? 'طي العمود' : 'Collapse'}
                  >
                    <ChevronLeft size={15} style={{ transform: isAr ? 'none' : 'rotate(180deg)' }} />
                  </button>
                </div>
              </div>

              {/* Cards Container */}
              <div className="kanban-cards-container">
                {stageLeads.length === 0 ? (
                  <div className="kanban-drop-empty">
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
                              className="kb-high-value-pill"
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
                          {propType && (
                            <>
                              <span>{propType}</span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span>{area}</span>
                          <span aria-hidden="true">·</span><span title={leadScore(lead).reasons.join(' • ')}>{isAr ? `اهتمام ${leadScore(lead).score}%` : `${leadScore(lead).score}% score`}</span>
                        </p>

                        <div className="kb-value">
                          {budget > 0 ? (
                            <><bdi>{budget.toLocaleString('en-US')}</bdi><small>{isAr ? 'ج.م' : 'EGP'}</small></>
                          ) : (
                            <span className="kb-value-empty">{isAr ? 'لم تُحدَّد الميزانية' : 'Budget not set'}</span>
                          )}
                          <bdi dir="ltr" className="kb-phone" style={{ unicodeBidi: 'isolate' }}>{formatPhoneNumber(lead.whatsapp || lead.phone) || '—'}</bdi>
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
                              {/* Direct Jump To Any Stage */}
                              <div className="kb-menu-header">
                                <span className="kb-menu-header-label">
                                  {isAr ? 'نقل مباشر إلى مرحلة:' : 'Direct Move to:'}
                                </span>
                                {PIPELINE_STAGES.filter(s => s.id !== (lead.status || 'new')).map(targetStage => (
                                  <button
                                    key={targetStage.id}
                                    type="button"
                                    onClick={(e) => {
                                      closeMenu(e);
                                      handleMoveToSpecificStage(lead, targetStage.id);
                                    }}
                                  >
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: targetStage.color, flexShrink: 0 }} />
                                    <span>{isAr ? targetStage.title_ar : targetStage.title_en}</span>
                                  </button>
                                ))}
                              </div>

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
                {(hiddenCount > 0 || (isOpen && allStageLeads.length > CARDS_PER_STAGE)) && (
                  <button
                    type="button"
                    className="kanban-stage-more"
                    aria-expanded={isOpen}
                    onClick={() => toggleStageOpen(stage.id)}
                  >
                    {isOpen ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                    {isOpen
                      ? (isAr ? 'عرض أقل' : 'Show less')
                      : (isAr ? `عرض ${hiddenCount} كمان` : `Show ${hiddenCount} more`)}
                  </button>
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
