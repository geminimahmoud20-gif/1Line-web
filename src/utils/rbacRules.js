// =============================================================
//  1LINE SOLUTIONS CRM - ENTERPRISE RBAC PERMISSIONS MATRIX
// =============================================================

import { DEFAULT_ACCESS } from './accessModel.js';

export const CRM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  SALES_MANAGER: 'sales_manager',
  SALES_AGENT: 'sales_agent',
  PROPERTY_MANAGER: 'property_manager',
  FINANCE: 'finance',
  VIEWER: 'viewer'
};

export const ROLE_DEFINITIONS = {
  [CRM_ROLES.SUPER_ADMIN]: {
    label_ar: 'مدير عام المنظومة (Super Admin)',
    label_en: 'Super Admin',
    permissions: {
      leads: 'full',        // 'full' | 'assigned' | 'read' | 'limited' | 'none'
      properties: 'full',   // 'full' | 'read_edit' | 'read' | 'none'
      deals: 'full',        // 'full' | 'own_only' | 'read' | 'none'
      payments: 'full',     // 'full' | 'read' | 'none'
      settings: 'full'      // 'full' | 'limited' | 'none'
    }
  },
  [CRM_ROLES.SALES_MANAGER]: {
    label_ar: 'مدير المبيعات (Sales Manager)',
    label_en: 'Sales Manager',
    permissions: {
      leads: 'full',
      properties: 'read_edit',
      deals: 'full',
      payments: 'read',
      settings: 'limited'
    }
  },
  [CRM_ROLES.SALES_AGENT]: {
    label_ar: 'مستشار مبيعات (Sales Agent)',
    label_en: 'Sales Agent',
    permissions: {
      leads: 'assigned',
      properties: 'read',
      deals: 'own_only',
      payments: 'none',
      settings: 'none'
    }
  },
  [CRM_ROLES.PROPERTY_MANAGER]: {
    label_ar: 'مدير العقارات والمخزون (Property Manager)',
    label_en: 'Property Manager',
    permissions: {
      leads: 'read',
      properties: 'full',
      deals: 'read',
      payments: 'none',
      settings: 'none'
    }
  },
  [CRM_ROLES.FINANCE]: {
    label_ar: 'الإدارة المالية والحسابات (Finance)',
    label_en: 'Finance',
    permissions: {
      leads: 'limited',
      properties: 'read',
      deals: 'read',
      payments: 'full',
      settings: 'none'
    }
  },
  [CRM_ROLES.VIEWER]: {
    label_ar: 'مراقب / مدقق (Viewer)',
    label_en: 'Viewer',
    permissions: {
      leads: 'read',
      properties: 'read',
      deals: 'read',
      payments: 'none',
      settings: 'none'
    }
  }
};

// ── Lead desks ───────────────────────────────────────────────────────────────
// Leads are assigned to a desk by name. Desk agents work only their desk's queue plus the
// 'Unassigned' pool — enforced server-side by leadDesk()/inMyLeadQueue() in firestore.rules.
export const UNASSIGNED_DESK = 'Unassigned';

export const LEAD_DESKS = [
  { value: 'Dr. Mahmoud Elbaz', label_ar: 'د. محمود الباز', label_en: 'Dr. Mahmoud Elbaz' },
  { value: 'Sales Management', label_ar: 'إدارة المبيعات', label_en: 'Sales Management' },
  { value: 'Sales Team A', label_ar: 'فريق المبيعات (أ) — شرق سوهاج والكوثر', label_en: 'Sales Team A (East Sohag)' },
  { value: 'Sales Team B', label_ar: 'فريق المبيعات (ب) — سوهاج الجديدة', label_en: 'Sales Team B (New Sohag)' },
  { value: 'Sales Advisor Team', label_ar: 'مستشار المبيعات', label_en: 'Sales Advisor Team' },
  { value: UNASSIGNED_DESK, label_ar: 'غير مسند', label_en: 'Unassigned' }
];

export const DESK_BY_ROLE = {
  [CRM_ROLES.SALES_AGENT]: 'Sales Advisor Team',
  agent_east: 'Sales Team A',
  agent_new_sohag: 'Sales Team B'
};

const FULL_LEAD_ROLES = [CRM_ROLES.SUPER_ADMIN, CRM_ROLES.SALES_MANAGER];

