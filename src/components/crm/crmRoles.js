// CRM roles as shown in the dashboard (labels, icons) and each role's desk name.
// Desk names must match DESK_BY_ROLE in src/utils/rbacRules.js and leadDesk() in firestore.rules.
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

export const getMergedCrmRoles = (config = null) => {
  if (!config?.roles) return CRM_ROLES;
  const merged = [...CRM_ROLES];
  config.roles.forEach((r) => {
    const existing = merged.find((x) => x.id === r.id);
    if (!existing) {
      merged.push({
        id: r.id,
        label_ar: r.name_ar,
        label_en: r.name_en,
        agentName: r.name_ar,
        icon: r.icon || '👤',
        canDelete: r.perms?.includes('ld.manage') || r.perms?.includes('inv.delete') || false,
        canViewAgencyFinancials: r.perms?.includes('fin') || false
      });
    } else {
      existing.label_ar = r.name_ar || existing.label_ar;
      existing.label_en = r.name_en || existing.label_en;
      if (r.icon) existing.icon = r.icon;
    }
  });
  return merged;
};
