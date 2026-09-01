import { useState } from 'react';
import { Lock, ShieldCheck, LogOut, Users, Building, Sparkles, KeyRound, Eye, EyeOff, AlertTriangle, Globe } from 'lucide-react';
import LogoEmblem from '../components/LogoEmblem';
import CrmAdminPanel from '../components/CrmAdminPanel';
import PropertyManagerPanel from '../components/crm/PropertyManagerPanel';
import MegaProjectsManagerPanel from '../components/crm/MegaProjectsManagerPanel';
import { verifyAdminCredentials, checkRateLimit } from '../utils/securityShield';

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
  onAddNewLead
}) {
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'properties' | 'projects'
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [externalPropertyData, setExternalPropertyData] = useState(null);

  const isAr = lang === 'ar';

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

    const res = await verifyAdminCredentials(password);
    setIsVerifying(false);

    if (res.success) {
      setCrmAuthenticated(true);
      sessionStorage.setItem('crm_auth', 'true');
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
            <div className="crm-input-group">
              <label>{isAr ? 'رمز الدخول السري (PIN / Password)' : 'Security PIN / Password'}</label>
              <div className="crm-password-input-relative">
                <KeyRound size={18} className="input-icon-left" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isAr ? 'أدخل رمز المرور الخاص بك' : 'Enter your secure PIN'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button type="submit" className="btn btn-primary btn-full crm-submit-btn">
              <Sparkles size={16} />
              <span>{isAr ? 'تسجيل الدخول للوحة التحكم' : 'Authenticate & Access CRM'}</span>
            </button>
          </form>

          <div className="crm-login-footer">
            <span>{isAr ? 'ONE LINE REAL ESTATE SOLUTIONS © 2026' : 'ONE LINE CRM SECURE SYSTEM'}</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Full Dashboard Interface
  return (
    <div className="crm-page-wrapper">
      {/* Top Enterprise Header Navigation Strip */}
      <header className="crm-header-top-bar" style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(217, 119, 6, 0.25)',
        padding: '12px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="crm-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Brand Identity & Admin Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <LogoEmblem size={32} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1.05rem', color: '#fff', letterSpacing: '0.5px' }}>ONE LINE</strong>
                  <span style={{ fontSize: '0.72rem', background: 'var(--accent-gold)', color: '#000', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>ERP</span>
                </div>
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                  {isAr ? 'منظومة إدارة العمليات والمبيعات' : 'Enterprise PropTech CRM'}
                </small>
              </div>
            </div>

            <div className="crm-badge-pill" style={{ margin: 0, background: 'rgba(217, 119, 6, 0.12)', border: '1px solid rgba(217, 119, 6, 0.3)', color: 'var(--accent-gold)', padding: '4px 10px', fontSize: '0.75rem' }}>
              <ShieldCheck size={13} />
              <span>{isAr ? 'المشرف المعتمد' : 'Admin Mode'}</span>
            </div>
          </div>

          {/* Central Section Tabs Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '4px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            gap: '4px'
          }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'leads' ? 'crm-header-tab-active' : 'crm-header-tab-inactive'}`}
              onClick={() => setActiveTab('leads')}
              style={{
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                background: activeTab === 'leads' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'leads' ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                border: activeTab === 'leads' ? '1px solid rgba(255, 255, 255, 0.25)' : 'none',
                fontWeight: activeTab === 'leads' ? '800' : '600'
              }}
            >
              <Users size={14} className={activeTab === 'leads' ? 'text-gold' : ''} />
              <span>{isAr ? 'العملاء والمبيعات (CRM)' : 'Deals & Leads'}</span>
              <span style={{ 
                background: activeTab === 'leads' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)', 
                color: activeTab === 'leads' ? '#ffffff' : '#fbbf24', 
                fontSize: '0.72rem', 
                fontWeight: '900',
                padding: '1px 7px', 
                borderRadius: '10px' 
              }}>
                {leads.length}
              </span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'properties' ? 'crm-header-tab-active' : 'crm-header-tab-inactive'}`}
              onClick={() => setActiveTab('properties')}
              style={{
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                background: activeTab === 'properties' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'properties' ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                border: activeTab === 'properties' ? '1px solid rgba(255, 255, 255, 0.25)' : 'none',
                fontWeight: activeTab === 'properties' ? '800' : '600'
              }}
            >
              <Building size={14} className={activeTab === 'properties' ? 'text-gold' : ''} />
              <span>{isAr ? 'إدارة العقارات (CMS)' : 'Properties CMS'}</span>
              <span style={{ 
                background: activeTab === 'properties' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)', 
                color: activeTab === 'properties' ? '#ffffff' : '#fbbf24', 
                fontSize: '0.72rem', 
                fontWeight: '900',
                padding: '1px 7px', 
                borderRadius: '10px' 
              }}>
                {properties.length}
              </span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'projects' ? 'crm-header-tab-active' : 'crm-header-tab-inactive'}`}
              onClick={() => setActiveTab('projects')}
              style={{
                borderRadius: 'var(--radius-pill)',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                background: activeTab === 'projects' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'projects' ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                border: activeTab === 'projects' ? '1px solid rgba(255, 255, 255, 0.25)' : 'none',
                fontWeight: activeTab === 'projects' ? '800' : '600'
              }}
            >
              <Sparkles size={14} className="text-gold" />
              <span>{isAr ? 'المشروعات والكمبوندات' : 'Mega Projects'}</span>
              <span style={{ 
                background: activeTab === 'projects' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)', 
                color: activeTab === 'projects' ? '#ffffff' : '#fbbf24', 
                fontSize: '0.72rem', 
                fontWeight: '900',
                padding: '1px 7px', 
                borderRadius: '10px' 
              }}>
                {projects.length}
              </span>
            </button>
          </div>

          {/* Quick Actions (Back to Site & Single Logout) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href="/"
              className="btn btn-sm btn-ghost"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              title={isAr ? 'العودة لواجهة الموقع العامة' : 'Return to main site'}
            >
              <Globe size={14} />
              <span>{isAr ? 'الواجهة العامة' : 'Live Site'}</span>
            </a>

            <button 
              type="button" 
              className="btn btn-sm btn-outline btn-logout-styled" 
              onClick={() => {
                setCrmAuthenticated(false);
                sessionStorage.removeItem('crm_auth');
                if (onLogout) onLogout();
              }}
              style={{ borderColor: 'rgba(244, 63, 94, 0.4)', color: 'rgb(244, 63, 94)', fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <LogOut size={14} />
              <span>{isAr ? 'تسجيل الخروج' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </header>

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
            onAddProperty={onAddProperty}
            onUpdateProperty={onUpdateProperty}
            onDeleteProperty={onDeleteProperty}
            lang={lang}
            triggerToast={triggerToast}
            externalNewPropertyData={externalPropertyData}
            onClearExternalData={() => setExternalPropertyData(null)}
          />
        ) : (
          <MegaProjectsManagerPanel
            projects={projects}
            onAddProject={onAddProject}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
            lang={lang}
            triggerToast={triggerToast}
          />
        )}
      </div>
    </div>
  );
}
