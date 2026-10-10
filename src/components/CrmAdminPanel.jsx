import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Clock } from 'lucide-react';
import { loginUser, logAuditEvent, migrateInlineLeadContacts } from '../firebaseService';
import { exportToCsv } from '../utils/exportCsv';
import { exportRows } from '../utils/transfer/exportTable';
import { leadToRow } from '../utils/transfer/leadSchema';

import { restoreLeads, mergeLeads } from '../firebaseLazy';
import { canExportCsv, canDeleteLead, canManagePayments, canEditLeadsRole, assignableDesks, scopeLeadsForAccess } from '../utils/rbacRules';
import { permsOfRole } from '../utils/accessModel';

// Enterprise PropTech Modules
import KanbanPipeline from './crm/KanbanPipeline';
import SmartMatchingHub from './crm/SmartMatchingHub';
import AICopywriterModal from './crm/AICopywriterModal';
import AgentCommissionLeaderboard from './crm/AgentCommissionLeaderboard';
import PaymentScheduleBuilder from './crm/PaymentScheduleBuilder';
import RetargetingHub from './crm/RetargetingHub';
import CustomerProfileModal from './crm/CustomerProfileModal';

import LeadsTab from './crm/LeadsTab';
import SystemBackupTab from './crm/SystemBackupTab';
import AutomationTab from './crm/AutomationTab';
import AddLeadModal from './crm/AddLeadModal';
import VisitorIntelligencePanel from './crm/VisitorIntelligencePanel';
import FounderCmsPanel from './crm/FounderCmsPanel';
import ContractStudioModal from './crm/ContractStudioModal';
import LeadQuickDrawer from './crm/LeadQuickDrawer';
import CrmExecutiveDashboard from './crm/CrmExecutiveDashboard';
import { CRM_ROLES, getMergedCrmRoles } from './crm/crmRoles';
import { getActiveAccessConfig } from '../services/accessConfig';
import EditLeadModal from './crm/EditLeadModal';
import useOpenRequest from '../hooks/useOpenRequest';
import { LEAD_EXPORT_HEADERS, makeLeadFormatters } from './crm/leadFormatters';
import CrmLoginGate from './crm/CrmLoginGate';
import useLeadKeyboardTriage from './crm/useLeadKeyboardTriage';
import { filterLeads, sortLeads, duplicatesById, buildMergedLead } from '../utils/crmLeadViews';
import { formatWhatsAppPhone } from '../utils/matchingEngine';

