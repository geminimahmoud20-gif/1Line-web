// =============================================================
//  CRM access model — roles, teams (desks) and permissions.
//  Shared by the browser (src/) and the team API (api/_team-core.js), so both read the same rules.
//
//  Stored in Firestore settings/access as { json: '<AccessConfig>' } and edited only through
//  api/team.js (service account). Members carry their access in Firebase Auth custom claims:
//    { role: '<role id>', staff: true, perms: ['ld.edit', ...], desk: '<team id>' | '', admin }
//  firestore.rules reads perms/desk straight from the token (no extra document reads).
//
//  Accounts set before this model (claims with only { role }) keep working through LEGACY_PERMS /
//  LEGACY_DESK below — firestore.rules carries the same two maps.
// =============================================================

export const UNASSIGNED_DESK = 'Unassigned';
export const SUPER_ADMIN = 'super_admin';

/** Every permission a role can hold. `id` is what goes into the token and firestore.rules. */
export const PERMISSIONS = [
  { id: 'ld.all', group: 'leads', ar: 'يشوف كل العملاء (مش فريقه بس)', en: 'See every lead (not only their team)' },
  { id: 'ld.edit', group: 'leads', ar: 'يعدّل عملاء فريقه والعملاء غير المسندين', en: 'Edit their team’s leads and the unassigned pool' },
  { id: 'ld.manage', group: 'leads', ar: 'يدير كل العملاء وينقلهم بين الفرق', en: 'Manage every lead and move leads between teams' },
  { id: 'ld.phone', group: 'leads', ar: 'يشوف أرقام وإيميلات العملاء', en: 'See client phones and emails' },
  { id: 'ld.import', group: 'leads', ar: 'استيراد عملاء من ملف', en: 'Import leads from a file' },
  { id: 'inv.edit', group: 'inventory', ar: 'إضافة وتعديل العقارات والمشروعات والطلبات', en: 'Add and edit listings, projects and demands' },
  { id: 'inv.delete', group: 'inventory', ar: 'حذف العقارات والمشروعات', en: 'Delete listings and projects' },
  { id: 'deal.all', group: 'deals', ar: 'يشوف كل الصفقات', en: 'See every deal' },
  { id: 'deal.edit', group: 'deals', ar: 'يضيف ويعدّل الصفقات (كلها لو معاه «كل الصفقات»، وإلا صفقات فريقه)', en: 'Add and edit deals (all with “every deal”, otherwise their team’s)' },
  { id: 'fin', group: 'finance', ar: 'المالية والمدفوعات', en: 'Finance and payments' },
  { id: 'export', group: 'finance', ar: 'تصدير التقارير', en: 'Export reports' }
];
export const PERM_IDS = PERMISSIONS.map((p) => p.id);

export const PERM_GROUPS = [
  { id: 'leads', ar: 'العملاء', en: 'Leads' },
  { id: 'inventory', ar: 'العقارات', en: 'Inventory' },
  { id: 'deals', ar: 'الصفقات', en: 'Deals' },
  { id: 'finance', ar: 'المالية والتقارير', en: 'Finance & reports' }
];

// Roles as they were hard-coded before. Keep in sync with legacyPerms()/legacyDesk() in firestore.rules.
export const LEGACY_PERMS = {
  sales_manager: ['ld.all', 'ld.manage', 'ld.edit', 'ld.phone', 'ld.import', 'inv.edit', 'deal.all', 'deal.edit', 'export'],
  sales_agent: ['ld.edit', 'ld.phone', 'deal.edit'],
  agent_east: ['ld.edit', 'ld.phone', 'deal.edit'],
  agent_new_sohag: ['ld.edit', 'ld.phone', 'deal.edit'],
  property_manager: ['ld.all', 'inv.edit', 'inv.delete'],
  finance: ['ld.all', 'deal.all', 'deal.edit', 'fin', 'export'],
  viewer: ['ld.all', 'deal.all']
};
export const LEGACY_DESK = {
  sales_agent: 'Sales Advisor Team',
  agent_east: 'Sales Team A',
  agent_new_sohag: 'Sales Team B'
};
/** The old per-team roles become "sales advisor" + that team */
export const LEGACY_ROLE_ALIAS = { admin: SUPER_ADMIN, agent_east: 'sales_agent', agent_new_sohag: 'sales_agent' };

