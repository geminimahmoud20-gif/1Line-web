// How a listing is paid for:
//   cash         one price
//   installment  a plan from the owner / developer: down payment, then an installment every
//                1 / 3 / 6 / 12 months for the term
//   resale       a unit bought on installments being sold on: the buyer pays the seller an amount
//                in cash now (what was paid + the premium) and takes over the installments left
// The team types the down payment (or the cash to the seller), the installment and how often, and the
// term; the total is worked out (down + installment × number of installments), never typed. Older
// listings saved a total and a term instead; they still read the same, with the installment computed.
// Pure helpers, unit-tested in tests/unit/payment-terms.test.mjs.

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const MAX_TERM_MONTHS = 240;
export const PLAN_TYPES = ['installment', 'resale'];
export const isPlanType = (t) => PLAN_TYPES.includes(t);

/** Months between two installments: monthly, quarterly, every six months, yearly */
export const INSTALLMENT_EVERY = [
  { months: 1, ar: 'شهري', every_ar: 'كل شهر', adverb_ar: 'شهرياً', en: 'monthly' },
  { months: 3, ar: 'ربع سنوي', every_ar: 'كل 3 شهور', adverb_ar: 'كل 3 شهور', en: 'quarterly' },
  { months: 6, ar: 'نصف سنوي', every_ar: 'كل 6 شهور', adverb_ar: 'كل 6 شهور', en: 'every 6 months' },
  { months: 12, ar: 'سنوي', every_ar: 'كل سنة', adverb_ar: 'سنوياً', en: 'yearly' }
];
const everyOf = (v) => (INSTALLMENT_EVERY.some((e) => e.months === Number(v)) ? Number(v) : 1);
export const everyLabel = (every, isAr = true) => {
  const e = INSTALLMENT_EVERY.find((x) => x.months === everyOf(every));
  return isAr ? e.ar : e.en;
};

/** Monthly installment for a total-based plan, rounded up to the pound so the schedule never falls short */
export function monthlyFor({ total, down, months }) {
  const t = num(total);
  const m = Math.round(num(months));
  const d = num(down);
  if (!t || !m || d >= t) return 0;
  return Math.ceil((t - d) / m);
}

/** Installments in a term: 5 years paid quarterly = 20 */
export const periodsIn = (months, every = 1) => {
  const m = Math.round(num(months));
  return m ? Math.ceil(m / everyOf(every)) : 0;
};

/**
 * The plan worked out from what the team typed: { down, months, every, periods, amount, total }.
 * The installment amount wins; without one (older listings) it is the total left after the down
 * payment spread over the installments.
 */
function planNumbers(p) {
  const months = Math.round(num(p.installmentMonths) || num(p.installmentYears) * 12);
  const every = everyOf(p.installmentEvery);
  const periods = periodsIn(months, every);
  const down = num(p.downPayment);
  // Yearly payments on top of the installments (common in resale and developer plans)
  const yearlyAmount = num(p.yearlyPaymentAmount);
  const yearlyCount = yearlyAmount ? Math.round(num(p.yearlyPaymentCount)) : 0;
  const yearly = yearlyAmount && yearlyCount ? yearlyAmount * yearlyCount : 0;
  let amount = num(p.installmentAmount);
  let total;
  if (amount && periods) {
    total = down + amount * periods + yearly;
  } else if (periods && !num(p.installmentTotal) && num(p.monthlyInstallment) && every === 1) {
    // Older listings typed the monthly installment and the term: that is the plan as written
    amount = num(p.monthlyInstallment);
    total = down + amount * periods + yearly;
  } else {
    total = num(p.installmentTotal) || num(p.price);
    amount = periods && total > down + yearly ? Math.ceil((total - down - yearly) / periods) : 0;
    // A plan without a term (older records) keeps the monthly installment that was typed
    if (!periods && num(p.monthlyInstallment)) amount = num(p.monthlyInstallment);
  }
  return { down, months, every, periods, amount, total, yearlyAmount: yearly ? yearlyAmount : 0, yearlyCount: yearly ? yearlyCount : 0 };
}

/**
 * The listing's payment terms as one object:
 *   { type: 'cash' } or
 *   { type: 'installment' | 'resale', down, months, every, periods, amount, total, monthly, years, cashPrice }
 * monthly is the installment per month (amount ÷ months between installments), for older screens.
 * Older listings without paymentType count as installment when they carry an installment or a term.
 */
