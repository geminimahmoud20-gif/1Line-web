// Unit tests for multi-unit building & mixed-use pricing logic
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isMultiUnitOrBuilding,
  parseUnitBreakdown,
  getPriceBenchmark
} from '../../src/utils/currencyAndBenchmark.js';

test('isMultiUnitOrBuilding identifies multi-unit buildings and houses from type or text', () => {
  // Case from user: "خلف مسجد الخلافة 4 شقق 3 محلات"
  assert.equal(isMultiUnitOrBuilding({ title_ar: 'خلف مسجد الخلافة 4 شقق 3 محلات', size: 125, price: 18000000 }), true);
  
  // Explicit type
  assert.equal(isMultiUnitOrBuilding({ type: 'building', size: 200, price: 12000000 }), true);
  assert.equal(isMultiUnitOrBuilding({ type: 'house', size: 150, price: 8000000 }), true);
  assert.equal(isMultiUnitOrBuilding({ isMultiUnit: true }), true);
  
  // Mixed commercial and residential keywords
  assert.equal(isMultiUnitOrBuilding({ title_ar: 'منزل استثماري بشارع سيتي مكون من 5 أدوار' }), true);
  assert.equal(isMultiUnitOrBuilding({ title_ar: 'عمارة سكنية تجارية ممتازة' }), true);

  // Standard apartments or vacant land should NOT be detected as multi-unit building
  assert.equal(isMultiUnitOrBuilding({ type: 'apartment', title_ar: 'شقة فاخرة بشرق سوهاج' }), false);
  assert.equal(isMultiUnitOrBuilding({ type: 'land', title_ar: 'قطعة أرض مباني' }), false);
});

test('parseUnitBreakdown extracts apartment, shop, and floor counts accurately', () => {
  const breakdown = parseUnitBreakdown({
    title_ar: 'خلف مسجد الخلافة 4 شقق 3 محلات',
    description_ar: 'مبنى 5 أدوار تشطيب كامل'
  }, true);

  assert.equal(breakdown.residentialUnits, 4);
  assert.equal(breakdown.commercialUnits, 3);
  assert.equal(breakdown.floors, 5);
  assert.ok(breakdown.summary.includes('4 شقق'));
  assert.ok(breakdown.summary.includes('3 محلات'));
});

test('getPriceBenchmark suppresses flat price/sqm for multi-unit buildings to prevent misleading badges', () => {
  // An 18M building on 125m² land footprint
  const prop = {
    id: 'prop-test-multi',
    title_ar: 'خلف مسجد الخلافة 4 شقق 3 محلات',
    size: 125,
    price: 18000000,
    areaKey: 'center'
  };

  const bench = getPriceBenchmark(prop, 'ar');
  assert.ok(bench !== null);
  assert.equal(bench.isMultiUnit, true);
  // Must NOT divide 18M by 125 to show 144,000 EGP/sqm
  assert.equal(bench.pricePerMeter, null);
  assert.equal(bench.pricePerMeterFormatted, null);
  assert.equal(bench.badgeType, 'building');
  assert.ok(bench.badgeLabel.includes('عقار كامل'));
  assert.ok(bench.valuationNote.length > 10);
});

test('getPriceBenchmark continues to calculate standard price per sqm for regular apartments', () => {
  const prop = {
    id: 'prop-test-apt',
    title_ar: 'شقة سكنية عادية',
    type: 'apartment',
    size: 100,
    price: 1500000,
    areaKey: 'center'
  };

  const bench = getPriceBenchmark(prop, 'ar');
  assert.ok(bench !== null);
  assert.equal(bench.isMultiUnit, undefined);
  assert.equal(bench.pricePerMeter, 15000);
  assert.equal(bench.pricePerMeterFormatted, '15,000 ج.م/م²');
});
