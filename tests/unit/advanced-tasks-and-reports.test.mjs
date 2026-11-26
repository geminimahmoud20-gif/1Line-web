import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePlaybookTasksForStage,
  checkSlaEscalations,
  STAGE_TASK_PLAYBOOKS
} from '../../src/utils/tasks.js';
import {
  calculateDaysOnMarket,
  calculateBuyerDemandDensity,
  calculateExclusivityAlerts,
  generateCmaReport
} from '../../src/utils/propertyDeepReports.js';
import {
  calculateAdvancedCashflowForecast,
  generateExecutiveDigest
} from '../../src/utils/executiveDigest.js';

test('generatePlaybookTasksForStage creates automated task sets for pipeline stages', () => {
  const lead = { id: 'lead-100', name: 'مهندس أحمد كمال', assignedToUid: 'user-agent-1', assignedTo: 'كريم' };
  const actor = { uid: 'user-admin', name: 'المدير العام' };

  // 1. Site Visit Stage
  const visitTasks = generatePlaybookTasksForStage(lead, 'site_visit', actor);
  assert.equal(visitTasks.length, 4);
  assert.ok(visitTasks[0].title.includes('تأكيد موعد المعاينة'));
  assert.equal(visitTasks[0].kind, 'whatsapp');
  assert.equal(visitTasks[0].priority, 'high');
  assert.equal(visitTasks[0].assigneeUid, 'user-agent-1');

  // 2. Negotiating Stage
  const negTasks = generatePlaybookTasksForStage(lead, 'negotiating', actor);
  assert.equal(negTasks.length, 2);
  assert.ok(negTasks[0].title.includes('إعداد مذكرة عرض الشراء'));

  // 3. Unknown stage returns empty
  assert.equal(generatePlaybookTasksForStage(lead, 'unknown_stage', actor).length, 0);
});

test('checkSlaEscalations detects critical breaches and locked assignees', () => {
  const now = Date.parse('2026-11-26T12:00:00.000Z');
  const leads = [
    { id: 'lead-big', name: 'صلاح عبدالمجيد', budget: 12000000 },
    { id: 'lead-small', name: 'محمد علي', budget: 1500000 }
  ];

  const tasks = [
    // 1. Big deal task overdue by 15 hours -> Critical
    {
      id: 'task-1',
      title: 'متابعة العقد',
      dueAt: '2026-11-25T21:00', // 15h ago
      priority: 'normal',
      status: 'open',
      leadId: 'lead-big',
      assigneeUid: 'agent-1',
      assigneeName: 'أحمد'
    },
    // 2. High priority task overdue by 26 hours -> Critical
    {
      id: 'task-2',
      title: 'اتصال عاجل',
      dueAt: '2026-11-25T10:00', // 26h ago
      priority: 'high',
      status: 'open',
      leadId: 'lead-small',
      assigneeUid: 'agent-1',
      assigneeName: 'أحمد'
    },
    // 3. Done task -> ignored
    {
      id: 'task-3',
      title: 'مهمة منجزة',
      dueAt: '2026-11-20T10:00',
      status: 'done',
      assigneeUid: 'agent-1'
    }
  ];

  const res = checkSlaEscalations(tasks, leads, now);
  assert.equal(res.criticalCount, 2);
  assert.equal(res.isSlaBreached, true);
  assert.ok(res.lockedAssignees.has('agent-1')); // 2 critical * 2 = score 4 >= 3 -> locked
});

test('calculateDaysOnMarket brackets active listings and detects stale inventory', () => {
  const now = Date.parse('2026-11-26T12:00:00.000Z');
  const properties = [
    // Fresh: 10 days
    { id: 'p1', publishedAt: '2026-11-16T12:00:00.000Z', status: 'published', price: 1500000, size: 100, areaKey: 'new_sohag' },
    // Mature: 40 days
    { id: 'p2', publishedAt: '2026-10-17T12:00:00.000Z', status: 'published', price: 2000000, size: 120, areaKey: 'new_sohag' },
    // Stale: 100 days
    { id: 'p3', publishedAt: '2026-08-18T12:00:00.000Z', status: 'published', price: 3000000, size: 150, areaKey: 'sohag_east' }
  ];

  const dom = calculateDaysOnMarket(properties, now);
  assert.equal(dom.totalActive, 3);
  assert.equal(dom.brackets.freshCount, 1);
  assert.equal(dom.brackets.matureCount, 1);
  assert.equal(dom.brackets.staleCount, 1);
  assert.equal(dom.staleItems[0].id, 'p3');
});

test('generateCmaReport produces accurate comparative pricing and WhatsApp justification', () => {
  const subject = {
    id: 'unit-cma',
    title_ar: 'شقة 120م² بسوهاج الجديدة',
    price: 1800000, // 15,000 / sqm
    size: 120,
    type: 'apartment',
    areaKey: 'new_sohag'
  };

  const peers = [
    { id: 'peer-1', price: 1300000, size: 100, type: 'apartment', areaKey: 'new_sohag' }, // 13,000 / sqm
    { id: 'peer-2', price: 1560000, size: 120, type: 'apartment', areaKey: 'new_sohag' }, // 13,000 / sqm
    { id: 'peer-3', price: 1400000, size: 100, type: 'apartment', areaKey: 'new_sohag' }  // 14,000 / sqm
  ];

  const cma = generateCmaReport(subject, [subject, ...peers], true);
  assert.equal(cma.askingSqm, 15000);
  assert.equal(cma.peerCount, 3);
  assert.equal(cma.medianPeerSqm, 13000);
  assert.equal(cma.isOverpriced, true);
  assert.ok(cma.diffPct > 0);
  assert.ok(cma.whatsappCmaText.includes('تقرير التحليل المقارن للسوق'));
});

test('calculateAdvancedCashflowForecast and generateExecutiveDigest compute horizons', () => {
  const now = Date.parse('2026-11-26T12:00:00.000Z');
  const leads = [
    {
      id: 'l-closing',
      name: 'عميل تعاقد',
      status: 'closing',
      dealValue: 4000000, // 2.5% = 100,000 commission
      lastActivityAt: '2026-11-25T10:00:00.000Z'
    },
    {
      id: 'l-neg',
      name: 'عميل تفاوض',
      status: 'negotiating',
      dealValue: 2000000, // 2.5% = 50,000 commission
      lastActivityAt: '2026-11-24T10:00:00.000Z'
    }
  ];

  const forecast = calculateAdvancedCashflowForecast(leads, now);
  assert.ok(forecast.horizon30d > 0);
  assert.ok(forecast.horizon60d >= forecast.horizon30d);
  assert.equal(forecast.dealsUnderNegotiation.length, 1);

  const digest = generateExecutiveDigest({ leads, properties: [], tasks: [], now });
  assert.ok(digest.whatsappDigestText.includes('ملخص الصباح التنفيذي'));
});
