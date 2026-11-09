import test from 'node:test';
import assert from 'node:assert/strict';
import { pipelineKind, stagesFor, askingPriceOf, buyersForSeller, SELLER_STAGES, BUYER_STAGES } from '../../src/utils/leadPipeline.js';
import { validateStageTransition } from '../../src/services/stateMachineEngine.js';
import { findMatchingClientsForProperty } from '../../src/utils/matchingEngine.js';

const owner = { id: 'o1', type: 'seller', status: 'site_visit', area: 'sohag', details: { area: 'sohag', propertyType: 'apartment', size: 150 } };
const buyer = { id: 'b1', type: 'buyer', name: 'Ahmed', phone: '01012345678', status: 'contacted', details: { area: 'sohag', propertyType: 'apartment', budget: 2000000 } };

test('an owner who came to sell or value runs the owner pipeline, everyone else the buyer one', () => {
  assert.equal(pipelineKind(owner), 'seller');
  assert.equal(pipelineKind({ type: 'valuation' }), 'seller');
  assert.equal(pipelineKind({ landingPage: '/sell' }), 'seller');
  assert.equal(pipelineKind(buyer), 'buyer');
  assert.equal(stagesFor(owner), SELLER_STAGES);
  assert.equal(stagesFor(buyer), BUYER_STAGES);
  // Same status ids, so reports and commission keep counting both
  assert.deepEqual(SELLER_STAGES.map((s) => s.id), BUYER_STAGES.map((s) => s.id));
  assert.equal(SELLER_STAGES.find((s) => s.id === 'site_visit').label_ar, 'معاينة وتقييم');
});

test('asking price is read from the owner request or the price the team saved', () => {
  assert.equal(askingPriceOf(owner), 0);
  assert.equal(askingPriceOf({ details: { askingPrice: '2,500,000' } }), 2500000);
  assert.equal(askingPriceOf({ askingPrice: 1800000 }), 1800000);
});

test('an owner is listed once there is a price, without the buyer viewing-report gate', () => {
  const blocked = validateStageTransition(owner, 'negotiating');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.deliverableKey, 'seller_asking_price');
  assert.equal(validateStageTransition({ ...owner, askingPrice: 2000000 }, 'negotiating').allowed, true);
  // a buyer still needs the viewing report before negotiating
  assert.equal(validateStageTransition({ ...buyer, status: 'site_visit' }, 'negotiating').deliverableKey, 'site_visit_report');
  // and everyone still needs a reason to be marked lost
  assert.equal(validateStageTransition(owner, 'lost').allowed, false);
});

test('owners are never offered as buyers, and an owner sees the buyers who fit the unit', () => {
  const unit = { id: 'p1', areaKey: 'sohag', type: 'apartment', price: 2000000 };
  const ids = findMatchingClientsForProperty(unit, [buyer, { ...owner, phone: '01099999999', details: { ...owner.details, budget: 2000000 } }], []).map((m) => m.id);
  assert.deepEqual(ids, ['b1']);
  const found = buyersForSeller({ ...owner, askingPrice: 2100000 }, [owner, buyer], []);
  assert.deepEqual(found.map((m) => m.id), ['b1']);
});
