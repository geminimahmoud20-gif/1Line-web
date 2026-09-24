import { useState, useEffect, useCallback } from 'react';
import { 
  Lock, ShieldCheck, LogOut, Users, Building, Sparkles, KeyRound, Eye, EyeOff, 
  AlertTriangle, Globe, Zap, Search, X, ChevronDown, Plus, Clock, Rocket, MapPin,
  LayoutGrid, Target, Calculator, Activity, Database
} from 'lucide-react';
import LogoEmblem from '../components/LogoEmblem';
import CrmAdminPanel, { CRM_ROLES } from '../components/CrmAdminPanel';
import PropertyManagerPanel from '../components/crm/PropertyManagerPanel';
import MegaProjectsManagerPanel from '../components/crm/MegaProjectsManagerPanel';
import DemandsManagerPanel from '../components/crm/DemandsManagerPanel';
import FounderCmsPanel from '../components/crm/FounderCmsPanel';
import AreaManagerPanel from '../components/crm/AreaManagerPanel';
import GoLiveWizardModal from '../components/crm/GoLiveWizardModal';
import CrmSidebar from '../components/crm/CrmSidebar';
import CrmTopbar from '../components/crm/CrmTopbar';
import CrmCommandPalette from '../components/crm/CrmCommandPalette';
import '../components/crm/CrmLayout.css';
import '../components/crm/crm-luxury.css';
import { isFirebaseAuthAvailable, loginUser } from '../firebaseService';
import { useAuth } from '../context/AuthContext';
import { canEditProperties, canEditLeadsRole } from '../utils/rbacRules';
import { verifyAdminCredentials } from '../utils/securityShield';

