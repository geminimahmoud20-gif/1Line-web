import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dmId, buildChat, buildMessage, afterSend, isUnread, unreadChats, sortChats, chatTitle, previewOf, MESSAGE_MAX } from '../../src/utils/privateChat.js';

test('one conversation per pair: the same id whoever opens it', () => {
  assert.equal(dmId('b', 'a'), dmId('a', 'b'));
  assert.equal(dmId('a', 'b'), 'dm_a_b');
});

test('a dm has two sorted members and its id; a group needs a name and 3+ people', () => {
  const dm = buildChat({ me: 'zed', others: ['amr'], now: 5 });
  assert.equal(dm.id, 'dm_amr_zed');
  assert.deepEqual(dm.data.members, ['amr', 'zed']);
  assert.deepEqual([dm.data.kind, dm.data.createdBy, dm.data.lastMessageAt], ['dm', 'zed', 0]);
  assert.equal(buildChat({ me: 'zed', others: ['zed'] }), null); // yourself is nobody
  assert.equal(buildChat({ me: 'zed', others: [] }), null);
  assert.equal(buildChat({ me: 'zed', others: ['a', 'b'], title: '   ' }), null); // a group has a name
  const g = buildChat({ me: 'zed', others: ['a', 'b', 'a'], title: '  فريق   المعاينات ' });
  assert.equal(g.id, null);
  assert.deepEqual(g.data.members, ['a', 'b', 'zed']);
  assert.equal(g.data.title, 'فريق المعاينات');
  assert.equal(buildChat({ me: 'me', others: Array.from({ length: 30 }, (_, i) => `u${i}`), title: 'x' }), null);
});

test('messages: trimmed, bounded, never empty', () => {
  const author = { uid: 'u1', name: ' منى ' };
  assert.equal(buildMessage({ text: '   ', author }), null);
  assert.equal(buildMessage({ text: 'x', author: {} }), null);
  const m = buildMessage({ text: ` اهلا\r\nبيك `, author, now: 9 });
  assert.deepEqual(m, { text: 'اهلا\nبيك', authorUid: 'u1', authorName: 'منى', createdAt: 9 });
  assert.equal(buildMessage({ text: 'a'.repeat(MESSAGE_MAX + 50), author }).text.length, MESSAGE_MAX);
  assert.deepEqual(afterSend(m), { lastMessageAt: 9, lastMessageText: 'اهلا بيك', lastSenderUid: 'u1' });
  assert.ok(previewOf('ب'.repeat(300)).length <= 120);
});

test('unread: a message from someone else newer than what this person has seen', () => {
  const chat = { lastMessageAt: 100, lastSenderUid: 'amr', reads: { me: 50, amr: 100 } };
  assert.equal(isUnread(chat, 'me'), true);
  assert.equal(isUnread(chat, 'amr'), false); // their own message
  assert.equal(isUnread({ ...chat, reads: { me: 100 } }, 'me'), false);
  assert.equal(isUnread({ lastMessageAt: 0 }, 'me'), false); // nothing written yet
  assert.equal(isUnread({ lastMessageAt: 5, lastSenderUid: 'amr' }, 'me'), true); // never opened
  assert.equal(unreadChats([chat, { ...chat, reads: { me: 100 } }], 'me'), 1);
});

test('the list: newest first, titled by the colleague or the group', () => {
  const a = { id: 'a', createdAt: 1, lastMessageAt: 0 };
  const b = { id: 'b', createdAt: 1, lastMessageAt: 50 };
  const c = { id: 'c', createdAt: 70, lastMessageAt: 0 };
  assert.deepEqual(sortChats([a, b, c]).map((x) => x.id), ['c', 'b', 'a']);
  const people = [{ uid: 'amr', name: 'عمرو' }];
  assert.equal(chatTitle({ kind: 'dm', members: ['amr', 'me'] }, 'me', people), 'عمرو');
  assert.equal(chatTitle({ kind: 'dm', members: ['x', 'me'] }, 'me', people), 'زميل');
  assert.equal(chatTitle({ kind: 'group', title: 'فريق أ', members: [] }, 'me', people), 'فريق أ');
});
