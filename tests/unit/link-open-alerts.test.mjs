import test from 'node:test';
import assert from 'node:assert/strict';
import { linkOpenAlerts, linkOpenPayload, REOPEN_STEP } from '../../src/utils/linkOpenAlerts.js';

const open = (leadId, propertyId, count = 1, over = {}) => ({ id: `${leadId}__${propertyId}`, leadId, propertyId, ownerUid: 'u1', count, lastAt: '2026-11-19T10:00:00.000Z', ...over });
const leads = new Map([['L1', { name: 'أحمد', ownerUid: 'u1', status: 'new' }], ['L2', { name: 'سارة', ownerUid: 'u2', status: 'contacted' }], ['L3', { name: 'خسران', ownerUid: 'u1', status: 'lost' }], ['L4', { name: 'من غير مسؤول', status: 'new' }]]);
const titles = { p1: 'شقة سوهاج الجديدة', p2: 'فيلا الكوثر' };

test('each salesperson is told about their own clients, one entry per client', () => {
  const { byOwner } = linkOpenAlerts([open('L1', 'p1', 2), open('L1', 'p2', 1), open('L2', 'p1')], leads, titles);
  assert.deepEqual([...byOwner.keys()].sort(), ['u1', 'u2']);
  const a = byOwner.get('u1');
  assert.equal(a.length, 1);
  assert.deepEqual(a[0].items.map((i) => [i.title, i.count]), [['شقة سوهاج الجديدة', 2], ['فيلا الكوثر', 1]], 'the most opened first');
  assert.equal(a[0].total, 3);
});

test('a closed or lost client, an unknown one, and one nobody holds are not announced', () => {
  const { byOwner, next } = linkOpenAlerts([open('L3', 'p1'), open('GONE', 'p1'), open('L4', 'p1', 1, { ownerUid: '' })], leads, titles);
  assert.equal(byOwner.size, 0);
  assert.deepEqual(next, {});
});

test('the owner is the client\'s current one, falling back to who held it at the open', () => {
  const l = new Map([['L5', { name: 'ن', status: 'new' }]]);
  assert.deepEqual([...linkOpenAlerts([open('L5', 'p1', 1, { ownerUid: 'u9' })], l, titles).byOwner.keys()], ['u9']);
  const moved = new Map([['L1', { name: 'أحمد', ownerUid: 'u7', status: 'new' }]]);
  assert.deepEqual([...linkOpenAlerts([open('L1', 'p1', 1, { ownerUid: 'u1' })], moved, titles).byOwner.keys()], ['u7']);
});

test('the same pair is announced again only after a few more opens', () => {
  const first = linkOpenAlerts([open('L1', 'p1', 1)], leads, titles, {});
  assert.deepEqual(first.next, { 'L1__p1': 1 });
  assert.equal(first.byOwner.size, 1);
  assert.equal(linkOpenAlerts([open('L1', 'p1', 2)], leads, titles, first.next).byOwner.size, 0, 'a second open is not news');
  assert.equal(linkOpenAlerts([open('L1', 'p1', REOPEN_STEP)], leads, titles, first.next).byOwner.size, 0);
  const again = linkOpenAlerts([open('L1', 'p1', 1 + REOPEN_STEP)], leads, titles, first.next);
  assert.equal(again.byOwner.size, 1);
  assert.deepEqual(again.next, { 'L1__p1': 1 + REOPEN_STEP });
});

test('the push names the client and the listing, or counts several clients', () => {
  const one = linkOpenAlerts([open('L1', 'p1', 3), open('L1', 'p2', 1)], leads, titles).byOwner.get('u1');
  const p = linkOpenPayload(one);
  assert.equal(p.title, 'أحمد فتح الرابط اللي بعتّه');
  assert.equal(p.body, 'شقة سوهاج الجديدة (3 مرات) وفتح 1 تانيين. وقت مناسب تكلمه دلوقتي.');
  assert.equal(p.url, '/crm?tab=leads');
  const l = new Map([['A', { name: 'أ', ownerUid: 'u', status: 'new' }], ['B', { name: 'ب', ownerUid: 'u', status: 'new' }]]);
  const many = linkOpenAlerts([open('A', 'p1', 1, { lastAt: '2026-11-19T11:00:00.000Z' }), open('B', 'p1', 1)], l, titles).byOwner.get('u');
  const m = linkOpenPayload(many);
  assert.equal(m.title, '2 عملاء فتحوا الروابط اللي بعتّها');
  assert.match(m.body, /^أ، ب/, 'the latest first');
  assert.equal(linkOpenPayload([]), null);
});
