// =============================================================
//  «الهيكل والسعة»: who is on the team, how they are arranged, what each role is responsible for, and how
//  full each person is. The structure comes from what the CRM already knows: each member's role and desk
//  (access config / team list); a role's duties come from its permissions, so the page says what the system
//  actually lets that role do. Capacity is how many open clients one person can follow properly (saved beside
//  the monthly goals: crm_goals/current people[uid].capacity, team.capacity for everyone else).
//  Pure: tests/unit/org-report.test.mjs
// =============================================================
import { isSellerLead, leadCreatedMs, toMs } from './crmLeadViews.js';

export const DEFAULT_CAPACITY = 40;
const OPEN = new Set(['new', 'contacted', 'site_visit', 'negotiating', 'closing']);
const IDLE_MS = 48 * 3600000;
const isOpen = (l) => l && !l.isArchived && OPEN.has(l.status || 'new');

/** What a permission makes someone responsible for, in the order a reader thinks of the job */
export const DUTIES = [
  { perm: 'ld.manage', ar: 'يوزّع العملاء الجداد على الفريق ويتابع إن محدش متأخر' },
  { perm: 'task.assign', ar: 'يكلّف زملاءه بمهام ويتابع إنجازها' },
  { perm: 'ld.edit', ar: 'يرد على العملاء ويأهّلهم ويحجز المعاينات ويتابعهم لحد الصفقة' },
  { perm: 'ld.only_sellers', ar: 'شغله مع الملاك والوسطاء بس (عروض البيع)' },
  { perm: 'ld.only_buyers', ar: 'شغله مع المشترين بس (طلبات الشراء)' },
  { perm: 'ld.import', ar: 'يدخّل عملاء من ملفات (معارض، قوائم)' },
  { perm: 'inv.edit', ar: 'يضيف العقارات والمشروعات وطلبات المشترين ويحدّثها' },
  { perm: 'inv.listings', ar: 'يضيف العقارات ويحدّثها' },
  { perm: 'inv.projects', ar: 'يضيف المشروعات ويحدّثها' },
  { perm: 'inv.demands', ar: 'يضيف طلبات المشترين ويحدّثها' },
  { perm: 'inv.publish', ar: 'يراجع وينشر اللي الفريق ضافه على الموقع' },
  { perm: 'deal.close', ar: 'يقفل الصفقات (قيد الإغلاق / اتقفلت)' },
  { perm: 'deal.edit', ar: 'يتابع الصفقات من العرض لحد القفل' },
  { perm: 'fin', ar: 'الفواتير والتحصيل والإيصالات' },
  { perm: 'fin.view', ar: 'يراجع المالية من غير تعديل' },
  { perm: 'export', ar: 'يطلع التقارير ويصدّرها' },
];
const IMPLIES = { 'inv.edit': ['inv.listings', 'inv.projects', 'inv.demands'], 'deal.edit': ['deal.add', 'deal.close'], fin: ['fin.view'], 'ld.manage': ['task.assign'] };

/** The duties of a role from its permissions; a permission already covered by a broader one is not repeated */
export function dutiesOf(perms = []) {
  const set = new Set(Array.isArray(perms) ? perms : []);
  if (set.has('*')) return ['مسؤول عن الشركة كلها: الفريق والعملاء والعقارات والصفقات والمالية'];
  const covered = new Set([...set].flatMap((p) => IMPLIES[p] || []));
  return DUTIES.filter((d) => set.has(d.perm) && !(covered.has(d.perm) && d.perm !== 'deal.close')).map((d) => d.ar);
}

/** Where a role sits: 'top' (the whole company), 'manager' (runs salespeople), 'sales' (works clients), 'support' */
export function tierOf(perms = []) {
  const set = new Set(Array.isArray(perms) ? perms : []);
  if (set.has('*')) return 'top';
  if (set.has('ld.manage')) return 'manager';
  if (set.has('ld.edit')) return 'sales';
  return 'support';
}

/** Load ÷ capacity in words: over (past 100%), high (80%+), ok, low (under 30%: room for more clients) */
export const loadLevel = (pct) => (pct > 100 ? 'over' : pct >= 80 ? 'high' : pct < 30 ? 'low' : 'ok');

