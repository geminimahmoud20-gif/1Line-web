// Unit tests for CRM dynamic access model, claims builder, and routing engine.
// Run: node --test tests/unit/access-model.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ACCESS,
  PERMISSIONS,
  PERM_IDS,
  cleanRole,
  cleanTeam,
  normalizeAccess,
  claimsForMember,
  accessFromClaims,
  permsOfRole,
  deskOptions,
  inDeskQueue,
  SUPER_ADMIN,
  UNASSIGNED_DESK
} from '../../src/utils/accessModel.js';
import { routeLeadAutomatically } from '../../src/utils/leadRoutingEngine.js';
import { getLiveLeadDesks, assignableDesks } from '../../src/utils/rbacRules.js';

test('DEFAULT_ACCESS provides sane defaults with roles and teams', () => {
  assert.ok(Array.isArray(DEFAULT_ACCESS.roles), 'roles should be an array');
  assert.ok(Array.isArray(DEFAULT_ACCESS.teams), 'teams should be an array');
  assert.ok(DEFAULT_ACCESS.roles.some((r) => r.id === SUPER_ADMIN), 'super_admin role must exist in defaults');
  assert.ok(DEFAULT_ACCESS.teams.some((t) => t.id === 'Sales Team A'), 'Sales Team A must exist in defaults');
});

test('cleanRole sanitizes role inputs and validates permissions', () => {
  const dirty = {
    id: 'custom_advisor',
    name_ar: '  مستشار مبيعات خاص  ',
    name_en: '  Special Advisor  ',
    perms: ['ld.all', 'invalid_perm', 'fin'],
    icon: '🚀'
  };
  const cleaned = cleanRole(dirty);
  assert.ok(cleaned, 'cleanRole should return object for valid ID');
  assert.equal(cleaned.id, 'custom_advisor');
  assert.equal(cleaned.name_ar, 'مستشار مبيعات خاص');
  assert.equal(cleaned.name_en, 'Special Advisor');
  assert.deepEqual(cleaned.perms, ['ld.all', 'fin']);
  assert.equal(cleaned.icon, '🚀');

  // Invalid ID characters or spaces return null
  assert.equal(cleanRole({ id: 'bad id with spaces!' }), null);
});

test('cleanTeam normalizes keywords and routes', () => {
  const team = {
    id: 'Red_Sea_Desk',
    name_ar: ' فريق البحر الأحمر ',
    name_en: ' Red Sea Team ',
    keywords: ['Hurghada', '  EL GOUNA  ', ''],
    routeVip: true,
    routeCommercial: false,
    active: true
  };
  const cleaned = cleanTeam(team);
  assert.ok(cleaned, 'cleanTeam should return object for valid ID');
  assert.equal(cleaned.id, 'Red_Sea_Desk');
  assert.equal(cleaned.name_ar, 'فريق البحر الأحمر');
  assert.deepEqual(cleaned.keywords, ['hurghada', 'el gouna']);
  assert.equal(cleaned.routeVip, true);
  assert.equal(cleaned.routeCommercial, false);
  assert.equal(cleaned.active, true);

  // Unassigned desk cannot be used as a custom team ID
  assert.equal(cleanTeam({ id: UNASSIGNED_DESK, name_ar: 'test' }), null);
});

test('normalizeAccess safely repairs corrupted or partial data', () => {
  const emptyRes = normalizeAccess(null);
  assert.equal(emptyRes.version, 1);
  assert.ok(emptyRes.roles.length > 0);
  assert.ok(emptyRes.teams.length > 0);

  const partial = {
    version: 1,
    roles: [
      { id: 'custom_agent', name_ar: 'وكيل مخصص', name_en: 'Custom Agent', perms: ['ld.edit'] }
    ],
    teams: []
  };
  const normalized = normalizeAccess(partial);
  // Must preserve super_admin even if missing from partial
  assert.ok(normalized.roles.some((r) => r.id === SUPER_ADMIN), 'super_admin must always be injected if missing');
  assert.ok(normalized.roles.some((r) => r.id === 'custom_agent'), 'custom role preserved');
  assert.ok(Array.isArray(normalized.teams));
});

test('permsOfRole returns all permissions for super_admin and defined ones for others', () => {
  const superPerms = permsOfRole(DEFAULT_ACCESS, SUPER_ADMIN);
  assert.deepEqual(superPerms, PERM_IDS, 'super_admin must have all permissions');

  const salesAgentPerms = permsOfRole(DEFAULT_ACCESS, 'sales_agent');
  assert.ok(salesAgentPerms.includes('ld.edit'));
  assert.ok(!salesAgentPerms.includes('fin'));
});

