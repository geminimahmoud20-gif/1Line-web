import { useState, useMemo, useEffect, useRef } from 'react';
import { Building2, BarChart3, ChevronDown, ChevronUp, Columns3, Rows3, MessageSquare, Calendar, Car, Clock, Edit3, Trash2, ChevronRight, ChevronLeft, AlertTriangle, Search, FolderOpen, MoreHorizontal, ShieldAlert, TrendingUp, Users, Archive, Hourglass, CopyPlus, ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import SiteVisitModal from './SiteVisitModal';
import './crm-kanban.css';
import { getAreas } from '../../utils/areasData';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { leadScore, isOpenLead, isSellerLead, isAccountLead, duplicatesById, pipelineOverviewOf, phoneMatchesQuery } from '../../utils/crmLeadViews';
import { normalizeArabicText } from '../../utils/semanticSearchEngine';
import { SELLER_STAGES, pipelineKind, askingPriceOf } from '../../utils/leadPipeline';
import { ownerMessageFor } from '../../utils/ownerMessages';
import { clientRoleOf } from '../../utils/clientRole';
import { boardColumnOf, PROGRESS_STAGE_IDS } from '../../utils/dealStages';
import LostReasonModal from './LostReasonModal';
import { validateStageTransition, HIGH_VALUE_DEAL_THRESHOLD } from '../../services/stateMachineEngine';
import { guardStage } from '../../utils/stageGate';
import { formatPhoneNumber } from '../../utils/crmNoteSanitizer';
import { PageHeader, KpiRow, KpiTile, Chip, Button, useConfirm } from '../ui';
import { archivePrompt } from '../../utils/deleteConfirm';
import './kanban-redesign.css';
import './kanban-mobile.css';
import './kanban-decision.css';
import './client-card.css';
import { stageSinceMs, isStalled, daysLabel, shortMoney, moneyScale, STALE_DAYS } from '../../utils/pipelineCards';
import PhoneText from './PhoneText';
import { attentionOf, decisionList, attentionSummary, sortByAttention, BIG_DEAL } from '../../utils/dealSignals';

const CARDS_PER_STAGE = 5;

// Seven columns: five steps ending in «إغلاق» (a lead in the old «توقيع وحجز» step sits there too), then
// غير متفاعل and خسارة. Same status ids as before (utils/dealStages).
const BASE_STAGES = [
  { id: 'new', title_ar: 'عملاء محتملين', title_en: 'Leads', color: 'var(--crm-info)', bg: 'var(--crm-info-soft)' },
  { id: 'contacted', title_ar: 'مؤهل (تأهيل الطلب)', title_en: 'Qualified', color: 'var(--crm-violet)', bg: 'var(--crm-violet-soft)' },
  { id: 'site_visit', title_ar: 'معاينة وزيارة', title_en: 'Meeting / viewing', color: 'var(--crm-accent-text)', bg: 'var(--crm-warn-soft)' },
  { id: 'negotiating', title_ar: 'تفاوض وعروض', title_en: 'Negotiation', color: 'var(--crm-warn)', bg: 'var(--crm-warn-soft)' },
  { id: 'closed', title_ar: 'إغلاق وحجز', title_en: 'Closed', color: 'var(--crm-positive)', bg: 'var(--crm-positive-soft)' },
  { id: 'inactive', title_ar: 'غير متفاعل', title_en: 'Unresponsive', color: 'var(--crm-muted)', bg: 'var(--crm-line)' },
  { id: 'lost', title_ar: 'خسارة', title_en: 'Lost', color: 'var(--crm-danger)', bg: 'var(--crm-danger-soft)' }
];
// The first five columns are steps forward; «next» and «back» only move inside them
const PROGRESS_COUNT = PROGRESS_STAGE_IDS.length;

// Seven stages tailored for seller / owner supply pipeline
const SELLER_COLUMNS = [
  { id: 'new', title_ar: 'عروض بيع جديدة', title_en: 'New listings', color: 'var(--crm-info)', bg: 'var(--crm-info-soft)' },
  { id: 'contacted', title_ar: 'مؤهل (تأكيد العقار)', title_en: 'Qualified (verified)', color: 'var(--crm-violet)', bg: 'var(--crm-violet-soft)' },
  { id: 'site_visit', title_ar: 'معاينة وتثمين', title_en: 'Inspection & valuation', color: 'var(--crm-accent-text)', bg: 'var(--crm-warn-soft)' },
  { id: 'negotiating', title_ar: 'معروض للبيع وتفاوض', title_en: 'Listed & negotiating', color: 'var(--crm-warn)', bg: 'var(--crm-warn-soft)' },
  { id: 'closed', title_ar: 'تم البيع بنجاح', title_en: 'Closed (sold)', color: 'var(--crm-positive)', bg: 'var(--crm-positive-soft)' },
  { id: 'inactive', title_ar: 'غير متفاعل', title_en: 'Unresponsive', color: 'var(--crm-muted)', bg: 'var(--crm-line)' },
  { id: 'lost', title_ar: 'تراجع المالك / خسارة', title_en: 'Lost / withdrawn', color: 'var(--crm-danger)', bg: 'var(--crm-danger-soft)' }
];
/** A lead's own stage names: an owner's card offers «معروض للبيع», not «تفاوض» */
const stagesOfLead = (lead) => (pipelineKind(lead) === 'seller' ? SELLER_COLUMNS : BASE_STAGES);
// Buyers / owners / investors chips: an owner is anyone who came to sell or value (isSellerLead)
const matchesType = (l, type) => {
  if (type === 'all') return true;
  if (type === 'seller') return isSellerLead(l);
  // Someone who only registered an account has not said whether they buy or sell: their own list until they do
  if (type === 'account') return !isSellerLead(l) && isAccountLead(l);
  if (type === 'buyer') return !isSellerLead(l) && !isAccountLead(l) && l.type !== 'investor';
  return l.type === type;
};

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
  activeRole = 'sales_agent',
  currentUser
}) {
  // Leads sharing a phone: the same person asking more than once shows up as several cards, so say so on each
  const sameNumber = useMemo(() => duplicatesById(leads), [leads]);
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [schedulingVisitLead, setSchedulingVisitLead] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null);
  // A lead dropped on «خسارة» asks why first
  const [lostFor, setLostFor] = useState(null);
  // Two separate pipelines: requests (buyers) and offers (owners and brokers), each with its own stages and card
  const [filterType, setFilterType] = useState('buyer');
  const isPhone = useMediaQuery('(max-width: 640px)');
  const [phoneStage, setPhoneStage] = useState('new');
  // Columns read as an owner's pipeline when only owners are shown
  const PIPELINE_STAGES = filterType === 'seller' ? SELLER_COLUMNS : BASE_STAGES;
  const phoneStageId = PIPELINE_STAGES.some((st) => st.id === phoneStage) ? phoneStage : PIPELINE_STAGES[0].id;
  const [searchQuery, setSearchQuery] = useState('');
  // «محتاج قرار»: show only the deals that need a person today
  const [onlyAttention, setOnlyAttention] = useState(false);
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

  // Executive summary toggle: can collapse KPI cards and decisions strip to give board full height
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_kanban_exec_summary');
      return saved !== null ? saved === '1' : true;
    } catch {
      return true;
    }
  });
  const toggleExecutiveSummary = () => setShowExecutiveSummary((prev) => {
    try { localStorage.setItem('crm_kanban_exec_summary', prev ? '0' : '1'); } catch {}
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
  const confirm = useConfirm();

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

  // Extract lead budget
  const getLeadBudget = (lead) => {
    // An owner's value is the price he asks, wherever it was saved
    const asked = isSellerLead(lead) ? askingPriceOf(lead) : 0;
    if (asked > 0) return asked;
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
      case 'account':
        return { label: isAr ? 'تسجيل حساب · لم يحدد' : 'Account only', bg: 'var(--crm-warn-soft)', color: 'var(--crm-warn)', border: 'var(--crm-warn-line)' };
      case 'investor':
        return { label: isAr ? 'مستثمر' : 'Investor', bg: 'var(--crm-violet-soft)', color: 'var(--crm-violet)', border: 'var(--crm-violet-line)' };
      case 'broker':
        return { label: isAr ? 'وسيط عقاري' : 'Broker', bg: 'var(--crm-info-soft)', color: 'var(--crm-info)', border: 'var(--crm-info-line)' };
      case 'buyer':
      default:
        return { label: isAr ? 'مشتري' : 'Buyer', bg: 'var(--crm-info-soft)', color: 'var(--crm-info)', border: 'var(--crm-info-line)' };
    }
  };

  // "More" menus are <details> disclosures: close them on outside click, Esc, or when the page
  // or board scrolls (the menu is pinned to the screen, so it would drift off its card)
  useEffect(() => {
    const closeAll = (e) => {
      document.querySelectorAll('.kb-more[open]').forEach((d) => {
        if (e.type === 'keydown' ? e.key === 'Escape' : !d.contains(e.target)) d.removeAttribute('open');
      });
    };
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', closeAll);
    document.addEventListener('scroll', closeAll, true);
    return () => {
      document.removeEventListener('click', closeAll);
      document.removeEventListener('keydown', closeAll);
      document.removeEventListener('scroll', closeAll, true);
    };
  }, []);

  // Opened menus sit on the screen next to their "…" button: below it when there is room,
  // above it otherwise, and never past the screen edges
  const placeMenu = (e) => {
    const details = e.currentTarget;
    if (!details.open) return;
    const menu = details.querySelector('.kb-menu');
    const btn = details.querySelector('summary');
    if (!menu || !btn) return;
    const r = btn.getBoundingClientRect();
    const h = menu.offsetHeight;
    const w = menu.offsetWidth;
    const gap = 6;
    const fitsBelow = r.bottom + gap + h <= window.innerHeight - 8;
    const top = fitsBelow ? r.bottom + gap : Math.max(8, r.top - gap - h);
    const left = Math.min(Math.max(8, isAr ? r.left : r.right - w), window.innerWidth - w - 8);
    menu.style.top = `${Math.round(top)}px`;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.visibility = 'visible';
  };
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      // Archived (hidden test or duplicate) requests stay out of the board
      if (l.isArchived) return false;
      if (!matchesType(l, filterType)) return false;
      if (searchQuery.trim()) {
        const q = normalizeArabicText(searchQuery);
        const qDigits = q.replace(/\D/g, '');
        const nameMatch = normalizeArabicText(l.name).includes(q);
        const phoneMatch = [l.phone, l.whatsapp, l.altPhone].some((p) => phoneMatchesQuery(p, qDigits));
        const areaMatch = normalizeArabicText(l.area || l.details?.area || l.location).includes(q);
        const propTypeMatch = normalizeArabicText(l.propertyType || l.details?.propertyType).includes(q);
        if (!nameMatch && !phoneMatch && !areaMatch && !propTypeMatch) return false;
      }
      return true;
    });
  }, [leads, filterType, searchQuery]);

  // Clock for overdue calculations
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // Which deals need a decision today, and the money sitting in them
  const attention = useMemo(() => attentionSummary(filteredLeads.filter(isOpenLead), { now, worth: getLeadBudget, columnOf: (l) => boardColumnOf(l.status) }), [filteredLeads, now]);
  const decisions = useMemo(() => decisionList(filteredLeads.filter(isOpenLead), { now, worth: getLeadBudget, limit: 5 }), [filteredLeads, now]);

  // Pre-grouped leads & metrics by stage in a single O(N) pass
  const { leadsByStage, stageStatsMap } = useMemo(() => {
    const groups = {};
    const stats = {};
    PIPELINE_STAGES.forEach((s) => {
      groups[s.id] = [];
      stats[s.id] = { count: 0, totalVolume: 0, budgetedCount: 0, unbudgetedCount: 0 };
    });
    filteredLeads.forEach((l) => {
      if (onlyAttention && !attentionOf(l, { now, value: getLeadBudget(l) })) return;
      const st = boardColumnOf(l.status);
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
    // Urgent deals lead each column, so the first five cards are the ones to act on
    Object.keys(groups).forEach((k) => { groups[k] = sortByAttention(groups[k], { now, worth: getLeadBudget }); });
    return { leadsByStage: groups, stageStatsMap: stats };
  }, [filteredLeads, PIPELINE_STAGES, onlyAttention, now]);

  // Clients who only registered an account: counted apart so none is forgotten
  const accountCount = useMemo(() => leads.filter((l) => !l.isArchived && isOpenLead(l) && matchesType(l, 'account')).length, [leads]);

  // Executive pipeline metrics overview. Open deals only (not won, lost or archived), counted the same way
  // as the dashboard, and once per phone — two open leads for the same number are an un-merged duplicate
  // (the same client's second form), not two real deals, and would otherwise inflate every total here.
  const pipelineOverview = useMemo(
    () => pipelineOverviewOf(filteredLeads, { worth: getLeadBudget, highValueAt: HIGH_VALUE_DEAL_THRESHOLD }),
    [filteredLeads]
  );

  // Drag & Drop Handlers
  const handleDragStart = (e, leadId) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const STAGE_DEFAULT_OUTCOMES = {
    contacted: { id: 'reached', ar: 'تم التواصل والتأهيل' },
    site_visit: { id: 'viewing_set', ar: 'تم تحديد موعد معاينة' },
    negotiating: { id: 'offer', ar: 'تقديم عرض وتفاوض' },
    closed: { id: 'agreed', ar: 'اتفاق وحجز' }
  };

  const handleDrop = (e, targetStageId) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      const targetLead = leads.find(l => l.id === leadId);
      if (targetLead && boardColumnOf(targetLead.status) === targetStageId) { setDraggedLeadId(null); return; }
      if (targetLead && targetStageId === 'lost') { setLostFor(targetLead); setDraggedLeadId(null); return; }
      if (targetLead && onUpdateLead) {
        const defOutcome = STAGE_DEFAULT_OUTCOMES[targetStageId];
        let outcomePatch = {};
        if (defOutcome && !targetLead.outcomes?.some((o) => o.id === defOutcome.id)) {
          const entry = {
            id: defOutcome.id,
            at: new Date().toISOString(),
            by: String(currentUser?.uid || ''),
            n: String(currentUser?.displayName || 'مسؤول المبيعات').slice(0, 40)
          };
          outcomePatch = {
            outcomes: [...(targetLead.outcomes || []), entry].slice(-30),
            lastOutcome: defOutcome.id,
            lastOutcomeAt: entry.at
          };
        }

        const validation = validateStageTransition(targetLead, targetStageId, {
          userRole: activeRole,
          isFounderApproved: targetLead.isFounderApproved || activeRole === 'super_admin'
        });

        const prevStageId = targetLead.status || 'new';
        const stageObj = PIPELINE_STAGES.find((s) => s.id === targetStageId);
        const stageTitle = isAr ? stageObj?.title_ar || targetStageId : stageObj?.title_en || targetStageId;

        const updates = { 
          status: targetStageId,
          statusUpdatedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          ...outcomePatch,
          ...(prevStageId === 'lost' ? { lostReason: null, lostNote: null, lostAt: null } : {})
        };
        if (validation.nextTask) {
          updates.latestHandoffTask = validation.nextTask;
        }
        onUpdateLead(leadId, updates, targetLead.version);

        if (triggerToast) {
          if (!validation.allowed && validation.missingDeliverable) {
            triggerToast(
              isAr ? `تم النقل إلى ${stageTitle} · تنبيه: يرجى استكمال ${validation.missingDeliverable}` : `Moved to ${stageTitle} · Note: ${validation.missingDeliverable}`,
              'info',
              {
                onUndo: () => {
                  onUpdateLead(leadId, { status: prevStageId, _undo: true, lastActivityAt: new Date().toISOString() });
                },
                undoLabel: isAr ? 'تراجع' : 'Undo',
                duration: 6000
              }
            );
          } else {
            triggerToast(
              isAr ? `تم نقل العميل بنجاح إلى مرحلة ${stageTitle}` : `Lead moved to ${stageTitle}`,
              'success',
              {
                onUndo: () => {
                  onUpdateLead(leadId, { status: prevStageId, _undo: true, lastActivityAt: new Date().toISOString() });
                },
                undoLabel: isAr ? 'تراجع' : 'Undo',
                duration: 6000
              }
            );
          }
        }
      }
    }
    setDraggedLeadId(null);
  };

  // Quick Move to Next Stage
  const handleMoveToNextStage = (lead) => {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === boardColumnOf(lead.status));
    if (currentIndex >= 0 && currentIndex < PROGRESS_COUNT - 1) {
      const prevStageId = lead.status || 'new';
      const nextStage = PIPELINE_STAGES[currentIndex + 1];

      const defOutcome = STAGE_DEFAULT_OUTCOMES[nextStage.id];
      let outcomePatch = {};
      if (defOutcome && !lead.outcomes?.some((o) => o.id === defOutcome.id)) {
        const entry = {
          id: defOutcome.id,
          at: new Date().toISOString(),
          by: String(currentUser?.uid || ''),
          n: String(currentUser?.displayName || 'مسؤول المبيعات').slice(0, 40)
        };
        outcomePatch = {
          outcomes: [...(lead.outcomes || []), entry].slice(-30),
          lastOutcome: defOutcome.id,
          lastOutcomeAt: entry.at
        };
      }

      const validation = validateStageTransition(lead, nextStage.id, {
        userRole: activeRole,
        isFounderApproved: lead.isFounderApproved || activeRole === 'super_admin'
      });

      const stageTitle = isAr ? nextStage.title_ar : nextStage.title_en;

      if (onUpdateLead) {
        const updates = { 
          status: nextStage.id,
          statusUpdatedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          ...outcomePatch
        };
        if (validation.nextTask) {
          updates.latestHandoffTask = validation.nextTask;
        }
        onUpdateLead(lead.id, updates, lead.version);

        if (triggerToast) {
          if (!validation.allowed && validation.missingDeliverable) {
            triggerToast(
              isAr ? `تم النقل إلى ${stageTitle} · تنبيه: يرجى استكمال ${validation.missingDeliverable}` : `Moved to ${stageTitle} · Note: ${validation.missingDeliverable}`,
              'info',
              {
                onUndo: () => {
                  onUpdateLead(lead.id, { status: prevStageId, _undo: true, lastActivityAt: new Date().toISOString() });
                },
                undoLabel: isAr ? 'تراجع' : 'Undo',
                duration: 6000
              }
            );
          } else {
            triggerToast(
              isAr ? `تم نقل العميل إلى مرحلة: ${stageTitle}` : `Moved to ${stageTitle}`,
              'success',
              {
                onUndo: () => {
                  onUpdateLead(lead.id, { status: prevStageId, _undo: true, lastActivityAt: new Date().toISOString() });
                },
                undoLabel: isAr ? 'تراجع' : 'Undo',
                duration: 6000
              }
            );
          }
        }
      }
    }
  };

  // Quick Move to Previous Stage
  const handleMoveToPrevStage = (lead) => {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === boardColumnOf(lead.status));
    if (currentIndex > 0 && currentIndex < PROGRESS_COUNT) {
      const currentStageId = lead.status || 'new';
      const prevStage = PIPELINE_STAGES[currentIndex - 1];
      if (!stageOk(lead, prevStage.id)) return;
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
                onUpdateLead(lead.id, { status: currentStageId, _undo: true, lastActivityAt: new Date().toISOString() });
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
    if (!lead || !targetStageId || boardColumnOf(lead.status) === targetStageId) return;
    if (!stageOk(lead, targetStageId)) return;
    if (targetStageId === 'lost') { setLostFor(lead); return; }
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
        lastActivityAt: new Date().toISOString(),
        ...(prevStageId === 'lost' ? { lostReason: null, lostNote: null, lostAt: null } : {})
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
              onUpdateLead(lead.id, { status: prevStageId, _undo: true, lastActivityAt: new Date().toISOString() });
            },
            undoLabel: isAr ? 'تراجع' : 'Undo',
            duration: 6000
          }
        );
      }
    }
  };

  // Test or duplicate deals: archived (hidden here and in the inbox, restorable from the leads table)
  const handleArchive = async (lead) => {
    if (!onUpdateLead) return;
    if (!(await confirm(archivePrompt({ name: lead.name, isAr })))) return;
    onUpdateLead(lead.id, { isArchived: true, lastActivityAt: new Date().toISOString() });
    triggerToast?.(isAr ? 'اتنقل للأرشيف واتخفى من المسار' : 'Archived', 'info', {
      onUndo: () => onUpdateLead(lead.id, { isArchived: false, lastActivityAt: new Date().toISOString() }),
      undoLabel: isAr ? 'تراجع' : 'Undo',
      duration: 6000
    });
  };

  // One tap sets what an account-only client turned out to want; the card moves to that board
  const CLIENT_TYPES = [
    { id: 'buyer', ar: 'مشتري', en: 'Buyer' },
    { id: 'seller', ar: 'بائع / مالك', en: 'Seller' },
    { id: 'investor', ar: 'مستثمر', en: 'Investor' }
  ];
  const handleClassify = (lead, type) => {
    if (!onUpdateLead) return;
    const prev = lead.type || 'account';
    const label = CLIENT_TYPES.find((t) => t.id === type);
    onUpdateLead(lead.id, { type, lastActivityAt: new Date().toISOString() }, lead.version);
    triggerToast?.(isAr ? `اتحدّد: ${label?.ar || type}` : `Set to ${label?.en || type}`, 'success', {
      onUndo: () => onUpdateLead(lead.id, { type: prev, _undo: true, lastActivityAt: new Date().toISOString() }),
      undoLabel: isAr ? 'تراجع' : 'Undo',
      duration: 6000
    });
  };

  const onWhatsAppClick = (lead) => {
    const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
    const propTitle = getLocalizedPropertyType(lead.propertyType || lead.details?.propertyType);
    const areaTitle = getLocalizedArea(lead.area || lead.details?.area || lead.location);
    // An owner gets an owner's message for his stage (valuation, exclusive contract…), not a buyer's request wording
    const text = isSellerLead(lead)
      ? ownerMessageFor(lead, { areaName: areaTitle, propTypeName: propTitle }).msg
      : isAr 
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
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExecutiveSummary}
            icon={<BarChart3 size={15} aria-hidden="true" />}
          >
            {showExecutiveSummary
              ? (isAr ? 'إخفاء الملخص' : 'Hide summary')
              : (isAr ? 'إظهار الملخص' : 'Show summary')}
          </Button>
        }
      />

      {showExecutiveSummary && (
        <div className="crm-kanban__exec-summary">
          <KpiRow label={isAr ? 'ملخص المسار' : 'Pipeline summary'}>
            <KpiTile
              label={filterType === 'seller' ? (isAr ? 'عقارات معروضة نشطة' : 'Active listings') : (filterType === 'buyer' ? (isAr ? 'طلبات شراء نشطة' : 'Active buyer requests') : (isAr ? 'إجمالي الصفقات المفتوحة' : 'Open deals'))}
              value={filteredLeads.filter(isOpenLead).length}
              hint={pipelineOverview.activeCount !== filteredLeads.filter(isOpenLead).length && isAr ? `${pipelineOverview.activeCount} عميل فريد` : undefined}
              tone="info"
              icon={<Users size={16} />}
            />
            {filterType === 'account' ? (
            <KpiTile
              label={isAr ? 'لسه ما حدّدوش عايزين إيه' : 'Not decided yet'}
              value={filteredLeads.filter(isOpenLead).length}
              tone="warning"
              hint={isAr ? 'اتصل واسأل: شراء ولا بيع؟' : 'Call and ask: buy or sell?'}
              icon={<Building2 size={16} />}
            />
            ) : filterType === 'seller' ? (
            <KpiTile
              label={isAr ? 'قيمة العروض المعروضة' : 'Listed value'}
              value={moneyScale(pipelineOverview.supplyVol, isAr).value}
              digits={1}
              unit={moneyScale(pipelineOverview.supplyVol, isAr).unit}
              emptyText={isAr ? 'مفيش أسعار متسجّلة' : 'No prices yet'}
              tone="primary"
              icon={<Building2 size={16} />}
            />
            ) : (
            <KpiTile
              label={isAr ? 'ميزانيات المشترين' : 'Buyers\' budgets'}
              value={moneyScale(pipelineOverview.totalVol, isAr).value}
              digits={1}
              unit={moneyScale(pipelineOverview.totalVol, isAr).unit}
              emptyText={isAr ? 'مفيش ميزانيات متسجّلة' : 'No budgets yet'}
              tone="primary"
              icon={<TrendingUp size={16} />}
            />
            )}
            <KpiTile
              label={isAr ? 'محتاج قرار النهارده' : 'Needs a decision'}
              value={attention.count}
              tone={attention.danger > 0 ? 'danger' : attention.count > 0 ? 'warning' : 'success'}
              hint={attention.count > 0
                ? (attention.value > 0 ? (isAr ? `${shortMoney(attention.value, true)} ج.م معرّضة للضياع` : `${shortMoney(attention.value, false)} EGP at risk`) : (isAr ? 'اضغط تشوفهم' : 'Tap to see them'))
                : (isAr ? 'مفيش صفقة متأخرة' : 'Nothing is late')}
              icon={<AlertTriangle size={16} />}
              onClick={attention.count > 0 || onlyAttention ? () => setOnlyAttention((v) => !v) : undefined}
            />
            <KpiTile
              label={isAr ? 'صفقات كبيرة (5 مليون+)' : 'Large deals (5M+)'}
              value={pipelineOverview.highValue}
              tone="accent"
              icon={<ShieldAlert size={16} />}
            />
          </KpiRow>

          {/* The few deals to act on first, most urgent on top */}
          {decisions.length > 0 && !onlyAttention && (
            <section className="kb-decide" aria-label={isAr ? 'قرارات النهارده' : 'Decisions for today'}>
              <h2 className="kb-decide__title"><Zap size={15} aria-hidden="true" />{isAr ? 'ابدأ بيهم النهارده' : 'Start with these today'}
                {attention.count > decisions.length && (
                  <button type="button" className="kb-decide__all" onClick={() => setOnlyAttention(true)}>
                    {isAr ? `عرض الكل (${attention.count})` : `All ${attention.count}`}
                  </button>
                )}
              </h2>
              <ul className="kb-decide__list">
                {decisions.map(({ lead, value, signal }) => (
                  <li key={lead.id} className={`kb-decide__row is-${signal.tone}`}>
                    <button
                      type="button"
                      className="kb-decide__main"
                      onClick={() => (onOpenLead ? onOpenLead(lead) : onOpenEditLead?.(lead))}
                      title={`${lead.name || ''} · ${signal.label} · ${signal.next}`}
                    >
                      <span className="kb-decide__dot" aria-hidden="true" />
                      <span className="kb-decide__text">
                        <strong>{lead.name?.trim() || (isAr ? 'عميل بدون اسم' : 'Unnamed lead')}{value > 0 && <small> · <bdi>{shortMoney(value, isAr)}</bdi></small>}</strong>
                        <span className="kb-decide__sub">
                          <span className="kb-decide__sub-label">{signal.label}{signal.days ? (isAr ? ` (${signal.days} يوم)` : ` (${signal.days}d)`) : ''}</span>
                          <span className="kb-decide__sub-dot">·</span>
                          <span className="kb-decide__sub-next">{signal.next}</span>
                        </span>
                      </span>
                      {isAr ? <ArrowLeft size={15} aria-hidden="true" /> : <ArrowRight size={15} aria-hidden="true" />}
                    </button>
                    <button type="button" className="kb-decide__wa" onClick={() => onWhatsAppClick(lead)} aria-label={isAr ? `واتساب ${lead.name || ''}` : `WhatsApp ${lead.name || ''}`} title={isAr ? 'واتساب' : 'WhatsApp'}>
                      <MessageSquare size={15} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* 🚀 Dual Pipeline Selector: Buyers vs Sellers */}
      <div className="crm-kanban__pipeline-selector" role="tablist" aria-label={isAr ? 'مسار الصفقات' : 'Pipeline'}>
        <button
          type="button"
          role="tab"
          aria-selected={filterType === 'buyer'}
          className={`crm-kanban__pipeline-tab ${filterType === 'buyer' ? 'is-active' : ''}`}
          onClick={() => setFilterType('buyer')}
        >
          <span className="pipeline-tab__icon">🎯</span>
          <div className="pipeline-tab__info">
            <span className="pipeline-tab__title">{isAr ? 'مسار صفقات المشترين (الطلبات)' : 'Buyer Deals Pipeline'}</span>
            <span className="pipeline-tab__desc">{isAr ? 'تأهيل المشترين، المعاينات الميدانية، التفاوض وحجز الوحدات' : 'Qualification, viewings, negotiation & deposit'}</span>
          </div>
          <span className="pipeline-tab__badge">
            {leads.filter((l) => isOpenLead(l) && matchesType(l, 'buyer')).length} {isAr ? 'صفقة' : 'deals'}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={filterType === 'seller'}
          className={`crm-kanban__pipeline-tab is-seller ${filterType === 'seller' ? 'is-active' : ''}`}
          onClick={() => setFilterType('seller')}
        >
          <span className="pipeline-tab__icon">🏠</span>
          <div className="pipeline-tab__info">
            <span className="pipeline-tab__title">{isAr ? 'مسار توريد العقارات (الملاك والبائعين)' : 'Property Supply Pipeline (Sellers)'}</span>
            <span className="pipeline-tab__desc">{isAr ? 'عروض البيع، معاينة وتثمين العقار، العقد الحصري، تم البيع' : 'New listings, valuation, exclusive contract & sold'}</span>
          </div>
          <span className="pipeline-tab__badge">
            {leads.filter((l) => isOpenLead(l) && matchesType(l, 'seller')).length} {isAr ? 'عقار' : 'listings'}
          </span>
        </button>
      </div>

      <div className="crm-kanban__toolbar">
        <div className="crm-kanban__views" role="group" aria-label={isAr ? 'تصفية الصفقات' : 'Filter deals'}>
          <Chip
            pressed={onlyAttention}
            count={attention.count}
            onClick={() => setOnlyAttention((v) => !v)}
            icon={<AlertTriangle size={14} aria-hidden="true" />}
          >
            {isAr ? 'محتاج قرار بس' : 'Needs a decision'}
          </Chip>
          {leads.filter((l) => isOpenLead(l) && matchesType(l, 'investor')).length > 0 && (
            <Chip
              pressed={filterType === 'investor'}
              count={leads.filter((l) => isOpenLead(l) && matchesType(l, 'investor')).length}
              onClick={() => setFilterType(filterType === 'investor' ? 'seller' : 'investor')}
            >
              {isAr ? 'مستثمرين' : 'Investors'}
            </Chip>
          )}
          {(accountCount > 0 || filterType === 'account') && (
            <Chip
              pressed={filterType === 'account'}
              count={accountCount}
              onClick={() => setFilterType(filterType === 'account' ? 'seller' : 'account')}
            >
              {isAr ? 'حسابات جديدة' : 'New accounts'}
            </Chip>
          )}
          {filterType !== 'all' ? (
            <button
              type="button"
              className="crm-kanban__show-all-btn"
              onClick={() => setFilterType('all')}
              title={isAr ? 'عرض كل الصفقات دون فرز بالمسار' : 'Show all'}
            >
              {isAr ? `عرض الكل (${leads.filter((l) => isOpenLead(l)).length})` : `All (${leads.filter((l) => isOpenLead(l)).length})`}
            </button>
          ) : (
            <Chip pressed onClick={() => setFilterType('seller')}>
              {isAr ? 'الكل معروض (انقر للعودة للمسار)' : 'Showing all (click to exit)'}
            </Chip>
          )}
        </div>

        <div className="crm-kanban__layout" role="group" aria-label={isAr ? 'شكل العرض والبحث' : 'Layout and search'}>
          <label className="crm-kanban__search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label={isAr ? 'بحث في الصفقات' : 'Search deals'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'اسم أو تليفون...' : 'Name or phone...'}
            />
          </label>
          <Chip pressed={compact} onClick={toggleCompact} icon={<Rows3 size={14} aria-hidden="true" />}>
            {isAr ? 'عرض مضغوط' : 'Compact'}
          </Chip>
          {collapsedStages.length < PIPELINE_STAGES.length ? (
            <Chip onClick={collapseAll} icon={<Columns3 size={14} aria-hidden="true" />}>
              {isAr ? 'طي الأعمدة' : 'Collapse all'}
            </Chip>
          ) : (
            <Chip onClick={expandAll} icon={<Columns3 size={14} aria-hidden="true" />}>
              {isAr ? 'فتح الأعمدة' : 'Expand all'}
            </Chip>
          )}
        </div>
      </div>

      {/* On a phone one stage fills the screen, picked from the row of stages above it */}
      {isPhone && (
        <div className="crm-kanban__stagepick" role="tablist" aria-label={isAr ? 'المراحل' : 'Stages'}>
          {PIPELINE_STAGES.map((st) => (
            <button key={st.id} type="button" role="tab" aria-selected={phoneStageId === st.id} className={phoneStageId === st.id ? 'is-on' : ''} onClick={() => setPhoneStage(st.id)}>
              {isAr ? st.title_ar : st.title_en}<b>{(leadsByStage[st.id] || []).length}</b>
            </button>
          ))}
        </div>
      )}

      {/* Kanban Stages Board */}
      <div
        ref={boardRef}
        className={`kanban-board-scroll-container${compact ? ' is-compact' : ''}${isPhone ? ' is-phone' : ''}`}
        onScroll={() => syncScroll(boardRef.current, topBarRef.current)}
        style={{
          display: 'grid',
          // Empty columns stay wide enough so stage names never truncate
          gridTemplateColumns: isPhone ? 'minmax(0, 1fr)' : PIPELINE_STAGES.map((s) => {
            if (collapsedStages.includes(s.id)) return '54px';
            const empty = !(leadsByStage[s.id] || []).length;
            if (compact) return empty ? 'minmax(140px, 0.5fr)' : 'minmax(180px, 1fr)';
            return empty ? 'minmax(220px, 0.7fr)' : 'minmax(280px, 1fr)';
          }).join(' ')
        }}
      >
        {(isPhone ? PIPELINE_STAGES.filter((st) => st.id === phoneStageId) : PIPELINE_STAGES).map((stage) => {
          const isCollapsed = !isPhone && collapsedStages.includes(stage.id);
          const allStageLeads = leadsByStage[stage.id] || [];
          const isOpen = openStages.includes(stage.id);
          const stageLeads = isOpen ? allStageLeads : allStageLeads.slice(0, CARDS_PER_STAGE);
          const hiddenCount = allStageLeads.length - stageLeads.length;
          const { count, totalVolume, unbudgetedCount } = stageStatsMap[stage.id] || { count: 0, totalVolume: 0, unbudgetedCount: 0 };

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
                  {/* Total value of the stage; how many deals still have no budget */}
                  <span className="kanban-stage-volume-sub">
                    {totalVolume > 0 ? (
                      <>
                        <bdi>{shortMoney(totalVolume, isAr)}</bdi>{isAr ? ' ج.م' : ' EGP'}
                        {unbudgetedCount > 0 && (
                          <span className="kanban-stage-volume-note">
                            {isAr ? ` · ${unbudgetedCount} من غير ميزانية` : ` · ${unbudgetedCount} without budget`}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="kanban-stage-volume-note">
                        {count > 0 ? (isAr ? 'من غير ميزانيات' : 'No budgets yet') : (isAr ? 'فاضية' : 'Empty')}
                      </span>
                    )}
                  </span>
                  {attention.byStage[stage.id]?.count > 0 && (
                    <button type="button" className="kb-colrisk" onClick={() => setOnlyAttention(true)} title={isAr ? 'اعرض اللي محتاج قرار بس' : 'Show only deals that need a decision'}>
                      <AlertTriangle size={11} aria-hidden="true" />
                      {isAr ? `${attention.byStage[stage.id].count} محتاج قرار` : `${attention.byStage[stage.id].count} need action`}
                    </button>
                  )}
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
                    const sinceMs = stageSinceMs(lead);
                    const inStage = Number.isFinite(sinceMs) ? daysLabel(now - sinceMs, isAr) : '';
                    const stalled = isStalled(lead, now);
                    // One reason per deal, with the next step; replaces the separate overdue/stalled boxes
                    const signal = attentionOf(lead, { now, value: budget });
                    const isOverdue = signal?.tone === 'danger';

                    const stageIndex = PIPELINE_STAGES.findIndex(s => s.id === boardColumnOf(lead.status));
                    const closeMenu = (e) => e.currentTarget.closest('details')?.removeAttribute('open');
                    const leadName = lead.name?.trim() || (isAr ? 'عميل بدون اسم' : 'Unnamed lead');

                    // Neutral card (audit DEF-10): the stage colour lives only on the column rule;
                    // state that needs attention is a single icon line, not another coloured box.
                    return (
                      <article
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        data-stage={stage.id}
                        className={`kb-card animate-fadeIn ${isOverdue ? 'is-overdue' : ''}${signal ? ` has-signal is-${signal.tone}` : ''}`}
                        aria-label={`${leadName} — ${isAr ? stage.title_ar : stage.title_en}`}
                      >
                        <div className="kb-card-top">
                          {(filterType === 'investor' || filterType === 'account') && <span className="kb-type">{typeBadge.label}</span>}
                          {/* The offers board holds owners and brokers: each card says which (owner, valuation request, broker) */}
                          {filterType === 'seller' && <span className="kb-type">{isAr ? clientRoleOf(lead).ar : clientRoleOf(lead).en}</span>}
                          {(sameNumber.has(lead.id) || lead.returningClient) && (
                            <span className="kb-dup" title={isAr ? (lead.returningClient ? 'عميل راجع: اتحوّل لنفس الموظف اللي كان معاه طلبه القديم.' : 'نفس رقم الموبايل عنده طلبات تانية: غالبًا نفس الشخص. افتح «مكررين بالرقم» في العملاء عشان تدمجهم.') : 'The same phone has other requests: probably the same person. Merge them from the Leads tab.'}>
                              <CopyPlus size={11} aria-hidden="true" />
                              {lead.returningClient
                                ? (isAr ? 'عميل راجع' : 'Returning client')
                                : (isAr ? `نفس الرقم · ${sameNumber.get(lead.id).length + 1} طلبات` : `Same number · ${sameNumber.get(lead.id).length + 1}`)}
                            </span>
                          )}
                          {budget >= BIG_DEAL && (
                            <span
                              className="kb-high-value-pill"
                              title={isAr ? 'صفقة كبرى (≥ 5 مليون ج) تتطلب اعتماد المؤسس' : 'High value (5M+) requires Founder sign-off'}
                            >
                              <ShieldAlert size={11} aria-hidden="true" />
                              {isAr ? 'صفقة كبرى +5 مليون' : '5M+ deal'}
                            </span>
                          )}
                          {inStage && !signal && (
                            <span
                              className={`kb-time${stalled ? ' is-stalled' : ''}`}
                              title={isAr ? `في المرحلة دي ${inStage}${STALE_DAYS[stage.id] ? ` (الحد ${STALE_DAYS[stage.id]} أيام)` : ''}` : `In this stage ${inStage}`}
                            >
                              {stalled ? <Hourglass size={11} aria-hidden="true" /> : <Clock size={11} aria-hidden="true" />}
                              {isAr ? (inStage === 'النهارده' ? 'دخل المرحلة النهارده' : `في المرحلة ${inStage}`) : `In stage ${inStage}`}
                            </span>
                          )}
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
                          {pipelineKind(lead) !== 'seller' && (
                            <><span aria-hidden="true" className="kb-meta-score-sep">·</span><span className="kb-meta-score" title={leadScore(lead).reasons.join(' • ')}>{isAr ? `اهتمام ${leadScore(lead).score}%` : `${leadScore(lead).score}% score`}</span></>
                          )}
                        </p>

                        <div className="kb-value">
                          {budget > 0 ? (
                            <span className="kb-value-amount"><bdi>{budget.toLocaleString('en-US')}</bdi><small>{isAr ? 'ج.م' : 'EGP'}</small></span>
                          ) : (
                            <span className="kb-value-empty">{pipelineKind(lead) === 'seller' ? (isAr ? 'السعر المطلوب: —' : 'Asking price: —') : (isAr ? 'الميزانية: —' : 'Budget: —')}</span>
                          )}
                          <PhoneText leadId={lead.id} value={formatPhoneNumber(lead.whatsapp || lead.phone)} surface="kanban" isAr={isAr} className="kb-phone" />
                        </div>

                        {signal && (
                          <p className={`kb-reason is-${signal.tone}`}>
                            <span className="kb-reason__why">{stalled && signal.id === 'stalled' ? <Hourglass size={12} aria-hidden="true" /> : <AlertTriangle size={12} aria-hidden="true" />}{signal.label}{signal.days ? (isAr ? ` · ${signal.days} يوم` : ` · ${signal.days}d`) : ''}</span>
                            <span className="kb-reason__next">{signal.next}</span>
                          </p>
                        )}
                        {lead.nextFollowUpAt && (
                          <p className="kb-flag"><Calendar size={13} aria-hidden="true" />{isAr ? 'متابعة:' : 'Follow-up:'} {new Date(lead.nextFollowUpAt).toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        )}
                        {lead.siteVisit && (
                          <p className="kb-flag"><Car size={13} aria-hidden="true" />{isAr ? 'معاينة:' : 'Visit:'} {lead.siteVisit.visitDate} ({lead.siteVisit.visitTime})</p>
                        )}

                        {isAccountLead(lead) && onUpdateLead && (
                          <div className="kb-classify" role="group" aria-label={isAr ? 'حدّد نوع العميل' : 'Set the client type'}>
                            <span>{isAr ? 'عايز إيه؟' : 'Wants to:'}</span>
                            {CLIENT_TYPES.map((t) => (
                              <button key={t.id} type="button" onClick={() => handleClassify(lead, t.id)}>{isAr ? t.ar : t.en}</button>
                            ))}
                          </div>
                        )}

                        <div className="kb-actions">
                          <button type="button" className="kb-btn kb-btn--wa" onClick={() => onWhatsAppClick(lead)} title={isAr ? 'محادثة فورية عبر واتساب' : 'WhatsApp'}>
                            <MessageSquare size={14} aria-hidden="true" /><span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                          </button>
                          {onOpenLead && (
                            <button type="button" className="kb-btn" onClick={() => onOpenLead(lead)} title={isAr ? 'افتح ملف العميل وسجّل مكالمة' : 'Open the lead'}>
                              <FolderOpen size={14} aria-hidden="true" /><span>{isAr ? 'فتح' : 'Open'}</span>
                            </button>
                          )}

                          <details className="kb-more" onToggle={placeMenu}>
                            <summary className="kb-btn kb-btn--icon" aria-label={isAr ? 'إجراءات أخرى' : 'More actions'}>
                              <MoreHorizontal size={16} aria-hidden="true" />
                            </summary>
                            <div className="kb-menu">
                              {stageIndex >= 0 && stageIndex < PROGRESS_COUNT - 1 && (
                                <button type="button" onClick={(e) => { closeMenu(e); handleMoveToNextStage(lead); }}>
                                  {isAr ? <ChevronLeft size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
                                  {isAr ? `انقل لـ«${stagesOfLead(lead)[stageIndex + 1].title_ar}»` : `Move to ${stagesOfLead(lead)[stageIndex + 1].title_en}`}
                                </button>
                              )}
                              {/* Direct Jump To Any Stage */}
                              <div className="kb-menu-header">
                                <span className="kb-menu-header-label">
                                  {isAr ? 'نقل مباشر إلى مرحلة:' : 'Direct Move to:'}
                                </span>
                                {stagesOfLead(lead).filter(s => s.id !== boardColumnOf(lead.status)).map(targetStage => (
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
                              <button type="button" disabled={stageIndex <= 0 || stageIndex >= PROGRESS_COUNT} onClick={(e) => { closeMenu(e); handleMoveToPrevStage(lead); }}>
                                {isAr ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}{isAr ? 'إرجاع للمرحلة السابقة' : 'Previous stage'}
                              </button>
                              {onUpdateLead && (
                                <button type="button" onClick={(e) => { closeMenu(e); handleArchive(lead); }}>
                                  <Archive size={14} aria-hidden="true" />{isAr ? 'أرشفة (إخفاء، مش مسح)' : 'Archive (hide)'}
                                </button>
                              )}
                              {onDeleteLead && (
                                <button type="button" className="is-danger" onClick={(e) => { closeMenu(e); setLeadToDelete(lead); }}>
                                  <Trash2 size={14} aria-hidden="true" />{isAr ? 'حذف العميل' : 'Delete'}
                                </button>
                              )}
                            </div>
                          </details>

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

      {/* 1Line OS Lost Reason Modal */}
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
              statusUpdatedAt: new Date().toISOString(),
              lastActivityAt: new Date().toISOString()
            }, lostFor.version);
            triggerToast?.(isAr ? 'اتسجلت خسارة مع السبب' : 'Marked as lost', 'info');
            setLostFor(null);
          }}
        />
      )}
    </div>
  );
}