/** Returns live desks combined from config */
export const getLiveLeadDesks = (config = null) => {
  const cfg = config || (typeof window !== 'undefined' && window.__ACTIVE_ACCESS_CONFIG__) || DEFAULT_ACCESS;
  if (!cfg?.teams || cfg.teams.length === 0) return LEAD_DESKS;
  return [
    ...cfg.teams.map((t) => ({ value: t.id, label_ar: t.name_ar, label_en: t.name_en })),
    { value: UNASSIGNED_DESK, label_ar: 'غير مسند', label_en: 'Unassigned' }
  ];
};

const inDeskQueue = (role, lead, desk = null) => {
  const targetDesk = desk || DESK_BY_ROLE[role];
  return Boolean(targetDesk && lead) && [targetDesk, UNASSIGNED_DESK].includes(lead.assignedTo);
};

/** Desks this role may assign a lead to (empty: cannot assign). */
export const assignableDesks = (role, desk = null, config = null) => {
  const liveDesks = getLiveLeadDesks(config);
  if (FULL_LEAD_ROLES.includes(role)) return liveDesks;
  const targetDesk = desk || DESK_BY_ROLE[role];
  return targetDesk ? liveDesks.filter((d) => d.value === targetDesk || d.value === UNASSIGNED_DESK) : [];
};

/**
 * Validates whether a given user/role can view a specific lead
 */
export const canViewLead = (role, lead, desk = null, perms = null) => {
  if (!role) return false;
  if (FULL_LEAD_ROLES.includes(role) || perms?.includes('ld.all') || perms?.includes('ld.manage')) return true;
  if ([CRM_ROLES.PROPERTY_MANAGER, CRM_ROLES.VIEWER, CRM_ROLES.FINANCE].includes(role)) return true;
  return inDeskQueue(role, lead, desk);
};

/**
 * Validates whether a given user/role can modify a specific lead
 */
export const canEditLead = (role, lead, desk = null, perms = null) => {
  if (!role) return false;
  if (FULL_LEAD_ROLES.includes(role) || perms?.includes('ld.manage')) return true;
  return inDeskQueue(role, lead, desk);
};

/**
 * Roles that work the sales pipeline (status, assignment, notes).
 */
export const LEAD_EDITOR_ROLES = [CRM_ROLES.SUPER_ADMIN, CRM_ROLES.SALES_MANAGER, CRM_ROLES.SALES_AGENT, 'agent_east', 'agent_new_sohag'];
export const canEditLeadsRole = (role, perms = null) => {
  if (perms?.includes('ld.edit') || perms?.includes('ld.manage')) return true;
  return LEAD_EDITOR_ROLES.includes(role);
};

/**
 * Validates whether a given user/role can delete a lead
 */
export const canDeleteLead = (role) => {
  return role === CRM_ROLES.SUPER_ADMIN;
};

/**
 * Validates whether a given user/role can export CSV reports
 */
export const canExportCsv = (role, perms = null) => {
  if (perms?.includes('export')) return true;
  return role === CRM_ROLES.SUPER_ADMIN || role === CRM_ROLES.SALES_MANAGER || role === CRM_ROLES.FINANCE;
};

/**
 * Validates whether a given user/role can edit properties
 */
export const canEditProperties = (role, perms = null) => {
  if (perms?.includes('inv.edit')) return true;
  return role === CRM_ROLES.SUPER_ADMIN || role === CRM_ROLES.PROPERTY_MANAGER || role === CRM_ROLES.SALES_MANAGER;
};

/**
 * Validates whether a given user/role can manage financial transactions
 */
export const canManagePayments = (role, perms = null) => {
  if (perms?.includes('fin')) return true;
  return role === CRM_ROLES.SUPER_ADMIN || role === CRM_ROLES.FINANCE;
};

/**
 * Validates whether a given user/role can view unmasked phone numbers
 */
export const canViewLeadPhone = (role, perms = null) => {
  if (perms?.includes('ld.phone')) return true;
  return [CRM_ROLES.SUPER_ADMIN, CRM_ROLES.SALES_MANAGER, CRM_ROLES.SALES_AGENT, 'agent_east', 'agent_new_sohag'].includes(role);
};

/**
 * Masks the middle digits of a phone number for unprivileged roles (e.g. viewer)
 */
export const maskPhoneNumber = (phone, role, perms = null) => {
  if (!phone) return '—';
  if (canViewLeadPhone(role, perms)) return phone;
  const str = String(phone).trim();
  if (str.length <= 4) return '***';
  return str.slice(0, 3) + '****' + str.slice(-2);
};
