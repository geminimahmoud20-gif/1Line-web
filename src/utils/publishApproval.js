// =============================================================
//  Publishing needs the general manager (المدير العام).
//  Listings and projects carry `approval`: 'pending' (waiting), 'rejected', or 'approved'.
//  Items saved before this existed have no field and count as approved.
//  Anyone else's save is stamped 'pending' and stays off the site until approved; firestore.rules
//  refuses any other value from them, and /api/catalog drops non-approved items for visitors.
//  Listings are public documents, so no staff identity (email, uid) is stamped on them:
//  STAFF_IDENTITY_FIELDS are dropped on every save (older saves carried the staff email there).
//  Pure functions (tests/unit/publish-approval.test.mjs).
// =============================================================

export const APPROVAL = { pending: 'pending', rejected: 'rejected', approved: 'approved' };

/** Waiting for the general manager */
export const isAwaitingApproval = (item) => item?.approval === APPROVAL.pending;

/** Not allowed on the site yet: waiting, or sent back */
export const blockedByApproval = (item) => item?.approval === APPROVAL.pending || item?.approval === APPROVAL.rejected;

/** Fields older saves wrote with the staff member's email; never written now */
export const STAFF_IDENTITY_FIELDS = ['submittedBy', 'approvedBy'];

const withoutStaffIdentity = (item) => {
  const out = { ...item };
  for (const k of STAFF_IDENTITY_FIELDS) delete out[k];
  return out;
};

/** Whether a saved item still carries a staff identity field */
export const hasStaffIdentity = (item) => Boolean(item) && STAFF_IDENTITY_FIELDS.some((k) => k in item);

/**
 * The item as it should be saved. `isManager`: the signed-in account is the general manager.
 * Anyone else's save sends it for approval. The manager's own items go live; an item someone
 * else sent stays waiting (or rejected) until the manager presses «موافقة» (approveUpdate),
 * so pinning or fixing a typo on it doesn't approve it by accident.
 */
export function approvalStamp(item, { isManager = false, now = new Date().toISOString() } = {}) {
  if (!item || item.deleted) return item;
  const clean = withoutStaffIdentity(item);
  if (!isManager) return { ...clean, approval: APPROVAL.pending, submittedAt: now };
  if (clean.approval === APPROVAL.pending || clean.approval === APPROVAL.rejected) return clean;
  return { ...clean, approval: APPROVAL.approved, approvedAt: clean.approvedAt || now };
}

/** The manager's «موافقة»: the update that puts a waiting item on the site */
export const approveUpdate = (now = new Date().toISOString()) => ({ approval: APPROVAL.approved, approvedAt: now, rejectedAt: '' });

/** The manager's «رفض»: stays off the site; the next edit by staff sends it back for approval */
export const rejectUpdate = (now = new Date().toISOString()) => ({ approval: APPROVAL.rejected, rejectedAt: now });

/** What a public demand edit touches: changing these on a published request sends it back for approval */
export const PUBLIC_DEMAND_CONTENT = ['text_ar', 'text_en', 'area', 'area_ar', 'area_en', 'type', 'budget', 'paymentMethod', 'timeframe', 'urgency', 'minSize'];

/**
 * A staff edit to a buyer request: someone other than the manager can't publish, and editing the
 * public text of a published request takes it off the site until the manager approves it again.
 */
export function demandEditStamp(current, updates, { isManager = false } = {}) {
  if (isManager) return updates;
  const next = { ...updates };
  if (next.status === 'published' && current?.status !== 'published') next.status = 'pending';
  if (current?.status === 'published' && next.status === undefined
      && PUBLIC_DEMAND_CONTENT.some((k) => k in next && next[k] !== current[k])) {
    next.status = 'pending';
  }
  return next;
}

export const approvalLabel = (item, isAr = true) => {
  if (item?.approval === APPROVAL.pending) return isAr ? 'بانتظار موافقة المدير العام' : 'Waiting for approval';
  if (item?.approval === APPROVAL.rejected) return isAr ? 'مرفوض من المدير العام' : 'Rejected';
  return '';
};
