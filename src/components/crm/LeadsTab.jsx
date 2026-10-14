import { 
  Download, Users, Inbox, Trash2, Clock, Plus, UserPlus, SlidersHorizontal,
  Search, X, RotateCcw, ChevronDown, Check, Layers, AlertCircle, Eye, 
  Building, Sparkles, User, Copy, Calendar, ShoppingBag, UserCheck, Flame, Trophy 
} from 'lucide-react';
import { SOHAG_AREAS } from '../../data/propertiesData';
import { formatFollowUp, formatBudget } from '../../utils/crmLabels';
import DeskOptions from './DeskOptions';
import ExportMenu from './ExportMenu';
import DataImportModal from './DataImportModal';
import { getAreas } from '../../utils/areasData';
import { useState, useMemo, useEffect, useRef } from 'react';
import LostReasonModal from './LostReasonModal';
import MergeLeadsModal from './MergeLeadsModal';
import { LEAD_SOURCES, LEAD_SORTS, LOST_REASONS, leadSourceKey, waitingMs, RESPONSE_SLA_MS, isOverdue, isUnassigned, isStale, localDayKey, getLeadVisitDate, getLeadVisitSlot, isViewingLead, isSellerLead, isAccountLead } from '../../utils/crmLeadViews';
import { useProperties } from '../../context/PropertiesContext';
import LeadScorePill from './LeadScorePill';
import LeadTableRowActions from './LeadTableRowActions';
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';

