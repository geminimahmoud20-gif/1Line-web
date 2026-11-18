import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, parseNoteLine } from '../../src/utils/clientTimeline.js';

test('the activity log is the timeline, newest first, with a kind for each entry', () => {
  const { events } = buildTimeline({ activityLogs: [
    { timestamp: '2026-11-17T09:00:00Z', action: 'نتيجة النشاط: لم يرد · محاولة 1' },
    { timestamp: '2026-11-17T11:00:00Z', action: 'طلب جديد من نفس العميل — بوابة بيع' },
    { timestamp: '2026-11-16T09:00:00Z', action: 'تسجيل العميل لأول مرة عبر المنصة' },
    { timestamp: '2026-11-17T10:00:00Z', action: 'ملاحظة عادية', kind: 'note', agent: 'محمود' }
  ] });
  assert.deepEqual(events.map((e) => e.kind), ['request', 'note', 'outcome', 'note']);
  assert.equal(events[1].agent, 'محمود');
  assert.ok(events[0].at > events[2].at);
});

test('older note lines follow, once; the client\'s words are kept apart', () => {
  const lead = {
    activityLogs: [{ timestamp: '2026-11-17T09:00:00Z', action: 'مكالمة: ما ردّش' }],
    notes: '[مكالمة 17/11 10:30]: ما ردّش\n[ملاحظة 16/11 09:00]: طلب مهلة\nوسيط عقاري | عندي محل للبيع'
  };
  const { events, words } = buildTimeline(lead);
  assert.equal(events.length, 3);
  assert.equal(events[0].legacy, false);
  assert.deepEqual(events.slice(1).map((e) => e.legacy), [true, true]);
  assert.match(events[1].meta, /مكالمة/);
  assert.match(words, /عندي محل للبيع/);
  assert.doesNotMatch(words, /طلب مهلة/);
});

test('nothing recorded is an empty timeline', () => {
  assert.deepEqual(buildTimeline({}).events, []);
  assert.deepEqual(buildTimeline(null).events, []);
});

test('an older line loses its emoji and «undefined»', () => {
  assert.deepEqual(parseNoteLine('📞 [10:30]: كلّمته في undefined'), { meta: '10:30', text: 'كلّمته في سوهاج' });
  assert.equal(parseNoteLine('   '), null);
});

import { isGeneratedOfferLine, withoutGeneratedOffer } from '../../src/utils/clientTimeline.js';
test('the sell form\'s own sentence is not the client\'s words', () => {
  const gen = 'المالك · عرض بيع منزل مستقل / فيلا في سوهاج غرب بمساحة 180م² · السعر المطلوب: 21,000,000 ج.م';
  assert.equal(isGeneratedOfferLine(gen), true);
  assert.equal(isGeneratedOfferLine('وسيط عقاري | عرض بيع شقة'), true);
  assert.equal(isGeneratedOfferLine('عايز أبيع بسرعة'), false);
  assert.equal(withoutGeneratedOffer(`${gen}\nعايز أبيع بسرعة`), 'عايز أبيع بسرعة');
  assert.equal(withoutGeneratedOffer(gen), '');
});
