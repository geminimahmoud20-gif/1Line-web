// =============================================================
//  The client pipeline in one place: the stage order, which stages are open, and what each is called.
//  Reports, filters, the clients table, duplicate merging and the stage lock read it from here, so a
//  stage renamed or added changes everywhere at once. No imports: anything may use it.
//  The Kanban keeps its own column titles (plural headers and colours) in components/crm/KanbanPipeline.
// =============================================================

/** Pipeline order, first to last; a client further along has a higher rank */
export const PIPELINE = ['new', 'contacted', 'site_visit', 'negotiating', 'closing', 'closed'];

/** Stages of a client still being worked (not won, lost, unresponsive or archived) */
export const OPEN_STAGES = PIPELINE.slice(0, 5);

/** { stage: 0..5 }; a status outside the pipeline (lost, inactive) has no rank */
export const STAGE_RANK = Object.fromEntries(PIPELINE.map((s, i) => [s, i]));

/** What each stage is called on screen */
export const STAGE_NAMES = {
  new: { ar: 'عميل محتمل', en: 'Lead' },
  contacted: { ar: 'مؤهل', en: 'Qualified' },
  site_visit: { ar: 'اجتماع / معاينة', en: 'Meeting / viewing' },
  negotiating: { ar: 'تفاوض', en: 'Negotiation' },
  closing: { ar: 'إغلاق (توقيع وحجز)', en: 'Closing (signing & deposit)' },
  closed: { ar: 'إغلاق ناجح', en: 'Closed won' },
  inactive: { ar: 'غير متفاعل', en: 'Unresponsive' },
  lost: { ar: 'خسارة', en: 'Lost' },
};

/** Every status a client can have, in pipeline order then the two outcomes off it */
export const ALL_STATUSES = [...PIPELINE, 'inactive', 'lost'];

export const stageName = (id, isAr = true) => {
  const n = STAGE_NAMES[id || 'new'];
  return n ? (isAr ? n.ar : n.en) : String(id || '');
};

/**
 * How long a client may stay in each open stage before he counts as late (the reports' «تدفق الشغل», the KPIs).
 * From the company playbook's stage deliverables: a new client is qualified or turned away within a day, a qualified
 * one gets his nominations and a viewing booked within three days, a viewing round takes a week, an offer three days,
 * signing two. The first-reply promise (15 minutes / 2 hours) is a different clock: utils/crmLeadViews responseSlaMs.
 */
export const STAGE_LIMIT_HOURS = { new: 24, contacted: 72, site_visit: 168, negotiating: 72, closing: 48 };
