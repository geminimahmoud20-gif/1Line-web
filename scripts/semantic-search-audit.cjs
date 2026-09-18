/**
 * 🧪 SEMANTIC SEARCH & ARABIC NLP AUDIT SUITE
 * Tests complex Arabic real estate queries, Eastern digits, and dialect variations.
 */

const { parseSemanticQuery } = require('../src/utils/semanticSearchEngine');

const TEST_CASES = [
  {
    query: 'شقة 3 غرف في سوهاج الجديدة تحت 3 مليون',
    expected: { area: 'new_sohag', type: 'apartment', bedrooms: 3, maxPrice: 3000000 }
  },
  {
    query: 'شقة ٣ غرف في شرق سوهاج بـ ٢.٥ مليون',
    expected: { area: 'east', type: 'apartment', bedrooms: 3, maxPrice: 2500000 }
  },
  {
    query: 'شقه غرفتين في الكورنيش ع النيل',
    expected: { area: 'corniche', type: 'apartment', bedrooms: 2 }
  },
  {
    query: 'محل تجاري في الكوثر تحت 1.5 مليون',
    expected: { area: 'kawthar', type: 'commercial', maxPrice: 1500000 }
  },
  {
    query: 'فيلا 4 غرف في سوهاج الجديده من 4 مليون الى 7 مليون',
    expected: { area: 'new_sohag', type: 'villa', bedrooms: 4, minPrice: 4000000, maxPrice: 7000000 }
  },
  {
    query: 'استوديو مفروش في وسط البلد بسعر ٨٠٠ الف',
    expected: { area: 'center', type: 'apartment', bedrooms: 1, maxPrice: 800000 }
  },
  {
    query: 'قطعة ارض مباني في اخميم مسجلة',
    expected: { area: 'akhmeem', type: 'land' }
  },
  {
    query: 'عيادة طبية في شارع الجمهورية سوهاج',
    expected: { area: 'east', type: 'office' }
  }
];

console.log('================================================================');
console.log('🔍 RUNNING SEMANTIC SEARCH ENGINE AUDIT');
console.log('================================================================');

let passed = 0;
let failed = 0;

TEST_CASES.forEach((tc, idx) => {
  const result = parseSemanticQuery(tc.query);
  const filters = result.filters || {};
  let isCasePassed = true;
  const errors = [];

  if (tc.expected.area && filters.area !== tc.expected.area) {
    isCasePassed = false;
    errors.push(`Area expected "${tc.expected.area}", got "${filters.area}"`);
  }
  if (tc.expected.type && filters.type !== tc.expected.type) {
    isCasePassed = false;
    errors.push(`Type expected "${tc.expected.type}", got "${filters.type}"`);
  }
  if (tc.expected.bedrooms && filters.bedrooms !== tc.expected.bedrooms) {
    isCasePassed = false;
    errors.push(`Bedrooms expected "${tc.expected.bedrooms}", got "${filters.bedrooms}"`);
  }
  if (tc.expected.maxPrice && filters.maxPrice !== tc.expected.maxPrice) {
    isCasePassed = false;
    errors.push(`MaxPrice expected "${tc.expected.maxPrice}", got "${filters.maxPrice}"`);
  }
  if (tc.expected.minPrice && filters.minPrice !== tc.expected.minPrice) {
    isCasePassed = false;
    errors.push(`MinPrice expected "${tc.expected.minPrice}", got "${filters.minPrice}"`);
  }

  if (isCasePassed) {
    passed++;
    console.log(`  ✅ [PASS] Case ${idx + 1}: "${tc.query}"`);
  } else {
    failed++;
    console.log(`  ❌ [FAIL] Case ${idx + 1}: "${tc.query}"`);
    errors.forEach(e => console.log(`      -> ${e}`));
  }
});

console.log('================================================================');
console.log(`Summary: ${passed} Passed | ${failed} Failed | Total: ${TEST_CASES.length}`);
console.log('================================================================');

process.exit(failed > 0 ? 1 : 0);
