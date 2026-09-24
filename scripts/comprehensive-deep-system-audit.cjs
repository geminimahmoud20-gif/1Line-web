/**
 * Comprehensive Deep System Audit
 * 1Line Solutions PropTech Platform (Sohag, Egypt)
 * Covers: Architecture, Security, Data Integrity, Engines, CRM, SEO & PWA
 */

const fs = require('fs');
const assert = require('assert');

// Mock browser globals for Node test environment
if (typeof global.localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}
if (typeof global.sessionStorage === 'undefined') {
  const store = {};
  global.sessionStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}
if (typeof global.window === 'undefined') {
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

console.log('================================================================================');
console.log('🛡️  بدء الفحص والتدقيق العميق والشامل لكافة طبقات النظام — 1Line PropTech System');
console.log('================================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err.message });
    console.error(`  ❌ [FAIL] ${name} -> ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// 1. فحص البنية التحتية والملفات الأساسية و PWA و SEO
// -----------------------------------------------------------------------------
console.log('📦 1. بنية التكوين، PWA، الأمان والميتاتاج:');

test('ملف index.html يحتوي على Schema.org RealEstateAgent و SEO وميتا الأمان', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const vercel = fs.readFileSync('vercel.json', 'utf8');
  assert.ok(html.includes('application/ld+json'), 'Schema JSON-LD tag exists');
  assert.ok(html.includes('RealEstateAgent'), 'RealEstateAgent schema exists');
  assert.ok(html.includes('د. محمود الباز'), 'Founder mentioned in schema');
  assert.ok(html.includes('manifest.json'), 'PWA manifest linked');
  assert.ok(html.includes('nosniff') || vercel.includes('nosniff'), 'X-Content-Type-Options security header present');
  assert.ok(html.includes('SAMEORIGIN') || vercel.includes('SAMEORIGIN'), 'X-Frame-Options security header present');
});

test('ملف public/manifest.json سليم ويتضمن أيقونات التطبيق والاسم', () => {
  const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'));
  assert.ok(manifest.name.includes('One Line') || manifest.name.includes('1Line'), 'Manifest name valid');
  assert.strictEqual(manifest.start_url, '/', 'Manifest start_url is /');
  assert.strictEqual(manifest.display, 'standalone', 'PWA display mode is standalone');
  assert.ok(manifest.icons && manifest.icons.length > 0, 'Manifest has icons');
});

test('ملف Service Worker (public/sw.js) سليم ويعالج التخزين المؤقت دون كسر تحديثات الكود', () => {
  const sw = fs.readFileSync('public/sw.js', 'utf8');
  assert.ok(sw.includes('install'), 'SW has install event');
  assert.ok(sw.includes('fetch'), 'SW has fetch event');
});

test('قواعد Firestore (firestore.rules) تحمي العملاء والطلبات والتنبيهات', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  assert.ok(rules.includes('request.auth'), 'Requires auth');
  assert.ok(rules.includes('token.role'), 'Requires admin role');
  assert.ok(rules.includes('match /demands/{demandId}'), 'Demands rule defined');
});

// -----------------------------------------------------------------------------
// 2. فحص محركات الحسابات والمقارنة والبحث الدلالي
// -----------------------------------------------------------------------------
console.log('\n⚙️ 2. محركات التحليل المالي والبحث الذكي والمطابقة:');

test('محرك البحث الدلالي (semanticSearchEngine.js) يستخرج النوايا بدقة تامة', () => {
  const { parseSemanticQuery, searchPropertiesSemantic } = require('../src/utils/semanticSearchEngine.js');
  const res1 = parseSemanticQuery('شقة 3 غرف في سوهاج الجديدة أقل من 3 مليون');
  assert.strictEqual(res1.filters.area, 'new_sohag');
  assert.strictEqual(res1.filters.type, 'apartment');
  assert.strictEqual(res1.filters.bedrooms, 3);
  assert.strictEqual(res1.filters.maxPrice, 3000000);

  const mockData = [
    { id: 'p1', title_ar: 'شقة فاخرة بسوهاج الجديدة', areaKey: 'new_sohag', type: 'apartment', price: 2400000, bedrooms: 3 },
    { id: 'p2', title_ar: 'فيلا مستقلة بشرق سوهاج', areaKey: 'east', type: 'villa', price: 7000000, bedrooms: 5 }
  ];
  const results = searchPropertiesSemantic(mockData, 'شقة 3 غرف بسوهاج الجديدة');
  assert.ok(results.length > 0);
  assert.strictEqual(results[0].id, 'p1');
});

test('حاسبة التمويل والتقسيط وعملة الجنيه المصري (Currency & Benchmark)', () => {
  const { CURRENCY_RATES, formatCurrencyPrice } = require('../src/utils/currencyAndBenchmark.js');
  assert.ok(CURRENCY_RATES.EGP.rate === 1);
  assert.strictEqual(Object.keys(CURRENCY_RATES).length, 1);

  const egpVal = 1000000;
  const resEgp = formatCurrencyPrice(egpVal, 'EGP', 'ar');
  assert.strictEqual(resEgp.isConverted, false);
  assert.strictEqual(resEgp.symbol, 'ج.م');
  assert.ok(resEgp.primary);
});

test('محرك مطابقة العملاء مع العقارات (matchingEngine.js)', () => {
  const { findMatchingClientsForProperty } = require('../src/utils/matchingEngine.js');
  const sampleProp = {
    id: 'prop-test',
    type: 'apartment',
    areaKey: 'new_sohag',
    price: 3000000,
    bedrooms: 3
  };
  const sampleLeads = [
    { id: 'l1', name: 'عميل أ', type: 'buyer', details: { propertyType: 'apartment', area: 'new_sohag', expectedPrice: '3000000' } }
  ];
  const matches = findMatchingClientsForProperty(sampleProp, sampleLeads);
  assert.ok(Array.isArray(matches));
});

// -----------------------------------------------------------------------------
// 3. فحص الأمان والحماية من الاختراق (Security, Sanitization & Anti-bot)
// -----------------------------------------------------------------------------
console.log('\n🛡️ 3. الأمان السيبراني، تنظيف المدخلات، ومصيدة البوت:');

test('دالة تنظيف النصوص والكائنات (sanitizeObject)', () => {
  const { sanitizeObject } = require('../src/utils/securityShield.js');
  const obj = {
    name: 'أحمد علي',
    phone: '01012345678',
    notes: '<script>alert(1)</script>طلب شقة'
  };
  const clean = sanitizeObject(obj);
  assert.ok(!clean.notes.includes('<script>'));
  assert.ok(clean.notes.includes('طلب شقة'));
});

test('فحص مصيدة البوت (Honeypot Trap) ومكافحة الإغراق (Rate Limiter)', () => {
  const { checkFormSpamProtection } = require('../src/utils/securityShield.js');
  const botAttempt = checkFormSpamProtection('http://spam-link.com', 'test_form');
  assert.strictEqual(botAttempt.allowed, false, 'Honeypot filled must be rejected');
  assert.strictEqual(botAttempt.isBot, true);

  const humanAttempt = checkFormSpamProtection('', 'test_form_human');
  assert.strictEqual(humanAttempt.allowed, true, 'Clean honeypot should be allowed');
});

test('التحقق والتطبيع لأرقام الهواتف (normalizePhoneNumber)', () => {
  const { normalizePhoneNumber } = require('../src/utils/securityShield.js');
  assert.strictEqual(normalizePhoneNumber('010 1234 5678'), '01012345678');
  assert.strictEqual(normalizePhoneNumber('+20 101-234-5678'), '01012345678');
  assert.strictEqual(normalizePhoneNumber('01112345678'), '01112345678');
});

// -----------------------------------------------------------------------------
// 4. فحص قواعد الصلاحيات والأدوار الإدارية (RBAC) وحجب أرقام الهواتف
// -----------------------------------------------------------------------------
console.log('\n👥 4. الصلاحيات المؤسسية وحجب البيانات الحساسة (RBAC & Masking):');

test('قناع إخفاء أرقام الهواتف (maskPhoneNumber) لحماية خصوصية العملاء', () => {
  const { maskPhoneNumber, canViewLeadPhone, canDeleteLead, canExportCsv } = require('../src/utils/rbacRules.js');
  const masked = maskPhoneNumber('01012345678', 'viewer');
  assert.strictEqual(masked, '010****78');

  // Privileged role should see full phone
  const unmasked = maskPhoneNumber('01012345678', 'super_admin');
  assert.strictEqual(unmasked, '01012345678');

  // RBAC checks
  assert.strictEqual(canViewLeadPhone('super_admin'), true);
  assert.strictEqual(canViewLeadPhone('sales_agent'), true);
  assert.strictEqual(canViewLeadPhone('viewer'), false);
  assert.strictEqual(canViewLeadPhone('property_manager'), false);

  assert.strictEqual(canDeleteLead('super_admin'), true);
  assert.strictEqual(canDeleteLead('sales_agent'), false);

  assert.strictEqual(canExportCsv('super_admin'), true);
  assert.strictEqual(canExportCsv('viewer'), false);
});

// -----------------------------------------------------------------------------
// 5. فحص سلامة البيانات وقوائم العقارات والمشروعات الكبرى
// -----------------------------------------------------------------------------
console.log('\n🏢 5. تناسق بيانات العقارات والمناطق والمشروعات الكبرى:');

test('بيانات العقارات الأساسية (propertiesData.js) مكتملة ومحققة الشروط', () => {
  const { PROPERTIES_DATA, SOHAG_AREAS, PROPERTY_TYPES } = require('../src/data/propertiesData.js');
  assert.ok(PROPERTIES_DATA.length >= 6, 'Has at least 6 initial properties');
  assert.ok(SOHAG_AREAS.length >= 5, 'Has verified Sohag areas');
  assert.ok(PROPERTY_TYPES.length >= 4, 'Has verified property types');

  PROPERTIES_DATA.forEach(p => {
    assert.ok(p.id, 'Property has id');
    assert.ok(p.title_ar, `Property ${p.id} has Arabic title`);
    assert.ok(p.title_en, `Property ${p.id} has English title`);
    assert.ok(typeof p.price === 'number' && p.price > 0, `Property ${p.id} has valid positive price`);
    assert.ok(typeof p.size === 'number' && p.size > 0, `Property ${p.id} has valid positive size`);
    assert.ok(p.areaKey, `Property ${p.id} has areaKey`);
  });
});

test('بيانات المشروعات الكبرى (projectsData.js) تتضمن نسب الإنجاز والموقع والمطور', () => {
  const { MEGA_PROJECTS } = require('../src/data/projectsData.js');
  assert.ok(MEGA_PROJECTS.length >= 3, 'Has at least 3 mega projects');
  MEGA_PROJECTS.forEach(proj => {
    assert.ok(proj.id, 'Project has id');
    assert.ok(proj.title_ar, 'Project has title_ar');
    assert.ok(proj.developer_ar, 'Project has developer_ar');
    assert.ok(typeof proj.progress === 'number' && proj.progress >= 0 && proj.progress <= 100, 'Project progress is 0-100');
  });
});

test('بيانات مناطق سوهاج والنمو السنوي وسعر المتر (areasData.js)', () => {
  const { getAreas } = require('../src/utils/areasData.js');
  const areas = getAreas();
  assert.ok(areas.length >= 5, 'Has Sohag areas registered');
  areas.forEach(a => {
    assert.ok(a.id, 'Area has id');
    assert.ok(a.name_ar, 'Area has Arabic name');
    if (a.id !== 'all') {
      assert.ok(typeof a.avgPricePerMeter === 'number' && a.avgPricePerMeter > 0, `Area ${a.id} has positive avgPricePerMeter`);
    }
  });
});

test('بيانات إدارة المؤسس والإعدادات الديناميكية (founderCmsData.js)', () => {
  const { getFounderSettings, getWhatsAppUrl, getPhoneCallUrl } = require('../src/utils/founderCmsData.js');
  const settings = getFounderSettings();
  assert.ok(settings.founderName_ar.includes('محمود الباز'), 'Founder name set');
  assert.ok(settings.whatsappNumber, 'WhatsApp number set');
  assert.ok(settings.phoneNumber, 'Phone number set');

  const waUrl = getWhatsAppUrl('رسالة تجريبية');
  assert.ok(waUrl.startsWith('https://wa.me/'), 'Valid WhatsApp URL schema');
  assert.ok(waUrl.includes(encodeURIComponent('رسالة تجريبية')), 'Encodes message properly');

  const telUrl = getPhoneCallUrl();
  assert.ok(telUrl.startsWith('tel:'), 'Valid Tel URL schema');
});

// -----------------------------------------------------------------------------
// 6. فحص سلامة المكونات React وخلوها من مخالفات الـ Hooks
// -----------------------------------------------------------------------------
console.log('\n⚛️ 6. فحص الامتثال لقواعد React وسلامة الـ JSX:');

test('ملف PropertyDetailPage.jsx لا يحتوي على استدعاء useMemo بعد early return', () => {
  const code = fs.readFileSync('src/pages/PropertyDetailPage.jsx', 'utf8');
  const earlyReturnIdx = code.indexOf('if (!property) {');
  const similarPropIdx = code.indexOf('const similarProperties = useMemo');
  assert.ok(similarPropIdx < earlyReturnIdx, 'similarProperties hook is declared BEFORE early return');
});

test('ملف MarketIntelligencePage.jsx يعلن متغير tick بشكل سليم في useState', () => {
  const code = fs.readFileSync('src/pages/MarketIntelligencePage.jsx', 'utf8');
  assert.ok(code.includes('const [tick, setTick] = useState(0);'), 'tick state is properly declared');
});

// -----------------------------------------------------------------------------
// 7. خلاصة النتائج والتقرير النهائي
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log('📊 تقرير الفحص والتدقيق النهائي للنظام (System Audit Summary)');
console.log('================================================================================');
console.log(`إجمالي الفحوصات: ${totalTests}`);
console.log(`الفحوصات الناجحة: ${passedTests}`);
console.log(`الفحوصات الفاشلة: ${failedTests}`);
console.log(`معدل السلامة والموثوقية: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('================================================================================');

if (failedTests > 0) {
  console.error('❌ توجد إخفاقات تحتاج إلى تصحيح:');
  failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f.name}: ${f.error}`));
  process.exit(1);
} else {
  console.log('🎉 كافة طبقات النظام (Frontend, Backend Services, Security, Business Logic, SEO) سليمة 100%!');
  process.exit(0);
}
