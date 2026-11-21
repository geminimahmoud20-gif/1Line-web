// =============================================================
//  The stage lock. A client moves forward only when the team logged what happened (an activity outcome):
//  «تم التواصل», «تم تحديد موعد معاينة», … A negative outcome carries a reason, and going back to an
//  earlier stage is for managers. One function, checkStageChange, is asked by every place that changes
//  a stage (CRM → PropertiesContext.handleUpdateLead, the board, the drawer, the clients table).
//  The table STAGE_RULES says, per stage, the activity and the outcomes. Pure: tests/unit/stage-gate.test.mjs
// =============================================================
import { toMs, leadCreatedMs, LOST_REASONS } from './crmLeadViews.js';

export const OUTCOMES = [
  { id: 'reached', ar: 'تم التواصل', kind: 'positive' },
  { id: 'interested', ar: 'مهتم ويبحث بجدية', kind: 'positive' },
  { id: 'viewing_set', ar: 'تم تحديد موعد معاينة', kind: 'positive' },
  { id: 'viewing_done', ar: 'تمت المعاينة', kind: 'positive' },
  { id: 'offer', ar: 'تم تقديم عرض', kind: 'positive' },
  { id: 'agreed', ar: 'اتفاق / حجز', kind: 'positive' },
  { id: 'callback', ar: 'طلب مهلة / كلّمني بعدين', kind: 'neutral' },
  { id: 'no_answer', ar: 'لم يرد', kind: 'neutral' },
  { id: 'not_fit', ar: 'غير مناسب', kind: 'negative' },
  { id: 'wrong_number', ar: 'رقم غلط', kind: 'negative' },
  { id: 'closed_reason', ar: 'مغلق + سبب', kind: 'negative' }
];
export const outcomeById = (id) => OUTCOMES.find((o) => o.id === id) || null;
export const isNegativeOutcome = (id) => outcomeById(id)?.kind === 'negative';
export const isPositiveOutcome = (id) => outcomeById(id)?.kind === 'positive';

/** The call prompt's answers (utils/callOutcomes) as outcomes */
export const OUTCOME_OF_CALL = { answered: 'reached', no_answer: 'no_answer', busy: 'callback', wrong: 'wrong_number' };

/** Attempts after which «لم يرد» may move the client to غير متفاعل */
export const MAX_ATTEMPTS = 3;

// The table: per stage, what the team does there, which outcomes can be logged in it, and which outcomes let a
// client in. «entry» empty = nothing is needed (the first stage). Ids are the stored statuses.
export const STAGE_RULES = [
  { id: 'new', ar: 'عميل محتمل', activity: 'أول اتصال خلال 15 دقيقة', outcomes: ['no_answer', 'callback', 'reached', 'not_fit', 'wrong_number'], entry: [] },
  { id: 'contacted', ar: 'مؤهل (تم التواصل)', activity: 'الكلام مع العميل وتحديد الميزانية والمنطقة والغرض', outcomes: ['reached', 'interested', 'callback', 'no_answer', 'viewing_set', 'not_fit'], entry: ['reached', 'interested', 'viewing_set', 'viewing_done', 'offer', 'agreed'] },
  { id: 'site_visit', ar: 'اجتماع / معاينة', activity: 'تحديد موعد المعاينة وتنفيذها', outcomes: ['viewing_set', 'viewing_done', 'callback', 'no_answer', 'not_fit'], entry: ['viewing_set', 'viewing_done', 'offer', 'agreed'] },
  { id: 'negotiating', ar: 'تفاوض', activity: 'تقديم العرض والتفاوض على السعر', outcomes: ['offer', 'agreed', 'callback', 'no_answer', 'not_fit'], entry: ['viewing_done', 'offer', 'agreed'] },
  { id: 'closing', ar: 'إغلاق (توقيع وحجز)', activity: 'الحجز وتجهيز العقد', outcomes: ['agreed', 'offer', 'callback'], entry: ['offer', 'agreed'] },
  { id: 'closed', ar: 'إغلاق', activity: 'توقيع العقد وتسجيل السعر المنفذ', outcomes: ['agreed', 'closed_reason'], entry: ['agreed'] },
  { id: 'inactive', ar: 'غير متفاعل', activity: `بعد ${MAX_ATTEMPTS} محاولات بلا رد، أو لو العميل أجّل`, outcomes: ['no_answer', 'callback'], entry: 'any' },
  { id: 'lost', ar: 'خسارة', activity: 'تسجيل نتيجة سلبية وسببها', outcomes: ['not_fit', 'wrong_number', 'closed_reason'], entry: 'any' }
];
export const stageRule = (id) => STAGE_RULES.find((s) => s.id === id) || null;

