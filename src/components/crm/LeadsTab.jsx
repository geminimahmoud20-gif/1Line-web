import {
  Download, Trash2, Clock, Plus, UserPlus, SlidersHorizontal, Search, X, RotateCcw, ChevronDown,
  Copy, Upload, Columns3, Rows3, Timer, CopyPlus, Plane, Ban, CalendarClock,
  Megaphone, Globe, MessageCircle, Users, Share2, FileUp, PenLine, CircleHelp
} from 'lucide-react';
import { formatFollowUp, formatBudget, campaignLabel } from '../../utils/crmLabels';
import DeskOptions from './DeskOptions';
import useTeamMembers from '../../hooks/useTeamMembers';
import { assigneeValue, assignmentUpdates, personFor } from '../../utils/assignees';
import OwnerPerformance from './OwnerPerformance';
import { leadSituation } from '../../utils/leadSituation';
import { ownersTable } from '../../utils/ownerPerformance';
import ExportMenu from './ExportMenu';
import DataImportModal from './DataImportModal';
import { getAreas } from '../../utils/areasData';
import { useState, useMemo, useEffect, useRef } from 'react';
import LostReasonModal from './LostReasonModal';
import MergeLeadsModal from './MergeLeadsModal';
import MergeAllModal from './MergeAllModal';
import { planDuplicateMerges } from '../../utils/dedupePlan';
import { guardStage, lastOutcomeLabel, outcomesOf } from '../../utils/stageGate';
import { useTasks } from '../../hooks/useTasks';
import { nextTaskFor, bucketOf, dueLabel } from '../../utils/tasks';
import { needsDetails, LEAD_SOURCES, LEAD_SORTS, LOST_REASONS, leadSourceKey, waitingMs, responseSlaMs, escalationLevel, isOverdue, isDueToday, isUnassigned, isStale, localDayKey, getLeadVisitDate, getLeadVisitSlot, isViewingLead, isSellerLead, isAccountLead, isBuyerLead, leadCreatedMs, leadCampaign } from '../../utils/crmLeadViews';
import { useProperties } from '../../context/PropertiesContext';
import LeadTableRowActions from './LeadTableRowActions';
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';
import { leadScore, LEAD_SCORE_HIGH } from '../../utils/crmLeadViews';
import { PageHeader, Button, Chip, Select, Badge, Avatar, EmptyState } from '../ui';
import { cx } from '../ui/cx';
import './leads-tab.css';
import './client-card.css';
import PhoneText from './PhoneText';
import { auditPhoneCopy } from '../../utils/contactAudit';
const MORE_FILTER_KEYS = ['incomplete', 'converted', 'not_fit', 'qualified', 'account', 'stale', 'dupes', 'archived', 'won', 'inactive', 'lost'];

const COLUMN_OPTIONS = [
  { key: 'requirements', ar: 'المواصفات والميزانية', en: 'Requirements & budget' },
  { key: 'score', ar: 'الجدية والحرارة', en: 'Score & temperature' },
  { key: 'status', ar: 'المرحلة', en: 'Stage' },
  { key: 'lastOutcome', ar: 'آخر نتيجة', en: 'Last outcome' },
  { key: 'nextAction', ar: 'المتابعة التالية', en: 'Next follow-up' },
  { key: 'agent', ar: 'المسؤول', en: 'Owner' }
];

const STAGE_OPTIONS = [
  { value: 'new', ar: 'عميل محتمل', en: 'Lead' },
  { value: 'contacted', ar: 'مؤهل', en: 'Qualified' },
  { value: 'site_visit', ar: 'اجتماع / معاينة', en: 'Meeting / viewing' },
  { value: 'negotiating', ar: 'تفاوض', en: 'Negotiation' },
  { value: 'closing', ar: 'إغلاق (توقيع وحجز)', en: 'Closing (signing & deposit)' },
  { value: 'closed', ar: 'إغلاق', en: 'Closed' },
  { value: 'inactive', ar: 'غير متفاعل', en: 'Unresponsive' },
  { value: 'lost', ar: 'خسارة', en: 'Lost' }
];

const TEMPERATURES = {
  hot: { ar: 'ساخن', en: 'Hot', tone: 'danger' },
  warm: { ar: 'دافئ', en: 'Warm', tone: 'warning' },
  cold: { ar: 'بارد', en: 'Cold', tone: 'info' }
};

const FIVE_MIN = 5 * 60 * 1000;

