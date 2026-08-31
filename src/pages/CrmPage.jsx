import { useState } from 'react';
import { Lock, ShieldCheck, LogOut, Users, Building, Sparkles, KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import CrmAdminPanel from '../components/CrmAdminPanel';
import PropertyManagerPanel from '../components/crm/PropertyManagerPanel';
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
  crmAuthenticated,
  setCrmAuthenticated,
  onLogout,
  triggerToast
}) {
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' | 'properties'
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const isAr = lang === 'ar';

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
                  placeholder={isAr ? 'أدخل رمز المرور (الافتراضي: 1234 أو admin)' : 'Enter PIN (Default: 1234)'}
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
      {/* Top Header Navigation Strip */}
      <div className="crm-header-top-bar">
        <div className="crm-container flex-between">
          <div className="crm-user-info">
            <div className="crm-badge-pill">
              <ShieldCheck size={14} className="text-gold" />
              <span>{isAr ? 'وضع المشرف المعتمد (Admin Mode)' : 'Admin Mode'}</span>
            </div>
            <h2>{isAr ? 'لوحة تحكم إدارة المبيعات والمنصة' : 'Executive Management Dashboard'}</h2>
          </div>

          <div className="crm-top-actions-right">
            {/* High-Contrast Tab Switchers */}
            <div className="crm-tab-buttons">
              <button
                type="button"
                className={`crm-tab-nav ${activeTab === 'leads' ? 'active' : ''}`}
                onClick={() => setActiveTab('leads')}
              >
                <Users size={16} />
                <span>{isAr ? 'العملاء والطلبات' : 'Leads & Inquiries'}</span>
                <span className="count-pill">{leads.length}</span>
              </button>

              <button
                type="button"
                className={`crm-tab-nav ${activeTab === 'properties' ? 'active' : ''}`}
                onClick={() => setActiveTab('properties')}
              >
                <Building size={16} />
                <span>{isAr ? 'إدارة العقارات (CMS)' : 'Properties CMS'}</span>
                <span className="count-pill">{properties.length}</span>
              </button>
            </div>

            <button 
              type="button" 
              className="btn btn-outline btn-logout-styled" 
              onClick={() => {
                setCrmAuthenticated(false);
                sessionStorage.removeItem('crm_auth');
                if (onLogout) onLogout();
              }}
            >
              <LogOut size={16} />
              <span>{isAr ? 'تسجيل الخروج' : 'Logout'}</span>
            </button>
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
          />
        ) : (
          <PropertyManagerPanel
            properties={properties}
            onAddProperty={onAddProperty}
            onUpdateProperty={onUpdateProperty}
            onDeleteProperty={onDeleteProperty}
            lang={lang}
            triggerToast={triggerToast}
          />
        )}
      </div>
    </div>
  );
}