const ORDER = ['new', 'contacted', 'site_visit', 'negotiating', 'closing', 'closed'];
const rankOf = (s) => ORDER.indexOf(s || 'new');
const SIDE = ['inactive', 'lost'];

/** The roles that may move a client back */
const MANAGER_ROLES = ['super_admin', 'admin', 'sales_manager'];
export const isManagerRole = (role) => MANAGER_ROLES.includes(role);

/** Every logged outcome of a lead, oldest first: [{ id, at, reason }] (the call prompt's answers included) */
export function outcomesOf(lead = {}) {
  const own = (Array.isArray(lead.outcomes) ? lead.outcomes : []).map((e) => ({ id: e?.id, at: toMs(e?.at), reason: e?.reason || '' }));
  // A call answer is also saved as an outcome at the same moment: count it once
  const seen = new Set(own.map((e) => `${e.id}@${e.at}`));
  const calls = (Array.isArray(lead.callOutcomes) ? lead.callOutcomes : []).map((e) => ({ id: OUTCOME_OF_CALL[e?.o], at: toMs(e?.at), reason: '' }))
    .filter((e) => !seen.has(`${e.id}@${e.at}`));
  return [...own, ...calls].filter((e) => e.id && e.at).sort((a, b) => a.at - b.at);
}

/** When the client entered the stage it is in now */
export function stageEnteredMs(lead = {}) {
  const status = lead.status || 'new';
  const h = Array.isArray(lead.stageHistory) ? lead.stageHistory.filter((e) => e && e.s === status && e.at) : [];
  return h.length ? toMs(h[h.length - 1].at) : leadCreatedMs(lead) || 0;
}

/** Outcomes logged since the client entered its current stage */
export const outcomesSinceEntry = (lead) => {
  const since = stageEnteredMs(lead);
  return outcomesOf(lead).filter((e) => e.at >= since);
};

/** Tries in a row that ended with no answer (resets when someone answers) */
export function attemptsOf(lead) {
  const list = outcomesOf(lead);
  let n = 0;
  for (let i = list.length - 1; i >= 0 && list[i].id === 'no_answer'; i--) n += 1;
  return n;
}

/** A logged outcome; null for an unknown outcome, or a negative one without a reason */
export function outcomeEntry(id, me = {}, { reason = '', note = '' } = {}, now = Date.now()) {
  const o = outcomeById(id);
  if (!o) return null;
  if (o.kind === 'negative' && !LOST_REASONS.some((r) => r.id === reason)) return null;
  return {
    id,
    at: new Date(now).toISOString(),
    by: String(me.uid || ''),
    n: String(me.name || '').slice(0, 40),
    ...(reason ? { reason } : {}),
    ...(note ? { note: String(note).slice(0, 200) } : {})
  };
}

/** The fields to save when an outcome is logged: the list (last 30), the latest and the attempts, plus the history line */
export function outcomePatchFor(lead = {}, entry) {
  if (!entry) return null;
  const outcomes = [...(Array.isArray(lead.outcomes) ? lead.outcomes : []), entry].slice(-30);
  const attempts = attemptsOf({ ...lead, outcomes, callOutcomes: lead.callOutcomes });
  const o = outcomeById(entry.id);
  const reason = LOST_REASONS.find((r) => r.id === entry.reason)?.ar;
  const line = `${o.ar}${entry.id === 'no_answer' ? ` · محاولة ${attempts}` : ''}${reason ? ` — ${reason}` : ''}${entry.note ? ` (${entry.note})` : ''}`;
  return {
    outcomes,
    lastOutcome: entry.id,
    lastOutcomeAt: entry.at,
    outcomeAttempts: attempts,
    ...(o.kind === 'positive' || entry.id === 'callback' ? { lastContactedAt: entry.at } : {}),
    lastActivityAt: entry.at,
    activityLogs: [{ timestamp: entry.at, action: `نتيجة النشاط: ${line}`, kind: 'outcome', outcome: entry.id, ...(entry.n ? { agent: entry.n } : {}) }, ...(Array.isArray(lead.activityLogs) ? lead.activityLogs : [])].slice(0, 100)
  };
}

