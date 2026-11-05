// =============================================================
//  «رشّحلي عقاري»: how well a listed property fits a buyer's qualifying answers (the kind of
//  property, what it is for, area, family size or minimum size, ready now or can wait, cash budget
//  or down payment + monthly installment, and what matters most). Only properties of the kind asked
//  for are ranked; each part scores 0..1 with a reason the buyer can read, and parts the buyer
//  marked as most important weigh more. Pure: tests/unit/buyer-match.test.mjs.
// =============================================================
import { assetClass, liveListings } from './marketStats.js';
import { paymentTerms, hasInstallmentPlan } from './paymentTerms.js';
import { finishingGroupOf } from './unitHandover.js';
import { inArea } from './areaLookup.js';

/**
 * The kinds of property a buyer can ask for, one per market (utils/marketStats assetClass).
 * `home`: a family lives in it (rooms matter); `handover`: it can be bought before it is built.
 */
export const KINDS = [
  { id: 'residential', ar: 'شقة', sub: 'شقق ودوبلكس وروف', home: true, handover: true },
  { id: 'villa', ar: 'فيلا أو بيت', sub: 'فيلا، تاون هاوس، بيت مستقل', home: true, handover: true },
  { id: 'commercial', ar: 'محل أو معرض', sub: 'محلات ومعارض ومولات', handover: true },
  { id: 'administrative', ar: 'مكتب أو عيادة', sub: 'إداري وطبي', handover: true },
  { id: 'building', ar: 'عمارة أو مبنى كامل', sub: 'للسكن أو الإيجار', handover: true },
  { id: 'land', ar: 'أرض مباني', sub: 'أرض للبناء عليها' },
  { id: 'agricultural', ar: 'أرض زراعية', sub: 'أطيان ومزارع' },
  { id: 'industrial', ar: 'صناعي أو مخزن', sub: 'مصانع ومخازن وأراضي صناعية', handover: true }
];
export const kindOf = (id) => KINDS.find((k) => k.id === id) || KINDS[0];

/** What it is for, per kind: [{ id, ar, sub }] (the first is «use it myself», the second «invest») */
export function purposesFor(kindId) {
  const k = kindOf(kindId);
  if (k.home) {
    return [
      { id: 'home', ar: 'سكن', sub: 'الأنسب لظروف أسرتي وفي حدود إمكانياتي' },
      { id: 'invest', ar: 'استثمار', sub: 'ارتفاع في السعر أو إيجار مستمر' }
    ];
  }
  if (k.id === 'land') {
    return [
      { id: 'home', ar: 'أبني عليها لنفسي', sub: 'بيت أو عمارة للعيلة' },
      { id: 'invest', ar: 'استثمار', sub: 'أشتري وأبيع بعد ما سعرها يزيد، أو أبني وأبيع' }
    ];
  }
  if (k.id === 'agricultural') {
    return [
      { id: 'home', ar: 'أزرعها وأشغّلها', sub: 'زراعة أو مشروع إنتاج' },
      { id: 'invest', ar: 'استثمار', sub: 'أأجّرها أو أستنى سعرها يزيد' }
    ];
  }
  return [
    { id: 'home', ar: 'أشغّلها بنفسي', sub: k.id === 'building' ? 'أسكن فيه أو أستخدمه' : 'أفتح فيه نشاطي' },
    { id: 'invest', ar: 'استثمار', sub: 'إيجار شهري أو إعادة بيع' }
  ];
}

/** What the buyer can mark as «most important» (the last question); rooms for homes only */
const ALL_PRIORITIES = [
  { id: 'area', ar: 'الموقع', en: 'Location' },
  { id: 'size', ar: 'المساحة', en: 'Size' },
  { id: 'rooms', ar: 'عدد الغرف', en: 'Bedrooms', home: true },
  { id: 'finishing', ar: 'التشطيب والجاهزية', en: 'Finishing' },
  { id: 'price', ar: 'السعر ونظام السداد', en: 'Price & plan' }
];
export const PRIORITIES = ALL_PRIORITIES;
export const prioritiesFor = (kindId) => ALL_PRIORITIES.filter((p) => !p.home || kindOf(kindId).home);

