import { auth, db, isFirebaseConfigured } from '../firebase.js';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

// Reservation receipts (CRM → المالية والأقساط → إصدار إيصال حجز). Each one gets the next number
// of its year from counters/receipts_<year> in the same transaction that stores it in
// receipts/<number>, so two receipts can never share a number and every printed receipt has a
// record of who issued it, for whom, and how much. Finance staff and the super admin only.

export const receiptNumber = (year, seq) => `REC-${year}-${String(seq).padStart(4, '0')}`;

/**
 * record: { leadId, leadName, propertyId, propertyTitle, amount, method, totalPrice }
 * → { ok: true, number } or { ok: false, reason: 'offline' | 'forbidden' | 'error' }
 */
export const issueReceipt = async (record) => {
  if (!isFirebaseConfigured() || !db) return { ok: false, reason: 'offline' };
  const user = auth?.currentUser;
  if (!user) return { ok: false, reason: 'forbidden' };
  const year = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', year: 'numeric' }).format(new Date()));
  const counterRef = doc(db, 'counters', `receipts_${year}`);
  try {
    const number = await runTransaction(db, async (txn) => {
      const snap = await txn.get(counterRef);
      const seq = (snap.exists() ? Number(snap.data().last) || 0 : 0) + 1;
      const id = receiptNumber(year, seq);
      txn.set(counterRef, { last: seq, updatedAt: serverTimestamp() });
      txn.set(doc(db, 'receipts', id), {
        number: id,
        year,
        seq,
        leadId: String(record.leadId || ''),
        leadName: String(record.leadName || '').slice(0, 120),
        propertyId: String(record.propertyId || ''),
        propertyTitle: String(record.propertyTitle || '').slice(0, 200),
        amount: Math.round(Number(record.amount) || 0),
        totalPrice: Math.round(Number(record.totalPrice) || 0),
        method: String(record.method || ''),
        issuedBy: user.uid,
        issuedByName: user.displayName || user.email || '',
        issuedAt: serverTimestamp()
      });
      return id;
    });
    return { ok: true, number };
  } catch (error) {
    console.warn('Receipt not issued:', error?.code || error?.message || error);
    return { ok: false, reason: /permission/i.test(String(error?.code || error?.message)) ? 'forbidden' : 'error' };
  }
};
