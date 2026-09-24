// =============================================================
//  1LINE SOLUTIONS CRM - ENTERPRISE RBAC PERMISSIONS MATRIX
// =============================================================

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

/**
 * Validates whether a given user/role can view a specific lead
 */
export const canViewLead = (role, lead, userIdentifier) => {
  if (!role) return false;
  if (role === CRM_ROLES.SUPER_ADMIN || role === CRM_ROLES.SALES_MANAGER) return true;
  if (role === CRM_ROLES.PROPERTY_MANAGER || role === CRM_ROLES.VIEWER) return true;
  if (role === CRM_ROLES.FINANCE) return true; // Can view financial context
  if (role === CRM_ROLES.SALES_AGENT) {
    if (!lead) return false;
    const assigned = (lead.assignedTo || '').toLowerCase();
    const user = (userIdentifier || '').toLowerCase();
    return assigned === user || assigned === 'unassigned' || !lead.assignedTo;
  }
  return false;
};

/**
 * Validates whether a given user/role can modify a specific lead
 */
export const canEditLead = (role, lead, userIdentifier) => {
  if (!role) return false;
  if (role === CRM_ROLES.SUPER_ADMIN || role === CRM_ROLES.SALES_MANAGER) return true;
  if (role === CRM_ROLES.SALES_AGENT) {
    if (!lead) return false;
    const assigned = (lead.assignedTo || '').toLowerCase();
    const user = (userIdentifier || '').toLowerCase();
    return assigned === user || assigned === 'unassigned';
  }
  return false;
};

/**
 * Roles that work the sales pipeline (status, assignment, notes). Viewer / finance /
 * property_manager read leads only.
 */
export const LEAD_EDITOR_ROLES = [CRM_ROLES.SUPER_ADMIN, CRM_ROLES.SALES_MANAGER, CRM_ROLES.SALES_AGENT, 'agent_east', 'agent_new_sohag'];
export const canEditLeadsRole = (role) => LEAD_EDITOR_ROLES.includes(role);

/**
 * Validates whether a given user/role can delete a lead
 */
export const canDeleteLead = (role) => {
  return role === CRM_ROLES.SUPER_ADMIN;
};

/**
 * Validates whether a given user/role can export CSV reports
 */
export const canExportCsv = (role) => {
  return role === CRM_ROLES.SUPER_ADMIN || role === CRM_ROLES.SALES_MANAGER || role === CRM_ROLES.FINANCE;
};

/**
 * Validates whether a given user/role can edit properties
 */
export const canEditProperties = (role) => {
  return role === CRM_ROLES.SUPER_ADMIN || role === CRM_ROLES.PROPERTY_MANAGER || role === CRM_ROLES.SALES_MANAGER;
};

/**
 * Validates whether a given user/role can manage financial transactions
 */
export const canManagePayments = (role) => {
  return role === CRM_ROLES.SUPER_ADMIN || role === CRM_ROLES.FINANCE;
};

/**
 * Validates whether a given user/role can view unmasked phone numbers
 */
export const canViewLeadPhone = (role) => {
  return [CRM_ROLES.SUPER_ADMIN, CRM_ROLES.SALES_MANAGER, CRM_ROLES.SALES_AGENT, 'agent_east', 'agent_new_sohag'].includes(role);
};

/**
 * Masks the middle digits of a phone number for unprivileged roles (e.g. viewer)
 */
export const maskPhoneNumber = (phone, role) => {
  if (!phone) return '—';
  if (canViewLeadPhone(role)) return phone;
  const str = String(phone).trim();
  if (str.length <= 4) return '***';
  return str.slice(0, 3) + '****' + str.slice(-2);
};
