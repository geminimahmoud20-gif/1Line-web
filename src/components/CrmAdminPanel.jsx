import React, { useState, useEffect } from 'react';
import { 
  Lock, Eye, EyeOff, ShieldCheck, AlertCircle, 
  Wifi, WifiOff, Download, LogOut, Bell, 
  Building, Users, Briefcase, Inbox, 
  MessageSquare, FileText, Sparkles 
} from 'lucide-react';
import { loginUser } from '../firebaseService';
import { exportToCsv } from '../utils/exportCsv';

export const CrmAdminPanel = ({
  lang = 'ar',
  t = {},
  firebaseConnected = false,
  leads = [],
  setLeads,
  activeMatches = [],
  exportLeadsCSV,
  handleCrmLogout,
  crmAuthenticated = true,
  setCrmAuthenticated,
  updateLeadStatus,
  updateLeadFollowUp,
  assignLeadSalesperson,
  handleWhatsAppAction,
  updateLeadNotes,
  triggerToast,
  addNotification = () => {},
  notifications = []
}) => {
  // Local Authentication States
  const [crmPasswordInput, setCrmPasswordInput] = useState('');
  const [crmEmailInput, setCrmEmailInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [crmAuthError, setCrmAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Local Tab and Filter States (isolated to prevent full App re-renders)
  const [adminTab, setAdminTab] = useState('dashboard');
  const [leadFilter, setLeadFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback PIN password
  const CRM_PASSWORD = 'oneline2026';

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCrmAuthError('');

    try {
      if (firebaseConnected) {
        // Production Grade: Authenticate via Firebase Auth
        if (!crmEmailInput || !crmPasswordInput) {
          throw new Error(lang === 'ar' ? 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
        }
        await loginUser(crmEmailInput, crmPasswordInput);
        setCrmAuthenticated(true);
        sessionStorage.setItem('crm_auth', 'true');
        triggerToast(lang === 'ar' ? 'تم تسجيل الدخول بنجاح عبر السحابة!' : 'Logged in successfully via Cloud Auth!');
      } else {
        // Offline / Development Fallback mode
        if (crmPasswordInput === CRM_PASSWORD) {
          setCrmAuthenticated(true);
          sessionStorage.setItem('crm_auth', 'true');
          triggerToast(lang === 'ar' ? 'تم الدخول بنجاح (وضع عدم الاتصال)' : 'Logged in successfully (Offline Mode)');
        } else {
          throw new Error(lang === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect password');
        }
      }
    } catch (err) {
      console.error(err);
      setCrmAuthError(err.message || (lang === 'ar' ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (exportLeadsCSV) {
      exportLeadsCSV();
      return;
    }
    const headers = {
      id: 'المعرف ID',
      name: 'اسم العميل',
      phone: 'رقم الهاتف',
      type: 'نوع الطلب',
      propertyType: 'نوع العقار',
      area: 'المنطقة',
      budget: 'الميزانية',
      status: 'حالة المتابعة',
      timestamp: 'تاريخ التسجيل'
    };
    exportToCsv('Oneline_Leads_Report', leads || [], headers);
    if (triggerToast) {
      triggerToast(lang === 'ar' ? 'تم تنزيل ملف العملاء Excel/CSV بنجاح!' : 'Exported leads successfully!', 'success');
    }
  };

  // CRM Analytics Metrics calculated dynamically from leads list
  const crmAnalytics = {
    todayCount: leads.filter(
      (l) => new Date(l.timestamp).toDateString() === new Date().toDateString()
    ).length,
    buyersCount: leads.filter((l) => l.type === 'buyer').length,
    sellersCount: leads.filter((l) => l.type === 'seller').length,
    brokersCount: leads.filter((l) => l.type === 'broker').length,
    requestsCount: leads.filter((l) => l.type === 'request').length,
    conversionSuccess: '84%'
  };

  // Filtered Leads list based on tab filters and search input
  const getFilteredLeads = () => {
    let result = leads;
    
    if (leadFilter !== 'all') {
      result = result.filter((l) => l.type === leadFilter);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          (l.notes && l.notes.toLowerCase().includes(q))
      );
    }

    return result;
  };

  const filteredLeads = getFilteredLeads();

  // Login Gate
  if (!crmAuthenticated) {
    return (
      <div style={{ maxWidth: '420px', margin: '60px auto', textAlign: 'center' }}>
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-light)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '40px 30px',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <Lock size={40} style={{ color: 'var(--accent-gold)', marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '8px' }}>
            {lang === 'ar' ? 'لوحة تحكم الإدارة' : 'Admin CRM Login'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {firebaseConnected 
              ? (lang === 'ar' ? 'قم بتسجيل الدخول باستخدام حساب المشرف العقاري المعتمد.' : 'Login with your certified real estate admin credentials.')
              : (lang === 'ar' ? 'أدخل كلمة المرور للوصول إلى وضع عدم الاتصال.' : 'Enter password to access offline developer mode.')}
          </p>
          
          <form onSubmit={handleLoginSubmit}>
            {firebaseConnected && (
              <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input 
                  type="email"
                  required
                  className="form-input"
                  placeholder="admin@oneline.com"
                  value={crmEmailInput}
                  onChange={(e) => setCrmEmailInput(e.target.value)}
                  style={{ marginTop: '4px', textAlign: 'left', direction: 'ltr' }}
                />
              </div>
            )}

            <div style={{ marginBottom: '16px', textAlign: 'right' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div style={{ position: 'relative', marginTop: '4px' }}>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder={lang === 'ar' ? 'كلمة المرور' : 'Password'}
                  value={crmPasswordInput}
                  onChange={(e) => setCrmPasswordInput(e.target.value)}
                  style={{ 
                    paddingInlineEnd: '40px', 
                    textAlign: firebaseConnected ? 'left' : 'center', 
                    fontSize: '1.1rem', 
                    letterSpacing: firebaseConnected ? 'normal' : '2px' 
                  }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    [lang === 'ar' ? 'left' : 'right']: '12px',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {crmAuthError && (
              <p style={{ color: 'var(--rose)', fontSize: '0.85rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                <AlertCircle size={14} />
                {crmAuthError}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              <ShieldCheck size={16} />
              {loading ? (lang === 'ar' ? 'جاري التحقق...' : 'Verifying...') : (lang === 'ar' ? 'دخول لوحة التحكم' : 'Login to CRM')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard / Admin View Panel
  return (
    <div>
      <div className="crm-header">
        <div>
          <h2>{t.adminDashboard}</h2>
          <p className="section-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {t.adminSub}
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: '0.7rem', fontWeight: 'bold',
              background: firebaseConnected ? 'var(--emerald-bg)' : 'var(--amber-bg)',
              color: firebaseConnected ? 'var(--emerald)' : 'var(--amber)'
            }}>
              {firebaseConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {firebaseConnected ? 'Cloud Sync' : 'Local Only'}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${adminTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('dashboard')}>{lang === 'ar' ? 'لوحة القيادة' : 'Dashboard'}</button>
          <button className={`btn btn-sm ${adminTab === 'leads' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('leads')}>{lang === 'ar' ? 'العملاء المتوقعون' : 'Leads Database'}</button>
          <button 
            className={`btn btn-sm ${adminTab === 'matching' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setAdminTab('matching')}
            style={{ position: 'relative' }}
          >
            {lang === 'ar' ? 'المطابقات الذكية' : 'Matches'}
            {activeMatches.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: 'var(--rose)',
                color: 'white',
                borderRadius: '50%',
                padding: '2px 6px',
                fontSize: '0.65rem',
                fontWeight: 'bold'
              }}>{activeMatches.length}</span>
            )}
          </button>
          <button className={`btn btn-sm ${adminTab === 'automation' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('automation')}>{lang === 'ar' ? 'الأتمتة والمحاكاة' : 'Automation'}</button>
          <button 
            className="btn btn-sm" 
            onClick={handleExportCSV}
            style={{ 
              background: 'var(--emerald-bg)', 
              color: 'var(--emerald)', 
              border: '1px solid var(--emerald)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px' 
            }}
          >
            <Download size={14} />
            {lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          </button>
          <button 
            className="btn btn-sm" 
            onClick={handleCrmLogout}
            style={{ 
              background: 'rgba(244, 63, 94, 0.1)', 
              color: 'rgb(244, 63, 94)', 
              border: '1px solid rgb(244, 63, 94)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px' 
            }}
          >
            <LogOut size={14} />
            {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Dashboard tab */}
      {adminTab === 'dashboard' && (
        <div className="crm-layout">
          <div className="crm-stats-grid">
            <div className="crm-stat-card">
              <div className="crm-stat-icon" style={{ background: 'var(--accent-gold-light)', color: 'var(--accent-gold)' }}><Bell size={20} /></div>
              <div className="crm-stat-info">
                <span className="crm-stat-num">{crmAnalytics.todayCount}</span>
                <span className="crm-stat-lbl">{t.leadsToday}</span>
              </div>
            </div>
            <div className="crm-stat-card">
              <div className="crm-stat-icon" style={{ background: 'var(--cyan-bg)', color: 'var(--cyan)' }}><Building size={20} /></div>
              <div className="crm-stat-info">
                <span className="crm-stat-num">{crmAnalytics.buyersCount}</span>
                <span className="crm-stat-lbl">{t.totalBuyers}</span>
              </div>
            </div>
            <div className="crm-stat-card">
              <div className="crm-stat-icon" style={{ background: 'var(--amber-bg)', color: 'var(--amber)' }}><Users size={20} /></div>
              <div className="crm-stat-info">
                <span className="crm-stat-num">{crmAnalytics.sellersCount}</span>
                <span className="crm-stat-lbl">{t.totalSellers}</span>
              </div>
            </div>
            <div className="crm-stat-card">
              <div className="crm-stat-icon" style={{ background: 'var(--emerald-bg)', color: 'var(--emerald)' }}><Briefcase size={20} /></div>
              <div className="crm-stat-info">
                <span className="crm-stat-num">{crmAnalytics.brokersCount}</span>
                <span className="crm-stat-lbl">{t.totalBrokers}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' }}>
            <div className="crm-table-container">
              <h3>{lang === 'ar' ? 'العملاء المسجلون حديثاً' : 'Recent Registrations'}</h3>
              <table className="crm-table" style={{ marginTop: '15px' }}>
                <thead>
                  <tr>
                    <th>{t.fullName}</th>
                    <th>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                    <th>{t.leadScore}</th>
                    <th>{t.statusText}</th>
                    <th>{t.leadSource}</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 5).map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 'bold' }}>{l.name}</td>
                      <td><span className={`badge badge-${l.type}`}>{t[l.type] || l.type}</span></td>
                      <td>
                        <span className={`lead-score-pill ${l.score >= 85 ? 'score-high' : l.score >= 60 ? 'score-medium' : 'score-low'}`}>
                          {l.score}
                        </span>
                      </td>
                      <td><span className={`badge badge-status status-${l.status}`}>{l.status.toUpperCase()}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="crm-table-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3>{lang === 'ar' ? 'سجل الإشعارات والأتمتة' : 'System Notifications'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {notifications.map((notif, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <AlertCircle size={14} style={{ color: 'var(--accent-gold)', flexShrink: 0, marginTop: '2px' }} />
                    <span>{notif}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leads List database tab */}
      {adminTab === 'leads' && (
        <div className="crm-table-container">
          <div className="crm-table-header">
            <div className="table-filters">
              <button className={`table-filter-btn ${leadFilter === 'all' ? 'active' : ''}`} onClick={() => setLeadFilter('all')}>{lang === 'ar' ? 'الكل' : 'All'}</button>
              <button className={`table-filter-btn ${leadFilter === 'buyer' ? 'active' : ''}`} onClick={() => setLeadFilter('buyer')}>{t.buy}</button>
              <button className={`table-filter-btn ${leadFilter === 'seller' ? 'active' : ''}`} onClick={() => setLeadFilter('seller')}>{t.sell}</button>
              <button className={`table-filter-btn ${leadFilter === 'broker' ? 'active' : ''}`} onClick={() => setLeadFilter('broker')}>{t.broker}</button>
              <button className={`table-filter-btn ${leadFilter === 'investor' ? 'active' : ''}`} onClick={() => setLeadFilter('investor')}>{t.investor}</button>
              <button className={`table-filter-btn ${leadFilter === 'request' ? 'active' : ''}`} onClick={() => setLeadFilter('request')}>{t.requests}</button>
              <button className={`table-filter-btn ${leadFilter === 'referral' ? 'active' : ''}`} onClick={() => setLeadFilter('referral')}>{lang === 'ar' ? 'الإحالات' : 'Referrals'}</button>
              <button className={`table-filter-btn ${leadFilter === 'vault' ? 'active' : ''}`} onClick={() => setLeadFilter('vault')}>{lang === 'ar' ? 'طلبات الخزنة' : 'Vault'}</button>
            </div>
            <div>
              <input 
                type="text" 
                placeholder={lang === 'ar' ? 'بحث باسم العميل أو رقم الهاتف...' : 'Search by name/phone...'} 
                className="form-input" 
                style={{ padding: '8px 16px', fontSize: '0.85rem', width: '220px', borderRadius: 'var(--radius-pill)' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <table className="crm-table">
            <thead>
              <tr>
                <th>{t.fullName}</th>
                <th>{lang === 'ar' ? 'التفاصيل والطلبات' : 'Requirements'}</th>
                <th>{t.leadScore}</th>
                <th>{t.statusText}</th>
                <th>{t.stageText}</th>
                <th>{t.assignedSales}</th>
                <th>{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <Inbox size={32} style={{ color: 'var(--accent-gold)' }} />
                      <span style={{ fontSize: '0.9rem' }}>{lang === 'ar' ? 'لم يتم العثور على أي عملاء يطابقون خيارات البحث أو التصفية الحالية.' : 'No leads found matching the current search or filter criteria.'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((l) => (
                  <tr key={l.id}>
                    <td data-label={lang === 'ar' ? 'الاسم والاتصال' : 'Name & Contact'}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold' }}>{l.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{l.phone}</span>
                      </div>
                    </td>
                    <td data-label={lang === 'ar' ? 'التفاصيل والطلبات' : 'Requirements'}>
                      <div style={{ fontSize: '0.8rem', maxWidth: '300px', whiteSpace: 'normal' }}>
                        {l.type === 'buyer' && (
                          <span>طلب شراء: {t[l.details.propertyType]} في {t[l.details.area]} - الميزانية {l.details.budget} EGP - الدفع {t[l.details.paymentMethod]}</span>
                        )}
                        {l.type === 'seller' && (
                          <span>معروض بيع: {t[l.details.propertyType]} في {t[l.details.area]} - المساحة {l.details.size}م - المتوقع {l.details.expectedPrice} EGP</span>
                        )}
                        {l.type === 'broker' && (
                          <span>وسيط عقاري: خبرة {l.details.experience} سنوات - معروض {l.details.inventoryCount} عقارات في {l.details.areas?.map(x=>t[x]).join(', ')}</span>
                        )}
                        {l.type === 'investor' && (
                          <span>مستثمر عقاري: محفظة {l.details.investmentAmount} EGP - العائد المتوقع {l.details.projectedROI}</span>
                        )}
                        {l.type === 'request' && (
                          <span>طلب مخصص: {t[l.details.propertyType]} في {t[l.details.area]} - شروط: {l.details.specialConditions}</span>
                        )}
                        {l.type === 'referral' && (
                          <span>إحالة من {l.details.referrerName || l.name}: عميل مُحال ({l.details.referralName || 'مجهول'}) {l.details.referralType === 'buyer' ? 'مشتري' : 'بائع'} - {l.details.notes}</span>
                        )}
                        {l.type === 'vault' && (
                          <span>طلب معاينة الخزنة: {l.details.targetProperty} - الميزانية المؤكدة: {l.details.confirmedBudget} EGP</span>
                        )}
                      </div>
                    </td>
                    <td data-label={lang === 'ar' ? 'نقاط الجدية' : 'Score'}>
                      <span className={`lead-score-pill ${l.score >= 85 ? 'score-high' : l.score >= 60 ? 'score-medium' : 'score-low'}`}>
                        {l.score}
                      </span>
                    </td>
                    <td data-label={lang === 'ar' ? 'الحالة' : 'Status'}>
                      <select 
                        value={l.status} 
                        onChange={(e) => updateLeadStatus(l.id, e.target.value)}
                        style={{
                          background: 'var(--secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '4px',
                          padding: '4px'
                        }}
                      >
                        <option value="new">NEW</option>
                        <option value="contacted">CONTACTED</option>
                        <option value="negotiating">NEGOTIATING</option>
                        <option value="closed">CLOSED</option>
                      </select>
                    </td>
                    <td data-label={lang === 'ar' ? 'مرحلة المتابعة' : 'Follow-up Stage'}>
                      <input 
                        type="text" 
                        value={l.followUp} 
                        onChange={(e) => updateLeadFollowUp(l.id, e.target.value)}
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem', width: '120px' }}
                      />
                    </td>
                    <td data-label={lang === 'ar' ? 'المسؤول' : 'Assigned Agent'}>
                      <select 
                        value={l.assignedTo} 
                        onChange={(e) => assignLeadSalesperson(l.id, e.target.value)}
                        style={{
                          background: 'var(--secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: '4px',
                          padding: '4px'
                        }}
                      >
                        <option value="Dr. Mahmoud Elbaz">Dr. Mahmoud Elbaz</option>
                        <option value="Sales Team A">Sales Team A</option>
                        <option value="Sales Team B">Sales Team B</option>
                        <option value="Unassigned">Unassigned</option>
                      </select>
                    </td>
                    <td data-label={lang === 'ar' ? 'الإجراءات' : 'Actions'}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm btn-accent" onClick={() => handleWhatsAppAction(l)} style={{ padding: '6px' }}>
                          <MessageSquare size={14} />
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => {
                          const newNote = prompt(lang === 'ar' ? 'أدخل الملاحظات الجديدة للعقد:' : 'Enter lead notes:', l.notes);
                          if (newNote !== null) updateLeadNotes(l.id, newNote);
                        }} style={{ padding: '6px' }}>
                          <FileText size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Smart Matching Engine tab */}
      {adminTab === 'matching' && (
        <div className="matching-engine-card">
          <h3>
            <Sparkles size={18} style={{ marginInlineEnd: '8px', color: 'var(--accent-gold)' }} />
            {t.matchingTitle}
          </h3>
          <p className="section-subtitle" style={{ marginBottom: '20px' }}>{t.matchingDesc}</p>

          <div className="matches-list">
            {activeMatches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <AlertCircle size={32} style={{ marginBottom: '10px' }} />
                <p>{lang === 'ar' ? 'لا توجد مطابقات متوفرة حالياً في قاعدة البيانات.' : 'No matches found in database yet.'}</p>
              </div>
            ) : (
              activeMatches.map((match) => (
                <div key={match.id} className="match-item">
                  <div className="match-left">
                    <div className="match-icon-badge">
                      <Building size={18} />
                    </div>
                    <div className="match-details">
                      <span className="match-title">{lang === 'ar' ? match.desc_ar : match.desc_en}</span>
                      <span className="match-desc">
                        {lang === 'ar' 
                          ? `المشتري: ${match.buyer.name} (${match.buyer.phone}) ↔ مزود العقار: ${match.provider.name} (${match.provider.phone})`
                          : `Buyer: ${match.buyer.name} ↔ Provider: ${match.provider.name}`}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="match-score-badge">
                      {match.score}% {lang === 'ar' ? 'توافق' : 'Match'}
                    </span>
                    
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        const text = `مرحباً أ. ${match.buyer.name}، يسرنا في ون لاين للحلول العقارية أن نبلغك بأننا قمنا بمطابقة طلبك مع عقار مناسب جداً مسجل لدينا للتو في منطقة ${t[match.buyer.details.area]}. هل تود إرسال الصور والتفاصيل الكاملة والتقييم السعري الآن؟`;
                        window.open(`https://wa.me/2${match.buyer.whatsapp || match.buyer.phone}?text=${encodeURIComponent(text)}`, '_blank');
                        triggerToast(lang === 'ar' ? 'تم فتح واتساب للتواصل مع المشتري!' : 'Opened WhatsApp to contact buyer!');
                      }}
                    >
                      <MessageSquare size={14} />
                      {lang === 'ar' ? 'تنسيق الصفقة' : 'Coordinate Deal'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Automation Simulator tab */}
      {adminTab === 'automation' && (
        <div className="crm-table-container">
          <h3>{t.automationSimulator}</h3>
          <p className="section-subtitle" style={{ marginBottom: '24px' }}>قم بمحاكاة إجراءات الأتمتة لاختبار تدفقات العمل في منصة One Line.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: 'var(--primary)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <h4 style={{ marginBottom: '10px', color: 'var(--accent-gold)' }}>أتمتة الواتساب والمتابعة الفورية</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                عندما يقوم مشتري أو مالك بإتمام رحلته، يقوم النظام تلقائياً بإنشاء رسالة واتساب جاهزة للإرسال مع احتساب نقاط جديته.
              </p>
              <button className="btn btn-primary" onClick={() => triggerToast(t.whatsappSimAlert)}>
                {t.whatsappSimBtn}
              </button>
            </div>

            <div style={{ background: 'var(--primary)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <h4 style={{ marginBottom: '10px', color: 'var(--emerald)' }}>قواعد توزيع وتعيين العملاء تلقائياً</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                يقوم النظام بتوجيه العملاء العقاريين تلقائياً. العملاء ذوو الميزانيات المرتفعة (&gt; 5 مليون) يتم إسنادهم للدكتور محمود الباز مباشرة.
              </p>
              <button className="btn btn-accent" onClick={() => {
                triggerToast(lang === 'ar' ? 'تمت مطابقة وإسناد 3 عملاء للمستشارين بنجاح!' : 'Auto assigned 3 leads to sales agents successfully!');
                addNotification('تم إعادة توزيع 3 عملاء متوقعي الجدية للـ Sales Team تلقائياً.');
              }}>
                تفعيل توزيع العملاء الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrmAdminPanel;