export function paymentTerms(p = {}) {
  const months = Math.round(num(p.installmentMonths) || num(p.installmentYears) * 12);
  const legacyPlan = num(p.monthlyInstallment) > 0 || months > 0;
  const type = p.paymentType === 'cash' || isPlanType(p.paymentType)
    ? p.paymentType
    : (legacyPlan ? 'installment' : 'cash');
  if (type === 'cash') return { type: 'cash' };
  const n = planNumbers(p);
  // The cash price, when the seller also takes full cash and it differs from the plan's total
  const cashPrice = num(p.price) && num(p.price) !== n.total ? num(p.price) : 0;
  return { type, ...n, monthly: n.amount ? Math.ceil(n.amount / n.every) : 0, years: n.months / 12, cashPrice };
}

/** True when the terms can be shown as a plan: a term and an installment */
export const hasInstallmentPlan = (t) => isPlanType(t?.type) && t.months > 0 && t.amount > 0;

/**
 * The fields stored on the listing for the chosen terms. Cash clears every installment field, so an
 * old plan never shows on a cash listing. A plan stores the installment, how often, the term (months
 * and years, which filters and older screens read), the total and the monthly equivalent.
 */
export function paymentFields(form = {}) {
  if (!isPlanType(form.paymentType)) {
    return {
      paymentType: 'cash', downPayment: 0, monthlyInstallment: 0, installmentMonths: 0, installmentYears: 0,
      installmentTotal: 0, installmentAmount: 0, installmentEvery: 1, yearlyPaymentAmount: 0, yearlyPaymentCount: 0
    };
  }
  const months = Math.min(MAX_TERM_MONTHS, Math.round(num(form.installmentMonths)));
  const n = planNumbers({ ...form, installmentMonths: months, installmentYears: 0 });
  return {
    paymentType: form.paymentType,
    downPayment: n.down,
    installmentMonths: months,
    installmentYears: Math.round((months / 12) * 100) / 100,
    installmentEvery: n.every,
    installmentAmount: n.amount,
    installmentTotal: n.total,
    yearlyPaymentAmount: n.yearlyAmount,
    yearlyPaymentCount: n.yearlyCount,
    monthlyInstallment: n.amount ? Math.ceil(n.amount / n.every) : 0
  };
}

/** The listing price for a plan with no cash price typed: the plan's total */
export function planPrice(form = {}) {
  if (!isPlanType(form.paymentType)) return num(form.price);
  return num(form.price) || paymentFields(form).installmentTotal;
}

/** What is wrong with a plan before it is saved, or '' when it is fine */
export function paymentProblem(form = {}, isAr = true) {
  if (!isPlanType(form.paymentType)) return '';
  const L = (ar, en) => (isAr ? ar : en);
  const resale = form.paymentType === 'resale';
  const months = Math.round(num(form.installmentMonths));
  const every = everyOf(form.installmentEvery);
  if (!months) return resale ? L('اكتب عدد الأقساط المتبقية', 'Enter the installments left') : L('اكتب عدد الأقساط', 'Enter the number of installments');
  if (months > MAX_TERM_MONTHS) return L(`أقصى مدة ${MAX_TERM_MONTHS / 12} سنة`, `The longest term is ${MAX_TERM_MONTHS / 12} years`);
  if (months % every !== 0) return L(`المدة لازم تتقسم على ${every} شهور (القسط ${everyLabel(every)})`, `The term must be a multiple of ${every} months`);
  if (!num(form.installmentAmount) && !num(form.installmentTotal) && !num(form.price)) return L('اكتب قيمة القسط', 'Enter the installment amount');
  if (num(form.yearlyPaymentAmount) && !Math.round(num(form.yearlyPaymentCount))) return L('اكتب عدد الدفعات السنوية', 'Enter how many yearly payments');
  if (resale && !num(form.downPayment)) return L('اكتب المطلوب كاش للمالك (المدفوع + الأوفر)', 'Enter the cash asked by the seller');
  const n = planNumbers({ ...form, installmentYears: 0 });
  if (!num(form.installmentAmount) && n.down >= n.total) return L('المقدم لازم يكون أقل من إجمالي السعر', 'The down payment must be below the total');
  if (!resale && num(form.price) && n.total < num(form.price)) return L('إجمالي التقسيط أقل من سعر الكاش — راجع الأرقام', 'The installment total is below the cash price');
  return '';
}

