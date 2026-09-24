import React, { useState } from 'react';
import { 
  Lock, Eye, EyeOff, ShieldCheck, AlertCircle, 
  Wifi, WifiOff, Download, LogOut, Bell, 
  Building, Users, User, Briefcase, Inbox, 
  MessageSquare, FileText, Sparkles,
  Edit3, Trash2, Database, Upload, Save, X, Clock, CheckCircle2,
  Trophy, Calculator, LayoutGrid, Wand2, Calendar, Target, Zap,
  UserPlus, CheckSquare, Square, Flame, Tag, Filter, Send, Activity,
  ArrowLeft, ArrowRight, MapPin, Archive, Wallet
} from 'lucide-react';
import { loginUser, logAuditEvent } from '../firebaseService';
import { exportToCsv } from '../utils/exportCsv';
import { formatTimeSinceLastSync } from '../utils/syncManager';
import { canExportCsv, canDeleteLead, canViewLeadPhone, maskPhoneNumber } from '../utils/rbacRules';
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
import ContractStudioModal from './crm/ContractStudioModal';
import LeadQuickDrawer from './crm/LeadQuickDrawer';
import CrmExecutiveDashboard from './crm/CrmExecutiveDashboard';

export const CRM_ROLES = [
  { id: 'super_admin', label_ar: 'المدير العام', label_en: 'Super Admin', agentName: 'Dr. Mahmoud Elbaz', icon: '👑', canDelete: true, canViewAgencyFinancials: true },
  { id: 'sales_manager', label_ar: 'مدير المبيعات', label_en: 'Sales Manager', agentName: 'Sales Management', icon: '💼', canDelete: false, canViewAgencyFinancials: true },
  { id: 'sales_agent', label_ar: 'مستشار مبيعات', label_en: 'Sales Agent', agentName: 'Sales Advisor Team', icon: '🎯', canDelete: false, canViewAgencyFinancials: false },
  { id: 'property_manager', label_ar: 'مدير العقارات', label_en: 'Property Manager', agentName: 'Inventory Desk', icon: '🏢', canDelete: false, canViewAgencyFinancials: false },
  { id: 'finance', label_ar: 'الإدارة المالية', label_en: 'Finance', agentName: 'Finance Department', icon: '💰', canDelete: false, canViewAgencyFinancials: true },
  { id: 'viewer', label_ar: 'مراقب / مدقق', label_en: 'Viewer', agentName: 'Audit Desk', icon: '👁️', canDelete: false, canViewAgencyFinancials: false },
  { id: 'agent_east', label_ar: 'فريق شرق والكوثر (وسيط)', label_en: 'East Desk Broker', agentName: 'Sales Team A', icon: '🏆', canDelete: false, canViewAgencyFinancials: false },
  { id: 'agent_new_sohag', label_ar: 'فريق سوهاج الجديدة (وسيط)', label_en: 'New Sohag Desk Broker', agentName: 'Sales Team B', icon: '🌟', canDelete: false, canViewAgencyFinancials: false }
];

