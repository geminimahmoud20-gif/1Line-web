// =============================================================
//  What a buyer is asking for, in one shape, whoever he is: a client who answered «رشح لي عقاري» on the
//  site, a client the team entered by hand (kind, area, budget, and what the advisor wrote in «طلب العميل»),
//  or a buyer request. Matching (utils/matchingEngine) always scores a listing against this shape, so the
//  alerts, the matching screen and the client's own file agree. Pure: tests/unit/buyer-request.test.mjs.
// =============================================================
import { assetClass } from './marketStats.js';
import { KINDS, cleanAnswers, FAMILY_SIZES } from './buyerMatch.js';
import { normalizeAreaKey } from './areasData.js';
import { parseMoney } from './crmLeadViews.js';

const KIND_IDS = new Set(KINDS.map((k) => k.id));
const text = (v) => String(v ?? '').trim();

/** Bedrooms → the family size whose need they cover (the matching asks for rooms by family) */
const familyForRooms = (rooms) => {
  const r = Number(rooms) || 0;
  if (!r) return '';
  return (FAMILY_SIZES.find((f) => f.rooms >= r) || FAMILY_SIZES[FAMILY_SIZES.length - 1]).id;
};

const kindFrom = (type) => {
  const t = text(type);
  if (!t) return '';
  const cls = assetClass({ type: t });
  if (KIND_IDS.has(cls)) return cls;
  return KIND_IDS.has(t) ? t : '';
};

/** The fields the advisor can fill in «طلب العميل» (what the editor saves into details.matchAnswers) */
export const REQUEST_EDIT_FIELDS = ['kind', 'areas', 'payment', 'budget', 'down', 'monthly', 'minSize', 'family', 'delivery', 'purpose'];

/**
 * The request of a lead or buyer request:
 *   answers  — in the shape utils/buyerMatch scores (kind, areas, payment, budget, down, monthly, minSize, family, delivery, purpose, priorities)
 *   complete — he answered the website's questions himself: what he left out really is «any»
 *   source   — where the answers came from: 'wizard' | 'advisor' | 'fields'
 */
export function requestOf(source = {}) {
  const lead = source || {};
  const d = lead.details || {};
  const saved = d.matchAnswers && typeof d.matchAnswers === 'object' ? d.matchAnswers : null;

  // From what a CRM client carries (or a buyer request): the plain fields
  const money = parseMoney(d.budget) || parseMoney(d.expectedPrice) || parseMoney(lead.budget);
  const installments = /تقسيط|installment/i.test(`${d.paymentMethod || lead.paymentMethod || ''} ${d.payment || ''}`);
  const area = normalizeAreaKey(d.area || lead.area || '');
  const base = {
    kind: kindFrom(d.propertyType || lead.propertyType || lead.type_ar || lead.propertyKind || (KIND_IDS.has(text(lead.type)) || assetClass({ type: lead.type }) !== 'other' ? lead.type : '')),
    areas: area && area !== 'all' ? [area] : [],
    payment: installments ? 'installments' : 'cash',
    budget: money ? String(money) : '',
    minSize: text(d.minSize || lead.minSize),
    family: familyForRooms(d.bedrooms || d.rooms || lead.bedrooms),
    priorities: []
  };

  if (!saved) return { answers: base, complete: false, source: 'fields' };

  const clean = cleanAnswers(saved);
  const wizard = Boolean(saved.kind && saved.payment && !saved.advisor);
  // What was written down wins; whatever is empty there still comes from the client's plain fields
  const merged = { ...base };
  for (const [key, value] of Object.entries(clean)) {
    const empty = value === '' || value == null || (Array.isArray(value) && value.length === 0);
    if (!empty) merged[key] = value;
  }
  // payment is always set by cleanAnswers; keep the plain field's reading when the advisor never chose
  if (!saved.payment) merged.payment = base.payment;
  return { answers: merged, complete: wizard, source: wizard ? 'wizard' : 'advisor' };
}

/** What the request lacks that makes a match uncertain, as readable words (empty when it is complete enough) */
export function missingInRequest(answers = {}) {
  const out = [];
  if (!answers.kind) out.push('نوع العقار');
  if (!(answers.areas || []).length && !answers.anyArea) out.push('المنطقة');
  const priced = answers.payment === 'cash' ? parseMoney(answers.budget) : (parseMoney(answers.down) || parseMoney(answers.monthly) || parseMoney(answers.budget));
  if (!priced) out.push(answers.payment === 'cash' ? 'الميزانية' : 'المقدم أو القسط');
  return out;
}
