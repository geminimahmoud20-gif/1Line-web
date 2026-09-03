const assert = require('assert');
const { parseSemanticQuery, searchPropertiesSemantic } = require('../src/utils/semanticSearchEngine.js');

console.log('🧪 Testing Semantic Real Estate Search Engine...');

// Test 1: Extract budget and area
const q1 = parseSemanticQuery('شقة 3 غرف في سوهاج الجديدة أقل من 3 مليون');
assert.strictEqual(q1.filters.area, 'new_sohag', 'Area should be new_sohag');
assert.strictEqual(q1.filters.type, 'apartment', 'Type should be apartment');
assert.strictEqual(q1.filters.bedrooms, 3, 'Bedrooms should be 3');
assert.strictEqual(q1.filters.maxPrice, 3000000, 'Max price should be 3M');
console.log('  ✅ [PASS] Price, bedrooms, area, and type extracted successfully.');

// Test 2: Commercial intent
const q2 = parseSemanticQuery('محل ينفع صيدلية في شرق سوهاج');
assert.strictEqual(q2.filters.type, 'commercial', 'Commercial intent extracted');
assert.strictEqual(q2.filters.area, 'east', 'East Sohag area extracted');
console.log('  ✅ [PASS] Commercial & pharmacy intent parsed successfully.');

// Test 3: Nile Corniche Luxury
const q3 = parseSemanticQuery('شقق على كورنيش النيل فاخرة');
assert.strictEqual(q3.filters.area, 'corniche', 'Corniche area extracted');
console.log('  ✅ [PASS] Nile Corniche luxury query parsed successfully.');

// Test 4: Mock property list ranking
const mockProps = [
  { id: '1', title_ar: 'شقة راقية بسوهاج الجديدة', areaKey: 'new_sohag', type: 'apartment', price: 2800000, bedrooms: 3 },
  { id: '2', title_ar: 'فيلا مستقلة بشرق سوهاج', areaKey: 'east', type: 'villa', price: 8500000, bedrooms: 5 },
  { id: '3', title_ar: 'محل تجاري بكورنيش النيل', areaKey: 'corniche', type: 'commercial', price: 4200000 }
];

const results = searchPropertiesSemantic(mockProps, 'شقة 3 غرف بسوهاج الجديدة أقل من 3 مليون');
assert.ok(results.length > 0, 'Should find results');
assert.strictEqual(results[0].id, '1', 'Best matching property should be #1');
assert.ok(results[0]._semanticScore > 50, 'High relevance score');
console.log('  ✅ [PASS] Semantic ranking & relevance scoring verified.');

console.log('🎉 All Semantic Search Engine tests PASSED (4/4)!');
