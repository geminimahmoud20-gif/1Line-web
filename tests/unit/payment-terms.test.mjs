import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlyFor, paymentTerms, paymentFields, paymentProblem, termLabel, hasInstallmentPlan } from '../../src/utils/paymentTerms.js';

test('the monthly installment is the rest after the down payment over the term, rounded up', () => {
  assert.equal(monthlyFor({ total: 1_200_000, down: 300_000, months: 36 }), 25_000);
  assert.equal(monthlyFor({ total: 1_000_000, down: 0, months: 7 }), 142_858);
  assert.equal(monthlyFor({ total: 500_000, down: 500_000, months: 12 }), 0);
  assert.equal(monthlyFor({ total: 500_000, down: 0, months: 0 }), 0);
});

test('cash clears every installment field so an old plan never shows', () => {
  assert.deepEqual(paymentFields({ paymentType: 'cash', downPayment: 100, monthlyInstallment: 5, installmentMonths: 12 }), {
    paymentType: 'cash', downPayment: 0, monthlyInstallment: 0, installmentMonths: 0, installmentYears: 0, installmentTotal: 0
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
  assert.match(paymentProblem({ paymentType: 'installment', price: 1e6 }), /مدة/);
  assert.match(paymentProblem({ paymentType: 'installment', price: 1e6, installmentMonths: 12, downPayment: 1e6 }), /المقدم/);
  assert.match(paymentProblem({ paymentType: 'installment', price: 1e6, installmentTotal: 9e5, installmentMonths: 12 }), /أقل من سعر الكاش/);
  assert.equal(paymentProblem({ paymentType: 'installment', price: 1e6, installmentMonths: 24, downPayment: 2e5 }), '');
});

test('terms read naturally in Arabic', () => {
  assert.deepEqual([12, 24, 36, 18, 2, 7, 144].map((m) => termLabel(m)), ['سنة', 'سنتين', '3 سنين', '18 شهر', 'شهرين', '7 شهور', '12 سنة']);
  assert.equal(termLabel(18, false), '18 months');
  assert.equal(termLabel(0), '');
});