export const CrmAdminPanel = ({
  lang = 'ar',
  t = {},
  firebaseConnected = true,
  leads: allLeads = [],
  setLeads,
  properties = [],
  projects = [],
  openRequest = null,
  crmAuthenticated = true,
  setCrmAuthenticated,
  currentUser = null,
  userRole = 'super_admin',
  handleWhatsAppAction,
  triggerToast,
  onConvertToProperty,
  onUpdateLead: rawUpdateLead,
  onDeleteLead,
  onAddNewLead,
  onImportLeads,
  demands = [],
  onSwitchToDemands,
  onSwitchToProperties,
  onSwitchToProjects,
  adminTab: propAdminTab,
  onSwitchTab,
  activeRole: propActiveRole,
  userPerms = null,
  userDesk = ''
}) => {
  // Local Authentication States
  const [crmPasswordInput, setCrmPasswordInput] = useState('');
  const [crmEmailInput, setCrmEmailInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [crmAuthError, setCrmAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  // Multi-Tenant RBAC Identity State
  const activeRole = propActiveRole || userRole || 'super_admin';
  const isAr = lang === 'ar';
  const myDealsOnly = false; // desk scoping happens below, on the data itself

  // ── What this account may see and do (mirrors firestore.rules) ─────────────
  // perms come from the token (CrmPage passes them, or the simulated role's set); desk is the
  // member's team. Firestore already limits desk agents' queries and hides phones without
  // ld.phone — this keeps the screens, exports and the super admin's role preview consistent.
  const perms = userPerms || permsOfRole(getActiveAccessConfig(), activeRole);
  const isSuperRole = activeRole === 'super_admin';
  const seesAllLeads = isSuperRole || perms.includes('ld.all') || perms.includes('ld.manage');
  const seesPhones = isSuperRole || perms.includes('ld.phone');
  const canEditLeads = isSuperRole || canEditLeadsRole(activeRole, perms);
  const canExport = isSuperRole || canExportCsv(activeRole, perms);
  const canRetarget = isSuperRole || (canEditLeads && seesPhones);
  const myDesk = userDesk || '';
  const leads = useMemo(() => scopeLeadsForAccess(allLeads, { role: activeRole, perms, desk: myDesk }), [allLeads, activeRole, perms, myDesk]);
  // One gate for every lead write from this panel: read-only roles can't write, and a role that
  // only sees masked numbers never writes them back over the real ones.
  const onUpdateLead = useMemo(() => {
    if (!rawUpdateLead) return undefined;
    return (id, fields = {}) => {
      if (!canEditLeads) {
        triggerToast?.(isAr ? 'صلاحياتك لا تسمح بتعديل العملاء' : 'Your role cannot edit leads', 'error');
        return false;
      }
      if (seesPhones) return rawUpdateLead(id, fields);
      const { phone: _p, whatsapp: _w, altPhone: _a, email: _e, ...rest } = fields;
      return rawUpdateLead(id, rest);
    };
  }, [rawUpdateLead, canEditLeads, seesPhones, triggerToast, isAr]);

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
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [leadSort, setLeadSort] = useState('newest');

  // Customer 360 & Add Lead Modal States
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [viewingProfileLead, setViewingProfileLead] = useState(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [quickDrawerLead, setQuickDrawerLead] = useState(null);

  // AI Copywriter & Contract Studio Modal States
  const [showAICopywriter, setShowAICopywriter] = useState(false);
  const [showContractStudio, setShowContractStudio] = useState(false);
  // Top bar / command palette asked for one of this panel's modals
  useOpenRequest(openRequest, ['add_lead', 'contract_studio', 'ai_copywriter'], (type) => {
    if (type === 'add_lead') { if (canEditLeads) setShowAddLeadModal(true); }
    else if (type === 'contract_studio') setShowContractStudio(true);
    else setShowAICopywriter(true);
  });

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


  // Active Role Permissions and Agent Claim Helper
  const allCurrentRoles = getMergedCrmRoles(getActiveAccessConfig());
  const currentRoleObj = allCurrentRoles.find(r => r.id === activeRole) || CRM_ROLES[0];
  const isSuperAdmin = activeRole === 'super_admin';

  // Leads saved before desk scoping may lack assignedTo; desk agents' queue queries can't see
  // them. A manager's session files them into the shared pool once (only cloud-synced leads).
  const canAssignAll = userRole === 'super_admin' || userRole === 'sales_manager';
  useEffect(() => {
    if (!canAssignAll || !onUpdateLead || !firebaseConnected) return;
    // Cloud leads only — never push device-local or sample leads to Firestore
    const orphans = leads.filter((l) => l?._cloud && l.id && !l.assignedTo);
    if (orphans.length === 0) return;
    try {
      if (sessionStorage.getItem('oneline_lead_desk_backfill')) return;
      sessionStorage.setItem('oneline_lead_desk_backfill', '1');
    } catch { /* storage unavailable — still backfill */ }
    orphans.forEach((l) => onUpdateLead(l.id, { assignedTo: 'Unassigned' }));
  }, [canAssignAll, onUpdateLead, firebaseConnected, leads]);

  // Phones still stored on the lead doc (saved before lead_contacts, or by a browser on an old
  // build) are readable by every CRM role; a manager's session moves them into lead_contacts.
  const contactMigrationTried = useRef(new Set());
  useEffect(() => {
    if (!canAssignAll || !firebaseConnected) return;
    const pending = leads.filter((l) => l?._cloud && l._inlineContact && !contactMigrationTried.current.has(l.id));
    if (pending.length === 0) return;
    pending.forEach((l) => contactMigrationTried.current.add(l.id));
    migrateInlineLeadContacts(pending).catch(() => {});
  }, [canAssignAll, firebaseConnected, leads]);

  // Only a sales role with a team can claim, and only from the shared pool (same as the rules:
  // a desk agent may move a lead between the pool and their own desk, never off someone else's)
  const canClaimLead = (lead) => Boolean(lead) && canEditLeads && !!myDesk && !isSuperRole
    && (!lead.assignedTo || lead.assignedTo === 'Unassigned');
  const handleClaimLead = (leadId) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!onUpdateLead || !canClaimLead(lead)) {
      triggerToast?.(isAr ? 'تقدر تستلم العملاء غير المسندين بس، ولازم يكون ليك فريق' : 'You can only claim unassigned leads, and need a team', 'error');
      return;
    }
    onUpdateLead(leadId, { assignedTo: myDesk });
    logAuditEvent({
      actionType: 'LEAD_CLAIMED',
      targetCollection: 'leads',
      targetId: leadId,
      details: { assignedTo: myDesk },
      actor: currentUser
    });
    triggerToast?.(isAr ? 'تم استلام العميل وتعيينه لفريقك' : 'Lead claimed for your team', 'success');
  };

  const { getLocalizedPropertyType, getLocalizedArea, toLeadExportRow } = makeLeadFormatters(isAr, t);

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
    if (!canEditLeads || !assignableDesks(activeRole, myDesk || null).some((d) => d.value === newAgent)) {
      if (triggerToast) triggerToast(isAr ? 'صلاحياتك الحالية لا تسمح بتعيين العملاء' : 'Your role cannot assign leads', 'error');
      return;
    }
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

  const exportLeadRows = (rows, fileName, scope, format = 'csv') => {
    if (!canExport) {
      if (triggerToast) {
        triggerToast(isAr ? 'غير مصرح لك بتصدير بيانات العملاء (تتطلب صلاحية مدير أو مالية)' : 'Unauthorized: requires Manager or Finance role', 'error');
      }
      return;
    }
    if (!rows.length) {
      if (triggerToast) triggerToast(isAr ? 'لا يوجد عملاء لتصديرهم في العرض الحالي' : 'Nothing to export', 'error');
      return;
    }
    if (format === 'legacy-csv') {
      exportToCsv(fileName, rows.map(toLeadExportRow), LEAD_EXPORT_HEADERS);
    } else {
      // Same columns the importer reads, with readable type / area names
      const sheetRows = rows.map((l) => {
        const row = leadToRow(l);
        const typeKey = l.propertyType || l.details?.propertyType;
        const areaKey = l.area || l.details?.area;
        if (typeKey) row['نوع العقار المطلوب'] = getLocalizedPropertyType(typeKey) || typeKey;
        if (areaKey) row['المنطقة'] = getLocalizedArea(areaKey) || areaKey;
        return row;
      });
      exportRows(sheetRows, {
        format,
        baseName: fileName,
        sheetName: 'العملاء',
        jsonPayload: { platform: '1Line Real Estate CRM Leads', timestamp: new Date().toISOString(), leadsCount: rows.length, leads: rows.map(({ _cloud, ...l }) => l) }
      }).catch(() => triggerToast?.(isAr ? 'تعذّر تجهيز الملف' : 'Export failed', 'error'));
    }
    logAuditEvent({
      actionType: format === 'excel' ? 'LEADS_EXPORTED_XLSX' : format === 'json' ? 'LEADS_EXPORTED_JSON' : 'LEADS_EXPORTED_CSV',
      targetCollection: 'leads',
      targetId: scope,
      details: { count: rows.length },
      actor: currentUser
    });
    if (triggerToast) {
      triggerToast(isAr ? `تم تصدير ${rows.length} عميل (${format === 'excel' ? 'Excel' : format === 'json' ? 'JSON' : 'CSV'})` : `Exported ${rows.length} leads`, 'success');
    }
  };

  const handleBulkExportSelected = () => {
    if (selectedLeadIds.length === 0) return;
    exportLeadRows(leads.filter(l => selectedLeadIds.includes(l.id)), 'Selected_Leads_Export', 'bulk_selection');
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

  const handleExportCSV = (rows = leads || [], format = 'csv') => {
    // Always the rows this account can see (scoped, phones masked if needed) — never the
    // app-wide unmasked list
    exportLeadRows(rows, '1Line_Clients', rows === leads ? 'all_leads' : 'filtered_view', format);
  };

  // Full Leads Database JSON Backup
  const handleExportLeadsJson = () => {
    if (!canExport) {
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
          if (window.confirm(isAr ? `استعادة ${importedLeads.length} عميل من ملف النسخة الاحتياطية إلى قاعدة البيانات؟ العملاء الموجودين حالياً مش هيتغيروا، بيتضاف بس اللي ناقص.` : `Restore ${importedLeads.length} leads to the database? Existing leads are left unchanged; only missing ones are added.`)) {
            // Written to Firestore (not this browser): the live list then shows them on every device
            restoreLeads(importedLeads).then((res) => {
              if (!res.ok) {
                triggerToast(isAr ? `فشلت الاستعادة (${res.reason}). اتستعاد ${res.restored} قبل الخطأ.` : `Restore failed (${res.reason}); ${res.restored} restored before the error.`, 'error');
                return;
              }
              triggerToast(isAr
                ? `اتستعاد ${res.restored} عميل • ${res.skipped} موجودين أصلاً${res.invalid ? ` • ${res.invalid} سجل غير صالح` : ''}`
                : `Restored ${res.restored} • ${res.skipped} already present${res.invalid ? ` • ${res.invalid} invalid` : ''}`, res.restored ? 'success' : 'info');
            });
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
      temperature: lead.temperature || '',
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
      temperature: leadFormData.temperature || '',
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
    if (!canDeleteLead(activeRole)) {
      if (triggerToast) triggerToast(isAr ? 'حذف العملاء متاح للمدير العام فقط — يمكنك أرشفة العميل بدلاً من ذلك' : 'Only Super Admin can delete leads', 'error');
      return;
    }
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
    // Counts as contacting the client (first reply time, last contact)
    if (onUpdateLead && lead?.id) onUpdateLead(lead.id, { lastContactedAt: new Date().toISOString() });
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
      window.open(`https://wa.me/${formatWhatsAppPhone(cleanPhone)}?text=${encodeURIComponent(text)}`, '_blank');
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
      ? `🚨 *إحالة عميل جديد - منصة 1Line العقارية*\n👤 *العميل:* ${clientName}\n📞 *الهاتف:* ${phone}\n🏢 *التصنيف:* ${type}\n📍 *المنطقة:* ${area}\n💰 *الميزانية/السعر:* ${budget}\n📝 *الملاحظات:* ${notes}\n📅 *الوقت:* ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}\n⚡ *الإجراء المطلوب:* يرجى سرعة التواصل والمتابعة فوراً.`
      : `🚨 *New 1Line Lead Dispatch*\n👤 *Client:* ${clientName}\n📞 *Phone:* ${phone}\n🏢 *Type:* ${type}\n📍 *Area:* ${area}\n💰 *Budget:* ${budget}\n📝 *Notes:* ${notes}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(dispatchText)}`, '_blank');
  };


  // Filtered Leads list with Multi-Dimensional Search & Workflow Stages (Memoized)
  const duplicateIds = useMemo(() => duplicatesById(leads), [leads]);
  const filteredLeads = useMemo(() => sortLeads(filterLeads(leads, {
    myDealsOnly, activeRole, agentName: currentRoleObj.agentName, leadFilter, temperatureFilter, areaFilter,
    sourceFilter, dateFilter, searchQuery, duplicateIds
  }), leadSort), [leads, myDealsOnly, activeRole, currentRoleObj.agentName, leadFilter, temperatureFilter, areaFilter, sourceFilter, dateFilter, searchQuery, duplicateIds, leadSort]);

  // Fold duplicate leads into the kept one, then delete the others (delete is admin-only in the rules)
  const handleMergeLeads = async (keepId, otherIds) => {
    const keep = leads.find((l) => l.id === keepId);
    const others = leads.filter((l) => otherIds.includes(l.id));
    if (!keep || others.length === 0 || !onUpdateLead) return false;
    const merged = buildMergedLead(keep, others);
    const otherIds2 = others.map((o) => o.id);
    if (firebaseConnected) {
      // One batch: either the kept lead is updated AND the duplicates are gone, or nothing changes
      const ok = await mergeLeads(keepId, merged, otherIds2);
      if (!ok) {
        triggerToast(isAr ? 'تعذّر الدمج، لم يتغير أي سجل. حاول تاني.' : 'Merge failed; nothing was changed. Try again.', 'error');
        return false;
      }
      setLeads((prev) => prev.filter((l) => !otherIds2.includes(l.id)).map((l) => (l.id === keepId ? { ...l, ...merged } : l)));
    } else {
      await onUpdateLead(keepId, merged);
      for (const o of others) {
        if (onDeleteLead) await onDeleteLead(o.id);
        else setLeads((prev) => prev.filter((l) => l.id !== o.id));
      }
    }
    triggerToast(isAr ? `تم دمج ${others.length} سجل مكرر في عميل واحد` : `Merged ${others.length} duplicate(s)`, 'success');
    return true;
  };

  // Login Gate
  // Hooks stay above the early return below (keyboard triage reads the visible rows)
  const [kbdIndex, setKbdIndex] = useLeadKeyboardTriage({ list: filteredLeads, onOpen: setQuickDrawerLead, onWhatsApp: onWhatsAppClick });

  if (!crmAuthenticated) {
    return (
      <CrmLoginGate
        crmAuthError={crmAuthError}
        crmEmailInput={crmEmailInput}
        crmPasswordInput={crmPasswordInput}
        firebaseConnected={firebaseConnected}
        handleLoginSubmit={handleLoginSubmit}
        isAr={isAr}
        loading={loading}
        setCrmEmailInput={setCrmEmailInput}
        setCrmPasswordInput={setCrmPasswordInput}
        setShowPassword={setShowPassword}
        showPassword={showPassword}
      />
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
          projects={projects}
          activeRole={activeRole}
          currentRoleObj={currentRoleObj}
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
          onOpenContractStudio={() => setShowContractStudio(true)}
          deskView={!seesAllLeads}
          scopeDesk={myDesk || null}
          showMoney={isSuperRole || perms.includes('fin') || perms.includes('ld.manage')}
          onOpenCopywriter={() => setShowAICopywriter(true)}
        />
      )}

      {/* 🎯 TAB 2: KANBAN DEALS PIPELINE */}
      {adminTab === 'kanban' && (
        <KanbanPipeline
          leads={leads}
          properties={properties}
          onUpdateLead={onUpdateLead}
          onDeleteLead={canDeleteLead(activeRole) ? onDeleteLead : undefined}
          onOpenEditLead={handleOpenEditLead}
          onOpenLead={(lead) => setQuickDrawerLead(lead)}
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
          onOpenLead={(lead) => setQuickDrawerLead(lead)}
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 👥 TAB 4: LEADS HUB (ENTERPRISE CUSTOMER 360° DATABASE) */}
      {adminTab === 'leads' && (
        <LeadsTab
          activeRole={activeRole}
          areaFilter={areaFilter}
          currentRoleObj={currentRoleObj}
          filteredLeads={filteredLeads}
          getLocalizedArea={getLocalizedArea}
          getLocalizedPropertyType={getLocalizedPropertyType}
          handleBulkAssign={handleBulkAssign}
          handleBulkDelete={handleBulkDelete}
          handleBulkExportSelected={handleBulkExportSelected}
          handleClaimLead={handleClaimLead}
          handleDeleteLeadClick={handleDeleteLeadClick}
          handleExportCSV={handleExportCSV}
          onImportLeads={onImportLeads}
          handleOpenEditLead={handleOpenEditLead}
          handleToggleSelectAll={handleToggleSelectAll}
          handleToggleSelectOne={handleToggleSelectOne}
          isAr={isAr}
          isSuperAdmin={isSuperAdmin}
          kbdIndex={kbdIndex}
          lang={lang}
          leadFilter={leadFilter}
          leads={leads}
          onConvertToProperty={onConvertToProperty}
          onDispatchLeadClick={onDispatchLeadClick}
          onUpdateLead={onUpdateLead}
          onWhatsAppClick={onWhatsAppClick}
          duplicateIds={duplicateIds}
          onMergeLeads={handleMergeLeads}
          canMergeLeads={canDeleteLead(activeRole)}
          canEdit={canEditLeads}
          canExport={canExport}
          canClaimLead={canClaimLead}
          canCloseDeals={isSuperRole || perms.includes('deal.edit')}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          leadSort={leadSort}
          setLeadSort={setLeadSort}
          searchQuery={searchQuery}
          selectedLeadIds={selectedLeadIds}
          setAreaFilter={setAreaFilter}
          setKbdIndex={setKbdIndex}
          setLeadFilter={setLeadFilter}
          setQuickDrawerLead={setQuickDrawerLead}
          setSearchQuery={setSearchQuery}
          setSelectedLeadIds={setSelectedLeadIds}
          setShowAddLeadModal={setShowAddLeadModal}
          setTemperatureFilter={setTemperatureFilter}
          setViewingProfileLead={setViewingProfileLead}
          temperatureFilter={temperatureFilter}
          triggerToast={triggerToast}
        />
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
          canIssueReceipts={isSuperRole || canManagePayments(activeRole, perms)}
          triggerToast={triggerToast}
        />
      )}

      {/* 📢 TAB 7: RETARGETING CAMPAIGNS HUB */}
      {adminTab === 'retargeting' && !canRetarget && (
        <div className="crm-table-container" style={{ padding: '32px', textAlign: 'center', color: 'var(--crm-muted)' }}>
          {isAr ? 'حملات إعادة الاستهداف متاحة لفريق المبيعات والإدارة فقط.' : 'Retargeting campaigns are for the sales team and managers only.'}
        </div>
      )}
      {adminTab === 'retargeting' && canRetarget && (
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
      {/* Company identity, backups and automation: super admin only (writes are admin-only in the rules too) */}
      {['founder_cms', 'system_backup', 'automation'].includes(adminTab) && !isSuperRole && (
        <div className="crm-table-container" style={{ padding: '32px', textAlign: 'center', color: 'var(--crm-muted)' }}>
          {isAr ? 'القسم ده للمدير العام بس.' : 'This section is for the super admin only.'}
        </div>
      )}
      {adminTab === 'founder_cms' && isSuperRole && (
        <FounderCmsPanel
          lang={lang}
          triggerToast={triggerToast}
        />
      )}

      {/* 🛡️ TAB 9.5: SYSTEM BACKUP & RESTORE (ADMIN ONLY) */}
      {adminTab === 'system_backup' && isSuperRole && (
        <SystemBackupTab
          handleExportLeadsJson={handleExportLeadsJson}
          handleImportLeadsJson={handleImportLeadsJson}
          isAr={isAr}
          leads={leads}
        />
      )}

      {/* ⚙️ TAB 10: AUTOMATION & WEBHOOKS */}
      {adminTab === 'automation' && isSuperRole && (
        <AutomationTab
          isAr={isAr}
          leads={leads}
          onUpdateLead={onUpdateLead}
          triggerToast={triggerToast}
        />
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
        <EditLeadModal
          handleSaveLeadEdits={handleSaveLeadEdits}
          isAr={isAr}
          leadFormData={leadFormData}
          setEditingLead={setEditingLead}
          setLeadFormData={setLeadFormData}
          t={t}
        />
      )}

      {/* 🕒 ACTIVITY LOG VIEWER MODAL */}
      {viewingLogsLead && (
        <div className="track-modal-backdrop" onClick={() => setViewingLogsLead(null)}>
          <div className="property-form-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-form-header">
              <h3>
                <Clock size={18} style={{ marginInlineEnd: '6px', color: 'var(--crm-accent-text)' }} />
                {isAr ? `سجل تدقيق العمليات: ${viewingLogsLead.name}` : `Activity Audit Log: ${viewingLogsLead.name}`}
              </h3>
              <button type="button" className="drawer-close-btn" onClick={() => setViewingLogsLead(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
              {(!viewingLogsLead.activityLogs || viewingLogsLead.activityLogs.length === 0) ? (
                <p style={{ textAlign: 'center', color: 'var(--crm-muted)', padding: '20px' }}>
                  {isAr ? 'لا توجد سجلات تدقيق سابقة لهذا العميل' : 'No recorded activity logs'}
                </p>
              ) : (
                viewingLogsLead.activityLogs.map((log, idx) => (
                  <div key={idx} style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--crm-text-base)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--crm-positive)' }}>{log.action}</strong>
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-muted)' }}>
                        {new Date(log.timestamp).toLocaleTimeString(isAr ? 'ar-EG-u-nu-latn' : 'en-US')} - {new Date(log.timestamp).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-US')}
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
            const result = onUpdateLead ? onUpdateLead(leadId, updatedData) : undefined;
            if (result === false) return false; // blocked by role — don't show an edit that didn't happen
            setViewingProfileLead(prev => prev ? { ...prev, ...updatedData } : null);
            return result;
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
              // Local-only fallback: give the lead an id so it can be opened, edited and moved
              setLeads(prev => [{ id: newLeadPayload.id || `lead-${Date.now()}`, ...newLeadPayload }, ...prev]);
            }
          }}
          lang={lang}
          triggerToast={triggerToast}
          userRole={activeRole}
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

      {/* ⚡ DRAWER: HIGH-VELOCITY LEAD QUICK DRAWER */}
      <LeadQuickDrawer
        lead={quickDrawerLead}
        onClose={() => setQuickDrawerLead(null)}
        onUpdateLead={(leadId, updatedData) => {
          if (onUpdateLead) onUpdateLead(leadId, updatedData);
          setQuickDrawerLead(prev => prev && prev.id === leadId ? { ...prev, ...updatedData } : prev);
        }}
        onDeleteLead={onDeleteLead}
        onConvertToProperty={onConvertToProperty}
        onOpenFullProfile={(l) => {
          setViewingProfileLead(l);
          setQuickDrawerLead(null);
        }}
        properties={properties}
        filteredLeads={filteredLeads}
        isAr={isAr}
        triggerToast={triggerToast}
        activeRole={activeRole}
      />
    </div>
  );
};

export default CrmAdminPanel;
