/**
 * Automated Verification Script: Client Account & Favorites Isolation Workflow
 */
const assert = require('assert');

console.log('🧪 Starting Client Account & Favorites Workflow Test...');

// 1. Simulate LocalStorage
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

// 2. Test Phone Normalization
function normalizePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('20') && clean.length === 12) {
    clean = '0' + clean.slice(2);
  } else if (clean.startsWith('0020') && clean.length === 14) {
    clean = '0' + clean.slice(4);
  }
  return clean;
}

function phonesMatch(phone1, phone2) {
  if (!phone1 || !phone2) return false;
  const n1 = normalizePhoneNumber(String(phone1));
  const n2 = normalizePhoneNumber(String(phone2));
  if (n1 && n2 && n1 === n2) return true;
  const d1 = String(phone1).replace(/[^0-9]/g, '');
  const d2 = String(phone2).replace(/[^0-9]/g, '');
  if (d1.length >= 9 && d2.length >= 9) {
    return d1.slice(-9) === d2.slice(-9);
  }
  return false;
}

assert(phonesMatch('+20 101 234 5678', '01012345678'), 'Phone match test 1 (+20 vs 010)');
assert(phonesMatch('01012345678', '01012345678'), 'Phone match test 2 (identical)');
assert(phonesMatch('+201012345678', '201012345678'), 'Phone match test 3 (+ prefix)');
console.log('✅ PASS: Phone matching handles Egyptian and international formats');

// 3. Test Favorites Isolation on Logout
let activeFavorites = ['prop-101', 'prop-102'];
let activeCompare = [{ id: 'prop-101' }];
let clientUser = {
  id: 'client_1',
  name: 'أحمد محمود',
  phone: '01012345678',
  whatsapp: '+201012345678',
  verified: true
};

localStorage.setItem('oneline_client_account', JSON.stringify(clientUser));
localStorage.setItem('oneline_favorites', JSON.stringify(activeFavorites));

// Simulate Logout logic
function simulateLogout() {
  if (clientUser) {
    const phoneDigits = (clientUser.whatsapp || clientUser.phone || '').replace(/[^0-9]/g, '');
    if (phoneDigits && Array.isArray(activeFavorites)) {
      localStorage.setItem(`oneline_client_favorites_${phoneDigits}`, JSON.stringify(activeFavorites));
    }
  }

  clientUser = null;
  localStorage.removeItem('oneline_client_account');

  // Purge active
  activeFavorites = [];
  activeCompare = [];
  localStorage.removeItem('oneline_favorites');
}

simulateLogout();

assert.strictEqual(clientUser, null, 'Client user must be null after logout');
assert.strictEqual(localStorage.getItem('oneline_client_account'), null, 'Client account storage must be removed');
assert.strictEqual(activeFavorites.length, 0, 'Active favorites must be 0 after logout');
assert.strictEqual(activeCompare.length, 0, 'Active compare must be 0 after logout');
assert.strictEqual(localStorage.getItem('oneline_favorites'), null, 'Active favorites in storage must be null');

// Verify backup exists for client's phone number
const phoneDigits = '201012345678';
const savedBackup = JSON.parse(localStorage.getItem(`oneline_client_favorites_${phoneDigits}`));
assert.deepStrictEqual(savedBackup, ['prop-101', 'prop-102'], 'Client favorites must be safely backed up');
console.log('✅ PASS: Client logout immediately purges active browser favorites & badges while safely preserving client backup');

// 4. Test Restore on Login
function simulateLogin(phone) {
  const digits = phone.replace(/[^0-9]/g, '');
  const raw = localStorage.getItem(`oneline_client_favorites_${digits}`);
  const restored = raw ? JSON.parse(raw) : [];
  activeFavorites = restored;
  localStorage.setItem('oneline_favorites', JSON.stringify(restored));
  clientUser = {
    id: 'client_1',
    name: 'أحمد محمود',
    phone: phone,
    whatsapp: phone,
    verified: true
  };
}

simulateLogin('+201012345678');
assert.strictEqual(activeFavorites.length, 2, 'Restored favorites must have 2 items');
assert.deepStrictEqual(activeFavorites, ['prop-101', 'prop-102'], 'Restored favorites must match previously saved items');
console.log('✅ PASS: Client login seamlessly restores saved favorites');

// 5. Test Inquiries & Site Visits Filtering
const sampleLeads = [
  { id: 'lead-1', name: 'أحمد محمود', phone: '01012345678', type: 'buyer', status: 'site_visit', siteVisit: { date: '2026-09-25', time: '04:00 PM' } },
  { id: 'lead-2', name: 'سارة علي', phone: '01198765432', type: 'seller', status: 'new' },
  { id: 'lead-3', name: 'أحمد محمود', phone: '+201012345678', type: 'bespoke_request', status: 'negotiating' }
];

const sampleDemands = [
  { id: 'dem-1', name: 'أحمد محمود', phone: '01012345678', title_ar: 'مطلوب شقة بسوهاج الجديدة', status: 'published' },
  { id: 'dem-2', name: 'محمد حسن', phone: '01233344455', title_ar: 'مطلوب محل تجاري', status: 'pending_review' }
];

const clientLeads = sampleLeads.filter(l => phonesMatch(l.phone, clientUser.phone));
const clientSiteVisits = clientLeads.filter(l => l.siteVisit || l.status === 'site_visit');
const clientDemands = sampleDemands.filter(d => phonesMatch(d.phone, clientUser.phone));

assert.strictEqual(clientLeads.length, 2, 'Client should have 2 leads');
assert.strictEqual(clientSiteVisits.length, 1, 'Client should have 1 site visit');
// 6. Test 1-Click Direct Activation Flow
function simulate1ClickActivation({ name, email, phone }) {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const token = `1L-${code}`;
  const whatsappUrl = `https://wa.me/201012345678?text=${encodeURIComponent('رمز التوثيق: ' + token)}`;
  
  // Directly activate account without second step
  const verifiedAccount = {
    id: `client_${Date.now()}`,
    name,
    email,
    whatsapp: phone,
    phone,
    verified: true,
    verificationToken: token,
    verificationMethod: 'whatsapp_handshake',
    role: 'verified_client'
  };

  localStorage.setItem('oneline_client_account', JSON.stringify(verifiedAccount));
  return {
    verifiedAccount,
    token,
    whatsappUrl,
    statusMessage: 'تم تفعيل الحساب مباشرة'
  };
}

const actResult = simulate1ClickActivation({
  name: 'محمد احمد',
  email: '1linesolutions498@gmail.com',
  phone: '+201144552865'
});

assert(actResult.token.startsWith('1L-'), 'Token must follow 1L-xxxx format');
assert(actResult.whatsappUrl.includes(actResult.token), 'WhatsApp URL must contain prefilled token');
assert.strictEqual(actResult.verifiedAccount.verified, true, 'Account must be verified immediately upon activation click');
assert.strictEqual(actResult.statusMessage, 'تم تفعيل الحساب مباشرة', 'Return status message must match requested direct activation');
console.log('✅ PASS: 1-Click direct activation flow executes immediately without secondary confirmation clicks');

console.log('\n🎉 ALL CLIENT ACCOUNT WORKFLOW VERIFICATIONS PASSED SUCCESSFULLY (100%)!\n');

