import { useState } from 'react';
import { Lock, ShieldCheck, LogOut, Users, Building, Sparkles, KeyRound, Eye, EyeOff, AlertTriangle, Globe, Zap, Search, X, ChevronDown, Plus, Clock, Rocket, MapPin } from 'lucide-react';
import LogoEmblem from '../components/LogoEmblem';
import CrmAdminPanel from '../components/CrmAdminPanel';
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
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'properties' | 'projects' | 'demands'
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
      {/* 1. Executive Presidential Topbar - White Luxury */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 28px',
        position: 'sticky',
        top: 0,
        zIndex: 200,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ maxWidth: '1500px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Left: Brand & Secure State */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(13, 72, 161, 0.08), rgba(217, 119, 6, 0.12))',
                padding: '6px',
                borderRadius: '10px',
                border: '1px solid rgba(13, 72, 161, 0.2)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
              }}>
                <LogoEmblem size={30} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1.25rem', color: '#092347', letterSpacing: '0.5px', fontWeight: '900', direction: 'ltr', display: 'inline-flex', alignItems: 'baseline', gap: '3px' }} dir="ltr">
                    <span className="brand-one">1</span>LINE
                  </strong>
                  <span style={{ 
                    fontSize: '0.68rem', 
                    background: '#092347', 
                    color: '#ffffff', 
                    padding: '2px 8px', 
                    borderRadius: '6px', 
                    fontWeight: '900',
                    letterSpacing: '0.5px'
                  }}>
                    COMMAND CENTER
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)' }}></span>
                  <small style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: '500' }}>
                    {isAr ? 'النظام مشفر ومتصل سحابياً (SHA-256 Protected)' : 'Live Encrypted Session'}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Live Clock & Date */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            padding: '6px 16px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            color: '#334155'
          }}>
            <Clock size={14} style={{ color: '#d97706' }} />
            <span style={{ fontWeight: '600' }}>
              {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Right: Admin Persona & Quick Site Exit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              padding: '5px 12px',
              borderRadius: 'var(--radius-pill)'
            }}>
              <ShieldCheck size={16} style={{ color: '#d97706' }} />
              <div style={{ textAlign: isAr ? 'right' : 'left' }}>
                <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 'bold', display: 'block', lineHeight: 1.2 }}>
                  {isAr ? 'د. محمود الباز' : 'Dr. Mahmoud Elbaz'}
                </span>
                <small style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: '600' }}>
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
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              title={isAr ? 'فحص جاهزية الموقع والتحول للإنتاج الفعلي' : 'Go-Live Readiness Audit'}
            >
              <Rocket size={14} />
              <span>{isAr ? 'جاهزية الإطلاق الفعلي' : 'Go-Live Audit'}</span>
            </button>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: 'var(--radius-pill)',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                textDecoration: 'none',
                fontWeight: 'bold',
                transition: 'all 0.2s ease'
              }}
              title={isAr ? 'معاينة الموقع في نافذة مستقلة' : 'View Live Site'}
            >
              <Globe size={14} style={{ color: '#d97706' }} />
              <span>{isAr ? 'الموقع الحي' : 'Live Site'}</span>
            </a>

            <button 
              type="button" 
              className="btn btn-sm" 
              onClick={() => {
                setCrmAuthenticated(false);
                sessionStorage.removeItem('crm_auth');
                if (onLogout) onLogout();
              }}
              style={{ 
                borderColor: '#fecaca', 
                color: '#dc2626', 
                fontSize: '0.78rem', 
                padding: '7px 14px',
                borderRadius: '10px',
                background: '#fef2f2',
                fontWeight: 'bold'
              }}
            >
              <LogOut size={14} />
              <span>{isAr ? 'خروج' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Global Executive HUD Summary Bar - Crisp White Cards */}
      <div style={{
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 28px'
      }}>
        <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {/* Metric 1: Leads & Conversion */}
            <div 
              onClick={() => setActiveTab('leads')}
              style={{
                background: activeTab === 'leads' ? '#eff6ff' : '#ffffff',
                border: activeTab === 'leads' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>{isAr ? 'العملاء والفرص' : 'Total Leads'}</span>
                <Users size={16} style={{ color: '#2563eb' }} />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                {leads.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>{isAr ? 'عميل' : 'leads'}</span>
              </div>
            </div>

            {/* Metric 2: Properties Portfolio */}
            <div 
              onClick={() => setActiveTab('properties')}
              style={{
                background: activeTab === 'properties' ? '#fffbeb' : '#ffffff',
                border: activeTab === 'properties' ? '2px solid #d97706' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>{isAr ? 'محفظة العقارات' : 'Active Units'}</span>
                <Building size={16} style={{ color: '#d97706' }} />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                {properties.length} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#b45309' }}>{isAr ? 'وحدة معتمدة' : 'units'}</span>
              </div>
            </div>

            {/* Metric 3: Mega Projects */}
            <div 
              onClick={() => setActiveTab('projects')}
              style={{
                background: activeTab === 'projects' ? '#faf5ff' : '#ffffff',
                border: activeTab === 'projects' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>{isAr ? 'المشروعات الكبرى' : 'Mega Projects'}</span>
                <Sparkles size={16} style={{ color: '#7c3aed' }} />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                {projects.length} <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#7c3aed' }}>{isAr ? 'كمبوند ومشروع' : 'projects'}</span>
              </div>
            </div>

            {/* Metric 4: Buyer Demands & Pending Alert */}
            <div 
              onClick={() => setActiveTab('demands')}
              style={{
                background: activeTab === 'demands' 
                  ? '#ecfdf5' 
                  : pendingDemandsCount > 0 
                    ? '#fef2f2' 
                    : '#ffffff',
                border: activeTab === 'demands' 
                  ? '2px solid #059669' 
                  : pendingDemandsCount > 0 
                    ? '1.5px solid #ef4444' 
                    : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: pendingDemandsCount > 0 ? '#dc2626' : '#64748b', fontWeight: '600' }}>
                  {isAr ? 'طلبات المشترين' : 'Demands Flow'}
                </span>
                <Zap size={16} style={{ color: pendingDemandsCount > 0 ? '#ef4444' : '#059669' }} />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{demands.length}</span>
                {pendingDemandsCount > 0 && (
                  <span style={{
                    fontSize: '0.7rem',
                    background: '#ef4444',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontWeight: 'bold'
                  }}>
                    {pendingDemandsCount} {isAr ? 'معلق يحتاج اعتماد' : 'pending'}
                  </span>
                )}
              </div>
            </div>

            {/* Metric 5: Total Purchasing Power */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>{isAr ? 'القوة الشرائية المسجلة' : 'Market Demand Power'}</span>
                <span style={{ color: '#059669', fontWeight: 'bold' }}>EGP</span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#059669', marginTop: '4px' }}>
                {(demands.reduce((sum, d) => sum + (typeof d.budget === 'number' ? d.budget : parseInt(String(d.budget).replace(/,/g, '')) || 0), 0) / 1000000).toFixed(1)}M
                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b', marginInlineStart: '4px' }}>{isAr ? 'مليون ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Modern Segmented Command Navigation Bar - Clean White Enterprise */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 28px',
        position: 'sticky',
        top: '60px',
        zIndex: 150,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ 
          maxWidth: '1500px', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          {/* Segmented Tab Controls */}
          <nav style={{ 
            display: 'flex', 
            background: '#f1f5f9', 
            padding: '4px', 
            borderRadius: '12px', 
            border: '1px solid #e2e8f0',
            gap: '4px',
            overflowX: 'auto',
            maxWidth: '100%'
          }}>
            {/* Tab 1: Leads */}
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: activeTab === 'leads' ? 'bold' : '600',
                background: activeTab === 'leads' ? '#092347' : 'transparent',
                color: activeTab === 'leads' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'leads' ? '0 2px 8px rgba(9, 35, 71, 0.25)' : 'none'
              }}
            >
              <Users size={15} />
              <span>{isAr ? 'العملاء والمبيعات (Leads)' : 'Leads & CRM'}</span>
              <span style={{ 
                background: activeTab === 'leads' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                color: activeTab === 'leads' ? '#fff' : '#0f172a',
                fontSize: '0.72rem',
                padding: '1px 7px',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}>
                {leads.length}
              </span>
            </button>

            {/* Tab 2: Properties */}
            <button
              type="button"
              onClick={() => setActiveTab('properties')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: activeTab === 'properties' ? 'bold' : '600',
                background: activeTab === 'properties' ? '#d97706' : 'transparent',
                color: activeTab === 'properties' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'properties' ? '0 2px 8px rgba(217, 119, 6, 0.25)' : 'none'
              }}
            >
              <Building size={15} />
              <span>{isAr ? 'محفظة العقارات (CMS)' : 'Properties CMS'}</span>
              <span style={{ 
                background: activeTab === 'properties' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                color: activeTab === 'properties' ? '#fff' : '#0f172a',
                fontSize: '0.72rem',
                padding: '1px 7px',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}>
                {properties.length}
              </span>
            </button>

            {/* Tab 3: Mega Projects */}
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: activeTab === 'projects' ? 'bold' : '600',
                background: activeTab === 'projects' ? '#7c3aed' : 'transparent',
                color: activeTab === 'projects' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'projects' ? '0 2px 8px rgba(124, 58, 237, 0.25)' : 'none'
              }}
            >
              <Sparkles size={15} />
              <span>{isAr ? 'المشروعات الكبرى' : 'Mega Projects'}</span>
              <span style={{ 
                background: activeTab === 'projects' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                color: activeTab === 'projects' ? '#fff' : '#0f172a',
                fontSize: '0.72rem',
                padding: '1px 7px',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}>
                {projects.length}
              </span>
            </button>

            {/* Tab 4: Demands */}
            <button
              type="button"
              onClick={() => setActiveTab('demands')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: activeTab === 'demands' ? 'bold' : '600',
                background: activeTab === 'demands' ? '#059669' : 'transparent',
                color: activeTab === 'demands' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'demands' ? '0 2px 8px rgba(5, 150, 105, 0.25)' : 'none'
              }}
            >
              <Zap size={15} />
              <span>{isAr ? 'طلبات المشترين (Demands)' : 'Buyer Demands'}</span>
              <span style={{ 
                background: pendingDemandsCount > 0 ? '#ef4444' : (activeTab === 'demands' ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0'),
                color: pendingDemandsCount > 0 || activeTab === 'demands' ? '#fff' : '#0f172a',
                fontSize: '0.72rem',
                padding: '1px 7px',
                borderRadius: '8px',
                fontWeight: '900'
              }}>
                {pendingDemandsCount > 0 ? `${pendingDemandsCount} معلق` : demands.length}
              </span>
            </button>

            {/* Tab 5: Corporate CMS */}
            <button
              type="button"
              onClick={() => setActiveTab('corporate')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: activeTab === 'corporate' ? 'bold' : '600',
                background: activeTab === 'corporate' ? '#0284c7' : 'transparent',
                color: activeTab === 'corporate' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'corporate' ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none'
              }}
            >
              <ShieldCheck size={15} />
              <span>{isAr ? 'هوية الشركة والإدارة (CMS)' : 'Corporate CMS'}</span>
            </button>

            {/* Tab 6: Areas & Districts CMS */}
            <button
              type="button"
              onClick={() => setActiveTab('areas')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: activeTab === 'areas' ? 'bold' : '600',
                background: activeTab === 'areas' ? '#b45309' : 'transparent',
                color: activeTab === 'areas' ? '#ffffff' : '#475569',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'areas' ? '0 2px 8px rgba(180, 83, 9, 0.25)' : 'none'
              }}
            >
              <MapPin size={15} />
              <span>{isAr ? 'إدارة المناطق والأحياء' : 'Districts CMS'}</span>
            </button>
          </nav>

          {/* Universal Search & Quick Action Speed Dial */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
            {/* Universal Search Bar */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={15} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isAr ? 'right' : 'left']: '12px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder={isAr ? 'بحث شامل (عميل، هاتف، عقار)...' : 'Universal Search...'}
                value={universalSearch}
                onChange={(e) => setUniversalSearch(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: isAr ? '7px 36px 7px 12px' : '7px 12px 7px 36px',
                  color: '#0f172a',
                  fontSize: '0.82rem',
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
                  width: '320px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
                  zIndex: 300,
                  maxHeight: '360px',
                  overflowY: 'auto',
                  padding: '8px'
                }}>
                  {/* Matching Leads */}
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

                  {/* Matching Properties */}
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

                  {/* Matching Demands */}
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

            {/* Quick Action Speed Dial */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowQuickActionMenu(!showQuickActionMenu)}
                style={{
                  background: '#092347',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(9, 35, 71, 0.25)'
                }}
              >
                <Plus size={15} />
                <span>{isAr ? 'إجراء سريع' : 'Quick Action'}</span>
                <ChevronDown size={13} />
              </button>

              {/* Quick Action Dropdown */}
              {showQuickActionMenu && (
                <div style={{
                  position: 'absolute',
                  top: '115%',
                  [isAr ? 'left' : 'right']: 0,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
                  minWidth: '210px',
                  zIndex: 300,
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('leads'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#0f172a', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <Users size={14} style={{ color: '#2563eb' }} />
                    <span>{isAr ? '+ تسجيل عميل جديد' : '+ New Lead'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('properties'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#0f172a', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <Building size={14} style={{ color: '#d97706' }} />
                    <span>{isAr ? '+ إضافة عقار جديد' : '+ New Property'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('demands'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#0f172a', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <Zap size={14} style={{ color: '#059669' }} />
                    <span>{isAr ? '+ إضافة طلب مشترٍ' : '+ New Demand'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('projects'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#0f172a', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  >
                    <Sparkles size={14} style={{ color: '#7c3aed' }} />
                    <span>{isAr ? '+ إضافة مشروع استثماري' : '+ New Project'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('areas'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#0f172a', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <MapPin size={14} style={{ color: '#b45309' }} />
                    <span>{isAr ? '+ إدارة وإضافة المناطق' : '+ Districts CMS'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="crm-container crm-content-area">
        {activeTab === 'leads' ? (
          <CrmAdminPanel
            leads={leads}
            setLeads={setLeads}
            lang={lang}
            crmAuthenticated={true}
            setCrmAuthenticated={setCrmAuthenticated}
            currentUser={currentUser}
            userRole={userRole}
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
        ) : activeTab === 'properties' ? (
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
        ) : activeTab === 'projects' ? (
          <MegaProjectsManagerPanel
            projects={projects}
            onAddProject={onAddProject}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            lang={lang}
            triggerToast={triggerToast}
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
        ) : activeTab === 'areas' ? (
          <AreaManagerPanel
            lang={lang}
            triggerToast={triggerToast}
            properties={properties}
            leads={leads}
          />
        ) : (
          <FounderCmsPanel
            lang={lang}
            triggerToast={triggerToast}
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
