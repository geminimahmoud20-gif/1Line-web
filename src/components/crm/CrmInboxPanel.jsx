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
  RotateCcw,
  Building,
  DollarSign,
  Briefcase,
  Clock,
  Hand
} from 'lucide-react';
import { PageHeader, Tabs, SegmentedControl, Chip, Badge, Button, IconButton, Input, Card, Avatar, EmptyState, MotionRoot } from '../ui';
import { cx } from '../ui/cx';
import './CrmInboxPanel.css';
import { canViewLeadPhone, maskPhoneNumber } from '../../utils/rbacRules';
import { claimLeadAtomic } from '../../services/leads';
import { normalizeAreaKey, getAreaById } from '../../utils/areasData';
import { formatArabicPlural, sanitizeAndMergeNotes, formatPhoneNumber } from '../../utils/crmNoteSanitizer';

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

const TEAM_DESKS = [
  'Sales Team A',
  'Sales Team B',
  'Sales Management',
  'Sales Advisor Team',
  'Dr. Mahmoud Elbaz',
  'Unassigned',
  'غير مسند'
];

function isLeadUnclaimed(lead) {
  if (!lead) return true;
  if (lead.ownerUid || lead.ownerName || lead.claimedBy) return false;
  return !lead.assignedTo || TEAM_DESKS.includes(lead.assignedTo) || lead.status === 'new';
}