/** The starting configuration — what the CRM did before roles and teams became editable. */
export const DEFAULT_ACCESS = Object.freeze({
  version: 1,
  roles: [
    { id: SUPER_ADMIN, name_ar: 'المدير العام', name_en: 'Super admin', icon: '👑', perms: PERM_IDS, locked: true },
    { id: 'sales_manager', name_ar: 'مدير المبيعات', name_en: 'Sales manager', icon: '💼', perms: LEGACY_PERMS.sales_manager },
    { id: 'sales_agent', name_ar: 'مستشار مبيعات', name_en: 'Sales advisor', icon: '🎯', perms: LEGACY_PERMS.sales_agent },
    { id: 'property_manager', name_ar: 'مدير العقارات', name_en: 'Property manager', icon: '🏢', perms: LEGACY_PERMS.property_manager },
    { id: 'finance', name_ar: 'المالية', name_en: 'Finance', icon: '💰', perms: LEGACY_PERMS.finance },
    { id: 'viewer', name_ar: 'مراقب', name_en: 'Viewer', icon: '👁️', perms: LEGACY_PERMS.viewer }
  ],
  // Team ids are the desk names already stored on leads (assignedTo), so no lead has to move.
  teams: [
    { id: 'Dr. Mahmoud Elbaz', name_ar: 'د. محمود الباز', name_en: 'Dr. Mahmoud Elbaz', keywords: [], routeVip: true, roundRobin: false, active: true },
    { id: 'Sales Management', name_ar: 'إدارة المبيعات', name_en: 'Sales Management', keywords: [], routeCommercial: true, roundRobin: false, active: true },
    { id: 'Sales Team B', name_ar: 'فريق سوهاج الجديدة', name_en: 'New Sohag team', keywords: ['new_sohag', 'new-sohag', 'جديدة', 'سوهاج الجديدة'], roundRobin: true, active: true },
    { id: 'Sales Team A', name_ar: 'فريق شرق والكوثر', name_en: 'East & Kawthar team', keywords: ['east', 'kawthar', 'شرق', 'الكوثر', 'الجمهورية', 'الثقافة'], roundRobin: true, active: true },
    { id: 'Sales Advisor Team', name_ar: 'مستشار المبيعات', name_en: 'Sales advisors', keywords: [], roundRobin: true, active: true }
  ]
});

// ── Validation ────────────────────────────────────────────────────────────────

