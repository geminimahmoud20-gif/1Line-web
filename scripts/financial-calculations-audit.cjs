/**
 * 💰 FINANCIAL & ROI CALCULATIONS AUDIT SUITE
 * Exhaustively tests mortgage mathematics, compounding formulas, currency conversions,
 * and project financial datasets for division-by-zero, NaN, and negative bounds.
 */

const { MEGA_PROJECTS } = require('../src/data/projectsData');
const { CURRENCY_RATES } = require('../src/utils/currencyAndBenchmark');

console.log('================================================================');
console.log('📊 RUNNING FINANCIAL INTEGRITY & ROI MATHEMATICS AUDIT');
console.log('================================================================');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failed++;
    console.log(`  ❌ [FAIL] ${message}`);
  }
}

// 1. Test Mortgage Mathematics Formula
function calculateMonthlyInstallment(price, downpaymentPercent, years, annualRate) {
  const safePrice = Math.max(0, Number(price) || 0);
  const safeDownPct = Math.min(100, Math.max(0, Number(downpaymentPercent) || 0));
  const safeYears = Math.max(1, Math.min(30, Number(years) || 1));
  const safeRate = Math.max(0, Number(annualRate) || 0);

  const downpayment = Math.round((safePrice * safeDownPct) / 100);
  const loan = Math.max(0, safePrice - downpayment);
  if (loan <= 0) return { downpayment, loan: 0, monthly: 0, totalPaid: downpayment };

  const totalMonths = safeYears * 12;
  const monthlyRate = (safeRate / 100) / 12;

  let monthly = 0;
  if (monthlyRate === 0) {
    monthly = Math.round(loan / totalMonths);
  } else {
    const factor = Math.pow(1 + monthlyRate, totalMonths);
    monthly = Math.round((loan * monthlyRate * factor) / (factor - 1));
  }

  const totalPaid = downpayment + (monthly * totalMonths);
  return { downpayment, loan, monthly, totalPaid };
}

// Test Case 1.1: Direct Developer 0% Interest
const dev0 = calculateMonthlyInstallment(2400000, 20, 5, 0);
assert(dev0.downpayment === 480000, 'Developer 0%: Downpayment 20% of 2.4M is 480,000');
assert(dev0.loan === 1920000, 'Developer 0%: Loan balance is 1,920,000');
assert(dev0.monthly === 32000, 'Developer 0%: Monthly installment is exactly 32,000 (1.92M / 60 months)');
assert(dev0.totalPaid === 2400000, 'Developer 0%: Total repayment equals original price 2,400,000');

// Test Case 1.2: CBE 3% Initiative
const cbe3 = calculateMonthlyInstallment(1000000, 15, 10, 3);
assert(!isNaN(cbe3.monthly) && cbe3.monthly > 0, `CBE 3%: Monthly payment is valid positive number (${cbe3.monthly})`);
assert(cbe3.totalPaid > 1000000, 'CBE 3%: Total paid includes interest over 10 years');

// Test Case 1.3: Boundary & NaN Guards
const zeroLoan = calculateMonthlyInstallment(2000000, 100, 5, 12);
assert(zeroLoan.loan === 0 && zeroLoan.monthly === 0, 'Boundary: 100% downpayment produces 0 loan and 0 installment');

const badInputs = calculateMonthlyInstallment(null, undefined, 0, -5);
assert(!isNaN(badInputs.monthly) && isFinite(badInputs.monthly), 'Boundary: Null/undefined/zero inputs produce finite non-NaN output');

// 2. Test Investor Center Compounding ROI Formula
function calculateInvestorRoi(amount, periodYears, yieldRate, growthRate) {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const safeYears = Math.max(1, Number(periodYears) || 1);
  const safeYield = Math.max(0, Number(yieldRate) || 0);
  const safeGrowth = Math.max(0, Number(growthRate) || 0);

  const annualRent = Math.round(safeAmount * (safeYield / 100));
  const totalRent = annualRent * safeYears;
  const futureCapitalValue = Math.round(safeAmount * Math.pow(1 + safeGrowth / 100, safeYears));
  const netProfit = (futureCapitalValue + totalRent) - safeAmount;
  const totalRoiPercent = safeAmount > 0 ? Math.round((netProfit / safeAmount) * 100) : 0;

  return { annualRent, totalRent, futureCapitalValue, netProfit, totalRoiPercent };
}

const invTest = calculateInvestorRoi(3000000, 5, 15.5, 18.0);
assert(invTest.annualRent === 465000, 'Investor ROI: Annual rent at 15.5% on 3M is 465,000');
assert(invTest.totalRent === 2325000, 'Investor ROI: 5-year total rent is 2,325,000');
assert(invTest.futureCapitalValue > 6800000, `Investor ROI: Compounded capital value > 6.8M (${invTest.futureCapitalValue})`);
assert(invTest.totalRoiPercent > 200, `Investor ROI: Total ROI > 200% (${invTest.totalRoiPercent}%)`);

// 3. Test Currency Platform Policy Integrity (EGP Only)
assert(CURRENCY_RATES.EGP?.rate === 1, `Currency: EGP rate is exactly 1 (${CURRENCY_RATES.EGP?.rate})`);
assert(CURRENCY_RATES.EGP?.symbol_ar === 'ج.م', `Currency: EGP symbol_ar is 'ج.م'`);
assert(Object.keys(CURRENCY_RATES).length === 1, `Currency: EGP is the only currency supported in platform`);

// 4. Test Mega Projects Dataset Financial Sanity
MEGA_PROJECTS.forEach((proj, idx) => {
  assert(typeof proj.startPrice === 'number' && proj.startPrice >= 500000, 
    `Project ${idx + 1} (${proj.brandTag || proj.id}): startPrice is valid (>= 500,000 EGP)`);
  assert(proj.downPaymentPercent >= 5 && proj.downPaymentPercent <= 50, 
    `Project ${idx + 1} (${proj.brandTag || proj.id}): downPaymentPercent is realistic (5% - 50%)`);
  assert(proj.installmentYears >= 1 && proj.installmentYears <= 15, 
    `Project ${idx + 1} (${proj.brandTag || proj.id}): installmentYears is realistic (1 - 15 yrs)`);
  assert(proj.progress >= 0 && proj.progress <= 100, 
    `Project ${idx + 1} (${proj.brandTag || proj.id}): progress is within 0-100% (${proj.progress}%)`);
});

console.log('================================================================');
console.log(`Summary: ${passed} Passed | ${failed} Failed | Total: ${passed + failed}`);
console.log('================================================================');

process.exit(failed > 0 ? 1 : 0);
