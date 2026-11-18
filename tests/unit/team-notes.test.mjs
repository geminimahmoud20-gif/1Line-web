import test from 'node:test';
import assert from 'node:assert/strict';
import { mentionedUids, mentionSegments, mentionDraft, buildNote, noteSnippet, sortNotes, sortMentions, unreadMentions, NOTE_MAX } from '../../src/utils/teamNotes.js';

const people = [
  { uid: 'u1', name: 'أحمد علي' },
  { uid: 'u2', name: 'منى سعيد' },
  { uid: 'u3', name: 'أحمد حسن' },
  { uid: 'u4', name: 'Sara Adel' }
];

test('@mentions match full names, and a first name only when it is unique', () => {
  assert.deepEqual(mentionedUids('@أحمد علي بص على العميل ده', people), ['u1']);
  assert.deepEqual(mentionedUids('@منى ردي عليه', people), ['u2']);
  assert.deepEqual(mentionedUids('@أحمد ردي', people), []); // two Ahmeds: not guessed
  assert.deepEqual(mentionedUids('@Sara تمام', people), ['u4']);
  assert.deepEqual(mentionedUids('@sara adel تمام', people), ['u4']);
});

test('a mention needs its whole word, skips yourself and repeats, and caps at ten', () => {
  assert.deepEqual(mentionedUids('@منىي', people), []);
  assert.deepEqual(mentionedUids('@منى و @منى سعيد', people), ['u2']);
  assert.deepEqual(mentionedUids('@منى سعيد', people, 'u2'), []);
  assert.deepEqual(mentionedUids('no at sign', people), []);
  const many = Array.from({ length: 15 }, (_, i) => ({ uid: `x${i}`, name: `شخص${i}ا` }));
  assert.equal(mentionedUids(many.map((p) => `@${p.name}`).join(' '), many).length, 10);
});

test('a note carries its mentions and one notification per person', () => {
  const r = buildNote({ entityType: 'lead', entityId: 'L1', entityName: 'عبدالعزيز', text: '  @منى سعيد كلميه النهارده  ', author: { uid: 'u1', name: 'أحمد علي' }, people, now: new Date('2026-11-14T10:00:00Z') });
  assert.equal(r.note.text, '@منى سعيد كلميه النهارده');
  assert.deepEqual(r.note.mentions, ['u2']);
  assert.equal(r.mentions.length, 1);
  assert.deepEqual(r.mentions[0], { toUid: 'u2', fromUid: 'u1', fromName: 'أحمد علي', entityType: 'lead', entityId: 'L1', entityName: 'عبدالعزيز', snippet: '@منى سعيد كلميه النهارده', createdAt: '2026-11-14T10:00:00.000Z' });
});

test('empty or too long notes are refused', () => {
  const base = { entityType: 'team', entityId: 'general', author: { uid: 'u1', name: 'أ' }, people };
  assert.deepEqual(buildNote({ ...base, text: '   ' }), { error: 'empty' });
  assert.deepEqual(buildNote({ ...base, text: 'x'.repeat(NOTE_MAX + 1) }), { error: 'too-long' });
  assert.deepEqual(buildNote({ ...base, entityType: 'weird', text: 'hi' }), { error: 'empty' });
  assert.ok(buildNote({ ...base, text: 'x'.repeat(NOTE_MAX) }).note);
});

test('ordering helpers and snippets', () => {
  assert.deepEqual(sortNotes([{ id: 2, createdAt: 'b' }, { id: 1, createdAt: 'a' }]).map((n) => n.id), [1, 2]);
  const list = [{ id: 'old-read', createdAt: '3', readAt: 'x' }, { id: 'new-unread', createdAt: '2' }, { id: 'old-unread', createdAt: '1' }];
  assert.deepEqual(sortMentions(list).map((m) => m.id), ['new-unread', 'old-unread', 'old-read']);
  assert.equal(unreadMentions(list), 2);
  assert.equal(noteSnippet('a\n\n b   c', 50), 'a b c');
  assert.equal(noteSnippet('x'.repeat(200), 10), `${'x'.repeat(9)}…`);
});

test('mentions are cut out of the text for highlighting, and the one being typed is found at the caret', () => {
  assert.deepEqual(mentionSegments('شوف @منى سعيد ورد', people), [{ text: 'شوف ', mention: false }, { text: '@منى سعيد', mention: true }, { text: ' ورد', mention: false }]);
  assert.deepEqual(mentionSegments('من غير', people), [{ text: 'من غير', mention: false }]);
  assert.deepEqual(mentionDraft('شوف @من', 7), { query: 'من', start: 4 });
  assert.deepEqual(mentionDraft('@', 1), { query: '', start: 0 });
  assert.equal(mentionDraft('mail@x', 6), null);
  assert.equal(mentionDraft('شوف @منى سعيد ', 14), null);
});
