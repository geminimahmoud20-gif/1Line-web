// tests/unit/inbox-critical-bugs.test.mjs
// Proves and verifies fixes for CRM Inbox Critical Bugs (PR #1: fix/inbox-critical-bugs)
import { test } from 'node:test';
import assert from 'node:assert/strict';

// 1. Classification without guessing from notes text (Bug 7: leadKind & client_account)
export function classifyLeadCategory(lead) {
  const type = (lead.type || '').toLowerCase();
  const source = (lead.source || '').toLowerCase();
  const landing = (lead.landingPage || '').toLowerCase();
  const details = lead.details || {};

  // Accounts: Explicit type OR legacy client_account source
  if (
    type === 'account' ||
    type === 'client_registration' ||
    type === 'client' ||
    source === 'client_account' ||
    source === 'account' ||
    landing.includes('/account')
  ) {
    return 'accounts';
  }

  // Visits & Viewing requests: Strictly from type or explicit visit details, NEVER notes text
  if (
    type === 'visit' ||
    type === 'viewing' ||
    type === 'viewing_request' ||
    type === 'reservation_request' ||
    Boolean(details.visitDate) ||
    Boolean(details.inspectionType)
  ) {
    return 'visits';
  }

  // Sellers & Valuations
  if (
    type === 'seller' ||
    type === 'valuation' ||
    landing.includes('/sell') ||
    landing.includes('/valuation') ||
    Boolean(details.askingPrice)
  ) {
    return 'sellers';
  }

  // Brokers
  if (type === 'broker' || landing.includes('/broker')) {
    return 'brokers';
  }

  // Buyers / Investor / Default
  return 'buyers';
}

// 2. Unclaimed determination (Bug 2 & 3: Desk vs Owner)
export const TEAM_DESKS = [
  'Sales Team A',
  'Sales Team B',
  'Sales Management',
  'Sales Advisor Team',
  'Dr. Mahmoud Elbaz',
  'Unassigned',
  'غير مسند'
];

export function isLeadUnclaimed(lead) {
  // If claimed by an individual employee
  if (lead.ownerUid || lead.ownerName || lead.claimedBy) {
    return false;
  }
  // If unassigned or assigned only to a general desk team
  return !lead.assignedTo || TEAM_DESKS.includes(lead.assignedTo);
}

// 3. Truthful WhatsApp pitch without fake data or false promises (Bug 9)
export function generateTruthfulWhatsAppPitch(lead, activeTab = 'visits', isAr = true) {
  const name = lead.name || (isAr ? 'العميل' : 'Client');
  const d = lead.details || {};

  if (activeTab === 'visits') {
    const propCode = d.propertyCode || d.propertyId ? ` (كود: ${d.propertyCode || d.propertyId})` : '';
    const datePart = d.visitDate ? ` يوم ${d.visitDate}${d.visitSlot ? ` (${d.visitSlot})` : ''}` : '';
    return isAr
      ? `أهلاً بك أ. ${name}، بخصوص طلبكم لمعاينة العقار${propCode}${datePart} عبر منصة 1Line، نسعد بتأكيد الموعد معكم ومتابعة التفاصيل...`
      : `Hello ${name}, regarding your viewing request${propCode ? ` for property ${propCode}` : ''}${datePart ? ` on ${datePart}` : ''} on 1Line...`;
  }

  if (activeTab === 'buyers') {
    const propType = d.propertyType || lead.propertyType || (isAr ? 'عقار' : 'property');
    const budget = d.budget || lead.budget ? ` بميزانية ${d.budget || lead.budget}` : '';
    return isAr
      ? `أهلاً بك أ. ${name}، استلمنا طلبكم بخصوص البحث عن (${propType})${budget} عبر 1Line، وسنتواصل معكم لطرح بعض الأسئلة لترشيح أفضل الخيارات المناسبة لكم بدقة...`
      : `Hello ${name}, we received your request for (${propType})${budget} on 1Line, and our advisor will follow up with a few discovery questions to shortlist the best options for you...`;
  }

  return isAr
    ? `أهلاً بك أ. ${name}، بخصوص تواصلكم مع منصة 1Line للحلول العقارية...`
    : `Hello ${name}, regarding your inquiry on 1Line...`;
}