/** "18 شهر" / "سنتين" / "سنة ونص" style term for the buyer */
export function termLabel(months, isAr = true) {
  const m = Math.round(num(months));
  if (!m) return '';
  if (!isAr) return m % 12 === 0 ? `${m / 12} ${m === 12 ? 'year' : 'years'}` : `${m} months`;
  if (m % 12 === 0) {
    const y = m / 12;
    if (y === 1) return 'سنة';
    if (y === 2) return 'سنتين';
    return y <= 10 ? `${y} سنين` : `${y} سنة`;
  }
  if (m === 1) return 'شهر';
  if (m === 2) return 'شهرين';
  return m <= 10 ? `${m} شهور` : `${m} شهر`;
}

/** «20 قسط» / «قسطين» */
export function periodsLabel(n, isAr = true) {
  const v = Math.round(num(n));
  if (!isAr) return `${v} installment${v === 1 ? '' : 's'}`;
  if (v === 1) return 'قسط واحد';
  if (v === 2) return 'قسطين';
  return v <= 10 ? `${v} أقساط` : `${v} قسط`;
}

// How often, agreeing with the count: «قسط واحد ربع سنوي», «قسطين ربع سنويين», «9 أقساط ربع سنوية», «27 قسط ربع سنوي»
const ADJ = {
  1: ['شهري', 'شهريين', 'شهرية'], 3: ['ربع سنوي', 'ربع سنويين', 'ربع سنوية'],
  6: ['نصف سنوي', 'نصف سنويين', 'نصف سنوية'], 12: ['سنوي', 'سنويين', 'سنوية']
};

/** «9 أقساط ربع سنوية» — the count and how often, never a number of months */
export function installmentsPhrase(n, every = 1, isAr = true) {
  const v = Math.round(num(n));
  const adj = ADJ[everyOf(every)];
  if (!isAr) return `${v} ${everyLabel(every, false)} installment${v === 1 ? '' : 's'}`;
  if (v === 1) return `قسط واحد ${adj[0]}`;
  if (v === 2) return `قسطين ${adj[1]}`;
  return v <= 10 ? `${v} أقساط ${adj[2]}` : `${v} قسط ${adj[0]}`;
}

/** «3 دفعات سنوية» / «دفعة سنوية واحدة» / «دفعتين سنويتين» */
export function yearlyPhrase(n, isAr = true) {
  const v = Math.round(num(n));
  if (!isAr) return `${v} yearly payment${v === 1 ? '' : 's'}`;
  if (v === 1) return 'دفعة سنوية واحدة';
  if (v === 2) return 'دفعتين سنويتين';
  return v <= 10 ? `${v} دفعات سنوية` : `${v} دفعة سنوية`;
}

/**
 * How the plan reads to a buyer, in parts the pages lay out:
 *   now:    { label, amount }   what is paid now (down payment / cash to the seller), or null
 *   then:   «9 أقساط ربع سنوية × 99,500 ج.م»
 *   yearly: «3 دفعات سنوية × 200,000 ج.م», or ''
 *   total:  the whole price with the installments
 * Never a number of months: plans are counted in installments. `fmt` formats an amount.
 */
export function planSummary(t, fmt, isAr = true) {
  if (!hasInstallmentPlan(t)) return null;
  const e = INSTALLMENT_EVERY.find((x) => x.months === t.every) || INSTALLMENT_EVERY[0];
  const resale = t.type === 'resale';
  const now = t.down > 0
    ? { label: isAr ? (resale ? 'المطلوب كاش للمالك' : 'المقدم') : (resale ? 'Cash to the seller' : 'Down payment'), amount: t.down }
    : null;
  const then = `${resale ? (isAr ? 'باقي ' : 'remaining: ') : ''}${installmentsPhrase(t.periods, t.every, isAr)} × ${fmt(t.amount)}`;
  const yearly = t.yearlyAmount && t.yearlyCount ? `${yearlyPhrase(t.yearlyCount, isAr)} × ${fmt(t.yearlyAmount)}` : '';
  return { now, then, yearly, total: t.total, resale, everyLabel: isAr ? e.ar : e.en };
}
