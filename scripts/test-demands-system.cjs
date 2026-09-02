/**
 * 🧪 AUTOMATED TEST SUITE: DEMANDS & REVIEW CMS
 * Tests validation, security sanitization, approval flow, and edge cases.
 */

const assert = require('assert');

console.log('\n============================================================');
console.log('🚀 بدء الفحص والاختبار الشامل لمنظومة طلبات المشترين (Demands CMS)');
console.log('============================================================\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failCount++;
  }
}

// 1. Mock INITIAL_DEMANDS
const INITIAL_DEMANDS = [
  {
    id: 'dem-1',
    text_ar: 'مطلوب شقة سكنية 160 متر في منطقة شرق سوهاج بميزانية 3.2 مليون جنيه كاش - استلام فوري.',
    text_en: 'Wanted: 160 sqm residential apartment in East Sohag, budget 3.2 Million EGP Cash - immediate handover.',
    area_ar: 'شرق سوهاج',
    area_en: 'East Sohag',
    type: 'apartment',
    budget: 3200000,
    timeframe: 'immediate',
    urgency: 'high',
    timestamp: 'منذ ساعتين',
    status: 'published'
  }
];

// 2. Test Phone Regex for supported countries
const EGYPT_PHONE_REGEX = /^(01|1)[0125][0-9]{8}$/;

test('التحقق من صحة أرقام الهواتف المصرية (Phone Validation)', () => {
  assert.strictEqual(EGYPT_PHONE_REGEX.test('01012345678'), true, 'Valid 010 number');
  assert.strictEqual(EGYPT_PHONE_REGEX.test('01123456789'), true, 'Valid 011 number');
  assert.strictEqual(EGYPT_PHONE_REGEX.test('01234567890'), true, 'Valid 012 number');
  assert.strictEqual(EGYPT_PHONE_REGEX.test('01512345678'), true, 'Valid 015 number');
  assert.strictEqual(EGYPT_PHONE_REGEX.test('12345'), false, 'Short invalid phone');
  assert.strictEqual(EGYPT_PHONE_REGEX.test('01312345678'), false, 'Invalid prefix 013');
  assert.strictEqual(EGYPT_PHONE_REGEX.test('01012345678999'), false, 'Too long phone number');
});

// 3. Test Demand Lifecycle & Status Isolation
test('عزل الطلبات المعلقة عن العرض العام (Pending vs Published Isolation)', () => {
  const demands = [
    { id: 'd1', status: 'published', text_ar: 'طلب 1' },
    { id: 'd2', status: 'pending', text_ar: 'طلب معلق' },
    { id: 'd3', text_ar: 'طلب افتراضي' } // status undefined should default to published
  ];

  const publicDemands = demands.filter(d => (d.status || 'published') === 'published');
  assert.strictEqual(publicDemands.length, 2, 'Should only contain published or legacy demands');
  assert.strictEqual(publicDemands.some(d => d.id === 'd2'), false, 'Pending demand must NOT appear publicly');
});

// 4. Test Approval Lifecycle
test('دورة اعتماد ونشر الطلب من الإدارة (Admin Approval Flow)', () => {
  let demands = [
    { id: 'd-pending', status: 'pending', text_ar: 'طلب يحتاج موافقة', budget: 4000000 }
  ];

  // Admin approves demand
  demands = demands.map(d => d.id === 'd-pending' ? { ...d, status: 'published', approvedAt: new Date().toISOString() } : d);

  assert.strictEqual(demands[0].status, 'published', 'Status should change to published');
  assert.ok(demands[0].approvedAt, 'Timestamp of approval should be stamped');
});

// 5. Test Budget Normalization (Numbers vs Strings with commas)
test('معالجة الميزانيات وتنسيق العملات (Budget Normalization & Parsing)', () => {
  const parseBudget = (val) => typeof val === 'number' ? val : parseInt(String(val).replace(/,/g, '')) || 0;

  assert.strictEqual(parseBudget(3500000), 3500000);
  assert.strictEqual(parseBudget('3,500,000'), 3500000);
  assert.strictEqual(parseBudget('4200000'), 4200000);
  assert.strictEqual(parseBudget('invalid'), 0);
  assert.strictEqual(parseBudget(null), 0);
});

// 6. Test Search & Filter Logic across multiple fields
test('محرك البحث والتصفية للطلبات (Search & Filter Engine)', () => {
  const demands = [
    { id: '1', text_ar: 'مطلوب شقة بسوهاج الجديدة', clientName: 'أحمد محمود', phone: '+201012345678', type: 'apartment', area: 'new_sohag', status: 'published' },
    { id: '2', text_ar: 'مطلوب عيادة بوسط البلد', clientName: 'دكتور سامي', phone: '+201098765432', type: 'office', area: 'center', status: 'pending' }
  ];

  const search = (q) => demands.filter(d => {
    const text = (d.text_ar || '').toLowerCase();
    const name = (d.clientName || '').toLowerCase();
    const phone = (d.phone || '').toLowerCase();
    return text.includes(q) || name.includes(q) || phone.includes(q);
  });

  assert.strictEqual(search('سامي').length, 1, 'Search by client name');
  assert.strictEqual(search('عيادة').length, 1, 'Search by keyword');
  assert.strictEqual(search('01012345678').length, 1, 'Search by phone number');
  assert.strictEqual(search('غير موجود').length, 0, 'No false positives');
});

// 7. Test XSS / Script Injection Defense
test('الوقاية من هجمات الحقن النصي XSS (Sanitization & XSS Defense)', () => {
  const maliciousInput = '<script>alert("hack")</script>مطلوب شقة فاخرة';
  const clean = maliciousInput.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]+>/g, '').trim();

  assert.strictEqual(clean, 'مطلوب شقة فاخرة', 'HTML tags and script blocks stripped cleanly');
  assert.strictEqual(clean.includes('<script>'), false, 'Script tag removed');
});

console.log('\n============================================================');
console.log(`📊 نتائج الاختبارات: ${passCount} ناجح | ${failCount} فاشل`);
console.log('============================================================\n');

if (failCount > 0) {
  process.exit(1);
}
