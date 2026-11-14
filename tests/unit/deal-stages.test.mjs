import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL_STAGE_NAMES, BOARD_STAGE_IDS, PROGRESS_STAGE_IDS, boardColumnOf, dealStageName, isInactiveLead } from '../../src/utils/dealStages.js';
import { boardStagesFor } from '../../src/utils/leadPipeline.js';
import { validateStageTransition } from '../../src/services/stateMachineEngine.js';
import { mapLeadStatus, leadToRow } from '../../src/utils/transfer/leadSchema.js';
import { isInboxActive } from '../../src/utils/inboxView.js';
import { isUnassigned, isOverdue, filterLeads } from '../../src/utils/crmLeadViews.js';

test('the board has the seven stages the team asked for, in order', () => {
  assert.deepEqual(BOARD_STAGE_IDS, ['new', 'contacted', 'site_visit', 'negotiating', 'closed', 'inactive', 'lost']);
  assert.deepEqual(PROGRESS_STAGE_IDS, ['new', 'contacted', 'site_visit', 'negotiating', 'closed']);
  assert.deepEqual(BOARD_STAGE_IDS.map((id) => DEAL_STAGE_NAMES[id].ar), ['عميل محتمل', 'مؤهل', 'اجتماع / معاينة', 'تفاوض', 'إغلاق', 'غير متفاعل', 'خسارة']);
});

test('a lead in the old signing step sits in the إغلاق column; others keep their own', () => {
  assert.equal(boardColumnOf('closing'), 'closed');
  assert.equal(boardColumnOf('closed'), 'closed');
  assert.equal(boardColumnOf(undefined), 'new');
  assert.equal(boardColumnOf('inactive'), 'inactive');
  assert.equal(dealStageName('closing'), 'إغلاق (توقيع وحجز)');
  assert.equal(dealStageName('weird', true), 'weird');
});

test('the board stages of a buyer and an owner both end in إغلاق, غير متفاعل, خسارة', () => {
  for (const lead of [{ type: 'buyer' }, { type: 'seller' }]) {
    const stages = boardStagesFor(lead);
    assert.deepEqual(stages.map((s) => s.id), BOARD_STAGE_IDS);
    assert.ok(stages.every((s) => s.label_ar && s.label_en));
  }
});

test('إغلاق is one stage: a deal that skips the old closing step still shows Gate 2 and the written offer', () => {
  const lead = { id: 'a', status: 'negotiating', type: 'buyer' };
  const needsGate2 = validateStageTransition(lead, 'closed', { gate3Passed: true, executedPrice: 1_000_000 });
  assert.equal(needsGate2.allowed, false);
  assert.equal(needsGate2.deliverableKey, 'gate2_and_written_offer');
  const needsGate3 = validateStageTransition(lead, 'closed', { gate2Passed: true, writtenOffer: true });
  assert.equal(needsGate3.allowed, false);
  assert.equal(needsGate3.deliverableKey, 'gate3_and_executed_price');
  const ok = validateStageTransition(lead, 'closed', { gate2Passed: true, writtenOffer: true, gate3Passed: true, executedPrice: 1_000_000 });
  assert.equal(ok.allowed, true);
  // A lead that was already in the old closing step passed Gate 2 then: only Gate 3 is left
  const fromClosing = validateStageTransition({ ...lead, status: 'closing' }, 'closed', { gate3Passed: true, executedPrice: 1_000_000 });
  assert.equal(fromClosing.allowed, true);
});

test('غير متفاعل needs no deliverable and is not a loss', () => {
  assert.equal(validateStageTransition({ id: 'a', status: 'contacted', type: 'buyer' }, 'inactive').allowed, true);
  assert.equal(isInactiveLead({ status: 'inactive' }), true);
  assert.equal(isInactiveLead({ status: 'lost' }), false);
});

test('an inactive lead is left out of the inbox, the unassigned list and the overdue count', () => {
  const lead = { id: 'a', status: 'inactive', assignedTo: 'Unassigned', nextFollowUpAt: '2020-01-01' };
  assert.equal(isInboxActive(lead), false);
  assert.equal(isUnassigned(lead), false);
  assert.equal(isOverdue(lead, '2026-01-01'), false);
  // ...but stays in the full list and has its own filter
  assert.equal(filterLeads([lead], { leadFilter: 'all' }).length, 1);
  assert.equal(filterLeads([lead, { id: 'b', status: 'new' }], { leadFilter: 'inactive' }).length, 1);
});

test('exported stage names import back to the same status', () => {
  for (const id of BOARD_STAGE_IDS.concat('closing')) {
    const label = leadToRow({ status: id, name: 'x' })['المرحلة'];
    assert.equal(mapLeadStatus(label), id, `${id} → ${label}`);
  }
  // sheets made with the earlier names still import
  assert.equal(mapLeadStatus('جديد'), 'new');
  assert.equal(mapLeadStatus('تم التواصل'), 'contacted');
  assert.equal(mapLeadStatus('معاينة'), 'site_visit');
  assert.equal(mapLeadStatus('توقيع وحجز'), 'closing');
  assert.equal(mapLeadStatus('صفقة ناجحة'), 'closed');
  assert.equal(mapLeadStatus('صفقة خسرانة'), 'lost');
  assert.equal(mapLeadStatus('inactive'), 'inactive');
});
