// How a listing is paid for: cash, or an installment plan (down payment + term + installment total).
// The monthly installment is never typed: it is (installment total − down payment) ÷ months, so the
// numbers a buyer sees always add up. Pure helpers, unit-tested in tests/unit/payment-terms.test.mjs.

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const MAX_TERM_MONTHS = 240;

/** Monthly installment for a plan, rounded up to the pound so the schedule never falls short */
export function monthlyFor({ total, down, months }) {
  const t = num(total);
  const m = Math.round(num(months));
  const d = num(down);
  if (!t || !m || d >= t) return 0;
  return Math.ceil((t - d) / m);
}

/**
 * The listing's payment terms as one object:
 *   { type: 'cash' } or
 *   { type: 'installment', down, months, total, monthly, years }
 * Older listings without paymentType count as installment when they carry an installment or a term.
 */
export function paymentTerms(p = {}) {
  const months = Math.round(num(p.installmentMonths) || num(p.installmentYears) * 12);
  const legacyPlan = num(p.monthlyInstallment) > 0 || months > 0;
  const type = p.paymentType === 'cash' || p.paymentType === 'installment'
    ? p.paymentType
    : (legacyPlan ? 'installment' : 'cash');
  if (type === 'cash') return { type: 'cash' };
  const total = num(p.installmentTotal) || num(p.price);
  const down = num(p.downPayment);
  // A plan without a term (older records) keeps the installment that was typed
  const monthly = months ? monthlyFor({ total, down, months }) : num(p.monthlyInstallment);
  return { type: 'installment', down, months, total, monthly, years: months / 12 };
}

/** True when the terms can be shown as a plan: a term and something left to pay after the down payment */
export const hasInstallmentPlan = (t) => t?.type === 'installment' && t.months > 0 && t.monthly > 0;

/**
 * The fields stored on the listing for the chosen terms. Cash clears every installment field, so an
 * old plan never shows on a cash listing; installment stores the computed monthly and the term in
 * months and years (years is what filters and older screens read).
 */
export function paymentFields(form = {}) {
  if (form.paymentType !== 'installment') {
    return { paymentType: 'cash', downPayment: 0, monthlyInstallment: 0, installmentMonths: 0, installmentYears: 0, installmentTotal: 0 };
  }
  const months = Math.min(MAX_TERM_MONTHS, Math.round(num(form.installmentMonths)));
  const total = num(form.installmentTotal) || num(form.price);
  const down = num(form.downPayment);
  return {
    paymentType: 'installment',
    downPayment: down,
    installmentMonths: months,
    installmentYears: Math.round((months / 12) * 100) / 100,
    installmentTotal: total,
    monthlyInstallment: monthlyFor({ total, down, months })
  };
}

/** What is wrong with an installment plan before it is saved, or '' when it is fine */
export function paymentProblem(form = {}, isAr = true) {
  if (form.paymentType !== 'installment') return '';
  const months = Math.round(num(form.installmentMonths));
  const total = num(form.installmentTotal) || num(form.price);
  const down = num(form.downPayment);
  if (!months) return isAr ? 'اكتب مدة التقسيط' : 'Enter the installment term';
  if (months > MAX_TERM_MONTHS) return isAr ? `أقصى مدة ${MAX_TERM_MONTHS / 12} سنة` : `The longest term is ${MAX_TERM_MONTHS / 12} years`;
  if (!total) return isAr ? 'اكتب إجمالي سعر التقسيط' : 'Enter the installment total';
  if (down >= total) return isAr ? 'المقدم لازم يكون أقل من إجمالي سعر التقسيط' : 'The down payment must be below the installment total';
  if (num(form.price) && total < num(form.price)) return isAr ? 'إجمالي التقسيط أقل من سعر الكاش — راجع الأرقام' : 'The installment total is below the cash price';
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