const ID_RE = /^[A-Za-z0-9_][A-Za-z0-9 ._-]{0,47}$/;
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** A safe id from a display name (latin letters/digits), unique within `taken` */
export function makeId(name, taken = [], prefix = 'x') {
  let base = String(name || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32);
  if (!base) base = `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
  let id = base;
  for (let i = 2; taken.includes(id); i++) id = `${base}_${i}`;
  return id;
}

/** A role as stored. Returns null when it can't be one. */
export function cleanRole(r) {
  if (!r || typeof r !== 'object' || !ID_RE.test(String(r.id || ''))) return null;
  const name_ar = clean(r.name_ar, 60);
  if (!name_ar) return null;
  const locked = r.id === SUPER_ADMIN;
  return {
    id: String(r.id),
    name_ar,
    name_en: clean(r.name_en, 60) || name_ar,
    icon: clean(r.icon, 4) || '👤',
    perms: locked ? PERM_IDS : [...new Set((Array.isArray(r.perms) ? r.perms : []).filter((p) => PERM_IDS.includes(p)))],
    ...(locked ? { locked: true } : {})
  };
}

/** A team as stored. Returns null when it can't be one. */
export function cleanTeam(t) {
  if (!t || typeof t !== 'object' || !ID_RE.test(String(t.id || '')) || t.id === UNASSIGNED_DESK) return null;
  const name_ar = clean(t.name_ar, 60);
  if (!name_ar) return null;
  const keywords = [...new Set((Array.isArray(t.keywords) ? t.keywords : []).map((k) => clean(k, 40).toLowerCase()).filter(Boolean))].slice(0, 30);
  return {
    id: String(t.id),
    name_ar,
    name_en: clean(t.name_en, 60) || name_ar,
    keywords,
    routeVip: t.routeVip === true,
    routeCommercial: t.routeCommercial === true,
    roundRobin: t.roundRobin !== false,
    active: t.active !== false
  };
}

/** Any stored value → a usable config. The super admin role is always there and always full. */
export function normalizeAccess(raw) {
  let src = raw;
  if (typeof src === 'string') { try { src = JSON.parse(src); } catch { src = null; } }
  if (!src || typeof src !== 'object' || !Array.isArray(src.roles) || !Array.isArray(src.teams)) src = DEFAULT_ACCESS;
  const roles = [];
  for (const r of src.roles) { const c = cleanRole(r); if (c && !roles.some((x) => x.id === c.id)) roles.push(c); }
  if (!roles.some((r) => r.id === SUPER_ADMIN)) roles.unshift(cleanRole(DEFAULT_ACCESS.roles[0]));
  const teams = [];
  for (const t of src.teams) { const c = cleanTeam(t); if (c && !teams.some((x) => x.id === c.id)) teams.push(c); }
  return { version: 1, roles, teams };
}

// ── Reading access ───────────────────────────────────────────────────────────

export const roleById = (config, id) => config?.roles?.find((r) => r.id === id) || null;
export const teamById = (config, id) => config?.teams?.find((t) => t.id === id) || null;

/** Permissions a role grants under `config` (legacy ids fall back to their old set) */
export function permsOfRole(config, id) {
  if (id === SUPER_ADMIN || id === 'admin') return PERM_IDS;
  const role = roleById(config, id);
  if (role) return role.perms;
  return LEGACY_PERMS[id] || [];
}

/**
 * What a token's claims allow: { role, perms: string[], desk, isAdmin, isStaff }.
 * role is null for accounts without CRM access.
 */
export function accessFromClaims(claims = {}) {
  if (claims.admin === true || claims.role === 'admin' || claims.role === SUPER_ADMIN) {
    return { role: SUPER_ADMIN, perms: PERM_IDS, desk: typeof claims.desk === 'string' ? claims.desk : '', isAdmin: true, isStaff: true };
  }
  if (claims.staff === true && typeof claims.role === 'string' && Array.isArray(claims.perms)) {
    return { role: claims.role, perms: claims.perms.filter((p) => PERM_IDS.includes(p)), desk: typeof claims.desk === 'string' ? claims.desk : '', isAdmin: false, isStaff: true };
  }
  if (LEGACY_PERMS[claims.role]) {
    return { role: LEGACY_ROLE_ALIAS[claims.role] || claims.role, perms: LEGACY_PERMS[claims.role], desk: LEGACY_DESK[claims.role] || '', isAdmin: false, isStaff: true };
  }
  return { role: null, perms: [], desk: '', isAdmin: false, isStaff: false };
}

/** Custom claims for a member: other claims kept, CRM access replaced. role null → access removed. */
export function claimsForMember(existing = {}, role, desk, config) {
  // eslint-disable-next-line no-unused-vars
  const { role: _r, admin: _a, staff: _s, perms: _p, desk: _d, ...rest } = existing || {};
  if (!role) return rest;
  if (role === SUPER_ADMIN) return { ...rest, role, admin: true, staff: true, perms: [], desk: desk || '' };
  return { ...rest, role, admin: false, staff: true, perms: permsOfRole(config, role), desk: desk || '' };
}

/** Desk queue rule shared with firestore.rules inMyLeadQueue(): own team + the unassigned pool */
export const inDeskQueue = (desk, lead) => Boolean(desk && lead) && [desk, UNASSIGNED_DESK].includes(lead.assignedTo || UNASSIGNED_DESK);

/** Teams as <select> options (+ the unassigned pool last) */
export function deskOptions(config, { includeInactive = false } = {}) {
  const teams = (config?.teams || []).filter((t) => includeInactive || t.active);
  return [
    ...teams.map((t) => ({ value: t.id, label_ar: t.name_ar, label_en: t.name_en })),
    { value: UNASSIGNED_DESK, label_ar: 'غير مسند', label_en: 'Unassigned' }
  ];
}
