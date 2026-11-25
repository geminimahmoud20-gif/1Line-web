// tests/unit/workflow-handoff-founder.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { handoffToCrmTask, validateStageTransition, HIGH_VALUE_DEAL_THRESHOLD } from '../../src/services/stateMachineEngine.js';
import { tasksOfEndedLeads } from '../../src/utils/tasks.js';

test('handoffToCrmTask converts inter-departmental handoff into actionable CRM task', () => {
  const mockNextTask = {
    handoffNumber: 3,
    name: 'تثمين الوحدة ومعاينتها',
    fromDept: 'ops',
    toDept: 'inventory',
    slaHours: 24,
    relatedEntityId: 'lead-999',
    dueAt: '2026-11-26T12:00:00.000Z'
  };

  const lead = { id: 'lead-999', name: 'أحمد محمود' };
  const user = { uid: 'user-1', displayName: 'د. محمود الباز' };

  const task = handoffToCrmTask(mockNextTask, lead, user);
  assert.ok(task);
  assert.equal(task.leadId, 'lead-999');
  assert.equal(task.leadName, 'أحمد محمود');
  assert.equal(task.assigneeName, 'قسم حصر وتثمين العقارات');
  assert.equal(task.priority, 'high');
  assert.equal(task.status, 'open');
  assert.ok(task.title.includes('تسليم قسم حصر وتثمين العقارات'));
});

test('High-value deal requires Founder sign-off when >= 5M EGP unless approved', () => {
  const sellerLead5M = {
    id: 'lead-5m',
    name: 'مستثمر كبير',
    type: 'seller',
    askingPrice: 7_000_000,
    details: {
      askingPrice: 7_000_000,
      propertyType: 'apartment',
      area: 'sohag_new',
      size: 200
    }
  };

  // 1. Without founder approval
  const unapproved = validateStageTransition(sellerLead5M, 'negotiating', {
    userRole: 'sales_agent',
    isFounderApproved: false
  });
  assert.equal(unapproved.allowed, false);
  assert.equal(unapproved.deliverableKey, 'founder_high_value_approval');

  // 2. With founder approval
  const approved = validateStageTransition(sellerLead5M, 'negotiating', {
    userRole: 'sales_agent',
    isFounderApproved: true
  });
  assert.equal(approved.allowed, true);
  assert.ok(approved.nextTask);
});

test('tasksOfEndedLeads handles both numeric and string leadId types accurately', () => {
  const leads = [
    { id: 101, status: 'lost' },
    { id: '202', status: 'closed' },
    { id: 303, status: 'contacted' }
  ];

  const tasks = [
    { id: 't1', leadId: '101', status: 'open', title: 'Task 1' },
    { id: 't2', leadId: 202, status: 'open', title: 'Task 2' },
    { id: 't3', leadId: '303', status: 'open', title: 'Task 3' }
  ];

  const endedTasks = tasksOfEndedLeads(tasks, leads);
  assert.equal(endedTasks.length, 2);
  const endedIds = new Set(endedTasks.map((t) => t.id));
  assert.ok(endedIds.has('t1'));
  assert.ok(endedIds.has('t2'));
  assert.ok(!endedIds.has('t3'));
});
