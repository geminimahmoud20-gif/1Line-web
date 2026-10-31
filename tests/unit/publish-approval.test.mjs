import test from 'node:test';
import assert from 'node:assert/strict';
import { approvalStamp, approveUpdate, rejectUpdate, blockedByApproval, isAwaitingApproval, demandEditStamp, approvalLabel } from '../../src/utils/publishApproval.js';

const now = '2026-10-31T12:00:00.000Z';

test('a staff save always waits for the general manager', () => {
  const live = { id: 'p1', price: 100, approval: 'approved', approvedAt: '2026-01-01' };
  const s = approvalStamp({ ...live, price: 120 }, { isManager: false, who: 'agent@x.com', now });
  assert.equal(s.approval, 'pending');
  assert.equal(s.submittedBy, 'agent@x.com');
  assert.equal(blockedByApproval(s), true);
  // Even an old item with no approval field
  assert.equal(approvalStamp({ id: 'p2' }, { isManager: false, now }).approval, 'pending');
  // Tombstones are not stamped
  assert.deepEqual(approvalStamp({ id: 'p3', deleted: true }, { isManager: false }), { id: 'p3', deleted: true });
});

test("the manager's own items go live; someone else's wait for «موافقة»", () => {
  const mine = approvalStamp({ id: 'p1' }, { isManager: true, who: 'gm@x.com', now });
  assert.equal(mine.approval, 'approved');
  assert.equal(mine.approvedBy, 'gm@x.com');
  const waiting = { id: 'p2', approval: 'pending' };
  assert.equal(approvalStamp({ ...waiting, featured: true }, { isManager: true, now }).approval, 'pending');
  const approved = approvalStamp({ ...waiting, ...approveUpdate(now) }, { isManager: true, who: 'gm@x.com', now });
  assert.equal(approved.approval, 'approved');
  assert.equal(approved.approvedBy, 'gm@x.com');
  assert.equal(approved.approvedAt, now);
  const rejected = approvalStamp({ ...waiting, ...rejectUpdate(now) }, { isManager: true, now });
  assert.equal(rejected.approval, 'rejected');
  assert.equal(blockedByApproval(rejected), true);
  assert.equal(isAwaitingApproval(rejected), false);
});

test('items saved before approval existed stay on the site', () => {
  assert.equal(blockedByApproval({ id: 'old' }), false);
  assert.equal(approvalLabel({ id: 'old' }), '');
  assert.equal(approvalLabel({ approval: 'pending' }), 'بانتظار موافقة المدير العام');
});

test('buyer requests: staff cannot publish, and editing a published text sends it back', () => {
  assert.equal(demandEditStamp({ status: 'pending' }, { status: 'published' }).status, 'pending');
  assert.equal(demandEditStamp({ status: 'published', budget: 1 }, { budget: 2 }).status, 'pending');
  assert.equal(demandEditStamp({ status: 'published', budget: 1 }, { notes: 'call later' }).status, undefined);
  assert.equal(demandEditStamp({ status: 'pending' }, { status: 'published' }, { isManager: true }).status, 'published');
});