/** Family size (question 3) → bedrooms a home needs */
export const FAMILY_SIZES = [
  { id: '1-2', ar: 'فرد أو اتنين', en: '1–2 people', rooms: 1 },
  { id: '3-4', ar: '3 أو 4 أفراد', en: '3–4 people', rooms: 2 },
  { id: '5-6', ar: '5 أو 6 أفراد', en: '5–6 people', rooms: 3 },
  { id: '7+', ar: '7 أفراد أو أكتر', en: '7 or more', rooms: 4 }
];

const BASE_WEIGHTS = { budget: 30, area: 20, rooms: 15, delivery: 15, purpose: 10, size: 10 };
// Which part a «most important» chip strengthens
const PRIORITY_PART = { area: 'area', size: 'size', rooms: 'rooms', finishing: 'purpose', price: 'budget' };

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const fmt = (n) => Math.round(n).toLocaleString('en-US');

/** Homes only: flats and villas a family would live in */
export const isHome = (p) => ['residential', 'villa'].includes(assetClass(p));
/** A listing of the kind the buyer asked for (no kind: homes, as the first version did) */
export const isKind = (p, kindId) => (kindId ? assetClass(p) === kindId : isHome(p));
const rentedNow = (p) => (Array.isArray(p.features_ar) ? p.features_ar : []).some((f) => String(f).includes('مؤجر'));

const bedroomsOf = (p) => num(p.bedrooms ?? p.rooms);
const handoverOf = (p) => (p.completionStatus === 'ready' || p.completionStatus === 'under_construction' ? p.completionStatus : '');

function budgetPart(p, a) {
  const price = num(p.price);
  const terms = paymentTerms(p);
  const plan = hasInstallmentPlan(terms) ? terms : null;
  if (a.payment === 'cash') {
    const budget = num(a.budget);
    if (!budget) return { score: 1, ok: null };
    const total = price || (plan ? plan.total : 0);
    if (!total) return { score: 0.5, ok: null, text: 'السعر مش مكتوب' };
    if (total <= budget) return { score: 1, ok: true, text: `السعر ${fmt(total)} ج.م في حدود ميزانيتك` };
    const over = total / budget - 1;
    if (over <= 0.1) return { score: 0.6, ok: false, text: `أعلى من ميزانيتك بـ ${Math.round(over * 100)}% (قابل للتفاوض غالباً)` };
    return { score: 0, ok: false, text: `السعر ${fmt(total)} ج.م أعلى من ميزانيتك` };
  }
  // Installments: the plan's down payment and its monthly equivalent against what the buyer can pay
  const maxDown = num(a.down);
  const maxMonthly = num(a.monthly);
  if (!plan) {
    // A cash-only home still fits when the buyer's down payment alone covers it
    if (maxDown && price && price <= maxDown) return { score: 0.9, ok: true, text: 'كاش، والمقدم اللي معاك يغطيه' };
    return { score: 0.15, ok: false, text: 'الوحدة كاش بس ومفيهاش تقسيط' };
  }
  const downOk = !maxDown || plan.down <= maxDown;
  const monthlyOk = !maxMonthly || plan.monthly <= maxMonthly;
  if (downOk && monthlyOk) {
    return { score: 1, ok: true, text: `مقدم ${fmt(plan.down)} وقسط حوالي ${fmt(plan.monthly)} شهرياً في حدودك` };
  }
  const downOver = maxDown ? plan.down / maxDown - 1 : 0;
  const monthOver = maxMonthly ? plan.monthly / maxMonthly - 1 : 0;
  const worst = Math.max(downOver, monthOver);
  const what = downOver >= monthOver ? `المقدم ${fmt(plan.down)}` : `القسط حوالي ${fmt(plan.monthly)} شهرياً`;
  if (worst <= 0.15) return { score: 0.6, ok: false, text: `${what}، أعلى شوية من اللي حددته` };
  return { score: 0.1, ok: false, text: `${what}، أعلى من اللي حددته` };
}

function areaPart(p, a, areas) {
  const wanted = Array.isArray(a.areas) ? a.areas.filter(Boolean) : [];
  if (!wanted.length) return { score: 1, ok: null };
  const hit = wanted.some((id) => inArea(p.areaKey, id, areas));
  return hit ? { score: 1, ok: true, text: 'في المنطقة اللي اخترتها' } : { score: 0, ok: false, text: 'في منطقة تانية غير اللي اخترتها' };
}

