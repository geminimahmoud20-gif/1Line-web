import { useState, useEffect, useMemo } from 'react';
import { 
  Inbox, 
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
  Filter
} from 'lucide-react';
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
  { id: 'new', label_ar: 'جديد', label_en: 'New', color: 'var(--crm-danger)', icon: '🔴' },
  { id: 'contacted', label_ar: 'اتصلنا', label_en: 'Contacted', color: 'var(--crm-warn)', icon: '📞' },
  { id: 'site_visit', label_ar: 'معاينة', label_en: 'Site Visit', color: 'var(--crm-accent)', icon: '📅' }
];

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
      label_ar: 'طلبات البيع والتثمين', 
      label_en: 'Sale & Valuation', 
      icon: Home, 
      count: categorized.sellers.length, 
      unhandled: unhandledCounts.sellers,
      accent: 'var(--crm-warn)'
    },
    { 
      id: 'visits', 
      label_ar: 'طلبات المعاينة والزيارات', 
      label_en: 'Site Visits & Bookings', 
      icon: Eye, 
      count: categorized.visits.length, 
      unhandled: unhandledCounts.visits,
      accent: 'var(--crm-accent)'
    },
    { 
      id: 'buyers', 
      label_ar: 'استفسارات وطلبات الشراء', 
      label_en: 'Buyer Demands', 
      icon: DollarSign, 
      count: categorized.buyers.length, 
      unhandled: unhandledCounts.buyers,
      accent: 'var(--crm-positive)'
    },
    { 
      id: 'accounts', 
      label_ar: 'حسابات العملاء المسجلين', 
      label_en: 'Registered Accounts', 
      icon: UserCheck, 
      count: categorized.accounts.length, 
      unhandled: unhandledCounts.accounts,
      accent: 'var(--crm-info)'
    },
    { 
      id: 'brokers', 
      label_ar: 'شركاء شبكة الوسطاء', 
      label_en: 'Broker Partners', 
      icon: Briefcase, 
      count: categorized.brokers.length, 
      unhandled: unhandledCounts.brokers,
      accent: 'var(--crm-muted)'
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
        triggerToast(isAr ? 'تم استلام الطلب وتعيينه لك بنجاح! 🔒' : 'Lead claimed by you!', 'success');
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

  return (
    <div className="crm-inbox-workspace animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 🏛️ Top Header Bar with Executive SLA Badge */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        padding: '16px 20px',
        background: 'var(--crm-card)',
        borderRadius: '14px',
        border: '1px solid var(--crm-line)',
        boxShadow: 'var(--crm-shadow-sm, 0 1px 4px rgba(0,0,0,0.03))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--crm-ink)',
            color: 'var(--crm-on-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Inbox size={22} style={{ color: 'var(--crm-accent)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--crm-text-xl)', fontWeight: 800, color: 'var(--crm-ink)' }}>
                {isAr ? 'صندوق الوارد الذكي وإدارة الاستجابة' : 'Smart Triage Inbox'}
              </h2>
              <span style={{
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 700,
                background: 'var(--crm-warn-soft)',
                color: 'var(--crm-warn)',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid var(--crm-warn-line)'
              }}>
                {isAr ? 'فرز فوري وتوزيع حصري' : 'Instant Triage & Lock'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: 'var(--crm-text-sm)', color: 'var(--crm-muted)' }}>
              {isAr 
                ? 'فصل مسارات البيع والمعاينة والشراء لضمان سرعة الرد ومنع تكرار الاتصال بين أفراد الفريق.' 
                : 'Isolated workflow queues for sellers, site visits and buyers with exclusive claim ownership.'}
            </p>
          </div>
        </div>

        {/* Executive SLA Alerts Banner for Managers */}
        {isSuperAdmin && slaBreaches.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--crm-danger-soft)',
            border: '1px solid var(--crm-danger-line)',
            color: 'var(--crm-danger)',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: 'var(--crm-text-sm)',
            fontWeight: 700
          }}>
            <AlertTriangle size={16} />
            <span>
              {isAr ? `تنبيه المدير: يوجد ${formatArabicPlural(slaBreaches.length, 'طلب', 'طلبان', 'طلبات', 'طلباً')} تجاوزت ${slaMinutes} دقيقة دون استلام أو رد!` : `${slaBreaches.length} requests breached ${slaMinutes}-min response SLA!`}
            </span>
          </div>
        )}
      </div>

      {/* 🧭 The 5 Dedicated Workflow Tabs Bar */}
      <div className="crm-inbox-tabs-grid">
        {tabsList.map((t) => {
          const isActive = activeTab === t.id;
          const IconComp = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => { setActiveTab(t.id); setStageFilter('all'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '12px',
                background: isActive ? 'var(--crm-card)' : 'var(--crm-bg)',
                border: isActive ? `2px solid ${t.accent}` : '1.5px solid var(--crm-line)',
                boxShadow: isActive ? 'var(--crm-shadow-sm, 0 4px 12px rgba(0,0,0,0.05))' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: isAr ? 'right' : 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: 'var(--crm-bg)',
                  color: isActive ? t.accent : 'var(--crm-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconComp size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 'var(--crm-text-sm)', color: isActive ? 'var(--crm-ink)' : 'var(--crm-body)' }}>
                    {isAr ? t.label_ar : t.label_en}
                  </div>
                  <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
                    {t.count} {isAr ? 'طلب إجمالي' : 'total'}
                  </div>
                </div>
              </div>

              {/* Unhandled Badge */}
              {t.unhandled > 0 ? (
                <span style={{
                  background: 'var(--crm-danger)',
                  color: 'var(--crm-on-dark)',
                  fontSize: 'var(--crm-text-xs)',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '12px'
                }}>
                  {t.unhandled} {isAr ? 'جديد' : 'new'}
                </span>
              ) : (
                <span style={{
                  background: 'var(--crm-bg)',
                  color: 'var(--crm-muted)',
                  fontSize: 'var(--crm-text-xs)',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '10px'
                }}>
                  0
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 🔍 Search & Stage Lifecycle Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        background: 'var(--crm-card)',
        borderRadius: '12px',
        border: '1px solid var(--crm-line)'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isAr ? 'right' : 'left']: '12px', color: 'var(--crm-muted)' }} />
          <input
            type="text"
            placeholder={canSeePhone ? (isAr ? 'بحث بالاسم، الهاتف، كود العقار، أو الموظف المسند...' : 'Search by client, phone, code...') : (isAr ? 'بحث بالاسم، كود العقار، أو الموظف المسند...' : 'Search by client, code...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 14px',
              paddingInlineStart: '36px',
              borderRadius: '8px',
              border: '1px solid var(--crm-line)',
              background: 'var(--crm-bg)',
              color: 'var(--crm-ink)',
              fontSize: 'var(--crm-text-sm)'
            }}
          />
        </div>

        {/* Stage Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', fontWeight: 700, marginInlineEnd: '4px' }}>
            <Filter size={13} style={{ verticalAlign: 'middle', marginInlineEnd: '4px' }} />
            {isAr ? 'الحالة:' : 'Stage:'}
          </span>
          <button
            type="button"
            className={`btn-stage-chip ${stageFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStageFilter('all')}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: 'var(--crm-text-xs)',
              fontWeight: 700,
              border: '1px solid',
              borderColor: stageFilter === 'all' ? 'var(--crm-ink)' : 'var(--crm-line)',
              background: stageFilter === 'all' ? 'var(--crm-ink)' : 'var(--crm-card)',
              color: stageFilter === 'all' ? 'var(--crm-on-dark)' : 'var(--crm-muted)',
              cursor: 'pointer'
            }}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          {STAGES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStageFilter(s.id)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: 700,
                border: '1px solid',
                borderColor: stageFilter === s.id ? s.color : 'var(--crm-line)',
                background: stageFilter === s.id ? 'var(--crm-bg)' : 'var(--crm-card)',
                color: stageFilter === s.id ? s.color : 'var(--crm-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{s.icon}</span>
              <span>{isAr ? s.label_ar : s.label_en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 📦 Queue List Cards Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {currentItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            background: 'var(--crm-card)',
            borderRadius: '14px',
            border: '1px dashed var(--crm-line)',
            color: 'var(--crm-muted)'
          }}>
            <Inbox size={38} style={{ margin: '0 auto 12px', color: 'var(--crm-muted)' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: 'var(--crm-text-base)', fontWeight: 800, color: 'var(--crm-ink)' }}>
              {isAr ? 'لا توجد طلبات في هذا التبويب حالياً' : 'No requests in this queue'}
            </h4>
            <p style={{ margin: 0, fontSize: 'var(--crm-text-sm)' }}>
              {isAr ? 'كافة الطلبات الواردة تم الرد عليها وإسنادها بنجاح.' : 'All incoming requests have been assigned and processed.'}
            </p>
          </div>
        ) : (
          currentItems.map((lead) => {
            const d = lead.details || {};
            const isClaimedByMe = isLeadClaimedByMe(lead, currentUser, currentStaffName);
            const isUnclaimed = isLeadUnclaimed(lead);
            const ownerDisplay = getLeadOwnerDisplay(lead, isAr);
            const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');

            return (
              <div
                key={lead.id}
                style={{
                  background: 'var(--crm-card)',
                  borderRadius: '14px',
                  border: isUnclaimed ? '2px solid var(--crm-danger)' : '1px solid var(--crm-line)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative'
                }}
              >
                {/* Top Row: Client Identity & Ownership Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'var(--crm-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 'var(--crm-text-base)',
                      color: 'var(--crm-ink)'
                    }}>
                      {(lead.name || 'ع')[0]}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: 'var(--crm-text-md)', fontWeight: 800, color: 'var(--crm-ink)' }}>
                          {lead.name || (isAr ? 'عميل بدون اسم' : 'Unnamed Lead')}
                        </h4>
                        {/* Stream Identifier Pill */}
                        <span style={{
                          fontSize: 'var(--crm-text-xs)',
                          fontWeight: 700,
                          background: 'var(--crm-bg)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--crm-line)',
                          color: 'var(--crm-body)'
                        }}>
                          {activeTab === 'sellers' ? '💰 عرض بيع' :
                           activeTab === 'visits' ? '🏠 حجز معاينة' :
                           activeTab === 'buyers' ? '🎯 طلب شراء' :
                           activeTab === 'accounts' ? '👤 حساب مسجل' : '🤝 وسيط شريك'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', marginTop: '2px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span>📞</span>
                          <bdi dir="ltr" style={{ unicodeBidi: 'isolate', fontFamily: 'monospace' }}>
                            {canSeePhone ? (formatPhoneNumber(lead.phone) || (isAr ? 'بدون هاتف' : 'No phone')) : maskPhoneNumber(lead.phone, userRole, userPerms)}
                          </bdi>
                        </span>
                        {lead.createdAt && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span>🕒</span>
                            <bdi dir="ltr">{new Date(lead.createdAt?.toMillis ? lead.createdAt.toMillis() : lead.createdAt).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}</bdi>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ownership & Claim Button Area */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isUnclaimed ? (
                      <button
                        type="button"
                        disabled={claimingId === lead.id}
                        onClick={() => handleClaimLead(lead)}
                        style={{
                          background: 'var(--crm-danger)',
                          color: 'var(--crm-on-dark)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: 'var(--crm-text-sm)',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>✋ {claimingId === lead.id ? (isAr ? 'جارٍ الاستلام...' : 'Claiming...') : (isAr ? 'استلمت الطلب' : 'Claim Lead')}</span>
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: isClaimedByMe ? 'var(--crm-positive-soft)' : 'var(--crm-bg)',
                          border: isClaimedByMe ? '1px solid var(--crm-positive)' : '1px solid var(--crm-line)',
                          color: isClaimedByMe ? 'var(--crm-positive)' : 'var(--crm-ink)',
                          fontSize: 'var(--crm-text-xs)',
                          fontWeight: 700
                        }}>
                          <Lock size={12} />
                          <span>{isClaimedByMe ? (isAr ? 'قيد متابعتك 🔒' : 'Assigned to you') : (isAr ? `مع: ${ownerDisplay}` : `With: ${ownerDisplay}`)}</span>
                        </span>

                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => { setReassigningLeadId(lead.id); setReassignName(lead.assignedTo || ''); }}
                            title={isAr ? 'إعادة الإسناد لموظف آخر' : 'Reassign'}
                            style={{
                              background: 'var(--crm-card)',
                              border: '1px solid var(--crm-line)',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: 'var(--crm-text-xs)',
                              cursor: 'pointer',
                              color: 'var(--crm-muted)'
                            }}
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Manager Reassign Input Popout */}
                {reassigningLeadId === lead.id && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'var(--crm-bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--crm-line)'
                  }}>
                    <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 700, color: 'var(--crm-ink)' }}>{isAr ? 'تحويل المتابعة إلى:' : 'Assign to:'}</span>
                    <input
                      type="text"
                      placeholder={isAr ? 'اسم الموظف أو الفريق...' : 'Agent name...'}
                      value={reassignName}
                      onChange={(e) => setReassignName(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: 'var(--crm-text-sm)', borderRadius: '4px', border: '1px solid var(--crm-line)', background: 'var(--crm-card)', color: 'var(--crm-ink)' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleExecuteReassign(lead.id)}
                      style={{ background: 'var(--crm-ink)', color: 'var(--crm-on-dark)', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: 'var(--crm-text-xs)', cursor: 'pointer' }}
                    >
                      {isAr ? 'تأكيد' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReassigningLeadId(null)}
                      style={{ background: 'transparent', border: 'none', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', cursor: 'pointer' }}
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                )}

                {/* Detailed Spec Block Specific to Stream */}
                <div style={{
                  background: 'var(--crm-bg)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  fontSize: 'var(--crm-text-sm)',
                  border: '1px solid var(--crm-line)',
                  color: 'var(--crm-body)'
                }}>
                  {activeTab === 'sellers' && (
                    <>
                      {d.propertyType && <span style={{ fontWeight: 700, color: 'var(--crm-ink)' }}>🏢 {formatPropertyType(d.propertyType)}</span>}
                      {d.area && <span>📍 {formatAreaName(d.area)}</span>}
                      {d.size && <span>📐 {d.size} م²</span>}
                      {d.askingPrice && <span style={{ color: 'var(--crm-positive)', fontWeight: 800 }}>💰 المطلوب: {Number(d.askingPrice).toLocaleString('en-US')} ج.م</span>}
                      {d.finishingLabelAr && <span>✨ {d.finishingLabelAr}</span>}
                      {d.legalSummaryAr && <span>📜 {d.legalSummaryAr}</span>}
                    </>
                  )}

                  {activeTab === 'visits' && (
                    <>
                      {(d.propertyCode || d.propertyId) && (
                        <span style={{ fontWeight: 800, color: 'var(--crm-accent)' }}>
                          🏷️ {isAr ? 'كود العقار:' : 'Code:'} {d.propertyCode || d.propertyId}
                        </span>
                      )}
                      {d.visitDate && (
                        <span style={{ fontWeight: 700 }}>
                          📅 {isAr ? 'الموعد:' : 'Date:'} {d.visitDate} {d.visitSlot ? `(${d.visitSlot})` : ''}
                        </span>
                      )}
                      <span>🚗 {d.inspectionType === 'remote' ? (isAr ? 'فيديو مباشر للمغتربين' : 'Remote Video') : (isAr ? 'معاينة ميدانية بالموقع' : 'On-Site Viewing')}</span>
                    </>
                  )}

                  {activeTab === 'buyers' && (
                    <>
                      {d.propertyType && d.propertyType !== 'buyer' && <span style={{ fontWeight: 700, color: 'var(--crm-ink)' }}>🏢 {isAr ? 'المطلوب:' : 'Desired:'} {formatPropertyType(d.propertyType)}</span>}
                      {d.area && <span>📍 {isAr ? 'المنطقة:' : 'Area:'} {formatAreaName(d.area)}</span>}
                      {d.budget && <span style={{ color: 'var(--crm-positive)', fontWeight: 800 }}>💰 الميزانية: {Number(d.budget).toLocaleString('en-US')} ج.م</span>}
                      {d.paymentMethod && <span>💳 طريقة السداد: {d.paymentMethod === 'cash' ? 'كاش' : 'تقسيط'}</span>}
                    </>
                  )}

                  {activeTab === 'accounts' && (
                    <>
                      <span>📧 {lead.email || (isAr ? 'بدون بريد' : 'No email')}</span>
                      <span>📅 {isAr ? 'تاريخ التسجيل:' : 'Registered:'} {lead.createdAt ? new Date(lead.createdAt?.toMillis ? lead.createdAt.toMillis() : lead.createdAt).toLocaleDateString('ar-EG-u-nu-latn') : (isAr ? 'غير معروف' : 'Unknown')}</span>
                      <span>👤 {isAr ? 'مستخدم مسجل في البوابة' : 'Registered Web Client'}</span>
                    </>
                  )}

                  {activeTab === 'brokers' && (
                    <>
                      <span>🤝 {d.agencyName || (isAr ? 'وسيط مستقل' : 'Independent Broker')}</span>
                      {d.licenseNo && <span>📜 {isAr ? 'ترخيص رقم:' : 'Licence:'} {d.licenseNo}</span>}
                      {d.coverageArea && <span>📍 {d.coverageArea}</span>}
                    </>
                  )}

                  {lead.notes && (
                    <div style={{ width: '100%', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', borderTop: '1px dashed var(--crm-line)', paddingTop: '6px', marginTop: '2px' }}>
                      <strong style={{ color: 'var(--crm-ink)' }}>📝 {isAr ? 'ملاحظات:' : 'Notes:'}</strong> {sanitizeAndMergeNotes(lead.notes)}
                    </div>
                  )}
                </div>

                {/* Photos Preview Strip if photos exist */}
                {d.images && d.images.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                    <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', fontWeight: 700 }}>📸 {d.images.length} صور:</span>
                    {d.images.slice(0, 4).map((img, _idx) => (
                      <img
                        key={_idx}
                        src={img}
                        alt="Preview"
                        style={{ width: '50px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--crm-line)' }}
                      />
                    ))}
                  </div>
                )}

                {/* Bottom Row: 3-Stage Lifecycle Stepper & Quick Actions */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  borderTop: '1px solid var(--crm-line)',
                  paddingTop: '10px'
                }}>
                  {/* The Stages Lifecycle Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)', fontWeight: 700, marginInlineEnd: '4px' }}>
                      {isAr ? 'مرحلة المتابعة:' : 'Stage:'}
                    </span>
                    {STAGES.map((s) => {
                      const isCurrent = (lead.status || 'new') === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSetStage(lead, s.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: 'var(--crm-text-xs)',
                            fontWeight: isCurrent ? 800 : 600,
                            border: isCurrent ? `1.5px solid ${s.color}` : '1px solid var(--crm-line)',
                            background: isCurrent ? 'var(--crm-bg)' : 'var(--crm-card)',
                            color: isCurrent ? s.color : 'var(--crm-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.1s ease'
                          }}
                        >
                          {isAr ? s.label_ar : s.label_en}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* WhatsApp Action with smart text */}
                    {canSeePhone && cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(getWhatsAppMessage(lead))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'var(--crm-positive)',
                          color: 'var(--crm-on-dark)',
                          textDecoration: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: 'var(--crm-text-xs)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <MessageCircle size={14} />
                        <span>{isAr ? 'واتساب مخصص' : 'WhatsApp'}</span>
                      </a>
                    )}

                    {/* Direct Call */}
                    {canSeePhone && lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        style={{
                          background: 'var(--crm-card)',
                          border: '1px solid var(--crm-line)',
                          color: 'var(--crm-ink)',
                          textDecoration: 'none',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: 'var(--crm-text-xs)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Phone size={13} />
                        <span>{isAr ? 'اتصال' : 'Call'}</span>
                      </a>
                    )}

                    {/* Convert to Property (for sellers) */}
                    {activeTab === 'sellers' && onConvertToProperty && (
                      <button
                        type="button"
                        onClick={() => onConvertToProperty(lead)}
                        style={{
                          background: 'var(--crm-accent)',
                          color: 'var(--crm-on-dark)',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: 'var(--crm-text-xs)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Building size={14} />
                        <span>{isAr ? 'تحويل لعقار' : 'To Property'}</span>
                      </button>
                    )}

                    {/* Open Drawer */}
                    {onOpenLead && (
                      <button
                        type="button"
                        onClick={() => onOpenLead(lead)}
                        style={{
                          background: 'var(--crm-bg)',
                          border: '1px solid var(--crm-line)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: 'var(--crm-text-xs)',
                          fontWeight: 700,
                          color: 'var(--crm-ink)',
                          cursor: 'pointer'
                        }}
                      >
                        {isAr ? 'التفاصيل 👁️' : 'Details'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
