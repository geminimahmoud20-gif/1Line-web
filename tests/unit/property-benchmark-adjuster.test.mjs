import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePropertyAttributeAdjustments,
  calculateAdjustedReferencePrice,
  evaluateFloorElevatorFactor,
  evaluateViewAndLocationFactor,
  evaluateBuildingAndAmenitiesFactor
} from '../../src/utils/propertyBenchmarkAdjuster.js';

test('Finishing adjustments reflect market deltas accurately', () => {
  const coreProp = { finishing: 'core', size: 150 };
  const superLuxProp = { finishing: 'super_lux', size: 150 };
  const ultraLuxProp = { finishing: 'ultra_lux', size: 150 };

  const coreAdj = calculatePropertyAttributeAdjustments(coreProp);
  assert.equal(coreAdj.breakdown.find((b) => b.category === 'finishing')?.percent, -0.22);

  const superAdj = calculatePropertyAttributeAdjustments(superLuxProp);
  assert.equal(superAdj.breakdown.find((b) => b.category === 'finishing')?.percent, 0.18);

  const ultraAdj = calculatePropertyAttributeAdjustments(ultraLuxProp);
  assert.equal(ultraAdj.breakdown.find((b) => b.category === 'finishing')?.percent, 0.30);
});

test('Floor and Elevator factor rewards prime serviced floors and penalizes walk-up top floors', () => {
  const topWalkUp = { floor: '5', building: { elevator: 'no' } };
  const topResult = evaluateFloorElevatorFactor(topWalkUp);
  assert.equal(topResult.percent, -0.15);

  const primeWithElevator = { floor: '3', building: { elevator: 'yes' } };
  const primeResult = evaluateFloorElevatorFactor(primeWithElevator);
  assert.equal(primeResult.percent, 0.06);
});

test('View and location factor rewards main street and panoramic exposures', () => {
  const mainPanoramic = {
    title_ar: 'شقة سكنية بإطلالة بانورامية في قلب شارع حلمي الشريف الرئيسي',
    locationName_ar: 'شارع حلمي الشريف'
  };
  const viewResult = evaluateViewAndLocationFactor(mainPanoramic);
  assert.equal(viewResult.percent, 0.12);
  assert.ok(viewResult.reasonAr.includes('شارع رئيسي'));
});

test('Building amenities factor rewards garage, land share, and active meters', () => {
  const amenityProp = {
    building: { garage: 'private', landShare: 'yes' },
    description_ar: 'كاملة المرافق عداد كهرباء قديم ومياه وغاز طبيعي'
  };
  const amenityResult = evaluateBuildingAndAmenitiesFactor(amenityProp);
  assert.ok(amenityResult.percent >= 0.10);
  assert.ok(amenityResult.reasonAr.includes('جراج'));
  assert.ok(amenityResult.reasonAr.includes('حصة'));
});

test('calculateAdjustedReferencePrice adjusts district base to individual unit specifications', () => {
  const baseDistrictPpm = 10000; // EGP / m² base median for district

  // High-spec luxury unit on main street with elevator & garage
  const luxuryUnit = {
    title_ar: 'شقة سكنية بإطلالة بانورامية في قلب شارع حلمي الشريف الرئيسي',
    type: 'apartment',
    size: 120,
    floor: '3',
    finishing: 'super_lux',
    building: { elevator: 'yes', garage: 'private', landShare: 'yes' },
    description_ar: 'كاملة المرافق عدادات رسمية كهرباء ومياه وغاز، مدخل رخام فندقي'
  };

  const adjusted = calculateAdjustedReferencePrice(luxuryUnit, baseDistrictPpm);
  assert.ok(adjusted);
  assert.equal(adjusted.basePpm, 10000);
  // Total adjustments should be positive (+35% to +50%)
  assert.ok(adjusted.totalPercent >= 35);
  // Adjusted PPM should be around 14,000+ EGP / m²
  assert.ok(adjusted.adjustedPpm >= 13500);
  assert.ok(adjusted.deltaPpm >= 3500);
  assert.ok(adjusted.breakdown.length >= 3);

  // Unfinished walk-up unit on side street
  const rawUnit = {
    title_ar: 'شقة سكنية على الطوب دور أخير شارع جانبي',
    type: 'apartment',
    size: 140,
    floor: '5',
    finishing: 'core',
    building: { elevator: 'no' }
  };

  const rawAdjusted = calculateAdjustedReferencePrice(rawUnit, baseDistrictPpm);
  assert.ok(rawAdjusted);
  assert.ok(rawAdjusted.totalPercent < -25);
  assert.ok(rawAdjusted.adjustedPpm < 7500);
});
