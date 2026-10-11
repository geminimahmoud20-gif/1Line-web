import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SOHAG_AREAS, mergeStoredAreas, groupAreas, placementOf, areaIdsForFilter, areaFilterLabel,
  areaPathLabel, areaProximity, cityFilterValue, sectorFilterValue
} from '../../src/utils/areasData.js';

const areas = [
  { id: 'all', name_ar: 'كل المناطق' },
  { id: 'west', name_ar: 'غرب سوهاج', city_ar: 'سوهاج', sector_ar: 'غرب النيل', sector_en: 'West Nile' },
  { id: 'akhmeem', name_ar: 'أخميم', city_ar: 'سوهاج', sector_ar: 'شرق النيل' },
  { id: 'east', name_ar: 'شرق سوهاج', city_ar: 'سوهاج', sector_ar: 'شرق النيل' },
  { id: 'gomhoreya_st', name_ar: 'ش الجمهورية' },
  { id: 'zayed_1', name_ar: 'الحي الأول', city_ar: 'الشيخ زايد' },
];

test('districts group by city then sector; districts without a sector come last', () => {
  const g = groupAreas(areas);
  assert.deepEqual(g.map((c) => c.key), ['سوهاج', 'الشيخ زايد']);
  assert.deepEqual(g[0].sectors.map((s) => s.key), ['غرب النيل', 'شرق النيل', '']);
  assert.deepEqual(g[0].sectors[1].areas.map((a) => a.id), ['akhmeem', 'east']);
  assert.equal(g[0].count, 4);
  assert.ok(!g.some((c) => c.sectors.some((s) => s.areas.some((a) => a.id === 'all'))), '"all" is a filter, not a place');
});

test('an area with no placement defaults to Sohag, no sector', () => {
  assert.deepEqual(placementOf({}), { city_ar: 'سوهاج', city_en: 'Sohag', sector_ar: '', sector_en: '' });
  assert.equal(placementOf({ city_ar: ' 6  أكتوبر ' }).city_ar, '6 أكتوبر');
  assert.equal(placementOf({ city_ar: '6 أكتوبر' }).city_en, '6 أكتوبر');
});

test('filters cover one district, a whole sector or a whole city', () => {
  assert.equal(areaIdsForFilter('all', areas), null);
  assert.equal(areaIdsForFilter('', areas), null);
  assert.deepEqual([...areaIdsForFilter('east', areas)], ['east']);
  assert.deepEqual([...areaIdsForFilter(sectorFilterValue('سوهاج', 'شرق النيل'), areas)].sort(), ['akhmeem', 'east']);
  assert.deepEqual([...areaIdsForFilter(cityFilterValue('سوهاج'), areas)].sort(), ['akhmeem', 'east', 'gomhoreya_st', 'west']);
  assert.deepEqual([...areaIdsForFilter(cityFilterValue('الشيخ زايد'), areas)], ['zayed_1']);
});

test('labels name the filter and where a district sits', () => {
  assert.equal(areaFilterLabel(sectorFilterValue('سوهاج', 'غرب النيل'), areas, true), 'سوهاج · غرب النيل');
  assert.equal(areaFilterLabel(sectorFilterValue('سوهاج', 'غرب النيل'), areas, false), 'Sohag · West Nile');
  assert.equal(areaFilterLabel(cityFilterValue('الشيخ زايد'), areas), 'الشيخ زايد');
  assert.equal(areaFilterLabel('akhmeem', areas), 'أخميم');
  assert.equal(areaPathLabel(areas[2]), 'سوهاج · شرق النيل · أخميم');
});

test('proximity: same district, same sector, same city, other city', () => {
  assert.equal(areaProximity('east', 'east', areas), 'same');
  assert.equal(areaProximity('all', 'west', areas), 'same');
  assert.equal(areaProximity('east', 'akhmeem', areas), 'sector');
  assert.equal(areaProximity('east', 'west', areas), 'city');
  assert.equal(areaProximity('east', 'zayed_1', areas), null);
});

test('built-in areas carry placements and no sample price history', () => {
  const east = DEFAULT_SOHAG_AREAS.find((a) => a.id === 'east');
  assert.equal(east.sector_ar, 'شرق النيل');
  assert.ok(DEFAULT_SOHAG_AREAS.every((a) => a.historicalPrices.length === 0));
  // A saved list from before still carrying the old sample series loses it; real series stay
  const sample = [{ year: '2023 Q1', price: 11500 }, { year: '2023 Q3', price: 13200 }, { year: '2024 Q1', price: 15400 }, { year: '2024 Q3', price: 17100 }, { year: '2025 Q1', price: 18800 }, { year: '2025 Q3', price: 19800 }, { year: '2026 (الآن)', price: 21500 }];
  const real = [{ year: '2025', price: 20000 }, { year: '2026', price: 22000 }];
  const out = mergeStoredAreas([{ id: 'east', name_ar: 'شرق', historicalPrices: sample }, { id: 'x', name_ar: 'حي', historicalPrices: real }]);
  assert.deepEqual(out.find((a) => a.id === 'east').historicalPrices, []);
  assert.deepEqual(out.find((a) => a.id === 'x').historicalPrices, real);
  // Saved built-in areas pick up their default placement until the team sets one
  assert.equal(out.find((a) => a.id === 'east').sector_ar, 'شرق النيل');
});