/**
 * members: [{ uid, name, role, desk }], access: { roles: [{ id, name_ar, perms }], teams: [{ id, name_ar }] },
 * capacity: { team?: { capacity }, people?: { uid: { capacity } } } (the saved goals).
 * → { teams: [{ id, label, managers, people, open, capacity, pct }], top, support, people (flat, fullest first),
 *     unassigned: { open, sellers, buyers }, totals: { people, open, capacity, pct } }
 */
export function orgReport(leads = [], members = [], access = {}, capacity = {}, { now = Date.now() } = {}) {
  const roles = Object.fromEntries((access.roles || []).map((r) => [r.id, r]));
  const teamName = Object.fromEntries((access.teams || []).map((t) => [t.id, t.name_ar || t.id]));
  const defaultCap = Number(capacity?.team?.capacity) || DEFAULT_CAPACITY;

  const load = {};
  const unassigned = { open: 0, sellers: 0, buyers: 0 };
  for (const l of leads) {
    if (!isOpen(l)) continue;
    const uid = l.ownerUid || '';
    if (!uid) {
      unassigned.open += 1;
      if (isSellerLead(l)) unassigned.sellers += 1; else unassigned.buyers += 1;
      continue;
    }
    const p = load[uid] || (load[uid] = { open: 0, sellers: 0, buyers: 0, idle: 0, newToday: 0 });
    p.open += 1;
    if (isSellerLead(l)) p.sellers += 1; else p.buyers += 1;
    const touched = toMs(l.lastActivityAt) || toMs(l.updatedAt) || leadCreatedMs(l) || 0;
    if (now - touched > IDLE_MS) p.idle += 1;
  }

  const people = members.filter((m) => m && m.uid).map((m) => {
    const role = roles[m.role] || { id: m.role, name_ar: m.role, perms: [] };
    const tier = tierOf(role.perms);
    const cap = Number(capacity?.people?.[m.uid]?.capacity) || defaultCap;
    const l = load[m.uid] || { open: 0, sellers: 0, buyers: 0, idle: 0 };
    const works = tier === 'sales' || tier === 'manager';
    const pct = works && cap ? Math.round((l.open / cap) * 100) : 0;
    return {
      uid: m.uid, name: m.name || '', role: role.id || '', roleLabel: role.name_ar || role.id || '', tier,
      desk: m.desk || '', deskLabel: teamName[m.desk] || m.desk || '',
      duties: dutiesOf(role.perms), capacity: cap, customCapacity: Boolean(capacity?.people?.[m.uid]?.capacity),
      ...l, pct, level: works ? loadLevel(pct) : null,
    };
  });

  const salesSide = people.filter((p) => p.tier === 'sales' || p.tier === 'manager');
  const desks = [...new Set(salesSide.map((p) => p.desk))];
  const teams = desks.map((id) => {
    const inTeam = salesSide.filter((p) => p.desk === id);
    // Load and capacity over the same people: the salespeople, or the managers when a team has no salesperson
    const counted = inTeam.some((p) => p.tier === 'sales') ? inTeam.filter((p) => p.tier === 'sales') : inTeam;
    const open = counted.reduce((n, p) => n + p.open, 0);
    const cap = counted.reduce((n, p) => n + p.capacity, 0);
    return {
      id: id || '—', label: teamName[id] || id || 'من غير فريق',
      managers: inTeam.filter((p) => p.tier === 'manager'), people: inTeam.filter((p) => p.tier === 'sales'),
      open, capacity: cap, pct: cap ? Math.round((open / cap) * 100) : 0,
    };
  }).sort((a, b) => b.pct - a.pct);

  // The team's load: what the salespeople hold plus the clients nobody holds yet, against the salespeople's capacity
  const sellersOnly = salesSide.filter((p) => p.tier === 'sales');
  const totalCap = sellersOnly.reduce((n, p) => n + p.capacity, 0);
  const totalOpen = sellersOnly.reduce((n, p) => n + p.open, 0) + unassigned.open;
  return {
    top: people.filter((p) => p.tier === 'top'),
    teams,
    support: people.filter((p) => p.tier === 'support'),
    people: [...salesSide].sort((a, b) => b.pct - a.pct || b.open - a.open),
    unassigned,
    totals: { people: people.length, sellers: salesSide.filter((p) => p.tier === 'sales').length, open: totalOpen, capacity: totalCap, pct: totalCap ? Math.round((totalOpen / totalCap) * 100) : 0 },
  };
}
