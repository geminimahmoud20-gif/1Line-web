import test from 'node:test';
import assert from 'node:assert/strict';
import { describeLeadChange, changeEntry, holderLabel } from '../../src/utils/leadChangeLog.js';
import { buildTimeline } from '../../src/utils/clientTimeline.js';

test('a stage change says from which stage to which', () => {
  assert.equal(describeLeadChange({ status: 'contacted' }, { status: 'new' }), 'تغيير المرحلة من عميل محتمل إلى: مؤهل');
  assert.match(describeLeadChange({ status: 'lost', lostReason: 'x', lostNote: 'غالي' }, { status: 'negotiating' }), /^تغيير المرحلة من تفاوض إلى: خسارة/);
  assert.equal(describeLeadChange({ status: 'new' }, { status: 'new' }), '', 'the same stage is no change');
});

test('an assignment says from whom to whom, and names the person rather than the desk', () => {
  const before = { assignedTo: 'Sales Management' };
  assert.equal(describeLeadChange({ assignedTo: 'Sales Team A', ownerName: 'علي' }, before), 'تعيين المسؤول: من Sales Management إلى علي');
  assert.equal(describeLeadChange({ assignedTo: 'Sales Management' }, { assignedTo: 'Unassigned' }), 'تعيين المسؤول: Sales Management');
  assert.equal(describeLeadChange({ assignedTo: 'Sales Management' }, before), '', 'handing it to the same holder is no change');
  assert.equal(holderLabel({}), 'غير مسند');
});

test('a contact says how (the caller names it), a plain one says «تواصل مع العميل»', () => {
  assert.equal(describeLeadChange({ lastContactedAt: 'x', _logAction: 'اتصال بالعميل' }, {}), 'اتصال بالعميل');
  assert.equal(describeLeadChange({ lastContactedAt: 'x' }, {}), 'تواصل مع العميل');
});

test('field edits name the field and show old and new for the safe ones, never a phone or email', () => {
  const line = describeLeadChange({ budget: 3500000, area: 'new_sohag', phone: '01001234567', email: 'a@b.c', updatedAt: 'x', version: 3 }, { budget: 3000000, area: 'east', phone: '01000000000' });
  assert.equal(line, 'تعديل: رقم التليفون، الإيميل، الميزانية (من 3,000,000 إلى 3,500,000)، المنطقة (من east إلى new_sohag)');
  assert.ok(!line.includes('0100') && !line.includes('a@b.c'));
  assert.equal(describeLeadChange({ isArchived: true }, {}), 'تعديل: نقل للأرشيف');
});

test('bookkeeping alone writes no line', () => {
  assert.equal(describeLeadChange({ updatedAt: 'x', lastActivityAt: 'x', version: 2, stageHistory: [] }, {}), '');
  assert.equal(changeEntry({ updatedAt: 'x' }, {}), null);
});

test('several changes at once come in one line, in order', () => {
  assert.equal(
    describeLeadChange({ status: 'contacted', lastContactedAt: 'x', budget: 1000000 }, { status: 'new' }),
    'تغيير المرحلة من عميل محتمل إلى: مؤهل · تواصل مع العميل · تعديل: الميزانية (1,000,000)'
  );
});

test('the entry carries who did it', () => {
  const e = changeEntry({ status: 'contacted' }, { status: 'new' }, { agent: 'محمود', nowIso: '2026-11-19T10:00:00Z' });
  assert.deepEqual(e, { timestamp: '2026-11-19T10:00:00Z', action: 'تغيير المرحلة من عميل محتمل إلى: مؤهل', agent: 'محمود' });
  assert.equal('agent' in changeEntry({ status: 'contacted' }, { status: 'new' }), false);
});

test('the timeline starts with how the request arrived, once', () => {
  const lead = { createdAt: '2026-11-18T08:00:00Z', source: 'Facebook Ads', activityLogs: [{ timestamp: '2026-11-18T09:00:00Z', action: 'تعيين المسؤول: Sales Management', agent: 'النظام' }] };
  const { events } = buildTimeline(lead);
  assert.equal(events.length, 2);
  assert.equal(events.at(-1).text, 'وصل الطلب من: Facebook Ads');
  assert.equal(events.at(-1).kind, 'request');
  assert.equal(events[0].agent, 'النظام');
  const withFirst = buildTimeline({ createdAt: '2026-11-18T08:00:00Z', activityLogs: [{ timestamp: '2026-11-18T08:00:00Z', action: 'تسجيل العميل لأول مرة عبر المنصة' }] });
  assert.equal(withFirst.events.length, 1, 'no second arrival line when the log already has one');
});
