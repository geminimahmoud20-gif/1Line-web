import { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Eye,
  UserCheck,
  Search,
  Phone,
  MessageCircle,
  AlertTriangle,
  Lock,
  UserCog,
  Archive,
  Building,
  DollarSign,
  Briefcase,
  Clock,
  Hand
} from 'lucide-react';
import { PageHeader, Tabs, SegmentedControl, Chip, Badge, Button, IconButton, Select, Card, Avatar, EmptyState, MotionRoot } from '../ui';
import { cx } from '../ui/cx';
import './CrmInboxPanel.css';
import { canViewLeadPhone, maskPhoneNumber } from '../../utils/rbacRules';
import { claimLeadAtomic } from '../../services/leads';
import { normalizeAreaKey, getAreaById } from '../../utils/areasData';
import { sanitizeAndMergeNotes, formatPhoneNumber } from '../../utils/crmNoteSanitizer';
import { subscribeToContactIntents, resolveContactIntent } from '../../firebaseLazy';
import WhatsAppIntentsList from './WhatsAppIntentsList';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';
import { listTeamMembers } from '../../services/team';
import {
  INBOX_STAGES as STAGES, INBOX_VIEWS, TEAM_DESKS, isInboxStage, pipelineStageLabel, isLeadUnclaimed, isLeadClaimedByMe,
  isInboxActive, needsAction, matchesView, receivedMs, ageLabel, formatReceived, requestsCount, slaSummary, splitNotes,
  reassignUpdates, knownOwners
} from '../../utils/inboxView';

const PAGE_SIZE = 20;

const PROPERTY_TYPE_LABELS = {
  apartment: 'شقة سكنية',
  villa: 'فيلا مستقلة',
  land: 'أرض فضاء / استثمارية',
  office: 'مكتب إداري / عيادة',
  retail: 'محل تجاري / مساحة ريتيل',
  commercial: 'عقار تجاري',
  building: 'عمارة بالكامل',
  chalet: 'شاليه',
  penthouse: 'بنتهاوس',
  duplex: 'دوبلكس'
};

function formatPropertyType(type) {
  if (!type || typeof type !== 'string') return '';
  const key = type.toLowerCase().trim();
  return PROPERTY_TYPE_LABELS[key] || type;
}

function formatAreaName(area) {
  if (!area || typeof area !== 'string') return '';
  const normalized = normalizeAreaKey(area);
  const found = getAreaById(normalized);
  return found?.name_ar || area;
}

function getLeadOwnerDisplay(lead, isAr) {
  if (lead.ownerName) return lead.ownerName;
  if (lead.claimedBy) return lead.claimedBy;
  if (lead.assignedTo && !TEAM_DESKS.includes(lead.assignedTo)) {
    return lead.assignedTo;
  }
  if (lead.assignedTo && TEAM_DESKS.includes(lead.assignedTo)) {
    return isAr ? `الفريق: ${lead.assignedTo} (لم يُستلم)` : `Desk: ${lead.assignedTo} (Unclaimed)`;
  }
  return isAr ? 'غير مستلم' : 'Unclaimed';
}

function classifyLeadCategory(lead) {
  const type = (lead?.type || '').toLowerCase();
  const source = (lead?.source || '').toLowerCase();
  const landing = (lead?.landingPage || '').toLowerCase();
  const details = lead?.details || {};

  // Accounts: Explicit type OR legacy client_account source
  if (
    type === 'account' ||
    type === 'client_registration' ||
    type === 'client' ||
    source === 'client_account' ||
    source === 'account' ||
    landing.includes('/account')
  ) {
    return 'accounts';
  }

  // Visits & Viewing requests: Strictly from type or explicit visit details, NEVER notes text
  if (
    type === 'visit' ||
    type === 'viewing' ||
    type === 'viewing_request' ||
    type === 'reservation_request' ||
    Boolean(details.visitDate) ||
    Boolean(details.inspectionType)
  ) {
    return 'visits';
  }

  // Sellers & Valuations
  if (
    type === 'seller' ||
    type === 'valuation' ||
    landing.includes('/sell') ||
    landing.includes('/valuation') ||
    Boolean(details.askingPrice)
  ) {
    return 'sellers';
  }

  // Brokers
  if (type === 'broker' || landing.includes('/broker')) {
    return 'brokers';
  }

  // Buyers / Investor / Default
  return 'buyers';
}

