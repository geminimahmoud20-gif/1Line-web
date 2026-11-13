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
  // Inventory, one switch per kind of item. «كل المخزون» (inv.edit) covers the three at once and is
  // what the roles saved before this split carry. Whoever lacks «ينشر» saves for approval: the item
  // stays off the site until someone with it approves (src/utils/publishApproval.js).
  { id: 'inv.listings', group: 'inventory', ar: 'العقارات: يضيف ويعدّل', en: 'Listings: add and edit' },
  { id: 'inv.projects', group: 'inventory', ar: 'المشروعات: يضيف ويعدّل', en: 'Projects: add and edit' },
  { id: 'inv.demands', group: 'inventory', ar: 'طلبات المشترين: يضيف ويعدّل', en: 'Buyer requests: add and edit' },
  { id: 'inv.edit', group: 'inventory', ar: 'كل ما سبق مرة واحدة', en: 'All of the above at once' },
  { id: 'inv.publish', group: 'inventory', ar: 'ينشر من غير موافقة ويوافق على اللي الفريق قدّمه', en: 'Publish without approval, approve the team’s items' },
  { id: 'inv.delete', group: 'inventory', ar: 'حذف العقارات والمشروعات', en: 'Delete listings and projects' },
  { id: 'deal.all', group: 'deals', ar: 'يشوف كل الصفقات (مش صفقات فريقه بس)', en: 'See every deal (not only their team’s)' },
  // «كل الصفقات» (deal.edit) covers the two below at once and is what the roles saved before this split
  // carry. Closing is its own right so a role can work deals without marking them won (commissions).
  { id: 'deal.add', group: 'deals', ar: 'الصفقات: يضيف ويعدّل (من غير ما يقفلها)', en: 'Deals: add and edit (not close)' },
  { id: 'deal.close', group: 'deals', ar: 'الصفقات: يحوّلها «قيد الإغلاق» أو «اتقفلت»', en: 'Deals: move to closing or won' },
  { id: 'deal.edit', group: 'deals', ar: 'كل ما سبق مرة واحدة (صفقات فريقه، أو كلها لو معاه «يشوف كل الصفقات»)', en: 'All of the above at once (their team’s deals, or all with “see every deal”)' },
  // Finance: «يشوف بس» is read-only; «يعدّل» (fin) covers it and is what older roles carry
  { id: 'fin.view', group: 'finance', ar: 'المالية: يشوف بس (الفواتير والتحصيل والإيصالات والمبالغ)', en: 'Finance: view only (invoices, collections, receipts, amounts)' },
  { id: 'fin', group: 'finance', ar: 'المالية: يشوف ويعدّل ويصدر إيصالات', en: 'Finance: view, edit and issue receipts' },
  { id: 'export', group: 'finance', ar: 'تصدير التقارير والعملاء', en: 'Export reports and clients' }
];
export const PERM_IDS = PERMISSIONS.map((p) => p.id);

/** The permission that lets someone edit one kind of inventory (inv.edit and inv.publish also do) */
export const INVENTORY_PERM = { listings: 'inv.listings', projects: 'inv.projects', demands: 'inv.demands' };
/** Shown ticked, and locked, while «كل المخزون» is on */
export const PERM_IMPLIED_BY = {
  'inv.listings': 'inv.edit', 'inv.projects': 'inv.edit', 'inv.demands': 'inv.edit',
  'deal.add': 'deal.edit', 'deal.close': 'deal.edit',
  'fin.view': 'fin'
};

/**
 * Whether a permission list may edit one kind of inventory ('listings' | 'projects' | 'demands'),
 * or any kind when `area` is empty. Same test as firestore.rules canEditListings() and friends.
 */
export function canEditInventory(perms = [], area = '') {
  if (!Array.isArray(perms)) return false;
  if (perms.includes('*') || perms.includes('inv.edit') || perms.includes('inv.publish')) return true;
  return area ? perms.includes(INVENTORY_PERM[area]) : Object.values(INVENTORY_PERM).some((p) => perms.includes(p));
}

const has = (perms, ...ids) => Array.isArray(perms) && (perms.includes('*') || ids.some((id) => perms.includes(id)));
/** Same tests as firestore.rules canEditDeals() / canCloseDeals() */
export const canEditDeals = (perms = []) => has(perms, 'deal.edit', 'deal.add', 'deal.close');
export const canCloseDeals = (perms = []) => has(perms, 'deal.edit', 'deal.close');
/** See finance (amounts, invoices, receipts) / change it: rules read `fin` or `fin.view`, write `fin` */
export const canViewFinance = (perms = []) => has(perms, 'fin', 'fin.view');
export const canEditFinance = (perms = []) => has(perms, 'fin');

/** Whether a permission list may publish without approval and approve what others submitted */
export const canPublishInventory = (perms = []) => Array.isArray(perms) && (perms.includes('*') || perms.includes('inv.publish'));

export const PERM_GROUPS = [
  { id: 'leads', ar: 'العملاء', en: 'Leads' },
  { id: 'inventory', ar: 'العقارات', en: 'Inventory', hint_ar: 'اللي مالوش «ينشر» بيضيف ويعدّل، بس اللي يحفظه بيستنى موافقة قبل ما يظهر على الموقع.', hint_en: 'Without “Publish”, what they save waits for approval before it is on the site.' },
  { id: 'deals', ar: 'الصفقات', en: 'Deals', hint_ar: 'اللي معاه «يضيف ويعدّل» بس يشتغل على الصفقة لكن مايقدرش يقفلها. «يقفل» هو اللي بيحوّلها «قيد الإغلاق» أو «اتقفلت» (وبيدخل في العمولات).', hint_en: 'With “add and edit” only, they work deals but cannot close them. “Close” moves a deal to closing or won (it feeds commissions).' },
  { id: 'finance', ar: 'المالية والتقارير', en: 'Finance & reports', hint_ar: '«يشوف بس» للمراقب أو المحاسب اللي بيراجع من غير ما يعدّل. «يشوف ويعدّل» هو اللي بيصدر الإيصالات ويسجّل التحصيل. والتصدير بيعتمد على «تصدير» وبس، مش على اسم الدور.', hint_en: '“View only” is for someone who reviews without changing anything. Exporting depends on “Export” alone, not on the role’s name.' }
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

/**
 * Who /api/cms-upload signs uploads for, from the verified token's claims. Same test as
 * firestore.rules isInventoryEditor(): listing photos need 'inv.edit' (whatever the role is
 * called), the homepage video stays admin-only.
 */
export function canUploadMedia(claims = {}, kind = 'image') {
  const access = accessFromClaims(claims);
  if (access.isAdmin) return true;
  if (kind === 'video') return false;
  return canEditInventory(access.perms, 'listings') || canEditInventory(access.perms, 'projects');
}

/** Custom claims for a member: other claims kept, CRM access replaced. role null → access removed. */
export function claimsForMember(existing = {}, role, desk, config) {
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