test('claimsForMember creates correct Auth token claims', () => {
  const adminClaims = claimsForMember({ otherClaim: 123 }, SUPER_ADMIN, '', DEFAULT_ACCESS);
  assert.equal(adminClaims.role, SUPER_ADMIN);
  assert.equal(adminClaims.staff, true);
  assert.equal(adminClaims.admin, true);
  assert.equal(adminClaims.otherClaim, 123);

  const agentClaims = claimsForMember({}, 'sales_agent', 'Sales Team A', DEFAULT_ACCESS);
  assert.equal(agentClaims.role, 'sales_agent');
  assert.equal(agentClaims.desk, 'Sales Team A');
  assert.equal(agentClaims.staff, true);
  assert.equal(agentClaims.admin, false);
  assert.ok(agentClaims.perms.includes('ld.edit'));
  assert.ok(!agentClaims.perms.includes('ld.manage'));

  const parsed = accessFromClaims(agentClaims);
  assert.equal(parsed.role, 'sales_agent');
  assert.equal(parsed.desk, 'Sales Team A');
  assert.equal(parsed.isStaff, true);
  assert.equal(parsed.isAdmin, false);
});

test('inDeskQueue checks assignment matching team or Unassigned pool', () => {
  assert.equal(inDeskQueue('Sales Team A', { assignedTo: 'Sales Team A' }), true);
  assert.equal(inDeskQueue('Sales Team A', { assignedTo: UNASSIGNED_DESK }), true);
  assert.equal(inDeskQueue('Sales Team A', { assignedTo: 'Sales Team B' }), false);
  assert.equal(inDeskQueue('', { assignedTo: 'Sales Team A' }), false);
});

test('dynamic routing prioritizes VIP, Commercial, and custom team keywords', () => {
  const customConfig = {
    version: 1,
    roles: DEFAULT_ACCESS.roles,
    teams: [
      { id: 'VIP Luxury Team', name_ar: 'فريق النخبة', name_en: 'Elite VIP', keywords: [], routeVip: true, active: true },
      { id: 'Alexandria Desk', name_ar: 'فريق الإسكندرية', name_en: 'Alex Desk', keywords: ['alex', 'سموحة', 'ميامي'], active: true },
      { id: 'Default Desk', name_ar: 'فريق عام', name_en: 'General Desk', keywords: [], active: true }
    ]
  };

  // 1. VIP route
  const vipLead = routeLeadAutomatically({ budget: 10_000_000, name: 'VIP Investor' }, [], customConfig);
  assert.equal(vipLead.assignedTo, 'VIP Luxury Team');

  // 2. Keyword match
  const alexLead = routeLeadAutomatically({ area: 'سموحة', name: 'Alex Buyer' }, [], customConfig);
  assert.equal(alexLead.assignedTo, 'Alexandria Desk');

  // 3. Fallback when inactive
  const configWithInactive = {
    ...customConfig,
    teams: customConfig.teams.map((t) => (t.id === 'Alexandria Desk' ? { ...t, active: false } : t))
  };
  const alexLeadInactive = routeLeadAutomatically({ area: 'سموحة', name: 'Alex Buyer' }, [], configWithInactive);
  assert.equal(alexLeadInactive.assignedTo, 'Default Desk');
});

test('deskOptions returns active teams and unassigned option', () => {
  const options = deskOptions(DEFAULT_ACCESS);
  assert.ok(options.some((o) => o.value === UNASSIGNED_DESK));
  assert.ok(options.some((o) => o.value === 'Sales Team A'));
});

test('dynamic desks work seamlessly with getLiveLeadDesks and assignableDesks', () => {
  const customConfig = {
    version: 1,
    roles: DEFAULT_ACCESS.roles,
    teams: [
      { id: 'Desk Alpha', name_ar: 'مكتب ألفا', name_en: 'Desk Alpha', active: true },
      { id: 'Desk Beta', name_ar: 'مكتب بيتا', name_en: 'Desk Beta', active: true }
    ]
  };

  const live = getLiveLeadDesks(customConfig);
  assert.equal(live.length, 3); // 2 teams + Unassigned
  assert.equal(live[0].value, 'Desk Alpha');
  assert.equal(live[2].value, 'Unassigned');

  const desksForSuper = assignableDesks('super_admin', null, customConfig);
  assert.equal(desksForSuper.length, 3);

  const desksForAgent = assignableDesks('sales_agent', 'Desk Alpha', customConfig);
  assert.deepEqual(desksForAgent.map((d) => d.value), ['Desk Alpha', 'Unassigned']);
});
