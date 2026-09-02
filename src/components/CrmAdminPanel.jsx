import React, { useState } from 'react';
import { 
  Lock, Eye, EyeOff, ShieldCheck, AlertCircle, 
  Wifi, WifiOff, Download, LogOut, Bell, 
  Building, Users, User, Briefcase, Inbox, 
  MessageSquare, FileText, Sparkles,
  Edit3, Trash2, Database, Upload, Save, X, Clock, CheckCircle2,
  Trophy, Calculator, LayoutGrid, Wand2, Calendar, Target, Zap,
  UserPlus, CheckSquare, Square, Flame, Tag, Filter, Send, Activity,
  ArrowLeft, ArrowRight
} from 'lucide-react';
import { loginUser } from '../firebaseService';
import { exportToCsv } from '../utils/exportCsv';
import { verifyAdminCredentials } from '../utils/securityShield';
import { SOHAG_AREAS, PROPERTY_TYPES } from '../data/propertiesData';

// Enterprise PropTech Modules
import KanbanPipeline from './crm/KanbanPipeline';
import SmartMatchingHub from './crm/SmartMatchingHub';
import AICopywriterModal from './crm/AICopywriterModal';
import AgentCommissionLeaderboard from './crm/AgentCommissionLeaderboard';
import PaymentScheduleBuilder from './crm/PaymentScheduleBuilder';
import RetargetingHub from './crm/RetargetingHub';
import CustomerProfileModal from './crm/CustomerProfileModal';
import AddLeadModal from './crm/AddLeadModal';
import VisitorIntelligencePanel from './crm/VisitorIntelligencePanel';
import FounderCmsPanel from './crm/FounderCmsPanel';
import ContractStudioModal from './crm/ContractStudioModal';

