// =============================================================
//  The deal pipeline as the team sees it: عميل محتمل → مؤهل → اجتماع / معاينة → تفاوض → إغلاق,
//  plus two ways out: خسارة and غير متفاعل. The stored status ids stay the same so older leads, the
//  reports, commission and the rules keep working:
//    new = عميل محتمل · contacted = مؤهل · site_visit = اجتماع / معاينة · negotiating = تفاوض
//    closing + closed = إغلاق (a lead in the old «توقيع وحجز» step sits in the same column)
//    lost = خسارة · inactive = غير متفاعل (paused: left out of reminders and the inbox, not counted as lost)
//  Pure, so tests/unit/deal-stages.test.mjs runs it.
// =============================================================

/** The stage names by status id. «closing» is the old signing & deposit step, now part of «إغلاق». */
export const DEAL_STAGE_NAMES = {
  new: { ar: 'عميل محتمل', en: 'Lead' },
  contacted: { ar: 'مؤهل', en: 'Qualified' },
  site_visit: { ar: 'اجتماع / معاينة', en: 'Meeting / viewing' },
  negotiating: { ar: 'تفاوض', en: 'Negotiation' },
  closing: { ar: 'إغلاق (توقيع وحجز)', en: 'Closing (signing & deposit)' },
  closed: { ar: 'إغلاق', en: 'Closed' },
  lost: { ar: 'خسارة', en: 'Lost' },
  inactive: { ar: 'غير متفاعل', en: 'Unresponsive' }
};

/** The columns of the board, in order. «closing» leads are shown in the «closed» column. */
export const BOARD_STAGE_IDS = ['new', 'contacted', 'site_visit', 'negotiating', 'closed', 'inactive', 'lost'];

/** Stages a lead moves forward through (the first five columns) */
export const PROGRESS_STAGE_IDS = BOARD_STAGE_IDS.slice(0, 5);

/** The board column a status belongs to */
export const boardColumnOf = (status) => (status === 'closing' ? 'closed' : (status || 'new'));

/** A lead paused as غير متفاعل: out of reminders and the inbox, but not lost and not counted as a loss */
export const isInactiveLead = (lead) => lead?.status === 'inactive';

/** Name of a stage by status id; the id itself for a status we don't know */
export function dealStageName(status, isAr = true) {
  const n = DEAL_STAGE_NAMES[status || 'new'];
  return n ? (isAr ? n.ar : n.en) : String(status || '');
}
