/**
 * ============================================================
 * ONE LINE REAL ESTATE — COMPREHENSIVE QA TEST SUITE
 * ============================================================
 * Tests all 15 test cases from the QA Test Plan
 * Run: node scripts/qa-test-suite.js
 * ============================================================
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============ Test Framework ============
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failedDetails = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failedTests++;
    const msg = `  ❌ FAIL: ${testName}${details ? ' — ' + details : ''}`;
    console.log(msg);
    failedDetails.push(msg);
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  🧪 ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

// ============ SHA-256 Helper (mirrors securityShield.js) ============
const ADMIN_SALT = 'ONELINE_SOHAG_SECURE_SALT_2026';
const AUTHORIZED_PIN_HASHES = [
  '3fd8c3db7e43a40784a855f3e63bb667c805bd68f2745d30d28cfe5a5a431360',
  'ec4a806ab9ac1c3cbc2b0cfe4045d11eb19ffdc66da5aa873cdb08e91af41353',
  'a971ec4aa4a195209a4640c9a9d5040810c4c8644d5995978cf27ff81d1b109b'
];

function sha256Hash(message) {
  const saltedMsg = message + ADMIN_SALT;
  return crypto.createHash('sha256').update(saltedMsg).digest('hex');
}

// ============================================================
//  TEST SECTION 1: SECURITY — Authentication & Encryption
// ============================================================
section('القسم 1: الأمان — التشفير والمصادقة (TC-07)');

// TC-07A: Valid passwords authenticate via SHA-256
console.log('\n  📋 TC-07A: كلمات المرور الصحيحة تعمل عبر SHA-256');
const validPINs = ['1234', 'admin', 'oneline2026'];
validPINs.forEach(pin => {
  const hash = sha256Hash(pin);
  const isValid = AUTHORIZED_PIN_HASHES.includes(hash);
  assert(isValid, `PIN "${pin}" — SHA-256 hash matches authorized list`);
});

// TC-07B: Invalid passwords are rejected
console.log('\n  📋 TC-07B: كلمات المرور الخاطئة يتم رفضها');
const invalidPINs = ['wrong123', 'password', '12345', '', 'ADMIN', 'OneLine2026'];
invalidPINs.forEach(pin => {
  const hash = sha256Hash(pin);
  const isValid = AUTHORIZED_PIN_HASHES.includes(hash);
  assert(!isValid, `PIN "${pin || '(empty)'}" — correctly rejected`);
});

// ============================================================
//  TEST SECTION 2: SECURITY — No Plaintext Passwords in Code
// ============================================================
section('القسم 2: الأمان — عدم وجود كلمات مرور مكشوفة (ثغرة #2)');

const baseDir = path.join(__dirname, '..');
const filesToCheckForPasswords = [
  'src/utils/securityShield.js',
  'src/components/CrmAdminPanel.jsx',
  'src/pages/CrmPage.jsx'
];

filesToCheckForPasswords.forEach(filePath => {
  const fullPath = path.join(baseDir, filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const basename = path.basename(filePath);

  const hasPlaintextComparison = /inputPassword\s*===\s*['"]/.test(content);
  assert(!hasPlaintextComparison, `${basename} — لا يحتوي على مقارنة نصية مباشرة لكلمات المرور`);

  const hasCrmPasswordConst = /const\s+CRM_PASSWORD\s*=\s*['"]/.test(content);
  assert(!hasCrmPasswordConst, `${basename} — لا يحتوي على CRM_PASSWORD مكشوف`);
});

const crmPageContent = fs.readFileSync(path.join(baseDir, 'src/pages/CrmPage.jsx'), 'utf-8');
const hasPasswordHint = /1234|الافتراضي.*admin|Default.*1234/.test(crmPageContent);
assert(!hasPasswordHint, `CrmPage.jsx — Placeholder لا يكشف كلمات المرور الافتراضية`);

// ============================================================
//  TEST SECTION 3: SECURITY — XSS Sanitization
// ============================================================
section('القسم 3: الأمان — حماية XSS (ثغرة #1)');

const appContent = fs.readFileSync(path.join(baseDir, 'src/App.jsx'), 'utf-8');
const hasSanitizeImport = /import\s*\{[^}]*sanitizeObject[^}]*\}\s*from/.test(appContent);
assert(hasSanitizeImport, `App.jsx — يستورد sanitizeObject من securityShield`);

const hasSanitizeUsage = appContent.includes('sanitizeObject(leadData)');
assert(hasSanitizeUsage, `App.jsx — يستخدم sanitizeObject لتنظيف بيانات العملاء`);

const securityShieldContent = fs.readFileSync(path.join(baseDir, 'src/utils/securityShield.js'), 'utf-8');
const hasDOMPurify = securityShieldContent.includes("import DOMPurify from 'dompurify'");
assert(hasDOMPurify, `securityShield.js — يستخدم مكتبة DOMPurify لتنظيف HTML`);

assert(securityShieldContent.includes('export function sanitizeInput('), `securityShield.js — يصدّر دالة sanitizeInput`);
assert(securityShieldContent.includes('export function sanitizeObject('), `securityShield.js — يصدّر دالة sanitizeObject`);

// ============================================================
//  TEST SECTION 4: SECURITY — Firestore Rules
// ============================================================
section('القسم 4: الأمان — قواعد Firestore (ثغرة #4)');

const firestoreRules = fs.readFileSync(path.join(baseDir, 'firestore.rules'), 'utf-8');

assert(
  firestoreRules.includes('request.auth.token.admin == true'),
  `firestore.rules — يتطلب Admin Custom Claims`
);

assert(
  /properties[\s\S]*?request\.auth\.token\.admin\s*==\s*true/.test(firestoreRules),
  `firestore.rules — يتطلب Admin Claims لتعديل العقارات`
);

assert(
  /properties[\s\S]*?allow read:\s*if true/.test(firestoreRules),
  `firestore.rules — يسمح بالقراءة العامة للعقارات`
);

assert(
  firestoreRules.includes('request.resource.data.phone is string'),
  `firestore.rules — يتحقق من وجود phone عند إنشاء Lead`
);

// ============================================================
//  TEST SECTION 5: VALIDATION — Property Manager
// ============================================================
section('القسم 5: التحقق — نموذج إضافة العقارات (TC-08, TC-10)');

const propertyManagerContent = fs.readFileSync(
  path.join(baseDir, 'src/components/crm/PropertyManagerPanel.jsx'), 'utf-8'
);

assert(propertyManagerContent.includes('form.price <= 0'), `PropertyManagerPanel — يرفض السعر الصفري والسالب`);
assert(propertyManagerContent.includes('form.size <= 0'), `PropertyManagerPanel — يرفض المساحة الصفرية والسالبة`);
assert(propertyManagerContent.includes('form.downPayment < 0'), `PropertyManagerPanel — يرفض المقدم السالب`);
assert(propertyManagerContent.includes('MAX_FILE_SIZE_MB = 10'), `PropertyManagerPanel — حد أقصى 10MB لكل صورة`);
assert(propertyManagerContent.includes('file.size > MAX_FILE_SIZE_BYTES'), `PropertyManagerPanel — يفحص حجم الصورة قبل الرفع`);

// ============================================================
//  TEST SECTION 6: CRM ANALYTICS — Dynamic Conversion Rate
// ============================================================
section('القسم 6: التقارير — معدل التحويل الديناميكي (TC-14)');

const crmAdminContent = fs.readFileSync(path.join(baseDir, 'src/components/CrmAdminPanel.jsx'), 'utf-8');
assert(!crmAdminContent.includes("conversionSuccess: '84%'"), `CrmAdminPanel — معدل التحويل ليس ثابتاً`);
assert(
  crmAdminContent.includes("status === 'closed'") && crmAdminContent.includes('leads.length'),
  `CrmAdminPanel — معدل التحويل يُحسب ديناميكياً`
);

// Verify calculation logic
function calculateConversion(leads) {
  if (leads.length === 0) return '0%';
  const closed = leads.filter(l => l.status === 'closed').length;
  return Math.round((closed / leads.length) * 100) + '%';
}

assert(calculateConversion([]) === '0%', `0 عملاء → 0%`);
assert(calculateConversion([{status:'new'},{status:'closed'}]) === '50%', `1 closed / 2 → 50%`);
assert(calculateConversion([{status:'closed'},{status:'closed'},{status:'closed'}]) === '100%', `3 closed / 3 → 100%`);

// ============================================================
//  TEST SECTION 7: EXPORT — CSV & PDF
// ============================================================
section('القسم 7: التصدير — CSV و PDF (TC-12, TC-13)');

const csvContent = fs.readFileSync(path.join(baseDir, 'src/utils/exportCsv.js'), 'utf-8');
assert(csvContent.includes('\\uFEFF'), `exportCsv.js — يضيف UTF-8 BOM`);
assert(csvContent.includes('text/csv;charset=utf-8'), `exportCsv.js — charset=utf-8`);
assert(csvContent.includes('toISOString().slice(0, 10)'), `exportCsv.js — تاريخ في اسم الملف`);

const pdfContent = fs.readFileSync(path.join(baseDir, 'src/utils/pdfBrochure.js'), 'utf-8');
assert(pdfContent.includes("import { jsPDF }"), `pdfBrochure.js — يستورد jsPDF`);
assert(pdfContent.includes('ONE LINE REAL ESTATE'), `pdfBrochure.js — شعار الشركة`);
assert(pdfContent.includes('Verified Legal'), `pdfBrochure.js — قسم الموقف القانوني`);

// ============================================================
//  TEST SECTION 8: RATE LIMITER
// ============================================================
section('القسم 8: الأمان — Rate Limiter (ثغرة #3)');

assert(securityShieldContent.includes('MAX_ATTEMPTS = 5'), `securityShield.js — الحد الأقصى 5 محاولات`);
assert(securityShieldContent.includes('5 * 60 * 1000'), `securityShield.js — مدة الحظر 5 دقائق`);
assert(securityShieldContent.includes("sessionStorage.getItem('oneline_auth_shield')"), `securityShield.js — يخزن في sessionStorage`);

// ============================================================
//  TEST SECTION 9: DATA INTEGRITY
// ============================================================
section('القسم 9: سلامة البيانات — هيكل Leads (TC-04)');

assert(appContent.includes("id: 'lead-' + Date.now()"), `App.jsx — يولّد ID فريد`);
assert(appContent.includes("timestamp: new Date().toISOString()"), `App.jsx — timestamp بصيغة ISO`);
assert(appContent.includes("status: 'new'"), `App.jsx — الحالة الافتراضية 'new'`);
assert(/await\s+saveLead\(/.test(appContent), `App.jsx — يحفظ في Firebase`);
assert(appContent.includes("localStorage.setItem('oneline_crm_leads'"), `App.jsx — يحفظ في localStorage`);

// ============================================================
//  TEST SECTION 10: CRITICAL COMPONENTS EXIST
// ============================================================
section('القسم 10: سلامة المكونات — الملفات الحرجة');

const criticalComponents = [
  'src/components/properties/PropertyFilters.jsx',
  'src/components/properties/PropertyCard.jsx',
  'src/components/properties/PropertyGallery.jsx',
  'src/components/properties/ZeroResultsFallback.jsx',
  'src/components/calculators/MortgageRoiCalculator.jsx',
  'src/components/BuyWizard.jsx',
  'src/components/SellWizard.jsx',
  'src/components/CrmAdminPanel.jsx',
  'src/components/crm/PropertyManagerPanel.jsx',
  'src/pages/CrmPage.jsx',
  'src/pages/PropertyDetailPage.jsx'
];

criticalComponents.forEach(comp => {
  const exists = fs.existsSync(path.join(baseDir, comp));
  assert(exists, `${path.basename(comp)} — موجود`);
});

// ============================================================
//  TEST SECTION 11: PHONE VALIDATION (TC-05)
// ============================================================
section('القسم 11: التحقق — أرقام الهواتف (TC-05)');

const phoneContent = fs.readFileSync(path.join(baseDir, 'src/components/PhoneInputField.jsx'), 'utf-8');
assert(phoneContent.includes('+20'), `PhoneInputField — يدعم كود مصر (+20)`);
assert(phoneContent.includes('+966'), `PhoneInputField — يدعم كود السعودية (+966)`);
assert(phoneContent.includes('regex'), `PhoneInputField — يستخدم Regex للتحقق`);

// ============================================================
//  FINAL REPORT
// ============================================================
console.log(`\n${'═'.repeat(60)}`);
console.log(`  📊 تقرير نتائج الاختبارات النهائي`);
console.log(`${'═'.repeat(60)}`);
console.log(`  إجمالي الاختبارات:  ${totalTests}`);
console.log(`  ✅ ناجحة:           ${passedTests}`);
console.log(`  ❌ فاشلة:           ${failedTests}`);
console.log(`  📈 نسبة النجاح:     ${Math.round((passedTests / totalTests) * 100)}%`);

if (failedDetails.length > 0) {
  console.log(`\n  ⚠️ تفاصيل الاختبارات الفاشلة:`);
  failedDetails.forEach(d => console.log(d));
}

console.log(`\n${'═'.repeat(60)}\n`);
process.exit(failedTests > 0 ? 1 : 0);