export default function CrmPage({
  lang = 'ar',
  t,
  leads = [],
  setLeads,
  properties = [],
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  projects = [],
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  crmAuthenticated,
  setCrmAuthenticated,
  onLogout,
  triggerToast,
  onUpdateLead,
  onDeleteLead,
  onAddNewLead,
  demands = [],
  onAddDemand,
  onApproveDemand,
  onUpdateDemand,
  onDeleteDemand,
  onUnpublishDemand
}) {
  const { isAuthInitializing, currentUser, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'leads' | 'kanban' | 'properties' | 'demands' | 'projects' | 'financials' | 'matching' | 'analytics' | 'system'
  // Fail closed: a signed-in account whose role is unknown (e.g. 'agent' from a claims error)
  // gets read-only 'viewer'. Only the local-password session (no Firebase user) is super_admin.
  const knownRole = (r) => (CRM_ROLES.some((x) => x.id === r) ? r : null);
  const ROLE_ALIASES = { admin: 'super_admin' };
  const resolveRole = (r) => knownRole(ROLE_ALIASES[r] || r);
  const hasLocalSessionFlag = (!isFirebaseAuthAvailable() || import.meta.env.DEV)
    && typeof window !== 'undefined' && sessionStorage.getItem('crm_auth') === 'true';
  const verifiedUserRole = currentUser
    ? (resolveRole(currentUser.role) || 'viewer')
    : (resolveRole(userRole) || (hasLocalSessionFlag ? 'super_admin' : 'viewer'));
  const isSuperAdminUser = verifiedUserRole === 'super_admin';
  // null = "no simulation": follows the verified role until the super admin picks another one
  const [simulatedRole, setSimulatedRole] = useState(null);
  const selectedRole = isSuperAdminUser && knownRole(simulatedRole) ? simulatedRole : verifiedUserRole;
  const setSelectedRole = (r) => setSimulatedRole(r === 'super_admin' ? null : r);
  const activeRole = isSuperAdminUser ? selectedRole : verifiedUserRole;
  const isSimulationMode = isSuperAdminUser && selectedRole !== 'super_admin';

  // Permission enforcement on the mutation handlers themselves — the panels only render
  // buttons, so hiding UI alone would leave viewer/finance able to edit inventory.
  const can = {
    editInventory: canEditProperties(activeRole),
    deleteInventory: activeRole === 'super_admin' || activeRole === 'property_manager',
    manageDemands: ['super_admin', 'sales_manager', 'property_manager'].includes(activeRole),
    // viewer / finance / property_manager read leads but don't change their pipeline
    editLeads: canEditLeadsRole(activeRole)
  };
  // Returns false when blocked so callers that check `=== false` don't report success
  const guard = (allowed, fn) => (...args) => {
    if (!allowed) {
      if (triggerToast) triggerToast(lang === 'ar' ? 'صلاحياتك الحالية لا تسمح بهذا الإجراء' : 'Your role does not allow this action', 'error');
      return false;
    }
    return fn ? fn(...args) : undefined;
  };
  const [systemSubTab, setSystemSubTab] = useState('areas');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [externalPropertyData, setExternalPropertyData] = useState(null);
  const [universalSearch, setUniversalSearch] = useState('');
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false);
  const [showGoLiveWizard, setShowGoLiveWizard] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Sidebar Layout State (Width, Collapsed, Mobile Drawer)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('oneline_crm_sidebar_width');
      return saved ? parseInt(saved, 10) : 270;
    } catch (e) {
      return 270;
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('oneline_crm_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('oneline_crm_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const handleWidthChange = useCallback((newWidth) => {
    setSidebarWidth(newWidth);
    try {
      localStorage.setItem('oneline_crm_sidebar_width', String(newWidth));
    } catch (e) {}
  }, []);

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleCollapse();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleCollapse]);

  const isAr = lang === 'ar';
  const pendingDemandsCount = demands.filter(d => d.status === 'pending').length;

  const handleConvertToProperty = (lead) => {
    const details = lead.details || {};
    const priceVal = parseInt(details.expectedPrice) || parseInt(details.budget) || 2500000;
    const sizeVal = parseInt(details.size) || 150;
    const typeVal = details.propertyType || 'apartment';
    const areaVal = details.area || 'east';

    const prepopulated = {
      title_ar: `${isAr ? 'عقار معروض من العميل' : 'Property by'} ${lead.name || 'عميل'} (${details.propertyType ? (isAr ? details.propertyType : details.propertyType) : 'شقة'})`,
      title_en: `${typeVal.toUpperCase()} listed by ${lead.name || 'Client'}`,
      type: typeVal,
      areaKey: areaVal,
      price: priceVal,
      downPayment: Math.round(priceVal * 0.2),
      monthlyInstallment: Math.round((priceVal * 0.8) / 60),
      size: sizeVal,
      bedrooms: parseInt(details.rooms) || 3,
      description_ar: `طلب بيع مباشر مسجل من العميل: ${lead.name} (${lead.phone}) - ملاحظات العميل: ${lead.notes || 'لا توجد ملاحظات إضافية'}`,
      description_en: `Direct owner listing by ${lead.name} (${lead.phone}). Notes: ${lead.notes || 'Direct request'}`,
      status: 'published',
      featured: true,
      badge_ar: 'عقار موثق',
      badge_en: 'Verified Unit'
    };

    setExternalPropertyData(prepopulated);
    setActiveTab('properties');
    if (triggerToast) {
      triggerToast(isAr ? 'تم استيراد بيانات العميل بنجاح! راجع البيانات ثم اضغط نشر.' : 'Lead data converted to property draft!', 'info');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setLoginError('');

    // Anti-Bot Honeypot: Drop bot requests instantly
    if (honeypot) {
      setIsVerifying(false);
      setLoginError(isAr ? 'تم حظر الطلب تلقائياً لحماية أمان النظام' : 'Request blocked by security shield');
      return;
    }

    // Validation
    if (!email || !email.trim()) {
      setLoginError(isAr ? 'يرجى إدخال البريد الإلكتروني.' : 'Please enter your email.');
      setIsVerifying(false);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLoginError(isAr ? 'أدخل بريداً إلكترونياً صالحاً.' : 'Please enter a valid email address.');
      setIsVerifying(false);
      return;
    }
    if (!password) {
      setLoginError(isAr ? 'يرجى إدخال كلمة المرور.' : 'Please enter your password.');
      setIsVerifying(false);
      return;
    }

    let res;
    if (!isFirebaseAuthAvailable()) {
      // 🔒 Cryptographically secure salted SHA-256 verification with brute-force rate limiter
      const verifyRes = await verifyAdminCredentials(password);
      if (verifyRes.success) {
        res = { success: true };
      } else {
        res = {
          success: false,
          message: verifyRes.message || (isAr
            ? 'بيانات الدخول غير صحيحة أو تم تقييد المحاولات مؤقتاً لحماية النظام.'
            : 'Invalid credentials or rate limit reached.')
        };
      }
    } else {
      try {
        await loginUser(email, password);
        res = { success: true };
      } catch (err) {
        const errCode = err?.code || '';
        let genericMsg = isAr 
          ? 'تعذر تسجيل الدخول. تحقق من البيانات أو تواصل مع مدير النظام.' 
          : 'Sign-in failed. Please verify credentials or contact system admin.';
        if (errCode === 'auth/network-request-failed') {
          genericMsg = isAr ? 'تعذر الاتصال بالخدمة. حاول مرة أخرى.' : 'Network connection error. Try again.';
        } else if (err?.message?.includes('unauthorized') || err?.message?.includes('permission')) {
          genericMsg = isAr ? 'هذا الحساب غير مصرح له بالوصول إلى لوحة الإدارة.' : 'Account unauthorized for admin access.';
        }
        res = {
          success: false,
          message: genericMsg
        };
      }
    }
    setIsVerifying(false);

    if (res.success) {
      sessionStorage.setItem('crm_auth', 'true');
      setCrmAuthenticated(true);
      if (triggerToast) {
        triggerToast(isAr ? 'تم الدخول بنجاح' : 'Authenticated successfully', 'success');
      }
    } else {
      setLoginError(res.message);
      if (triggerToast) {
        triggerToast(res.message, 'error');
      }
    }
  };

  // 0. Smooth Session Initialization Spinner (Zero Flash of Login)
  if (isAuthInitializing) {
    return (
      <div className="crm-login-fullscreen">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: '3px solid rgba(179, 138, 69, 0.2)',
            borderTopColor: 'var(--gold, #B38A45)',
            animation: 'routeSpin 0.8s linear infinite'
          }} />
          <span style={{ color: 'var(--text-muted, #687386)', fontSize: '0.88rem', fontWeight: 'bold' }}>
            {isAr ? 'جاري فحص الجلسة المشفرة...' : 'Verifying secure session...'}
          </span>
        </div>
      </div>
    );
  }

  // 1. Dedicated Full-Screen Luxury Admin Login Portal (Zero Dashboard Leak)
  // The local-password session flag is only trusted when Firebase Auth is unavailable (offline/local
  // setups) or in development. Otherwise anyone could open the dashboard by setting it in DevTools.
  const allowLocalSession = !isFirebaseAuthAvailable() || import.meta.env.DEV;
  const isLocalSession = allowLocalSession && typeof window !== 'undefined' && sessionStorage.getItem('crm_auth') === 'true';
  if (!crmAuthenticated && !isLocalSession) {
    return (
      <div className="crm-login-fullscreen">
        <div className="crm-login-card">
          <div className="crm-lock-emblem">
            <ShieldCheck size={36} className="text-gold" />
          </div>

          <div className="crm-login-title-wrap">
            <span className="crm-secure-badge">
              <Lock size={13} />
              <span>{isAr ? 'بوابة إدارة 1Line' : '1Line Management Portal'}</span>
            </span>
            <h2>{isAr ? 'بوابة إدارة 1Line' : '1Line Management Portal'}</h2>
            <p>
              {isAr 
                ? 'الوصول مخصص لفريق 1Line والمستخدمين المصرح لهم فقط.' 
                : 'Access is restricted to authorized 1Line team members only.'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="crm-login-form-box">
            {/* Anti-Bot Honeypot Field */}
            <div style={{ display: 'none', visibility: 'hidden', height: 0, overflow: 'hidden' }} aria-hidden="true">
              <input
                type="text"
                name="admin_bot_trap"
                tabIndex="-1"
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="crm-input-group">
              <label htmlFor="crm-work-email">{isAr ? 'البريد الإلكتروني للعمل' : 'Work Email Address'}</label>
              <div className="crm-password-input-relative">
                <KeyRound size={18} className="input-icon-left" />
                <input
                  id="crm-work-email"
                  type="email"
                  dir="ltr"
                  placeholder="admin@1line.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="crm-input-group">
              <label htmlFor="crm-security-password">{isAr ? 'كلمة المرور' : 'Password'}</label>
              <div className="crm-password-input-relative">
                <KeyRound size={18} className="input-icon-left" />
                <input
                  id="crm-security-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isAr ? 'أدخل كلمة المرور الخاصة بك' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-pwd-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={isAr ? (showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور') : (showPassword ? 'Hide password' : 'Show password')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="crm-auth-error-alert" role="alert">
                <AlertTriangle size={15} style={{ marginInlineEnd: '6px', verticalAlign: 'middle' }} />
                <span>{loginError}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full crm-submit-btn" disabled={isVerifying}>
              <Sparkles size={16} />
              <span>
                {isVerifying 
                  ? (isAr ? 'جارٍ التحقق...' : 'Verifying...') 
                  : (loginError 
                      ? (isAr ? 'تعذر تسجيل الدخول' : 'Sign-in Failed') 
                      : (isAr ? 'تسجيل الدخول' : 'Sign In'))}
              </span>
            </button>
          </form>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
            <a 
              href="mailto:contact@oneline-sohag.com?subject=طلب مساعدة من مدير النظام" 
              style={{ 
                fontSize: '0.8rem', 
                color: 'var(--gold-dark)', 
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              {isAr ? 'طلب مساعدة من مدير النظام' : 'Request help from system admin'}
            </a>

            <a 
              href="/" 
              style={{ 
                fontSize: '0.82rem', 
                color: 'var(--crm-faint)', 
                textDecoration: 'none', 
                transition: 'color 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold)'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              ← {isAr ? 'العودة إلى الموقع العام' : 'Return to Public Website'}
            </a>
          </div>

          <div className="crm-login-footer">
            <span>{isAr ? '1LINE REAL ESTATE SOLUTIONS © 2026' : '1LINE CRM SECURE SYSTEM'}</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Full Dashboard Interface with Presidential Sidebar Layout
  return (
    <div 
      className={`crm-layout ${isAr ? 'rtl-dir' : 'ltr-dir'}`}
      style={{
        '--crm-sidebar-w': `${sidebarWidth}px`,
        '--current-sidebar-w': sidebarCollapsed ? '72px' : `${sidebarWidth}px`
      }}
    >
      {/* 1. Presidential Sidebar */}
      <CrmSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemSubTab={systemSubTab}
        setSystemSubTab={setSystemSubTab}
        isAr={isAr}
        leads={leads}
        properties={properties}
        demands={demands}
        pendingDemandsBadge={pendingDemandsCount > 0 ? `${pendingDemandsCount} معلق` : null}
        projects={projects}
        activeRole={activeRole}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        width={sidebarWidth}
        onWidthChange={handleWidthChange}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogout={() => {
          setCrmAuthenticated(false);
          sessionStorage.removeItem('crm_auth');
          if (onLogout) onLogout();
        }}
      />

      {/* 2. Main Executive Work Area */}
      <div className="crm-main-area">
        {/* Topbar */}
        <CrmTopbar
          lang={lang}
          isAr={isAr}
          leads={leads}
          properties={properties}
          demands={demands}
          universalSearch={universalSearch}
          setUniversalSearch={setUniversalSearch}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          activeRole={activeRole}
          isSuperAdmin={isSuperAdminUser}
          isSimulationMode={isSimulationMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          systemSubTab={systemSubTab}
          onLogout={() => {
            setCrmAuthenticated(false);
            sessionStorage.removeItem('crm_auth');
            if (onLogout) onLogout();
          }}
          showGoLiveWizard={showGoLiveWizard}
          setShowGoLiveWizard={setShowGoLiveWizard}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenCommandPalette={() => setShowCommandPalette(true)}
        />

        {/* Role Simulation Mode Alert Banner */}
        {isSimulationMode && (
          <div style={{
            background: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)',
            borderBottom: '1px solid #fde68a',
            padding: '8px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#92400e',
            boxShadow: '0 1px 3px rgba(217, 119, 6, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} style={{ color: 'var(--crm-accent-text)' }} />
              <span>
                {isAr
                  ? `وضع محاكاة الصلاحيات نشط: أنت تستعرض المنظومة بصلاحيات "${CRM_ROLES.find(r => r.id === selectedRole)?.label_ar}". يتم تطبيق قيود هذا الدور عملياً.`
                  : `Role Simulation Mode: Viewing system as "${CRM_ROLES.find(r => r.id === selectedRole)?.label_en}". Real role limits applied.`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRole('super_admin')}
              style={{
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '0.74rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{isAr ? 'العودة لصلاحيات المدير العام 👑' : 'Return to Super Admin'}</span>
            </button>
          </div>
        )}

        {/* 3. Main Dynamic Content Area */}
        <main className="crm-content-area" id="crm-main-content">
          {activeTab === 'properties' ? (
            <PropertyManagerPanel
              properties={properties}
              leads={leads}
              demands={demands}
              onAddProperty={guard(can.editInventory, onAddProperty)}
              onUpdateProperty={guard(can.editInventory, onUpdateProperty)}
              onDeleteProperty={guard(can.deleteInventory, onDeleteProperty)}
              lang={lang}
              triggerToast={triggerToast}
              externalNewPropertyData={externalPropertyData}
              onClearExternalData={() => setExternalPropertyData(null)}
            />
          ) : activeTab === 'demands' ? (
            <DemandsManagerPanel
              demands={demands}
              properties={properties}
              onAddDemand={guard(can.manageDemands, onAddDemand)}
              onApproveDemand={guard(can.manageDemands, onApproveDemand)}
              onUpdateDemand={guard(can.manageDemands, onUpdateDemand)}
              onDeleteDemand={guard(activeRole === 'super_admin', onDeleteDemand)}
              onUnpublishDemand={guard(can.manageDemands, onUnpublishDemand)}
              lang={lang}
              triggerToast={triggerToast}
            />
          ) : activeTab === 'projects' ? (
            <MegaProjectsManagerPanel
              projects={projects}
              onAddProject={guard(can.editInventory, onAddProject)}
              onUpdateProject={guard(can.editInventory, onUpdateProject)}
              onDeleteProject={guard(can.deleteInventory, onDeleteProject)}
              lang={lang}
              triggerToast={triggerToast}
            />
          ) : activeTab === 'areas' && activeRole === 'super_admin' ? (
            <AreaManagerPanel
              lang={lang}
              triggerToast={triggerToast}
              properties={properties}
              leads={leads}
            />
          ) : activeTab === 'corporate' && activeRole === 'super_admin' ? (
            <FounderCmsPanel
              lang={lang}
              triggerToast={triggerToast}
            />
          ) : ['system', 'areas', 'corporate'].includes(activeTab) ? (
            activeRole !== 'super_admin' ? (
              <div style={{
                background: 'var(--crm-surface-light, #ffffff)',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '40px 24px',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '40px auto'
              }}>
                <Lock size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
                <h3 style={{ color: 'var(--crm-ink)', marginBottom: '8px' }}>
                  {isAr ? 'منطقة صلاحيات مقيدة' : 'Restricted Access'}
                </h3>
                <p style={{ color: 'var(--crm-muted)', fontSize: '0.9rem' }}>
                  {isAr 
                    ? 'هذا القسم (إدارة النظام والأحياء وهوية المؤسس) متاح حصرياً للمدير العام.' 
                    : 'This section is strictly restricted to Super Admin.'}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveTab('dashboard')}
                  style={{ marginTop: '16px' }}
                >
                  {isAr ? 'العودة للوحة الرئيسية' : 'Return to Dashboard'}
                </button>
              </div>
            ) : (
              <div className="crm-system-subcontainer">
                {/* Clean System Administration Sub-Navigation */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  background: 'var(--crm-card)',
                  border: '1px solid var(--crm-line)',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#092347', marginInlineEnd: '8px' }}>
                    {isAr ? 'أقسام إدارة المنظومة:' : 'System Modules:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSystemSubTab('areas')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '7px',
                      fontSize: '0.8rem',
                      fontWeight: systemSubTab === 'areas' ? 'bold' : '600',
                      background: systemSubTab === 'areas' ? '#092347' : '#f8fafc',
                      color: systemSubTab === 'areas' ? '#ffffff' : '#475569',
                      border: systemSubTab === 'areas' ? '1px solid #092347' : '1px solid #e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'إدارة المناطق والأحياء' : 'Districts CMS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSystemSubTab('corporate')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '7px',
                      fontSize: '0.8rem',
                      fontWeight: systemSubTab === 'corporate' ? 'bold' : '600',
                      background: systemSubTab === 'corporate' ? '#092347' : '#f8fafc',
                      color: systemSubTab === 'corporate' ? '#ffffff' : '#475569',
                      border: systemSubTab === 'corporate' ? '1px solid #092347' : '1px solid #e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'هوية الشركة والمؤسس (CMS)' : 'Founder & Corporate CMS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSystemSubTab('backup')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '7px',
                      fontSize: '0.8rem',
                      fontWeight: systemSubTab === 'backup' ? 'bold' : '600',
                      background: systemSubTab === 'backup' ? '#092347' : '#f8fafc',
                      color: systemSubTab === 'backup' ? '#ffffff' : '#475569',
                      border: systemSubTab === 'backup' ? '1px solid #092347' : '1px solid #e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'النسخ الاحتياطي والبيانات' : 'Backups & Restore'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSystemSubTab('automation')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '7px',
                      fontSize: '0.8rem',
                      fontWeight: systemSubTab === 'automation' ? 'bold' : '600',
                      background: systemSubTab === 'automation' ? '#092347' : '#f8fafc',
                      color: systemSubTab === 'automation' ? '#ffffff' : '#475569',
                      border: systemSubTab === 'automation' ? '1px solid #092347' : '1px solid #e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    {isAr ? 'الأتمتة والتنبيهات' : 'Automations'}
                  </button>
                </div>

                {systemSubTab === 'areas' && (
                  <AreaManagerPanel lang={lang} triggerToast={triggerToast} properties={properties} leads={leads} />
                )}
                {systemSubTab === 'corporate' && (
                  <FounderCmsPanel lang={lang} triggerToast={triggerToast} />
                )}
                {(systemSubTab === 'backup' || systemSubTab === 'automation') && (
                  <CrmAdminPanel
                    leads={leads}
                    setLeads={setLeads}
                    lang={lang}
                    crmAuthenticated={true}
                    setCrmAuthenticated={setCrmAuthenticated}
                    currentUser={currentUser}
                    userRole={activeRole}
                    activeRole={activeRole}
                    onRoleChange={setSelectedRole}
                    adminTab={systemSubTab === 'backup' ? 'system_backup' : 'automation'}
                    onSwitchTab={setActiveTab}
                    handleCrmLogout={onLogout || (() => setCrmAuthenticated(false))}
                    triggerToast={triggerToast}
                    properties={properties}
                    onConvertToProperty={handleConvertToProperty}
                    onUpdateLead={guard(can.editLeads, onUpdateLead)}
                    onDeleteLead={guard(activeRole === 'super_admin', onDeleteLead)}
                    onAddNewLead={onAddNewLead}
                    demands={demands}
                    onSwitchToDemands={() => setActiveTab('demands')}
                    onSwitchToProperties={() => setActiveTab('properties')}
                    onSwitchToProjects={() => setActiveTab('projects')}
                    onSwitchToAreas={() => setActiveTab('areas')}
                    onSwitchToCorporate={() => setActiveTab('corporate')}
                  />
                )}
              </div>
            )
          ) : (
            /* For 'dashboard', 'leads', 'kanban', 'matching', 'financials', 'analytics' */
            <CrmAdminPanel
              leads={leads}
              setLeads={setLeads}
              lang={lang}
              crmAuthenticated={true}
              setCrmAuthenticated={setCrmAuthenticated}
              currentUser={currentUser}
              userRole={activeRole}
              activeRole={activeRole}
              onRoleChange={setSelectedRole}
              adminTab={activeTab}
              onSwitchTab={setActiveTab}
              handleCrmLogout={onLogout || (() => setCrmAuthenticated(false))}
              triggerToast={triggerToast}
              properties={properties}
              onConvertToProperty={handleConvertToProperty}
              onUpdateLead={guard(can.editLeads, onUpdateLead)}
              onDeleteLead={guard(activeRole === 'super_admin', onDeleteLead)}
              onAddNewLead={onAddNewLead}
              demands={demands}
              onSwitchToDemands={() => setActiveTab('demands')}
              onSwitchToProperties={() => setActiveTab('properties')}
              onSwitchToProjects={() => setActiveTab('projects')}
              onSwitchToAreas={() => setActiveTab('areas')}
              onSwitchToCorporate={() => setActiveTab('corporate')}
            />
          )}
        </main>

        {/* 4. Minimal Executive Footer */}
        <footer className="crm-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)' }} />
            <span>{isAr ? '1Line PropTech Suite v2.4 Enterprise — منصة عقارية ذكية مؤمنة' : '1Line PropTech Suite v2.4 Enterprise — Secure Intelligent Platform'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>{isAr ? 'جلسة مشفرة (TLS 1.3 • AES-256)' : 'Encrypted Session (TLS 1.3)'}</span>
            <span>{isAr ? '© 2026 شركة ون لاين للتطوير العقاري' : '© 2026 1Line Real Estate'}</span>
          </div>
        </footer>
      </div>

      {/* 5. Production Readiness & Go-Live Wizard Modal */}
      {showGoLiveWizard && (
        <GoLiveWizardModal
          isOpen={showGoLiveWizard}
          onClose={() => setShowGoLiveWizard(false)}
          leads={leads}
          setLeads={setLeads}
          properties={properties}
          demands={demands}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 6. Global Command Center (Ctrl + K / Cmd + K) */}
      <CrmCommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        leads={leads}
        properties={properties}
        demands={demands}
        isAr={isAr}
        onSelectLead={(l) => {
          setActiveTab('leads');
          setShowCommandPalette(false);
        }}
        onSelectProperty={(p) => {
          setActiveTab('properties');
          setShowCommandPalette(false);
        }}
        onSelectDemand={(d) => {
          setActiveTab('demands');
          setShowCommandPalette(false);
        }}
        onAction={(actionType, payload) => {
          setShowCommandPalette(false);
          if (actionType === 'switch_tab') {
            setActiveTab(payload);
          } else if (actionType === 'add_lead') {
            setActiveTab('leads');
          } else if (actionType === 'add_property') {
            setActiveTab('properties');
          } else if (actionType === 'add_demand') {
            setActiveTab('demands');
          } else if (actionType === 'open_contract_studio') {
            setActiveTab('dashboard');
          }
        }}
      />
    </div>
  );
}
