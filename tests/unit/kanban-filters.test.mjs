import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesKanbanFilters, hasActiveKanbanFilters, activeKanbanFilterCount, leadSizeOf, EMPTY_KANBAN_FILTERS } from '../../src/utils/kanbanFilters.js';

const AREAS = [
  { id: 'new_sohag', name_ar: 'سوهاج الجديدة' },
  { id: 'd5', name_ar: 'الحي الخامس', parentId: 'new_sohag' },
  { id: 'east', name_ar: 'شرق' }
];

test('no filters set: everything passes', () => {
  assert.equal(matchesKanbanFilters({ id: 'l1' }, EMPTY_KANBAN_FILTERS, AREAS, 0), true);
  assert.equal(hasActiveKanbanFilters(EMPTY_KANBAN_FILTERS), false);
  assert.equal(activeKanbanFilterCount(EMPTY_KANBAN_FILTERS), 0);
});

test('area filter: a main area covers its own leads and its sub-area\'s', () => {
  const direct = { id: 'l1', area: 'new_sohag' };
  const sub = { id: 'l2', details: { area: 'd5' } };
  const elsewhere = { id: 'l3', area: 'east' };
  const f = { ...EMPTY_KANBAN_FILTERS, areaId: 'new_sohag' };
  assert.equal(matchesKanbanFilters(direct, f, AREAS, 0), true);
  assert.equal(matchesKanbanFilters(sub, f, AREAS, 0), true);
  assert.equal(matchesKanbanFilters(elsewhere, f, AREAS, 0), false);
});

test('size filter: a lead with no recorded size fails rather than passing unfiltered', () => {
  const sized = { id: 'l1', details: { size: 150 } };
  const buyerAsk = { id: 'l2', details: { minSize: '120' } };
  const unknown = { id: 'l3' };
  const f = { ...EMPTY_KANBAN_FILTERS, minSize: '100', maxSize: '200' };
  assert.equal(matchesKanbanFilters(sized, f, AREAS, 0), true);
  assert.equal(matchesKanbanFilters(buyerAsk, f, AREAS, 0), true);
  assert.equal(matchesKanbanFilters(unknown, f, AREAS, 0), false);
  assert.equal(matchesKanbanFilters(sized, { ...EMPTY_KANBAN_FILTERS, maxSize: '100' }, AREAS, 0), false);
});

test('price filter: reads the precomputed card price, not the raw lead', () => {
  const f = { ...EMPTY_KANBAN_FILTERS, minPrice: '1000000', maxPrice: '3000000' };
  assert.equal(matchesKanbanFilters({ id: 'l1' }, f, AREAS, 2_000_000), true);
  assert.equal(matchesKanbanFilters({ id: 'l2' }, f, AREAS, 500_000), false);
  assert.equal(matchesKanbanFilters({ id: 'l3' }, f, AREAS, 0), false);
});

test('every set field must match at once', () => {
  const lead = { id: 'l1', area: 'd5', details: { size: 150 } };
  const f = { areaId: 'new_sohag', minSize: '100', maxSize: '', minPrice: '1000000', maxPrice: '' };
  assert.equal(matchesKanbanFilters(lead, f, AREAS, 1_500_000), true);
  assert.equal(matchesKanbanFilters(lead, f, AREAS, 500_000), false);
});

test('leadSizeOf prefers the owner\'s unit size, then a buyer\'s own ask', () => {
  assert.equal(leadSizeOf({ details: { size: 140 } }), 140);
  assert.equal(leadSizeOf({ details: { minSize: '90' } }), 90);
  assert.equal(leadSizeOf({ details: { matchAnswers: { minSize: '75' } } }), 75);
  assert.equal(leadSizeOf({}), 0);
});

test('activeKanbanFilterCount counts only the fields actually set', () => {
  assert.equal(activeKanbanFilterCount({ areaId: 'new_sohag', minSize: '', maxSize: '', minPrice: '1000000', maxPrice: '' }), 2);
});