function isLeadClaimedByMe(lead, currentUser, currentStaffName) {
  if (!lead) return false;
  if (lead.ownerUid && currentUser?.uid && lead.ownerUid === currentUser.uid) return true;
  if (lead.ownerName && currentStaffName && lead.ownerName === currentStaffName) return true;
  if (lead.claimedBy && currentStaffName && lead.claimedBy === currentStaffName) return true;
  if (!lead.ownerName && !lead.claimedBy && lead.assignedTo === currentStaffName) return true;
  return false;
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

const STAGES = [
  { id: 'new', label_ar: 'جديد', label_en: 'New' },
  { id: 'contacted', label_ar: 'اتصلنا', label_en: 'Contacted' },
  { id: 'site_visit', label_ar: 'معاينة', label_en: 'Site visit' }
];

const toMillis = (v) => {
  if (!v) return NaN;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return new Date(v).getTime();
};

const money = (n, isAr) => `${Number(n).toLocaleString('en-US')} ${isAr ? 'ج.م' : 'EGP'}`;

// When the request came in: the time if today, otherwise day and month (Latin digits, like the rest of the CRM)
function formatReceived(lead, now, isAr) {
  const t = toMillis(lead.createdAt || lead.timestamp);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  const locale = isAr ? 'ar-EG-u-nu-latn' : 'en-GB';
  if (new Date(now).toDateString() === d.toDateString()) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

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
  if (tab === 'sellers') {
    add(L('النوع', 'Type'), formatPropertyType(d.propertyType));
    add(L('المنطقة', 'Area'), d.area && formatAreaName(d.area));
    add(L('المساحة', 'Size'), d.size && `${d.size} ${L('م²', 'm²')}`);
    add(L('السعر المطلوب', 'Asking price'), d.askingPrice && money(d.askingPrice, isAr), true);
    add(L('التشطيب', 'Finishing'), d.finishingLabelAr);
    add(L('الوضع القانوني', 'Legal'), d.legalSummaryAr);
  } else if (tab === 'visits') {
    add(L('كود العقار', 'Listing'), d.propertyCode || d.propertyId, true);
    add(L('الموعد', 'Date'), d.visitDate && `${d.visitDate}${d.visitSlot ? ` · ${d.visitSlot}` : ''}`);
    add(L('نوع المعاينة', 'Viewing'), d.inspectionType === 'remote' ? L('فيديو أونلاين', 'Video call') : L('في الموقع', 'On site'));
  } else if (tab === 'buyers') {
    add(L('المطلوب', 'Looking for'), d.propertyType && d.propertyType !== 'buyer' && formatPropertyType(d.propertyType));
    add(L('المنطقة', 'Area'), d.area && formatAreaName(d.area));
    add(L('الميزانية', 'Budget'), d.budget && money(d.budget, isAr), true);
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
  _properties = [],
  currentUser = null,
  userRole = 'super_admin',
  userPerms = null,
  lang = 'ar',
  onUpdateLead,
  onOpenLead,
  onConvertToProperty,
  triggerToast,
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
  const [stageFilter, setStageFilter] = useState('all');
  const [reassigningLeadId, setReassigningLeadId] = useState(null);
  const [reassignName, setReassignName] = useState('');
  const [claimingId, setClaimingId] = useState(null);

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

  // Calculate First Response SLA Breaches (Unclaimed leads older than configurable slaMinutes, default 15m)
  const slaBreaches = useMemo(() => {
    const thresholdMillis = (slaMinutes || 15) * 60 * 1000;
    const cutoff = currentTime - thresholdMillis;
    return leads.filter((l) => {
      const createdTime = l.createdAt?.toMillis ? l.createdAt.toMillis() : Date.parse(l.createdAt || l.timestamp || 0);
      const unclaimed = isLeadUnclaimed(l);
      return unclaimed && createdTime > 0 && createdTime < cutoff;
    });
  }, [leads, currentTime, slaMinutes]);

  // Counts of unhandled requests per tab
  const unhandledCounts = useMemo(() => {
    const countPending = (list) => list.filter(l => isLeadUnclaimed(l)).length;
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
    }
  ], [categorized, unhandledCounts]);

  // Current tab items with search & status filtering
  const currentItems = useMemo(() => {
    let list = categorized[activeTab] || [];

    if (stageFilter !== 'all') {
      list = list.filter(l => (l.status || 'new') === stageFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(l => 
        (l.name && l.name.toLowerCase().includes(q)) ||
        (canSeePhone && l.phone && l.phone.includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q)) ||
        (l.assignedTo && l.assignedTo.toLowerCase().includes(q)) ||
        (l.details?.propertyCode && l.details.propertyCode.toLowerCase().includes(q))
      );
    }

    // Sort: Unassigned / New first, then newest timestamp (pure, non-mutating)
    return [...list].sort((a, b) => {
      const aNew = isLeadUnclaimed(a) ? 1 : 0;
      const bNew = isLeadUnclaimed(b) ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.parse(a.createdAt || a.timestamp || 0);
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.parse(b.createdAt || b.timestamp || 0);
      return bTime - aTime;
    });
  }, [categorized, activeTab, stageFilter, searchQuery, canSeePhone]);

  // How many requests in the open tab sit in each stage (the chip counts)
  const stageCounts = useMemo(() => {
    const list = categorized[activeTab] || [];
    const counts = { all: list.length };
    STAGES.forEach((st) => { counts[st.id] = list.filter((l) => (l.status || 'new') === st.id).length; });
    return counts;
  }, [categorized, activeTab]);

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

  // Stage Switch Handler (Changes status upon verified action)
  const handleSetStage = (lead, newStage) => {
    if (!onUpdateLead) return;
    onUpdateLead(lead.id, {
      status: newStage,
      lastStatusUpdate: new Date().toISOString()
    });
    if (triggerToast) {
      const stageObj = STAGES.find(s => s.id === newStage);
      triggerToast(isAr ? `تم تحديث الحالة إلى: ${stageObj ? stageObj.label_ar : newStage}` : 'Status updated', 'info');
    }
  };

  // Reassign Handler for Managers
  const handleExecuteReassign = (leadId) => {
    if (!onUpdateLead || !reassignName.trim()) return;
    onUpdateLead(leadId, {
      assignedTo: reassignName.trim(),
      ownerName: reassignName.trim(),
      assignedAt: new Date().toISOString()
    });
    setReassigningLeadId(null);
    setReassignName('');
    if (triggerToast) {
      triggerToast(isAr ? `تمت إعادة إسناد الطلب إلى "${reassignName.trim()}"` : 'Reassigned successfully', 'success');
    }
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

  const totalNew = unhandledCounts[activeTab] || 0;
  const hasFilters = stageFilter !== 'all' || searchQuery.trim() !== '';

  return (
    <MotionRoot>
      <div className="crm-inbox">
        <PageHeader
          title={isAr ? 'صندوق الوارد' : 'Inbox'}
          description={isAr ? 'كل طلب جديد بيوصل هنا. استلمه علشان محدش تاني يكلّم نفس العميل.' : 'Every new request lands here. Claim it so nobody else calls the same client.'}
        />

        {/* Managers only: unclaimed requests older than the response target */}
        {isSuperAdmin && slaBreaches.length > 0 && (
          <div className="crm-inbox__notice" role="status">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              {isAr
                ? `${formatArabicPlural(slaBreaches.length, 'طلب', 'طلبان', 'طلبات', 'طلباً')} مستنية استلام من أكتر من ${slaMinutes} دقيقة`
                : `${slaBreaches.length} requests unclaimed for over ${slaMinutes} minutes`}
            </span>
          </div>
        )}

        <Tabs
          label={isAr ? 'نوع الطلب' : 'Request type'}
          value={activeTab}
          onChange={(id) => { setActiveTab(id); setStageFilter('all'); }}
          items={tabsList.map((t) => {
            const IconComp = t.icon;
            return { id: t.id, label: isAr ? t.label_ar : t.label_en, icon: <IconComp size={16} aria-hidden="true" />, count: t.unhandled || null };
          })}
        />

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
          <div className="crm-inbox__chips" role="group" aria-label={isAr ? 'المرحلة' : 'Stage'}>
            <Chip pressed={stageFilter === 'all'} count={stageCounts.all} onClick={() => setStageFilter('all')}>
              {isAr ? 'الكل' : 'All'}
            </Chip>
            {STAGES.map((s) => (
              <Chip key={s.id} pressed={stageFilter === s.id} count={stageCounts[s.id]} onClick={() => setStageFilter(s.id)}>
                {isAr ? s.label_ar : s.label_en}
              </Chip>
            ))}
          </div>
        </div>

        <p className="crm-inbox__summary">
          {isAr
            ? `${currentItems.length} طلب${totalNew ? ` · ${totalNew} مستني استلام` : ''}`
            : `${currentItems.length} requests${totalNew ? ` · ${totalNew} unclaimed` : ''}`}
        </p>

        {currentItems.length === 0 ? (
          <EmptyState
            title={hasFilters ? (isAr ? 'مفيش طلبات بالفلتر ده' : 'No requests match') : (isAr ? 'مفيش طلبات هنا دلوقتي' : 'Nothing here right now')}
            description={hasFilters ? (isAr ? 'جرّب تشيل البحث أو تختار مرحلة تانية.' : 'Clear the search or pick another stage.') : (isAr ? 'أول ما يوصل طلب جديد هيظهر هنا.' : 'New requests show up here as they arrive.')}
            action={hasFilters ? (
              <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setStageFilter('all'); }}>
                {isAr ? 'امسح الفلاتر' : 'Clear filters'}
              </Button>
            ) : null}
          />
        ) : (
          <ul className="crm-inbox__list">
            {currentItems.map((lead) => {
              const isClaimedByMe = isLeadClaimedByMe(lead, currentUser, currentStaffName);
              const isUnclaimed = isLeadUnclaimed(lead);
              const ownerDisplay = getLeadOwnerDisplay(lead, isAr);
              const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
              const facts = getLeadFacts(lead, activeTab, isAr);
              const images = lead.details?.images || [];
              const notes = lead.notes ? cleanNotes(lead.notes) : '';
              const when = formatReceived(lead, currentTime, isAr);

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
                            <span>
                              <Clock size={14} aria-hidden="true" />
                              {when}
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
                          <>
                            <Badge tone={isClaimedByMe ? 'success' : 'neutral'} icon={<Lock size={12} aria-hidden="true" />}>
                              {isClaimedByMe ? (isAr ? 'معاك' : 'Yours') : (isAr ? `مع ${ownerDisplay}` : `With ${ownerDisplay}`)}
                            </Badge>
                            {isSuperAdmin && (
                              <IconButton
                                size="sm"
                                label={isAr ? 'تحويل لموظف تاني' : 'Reassign'}
                                icon={<RotateCcw size={16} />}
                                onClick={() => { setReassigningLeadId(lead.id); setReassignName(lead.assignedTo || ''); }}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {reassigningLeadId === lead.id && (
                      <form
                        className="crm-inbox-item__reassign"
                        onSubmit={(e) => { e.preventDefault(); handleExecuteReassign(lead.id); }}
                      >
                        <Input
                          label={isAr ? 'تحويل المتابعة إلى' : 'Assign to'}
                          placeholder={isAr ? 'اسم الموظف أو الفريق' : 'Agent or team'}
                          value={reassignName}
                          onChange={(e) => setReassignName(e.target.value)}
                        />
                        <Button type="submit" size="sm" disabled={!reassignName.trim()}>{isAr ? 'حوّل' : 'Assign'}</Button>
                        <Button variant="ghost" size="sm" onClick={() => setReassigningLeadId(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                      </form>
                    )}

                    {facts.length > 0 && (
                      <dl className="crm-inbox-item__facts">
                        {facts.map((f) => (
                          <div key={f.label} className={cx(f.strong && 'is-strong')}>
                            <dt>{f.label}</dt>
                            <dd>{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {notes && <p className="crm-inbox-item__notes">{notes}</p>}

                    {images.length > 0 && (
                      <div className="crm-inbox-item__photos">
                        {images.slice(0, 4).map((img, i) => (
                          <img key={img} src={img} alt={isAr ? `صورة ${i + 1} من العميل` : `Client photo ${i + 1}`} loading="lazy" />
                        ))}
                        {images.length > 4 && <span className="crm-inbox-item__more">+{images.length - 4}</span>}
                      </div>
                    )}

                    <div className="crm-inbox-item__foot">
                      <SegmentedControl
                        label={isAr ? 'مرحلة المتابعة' : 'Follow-up stage'}
                        value={lead.status && STAGES.some((s) => s.id === lead.status) ? lead.status : 'new'}
                        onChange={(id) => handleSetStage(lead, id)}
                        options={STAGES.map((s) => ({ value: s.id, label: isAr ? s.label_ar : s.label_en }))}
                      />
                      <div className="crm-inbox-item__actions">
                        {canSeePhone && cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(getWhatsAppMessage(lead))}`}
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
      </div>
    </MotionRoot>
  );
}
