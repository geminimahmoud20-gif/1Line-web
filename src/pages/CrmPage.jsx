import { useState } from 'react';
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
import { isFirebaseAuthAvailable, loginUser } from '../firebaseService';
import { useAuth } from '../context/AuthContext';

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
  const [selectedRole, setSelectedRole] = useState(userRole || 'super_admin');
  const verifiedUserRole = currentUser?.role || userRole || 'super_admin';
  const isSuperAdminUser = verifiedUserRole === 'super_admin';
  const activeRole = isSuperAdminUser ? selectedRole : verifiedUserRole;
  const isSimulationMode = isSuperAdminUser && selectedRole !== 'super_admin';
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
      res = {
        success: false,
        message: isAr
          ? 'تعذر الاتصال بالخدمة. حاول مرة أخرى.'
          : 'Service unavailable. Please try again.'
      };
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
  if (!crmAuthenticated) {
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
              href="mailto:support@1line.com?subject=طلب مساعدة من مدير النظام" 
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
                color: '#94a3b8', 
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

  // 2. Authenticated Full Dashboard Interface
  return (
    <div className="crm-page-wrapper" style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* 1. Executive Presidential Topbar - Streamlined White Luxury */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 200,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Left: Brand & Secure State */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(13, 72, 161, 0.08), rgba(217, 119, 6, 0.12))',
              padding: '6px',
              borderRadius: '10px',
              border: '1px solid rgba(13, 72, 161, 0.2)'
            }}>
              <LogoEmblem size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '1.2rem', color: '#092347', letterSpacing: '0.5px', fontWeight: '900', direction: 'ltr', display: 'inline-flex', alignItems: 'baseline', gap: '3px' }} dir="ltr">
                  <span className="brand-one">1</span>LINE
                </strong>
                <span style={{ 
                  fontSize: '0.65rem', 
                  background: '#092347', 
                  color: '#ffffff', 
                  padding: '2px 7px', 
                  borderRadius: '5px', 
                  fontWeight: '900',
                  letterSpacing: '0.5px'
                }}>
                  COMMAND CENTER
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)' }}></span>
                <small style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: '600' }}>
                  {isAr ? 'جلسة مشفرة وسحابية نشطة' : 'Live Encrypted Cloud Session'}
                </small>
              </div>
            </div>
          </div>

          {/* Center: Universal Search Bar */}
          <div style={{ position: 'relative', width: '300px', flexGrow: 1, maxWidth: '380px' }}>
            <Search size={14} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isAr ? 'right' : 'left']: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={isAr ? 'بحث فوري (عميل، هاتف، عقار، ميزانية)...' : 'Instant Universal Search...'}
              value={universalSearch}
              onChange={(e) => setUniversalSearch(e.target.value)}
              style={{
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: isAr ? '7px 34px 7px 12px' : '7px 12px 7px 34px',
                color: '#0f172a',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
            {universalSearch && (
              <button
                type="button"
                onClick={() => setUniversalSearch('')}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  [isAr ? 'left' : 'right']: '10px',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={13} />
              </button>
            )}

            {/* Instant Search Results Dropdown */}
            {universalSearch.trim() && (
              <div style={{
                position: 'absolute',
                top: '120%',
                [isAr ? 'right' : 'left']: 0,
                width: '340px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
                zIndex: 300,
                maxHeight: '360px',
                overflowY: 'auto',
                padding: '8px'
              }}>
                {leads.filter(l => (l.name || '').toLowerCase().includes(universalSearch.toLowerCase()) || (l.phone || '').includes(universalSearch)).length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 'bold', padding: '4px 8px', display: 'block' }}>
                      {isAr ? 'العملاء المطابقين' : 'Matching Leads'}
                    </span>
                    {leads.filter(l => (l.name || '').toLowerCase().includes(universalSearch.toLowerCase()) || (l.phone || '').includes(universalSearch)).slice(0, 3).map(l => (
                      <div 
                        key={l.id} 
                        onClick={() => { setActiveTab('leads'); setUniversalSearch(''); }}
                        style={{ padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc', marginBottom: '4px' }}
                      >
                        <div style={{ color: '#0f172a', fontSize: '0.8rem', fontWeight: 'bold' }}>{l.name}</div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{l.phone}</div>
                      </div>
                    ))}
                  </div>
                )}

                {properties.filter(p => (p.title_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (p.locationName_ar || '').toLowerCase().includes(universalSearch.toLowerCase())).length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 'bold', padding: '4px 8px', display: 'block' }}>
                      {isAr ? 'العقارات المطابقة' : 'Matching Properties'}
                    </span>
                    {properties.filter(p => (p.title_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (p.locationName_ar || '').toLowerCase().includes(universalSearch.toLowerCase())).slice(0, 3).map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => { setActiveTab('properties'); setUniversalSearch(''); }}
                        style={{ padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc', marginBottom: '4px' }}
                      >
                        <div style={{ color: '#0f172a', fontSize: '0.8rem', fontWeight: 'bold' }}>{p.title_ar}</div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{p.price?.toLocaleString()} ج.م</div>
                      </div>
                    ))}
                  </div>
                )}

                {demands.filter(d => (d.text_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.clientName || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.phone || '').includes(universalSearch)).length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 'bold', padding: '4px 8px', display: 'block' }}>
                      {isAr ? 'طلبات المشترين' : 'Matching Demands'}
                    </span>
                    {demands.filter(d => (d.text_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.clientName || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.phone || '').includes(universalSearch)).slice(0, 3).map(d => (
                      <div 
                        key={d.id} 
                        onClick={() => { setActiveTab('demands'); setUniversalSearch(''); }}
                        style={{ padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc', marginBottom: '4px' }}
                      >
                        <div style={{ color: '#0f172a', fontSize: '0.8rem', fontWeight: 'bold' }}>{d.text_ar || d.clientName}</div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>ميزانية: {d.budget} ج.م</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Actions, Role Selector & User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Quick Action Speed Dial */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowQuickActionMenu(!showQuickActionMenu)}
                style={{
                  background: '#092347',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(9, 35, 71, 0.2)'
                }}
              >
                <Plus size={14} />
                <span>{isAr ? 'إجراء سريع' : 'Quick Action'}</span>
                <ChevronDown size={12} />
              </button>

              {showQuickActionMenu && (
                <div style={{
                  position: 'absolute',
                  top: '115%',
                  [isAr ? 'left' : 'right']: 0,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                  minWidth: '200px',
                  zIndex: 300,
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('leads'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '9px 12px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#0f172a', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <Users size={14} style={{ color: '#2563eb' }} />
                    <span>{isAr ? '+ تسجيل عميل جديد' : '+ New Lead'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('properties'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '9px 12px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#0f172a', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <Building size={14} style={{ color: '#d97706' }} />
                    <span>{isAr ? '+ إضافة عقار جديد' : '+ New Property'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('demands'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '9px 12px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#0f172a', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <Zap size={14} style={{ color: '#059669' }} />
                    <span>{isAr ? '+ إضافة طلب مشترٍ' : '+ New Demand'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('projects'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '9px 12px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#0f172a', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <Sparkles size={14} style={{ color: '#7c3aed' }} />
                    <span>{isAr ? '+ إضافة مشروع استثماري' : '+ New Project'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Role Display / Switcher Guard */}
            {isSuperAdminUser ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: isSimulationMode ? '#fffbeb' : '#f8fafc',
                border: isSimulationMode ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '4px 8px'
              }}>
                <ShieldCheck size={13} style={{ color: isSimulationMode ? '#d97706' : '#10b981' }} />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: selectedRole === 'super_admin' ? '#b45309' : '#0f172a',
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
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#334155'
              }}>
                <Lock size={12} style={{ color: '#64748b' }} />
                <span>{CRM_ROLES.find(r => r.id === verifiedUserRole)?.icon || '👤'}</span>
                <span>{isAr ? (CRM_ROLES.find(r => r.id === verifiedUserRole)?.label_ar || verifiedUserRole) : (CRM_ROLES.find(r => r.id === verifiedUserRole)?.label_en || verifiedUserRole)}</span>
              </div>
            )}

            {/* User Persona */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              padding: '4px 10px',
              borderRadius: '8px'
            }}>
              <div style={{ textAlign: isAr ? 'right' : 'left' }}>
                <span style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 'bold', display: 'block', lineHeight: 1.1 }}>
                  {isAr ? 'د. محمود الباز' : 'Dr. Mahmoud Elbaz'}
                </span>
                <small style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: '600' }}>
                  {isAr ? 'المدير التنفيذي للعمليات' : 'Executive Director'}
                </small>
              </div>
            </div>

            {/* Go-Live Readiness Audit Button */}
            <button
              type="button"
              onClick={() => setShowGoLiveWizard(true)}
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#059669',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
              title={isAr ? 'فحص جاهزية الموقع والتحول للإنتاج الفعلي' : 'Go-Live Readiness Audit'}
            >
              <Rocket size={13} />
              <span>{isAr ? 'جاهزية الإطلاق' : 'Audit'}</span>
            </button>

            {/* Live Site Link */}
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
              title={isAr ? 'معاينة الموقع في نافذة مستقلة' : 'View Live Site'}
            >
              <Globe size={13} style={{ color: '#d97706' }} />
              <span>{isAr ? 'الموقع' : 'Site'}</span>
            </a>

            {/* Logout */}
            <button 
              type="button" 
              onClick={() => {
                setCrmAuthenticated(false);
                sessionStorage.removeItem('crm_auth');
                if (onLogout) onLogout();
              }}
              style={{ 
                borderColor: '#fecaca', 
                color: '#dc2626', 
                fontSize: '0.75rem', 
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <LogOut size={13} />
              <span>{isAr ? 'خروج' : 'Exit'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Unified Master Navigation Bar (Single Smooth Source of Truth) */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '8px 24px',
        position: 'sticky',
        top: '57px',
        zIndex: 150,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <nav 
            className="crm-nav-tabs-scroll"
            style={{ 
              display: 'flex', 
              flexWrap: 'nowrap',
              background: '#f1f5f9', 
              padding: '4px', 
              borderRadius: '10px', 
              border: '1px solid #e2e8f0',
              gap: '3px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              maxWidth: '100%'
            }}
          >
            {/* 1. Dashboard */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'dashboard' ? 'bold' : '600',
                background: activeTab === 'dashboard' ? '#092347' : 'transparent',
                color: activeTab === 'dashboard' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'dashboard' ? '0 2px 6px rgba(9, 35, 71, 0.25)' : 'none'
              }}
            >
              <LayoutGrid size={14} style={{ color: activeTab === 'dashboard' ? '#f59e0b' : 'inherit' }} />
              <span>{isAr ? 'لوحة القيادة' : 'Dashboard'}</span>
            </button>

            {/* 2. Leads */}
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'leads' ? 'bold' : '600',
                background: activeTab === 'leads' ? '#092347' : 'transparent',
                color: activeTab === 'leads' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'leads' ? '0 2px 6px rgba(9, 35, 71, 0.25)' : 'none'
              }}
            >
              <Users size={14} style={{ color: activeTab === 'leads' ? '#60a5fa' : 'inherit' }} />
              <span>{isAr ? 'العملاء والمبيعات' : 'Leads'}</span>
              <span style={{ 
                background: activeTab === 'leads' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                color: activeTab === 'leads' ? '#fff' : '#0f172a',
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '6px',
                fontWeight: 'bold'
              }}>
                {leads.length}
              </span>
            </button>

            {/* 3. Kanban Pipeline */}
            <button
              type="button"
              onClick={() => setActiveTab('kanban')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'kanban' ? 'bold' : '600',
                background: activeTab === 'kanban' ? '#092347' : 'transparent',
                color: activeTab === 'kanban' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'kanban' ? '0 2px 6px rgba(9, 35, 71, 0.25)' : 'none'
              }}
            >
              <Target size={14} style={{ color: activeTab === 'kanban' ? '#f59e0b' : 'inherit' }} />
              <span>{isAr ? 'مسار الصفقات' : 'Pipeline'}</span>
            </button>

            {/* 4. Properties */}
            <button
              type="button"
              onClick={() => setActiveTab('properties')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'properties' ? 'bold' : '600',
                background: activeTab === 'properties' ? '#d97706' : 'transparent',
                color: activeTab === 'properties' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'properties' ? '0 2px 6px rgba(217, 119, 6, 0.25)' : 'none'
              }}
            >
              <Building size={14} />
              <span>{isAr ? 'محفظة العقارات' : 'Properties'}</span>
              <span style={{ 
                background: activeTab === 'properties' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                color: activeTab === 'properties' ? '#fff' : '#0f172a',
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '6px',
                fontWeight: 'bold'
              }}>
                {properties.length}
              </span>
            </button>

            {/* 5. Demands */}
            <button
              type="button"
              onClick={() => setActiveTab('demands')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'demands' ? 'bold' : '600',
                background: activeTab === 'demands' ? '#059669' : 'transparent',
                color: activeTab === 'demands' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'demands' ? '0 2px 6px rgba(5, 150, 105, 0.25)' : 'none'
              }}
            >
              <Zap size={14} />
              <span>{isAr ? 'طلبات المشترين' : 'Buyer Demands'}</span>
              <span style={{ 
                background: pendingDemandsCount > 0 ? '#ef4444' : (activeTab === 'demands' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0'),
                color: pendingDemandsCount > 0 || activeTab === 'demands' ? '#fff' : '#0f172a',
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '6px',
                fontWeight: '900'
              }}>
                {pendingDemandsCount > 0 ? `${pendingDemandsCount} معلق` : demands.length}
              </span>
            </button>

            {/* 6. Projects */}
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'projects' ? 'bold' : '600',
                background: activeTab === 'projects' ? '#7c3aed' : 'transparent',
                color: activeTab === 'projects' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'projects' ? '0 2px 6px rgba(124, 58, 237, 0.25)' : 'none'
              }}
            >
              <Sparkles size={14} />
              <span>{isAr ? 'المشروعات الكبرى' : 'Projects'}</span>
              <span style={{ 
                background: activeTab === 'projects' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                color: activeTab === 'projects' ? '#fff' : '#0f172a',
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '6px',
                fontWeight: 'bold'
              }}>
                {projects.length}
              </span>
            </button>

            {/* 7. Financials */}
            <button
              type="button"
              onClick={() => setActiveTab('financials')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'financials' ? 'bold' : '600',
                background: activeTab === 'financials' ? '#092347' : 'transparent',
                color: activeTab === 'financials' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'financials' ? '0 2px 6px rgba(9, 35, 71, 0.25)' : 'none'
              }}
            >
              <Calculator size={14} style={{ color: activeTab === 'financials' ? '#10b981' : 'inherit' }} />
              <span>{isAr ? 'المالية والأقساط' : 'Financials'}</span>
            </button>

            {/* 8. AI Matching */}
            <button
              type="button"
              onClick={() => setActiveTab('matching')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'matching' ? 'bold' : '600',
                background: activeTab === 'matching' ? '#092347' : 'transparent',
                color: activeTab === 'matching' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'matching' ? '0 2px 6px rgba(9, 35, 71, 0.25)' : 'none'
              }}
            >
              <Sparkles size={14} style={{ color: activeTab === 'matching' ? '#f59e0b' : 'inherit' }} />
              <span>{isAr ? 'المطابقات الذكية' : 'AI Matching'}</span>
            </button>

            {/* 9. Analytics */}
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                fontSize: '0.82rem',
                fontWeight: activeTab === 'analytics' ? 'bold' : '600',
                background: activeTab === 'analytics' ? '#092347' : 'transparent',
                color: activeTab === 'analytics' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeTab === 'analytics' ? '0 2px 6px rgba(9, 35, 71, 0.25)' : 'none'
              }}
            >
              <Activity size={14} style={{ color: activeTab === 'analytics' ? '#06b6d4' : 'inherit' }} />
              <span>{isAr ? 'التحليلات والتسويق' : 'Intelligence'}</span>
            </button>

            {/* 10. System Administration (Super Admin Only) */}
            {activeRole === 'super_admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('system')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '7px',
                  fontSize: '0.82rem',
                  fontWeight: activeTab === 'system' ? 'bold' : '600',
                  background: activeTab === 'system' ? '#092347' : 'transparent',
                  color: activeTab === 'system' ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: activeTab === 'system' ? '0 2px 6px rgba(9, 35, 71, 0.25)' : 'none'
                }}
              >
                <ShieldCheck size={14} style={{ color: activeTab === 'system' ? '#10b981' : 'inherit' }} />
                <span>{isAr ? 'إدارة المنظومة' : 'System Admin'}</span>
              </button>
            )}
          </nav>
        </div>
      </div>

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
            <AlertTriangle size={16} style={{ color: '#d97706' }} />
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

      {/* 3. Main Content Area */}
      <div className="crm-container crm-content-area" style={{ maxWidth: '1600px', margin: '0 auto', padding: '16px 24px' }}>
        {activeTab === 'properties' ? (
          <PropertyManagerPanel
            properties={properties}
            leads={leads}
            demands={demands}
            onAddProperty={onAddProperty}
            onUpdateProperty={onUpdateProperty}
            onDeleteProperty={onDeleteProperty}
            lang={lang}
            triggerToast={triggerToast}
            externalNewPropertyData={externalPropertyData}
            onClearExternalData={() => setExternalPropertyData(null)}
          />
        ) : activeTab === 'demands' ? (
          <DemandsManagerPanel
            demands={demands}
            properties={properties}
            onAddDemand={onAddDemand}
            onApproveDemand={onApproveDemand}
            onUpdateDemand={onUpdateDemand}
            onDeleteDemand={onDeleteDemand}
            onUnpublishDemand={onUnpublishDemand}
            lang={lang}
            triggerToast={triggerToast}
          />
        ) : activeTab === 'projects' ? (
          <MegaProjectsManagerPanel
            projects={projects}
            onAddProject={onAddProject}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            lang={lang}
            triggerToast={triggerToast}
          />
        ) : activeTab === 'areas' ? (
          <AreaManagerPanel
            lang={lang}
            triggerToast={triggerToast}
            properties={properties}
            leads={leads}
          />
        ) : activeTab === 'corporate' ? (
          <FounderCmsPanel
            lang={lang}
            triggerToast={triggerToast}
          />
        ) : activeTab === 'system' ? (
          activeRole !== 'super_admin' ? (
            <div style={{
              background: '#ffffff',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '40px 24px',
              textAlign: 'center',
              maxWidth: '600px',
              margin: '40px auto'
            }}>
              <Lock size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
              <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>
                {isAr ? 'منطقة صلاحيات مقيدة' : 'Restricted Access'}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                {isAr 
                  ? 'هذا القسم (إدارة النظام والأحياء وهوية المؤسس) متاح حصرياً للمدير العام (Super Admin).' 
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
              background: '#ffffff',
              border: '1px solid #e2e8f0',
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
                onUpdateLead={onUpdateLead}
                onDeleteLead={onDeleteLead}
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
            onUpdateLead={onUpdateLead}
            onDeleteLead={onDeleteLead}
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

      {/* 🚀 Production Readiness & Go-Live Wizard Modal */}
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
    </div>
  );
}
