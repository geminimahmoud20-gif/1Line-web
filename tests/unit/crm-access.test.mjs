// Unit tests for CRM desk access and lead routing. Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assignableDesks, canEditLead, canViewLead, DESK_BY_ROLE, LEAD_DESKS } from '../../src/utils/rbacRules.js';
import { routeLeadAutomatically } from '../../src/utils/leadRoutingEngine.js';

const read = (p) => fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('desk agents see and edit only their desk and the pool', () => {
  const own = { assignedTo: 'Sales Team A' };
  const pool = { assignedTo: 'Unassigned' };
  const other = { assignedTo: 'Sales Team B' };
  assert.equal(canEditLead('agent_east', own), true);
  assert.equal(canEditLead('agent_east', pool), true);
  assert.equal(canEditLead('agent_east', other), false);
  assert.equal(canViewLead('agent_east', other), false);
  assert.equal(canEditLead('sales_agent', { assignedTo: 'Sales Advisor Team' }), true);
  assert.equal(canEditLead('viewer', own), false);
  assert.equal(canViewLead('viewer', own), true);
  assert.equal(canEditLead('sales_manager', other), true);
});

test('assignable desks follow the role', () => {
  assert.deepEqual(assignableDesks('agent_new_sohag').map((d) => d.value), ['Sales Team B', 'Unassigned']);
  assert.equal(assignableDesks('super_admin').length, LEAD_DESKS.length);
  assert.deepEqual(assignableDesks('viewer'), []);
});

test('every desk role maps to a known desk, and firestore.rules uses the same map', () => {
  const rules = read('firestore.rules');
  for (const [role, desk] of Object.entries(DESK_BY_ROLE)) {
    assert.ok(LEAD_DESKS.some((d) => d.value === desk), `${desk} missing from LEAD_DESKS`);
    assert.ok(rules.includes(`'${role}': '${desk}'`), `firestore.rules leadDesk() lacks ${role} → ${desk}`);
  }
});

test('lead routing always lands on a known desk', () => {
  const cases = [
    { budget: 6_000_000 },
    { propertyType: 'commercial' },
    { area: 'new_sohag' },
    { area: 'east' },
    { area: 'somewhere' }
  ];
  for (const lead of cases) {
    const routed = routeLeadAutomatically(lead, []);
    assert.ok(LEAD_DESKS.some((d) => d.value === routed.assignedTo), `unknown desk ${routed.assignedTo}`);
  }
});

test('admin access comes only from token claims — no user IDs written into rules or code', () => {
  const files = ['firestore.rules', 'storage.rules', 'api/cms-upload.js', 'src/services/auth.js', 'src/services/leads.js', 'src/services/requestContacts.js'];
  for (const f of files) {
    assert.doesNotMatch(read(f), /auth\.uid\s*==\s*'|ADMIN_USER_IDS|'[A-Za-z0-9]{28}'/, `${f} grants access by user ID`);
  }
});