/** A new client nobody answered yet: counts down the first five minutes (it hands over to «بدون رد» when it ends) */
function FiveMinuteTimer({ since, isAr }) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = FIVE_MIN - (t - since);
  if (!since || left <= 0) return null;
  const m = Math.floor(left / 60000);
  const sec = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return (
    <span className={`crm-lead-chip ${left < 60000 ? 'is-late' : 'is-waiting'}`} title={isAr ? 'الرد في أول 5 دقايق بيفرق: كلّمه دلوقتي' : 'Reply within the first 5 minutes'}>
      <Timer size={12} aria-hidden="true" /><bdi dir="ltr">{m}:{sec}</bdi> {isAr ? 'للرد' : 'to reply'}
    </span>
  );
}

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
  canDeleteLeads,
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
  onMergeAllDuplicates,
  canMergeLeads = false,
  sourceFilter = 'all',
  setSourceFilter,
  dateFilter = 'all',
  setDateFilter,
  ownerFilter = 'all',
  setOwnerFilter,
  situations = new Map(),
  listingByLead = new Map(),
  leadSort = 'waiting',
  setLeadSort,
  canEdit = true,
  canExport = false,
  canClaimLead = () => false,
  canCloseDeals = true
}) {
  const [lostFor, setLostFor] = useState(null);
  const [mergeGroup, setMergeGroup] = useState(null);
  const [mergeAllOpen, setMergeAllOpen] = useState(false);
  const mergePlans = useMemo(() => (mergeAllOpen ? planDuplicateMerges(leads) : []), [mergeAllOpen, leads]);

  // Column Visibility state & persistence
  const DEFAULT_VISIBLE_COLUMNS = {
    requirements: true,
    score: true,
    status: true,
    lastOutcome: true,
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
  // Compact rows (about 8 clients a screen instead of 3) are the default on a big screen; the choice is remembered
  const [compact, setCompact] = useState(() => {
    try { const v = localStorage.getItem('oneline_leads_density'); return v ? v === 'compact' : true; } catch { return true; }
  });
  const toggleDensity = () => setCompact((c) => {
    try { localStorage.setItem('oneline_leads_density', c ? 'comfortable' : 'compact'); } catch { /* storage blocked */ }
    return !c;
  });
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
    (visibleColumns.lastOutcome ? 1 : 0) +
    (visibleColumns.nextAction ? 1 : 0) +
    (visibleColumns.agent ? 1 : 0);

  // The open tasks, for «المتابعة التالية»
  const { tasks: allTasks } = useTasks();
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
      buyers: open.filter(isBuyerLead).length,
      awaiting: open.filter((l) => waitingMs(l, now) > 0).length,
      late: open.filter((l) => waitingMs(l, now) > responseSlaMs(l)).length,
      dupes: open.filter((l) => duplicateIds.has(l.id)).length,
      overdue: open.filter((l) => isOverdue(l, localDayKey(now))).length,
      // What the «متابعة النهارده» chip lists: a follow-up due today or already late (filterLeads 'due')
      due: open.filter((l) => isDueToday(l, localDayKey(now)) || isOverdue(l, localDayKey(now))).length,
      unassigned: open.filter(isUnassigned).length,
      stale: open.filter((l) => isStale(l, now)).length,
      lost: leads.filter((l) => !l.isArchived && l.status === 'lost').length,
      incomplete: leads.filter(needsDetails).length,
      converted: leads.filter((l) => !l.isArchived && situations.get(l.id) === 'converted').length,
      notFit: leads.filter((l) => !l.isArchived && situations.get(l.id) === 'not_fit').length,
      won: leads.filter((l) => !l.isArchived && l.status === 'closed').length,
      inactive: leads.filter((l) => !l.isArchived && l.status === 'inactive').length,
      archived: leads.filter((l) => l.isArchived).length
    };
  }, [leads, duplicateIds, situations, now]);

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
  // One icon per source, so where a client came from reads at a glance (ads are tinted: they get the 15-minute reply target)
  const SOURCE_ICONS = { website: Globe, whatsapp: MessageCircle, ads: Megaphone, broker: Users, referral: Share2, import: FileUp, manual: PenLine, other: CircleHelp };
  const renderSource = (lead) => {
    const key = leadSourceKey(lead);
    const Icon = SOURCE_ICONS[key] || CircleHelp;
    return <span className={`crm-lead-chip is-source is-source-${key}`}><Icon size={12} aria-hidden="true" />{sourceLabel(lead)}</span>;
  };
  const sourceLabel = (l) => { const s = LEAD_SOURCES.find((x) => x.id === leadSourceKey(l)); return s ? (isAr ? s.ar : s.en) : ''; };
  const openMerge = (l) => {
    const ids = [l.id, ...(duplicateIds.get(l.id) || [])];
    setMergeGroup(leads.filter((x) => ids.includes(x.id)));
  };
  const [importOpen, setImportOpen] = useState(false);
  const { leadsHasMore, loadMoreLeads, searchAllLeads } = useProperties();
  // People on the team, for «المسؤول» by name (falls back to the names already holding leads)
  const teamMembers = useTeamMembers(leads);
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

  const hasActiveFilters = (ownerFilter && ownerFilter !== 'all') || leadFilter !== 'all' || temperatureFilter !== 'all' || (sourceFilter && sourceFilter !== 'all') || (dateFilter && dateFilter !== 'all') || (areaFilter && areaFilter !== 'all') || Boolean(searchQuery);
  // Dropdown filters set (the views row and search show their own state)
  const activeFilterCount = [ownerFilter && ownerFilter !== 'all', temperatureFilter !== 'all', sourceFilter && sourceFilter !== 'all', dateFilter && dateFilter !== 'all', areaFilter && areaFilter !== 'all'].filter(Boolean).length;
  const resetFilters = () => {
    setLeadFilter('all');
    setTemperatureFilter('all');
    setSourceFilter?.('all');
    setDateFilter?.('all');
    setAreaFilter?.('all');
    setOwnerFilter?.('all');
    setSearchQuery?.('');
  };
  const [showFilters, setShowFilters] = useState(false);
  // Who holds the clients: the owner filter's options, with how many open clients each has
  const owners = useMemo(() => ownersTable(leads, teamMembers), [leads, teamMembers]);
  const ownerOptions = useMemo(() => [
    { value: 'all', label: isAr ? 'كل المسؤولين' : 'All owners' },
    ...owners.filter((o) => o.key !== 'none').map((o) => ({ value: o.key, label: `${o.name} (${o.stats.open})` })),
    ...(owners.some((o) => o.key === 'none') ? [{ value: 'none', label: isAr ? 'من غير مسؤول' : 'No owner' }] : [])
  ], [owners, isAr]);

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

  // The temperature is picked from a list in the row (one tap to open, one to choose), not cycled
  const setTemperature = (lead, nextTemp) => {
    if (!canEdit || !onUpdateLead || nextTemp === (lead.temperature || '')) return;
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
    // The stage lock applies to each client: the ones without a logged outcome stay where they are
    let moved = 0;
    for (const id of selectedLeadIds) {
      const l = leads.find(x => x.id === id);
      if (l && guardStage(l, { status: newStatus, ...(newStatus === 'lost' ? { lostReason: 'pending' } : {}) }, { role: activeRole })) {
        await onUpdateLead(id, { 
          status: newStatus,
          statusUpdatedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString()
        }, l.version);
        moved += 1;
      }
    }
    const stageNames = Object.fromEntries(STAGE_OPTIONS.map((st) => [st.value, st.ar]));
    const skipped = selectedLeadIds.length - moved;
    triggerToast?.(
      isAr
        ? `اتنقل ${moved} عميل إلى: ${stageNames[newStatus] || newStatus}${skipped ? `. ${skipped} ما اتنقلوش: لازم تسجّل نتيجة النشاط لكل واحد الأول (أو الرجوع للمدير).` : ''}`
        : `Moved ${moved}${skipped ? `, ${skipped} need an activity outcome first` : ''}`,
      skipped ? 'info' : 'success'
    );
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
    <div className={cx('crm-table-container crm-leads', compact && 'is-compact')}>
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
      {mergeAllOpen && (
        <MergeAllModal
          plans={mergePlans}
          isAr={isAr}
          onCancel={() => setMergeAllOpen(false)}
          onConfirm={async () => { const ok = await onMergeAllDuplicates(mergePlans); if (ok) setMergeAllOpen(false); return ok; }}
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
        description={(
          <span className="crm-leads__stats">
            <span><b>{leads.length}</b> {isAr ? 'عميل' : 'clients'}</span>
            {counts.archived > 0 && <span><b>{counts.archived}</b> {isAr ? 'مؤرشف' : 'archived'}</span>}
            {counts.lost > 0 && <span><b>{counts.lost}</b> {isAr ? 'خسارة' : 'lost'}</span>}
            <span><b>{filteredLeads.length}</b> {isAr ? 'ظاهر بالفلتر' : 'shown'}</span>
            <span>{isAr ? 'نسبة الإغلاق' : 'Win rate'} <b><bdi>{kpiStats.winRate}%</bdi></b></span>
          </span>
        )}
        actions={(
          <>
            {canEdit && (
              <Button icon={<UserPlus size={16} aria-hidden="true" />} onClick={() => setShowAddLeadModal(true)}>
                {isAr ? 'عميل جديد' : 'New client'}
              </Button>
            )}
            {onImportLeads && (
              <Button variant="secondary" className="crm-leads__import" icon={<Upload size={16} aria-hidden="true" />} onClick={() => setImportOpen(true)} aria-label={isAr ? 'استيراد عملاء' : 'Import clients'}>
                <span className="crm-leads__lbl">{isAr ? 'استيراد' : 'Import'}</span>
              </Button>
            )}
            {canExport && (
              <ExportMenu
                label={isAr ? 'تصدير' : 'Export'}
                disabled={filteredLeads.length === 0}
                onExport={(format) => handleExportCSV(filteredLeads, format)}
              />
            )}
          </>
        )}
      />

      {/* Desktop: the numbers that decide the day, each one a shortcut to its list */}
      <div className="crm-leads__kpis" role="group" aria-label={isAr ? 'ملخص العملاء' : 'Clients summary'}>
        <button type="button" className={`crm-kpi ${leadFilter === 'all' ? 'is-on' : ''}`} onClick={() => setLeadFilter('all')}>
          <span className="crm-kpi__label">{isAr ? 'إجمالي العملاء' : 'Clients'}</span>
          <b className="crm-kpi__value">{leads.length}</b>
          <small>{isAr ? `${filteredLeads.length} ظاهر بالفلتر` : `${filteredLeads.length} shown`}{counts.lost > 0 ? ` · ${counts.lost} ${isAr ? 'خسارة' : 'lost'}` : ''}</small>
        </button>
        <button type="button" className={`crm-kpi ${counts.late > 0 ? 'is-danger' : ''} ${leadFilter === 'unanswered' ? 'is-on' : ''}`} onClick={() => setLeadFilter('unanswered')}>
          <span className="crm-kpi__label">{isAr ? 'مستني أول رد' : 'Awaiting reply'}</span>
          <b className="crm-kpi__value">{counts.unanswered}</b>
          <small>{counts.late > 0 ? (isAr ? `${counts.late} اتأخر الرد عليهم` : `${counts.late} waiting too long`) : (isAr ? 'مفيش حد اتأخر' : 'Nobody late')}</small>
        </button>
        <button type="button" className={`crm-kpi ${counts.overdue > 0 ? 'is-warn' : ''} ${leadFilter === 'due' ? 'is-on' : ''}`} onClick={() => setLeadFilter('due')}>
          <span className="crm-kpi__label">{isAr ? 'متابعات النهارده' : 'Follow-ups today'}</span>
          <b className="crm-kpi__value">{counts.due}</b>
          <small>{counts.overdue > 0 ? (isAr ? `${counts.overdue} متأخرة` : `${counts.overdue} overdue`) : (isAr ? 'في ميعادها' : 'On time')}</small>
        </button>
        <div className="crm-kpi is-static">
          <span className="crm-kpi__label">{isAr ? 'نسبة الإغلاق' : 'Win rate'}</span>
          <b className="crm-kpi__value"><bdi>{kpiStats.winRate}%</bdi></b>
          <small>{counts.archived > 0 ? (isAr ? `${counts.archived} مؤرشف` : `${counts.archived} archived`) : (isAr ? 'من القرارات النهائية' : 'Of final decisions')}</small>
        </div>
      </div>

      {(counts.late > 0 || counts.due > 0) && (
        <div className="crm-leads__urgent" role="status">
          {counts.late > 0 && (
            <button type="button" className="crm-leads__urgent-btn is-late" onClick={() => setLeadFilter('unanswered')}>
              {isAr ? `${counts.late} عميل اتأخر الرد عليه` : `${counts.late} waiting too long`}
            </button>
          )}
          {counts.due > 0 && (
            <button type="button" className="crm-leads__urgent-btn" onClick={() => setLeadFilter('due')}>
              {isAr ? `${counts.due} متابعة النهارده أو متأخرة` : `${counts.due} follow-ups due`}
            </button>
          )}
        </div>
      )}

      <div className="crm-leads__views" role="group" aria-label={isAr ? 'عرض العملاء' : 'Client views'}>
        <Chip pressed={leadFilter === 'all'} count={counts.all} onClick={() => setLeadFilter('all')}>{isAr ? 'الكل' : 'All'}</Chip>
        <Chip pressed={leadFilter === 'unanswered'} count={counts.unanswered} className={counts.unanswered > 0 ? 'is-alert' : undefined} onClick={() => setLeadFilter('unanswered')}>
          {isAr ? 'مستني أول رد' : 'Awaiting reply'}
        </Chip>
        <Chip pressed={leadFilter === 'viewing_request'} count={counts.viewings} onClick={() => { setLeadFilter('viewing_request'); setLeadSort?.('visit_date'); }}>
          {isAr ? 'طلبات معاينة' : 'Viewings'}
        </Chip>
        <Chip pressed={leadFilter === 'due'} count={counts.due} className={counts.overdue > 0 ? 'is-alert' : undefined} onClick={() => setLeadFilter('due')}>
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
            { value: 'incomplete', label: isAr ? `ملاك بياناتهم ناقصة (${counts.incomplete})` : `Owners missing details (${counts.incomplete})` },
            { value: 'converted', label: isAr ? `اتحوّلوا لعقارات (${counts.converted})` : `Made into listings (${counts.converted})` },
            { value: 'not_fit', label: isAr ? `غير مناسب (${counts.notFit})` : `Not a fit (${counts.notFit})` },
            { value: 'qualified', label: isAr ? 'جدية عالية' : 'High score' },
            { value: 'account', label: isAr ? `حسابات جديدة (${counts.accounts})` : `Accounts (${counts.accounts})` },
            ...(counts.stale > 0 ? [{ value: 'stale', label: isAr ? `راكدين (${counts.stale})` : `Stale (${counts.stale})` }] : []),
            ...(counts.dupes > 0 ? [{ value: 'dupes', label: isAr ? `مكررين بالرقم (${counts.dupes})` : `Duplicates (${counts.dupes})` }] : []),
            { value: 'archived', label: isAr ? `مؤرشفين (${counts.archived})` : `Archived (${counts.archived})` },
            { value: 'won', label: isAr ? `صفقات ناجحة (${counts.won})` : `Won (${counts.won})` },
            { value: 'inactive', label: isAr ? `غير متفاعل (${counts.inactive})` : `Unresponsive (${counts.inactive})` },
            { value: 'lost', label: isAr ? `خسارة (${counts.lost})` : `Lost (${counts.lost})` }
          ]}
        />
      </div>

      {leadFilter === 'dupes' && canMergeLeads && onMergeAllDuplicates && counts.dupes > 1 && (
        <div className="crm-leads__dupebar">
          <span>{isAr ? 'نفس العميل ملا أكتر من فورم؟ ادمجهم في ملف واحد، وكل طلب بيتسجل في سجل أحداثه.' : 'One client, several forms? Merge them into one file; each request goes into its history.'}</span>
          <Button size="sm" onClick={() => setMergeAllOpen(true)}>{isAr ? 'دمج كل المكرر' : 'Merge all duplicates'}</Button>
        </div>
      )}

      {setOwnerFilter && owners.length > 1 && (
        <OwnerPerformance
          isAr={isAr}
          leads={leads}
          owners={owners}
          tasks={allTasks}
          people={teamMembers}
          ownerFilter={ownerFilter}
          onPickOwner={setOwnerFilter}
          onPickView={setLeadFilter}
          onOpenLead={setQuickDrawerLead}
          leadFilter={leadFilter}
        />
      )}

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
        {setLeadSort && (
          <Select
            hideLabel
            className="crm-leads__sort"
            label={isAr ? 'الترتيب' : 'Sort'}
            value={leadSort}
            onChange={(e) => setLeadSort(e.target.value)}
            options={LEAD_SORTS.map((o) => ({ value: o.id, label: isAr ? `ترتيب: ${o.ar}` : `Sort: ${o.en}` }))}
          />
        )}
        <Button variant="secondary" className="crm-leads__density" icon={<Rows3 size={16} aria-hidden="true" />} aria-pressed={compact} onClick={toggleDensity} title={isAr ? 'صفوف مضغوطة: عملاء أكتر في الشاشة' : 'Compact rows: more clients per screen'}>
          {compact ? (isAr ? 'مضغوط' : 'Compact') : (isAr ? 'مريح' : 'Comfortable')}
        </Button>
        <div className="crm-leads__cols" ref={columnPickerRef}>
          <Button variant="secondary" icon={<Columns3 size={16} aria-hidden="true" />} aria-expanded={showColumnPicker} onClick={() => setShowColumnPicker((v) => !v)}>
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
              <p className="crm-leads__cols-keys">{isAr ? 'اختصارات: J / K للتنقل · Enter للفتح · W واتساب · S الحالة' : 'Shortcuts: J / K move · Enter open · W WhatsApp · S status'}</p>
            </div>
          )}
        </div>
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
          {setOwnerFilter && owners.length > 1 && (
            <Select
              hideLabel
              className="crm-leads__owner"
              label={isAr ? 'المسؤول' : 'Owner'}
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              options={ownerOptions}
            />
          )}
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
            options={[{ value: 'all', label: isAr ? 'كل المناطق' : 'All areas' }, ...getAreas().filter((a) => a.id !== 'all').map((a) => ({ value: a.id, label: isAr ? a.name_ar : (a.name_en || a.name_ar) }))]}
          />
          {hasActiveFilters && (
            <Button variant="ghost" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={resetFilters}>
              {isAr ? 'امسح الفلاتر' : 'Clear filters'}
            </Button>
          )}
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
                onChange={(e) => { if (e.target.value) handleBulkAssign(e.target.value, teamMembers); }}
              >
                <option value="" disabled>{isAr ? 'تعيين مسؤول' : 'Assign to'}</option>
                <DeskOptions role={activeRole} lang={lang} people={teamMembers} />
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
          {(canDeleteLeads ?? isSuperAdmin) && (
            <Button variant="danger" size="sm" icon={<Trash2 size={16} aria-hidden="true" />} onClick={handleBulkDelete}>{isAr ? 'حذف' : 'Delete'}</Button>
          )}
          <Button variant="ghost" size="sm" icon={<X size={16} aria-hidden="true" />} onClick={() => setSelectedLeadIds([])}>{isAr ? 'إلغاء التحديد' : 'Clear'}</Button>
        </div>
      )}

      {/* Leads Table */}
      <div className="crm-table-scroll-wrapper">
        <table className="crm-table" data-kbd="leads">
        <thead>
          <tr>
            <th className="crm-th--check" style={{ width: '36px', textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={selectedLeadIds.length > 0 && selectedLeadIds.length === filteredLeads.length}
                aria-label={isAr ? 'تحديد كل العملاء الظاهرين' : 'Select all visible leads'}
                onChange={() => handleToggleSelectAll(filteredLeads)}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th className="crm-th--client">{isAr ? 'العميل والملف الشخصي' : 'Client Profile'}</th>
            {visibleColumns.requirements && <th className="crm-th--specs">{isAr ? 'المواصفات والميزانية' : 'Requirements'}</th>}
            {leadFilter === 'viewing_request' && <th style={{ minWidth: '150px' }}>{isAr ? 'الميعاد المطلوب' : 'Requested Schedule'}</th>}
            {visibleColumns.score && <th className="crm-th--score">{isAr ? 'الجدية والحرارة' : 'Score & Temp'}</th>}
            {visibleColumns.status && <th className="crm-th--status">{isAr ? 'الحالة' : 'Status'}</th>}
            {visibleColumns.lastOutcome && <th className="crm-th--outcome">{isAr ? 'آخر نتيجة' : 'Last outcome'}</th>}
            {visibleColumns.nextAction && <th className="crm-th--next">{isAr ? 'المتابعة التالية' : 'Next follow-up'}</th>}
            {visibleColumns.agent && <th className="crm-th--agent">{isAr ? 'المسؤول' : 'Agent'}</th>}
            <th className="crm-th--actions">{isAr ? 'الإجراءات' : 'Actions'}</th>
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
                  {visibleColumns.lastOutcome && <td><div className="crm-skeleton-line" style={{ width: '90px', height: '13px' }} /></td>}
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
                  className={`crm-lead-row ${rowIndex === kbdIndex ? 'is-kbd-active' : ''} ${temp === 'hot' ? 'is-hot' : ''} ${isOverdue(l, localDayKey(now)) ? 'is-overdue' : ''}`}
                  data-stage={l.status || 'new'}
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
                            <PhoneText leadId={l.id} value={formatPhoneNumber(l.phone || l.whatsapp)} surface="leads" isAr={isAr} render={(t) => renderHighlighted(t, searchQuery)} />
                          </span>
                          {(l.phone || l.whatsapp) && (
                            <button
                              type="button"
                              className="crm-phone-copy-btn"
                              title={isAr ? 'نسخ رقم الهاتف' : 'Copy phone'}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard?.writeText(l.phone || l.whatsapp);
                                auditPhoneCopy(l.id, 'leads');
                                triggerToast?.(isAr ? 'تم نسخ الرقم بنجاح' : 'Phone copied', 'success');
                              }}
                            >
                              <Copy size={14} />
                            </button>
                          )}
                        </div>

                        {/* One source badge, and under it the campaign and the ad's name */}
                        <div className="crm-lead-source">
                          {renderSource(l)}
                          {(() => {
                            const c = leadCampaign(l);
                            const text = c ? [campaignLabel(c.campaign), c.ad].filter(Boolean).join(' · ') : '';
                            return text ? <span className="crm-lead-campaign" title={text}>{text}</span> : null;
                          })()}
                        </div>
                        <div className="crm-lead-meta">
                          {leadCreatedMs(l) > 0 && now - leadCreatedMs(l) > 60000 && (
                            <span className="crm-lead-age" title={isAr ? 'من إمتى العميل اتضاف' : 'When the client was added'}>{isAr ? `من ${fmtWait(now - leadCreatedMs(l))}` : `${fmtWait(now - leadCreatedMs(l))} ago`}</span>
                          )}
                          {waited > 0 && waited < FIVE_MIN && <FiveMinuteTimer since={leadCreatedMs(l)} isAr={isAr} />}
                          {waited >= FIVE_MIN && (
                            <span
                              className={`crm-lead-chip ${escalationLevel(l, now) === 2 ? 'is-late is-escalated' : waited > responseSlaMs(l) ? 'is-late' : 'is-waiting'}`}
                              title={(compact ? `${escalationLevel(l, now) === 2 ? (isAr ? 'متصعّد · ' : 'Escalated · ') : ''}${isAr ? 'بدون رد ' : 'No reply '}${fmtWait(waited)}. ` : '') + (isAr ? (responseSlaMs(l) < 3600000 ? 'وقت من غير أول رد. عميل إعلان: المطلوب خلال ١٥ دقيقة' : 'وقت من غير أول رد') : 'Time without a first reply')}
                            >
                              <Timer size={12} aria-hidden="true" /><span className="crm-lead-chip__long">{isAr ? `${escalationLevel(l, now) === 2 ? 'متصعّد · ' : ''}بدون رد ${fmtWait(waited)}` : `${escalationLevel(l, now) === 2 ? 'Escalated · ' : ''}No reply ${fmtWait(waited)}`}</span><span className="crm-lead-chip__short">{fmtWait(waited)}</span>
                            </span>
                          )}
                          {dupCount > 0 && (
                            <button type="button" className="crm-lead-chip is-dupe" onClick={(e) => { e.stopPropagation(); openMerge(l); }} title={isAr ? 'نفس الرقم له طلبات تانية. اضغط للدمج، أو افتح الملف لشوف كل طلباته' : 'Same phone has other requests. Click to merge, or open the file to see them all'}>
                              <CopyPlus size={12} aria-hidden="true" />{isAr ? `نفس العميل · ${dupCount + 1} طلبات` : `Same client · ${dupCount + 1} requests`}
                            </button>
                          )}
                          {Array.isArray(l.tags) && l.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="crm-lead-chip is-tag" title={l.tags.join(' · ')}>{tag}</span>
                          ))}
                          {Array.isArray(l.tags) && l.tags.length > 2 && (
                            <span className="crm-lead-chip" title={l.tags.join(' · ')}>+{l.tags.length - 2}</span>
                          )}
                          {l.status === 'lost' && l.lostReason && (
                            <span className="crm-lead-chip is-lost" title={l.lostNote || ''}>
                              <Ban size={12} aria-hidden="true" />{(() => { const r = LOST_REASONS.find((x) => x.id === l.lostReason); return r ? (isAr ? r.ar : r.en) : l.lostReason; })()}
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  </td>

                  {/* Requirements */}
                  {visibleColumns.requirements && (
                    <td data-label={isAr ? 'المواصفات' : 'Requirements'}>
                      <div className="crm-lead-req-cell">
                        {(l.details?.budget || l.details?.expectedPrice || l.budget) ? (
                          <strong className="crm-lead-budget-val">
                            <bdi>{formatBudget(l.details?.budget || l.details?.expectedPrice || l.budget, isAr)}</bdi>
                          </strong>
                        ) : null}
                        <span className="crm-lead-spec-sub">
                          {getLocalizedPropertyType(l.details?.propertyType || l.propertyType || l.type)} • {getLocalizedArea(l.details?.area || l.area || l.details?.district || '')}
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
                          <Badge tone={sc.score >= LEAD_SCORE_HIGH ? 'success' : 'neutral'} title={sc.reasons.join(' • ')}><span className="crm-leads__score-label">{isAr ? 'جدية ' : 'Score '}</span>{sc.score}%</Badge>
                        ); })()}
                        <span className={`crm-leads__temp is-${temp || 'unset'}`}>
                          <span className="crm-leads__temp-dot" aria-hidden="true" />
                          <select
                            className="ui-select crm-leads__temp-select"
                            value={temp}
                            disabled={!canEdit}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setTemperature(l, e.target.value)}
                            aria-label={isAr ? `درجة اهتمام ${l.name || 'العميل'}` : `Temperature of ${l.name || 'lead'}`}
                          >
                            <option value="">{isAr ? 'مش محددة' : 'Not set'}</option>
                            <option value="hot">{isAr ? TEMPERATURES.hot.ar : TEMPERATURES.hot.en}</option>
                            <option value="warm">{isAr ? TEMPERATURES.warm.ar : TEMPERATURES.warm.en}</option>
                            <option value="cold">{isAr ? TEMPERATURES.cold.ar : TEMPERATURES.cold.en}</option>
                          </select>
                        </span>
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
                            // The stage lock: the select snaps back (it is controlled by l.status) when refused
                            if (!guardStage(l, { status: nextStatus, ...(nextStatus === 'lost' ? { lostReason: 'pending' } : {}) }, { role: activeRole, toast: triggerToast })) return;
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
                                    onUpdateLead(l.id, { status: prevStatus, _undo: true, lastActivityAt: new Date().toISOString() });
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
                      {(() => {
                        const sit = leadSituation(l, listingByLead.get(String(l.id)) || null);
                        return sit
                          ? <span className={`crm-situation is-${sit.tone}`} title={sit.at ? new Date(sit.at).toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB') : undefined}>{sit.label}{sit.at ? ` · ${fmtWait(now - sit.at)}` : ''}</span>
                          : <span className="crm-situation is-none">{isAr ? 'لسه متواصلناش' : 'No contact yet'}</span>;
                      })()}
                    </td>
                  )}

                  {/* Last activity outcome and the tries */}
                  {visibleColumns.lastOutcome && (
                    <td data-label={isAr ? 'آخر نتيجة' : 'Last outcome'}>
                      {(() => {
                        const label = lastOutcomeLabel(l);
                        const last = outcomesOf(l).at(-1);
                        return label
                          ? <div className="crm-outcome" title={last ? new Date(last.at).toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB') : undefined}><strong>{label}</strong>{last && <small>{fmtWait(now - last.at)}</small>}</div>
                          : <span className="crm-empty-value">—</span>;
                      })()}
                    </td>
                  )}

                  {/* Next follow-up: the client's next task (red when late), else its follow-up date */}
                  {visibleColumns.nextAction && (
                    <td data-label={isAr ? 'المتابعة التالية' : 'Next follow-up'}>
                      {(() => {
                        const task = nextTaskFor(allTasks, l.id);
                        const note = formatFollowUp(l.nextActionNote || l.followUp, isAr);
                        const day = localDayKey(now);
                        const taskLate = task ? bucketOf(task, now) === 'overdue' : false;
                        const overdue = task ? taskLate : isOverdue(l, day);
                        const today = !overdue && (task ? bucketOf(task, now) === 'today' : isDueToday(l, day));
                        const when = l.nextFollowUpAt ? new Date(l.nextFollowUpAt) : null;
                        const whenLabel = task
                          ? dueLabel(task, isAr, now)
                          : overdue
                            ? (isAr ? 'متأخرة' : 'Overdue')
                            : today
                              ? (isAr ? 'النهارده' : 'Today')
                              : (when && !Number.isNaN(when.getTime()) ? new Intl.DateTimeFormat(isAr ? 'ar-EG-u-nu-latn' : 'en', { day: 'numeric', month: 'short' }).format(when) : '');
                        const text = task ? task.title : note;
                        return (
                          <div
                            className={`crm-next ${overdue ? 'is-overdue' : today ? 'is-today' : ''}`}
                            onClick={() => setQuickDrawerLead(l)}
                            title={isAr ? 'انقر لتحديث المتابعة والمعاينة السريعة' : 'Click to update next action'}
                          >
                            {text || whenLabel ? (
                              <>
                                {whenLabel && <span className="crm-next__when"><Clock size={13} aria-hidden="true" />{whenLabel}</span>}
                                {text && <span className="crm-next__note" title={text}>{text}</span>}
                              </>
                            ) : (
                              <span className="crm-next-action-empty">
                                <Plus size={14} aria-hidden="true" />{isAr ? 'حدد متابعة' : 'Add action'}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  )}

                  {/* Agent */}
                  {visibleColumns.agent && (
                    <td data-label={isAr ? 'المسؤول' : 'Agent'}>
                      <div className="crm-agent-select-wrap">
                        <div className="crm-agent-avatar-sm">
                          {(l.ownerName || l.claimedBy || (l.assignedTo && l.assignedTo !== 'Unassigned' ? l.assignedTo : '—')).charAt(0)}
                        </div>
                        <select 
                          disabled={!canEdit}
                          value={assigneeValue(l)}
                          aria-label={isAr ? `المسؤول عن ${l.name || 'العميل'}` : `Owner of ${l.name || 'lead'}`}
                          onChange={(e) => {
                            const prevValue = assigneeValue(l);
                            const choice = e.target.value;
                            const shown = personFor(choice, teamMembers)?.name || choice;
                            if (onUpdateLead) {
                              onUpdateLead(l.id, {
                                ...assignmentUpdates(l, choice, teamMembers),
                                lastActivityAt: new Date().toISOString()
                              }, l.version);
                              triggerToast?.(
                                isAr ? `تم تعيين (${l.name || 'العميل'}) للمسؤول: ${shown}` : `Assigned ${l.name || 'lead'} to ${shown}`,
                                'success',
                                {
                                  onUndo: () => {
                                    onUpdateLead(l.id, { ...assignmentUpdates(l, prevValue, teamMembers), assignedTo: l.assignedTo || 'Unassigned', lastActivityAt: new Date().toISOString() });
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
                          <DeskOptions role={activeRole} current={assigneeValue(l)} lang={lang} people={teamMembers} />
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
                      isSuperAdmin={canDeleteLeads ?? isSuperAdmin}
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