const money = (n, isAr) => `${Number(n).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;

// Notes saved by older forms can carry "undefined" from missing fields
const cleanNotes = (notes) => (sanitizeAndMergeNotes(notes) || '')
  .replace(/في\s+(undefined|null)\b/gi, 'في سوهاج')
  .replace(/\b(undefined|null)\b/gi, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

// The few facts staff need before calling, per request type, as label/value pairs
function getLeadFacts(lead, tab, isAr) {
  const d = lead.details || {};
  const L = (ar, en) => (isAr ? ar : en);
  const facts = [];
  const add = (label, value, strong = false) => { if (value) facts.push({ label, value, strong }); };
  // A price staff must ask for on the first call
  const ask = (label, value) => facts.push(value ? { label, value, strong: true } : { label, value: L('مش متسجّل', 'Not given'), missing: true });
  if (tab === 'sellers') {
    add(L('النوع', 'Type'), formatPropertyType(d.propertyType));
    add(L('المنطقة', 'Area'), d.area && formatAreaName(d.area));
    add(L('المساحة', 'Size'), d.size && `${d.size} ${L('م²', 'm²')}`);
    ask(L('السعر المطلوب', 'Asking price'), d.askingPrice && money(d.askingPrice, isAr));
    add(L('التشطيب', 'Finishing'), d.finishingLabelAr);
    add(L('الوضع القانوني', 'Legal'), d.legalSummaryAr);
  } else if (tab === 'visits') {
    add(L('كود العقار', 'Listing'), d.propertyCode || d.propertyId, true);
    add(L('الموعد', 'Date'), d.visitDate && `${d.visitDate}${d.visitSlot ? ` · ${d.visitSlot}` : ''}`);
    add(L('نوع المعاينة', 'Viewing'), d.inspectionType === 'remote' ? L('فيديو أونلاين', 'Video call') : L('في الموقع', 'On site'));
  } else if (tab === 'buyers') {
    add(L('المطلوب', 'Looking for'), d.propertyType && d.propertyType !== 'buyer' && formatPropertyType(d.propertyType));
    add(L('المنطقة', 'Area'), d.area && formatAreaName(d.area));
    ask(L('الميزانية', 'Budget'), d.budget && money(d.budget, isAr));
    add(L('السداد', 'Payment'), d.paymentMethod && (d.paymentMethod === 'cash' ? L('كاش', 'Cash') : L('تقسيط', 'Instalments')));
  } else if (tab === 'accounts') {
    add(L('البريد', 'Email'), lead.email);
  } else if (tab === 'brokers') {
    add(L('الشركة', 'Agency'), d.agencyName || L('وسيط مستقل', 'Independent'));
    add(L('الترخيص', 'Licence'), d.licenseNo);
    add(L('التغطية', 'Coverage'), d.coverageArea);
  }
  return facts;
}

export default function CrmInboxPanel({
  leads = [],
  properties = [],
  currentUser = null,
  userRole = 'super_admin',
  userPerms = null,
  lang = 'ar',
  onUpdateLead,
  onOpenLead,
  onConvertToProperty,
  triggerToast,
  onAddNewLead,
  canEditLeads = false,
  slaMinutes = 15
}) {
  const isAr = lang === 'ar';
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const isMarketing = userRole === 'marketing' || userRole === 'content_creator';
  const isSales = userRole === 'sales_agent' || userRole === 'sales_manager' || userRole === 'broker';
  const canSeePhone = canViewLeadPhone(userRole, userPerms);

  // Time state updated every minute to prevent pure-render violations while evaluating SLA
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Default active tab based on staff role
  const defaultTab = isMarketing ? 'sellers' : (isSales ? 'visits' : 'sellers');
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  // Which requests to list: still needing someone (default), nobody's yet, mine, or every open one
  const [view, setView] = useState('todo');
  const [reassigningLeadId, setReassigningLeadId] = useState(null);
  const [reassignTo, setReassignTo] = useState('');
  const [claimingId, setClaimingId] = useState(null);
  // Shown cards; resets when the tab, view or search changes (keyed, so no effect is needed)
  const listKey = `${activeTab}|${view}|${searchQuery.trim()}`;
  const [paging, setPaging] = useState({ key: listKey, n: PAGE_SIZE });
  const shown = paging.key === listKey ? paging.n : PAGE_SIZE;

  // Team accounts for "تحويل لموظف تاني" (super admins only, loaded the first time it opens).
  // undefined = not loaded, null = unavailable (falls back to people already holding requests)
  const [team, setTeam] = useState(undefined);
  const loadTeam = () => {
    if (team !== undefined) return;
    setTeam(null);
    listTeamMembers()
      .then((res) => setTeam(res?.ok && Array.isArray(res.members) ? res.members.filter((m) => !m.disabled) : null))
      .catch(() => setTeam(null));
  };
  const assignees = useMemo(() => (team && team.length ? team : knownOwners(leads)), [team, leads]);

  // WhatsApp taps from the site (api/contact-intent.js); undefined = loading, null = no access
  const [intents, setIntents] = useState(undefined);
  useEffect(() => {
    let unsub = null;
    let alive = true;
    Promise.resolve(subscribeToContactIntents((list) => { if (alive) setIntents(list); }))
      .then((u) => { if (alive) unsub = u; else u?.(); })
      .catch(() => { if (alive) setIntents(null); });
    return () => { alive = false; unsub?.(); };
  }, []);
  const openIntents = (intents || []).filter((i) => (i.status || 'open') === 'open').length;

  const resolveIntent = async (intent, status, leadId = null) => {
    try {
      await resolveContactIntent(intent.id, status, currentUser?.uid || '', leadId);
    } catch (err) {
      console.error('resolve contact intent failed:', err);
      triggerToast?.(isAr ? 'مقدرناش نحدّث الضغطة. جرّب تاني.' : "Couldn't update. Try again.", 'error');
      return false;
    }
    return true;
  };

  // "ربط بعميل": the chat with this reference arrived on WhatsApp → it becomes a lead
  const linkIntent = async (intent, { name, phone }) => {
    if (!onAddNewLead) return;
    const unit = intent.propertyId ? properties.find((p) => String(p.id) === String(intent.propertyId)) : null;
    await onAddNewLead({
      name: name || (isAr ? 'عميل واتساب' : 'WhatsApp client'),
      phone,
      whatsapp: phone,
      type: 'buyer',
      source: 'whatsapp_site',
      contactRef: intent.ref || intent.id,
      ...(intent.propertyId ? { propertyId: String(intent.propertyId) } : {}),
      details: {
        channel: 'whatsapp',
        propertyCode: intent.propertyId ? String(intent.propertyId).toUpperCase() : '',
        ...(unit?.areaKey ? { area: unit.areaKey } : {}),
        ...(unit?.type ? { propertyType: unit.type } : {})
      },
      notes: isAr
        ? `تواصل بالواتساب من الموقع${intent.propertyId ? ` على وحدة #${String(intent.propertyId).toUpperCase()}` : ''} · رقم المرجع ${intent.ref || intent.id}`
        : `WhatsApp from the site${intent.propertyId ? ` about #${String(intent.propertyId).toUpperCase()}` : ''} · ref ${intent.ref || intent.id}`
    });
    if (await resolveIntent(intent, 'linked')) {
      triggerToast?.(isAr ? `اتعمل طلب لـ ${name || 'العميل'} واتربط بالمرجع ${intent.ref || intent.id}` : 'Lead created and linked', 'success');
    }
  };

  const currentStaffName = useMemo(() => {
    return currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || (isAr ? 'موظف 1Line' : 'Staff');
  }, [currentUser, isAr]);

  // Categorize leads into dedicated triage streams without keyword guessing
  const categorized = useMemo(() => {
    const sellers = [];
    const visits = [];
    const buyers = [];
    const accounts = [];
    const brokers = [];

    leads.forEach((l) => {
      const category = classifyLeadCategory(l);
      if (category === 'sellers') sellers.push(l);
      else if (category === 'visits') visits.push(l);
      else if (category === 'accounts') accounts.push(l);
      else if (category === 'brokers') brokers.push(l);
      else buyers.push(l);
    });

    return { sellers, visits, buyers, accounts, brokers };
  }, [leads]);

  // Open requests nobody took within the response target (default 15 minutes)
  const sla = useMemo(
    () => slaSummary(leads, currentTime, slaMinutes, classifyLeadCategory),
    [leads, currentTime, slaMinutes]
  );

  // Counts of unhandled requests per tab
  const unhandledCounts = useMemo(() => {
    // Same rule as the default "محتاجة تصرّف" view, so a tab's number matches its list
    const countPending = (list) => list.filter((l) => isInboxActive(l) && needsAction(l)).length;
    return {
      sellers: countPending(categorized.sellers),
      visits: countPending(categorized.visits),
      buyers: countPending(categorized.buyers),
      accounts: countPending(categorized.accounts),
      brokers: countPending(categorized.brokers)
    };
  }, [categorized]);

  // Tab definitions
  const tabsList = useMemo(() => [
    { 
      id: 'sellers', 
      label_ar: 'بيع وتثمين', 
      label_en: 'Sell & value', 
      icon: Home, 
      count: categorized.sellers.length, 
      unhandled: unhandledCounts.sellers
    },
    { 
      id: 'visits', 
      label_ar: 'معاينات', 
      label_en: 'Viewings', 
      icon: Eye, 
      count: categorized.visits.length, 
      unhandled: unhandledCounts.visits
    },
    { 
      id: 'buyers', 
      label_ar: 'شراء', 
      label_en: 'Buyers', 
      icon: DollarSign, 
      count: categorized.buyers.length, 
      unhandled: unhandledCounts.buyers
    },
    { 
      id: 'accounts', 
      label_ar: 'حسابات', 
      label_en: 'Accounts', 
      icon: UserCheck, 
      count: categorized.accounts.length, 
      unhandled: unhandledCounts.accounts
    },
    { 
      id: 'brokers', 
      label_ar: 'وسطاء', 
      label_en: 'Brokers', 
      icon: Briefcase, 
      count: categorized.brokers.length, 
      unhandled: unhandledCounts.brokers
    },
    {
      id: 'whatsapp',
      label_ar: 'واتساب من الموقع',
      label_en: 'WhatsApp taps',
      icon: MessageCircle,
      count: (intents || []).length,
      unhandled: openIntents
    }
  ], [categorized, unhandledCounts, intents, openIntents]);

  const myUid = currentUser?.uid || '';

  // Current tab items for the chosen view and search
  const currentItems = useMemo(() => {
    let list = (categorized[activeTab] || []).filter((l) => matchesView(l, view, myUid, currentStaffName));

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const digits = q.replace(/[^0-9]/g, '');
      const has = (v) => typeof v === 'string' && v.toLowerCase().includes(q);
      list = list.filter((l) => {
        const d = l.details || {};
        return has(l.name) || has(l.notes) || has(l.assignedTo) || has(l.ownerName) || has(d.propertyCode)
          || has(formatAreaName(d.area || l.area)) || has(formatPropertyType(d.propertyType || l.propertyType))
          // Phones match on digits, so "0123 699" and "+20123…" both find 01236999836
          || (canSeePhone && digits.length >= 3 && String(l.phone || '').replace(/[^0-9]/g, '').replace(/^20/, '0').includes(digits.replace(/^20/, '0')));
      });
    }

    // Requests nobody has taken first, then newest
    return [...list].sort((a, b) => {
      const aNew = isLeadUnclaimed(a) ? 1 : 0;
      const bNew = isLeadUnclaimed(b) ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      return (receivedMs(b) || 0) - (receivedMs(a) || 0);
    });
  }, [categorized, activeTab, view, searchQuery, canSeePhone, myUid, currentStaffName]);

  // How many requests of the open tab each view would list (the chip counts)
  const viewCounts = useMemo(() => {
    const list = categorized[activeTab] || [];
    return Object.fromEntries(INBOX_VIEWS.map((v) => [v.id, list.filter((l) => matchesView(l, v.id, myUid, currentStaffName)).length]));
  }, [categorized, activeTab, myUid, currentStaffName]);

  // Atomic Claim Lead Handler via Firestore Transaction (الاستلام ذرّي ولا يغيّر الحالة إلى contacted)
  const handleClaimLead = async (lead) => {
    if (claimingId === lead.id) return;
    setClaimingId(lead.id);

    try {
      const currentOwner = lead.ownerName || lead.claimedBy || (!TEAM_DESKS.includes(lead.assignedTo) ? lead.assignedTo : null);
      if (currentOwner && currentOwner !== currentStaffName && !isSuperAdmin) {
        if (triggerToast) {
          triggerToast(isAr ? `عذراً، هذا الطلب مستلم بالفعل بواسطة "${currentOwner}" لمنع تكرار الاتصال.` : `Already claimed by ${currentOwner}`, 'warning');
        }
        return;
      }

      const res = await claimLeadAtomic(lead.id, currentStaffName, {
        override: isSuperAdmin,
        staffUid: currentUser?.uid
      });
      if (!res.ok) {
        if (res.reason === 'already_claimed') {
          triggerToast?.(isAr ? `عذراً، هذا الطلب تم استلامه للتو بواسطة "${res.claimedBy}".` : `Already claimed by ${res.claimedBy}`, 'warning');
          onUpdateLead?.(lead.id, { ownerName: res.claimedBy, claimedBy: res.claimedBy });
        } else {
          triggerToast?.(isAr ? 'تعذر استلام الطلب، يرجى المحاولة لاحقاً' : 'Failed to claim lead', 'error');
        }
        return;
      }

      // Synchronize local view (Note: status is intentionally preserved; desk assignedTo is preserved)
      onUpdateLead?.(lead.id, {
        ownerName: currentStaffName,
        claimedBy: currentStaffName,
        ownerUid: currentUser?.uid || null,
        claimedAt: new Date().toISOString()
      });

      if (triggerToast) {
        triggerToast(isAr ? 'الطلب بقى معاك' : 'Lead claimed by you', 'success');
      }
    } finally {
      setClaimingId(null);
    }
  };

  // Stage buttons: only for the inbox's own stages, so a deal already in negotiation or closing
  // is never sent back to "جديد" by a click here
  const handleSetStage = (lead, newStage) => {
    if (!onUpdateLead || !isInboxStage(lead.status)) return;
    const nowIso = new Date().toISOString();
    onUpdateLead(lead.id, {
      status: newStage,
      lastStatusUpdate: nowIso,
      lastActivityAt: nowIso,
      ...(newStage !== 'new' && !lead.firstContactedAt ? { firstContactedAt: nowIso } : {})
    });
    const stageObj = STAGES.find((s) => s.id === newStage);
    triggerToast?.(isAr ? `المرحلة بقت: ${stageObj ? stageObj.label_ar : newStage}` : 'Stage updated', 'info');
  };

  const openReassign = (lead) => {
    loadTeam();
    setReassigningLeadId(lead.id);
    setReassignTo('');
  };

  // Hand the request to a team account (or back to nobody), rewriting the owner's account too
  const handleExecuteReassign = (lead) => {
    if (!onUpdateLead || !reassignTo) return;
    const member = reassignTo === '__none__' ? null : assignees.find((m) => (m.uid || `name:${m.name}`) === reassignTo);
    if (reassignTo !== '__none__' && !member) return;
    onUpdateLead(lead.id, reassignUpdates(lead, member));
    setReassigningLeadId(null);
    setReassignTo('');
    triggerToast?.(
      member
        ? (isAr ? `الطلب اتحوّل لـ ${member.name || member.email}` : `Assigned to ${member.name || member.email}`)
        : (isAr ? 'الطلب رجع للطلبات اللي مش مستلمة' : 'Back to unclaimed'),
      'success'
    );
  };

  // Test or duplicate requests: archived (hidden, restorable from the leads table), never deleted
  const handleArchive = (lead) => {
    if (!onUpdateLead) return;
    onUpdateLead(lead.id, { isArchived: true, lastActivityAt: new Date().toISOString() });
    triggerToast?.(isAr ? 'الطلب اتخفى من الوارد واتنقل للأرشيف' : 'Request archived', 'info', {
      onUndo: () => onUpdateLead(lead.id, { isArchived: false, lastActivityAt: new Date().toISOString() }),
      undoLabel: isAr ? 'تراجع' : 'Undo'
    });
  };

  // The SLA notice opens the unclaimed list on the tab holding most of the late requests
  const showLate = () => {
    const tab = Object.entries(sla.byTab).sort((x, y) => y[1] - x[1])[0]?.[0];
    if (tab) setActiveTab(tab);
    setView('unclaimed');
    setSearchQuery('');
  };

  // Generate customized WhatsApp text based on stream without false promises or fake data
  const getWhatsAppMessage = (lead) => {
    const name = lead.name || (isAr ? 'العميل' : 'Client');
    const d = lead.details || {};

    if (activeTab === 'visits') {
      const propCode = d.propertyCode || d.propertyId ? ` (كود: ${d.propertyCode || d.propertyId})` : '';
      const datePart = d.visitDate ? ` يوم ${d.visitDate}${d.visitSlot ? ` (${d.visitSlot})` : ''}` : '';
      return isAr
        ? `أهلاً بك أ. ${name}، بخصوص طلبكم لمعاينة العقار${propCode}${datePart} عبر منصة 1Line، نسعد بتأكيد الموعد معكم ومتابعة التفاصيل...`
        : `Hello ${name}, regarding your viewing request${propCode ? ` for property ${propCode}` : ''}${datePart ? ` on ${datePart}` : ''} on 1Line...`;
    }

    if (activeTab === 'sellers') {
      const propType = formatPropertyType(d.propertyType || lead.propertyType) || (isAr ? 'عقاركم' : 'property');
      const area = formatAreaName(d.area || lead.area) || (isAr ? 'سوهاج' : 'Sohag');
      return isAr
        ? `أهلاً بك أ. ${name}، بخصوص رغبتكم في عرض (${propType}) في (${area}) للبيع والتسويق عبر منصة 1Line، نود مراجعة التفاصيل والصور معكم للبدء فوراً...`
        : `Hello ${name}, regarding your listing request on 1Line...`;
    }

    if (activeTab === 'buyers') {
      const propType = formatPropertyType(d.propertyType || lead.propertyType) || (isAr ? 'عقار' : 'property');
      const budget = d.budget || lead.budget ? ` بميزانية ${d.budget || lead.budget}` : '';
      return isAr
        ? `أهلاً بك أ. ${name}، استلمنا طلبكم بخصوص البحث عن (${propType})${budget} عبر 1Line، وسنتواصل معكم لطرح بعض الأسئلة لترشيح أفضل الخيارات المناسبة لكم بدقة...`
        : `Hello ${name}, we received your request for (${propType})${budget} on 1Line, and our advisor will follow up with a few discovery questions to shortlist the best options for you...`;
    }

    return isAr
      ? `أهلاً بك أ. ${name}، بخصوص تواصلكم مع منصة 1Line للحلول العقارية...`
      : `Hello ${name}, regarding your inquiry on 1Line...`;
  };

  const totalNew = (categorized[activeTab] || []).filter((l) => isInboxActive(l) && isLeadUnclaimed(l)).length;
  const hasFilters = view !== 'all' || searchQuery.trim() !== '';
  const assigneeOptions = [
    { value: '__none__', label: isAr ? 'مش مستلم (يرجع للكل)' : 'Nobody (back to unclaimed)' },
    ...assignees.map((m) => ({
      value: m.uid || `name:${m.name}`,
      label: `${m.name || m.email}${m.desk ? ` · ${m.desk}` : ''}`
    }))
  ];

  return (
    <MotionRoot>
      <div className="crm-inbox">
        <PageHeader
          title={isAr ? 'صندوق الوارد' : 'Inbox'}
          description={isAr ? 'كل طلب جديد بيوصل هنا. استلمه علشان محدش تاني يكلّم نفس العميل.' : 'Every new request lands here. Claim it so nobody else calls the same client.'}
        />

        {/* Managers only: unclaimed requests older than the response target */}
        {isSuperAdmin && sla.count > 0 && (
          <div className="crm-inbox__notice" role="status">
            <AlertTriangle size={16} aria-hidden="true" />
            <span className="crm-inbox__notice-text">
              {isAr
                ? `${requestsCount(sla.count)} مستنيين حد يستلمهم (الهدف ${slaMinutes} دقيقة) · أقدمهم ${ageLabel(sla.oldestMs)}`
                : `${requestsCount(sla.count, false)} unclaimed past the ${slaMinutes}-minute target · oldest ${ageLabel(sla.oldestMs, false)}`}
            </span>
            <Button variant="secondary" size="sm" onClick={showLate}>{isAr ? 'اعرضهم' : 'Show them'}</Button>
          </div>
        )}

        <Tabs
          label={isAr ? 'نوع الطلب' : 'Request type'}
          value={activeTab}
          onChange={(id) => setActiveTab(id)}
          items={tabsList.map((t) => {
            const IconComp = t.icon;
            return { id: t.id, label: isAr ? t.label_ar : t.label_en, icon: <IconComp size={16} aria-hidden="true" />, count: t.unhandled || null };
          })}
        />

        {activeTab === 'whatsapp' ? (
          intents === undefined ? null : (
            <WhatsAppIntentsList
              intents={intents}
              properties={properties}
              isAr={isAr}
              now={currentTime}
              canEdit={canEditLeads}
              onLink={linkIntent}
              onResolve={(intent, status) => resolveIntent(intent, status)}
            />
          )
        ) : (<>
        <div className="crm-inbox__toolbar">
          <label className="crm-inbox__search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label={isAr ? 'بحث في الطلبات' : 'Search requests'}
              placeholder={canSeePhone ? (isAr ? 'اسم، تليفون، كود عقار أو موظف' : 'Name, phone, code or agent') : (isAr ? 'اسم، كود عقار أو موظف' : 'Name, code or agent')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <div className="crm-inbox__chips" role="group" aria-label={isAr ? 'عرض' : 'Show'}>
            {INBOX_VIEWS.map((v) => (
              <Chip key={v.id} pressed={view === v.id} count={viewCounts[v.id]} onClick={() => setView(v.id)}>
                {isAr ? v.label_ar : v.label_en}
              </Chip>
            ))}
          </div>
        </div>

        <p className="crm-inbox__summary">
          {isAr
            ? `${requestsCount(currentItems.length)}${totalNew ? ` · ${totalNew} مش مستلم` : ''}`
            : `${requestsCount(currentItems.length, false)}${totalNew ? ` · ${totalNew} unclaimed` : ''}`}
        </p>

        {currentItems.length === 0 ? (
          <EmptyState
            title={view === 'todo' && !searchQuery.trim() ? (isAr ? 'مفيش طلبات مستنية حد هنا' : 'Nothing waiting here') : hasFilters ? (isAr ? 'مفيش طلبات بالفلتر ده' : 'No requests match') : (isAr ? 'مفيش طلبات هنا دلوقتي' : 'Nothing here right now')}
            description={hasFilters ? (isAr ? 'الطلبات اللي اتعاملت معاها موجودة في «الكل».' : 'Requests already handled are under All.') : (isAr ? 'أول ما يوصل طلب جديد هيظهر هنا.' : 'New requests show up here as they arrive.')}
            action={hasFilters ? (
              <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setView('all'); }}>
                {isAr ? 'اعرض الكل' : 'Show all'}
              </Button>
            ) : null}
          />
        ) : (
          <ul className="crm-inbox__list">
            {currentItems.slice(0, shown).map((lead) => {
              const isClaimedByMe = isLeadClaimedByMe(lead, myUid, currentStaffName);
              const isUnclaimed = isLeadUnclaimed(lead);
              const ownerDisplay = getLeadOwnerDisplay(lead, isAr);
              const waPhone = formatWhatsAppPhone(lead.whatsapp || lead.phone || '');
              const facts = getLeadFacts(lead, activeTab, isAr);
              const images = lead.details?.images || [];
              // CRM log lines ("[09:19 ص] تم تحديث المرحلة…") are split off before the client's text is tidied
              const { client: rawNotes, log } = splitNotes(lead.notes || '');
              const notes = rawNotes ? cleanNotes(rawNotes) : '';
              const got = receivedMs(lead);
              const when = formatReceived(got, currentTime, isAr);
              const age = Number.isFinite(got) ? ageLabel(currentTime - got, isAr) : '';
              const followUp = receivedMs({ createdAt: lead.nextFollowUpAt });
              const followLate = Number.isFinite(followUp) && followUp < new Date(currentTime).setHours(0, 0, 0, 0);
              const inboxStage = isInboxStage(lead.status);

              return (
                <li key={lead.id}>
                  <Card padding="compact" className={cx('crm-inbox-item', isUnclaimed && 'is-new')}>
                    <div className="crm-inbox-item__head">
                      <Avatar name={lead.name || ''} />
                      <div className="crm-inbox-item__who">
                        <h2 className="crm-inbox-item__name">{lead.name || (isAr ? 'عميل بدون اسم' : 'Unnamed client')}</h2>
                        <p className="crm-inbox-item__meta">
                          <span>
                            <Phone size={14} aria-hidden="true" />
                            <bdi dir="ltr">
                              {canSeePhone ? (formatPhoneNumber(lead.phone) || (isAr ? 'بدون تليفون' : 'No phone')) : maskPhoneNumber(lead.phone, userRole, userPerms)}
                            </bdi>
                          </span>
                          {when && (
                            <span title={isAr ? 'وصل' : 'Received'}>
                              <Clock size={14} aria-hidden="true" />
                              {when}{age ? ` · ${age}` : ''}
                            </span>
                          )}
                          {Number.isFinite(followUp) && (
                            <span className={cx(followLate && 'is-late')}>
                              {isAr ? `المتابعة: ${formatReceived(followUp, currentTime, isAr)}${followLate ? ' (فات ميعادها)' : ''}` : `Follow-up: ${formatReceived(followUp, currentTime, isAr)}${followLate ? ' (late)' : ''}`}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="crm-inbox-item__owner">
                        {isUnclaimed ? (
                          <Button size="sm" icon={<Hand size={16} aria-hidden="true" />} loading={claimingId === lead.id} onClick={() => handleClaimLead(lead)}>
                            {isAr ? 'استلم الطلب' : 'Claim'}
                          </Button>
                        ) : (
                          <Badge tone={isClaimedByMe ? 'success' : 'neutral'} icon={<Lock size={12} aria-hidden="true" />}>
                            {isClaimedByMe ? (isAr ? 'معاك' : 'Yours') : (isAr ? `مع ${ownerDisplay}` : `With ${ownerDisplay}`)}
                          </Badge>
                        )}
                        {isSuperAdmin && onUpdateLead && (
                          <IconButton
                            size="sm"
                            label={isAr ? 'حوّله لموظف' : 'Assign to someone'}
                            icon={<UserCog size={16} aria-hidden="true" />}
                            onClick={() => openReassign(lead)}
                          />
                        )}
                        {canEditLeads && onUpdateLead && (
                          <IconButton
                            size="sm"
                            label={isAr ? 'إخفاء من الوارد (أرشفة، مش مسح)' : 'Archive (hide, not delete)'}
                            icon={<Archive size={16} aria-hidden="true" />}
                            onClick={() => handleArchive(lead)}
                          />
                        )}
                      </div>
                    </div>

                    {reassigningLeadId === lead.id && (
                      <form
                        className="crm-inbox-item__reassign"
                        onSubmit={(e) => { e.preventDefault(); handleExecuteReassign(lead); }}
                      >
                        <Select
                          label={isAr ? 'حوّل المتابعة لـ' : 'Assign to'}
                          placeholder={isAr ? 'اختار موظف' : 'Pick a person'}
                          hint={team === null && !assignees.length ? (isAr ? 'قايمة الفريق مش متاحة دلوقتي.' : 'The team list is unavailable.') : (team === null ? (isAr ? 'دي الأسماء اللي ماسكة طلبات؛ قايمة الفريق كاملة محتاجة إعداد السيرفر.' : 'People already holding requests; the full team list needs the server key.') : undefined)}
                          options={assigneeOptions}
                          value={reassignTo}
                          onChange={(e) => setReassignTo(e.target.value)}
                        />
                        <Button type="submit" size="sm" disabled={!reassignTo}>{isAr ? 'حوّل' : 'Assign'}</Button>
                        <Button variant="ghost" size="sm" onClick={() => setReassigningLeadId(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                      </form>
                    )}

                    {facts.length > 0 && (
                      <dl className="crm-inbox-item__facts">
                        {facts.map((f) => (
                          <div key={f.label} className={cx(f.strong && 'is-strong', f.missing && 'is-missing')}>
                            <dt>{f.label}</dt>
                            <dd>{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {notes && <p className="crm-inbox-item__notes">{notes}</p>}

                    {log.length > 0 && (
                      <details className="crm-inbox-item__log">
                        <summary>{isAr ? `سجل النظام (${log.length})` : `CRM log (${log.length})`}</summary>
                        <ul>
                          {log.map((line, i) => <li key={i}>{line}</li>)}
                        </ul>
                      </details>
                    )}

                    {images.length > 0 && (
                      <div className="crm-inbox-item__photos">
                        {images.slice(0, 4).map((img, i) => (
                          <img key={img} src={img} alt={isAr ? `صورة ${i + 1} من العميل` : `Client photo ${i + 1}`} loading="lazy" />
                        ))}
                        {images.length > 4 && <span className="crm-inbox-item__more">+{images.length - 4}</span>}
                      </div>
                    )}

                    <div className="crm-inbox-item__foot">
                      {inboxStage ? (
                        <SegmentedControl
                          label={isAr ? 'مرحلة المتابعة' : 'Follow-up stage'}
                          value={lead.status || 'new'}
                          onChange={(id) => handleSetStage(lead, id)}
                          options={STAGES.map((st) => ({ value: st.id, label: isAr ? st.label_ar : st.label_en }))}
                        />
                      ) : (
                        <span className="crm-inbox-item__stage">
                          <Badge tone="info">{pipelineStageLabel(lead.status, isAr)}</Badge>
                          <span>{isAr ? 'المرحلة دي بتتغيّر من مسار الصفقات' : 'Change this stage from the pipeline'}</span>
                        </span>
                      )}
                      <div className="crm-inbox-item__actions">
                        {canSeePhone && waPhone && (
                          <a
                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(getWhatsAppMessage(lead))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ui-btn ui-btn--secondary ui-btn--sm"
                          >
                            <MessageCircle size={16} aria-hidden="true" />
                            {isAr ? 'واتساب' : 'WhatsApp'}
                          </a>
                        )}
                        {canSeePhone && lead.phone && (
                          <a href={`tel:${lead.phone}`} className="ui-btn ui-btn--secondary ui-btn--sm">
                            <Phone size={16} aria-hidden="true" />
                            {isAr ? 'اتصال' : 'Call'}
                          </a>
                        )}
                        {activeTab === 'sellers' && onConvertToProperty && (
                          <Button variant="secondary" size="sm" icon={<Building size={16} aria-hidden="true" />} onClick={() => onConvertToProperty(lead)}>
                            {isAr ? 'حوّله لعقار' : 'To listing'}
                          </Button>
                        )}
                        {onOpenLead && (
                          <Button variant="ghost" size="sm" icon={<Eye size={16} aria-hidden="true" />} onClick={() => onOpenLead(lead)}>
                            {isAr ? 'ملف العميل' : 'Client profile'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
        {currentItems.length > shown && (
          <div className="crm-inbox__more">
            <Button variant="secondary" size="sm" onClick={() => setPaging({ key: listKey, n: shown + PAGE_SIZE })}>
              {isAr ? `عرض ${Math.min(PAGE_SIZE, currentItems.length - shown)} كمان (فاضل ${currentItems.length - shown})` : `Show ${Math.min(PAGE_SIZE, currentItems.length - shown)} more`}
            </Button>
          </div>
        )}
        </>)}
      </div>
    </MotionRoot>
  );
}