function roomsPart(p, a) {
  if (a.kind && !kindOf(a.kind).home) return { score: 1, ok: null };
  const need = FAMILY_SIZES.find((f) => f.id === a.family)?.rooms || 0;
  if (!need) return { score: 1, ok: null };
  const rooms = bedroomsOf(p);
  if (!rooms) return { score: 0.5, ok: null, text: 'عدد الغرف مش مكتوب، اسألنا عليه' };
  if (rooms >= need) return { score: 1, ok: true, text: `${rooms} ${rooms === 1 ? 'غرفة' : rooms === 2 ? 'غرفتين' : 'غرف'} تكفي أسرتك` };
  if (rooms === need - 1) return { score: 0.5, ok: false, text: `${rooms === 1 ? 'غرفة واحدة' : rooms === 2 ? 'غرفتين' : `${rooms} غرف`} بس، وأسرتك محتاجة ${need}` };
  return { score: 0, ok: false, text: `${rooms} ${rooms === 1 ? 'غرفة' : 'غرف'} قليلة على أسرتك` };
}

function deliveryPart(p, a) {
  if (a.kind && !kindOf(a.kind).handover) return { score: 1, ok: null };
  if (!a.delivery || a.delivery === 'any') return { score: 1, ok: null };
  const state = handoverOf(p);
  if (!state) return { score: 0.5, ok: null, text: 'موعد الاستلام مش مكتوب' };
  if (a.delivery === 'now') {
    return state === 'ready'
      ? { score: 1, ok: true, text: 'استلام فوري' }
      : { score: 0, ok: false, text: `تحت الإنشاء${p.deliveryYear ? `، استلام ${p.deliveryYear}` : ''}` };
  }
  // Can wait: under construction usually means a lower price and a longer plan
  return state === 'under_construction'
    ? { score: 1, ok: true, text: `تحت الإنشاء${p.deliveryYear ? ` (استلام ${p.deliveryYear})` : ''} بسعر وتقسيط أحسن غالباً` }
    : { score: 0.7, ok: null, text: 'جاهزة للاستلام' };
}

function purposePart(p, a) {
  const group = finishingGroupOf(p);
  const kind = a.kind ? kindOf(a.kind) : null;
  // Land and farmland: the purpose doesn't change which plot fits
  if (kind && !kind.handover) return { score: 1, ok: null };
  if (kind && !kind.home) {
    if (a.purpose === 'invest') {
      if (rentedNow(p)) return { score: 1, ok: true, text: 'مؤجّرة حالياً وبتدخّل دخل من أول يوم' };
      if (hasInstallmentPlan(paymentTerms(p)) || handoverOf(p) === 'under_construction') {
        return { score: 0.9, ok: true, text: 'شراء بنظام سداد أو قبل الاستلام بيكبّر العائد' };
      }
      return { score: 0.7, ok: null };
    }
    if (a.purpose === 'home') {
      if (handoverOf(p) === 'ready' || group === 'finished') return { score: 1, ok: true, text: 'جاهزة تبدأ فيها على طول' };
      if (handoverOf(p) === 'under_construction') return { score: 0.4, ok: false, text: 'لسه تحت الإنشاء، مش هتقدر تشغّلها دلوقتي' };
      return { score: 0.7, ok: null };
    }
    return { score: 1, ok: null };
  }
  if (a.purpose === 'invest') {
    const plan = hasInstallmentPlan(paymentTerms(p));
    if (handoverOf(p) === 'under_construction' || plan) {
      return { score: 1, ok: true, text: plan ? 'نظام سداد يخلّي رأس مالك يشتغل' : 'شراء قبل الاستلام بيدّي فرصة لارتفاع السعر' };
    }
    return group === 'finished'
      ? { score: 0.8, ok: true, text: 'متشطبة وجاهزة للإيجار' }
      : { score: 0.6, ok: null };
  }
  if (a.purpose === 'home') {
    if (group === 'finished') return { score: 1, ok: true, text: 'متشطبة وجاهزة للسكن' };
    if (group === 'core') return { score: 0.4, ok: false, text: 'محتاجة تشطيب قبل السكن' };
    return { score: 0.6, ok: null };
  }
  return { score: 1, ok: null };
}

