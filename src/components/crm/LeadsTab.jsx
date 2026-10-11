import { Download, Building, Users, User, Inbox, MessageSquare, Edit3, Trash2, Clock, Zap, Plus, UserPlus, Send, Archive } from 'lucide-react';
import { SOHAG_AREAS } from '../../data/propertiesData';
import { formatFollowUp, formatBudget } from '../../utils/crmLabels';
import DeskOptions from './DeskOptions';
import ExportMenu from './ExportMenu';
import DataImportModal from './DataImportModal';
import { getAreas } from '../../utils/areasData';
import { useState, useMemo, useEffect } from 'react';
import LostReasonModal from './LostReasonModal';
import MergeLeadsModal from './MergeLeadsModal';
import { LEAD_SOURCES, LEAD_SORTS, LOST_REASONS, leadSourceKey, waitingMs, RESPONSE_SLA_MS, isOverdue, isUnassigned, isStale, localDayKey, getLeadVisitDate, getLeadVisitSlot, isViewingLead, isSellerLead, isAccountLead } from '../../utils/crmLeadViews';
import { useProperties } from '../../context/PropertiesContext';
import LeadScorePill from './LeadScorePill';

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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--crm-danger)', color: 'var(--crm-danger)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
          🚨 {isAr ? 'اليوم' : 'Today'} • {vd} {vs ? `(${vs})` : ''}
        </span>
      );
    }
    if (isTomorrow) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
          ⚡ {isAr ? 'بكرة' : 'Tomorrow'} • {vd} {vs ? `(${vs})` : ''}
        </span>
      );
    }
    if (isPast) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(100, 116, 139, 0.2)', color: 'var(--crm-muted)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
          ⌛ {isAr ? 'فات موعده' : 'Past'} • {vd} {vs ? `(${vs})` : ''}
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.3)', color: 'var(--crm-accent-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
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
  return (
    <div className="crm-table-container">
      {lostFor && (
        <LostReasonModal
          lead={lostFor}
          isAr={isAr}
          onCancel={() => setLostFor(null)}
          onConfirm={({ lostReason, lostNote }) => {
            onUpdateLead?.(lostFor.id, { status: 'lost', lostReason, lostNote, lostAt: new Date().toISOString() });
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} className="text-gold" />
            {isAr ? 'قاعدة بيانات العملاء الشاملة' : 'Customer 360° Database'}
          </h3>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
            {isAr ? `إجمالي العملاء: ${leads.length} عميل | المطابق للفلتر: ${filteredLeads.length}` : `Total Leads: ${leads.length} | Filtered: ${filteredLeads.length}`}
          </span>
        </div>

        {/* Quick Add Lead & Export Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {canEdit && <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setShowAddLeadModal(true)}
            style={{
              background: 'var(--gradient-gold)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(217, 119, 6, 0.3)'
            }}
          >
            <UserPlus size={15} />
            <span>{isAr ? 'إضافة عميل جديد ➕' : 'Add New Lead ➕'}</span>
          </button>}
          {onImportLeads && (
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setImportOpen(true)}
              title={isAr ? 'استيراد عملاء من Excel أو CSV أو JSON' : 'Import clients from a file'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={15} style={{ transform: 'rotate(180deg)' }} />
              <span>{isAr ? 'استيراد' : 'Import'}</span>
            </button>
          )}
          {canExport && (
            // Exports what is on screen (current filter and search)
            <ExportMenu
              label={isAr ? `تصدير (${filteredLeads.length})` : `Export (${filteredLeads.length})`}
              disabled={filteredLeads.length === 0}
              onExport={(format) => handleExportCSV(filteredLeads, format)}
            />
          )}
        </div>
      </div>

      {/* 🚀 QUICK PRIORITY TRIAGE BAR (جديد محدش رد، طلبات معاينة، عروض بيع، حسابات) */}
      <div className="crm-priority-triage-bar" style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '14px',
        padding: '10px 14px',
        background: 'var(--crm-card-bg, rgba(255, 255, 255, 0.03))',
        border: '1px solid var(--crm-border, rgba(255, 255, 255, 0.08))',
        borderRadius: '10px'
      }}>
        {/* 1. 🆕 جديد محدش ردّ عليه */}
        <button
          type="button"
          className={`table-filter-btn ${leadFilter === 'unanswered' ? 'active' : ''}`}
          onClick={() => { setLeadFilter('unanswered'); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 13px',
            fontSize: 'var(--crm-text-sm)',
            fontWeight: '600',
            border: leadFilter === 'unanswered' ? '1px solid var(--crm-danger, #ef4444)' : '1px solid rgba(239, 68, 68, 0.25)',
            background: leadFilter === 'unanswered' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.07)',
            color: 'var(--crm-ink)'
          }}
        >
          <span>🆕 {isAr ? 'جديد محدش ردّ عليه' : 'Unanswered / New'}</span>
          <span className="badge" style={{ background: 'var(--crm-danger, #ef4444)', color: '#fff', fontSize: '11px', padding: '2px 7px', borderRadius: '12px' }}>
            {counts.unanswered}
          </span>
        </button>

        {/* 2. 👁 طلبات معاينة */}
        <button
          type="button"
          className={`table-filter-btn ${leadFilter === 'viewing_request' ? 'active' : ''}`}
          onClick={() => { setLeadFilter('viewing_request'); setLeadSort?.('visit_date'); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 13px',
            fontSize: 'var(--crm-text-sm)',
            fontWeight: '600',
            border: leadFilter === 'viewing_request' ? '1px solid var(--crm-accent, #d97706)' : '1px solid rgba(217, 119, 6, 0.25)',
            background: leadFilter === 'viewing_request' ? 'rgba(217, 119, 6, 0.2)' : 'rgba(217, 119, 6, 0.07)',
            color: 'var(--crm-ink)'
          }}
        >
          <span>👁 {isAr ? 'طلبات معاينة' : 'Viewing Requests'}</span>
          {counts.viewingUnanswered > 0 ? (
            <span className="badge" style={{ background: 'var(--crm-accent, #d97706)', color: '#fff', fontSize: '11px', padding: '2px 7px', borderRadius: '12px' }}>
              {counts.viewings} ({counts.viewingUnanswered} {isAr ? 'معلق' : 'pending'})
            </span>
          ) : (
            <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--crm-muted)', fontSize: '11px', padding: '2px 7px', borderRadius: '12px' }}>
              {counts.viewings}
            </span>
          )}
        </button>

        {/* 3. 🏠 عروض بيع */}
        <button
          type="button"
          className={`table-filter-btn ${leadFilter === 'seller' ? 'active' : ''}`}
          onClick={() => { setLeadFilter('seller'); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 13px',
            fontSize: 'var(--crm-text-sm)',
            fontWeight: '600',
            border: leadFilter === 'seller' ? '1px solid var(--crm-positive, #10b981)' : '1px solid rgba(16, 185, 129, 0.25)',
            background: leadFilter === 'seller' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.07)',
            color: 'var(--crm-ink)'
          }}
        >
          <span>🏠 {isAr ? 'عروض بيع' : 'Seller Listings'}</span>
          {counts.sellerUnanswered > 0 ? (
            <span className="badge" style={{ background: 'var(--crm-positive, #10b981)', color: '#fff', fontSize: '11px', padding: '2px 7px', borderRadius: '12px' }}>
              {counts.sellers} ({counts.sellerUnanswered} {isAr ? 'معلق' : 'pending'})
            </span>
          ) : (
            <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--crm-muted)', fontSize: '11px', padding: '2px 7px', borderRadius: '12px' }}>
              {counts.sellers}
            </span>
          )}
        </button>

        {/* 4. 👤 حسابات جديدة */}
        <button
          type="button"
          className={`table-filter-btn ${leadFilter === 'account' ? 'active' : ''}`}
          onClick={() => { setLeadFilter('account'); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 13px',
            fontSize: 'var(--crm-text-sm)',
            fontWeight: '600',
            border: leadFilter === 'account' ? '1px solid var(--crm-info, #0ea5e9)' : '1px solid rgba(14, 165, 233, 0.25)',
            background: leadFilter === 'account' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.07)',
            color: 'var(--crm-ink)'
          }}
        >
          <span>👤 {isAr ? 'حسابات جديدة' : 'New Accounts'}</span>
          {counts.accountUnanswered > 0 ? (
            <span className="badge" style={{ background: 'var(--crm-info, #0ea5e9)', color: '#fff', fontSize: '11px', padding: '2px 7px', borderRadius: '12px' }}>
              {counts.accounts} ({counts.accountUnanswered} {isAr ? 'جديد' : 'new'})
            </span>
          ) : (
            <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--crm-muted)', fontSize: '11px', padding: '2px 7px', borderRadius: '12px' }}>
              {counts.accounts}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Multi-Filters Toolbar */}
      <div className="crm-table-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
        {/* Stage & Workflow Quick Tabs */}
        <div className="table-filters" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <button className={`table-filter-btn ${leadFilter === 'all' ? 'active' : ''}`} onClick={() => setLeadFilter('all')}>
            {isAr ? 'كل العملاء' : 'All Leads'} ({counts.all})
          </button>
          <button className={`table-filter-btn ${leadFilter === 'viewing_request' ? 'active' : ''}`} onClick={() => { setLeadFilter('viewing_request'); setLeadSort?.('visit_date'); }}>
            👁 {isAr ? 'طلبات معاينة' : 'Viewing Requests'} ({counts.viewings})
          </button>
          <button className={`table-filter-btn ${leadFilter === 'buyer' ? 'active' : ''}`} onClick={() => setLeadFilter('buyer')}>
            {isAr ? 'طلبات شراء' : 'Buyers'} ({counts.buyers})
          </button>
          <button className={`table-filter-btn ${leadFilter === 'seller' ? 'active' : ''}`} onClick={() => setLeadFilter('seller')}>
            {isAr ? 'عروض بيع' : 'Sellers'} ({counts.sellers})
          </button>
          <button className={`table-filter-btn ${leadFilter === 'account' ? 'active' : ''}`} onClick={() => setLeadFilter('account')}>
            👤 {isAr ? 'حسابات جديدة' : 'Accounts'} ({counts.accounts})
          </button>
          <button className={`table-filter-btn ${leadFilter === 'new' ? 'active' : ''}`} onClick={() => setLeadFilter('new')}>
            ✨ {isAr ? 'عملاء جدد' : 'New Leads'} ({counts.fresh})
          </button>
          <button
            className={`table-filter-btn ${leadFilter === 'awaiting' ? 'active' : ''}`}
            onClick={() => setLeadFilter('awaiting')}
            title={isAr ? 'عملاء جدد محدش كلمهم لسه' : 'New leads nobody has contacted yet'}
            style={{ color: counts.late > 0 && leadFilter !== 'awaiting' ? 'var(--crm-danger)' : undefined }}
          >
            ⏱️ {isAr ? 'مستني رد' : 'Awaiting reply'} ({counts.awaiting}{counts.late > 0 ? (isAr ? ` · ${counts.late} متأخر` : ` · ${counts.late} late`) : ''})
          </button>
          <button className={`table-filter-btn ${leadFilter === 'due' ? 'active' : ''}`} onClick={() => setLeadFilter('due')}>
            ⏰ {isAr ? 'متابعة اليوم' : 'Due Today'}
          </button>
          {counts.overdue > 0 && (
            <button className={`table-filter-btn ${leadFilter === 'overdue' ? 'active' : ''}`} onClick={() => setLeadFilter('overdue')} style={{ color: leadFilter !== 'overdue' ? 'var(--crm-danger)' : undefined }}>
              ⚠ {isAr ? 'متابعات متأخرة' : 'Overdue'} ({counts.overdue})
            </button>
          )}
          {counts.unassigned > 0 && (
            <button className={`table-filter-btn ${leadFilter === 'unassigned' ? 'active' : ''}`} onClick={() => setLeadFilter('unassigned')}>
              👤 {isAr ? 'بدون مسؤول' : 'Unassigned'} ({counts.unassigned})
            </button>
          )}
          {counts.stale > 0 && (
            <button className={`table-filter-btn ${leadFilter === 'stale' ? 'active' : ''}`} onClick={() => setLeadFilter('stale')} title={isAr ? 'مفيش أي نشاط من أكتر من 48 ساعة' : 'No activity for 48h+'}>
              💤 {isAr ? 'راكد' : 'Stale'} ({counts.stale})
            </button>
          )}
          <button className={`table-filter-btn ${leadFilter === 'qualified' ? 'active' : ''}`} onClick={() => setLeadFilter('qualified')}>
            🎯 {isAr ? 'مؤهلون للشراء' : 'Qualified'}
          </button>
          <button className={`table-filter-btn ${leadFilter === 'buyer' ? 'active' : ''}`} onClick={() => setLeadFilter('buyer')}>
            {isAr ? 'طلبات شراء' : 'Buyers'}
          </button>
          <button className={`table-filter-btn ${leadFilter === 'seller' ? 'active' : ''}`} onClick={() => setLeadFilter('seller')}>
            {isAr ? 'عروض بيع' : 'Sellers'}
          </button>
          <button className={`table-filter-btn ${leadFilter === 'investor' ? 'active' : ''}`} onClick={() => setLeadFilter('investor')}>
            💎 {isAr ? 'مستثمرون VIP' : 'Investors'}
          </button>
          <button className={`table-filter-btn ${leadFilter === 'archived' ? 'active' : ''}`} onClick={() => setLeadFilter('archived')} style={{ color: leadFilter === 'archived' ? 'var(--crm-warn)' : undefined }}>
            📦 {isAr ? 'المؤرشفون' : 'Archived'} ({counts.archived})
          </button>
          <button className={`table-filter-btn ${leadFilter === 'lost' ? 'active' : ''}`} onClick={() => setLeadFilter('lost')}>
            ✖ {isAr ? 'صفقات خسرانة' : 'Lost'} ({counts.lost})
          </button>
          {counts.dupes > 0 && (
            <button className={`table-filter-btn ${leadFilter === 'dupes' ? 'active' : ''}`} onClick={() => setLeadFilter('dupes')} style={{ color: leadFilter !== 'dupes' ? 'var(--crm-warn)' : undefined }}>
              ⧉ {isAr ? 'مكرر' : 'Duplicates'} ({counts.dupes})
            </button>
          )}
        </div>

        {/* Secondary Filters (Temperature & Area) */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Temperature Filter */}
          <select
            value={temperatureFilter}
            aria-label={isAr ? 'تصفية حسب درجة الاهتمام' : 'Filter by temperature'}
            onChange={(e) => setTemperatureFilter(e.target.value)}
            className="form-input"
            style={{ padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: 'var(--radius-pill)', width: 'auto' }}
          >
            <option value="all">🌡️ {isAr ? 'كل درجات الحرارة' : 'All Temperatures'}</option>
            <option value="hot">🔥 {isAr ? 'ساخن جداً' : 'Hot'}</option>
            <option value="warm">⚡ {isAr ? 'دافئ' : 'Warm'}</option>
            <option value="cold">❄️ {isAr ? 'بارد' : 'Cold'}</option>
            <option value="unknown">{isAr ? 'غير محدد' : 'Not set'}</option>
          </select>

          {/* Source, date range and sort */}
          {setSourceFilter && (
            <select
              value={sourceFilter}
              aria-label={isAr ? 'تصفية حسب المصدر' : 'Filter by source'}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="form-input"
              style={{ padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: 'var(--radius-pill)', width: 'auto' }}
            >
              <option value="all">🔗 {isAr ? 'كل المصادر' : 'All sources'}</option>
              {LEAD_SOURCES.map((s) => <option key={s.id} value={s.id}>{isAr ? s.ar : s.en}</option>)}
            </select>
          )}
          {setDateFilter && (
            <select
              value={dateFilter}
              aria-label={isAr ? 'تصفية حسب تاريخ الإضافة' : 'Filter by date added'}
              onChange={(e) => setDateFilter(e.target.value)}
              className="form-input"
              style={{ padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: 'var(--radius-pill)', width: 'auto' }}
            >
              <option value="all">📅 {isAr ? 'كل الأوقات' : 'Any time'}</option>
              <option value="today">{isAr ? 'النهارده' : 'Today'}</option>
              <option value="7d">{isAr ? 'آخر 7 أيام' : 'Last 7 days'}</option>
              <option value="30d">{isAr ? 'آخر 30 يوم' : 'Last 30 days'}</option>
              <option value="month">{isAr ? 'الشهر ده' : 'This month'}</option>
            </select>
          )}
          {setLeadSort && (
            <select
              value={leadSort}
              aria-label={isAr ? 'ترتيب العملاء' : 'Sort leads'}
              onChange={(e) => setLeadSort(e.target.value)}
              className="form-input"
              style={{ padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: 'var(--radius-pill)', width: 'auto' }}
            >
              {LEAD_SORTS.map((o) => <option key={o.id} value={o.id}>↕ {isAr ? o.ar : o.en}</option>)}
            </select>
          )}

          {/* Area Filter */}
          <select
            value={areaFilter}
            aria-label={isAr ? 'تصفية حسب المنطقة' : 'Filter by area'}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="form-input"
            style={{ padding: '6px 10px', fontSize: 'var(--crm-text-xs)', borderRadius: 'var(--radius-pill)', width: 'auto' }}
          >
            <option value="all">📍 {isAr ? 'كل مناطق سوهاج' : 'All Areas'}</option>
            {SOHAG_AREAS.filter(a => a.id !== 'all').map(a => (
              <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name_en}</option>
            ))}
          </select>

          {/* Text Search */}
          <input 
            type="text" 
            placeholder={isAr ? 'بحث بالاسم، الهاتف، الوسم، الاغتراب...' : 'Search name/phone/tag...'} 
            className="form-input" 
            style={{ padding: '6px 14px', fontSize: 'var(--crm-text-sm)', width: '220px', borderRadius: 'var(--radius-pill)' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runServerSearch(); }}
          />
          {searchQuery.trim().length >= 2 && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={runServerSearch}
              disabled={serverSearching}
              title={isAr ? 'يدوّر في كل العملاء على السيرفر، مش بس اللي ظاهرين: رقم موبايل بأي صيغة أو أول الاسم' : 'Searches every client on the server: a phone in any format or the start of a name'}
              style={{ borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}
            >
              {serverSearching ? (isAr ? 'جاري البحث…' : 'Searching…') : (isAr ? 'ابحث في كل العملاء' : 'Search all clients')}
            </button>
          )}
        </div>
      </div>

      {/* ⚡ BULK ACTIONS FLOATING TOOLBAR */}
      {selectedLeadIds.length > 0 && (
        <div style={{
          background: 'rgba(217, 119, 6, 0.12)',
          border: '1px solid var(--crm-accent)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 16px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={{ background: 'var(--crm-accent)', color: 'var(--crm-on-accent)', fontWeight: 'bold' }}>
              {selectedLeadIds.length} {isAr ? 'عميل محدد' : 'selected'}
            </span>
            <span style={{ fontSize: 'var(--crm-text-sm)', color: 'var(--crm-ink)' }}>
              {isAr ? 'إجراءات جماعية فورية:' : 'Bulk Actions:'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Bulk Assign Agent Dropdown */}
            {canEdit && <select
              aria-label={isAr ? 'تعيين مسؤول للعملاء المحددين' : 'Assign selected leads'}
              onChange={(e) => {
                if (e.target.value) handleBulkAssign(e.target.value);
              }}
              className="form-input"
              style={{ padding: '4px 8px', fontSize: 'var(--crm-text-xs)', width: 'auto' }}
              defaultValue=""
            >
              <option value="" disabled>👥 {isAr ? 'تعيين مسؤول جماعي...' : 'Assign Agent...'}</option>
              <DeskOptions role={activeRole} lang={lang} />
            </select>}

            {/* Bulk Export */}
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={handleBulkExportSelected}
              style={{ padding: '4px 10px', fontSize: 'var(--crm-text-xs)' }}
            >
              <Download size={13} />
              <span>{isAr ? 'تصدير المحدد (CSV)' : 'Export CSV'}</span>
            </button>

            {/* Bulk Delete (Super Admin Only) */}
            {isSuperAdmin && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleBulkDelete}
                style={{ padding: '4px 10px', fontSize: 'var(--crm-text-xs)', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--rose)', border: '1px solid var(--rose)' }}
              >
                <Trash2 size={13} />
                <span>{isAr ? 'حذف المحدد' : 'Delete'}</span>
              </button>
            )}

            {/* Clear Selection */}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setSelectedLeadIds([])}
              style={{ padding: '4px 8px', fontSize: 'var(--crm-text-xs)' }}
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
      <div className="crm-table-scroll-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
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
            <th>{isAr ? 'المواصفات والميزانية' : 'Requirements'}</th>
            {leadFilter === 'viewing_request' && <th style={{ minWidth: '150px' }}>{isAr ? 'الميعاد المطلوب' : 'Requested Schedule'}</th>}
            <th>{isAr ? 'الجدية والحرارة' : 'Score & Temp'}</th>
            <th>{isAr ? 'الحالة' : 'Status'}</th>
            <th>{isAr ? 'المتابعة القادمة' : 'Next Action'}</th>
            <th>{isAr ? 'المسؤول' : 'Agent'}</th>
            <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {filteredLeads.length === 0 ? (
            <tr>
              <td colSpan={leadFilter === 'viewing_request' ? 9 : 8} style={{ textAlign: 'center', padding: '40px', color: 'var(--crm-muted)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <Inbox size={32} style={{ color: 'var(--crm-accent-text)' }} />
                  <span style={{ fontSize: 'var(--crm-text-base)' }}>{isAr ? 'لم يتم العثور على أي عملاء يطابقون خيارات البحث الحالية.' : 'No leads found.'}</span>
                </div>
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
                  style={{ background: isSelected ? 'rgba(217, 119, 6, 0.05)' : undefined }}
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
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Real button: keyboard reachable, and never an invisible empty link when the name is missing */}
                        <button
                          type="button"
                          className="crm-lead-name-btn"
                          onClick={() => setQuickDrawerLead(l)}
                          title={isAr ? 'فتح المعاينة السريعة وتسجيل المكالمة' : 'Open Quick Drawer'}
                        >
                          {l.name?.trim() || <span className="crm-empty-value">{isAr ? 'عميل بدون اسم' : 'Unnamed lead'}</span>}
                        </button>
                        {l.cityOrExpat && l.cityOrExpat !== 'سوهاج' && (
                          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--cyan)', background: 'var(--cyan-bg)', padding: '1px 5px', borderRadius: '4px' }}>
                            ✈️ {l.cityOrExpat}
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}><bdi>{l.phone || l.whatsapp || '—'}</bdi></span>

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
                          <button type="button" className="crm-lead-chip is-dupe" onClick={() => openMerge(l)} title={isAr ? 'نفس الرقم مسجل في عميل تاني' : 'Same phone on another lead'}>
                            ⧉ {isAr ? `مكرر (${dupCount + 1})` : `Duplicate (${dupCount + 1})`}
                          </button>
                        )}
                        {l.status === 'lost' && l.lostReason && (
                          <span className="crm-lead-chip is-lost" title={l.lostNote || ''}>✖ {(() => { const r = LOST_REASONS.find((x) => x.id === l.lostReason); return r ? (isAr ? r.ar : r.en) : l.lostReason; })()}</span>
                        )}
                      </div>

                      {/* Tags Display */}
                      {l.tags && l.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                          {l.tags.slice(0, 2).map((t, i) => (
                            <span key={i} style={{ fontSize: 'var(--crm-text-xs)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px', color: 'var(--crm-accent-text)' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Requirements */}
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

                  {/* Requested Schedule Column (for viewing_request) */}
                  {leadFilter === 'viewing_request' && (
                    <td data-label={isAr ? 'الميعاد المطلوب' : 'Schedule'}>
                      {renderVisitBadge(l)}
                    </td>
                  )}

                  {/* Score & Temperature */}
                  <td data-label={isAr ? 'الجدية والحرارة' : 'Score & Temp'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LeadScorePill lead={l} isAr={isAr} />
                      <span title={temp === 'hot' ? 'عميل ساخن للشراء' : temp === 'warm' ? 'عميل دافئ' : temp === 'cold' ? 'عميل مستكشف' : (isAr ? 'درجة الحرارة غير محددة' : 'Temperature not set')}>
                        {temp === 'hot' ? '🔥' : temp === 'warm' ? '⚡' : temp === 'cold' ? '❄️' : <span className="crm-empty-value">—</span>}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td data-label={isAr ? 'الحالة' : 'Status'}>
                    <div className={`crm-status-select-wrap status-pill-${l.status || 'new'}`}>
                      <span className="crm-status-dot" />
                      <select 
                        disabled={!canEdit}
                        value={l.status || 'new'} 
                        aria-label={isAr ? `حالة ${l.name || 'العميل'}` : `Status of ${l.name || 'lead'}`}
                        data-status={l.status || 'new'}
                        onChange={(e) => {
                          if (e.target.value === 'lost') { setLostFor(l); return; }
                          if (onUpdateLead) onUpdateLead(l.id, { status: e.target.value, ...(l.status === 'lost' ? { lostReason: null, lostNote: null, lostAt: null } : {}) });
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

                  {/* Next Action / Follow-up */}
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

                  {/* Agent */}
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
                          if (onUpdateLead) onUpdateLead(l.id, { assignedTo: e.target.value });
                        }}
                        className="crm-agent-select"
                        title={isAr ? 'تعيين مسؤول المبيعات' : 'Assign Agent'}
                      >
                        <DeskOptions role={activeRole} current={l.assignedTo || 'Unassigned'} lang={lang} />
                      </select>
                    </div>
                  </td>

                  {/* Actions */}
                  <td data-label={isAr ? 'الإجراءات' : 'Actions'}>
                    <div className="crm-action-group">
                      {/* Quick Drawer Fast Inspection */}
                      <button
                        type="button"
                        className="crm-btn-quick"
                        onClick={() => setQuickDrawerLead(l)}
                        title={isAr ? 'معاينة سريعة وتسجيل مكالمة' : 'Quick Drawer'}
                      >
                        <Zap size={13} />
                        <span>{isAr ? 'سريع' : 'Quick'}</span>
                      </button>

                      {/* WhatsApp Direct Contact */}
                      <button 
                        type="button"
                        className="crm-icon-btn is-whatsapp" 
                        onClick={() => onWhatsAppClick(l)} 
                        title={isAr ? 'محادثة العميل مباشرة عبر واتساب' : 'WhatsApp'}
                      >
                        <MessageSquare size={13} />
                      </button>

                      {/* 360° Profile */}
                      <button
                        type="button"
                        className="crm-icon-btn"
                        onClick={() => setViewingProfileLead(l)}
                        title={isAr ? 'فتح ملف العميل الشامل 360°' : 'Profile 360°'}
                      >
                        <User size={13} />
                      </button>

                      {/* Edit Modal */}
                      {canEdit && (
                        <button
                          type="button"
                          className="crm-icon-btn"
                          onClick={() => handleOpenEditLead(l)}
                          title={isAr ? 'تعديل بيانات العميل' : 'Edit'}
                        >
                          <Edit3 size={13} />
                        </button>
                      )}

                      {/* Dispatch Lead via WhatsApp */}
                      <button 
                        type="button"
                        className="crm-icon-btn" 
                        onClick={() => onDispatchLeadClick(l)} 
                        title={isAr ? 'إحالة بيانات العميل لمسؤول المبيعات عبر واتساب' : 'Dispatch'}
                      >
                        <Send size={12} />
                      </button>

                      {/* Convert to Property */}
                      {onConvertToProperty && canEdit && (
                        <button 
                          type="button"
                          className="crm-icon-btn" 
                          onClick={() => onConvertToProperty(l)}
                          title={isAr ? 'تحويل لعقار معروض بالموقع' : 'Convert'}
                        >
                          <Building size={12} />
                        </button>
                      )}

                      {/* Claim Lead */}
                      {canClaimLead(l) && (
                        <button
                          type="button"
                          className="crm-icon-btn"
                          onClick={() => handleClaimLead(l.id)}
                          title={isAr ? 'استلام هذا العميل (غير مسند) لفريقك' : 'Claim this unassigned lead for your team'}
                        >
                          <UserPlus size={12} />
                        </button>
                      )}

                      {/* Archive Lead Toggle */}
                      {canEdit && <button
                        type="button"
                        className="crm-icon-btn"
                        onClick={() => {
                          const newStatus = l.isArchived ? false : true;
                          if (onUpdateLead) {
                            onUpdateLead(l.id, { isArchived: newStatus });
                          }
                          triggerToast(isAr ? (newStatus ? 'تم نقل العميل للأرشيف 📦' : 'تم استعادة العميل من الأرشيف') : (newStatus ? 'Lead archived' : 'Lead restored'), 'info');
                        }}
                        title={l.isArchived ? (isAr ? 'استعادة من الأرشيف' : 'Unarchive') : (isAr ? 'أرشفة العميل' : 'Archive')}
                      >
                        <Archive size={12} />
                      </button>}

                      {/* Delete Lead (Super Admin Only) */}
                      {isSuperAdmin && (
                        <button 
                          type="button"
                          className="crm-icon-btn is-danger" 
                          onClick={() => handleDeleteLeadClick(l.id, l.name)} 
                          title={isAr ? 'حذف العميل نهائياً' : 'Delete'}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {leadsHasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px' }}>
          <button type="button" className="btn btn-outline" onClick={loadMoreLeads}>
            {isAr ? `عرض عملاء أقدم (المعروض الآن أحدث ${leads.length})` : `Load older clients (showing newest ${leads.length})`}
          </button>
        </div>
      )}
    </div>
    </div>

  );
}
