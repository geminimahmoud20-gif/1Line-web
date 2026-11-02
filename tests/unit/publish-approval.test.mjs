import test from 'node:test';
import assert from 'node:assert/strict';
import { approvalStamp, hasStaffIdentity, approveUpdate, rejectUpdate, blockedByApproval, isAwaitingApproval, demandEditStamp, approvalLabel } from '../../src/utils/publishApproval.js';

const now = '2026-10-31T12:00:00.000Z';

test('a staff save always waits for the general manager', () => {
  const live = { id: 'p1', price: 100, approval: 'approved', approvedAt: '2026-01-01' };
  const s = approvalStamp({ ...live, price: 120 }, { isManager: false, now });
  assert.equal(s.approval, 'pending');
  assert.equal(s.submittedAt, now);
  // No staff email on a public listing, and an older save's email is dropped
  assert.equal('submittedBy' in approvalStamp({ ...live, submittedBy: 'old@x.com' }, { isManager: false, now }), false);
  assert.equal(blockedByApproval(s), true);
  // Even an old item with no approval field
  assert.equal(approvalStamp({ id: 'p2' }, { isManager: false, now }).approval, 'pending');
  // Tombstones are not stamped
  assert.deepEqual(approvalStamp({ id: 'p3', deleted: true }, { isManager: false }), { id: 'p3', deleted: true });
});

test("the manager's own items go live; someone else's wait for «موافقة»", () => {
  const mine = approvalStamp({ id: 'p1' }, { isManager: true, now });
  assert.equal(mine.approval, 'approved');
  assert.equal('approvedBy' in mine, false);
  const waiting = { id: 'p2', approval: 'pending' };
  assert.equal(approvalStamp({ ...waiting, featured: true }, { isManager: true, now }).approval, 'pending');
  const approved = approvalStamp({ ...waiting, ...approveUpdate(now) }, { isManager: true, now });
  assert.equal(approved.approval, 'approved');
  assert.equal(hasStaffIdentity(approved), false);
  assert.equal(hasStaffIdentity({ id: 'x', approvedBy: 'gm@x.com' }), true);
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
