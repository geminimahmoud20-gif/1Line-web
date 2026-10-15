import {
  Download, Trash2, Clock, Plus, UserPlus, SlidersHorizontal, Search, X, RotateCcw, ChevronDown,
  Copy, Upload, Columns3, Timer, CopyPlus, Plane, Ban, CalendarClock
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
import LeadTableRowActions from './LeadTableRowActions';
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';
import { leadScore, LEAD_SCORE_HIGH } from '../../utils/crmLeadViews';
import { PageHeader, Button, Chip, Select, Badge, Avatar, EmptyState } from '../ui';
import { cx } from '../ui/cx';
import './leads-tab.css';
const MORE_FILTER_KEYS = ['qualified', 'account', 'stale', 'dupes', 'archived', 'lost'];

const COLUMN_OPTIONS = [
  { key: 'requirements', ar: 'المواصفات والميزانية', en: 'Requirements & budget' },
  { key: 'score', ar: 'الجدية والحرارة', en: 'Score & temperature' },
  { key: 'status', ar: 'المرحلة', en: 'Stage' },
  { key: 'nextAction', ar: 'المتابعة الجاية', en: 'Next action' },
  { key: 'agent', ar: 'المسؤول', en: 'Owner' }
];

const STAGE_OPTIONS = [
  { value: 'new', ar: 'جديد', en: 'New' },
  { value: 'contacted', ar: 'اتصلنا', en: 'Contacted' },
  { value: 'site_visit', ar: 'معاينة', en: 'Viewing' },
  { value: 'negotiating', ar: 'تفاوض', en: 'Negotiating' },
  { value: 'closing', ar: 'توقيع وحجز', en: 'Closing' },
  { value: 'closed', ar: 'صفقة ناجحة', en: 'Closed won' },
  { value: 'lost', ar: 'خسرانة', en: 'Lost' }
];

const TEMPERATURES = {
  hot: { ar: 'ساخن', en: 'Hot', tone: 'danger' },
  warm: { ar: 'دافئ', en: 'Warm', tone: 'warning' },
  cold: { ar: 'بارد', en: 'Cold', tone: 'info' }
};

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

    const when = `${vd}${vs ? ` · ${vs}` : ''}`;
    const icon = <CalendarClock size={12} aria-hidden="true" />;
    if (isToday) return <Badge tone="danger" icon={icon}>{isAr ? `النهارده · ${when}` : `Today · ${when}`}</Badge>;
    if (isTomorrow) return <Badge tone="warning" icon={icon}>{isAr ? `بكرة · ${when}` : `Tomorrow · ${when}`}</Badge>;
    if (isPast) return <Badge icon={icon}>{isAr ? `فات · ${when}` : `Past · ${when}`}</Badge>;
    return <Badge tone="accent" icon={icon}>{when}</Badge>;
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

  const hasActiveFilters = leadFilter !== 'all' || temperatureFilter !== 'all' || (sourceFilter && sourceFilter !== 'all') || (dateFilter && dateFilter !== 'all') || (areaFilter && areaFilter !== 'all') || Boolean(searchQuery);
  // Dropdown filters set (the views row and search show their own state)
  const activeFilterCount = [temperatureFilter !== 'all', sourceFilter && sourceFilter !== 'all', dateFilter && dateFilter !== 'all', areaFilter && areaFilter !== 'all'].filter(Boolean).length;
  const resetFilters = () => {
    setLeadFilter('all');
    setTemperatureFilter('all');
    setSourceFilter?.('all');
    setDateFilter?.('all');
    setAreaFilter?.('all');
    setSearchQuery?.('');
  };
  const [showFilters, setShowFilters] = useState(false);

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
    const tempLabels = { hot: isAr ? 'ساخن' : 'Hot', warm: isAr ? 'دافئ' : 'Warm', cold: isAr ? 'بارد' : 'Cold', '': isAr ? 'مش محددة' : 'Not set' };
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
    const tempLabels = { hot: 'ساخن', warm: 'دافئ', cold: 'بارد' };
    triggerToast?.(isAr ? `تم ضبط حرارة ${selectedLeadIds.length} عميل إلى: ${tempLabels[newTemp] || newTemp}` : `Updated temperature for ${selectedLeadIds.length} leads`, 'success');
  };

  return (
    <div className="crm-table-container crm-leads">
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
      <PageHeader
        title={isAr ? 'العملاء' : 'Clients'}
        description={isAr
          ? `${leads.length} عميل · ${filteredLeads.length} ظاهرين بالفلتر الحالي · نسبة الإغلاق ${kpiStats.winRate}%`
          : `${leads.length} clients · ${filteredLeads.length} shown · win rate ${kpiStats.winRate}%`}
        actions={(
          <>
            {canEdit && (
              <Button icon={<UserPlus size={16} aria-hidden="true" />} onClick={() => setShowAddLeadModal(true)}>
                {isAr ? 'عميل جديد' : 'New client'}
              </Button>
            )}
            {onImportLeads && (
              <Button variant="secondary" icon={<Upload size={16} aria-hidden="true" />} onClick={() => setImportOpen(true)}>
                {isAr ? 'استيراد' : 'Import'}
              </Button>
            )}
            {canExport && (
              <ExportMenu
                label={isAr ? `تصدير (${filteredLeads.length})` : `Export (${filteredLeads.length})`}
                disabled={filteredLeads.length === 0}
                onExport={(format) => handleExportCSV(filteredLeads, format)}
              />
            )}
          </>
        )}
      />

      <div className="crm-leads__views" role="group" aria-label={isAr ? 'عرض العملاء' : 'Client views'}>
        <Chip pressed={leadFilter === 'all'} count={counts.all} onClick={() => setLeadFilter('all')}>{isAr ? 'الكل' : 'All'}</Chip>
        <Chip pressed={leadFilter === 'unanswered'} count={counts.unanswered} className={counts.unanswered > 0 ? 'is-alert' : undefined} onClick={() => setLeadFilter('unanswered')}>
          {isAr ? 'مستني أول رد' : 'Awaiting reply'}
        </Chip>
        <Chip pressed={leadFilter === 'viewing_request'} count={counts.viewings} onClick={() => { setLeadFilter('viewing_request'); setLeadSort?.('visit_date'); }}>
          {isAr ? 'طلبات معاينة' : 'Viewings'}
        </Chip>
        <Chip pressed={leadFilter === 'due'} count={counts.overdue || counts.awaiting || 0} className={counts.overdue > 0 ? 'is-alert' : undefined} onClick={() => setLeadFilter('due')}>
          {counts.overdue > 0 ? (isAr ? 'متابعات متأخرة' : 'Overdue') : (isAr ? 'متابعة النهارده' : 'Due today')}
        </Chip>
        {counts.unassigned > 0 && (
          <Chip pressed={leadFilter === 'unassigned'} count={counts.unassigned} onClick={() => setLeadFilter('unassigned')}>{isAr ? 'من غير مسؤول' : 'Unassigned'}</Chip>
        )}
        <Chip pressed={leadFilter === 'buyer'} count={counts.buyers} onClick={() => setLeadFilter('buyer')}>{isAr ? 'شراء' : 'Buyers'}</Chip>
        <Chip pressed={leadFilter === 'seller'} count={counts.sellers} onClick={() => setLeadFilter('seller')}>{isAr ? 'بيع' : 'Sellers'}</Chip>
        <Chip pressed={leadFilter === 'investor'} onClick={() => setLeadFilter('investor')}>{isAr ? 'مستثمرين' : 'Investors'}</Chip>
        <Select
          hideLabel
          className="crm-leads__more"
          label={isAr ? 'حالات تانية' : 'More views'}
          value={MORE_FILTER_KEYS.includes(leadFilter) ? leadFilter : ''}
          onChange={(e) => e.target.value && setLeadFilter(e.target.value)}
          placeholder={isAr ? 'حالات تانية' : 'More views'}
          options={[
            { value: 'qualified', label: isAr ? 'مؤهلين للشراء' : 'Qualified' },
            { value: 'account', label: isAr ? `حسابات جديدة (${counts.accounts})` : `Accounts (${counts.accounts})` },
            ...(counts.stale > 0 ? [{ value: 'stale', label: isAr ? `راكدين (${counts.stale})` : `Stale (${counts.stale})` }] : []),
            ...(counts.dupes > 0 ? [{ value: 'dupes', label: isAr ? `مكررين بالرقم (${counts.dupes})` : `Duplicates (${counts.dupes})` }] : []),
            { value: 'archived', label: isAr ? `مؤرشفين (${counts.archived})` : `Archived (${counts.archived})` },
            { value: 'lost', label: isAr ? `صفقات خسرانة (${counts.lost})` : `Lost (${counts.lost})` }
          ]}
        />
      </div>

      <div className="crm-leads__toolbar">
        <label className="crm-leads__search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label={isAr ? 'بحث في العملاء' : 'Search clients'}
            placeholder={isAr ? 'اسم، تليفون، وسم...' : 'Name, phone, tag...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runServerSearch(); }}
          />
        </label>
        {searchQuery.trim().length >= 2 && (
          <Button variant="secondary" loading={serverSearching} icon={<Search size={16} aria-hidden="true" />} onClick={runServerSearch} title={isAr ? 'يدوّر في كل العملاء على السيرفر، مش بس اللي ظاهرين' : 'Searches every client on the server'}>
            {isAr ? 'دوّر في الكل' : 'Search all'}
          </Button>
        )}
        <Button
          variant="secondary"
          className="crm-leads__filters-toggle"
          icon={<SlidersHorizontal size={16} aria-hidden="true" />}
          aria-expanded={showFilters}
          aria-controls="crm-leads-filters"
          onClick={() => setShowFilters((v) => !v)}
        >
          {isAr ? 'فلاتر' : 'Filters'}{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </Button>
        <div id="crm-leads-filters" className={cx('crm-leads__filters', showFilters && 'is-open')}>
          <Select
            hideLabel
            label={isAr ? 'درجة الاهتمام' : 'Temperature'}
            value={temperatureFilter}
            onChange={(e) => setTemperatureFilter(e.target.value)}
            options={[
              { value: 'all', label: isAr ? 'كل درجات الاهتمام' : 'Any temperature' },
              { value: 'hot', label: isAr ? 'ساخن' : 'Hot' },
              { value: 'warm', label: isAr ? 'دافئ' : 'Warm' },
              { value: 'cold', label: isAr ? 'بارد' : 'Cold' },
              { value: 'unknown', label: isAr ? 'مش محددة' : 'Not set' }
            ]}
          />
          {setSourceFilter && (
            <Select
              hideLabel
              label={isAr ? 'المصدر' : 'Source'}
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              options={[{ value: 'all', label: isAr ? 'كل المصادر' : 'All sources' }, ...LEAD_SOURCES.map((s) => ({ value: s.id, label: isAr ? s.ar : s.en }))]}
            />
          )}
          {setDateFilter && (
            <Select
              hideLabel
              label={isAr ? 'تاريخ الإضافة' : 'Date added'}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              options={[
                { value: 'all', label: isAr ? 'أي وقت' : 'Any time' },
                { value: 'today', label: isAr ? 'النهارده' : 'Today' },
                { value: '7d', label: isAr ? 'آخر 7 أيام' : 'Last 7 days' },
                { value: '30d', label: isAr ? 'آخر 30 يوم' : 'Last 30 days' },
                { value: 'month', label: isAr ? 'الشهر ده' : 'This month' }
              ]}
            />
          )}
          <Select
            hideLabel
            label={isAr ? 'المنطقة' : 'Area'}
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            options={[{ value: 'all', label: isAr ? 'كل المناطق' : 'All areas' }, ...SOHAG_AREAS.filter((a) => a.id !== 'all').map((a) => ({ value: a.id, label: isAr ? a.name_ar : a.name_en }))]}
          />
          {setLeadSort && (
            <Select
              hideLabel
              label={isAr ? 'الترتيب' : 'Sort'}
              value={leadSort}
              onChange={(e) => setLeadSort(e.target.value)}
              options={LEAD_SORTS.map((o) => ({ value: o.id, label: isAr ? `ترتيب: ${o.ar}` : `Sort: ${o.en}` }))}
            />
          )}
          {hasActiveFilters && (
            <Button variant="ghost" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={resetFilters}>
              {isAr ? 'امسح الفلاتر' : 'Clear filters'}
            </Button>
          )}
          <div className="crm-leads__cols" ref={columnPickerRef}>
            <Button variant="ghost" icon={<Columns3 size={16} aria-hidden="true" />} aria-expanded={showColumnPicker} onClick={() => setShowColumnPicker((v) => !v)}>
              {isAr ? 'الأعمدة' : 'Columns'}
            </Button>
            {showColumnPicker && (
              <div className="crm-leads__cols-menu" role="group" aria-label={isAr ? 'الأعمدة الظاهرة' : 'Visible columns'}>
                {COLUMN_OPTIONS.map((col) => (
                  <label key={col.key} className="crm-leads__cols-item">
                    <input type="checkbox" checked={!!visibleColumns[col.key]} onChange={() => toggleColumn(col.key)} />
                    <span>{isAr ? col.ar : col.en}</span>
                  </label>
                ))}
                <div className="crm-leads__cols-foot">
                  <span>{isAr ? 'الاسم والإجراءات ظاهرين دايماً' : 'Name and actions always show'}</span>
                  <Button variant="ghost" size="sm" onClick={resetColumns}>{isAr ? 'إظهار الكل' : 'Show all'}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedLeadIds.length > 0 && (
        <div className="crm-leads__bulk" role="region" aria-label={isAr ? 'إجراءات على المحدد' : 'Bulk actions'}>
          <span className="crm-leads__bulk-count">
            {isAr ? `${selectedLeadIds.length} عميل محدد` : `${selectedLeadIds.length} selected`}
          </span>
          {canEdit && (
            <span className="ui-select-wrap">
              {/* DeskOptions renders <option>s grouped by desk, so this one stays a plain select with the kit's look */}
              <select
                className="ui-select"
                aria-label={isAr ? 'تعيين مسؤول للمحدد' : 'Assign selected'}
                value=""
                onChange={(e) => { if (e.target.value) handleBulkAssign(e.target.value); }}
              >
                <option value="" disabled>{isAr ? 'تعيين مسؤول' : 'Assign to'}</option>
                <DeskOptions role={activeRole} lang={lang} />
              </select>
              <ChevronDown size={16} className="ui-select-wrap__chev" aria-hidden="true" />
            </span>
          )}
          {canEdit && (
            <Select
              hideLabel
              label={isAr ? 'نقل للمرحلة' : 'Move to stage'}
              value=""
              onChange={(e) => { if (e.target.value) handleBulkStatusChange(e.target.value); }}
              placeholder={isAr ? 'نقل للمرحلة' : 'Move to stage'}
              options={STAGE_OPTIONS.filter((s) => s.value !== 'lost').map((s) => ({ value: s.value, label: isAr ? s.ar : s.en }))}
            />
          )}
          {canEdit && (
            <Select
              hideLabel
              label={isAr ? 'درجة الاهتمام' : 'Temperature'}
              value=""
              onChange={(e) => { if (e.target.value) handleBulkTempChange(e.target.value); }}
              placeholder={isAr ? 'درجة الاهتمام' : 'Temperature'}
              options={[
                { value: 'hot', label: isAr ? 'ساخن' : 'Hot' },
                { value: 'warm', label: isAr ? 'دافئ' : 'Warm' },
                { value: 'cold', label: isAr ? 'بارد' : 'Cold' }
              ]}
            />
          )}
          <Button variant="secondary" size="sm" icon={<Download size={16} aria-hidden="true" />} onClick={handleBulkExportSelected}>{isAr ? 'تصدير' : 'Export'}</Button>
          {isSuperAdmin && (
            <Button variant="danger" size="sm" icon={<Trash2 size={16} aria-hidden="true" />} onClick={handleBulkDelete}>{isAr ? 'حذف' : 'Delete'}</Button>
          )}
          <Button variant="ghost" size="sm" icon={<X size={16} aria-hidden="true" />} onClick={() => setSelectedLeadIds([])}>{isAr ? 'إلغاء التحديد' : 'Clear'}</Button>
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
              <td colSpan={totalVisibleCols} className="crm-leads__empty-cell">
                <EmptyState
                  title={hasActiveFilters ? (isAr ? 'مفيش عملاء بالفلتر ده' : 'No clients match') : (isAr ? 'لسه مفيش عملاء هنا' : 'No clients here yet')}
                  description={hasActiveFilters ? (isAr ? 'غيّر البحث أو امسح الفلاتر.' : 'Change the search or clear the filters.') : (isAr ? 'ضيف أول عميل أو استورد ملف.' : 'Add your first client or import a file.')}
                  action={hasActiveFilters
                    ? <Button variant="secondary" size="sm" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={resetFilters}>{isAr ? 'امسح الفلاتر' : 'Clear filters'}</Button>
                    : (canEdit ? <Button size="sm" icon={<UserPlus size={16} aria-hidden="true" />} onClick={() => setShowAddLeadModal(true)}>{isAr ? 'عميل جديد' : 'New client'}</Button> : null)}
                />
              </td>
            </tr>
          ) : (
            filteredLeads.map((l, rowIndex) => {
              const isSelected = selectedLeadIds.includes(l.id);
              const temp = l.temperature || '';
              const waited = waitingMs(l, now);
              const dupCount = (duplicateIds.get(l.id) || []).length;

              return (
                <tr
                  key={l.id}
                  data-lead-id={l.id}
                  className={`crm-lead-row ${rowIndex === kbdIndex ? 'is-kbd-active' : ''}`}
                  aria-current={rowIndex === kbdIndex ? 'true' : undefined}
                  data-selected={isSelected || undefined}
                  onClick={(e) => {
                    // Row click opens the quick drawer (not the full-screen profile); controls keep their own behaviour
                    if (e.target.closest('button, a, input, select, label, summary, details')) return;
                    setKbdIndex(rowIndex);
                    setQuickDrawerLead(l);
                  }}
                >
                  {/* Checkbox */}
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(l.id)}
                      aria-label={isAr ? `تحديد ${l.name || 'العميل'}` : `Select ${l.name || 'lead'}`}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>

                  {/* Client Info + 360 Trigger */}
                  <td data-label={isAr ? 'الاسم والملف' : 'Name & Profile'}>
                    <div className="crm-client-identity-wrap">
                      <Avatar name={l.name || ''} size="sm" />
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
                            <Badge tone="info" icon={<Plane size={12} aria-hidden="true" />}>{l.cityOrExpat}</Badge>
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
                              <Copy size={14} />
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
                              <Timer size={12} aria-hidden="true" />{isAr ? `بدون رد ${fmtWait(waited)}` : `No reply ${fmtWait(waited)}`}
                            </span>
                          )}
                          {dupCount > 0 && (
                            <button type="button" className="crm-lead-chip is-dupe" onClick={(e) => { e.stopPropagation(); openMerge(l); }} title={isAr ? 'نفس الرقم مسجل في عميل تاني' : 'Same phone on another lead'}>
                              <CopyPlus size={12} aria-hidden="true" />{isAr ? `مكرر (${dupCount + 1})` : `Duplicate (${dupCount + 1})`}
                            </button>
                          )}
                          {l.status === 'lost' && l.lostReason && (
                            <span className="crm-lead-chip is-lost" title={l.lostNote || ''}>
                              <Ban size={12} aria-hidden="true" />{(() => { const r = LOST_REASONS.find((x) => x.id === l.lostReason); return r ? (isAr ? r.ar : r.en) : l.lostReason; })()}
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
                      <div className="crm-lead-req-cell">
                        {(l.budget || l.details?.budget || l.details?.expectedPrice) ? (
                          <strong className="crm-lead-budget-val">
                            <bdi>{formatBudget(l.budget || l.details?.budget || l.details?.expectedPrice, isAr)}</bdi>
                          </strong>
                        ) : null}
                        <span className="crm-lead-spec-sub">
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
                      <div className="crm-leads__score">
                        {(() => { const sc = leadScore(l); return (
                          <Badge tone={sc.score >= LEAD_SCORE_HIGH ? 'success' : 'neutral'} title={sc.reasons.join(' • ')}>{sc.score}%</Badge>
                        ); })()}
                        <button
                          type="button"
                          className={`crm-leads__temp is-${temp || 'unset'}`}
                          onClick={(e) => cycleTemperature(l, e)}
                          disabled={!canEdit}
                          title={isAr ? 'دوس علشان تغيّر درجة الاهتمام' : 'Click to change temperature'}
                          aria-label={isAr ? `درجة اهتمام ${l.name || 'العميل'}: ${TEMPERATURES[temp]?.ar || 'مش محددة'}` : `Temperature of ${l.name || 'lead'}: ${TEMPERATURES[temp]?.en || 'not set'}`}
                        >
                          <span className="crm-leads__temp-dot" aria-hidden="true" />
                          {TEMPERATURES[temp] ? (isAr ? TEMPERATURES[temp].ar : TEMPERATURES[temp].en) : (isAr ? 'مش محددة' : 'Not set')}
                        </button>
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
                              const stageNames = Object.fromEntries(STAGE_OPTIONS.map((st) => [st.value, isAr ? st.ar : st.en]));
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
                          {STAGE_OPTIONS.map((st) => (
                            <option
                              key={st.value}
                              value={st.value}
                              disabled={(st.value === 'closing' || st.value === 'closed') && !canCloseDeals && l.status !== st.value}
                            >
                              {isAr ? st.ar : st.en}
                            </option>
                          ))}
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
                            <Clock size={14} className="crm-next-action-icon" aria-hidden="true" />
                            <span className="crm-next-action-text" title={formatFollowUp(l.nextActionNote || l.followUp, isAr)}>{formatFollowUp(l.nextActionNote || l.followUp, isAr)}</span>
                          </div>
                        ) : (
                          <span className="crm-next-action-empty">
                            <Plus size={14} aria-hidden="true" />{isAr ? 'حدد متابعة' : 'Add action'}
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
        <div className="crm-leads__more-rows">
          <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={loadMoreLeads}>
            {isAr ? `اعرض عملاء أقدم (ظاهر أحدث ${leads.length})` : `Load older clients (showing newest ${leads.length})`}
          </Button>
        </div>
      )}
    </div>
    </div>

  );
}
