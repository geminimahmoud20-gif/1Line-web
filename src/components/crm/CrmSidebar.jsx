import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LayoutGrid, Users, Target, Building, Zap, Sparkles,
  Calculator, Activity, ShieldCheck, ChevronDown, ChevronRight,
  Search, X, Moon, Sun, LogOut, MapPin, Database, Award,
  Cpu, PanelLeftClose, PanelLeftOpen, Trophy, Flame, Megaphone
} from 'lucide-react';
import LogoEmblem from '../LogoEmblem';
import { usePreferences } from '../../context/PreferencesContext';

export default function CrmSidebar({
  activeTab,
  setActiveTab,
  systemSubTab,
  setSystemSubTab,
  isAr = true,
  leads = [],
  properties = [],
  demands = [],
  projects = [],
  activeRole = 'super_admin',
  collapsed = false,
  onToggleCollapse,
  width = 270,
  onWidthChange,
  isMobileOpen = false,
  onCloseMobile,
  onLogout
}) {
  const { theme, toggleTheme } = usePreferences();
  const [filterQuery, setFilterQuery] = useState('');
  const [systemExpanded, setSystemExpanded] = useState(activeTab === 'system' || activeTab === 'areas' || activeTab === 'corporate');
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);

  const pendingDemandsCount = useMemo(() => {
    return demands.filter(d => d.status === 'pending').length;
  }, [demands]);

  // Keep system group open if active tab is related
  useEffect(() => {
    if (activeTab === 'system' || activeTab === 'areas' || activeTab === 'corporate') {
      setSystemExpanded(true);
    }
  }, [activeTab]);

  // Drag resizer handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      let newWidth;
      if (isAr) {
        newWidth = window.innerWidth - e.clientX;
      } else {
        newWidth = e.clientX;
      }
      // Bound between 210px and 420px
      if (newWidth >= 210 && newWidth <= 420 && onWidthChange) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isAr, onWidthChange]);

  const navSections = useMemo(() => [
    {
      label_ar: 'العمليات والمبيعات',
      label_en: 'Core Operations',
      items: [
        {
          id: 'dashboard',
          icon: LayoutGrid,
          label_ar: 'لوحة القيادة',
          label_en: 'Dashboard'
        },
        {
          id: 'leads',
          icon: Users,
          label_ar: 'العملاء والمبيعات',
          label_en: 'Leads & Pipeline',
          badge: leads.length
        },
        {
          id: 'kanban',
          icon: Target,
          label_ar: 'مسار الصفقات',
          label_en: 'Deals Pipeline'
        },
        {
          id: 'matching',
          icon: Sparkles,
          label_ar: 'المطابقات الذكية AI',
          label_en: 'Smart AI Match'
        },
        {
          id: 'agents',
          icon: Trophy,
          label_ar: 'فريق المبيعات والعمولات',
          label_en: 'Agents Leaderboard'
        },
        {
          id: 'retargeting',
          icon: Flame,
          label_ar: 'إعادة الاستهداف الذكي',
          label_en: 'Smart Retargeting'
        }
      ]
    },
    {
      label_ar: 'إدارة الأصول والعروض',
      label_en: 'Assets & Listings',
      items: [
        {
          id: 'properties',
          icon: Building,
          label_ar: 'محفظة العقارات',
          label_en: 'Properties Portfolio',
          badge: properties.length
        },
        {
          id: 'demands',
          icon: Zap,
          label_ar: 'طلبات المشترين',
          label_en: 'Buyer Demands',
          badge: pendingDemandsCount > 0 ? `${pendingDemandsCount} معلق` : demands.length,
          badgeDanger: pendingDemandsCount > 0
        },
        {
          id: 'projects',
          icon: Award,
          label_ar: 'المشروعات الكبرى',
          label_en: 'Mega Projects',
          badge: projects.length
        },
        // Paid placements = revenue: super admin only (also enforced in CrmPage and firestore.rules)
        ...(activeRole === 'super_admin' ? [{
          id: 'ads',
          icon: Megaphone,
          label_ar: 'الإعلانات والحملات',
          label_en: 'Ads & Campaigns'
        }] : [])
      ]
    },
    {
      label_ar: 'الذكاء والتحليلات',
      label_en: 'Finance & Intelligence',
      items: [
        {
          id: 'financials',
          icon: Calculator,
          label_ar: 'المالية والأقساط',
          label_en: 'Financials & Loans'
        },
        {
          id: 'visitor_intelligence',
          icon: Activity,
          label_ar: 'تحليلات ونشاط الزوار',
          label_en: 'Visitor Intelligence'
        }
      ]
    }
  ], [leads.length, properties.length, pendingDemandsCount, demands.length, projects.length, activeRole]);

  const handleItemClick = (id) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSubItemClick = (subId) => {
    setActiveTab('system');
    if (setSystemSubTab) setSystemSubTab(subId);
    if (onCloseMobile) onCloseMobile();
  };

  // Filtered navigation if search is typed
  const isFiltering = filterQuery.trim().length > 0;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`crm-drawer-backdrop ${isMobileOpen ? 'is-visible' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        ref={sidebarRef}
        className={`crm-sidebar ${collapsed ? 'is-collapsed' : ''} ${isMobileOpen ? 'is-mobile-open' : ''}`}
        style={{
          width: collapsed ? '72px' : `${width}px`,
          '--current-sidebar-w': collapsed ? '72px' : `${width}px`
        }}
        aria-label={isAr ? 'القائمة الجانبية للتحكم' : 'CPanel Sidebar Navigation'}
      >
        {/* Resizer Handle (Desktop only) */}
        {!collapsed && (
          <div
            className={`crm-sidebar-resizer ${isResizing ? 'is-resizing' : ''}`}
            onMouseDown={() => setIsResizing(true)}
            title={isAr ? 'اسحب لتغيير عرض القائمة' : 'Drag to resize sidebar'}
          />
        )}

        <div className="crm-sidebar-inner">
          {/* Header Brand */}
          <div className="crm-sidebar-header">
            <a href="/" className="crm-sidebar-brand" title={isAr ? 'الانتقال للموقع الرئيسي' : 'Go to Homepage'}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(13, 72, 161, 0.4))',
                padding: '6px',
                borderRadius: '8px',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <LogoEmblem size={24} />
              </div>
              <div className="crm-brand-title">
                <span className="crm-brand-text" dir="ltr">
                  <span style={{ color: '#d97706' }}>1</span>LINE
                </span>
                <span className="crm-brand-badge">PRO COMMAND</span>
              </div>
            </a>

            <button
              type="button"
              className="crm-sidebar-collapse-btn"
              onClick={onToggleCollapse}
              title={collapsed ? (isAr ? 'توسيع القائمة' : 'Expand Sidebar') : (isAr ? 'طي القائمة' : 'Collapse Sidebar')}
              aria-label={isAr ? 'طي/توسيع القائمة' : 'Toggle sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          {/* Quick Filter Search Input */}
          {!collapsed && (
            <div className="crm-sidebar-search-box">
              <div className="crm-sidebar-search-input-wrap">
                <Search size={13} className="crm-sidebar-search-icon" />
                <input
                  type="text"
                  placeholder={isAr ? 'تصفية القوائم...' : 'Filter modules...'}
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="crm-sidebar-search-input"
                />
                {filterQuery && (
                  <button
                    type="button"
                    onClick={() => setFilterQuery('')}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      [isAr ? 'left' : 'right']: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8', /* sidebar is always dark — fixed light tone, not a theme token */
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex'
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Sections */}
          <nav className="crm-sidebar-nav">
            {navSections.map((section, idx) => {
              const filteredItems = section.items.filter(item => {
                if (!isFiltering) return true;
                const query = filterQuery.toLowerCase();
                const nameAr = (item.label_ar || '').toLowerCase();
                const nameEn = (item.label_en || '').toLowerCase();
                return nameAr.includes(query) || nameEn.includes(query);
              });

              if (filteredItems.length === 0) return null;

              return (
                <div key={idx} className="crm-sidebar-section">
                  {!collapsed && (
                    <div className="crm-sidebar-section-label">
                      {isAr ? section.label_ar : section.label_en}
                    </div>
                  )}

                  {filteredItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const label = isAr ? item.label_ar : item.label_en;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleItemClick(item.id)}
                        className={`crm-sidebar-item ${isActive ? 'is-active' : ''}`}
                        data-tooltip={label}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <div className="crm-item-main">
                          <span className="crm-item-icon">
                            <Icon size={17} />
                          </span>
                          <span className="crm-item-label">{label}</span>
                        </div>
                        {item.badge !== undefined && (
                          <span className={`crm-item-badge ${item.badgeDanger ? 'badge-danger' : ''}`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* System Admin Collapsible Group (Super Admin Only) */}
            {activeRole === 'super_admin' && (
              <div className="crm-sidebar-group">
                {!collapsed && (
                  <div className="crm-sidebar-section-label">
                    {isAr ? 'إدارة المنظومة' : 'Administration'}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      setActiveTab('system');
                      if (onCloseMobile) onCloseMobile();
                    } else {
                      setSystemExpanded(!systemExpanded);
                    }
                  }}
                  className={`crm-sidebar-item ${activeTab === 'system' || activeTab === 'areas' || activeTab === 'corporate' ? 'is-active' : ''}`}
                  data-tooltip={isAr ? 'إدارة المنظومة' : 'System Administration'}
                  aria-expanded={systemExpanded}
                  aria-controls="crm-sidebar-system-subnav"
                >
                  <div className="crm-item-main">
                    <span className="crm-item-icon">
                      <ShieldCheck size={17} />
                    </span>
                    <span className="crm-item-label">
                      {isAr ? 'إدارة المنظومة' : 'System Admin'}
                    </span>
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      size={14}
                      className="crm-group-chevron"
                      style={{
                        transform: systemExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        color: '#94a3b8' /* always-dark sidebar */
                      }}
                    />
                  )}
                </button>

                {/* Submenu for System Modules */}
                {!collapsed && systemExpanded && (
                  <div className="crm-sidebar-subnav" id="crm-sidebar-system-subnav" role="region" aria-label={isAr ? 'القوائم الفرعية لإدارة المنظومة' : 'System administration submodules'}>
                    <button
                      type="button"
                      onClick={() => handleSubItemClick('areas')}
                      className={`crm-sidebar-subitem ${activeTab === 'system' && systemSubTab === 'areas' ? 'is-active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={13} />
                        <span>{isAr ? 'المناطق والأحياء' : 'Districts CMS'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubItemClick('corporate')}
                      className={`crm-sidebar-subitem ${activeTab === 'system' && systemSubTab === 'corporate' ? 'is-active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={13} />
                        <span>{isAr ? 'هوية الشركة والمؤسس' : 'Corporate CMS'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubItemClick('backup')}
                      className={`crm-sidebar-subitem ${activeTab === 'system' && systemSubTab === 'backup' ? 'is-active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Database size={13} />
                        <span>{isAr ? 'النسخ الاحتياطي والبيانات' : 'Data & Backups'}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubItemClick('automation')}
                      className={`crm-sidebar-subitem ${activeTab === 'system' && systemSubTab === 'automation' ? 'is-active' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cpu size={13} />
                        <span>{isAr ? 'الأتمتة والتنبيهات' : 'System Automations'}</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Bottom Controls */}
          <div className="crm-sidebar-bottom">
            {/* Theme Toggle Button */}
            <div className="crm-sidebar-theme-row">
              <button
                type="button"
                onClick={toggleTheme}
                className="crm-sidebar-theme-btn"
                title={isAr ? (theme === 'dark' ? 'تبديل للوضع النهاري' : 'تبديل للوضع الليلي الفاخر') : 'Toggle Theme'}
              >
                {theme === 'dark' ? <Sun size={15} style={{ color: '#f59e0b' }} /> : <Moon size={15} style={{ color: '#93c5fd' }} />}
                <span>
                  {isAr ? (theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي') : (theme === 'dark' ? 'Light Mode' : 'Dark Mode')}
                </span>
              </button>
            </div>

            {/* Executive User Card & Logout */}
            <div className="crm-sidebar-user-card">
              <div className="crm-user-info">
                <div className="crm-user-avatar">
                  <span>{isAr ? 'م' : 'MB'}</span>
                  <span className="crm-user-status-dot" title={isAr ? 'متصل ومحمي' : 'Online & Encrypted'} />
                </div>
                <div className="crm-user-text">
                  <span className="crm-user-name">
                    {isAr ? 'د. محمود الباز' : 'Dr. Mahmoud Elbaz'}
                  </span>
                  <span className="crm-user-role-label">
                    {activeRole === 'super_admin' ? (isAr ? 'المدير التنفيذي 👑' : 'Super Admin 👑') : (isAr ? 'مشرف عمليات' : 'Manager')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="crm-sidebar-logout-btn"
                title={isAr ? 'تسجيل الخروج' : 'Logout'}
                aria-label="Logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
