import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyFor, paymentTerms, paymentFields, paymentProblem, termLabel, hasInstallmentPlan, planPrice, planSummary } from '../../src/utils/paymentTerms.js';

test('the monthly installment is the rest after the down payment over the term, rounded up', () => {
  assert.equal(monthlyFor({ total: 1_200_000, down: 300_000, months: 36 }), 25_000);
  assert.equal(monthlyFor({ total: 1_000_000, down: 0, months: 7 }), 142_858);
  assert.equal(monthlyFor({ total: 500_000, down: 500_000, months: 12 }), 0);
  assert.equal(monthlyFor({ total: 500_000, down: 0, months: 0 }), 0);
});

test('cash clears every installment field so an old plan never shows', () => {
  assert.deepEqual(paymentFields({ paymentType: 'cash', downPayment: 100, monthlyInstallment: 5, installmentMonths: 12 }), {
    paymentType: 'cash', downPayment: 0, monthlyInstallment: 0, installmentMonths: 0, installmentYears: 0, installmentTotal: 0,
    installmentAmount: 0, installmentEvery: 1, yearlyPaymentAmount: 0, yearlyPaymentCount: 0
  });
});

test('installment stores the computed monthly, the term in months and years, and the total', () => {
  const f = paymentFields({ paymentType: 'installment', price: 1_000_000, installmentTotal: 1_200_000, downPayment: 300_000, installmentMonths: 18 });
  assert.equal(f.monthlyInstallment, 50_000);
  assert.equal(f.installmentYears, 1.5);
  assert.equal(f.installmentTotal, 1_200_000);
  // No total typed: the cash price is the total
  assert.equal(paymentFields({ paymentType: 'installment', price: 600_000, installmentMonths: 12 }).monthlyInstallment, 50_000);
});

test('older listings: a typed installment or a term means installment, nothing means cash', () => {
  assert.equal(paymentTerms({ price: 1e6 }).type, 'cash');
  assert.equal(paymentTerms({ price: 1e6, downPayment: 0, monthlyInstallment: 0 }).type, 'cash');
  const old = paymentTerms({ price: 1_200_000, downPayment: 240_000, installmentYears: 4 });
  assert.deepEqual([old.type, old.months, old.monthly], ['installment', 48, 20_000]);
  assert.equal(paymentTerms({ price: 1e6, monthlyInstallment: 9000 }).monthly, 9000);
  assert.equal(paymentTerms({ paymentType: 'cash', monthlyInstallment: 9000 }).type, 'cash');
  assert.equal(hasInstallmentPlan(paymentTerms({ price: 1e6, monthlyInstallment: 9000 })), false);
  assert.equal(hasInstallmentPlan(old), true);
});

test('a plan that does not add up is caught before saving', () => {
  assert.equal(paymentProblem({ paymentType: 'cash' }), '');
  assert.match(paymentProblem({ paymentType: 'installment', price: 1e6 }), /عدد الأقساط/);
  assert.match(paymentProblem({ paymentType: 'installment', price: 1e6, installmentMonths: 12, downPayment: 1e6 }), /المقدم/);
  assert.match(paymentProblem({ paymentType: 'installment', price: 1e6, installmentTotal: 9e5, installmentMonths: 12 }), /أقل من سعر الكاش/);
  assert.equal(paymentProblem({ paymentType: 'installment', price: 1e6, installmentMonths: 24, downPayment: 2e5 }), '');
});

test('terms read naturally in Arabic', () => {
  assert.deepEqual([12, 24, 36, 18, 2, 7, 144].map((m) => termLabel(m)), ['سنة', 'سنتين', '3 سنين', '18 شهر', 'شهرين', '7 شهور', '12 سنة']);
  assert.equal(termLabel(18, false), '18 months');
  assert.equal(termLabel(0), '');
});

test('a plan typed as down payment + installment + how often: the total is worked out', () => {
  const form = { paymentType: 'installment', downPayment: 200_000, installmentAmount: 30_000, installmentEvery: 3, installmentMonths: 60 };
  const f = paymentFields(form);
  assert.equal(f.installmentTotal, 200_000 + 30_000 * 20);
  assert.equal(f.monthlyInstallment, 10_000);
  assert.equal(paymentProblem(form), '');
  // No cash price: the listing is priced at the plan's total
  assert.equal(planPrice(form), 800_000);
  assert.equal(planPrice({ ...form, price: 700_000 }), 700_000);
  assert.match(paymentProblem({ ...form, installmentMonths: 10 }), /تتقسم على 3/);
});

test('resale with installments left leads with the cash to the seller', () => {
  const p = { paymentType: 'resale', price: 0, downPayment: 450_000, installmentAmount: 60_000, installmentEvery: 6, installmentMonths: 36 };
  const t = paymentTerms({ ...p, ...paymentFields(p) });
  assert.equal(t.type, 'resale');
  assert.equal(t.periods, 6);
  assert.equal(t.total, 450_000 + 360_000);
  const s = planSummary(t, (n) => `${n.toLocaleString('en-US')} ج.م`);
  assert.equal(s.now.label, 'المطلوب كاش للمالك');
  assert.equal(s.then, 'باقي 6 أقساط نصف سنوية × 60,000 ج.م');
  assert.match(paymentProblem({ ...p, downPayment: 0 }), /المطلوب كاش/);
});

test('older total-based plans read the same', () => {
  const t = paymentTerms({ paymentType: 'installment', price: 1_000_000, installmentTotal: 1_200_000, downPayment: 300_000, installmentMonths: 18 });
  assert.deepEqual([t.every, t.periods, t.amount, t.monthly, t.total, t.cashPrice], [1, 18, 50_000, 50_000, 1_200_000, 1_000_000]);
});

test('yearly payments add to the total and read by count, never in months', async () => {
  const { installmentsPhrase, yearlyPhrase } = await import('../../src/utils/paymentTerms.js');
  const form = { paymentType: 'resale', downPayment: 1_848_412, installmentAmount: 99_500, installmentEvery: 3, installmentMonths: 27, yearlyPaymentAmount: 200_000, yearlyPaymentCount: 2 };
  const f = paymentFields(form);
  assert.equal(f.installmentTotal, 1_848_412 + 99_500 * 9 + 200_000 * 2);
  assert.equal(f.yearlyPaymentCount, 2);
  const s = planSummary(paymentTerms({ ...form, ...f }), (n) => `${n.toLocaleString('en-US')} ج.م`);
  assert.equal(s.then, 'باقي 9 أقساط ربع سنوية × 99,500 ج.م');
  assert.equal(s.yearly, 'دفعتين سنويتين × 200,000 ج.م');
  assert.match(paymentProblem({ ...form, yearlyPaymentCount: 0 }), /عدد الدفعات السنوية/);
  assert.deepEqual([1, 2, 9, 27].map((n) => installmentsPhrase(n, 3)), ['قسط واحد ربع سنوي', 'قسطين ربع سنويين', '9 أقساط ربع سنوية', '27 قسط ربع سنوي']);
  assert.equal(yearlyPhrase(3), '3 دفعات سنوية');
});