/** «لم يرد · محاولة 2» for the clients table; '' when nothing was logged */
export function lastOutcomeLabel(lead = {}) {
  const list = outcomesOf(lead);
  const last = list[list.length - 1];
  if (!last) return '';
  const o = outcomeById(last.id);
  if (!o) return '';
  const attempts = attemptsOf(lead);
  return last.id === 'no_answer' && attempts > 0 ? `${o.ar} · محاولة ${attempts}` : o.ar;
}

const names = (ids) => ids.map((id) => `«${outcomeById(id)?.ar}»`).join(' أو ');

/**
 * May this patch change the lead's stage? { ok: true } or { ok: false, code, message }.
 * code: 'outcome' (log what happened first) | 'reason' | 'manager' (going back is for managers).
 * patch._undo (the Undo button) is let through. opts: { isManager }.
 */
export function checkStageChange(lead, patch = {}, opts = {}) {
  const from = lead?.status || 'new';
  const to = patch.status;
  if (!to || to === from || patch._undo) return { ok: true };
  const merged = { ...lead, ...patch };
  const since = outcomesSinceEntry(merged);
  const positive = since.filter((e) => isPositiveOutcome(e.id));
  const toName = stageRule(to)?.ar || to;
  const need = (ids) => ({ ok: false, code: 'outcome', message: `قبل ما تنقل العميل لـ «${toName}» سجّل نتيجة النشاط: ${names(ids)}.` });
  const manager = () => ({ ok: false, code: 'manager', message: 'الرجوع لمرحلة أسبق للمدير بس.' });

  // Out of the sides
  if (SIDE.includes(from)) {
    if (opts.isManager) return { ok: true };
    if (from === 'inactive' && positive.length && !SIDE.includes(to)) return { ok: true };
    return from === 'inactive' ? need(['reached', 'interested']) : manager();
  }
  if (from === 'closed' && !opts.isManager) return manager();

  // Into the sides: something was logged, and a lost client has its reason
  if (SIDE.includes(to)) {
    if (!since.length) return { ok: false, code: 'outcome', message: `قبل ما تنقل العميل لـ «${toName}» سجّل نتيجة النشاط الأول (مثلاً ${names(to === 'lost' ? ['not_fit'] : ['no_answer'])}).` };
    if (to === 'lost' && !merged.lostReason) return { ok: false, code: 'reason', message: 'سجّل سبب الخسارة.' };
    return { ok: true };
  }

  const r = rankOf(to);
  if (r < rankOf(from)) return opts.isManager ? { ok: true } : manager();
  const entry = stageRule(to)?.entry;
  const allowed = Array.isArray(entry) ? entry : [];
  if (!allowed.length) return { ok: true };
  return positive.some((e) => allowed.includes(e.id)) ? { ok: true } : need(allowed);
}

/** A positive outcome on a brand-new client moves it to «مؤهل» in the same save; { lose } closes it as lost for a negative one (the lock accepts it: the outcome is in the patch) */
export function outcomeSave(lead = {}, entry, { lose = false } = {}) {
  const patch = outcomePatchFor(lead, entry);
  if (!patch) return null;
  if ((lead.status || 'new') === 'new' && isPositiveOutcome(entry.id)) patch.status = 'contacted';
  // «غير مناسب» / «رقم غلط» can close the deal in the same tap: the stage becomes خسارة with the same reason
  if (lose && isNegativeOutcome(entry.id) && entry.reason) {
    patch.status = 'lost';
    patch.lostReason = entry.reason;
    if (entry.note) patch.lostNote = entry.note;
  }
  return patch;
}

/**
 * For a screen that is about to change a stage: true when allowed; otherwise it shows the reason and returns false.
 * (The save itself asks again, so a screen that forgets can never skip the lock.)
 */
export function guardStage(lead, patch, { role, isManager, toast } = {}) {
  const r = checkStageChange(lead, patch, { isManager: isManager ?? isManagerRole(role) });
  if (!r.ok) toast?.(r.message, 'error');
  return r.ok;
}

/** What the team did right after a «لم يرد» / «كلّمني بعدين»: the quick notes under «حصل إيه؟» (stored as a history line) */
export const FOLLOW_UP_ACTIONS = [
  { id: 'whatsapp', ar: 'بعتّله واتساب', en: 'Sent a WhatsApp' },
  { id: 'voice', ar: 'سبت رسالة صوتية', en: 'Left a voice message' },
  { id: 'sms', ar: 'بعتّله رسالة SMS', en: 'Sent an SMS' },
  { id: 'retry', ar: 'هحاول تاني', en: 'Will try again' }
];
