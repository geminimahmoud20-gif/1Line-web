import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestNextStep, composeDue, reminderAt, dueReminders } from '../../src/utils/nextStep.js';

const NOW = new Date('2026-11-17T08:00:00').getTime();

test('suggestions follow the outcome', () => {
  assert.equal(suggestNextStep('interested', NOW).title, 'إرسال ترشيحات مناسبة');
  assert.equal(suggestNextStep('offer', NOW).day, '2026-11-19');
  assert.equal(suggestNextStep('viewing_set', NOW).needsTime, true);
  assert.equal(suggestNextStep('no_answer', NOW), null);
  assert.equal(suggestNextStep('not_fit', NOW), null);
});

test('composeDue needs a day, and a time for a viewing', () => {
  assert.equal(composeDue('2026-11-18', '10:00'), '2026-11-18T10:00');
  assert.equal(composeDue('2026-11-18', ''), '2026-11-18');
  assert.equal(composeDue('2026-11-18', '', { needsTime: true }), '');
  assert.equal(composeDue('', '10:00'), '');
});

test('reminder times: 15 min before, 60 for a viewing, 09:00 for a date-only task', () => {
  assert.equal(reminderAt({ dueAt: '2026-11-17T10:00', kind: 'call' }), new Date('2026-11-17T09:45:00').getTime());
  assert.equal(reminderAt({ dueAt: '2026-11-17T10:00', kind: 'visit' }), new Date('2026-11-17T09:00:00').getTime());
  assert.equal(reminderAt({ dueAt: '2026-11-17' }), new Date('2026-11-17T09:00:00').getTime());
  assert.equal(reminderAt({ dueAt: '' }), null);
});

test('dueReminders: mine, open, reached, not yet reminded', () => {
  const t = (id, dueAt, extra = {}) => ({ id, dueAt, kind: 'call', status: 'open', assigneeUid: 'u1', ...extra });
  const tasks = [t('a', '2026-11-17T08:10'), t('b', '2026-11-17T12:00'), t('c', '2026-11-17T08:05', { assigneeUid: 'u2' }), t('d', '2026-11-17T08:05', { status: 'done' }), t('e', '2026-11-17T08:14')];
  const ids = (r) => dueReminders(tasks, 'u1', NOW, r).map((x) => x.id);
  assert.deepEqual(ids({}), ['a', 'e']);
  assert.deepEqual(ids({ a: '2026-11-17T08:10' }), ['e']);
  assert.deepEqual(ids({ a: '2026-11-17T08:00' }), ['a', 'e']); // the task was moved: remind again
});

import { sourceText, campaignLabel } from '../../src/utils/crmLabels.js';
test('raw source and campaign values read as Arabic', () => {
  assert.equal(sourceText('Portals 1-Step (sell)'), 'نموذج سريع: عايز يبيع');
  assert.equal(sourceText('website'), 'الموقع');
  assert.equal(sourceText('حساب جديد'), 'حساب جديد');
  assert.equal(campaignLabel('owners-leads-soh-owners-nov26'), 'الملاك عملاء سوهاج الملاك نوفمبر 26');
  assert.equal(campaignLabel('حملة الصيف'), 'حملة الصيف');
  assert.equal(campaignLabel(''), '');
});

import { setCampaignNames, withCampaignName } from '../../src/utils/campaignNamesStore.js';
test('a name typed for a campaign wins over the guess', () => {
  assert.equal(campaignLabel('owners-leads-soh-owners-nov26'), 'الملاك عملاء سوهاج الملاك نوفمبر 26');
  setCampaignNames(withCampaignName('Owners-Leads-Soh-Owners-Nov26', 'ملاك سوهاج – نوفمبر'));
  assert.equal(campaignLabel('owners-leads-soh-owners-nov26'), 'ملاك سوهاج – نوفمبر');
  setCampaignNames({});
  assert.equal(campaignLabel('owners-leads-soh-owners-nov26'), 'الملاك عملاء سوهاج الملاك نوفمبر 26');
});

import { nameFromEmail, userDisplayName } from '../../src/utils/assignees.js';
test('a name from an email never shows the raw address', () => {
  assert.equal(nameFromEmail('mahmoudelbaz2593@gmail.com'), 'Mahmoudelbaz');
  assert.equal(nameFromEmail('sara.ali_7@x.com'), 'Sara Ali');
  assert.equal(userDisplayName({ displayName: 'د. محمود', email: 'a@b.c' }), 'د. محمود');
  assert.equal(userDisplayName({ email: 'omar.k@x.com' }), 'Omar K');
  assert.equal(userDisplayName(null, 'موظف'), 'موظف');
});
test('a finished task with nothing else planned suggests a follow-up', () => {
  const s = suggestNextStep('task_done', NOW);
  assert.equal(s.kind, 'call');
  assert.equal(s.day, '2026-11-18');
});

import { panelHeadline } from '../../src/utils/newLeadAlerts.js';
test('the bell\'s headline has no emoji and does not repeat the name', () => {
  const h = panelHeadline({ type: 'seller', name: 'مؤمن رمضان', details: { propertyType: 'villa', area: 'west', size: 180 } }, true);
  assert.ok(!/مؤمن/.test(h));
  assert.ok(!/^[\u{1F300}-\u{1FAFF}]/u.test(h));
  assert.ok(h.length > 3);
});
