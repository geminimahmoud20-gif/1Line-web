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

    let res;
    if (!isFirebaseAuthAvailable()) {
      res = {
        success: false,
        message: isAr
          ? 'لم يتم إعداد Firebase Authentication بعد. أضف إعدادات مشروع Firebase وأنشئ حساب مدير.'
          : 'Firebase Authentication is not configured. Add your Firebase project settings and create an admin account.'
      };
    } else {
      try {
        await loginUser(email, password);
        res = { success: true };
      } catch {
        res = {
          success: false,
          message: isAr
            ? 'تعذر تسجيل الدخول. تأكد من البريد وكلمة المرور ومن منح الحساب صلاحية admin.'
            : 'Sign-in failed. Check the email, password, and admin role.'
        };
      }
    }
    setIsVerifying(false);

    if (res.success) {
      setCrmAuthenticated(true);
      if (triggerToast) {
        triggerToast(isAr ? 'تم التحقق المشفر وتسجيل الدخول بنجاح' : 'Authenticated successfully', 'success');
      }
    } else {
      setLoginError(res.message);
      if (triggerToast) {
        triggerToast(res.message, 'error');
      }
    }
  };

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
              <span>{isAr ? 'بوابة الإدارة المشفرة' : 'Encrypted Admin Portal'}</span>
            </span>
            <h2>{isAr ? 'لوحة تحكم إدارة المبيعات والمنصة' : 'Executive Management Dashboard'}</h2>
            <p>
              {isAr 
                ? 'يرجى إدخال رمز الأمان المعتمد للوصول إلى قاعدة بيانات العملاء وإدارة العقارات' 
                : 'Enter your verified security credentials to manage leads and platform CMS'}
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
              <label>{isAr ? 'البريد الإلكتروني' : 'Email address'}</label>
              <div className="crm-password-input-relative">
                <KeyRound size={18} className="input-icon-left" />
                <input
                  type="email"
                  dir="ltr"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="crm-input-group">
              <label>{isAr ? 'رمز الدخول السري (PIN / Password)' : 'Security PIN / Password'}</label>
              <div className="crm-password-input-relative">
                <KeyRound size={18} className="input-icon-left" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isAr ? 'أدخل رمز المرور الخاص بك' : 'Enter your secure PIN'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="toggle-pwd-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="crm-auth-error-alert">
                <AlertTriangle size={15} style={{ marginInlineEnd: '6px', verticalAlign: 'middle' }} />
                <span>{loginError}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full crm-submit-btn" disabled={isVerifying}>
              <Sparkles size={16} />
              <span>{isVerifying ? (isAr ? 'جاري التحقق المشفر...' : 'Verifying...') : (isAr ? 'تسجيل الدخول للوحة التحكم' : 'Authenticate & Access CRM')}</span>
            </button>
          </form>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <a 
              href="/" 
              style={{ 
                fontSize: '0.82rem', 
                color: '#94a3b8', 
                textDecoration: 'none', 
                transition: 'color 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffca28'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            >
              ← {isAr ? 'الرجوع إلى واجهة الموقع الرئيسية' : 'Return to Public Website'}
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
    <div className="crm-page-wrapper" style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, #172554 0%, #0a1128 60%, #030712 100%)' }}>
      {/* 1. Executive Presidential Topbar */}
      <header style={{
        background: 'rgba(10, 17, 40, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(217, 119, 6, 0.3)',
        padding: '12px 28px',
        position: 'sticky',
        top: 0,
        zIndex: 200,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ maxWidth: '1500px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Left: Brand & Secure State */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 202, 40, 0.2), rgba(13, 72, 161, 0.5))',
                padding: '6px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 202, 40, 0.45)',
                boxShadow: '0 0 15px rgba(255, 202, 40, 0.25)'
              }}>
                <LogoEmblem size={30} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1.15rem', color: '#ffffff', letterSpacing: '0.6px', fontWeight: '900' }}>
                    1Line
                  </strong>
                  <span style={{ 
                    fontSize: '0.68rem', 
                    background: 'var(--gradient-gold)', 
                    color: '#092347', 
                    padding: '2px 8px', 
                    borderRadius: '6px', 
                    fontWeight: '900',
                    letterSpacing: '0.5px'
                  }}>
                    COMMAND CENTER
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                  <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
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
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '6px 16px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.8rem',
            color: '#cbd5e1'
          }}>
            <Clock size={14} className="text-gold" />
            <span style={{ fontWeight: '500' }}>
              {new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Right: Admin Persona & Quick Site Exit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(217, 119, 6, 0.08)',
              border: '1px solid rgba(217, 119, 6, 0.25)',
              padding: '5px 12px',
              borderRadius: 'var(--radius-pill)'
            }}>
              <ShieldCheck size={16} style={{ color: 'var(--accent-gold)' }} />
              <div style={{ textAlign: isAr ? 'right' : 'left' }}>
                <span style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: 'bold', display: 'block', lineHeight: 1.2 }}>
                  {isAr ? 'د. محمود الباز' : 'Dr. Mahmoud Elbaz'}
                </span>
                <small style={{ fontSize: '0.68rem', color: 'var(--accent-gold)' }}>
                  {isAr ? 'المدير التنفيذي للعمليات' : 'Executive Director'}
                </small>
              </div>
            </div>

            {/* Go-Live Readiness Audit Button */}
            <button
              type="button"
              onClick={() => setShowGoLiveWizard(true)}
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
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
              className="btn btn-sm btn-outline"
              style={{
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '10px',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff'
              }}
              title={isAr ? 'معاينة الموقع في نافذة مستقلة' : 'View Live Site'}
            >
              <Globe size={14} />
              <span>{isAr ? 'الموقع الحي' : 'Live Site'}</span>
            </a>

            <button 
              type="button" 
              className="btn btn-sm btn-outline" 
              onClick={() => {
                setCrmAuthenticated(false);
                sessionStorage.removeItem('crm_auth');
                if (onLogout) onLogout();
              }}
              style={{ 
                borderColor: 'rgba(239, 68, 68, 0.4)', 
                color: '#f87171', 
                fontSize: '0.78rem', 
                padding: '7px 14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.08)'
              }}
            >
              <LogOut size={14} />
              <span>{isAr ? 'خروج' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Global Executive HUD Summary Bar (Collapsible Live Platform Ticker) */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 17, 40, 0.7) 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '16px 28px'
      }}>
        <div style={{ maxWidth: '1500px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px'
          }}>
            {/* Metric 1: Leads & Conversion */}
            <div 
              onClick={() => setActiveTab('leads')}
              style={{
                background: activeTab === 'leads' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: activeTab === 'leads' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                padding: '12px 18px',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{isAr ? 'العملاء والفرص' : 'Total Leads'}</span>
                <Users size={15} style={{ color: '#3b82f6' }} />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#ffffff', marginTop: '4px' }}>
                {leads.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8' }}>{isAr ? 'عميل' : 'leads'}</span>
              </div>
            </div>

            {/* Metric 2: Properties Portfolio */}
            <div 
              onClick={() => setActiveTab('properties')}
              style={{
                background: activeTab === 'properties' ? 'rgba(217, 119, 6, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: activeTab === 'properties' ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                padding: '12px 18px',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{isAr ? 'محفظة العقارات' : 'Active Units'}</span>
                <Building size={15} style={{ color: 'var(--accent-gold)' }} />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#ffffff', marginTop: '4px' }}>
                {properties.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--accent-gold)' }}>{isAr ? 'وحدة معتمدة' : 'units'}</span>
              </div>
            </div>

            {/* Metric 3: Mega Projects */}
            <div 
              onClick={() => setActiveTab('projects')}
              style={{
                background: activeTab === 'projects' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: activeTab === 'projects' ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                padding: '12px 18px',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{isAr ? 'المشروعات الكبرى' : 'Mega Projects'}</span>
                <Sparkles size={15} style={{ color: '#a855f7' }} />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#ffffff', marginTop: '4px' }}>
                {projects.length} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#a855f7' }}>{isAr ? 'كمبوند ومشروع' : 'projects'}</span>
              </div>
            </div>

            {/* Metric 4: Buyer Demands & Pending Alert */}
            <div 
              onClick={() => setActiveTab('demands')}
              style={{
                background: activeTab === 'demands' 
                  ? 'rgba(16, 185, 129, 0.15)' 
                  : pendingDemandsCount > 0 
                    ? 'rgba(239, 68, 68, 0.1)' 
                    : 'rgba(255, 255, 255, 0.03)',
                border: activeTab === 'demands' 
                  ? '1px solid #10b981' 
                  : pendingDemandsCount > 0 
                    ? '1px solid rgba(239, 68, 68, 0.4)' 
                    : '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '14px',
                padding: '12px 18px',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: pendingDemandsCount > 0 ? '#f87171' : '#94a3b8' }}>
                  {isAr ? 'طلبات المشترين' : 'Demands Flow'}
                </span>
                <Zap size={15} style={{ color: pendingDemandsCount > 0 ? '#ef4444' : '#10b981' }} />
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#ffffff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{demands.length}</span>
                {pendingDemandsCount > 0 && (
                  <span style={{
                    fontSize: '0.7rem',
                    background: '#ef4444',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    animation: 'pulse 2s infinite'
                  }}>
                    {pendingDemandsCount} {isAr ? 'معلق يحتاج اعتماد' : 'pending'}
                  </span>
                )}
              </div>
            </div>

            {/* Metric 5: Total Purchasing Power */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '14px',
              padding: '12px 18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{isAr ? 'القوة الشرائية المسجلة' : 'Market Demand Power'}</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>EGP</span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#10b981', marginTop: '4px' }}>
                {(demands.reduce((sum, d) => sum + (typeof d.budget === 'number' ? d.budget : parseInt(String(d.budget).replace(/,/g, '')) || 0), 0) / 1000000).toFixed(1)}M
                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8', marginInlineStart: '4px' }}>{isAr ? 'مليون ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Modern Segmented Command Navigation Bar */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '10px 28px',
        position: 'sticky',
        top: '65px',
        zIndex: 150,
        backdropFilter: 'blur(16px)'
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
            background: 'rgba(10, 17, 40, 0.9)', 
            padding: '5px', 
            borderRadius: '14px', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            gap: '6px',
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
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: activeTab === 'leads' ? 'bold' : '500',
                background: activeTab === 'leads' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
                color: activeTab === 'leads' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'leads' ? '0 4px 15px rgba(37, 99, 235, 0.35)' : 'none'
              }}
            >
              <Users size={16} />
              <span>{isAr ? 'العملاء والمبيعات (Leads)' : 'Leads & CRM'}</span>
              <span style={{ 
                background: activeTab === 'leads' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '10px',
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
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: activeTab === 'properties' ? 'bold' : '500',
                background: activeTab === 'properties' ? 'linear-gradient(135deg, #d97706, #b45309)' : 'transparent',
                color: activeTab === 'properties' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'properties' ? '0 4px 15px rgba(217, 119, 6, 0.35)' : 'none'
              }}
            >
              <Building size={16} />
              <span>{isAr ? 'محفظة العقارات (CMS)' : 'Properties CMS'}</span>
              <span style={{ 
                background: activeTab === 'properties' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '10px',
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
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: activeTab === 'projects' ? 'bold' : '500',
                background: activeTab === 'projects' ? 'linear-gradient(135deg, #9333ea, #7e22ce)' : 'transparent',
                color: activeTab === 'projects' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'projects' ? '0 4px 15px rgba(147, 51, 234, 0.35)' : 'none'
              }}
            >
              <Sparkles size={16} />
              <span>{isAr ? 'المشروعات الكبرى' : 'Mega Projects'}</span>
              <span style={{ 
                background: activeTab === 'projects' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '10px',
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
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: activeTab === 'demands' ? 'bold' : '500',
                background: activeTab === 'demands' ? 'linear-gradient(135deg, #059669, #047857)' : 'transparent',
                color: activeTab === 'demands' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'demands' ? '0 4px 15px rgba(5, 150, 105, 0.35)' : 'none'
              }}
            >
              <Zap size={16} />
              <span>{isAr ? 'طلبات المشترين (Demands)' : 'Buyer Demands'}</span>
              <span style={{ 
                background: pendingDemandsCount > 0 ? '#ef4444' : (activeTab === 'demands' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)'),
                color: '#fff',
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: '900',
                boxShadow: pendingDemandsCount > 0 ? '0 0 10px rgba(239, 68, 68, 0.6)' : 'none'
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
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: activeTab === 'corporate' ? 'bold' : '500',
                background: activeTab === 'corporate' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
                color: activeTab === 'corporate' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'corporate' ? '0 4px 15px rgba(2, 132, 199, 0.35)' : 'none'
              }}
            >
              <ShieldCheck size={16} />
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
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: activeTab === 'areas' ? 'bold' : '500',
                background: activeTab === 'areas' ? 'linear-gradient(135deg, #d97706, #b45309)' : 'transparent',
                color: activeTab === 'areas' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === 'areas' ? '0 4px 15px rgba(217, 119, 6, 0.35)' : 'none'
              }}
            >
              <MapPin size={16} />
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
                  background: 'rgba(10, 17, 40, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: isAr ? '7px 36px 7px 12px' : '7px 12px 7px 36px',
                  color: '#ffffff',
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
                  background: '#0f172a',
                  border: '1px solid rgba(217, 119, 6, 0.35)',
                  borderRadius: '12px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
                  zIndex: 300,
                  maxHeight: '360px',
                  overflowY: 'auto',
                  padding: '8px'
                }}>
                  {/* Matching Leads */}
                  {leads.filter(l => (l.name || '').toLowerCase().includes(universalSearch.toLowerCase()) || (l.phone || '').includes(universalSearch)).length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold', padding: '4px 8px', display: 'block' }}>
                        {isAr ? 'العملاء المطابقين' : 'Matching Leads'}
                      </span>
                      {leads.filter(l => (l.name || '').toLowerCase().includes(universalSearch.toLowerCase()) || (l.phone || '').includes(universalSearch)).slice(0, 3).map(l => (
                        <div 
                          key={l.id} 
                          onClick={() => { setActiveTab('leads'); setUniversalSearch(''); }}
                          style={{ padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', marginBottom: '4px' }}
                        >
                          <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{l.name}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{l.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Matching Properties */}
                  {properties.filter(p => (p.title_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (p.locationName_ar || '').toLowerCase().includes(universalSearch.toLowerCase())).length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 'bold', padding: '4px 8px', display: 'block' }}>
                        {isAr ? 'العقارات المطابقة' : 'Matching Properties'}
                      </span>
                      {properties.filter(p => (p.title_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (p.locationName_ar || '').toLowerCase().includes(universalSearch.toLowerCase())).slice(0, 3).map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => { setActiveTab('properties'); setUniversalSearch(''); }}
                          style={{ padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', marginBottom: '4px' }}
                        >
                          <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{p.title_ar}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{p.price?.toLocaleString()} ج.م</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Matching Demands */}
                  {demands.filter(d => (d.text_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.clientName || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.phone || '').includes(universalSearch)).length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold', padding: '4px 8px', display: 'block' }}>
                        {isAr ? 'طلبات المشترين' : 'Matching Demands'}
                      </span>
                      {demands.filter(d => (d.text_ar || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.clientName || '').toLowerCase().includes(universalSearch.toLowerCase()) || (d.phone || '').includes(universalSearch)).slice(0, 3).map(d => (
                        <div 
                          key={d.id} 
                          onClick={() => { setActiveTab('demands'); setUniversalSearch(''); }}
                          style={{ padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', marginBottom: '4px' }}
                        >
                          <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>{d.text_ar || d.clientName}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>ميزانية: {d.budget} ج.م</div>
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
                  background: 'linear-gradient(135deg, #d97706, #b45309)',
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
                  boxShadow: '0 4px 15px rgba(217, 119, 6, 0.35)'
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
                  background: '#0f172a',
                  border: '1px solid rgba(217, 119, 6, 0.4)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                  minWidth: '210px',
                  zIndex: 300,
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('leads'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#fff', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Users size={14} style={{ color: '#3b82f6' }} />
                    <span>{isAr ? '+ تسجيل عميل جديد' : '+ New Lead'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('properties'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#fff', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Building size={14} style={{ color: 'var(--accent-gold)' }} />
                    <span>{isAr ? '+ إضافة عقار جديد' : '+ New Property'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('demands'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#fff', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Zap size={14} style={{ color: '#10b981' }} />
                    <span>{isAr ? '+ إضافة طلب مشترٍ' : '+ New Demand'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('projects'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#fff', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Sparkles size={14} style={{ color: '#a855f7' }} />
                    <span>{isAr ? '+ إضافة مشروع استثماري' : '+ New Project'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('areas'); setShowQuickActionMenu(false); }}
                    style={{ width: '100%', padding: '10px 14px', textAlign: isAr ? 'right' : 'left', background: 'none', border: 'none', color: '#fff', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <MapPin size={14} style={{ color: 'var(--accent-gold)' }} />
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
            t={t}
            crmAuthenticated={true}
            setCrmAuthenticated={setCrmAuthenticated}
            handleCrmLogout={() => {
              setCrmAuthenticated(false);
              sessionStorage.removeItem('crm_auth');
            }}
            triggerToast={triggerToast}
            properties={properties}
            onConvertToProperty={handleConvertToProperty}
            onUpdateLead={onUpdateLead}
            onDeleteLead={onDeleteLead}
            onAddNewLead={onAddNewLead}
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