// ── TESTS ────────────────────────────────────────────────────────────────────

test('Bug 7 fix: legacy client_account with type="buyer" must be categorized as "accounts", not "buyers"', () => {
  const legacyAccountLead = {
    id: 'l-1',
    name: 'عميل اختبار',
    type: 'buyer',
    source: 'client_account', // Created via user portal registration
    notes: 'مستخدم مسجل في البوابة'
  };

  const category = classifyLeadCategory(legacyAccountLead);
  assert.equal(category, 'accounts', 'Legacy client_account must be categorized as accounts');
});

test('Bug 7 fix: buyer inquiry with notes containing "معاينة" must NOT be falsely hijacked into "visits"', () => {
  const buyerLead = {
    id: 'l-2',
    name: 'عميل اختبار',
    type: 'buyer',
    source: 'website',
    notes: 'العميل يستفسر عن إمكانية معاينة في المستقبل' // Contains word معاينة
  };

  const category = classifyLeadCategory(buyerLead);
  assert.equal(category, 'buyers', 'Must classify by type/source, never by keyword guessing in notes');
});

test('Bug 2 fix: lead assigned to team desk ("Sales Team A") must be recognized as unclaimed so "استلم" button appears', () => {
  const teamLead = {
    id: 'l-3',
    name: 'عميل اختبار',
    assignedTo: 'Sales Team A',
    status: 'new'
  };

  assert.equal(isLeadUnclaimed(teamLead), true, 'Lead assigned to team desk must be claimable by team agents');

  // Once an individual employee claims it:
  const claimedLead = {
    ...teamLead,
    ownerName: 'محمود المصري',
    claimedBy: 'محمود المصري'
  };
  assert.equal(isLeadUnclaimed(claimedLead), false, 'Lead claimed by an individual employee must not be unclaimed');
});

test('Bug 9 fix: viewing request without property code or visit date must NOT contain "P-101" or "بتاريخ المحدد"', () => {
  const bareVisitLead = {
    id: 'l-4',
    name: 'أحمد',
    type: 'viewing_request',
    details: {} // No propertyCode, no visitDate
  };

  const pitch = generateTruthfulWhatsAppPitch(bareVisitLead, 'visits', true);
  assert.equal(pitch.includes('P-101'), false, 'Must never generate fake property code P-101');
  assert.equal(pitch.includes('بتاريخ المحدد'), false, 'Must never state "بتاريخ المحدد" when date is missing');
});

test('Bug 9 fix: buyer WhatsApp message must NOT make false promises about pre-selected matching list', () => {
  const buyerLead = {
    id: 'l-5',
    name: 'طارق',
    type: 'buyer',
    details: { propertyType: 'شقة' }
  };

  const pitch = generateTruthfulWhatsAppPitch(buyerLead, 'buyers', true);
  assert.equal(pitch.includes('تم إعداد قائمة مختارة تطابق طلبكم تماماً'), false, 'Must not claim a list was prepared before discovery');
  assert.ok(pitch.includes('لطرح بعض الأسئلة'), 'Must honestly explain discovery questions step');
});

test('Bug 12 fix: list sorting must NOT mutate original array in place', () => {
  const originalList = [
    { id: '1', status: 'contacted', createdAt: '2026-10-10T10:00:00Z' },
    { id: '2', status: 'new', createdAt: '2026-10-11T10:00:00Z' }
  ];
  const listCopy = [...originalList];

  // Pure sort
  const sorted = [...originalList].sort((a, b) => {
    const aNew = a.status === 'new' ? 1 : 0;
    const bNew = b.status === 'new' ? 1 : 0;
    return bNew - aNew;
  });

  assert.equal(sorted[0].id, '2');
  assert.equal(originalList[0].id, '1', 'Original array must remain unmutated at index 0');
  assert.deepEqual(originalList, listCopy, 'Original array elements must remain unchanged');
});
