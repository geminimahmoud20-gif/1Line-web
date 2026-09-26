import React, { useState, useRef, useEffect } from 'react';
import {
  Menu, Search, X, Plus, ChevronDown, Bell, ShieldCheck,
  Lock, Rocket, Globe, LogOut, Users, Building, Zap,
  Sparkles, CheckCircle2, AlertTriangle, Clock, ArrowRight, ArrowLeft
} from 'lucide-react';
import { CRM_ROLES } from '../CrmAdminPanel';

export default function CrmTopbar({
  lang = 'ar',
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
  showGoLiveWizard,
  setShowGoLiveWizard,
  onToggleMobileSidebar,
  onOpenCommandPalette
}) {
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
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
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        // don't clear text, just let it blur
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingDemands = demands.filter(d => d.status === 'pending');
  const recentLeads = leads.slice(0, 3);
  const totalNotifications = pendingDemands.length + (recentLeads.length > 0 ? 1 : 0);

  // Dynamic breadcrumb labels
  const tabTitles = {
    dashboard: isAr ? 'لوحة القيادة والمؤشرات' : 'Dashboard Overview',
    leads: isAr ? 'العملاء والمبيعات' : 'Leads & Sales',
    kanban: isAr ? 'مسار الصفقات' : 'Pipeline Kanban',
    matching: isAr ? 'المطابقات الذكية AI' : 'Smart AI Matching',
    agents: isAr ? 'فريق المبيعات والعمولات' : 'Sales Team & Commissions',
    retargeting: isAr ? 'إعادة الاستهداف الذكي' : 'Smart Retargeting Hub',
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
    automation: isAr ? 'الأتمتة والتنبيهات' : 'Automations'
  };

  const currentTabName = tabTitles[activeTab] || activeTab;
  const currentSubTabName = activeTab === 'system' ? (systemSubTitles[systemSubTab] || systemSubTab) : null;

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
          <span 
            className="crm-breadcrumb-root"
            onClick={() => setActiveTab('dashboard')}
            role="button"
            tabIndex={0}
          >
            {isAr ? 'الرئيسية' : 'Root'}
          </span>
          
          <span className="crm-breadcrumb-separator">
            {isAr ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
          </span>

          <span 
            className={`crm-breadcrumb-current ${!currentSubTabName ? 'is-active' : ''}`}
            onClick={() => currentSubTabName && setActiveTab(activeTab)}
            style={{ cursor: currentSubTabName ? 'pointer' : 'default' }}
          >
            {currentTabName}
          </span>

          {currentSubTabName && (
            <>
              <span className="crm-breadcrumb-separator">
                {isAr ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
              </span>
              <span className="crm-breadcrumb-current is-active" style={{ color: 'var(--crm-gold)' }}>
                {currentSubTabName}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Center: Universal Search */}
      <div className="crm-topbar-search-wrap" ref={searchRef}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            [isAr ? 'right' : 'left']: '12px',
            color: 'var(--crm-faint)'
          }}
        />
        <input
          type="text"
          placeholder={isAr ? 'ابحث أو اضغط (Ctrl + K) للأوامر…' : 'Search or press (Ctrl + K)...'}
          value={universalSearch}
          onChange={(e) => setUniversalSearch(e.target.value)}
          className="crm-topbar-search-input"
        />
        <div style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          [isAr ? 'left' : 'right']: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {universalSearch && (
            <button
              type="button"
              onClick={() => setUniversalSearch('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--crm-faint)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenCommandPalette?.()}
            title={isAr ? 'لوحة الأوامر السريعة (Ctrl + K)' : 'Command Palette (Ctrl + K)'}
            style={{
              background: 'var(--crm-subtle, #f9f8f5)',
              border: '1px solid var(--crm-line, #e2e8f0)',
              borderRadius: '5px',
              padding: '2px 6px',
              fontSize: 'var(--crm-text-xs)',
              color: 'var(--crm-muted)',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ⌘K
          </button>
        </div>

        {/* Live Search Instant Results Dropdown */}
        {universalSearch.trim() && (
          <div
            className="crm-dropdown-card"
            style={{
              [isAr ? 'right' : 'left']: 0,
              width: '360px',
              maxHeight: '380px',
              overflowY: 'auto',
              padding: '10px'
            }}
          >
            {/* Matching Leads */}
            {leads.filter(l => (l.name || '').toLowerCase().includes(universalSearch.toLowerCase()) || (l.phone || '').includes(universalSearch)).length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-info)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'العملاء المطابقين' : 'Matching Leads'}
                </span>
                {leads.filter(l => (l.name || '').toLowerCase().includes(universalSearch.toLowerCase()) || (l.phone || '').includes(universalSearch)).slice(0, 3).map(l => (
                  <div
                    key={l.id}
                    onClick={() => { setActiveTab('leads'); setUniversalSearch(''); }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'rgba(37, 99, 235, 0.06)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold' }}>{l.name}</div>
                      <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>{l.phone}</div>
                    </div>
                    <span style={{ fontSize: 'var(--crm-text-xs)', padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px', color: 'var(--crm-body)' }}>
                      {isAr ? ({ new: 'جديد', contacted: 'تم التواصل', site_visit: 'معاينة', negotiating: 'تفاوض', closing: 'توقيع', closed: 'ناجحة' }[l.status] || 'جديد') : (l.status || 'new')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Matching Properties */}
            {properties.filter(p => (p.title_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (p.locationName_ar || '').toLowerCase().includes(universalSearch.toLowerCase())).length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent-text)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'العقارات المطابقة' : 'Matching Properties'}
                </span>
                {properties.filter(p => (p.title_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (p.locationName_ar || '').toLowerCase().includes(universalSearch.toLowerCase())).slice(0, 3).map(p => (
                  <div
                    key={p.id}
                    onClick={() => { setActiveTab('properties'); setUniversalSearch(''); }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'rgba(217, 119, 6, 0.08)',
                      marginBottom: '4px'
                    }}
                  >
                    <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold' }}>{p.title_ar}</div>
                    <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>{p.price?.toLocaleString()} ج.م</div>
                  </div>
                ))}
              </div>
            )}

            {/* Matching Demands */}
            {demands.filter(d => (d.text_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.clientName || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.phone || '').includes(universalSearch)).length > 0 && (
              <div>
                <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-positive)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  {isAr ? 'طلبات المشترين' : 'Matching Demands'}
                </span>
                {demands.filter(d => (d.text_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.clientName || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.phone || '').includes(universalSearch)).slice(0, 3).map(d => (
                  <div
                    key={d.id}
                    onClick={() => { setActiveTab('demands'); setUniversalSearch(''); }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: 'rgba(5, 150, 105, 0.08)',
                      marginBottom: '4px'
                    }}
                  >
                    <div style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold' }}>{d.text_ar || d.clientName}</div>
                    <div style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>ميزانية: {d.budget} ج.م</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Actions Cluster */}
      <div className="crm-topbar-right">
        {/* Quick Action Button */}
        <div style={{ position: 'relative' }} ref={quickActionRef}>
          <button
            type="button"
            onClick={() => setShowQuickActionMenu(!showQuickActionMenu)}
            style={{
              background: '#0F172A',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: 'var(--crm-text-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '8px',
              border: '1px solid #1E293B',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={14} style={{ color: 'var(--crm-accent)' }} />
            <span>{isAr ? 'إجراء سريع' : 'Action'}</span>
            <ChevronDown size={12} style={{ color: 'var(--crm-faint)' }} />
          </button>

          {showQuickActionMenu && (
            <div
              className="crm-dropdown-card"
              style={{
                [isAr ? 'left' : 'right']: 0,
                minWidth: '220px',
                padding: '6px'
              }}
            >
              <button
                type="button"
                onClick={() => { setActiveTab('leads'); setShowQuickActionMenu(false); }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  textAlign: isAr ? 'right' : 'left',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  fontSize: 'var(--crm-text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                <Users size={14} style={{ color: 'var(--crm-info)' }} />
                <span>{isAr ? '+ تسجيل عميل جديد' : '+ New Lead'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('properties'); setShowQuickActionMenu(false); }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  textAlign: isAr ? 'right' : 'left',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  fontSize: 'var(--crm-text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                <Building size={14} style={{ color: 'var(--crm-accent-text)' }} />
                <span>{isAr ? '+ إضافة عقار جديد' : '+ New Property'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('demands'); setShowQuickActionMenu(false); }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  textAlign: isAr ? 'right' : 'left',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  fontSize: 'var(--crm-text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                <Zap size={14} style={{ color: 'var(--crm-positive)' }} />
                <span>{isAr ? '+ إضافة طلب مشترٍ' : '+ New Demand'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('projects'); setShowQuickActionMenu(false); }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  textAlign: isAr ? 'right' : 'left',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  fontSize: 'var(--crm-text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                <Building size={14} style={{ color: '#7c3aed' }} />
                <span>{isAr ? '+ إضافة مشروع استثماري' : '+ New Project'}</span>
              </button>

              <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 8px' }} />

              <button
                type="button"
                onClick={() => { setActiveTab('matching'); setShowQuickActionMenu(false); }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  textAlign: isAr ? 'right' : 'left',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  fontSize: 'var(--crm-text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                <Sparkles size={14} style={{ color: 'var(--crm-accent-text)' }} />
                <span>{isAr ? '✨ فحص المطابقات الذكية AI' : '✨ Smart AI Match'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('retargeting'); setShowQuickActionMenu(false); }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  textAlign: isAr ? 'right' : 'left',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  fontSize: 'var(--crm-text-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                <Zap size={14} style={{ color: '#ef4444' }} />
                <span>{isAr ? '📢 حملة إعادة استهداف' : '📢 Retargeting Campaign'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Center */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            type="button"
            className="crm-notif-btn"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            title={isAr ? 'الإشعارات والتنبيهات' : 'Notifications'}
          >
            <Bell size={16} />
            {totalNotifications > 0 && <span className="crm-notif-badge" />}
          </button>

          {showNotifMenu && (
            <div
              className="crm-dropdown-card"
              style={{
                [isAr ? 'left' : 'right']: 0,
                width: '320px',
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: 'var(--crm-text-sm)', fontWeight: 'bold' }}>
                  {isAr ? 'مركز الإشعارات الحية' : 'Live Notifications'}
                </span>
                <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
                  {totalNotifications} {isAr ? 'تنبيه' : 'alerts'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingDemands.length > 0 ? (
                  <div
                    onClick={() => { setActiveTab('demands'); setShowNotifMenu(false); }}
                    style={{
                      padding: '8px 10px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 'bold', fontSize: 'var(--crm-text-xs)' }}>
                      <AlertTriangle size={13} />
                      <span>{isAr ? `يوجد ${pendingDemands.length} طلب مشترٍ بحاجة للمراجعة!` : `${pendingDemands.length} pending demands awaiting approval`}</span>
                    </div>
                    <small style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-xs)', display: 'block', marginTop: '2px' }}>
                      {isAr ? 'انقر للذهاب لصفحة الطلبات واعتمادها' : 'Click to review and approve'}
                    </small>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--crm-positive)', fontSize: 'var(--crm-text-xs)', padding: '6px' }}>
                    <CheckCircle2 size={14} />
                    <span>{isAr ? 'جميع طلبات المشترين معتمدة ومحدثة' : 'All buyer demands approved'}</span>
                  </div>
                )}

                <div style={{
                  padding: '8px 10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--crm-positive)', fontWeight: 'bold', fontSize: 'var(--crm-text-xs)' }}>
                    <CheckCircle2 size={13} />
                    <span>{isAr ? 'جلسة التشفير والسحابة نشطة' : 'Encrypted Cloud Sync Active'}</span>
                  </div>
                  <small style={{ color: 'var(--crm-muted)', fontSize: 'var(--crm-text-xs)', display: 'block', marginTop: '2px' }}>
                    {isAr ? 'تمت مزامنة البيانات مع Firebase بنجاح' : 'Data synchronized with Firestore'}
                  </small>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Role Simulator Switcher (Super Admin only) */}
        {isSuperAdmin ? (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--crm-subtle)',
            border: isSimulationMode ? '1px solid var(--crm-warn)' : '1px solid var(--crm-line)',
            borderRadius: '8px',
            padding: '4px 10px'
          }}>
            <ShieldCheck size={14} style={{ color: isSimulationMode ? 'var(--crm-warn)' : 'var(--crm-accent)' }} />
            <select
              className="crm-role-select"
              aria-label={isAr ? 'محاكي الأدوار' : 'Role simulator'}
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 'var(--crm-text-xs)',
                fontWeight: '700',
                color: selectedRole === 'super_admin' ? 'var(--crm-ink)' : 'var(--crm-accent-text)',
                cursor: 'pointer',
                outline: 'none'
              }}
              title={isAr ? 'محاكي الأدوار (متاح للمدير العام فقط للمعاينة)' : 'Role Simulation (Super Admin preview)'}
            >
              {CRM_ROLES.map(r => (
                <option key={r.id} value={r.id}>
                  {r.icon} {isAr ? r.label_ar : r.label_en}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--crm-subtle)',
            border: '1px solid var(--crm-line)',
            borderRadius: '8px',
            padding: '4px 10px',
            fontSize: 'var(--crm-text-xs)',
            fontWeight: '600',
            color: 'var(--crm-body)'
          }}>
            <Lock size={12} style={{ color: 'var(--crm-muted)' }} />
            <span>{CRM_ROLES.find(r => r.id === activeRole)?.icon || '👤'}</span>
            <span>{isAr ? (CRM_ROLES.find(r => r.id === activeRole)?.label_ar || activeRole) : (CRM_ROLES.find(r => r.id === activeRole)?.label_en || activeRole)}</span>
          </div>
        )}

        {/* Go-Live Readiness Audit Button */}
        <button
          type="button"
          onClick={() => setShowGoLiveWizard(true)}
          style={{
            background: 'var(--crm-subtle)',
            border: '1px solid var(--crm-line)',
            color: 'var(--crm-body)',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: 'var(--crm-text-xs)',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title={isAr ? 'فحص جاهزية الموقع والتحول للإنتاج الفعلي' : 'Go-Live Readiness Audit'}
          aria-label={isAr ? 'جاهزية الإطلاق' : 'Go-live audit'}
          className="crm-top-chip"
        >
          <Rocket size={13} style={{ color: 'var(--crm-accent)' }} />
          <span className="crm-top-chip-label">{isAr ? 'جاهزية الإطلاق' : 'Audit'}</span>
        </button>

        {/* Live Site Link */}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 'var(--crm-text-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'var(--crm-subtle)',
            border: '1px solid var(--crm-line)',
            color: 'var(--crm-ink)',
            textDecoration: 'none',
            fontWeight: '600',
            transition: 'all 0.15s ease'
          }}
          title={isAr ? 'معاينة الموقع في نافذة مستقلة' : 'View Live Site'}
          aria-label={isAr ? 'فتح الموقع' : 'Open site'}
          className="crm-top-chip"
        >
          <Globe size={13} style={{ color: 'var(--crm-muted)' }} />
          <span className="crm-top-chip-label">{isAr ? 'الموقع' : 'Site'}</span>
        </a>

        {/* Quick Logout button in topbar */}
        <button
          type="button"
          onClick={onLogout}
          style={{
            color: '#DC2626',
            fontSize: 'var(--crm-text-xs)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid #FECACA',
            background: '#FEF2F2',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease'
          }}
          title={isAr ? 'تسجيل الخروج' : 'Logout'}
          aria-label={isAr ? 'تسجيل الخروج' : 'Logout'}
          className="crm-top-chip"
        >
          <LogOut size={13} />
          <span className="crm-top-chip-label">{isAr ? 'خروج' : 'Exit'}</span>
        </button>
      </div>
    </header>
  );
}