function sizePart(p, a) {
  const min = num(a.minSize);
  if (!min) return { score: 1, ok: null };
  const size = num(p.size);
  if (!size) return { score: 0.5, ok: null, text: 'المساحة مش مكتوبة' };
  if (size >= min) return { score: 1, ok: true, text: `${size} م²` };
  if (size >= min * 0.9) return { score: 0.6, ok: false, text: `${size} م²، أقل شوية من ${min}` };
  return { score: 0, ok: false, text: `${size} م² أصغر من اللي محتاجه` };
}

/**
 * { score 0..100, matches: [text], misses: [text], notes: [text] } for one home.
 * `answers`: { priorities: [], areas: [], minSize, purpose: 'home'|'invest', family, delivery:
 * 'now'|'wait'|'any', payment: 'cash'|'installments', budget, down, monthly }
 * `only` limits the score to some parts, e.g. ['budget', 'area', 'size'].
 */
export function matchUnit(p, answers = {}, areas = [], { only = null } = {}) {
  const all = {
    budget: budgetPart(p, answers),
    area: areaPart(p, answers, areas),
    rooms: roomsPart(p, answers),
    delivery: deliveryPart(p, answers),
    purpose: purposePart(p, answers),
    size: sizePart(p, answers)
  };
  // `only`: score just these parts (a buyer request has no family size or handover answer to judge by)
  const parts = only ? Object.fromEntries(Object.entries(all).filter(([k]) => only.includes(k))) : all;
  const boosted = new Set((answers.priorities || []).map((id) => PRIORITY_PART[id]).filter(Boolean));
  let total = 0;
  let got = 0;
  for (const [key, part] of Object.entries(parts)) {
    const w = BASE_WEIGHTS[key] * (boosted.has(key) ? 1.6 : 1);
    total += w;
    got += w * part.score;
  }
  const list = Object.values(parts).filter((x) => x.text);
  return {
    score: Math.round((got / total) * 100),
    matches: list.filter((x) => x.ok === true).map((x) => x.text),
    misses: list.filter((x) => x.ok === false).map((x) => x.text),
    notes: list.filter((x) => x.ok === null).map((x) => x.text)
  };
}

/** Live listings of the kind asked for, ranked by fit, best first: [{ property, ...matchUnit }] */
export function rankUnits(properties = [], answers = {}, areas = [], limit = 6) {
  return liveListings(properties)
    .filter((p) => isKind(p, answers.kind))
    .map((property) => ({ property, ...matchUnit(property, answers, areas) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}
/** The first version's name: homes only when no kind is given */
export const rankHomes = rankUnits;

/** The answers as one WhatsApp message to the team */
export function answersMessage(a = {}, areaName = (id) => id) {
  const fam = FAMILY_SIZES.find((f) => f.id === a.family);
  const lines = [
    'مرحباً 1Line، جاوبت على أسئلة «رشّحلي عقاري»:',
    a.kind ? `بدوّر على: ${kindOf(a.kind).ar}` : '',
    a.priorities?.length ? `أهم حاجة: ${a.priorities.map((id) => PRIORITIES.find((x) => x.id === id)?.ar).filter(Boolean).join('، ')}` : '',
    a.areas?.length ? `المنطقة: ${a.areas.map(areaName).join('، ')}` : '',
    num(a.minSize) ? `المساحة: من ${num(a.minSize)} م²` : '',
    a.purpose ? `الغرض: ${purposesFor(a.kind).find((x) => x.id === a.purpose)?.ar || ''}` : '',
    fam ? `الأسرة: ${fam.ar}` : '',
    a.delivery ? `الاستلام: ${a.delivery === 'now' ? 'مستعجل (فوري)' : a.delivery === 'wait' ? 'ممكن أستنى لسعر وتقسيط أحسن' : 'مش فارقة'}` : '',
    a.payment === 'cash'
      ? (num(a.budget) ? `الميزانية كاش: ${fmt(num(a.budget))} ج.م` : '')
      : [num(a.down) ? `المقدم: ${fmt(num(a.down))} ج.م` : '', num(a.monthly) ? `القسط الشهري: ${fmt(num(a.monthly))} ج.م` : ''].filter(Boolean).join(' · '),
    'ممكن ترشحولي الأنسب؟'
  ];
  return lines.filter(Boolean).join('\n');
}
