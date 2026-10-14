import { useState, useRef, useEffect, useMemo } from 'react';
import { Menu, Search, X, Plus, ChevronDown, Bell, ShieldCheck, Lock, Rocket, Globe, LogOut, Users, Building, Zap, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { getMergedCrmRoles } from './crmRoles';
import { getActiveAccessConfig, subscribeToAccessConfig } from '../../services/accessConfig';
import { desktopAlertsSupported, desktopAlertsEnabled, enableDesktopAlerts, describeDownload, formatLeadHeadline } from '../../utils/newLeadAlerts';

export default function CrmTopbar({
  clientDownloads = [],
  isAr = true,
  leads = [],
  properties = [],
  demands = [],
  universalSearch,
  setUniversalSearch,
  selectedRole,
  setSelectedRole,
  activeRole,
  isSuperAdmin = true,
  isSimulationMode = false,
  activeTab,
  setActiveTab,
  systemSubTab,
  onLogout,
  setShowGoLiveWizard,
  onToggleMobileSidebar,
  onRequestOpen,
  canAdd = {},
  onOpenCommandPalette
}) {
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifTab, setNotifTab] = useState('all'); // 'all' | 'leads' | 'downloads' | 'demands'
  const [desktopAlerts, setDesktopAlerts] = useState(desktopAlertsEnabled);
  const [accessCfg, setAccessCfg] = useState(getActiveAccessConfig);
  useEffect(() => subscribeToAccessConfig(setAccessCfg), []);
  const currentRolesList = useMemo(() => getMergedCrmRoles(accessCfg), [accessCfg]);
  const quickActionRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (quickActionRef.current && !quickActionRef.current.contains(e.target)) {
        setShowQuickActionMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingDemands = useMemo(() => demands.filter(d => d.status === 'pending'), [demands]);

  // Downloads since the bell was last opened count towards the badge
  const [downloadsSeenAt, setDownloadsSeenAt] = useState(() => {
    try { return Number(localStorage.getItem('oneline_crm_downloads_seen_at')) || 0; } catch { return 0; }
  });
  const recentDownloads = useMemo(
    () => clientDownloads.filter((d) => (d.createdAt?.toMillis ? d.createdAt.toMillis() : 0) > downloadsSeenAt),
    [clientDownloads, downloadsSeenAt]
  );

  // Leads unseen by this browser session
  const [leadsSeenAt, setLeadsSeenAt] = useState(() => {
    try { return Number(localStorage.getItem('oneline_crm_leads_seen_at')) || 0; } catch { return 0; }
  });
  const unseenNewLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.status && l.status !== 'new') return false;
      const t = l.createdAt ? new Date(l.createdAt).getTime() : (l.timestamp ? new Date(l.timestamp).getTime() : 0);
      return !leadsSeenAt || t > leadsSeenAt;
    });
  }, [leads, leadsSeenAt]);

  const markAllSeen = () => {
    const now = Date.now();
    setDownloadsSeenAt(now);
    setLeadsSeenAt(now);
    try {
      localStorage.setItem('oneline_crm_downloads_seen_at', String(now));
      localStorage.setItem('oneline_crm_leads_seen_at', String(now));
    } catch { /* not remembered */ }
  };

  const totalNotifications = pendingDemands.length + unseenNewLeads.length + recentDownloads.length;

  // Dynamic breadcrumb labels
  const tabTitles = {
    dashboard: isAr ? 'لوحة القيادة والمؤشرات' : 'Dashboard Overview',
    leads: isAr ? 'العملاء والمبيعات' : 'Leads & Sales',
    kanban: isAr ? 'مسار الصفقات' : 'Pipeline Kanban',
    matching: isAr ? 'المطابقات الذكية AI' : 'Smart AI Matching',
    agents: isAr ? 'فريق المبيعات والعمولات' : 'Sales Team & Commissions',
    retargeting: isAr ? 'إعادة الاستهداف الذكي' : 'Smart Retargeting Hub',
    expat: isAr ? 'خدمات المغتربين VIP' : 'Expat VIP Desk',
    trade_ins: isAr ? 'صفقات التبادل العقاري' : 'Trade-in Deals',
    properties: isAr ? 'محفظة العقارات' : 'Properties Portfolio',
    demands: isAr ? 'طلبات المشترين' : 'Buyer Demands',
    projects: isAr ? 'المشروعات الكبرى' : 'Mega Projects',
    ads: isAr ? 'الإعلانات والحملات' : 'Ads & Campaigns',
    financials: isAr ? 'المالية والأقساط' : 'Financials & Loans',
    analytics: isAr ? 'تحليلات وذكاء المنصة' : 'Visitor Intelligence & Analytics',
    visitor_intelligence: isAr ? 'تحليلات وذكاء المنصة' : 'Visitor Intelligence & Analytics',
    system: isAr ? 'إدارة المنظومة' : 'System Administration',
    areas: isAr ? 'المناطق والأحياء' : 'Districts CMS',
    corporate: isAr ? 'هوية الشركة والمؤسس' : 'Corporate CMS'
  };

  const systemSubTitles = {
    areas: isAr ? 'المناطق والأحياء' : 'Districts CMS',
    corporate: isAr ? 'هوية المؤسس والشركة' : 'Corporate & Founder CMS',
    backup: isAr ? 'النسخ الاحتياطي والبيانات' : 'Backups & Restore',
    automation: isAr ? 'الأتمتة والتنبيهات' : 'Automations',
    errors: isAr ? 'أخطاء الموقع' : 'Site errors'
  };

  const currentTabName = tabTitles[activeTab] || activeTab;
  const currentSubTabName = activeTab === 'system' ? (systemSubTitles[systemSubTab] || systemSubTab) : null;

  // Filtered matching items for live search
  const matchingLeads = useMemo(() => {
    if (!universalSearch || !universalSearch.trim()) return [];
    const q = universalSearch.toLowerCase();
    return leads.filter(l => (l.name || '').toLowerCase().includes(q) || (l.phone || '').includes(q)).slice(0, 4);
  }, [leads, universalSearch]);

  const matchingProperties = useMemo(() => {
    if (!universalSearch || !universalSearch.trim()) return [];
    const q = universalSearch.toLowerCase();
    return properties.filter(p => (p.title_ar || '').toLowerCase().includes(q) || (p.locationName_ar || '').toLowerCase().includes(q)).slice(0, 4);
  }, [properties, universalSearch]);

  const matchingDemands = useMemo(() => {
    if (!universalSearch || !universalSearch.trim()) return [];
    const q = universalSearch.toLowerCase();
    return demands.filter(d => (d.text_ar || '').toLowerCase().includes(q) || (d.clientName || '').toLowerCase().includes(q) || (d.phone || '').includes(q)).slice(0, 4);
  }, [demands, universalSearch]);

  return (
    <header className="crm-topbar">
      {/* Left: Mobile Toggle & Dynamic Breadcrumb */}
      <div className="crm-topbar-left">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="crm-topbar-toggle-btn"
          title={isAr ? 'فتح القائمة الجانبية' : 'Toggle Sidebar'}
          aria-label="Toggle Sidebar"
        >
          <Menu size={18} />
        </button>

        <nav className="crm-breadcrumb" aria-label="Breadcrumb">
          <button 
            type="button"
            className="crm-breadcrumb-root"
            onClick={() => setActiveTab('dashboard')}
          >
            {isAr ? 'الرئيسية' : 'Root'}
          </button>
          
          <span className="crm-breadcrumb-separator" aria-hidden="true">
            {isAr ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
          </span>

          {currentSubTabName ? (
            <button
              type="button"
              className="crm-breadcrumb-root"
              onClick={() => setActiveTab(activeTab)}
            >
              {currentTabName}
            </button>
          ) : (
            <span className="crm-breadcrumb-current is-active">
              {currentTabName}
            </span>
          )}

          {currentSubTabName && (
            <>
              <span className="crm-breadcrumb-separator">
                {isAr ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
              </span>
              <span className="crm-breadcrumb-current is-active" style={{ color: 'var(--crm-accent-text)' }}>
                {currentSubTabName}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Center: Universal Search */}
      <div className="crm-topbar-search-wrap" ref={searchRef}>
        <Search size={14} className="crm-topbar-search-icon" />
        <input
          type="text"
          placeholder={isAr ? 'بحث في العملاء، العقارات، الأوامر…' : 'Search leads, properties, commands...'}
          value={universalSearch}
          onChange={(e) => setUniversalSearch(e.target.value)}
          className="crm-topbar-search-input"
        />
        <div className="crm-topbar-search-actions">
          {universalSearch && (
            <button
              type="button"
              onClick={() => setUniversalSearch('')}
              className="crm-topbar-search-clear"
              title={isAr ? 'مسح البحث' : 'Clear search'}
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenCommandPalette?.()}
            title={isAr ? 'لوحة الأوامر السريعة (Ctrl + K)' : 'Command Palette (Ctrl + K)'}
            className="crm-topbar-kbd-pill"
          >
            ⌘K
          </button>
        </div>

        {/* Live Search Instant Results Dropdown */}
        {universalSearch.trim() && (
          <div className="crm-topbar-search-dropdown">
            {/* Matching Leads */}
            {matchingLeads.length > 0 && (
              <div className="crm-search-dropdown-group">
                <span className="crm-search-dropdown-title is-lead">
                  {isAr ? 'العملاء المطابقين' : 'Matching Leads'}
                </span>
                {matchingLeads.map(l => (
                  <div
                    key={l.id}
                    onClick={() => { setActiveTab('leads'); setUniversalSearch(''); }}
                    className="crm-search-result-item is-lead"
                  >
                    <div>
                      <div className="crm-search-result-name">{l.name}</div>
                      <div className="crm-search-result-sub">{l.phone}</div>
                    </div>
                    <span className="crm-search-result-badge">
                      {isAr ? ({ new: 'جديد', contacted: 'تم التواصل', site_visit: 'معاينة', negotiating: 'تفاوض', closing: 'توقيع', closed: 'ناجحة' }[l.status] || 'جديد') : (l.status || 'new')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Matching Properties */}
            {matchingProperties.length > 0 && (
              <div className="crm-search-dropdown-group">
                <span className="crm-search-dropdown-title is-prop">
                  {isAr ? 'العقارات المطابقة' : 'Matching Properties'}
                </span>
                {matchingProperties.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { setActiveTab('properties'); setUniversalSearch(''); }}
                    className="crm-search-result-item is-prop"
                  >
                    <div>
                      <div className="crm-search-result-name">{p.title_ar}</div>
                      <div className="crm-search-result-sub">{p.price?.toLocaleString('en-US')} ج.م</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Matching Demands */}
            {matchingDemands.length > 0 && (
              <div className="crm-search-dropdown-group">
                <span className="crm-search-dropdown-title is-demand">
                  {isAr ? 'طلبات المشترين' : 'Matching Demands'}
                </span>
                {matchingDemands.map(d => (
                  <div
                    key={d.id}
                    onClick={() => { setActiveTab('demands'); setUniversalSearch(''); }}
                    className="crm-search-result-item is-demand"
                  >
                    <div>
                      <div className="crm-search-result-name">{d.text_ar || d.clientName}</div>
                      <div className="crm-search-result-sub">ميزانية: {d.budget} ج.م</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {matchingLeads.length === 0 && matchingProperties.length === 0 && matchingDemands.length === 0 && (
              <div className="crm-notif-empty">
                <span>{isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching results found'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Actions Cluster */}
      <div className="crm-topbar-right">
        {/* Quick Action Button */}
        <div className="crm-quick-action-wrap" ref={quickActionRef}>
          <button
            type="button"
            onClick={() => setShowQuickActionMenu(!showQuickActionMenu)}
            className="crm-btn-primary-gold"
            aria-expanded={showQuickActionMenu}
            style={{ padding: '6px 13px', fontSize: 'var(--crm-text-xs)' }}
          >
            <Plus size={14} />
            <span>{isAr ? 'إجراء سريع' : 'Quick Action'}</span>
            <ChevronDown size={12} style={{ transform: showQuickActionMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showQuickActionMenu && (
            <div className="crm-quick-action-dropdown">
              {canAdd.lead !== false && (
                <button
                  type="button"
                  onClick={() => { if (onRequestOpen) onRequestOpen('add_lead'); else setActiveTab('leads'); setShowQuickActionMenu(false); }}
                  className="crm-quick-action-item"
                >
                  <Users size={15} style={{ color: 'var(--crm-info)' }} />
                  <span>{isAr ? '+ تسجيل عميل جديد' : '+ New Lead'}</span>
                </button>
              )}

              {canAdd.property !== false && (
                <button
                  type="button"
                  onClick={() => { if (onRequestOpen) onRequestOpen('add_property'); else setActiveTab('properties'); setShowQuickActionMenu(false); }}
                  className="crm-quick-action-item"
                >
                  <Building size={15} style={{ color: 'var(--crm-accent-text)' }} />
                  <span>{isAr ? '+ إضافة عقار جديد' : '+ New Property'}</span>
                </button>
              )}

              {canAdd.demand !== false && (
                <button
                  type="button"
                  onClick={() => { if (onRequestOpen) onRequestOpen('add_demand'); else setActiveTab('demands'); setShowQuickActionMenu(false); }}
                  className="crm-quick-action-item"
                >
                  <Zap size={15} style={{ color: 'var(--crm-positive)' }} />
                  <span>{isAr ? '+ إضافة طلب مشترٍ' : '+ New Demand'}</span>
                </button>
              )}

              {canAdd.project !== false && (
                <button
                  type="button"
                  onClick={() => { if (onRequestOpen) onRequestOpen('add_project'); else setActiveTab('projects'); setShowQuickActionMenu(false); }}
                  className="crm-quick-action-item"
                >
                  <Building size={15} style={{ color: 'var(--crm-violet)' }} />
                  <span>{isAr ? '+ إضافة مشروع استثماري' : '+ New Project'}</span>
                </button>
              )}

              <div className="crm-quick-action-divider" />

              <button
                type="button"
                onClick={() => { setActiveTab('matching'); setShowQuickActionMenu(false); }}
                className="crm-quick-action-item"
              >
                <Sparkles size={15} style={{ color: 'var(--crm-accent-text)' }} />
                <span>{isAr ? '✨ فحص المطابقات الذكية AI' : '✨ Smart AI Match'}</span>
              </button>

              {canAdd.retarget !== false && (
                <button
                  type="button"
                  onClick={() => { setActiveTab('retargeting'); setShowQuickActionMenu(false); }}
                  className="crm-quick-action-item"
                >
                  <Zap size={15} style={{ color: 'var(--crm-danger)' }} />
                  <span>{isAr ? '📢 حملة إعادة استهداف' : '📢 Retargeting Campaign'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notifications Center */}
        <div className="crm-notif-wrap" ref={notifRef}>
          <button
            type="button"
            className="crm-notif-btn"
            onClick={() => { if (!showNotifMenu) markAllSeen(); setShowNotifMenu(!showNotifMenu); }}
            title={isAr ? 'الإشعارات والتنبيهات' : 'Notifications'}
            aria-expanded={showNotifMenu}
          >
            <Bell size={16} />
            {totalNotifications > 0 && <span className="crm-notif-badge">{totalNotifications}</span>}
          </button>

          {showNotifMenu && (
            <div className="crm-notif-dropdown">
              <div className="crm-notif-header">
                <span className="crm-notif-header-title">
                  <Bell size={15} style={{ color: 'var(--crm-accent-text)' }} />
                  <span>{isAr ? 'مركز الإشعارات الحية' : 'Live Notifications'}</span>
                </span>
                <span className="crm-notif-header-badge">
                  {totalNotifications} {isAr ? 'تنبيه' : 'alerts'}
                </span>
              </div>

              {/* Category Filter Tabs */}
              <div className="crm-notif-tabs">
                <button
                  type="button"
                  className={`crm-notif-tab-btn ${notifTab === 'all' ? 'is-active' : ''}`}
                  onClick={() => setNotifTab('all')}
                >
                  {isAr ? 'الكل' : 'All'} ({totalNotifications})
                </button>
                <button
                  type="button"
                  className={`crm-notif-tab-btn ${notifTab === 'leads' ? 'is-active' : ''}`}
                  onClick={() => setNotifTab('leads')}
                >
                  {isAr ? 'العملاء' : 'Leads'} ({unseenNewLeads.length})
                </button>
                <button
                  type="button"
                  className={`crm-notif-tab-btn ${notifTab === 'downloads' ? 'is-active' : ''}`}
                  onClick={() => setNotifTab('downloads')}
                >
                  {isAr ? 'التحميلات' : 'Downloads'} ({clientDownloads.length})
                </button>
                <button
                  type="button"
                  className={`crm-notif-tab-btn ${notifTab === 'demands' ? 'is-active' : ''}`}
                  onClick={() => setNotifTab('demands')}
                >
                  {isAr ? 'الطلبات' : 'Demands'} ({pendingDemands.length})
                </button>
              </div>

              <div className="crm-notif-body">
                {desktopAlertsSupported() && !desktopAlerts && (
                  <button
                    type="button"
                    className="crm-topbar-tool-btn"
                    onClick={async () => setDesktopAlerts(await enableDesktopAlerts())}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Bell size={13} /> {isAr ? 'تفعيل إشعارات سطح المكتب' : 'Enable desktop alerts'}
                  </button>
                )}

                {/* Unseen New Leads */}
                {(notifTab === 'all' || notifTab === 'leads') && unseenNewLeads.length > 0 && (
                  <div className="crm-notif-card is-leads">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent-text)' }}>
                        ⚡ {isAr ? 'طلبات جديدة بحاجة للرد' : 'Unseen New Requests'}
                      </strong>
                      <span className="crm-search-result-badge">{unseenNewLeads.length}</span>
                    </div>
                    {unseenNewLeads.slice(0, 5).map((l) => (
                      <div
                        key={l.id}
                        className="crm-notif-item"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('oneline_open_lead', { detail: { leadId: l.id, lead: l } }));
                          setShowNotifMenu(false);
                        }}
                      >
                        <div style={{ fontWeight: 'bold', color: 'var(--crm-ink)', fontSize: 'var(--crm-text-xs)' }}>
                          {formatLeadHeadline(l, isAr)}
                        </div>
                        <small style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-xs)' }}>
                          {l.name || (isAr ? 'عميل' : 'Client')} • {l.phone || l.whatsapp || ''}
                        </small>
                      </div>
                    ))}
                  </div>
                )}

                {/* Client Downloads */}
                {(notifTab === 'all' || notifTab === 'downloads') && clientDownloads.length > 0 && (
                  <div className="crm-notif-card is-downloads">
                    <div style={{ fontWeight: 'bold', fontSize: 'var(--crm-text-xs)', color: 'var(--crm-info)', marginBottom: '6px' }}>
                      📥 {isAr ? 'آخر تحميلات العملاء للبروشورات' : 'Client downloads'}
                    </div>
                    {clientDownloads.slice(0, 6).map((d) => (
                      <div key={d.id} className="crm-notif-item">
                        <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-ink)' }}>{describeDownload(d, isAr)}</div>
                        <small style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-xs)', direction: 'ltr', display: 'block' }}>
                          {d.clientPhone || d.clientEmail || ''}
                        </small>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Buyer Demands */}
                {(notifTab === 'all' || notifTab === 'demands') && pendingDemands.length > 0 && (
                  <div
                    className="crm-notif-card is-demands"
                    onClick={() => { setActiveTab('demands'); setShowNotifMenu(false); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--crm-danger)', fontWeight: 'bold', fontSize: 'var(--crm-text-xs)' }}>
                      <AlertTriangle size={13} />
                      <span>{isAr ? `يوجد ${pendingDemands.length} طلب مشترٍ بحاجة للمراجعة!` : `${pendingDemands.length} pending demands`}</span>
                    </div>
                    <small style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-xs)', display: 'block', marginTop: '2px' }}>
                      {isAr ? 'انقر للذهاب لصفحة الطلبات واعتمادها' : 'Click to review and approve'}
                    </small>
                  </div>
                )}

                {/* Encrypted Sync Pill */}
                {notifTab === 'all' && (
                  <div className="crm-notif-card is-sync">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--crm-positive)', fontWeight: 'bold', fontSize: 'var(--crm-text-xs)' }}>
                      <CheckCircle2 size={13} />
                      <span>{isAr ? 'جلسة التشفير والسحابة نشطة' : 'Encrypted Cloud Sync Active'}</span>
                    </div>
                    <small style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-xs)', display: 'block', marginTop: '2px' }}>
                      {isAr ? 'تمت مزامنة البيانات مع Firebase بنجاح' : 'Data synchronized with Firestore'}
                    </small>
                  </div>
                )}

                {totalNotifications === 0 && (
                  <div className="crm-notif-empty">
                    <CheckCircle2 size={24} style={{ color: 'var(--crm-positive)' }} />
                    <span>{isAr ? 'لا توجد تنبيهات جديدة، كل الأمور تحت السيطرة!' : 'No new notifications, all clear!'}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Simulator Switcher (Super Admin only) */}
        {isSuperAdmin ? (
          <div className={`crm-role-switcher-box ${isSimulationMode ? 'is-simulating' : ''}`}>
            <ShieldCheck size={14} style={{ color: isSimulationMode ? 'var(--crm-warn)' : 'var(--crm-accent)' }} />
            <select
              className="crm-role-select"
              aria-label={isAr ? 'محاكي الأدوار' : 'Role simulator'}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              title={isAr ? 'محاكي الأدوار (متاح للمدير العام فقط للمعاينة)' : 'Role Simulation (Super Admin preview)'}
            >
              {currentRolesList.map(r => (
                <option key={r.id} value={r.id}>
                  {r.icon} {isAr ? r.label_ar : r.label_en}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="crm-role-lock-box">
            <Lock size={12} style={{ color: 'var(--crm-muted)' }} />
            <span>{currentRolesList.find(r => r.id === activeRole)?.icon || '👤'}</span>
            <span>{isAr ? (currentRolesList.find(r => r.id === activeRole)?.label_ar || activeRole) : (currentRolesList.find(r => r.id === activeRole)?.label_en || activeRole)}</span>
          </div>
        )}

        {/* Go-Live Readiness Audit Button */}
        <button
          type="button"
          onClick={() => setShowGoLiveWizard(true)}
          className="crm-topbar-tool-btn crm-top-chip"
          title={isAr ? 'فحص جاهزية الموقع والتحول للإنتاج الفعلي' : 'Go-Live Readiness Audit'}
          aria-label={isAr ? 'جاهزية الإطلاق' : 'Go-live audit'}
        >
          <Rocket size={13} style={{ color: 'var(--crm-accent)' }} />
          <span className="crm-top-chip-label">{isAr ? 'جاهزية الإطلاق' : 'Audit'}</span>
        </button>

        {/* Live Site Preview Link */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="crm-topbar-tool-btn crm-top-chip"
          title={isAr ? 'معاينة الموقع العام في تبويب جديد مستقل' : 'View Live Site in New Tab'}
          aria-label={isAr ? 'معاينة الموقع العام' : 'Preview Live Site'}
        >
          <Globe size={13} style={{ color: 'var(--crm-muted)' }} />
          <span className="crm-top-chip-label">{isAr ? 'معاينة الموقع' : 'Preview'}</span>
        </a>

        {/* Logout button */}
        <button
          type="button"
          onClick={onLogout}
          className="crm-topbar-tool-btn is-danger crm-top-chip"
          title={isAr ? 'تسجيل الخروج' : 'Logout'}
          aria-label={isAr ? 'تسجيل الخروج' : 'Logout'}
        >
          <LogOut size={13} />
          <span className="crm-top-chip-label">{isAr ? 'خروج' : 'Exit'}</span>
        </button>
      </div>
    </header>
  );
}