export const CrmAdminPanel = ({
  lang = 'ar',
  t = {},
  firebaseConnected = false,
  leads = [],
  setLeads,
  properties = [],
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
  notifications = [],
  onConvertToProperty,
  onUpdateLead,
  onDeleteLead,
  onAddNewLead
}) => {
  // Local Authentication States
  const [crmPasswordInput, setCrmPasswordInput] = useState('');
  const [crmEmailInput, setCrmEmailInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [crmAuthError, setCrmAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Enterprise Tab States
  const [adminTab, setAdminTab] = useState('dashboard');
  const [leadFilter, setLeadFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Customer 360 & Add Lead Modal States
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [viewingProfileLead, setViewingProfileLead] = useState(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);

  // AI Copywriter & Contract Studio Modal States
  const [showAICopywriter, setShowAICopywriter] = useState(false);
  const [showContractStudio, setShowContractStudio] = useState(false);

  // Edit Lead Modal State
  const [editingLead, setEditingLead] = useState(null);
  const [leadFormData, setLeadFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    type: 'buyer',
    status: 'new',
    followUp: '',
    assignedTo: 'Unassigned',
    notes: '',
    score: 85,
    budget: '',
    area: 'east',
    propertyType: 'apartment'
  });

  // Activity Log Viewer State
  const [viewingLogsLead, setViewingLogsLead] = useState(null);

  const isAr = lang === 'ar';

  // Bulk Selection Handlers
  const handleToggleSelectAll = (visibleLeads) => {
    if (selectedLeadIds.length === visibleLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(visibleLeads.map(l => l.id));
    }
  };

  const handleToggleSelectOne = (leadId) => {
    if (selectedLeadIds.includes(leadId)) {
      setSelectedLeadIds(prev => prev.filter(id => id !== leadId));
    } else {
      setSelectedLeadIds(prev => [...prev, leadId]);
    }
  };

  const handleBulkAssign = (newAgent) => {
    if (selectedLeadIds.length === 0 || !newAgent) return;
    selectedLeadIds.forEach(id => {
      if (onUpdateLead) onUpdateLead(id, { assignedTo: newAgent });
    });
    if (triggerToast) {
      triggerToast(isAr ? `تم تعيين ${selectedLeadIds.length} عميل إلى ${newAgent}` : `Assigned ${selectedLeadIds.length} leads to ${newAgent}`, 'success');
    }
    setSelectedLeadIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    if (window.confirm(isAr ? `هل أنت متأكد من حذف ${selectedLeadIds.length} عميل محدد نهائياً؟` : `Delete ${selectedLeadIds.length} leads?`)) {
      selectedLeadIds.forEach(id => {
        if (onDeleteLead) onDeleteLead(id);
      });
      if (triggerToast) {
        triggerToast(isAr ? `تم حذف ${selectedLeadIds.length} عميل بنجاح` : `Deleted ${selectedLeadIds.length} leads`, 'info');
      }
      setSelectedLeadIds([]);
    }
  };

  const handleBulkExportSelected = () => {
    if (selectedLeadIds.length === 0) return;
    const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
    const headers = {
      id: 'المعرف',
      name: 'اسم العميل',
      phone: 'رقم الهاتف',
      type: 'النوع',
      status: 'الحالة',
      assignedTo: 'المسؤول',
      budget: 'الميزانية'
    };
    exportToCsv('Selected_Leads_Export', selectedLeads, headers);
    if (triggerToast) {
      triggerToast(isAr ? `تم تصدير ${selectedLeadIds.length} عميل محدد إلى CSV بنجاح!` : `Exported ${selectedLeadIds.length} leads!`, 'success');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCrmAuthError('');

    try {
      if (firebaseConnected) {
        if (!crmEmailInput || !crmPasswordInput) {
          throw new Error(isAr ? 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
        }
        await loginUser(crmEmailInput, crmPasswordInput);
        setCrmAuthenticated(true);
        sessionStorage.setItem('crm_auth', 'true');
        triggerToast(isAr ? 'تم تسجيل الدخول بنجاح عبر السحابة!' : 'Logged in successfully via Cloud Auth!');
      } else {
        const verifyResult = await verifyAdminCredentials(crmPasswordInput);
        if (verifyResult.success) {
          setCrmAuthenticated(true);
          sessionStorage.setItem('crm_auth', 'true');
          triggerToast(isAr ? 'تم الدخول بنجاح (وضع عدم الاتصال)' : 'Logged in successfully (Offline Mode)');
        } else {
          throw new Error(verifyResult.message || (isAr ? 'كلمة المرور غير صحيحة' : 'Incorrect password'));
        }
      }
    } catch (err) {
      console.error(err);
      setCrmAuthError(err.message || (isAr ? 'فشل تسجيل الدخول' : 'Login failed'));
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
      triggerToast(isAr ? 'تم تنزيل ملف العملاء Excel/CSV بنجاح!' : 'Exported leads successfully!', 'success');
    }
  };

  // Full Leads Database JSON Backup
  const handleExportLeadsJson = () => {
    const backupData = {
      platform: '1Line Real Estate CRM Leads',
      timestamp: new Date().toISOString(),
      leadsCount: leads.length,
      leads: leads
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OneLine_Leads_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerToast(isAr ? 'تم تنزيل ملف النسخة الاحتياطية لبيانات العملاء (JSON) بنجاح!' : 'Leads backup downloaded!', 'success');
  };

  // Full Leads Database JSON Restore
  const handleImportLeadsJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const importedLeads = parsed.leads || parsed;
        if (Array.isArray(importedLeads) && importedLeads.length > 0) {
          if (window.confirm(isAr ? `هل تريد استيراد ${importedLeads.length} عميل من ملف النسخة الاحتياطية؟` : `Import ${importedLeads.length} leads?`)) {
            localStorage.setItem('oneline_crm_leads', JSON.stringify(importedLeads));
            window.location.reload();
          }
        } else {
          throw new Error('Invalid format');
        }
      } catch (err) {
        console.error(err);
        triggerToast(isAr ? 'ملف النسخة الاحتياطية غير صالح!' : 'Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Open Edit Modal for Lead
  const handleOpenEditLead = (lead) => {
    setEditingLead(lead);
    const details = lead.details || {};
    setLeadFormData({
      name: lead.name || '',
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || '',
      type: lead.type || 'buyer',
      status: lead.status || 'new',
      followUp: lead.followUp || 'Pending Contact',
      assignedTo: lead.assignedTo || 'Unassigned',
      notes: lead.notes || '',
      score: lead.score || 85,
      budget: details.budget || details.expectedPrice || '',
      area: details.area || 'east',
      propertyType: details.propertyType || 'apartment'
    });
  };

  // Save Lead Edits
  const handleSaveLeadEdits = (e) => {
    e.preventDefault();
    if (!editingLead) return;

    const updatedLeadData = {
      name: leadFormData.name,
      phone: leadFormData.phone,
      whatsapp: leadFormData.whatsapp || leadFormData.phone,
      type: leadFormData.type,
      status: leadFormData.status,
      followUp: leadFormData.followUp,
      assignedTo: leadFormData.assignedTo,
      notes: leadFormData.notes,
      score: parseInt(leadFormData.score) || 85,
      details: {
        ...(editingLead.details || {}),
        budget: leadFormData.budget,
        expectedPrice: leadFormData.budget,
        area: leadFormData.area,
        propertyType: leadFormData.propertyType
      }
    };

    if (onUpdateLead) {
      onUpdateLead(editingLead.id, updatedLeadData);
    } else {
      setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, ...updatedLeadData } : l));
    }

    triggerToast(isAr ? 'تم حفظ وتحديث بيانات العميل بنجاح!' : 'Lead details updated successfully!', 'success');
    setEditingLead(null);
  };

  // Delete Lead
  const handleDeleteLeadClick = (leadId, leadName) => {
    if (window.confirm(isAr ? `هل أنت متأكد من حذف بيانات العميل (${leadName || ''})؟` : `Delete lead ${leadName}?`)) {
      if (onDeleteLead) {
        onDeleteLead(leadId);
      } else {
        setLeads(prev => prev.filter(l => l.id !== leadId));
      }
      triggerToast(isAr ? 'تم حذف العميل بنجاح' : 'Lead deleted', 'info');
    }
  };

  // Quick Action Handler (WhatsApp)
  const onWhatsAppClick = (lead) => {
    if (handleWhatsAppAction) {
      handleWhatsAppAction(lead);
    } else {
      const cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
      const text = isAr 
        ? `مرحباً أ. ${lead.name}، معك مستشار شركة 1Line للحلول العقارية بسوهاج. نود متابعة طلبك العقاري.` 
        : `Hello ${lead.name}, this is 1Line Real Estate following up on your request.`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // CRM Analytics Metrics
  const crmAnalytics = {
    todayCount: leads.filter(
      (l) => new Date(l.timestamp).toDateString() === new Date().toDateString()
    ).length,
    buyersCount: leads.filter((l) => l.type === 'buyer').length,
    sellersCount: leads.filter((l) => l.type === 'seller').length,
    brokersCount: leads.filter((l) => l.type === 'broker').length,
    requestsCount: leads.filter((l) => l.type === 'request').length,
    closedCount: leads.filter((l) => l.status === 'closed').length,
    conversionSuccess: leads.length > 0 
      ? Math.round((leads.filter((l) => l.status === 'closed').length / leads.length) * 100) + '%'
      : '0%'
  };

  // Filtered Leads list with Multi-Dimensional Search
  const filteredLeads = leads.filter((l) => {
    if (leadFilter !== 'all' && l.type !== leadFilter) return false;
    if (temperatureFilter !== 'all' && (l.temperature || 'hot') !== temperatureFilter) return false;
    if (areaFilter !== 'all' && l.details?.area !== areaFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = (l.name || '').toLowerCase().includes(q);
      const matchPhone = (l.phone || '').includes(q);
      const matchNotes = (l.notes && l.notes.toLowerCase().includes(q));
      const matchCity = (l.cityOrExpat && l.cityOrExpat.toLowerCase().includes(q));
      const matchTags = (l.tags && l.tags.some(t => t.toLowerCase().includes(q)));
      if (!matchName && !matchPhone && !matchNotes && !matchCity && !matchTags) return false;
    }
    return true;
  });

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
            {isAr ? 'لوحة تحكم الإدارة' : 'Admin CRM Login'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {firebaseConnected 
              ? (isAr ? 'قم بتسجيل الدخول باستخدام حساب المشرف العقاري المعتمد.' : 'Login with certified admin credentials.')
              : (isAr ? 'أدخل كلمة المرور للوصول إلى وضع عدم الاتصال.' : 'Enter password to access offline mode.')}
          </p>
          
          <form onSubmit={handleLoginSubmit}>
            {firebaseConnected && (
              <div style={{ marginBottom: '16px', textAlign: 'right' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                  {isAr ? 'البريد الإلكتروني' : 'Email Address'}
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
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <div style={{ position: 'relative', marginTop: '4px' }}>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder={isAr ? 'كلمة المرور' : 'Password'}
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
                    [isAr ? 'left' : 'right']: '12px',
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
              {loading ? (isAr ? 'جاري التحقق...' : 'Verifying...') : (isAr ? 'دخول لوحة التحكم' : 'Login to CRM')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Enterprise Dashboard Navigation Tabs
  return (
    <div className="enterprise-crm-hub">
      {/* Top Operations & System Actions Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(15, 23, 42, 0.5)',
        padding: '10px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        marginBottom: '16px'
      }}>
        {/* Left / Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            background: firebaseConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(217, 119, 6, 0.12)',
            color: firebaseConnected ? 'var(--emerald)' : 'var(--accent-gold)',
            border: `1px solid ${firebaseConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`
          }}>
            {firebaseConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{firebaseConnected ? (isAr ? 'متصل بالسحابة (Cloud Sync)' : 'Cloud Active') : (isAr ? 'وضع التخزين المحلي (Local Cache)' : 'Local Storage')}</span>
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {isAr ? 'مركز العمليات والمطابقات الفورية لطلبات الشراء والبيع' : 'Instant CRM operations and deal matching hub'}
          </span>
        </div>

        {/* Right / Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Contract Studio Launch Button */}
          <button 
            type="button" 
            className="btn btn-sm" 
            onClick={() => setShowContractStudio(true)}
            style={{ 
              background: 'linear-gradient(135deg, #0d48a1 0%, #1565c0 100%)', 
              color: '#fff', 
              fontWeight: 'bold',
              border: '1px solid rgba(255, 179, 0, 0.4)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '0.8rem',
              padding: '6px 12px',
              boxShadow: '0 2px 8px rgba(13, 72, 161, 0.25)'
            }}
          >
            <FileText size={13} className="text-gold" />
            <span>{isAr ? 'استوديو العقود' : 'Contract Studio'}</span>
          </button>

          {/* AI Copywriter Launch Button */}
          <button 
            type="button" 
            className="btn btn-sm" 
            onClick={() => setShowAICopywriter(true)}
            style={{ 
              background: 'var(--gradient-gold)', 
              color: '#092347', 
              fontWeight: 'bold',
              border: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '0.8rem',
              padding: '6px 12px'
            }}
          >
            <Wand2 size={13} />
            <span>{isAr ? 'كاتب الإعلانات AI' : 'AI Copywriter'}</span>
          </button>

          {/* JSON Backup Button */}
          <button 
            type="button" 
            className="btn btn-sm" 
            onClick={handleExportLeadsJson}
            title={isAr ? 'تحميل نسخة احتياطية لبيانات العملاء JSON' : 'Backup Leads JSON'}
            style={{ 
              background: 'rgba(255, 255, 255, 0.08)', 
              color: '#ffffff', 
              border: '1px solid rgba(255, 255, 255, 0.2)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '0.8rem', 
              padding: '6px 11px' 
            }}
          >
            <Database size={13} />
            <span>{isAr ? 'نسخ احتياطي' : 'Backup'}</span>
          </button>

          {/* Hidden Restore Input */}
          <label 
            className="btn btn-sm" 
            style={{ 
              cursor: 'pointer', 
              margin: 0, 
              fontSize: '0.8rem', 
              padding: '6px 11px', 
              background: 'rgba(255, 255, 255, 0.08)', 
              color: '#ffffff', 
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Upload size={13} />
            <span>{isAr ? 'استعادة' : 'Restore'}</span>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportLeadsJson} 
              style={{ display: 'none' }} 
            />
          </label>

          {/* Export CSV */}
          <button 
            className="btn btn-sm" 
            onClick={handleExportCSV}
            style={{ 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: '#10b981', 
              border: '1px solid rgba(16, 185, 129, 0.4)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '0.8rem',
              padding: '6px 12px'
            }}
          >
            <Download size={13} />
            <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Enterprise Modular Navigation Strip (Segmented Modern Pills) */}
      <div className="crm-nav-segmented-strip">
        {[
          { id: 'dashboard', icon: LayoutGrid, label_ar: 'لوحة القيادة التنفيذية', label_en: 'Executive Overview' },
          { id: 'kanban', icon: Target, label_ar: 'مسار الصفقات (Kanban)', label_en: 'Deals Pipeline' },
          { id: 'matching', icon: Sparkles, label_ar: 'المطابقات الذكية', label_en: 'AI Match Engine' },
          { id: 'leads', icon: Users, label_ar: `قاعدة بيانات العملاء (${leads.length})`, label_en: `Leads Hub (${leads.length})` },
          { id: 'agents', icon: Trophy, label_ar: 'تارجت وعمولات الفريق', label_en: 'Team & Commissions' },
          { id: 'financials', icon: Calculator, label_ar: 'الأقساط وإيصالات الحجز', label_en: 'Financials & Receipts' },
          { id: 'retargeting', icon: Zap, label_ar: 'حملات إعادة الاستهداف', label_en: 'Retargeting' },
          { id: 'visitor_intelligence', icon: Activity, label_ar: 'تحليلات وسلوك الزوار', label_en: 'Visitor Intelligence' },
          { id: 'founder_cms', icon: Building, label_ar: 'بيانات الشركة والمؤسس', label_en: 'Corporate CMS' },
          { id: 'automation', icon: Bell, label_ar: 'الأتمتة والإشعارات', label_en: 'Automations' }
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`crm-nav-pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => setAdminTab(tab.id)}
            >
              <IconComp size={14} className={isActive ? 'text-gold' : ''} />
              <span>{isAr ? tab.label_ar : tab.label_en}</span>
            </button>
          );
        })}
      </div>

      {/* 📊 TAB 1: EXECUTIVE DASHBOARD */}
      {adminTab === 'dashboard' && (
        <div className="crm-layout">
          {/* Quick Action Command Shortcuts */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            marginBottom: '4px'
          }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowAddLeadModal(true)}
              style={{
                background: 'rgba(217, 119, 6, 0.12)',
                border: '1px solid rgba(217, 119, 6, 0.35)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 'bold',
                fontSize: '0.82rem'
              }}
            >
              <UserPlus size={15} />
              <span>{isAr ? '+ تسجيل عميل هاتفي جديد' : '+ Register New Lead'}</span>
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setAdminTab('kanban')}
              style={{
                background: 'rgba(6, 182, 212, 0.1)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#06b6d4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 'bold',
                fontSize: '0.82rem'
              }}
            >
              <Target size={15} />
              <span>{isAr ? 'مسار الصفقات (Kanban)' : 'Deals Pipeline'}</span>
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setAdminTab('retargeting')}
              style={{
                background: 'rgba(236, 72, 153, 0.1)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                color: '#ec4899',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 'bold',
                fontSize: '0.82rem'
              }}
            >
              <Zap size={15} />
              <span>{isAr ? 'حملة إعادة استهداف' : 'Launch Retargeting'}</span>
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setAdminTab('visitor_intelligence')}
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 'bold',
                fontSize: '0.82rem'
              }}
            >
              <Activity size={15} />
              <span>{isAr ? 'تحليلات سلوك الزوار' : 'Live Visitor Stream'}</span>
            </button>
          </div>

          <div className="crm-stats-grid">
            <div className="crm-stat-card">
              <div className="crm-stat-icon" style={{ background: 'linear-gradient(135deg, rgba(255, 202, 40, 0.25), rgba(217, 119, 6, 0.15))', color: '#ffca28', border: '1px solid rgba(255, 202, 40, 0.4)' }}><Bell size={20} /></div>
              <div className="crm-stat-info">
                <span className="crm-stat-num">{crmAnalytics.todayCount}</span>
                <span className="crm-stat-lbl">{isAr ? 'عملاء اليوم' : 'Leads Today'}</span>
              </div>
            </div>
            <div className="crm-stat-card">
              <div className="crm-stat-icon" style={{ background: 'linear-gradient(135deg, rgba(13, 72, 161, 0.35), rgba(21, 101, 192, 0.2))', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.4)' }}><Building size={20} /></div>
              <div className="crm-stat-info">
                <span className="crm-stat-num">{crmAnalytics.buyersCount}</span>
                <span className="crm-stat-lbl">{isAr ? 'إجمالي المشترين' : 'Total Buyers'}</span>
              </div>
            </div>
            <div className="crm-stat-card">
              <div className="crm-stat-icon" style={{ background: 'linear-gradient(135deg, rgba(255, 202, 40, 0.25), rgba(245, 158, 11, 0.15))', color: '#ffca28', border: '1px solid rgba(255, 202, 40, 0.4)' }}><Users size={20} /></div>
              <div className="crm-stat-info">
                <span className="crm-stat-num">{crmAnalytics.sellersCount}</span>
                <span className="crm-stat-lbl">{isAr ? 'إجمالي البائعين' : 'Total Sellers'}</span>
              </div>
            </div>
            <div className="crm-stat-card">
              <div className="crm-stat-icon" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.15))', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.4)' }}><Briefcase size={20} /></div>
              <div className="crm-stat-info">
                <span className="crm-stat-num">{crmAnalytics.conversionSuccess}</span>
                <span className="crm-stat-lbl">{isAr ? 'معدل إغلاق الصفقات' : 'Conversion Rate'}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' }}>
            <div className="crm-table-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>{isAr ? 'العملاء المسجلون حديثاً' : 'Recent Registrations'}</h3>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline" 
                  onClick={() => setAdminTab('kanban')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                >
                  <span>{isAr ? 'عرض مسار الكانبان' : 'Open Pipeline'}</span>
                  {isAr ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                </button>
              </div>
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>{isAr ? 'اسم العميل' : 'Full Name'}</th>
                    <th>{isAr ? 'النوع' : 'Type'}</th>
                    <th>{isAr ? 'نقاط الجدية' : 'Score'}</th>
                    <th>{isAr ? 'الحالة' : 'Status'}</th>
                    <th>{isAr ? 'المصدر' : 'Source'}</th>
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
                      <td><span className={`badge badge-status status-${l.status}`}>{l.status?.toUpperCase()}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{l.source || l.landingPage || 'Direct Web'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="crm-table-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3>{isAr ? 'سجل الإشعارات والأتمتة' : 'System Notifications'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{isAr ? 'لا توجد إشعارات حالية' : 'No notifications'}</p>
                ) : (
                  notifications.map((notif, index) => (
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
                      <span>{typeof notif === 'string' ? notif : notif.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 TAB 2: KANBAN DEALS PIPELINE */}
      {adminTab === 'kanban' && (
        <KanbanPipeline
          leads={leads}
          properties={properties}
          onUpdateLead={onUpdateLead}
          onOpenEditLead={handleOpenEditLead}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* ✨ TAB 3: SMART MATCHING ENGINE */}
      {adminTab === 'matching' && (
        <SmartMatchingHub
          leads={leads}
          properties={properties}
          onUpdateLead={onUpdateLead}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 👥 TAB 4: LEADS HUB (ENTERPRISE CUSTOMER 360° DATABASE) */}
      {adminTab === 'leads' && (
        <div className="crm-table-container">
          {/* Top Control Strip */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} className="text-gold" />
                {isAr ? 'قاعدة بيانات العملاء الشاملة (Customer 360° Hub)' : 'Customer 360° Database'}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {isAr ? `إجمالي العملاء: ${leads.length} عميل | المطابق للفلتر: ${filteredLeads.length}` : `Total Leads: ${leads.length} | Filtered: ${filteredLeads.length}`}
              </span>
            </div>

            {/* Quick Add Lead & Export Actions */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setShowAddLeadModal(true)}
                style={{
                  background: 'var(--gradient-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 10px rgba(217, 119, 6, 0.3)'
                }}
              >
                <UserPlus size={15} />
                <span>{isAr ? 'إضافة عميل جديد ➕' : 'Add New Lead ➕'}</span>
              </button>
            </div>
          </div>

          {/* Advanced Multi-Filters Toolbar */}
          <div className="crm-table-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            {/* Type Filters */}
            <div className="table-filters" style={{ flexWrap: 'wrap' }}>
              <button className={`table-filter-btn ${leadFilter === 'all' ? 'active' : ''}`} onClick={() => setLeadFilter('all')}>{isAr ? 'الكل' : 'All'} ({leads.length})</button>
              <button className={`table-filter-btn ${leadFilter === 'buyer' ? 'active' : ''}`} onClick={() => setLeadFilter('buyer')}>{isAr ? 'مشترين' : 'Buyers'}</button>
              <button className={`table-filter-btn ${leadFilter === 'seller' ? 'active' : ''}`} onClick={() => setLeadFilter('seller')}>{isAr ? 'بائعين' : 'Sellers'}</button>
              <button className={`table-filter-btn ${leadFilter === 'investor' ? 'active' : ''}`} onClick={() => setLeadFilter('investor')}>{isAr ? 'مستثمرين' : 'Investors'}</button>
              <button className={`table-filter-btn ${leadFilter === 'broker' ? 'active' : ''}`} onClick={() => setLeadFilter('broker')}>{isAr ? 'وسطاء' : 'Brokers'}</button>
              <button className={`table-filter-btn ${leadFilter === 'request' ? 'active' : ''}`} onClick={() => setLeadFilter('request')}>{isAr ? 'طلبات خاصة' : 'Special'}</button>
            </div>

            {/* Secondary Filters (Temperature & Area) */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Temperature Filter */}
              <select
                value={temperatureFilter}
                onChange={(e) => setTemperatureFilter(e.target.value)}
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: 'var(--radius-pill)', width: 'auto' }}
              >
                <option value="all">🌡️ {isAr ? 'كل درجات الحرارة' : 'All Temperatures'}</option>
                <option value="hot">🔥 {isAr ? 'ساخن جداً (Hot)' : 'Hot'}</option>
                <option value="warm">⚡ {isAr ? 'دافئ (Warm)' : 'Warm'}</option>
                <option value="cold">❄️ {isAr ? 'بارد (Cold)' : 'Cold'}</option>
              </select>

              {/* Area Filter */}
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: 'var(--radius-pill)', width: 'auto' }}
              >
                <option value="all">📍 {isAr ? 'كل مناطق سوهاج' : 'All Areas'}</option>
                {SOHAG_AREAS.filter(a => a.id !== 'all').map(a => (
                  <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name_en}</option>
                ))}
              </select>

              {/* Text Search */}
              <input 
                type="text" 
                placeholder={isAr ? 'بحث بالاسم، الهاتف، الوسم، الاغتراب...' : 'Search name/phone/tag...'} 
                className="form-input" 
                style={{ padding: '6px 14px', fontSize: '0.8rem', width: '220px', borderRadius: 'var(--radius-pill)' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* ⚡ BULK ACTIONS FLOATING TOOLBAR */}
          {selectedLeadIds.length > 0 && (
            <div style={{
              background: 'rgba(217, 119, 6, 0.12)',
              border: '1px solid var(--accent-gold)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 16px',
              marginBottom: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge" style={{ background: 'var(--accent-gold)', color: '#000', fontWeight: 'bold' }}>
                  {selectedLeadIds.length} {isAr ? 'عميل محدد' : 'selected'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                  {isAr ? 'إجراءات جماعية فورية:' : 'Bulk Actions:'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Bulk Assign Agent Dropdown */}
                <select
                  onChange={(e) => {
                    if (e.target.value) handleBulkAssign(e.target.value);
                  }}
                  className="form-input"
                  style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }}
                  defaultValue=""
                >
                  <option value="" disabled>👥 {isAr ? 'تعيين مسؤول جماعي...' : 'Assign Agent...'}</option>
                  <option value="Dr. Mahmoud Elbaz">Dr. Mahmoud Elbaz</option>
                  <option value="Sales Team A">Sales Team A (شرق سوهاج)</option>
                  <option value="Sales Team B">Sales Team B (سوهاج الجديدة)</option>
                </select>

                {/* Bulk Export */}
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleBulkExportSelected}
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <Download size={13} />
                  <span>{isAr ? 'تصدير المحدد (CSV)' : 'Export CSV'}</span>
                </button>

                {/* Bulk Delete */}
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleBulkDelete}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--rose)', border: '1px solid var(--rose)' }}
                >
                  <Trash2 size={13} />
                  <span>{isAr ? 'حذف المحدد' : 'Delete'}</span>
                </button>

                {/* Clear Selection */}
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setSelectedLeadIds([])}
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  ✕ {isAr ? 'إلغاء التحديد' : 'Clear'}
                </button>
              </div>
            </div>
          )}

          {/* Leads Table */}
          <table className="crm-table">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.length > 0 && selectedLeadIds.length === filteredLeads.length}
                    onChange={() => handleToggleSelectAll(filteredLeads)}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>{isAr ? 'العميل والملف الشخصي' : 'Client Profile'}</th>
                <th>{isAr ? 'المواصفات والميزانية' : 'Requirements'}</th>
                <th>{isAr ? 'الجدية والحرارة' : 'Score & Temp'}</th>
                <th>{isAr ? 'الحالة' : 'Status'}</th>
                <th>{isAr ? 'المتابعة القادمة' : 'Next Action'}</th>
                <th>{isAr ? 'المسؤول' : 'Agent'}</th>
                <th>{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <Inbox size={32} style={{ color: 'var(--accent-gold)' }} />
                      <span style={{ fontSize: '0.9rem' }}>{isAr ? 'لم يتم العثور على أي عملاء يطابقون خيارات البحث الحالية.' : 'No leads found.'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((l) => {
                  const isSelected = selectedLeadIds.includes(l.id);
                  const temp = l.temperature || 'hot';

                  return (
                    <tr key={l.id} style={{ background: isSelected ? 'rgba(217, 119, 6, 0.05)' : undefined }}>
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(l.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Client Info + 360 Trigger */}
                      <td data-label={isAr ? 'الاسم والملف' : 'Name & Profile'}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong 
                              style={{ color: 'var(--text-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => setViewingProfileLead(l)}
                              title={isAr ? 'فتح ملف العميل الشامل 360°' : 'Open 360 Profile'}
                            >
                              {l.name}
                            </strong>
                            {l.cityOrExpat && l.cityOrExpat !== 'سوهاج' && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--cyan)', background: 'var(--cyan-bg)', padding: '1px 5px', borderRadius: '4px' }}>
                                ✈️ {l.cityOrExpat}
                              </span>
                            )}
                          </div>

                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{l.phone}</span>

                          {/* Tags Display */}
                          {l.tags && l.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                              {l.tags.slice(0, 2).map((t, i) => (
                                <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px', color: 'var(--accent-gold)' }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Requirements */}
                      <td data-label={isAr ? 'المواصفات' : 'Requirements'}>
                        <div style={{ fontSize: '0.8rem', maxWidth: '280px', whiteSpace: 'normal' }}>
                          {l.details?.budget && (
                            <strong style={{ color: 'var(--emerald)', display: 'block', marginBottom: '2px' }}>
                              💰 {typeof l.details.budget === 'number' ? l.details.budget.toLocaleString() + ' ج.م' : l.details.budget + ' EGP'}
                            </strong>
                          )}
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {l.details?.propertyType || l.type} • {l.details?.area || 'سوهاج'}
                          </span>
                        </div>
                      </td>

                      {/* Score & Temperature */}
                      <td data-label={isAr ? 'الجدية والحرارة' : 'Score & Temp'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`lead-score-pill ${l.score >= 85 ? 'score-high' : 'score-medium'}`}>
                            {l.score || 85}%
                          </span>
                          <span title={temp === 'hot' ? 'عميل ساخن للشراء' : temp === 'warm' ? 'عميل دافئ' : 'عميل مستكشف'}>
                            {temp === 'hot' ? '🔥' : temp === 'warm' ? '⚡' : '❄️'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td data-label={isAr ? 'الحالة' : 'Status'}>
                        <select 
                          value={l.status || 'new'} 
                          onChange={(e) => {
                            if (onUpdateLead) onUpdateLead(l.id, { status: e.target.value });
                          }}
                          style={{
                            background: 'var(--secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '4px',
                            padding: '4px',
                            fontSize: '0.8rem'
                          }}
                        >
                          <option value="new">NEW</option>
                          <option value="contacted">CONTACTED</option>
                          <option value="site_visit">SITE VISIT</option>
                          <option value="negotiating">NEGOTIATING</option>
                          <option value="closing">CLOSING</option>
                          <option value="closed">CLOSED</option>
                        </select>
                      </td>

                      {/* Next Action / Follow-up */}
                      <td data-label={isAr ? 'المتابعة القادمة' : 'Next Action'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input 
                            type="text" 
                            value={l.nextActionNote || l.followUp || ''} 
                            placeholder={isAr ? 'سجل الإجراء القادم...' : 'Next action...'}
                            onChange={(e) => {
                              if (onUpdateLead) onUpdateLead(l.id, { nextActionNote: e.target.value, followUp: e.target.value });
                            }}
                            className="form-input" 
                            style={{ padding: '4px 8px', fontSize: '0.78rem', width: '130px' }}
                          />
                        </div>
                      </td>

                      {/* Agent */}
                      <td data-label={isAr ? 'المسؤول' : 'Agent'}>
                        <select 
                          value={l.assignedTo || 'Unassigned'} 
                          onChange={(e) => {
                            if (onUpdateLead) onUpdateLead(l.id, { assignedTo: e.target.value });
                          }}
                          style={{
                            background: 'var(--secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-light)',
                            borderRadius: '4px',
                            padding: '4px',
                            fontSize: '0.8rem'
                          }}
                        >
                          <option value="Dr. Mahmoud Elbaz">Dr. Mahmoud Elbaz</option>
                          <option value="Sales Team A">Sales Team A</option>
                          <option value="Sales Team B">Sales Team B</option>
                          <option value="Sales Advisor Team">Sales Advisor Team</option>
                          <option value="Unassigned">Unassigned</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td data-label={isAr ? 'الإجراءات' : 'Actions'}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {/* Open 360° Profile */}
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => setViewingProfileLead(l)}
                            style={{ padding: '5px 7px', background: 'var(--accent-gold-light)', color: 'var(--accent-gold)', borderColor: 'var(--accent-gold)' }}
                            title={isAr ? 'فتح ملف العميل الشامل 360°' : 'Customer 360° Profile'}
                          >
                            <User size={13} />
                          </button>

                          {/* 1-Click Convert to Property */}
                          {onConvertToProperty && (
                            <button 
                              className="btn btn-sm btn-outline" 
                              onClick={() => onConvertToProperty(l)}
                              title={isAr ? 'تحويل هذا الطلب إلى عقار معروض بالموقع فوراً' : 'Convert to Property Listing'}
                              style={{ padding: '5px 7px' }}
                            >
                              <Building size={13} />
                            </button>
                          )}

                          {/* WhatsApp Instant Direct Contact */}
                          <button 
                            className="btn btn-sm btn-accent" 
                            onClick={() => onWhatsAppClick(l)} 
                            style={{ padding: '5px 7px' }} 
                            title="WhatsApp"
                          >
                            <MessageSquare size={13} />
                          </button>

                          {/* Delete Lead */}
                          <button 
                            className="btn btn-sm" 
                            onClick={() => handleDeleteLeadClick(l.id, l.name)} 
                            style={{ padding: '5px 7px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--rose)', border: '1px solid rgba(239, 68, 68, 0.2)' }} 
                            title={isAr ? 'حذف العميل' : 'Delete Lead'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 🏆 TAB 5: TEAM COMMISSIONS & LEADERBOARD */}
      {adminTab === 'agents' && (
        <AgentCommissionLeaderboard
          leads={leads}
          properties={properties}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 📑 TAB 6: FINANCIALS & INSTALLMENT BUILDER */}
      {adminTab === 'financials' && (
        <PaymentScheduleBuilder
          properties={properties}
          leads={leads}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 📢 TAB 7: RETARGETING CAMPAIGNS HUB */}
      {adminTab === 'retargeting' && (
        <RetargetingHub
          leads={leads}
          properties={properties}
          onUpdateLead={onUpdateLead}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 📊 TAB 8: VISITOR INTELLIGENCE & CLICKSTREAM */}
      {adminTab === 'visitor_intelligence' && (
        <VisitorIntelligencePanel
          properties={properties}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 🏛️ TAB 9: CORPORATE & FOUNDER CMS */}
      {adminTab === 'founder_cms' && (
        <FounderCmsPanel
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* ⚙️ TAB 10: AUTOMATION & WEBHOOKS */}
      {adminTab === 'automation' && (
        <div className="crm-table-container">
          <h3>{isAr ? 'إعدادات الأتمتة والتنبيهات الفورية' : 'Automation & Instant Alert Hub'}</h3>
          <p className="section-subtitle" style={{ marginBottom: '24px' }}>
            {isAr ? 'قم بإعداد قنوات التنبيه الفوري لمالك الموقع فور تسجيل أي طلب جديد لسرعة إغلاق الصفقات.' : 'Configure instant notification channels'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'var(--primary)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <h4 style={{ marginBottom: '10px', color: 'var(--accent-gold)' }}>
                📱 {isAr ? 'التنبيه الفوري عبر الواتساب والتيليجرام' : 'Instant Webhook / WhatsApp Push'}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {isAr ? 'عند تسجيل أي عميل مهتم على الموقع، يُرسل النظام إشعاراً فورياً على هاتف المدير يتضمن (الاسم، الهاتف، الميزانية، ونقاط الجدية).' : 'Pushes lead info to management phone instantly.'}
              </p>
              
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  triggerToast(isAr ? 'تم إرسال إشعار تجريبي فوري لهاتف الإدارة بنجاح! 🔔' : 'Test notification sent to management phone!');
                  addNotification('إشعار فوري: عميل جديد مهتم بشراء شقة في شرق سوهاج بميزانية 3.5M ج.م (جدية 95%)');
                }}
              >
                {isAr ? 'اختبار إرسال إشعار تجريبي للإدارة' : 'Send Test Notification'}
              </button>
            </div>

            <div style={{ background: 'var(--primary)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <h4 style={{ marginBottom: '10px', color: 'var(--emerald)' }}>
                🎯 {isAr ? 'قواعد التوزيع الذكي للعملاء' : 'Smart Auto-Assignment'}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {isAr ? 'توجيه العملاء أصحاب الميزانيات المرتفعة (> 5 مليون) مباشرة للدكتور محمود الباز، وتوزيع باقي الطلبات بالتساوي على Sales Team A و B.' : 'Auto distributes VIP leads.'}
              </p>
              <button className="btn btn-accent" onClick={() => {
                triggerToast(isAr ? 'تم تطبيق قواعد التوزيع التلقائي على جميع العملاء الجدد بنجاح!' : 'Auto assignment applied!');
                addNotification('تم إعادة توزيع 3 عملاء متوقعي الجدية للـ Sales Team تلقائياً.');
              }}>
                {isAr ? 'تفعيل وتوزيع العملاء الآن' : 'Run Auto Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🤖 AI COPYWRITER MODAL */}
      {showAICopywriter && (
        <AICopywriterModal
          isOpen={showAICopywriter}
          onClose={() => setShowAICopywriter(false)}
          properties={properties}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* ✏️ EDIT LEAD DETAILS MODAL */}
      {editingLead && (
        <div className="track-modal-backdrop" onClick={() => setEditingLead(null)}>
          <div className="property-form-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-form-header">
              <h3>{isAr ? 'تعديل وتصحيح بيانات العميل' : 'Edit Lead Details'}</h3>
              <button type="button" className="drawer-close-btn" onClick={() => setEditingLead(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveLeadEdits} className="property-cms-form">
              <div className="cms-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group-item">
                  <label>{isAr ? 'اسم العميل *' : 'Full Name *'}</label>
                  <input
                    type="text"
                    value={leadFormData.name}
                    onChange={(e) => setLeadFormData({ ...leadFormData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'رقم الهاتف الأساسي *' : 'Phone *'}</label>
                  <input
                    type="text"
                    value={leadFormData.phone}
                    onChange={(e) => setLeadFormData({ ...leadFormData, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'رقم الواتساب' : 'WhatsApp'}</label>
                  <input
                    type="text"
                    value={leadFormData.whatsapp}
                    onChange={(e) => setLeadFormData({ ...leadFormData, whatsapp: e.target.value })}
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'نوع الطلب' : 'Lead Type'}</label>
                  <select
                    value={leadFormData.type}
                    onChange={(e) => setLeadFormData({ ...leadFormData, type: e.target.value })}
                  >
                    <option value="buyer">{isAr ? 'طلب شراء (Buyer)' : 'Buyer'}</option>
                    <option value="seller">{isAr ? 'عرض بيع (Seller)' : 'Seller'}</option>
                    <option value="broker">{isAr ? 'وسيط عقاري (Broker)' : 'Broker'}</option>
                    <option value="investor">{isAr ? 'مستثمر (Investor)' : 'Investor'}</option>
                    <option value="request">{isAr ? 'طلب مخصص (Special)' : 'Special Request'}</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'الميزانية / السعر المتوقع (ج.م)' : 'Budget / Price (EGP)'}</label>
                  <input
                    type="text"
                    value={leadFormData.budget}
                    onChange={(e) => setLeadFormData({ ...leadFormData, budget: e.target.value })}
                    placeholder="مثال: 3,000,000"
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'المنطقة المستهدفة' : 'Area'}</label>
                  <select
                    value={leadFormData.area}
                    onChange={(e) => setLeadFormData({ ...leadFormData, area: e.target.value })}
                  >
                    {SOHAG_AREAS.map(a => (
                      <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name_en}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'حالة المتابعة' : 'Status'}</label>
                  <select
                    value={leadFormData.status}
                    onChange={(e) => setLeadFormData({ ...leadFormData, status: e.target.value })}
                  >
                    <option value="new">NEW (جديد)</option>
                    <option value="contacted">CONTACTED (تم التواصل)</option>
                    <option value="site_visit">SITE VISIT (معاينة مجدولة)</option>
                    <option value="negotiating">NEGOTIATING (قيد التفاوض)</option>
                    <option value="closing">CLOSING (توقيع وحجز)</option>
                    <option value="closed">CLOSED (تم إغلاق الصفقة)</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'المستشار المسؤول' : 'Assigned Agent'}</label>
                  <select
                    value={leadFormData.assignedTo}
                    onChange={(e) => setLeadFormData({ ...leadFormData, assignedTo: e.target.value })}
                  >
                    <option value="Dr. Mahmoud Elbaz">Dr. Mahmoud Elbaz</option>
                    <option value="Sales Team A">Sales Team A</option>
                    <option value="Sales Team B">Sales Team B</option>
                    <option value="Unassigned">Unassigned</option>
                  </select>
                </div>
              </div>

              <div className="form-group-item" style={{ marginTop: '12px' }}>
                <label>{isAr ? 'ملاحظات العقد والاتصال' : 'Notes'}</label>
                <textarea
                  rows="3"
                  className="form-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  value={leadFormData.notes}
                  onChange={(e) => setLeadFormData({ ...leadFormData, notes: e.target.value })}
                  placeholder="سجل نتائج المكالمات وملاحظات العميل هنا..."
                />
              </div>

              <div className="cms-modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingLead(null)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} />
                  <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🕒 ACTIVITY LOG VIEWER MODAL */}
      {viewingLogsLead && (
        <div className="track-modal-backdrop" onClick={() => setViewingLogsLead(null)}>
          <div className="property-form-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-form-header">
              <h3>
                <Clock size={18} style={{ marginInlineEnd: '6px', color: 'var(--accent-gold)' }} />
                {isAr ? `سجل تدقيق العمليات: ${viewingLogsLead.name}` : `Activity Audit Log: ${viewingLogsLead.name}`}
              </h3>
              <button type="button" className="drawer-close-btn" onClick={() => setViewingLogsLead(null)}>✕</button>
            </div>

            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {(!viewingLogsLead.activityLogs || viewingLogsLead.activityLogs.length === 0) ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                  {isAr ? 'لا توجد سجلات تدقيق سابقة لهذا العميل' : 'No recorded activity logs'}
                </p>
              ) : (
                viewingLogsLead.activityLogs.map((log, idx) => (
                  <div key={idx} style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--emerald)' }}>{log.action}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleTimeString(isAr ? 'ar-EG' : 'en-US')} - {new Date(log.timestamp).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cms-modal-actions" style={{ marginTop: '10px' }}>
              <button type="button" className="btn btn-outline btn-full" onClick={() => setViewingLogsLead(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 👤 MODAL: CUSTOMER 360° INTELLIGENCE PROFILE */}
      {viewingProfileLead && (
        <CustomerProfileModal
          isOpen={!!viewingProfileLead}
          lead={viewingProfileLead}
          properties={properties}
          onClose={() => setViewingProfileLead(null)}
          onUpdateLead={(leadId, updatedData) => {
            if (onUpdateLead) onUpdateLead(leadId, updatedData);
            setViewingProfileLead(prev => prev ? { ...prev, ...updatedData } : null);
          }}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* ➕ MODAL: ADD NEW LEAD DIRECTLY */}
      {showAddLeadModal && (
        <AddLeadModal
          isOpen={showAddLeadModal}
          onClose={() => setShowAddLeadModal(false)}
          onAddLead={(newLeadPayload) => {
            if (onAddNewLead) {
              onAddNewLead(newLeadPayload);
            } else {
              setLeads(prev => [newLeadPayload, ...prev]);
            }
          }}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 📄 MODAL: OFFICIAL CONTRACT STUDIO */}
      {showContractStudio && (
        <ContractStudioModal
          isOpen={showContractStudio}
          onClose={() => setShowContractStudio(false)}
          leads={leads}
          properties={properties}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}
    </div>
  );
};

export default CrmAdminPanel;