export default function LeadsTab({
  activeRole,
  areaFilter,
  filteredLeads,
  getLocalizedArea,
  getLocalizedPropertyType,
  handleBulkAssign,
  handleBulkDelete,
  handleBulkExportSelected,
  handleClaimLead,
  handleDeleteLeadClick,
  handleExportCSV,
  handleOpenEditLead,
  handleToggleSelectAll,
  handleToggleSelectOne,
  isAr,
  isSuperAdmin,
  kbdIndex,
  lang,
  leadFilter,
  leads,
  onConvertToProperty,
  onDispatchLeadClick,
  onUpdateLead,
  onImportLeads,
  onWhatsAppClick,
  searchQuery,
  selectedLeadIds,
  setAreaFilter,
  setKbdIndex,
  setLeadFilter,
  setQuickDrawerLead,
  setSearchQuery,
  setSelectedLeadIds,
  setShowAddLeadModal,
  setTemperatureFilter,
  setViewingProfileLead,
  temperatureFilter,
  triggerToast,
  duplicateIds = new Map(),
  onMergeLeads,
  canMergeLeads = false,
  sourceFilter = 'all',
  setSourceFilter,
  dateFilter = 'all',
  setDateFilter,
  leadSort = 'newest',
  setLeadSort,
  canEdit = true,
  canExport = false,
  canClaimLead = () => false,
  canCloseDeals = true
}) {
  const [lostFor, setLostFor] = useState(null);
  const [mergeGroup, setMergeGroup] = useState(null);

  // Column Visibility state & persistence
  const DEFAULT_VISIBLE_COLUMNS = {
    requirements: true,
    score: true,
    status: true,
    nextAction: true,
    agent: true,
  };
  const STORAGE_KEY_COLUMNS = 'oneline_crm_leads_columns';

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COLUMNS);
      if (saved) {
        return {
          ...DEFAULT_VISIBLE_COLUMNS,
          ...JSON.parse(saved)
        };
      }
    } catch (_e) {
      // fallback
    }
    return DEFAULT_VISIBLE_COLUMNS;
  });

  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const columnPickerRef = useRef(null);

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(next));
      } catch (_e) {
        // storage disabled
      }
      return next;
    });
  };

  const resetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    try {
      localStorage.removeItem(STORAGE_KEY_COLUMNS);
    } catch (_e) {
      // storage disabled
    }
  };

  useEffect(() => {
    if (!showColumnPicker) return;
    const handleClickOutside = (e) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target)) {
        setShowColumnPicker(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowColumnPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showColumnPicker]);

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const moreFiltersRef = useRef(null);

  useEffect(() => {
    if (!showMoreFilters) return;
    const handleClickOutside = (e) => {
      if (moreFiltersRef.current && !moreFiltersRef.current.contains(e.target)) {
        setShowMoreFilters(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowMoreFilters(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMoreFilters]);

  const totalVisibleCols = 3 + // Checkbox (1), Client Profile (1), Actions (1)
    (visibleColumns.requirements ? 1 : 0) +
    (leadFilter === 'viewing_request' ? 1 : 0) +
    (visibleColumns.score ? 1 : 0) +
    (visibleColumns.status ? 1 : 0) +
    (visibleColumns.nextAction ? 1 : 0) +
    (visibleColumns.agent ? 1 : 0);

  // Clock for the "no reply for …" badges; ticks once a minute
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const counts = useMemo(() => {
    const open = leads.filter((l) => !l.isArchived && l.status !== 'lost');
    const viewings = open.filter(isViewingLead);
    const sellers = open.filter(isSellerLead);
    const accounts = open.filter(isAccountLead);
    const unanswered = open.filter((l) => (!l.status || l.status === 'new') && !l.firstContactedAt && !l.lastContactedAt);

    return {
      all: open.length,
      fresh: open.filter((l) => !l.status || l.status === 'new').length,
      unanswered: unanswered.length,
      viewings: viewings.length,
      viewingUnanswered: viewings.filter((l) => (!l.status || l.status === 'new') && !l.firstContactedAt).length,
      sellers: sellers.length,
      sellerUnanswered: sellers.filter((l) => (!l.status || l.status === 'new') && !l.firstContactedAt).length,
      accounts: accounts.length,
      accountUnanswered: accounts.filter((l) => (!l.status || l.status === 'new') && !l.firstContactedAt).length,
      buyers: open.filter((l) => l.type === 'buyer' && !isViewingLead(l) && !isAccountLead(l)).length,
      awaiting: open.filter((l) => waitingMs(l, now) > 0).length,
      late: open.filter((l) => waitingMs(l, now) > RESPONSE_SLA_MS).length,
      dupes: open.filter((l) => duplicateIds.has(l.id)).length,
      overdue: open.filter((l) => isOverdue(l, localDayKey(now))).length,
      unassigned: open.filter(isUnassigned).length,
      stale: open.filter((l) => isStale(l, now)).length,
      lost: leads.filter((l) => !l.isArchived && l.status === 'lost').length,
      archived: leads.filter((l) => l.isArchived).length
    };
  }, [leads, duplicateIds, now]);

  const renderVisitBadge = (l) => {
    const vd = getLeadVisitDate(l);
    if (!vd) return <span className="crm-empty-value">—</span>;
    const vs = getLeadVisitSlot(l);
    const todayKey = localDayKey(now);
    const tomorrowKey = localDayKey(now + 86400000);
    const vdKey = localDayKey(vd);

    const isToday = vdKey === todayKey || String(vd).includes(todayKey) || String(vd).includes('اليوم');
    const isTomorrow = vdKey === tomorrowKey || String(vd).includes(tomorrowKey) || String(vd).includes('بكرة') || String(vd).includes('غدا');
    const isPast = vdKey && vdKey < todayKey;

    if (isToday) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--crm-danger)', color: 'var(--crm-danger)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: 'var(--crm-text-xs)' }}>
          🚨 {isAr ? 'اليوم' : 'Today'} • {vd} {vs ? `(${vs})` : ''}
        </span>
      );
    }
    if (isTomorrow) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--crm-warn)', color: 'var(--crm-warn)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: 'var(--crm-text-xs)' }}>
          ⚡ {isAr ? 'بكرة' : 'Tomorrow'} • {vd} {vs ? `(${vs})` : ''}
        </span>
      );
    }
    if (isPast) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(100, 116, 139, 0.2)', color: 'var(--crm-muted)', padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--crm-text-xs)' }}>
          ⌛ {isAr ? 'فات موعده' : 'Past'} • {vd} {vs ? `(${vs})` : ''}
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.3)', color: 'var(--crm-accent-text)', padding: '2px 8px', borderRadius: '4px', fontSize: 'var(--crm-text-xs)' }}>
        📅 {vd} {vs ? `(${vs})` : ''}
      </span>
    );
  };
  const fmtWait = (ms) => {
    const m = Math.floor(ms / 60000);
    if (m < 60) return isAr ? `${m} د` : `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 48) return isAr ? `${h} س` : `${h}h`;
    return isAr ? `${Math.floor(h / 24)} يوم` : `${Math.floor(h / 24)}d`;
  };
  const sourceLabel = (l) => { const s = LEAD_SOURCES.find((x) => x.id === leadSourceKey(l)); return s ? (isAr ? s.ar : s.en) : ''; };
  const openMerge = (l) => {
    const ids = [l.id, ...(duplicateIds.get(l.id) || [])];
    setMergeGroup(leads.filter((x) => ids.includes(x.id)));
  };
  const [importOpen, setImportOpen] = useState(false);
  const { leadsHasMore, loadMoreLeads, searchAllLeads } = useProperties();
  const [serverSearching, setServerSearching] = useState(false);
  // The list holds the newest clients only; this looks the term up across all of them on the server
  const runServerSearch = async () => {
    const term = searchQuery.trim();
    if (term.length < 2 || serverSearching) return;
    setServerSearching(true);
    const res = await searchAllLeads(term);
    setServerSearching(false);
    if (!res.ok) {
      triggerToast?.(res.error === 'index'
        ? (isAr ? 'البحث بالاسم لسه محتاج تفعيل (نشر فهارس قاعدة البيانات).' : 'Name search needs the database indexes published.')
        : (isAr ? 'تعذّر البحث، جرّب تاني.' : 'Search failed, try again.'), 'error');
      return;
    }
    triggerToast?.(res.leads.length
      ? (isAr ? `لقينا ${res.leads.length} عميل وضفناهم للقائمة` : `Found ${res.leads.length} and added them to the list`)
      : (isAr ? 'مفيش عميل بالاسم أو الرقم ده' : 'No client matches'), res.leads.length ? 'success' : 'info');
  };

  const MORE_FILTER_KEYS = ['qualified', 'account', 'stale', 'dupes', 'archived', 'lost'];
  const isMoreFilterActive = MORE_FILTER_KEYS.includes(leadFilter);
  const getMoreFilterLabel = () => {
    switch (leadFilter) {
      case 'qualified': return isAr ? 'مؤهلون للشراء' : 'Qualified';
      case 'account': return isAr ? `حسابات جديدة (${counts.accounts})` : `Accounts (${counts.accounts})`;
      case 'stale': return isAr ? `راكد (${counts.stale})` : `Stale (${counts.stale})`;
      case 'dupes': return isAr ? `مكرر (${counts.dupes})` : `Duplicates (${counts.dupes})`;
      case 'lost': return isAr ? `صفقات خسرانة (${counts.lost})` : `Lost (${counts.lost})`;
      default: return isAr ? 'المزيد من الحالات' : 'More Stages';
    }
  };

  const kpiStats = useMemo(() => {
    const total = leads.length;
    const hot = leads.filter(l => l.temperature === 'hot').length;
    const due = counts.due || counts.overdue || 0;
    const unanswered = counts.unanswered || 0;
    const won = leads.filter(l => l.status === 'closed').length;
    const lost = leads.filter(l => l.status === 'lost').length;
    const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    return { total, hot, due, unanswered, won, winRate };
  }, [leads, counts]);

  const cycleTemperature = (lead, e) => {
    e.stopPropagation();
    if (!canEdit || !onUpdateLead) return;
    const order = ['', 'hot', 'warm', 'cold'];
    const current = lead.temperature || '';
    const currentIndex = order.indexOf(current);
    const nextTemp = order[(currentIndex + 1) % order.length];
    onUpdateLead(lead.id, { temperature: nextTemp, lastActivityAt: new Date().toISOString() }, lead.version);
    const tempLabels = { hot: isAr ? 'ساخن جداً 🔥' : 'Hot 🔥', warm: isAr ? 'دافئ ⚡' : 'Warm ⚡', cold: isAr ? 'بارد ❄️' : 'Cold ❄️', '': isAr ? 'غير محدد' : 'Unset' };
    triggerToast?.(isAr ? `تم ضبط درجة الاهتمام: ${tempLabels[nextTemp]}` : `Temperature: ${tempLabels[nextTemp]}`, 'info');
  };

  const renderHighlighted = (text, query) => {
    if (!query || !query.trim() || !text) return text;
    const q = query.trim();
    try {
      const parts = String(text).split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      if (parts.length === 1) return text;
      return (
        <>
          {parts.map((part, idx) => 
            part.toLowerCase() === q.toLowerCase() ? (
              <mark key={idx} className="crm-search-highlight">{part}</mark>
            ) : (
              part
            )
          )}
        </>
      );
    } catch {
      return text;
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (!selectedLeadIds.length || !onUpdateLead) return;
    for (const id of selectedLeadIds) {
      const l = leads.find(x => x.id === id);
      if (l) {
        await onUpdateLead(id, { 
          status: newStatus,
          statusUpdatedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString()
        }, l.version);
      }
    }
    const stageNames = { new: 'طلب جديد', contacted: 'تم التواصل', site_visit: 'معاينة', negotiating: 'تفاوض', closing: 'توقيع وحجز', closed: 'ناجحة', lost: 'خسرانة' };
    triggerToast?.(isAr ? `تم نقل ${selectedLeadIds.length} عميل إلى مرحلة: ${stageNames[newStatus] || newStatus}` : `Updated status for ${selectedLeadIds.length} leads`, 'success');
  };

  const handleBulkTempChange = async (newTemp) => {
    if (!selectedLeadIds.length || !onUpdateLead) return;
    for (const id of selectedLeadIds) {
      const l = leads.find(x => x.id === id);
      if (l) {
        await onUpdateLead(id, { 
          temperature: newTemp,
          lastActivityAt: new Date().toISOString()
        }, l.version);
      }
    }
    const tempLabels = { hot: 'ساخن 🔥', warm: 'دافئ ⚡', cold: 'بارد ❄️' };
    triggerToast?.(isAr ? `تم ضبط حرارة ${selectedLeadIds.length} عميل إلى: ${tempLabels[newTemp] || newTemp}` : `Updated temperature for ${selectedLeadIds.length} leads`, 'success');
  };

  return (
    <div className="crm-table-container">
      {lostFor && (
        <LostReasonModal
          lead={lostFor}
          isAr={isAr}
          onCancel={() => setLostFor(null)}
          onConfirm={({ lostReason, lostNote }) => {
            onUpdateLead?.(lostFor.id, { 
              status: 'lost', 
              lostReason, 
              lostNote, 
              lostAt: new Date().toISOString(),
              lastActivityAt: new Date().toISOString()
            }, lostFor.version);
            triggerToast?.(isAr ? 'اتسجلت كصفقة خسرانة مع السبب' : 'Marked as lost', 'info');
            setLostFor(null);
          }}
        />
      )}
      {mergeGroup && (
        <MergeLeadsModal
          group={mergeGroup}
          isAr={isAr}
          canMerge={canMergeLeads && !!onMergeLeads}
          onCancel={() => setMergeGroup(null)}
          onMerge={async (keepId, otherIds) => { await onMergeLeads(keepId, otherIds); setMergeGroup(null); }}
        />
      )}
      {importOpen && (
        <DataImportModal
          entity="leads"
          existingLeads={leads}
          areas={getAreas()}
          onImport={(plan) => onImportLeads(plan.items.filter((x) => x.action === 'new').map((x) => x.lead))}
          onClose={() => setImportOpen(false)}
        />
      )}
      {/* Top Control Strip */}
      <div className="crm-modern-header-strip">
        <div className="crm-header-title-group">
          <h3 className="crm-header-main-title">
            <Users size={22} style={{ color: 'var(--crm-gold)' }} />
            <span>{isAr ? 'قاعدة بيانات العملاء الشاملة' : 'Customer 360° Database'}</span>
            <span className="crm-badge-360">360° CRM</span>
          </h3>
          <div className="crm-header-subtitle">
            <span>{isAr ? 'إجمالي العملاء:' : 'Total Leads:'} <strong className="crm-header-count-pill">{leads.length}</strong></span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>{isAr ? 'المطابق للفلتر:' : 'Filtered:'} <strong className="crm-header-count-pill">{filteredLeads.length}</strong></span>
          </div>
        </div>

        {/* Quick Add Lead & Export Actions */}
        <div className="crm-header-actions-group">
          {canEdit && (
            <button
              type="button"
              className="crm-btn-primary-gold"
              onClick={() => setShowAddLeadModal(true)}
            >
              <UserPlus size={16} />
              <span>{isAr ? 'إضافة عميل جديد' : 'Add New Lead'}</span>
            </button>
          )}
          {onImportLeads && (
            <button
              type="button"
              className="crm-btn-secondary-modern"
              onClick={() => setImportOpen(true)}
              title={isAr ? 'استيراد عملاء من Excel أو CSV أو JSON' : 'Import clients from a file'}
            >
              <Download size={15} style={{ transform: 'rotate(180deg)' }} />
              <span>{isAr ? 'استيراد' : 'Import'}</span>
            </button>
          )}
          {canExport && (
            <ExportMenu
              label={isAr ? `تصدير (${filteredLeads.length})` : `Export (${filteredLeads.length})`}
              disabled={filteredLeads.length === 0}
              onExport={(format) => handleExportCSV(filteredLeads, format)}
            />
          )}
        </div>
      </div>

      {/* 📊 Executive Pipeline KPI Mini-Strip */}
      <div className="crm-lead-kpi-strip">
        <div 
          className="crm-lead-kpi-card is-gold" 
          role="button" 
          tabIndex={0}
          onClick={() => setLeadFilter('all')}
          style={{ cursor: 'pointer' }}
          title={isAr ? 'عرض جميع العملاء' : 'View all leads'}
        >
          <div className="crm-lead-kpi-info">
            <span className="crm-lead-kpi-lbl">{isAr ? 'إجمالي العملاء' : 'Total Leads'}</span>
            <span className="crm-lead-kpi-val">{kpiStats.total}</span>
          </div>
          <div className="crm-lead-kpi-icon-wrap">
            <Users size={18} />
          </div>
        </div>

        <div 
          className="crm-lead-kpi-card is-hot"
          role="button"
          tabIndex={0}
          onClick={() => setTemperatureFilter('hot')}
          style={{ cursor: 'pointer' }}
          title={isAr ? 'تصفية العملاء الساخنين' : 'Filter hot leads'}
        >
          <div className="crm-lead-kpi-info">
            <span className="crm-lead-kpi-lbl">{isAr ? 'عملاء ساخنون 🔥' : 'Hot Deals'}</span>
            <span className="crm-lead-kpi-val" style={{ color: 'var(--crm-danger)' }}>{kpiStats.hot}</span>
          </div>
          <div className="crm-lead-kpi-icon-wrap">
            <Flame size={18} />
          </div>
        </div>

        <div 
          className="crm-lead-kpi-card is-due"
          role="button"
          tabIndex={0}
          onClick={() => setLeadFilter('due')}
          style={{ cursor: 'pointer' }}
          title={isAr ? 'متابعات اليوم والمتأخرة' : 'Due today'}
        >
          <div className="crm-lead-kpi-info">
            <span className="crm-lead-kpi-lbl">{isAr ? 'متابعة اليوم ⏰' : 'Due Follow-ups'}</span>
            <span className="crm-lead-kpi-val" style={{ color: 'var(--crm-warn)' }}>{kpiStats.due}</span>
          </div>
          <div className="crm-lead-kpi-icon-wrap">
            <Calendar size={18} />
          </div>
        </div>

        <div 
          className="crm-lead-kpi-card is-unanswered"
          role="button"
          tabIndex={0}
          onClick={() => setLeadFilter('unanswered')}
          style={{ cursor: 'pointer' }}
          title={isAr ? 'عملاء بانتظار أول رد' : 'Awaiting reply'}
        >
          <div className="crm-lead-kpi-info">
            <span className="crm-lead-kpi-lbl">{isAr ? 'مستني رد ⚡' : 'Awaiting Reply'}</span>
            <span className="crm-lead-kpi-val" style={{ color: 'var(--crm-info)' }}>{kpiStats.unanswered}</span>
          </div>
          <div className="crm-lead-kpi-icon-wrap">
            <AlertCircle size={18} />
          </div>
        </div>

        <div 
          className="crm-lead-kpi-card is-win"
          title={isAr ? `صفقات ناجحة (${kpiStats.won}) ونسبة إغلاق ${kpiStats.winRate}%` : `Win rate ${kpiStats.winRate}%`}
        >
          <div className="crm-lead-kpi-info">
            <span className="crm-lead-kpi-lbl">{isAr ? 'نسبة الإغلاق 🎯' : 'Win Rate'}</span>
            <span className="crm-lead-kpi-val" style={{ color: 'var(--crm-positive)' }}>{kpiStats.winRate}%</span>
          </div>
          <div className="crm-lead-kpi-icon-wrap">
            <Trophy size={18} />
          </div>
        </div>
      </div>

      {/* 🎯 UNIFIED TRIAGE & WORKFLOW SEGMENTS BAR */}
      <div className="crm-modern-triage-hub">
        {/* Tier 1: Primary Lifecycle & Workflow Stages */}
        <div className="crm-triage-scroll-strip">
          {/* الكل */}
          <button
            type="button"
            className={`crm-triage-tab-btn ${leadFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setLeadFilter('all')}
          >
            <Layers size={14} />
            <span>{isAr ? 'الكل' : 'All Leads'}</span>
            <span className="crm-triage-counter">{counts.all}</span>
          </button>

          {/* جديد ومستني رد */}
          <button
            type="button"
            className={`crm-triage-tab-btn ${leadFilter === 'unanswered' ? 'is-active' : ''} ${counts.unanswered > 0 ? 'is-danger-tab has-unread' : ''}`}
            onClick={() => setLeadFilter('unanswered')}
          >
            {counts.unanswered > 0 ? <span className="crm-pulse-dot" /> : <AlertCircle size={14} />}
            <span>{isAr ? 'مستني أول رد' : 'Awaiting Reply'}</span>
            <span className="crm-triage-counter">{counts.unanswered}</span>
          </button>

          {/* طلبات معاينة */}
          <button
            type="button"
            className={`crm-triage-tab-btn ${leadFilter === 'viewing_request' ? 'is-active' : ''}`}
            onClick={() => { setLeadFilter('viewing_request'); setLeadSort?.('visit_date'); }}
          >
            <Eye size={14} />
            <span>{isAr ? 'طلبات معاينة' : 'Viewing Requests'}</span>
            <span className="crm-triage-counter">
              {counts.viewings}{counts.viewingUnanswered > 0 ? ` (${counts.viewingUnanswered} ${isAr ? 'معلق' : 'pending'})` : ''}
            </span>
          </button>

          {/* متابعات اليوم والمتأخرة */}
          <button
            type="button"
            className={`crm-triage-tab-btn ${leadFilter === 'due' ? 'is-active' : ''} ${counts.overdue > 0 ? 'is-danger-tab' : ''}`}
            onClick={() => setLeadFilter('due')}
          >
            <Calendar size={14} />
            <span>{isAr ? 'متابعة اليوم' : 'Due Today'}</span>
            {counts.overdue > 0 ? (
              <span className="crm-triage-counter" style={{ background: 'var(--crm-danger)', color: 'var(--crm-on-dark)' }}>
                {counts.overdue} {isAr ? 'متأخر' : 'overdue'}
              </span>
            ) : (
              <span className="crm-triage-counter">{counts.awaiting || 0}</span>
            )}
          </button>

          {/* بدون مسؤول */}
          {counts.unassigned > 0 && (
            <button
              type="button"
              className={`crm-triage-tab-btn ${leadFilter === 'unassigned' ? 'is-active' : ''}`}
              onClick={() => setLeadFilter('unassigned')}
            >
              <User size={14} />
              <span>{isAr ? 'بدون مسؤول' : 'Unassigned'}</span>
              <span className="crm-triage-counter">{counts.unassigned}</span>
            </button>
          )}

          {/* طلبات شراء */}
          <button
            type="button"
            className={`crm-triage-tab-btn ${leadFilter === 'buyer' ? 'is-active' : ''}`}
            onClick={() => setLeadFilter('buyer')}
          >
            <ShoppingBag size={14} />
            <span>{isAr ? 'طلبات شراء' : 'Buyers'}</span>
            <span className="crm-triage-counter">{counts.buyers}</span>
          </button>

          {/* عروض بيع */}
          <button
            type="button"
            className={`crm-triage-tab-btn ${leadFilter === 'seller' ? 'is-active' : ''}`}
            onClick={() => setLeadFilter('seller')}
          >
            <Building size={14} />
            <span>{isAr ? 'عروض بيع' : 'Sellers'}</span>
            <span className="crm-triage-counter">{counts.sellers}</span>
          </button>

          {/* مستثمرون VIP */}
          <button
            type="button"
            className={`crm-triage-tab-btn ${leadFilter === 'investor' ? 'is-active' : ''}`}
            onClick={() => setLeadFilter('investor')}
          >
            <Sparkles size={14} style={{ color: 'var(--crm-gold)' }} />
            <span>{isAr ? 'مستثمرون VIP' : 'Investors'}</span>
          </button>

          {/* Dropdown for More Stages */}
          <div className="crm-triage-dropdown-wrap" ref={moreFiltersRef}>
            <button
              type="button"
              className={`crm-triage-tab-btn ${isMoreFilterActive ? 'is-active' : ''}`}
              onClick={() => setShowMoreFilters(v => !v)}
              aria-expanded={showMoreFilters}
              title={isAr ? 'عرض المزيد من حالات وتصنيفات العملاء' : 'More stages'}
            >
              <span>{getMoreFilterLabel()}</span>
              <ChevronDown size={13} style={{ transform: showMoreFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showMoreFilters && (
              <div className="crm-triage-dropdown-menu">
                <button
                  type="button"
                  className={`crm-triage-dropdown-item ${leadFilter === 'qualified' ? 'is-active' : ''}`}
                  onClick={() => { setLeadFilter('qualified'); setShowMoreFilters(false); }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={14} />
                    <span>{isAr ? 'مؤهلون للشراء' : 'Qualified'}</span>
                  </span>
                  {leadFilter === 'qualified' && <Check size={14} />}
                </button>

                <button
                  type="button"
                  className={`crm-triage-dropdown-item ${leadFilter === 'account' ? 'is-active' : ''}`}
                  onClick={() => { setLeadFilter('account'); setShowMoreFilters(false); }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={14} />
                    <span>{isAr ? 'حسابات جديدة' : 'Accounts'}</span>
                  </span>
                  <span className="crm-triage-counter">{counts.accounts}</span>
                </button>

                {counts.stale > 0 && (
                  <button
                    type="button"
                    className={`crm-triage-dropdown-item ${leadFilter === 'stale' ? 'is-active' : ''}`}
                    onClick={() => { setLeadFilter('stale'); setShowMoreFilters(false); }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={14} />
                      <span>{isAr ? 'عملاء راكدين' : 'Stale'}</span>
                    </span>
                    <span className="crm-triage-counter">{counts.stale}</span>
                  </button>
                )}

                {counts.dupes > 0 && (
                  <button
                    type="button"
                    className={`crm-triage-dropdown-item ${leadFilter === 'dupes' ? 'is-active' : ''}`}
                    onClick={() => { setLeadFilter('dupes'); setShowMoreFilters(false); }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={14} />
                      <span>{isAr ? 'مكرر بالهاتف' : 'Duplicates'}</span>
                    </span>
                    <span className="crm-triage-counter" style={{ color: 'var(--crm-warn)' }}>{counts.dupes}</span>
                  </button>
                )}

                <button
                  type="button"
                  className={`crm-triage-dropdown-item ${leadFilter === 'archived' ? 'is-active' : ''}`}
                  onClick={() => { setLeadFilter('archived'); setShowMoreFilters(false); }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Inbox size={14} />
                    <span>{isAr ? 'المؤرشفون' : 'Archived'}</span>
                  </span>
                  <span className="crm-triage-counter">{counts.archived}</span>
                </button>

                <button
                  type="button"
                  className={`crm-triage-dropdown-item ${leadFilter === 'lost' ? 'is-active' : ''}`}
                  onClick={() => { setLeadFilter('lost'); setShowMoreFilters(false); }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <X size={14} />
                    <span>{isAr ? 'صفقات خسرانة' : 'Closed Lost'}</span>
                  </span>
                  <span className="crm-triage-counter">{counts.lost}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tier 2: Search, Pill Filters, Column Picker & Reset */}
        <div className="crm-modern-filter-toolbar">
          {/* Text Search Pill */}
          <div className="crm-search-pill-wrapper">
            <span className="crm-search-icon-prefix">
              <Search size={14} />
            </span>
            <input 
              type="text" 
              placeholder={isAr ? 'بحث بالاسم، الهاتف، الوسم، الاغتراب...' : 'Search name, phone, tag...'} 
              className="crm-search-pill-input" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runServerSearch(); }}
            />
            {searchQuery && (
              <button
                type="button"
                className="crm-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title={isAr ? 'مسح البحث' : 'Clear search'}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Server Search Button when >= 2 characters */}
          {searchQuery.trim().length >= 2 && (
            <button
              type="button"
              className="crm-server-search-pill-btn"
              onClick={runServerSearch}
              disabled={serverSearching}
              title={isAr ? 'يدوّر في كل العملاء على السيرفر، مش بس اللي ظاهرين' : 'Searches every client on the server'}
            >
              <Search size={13} />
              <span>{serverSearching ? (isAr ? 'جاري البحث…' : 'Searching…') : (isAr ? 'بحث بالسيرفر' : 'Server Search')}</span>
            </button>
          )}

          {/* Temperature Filter */}
          <select
            value={temperatureFilter}
            aria-label={isAr ? 'تصفية حسب درجة الاهتمام' : 'Filter by temperature'}
            onChange={(e) => setTemperatureFilter(e.target.value)}
            className="crm-select-custom-pill"
          >
            <option value="all">🌡️ {isAr ? 'كل درجات الاهتمام' : 'All Temperatures'}</option>
            <option value="hot">🔥 {isAr ? 'ساخن جداً' : 'Hot'}</option>
            <option value="warm">⚡ {isAr ? 'دافئ' : 'Warm'}</option>
            <option value="cold">❄️ {isAr ? 'بارد' : 'Cold'}</option>
            <option value="unknown">{isAr ? 'غير محدد' : 'Not set'}</option>
          </select>

          {/* Source Filter */}
          {setSourceFilter && (
            <select
              value={sourceFilter}
              aria-label={isAr ? 'تصفية حسب المصدر' : 'Filter by source'}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="crm-select-custom-pill"
            >
              <option value="all">🔗 {isAr ? 'كل المصادر' : 'All sources'}</option>
              {LEAD_SOURCES.map((s) => <option key={s.id} value={s.id}>{isAr ? s.ar : s.en}</option>)}
            </select>
          )}

          {/* Date Filter */}
          {setDateFilter && (
            <select
              value={dateFilter}
              aria-label={isAr ? 'تصفية حسب تاريخ الإضافة' : 'Filter by date added'}
              onChange={(e) => setDateFilter(e.target.value)}
              className="crm-select-custom-pill"
            >
              <option value="all">📅 {isAr ? 'كل الفترات' : 'Any time'}</option>
              <option value="today">{isAr ? 'النهارده' : 'Today'}</option>
              <option value="7d">{isAr ? 'آخر 7 أيام' : 'Last 7 days'}</option>
              <option value="30d">{isAr ? 'آخر 30 يوم' : 'Last 30 days'}</option>
              <option value="month">{isAr ? 'الشهر ده' : 'This month'}</option>
            </select>
          )}

          {/* Sort Filter */}
          {setLeadSort && (
            <select
              value={leadSort}
              aria-label={isAr ? 'ترتيب العملاء' : 'Sort leads'}
              onChange={(e) => setLeadSort(e.target.value)}
              className="crm-select-custom-pill"
            >
              {LEAD_SORTS.map((o) => <option key={o.id} value={o.id}>↕ {isAr ? o.ar : o.en}</option>)}
            </select>
          )}

          {/* Area Filter */}
          <select
            value={areaFilter}
            aria-label={isAr ? 'تصفية حسب المنطقة' : 'Filter by area'}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="crm-select-custom-pill"
          >
            <option value="all">📍 {isAr ? 'كل مناطق سوهاج' : 'All Areas'}</option>
            {SOHAG_AREAS.filter(a => a.id !== 'all').map(a => (
              <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name_en}</option>
            ))}
          </select>

          {/* Reset Filters Button */}
          {(leadFilter !== 'all' || temperatureFilter !== 'all' || (sourceFilter && sourceFilter !== 'all') || (dateFilter && dateFilter !== 'all') || (areaFilter && areaFilter !== 'all') || searchQuery) && (
            <button
              type="button"
              className="crm-filter-reset-pill-btn"
              onClick={() => {
                setLeadFilter('all');
                setTemperatureFilter('all');
                setSourceFilter?.('all');
                setDateFilter?.('all');
                setAreaFilter?.('all');
                setSearchQuery?.('');
              }}
              title={isAr ? 'إعادة ضبط كل الفلاتر' : 'Reset all filters'}
            >
              <RotateCcw size={12} />
              <span>{isAr ? 'تصفير الفلاتر' : 'Reset'}</span>
            </button>
          )}

          {/* Column Customization Toggle */}
          <div ref={columnPickerRef} style={{ position: 'relative', marginInlineStart: 'auto' }}>
            <button
              type="button"
              className="crm-btn-secondary-modern"
              onClick={() => setShowColumnPicker((v) => !v)}
              aria-expanded={showColumnPicker}
              title={isAr ? 'تخصيص وإخفاء أعمدة الجدول' : 'Customize table columns'}
            >
              <SlidersHorizontal size={13} />
              <span>{isAr ? 'الأعمدة' : 'Columns'}</span>
              {Object.values(visibleColumns).filter(Boolean).length < 5 && (
                <span style={{
                  background: 'var(--crm-accent)',
                  color: 'var(--crm-on-accent)',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: 'var(--crm-text-xs)',
                  fontWeight: 700
                }}>
                  {Object.values(visibleColumns).filter(Boolean).length}/5
                </span>
              )}
            </button>

            {showColumnPicker && (
              <div className="crm-col-picker-modern-popover">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--crm-line)' }}>
                  <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 700, color: 'var(--crm-ink)' }}>
                    {isAr ? 'الأعمدة المعروضة' : 'Visible Columns'}
                  </span>
                  <button
                    type="button"
                    onClick={resetColumns}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--crm-accent-text)',
                      fontSize: 'var(--crm-text-xs)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 4px'
                    }}
                  >
                    {isAr ? 'إظهار الكل' : 'Show All'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[
                    { key: 'requirements', ar: 'المواصفات والميزانية', en: 'Requirements & Budget' },
                    { key: 'score', ar: 'الجدية والحرارة', en: 'Score & Temp' },
                    { key: 'status', ar: 'الحالة والمرحلة', en: 'Status' },
                    { key: 'nextAction', ar: 'المتابعة القادمة', en: 'Next Action' },
                    { key: 'agent', ar: 'المسؤول', en: 'Assigned Agent' },
                  ].map((col) => (
                    <label
                      key={col.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: 'var(--crm-text-sm)',
                        color: 'var(--crm-ink)',
                        userSelect: 'none',
                        background: visibleColumns[col.key] ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
                      }}
                      className="crm-col-toggle-label"
                    >
                      <input
                        type="checkbox"
                        checked={!!visibleColumns[col.key]}
                        onChange={() => toggleColumn(col.key)}
                        style={{ cursor: 'pointer', accentColor: 'var(--crm-accent)' }}
                      />
                      <span>{isAr ? col.ar : col.en}</span>
                    </label>
                  ))}
                </div>

                <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--crm-line)', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', textAlign: 'center' }}>
                  {isAr ? '🔒 عمود العميل والإجراءات ثابتان دائماً' : '🔒 Name & Actions are always pinned'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ⚡ BULK ACTIONS FLOATING TOOLBAR */}
      {selectedLeadIds.length > 0 && (
        <div className="crm-bulk-floating-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'var(--crm-gold)',
              color: 'var(--crm-card)',
              padding: '2px 9px',
              borderRadius: '999px',
              fontWeight: 800,
              fontSize: 'var(--crm-text-xs)'
            }}>
              {selectedLeadIds.length}
            </span>
            <span style={{ fontWeight: 600, fontSize: 'var(--crm-text-sm)' }}>
              {isAr ? 'عميل محدد في الجدول' : 'leads selected'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Bulk Assign Agent Dropdown */}
            {canEdit && (
              <select
                aria-label={isAr ? 'تعيين مسؤول للعملاء المحددين' : 'Assign selected leads'}
                onChange={(e) => {
                  if (e.target.value) handleBulkAssign(e.target.value);
                }}
                className="crm-select-custom-pill"
                style={{ height: '32px', fontSize: 'var(--crm-text-xs)' }}
                defaultValue=""
              >
                <option value="" disabled>👥 {isAr ? 'تعيين مسؤول جماعي...' : 'Assign Agent...'}</option>
                <DeskOptions role={activeRole} lang={lang} />
              </select>
            )}

            {/* Bulk Stage Progression */}
            {canEdit && (
              <select
                aria-label={isAr ? 'تغيير مرحلة العملاء المحددين' : 'Bulk stage change'}
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkStatusChange(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="crm-select-custom-pill"
                style={{ height: '32px', fontSize: 'var(--crm-text-xs)' }}
                defaultValue=""
              >
                <option value="" disabled>🏷️ {isAr ? 'نقل المرحلة جماعياً...' : 'Change Stage...'}</option>
                <option value="new">{isAr ? 'طلب جديد' : 'New'}</option>
                <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                <option value="site_visit">{isAr ? 'معاينة مجدولة' : 'Site Visit'}</option>
                <option value="negotiating">{isAr ? 'قيد التفاوض' : 'Negotiating'}</option>
                <option value="closing">{isAr ? 'توقيع وحجز' : 'Closing'}</option>
                <option value="closed">{isAr ? 'صفقة ناجحة' : 'Closed Won'}</option>
              </select>
            )}

            {/* Bulk Temperature */}
            {canEdit && (
              <select
                aria-label={isAr ? 'تحديد حرارة العملاء المحددين' : 'Bulk temperature'}
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkTempChange(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="crm-select-custom-pill"
                style={{ height: '32px', fontSize: 'var(--crm-text-xs)' }}
                defaultValue=""
              >
                <option value="" disabled>🌡️ {isAr ? 'درجة الاهتمام...' : 'Set Temp...'}</option>
                <option value="hot">🔥 {isAr ? 'ساخن جداً' : 'Hot'}</option>
                <option value="warm">⚡ {isAr ? 'دافئ' : 'Warm'}</option>
                <option value="cold">❄️ {isAr ? 'بارد' : 'Cold'}</option>
              </select>
            )}

            {/* Bulk Export */}
            <button
              type="button"
              className="crm-bulk-pill-btn is-primary"
              onClick={handleBulkExportSelected}
            >
              <Download size={13} />
              <span>{isAr ? 'تصدير المحدد (CSV)' : 'Export CSV'}</span>
            </button>

            {/* Bulk Delete (Super Admin Only) */}
            {isSuperAdmin && (
              <button
                type="button"
                className="crm-bulk-pill-btn is-danger"
                onClick={handleBulkDelete}
              >
                <Trash2 size={13} />
                <span>{isAr ? 'حذف المحدد' : 'Delete'}</span>
              </button>
            )}

            {/* Clear Selection */}
            <button
              type="button"
              className="crm-bulk-pill-btn is-ghost"
              onClick={() => setSelectedLeadIds([])}
            >
              ✕ {isAr ? 'إلغاء التحديد' : 'Clear'}
            </button>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <p className="crm-kbd-hint" aria-hidden="true">
        {isAr ? 'اختصارات: J / K للتنقل · Enter للمعاينة · W واتساب · S الحالة' : 'Shortcuts: J / K move · Enter open · W WhatsApp · S status'}
      </p>
      <div className="crm-table-scroll-wrapper">
        <table className="crm-table" data-kbd="leads">
        <thead>
          <tr>
            <th style={{ width: '36px', textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={selectedLeadIds.length > 0 && selectedLeadIds.length === filteredLeads.length}
                aria-label={isAr ? 'تحديد كل العملاء الظاهرين' : 'Select all visible leads'}
                onChange={() => handleToggleSelectAll(filteredLeads)}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th>{isAr ? 'العميل والملف الشخصي' : 'Client Profile'}</th>
            {visibleColumns.requirements && <th>{isAr ? 'المواصفات والميزانية' : 'Requirements'}</th>}
            {leadFilter === 'viewing_request' && <th style={{ minWidth: '150px' }}>{isAr ? 'الميعاد المطلوب' : 'Requested Schedule'}</th>}
            {visibleColumns.score && <th>{isAr ? 'الجدية والحرارة' : 'Score & Temp'}</th>}
            {visibleColumns.status && <th>{isAr ? 'الحالة' : 'Status'}</th>}
            {visibleColumns.nextAction && <th>{isAr ? 'المتابعة القادمة' : 'Next Action'}</th>}
            {visibleColumns.agent && <th>{isAr ? 'المسؤول' : 'Agent'}</th>}
            <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {serverSearching ? (
            <>
              {[1, 2, 3, 4].map((idx) => (
                <tr key={`skeleton-${idx}`} className="crm-skeleton-row">
                  <td style={{ textAlign: 'center' }}>
                    <div className="crm-skeleton-line" style={{ width: '18px', height: '18px', borderRadius: '4px' }} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="crm-skeleton-avatar" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="crm-skeleton-line" style={{ width: '120px', height: '14px' }} />
                        <div className="crm-skeleton-line" style={{ width: '80px', height: '11px' }} />
                      </div>
                    </div>
                  </td>
                  {visibleColumns.requirements && <td><div className="crm-skeleton-line" style={{ width: '100px', height: '14px' }} /></td>}
                  {leadFilter === 'viewing_request' && <td><div className="crm-skeleton-line" style={{ width: '90px', height: '14px' }} /></td>}
                  {visibleColumns.score && <td><div className="crm-skeleton-pill" style={{ width: '60px' }} /></td>}
                  {visibleColumns.status && <td><div className="crm-skeleton-pill" style={{ width: '70px' }} /></td>}
                  {visibleColumns.nextAction && <td><div className="crm-skeleton-line" style={{ width: '90px', height: '13px' }} /></td>}
                  {visibleColumns.agent && <td><div className="crm-skeleton-line" style={{ width: '80px', height: '13px' }} /></td>}
                  <td><div className="crm-skeleton-line" style={{ width: '70px', height: '24px' }} /></td>
                </tr>
              ))}
            </>
          ) : filteredLeads.length === 0 ? (
            <tr>
              <td colSpan={totalVisibleCols} style={{ padding: 0 }}>
                <div className="crm-empty-state-card">
                  <div className="crm-empty-state-icon-wrap">
                    <Inbox size={36} />
                  </div>
                  <h4 className="crm-empty-state-title">
                    {isAr ? 'لم يتم العثور على أي عملاء مطابقين' : 'No matching leads found'}
                  </h4>
                  <p className="crm-empty-state-desc">
                    {searchQuery || leadFilter !== 'all' || temperatureFilter !== 'all'
                      ? (isAr ? 'جرّب تعديل معايير البحث أو تصفير الفلاتر للوصول لجميع العملاء المسجلين.' : 'Try adjusting your search query or reset active filters.')
                      : (isAr ? 'لا توجد بيانات مسجلة في هذا القسم حتى الآن. يمكنك بدء تسجيل عميلك الأول.' : 'No data recorded yet. Start by adding your first lead.')}
                  </p>
                  <div className="crm-empty-state-actions">
                    {(searchQuery || leadFilter !== 'all' || temperatureFilter !== 'all' || (sourceFilter && sourceFilter !== 'all') || (areaFilter && areaFilter !== 'all')) && (
                      <button
                        type="button"
                        className="crm-btn-secondary-modern"
                        onClick={() => {
                          setLeadFilter('all');
                          setTemperatureFilter('all');
                          setSourceFilter?.('all');
                          setDateFilter?.('all');
                          setAreaFilter?.('all');
                          setSearchQuery?.('');
                        }}
                      >
                        <RotateCcw size={13} />
                        <span>{isAr ? 'إعادة ضبط كل الفلاتر' : 'Reset All Filters'}</span>
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        className="crm-btn-primary-gold"
                        onClick={() => setShowAddLeadModal(true)}
                      >
                        <UserPlus size={14} />
                        <span>{isAr ? 'إضافة عميل جديد' : 'Add New Lead'}</span>
                      </button>
                    )}
                                       <div className="crm-client-identity-meta">
                        <div className="crm-client-identity-row">
                          <button
                            type="button"
                            className="crm-client-name-link"
                            onClick={() => setQuickDrawerLead(l)}
                            title={isAr ? 'فتح المعاينة السريعة وتسجيل المكالمة' : 'Open Quick Drawer'}
                          >
                            {renderHighlighted(l.name?.trim(), searchQuery) || <span className="crm-empty-value">{isAr ? 'عميل بدون اسم' : 'Unnamed lead'}</span>}
                          </button>
                          {l.cityOrExpat && l.cityOrExpat !== 'سوهاج' && (
                            <span className="crm-client-expat-pill">
                              ✈️ {l.cityOrExpat}
                            </span>
                          )}
                        </div>

                        <div className="crm-client-identity-row">
                          <span className="crm-phone-mono-pill">
                            <bdi dir="ltr">{renderHighlighted(formatPhoneNumber(l.phone || l.whatsapp), searchQuery) || '—'}</bdi>
                          </span>
                          {(l.phone || l.whatsapp) && (
                            <button
                              type="button"
                              className="crm-phone-copy-btn"
                              title={isAr ? 'نسخ رقم الهاتف' : 'Copy phone'}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard?.writeText(l.phone || l.whatsapp);
                                triggerToast?.(isAr ? 'تم نسخ الرقم بنجاح' : 'Phone copied', 'success');
                              }}
                            >
                              <Copy size={11} />
                            </button>
                          )}
                        </div>

                        <div className="crm-lead-meta">
                          <span className="crm-lead-chip">{sourceLabel(l)}</span>
                          {waited > 0 && (
                            <span
                              className={`crm-lead-chip ${waited > RESPONSE_SLA_MS ? 'is-late' : 'is-waiting'}`}
                              title={isAr ? 'وقت من غير أول رد' : 'Time without a first reply'}
                            >
                              ⏱ {isAr ? `بدون رد ${fmtWait(waited)}` : `No reply ${fmtWait(waited)}`}
                            </span>
                          )}
                          {dupCount > 0 && (
                            <button type="button" className="crm-lead-chip is-dupe" onClick={(e) => { e.stopPropagation(); openMerge(l); }} title={isAr ? 'نفس الرقم مسجل في عميل تاني' : 'Same phone on another lead'}>
                              ⧉ {isAr ? `مكرر (${dupCount + 1})` : `Duplicate (${dupCount + 1})`}
                            </button>
                          )}
                          {l.status === 'lost' && l.lostReason && (
                            <span className="crm-lead-chip is-lost" title={l.lostNote || ''}>
                              ✕ {(() => { const r = LOST_REASONS.find((x) => x.id === l.lostReason); return r ? (isAr ? r.ar : r.en) : l.lostReason; })()}
                            </span>
                          )}
                        </div>

                        {/* Tags Display */}
                        {l.tags && l.tags.length > 0 && (
                          <div className="crm-client-tags-wrap">
                            {l.tags.slice(0, 2).map((t, i) => (
                              <span key={i} className="crm-client-tag-pill">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Requirements */}
                  {visibleColumns.requirements && (
                    <td data-label={isAr ? 'المواصفات' : 'Requirements'}>
                      <div style={{ fontSize: 'var(--crm-text-sm)', maxWidth: '280px', whiteSpace: 'normal' }}>
                        {l.details?.budget && (
                          <strong style={{ color: 'var(--crm-positive)', display: 'block', marginBottom: '2px' }}>
                            <bdi>{formatBudget(l.details.budget, isAr)}</bdi>
                          </strong>
                        )}
                        <span style={{ color: 'var(--crm-muted)' }}>
                          {getLocalizedPropertyType(l.propertyType || l.details?.propertyType || l.type)} • {getLocalizedArea(l.area || l.details?.area || l.details?.district || 'east')}
                        </span>
                        {leadFilter !== 'viewing_request' && isViewingLead(l) && (
                          <div style={{ marginTop: '5px' }}>
                            {renderVisitBadge(l)}
                          </div>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Requested Schedule Column (for viewing_request) */}
                  {leadFilter === 'viewing_request' && (
                    <td data-label={isAr ? 'الميعاد المطلوب' : 'Schedule'}>
                      {renderVisitBadge(l)}
                    </td>
                  )}

                  {/* Score & Temperature */}
                  {visibleColumns.score && (
                    <td data-label={isAr ? 'الجدية والحرارة' : 'Score & Temp'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LeadScorePill lead={l} isAr={isAr} />
                        <div
                          className={`crm-temp-badge-interactive is-${temp || 'unset'}`}
                          onClick={(e) => cycleTemperature(l, e)}
                          title={isAr ? 'انقر للتبديل السريع لدرجة الاهتمام (ساخن 🔥 / دافئ ⚡ / بارد ❄️)' : 'Click to cycle temperature'}
                        >
                          {temp === 'hot' && <>🔥 {isAr ? 'ساخن' : 'Hot'}</>}
                          {temp === 'warm' && <>⚡ {isAr ? 'دافئ' : 'Warm'}</>}
                          {temp === 'cold' && <>❄️ {isAr ? 'بارد' : 'Cold'}</>}
                          {!['hot', 'warm', 'cold'].includes(temp) && <>⚪ {isAr ? 'غير محدد' : 'Unset'}</>}
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Status */}
                  {visibleColumns.status && (
                    <td data-label={isAr ? 'الحالة' : 'Status'}>
                      <div className={`crm-status-select-wrap status-pill-${l.status || 'new'}`}>
                        <span className="crm-status-dot" />
                        <select 
                          disabled={!canEdit}
                          value={l.status || 'new'} 
                          aria-label={isAr ? `حالة ${l.name || 'العميل'}` : `Status of ${l.name || 'lead'}`}
                          data-status={l.status || 'new'}
                          onChange={(e) => {
                            const prevStatus = l.status || 'new';
                            const nextStatus = e.target.value;
                            if (nextStatus === 'lost') { setLostFor(l); return; }
                            if (onUpdateLead) {
                              onUpdateLead(l.id, { 
                                status: nextStatus, 
                                ...(l.status === 'lost' ? { lostReason: null, lostNote: null, lostAt: null } : {}),
                                statusUpdatedAt: new Date().toISOString(),
                                lastActivityAt: new Date().toISOString()
                              }, l.version);
                              const stageNames = {
                                new: isAr ? 'طلب جديد' : 'New',
                                contacted: isAr ? 'تم التواصل' : 'Contacted',
                                site_visit: isAr ? 'معاينة مجدولة' : 'Site Visit',
                                negotiating: isAr ? 'قيد التفاوض' : 'Negotiating',
                                closing: isAr ? 'توقيع وحجز' : 'Closing',
                                closed: isAr ? 'صفقة ناجحة' : 'Closed Won',
                                lost: isAr ? 'صفقة خسرانة' : 'Closed Lost'
                              };
                              triggerToast?.(
                                isAr ? `تم تغيير مرحلة (${l.name || 'العميل'}) إلى: ${stageNames[nextStatus] || nextStatus}` : `Status changed to ${stageNames[nextStatus] || nextStatus}`,
                                'info',
                                {
                                  onUndo: () => {
                                    onUpdateLead(l.id, { status: prevStatus, lastActivityAt: new Date().toISOString() });
                                  },
                                  undoLabel: isAr ? 'تراجع' : 'Undo',
                                  duration: 6000
                                }
                              );
                            }
                          }}
                          className="crm-status-select"
                          title={isAr ? 'تغيير مرحلة العميل' : 'Change Status'}
                        >
                          <option value="new">{isAr ? 'طلب جديد' : 'New'}</option>
                          <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                          <option value="site_visit">{isAr ? 'معاينة مجدولة' : 'Site Visit'}</option>
                          <option value="negotiating">{isAr ? 'قيد التفاوض' : 'Negotiating'}</option>
                          <option value="closing" disabled={!canCloseDeals && l.status !== 'closing'}>{isAr ? 'توقيع وحجز' : 'Closing'}</option>
                          <option value="closed" disabled={!canCloseDeals && l.status !== 'closed'}>{isAr ? 'صفقة ناجحة' : 'Closed Won'}</option>
                          <option value="lost">{isAr ? 'صفقة خسرانة' : 'Closed Lost'}</option>
                        </select>
                      </div>
                    </td>
                  )}

                  {/* Next Action / Follow-up */}
                  {visibleColumns.nextAction && (
                    <td data-label={isAr ? 'المتابعة القادمة' : 'Next Action'}>
                      <div 
                        className="crm-next-action-cell"
                        onClick={() => setQuickDrawerLead(l)}
                        title={isAr ? 'انقر لتحديث المتابعة والمعاينة السريعة' : 'Click to update next action'}
                      >
                        {l.nextActionNote || l.followUp ? (
                          <div className="crm-next-action-pill">
                            <Clock size={12} className="crm-next-action-icon" />
                            <span className="crm-next-action-text" title={formatFollowUp(l.nextActionNote || l.followUp, isAr)}>{formatFollowUp(l.nextActionNote || l.followUp, isAr)}</span>
                          </div>
                        ) : (
                          <span className="crm-next-action-empty">
                            <Plus size={11} /> {isAr ? 'جدولة متابعة' : 'Add action'}
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Agent */}
                  {visibleColumns.agent && (
                    <td data-label={isAr ? 'المسؤول' : 'Agent'}>
                      <div className="crm-agent-select-wrap">
                        <div className="crm-agent-avatar-sm">
                          {l.assignedTo && l.assignedTo !== 'Unassigned' ? l.assignedTo.charAt(0) : '—'}
                        </div>
                        <select 
                          disabled={!canEdit}
                          value={l.assignedTo || 'Unassigned'} 
                          aria-label={isAr ? `المسؤول عن ${l.name || 'العميل'}` : `Owner of ${l.name || 'lead'}`}
                          onChange={(e) => {
                            const prevAgent = l.assignedTo || 'Unassigned';
                            const newAgent = e.target.value;
                            if (onUpdateLead) {
                              onUpdateLead(l.id, { 
                                assignedTo: newAgent,
                                assignedAt: new Date().toISOString(),
                                lastActivityAt: new Date().toISOString()
                              }, l.version);
                              triggerToast?.(
                                isAr ? `تم تعيين (${l.name || 'العميل'}) للمسؤول: ${newAgent}` : `Assigned ${l.name || 'lead'} to ${newAgent}`,
                                'success',
                                {
                                  onUndo: () => {
                                    onUpdateLead(l.id, { assignedTo: prevAgent, lastActivityAt: new Date().toISOString() });
                                  },
                                  undoLabel: isAr ? 'تراجع' : 'Undo',
                                  duration: 6000
                                }
                              );
                            }
                          }}
                          className="crm-agent-select"
                          title={isAr ? 'تعيين مسؤول المبيعات' : 'Assign Agent'}
                        >
                          <DeskOptions role={activeRole} current={l.assignedTo || 'Unassigned'} lang={lang} />
                        </select>
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  <td data-label={isAr ? 'الإجراءات' : 'Actions'}>
                    <LeadTableRowActions
                      lead={l}
                      isAr={isAr}
                      canEdit={canEdit}
                      isSuperAdmin={isSuperAdmin}
                      onQuickDrawer={setQuickDrawerLead}
                      onWhatsAppClick={onWhatsAppClick}
                      onViewingProfileLead={setViewingProfileLead}
                      onOpenEditLead={handleOpenEditLead}
                      onDispatchLeadClick={onDispatchLeadClick}
                      onConvertToProperty={onConvertToProperty}
                      canClaimLead={canClaimLead}
                      handleClaimLead={handleClaimLead}
                      onUpdateLead={onUpdateLead}
                      triggerToast={triggerToast}
                      handleDeleteLeadClick={handleDeleteLeadClick}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {leadsHasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
          <button type="button" className="crm-btn-secondary-modern" onClick={loadMoreLeads} style={{ gap: '8px', padding: '8px 20px' }}>
            <RotateCcw size={14} />
            <span>{isAr ? `عرض عملاء أقدم (المعروض الآن أحدث ${leads.length})` : `Load older clients (showing newest ${leads.length})`}</span>
          </button>
        </div>
      )}
    </div>
    </div>

  );
}
