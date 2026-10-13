import { useState, useMemo } from 'react';
import { 
  Inbox, 
  Home, 
  Eye, 
  UserCheck, 
  Search, 
  Sparkles, 
  Phone, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  RotateCcw, 
  Building, 
  Calendar, 
  MapPin, 
  DollarSign, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  Shield,
  Briefcase,
  ExternalLink,
  Filter
} from 'lucide-react';
import { formatWhatsAppPhone } from '../../utils/matchingEngine';

const STAGES = [
  { id: 'new', label_ar: 'جديد', label_en: 'New', color: '#ef4444', icon: '🔴' },
  { id: 'contacted', label_ar: 'اتصلنا', label_en: 'Contacted', color: '#f59e0b', icon: '📞' },
  { id: 'scheduled', label_ar: 'اتحدد ميعاد', label_en: 'Scheduled', color: '#6366f1', icon: '📅' },
  { id: 'closed', label_ar: 'خلص', label_en: 'Closed', color: '#10b981', icon: '✅' }
];

export default function CrmInboxPanel({
  leads = [],
  properties = [],
  currentUser = null,
  userRole = 'super_admin',
  lang = 'ar',
  onUpdateLead,
  onOpenLead,
  onConvertToProperty,
  triggerToast
}) {
  const isAr = lang === 'ar';
  const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
  const isMarketing = userRole === 'marketing' || userRole === 'content_creator';
  const isSales = userRole === 'sales_agent' || userRole === 'sales_manager' || userRole === 'broker';

  // Default active tab based on staff role
  const defaultTab = isMarketing ? 'sellers' : (isSales ? 'visits' : 'sellers');
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all'); // 'all' | 'new' | 'contacted' | 'scheduled' | 'closed'
  const [reassigningLeadId, setReassigningLeadId] = useState(null);
  const [reassignName, setReassignName] = useState('');

  const currentStaffName = useMemo(() => {
    return currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || (isAr ? 'موظف 1Line' : 'Staff');
  }, [currentUser, isAr]);

  // Categorize leads into dedicated triage streams
  const categorized = useMemo(() => {
    const sellers = [];
    const visits = [];
    const buyers = [];
    const accounts = [];
    const brokers = [];

    leads.forEach((l) => {
      const details = l.details || {};
      const type = (l.type || '').toLowerCase();
      const notes = (l.notes || '').toLowerCase();
      const landing = (l.landingPage || '').toLowerCase();

      // 1. Viewing / Visit Bookings
      if (
        type === 'visit' || 
        type === 'viewing' || 
        details.visitDate || 
        details.inspectionType || 
        notes.includes('معاينة') || 
        notes.includes('زيارة')
      ) {
        visits.push(l);
      }
      // 2. Sellers & Valuation Demands
      else if (
        type === 'seller' || 
        type === 'valuation' || 
        landing.includes('/sell') || 
        landing.includes('/valuation') || 
        notes.includes('عرض بيع') ||
        details.askingPrice
      ) {
        sellers.push(l);
      }
      // 3. Registered User Accounts
      else if (
        type === 'account' || 
        type === 'client_registration' || 
        type === 'client' || 
        landing.includes('/account')
      ) {
        accounts.push(l);
      }
      // 4. Broker Partners
      else if (
        type === 'broker' || 
        landing.includes('/broker') || 
        notes.includes('وسيط')
      ) {
        brokers.push(l);
      }
      // 5. Buyer Requests / Investor Demands (Default)
      else {
        buyers.push(l);
      }
    });

    return { sellers, visits, buyers, accounts, brokers };
  }, [leads]);

  // Calculate SLA Breaches (Unclaimed leads older than 2 hours)
  const slaBreaches = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- SLA breach detection requires current clock time
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    return leads.filter((l) => {
      const createdTime = l.createdAt?.toMillis ? l.createdAt.toMillis() : Date.parse(l.createdAt || l.timestamp || 0);
      const isUnclaimed = !l.assignedTo || l.status === 'new';
      return isUnclaimed && createdTime > 0 && createdTime < twoHoursAgo;
    });
  }, [leads]);

  // Counts of unhandled requests per tab
  const unhandledCounts = useMemo(() => {
    const countPending = (list) => list.filter(l => !l.assignedTo || l.status === 'new').length;
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
      accent: '#d97706'
    },
    { 
      id: 'visits', 
      label_ar: 'طلبات المعاينة والزيارات', 
      label_en: 'Site Visits & Bookings', 
      icon: Eye, 
      count: categorized.visits.length, 
      unhandled: unhandledCounts.visits,
      accent: '#6366f1'
    },
    { 
      id: 'buyers', 
      label_ar: 'استفسارات وطلبات الشراء', 
      label_en: 'Buyer Demands', 
      icon: DollarSign, 
      count: categorized.buyers.length, 
      unhandled: unhandledCounts.buyers,
      accent: '#059669'
    },
    { 
      id: 'accounts', 
      label_ar: 'حسابات العملاء المسجلين', 
      label_en: 'Registered Accounts', 
      icon: UserCheck, 
      count: categorized.accounts.length, 
      unhandled: unhandledCounts.accounts,
      accent: '#0284c7'
    },
    { 
      id: 'brokers', 
      label_ar: 'شركاء شبكة الوسطاء', 
      label_en: 'Broker Partners', 
      icon: Briefcase, 
      count: categorized.brokers.length, 
      unhandled: unhandledCounts.brokers,
      accent: '#8b5cf6'
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
        (l.phone && l.phone.includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q)) ||
        (l.assignedTo && l.assignedTo.toLowerCase().includes(q)) ||
        (l.details?.propertyCode && l.details.propertyCode.toLowerCase().includes(q))
      );
    }

    // Sort: Unassigned / New first, then newest timestamp
    return list.sort((a, b) => {
      const aNew = (!a.assignedTo || a.status === 'new') ? 1 : 0;
      const bNew = (!b.assignedTo || b.status === 'new') ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.parse(a.createdAt || a.timestamp || 0);
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.parse(b.createdAt || b.timestamp || 0);
      return bTime - aTime;
    });
  }, [categorized, activeTab, stageFilter, searchQuery]);

  // Claim Lead Handler
  const handleClaimLead = (lead) => {
    if (!onUpdateLead) return;

    if (lead.assignedTo && lead.assignedTo !== currentStaffName && !isSuperAdmin) {
      if (triggerToast) {
        triggerToast(isAr ? `عذراً، هذا الطلب مستلم بالفعل بواسطة "${lead.assignedTo}" لمنع تكرار الاتصال.` : `Already claimed by ${lead.assignedTo}`, 'warning');
      }
      return;
    }

    onUpdateLead(lead.id, {
      assignedTo: currentStaffName,
      assignedAt: new Date().toISOString(),
      status: (!lead.status || lead.status === 'new') ? 'contacted' : lead.status
    });

    if (triggerToast) {
      triggerToast(isAr ? `تم استلام الطلب وتعيينه لك بنجاح! 🔒` : `Lead claimed by you!`, 'success');
    }
  };

  // Stage Switch Handler
  const handleSetStage = (lead, newStage) => {
    if (!onUpdateLead) return;
    onUpdateLead(lead.id, {
      status: newStage,
      lastStatusUpdate: new Date().toISOString()
    });
    if (triggerToast) {
      const stageObj = STAGES.find(s => s.id === newStage);
      triggerToast(isAr ? `تم تحديث الحالة إلى: ${stageObj ? stageObj.label_ar : newStage}` : `Status updated`, 'info');
    }
  };

  // Reassign Handler for Managers
  const handleExecuteReassign = (leadId) => {
    if (!onUpdateLead || !reassignName.trim()) return;
    onUpdateLead(leadId, {
      assignedTo: reassignName.trim(),
      assignedAt: new Date().toISOString()
    });
    setReassigningLeadId(null);
    setReassignName('');
    if (triggerToast) {
      triggerToast(isAr ? `تمت إعادة إسناد الطلب إلى "${reassignName.trim()}"` : `Reassigned successfully`, 'success');
    }
  };

  // Generate customized WhatsApp text based on stream
  const getWhatsAppMessage = (lead) => {
    const name = lead.name || (isAr ? 'العميل' : 'Client');
    const d = lead.details || {};

    if (activeTab === 'visits') {
      const propCode = d.propertyCode || d.propertyId || (isAr ? 'عقار' : 'Property');
      const date = d.visitDate || (isAr ? 'المحدد' : '');
      const slot = d.visitSlot || '';
      return isAr 
        ? `أهلاً بك أ. ${name}، بخصوص طلبكم لمعاينة العقار (كود: ${propCode}) عبر منصة 1Line بتاريخ ${date} (${slot})، نسعد بتأكيد الموعد معكم...`
        : `Hello ${name}, regarding your viewing request for property (${propCode}) on 1Line...`;
    }

    if (activeTab === 'sellers') {
      const propType = d.propertyType || lead.propertyType || (isAr ? 'عقاركم' : 'property');
      const area = d.area || lead.area || (isAr ? 'سوهاج' : 'Sohag');
      return isAr
        ? `أهلاً بك أ. ${name}، بخصوص رغبتكم في عرض (${propType}) في (${area}) للبيع والتسويق عبر منصة 1Line، نود مراجعة التفاصيل والصور معكم للبدء فوراً...`
        : `Hello ${name}, regarding your listing request on 1Line...`;
    }

    if (activeTab === 'buyers') {
      const propType = d.propertyType || lead.propertyType || (isAr ? 'عقار' : 'property');
      const budget = d.budget || lead.budget ? ` بميزانية ${d.budget || lead.budget}` : '';
      return isAr
        ? `أهلاً بك أ. ${name}، بخصوص بحثكم عن (${propType})${budget} عبر 1Line، تم إعداد قائمة مختارة تطابق طلبكم تماماً...`
        : `Hello ${name}, regarding your property search on 1Line...`;
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
        background: 'var(--crm-card, #ffffff)',
        borderRadius: '14px',
        border: '1px solid var(--crm-line, #e2e8f0)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)'
          }}>
            <Inbox size={22} color="#fbbf24" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--crm-ink, #0f172a)' }}>
                {isAr ? 'صندوق الوارد الذكي وإدارة الاستجابة' : 'Smart Triage Inbox'}
              </h2>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                background: 'rgba(217, 119, 6, 0.1)',
                color: '#d97706',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid rgba(217, 119, 6, 0.25)'
              }}>
                {isAr ? 'فرز فوري وتوزيع حصري' : 'Instant Triage & Lock'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--crm-muted, #64748b)' }}>
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
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '0.82rem',
            fontWeight: 700
          }}>
            <AlertTriangle size={16} />
            <span>
              {isAr ? `تنبيه المدير: يوجد ${slaBreaches.length} طلبات تجاوزت ساعتين دون استلام أو رد!` : `${slaBreaches.length} requests breached 2-hour response SLA!`}
            </span>
          </div>
        )}
      </div>

      {/* 🧭 The 5 Dedicated Workflow Tabs Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px'
      }}>
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
                background: isActive ? 'var(--crm-card, #ffffff)' : 'rgba(255, 255, 255, 0.65)',
                border: isActive ? `2px solid ${t.accent}` : '1.5px solid var(--crm-line, #e2e8f0)',
                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
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
                  background: isActive ? `${t.accent}15` : '#f1f5f9',
                  color: isActive ? t.accent : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconComp size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.86rem', color: isActive ? 'var(--crm-ink, #0f172a)' : '#475569' }}>
                    {isAr ? t.label_ar : t.label_en}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    {t.count} {isAr ? 'طلب إجمالي' : 'total'}
                  </div>
                </div>
              </div>

              {/* Unhandled Badge */}
              {t.unhandled > 0 ? (
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.25)'
                }}>
                  {t.unhandled} {isAr ? 'جديد' : 'new'}
                </span>
              ) : (
                <span style={{
                  background: '#f1f5f9',
                  color: '#94a3b8',
                  fontSize: '0.72rem',
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
        background: 'var(--crm-card, #ffffff)',
        borderRadius: '12px',
        border: '1px solid var(--crm-line, #e2e8f0)'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isAr ? 'right' : 'left']: '12px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={isAr ? 'بحث بالاسم، الهاتف، كود العقار، أو الموظف المسند...' : 'Search by client, phone, code...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 14px',
              paddingInlineStart: '36px',
              borderRadius: '8px',
              border: '1px solid var(--crm-line, #cbd5e1)',
              background: '#f8fafc',
              fontSize: '0.84rem'
            }}
          />
        </div>

        {/* Stage Filter Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, marginInlineEnd: '4px' }}>
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
              fontSize: '0.78rem',
              fontWeight: 700,
              border: '1px solid',
              borderColor: stageFilter === 'all' ? '#0f172a' : '#e2e8f0',
              background: stageFilter === 'all' ? '#0f172a' : '#fff',
              color: stageFilter === 'all' ? '#fff' : '#64748b',
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
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid',
                borderColor: stageFilter === s.id ? s.color : '#e2e8f0',
                background: stageFilter === s.id ? `${s.color}15` : '#fff',
                color: stageFilter === s.id ? s.color : '#64748b',
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
            background: 'var(--crm-card, #ffffff)',
            borderRadius: '14px',
            border: '1px dashed var(--crm-line, #cbd5e1)',
            color: '#64748b'
          }}>
            <Inbox size={38} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 800, color: '#334155' }}>
              {isAr ? 'لا توجد طلبات في هذا التبويب حالياً' : 'No requests in this queue'}
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem' }}>
              {isAr ? 'كافة الطلبات الواردة تم الرد عليها وإسنادها بنجاح.' : 'All incoming requests have been assigned and processed.'}
            </p>
          </div>
        ) : (
          currentItems.map((lead) => {
            const d = lead.details || {};
            const isClaimedByMe = lead.assignedTo === currentStaffName;
            const isUnclaimed = !lead.assignedTo;
            const currentStage = STAGES.find(s => s.id === (lead.status || 'new')) || STAGES[0];
            const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');

            return (
              <div
                key={lead.id}
                style={{
                  background: 'var(--crm-card, #ffffff)',
                  borderRadius: '14px',
                  border: isUnclaimed ? '2px solid #ef4444' : '1px solid var(--crm-line, #e2e8f0)',
                  boxShadow: isUnclaimed ? '0 2px 8px rgba(239, 68, 68, 0.08)' : '0 1px 4px rgba(0,0,0,0.02)',
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
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      color: '#0f172a'
                    }}>
                      {(lead.name || 'ع')[0]}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                          {lead.name || (isAr ? 'عميل بدون اسم' : 'Unnamed Lead')}
                        </h4>
                        {/* Stream Identifier Pill */}
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#f8fafc',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          color: '#475569'
                        }}>
                          {activeTab === 'sellers' ? '💰 عرض بيع' :
                           activeTab === 'visits' ? '🏠 حجز معاينة' :
                           activeTab === 'buyers' ? '🎯 طلب شراء' :
                           activeTab === 'accounts' ? '👤 حساب مسجل' : '🤝 وسيط شريك'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        <span>📞 {lead.phone || 'بدون هاتف'}</span>
                        {lead.createdAt && (
                          <span>🕒 {new Date(lead.createdAt?.toMillis ? lead.createdAt.toMillis() : lead.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ownership & Claim Button Area */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isUnclaimed ? (
                      <button
                        type="button"
                        onClick={() => handleClaimLead(lead)}
                        style={{
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <span>✋ {isAr ? 'استلمت الطلب' : 'Claim Lead'}</span>
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          background: isClaimedByMe ? '#ecfdf5' : '#f8fafc',
                          border: isClaimedByMe ? '1px solid #10b981' : '1px solid #cbd5e1',
                          color: isClaimedByMe ? '#059669' : '#334155',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}>
                          <Lock size={12} />
                          <span>{isClaimedByMe ? (isAr ? 'قيد متابعتك 🔒' : 'Assigned to you') : (isAr ? `مع: ${lead.assignedTo}` : `With: ${lead.assignedTo}`)}</span>
                        </span>

                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => { setReassigningLeadId(lead.id); setReassignName(lead.assignedTo || ''); }}
                            title={isAr ? 'إعادة الإسناد لموظف آخر' : 'Reassign'}
                            style={{
                              background: '#fff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              color: '#64748b'
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
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1'
                  }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{isAr ? 'تحويل المتابعة إلى:' : 'Assign to:'}</span>
                    <input
                      type="text"
                      placeholder={isAr ? 'اسم الموظف أو الفريق...' : 'Agent name...'}
                      value={reassignName}
                      onChange={(e) => setReassignName(e.target.value)}
                      style={{ padding: '4px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleExecuteReassign(lead.id)}
                      style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      {isAr ? 'تأكيد' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReassigningLeadId(null)}
                      style={{ background: 'transparent', border: 'none', fontSize: '0.78rem', color: '#64748b', cursor: 'pointer' }}
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                )}

                {/* Detailed Spec Block Specific to Stream */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  fontSize: '0.82rem',
                  border: '1px solid #f1f5f9'
                }}>
                  {activeTab === 'sellers' && (
                    <>
                      {d.propertyType && <span style={{ fontWeight: 700, color: '#0f172a' }}>🏢 {d.propertyType}</span>}
                      {d.area && <span>📍 {d.area}</span>}
                      {d.size && <span>📐 {d.size} م²</span>}
                      {d.askingPrice && <span style={{ color: '#059669', fontWeight: 800 }}>💰 المطلوب: {Number(d.askingPrice).toLocaleString('en-US')} ج.م</span>}
                      {d.finishingLabelAr && <span>✨ {d.finishingLabelAr}</span>}
                      {d.legalSummaryAr && <span>📜 {d.legalSummaryAr}</span>}
                    </>
                  )}

                  {activeTab === 'visits' && (
                    <>
                      <span style={{ fontWeight: 800, color: '#6366f1' }}>
                        🏷️ {isAr ? 'كود العقار:' : 'Code:'} {d.propertyCode || d.propertyId || 'P-101'}
                      </span>
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
                      {d.propertyType && <span style={{ fontWeight: 700 }}>🏢 المطلوب: {d.propertyType}</span>}
                      {d.area && <span>📍 المنطقة: {d.area}</span>}
                      {d.budget && <span style={{ color: '#059669', fontWeight: 800 }}>💰 الميزانية: {Number(d.budget).toLocaleString('en-US')} ج.م</span>}
                      {d.paymentMethod && <span>💳 طريقة السداد: {d.paymentMethod === 'cash' ? 'كاش' : 'تقسيط'}</span>}
                    </>
                  )}

                  {activeTab === 'accounts' && (
                    <>
                      <span>📧 {lead.email || 'بدون بريد'}</span>
                      <span>📅 {isAr ? 'تاريخ التسجيل:' : 'Registered:'} {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('ar-EG') : '—'}</span>
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
                    <div style={{ width: '100%', fontSize: '0.78rem', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '6px', marginTop: '2px' }}>
                      <strong>📝 {isAr ? 'ملاحظات:' : 'Notes:'}</strong> {lead.notes}
                    </div>
                  )}
                </div>

                {/* Photos Preview Strip if photos exist */}
                {d.images && d.images.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '4px 0' }}>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>📸 {d.images.length} صور:</span>
                    {d.images.slice(0, 4).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Preview"
                        style={{ width: '50px', height: '38px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                      />
                    ))}
                  </div>
                )}

                {/* Bottom Row: 4-Stage Lifecycle Stepper & Quick Actions */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: '10px'
                }}>
                  {/* The 4 Stages Lifecycle Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, marginInlineEnd: '4px' }}>
                      {isAr ? 'مرحلة المتابعة:' : 'Stage:'}
                    </span>
                    {STAGES.map((s, idx) => {
                      const isCurrent = (lead.status || 'new') === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSetStage(lead, s.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: isCurrent ? 800 : 600,
                            border: isCurrent ? `1.5px solid ${s.color}` : '1px solid #e2e8f0',
                            background: isCurrent ? `${s.color}18` : '#fff',
                            color: isCurrent ? s.color : '#64748b',
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
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(getWhatsAppMessage(lead))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#128C4A',
                          color: '#fff',
                          textDecoration: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
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
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        style={{
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          textDecoration: 'none',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
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
                          background: '#6366f1',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
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
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#0f172a',
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
