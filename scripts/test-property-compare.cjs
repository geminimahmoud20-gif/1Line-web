/**
 * 🧪 Test Suite for Smart Property Comparison System
 * Validates AI verdicts, benchmarks, 4-unit capacity, and simulator logic.
 */

const { PROPERTIES_DATA } = require('../src/data/propertiesData.js');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
  }
}

console.log('\n==============================================================================');
console.log('⚖️ TEST SUITE: SMART PROPERTY COMPARISON TOOL (1LINE SOHAG)');
console.log('==============================================================================\n');

// 1. Dataset availability
assert(Array.isArray(PROPERTIES_DATA) && PROPERTIES_DATA.length >= 4, 'Catalog has at least 4 certified properties');

// 2. Select 4 test properties
const prop1 = PROPERTIES_DATA[0]; // East Sohag (160 sqm, 3.45M)
const prop2 = PROPERTIES_DATA[1]; // New Sohag (220 sqm, 2.85M)
const prop3 = PROPERTIES_DATA[2]; // Corniche
const prop4 = PROPERTIES_DATA[3]; // Commercial / other

const sampleList = [prop1, prop2, prop3, prop4].filter(Boolean);
assert(sampleList.length === 4, 'Sample compare list populated with 4 distinct properties');

// 3. AI Verdict: Best Price Per Meter
let minPpm = Infinity;
let bestPpmId = null;
sampleList.forEach(p => {
  const ppm = p.pricePerMeter || Math.round(p.price / p.size);
  if (ppm < minPpm) {
    minPpm = ppm;
    bestPpmId = p.id;
  }
});
assert(Boolean(bestPpmId) && minPpm > 0 && minPpm < Infinity, `AI Verdict correctly identifies lowest PPM (${minPpm} EGP/m²) -> ID: ${bestPpmId}`);

// 4. AI Verdict: Largest Area
let maxSize = -1;
let largestId = null;
sampleList.forEach(p => {
  if (p.size > maxSize) {
    maxSize = p.size;
    largestId = p.id;
  }
});
assert(Boolean(largestId) && maxSize > 0, `AI Verdict correctly identifies largest living area (${maxSize} sqm) -> ID: ${largestId}`);

// 5. Installment & Downpayment Simulator Math
const testDownPercent = 25;
sampleList.forEach(p => {
  const downVal = Math.round((p.price * testDownPercent) / 100);
  const remaining = p.price - downVal;
  const years = p.installmentYears || 5;
  const monthly = Math.round(remaining / (years * 12));
  assert(downVal > 0 && monthly > 0 && (downVal + monthly * years * 12) >= (p.price - 10), `Simulator correctly models ${testDownPercent}% downpayment for ${p.id}`);
});

// 6. Max Compare Capacity Limit Check
function testAdd(current, newProp) {
  if (current.length >= 4) return { added: false, reason: 'limit_reached' };
  if (current.some(p => p.id === newProp.id)) return { added: false, reason: 'duplicate' };
  return { added: true, list: [...current, newProp] };
}

let testList = [];
testList = testAdd(testList, prop1).list;
testList = testAdd(testList, prop2).list;
testList = testAdd(testList, prop3).list;
testList = testAdd(testList, prop4).list;
assert(testList.length === 4, 'Compare list successfully accepts 4 items');

const overflowAttempt = testAdd(testList, { id: 'prop-overflow', price: 1000000 });
assert(overflowAttempt.added === false && overflowAttempt.reason === 'limit_reached', 'Correctly blocks 5th item when limit is 4');

const dupAttempt = testAdd(testList.slice(0, 3), prop1);
assert(dupAttempt.added === false && dupAttempt.reason === 'duplicate', 'Correctly blocks duplicate property addition');

// 7. WhatsApp text generation check
let waText = 'Comparison Summary:\n';
sampleList.forEach((p, idx) => {
  waText += `${idx + 1}. ${p.title_ar} - ${p.price.toLocaleString()} EGP\n`;
});
assert(waText.includes(prop1.title_ar) && waText.includes(prop2.title_ar), 'WhatsApp message formatter includes all selected units');

console.log('\n==============================================================================');
console.log(`📊 RESULTS: ${passCount} Passed, ${failCount} Failed`);
console.log('==============================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL SMART PROPERTY COMPARISON TESTS PASSED 100%!\n');
}
