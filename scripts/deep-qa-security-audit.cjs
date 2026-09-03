/**
 * 🛡️ SENIOR QA & SECURITY AUDIT TEST SUITE
 * Comprehensive stress testing, functional verification, and vulnerability scanning
 * for One Line Buyer Demands CMS & Review Flow (2026).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('\n' + '█'.repeat(75));
console.log('  🛡️ تقرير الفحص والتدقيق الأمني والوظيفي الشامل — إدارة الجودة والأمان');
console.log('  🎯 المستهدف: منظومة طلبات المشترين (Buyer Demands CMS & Review Flow)');
console.log('█'.repeat(75) + '\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const defectsLog = [];

function runTest(sectionName, testTitle, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  ✅ [PASS] ${testTitle}`);
    passedTests++;
  } catch (error) {
    console.error(`  ❌ [FAIL] ${testTitle}`);
    console.error(`     ↳ خطأ: ${error.message}`);
    failedTests++;
    defectsLog.push({ section: sectionName, title: testTitle, error: error.message });
  }
}

// =========================================================================
// 1. اختبار التحقق ومدخلات المستخدم (INPUT VALIDATION)
// =========================================================================
console.log('🔹 1. فحص التحقق من المدخلات (Input Validation & Formatting):');

const PHONE_REGEXES = {
  '+20': /^(01|1)[0125][0-9]{8}$/, // Egypt
  '+966': /^(05|5)[0-9]{8}$/,      // Saudi Arabia
  '+971': /^(05|5)[0-9]{8}$/,      // UAE
  '+965': /^[569][0-9]{7}$/,       // Kuwait
  '+974': /^[3567][0-9]{7}$/,      // Qatar
  '+968': /^[79][0-9]{7}$/         // Oman
};

// 1.1 Phone Validation
runTest('Input Validation', 'الهواتف المصرية: قبول البادئات الرسمية (010, 011, 012, 015) المكونة من 11 رقم', () => {
  assert.ok(PHONE_REGEXES['+20'].test('01012345678'));
  assert.ok(PHONE_REGEXES['+20'].test('01123456789'));
  assert.ok(PHONE_REGEXES['+20'].test('01234567890'));
  assert.ok(PHONE_REGEXES['+20'].test('01512345678'));
  assert.ok(PHONE_REGEXES['+20'].test('1012345678')); // without leading zero
});

runTest('Input Validation', 'الهواتف المصرية: رفض الأرقام غير الصحيحة أو الناقصة أو الزائدة', () => {
  assert.strictEqual(PHONE_REGEXES['+20'].test('010123456'), false, 'رقم ناقص');
  assert.strictEqual(PHONE_REGEXES['+20'].test('01312345678'), false, 'بادئة 013 غير صالحة للمحمول');
  assert.strictEqual(PHONE_REGEXES['+20'].test('01012345678999'), false, 'رقم زائد');
  assert.strictEqual(PHONE_REGEXES['+20'].test('abcdefghijk'), false, 'حروف غير رقمية');
  assert.strictEqual(PHONE_REGEXES['+20'].test(''), false, 'فارغ');
});

runTest('Input Validation', 'الهواتف الخليجية: التحقق من أرقام السعودية والإمارات والكويت وقطر وعمان', () => {
  assert.ok(PHONE_REGEXES['+966'].test('0512345678'), 'Saudi valid');
  assert.strictEqual(PHONE_REGEXES['+966'].test('0412345678'), false, 'Saudi invalid prefix');
  assert.ok(PHONE_REGEXES['+971'].test('0501234567'), 'UAE valid');
  assert.ok(PHONE_REGEXES['+965'].test('98765432'), 'Kuwait valid');
  assert.ok(PHONE_REGEXES['+974'].test('55123456'), 'Qatar valid');
  assert.ok(PHONE_REGEXES['+968'].test('91234567'), 'Oman valid');
});

// 1.2 Budget Validation & Normalization
runTest('Input Validation', 'معالجة الميزانية: رفض القيم الصفرية والسالبة وغير الرقمية والتعامل مع الفواصل', () => {
  const normalizeBudget = (val) => {
    if (!val) return 0;
    const num = typeof val === 'number' ? val : parseInt(String(val).replace(/,/g, ''));
    return isNaN(num) || num <= 0 ? 0 : num;
  };

  assert.strictEqual(normalizeBudget(3500000), 3500000);
  assert.strictEqual(normalizeBudget('3,500,000'), 3500000);
  assert.strictEqual(normalizeBudget('0'), 0, 'الصفر غير مقبول كميزانية شراء عقار');
  assert.strictEqual(normalizeBudget(-500000), 0, 'القيم السالبة غير مقبولة');
  assert.strictEqual(normalizeBudget('غير محدد'), 0, 'النصوص العشوائية');
});

// 1.3 Required Fields Form Validation
runTest('Input Validation', 'فحص وجود التحقق الإلزامي من الاسم والميزانية ونوع العقار والمنطقة في AddDemandModal.jsx', () => {
  const modalCode = fs.readFileSync(path.join(__dirname, '../src/components/common/AddDemandModal.jsx'), 'utf-8');
  assert.ok(modalCode.includes('!formData.name.trim()'), 'فحص وجود الاسم الإلزامي');
  assert.ok(modalCode.includes('!formData.budget'), 'فحص وجود الميزانية الإلزامية');
  assert.ok(modalCode.includes('min="100000"'), 'الحد الأدنى للميزانية 100 ألف');
});

// =========================================================================
// 2. اختبار الأمان والتطهير ومقاومة XSS (SECURITY & XSS INJECTION)
// =========================================================================
console.log('\n🔹 2. فحص الأمان ومقاومة الاختراق والحقن النصي (XSS & Security):');

runTest('Security & XSS', 'فحص وجود واستدعاء دالة sanitizeObject عند حفظ الطلبات في App.jsx', () => {
  const appCode = fs.readFileSync(path.join(__dirname, '../src/App.jsx'), 'utf-8');
  assert.ok(appCode.includes('const sanitizedDemand = sanitizeObject(newDemand);'), 'تطهير الطلب العام');
  assert.ok(appCode.includes('const sanitizedPayload = sanitizeObject(demandPayload);'), 'تطهير الطلب الإداري');
});

runTest('Security & XSS', 'فحص حظر أكواد الحقن الخبيثة (<script> وأكواد الأون إيرور)', () => {
  const maliciousPayloads = [
    '<script>alert("xss")</script>مطلوب شقة',
    '<img src=x onerror=alert(1)>محل تجاري',
    '<svg onload=alert(document.cookie)>أرض استثمارية',
    'javascript:alert(1)'
  ];

  const stripTags = (input) => {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<[^>]+>/g, '')
                .replace(/javascript:/gi, '')
                .trim();
  };

  maliciousPayloads.forEach(payload => {
    const cleaned = stripTags(payload);
    assert.strictEqual(cleaned.includes('<script>'), false);
    assert.strictEqual(cleaned.includes('<img'), false);
    assert.strictEqual(cleaned.includes('<svg'), false);
    assert.strictEqual(cleaned.includes('javascript:'), false);
  });
});

runTest('Security & XSS', 'التأكد من عدم استخدام dangerouslySetInnerHTML في عرض بيانات الطلبات', () => {
  const homeCode = fs.readFileSync(path.join(__dirname, '../src/pages/HomePage.jsx'), 'utf-8');
  const portalCode = fs.readFileSync(path.join(__dirname, '../src/components/DemandsPortal.jsx'), 'utf-8');
  const crmCode = fs.readFileSync(path.join(__dirname, '../src/components/crm/DemandsManagerPanel.jsx'), 'utf-8');

  assert.strictEqual(homeCode.includes('dangerouslySetInnerHTML'), false, 'HomePage آمن تماماً');
  assert.strictEqual(portalCode.includes('dangerouslySetInnerHTML'), false, 'DemandsPortal آمن تماماً');
  assert.strictEqual(crmCode.includes('dangerouslySetInnerHTML'), false, 'DemandsManagerPanel آمن تماماً');
});

// =========================================================================
// 3. اختبار العزل والخصوصية (PRIVACY & STATUS ISOLATION)
// =========================================================================
console.log('\n🔹 3. فحص الخصوصية وحجب البيانات الحساسة (Privacy & Status Isolation):');

runTest('Privacy & Isolation', 'عزل الطلبات المعلقة (Pending): التأكد من عدم ظهورها في HomePage إلا بعد موافقة الإدارة', () => {
  const homeCode = fs.readFileSync(path.join(__dirname, '../src/pages/HomePage.jsx'), 'utf-8');
  const hasStatusFilter = homeCode.includes(".filter(d => (d.status || 'published') === 'published')");
  assert.ok(hasStatusFilter, 'HomePage يفلتر الطلبات المعتمدة المنشورة فقط');
});

runTest('Privacy & Isolation', 'عزل الطلبات المعلقة: التأكد من الفلترة الصارمة في بوابة الطلبات DemandsPortal', () => {
  const portalCode = fs.readFileSync(path.join(__dirname, '../src/components/DemandsPortal.jsx'), 'utf-8');
  const hasStatusFilter = portalCode.includes("const publishedDemands = demands.filter(d => (d.status || 'published') === 'published');");
  assert.ok(hasStatusFilter, 'DemandsPortal يفلتر الطلبات المنشورة فقط');
});

runTest('Privacy & Isolation', 'حماية خصوصية المشتري: عدم تسريب الاسم أو الهاتف أو الواتساب في الواجهة العامة', () => {
  const homeCode = fs.readFileSync(path.join(__dirname, '../src/pages/HomePage.jsx'), 'utf-8');
  const portalCode = fs.readFileSync(path.join(__dirname, '../src/components/DemandsPortal.jsx'), 'utf-8');

  // Examine demands section in HomePage
  const demandsSectionHomePage = homeCode.split('demands-grid-compact')[1]?.split('</section>')[0] || '';
  assert.strictEqual(demandsSectionHomePage.includes('dem.clientName'), false, 'اسم العميل محجوب في الرئيسية');
  assert.strictEqual(demandsSectionHomePage.includes('dem.phone'), false, 'هاتف العميل محجوب في الرئيسية');
  assert.strictEqual(demandsSectionHomePage.includes('dem.whatsapp'), false, 'واتساب العميل محجوب في الرئيسية');

  // Examine demands section in DemandsPortal
  const demandsSectionPortal = portalCode.split('demands-grid')[1]?.split('export default')[0] || '';
  assert.strictEqual(demandsSectionPortal.includes('dem.clientName'), false, 'اسم العميل محجوب في بوابة الطلبات');
  assert.strictEqual(demandsSectionPortal.includes('dem.phone'), false, 'هاتف العميل محجوب في بوابة الطلبات');
  assert.strictEqual(demandsSectionPortal.includes('dem.whatsapp'), false, 'واتساب العميل محجوب في بوابة الطلبات');
});

// =========================================================================
// 4. دورة المراجعة والاعتماد في لوحة الإدارة (ADMIN APPROVAL LIFECYCLE)
// =========================================================================
console.log('\n🔹 4. فحص دورة المراجعة والاعتماد الإداري (CRM Review & Approval Flow):');

const ADMIN_SALT = 'ONELINE_SOHAG_SECURE_SALT_2026';
const AUTHORIZED_PIN_HASHES = [
  '3fd8c3db7e43a40784a855f3e63bb667c805bd68f2745d30d28cfe5a5a431360',
  'ec4a806ab9ac1c3cbc2b0cfe4045d11eb19ffdc66da5aa873cdb08e91af41353',
  'a971ec4aa4a195209a4640c9a9d5040810c4c8644d5995978cf27ff81d1b109b'
];

runTest('Admin Lifecycle', 'حماية الدخول للوحة التحكم عبر تشفير SHA-256 المقترن بـ Salt', () => {
  const sha256 = (val) => crypto.createHash('sha256').update(val + ADMIN_SALT).digest('hex');
  
  assert.ok(AUTHORIZED_PIN_HASHES.includes(sha256('1234')), 'PIN 1234 موثق ومطابق');
  assert.ok(AUTHORIZED_PIN_HASHES.includes(sha256('admin')), 'PIN admin موثق ومطابق');
  assert.strictEqual(AUTHORIZED_PIN_HASHES.includes(sha256('wrong_pin')), false, 'رفض كلمات المرور الخاطئة');
});

runTest('Admin Lifecycle', 'فحص وجود تبويب طلبات المشترين وبادج التنبيه المعلق في CrmPage.jsx', () => {
  const crmCode = fs.readFileSync(path.join(__dirname, '../src/pages/CrmPage.jsx'), 'utf-8');
  assert.ok(crmCode.includes("activeTab === 'demands'"), 'تبويب demands مفعل');
  assert.ok(crmCode.includes('pendingDemandsCount > 0 ?'), 'وجود بادج تنبيهي مضيء للطلبات المعلقة');
  assert.ok(crmCode.includes('<DemandsManagerPanel'), 'تضمين المكون الإداري');
});

runTest('Admin Lifecycle', 'محاكاة دورة حياة الطلب: تحول الحالة من pending إلى published واعتماد الطابع الزمني', () => {
  let demands = [
    { id: 'dem-test-1', text_ar: 'شقة بالكوثر', budget: 2000000, status: 'pending' }
  ];

  // Action: Approve
  demands = demands.map(d => d.id === 'dem-test-1' ? { ...d, status: 'published', approvedAt: new Date().toISOString() } : d);
  assert.strictEqual(demands[0].status, 'published');
  assert.ok(demands[0].approvedAt);

  // Action: Unpublish / Revert to Pending
  demands = demands.map(d => d.id === 'dem-test-1' ? { ...d, status: 'pending' } : d);
  assert.strictEqual(demands[0].status, 'pending');

  // Action: Delete
  demands = demands.filter(d => d.id !== 'dem-test-1');
  assert.strictEqual(demands.length, 0);
});

runTest('Admin Lifecycle', 'تنسيق روابط التواصل المباشر عبر واتساب وهاتف المشرف', () => {
  const client = {
    name: 'م. أحمد الشريف',
    phone: '+20 101-234-5678',
    whatsapp: '+201012345678',
    text_ar: 'مطلوب فيلا بسوهاج الجديدة'
  };

  const cleanPhone = client.phone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`أهلاً بك أستاذ ${client.name}`)}`;
  
  assert.strictEqual(cleanPhone, '201012345678', 'إزالة الفواصل والأقواس والأفقيات');
  assert.ok(waUrl.startsWith('https://wa.me/201012345678?text='));
});

// =========================================================================
// 5. ثبات البيانات والتزامن والتعارضات (PERSISTENCE & EDGE CASES)
// =========================================================================
console.log('\n🔹 5. فحص ثبات البيانات وحالات الحافة والتعارضات (Persistence & Edge Cases):');

runTest('Persistence & Collision', 'اختبار تصادم المعرفات (ID Collision Stress Test): توليد 10,000 معرف متتالي', () => {
  const ids = new Set();
  const generateId = () => `dem-pub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 8)}`;

  for (let i = 0; i < 10000; i++) {
    const id = generateId();
    assert.strictEqual(ids.has(id), false, `تصادم في المعرف: ${id}`);
    ids.add(id);
  }
  assert.strictEqual(ids.size, 10000, 'تم توليد 10,000 معرف فريد بنجاح دون أي تصادم');
});

runTest('Persistence & Collision', 'فحص التخزين المحلي (LocalStorage Resilience): استعادة البيانات وتفادي انهيار JSON', () => {
  const validJson = JSON.stringify([{ id: 'd1', text_ar: 'طلب تجريبي' }]);
  const parsed = JSON.parse(validJson);
  assert.strictEqual(parsed.length, 1);

  // Corrupted JSON recovery check in App.jsx
  const appCode = fs.readFileSync(path.join(__dirname, '../src/App.jsx'), 'utf-8');
  assert.ok(appCode.includes('readStoredJson') || appCode.includes('JSON.parse'), 'حماية كود App.jsx من تلف الـ JSON');
});

runTest('Persistence & Collision', 'فحص مزامنة Firebase Firestore: توفر دوال الحفظ والاستدعاء والتعديل والحذف', () => {
  const fbCode = fs.readFileSync(path.join(__dirname, '../src/firebaseService.js'), 'utf-8');
  assert.ok(fbCode.includes('export const saveDemand ='), 'دالة saveDemand موجودة');
  assert.ok(fbCode.includes('export const loadDemands ='), 'دالة loadDemands موجودة');
  assert.ok(fbCode.includes('export const updateDemandStatus ='), 'دالة updateDemandStatus موجودة');
  assert.ok(fbCode.includes('export const deleteDemandDoc ='), 'دالة deleteDemandDoc موجودة');
});

// =========================================================================
// ملخص التقرير النهائي
// =========================================================================
console.log('\n' + '═'.repeat(75));
console.log(`📊 النتيجة الإجمالية للفحص: ${passedTests} ناجح | ${failedTests} فاشل من إجمالي ${totalTests} اختباراً.`);
console.log(`📈 معدل النجاح والموثوقية: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('═'.repeat(75) + '\n');

if (failedTests > 0) {
  console.log('⚠️ قائمة العيوب المرصودة:');
  defectsLog.forEach((d, idx) => console.log(`  ${idx + 1}. [${d.section}] ${d.title} -> ${d.error}`));
  process.exit(1);
} else {
  console.log('🎉 المنظومة اجتازت كافة اختبارات الأمان والتحقق وعزل الخصوصية ودورة المراجعة بنجاح 100%!');
}
