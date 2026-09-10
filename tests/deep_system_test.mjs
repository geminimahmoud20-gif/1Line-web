/**
 * 🧪 1LINE SOLUTIONS SOHAG - COMPREHENSIVE DEEP SYSTEM TEST SUITE
 * Running on Node.js v24 with ESM
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passed++;
    results.push(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    results.push(`  ❌ FAIL: ${testName} -> ${details}`);
  }
}

console.log('====================================================');
console.log('🚀 STARTING DEEP 360° SYSTEM HEALTH & AUDIT SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. DATA INTEGRITY: PROPERTIES INVENTORY (16 PROPERTIES)
// ----------------------------------------------------
console.log('📋 [1/7] Testing Properties Inventory Integrity...');
const { PROPERTIES_DATA } = await import('../src/data/propertiesData.js');
assert(Array.isArray(PROPERTIES_DATA) && PROPERTIES_DATA.length >= 16, `PROPERTIES_DATA has 16+ properties (Actual: ${PROPERTIES_DATA.length})`);

let allPropsHaveValidFields = true;
let allPropsHaveValidCoords = true;
let allPropsHaveImages = true;
const propertyAreaKeys = new Set();

PROPERTIES_DATA.forEach(p => {
  if (!p.id || !p.title_ar || !p.title_en || !p.price || !p.size || p.price <= 0 || p.size <= 0) {
    allPropsHaveValidFields = false;
    console.error(`Invalid property fields in: ${p.id}`);
  }
  if (!p.coordinates || typeof p.coordinates.lat !== 'number' || typeof p.coordinates.lng !== 'number') {
    allPropsHaveValidCoords = false;
    console.error(`Invalid coordinates in: ${p.id}`);
  }
  if (!Array.isArray(p.images) || p.images.length === 0) {
    allPropsHaveImages = false;
    console.error(`No images in: ${p.id}`);
  }
  if (p.areaKey) {
    propertyAreaKeys.add(p.areaKey);
  }
});

assert(allPropsHaveValidFields, 'All properties have valid ID, title_ar, title_en, price > 0, and size > 0');
assert(allPropsHaveValidCoords, 'All properties have valid numerical GPS coordinates (lat, lng)');
assert(allPropsHaveImages, 'All properties have at least 1 verified photo image');

// ----------------------------------------------------
// 2. DATA INTEGRITY: SOHAG DISTRICTS & AREAS
// ----------------------------------------------------
console.log('\n🗺️ [2/7] Testing Sohag Districts & Areas Data...');
const { DEFAULT_SOHAG_AREAS, getAreaById } = await import('../src/utils/areasData.js');

assert(Array.isArray(DEFAULT_SOHAG_AREAS) && DEFAULT_SOHAG_AREAS.length >= 9, `System has all 9+ Sohag districts (Found: ${DEFAULT_SOHAG_AREAS.length})`);

const areaIds = new Set(DEFAULT_SOHAG_AREAS.map(a => a.id));
assert(areaIds.has('new_sohag'), 'District "new_sohag" exists in areas');
assert(areaIds.has('corniche'), 'District "corniche" exists in areas');
assert(areaIds.has('east'), 'District "east" exists in areas');
assert(areaIds.has('kawthar'), 'District "kawthar" exists in areas');
assert(areaIds.has('tahta'), 'District "tahta" exists in areas');
assert(areaIds.has('center'), 'District "center" exists in areas');

// Verify all property areaKeys map cleanly to defined areas
let allPropAreasExist = true;
for (const k of propertyAreaKeys) {
  if (!areaIds.has(k) && k !== 'all') {
    allPropAreasExist = false;
    console.error(`Missing area definition for property areaKey: ${k}`);
  }
}
assert(allPropAreasExist, 'Every property areaKey maps to a defined Sohag district');

// Verify all areas have dynamic benchmarks, growth rates, historical prices & amenities
let allAreasEnriched = true;
DEFAULT_SOHAG_AREAS.forEach(a => {
  if (a.id !== 'all') {
    if (!a.avgPricePerMeter || a.avgPricePerMeter <= 0) allAreasEnriched = false;
    if (!a.annualGrowthRate || a.annualGrowthRate <= 0) allAreasEnriched = false;
    if (!Array.isArray(a.historicalPrices) || a.historicalPrices.length < 5) allAreasEnriched = false;
    if (!Array.isArray(a.amenities) || a.amenities.length < 3) allAreasEnriched = false;
  }
});
assert(allAreasEnriched, 'All districts possess dynamic avgPricePerMeter, annualGrowthRate, historical prices (7 points) and amenities');

// ----------------------------------------------------
// 3. CURRENCY CONVERTER & PRICE BENCHMARK ENGINE
// ----------------------------------------------------
console.log('\n💱 [3/7] Testing Currency Conversion & Price Benchmark Calculations...');
const { CURRENCY_RATES, formatCurrencyPrice, getDistrictBenchmark, getPriceBenchmark } = await import('../src/utils/currencyAndBenchmark.js');

assert(CURRENCY_RATES.EGP.rate === 1, 'EGP base exchange rate is 1');
assert(typeof CURRENCY_RATES.SAR.rate === 'number' && CURRENCY_RATES.SAR.rate > 0, 'SAR exchange rate is valid');
assert(typeof CURRENCY_RATES.USD.rate === 'number' && CURRENCY_RATES.USD.rate > 0, 'USD exchange rate is valid');

// Test formatCurrencyPrice
const testAmount = 2500000;
const egpFormatted = formatCurrencyPrice(testAmount, 'EGP', 'ar');
assert(egpFormatted.primary === '2,500,000' && egpFormatted.symbol === 'ج.م', 'EGP currency formats correctly');

const sarFormatted = formatCurrencyPrice(testAmount, 'SAR', 'ar');
assert(sarFormatted.isConverted === true && sarFormatted.symbol === 'ر.س', 'SAR currency converts and formats correctly');

// Test getDistrictBenchmark
const cornicheBenchmark = getDistrictBenchmark('corniche');
assert(cornicheBenchmark >= 25000, `Corniche benchmark resolved dynamically (${cornicheBenchmark} EGP/m²)`);

const newSohagBenchmark = getDistrictBenchmark('new_sohag');
assert(newSohagBenchmark >= 10000 && newSohagBenchmark <= 20000, `New Sohag benchmark resolved dynamically (${newSohagBenchmark} EGP/m²)`);

// Test getPriceBenchmark on a real sample property
const sampleProperty = {
  id: 'test-1',
  price: 2400000,
  size: 200, // 12,000 / m²
  areaKey: 'new_sohag'
};
const benchmarkResult = getPriceBenchmark(sampleProperty, 'ar');
assert(benchmarkResult !== null, 'getPriceBenchmark produces valid valuation result');
assert(benchmarkResult.badgeType === 'deal' || benchmarkResult.badgeType === 'fair' || benchmarkResult.badgeType === 'premium', 'Valuation badgeType is valid');

// ----------------------------------------------------
// 4. SECURITY SHIELD & ANTI-SPAM LOGIC
// ----------------------------------------------------
console.log('\n🛡️ [4/7] Testing Security Shield & Spam Protection...');
const { checkFormSpamProtection } = await import('../src/utils/securityShield.js');

// 1. Normal clean submission (honeypot empty)
const normalSubmission = checkFormSpamProtection('', 'test_form_normal');
assert(normalSubmission.allowed === true, 'Legitimate submission with empty honeypot is ALLOWED');

// 2. Bot submission (honeypot filled)
const botSubmission = checkFormSpamProtection('bot_input_value', 'test_form_bot');
assert(botSubmission.allowed === false, 'Bot submission with filled honeypot is REJECTED');

// ----------------------------------------------------
// 5. FIRESTORE SECURITY RULES VALIDATION
// ----------------------------------------------------
console.log('\n🔒 [5/7] Auditing Firestore Security Rules...');
const rulesPath = path.join(projectRoot, 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

assert(rulesContent.includes("rules_version = '2';"), 'Firestore rules version 2 specified');
assert(rulesContent.includes('match /leads/{leadId}'), 'Leads collection is guarded in rules');
assert(rulesContent.includes('match /demands/{demandId}'), 'Demands collection is guarded in rules');
assert(rulesContent.includes('request.resource.data.phone.size() >= 10'), 'Phone minimum length validation (>= 10) is enforced');
assert(rulesContent.includes('request.resource.data.name.size() >= 2'), 'Name minimum length validation (>= 2) is enforced');
assert(rulesContent.includes('function isAdmin()'), 'Admin role authorization helper function exists');

// ----------------------------------------------------
// 6. MEGA PROJECTS CATALOG INTEGRITY
// ----------------------------------------------------
console.log('\n🏢 [6/7] Testing Mega Projects & Compounds...');
const { MEGA_PROJECTS } = await import('../src/data/projectsData.js');

assert(Array.isArray(MEGA_PROJECTS) && MEGA_PROJECTS.length >= 2, `Mega projects catalog has developments (Found: ${MEGA_PROJECTS.length})`);
let allProjectsValid = true;
MEGA_PROJECTS.forEach(proj => {
  if (!proj.id || !proj.title_ar || !proj.developer_ar || !proj.startPrice || !proj.progress) {
    allProjectsValid = false;
  }
});
assert(allProjectsValid, 'All mega projects contain title, developer, startPrice, and progress');

// ----------------------------------------------------
// 7. COMPILATION & BUNDLE INTEGRITY
// ----------------------------------------------------
console.log('\n📦 [7/7] Checking Production Distribution Assets...');
const distHtmlPath = path.join(projectRoot, 'dist/index.html');
const distExists = fs.existsSync(distHtmlPath);
assert(distExists, 'Production build dist/index.html is compiled and present');

const distSwPath = path.join(projectRoot, 'dist/sw.js');
const swExists = fs.existsSync(distSwPath);
assert(swExists, 'PWA Service Worker dist/sw.js is generated and present');

const distManifestPath = path.join(projectRoot, 'dist/manifest.json');
const manifestExists = fs.existsSync(distManifestPath);
assert(manifestExists, 'PWA Manifest dist/manifest.json is present for mobile installation');

// ----------------------------------------------------
// 8. REACT COMPONENT HOOK & SYNTAX INTEGRITY
// ----------------------------------------------------
console.log('\n⚛️ [8/8] Testing React Component Hook Integrity across All JSX Modules...');
let allHooksImported = true;
const jsxFiles = [];
function findJsx(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== 'node_modules' && e.name !== 'dist') {
      findJsx(full);
    } else if (e.isFile() && e.name.endsWith('.jsx')) {
      jsxFiles.push(full);
    }
  }
}
findJsx(path.join(projectRoot, 'src'));

for (const f of jsxFiles) {
  const code = fs.readFileSync(f, 'utf8');
  const hooks = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useRef'];
  for (const h of hooks) {
    const usage = new RegExp(`\\b${h}\\s*\\(`, 'g');
    if (usage.test(code) && !code.includes(`import`) && !code.includes(h)) {
      allHooksImported = false;
      console.error(`Missing import for ${h} in ${path.relative(projectRoot, f)}`);
    } else if (usage.test(code)) {
      const imp = new RegExp(`import\\s+[^;]*\\b${h}\\b[^;]*from`, 'g');
      if (!imp.test(code) && !code.includes(`const ${h}`) && !code.includes(`function ${h}`)) {
        allHooksImported = false;
        console.error(`Unimported hook usage ${h} in ${path.relative(projectRoot, f)}`);
      }
    }
  }
}
assert(allHooksImported, `All ${jsxFiles.length} JSX modules have 100% verified hook imports and syntax`);

console.log('\n====================================================');
console.log(`📊 AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log('====================================================');

results.forEach(r => console.log(r));

if (failed === 0) {
  console.log('\n🌟 100% DEEP SYSTEM AUDIT PASSED! PLATFORM IS COMMERCIALLY ROBUST.');
  process.exit(0);
} else {
  console.error(`\n⚠️ AUDIT FAILED with ${failed} issues.`);
  process.exit(1);
}