export const CrmAdminPanel = ({
  lang = 'ar',
  t = {},
  firebaseConnected = true,
  leads = [],
  setLeads,
  properties = [],
  activeMatches = [],
  exportLeadsCSV,
  handleCrmLogout,
  crmAuthenticated = true,
  setCrmAuthenticated,
  currentUser = null,
  userRole = 'super_admin',
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
  onAddNewLead,
  demands = [],
  onSwitchToDemands,
  onSwitchToProperties,
  onSwitchToProjects,
  onSwitchToAreas,
  onSwitchToCorporate,
  adminTab: propAdminTab,
  onSwitchTab,
  activeRole: propActiveRole,
  onRoleChange
}) => {
  // Local Authentication States
  const [crmPasswordInput, setCrmPasswordInput] = useState('');
  const [crmEmailInput, setCrmEmailInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [crmAuthError, setCrmAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Multi-Tenant RBAC Identity State
  const [localActiveRole, setLocalActiveRole] = useState(userRole || 'super_admin');
  const activeRole = propActiveRole || localActiveRole;
  const setActiveRole = (role) => {
    setLocalActiveRole(role);
    if (onRoleChange) onRoleChange(role);
  };
  const [myDealsOnly, setMyDealsOnly] = useState(false);

  // Enterprise Tab States
  const [localAdminTab, setLocalAdminTab] = useState('dashboard');
  const adminTab = propAdminTab || localAdminTab;
  const setAdminTab = (tab) => {
    setLocalAdminTab(tab);
    if (onSwitchTab) onSwitchTab(tab);
  };
  const [leadFilter, setLeadFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Customer 360 & Add Lead Modal States
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [viewingProfileLead, setViewingProfileLead] = useState(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [quickDrawerLead, setQuickDrawerLead] = useState(null);

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

  // Active Role Permissions and Agent Claim Helper
  const currentRoleObj = CRM_ROLES.find(r => r.id === activeRole) || CRM_ROLES[0];
  const isSuperAdmin = currentRoleObj.canDelete;

  const handleClaimLead = (leadId) => {
    if (onUpdateLead) {
      onUpdateLead(leadId, { assignedTo: currentRoleObj.agentName });
      logAuditEvent({
        actionType: 'LEAD_CLAIMED',
        targetCollection: 'leads',
        targetId: leadId,
        details: { assignedTo: currentRoleObj.agentName },
        actor: currentUser
      });
      if (triggerToast) {
        triggerToast(isAr ? `تم استلام العميل بنجاح وتعيينه لـ ${currentRoleObj.label_ar}` : `Lead claimed by ${currentRoleObj.label_en}`, 'success');
      }
    }
  };

  const getLocalizedPropertyType = (typeKey) => {
    if (!typeKey) return isAr ? 'عقار غير محدد' : 'N/A';
    const found = PROPERTY_TYPES.find(t => t.id === typeKey);
    if (found) return isAr ? found.name_ar : found.name_en;
    const fallbackMap = {
      apartment: 'شقة سكنية',
      retail: 'محل تجاري',
      villa: 'فيلا / تاون هاوس',
      office: 'مكتب إداري / عيادة',
      land: 'قطعة أرض',
      building: 'عمارة سكنية'
    };
    return fallbackMap[typeKey.toLowerCase()] || typeKey;
  };

  const getLocalizedArea = (areaKey) => {
    if (!areaKey) return isAr ? 'سوهاج' : 'Sohag';
    const found = SOHAG_AREAS.find(a => a.id === areaKey);
    if (found) return isAr ? found.name_ar : found.name_en;
    return areaKey;
  };

  const formatLeadStatus = (status) => {
    const map = {
      new: ['جديد', 'New'],
      contacted: ['تم التواصل', 'Contacted'],
      site_visit: ['معاينة مجدولة', 'Site visit'],
      negotiating: ['قيد التفاوض', 'Negotiating'],
      closing: ['توقيع وحجز', 'Closing'],
      closed: ['صفقة ناجحة', 'Closed won'],
      lost: ['مفقود', 'Lost']
    };
    const hit = map[status] || map.new;
    return isAr ? hit[0] : hit[1];
  };

  const formatLeadTypeBadge = (type) => {
    if (isAr) {
      const map = {
        buyer: 'طلب شراء',
        seller: 'عرض بيع',
        reservation_request: 'طلب حجز مبدئي',
        viewing_request: 'طلب معاينة',
        investor: 'مستثمر VIP',
        broker: 'وسيط عقاري',
        callback_request: 'طلب اتصال',
        express_buyer: 'طلب شراء سريع',
        request: 'استفسار عام'
      };
      return map[type] || t[type] || type;
    }
    return t[type] || type;
  };

  const formatLeadSourceLabel = (src) => {
    if (!src) return isAr ? 'الموقع المباشر' : 'Direct Web';
    if (isAr) {
      if (src.includes('sell')) return 'عرض عقار للبيع';
      if (src.includes('express')) return 'الشريط السريع بالرئيسية';
      if (src.includes('whatsapp')) return 'واتساب المنظومة';
      if (src.includes('valuation')) return 'حاسبة التقييم';
      if (src.includes('Facebook')) return 'إعلانات فيسبوك';
      if (src.includes('Google')) return 'بحث جوجل المباشر';
      if (src.includes('TikTok')) return 'حملات تيك توك';
      if (src === 'Direct Web') return 'الموقع المباشر';
    }
    return src;
  };

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
    logAuditEvent({
      actionType: 'BULK_LEADS_ASSIGNED',
      targetCollection: 'leads',
      targetId: selectedLeadIds.join(','),
      details: { newAgent, count: selectedLeadIds.length },
      actor: currentUser
    });
    if (triggerToast) {
      triggerToast(isAr ? `تم تعيين ${selectedLeadIds.length} عميل إلى ${newAgent}` : `Assigned ${selectedLeadIds.length} leads to ${newAgent}`, 'success');
    }
    setSelectedLeadIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedLeadIds.length === 0) return;
    if (!canDeleteLead(activeRole)) {
      if (triggerToast) {
        triggerToast(isAr ? 'غير مصرح لك بحذف العملاء (تتطلب صلاحية Super Admin)' : 'Unauthorized: requires Super Admin', 'error');
      }
      return;
    }
    if (window.confirm(isAr ? `هل أنت متأكد من حذف ${selectedLeadIds.length} عميل محدد نهائياً؟` : `Delete ${selectedLeadIds.length} leads?`)) {
      selectedLeadIds.forEach(id => {
        if (onDeleteLead) onDeleteLead(id);
      });
      logAuditEvent({
        actionType: 'BULK_LEADS_DELETED',
        targetCollection: 'leads',
        targetId: selectedLeadIds.join(','),
        details: { count: selectedLeadIds.length },
        actor: currentUser
      });
      if (triggerToast) {
        triggerToast(isAr ? `تم حذف ${selectedLeadIds.length} عميل بنجاح` : `Deleted ${selectedLeadIds.length} leads`, 'info');
      }
      setSelectedLeadIds([]);
    }
  };

  const handleBulkExportSelected = () => {
    if (selectedLeadIds.length === 0) return;
    if (!canExportCsv(activeRole)) {
      if (triggerToast) {
        triggerToast(isAr ? 'غير مصرح لك بتصدير بيانات العملاء (تتطلب صلاحية مدير أو مالية)' : 'Unauthorized: requires Manager or Finance role', 'error');
      }
      return;
    }
    const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
    const headers = {
      id: 'المعرف',
      name: 'اسم العميل',
      whatsapp: 'رقم الواتساب',
      phone: 'رقم الهاتف',
      propertyType: 'نوع العقار',
      area: 'المنطقة',
      type: 'النوع',
      status: 'الحالة',
      assignedTo: 'المسؤول',
      budget: 'الميزانية'
    };
    exportToCsv('Selected_Leads_Export', selectedLeads, headers);
    logAuditEvent({
      actionType: 'LEADS_EXPORTED_CSV',
      targetCollection: 'leads',
      targetId: 'bulk_selection',
      details: { count: selectedLeadIds.length },
      actor: currentUser
    });
    if (triggerToast) {
      triggerToast(isAr ? `تم تصدير ${selectedLeadIds.length} عميل محدد إلى CSV بنجاح!` : `Exported ${selectedLeadIds.length} leads!`, 'success');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCrmAuthError('');

    try {
      if (!crmEmailInput || !crmPasswordInput) {
        throw new Error(isAr ? 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
      }
      await loginUser(crmEmailInput, crmPasswordInput);
      setCrmAuthenticated(true);
      triggerToast(isAr ? 'تم تسجيل الدخول بنجاح عبر السحابة!' : 'Logged in successfully via Cloud Auth!');
    } catch (err) {
      console.error(err);
      setCrmAuthError(err.message || (isAr ? 'فشل تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!canExportCsv(activeRole)) {
      if (triggerToast) {
        triggerToast(isAr ? 'غير مصرح لك بتصدير ملفات العملاء (تتطلب صلاحية مدير أو مالية)' : 'Unauthorized: requires Manager or Finance role', 'error');
      }
      return;
    }
    if (exportLeadsCSV) {
      exportLeadsCSV();
      return;
    }
    const headers = {
      id: 'المعرف ID',
      name: 'اسم العميل',
      phone: 'رقم الهاتف',
      whatsapp: 'رقم الواتساب',
      email: 'البريد الإلكتروني',
      source: 'مصدر العميل',
      type: 'نوع الطلب',
      budget: 'الميزانية',
      area: 'المنطقة',
      propertyType: 'نوع العقار',
      notes: 'الملاحظات',
      status: 'حالة المتابعة',
      temperature: 'درجة الاهتمام',
      score: 'التقييم',
      assignedTo: 'المسؤول',
      nextFollowUpAt: 'موعد المتابعة القادم',
      createdAt: 'تاريخ الإنشاء',
      updatedAt: 'تاريخ التحديث',
      createdBy: 'أنشئ بواسطة',
      lastActivityAt: 'آخر نشاط'
    };
    exportToCsv('Oneline_Leads_Report', leads || [], headers);
    if (triggerToast) {
      triggerToast(isAr ? 'تم تنزيل ملف العملاء Excel/CSV بنجاح!' : 'Exported leads successfully!', 'success');
    }
  };

  // Full Leads Database JSON Backup
  const handleExportLeadsJson = () => {
    if (!canExportCsv(activeRole)) {
      if (triggerToast) {
        triggerToast(isAr ? 'غير مصرح لك بتصدير النسخ الاحتياطية (تتطلب صلاحية Super Admin أو المالية)' : 'Unauthorized: requires Admin or Finance', 'error');
      }
      return;
    }
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
    triggerToast(isAr ? 'تم تنزيل ملف النسخة الاحتياطية لبيانات العملاء بنجاح!' : 'Leads backup downloaded!', 'success');
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
      email: lead.email || '',
      source: lead.source || 'Direct Entry',
      type: lead.type || 'buyer',
      budget: lead.budget || details.budget || details.expectedPrice || '',
      area: lead.area || details.area || 'east',
      propertyType: lead.propertyType || details.propertyType || 'apartment',
      notes: lead.notes || '',
      status: lead.status || 'new',
      temperature: lead.temperature || 'hot',
      score: lead.score || 85,
      assignedTo: lead.assignedTo || 'Unassigned',
      nextFollowUpAt: lead.nextFollowUpAt ? String(lead.nextFollowUpAt).slice(0, 16) : '',
      followUp: lead.followUp || 'Pending Contact'
    });
  };

  // Save Lead Edits
  const handleSaveLeadEdits = async (e) => {
    e.preventDefault();
    if (!editingLead) return;

    if (!leadFormData.name || !leadFormData.name.trim()) {
      triggerToast(isAr ? 'الاسم بالكامل إلزامي!' : 'Full Name is required!', 'error');
      return;
    }

    const cleanWhatsapp = (leadFormData.whatsapp || leadFormData.phone || '').trim().replace(/[\s\-()]/g, '');
    if (!cleanWhatsapp) {
      triggerToast(isAr ? 'رقم الواتساب إلزامي للتواصل!' : 'WhatsApp number is required!', 'error');
      return;
    }

    if (!leadFormData.area) {
      triggerToast(isAr ? 'الموقع / المنطقة بسوهاج إلزامي!' : 'Target Area is required!', 'error');
      return;
    }

    if (!leadFormData.propertyType) {
      triggerToast(isAr ? 'نوع العقار المهتم به إلزامي!' : 'Property Type is required!', 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const updatedLeadData = {
      name: leadFormData.name.trim(),
      phone: leadFormData.phone.trim() || cleanWhatsapp,
      whatsapp: cleanWhatsapp,
      email: (leadFormData.email || '').trim(),
      source: leadFormData.source || editingLead.source || 'Direct Entry',
      type: leadFormData.type,
      budget: leadFormData.budget || '',
      area: leadFormData.area,
      propertyType: leadFormData.propertyType,
      notes: leadFormData.notes,
      status: leadFormData.status,
      temperature: leadFormData.temperature || editingLead.temperature || 'hot',
      score: parseInt(leadFormData.score) || 85,
      assignedTo: leadFormData.assignedTo,
      nextFollowUpAt: leadFormData.nextFollowUpAt ? new Date(leadFormData.nextFollowUpAt).toISOString() : null,
      followUp: leadFormData.followUp,
      updatedAt: nowIso,
      lastActivityAt: nowIso,
      createdAt: editingLead.createdAt || editingLead.timestamp || nowIso,
      createdBy: editingLead.createdBy || 'system',
      details: {
        ...(editingLead.details || {}),
        budget: leadFormData.budget,
        expectedPrice: leadFormData.budget,
        area: leadFormData.area,
        propertyType: leadFormData.propertyType
      }
    };

    if (onUpdateLead) {
      const saved = await onUpdateLead(editingLead.id, updatedLeadData);
      if (saved === false) return;
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

  // Quick Action Handler (WhatsApp Direct Contact)
  const onWhatsAppClick = (lead) => {
    if (handleWhatsAppAction) {
      handleWhatsAppAction(lead);
    } else {
      let cleanPhone = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
        cleanPhone = '2' + cleanPhone;
      }
      const text = isAr 
        ? `مرحباً أ. ${lead.name || ''}، معك مستشار شركة 1Line للحلول العقارية بسوهاج. نود متابعة طلبك العقاري ومساعدتك في أفضل الفرص المتاحة.` 
        : `Hello ${lead.name || ''}, this is 1Line Real Estate following up on your property request in Sohag.`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // Quick Action Handler (Dispatch Lead to Team / Agent via WhatsApp)
  const onDispatchLeadClick = (lead) => {
    const clientName = lead.name || (isAr ? 'عميل جديد' : 'New Lead');
    const phone = lead.phone || lead.whatsapp || 'غير مسجل';
    const type = isAr ? (lead.type === 'buyer' ? 'طلب شراء عقار' : lead.type === 'seller' ? 'عرض عقار للبيع' : lead.type === 'investor' ? 'مستثمر VIP' : lead.type) : lead.type;
    const budget = lead.details?.budget || lead.details?.expectedPrice || 'غير محدد';
    const area = lead.details?.area || 'سوهاج';
    const notes = lead.notes || lead.details?.notes || 'لا توجد ملاحظات إضافية';

    const dispatchText = isAr
      ? `🚨 *إحالة عميل جديد - منصة 1Line العقارية*\n👤 *العميل:* ${clientName}\n📞 *الهاتف:* ${phone}\n🏢 *التصنيف:* ${type}\n📍 *المنطقة:* ${area}\n💰 *الميزانية/السعر:* ${budget}\n📝 *الملاحظات:* ${notes}\n📅 *الوقت:* ${new Date().toLocaleDateString('ar-EG')}\n⚡ *الإجراء المطلوب:* يرجى سرعة التواصل والمتابعة فوراً.`
      : `🚨 *New 1Line Lead Dispatch*\n👤 *Client:* ${clientName}\n📞 *Phone:* ${phone}\n🏢 *Type:* ${type}\n📍 *Area:* ${area}\n💰 *Budget:* ${budget}\n📝 *Notes:* ${notes}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(dispatchText)}`, '_blank');
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

  // Filtered Leads list with Multi-Dimensional Search & Workflow Stages
  const filteredLeads = leads.filter((l) => {
    if (myDealsOnly && activeRole !== 'super_admin') {
      if (l.assignedTo !== currentRoleObj.agentName && l.assignedTo !== 'Unassigned') {
        return false;
      }
    }

    // Workflow & Archive Logic
    if (leadFilter === 'archived') {
      if (!l.isArchived) return false;
    } else {
      // Hide archived leads in all normal operational filters
      if (l.isArchived) return false;

      if (leadFilter === 'new') {
        if (l.status !== 'new' && l.status) return false;
      } else if (leadFilter === 'due') {
        const todayStr = new Date().toISOString().slice(0, 10);
        const hasDue = (l.nextFollowUpAt && l.nextFollowUpAt.slice(0, 10) <= todayStr) || (l.followUp && l.followUp.includes(todayStr));
        if (!hasDue) return false;
      } else if (leadFilter === 'qualified') {
        if ((l.score || 0) < 80) return false;
      } else if (leadFilter !== 'all' && l.type !== leadFilter) {
        return false;
      }
    }

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
                  value={crmEmailInput} data-testid="login-email"
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
                  value={crmPasswordInput} data-testid="login-password"
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
      {/* 📊 TAB 1: EXECUTIVE DECISION-BASED DASHBOARD (CEO / SALES REP DUAL-MODE) */}
      {adminTab === 'dashboard' && (
        <CrmExecutiveDashboard
          leads={leads}
          properties={properties}
          demands={demands}
          projects={[]}
          activeRole={activeRole}
          currentRoleObj={currentRoleObj}
          crmAnalytics={crmAnalytics}
          isAr={isAr}
          onSwitchTab={(tab) => {
            if (tab === 'properties') onSwitchToProperties?.();
            else if (tab === 'demands') onSwitchToDemands?.();
            else if (tab === 'projects') onSwitchToProjects?.();
            else setAdminTab(tab);
          }}
          onOpenLead={(lead) => setQuickDrawerLead(lead)}
          onOpenDemand={() => onSwitchToDemands?.()}
          onFilterLeads={(filterKey) => {
            setLeadFilter(filterKey);
            setAdminTab('leads');
          }}
        />
      )}

      {/* 🎯 TAB 2: KANBAN DEALS PIPELINE */}
      {adminTab === 'kanban' && (
        <KanbanPipeline
          leads={leads}
          properties={properties}
          onUpdateLead={onUpdateLead}
          onDeleteLead={onDeleteLead}
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
                {isAr ? 'قاعدة بيانات العملاء الشاملة' : 'Customer 360° Database'}
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
            {/* Stage & Workflow Quick Tabs */}
            <div className="table-filters" style={{ flexWrap: 'wrap', gap: '6px' }}>
              <button className={`table-filter-btn ${leadFilter === 'all' ? 'active' : ''}`} onClick={() => setLeadFilter('all')}>
                {isAr ? 'كل العملاء' : 'All Leads'} ({leads.filter(l => !l.isArchived).length})
              </button>
              <button className={`table-filter-btn ${leadFilter === 'new' ? 'active' : ''}`} onClick={() => setLeadFilter('new')}>
                ✨ {isAr ? 'عملاء جدد' : 'New Leads'} ({leads.filter(l => !l.isArchived && (l.status === 'new' || !l.status)).length})
              </button>
              <button className={`table-filter-btn ${leadFilter === 'due' ? 'active' : ''}`} onClick={() => setLeadFilter('due')}>
                ⏰ {isAr ? 'متابعة اليوم' : 'Due Today'}
              </button>
              <button className={`table-filter-btn ${leadFilter === 'qualified' ? 'active' : ''}`} onClick={() => setLeadFilter('qualified')}>
                🎯 {isAr ? 'مؤهلون للشراء' : 'Qualified'}
              </button>
              <button className={`table-filter-btn ${leadFilter === 'buyer' ? 'active' : ''}`} onClick={() => setLeadFilter('buyer')}>
                {isAr ? 'طلبات شراء' : 'Buyers'}
              </button>
              <button className={`table-filter-btn ${leadFilter === 'seller' ? 'active' : ''}`} onClick={() => setLeadFilter('seller')}>
                {isAr ? 'عروض بيع' : 'Sellers'}
              </button>
              <button className={`table-filter-btn ${leadFilter === 'investor' ? 'active' : ''}`} onClick={() => setLeadFilter('investor')}>
                💎 {isAr ? 'مستثمرون VIP' : 'Investors'}
              </button>
              <button className={`table-filter-btn ${leadFilter === 'archived' ? 'active' : ''}`} onClick={() => setLeadFilter('archived')} style={{ color: leadFilter === 'archived' ? '#f59e0b' : undefined }}>
                📦 {isAr ? 'المؤرشفون' : 'Archived'} ({leads.filter(l => l.isArchived).length})
              </button>
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
                <option value="hot">🔥 {isAr ? 'ساخن جداً' : 'Hot'}</option>
                <option value="warm">⚡ {isAr ? 'دافئ' : 'Warm'}</option>
                <option value="cold">❄️ {isAr ? 'بارد' : 'Cold'}</option>
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

                {/* Bulk Delete (Super Admin Only) */}
                {isSuperAdmin && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleBulkDelete}
                    style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--rose)', border: '1px solid var(--rose)' }}
                  >
                    <Trash2 size={13} />
                    <span>{isAr ? 'حذف المحدد' : 'Delete'}</span>
                  </button>
                )}

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
                            {getLocalizedPropertyType(l.propertyType || l.details?.propertyType || l.type)} • {getLocalizedArea(l.area || l.details?.area || l.details?.district || 'east')}
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
                          <option value="new">{isAr ? 'طلب جديد' : 'New'}</option>
                          <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                          <option value="site_visit">{isAr ? 'معاينة مجدولة' : 'Site Visit'}</option>
                          <option value="negotiating">{isAr ? 'قيد التفاوض' : 'Negotiating'}</option>
                          <option value="closing">{isAr ? 'توقيع وحجز' : 'Closing'}</option>
                          <option value="closed">{isAr ? 'صفقة ناجحة' : 'Closed Won'}</option>
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
                          <option value="Dr. Mahmoud Elbaz">{isAr ? 'د. محمود الباز' : 'Dr. Mahmoud Elbaz'}</option>
                          <option value="Sales Team A">{isAr ? 'فريق المبيعات (أ)' : 'Sales Team A'}</option>
                          <option value="Sales Team B">{isAr ? 'فريق المبيعات (ب)' : 'Sales Team B'}</option>
                          <option value="Sales Advisor Team">{isAr ? 'مستشار المبيعات' : 'Sales Advisor Team'}</option>
                          <option value="Unassigned">{isAr ? 'غير مسند' : 'Unassigned'}</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td data-label={isAr ? 'الإجراءات' : 'Actions'}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {/* Open 360° Profile */}
                          {/* Primary Action: Open 360° Profile */}
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setViewingProfileLead(l)}
                            style={{ 
                              padding: '5px 9px', 
                              background: 'rgba(217, 119, 6, 0.15)', 
                              color: 'var(--accent-gold)', 
                              border: '1px solid rgba(217, 119, 6, 0.35)',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={isAr ? 'فتح ملف العميل الشامل 360°' : 'Customer 360° Profile'}
                          >
                            <User size={13} />
                            <span>{isAr ? 'الملف' : 'Profile'}</span>
                          </button>

                          {/* Secondary Action: WhatsApp Instant Direct Contact */}
                          <button 
                            type="button"
                            className="btn btn-sm btn-accent" 
                            onClick={() => onWhatsAppClick(l)} 
                            style={{ padding: '5px 9px', borderRadius: '6px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                            title={isAr ? 'محادثة العميل مباشرة عبر واتساب' : 'Chat with Client on WhatsApp'}
                          >
                            <MessageSquare size={13} />
                            <span>واتساب</span>
                          </button>

                          {/* Auxiliary Tools Strip */}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: '6px', padding: '2px' }}>
                            {/* 1-Click Dispatch Lead Details to Agent via WhatsApp */}
                            <button 
                              type="button"
                              className="btn btn-sm btn-ghost" 
                              onClick={() => onDispatchLeadClick(l)} 
                              style={{ padding: '4px 6px', color: 'var(--accent-gold)', borderRadius: '4px' }} 
                              title={isAr ? 'إحالة بيانات العميل لمسؤول المبيعات عبر واتساب' : 'Dispatch Lead to Sales Agent'}
                            >
                              <Send size={12} />
                            </button>

                            {/* Convert to Property */}
                            {onConvertToProperty && (
                              <button 
                                type="button"
                                className="btn btn-sm btn-ghost" 
                                onClick={() => onConvertToProperty(l)}
                                title={isAr ? 'تحويل هذا الطلب إلى عقار معروض بالموقع فوراً' : 'Convert to Property Listing'}
                                style={{ padding: '4px 6px', color: 'var(--crm-faint)', borderRadius: '4px' }}
                              >
                                <Building size={12} />
                              </button>
                            )}

                            {/* Claim Lead */}
                            {!isSuperAdmin && l.assignedTo !== currentRoleObj.agentName && (
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                onClick={() => handleClaimLead(l.id)}
                                style={{ padding: '4px 6px', color: 'var(--crm-positive)', borderRadius: '4px' }}
                                title={isAr ? `استلام هذا العميل وتعيينه لـ ${currentRoleObj.label_ar}` : 'Claim this lead'}
                              >
                                <UserPlus size={12} />
                              </button>
                            )}

                            {/* Archive Lead Toggle */}
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => {
                                const newStatus = l.isArchived ? false : true;
                                if (onUpdateLead) {
                                  onUpdateLead(l.id, { isArchived: newStatus });
                                }
                                triggerToast(isAr ? (newStatus ? 'تم نقل العميل للأرشيف 📦' : 'تم استعادة العميل من الأرشيف') : (newStatus ? 'Lead archived' : 'Lead restored'), 'info');
                              }}
                              style={{ padding: '4px 6px', color: l.isArchived ? '#f59e0b' : '#64748b', borderRadius: '4px' }}
                              title={isAr ? (l.isArchived ? 'استعادة من الأرشيف' : 'أرشفة العميل') : (l.isArchived ? 'Restore' : 'Archive')}
                            >
                              <Archive size={12} />
                            </button>

                            {/* Delete Lead (Super Admin Only) */}
                            {isSuperAdmin ? (
                              <button 
                                type="button"
                                className="btn btn-sm btn-ghost" 
                                onClick={() => handleDeleteLeadClick(l.id, l.name)} 
                                style={{ padding: '4px 6px', color: 'var(--rose)', borderRadius: '4px' }} 
                                title={isAr ? 'حذف العميل نهائياً' : 'Delete Lead'}
                              >
                                <Trash2 size={12} />
                              </button>
                            ) : null}
                          </div>
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
      {(adminTab === 'visitor_intelligence' || adminTab === 'analytics') && (
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

      {/* 🛡️ TAB 9.5: SYSTEM BACKUP & RESTORE (ADMIN ONLY) */}
      {adminTab === 'system_backup' && (
        <div className="crm-dashboard-stack">
          <div className="crm-table-container" style={{ padding: '28px', maxWidth: '820px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
              <Database size={26} className="text-gold" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--crm-ink)' }}>
                  {isAr ? 'البيانات والنسخ الاحتياطي وإدارة المنظومة' : 'Database Backups & System Administration'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {isAr ? 'خاص بالمدير العام — تصدير واسترجاع نسخ العملاء والبيانات الحساسة بأمان' : 'Super Admin only — Backup, export and recovery hub'}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '16px' }}>
              {/* Backup Box */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={18} />
                  <span>{isAr ? 'تنزيل نسخة احتياطية' : 'Download Backup'}</span>
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                  {isAr 
                    ? 'تصدير كامل بيانات العملاء والصفقات والطلبات كملف JSON آمن ومحمي للاحتفاظ به أو استرجاعه لاحقاً.' 
                    : 'Export full database snapshot as a structured JSON file.'}
                </p>
                <button 
                  type="button" 
                  className="btn btn-sm btn-accent" 
                  onClick={handleExportLeadsJson}
                  style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}
                >
                  <Database size={15} />
                  <span>{isAr ? `تحميل ملف النسخة الاحتياطية (${leads.length} عميل)` : 'Download JSON Backup'}</span>
                </button>
              </div>

              {/* Restore Box */}
              <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={18} />
                  <span>{isAr ? 'استعادة قاعدة البيانات' : 'Restore Database'}</span>
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                  {isAr 
                    ? '⚠️ تحذير أمني: استيراد ملف JSON سيقوم بدمج أو تحديث بيانات العملاء الحالية. يُرجى التحقق من الملف قبل رفعه.' 
                    : 'Warning: Importing JSON file will merge or overwrite current customer records.'}
                </p>
                <label 
                  className="btn btn-sm" 
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    cursor: 'pointer', 
                    background: 'rgba(239, 68, 68, 0.15)', 
                    color: '#ef4444', 
                    border: '1px solid rgba(239, 68, 68, 0.4)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    fontWeight: 'bold'
                  }}
                >
                  <Upload size={15} />
                  <span>{isAr ? 'رفع واستعادة ملف JSON' : 'Upload & Restore JSON'}</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImportLeadsJson} 
                    style={{ display: 'none' }} 
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
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
              <button type="button" className="drawer-close-btn" onClick={() => setEditingLead(null)} aria-label="Close">
                <X size={18} />
              </button>
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
                  <label>{isAr ? 'رقم الواتساب * (إلزامي)' : 'WhatsApp * (Required)'}</label>
                  <input
                    type="text"
                    value={leadFormData.whatsapp}
                    onChange={(e) => setLeadFormData({ ...leadFormData, whatsapp: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'نوع الطلب' : 'Lead Type'}</label>
                  <select
                    value={leadFormData.type}
                    onChange={(e) => setLeadFormData({ ...leadFormData, type: e.target.value })}
                  >
                    <option value="buyer">{isAr ? 'طلب شراء' : 'Buyer'}</option>
                    <option value="seller">{isAr ? 'عرض بيع' : 'Seller'}</option>
                    <option value="broker">{isAr ? 'وسيط عقاري' : 'Broker'}</option>
                    <option value="investor">{isAr ? 'مستثمر' : 'Investor'}</option>
                    <option value="request">{isAr ? 'طلب مخصص' : 'Special Request'}</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'الموقع / المنطقة بسوهاج * (إلزامي)' : 'Target Area in Sohag * (Required)'}</label>
                  <select
                    value={leadFormData.area}
                    onChange={(e) => setLeadFormData({ ...leadFormData, area: e.target.value })}
                    required
                  >
                    {SOHAG_AREAS.filter(a => a.id !== 'all').map(a => (
                      <option key={a.id} value={a.id}>{isAr ? a.name_ar : a.name_en}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'العقارات المهتم بها / نوع العقار * (إلزامي)' : 'Interested Property Type * (Required)'}</label>
                  <select
                    value={leadFormData.propertyType}
                    onChange={(e) => setLeadFormData({ ...leadFormData, propertyType: e.target.value })}
                    required
                  >
                    {PROPERTY_TYPES.filter(t => t.id !== 'all').map(t => (
                      <option key={t.id} value={t.id}>{isAr ? t.name_ar : t.name_en}</option>
                    ))}
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
                  <label>{isAr ? 'حالة المتابعة' : 'Status'}</label>
                  <select
                    value={leadFormData.status}
                    onChange={(e) => setLeadFormData({ ...leadFormData, status: e.target.value })}
                  >
                    <option value="new">{isAr ? 'جديد' : 'New'}</option>
                    <option value="contacted">{isAr ? 'تم التواصل' : 'Contacted'}</option>
                    <option value="site_visit">{isAr ? 'معاينة مجدولة' : 'Site visit'}</option>
                    <option value="negotiating">{isAr ? 'قيد التفاوض' : 'Negotiating'}</option>
                    <option value="closing">{isAr ? 'توقيع وحجز' : 'Closing'}</option>
                    <option value="closed">{isAr ? 'صفقة ناجحة' : 'Closed won'}</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <input
                    type="email"
                    value={leadFormData.email}
                    onChange={(e) => setLeadFormData({ ...leadFormData, email: e.target.value })}
                    placeholder="client@example.com"
                    style={{ direction: 'ltr', textAlign: 'left' }}
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'مصدر العميل' : 'Lead Source'}</label>
                  <input
                    type="text"
                    value={leadFormData.source}
                    onChange={(e) => setLeadFormData({ ...leadFormData, source: e.target.value })}
                    placeholder="Facebook, Direct, WhatsApp..."
                  />
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'درجة الاهتمام' : 'Temperature'}</label>
                  <select
                    value={leadFormData.temperature}
                    onChange={(e) => setLeadFormData({ ...leadFormData, temperature: e.target.value })}
                  >
                    <option value="hot">🔥 {isAr ? 'ساخن' : 'Hot'}</option>
                    <option value="warm">⚡ {isAr ? 'متوسط' : 'Warm'}</option>
                    <option value="cold">❄️ {isAr ? 'بارد' : 'Cold'}</option>
                  </select>
                </div>

                <div className="form-group-item">
                  <label>{isAr ? 'موعد المتابعة القادم' : 'Next Follow-Up Date & Time'}</label>
                  <input
                    type="datetime-local"
                    value={leadFormData.nextFollowUpAt}
                    onChange={(e) => setLeadFormData({ ...leadFormData, nextFollowUpAt: e.target.value })}
                    style={{ direction: 'ltr' }}
                  />
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
              <button type="button" className="drawer-close-btn" onClick={() => setViewingLogsLead(null)} aria-label="Close">
                <X size={18} />
              </button>
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
          userRole={activeRole}
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
